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
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	GatewayProjectionFailureProjectionTokenMissing   = "projection_token_missing"
	GatewayProjectionFailureGatewayUnavailable       = "gateway_unavailable"
	GatewayProjectionFailureGatewayContractMismatch  = "gateway_contract_mismatch"
	GatewayProjectionFailureSourceConnectionStale    = "source_connection_stale"
	GatewayProjectionFailureSourceConnectionDisabled = "source_connection_disabled"
	GatewayProjectionFailureMappingUntrusted         = "mapping_untrusted"
	GatewayProjectionFailureLifecycleUntrusted       = "lifecycle_untrusted"
	GatewayProjectionFailureLineageInvalid           = "lineage_invalid"
	GatewayProjectionFailureNoPublishableSubjects    = "no_publishable_subjects"
	GatewayProjectionFailureUnknown                  = "unknown"
)

// GatewayProjectionObservabilitySnapshot 是 admin-only projection producer 脱敏诊断视图。
// 它只服务运行态排障和 smoke，不代表 gateway authorization facts。
type GatewayProjectionObservabilitySnapshot struct {
	GeneratedAt string                                       `json:"generatedAt"`
	Publisher   GatewayProjectionPublisherObservability      `json:"publisher"`
	Refresh     GatewayProjectionRefreshObservability        `json:"refresh"`
	Latest      *GatewayProjectionLatestPublishObservability `json:"latestPublish,omitempty"`
}

type GatewayProjectionPublisherObservability struct {
	Enabled             bool   `json:"enabled"`
	Configured          bool   `json:"configured"`
	DisabledReason      string `json:"disabledReason,omitempty"`
	FreshnessTTLSeconds int64  `json:"freshnessTtlSeconds"`
	MaxRetries          int    `json:"maxRetries"`
}

type GatewayProjectionRefreshObservability struct {
	Enabled             bool   `json:"enabled"`
	DisabledReason      string `json:"disabledReason,omitempty"`
	IntervalSeconds     int64  `json:"intervalSeconds"`
	InitialDelaySeconds int64  `json:"initialDelaySeconds"`
	BatchSize           int    `json:"batchSize"`
	IntervalLessThanTTL bool   `json:"intervalLessThanTtl"`
	LastRunAt           string `json:"lastRunAt,omitempty"`
	NextRunAt           string `json:"nextRunAt,omitempty"`
	LastSuccessAt       string `json:"lastSuccessAt,omitempty"`
	LastFailureAt       string `json:"lastFailureAt,omitempty"`
	LastFailureCategory string `json:"lastFailureCategory,omitempty"`
	LastOrganizations   int    `json:"lastOrganizations"`
	LastPublished       int    `json:"lastPublished"`
	LastFailed          int    `json:"lastFailed"`
	LastSkipped         int    `json:"lastSkipped"`
}

type GatewayProjectionLatestPublishObservability struct {
	TraceID                string         `json:"traceId,omitempty"`
	Caller                 string         `json:"caller,omitempty"`
	ProjectionBatchID      string         `json:"projectionBatchId,omitempty"`
	OrgVersion             int64          `json:"orgVersion,omitempty"`
	SourceVersion          string         `json:"sourceVersion,omitempty"`
	GeneratedAt            string         `json:"generatedAt,omitempty"`
	FreshnessExpiresAt     string         `json:"freshnessExpiresAt,omitempty"`
	SourceConnectionStatus string         `json:"sourceConnectionStatus,omitempty"`
	SubjectCount           int            `json:"subjectCount"`
	ActiveSubjectCount     int            `json:"activeSubjectCount"`
	TombstoneSubjectCount  int            `json:"tombstoneSubjectCount"`
	SkippedSubjectCount    int            `json:"skippedSubjectCount"`
	SkippedByReason        map[string]int `json:"skippedByReason,omitempty"`
	Status                 string         `json:"status"`
	StatusCode             int            `json:"statusCode,omitempty"`
	ErrorCode              string         `json:"errorCode,omitempty"`
	FailureCategory        string         `json:"failureCategory,omitempty"`
	Attempts               int            `json:"attempts"`
	Accepted               bool           `json:"accepted"`
	Idempotent             bool           `json:"idempotent"`
	Retryable              bool           `json:"retryable"`
	DurationMs             int64          `json:"durationMs"`
}

type gatewayProjectionObservabilityState struct {
	mu         sync.Mutex
	latest     *GatewayProjectionLatestPublishObservability
	refreshRun GatewayProjectionRefreshObservability
}

var gatewayProjectionObservability gatewayProjectionObservabilityState

// GetGatewayProjectionObservabilitySnapshot 返回当前进程内 projection producer 脱敏诊断状态。
func GetGatewayProjectionObservabilitySnapshot(now time.Time) GatewayProjectionObservabilitySnapshot {
	if now.IsZero() {
		now = time.Now()
	}
	publisherConfig := GetGatewayProjectionPublisherConfig()
	refreshConfig := GetGatewayProjectionRefreshConfig()
	freshnessTTL := publisherConfig.FreshnessTTL
	if freshnessTTL <= 0 {
		freshnessTTL = GatewayProjectionDefaultFreshnessTTL
	}
	configured := strings.TrimSpace(publisherConfig.Endpoint) != "" && strings.TrimSpace(publisherConfig.Token) != ""
	disabledReason := ""
	if !publisherConfig.Enabled {
		disabledReason = "publisher_disabled"
	} else if !configured {
		disabledReason = GatewayProjectionFailureProjectionTokenMissing
	}

	gatewayProjectionObservability.mu.Lock()
	latest := cloneGatewayProjectionLatestPublish(gatewayProjectionObservability.latest)
	refreshRun := gatewayProjectionObservability.refreshRun
	gatewayProjectionObservability.mu.Unlock()

	refresh := GatewayProjectionRefreshObservability{
		Enabled:             refreshConfig.Enabled,
		DisabledReason:      refreshConfig.DisabledReason,
		IntervalSeconds:     int64(refreshConfig.Interval / time.Second),
		InitialDelaySeconds: int64(refreshConfig.InitialDelay / time.Second),
		BatchSize:           refreshConfig.BatchSize,
		IntervalLessThanTTL: refreshConfig.Interval > 0 && refreshConfig.Interval < freshnessTTL,
		LastRunAt:           refreshRun.LastRunAt,
		NextRunAt:           refreshRun.NextRunAt,
		LastSuccessAt:       refreshRun.LastSuccessAt,
		LastFailureAt:       refreshRun.LastFailureAt,
		LastFailureCategory: refreshRun.LastFailureCategory,
		LastOrganizations:   refreshRun.LastOrganizations,
		LastPublished:       refreshRun.LastPublished,
		LastFailed:          refreshRun.LastFailed,
		LastSkipped:         refreshRun.LastSkipped,
	}
	if refresh.DisabledReason == "" && !refresh.Enabled {
		refresh.DisabledReason = "refresh_disabled"
	}

	return GatewayProjectionObservabilitySnapshot{
		GeneratedAt: formatGatewayProjectionObservabilityTime(now),
		Publisher: GatewayProjectionPublisherObservability{
			Enabled:             publisherConfig.Enabled,
			Configured:          configured,
			DisabledReason:      disabledReason,
			FreshnessTTLSeconds: int64(freshnessTTL / time.Second),
			MaxRetries:          normalizeGatewayProjectionMaxRetries(publisherConfig.MaxRetries),
		},
		Refresh: refresh,
		Latest:  latest,
	}
}

func recordGatewayProjectionServiceObservability(build GatewayProjectionBuildResult, publish GatewayProjectionPublishResult, sourceConnections []SourceConnection, durationMs int64) {
	latest := buildGatewayProjectionLatestPublish(build.Request, publish, durationMs)
	latest.SkippedSubjectCount = build.Summary.SkippedSubjectCount
	latest.SkippedByReason = cloneGatewayProjectionSkipSummary(build.Summary.SkippedByReason)
	latest.SourceConnectionStatus = summarizeGatewayProjectionSourceConnections(sourceConnections)
	if latest.FailureCategory == "" {
		if strings.Contains(strings.ToUpper(latest.SourceConnectionStatus), SourceConnectionStatusDisabled) {
			latest.FailureCategory = GatewayProjectionFailureSourceConnectionDisabled
		}
	}
	if latest.FailureCategory == "" {
		latest.FailureCategory = gatewayProjectionBuildFailureCategory(build)
	}
	recordGatewayProjectionLatestPublish(latest)
}

func recordGatewayProjectionPublishAudit(event GatewayProjectionPublishAuditEvent, request GatewayProjectionBatchRequest) {
	latest := buildGatewayProjectionLatestPublish(request, GatewayProjectionPublishResult{
		Success:    event.Status == "ok",
		Accepted:   event.Accepted,
		Idempotent: event.Idempotent,
		Attempts:   event.Attempts,
		StatusCode: event.StatusCode,
		ErrorCode:  event.ErrorCode,
	}, event.DurationMs)
	latest.Status = event.Status
	recordGatewayProjectionLatestPublish(latest)
}

func recordGatewayProjectionLatestPublish(latest *GatewayProjectionLatestPublishObservability) {
	if latest == nil {
		return
	}
	gatewayProjectionObservability.mu.Lock()
	gatewayProjectionObservability.latest = latest
	gatewayProjectionObservability.mu.Unlock()
}

func recordGatewayProjectionRefreshObservability(config GatewayProjectionRefreshConfig, result GatewayProjectionRefreshRunResult, runAt time.Time) {
	if runAt.IsZero() {
		runAt = time.Now()
	}
	category := GatewayProjectionFailureCategory(result.ErrorCode)
	refresh := GatewayProjectionRefreshObservability{
		Enabled:             config.Enabled,
		DisabledReason:      config.DisabledReason,
		IntervalSeconds:     int64(config.Interval / time.Second),
		InitialDelaySeconds: int64(config.InitialDelay / time.Second),
		BatchSize:           config.BatchSize,
		IntervalLessThanTTL: true,
		LastRunAt:           formatGatewayProjectionObservabilityTime(runAt),
		LastOrganizations:   result.Organizations,
		LastPublished:       result.Published,
		LastFailed:          result.Failed,
		LastSkipped:         result.Skipped,
	}
	if config.Interval > 0 {
		refresh.NextRunAt = formatGatewayProjectionObservabilityTime(runAt.Add(config.Interval))
	}
	if result.Failed > 0 || result.ErrorCode != "" {
		refresh.LastFailureAt = refresh.LastRunAt
		refresh.LastFailureCategory = category
	} else if config.Enabled {
		refresh.LastSuccessAt = refresh.LastRunAt
	}
	gatewayProjectionObservability.mu.Lock()
	previous := gatewayProjectionObservability.refreshRun
	if refresh.LastSuccessAt == "" {
		refresh.LastSuccessAt = previous.LastSuccessAt
	}
	if refresh.LastFailureAt == "" {
		refresh.LastFailureAt = previous.LastFailureAt
		refresh.LastFailureCategory = previous.LastFailureCategory
	}
	gatewayProjectionObservability.refreshRun = refresh
	gatewayProjectionObservability.mu.Unlock()
}

func buildGatewayProjectionLatestPublish(request GatewayProjectionBatchRequest, result GatewayProjectionPublishResult, durationMs int64) *GatewayProjectionLatestPublishObservability {
	active, tombstone := countGatewayProjectionSubjectLifecycle(request.Subjects)
	status := "error"
	if result.Success {
		status = "ok"
	}
	return &GatewayProjectionLatestPublishObservability{
		TraceID:               request.TraceID,
		Caller:                request.Caller,
		ProjectionBatchID:     request.ProjectionBatchID,
		OrgVersion:            request.OrgVersion,
		SourceVersion:         request.Lineage.SourceVersion,
		GeneratedAt:           formatGatewayProjectionObservabilityTime(request.GeneratedAt),
		FreshnessExpiresAt:    formatGatewayProjectionObservabilityTime(request.Freshness.ExpiresAt),
		SubjectCount:          len(request.Subjects),
		ActiveSubjectCount:    active,
		TombstoneSubjectCount: tombstone,
		Status:                status,
		StatusCode:            result.StatusCode,
		ErrorCode:             result.ErrorCode,
		FailureCategory:       GatewayProjectionFailureCategory(result.ErrorCode),
		Attempts:              result.Attempts,
		Accepted:              result.Accepted,
		Idempotent:            result.Idempotent,
		Retryable:             result.Retryable,
		DurationMs:            durationMs,
	}
}

// GatewayProjectionFailureCategory 将内部错误码映射为跨 smoke/runbook 稳定的脱敏分类。
func GatewayProjectionFailureCategory(code string) string {
	switch strings.ToLower(strings.TrimSpace(code)) {
	case "":
		return ""
	case GatewayProjectionPublishErrorInvalidConfig:
		return GatewayProjectionFailureProjectionTokenMissing
	case GatewayProjectionPublishErrorProviderUnavailable, "refresh_in_progress":
		return GatewayProjectionFailureGatewayUnavailable
	case GatewayProjectionPublishErrorInvalidResponse, GatewayProjectionPublishErrorNotAccepted, "unauthenticated", "authorization_failed", "invalid_argument", "projection_expired", "stale_projection", "old_org_version":
		return GatewayProjectionFailureGatewayContractMismatch
	case GatewayProjectionSkipMappingMissing, GatewayProjectionSkipMappingUntrusted:
		return GatewayProjectionFailureMappingUntrusted
	case GatewayProjectionSkipLifecycleInvalid:
		return GatewayProjectionFailureLifecycleUntrusted
	case GatewayProjectionSkipSourceDataInvalid:
		return GatewayProjectionFailureSourceConnectionStale
	default:
		return GatewayProjectionFailureUnknown
	}
}

func gatewayProjectionBuildFailureCategory(build GatewayProjectionBuildResult) string {
	if len(build.Request.Subjects) == 0 {
		return GatewayProjectionFailureNoPublishableSubjects
	}
	for reason := range build.Summary.SkippedByReason {
		category := GatewayProjectionFailureCategory(reason)
		if category != "" && category != GatewayProjectionFailureUnknown {
			return category
		}
	}
	return ""
}

func summarizeGatewayProjectionSourceConnections(connections []SourceConnection) string {
	if len(connections) == 0 {
		return "missing"
	}
	statuses := make([]string, 0, len(connections))
	for _, connection := range connections {
		status := normalizeGatewayProjectionString(connection.Status)
		if status == "" {
			status = "unknown"
		}
		statuses = append(statuses, status)
	}
	sort.Strings(statuses)
	return strings.Join(statuses, ",")
}

func countGatewayProjectionSubjectLifecycle(subjects []GatewayProjectedSubject) (int, int) {
	active := 0
	tombstone := 0
	for _, subject := range subjects {
		if strings.EqualFold(subject.LifecycleStatus, "active") {
			active++
		} else {
			tombstone++
		}
	}
	return active, tombstone
}

func gatewayProjectionActiveSubjectCount(subjects []GatewayProjectedSubject) int {
	active, _ := countGatewayProjectionSubjectLifecycle(subjects)
	return active
}

func gatewayProjectionTombstoneSubjectCount(subjects []GatewayProjectedSubject) int {
	_, tombstone := countGatewayProjectionSubjectLifecycle(subjects)
	return tombstone
}

func cloneGatewayProjectionLatestPublish(latest *GatewayProjectionLatestPublishObservability) *GatewayProjectionLatestPublishObservability {
	if latest == nil {
		return nil
	}
	cloned := *latest
	cloned.SkippedByReason = cloneGatewayProjectionSkipSummary(latest.SkippedByReason)
	return &cloned
}

func cloneGatewayProjectionSkipSummary(summary map[string]int) map[string]int {
	if len(summary) == 0 {
		return nil
	}
	cloned := make(map[string]int, len(summary))
	for key, value := range summary {
		cloned[key] = value
	}
	return cloned
}

func formatGatewayProjectionObservabilityTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func resetGatewayProjectionObservabilityForTest() {
	gatewayProjectionObservability.mu.Lock()
	gatewayProjectionObservability.latest = nil
	gatewayProjectionObservability.refreshRun = GatewayProjectionRefreshObservability{}
	gatewayProjectionObservability.mu.Unlock()
}
