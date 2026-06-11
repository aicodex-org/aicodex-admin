// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package object

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/conf"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/beego/beego/v2/core/logs"
)

const (
	GatewayProjectionRefreshErrorInvalidConfig       = "invalid_config"
	GatewayProjectionRefreshErrorProviderUnavailable = "provider_unavailable"

	gatewayProjectionRefreshDefaultIntervalSeconds     = 900
	gatewayProjectionRefreshDefaultInitialDelaySeconds = 60
	gatewayProjectionRefreshDefaultBatchSize           = 50
	gatewayProjectionRefreshMinimumIntervalSeconds     = 1
)

var (
	gatewayProjectionRefreshWorkerMu      sync.Mutex
	gatewayProjectionRefreshWorkerRunning bool
	gatewayProjectionRefreshWorkerStop    chan struct{}
)

// GatewayProjectionRefreshConfig 控制 admin 周期刷新 gateway projection freshness 的轻量 worker。
// Endpoint/token 仍只由 publisher 私有配置读取；worker 日志只输出状态、trace 和错误码。
type GatewayProjectionRefreshConfig struct {
	Enabled        bool
	DisabledReason string
	Interval       time.Duration
	InitialDelay   time.Duration
	BatchSize      int
}

// GatewayProjectionRefreshOrganizationStore 隔离 refresh worker 对平台组织主模型的枚举。
type GatewayProjectionRefreshOrganizationStore interface {
	ListGatewayProjectionRefreshOrganizations(limit int) ([]string, error)
}

// GatewayProjectionRefreshWorker 负责按组织触发 projection publish，不解释授权事实。
type GatewayProjectionRefreshWorker struct {
	Config    GatewayProjectionRefreshConfig
	Store     GatewayProjectionRefreshOrganizationStore
	Publisher GatewayProjectionOrganizationPublisher
	Now       func() time.Time

	mu      sync.Mutex
	running bool
}

// GatewayProjectionRefreshRunResult 是一轮 refresh 的脱敏统计摘要。
type GatewayProjectionRefreshRunResult struct {
	TraceID       string
	Organizations int
	Published     int
	Failed        int
	Skipped       int
	ErrorCode     string
}

type defaultGatewayProjectionRefreshOrganizationStore struct{}

// GetGatewayProjectionRefreshConfig 读取 refresh worker 配置并确保 refresh 周期小于 projection freshness TTL。
func GetGatewayProjectionRefreshConfig() GatewayProjectionRefreshConfig {
	publisherConfig := GetGatewayProjectionPublisherConfig()
	refreshEnabled := publisherConfig.Enabled
	if enabled, ok := gatewayProjectionOptionalBoolConfig("gatewayOrganizationProjectionRefreshEnabled"); ok {
		refreshEnabled = enabled
	}

	config := GatewayProjectionRefreshConfig{
		Enabled:      refreshEnabled && publisherConfig.Enabled,
		Interval:     time.Duration(gatewayProjectionIntConfig("gatewayOrganizationProjectionRefreshIntervalSeconds", gatewayProjectionRefreshDefaultIntervalSeconds)) * time.Second,
		InitialDelay: time.Duration(gatewayProjectionIntConfig("gatewayOrganizationProjectionRefreshInitialDelaySeconds", gatewayProjectionRefreshDefaultInitialDelaySeconds)) * time.Second,
		BatchSize:    gatewayProjectionIntConfig("gatewayOrganizationProjectionRefreshBatchSize", gatewayProjectionRefreshDefaultBatchSize),
	}
	if strings.TrimSpace(publisherConfig.Endpoint) == "" || strings.TrimSpace(publisherConfig.Token) == "" {
		config.Enabled = false
		if refreshEnabled && publisherConfig.Enabled {
			config.DisabledReason = GatewayProjectionRefreshErrorInvalidConfig
		}
	}
	config.Interval = normalizeGatewayProjectionRefreshInterval(config.Interval, publisherConfig.FreshnessTTL)
	config.InitialDelay = normalizeGatewayProjectionRefreshInitialDelay(config.InitialDelay)
	config.BatchSize = normalizeGatewayProjectionRefreshBatchSize(config.BatchSize)
	return config
}

// StartGatewayProjectionRefreshWorker 启动进程内 refresh worker；默认配置不满足时只记录脱敏状态并跳过。
func StartGatewayProjectionRefreshWorker() {
	config := GetGatewayProjectionRefreshConfig()
	if !config.Enabled {
		if config.DisabledReason != "" {
			logs.Warning("gateway_projection_refresh_worker_disabled reason=%s", config.DisabledReason)
		}
		return
	}

	gatewayProjectionRefreshWorkerMu.Lock()
	defer gatewayProjectionRefreshWorkerMu.Unlock()
	if gatewayProjectionRefreshWorkerRunning {
		return
	}

	stopCh := make(chan struct{})
	gatewayProjectionRefreshWorkerStop = stopCh
	gatewayProjectionRefreshWorkerRunning = true
	worker := &GatewayProjectionRefreshWorker{Config: config}
	logs.Info("gateway_projection_refresh_worker_started intervalSeconds=%d initialDelaySeconds=%d batchSize=%d",
		int(config.Interval/time.Second), int(config.InitialDelay/time.Second), config.BatchSize)

	util.SafeGoroutine(func() {
		defer func() {
			gatewayProjectionRefreshWorkerMu.Lock()
			defer gatewayProjectionRefreshWorkerMu.Unlock()
			if gatewayProjectionRefreshWorkerStop == stopCh {
				gatewayProjectionRefreshWorkerRunning = false
				gatewayProjectionRefreshWorkerStop = nil
			}
		}()
		worker.run(stopCh)
	})
}

// StopGatewayProjectionRefreshWorker 停止 refresh worker，主要供测试和进程收口使用。
func StopGatewayProjectionRefreshWorker() {
	gatewayProjectionRefreshWorkerMu.Lock()
	defer gatewayProjectionRefreshWorkerMu.Unlock()
	if !gatewayProjectionRefreshWorkerRunning {
		return
	}
	if gatewayProjectionRefreshWorkerStop != nil {
		close(gatewayProjectionRefreshWorkerStop)
		gatewayProjectionRefreshWorkerStop = nil
	}
	gatewayProjectionRefreshWorkerRunning = false
}

// RunOnce 执行一轮 projection refresh。它在本进程内非重入，避免慢请求导致同一轮堆叠。
func (w *GatewayProjectionRefreshWorker) RunOnce(ctx context.Context) (GatewayProjectionRefreshRunResult, error) {
	runAt := w.now()
	result := GatewayProjectionRefreshRunResult{TraceID: w.buildTraceID("run")}
	config := w.normalizedConfig()
	defer func() {
		recordGatewayProjectionRefreshObservability(config, result, runAt)
	}()
	if !config.Enabled {
		result.Skipped = 1
		result.ErrorCode = config.DisabledReason
		return result, nil
	}

	w.mu.Lock()
	if w.running {
		w.mu.Unlock()
		result.Skipped = 1
		result.ErrorCode = "refresh_in_progress"
		return result, nil
	}
	w.running = true
	w.mu.Unlock()
	defer func() {
		w.mu.Lock()
		w.running = false
		w.mu.Unlock()
	}()

	store := w.organizationStore()
	organizations, err := store.ListGatewayProjectionRefreshOrganizations(config.BatchSize)
	if err != nil {
		result.ErrorCode = GatewayProjectionRefreshErrorProviderUnavailable
		logs.Warning("gateway_projection_refresh_failed traceId=%s errorCode=%s", result.TraceID, result.ErrorCode)
		return result, err
	}
	organizations = normalizeGatewayProjectionRefreshOrganizations(organizations, config.BatchSize)
	result.Organizations = len(organizations)
	if len(organizations) == 0 {
		logs.Info("gateway_projection_refresh_completed traceId=%s organizations=0 published=0 failed=0 skipped=0", result.TraceID)
		return result, nil
	}

	publisher := w.organizationPublisher()
	for _, organizationID := range organizations {
		organizationTraceID := w.buildTraceID(organizationID)
		publishResult, publishErr := publisher.BuildAndPublishOrganization(ctx, organizationID, organizationTraceID)
		if publishErr != nil || !publishResult.Publish.Success {
			result.Failed++
			errorCode := gatewayProjectionPublishFailureCode(publishResult)
			logs.Warning("gateway_projection_refresh_publish_failed traceId=%s organization=%s errorCode=%s attempts=%d statusCode=%d",
				organizationTraceID, organizationID, errorCode, publishResult.Publish.Attempts, publishResult.Publish.StatusCode)
			continue
		}
		result.Published++
		logs.Info("gateway_projection_refresh_publish_ok traceId=%s organization=%s accepted=%t idempotent=%t attempts=%d",
			organizationTraceID, organizationID, publishResult.Publish.Accepted, publishResult.Publish.Idempotent, publishResult.Publish.Attempts)
	}
	logs.Info("gateway_projection_refresh_completed traceId=%s organizations=%d published=%d failed=%d skipped=%d",
		result.TraceID, result.Organizations, result.Published, result.Failed, result.Skipped)
	return result, nil
}

func (w *GatewayProjectionRefreshWorker) run(stopCh <-chan struct{}) {
	config := w.normalizedConfig()
	if config.InitialDelay > 0 {
		timer := time.NewTimer(config.InitialDelay)
		select {
		case <-stopCh:
			timer.Stop()
			return
		case <-timer.C:
		}
	}
	_, _ = w.RunOnce(context.Background())
	ticker := time.NewTicker(config.Interval)
	defer ticker.Stop()
	for {
		select {
		case <-stopCh:
			return
		case <-ticker.C:
			_, _ = w.RunOnce(context.Background())
		}
	}
}

func (w *GatewayProjectionRefreshWorker) normalizedConfig() GatewayProjectionRefreshConfig {
	config := w.Config
	config.Interval = normalizeGatewayProjectionRefreshInterval(config.Interval, GetGatewayProjectionPublisherConfig().FreshnessTTL)
	config.InitialDelay = normalizeGatewayProjectionRefreshInitialDelay(config.InitialDelay)
	config.BatchSize = normalizeGatewayProjectionRefreshBatchSize(config.BatchSize)
	return config
}

func (w *GatewayProjectionRefreshWorker) organizationStore() GatewayProjectionRefreshOrganizationStore {
	if w != nil && w.Store != nil {
		return w.Store
	}
	return defaultGatewayProjectionRefreshOrganizationStore{}
}

func (w *GatewayProjectionRefreshWorker) organizationPublisher() GatewayProjectionOrganizationPublisher {
	if w != nil && w.Publisher != nil {
		return w.Publisher
	}
	return &GatewayProjectionService{}
}

func (w *GatewayProjectionRefreshWorker) now() time.Time {
	if w != nil && w.Now != nil {
		return w.Now()
	}
	return time.Now()
}

func (w *GatewayProjectionRefreshWorker) buildTraceID(suffix string) string {
	now := w.now().UTC().Format("20060102T150405Z")
	suffix = sanitizeGatewayProjectionIDPart(suffix)
	if suffix == "" {
		suffix = "run"
	}
	return fmt.Sprintf("gateway-projection-refresh-%s-%s", now, suffix)
}

func (s defaultGatewayProjectionRefreshOrganizationStore) ListGatewayProjectionRefreshOrganizations(limit int) ([]string, error) {
	if ormer == nil || ormer.Engine == nil {
		return []string{}, nil
	}
	organizationIDs := map[string]bool{}
	// Refresh 只选择已有同步批次的组织，确保 builder 使用 source batch 版本，
	// 不因周期续期 freshness 而回退到 generatedAt 递增 gateway orgVersion。
	batches := []OrgSyncBatch{}
	if err := ormer.Engine.Select("organization_id, status, org_version, finished_at").Find(&batches); err != nil {
		return nil, err
	}
	for _, batch := range batches {
		if !gatewayProjectionRefreshBatchUsable(batch) {
			continue
		}
		organizationID := normalizeGatewayProjectionString(batch.OrganizationId)
		if organizationID == "" || organizationID == "built-in" {
			continue
		}
		organizationIDs[organizationID] = true
	}
	organizations := make([]string, 0, len(organizationIDs))
	for organizationID := range organizationIDs {
		organizations = append(organizations, organizationID)
	}
	return normalizeGatewayProjectionRefreshOrganizations(organizations, limit), nil
}

func gatewayProjectionRefreshBatchUsable(batch OrgSyncBatch) bool {
	return gatewayProjectionSyncBatchUsable(batch)
}

func normalizeGatewayProjectionRefreshOrganizations(values []string, limit int) []string {
	seen := map[string]bool{}
	organizations := []string{}
	for _, value := range values {
		organizationID := normalizeGatewayProjectionString(value)
		if organizationID == "" || organizationID == "built-in" || seen[organizationID] {
			continue
		}
		seen[organizationID] = true
		organizations = append(organizations, organizationID)
	}
	sort.Strings(organizations)
	if limit > 0 && len(organizations) > limit {
		return organizations[:limit]
	}
	return organizations
}

func normalizeGatewayProjectionRefreshInterval(interval time.Duration, freshnessTTL time.Duration) time.Duration {
	if freshnessTTL <= 0 {
		freshnessTTL = GatewayProjectionDefaultFreshnessTTL
	}
	safeDefault := time.Duration(gatewayProjectionRefreshDefaultIntervalSeconds) * time.Second
	if safeDefault >= freshnessTTL {
		safeDefault = freshnessTTL / 2
	}
	minimum := time.Duration(gatewayProjectionRefreshMinimumIntervalSeconds) * time.Second
	if safeDefault < minimum {
		safeDefault = minimum
	}
	if interval <= 0 || interval >= freshnessTTL {
		return safeDefault
	}
	if interval < minimum {
		return minimum
	}
	return interval
}

func normalizeGatewayProjectionRefreshInitialDelay(delay time.Duration) time.Duration {
	if delay < 0 {
		return 0
	}
	return delay
}

func normalizeGatewayProjectionRefreshBatchSize(batchSize int) int {
	if batchSize <= 0 {
		return gatewayProjectionRefreshDefaultBatchSize
	}
	return batchSize
}

func gatewayProjectionOptionalBoolConfig(key string) (bool, bool) {
	value := strings.TrimSpace(conf.GetConfigString(key))
	if value == "" {
		return false, false
	}
	return strings.EqualFold(value, "true"), true
}
