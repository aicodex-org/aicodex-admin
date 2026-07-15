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
	"errors"
	"sort"
	"strings"
	"time"
)

const (
	GatewayProjectionContractVersionNotDeclared = "not_declared_by_gateway_contract"

	GatewayProjectionRetryReadinessSafeRetry           = "safe_retry"
	GatewayProjectionRetryReadinessWaitSourceRefresh   = "wait_source_refresh"
	GatewayProjectionRetryReadinessFixMappingOrSubject = "fix_mapping_or_subject"
	GatewayProjectionRetryReadinessFixPublisherConfig  = "fix_publisher_config"
	GatewayProjectionRetryReadinessInspectContract     = "inspect_gateway_contract"
	GatewayProjectionRetryReadinessUnknown             = "unknown"
)

// GatewayProjectionRunReadinessQuery 限定 operator 只读查询的组织和可选 latest run 引用。
// 由于当前仓库没有持久 publish run store，traceId/projectionBatchId 只用于校验进程内 latest attempt。
type GatewayProjectionRunReadinessQuery struct {
	OrganizationID    string
	TraceID           string
	ProjectionBatchID string
}

// GatewayProjectionRunReadinessSummary 是 Admin producer 视角的 run diff 与 retry readiness 脱敏摘要。
// 它不包含 gateway endpoint/token/raw response，也不代表 Gateway/API/Insight 授权事实。
type GatewayProjectionRunReadinessSummary struct {
	GeneratedAt      string                               `json:"generatedAt"`
	Source           GatewayProjectionRunSourceSummary    `json:"source"`
	Target           GatewayProjectionRunTargetSummary    `json:"target"`
	Current          GatewayProjectionRunSubjectSummary   `json:"current"`
	Latest           *GatewayProjectionRunSubjectSummary  `json:"latest,omitempty"`
	Diff             GatewayProjectionRunDiffSummary      `json:"diff"`
	Retry            GatewayProjectionRetrySummary        `json:"retry"`
	RunReference     GatewayProjectionRunReferenceSummary `json:"runReference"`
	LastFailureAlias string                               `json:"lastFailureAlias,omitempty"`
}

type GatewayProjectionRunSourceSummary struct {
	OrganizationID          string                                   `json:"organizationId"`
	SourceVersion           string                                   `json:"sourceVersion,omitempty"`
	OrgVersion              int64                                    `json:"orgVersion,omitempty"`
	FreshnessExpiresAt      string                                   `json:"freshnessExpiresAt,omitempty"`
	SourceConnectionSummary GatewayProjectionSourceConnectionSummary `json:"sourceConnectionSummary"`
}

type GatewayProjectionRunTargetSummary struct {
	ContractVersionStatus   string `json:"contractVersionStatus"`
	ProjectionVersionSample string `json:"projectionVersionSample,omitempty"`
	ProjectionVersionCount  int    `json:"projectionVersionCount"`
}

type GatewayProjectionRunSubjectSummary struct {
	ProjectionBatchID     string         `json:"projectionBatchId,omitempty"`
	TraceID               string         `json:"traceId,omitempty"`
	SourceVersion         string         `json:"sourceVersion,omitempty"`
	OrgVersion            int64          `json:"orgVersion,omitempty"`
	SubjectCount          int            `json:"subjectCount"`
	ActiveSubjectCount    int            `json:"activeSubjectCount"`
	TombstoneSubjectCount int            `json:"tombstoneSubjectCount"`
	UnmappedSubjectCount  int            `json:"unmappedSubjectCount"`
	InvalidSubjectCount   int            `json:"invalidSubjectCount"`
	SkippedSubjectCount   int            `json:"skippedSubjectCount"`
	SkippedByReason       map[string]int `json:"skippedByReason,omitempty"`
	Status                string         `json:"status,omitempty"`
	Retryable             bool           `json:"retryable"`
	FailureCategory       string         `json:"failureCategory,omitempty"`
}

type GatewayProjectionRunDiffSummary struct {
	Compared               bool `json:"compared"`
	SourceVersionChanged   bool `json:"sourceVersionChanged"`
	OrgVersionChanged      bool `json:"orgVersionChanged"`
	ProjectionBatchChanged bool `json:"projectionBatchChanged"`
	SubjectCountChanged    bool `json:"subjectCountChanged"`
	ActiveCountChanged     bool `json:"activeCountChanged"`
	TombstoneCountChanged  bool `json:"tombstoneCountChanged"`
}

type GatewayProjectionRetrySummary struct {
	Readiness      string   `json:"readiness"`
	SafeToRetry    bool     `json:"safeToRetry"`
	OperatorAction string   `json:"operatorAction"`
	Reasons        []string `json:"reasons,omitempty"`
}

type GatewayProjectionRunReferenceSummary struct {
	Available         bool   `json:"available"`
	Matched           bool   `json:"matched"`
	ReferenceType     string `json:"referenceType,omitempty"`
	TraceID           string `json:"traceId,omitempty"`
	ProjectionBatchID string `json:"projectionBatchId,omitempty"`
	StorageScope      string `json:"storageScope"`
}

// GatewayProjectionRunReadinessService 基于 Admin 当前快照和 latest publish observability 生成只读 retry 判断。
// 它只执行 dry-run build，不触发 publisher，也不读取 API/Gateway/Insight owner 的运行库。
type GatewayProjectionRunReadinessService struct {
	Store  GatewayProjectionSnapshotStore
	Config GatewayProjectionPublisherConfig
	Now    func() time.Time
}

func (s GatewayProjectionRunReadinessService) GetReadiness(query GatewayProjectionRunReadinessQuery) (GatewayProjectionRunReadinessSummary, error) {
	now := s.now().UTC()
	organizationID := normalizeGatewayProjectionString(query.OrganizationID)
	if organizationID == "" {
		return GatewayProjectionRunReadinessSummary{}, errors.New("gateway projection organization is required")
	}
	snapshot, err := s.snapshotStore().GetGatewayProjectionSnapshot(organizationID)
	if err != nil {
		return GatewayProjectionRunReadinessSummary{}, err
	}
	if snapshot == nil {
		snapshot = &GatewayProjectionSnapshot{}
	}

	config := s.publisherConfig()
	build, buildErr := buildGatewayProjectionManualPublishDryRun(config, snapshot, organizationID, "run-readiness", now)
	sourceSummary := buildGatewayProjectionSourceConnectionSummary(snapshot.SourceConnections)
	current := buildGatewayProjectionRunCurrentSummary(build, buildErr)
	latest := buildGatewayProjectionRunLatestSummary(GetGatewayProjectionObservabilitySnapshot(now).Latest)
	reference := buildGatewayProjectionRunReferenceSummary(query, latest)
	diff := buildGatewayProjectionRunDiffSummary(current, latest)
	lastFailureAlias := gatewayProjectionRunLastFailureAlias(latest)
	retry := buildGatewayProjectionRetrySummary(config, sourceSummary, current, latest, diff, lastFailureAlias, buildErr)

	return GatewayProjectionRunReadinessSummary{
		GeneratedAt:      formatGatewayProjectionObservabilityTime(now),
		Source:           buildGatewayProjectionRunSourceSummary(organizationID, build, sourceSummary),
		Target:           buildGatewayProjectionRunTargetSummary(build),
		Current:          current,
		Latest:           latest,
		Diff:             diff,
		Retry:            retry,
		RunReference:     reference,
		LastFailureAlias: lastFailureAlias,
	}, nil
}

func (s GatewayProjectionRunReadinessService) snapshotStore() GatewayProjectionSnapshotStore {
	if s.Store != nil {
		return s.Store
	}
	return defaultGatewayProjectionSnapshotStore{}
}

func (s GatewayProjectionRunReadinessService) publisherConfig() GatewayProjectionPublisherConfig {
	if s.Config.Endpoint != "" || s.Config.Token != "" || s.Config.Caller != "" || s.Config.FreshnessTTL > 0 || s.Config.Enabled || s.Config.Resolution.GroupKey != "" {
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

func (s GatewayProjectionRunReadinessService) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func buildGatewayProjectionRunSourceSummary(organizationID string, build GatewayProjectionBuildResult, sourceSummary GatewayProjectionSourceConnectionSummary) GatewayProjectionRunSourceSummary {
	return GatewayProjectionRunSourceSummary{
		OrganizationID:          organizationID,
		SourceVersion:           build.Request.Lineage.SourceVersion,
		OrgVersion:              build.Request.OrgVersion,
		FreshnessExpiresAt:      formatGatewayProjectionObservabilityTime(build.Request.Freshness.ExpiresAt),
		SourceConnectionSummary: sourceSummary,
	}
}

func buildGatewayProjectionRunTargetSummary(build GatewayProjectionBuildResult) GatewayProjectionRunTargetSummary {
	versions := make([]string, 0, len(build.Request.Subjects))
	seen := map[string]bool{}
	for _, subject := range build.Request.Subjects {
		version := normalizeGatewayProjectionString(subject.ProjectionVersion)
		if version == "" || seen[version] {
			continue
		}
		seen[version] = true
		versions = append(versions, version)
	}
	sort.Strings(versions)
	sample := ""
	if len(versions) > 0 {
		sample = versions[0]
	}
	return GatewayProjectionRunTargetSummary{
		ContractVersionStatus:   GatewayProjectionContractVersionNotDeclared,
		ProjectionVersionSample: sample,
		ProjectionVersionCount:  len(versions),
	}
}

func buildGatewayProjectionRunCurrentSummary(build GatewayProjectionBuildResult, buildErr error) GatewayProjectionRunSubjectSummary {
	active, tombstone := countGatewayProjectionSubjectLifecycle(build.Request.Subjects)
	skipped := cloneGatewayProjectionSkipSummary(build.Summary.SkippedByReason)
	summary := GatewayProjectionRunSubjectSummary{
		ProjectionBatchID:     build.Request.ProjectionBatchID,
		TraceID:               build.Request.TraceID,
		SourceVersion:         build.Request.Lineage.SourceVersion,
		OrgVersion:            build.Request.OrgVersion,
		SubjectCount:          len(build.Request.Subjects),
		ActiveSubjectCount:    active,
		TombstoneSubjectCount: tombstone,
		SkippedSubjectCount:   build.Summary.SkippedSubjectCount,
		SkippedByReason:       skipped,
		Status:                "ok",
	}
	if buildErr != nil {
		summary.Status = "error"
		summary.FailureCategory = GatewayProjectionFailureLineageInvalid
	}
	summary.UnmappedSubjectCount = skipped[GatewayProjectionSkipMappingMissing] + skipped[GatewayProjectionSkipMappingUntrusted]
	summary.InvalidSubjectCount = skipped[GatewayProjectionSkipLifecycleInvalid] + skipped[GatewayProjectionSkipSourceDataInvalid]
	return summary
}

func buildGatewayProjectionRunLatestSummary(latest *GatewayProjectionLatestPublishObservability) *GatewayProjectionRunSubjectSummary {
	if latest == nil {
		return nil
	}
	return &GatewayProjectionRunSubjectSummary{
		ProjectionBatchID:     latest.ProjectionBatchID,
		TraceID:               latest.TraceID,
		SourceVersion:         latest.SourceVersion,
		OrgVersion:            latest.OrgVersion,
		SubjectCount:          latest.SubjectCount,
		ActiveSubjectCount:    latest.ActiveSubjectCount,
		TombstoneSubjectCount: latest.TombstoneSubjectCount,
		SkippedSubjectCount:   latest.SkippedSubjectCount,
		SkippedByReason:       cloneGatewayProjectionSkipSummary(latest.SkippedByReason),
		Status:                latest.Status,
		Retryable:             latest.Retryable,
		FailureCategory:       latest.FailureCategory,
	}
}

func buildGatewayProjectionRunReferenceSummary(query GatewayProjectionRunReadinessQuery, latest *GatewayProjectionRunSubjectSummary) GatewayProjectionRunReferenceSummary {
	reference := GatewayProjectionRunReferenceSummary{
		Available:    latest != nil,
		StorageScope: "latest_in_process_observability",
	}
	if latest == nil {
		return reference
	}
	reference.TraceID = latest.TraceID
	reference.ProjectionBatchID = latest.ProjectionBatchID
	traceID := normalizeGatewayProjectionString(query.TraceID)
	projectionBatchID := normalizeGatewayProjectionString(query.ProjectionBatchID)
	switch {
	case traceID != "":
		reference.ReferenceType = "traceId"
		reference.Matched = traceID == latest.TraceID
	case projectionBatchID != "":
		reference.ReferenceType = "projectionBatchId"
		reference.Matched = projectionBatchID == latest.ProjectionBatchID
	default:
		reference.ReferenceType = "latest"
		reference.Matched = true
	}
	return reference
}

func buildGatewayProjectionRunDiffSummary(current GatewayProjectionRunSubjectSummary, latest *GatewayProjectionRunSubjectSummary) GatewayProjectionRunDiffSummary {
	if latest == nil {
		return GatewayProjectionRunDiffSummary{}
	}
	return GatewayProjectionRunDiffSummary{
		Compared:               true,
		SourceVersionChanged:   current.SourceVersion != latest.SourceVersion,
		OrgVersionChanged:      current.OrgVersion != latest.OrgVersion,
		ProjectionBatchChanged: current.ProjectionBatchID != latest.ProjectionBatchID,
		SubjectCountChanged:    current.SubjectCount != latest.SubjectCount,
		ActiveCountChanged:     current.ActiveSubjectCount != latest.ActiveSubjectCount,
		TombstoneCountChanged:  current.TombstoneSubjectCount != latest.TombstoneSubjectCount,
	}
}

func gatewayProjectionRunLastFailureAlias(latest *GatewayProjectionRunSubjectSummary) string {
	if latest == nil || strings.EqualFold(latest.Status, "ok") {
		return ""
	}
	if latest.FailureCategory != "" {
		return latest.FailureCategory
	}
	return GatewayProjectionFailureUnknown
}

func buildGatewayProjectionRetrySummary(config GatewayProjectionPublisherConfig, sourceSummary GatewayProjectionSourceConnectionSummary, current GatewayProjectionRunSubjectSummary, latest *GatewayProjectionRunSubjectSummary, diff GatewayProjectionRunDiffSummary, lastFailureAlias string, buildErr error) GatewayProjectionRetrySummary {
	reasons := []string{}
	configured := strings.TrimSpace(config.Endpoint) != "" && strings.TrimSpace(config.Token) != ""
	if !config.Enabled || !configured {
		reasons = append(reasons, gatewayProjectionPublisherDisabledReason(config))
		reasons = append(reasons, config.BlockedReasons...)
		return newGatewayProjectionRetrySummary(GatewayProjectionRetryReadinessFixPublisherConfig, false, "修复 Admin gateway projection publisher 配置后再评估 retry。", reasons)
	}
	sourceFailure := gatewayProjectionSourceConnectionFailureCategory(sourceSummary)
	if sourceFailure == GatewayProjectionFailureSourceConnectionDisabled || sourceFailure == GatewayProjectionFailureSourceConnectionStale || diff.SourceVersionChanged || diff.OrgVersionChanged {
		reasons = append(reasons, firstNonEmpty(sourceFailure, "source_version_changed"))
		return newGatewayProjectionRetrySummary(GatewayProjectionRetryReadinessWaitSourceRefresh, false, "等待或触发 Admin source refresh，确认 source freshness/version 稳定后再 retry。", reasons)
	}
	if buildErr != nil || current.UnmappedSubjectCount > 0 || current.InvalidSubjectCount > 0 || lastFailureAlias == GatewayProjectionFailureMappingUntrusted || lastFailureAlias == GatewayProjectionFailureLifecycleUntrusted {
		reasons = append(reasons, "mapping_or_subject_not_ready")
		return newGatewayProjectionRetrySummary(GatewayProjectionRetryReadinessFixMappingOrSubject, false, "修复 Admin mapping、lifecycle 或 source subject 数据后重新读取 readiness。", reasons)
	}
	if lastFailureAlias == GatewayProjectionFailureGatewayContractMismatch {
		reasons = append(reasons, lastFailureAlias)
		return newGatewayProjectionRetrySummary(GatewayProjectionRetryReadinessInspectContract, false, "检查 Admin 与 Gateway ingestion contract 兼容性，不能直接盲目 retry。", reasons)
	}
	if latest != nil && (latest.Retryable || lastFailureAlias == GatewayProjectionFailureGatewayUnavailable) && !diff.SourceVersionChanged && !diff.OrgVersionChanged && !diff.SubjectCountChanged && !diff.ActiveCountChanged && !diff.TombstoneCountChanged {
		reasons = append(reasons, firstNonEmpty(lastFailureAlias, "latest_retryable"))
		return newGatewayProjectionRetrySummary(GatewayProjectionRetryReadinessSafeRetry, true, "可安全 retry 同一 Admin producer 输入；仍需下游受控验证确认 Gateway/API/Insight 行为。", reasons)
	}
	if latest == nil {
		reasons = append(reasons, "latest_run_unavailable")
	} else if diff.SubjectCountChanged || diff.ActiveCountChanged || diff.TombstoneCountChanged {
		reasons = append(reasons, "projection_subject_counts_changed")
	}
	return newGatewayProjectionRetrySummary(GatewayProjectionRetryReadinessUnknown, false, "信号不足或 projection 摘要已变化，请先复查 Admin readiness 再决定。", reasons)
}

func newGatewayProjectionRetrySummary(readiness string, safe bool, action string, reasons []string) GatewayProjectionRetrySummary {
	return GatewayProjectionRetrySummary{
		Readiness:      readiness,
		SafeToRetry:    safe,
		OperatorAction: action,
		Reasons:        uniqueGatewayProjectionManualReasons(reasons),
	}
}
