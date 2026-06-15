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
	"errors"
	"fmt"
	"strings"
	"time"
)

const gatewayProjectionManualFailurePublisherDisabled = "publisher_disabled"

// GatewayProjectionManualPublishRequest 是 operator 手动发布 projection 的最小输入。
// Reason 只进入脱敏审计上下文，不能携带真实账号、凭据或完整组织结构。
type GatewayProjectionManualPublishRequest struct {
	OrganizationID string `json:"organizationId"`
	TraceID        string `json:"traceId,omitempty"`
	Reason         string `json:"reason,omitempty"`
}

// GatewayProjectionManualPublishResult 是 Admin 控制台使用的脱敏 result envelope。
// 它描述 Admin producer attempt，不代表 gateway authorization facts 或 API/Insight 成功。
type GatewayProjectionManualPublishResult struct {
	Status                  string                                       `json:"status"`
	GeneratedAt             string                                       `json:"generatedAt"`
	TraceID                 string                                       `json:"traceId,omitempty"`
	Accepted                bool                                         `json:"accepted"`
	Idempotent              bool                                         `json:"idempotent"`
	Retryable               bool                                         `json:"retryable"`
	ProjectionBatchID       string                                       `json:"projectionBatchId,omitempty"`
	OrgVersion              int64                                        `json:"orgVersion,omitempty"`
	SourceVersion           string                                       `json:"sourceVersion,omitempty"`
	FreshnessExpiresAt      string                                       `json:"freshnessExpiresAt,omitempty"`
	SubjectCount            int                                          `json:"subjectCount"`
	ActiveSubjectCount      int                                          `json:"activeSubjectCount"`
	TombstoneSubjectCount   int                                          `json:"tombstoneSubjectCount"`
	SkippedSubjectCount     int                                          `json:"skippedSubjectCount"`
	SkippedByReason         map[string]int                               `json:"skippedByReason,omitempty"`
	ErrorCode               string                                       `json:"errorCode,omitempty"`
	FailureCategory         string                                       `json:"failureCategory,omitempty"`
	DurationMs              int64                                        `json:"durationMs"`
	DisabledReasons         []string                                     `json:"disabledReasons,omitempty"`
	Publisher               GatewayProjectionPublisherObservability      `json:"publisher"`
	SourceConnectionSummary GatewayProjectionSourceConnectionSummary     `json:"sourceConnectionSummary"`
	Readiness               GatewayProjectionManualPublishReadiness      `json:"readiness"`
	LatestPublish           *GatewayProjectionLatestPublishObservability `json:"latestPublish,omitempty"`
}

// GatewayProjectionManualPublishReadiness 汇总 operator 判断是否可手动 publish 的前置条件。
type GatewayProjectionManualPublishReadiness struct {
	TotalSubjectCount         int            `json:"totalSubjectCount"`
	PublishableSubjectCount   int            `json:"publishableSubjectCount"`
	ActivePublishableCount    int            `json:"activePublishableCount"`
	TombstonePublishableCount int            `json:"tombstonePublishableCount"`
	BlockedByCategory         map[string]int `json:"blockedByCategory,omitempty"`
}

// GatewayProjectionManualPublishService 编排只读 preflight 与一次受控 publish attempt。
// 该服务只复用 Admin producer，不写 gateway 授权事实，不查询 API/Insight 数据源。
type GatewayProjectionManualPublishService struct {
	Store     GatewayProjectionSnapshotStore
	Publisher GatewayProjectionOrganizationPublisher
	Config    GatewayProjectionPublisherConfig
	Now       func() time.Time
}

// Publish 执行一次 operator 触发的受控 gateway projection publish。
// 不满足配置、source、lineage 或 publishable subject 前置条件时直接返回 blocked envelope。
func (s GatewayProjectionManualPublishService) Publish(ctx context.Context, request GatewayProjectionManualPublishRequest) (GatewayProjectionManualPublishResult, error) {
	startedAt := s.now()
	organizationID := normalizeGatewayProjectionString(request.OrganizationID)
	if organizationID == "" {
		return GatewayProjectionManualPublishResult{}, errors.New("gateway projection organization is required")
	}
	traceID := normalizeGatewayProjectionString(request.TraceID)
	if traceID == "" {
		traceID = fmt.Sprintf("manual-publish-%d", startedAt.UTC().UnixMilli())
	}

	snapshot, err := s.snapshotStore().GetGatewayProjectionSnapshot(organizationID)
	if err != nil {
		return GatewayProjectionManualPublishResult{}, err
	}
	if snapshot == nil {
		snapshot = &GatewayProjectionSnapshot{}
	}

	config := s.publisherConfig()
	publisherSummary := s.publisherSummary(config)
	sourceSummary := buildGatewayProjectionSourceConnectionSummary(snapshot.SourceConnections)
	readiness := buildGatewayProjectionManualPublishReadiness(snapshot)
	build, buildErr := buildGatewayProjectionManualPublishDryRun(config, snapshot, organizationID, traceID, startedAt)
	disabledReasons := gatewayProjectionManualPublishDisabledReasons(config, sourceSummary, build, buildErr)
	if len(disabledReasons) > 0 {
		result := buildGatewayProjectionManualPublishResult(startedAt, traceID, GatewayProjectionServiceResult{Build: build}, publisherSummary, sourceSummary, readiness)
		result.Status = "error"
		result.ErrorCode = disabledReasons[0]
		result.FailureCategory = disabledReasons[0]
		result.DisabledReasons = disabledReasons
		return result, nil
	}

	result, publishErr := s.publisher(config, snapshot).BuildAndPublishOrganization(ctx, organizationID, traceID)
	envelope := buildGatewayProjectionManualPublishResult(startedAt, traceID, result, publisherSummary, sourceSummary, readiness)
	if publishErr != nil && envelope.FailureCategory == "" {
		envelope.FailureCategory = GatewayProjectionFailureGatewayUnavailable
		envelope.ErrorCode = firstNonEmpty(envelope.ErrorCode, GatewayProjectionPublishErrorProviderUnavailable)
		envelope.Status = "error"
	}
	return envelope, publishErr
}

func (s GatewayProjectionManualPublishService) snapshotStore() GatewayProjectionSnapshotStore {
	if s.Store != nil {
		return s.Store
	}
	return defaultGatewayProjectionSnapshotStore{}
}

func (s GatewayProjectionManualPublishService) publisherConfig() GatewayProjectionPublisherConfig {
	if s.Config.Endpoint != "" || s.Config.Token != "" || s.Config.Caller != "" || s.Config.FreshnessTTL > 0 || s.Config.Enabled {
		config := s.Config
		config.Caller = firstNonEmpty(config.Caller, GatewayProjectionDefaultCaller)
		if config.FreshnessTTL <= 0 {
			config.FreshnessTTL = GatewayProjectionDefaultFreshnessTTL
		}
		return config
	}
	config := GetGatewayProjectionPublisherConfig()
	if config.FreshnessTTL <= 0 {
		config.FreshnessTTL = GatewayProjectionDefaultFreshnessTTL
	}
	return config
}

func (s GatewayProjectionManualPublishService) publisher(config GatewayProjectionPublisherConfig, snapshot *GatewayProjectionSnapshot) GatewayProjectionOrganizationPublisher {
	if s.Publisher != nil {
		return s.Publisher
	}
	return &GatewayProjectionService{
		Store:     gatewayProjectionStaticSnapshotStore{snapshot: snapshot},
		Config:    config,
		Publisher: GatewayProjectionPublisher{Config: config},
		Now:       s.Now,
	}
}

func (s GatewayProjectionManualPublishService) publisherSummary(config GatewayProjectionPublisherConfig) GatewayProjectionPublisherObservability {
	configured := strings.TrimSpace(config.Endpoint) != "" && strings.TrimSpace(config.Token) != ""
	disabledReason := ""
	if !config.Enabled {
		disabledReason = gatewayProjectionManualFailurePublisherDisabled
	} else if !configured {
		disabledReason = GatewayProjectionFailureProjectionTokenMissing
	}
	return GatewayProjectionPublisherObservability{
		Enabled:             config.Enabled,
		Configured:          configured,
		DisabledReason:      disabledReason,
		FreshnessTTLSeconds: int64(config.FreshnessTTL / time.Second),
		MaxRetries:          normalizeGatewayProjectionMaxRetries(config.MaxRetries),
	}
}

func (s GatewayProjectionManualPublishService) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func buildGatewayProjectionManualPublishReadiness(snapshot *GatewayProjectionSnapshot) GatewayProjectionManualPublishReadiness {
	readiness := GatewayProjectionManualPublishReadiness{BlockedByCategory: map[string]int{}}
	if snapshot == nil {
		return readiness
	}
	mappingsBySubject := map[string]*PlatformApiUserMapping{}
	for i := range snapshot.ApiUserMappings {
		mapping := &snapshot.ApiUserMappings[i]
		mappingsBySubject[normalizeGatewayProjectionString(mapping.AdminSubject)] = mapping
	}
	for i := range snapshot.Users {
		user := &snapshot.Users[i]
		candidate := buildPlatformApiUserMappingReadinessSubject(user, mappingsBySubject[normalizeGatewayProjectionString(user.AdminSubject)])
		readiness.TotalSubjectCount++
		switch candidate.ReadinessCategory {
		case PlatformApiMappingReadinessActivePublishable:
			readiness.ActivePublishableCount++
			readiness.PublishableSubjectCount++
		case PlatformApiMappingReadinessTombstonePublishable:
			readiness.TombstonePublishableCount++
			readiness.PublishableSubjectCount++
		default:
			readiness.BlockedByCategory[candidate.ReadinessCategory]++
		}
	}
	if len(readiness.BlockedByCategory) == 0 {
		readiness.BlockedByCategory = nil
	}
	return readiness
}

func gatewayProjectionManualPublishDisabledReasons(config GatewayProjectionPublisherConfig, sourceSummary GatewayProjectionSourceConnectionSummary, build GatewayProjectionBuildResult, buildErr error) []string {
	reasons := []string{}
	configured := strings.TrimSpace(config.Endpoint) != "" && strings.TrimSpace(config.Token) != ""
	if !config.Enabled {
		reasons = append(reasons, gatewayProjectionManualFailurePublisherDisabled)
	} else if !configured {
		reasons = append(reasons, GatewayProjectionFailureProjectionTokenMissing)
	}
	if sourceSummary.StatusCounts[SourceConnectionStatusDisabled] > 0 {
		reasons = append(reasons, GatewayProjectionFailureSourceConnectionDisabled)
	}
	if sourceSummary.HasStaleFreshness || sourceSummary.HasUnavailableFreshness {
		reasons = append(reasons, GatewayProjectionFailureSourceConnectionStale)
	}
	if buildErr != nil {
		reasons = append(reasons, GatewayProjectionFailureLineageInvalid)
	}
	if buildErr == nil && build.Summary.PublishedSubjectCount == 0 {
		reasons = append(reasons, GatewayProjectionFailureNoPublishableSubjects)
	}
	return uniqueGatewayProjectionManualReasons(reasons)
}

func buildGatewayProjectionManualPublishDryRun(config GatewayProjectionPublisherConfig, snapshot *GatewayProjectionSnapshot, organizationID string, traceID string, generatedAt time.Time) (GatewayProjectionBuildResult, error) {
	if snapshot == nil {
		snapshot = &GatewayProjectionSnapshot{}
	}
	return BuildGatewayProjectionBatch(GatewayProjectionBuildInput{
		TraceID:            traceID,
		Caller:             firstNonEmpty(config.Caller, GatewayProjectionDefaultCaller),
		OrganizationID:     organizationID,
		GeneratedAt:        generatedAt.UTC(),
		FreshnessTTL:       config.FreshnessTTL,
		SourceConnections:  snapshot.SourceConnections,
		AdminUsers:         snapshot.AdminUsers,
		Users:              snapshot.Users,
		ApiUserMappings:    snapshot.ApiUserMappings,
		Departments:        snapshot.Departments,
		Memberships:        snapshot.Memberships,
		ExternalIdentities: snapshot.ExternalIdentities,
		SyncBatch:          snapshot.SyncBatch,
	})
}

func buildGatewayProjectionManualPublishResult(startedAt time.Time, traceID string, result GatewayProjectionServiceResult, publisher GatewayProjectionPublisherObservability, sourceSummary GatewayProjectionSourceConnectionSummary, readiness GatewayProjectionManualPublishReadiness) GatewayProjectionManualPublishResult {
	request := result.Build.Request
	publish := result.Publish
	active, tombstone := countGatewayProjectionSubjectLifecycle(request.Subjects)
	status := "error"
	if publish.Success {
		status = "ok"
	}
	failureCategory := GatewayProjectionFailureCategory(publish.ErrorCode)
	if failureCategory == "" {
		failureCategory = gatewayProjectionBuildFailureCategory(result.Build)
	}
	if failureCategory == "" {
		failureCategory = gatewayProjectionSourceConnectionFailureCategory(sourceSummary)
	}
	return GatewayProjectionManualPublishResult{
		Status:                  status,
		GeneratedAt:             formatGatewayProjectionObservabilityTime(startedAt),
		TraceID:                 traceID,
		Accepted:                publish.Accepted,
		Idempotent:              publish.Idempotent,
		Retryable:               publish.Retryable,
		ProjectionBatchID:       request.ProjectionBatchID,
		OrgVersion:              request.OrgVersion,
		SourceVersion:           request.Lineage.SourceVersion,
		FreshnessExpiresAt:      formatGatewayProjectionObservabilityTime(request.Freshness.ExpiresAt),
		SubjectCount:            len(request.Subjects),
		ActiveSubjectCount:      active,
		TombstoneSubjectCount:   tombstone,
		SkippedSubjectCount:     result.Build.Summary.SkippedSubjectCount,
		SkippedByReason:         cloneGatewayProjectionSkipSummary(result.Build.Summary.SkippedByReason),
		ErrorCode:               publish.ErrorCode,
		FailureCategory:         failureCategory,
		DurationMs:              gatewayProjectionManualDurationMs(startedAt),
		Publisher:               publisher,
		SourceConnectionSummary: sourceSummary,
		Readiness:               readiness,
		LatestPublish:           cloneGatewayProjectionLatestPublish(GetGatewayProjectionObservabilitySnapshot(time.Now().UTC()).Latest),
	}
}

func gatewayProjectionManualDurationMs(startedAt time.Time) int64 {
	duration := time.Since(startedAt).Milliseconds()
	if duration < 0 {
		return 0
	}
	return duration
}

func uniqueGatewayProjectionManualReasons(reasons []string) []string {
	seen := map[string]bool{}
	result := []string{}
	for _, reason := range reasons {
		if reason == "" || seen[reason] {
			continue
		}
		seen[reason] = true
		result = append(result, reason)
	}
	return result
}

type gatewayProjectionStaticSnapshotStore struct {
	snapshot *GatewayProjectionSnapshot
}

func (s gatewayProjectionStaticSnapshotStore) GetGatewayProjectionSnapshot(organizationID string) (*GatewayProjectionSnapshot, error) {
	if s.snapshot == nil {
		return &GatewayProjectionSnapshot{}, nil
	}
	copied := *s.snapshot
	return &copied, nil
}
