// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

const (
	FeishuHandoffEvidenceVersion     = "feishu-org-sync-handoff-evidence-v1"
	FeishuHandoffEvidenceRedactionV1 = "feishu-handoff-evidence-redaction-v1"

	FeishuHandoffEvidenceSourceLatest        = "latest"
	FeishuHandoffEvidenceSourceRun           = "run"
	FeishuHandoffEvidenceSourceDryRunHistory = "dry_run_history"

	FeishuHandoffEvidenceReadinessReady       = "ready"
	FeishuHandoffEvidenceReadinessBlocked     = "blocked"
	FeishuHandoffEvidenceReadinessNoRun       = "no_run"
	FeishuHandoffEvidenceReadinessUnsupported = "unsupported"
)

// FeishuOrganizationSyncHandoffEvidence 是给真实租户测试和下游验收交接使用的脱敏证据包。
// 它只聚合 Admin 本地同步元数据，不调用 Feishu Contact API，也不读取 Gateway/Insight 事实。
type FeishuOrganizationSyncHandoffEvidence struct {
	Organization           string                              `json:"organization"`
	EvidenceVersion        string                              `json:"evidenceVersion"`
	SourceType             string                              `json:"sourceType"`
	SourceIdHash           string                              `json:"sourceIdHash"`
	SourceStatus           string                              `json:"sourceStatus"`
	SourceCreatedAt        string                              `json:"sourceCreatedAt,omitempty"`
	EndpointMode           string                              `json:"endpointMode"`
	SourceTypeLabel        string                              `json:"sourceTypeLabel"`
	AppAlias               string                              `json:"appAlias"`
	TenantAlias            string                              `json:"tenantAlias"`
	SourceConnectionIdHash string                              `json:"sourceConnectionIdHash"`
	Readiness              string                              `json:"readiness"`
	Counts                 FeishuHandoffEvidenceCounts         `json:"counts"`
	BindingConflicts       FeishuHandoffEvidenceBindingSummary `json:"bindingConflicts"`
	SoftDisableSummary     FeishuHandoffEvidenceSoftDisable    `json:"softDisableSummary"`
	TriggerSummary         FeishuHandoffEvidenceTriggerSummary `json:"triggerSummary"`
	BlockedReasons         []string                            `json:"blockedReasons"`
	OperatorNextActions    []string                            `json:"operatorNextActions"`
	CannotInfer            []string                            `json:"cannotInfer"`
	Redaction              FeishuHandoffEvidenceRedaction      `json:"redaction"`
	GeneratedAt            string                              `json:"generatedAt"`
	SafeSummary            string                              `json:"safeSummary"`
}

// FeishuHandoffEvidenceCounts 汇总本次 run 或 dry-run 对部门、用户和成员关系的影响面。
type FeishuHandoffEvidenceCounts struct {
	Departments FeishuHandoffEvidenceResourceCounts `json:"departments"`
	Users       FeishuHandoffEvidenceResourceCounts `json:"users"`
	Memberships FeishuHandoffEvidenceResourceCounts `json:"memberships"`
}

// FeishuHandoffEvidenceResourceCounts 只包含聚合计数，不包含任何部门树、用户列表或外部 id 明细。
type FeishuHandoffEvidenceResourceCounts struct {
	Fetched       int `json:"fetched,omitempty"`
	ToCreate      int `json:"toCreate,omitempty"`
	ToUpdate      int `json:"toUpdate,omitempty"`
	ToSoftDisable int `json:"toSoftDisable,omitempty"`
	Unchanged     int `json:"unchanged,omitempty"`
	Conflict      int `json:"conflict,omitempty"`
	Invalid       int `json:"invalid,omitempty"`
}

// FeishuHandoffEvidenceBindingSummary 把用户绑定诊断压缩为交接用摘要，避免暴露具体用户或外部身份。
type FeishuHandoffEvidenceBindingSummary struct {
	Status      string                          `json:"status"`
	RiskLevel   string                          `json:"riskLevel"`
	Blocked     bool                            `json:"blocked"`
	Total       int                             `json:"total"`
	Counts      FeishuUserBindingConflictCounts `json:"counts"`
	SafeSummary string                          `json:"safeSummary"`
}

// FeishuHandoffEvidenceSoftDisable 只暴露软禁用聚合数量，用于交接前评估潜在影响面。
type FeishuHandoffEvidenceSoftDisable struct {
	TotalToSoftDisable int `json:"totalToSoftDisable"`
	Departments        int `json:"departments"`
	Users              int `json:"users"`
	Memberships        int `json:"memberships"`
}

// FeishuHandoffEvidenceTriggerSummary 汇总 run 的触发来源和安全诊断别名，不回显 operator 原始身份。
type FeishuHandoffEvidenceTriggerSummary struct {
	TriggerType string `json:"triggerType,omitempty"`
	ActorHash   string `json:"actorHash,omitempty"`
	Scheduler   bool   `json:"scheduler"`
	Manual      bool   `json:"manual"`
	StartedAt   string `json:"startedAt,omitempty"`
	FinishedAt  string `json:"finishedAt,omitempty"`
	Diagnostic  string `json:"diagnostic,omitempty"`
}

// FeishuHandoffEvidenceRedaction 标记 evidence 已按交接规范脱敏，便于下游验收审计。
type FeishuHandoffEvidenceRedaction struct {
	Applied bool   `json:"applied"`
	Version string `json:"version"`
}

// FeishuOrganizationSyncHandoffEvidenceFilter 描述只读 evidence 查询条件，SourceId 只用于本地查找。
type FeishuOrganizationSyncHandoffEvidenceFilter struct {
	Organization string
	SourceType   string
	SourceId     string
}

// FeishuOrganizationSyncHandoffEvidenceService 聚合 Admin 本地同步元数据生成脱敏交接证据。
type FeishuOrganizationSyncHandoffEvidenceService struct {
	Now func() time.Time
}

// GetEvidence 生成飞书组织同步交接证据，只读取本地 run/history/binding/config 元数据。
func (s *FeishuOrganizationSyncHandoffEvidenceService) GetEvidence(filter FeishuOrganizationSyncHandoffEvidenceFilter) (*FeishuOrganizationSyncHandoffEvidence, error) {
	organization := strings.TrimSpace(filter.Organization)
	if organization == "" {
		return nil, fmt.Errorf("feishu handoff evidence organization is required")
	}
	now := s.now().UTC()
	config, err := GetFeishuOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		return nil, err
	}
	evidence := newBaseFeishuHandoffEvidence(organization, now)
	if config == nil || !config.IsEnabled {
		evidence.Readiness = FeishuHandoffEvidenceReadinessUnsupported
		evidence.SafeSummary = "飞书组织同步未配置或未启用，无法生成交接证据。"
		evidence.OperatorNextActions = []string{"configure_feishu_sync"}
		evidence.CannotInfer = defaultFeishuHandoffCannotInfer()
		return evidence, nil
	}
	attachFeishuHandoffConfigMarkers(evidence, config)

	sourceType := normalizeFeishuHandoffEvidenceSourceType(filter.SourceType)
	switch sourceType {
	case FeishuHandoffEvidenceSourceLatest:
		if err := s.attachLatestEvidenceSource(evidence, organization, config); err != nil {
			return nil, err
		}
	case FeishuHandoffEvidenceSourceRun:
		if err := s.attachRunEvidenceSource(evidence, organization, strings.TrimSpace(filter.SourceId), config); err != nil {
			return nil, err
		}
	case FeishuHandoffEvidenceSourceDryRunHistory:
		if err := s.attachDryRunHistoryEvidenceSource(evidence, organization, strings.TrimSpace(filter.SourceId)); err != nil {
			return nil, err
		}
	default:
		evidence.Readiness = FeishuHandoffEvidenceReadinessUnsupported
		evidence.SourceType = sourceType
		evidence.SafeSummary = "不支持的飞书交接证据来源类型。"
		evidence.OperatorNextActions = []string{"select_supported_evidence_source"}
		return evidence, nil
	}
	bindingDiagnostics, err := (&FeishuOrganizationSyncUserBindingConflictService{Now: s.now}).GetDiagnostics(FeishuUserBindingConflictDiagnosticsFilter{
		Organization: organization,
		Limit:        20,
	})
	if err != nil {
		return nil, err
	}
	attachFeishuHandoffBindingSummary(evidence, bindingDiagnostics)
	classifyFeishuHandoffEvidenceReadiness(evidence)
	return evidence, nil
}

func (s *FeishuOrganizationSyncHandoffEvidenceService) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func newBaseFeishuHandoffEvidence(organization string, now time.Time) *FeishuOrganizationSyncHandoffEvidence {
	return &FeishuOrganizationSyncHandoffEvidence{
		Organization:        organization,
		EvidenceVersion:     FeishuHandoffEvidenceVersion,
		SourceType:          FeishuHandoffEvidenceSourceLatest,
		Readiness:           FeishuHandoffEvidenceReadinessNoRun,
		BlockedReasons:      []string{},
		OperatorNextActions: []string{},
		CannotInfer:         defaultFeishuHandoffCannotInfer(),
		Redaction: FeishuHandoffEvidenceRedaction{
			Applied: true,
			Version: FeishuHandoffEvidenceRedactionV1,
		},
		GeneratedAt: now.Format(time.RFC3339Nano),
	}
}

func attachFeishuHandoffConfigMarkers(evidence *FeishuOrganizationSyncHandoffEvidence, config *FeishuOrganizationSyncConfig) {
	if evidence == nil || config == nil {
		return
	}
	sourceTenantId := firstNonEmpty(config.TenantKey, config.AppId)
	evidence.EndpointMode = normalizeFeishuEndpointMode(config.EndpointMode)
	evidence.AppAlias = "app-" + shortFeishuOrganizationSyncHash(config.Organization, config.AppId)
	evidence.TenantAlias = "tenant-" + shortFeishuOrganizationSyncHash(config.Organization, sourceTenantId)
	evidence.SourceConnectionIdHash = buildFeishuDryRunSourceConnectionHash(config.Organization, evidence.TenantAlias, evidence.AppAlias)
}

func (s *FeishuOrganizationSyncHandoffEvidenceService) attachLatestEvidenceSource(evidence *FeishuOrganizationSyncHandoffEvidence, organization string, config *FeishuOrganizationSyncConfig) error {
	history, err := getLatestFeishuHandoffDryRunHistory(organization)
	if err != nil {
		return err
	}
	run, err := getLatestFeishuHandoffRun(organization)
	if err != nil {
		return err
	}
	if history == nil && run == nil {
		return nil
	}
	if history != nil && (run == nil || !run.CreatedAt.After(history.CreatedAt)) {
		attachFeishuHandoffDryRunHistory(evidence, history)
		return nil
	}
	attachFeishuHandoffRun(evidence, run, config)
	return nil
}

func (s *FeishuOrganizationSyncHandoffEvidenceService) attachRunEvidenceSource(evidence *FeishuOrganizationSyncHandoffEvidence, organization string, runId string, config *FeishuOrganizationSyncConfig) error {
	if runId == "" {
		run, err := getLatestFeishuHandoffRun(organization)
		if err != nil {
			return err
		}
		attachFeishuHandoffRun(evidence, run, config)
		return nil
	}
	run := &FeishuOrganizationSyncRun{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("name = ?", runId).Get(run)
	if err != nil || !existed {
		return err
	}
	attachFeishuHandoffRun(evidence, run, config)
	return nil
}

func (s *FeishuOrganizationSyncHandoffEvidenceService) attachDryRunHistoryEvidenceSource(evidence *FeishuOrganizationSyncHandoffEvidence, organization string, historyId string) error {
	if historyId == "" {
		history, err := getLatestFeishuHandoffDryRunHistory(organization)
		if err != nil {
			return err
		}
		attachFeishuHandoffDryRunHistory(evidence, history)
		return nil
	}
	history, err := (&FeishuOrganizationSyncDryRunHistoryService{}).GetHistory(organization, historyId)
	if err != nil {
		return err
	}
	attachFeishuHandoffDryRunHistory(evidence, history)
	return nil
}

func attachFeishuHandoffRun(evidence *FeishuOrganizationSyncHandoffEvidence, run *FeishuOrganizationSyncRun, config *FeishuOrganizationSyncConfig) {
	if evidence == nil || run == nil {
		return
	}
	masked := GetMaskedFeishuOrganizationSyncRun(run, config.AppSecret)
	evidence.SourceType = FeishuHandoffEvidenceSourceRun
	evidence.SourceTypeLabel = "sync run"
	evidence.SourceIdHash = "run-" + shortFeishuOrganizationSyncHash(run.Organization, run.Name)
	evidence.SourceStatus = string(masked.Status)
	evidence.SourceCreatedAt = safeFeishuHandoffTime(firstNonZeroTime(run.CreatedAt, run.StartedAt))
	evidence.EndpointMode = normalizeFeishuEndpointMode(firstNonEmpty(run.EndpointMode, config.EndpointMode))
	evidence.AppAlias = "app-" + shortFeishuOrganizationSyncHash(run.Organization, firstNonEmpty(run.AppId, config.AppId))
	evidence.TenantAlias = "tenant-" + shortFeishuOrganizationSyncHash(run.Organization, firstNonEmpty(run.TenantKey, config.TenantKey, config.AppId))
	evidence.SourceConnectionIdHash = buildFeishuDryRunSourceConnectionHash(run.Organization, evidence.TenantAlias, evidence.AppAlias)
	evidence.Counts = FeishuHandoffEvidenceCounts{
		Departments: FeishuHandoffEvidenceResourceCounts{Fetched: run.DepartmentFetchedCount, ToCreate: run.DepartmentCreatedCount, ToUpdate: run.DepartmentUpdatedCount, ToSoftDisable: run.DepartmentDisabledCount},
		Users:       FeishuHandoffEvidenceResourceCounts{Fetched: run.UserFetchedCount, ToCreate: run.UserCreatedCount, ToUpdate: run.UserUpdatedCount, ToSoftDisable: run.UserDisabledCount},
		Memberships: FeishuHandoffEvidenceResourceCounts{ToUpdate: run.MembershipUpdatedCount},
	}
	evidence.SoftDisableSummary = buildFeishuHandoffSoftDisableSummary(evidence.Counts)
	evidence.TriggerSummary = FeishuHandoffEvidenceTriggerSummary{
		TriggerType: string(run.TriggerType),
		ActorHash:   "actor-" + shortFeishuOrganizationSyncHash(run.Organization, run.Actor),
		Scheduler:   run.TriggerType == FeishuOrganizationSyncTriggerScheduled,
		Manual:      run.TriggerType == FeishuOrganizationSyncTriggerManual || run.TriggerType == "",
		StartedAt:   safeFeishuHandoffTime(run.StartedAt),
		FinishedAt:  safeFeishuHandoffTime(run.FinishedAt),
	}
	if masked.Diagnostics != nil {
		evidence.TriggerSummary.Diagnostic = firstNonEmpty(masked.Diagnostics.ReasonCode, masked.Diagnostics.FailureCategory, masked.Diagnostics.FailedStage)
	}
	if run.Status != FeishuOrganizationSyncRunStatusSucceeded {
		evidence.BlockedReasons = append(evidence.BlockedReasons, "sync_run_failed")
	}
}

func attachFeishuHandoffDryRunHistory(evidence *FeishuOrganizationSyncHandoffEvidence, history *FeishuOrganizationSyncDryRunHistory) {
	if evidence == nil || history == nil {
		return
	}
	masked := maskFeishuDryRunHistory(history)
	evidence.SourceType = FeishuHandoffEvidenceSourceDryRunHistory
	evidence.SourceTypeLabel = "dry-run history"
	evidence.SourceIdHash = "dry-run-" + shortFeishuOrganizationSyncHash(history.Organization, history.Name)
	evidence.SourceStatus = masked.Status
	evidence.SourceCreatedAt = safeFeishuHandoffTime(masked.CreatedAt)
	evidence.EndpointMode = normalizeFeishuEndpointMode(masked.EndpointMode)
	evidence.AppAlias = masked.AppAlias
	evidence.TenantAlias = masked.TenantAlias
	evidence.SourceConnectionIdHash = masked.SourceConnectionIdHash
	evidence.Counts = FeishuHandoffEvidenceCounts{
		Departments: FeishuHandoffEvidenceResourceCounts{
			Fetched:       masked.SnapshotDepartmentCount,
			ToCreate:      masked.DepartmentToCreate,
			ToUpdate:      masked.DepartmentToUpdate,
			ToSoftDisable: masked.DepartmentToSoftDisable,
			Unchanged:     masked.DepartmentUnchanged,
			Conflict:      masked.DepartmentConflict,
			Invalid:       masked.DepartmentInvalid,
		},
		Users: FeishuHandoffEvidenceResourceCounts{
			Fetched:       masked.SnapshotUserCount,
			ToCreate:      masked.UserToCreate,
			ToUpdate:      masked.UserToUpdate,
			ToSoftDisable: masked.UserToSoftDisable,
			Unchanged:     masked.UserUnchanged,
			Conflict:      masked.UserConflict,
			Invalid:       masked.UserInvalid,
		},
		Memberships: FeishuHandoffEvidenceResourceCounts{
			Fetched:       masked.SnapshotMembershipCount,
			ToCreate:      masked.MembershipToCreate,
			ToUpdate:      masked.MembershipToUpdate,
			ToSoftDisable: masked.MembershipToSoftDisable,
			Unchanged:     masked.MembershipUnchanged,
			Conflict:      masked.MembershipConflict,
			Invalid:       masked.MembershipInvalid,
		},
	}
	evidence.SoftDisableSummary = buildFeishuHandoffSoftDisableSummary(evidence.Counts)
	if masked.Status != FeishuOrganizationSyncDryRunPreviewStatusSucceeded {
		evidence.BlockedReasons = append(evidence.BlockedReasons, "dry_run_not_succeeded")
	}
	if feishuHandoffConflictOrInvalidCount(evidence.Counts) > 0 {
		evidence.BlockedReasons = append(evidence.BlockedReasons, "dry_run_diff_conflict_or_invalid")
	}
	if masked.Diagnostics != nil {
		evidence.TriggerSummary.Diagnostic = firstNonEmpty(masked.Diagnostics.ReasonCode, masked.Diagnostics.FailureCategory, masked.Diagnostics.FailedStage)
	}
}

func attachFeishuHandoffBindingSummary(evidence *FeishuOrganizationSyncHandoffEvidence, diagnostics *FeishuUserBindingConflictDiagnostics) {
	if evidence == nil || diagnostics == nil {
		return
	}
	blocked := diagnostics.Status == FeishuUserBindingDiagnosticsStatusBlocked || diagnostics.RiskLevel == FeishuUserBindingRiskCritical || diagnostics.RiskLevel == FeishuUserBindingRiskHigh
	evidence.BindingConflicts = FeishuHandoffEvidenceBindingSummary{
		Status:      diagnostics.Status,
		RiskLevel:   diagnostics.RiskLevel,
		Blocked:     blocked,
		Total:       diagnostics.Counts.Total,
		Counts:      diagnostics.Counts,
		SafeSummary: diagnostics.SafeSummary,
	}
	if blocked {
		evidence.BlockedReasons = append(evidence.BlockedReasons, "binding_conflict_blocked")
	}
}

func classifyFeishuHandoffEvidenceReadiness(evidence *FeishuOrganizationSyncHandoffEvidence) {
	if evidence == nil {
		return
	}
	evidence.BlockedReasons = uniqueNonEmptyStrings(evidence.BlockedReasons)
	if evidence.SourceIdHash == "" {
		if evidence.Readiness != FeishuHandoffEvidenceReadinessUnsupported {
			evidence.Readiness = FeishuHandoffEvidenceReadinessNoRun
			evidence.SafeSummary = "未发现可用于交接的飞书同步 run 或 dry-run history。"
			evidence.OperatorNextActions = []string{"run_dry_run_preview", "run_manual_sync_after_review"}
		}
		return
	}
	if len(evidence.BlockedReasons) > 0 {
		evidence.Readiness = FeishuHandoffEvidenceReadinessBlocked
		evidence.SafeSummary = fmt.Sprintf("交接证据存在 %d 个阻断原因，需处理后再交接。", len(evidence.BlockedReasons))
		evidence.OperatorNextActions = append([]string{"review_blocked_reasons"}, recommendedFeishuHandoffActions(evidence)...)
		evidence.OperatorNextActions = uniqueNonEmptyStrings(evidence.OperatorNextActions)
		return
	}
	evidence.Readiness = FeishuHandoffEvidenceReadinessReady
	evidence.SafeSummary = "交接证据已就绪，可复制或导出脱敏 JSON 供真实租户测试和验收交接。"
	evidence.OperatorNextActions = []string{"export_evidence_json", "validate_real_tenant_runtime", "coordinate_gateway_insight_acceptance"}
}

func recommendedFeishuHandoffActions(evidence *FeishuOrganizationSyncHandoffEvidence) []string {
	actions := []string{}
	for _, reason := range evidence.BlockedReasons {
		switch reason {
		case "binding_conflict_blocked":
			actions = append(actions, "resolve_binding_conflicts")
		case "sync_run_failed", "dry_run_not_succeeded":
			actions = append(actions, "inspect_sync_diagnostics")
		case "dry_run_diff_conflict_or_invalid":
			actions = append(actions, "review_dry_run_diff")
		}
	}
	return actions
}

func normalizeFeishuHandoffEvidenceSourceType(sourceType string) string {
	sourceType = strings.TrimSpace(sourceType)
	if sourceType == "" {
		return FeishuHandoffEvidenceSourceLatest
	}
	return sourceType
}

func defaultFeishuHandoffCannotInfer() []string {
	return []string{"live_contact_v3_credentials", "gateway_projection_consumption", "insight_acceptance"}
}

func buildFeishuHandoffSoftDisableSummary(counts FeishuHandoffEvidenceCounts) FeishuHandoffEvidenceSoftDisable {
	summary := FeishuHandoffEvidenceSoftDisable{
		Departments: counts.Departments.ToSoftDisable,
		Users:       counts.Users.ToSoftDisable,
		Memberships: counts.Memberships.ToSoftDisable,
	}
	summary.TotalToSoftDisable = summary.Departments + summary.Users + summary.Memberships
	return summary
}

func feishuHandoffConflictOrInvalidCount(counts FeishuHandoffEvidenceCounts) int {
	return counts.Departments.Conflict + counts.Departments.Invalid +
		counts.Users.Conflict + counts.Users.Invalid +
		counts.Memberships.Conflict + counts.Memberships.Invalid
}

func getLatestFeishuHandoffRun(organization string) (*FeishuOrganizationSyncRun, error) {
	run := &FeishuOrganizationSyncRun{}
	existed, err := ormer.Engine.Where("organization = ?", organization).Desc("created_at").Get(run)
	if err != nil || !existed {
		return nil, err
	}
	return run, nil
}

func getLatestFeishuHandoffDryRunHistory(organization string) (*FeishuOrganizationSyncDryRunHistory, error) {
	history := &FeishuOrganizationSyncDryRunHistory{}
	existed, err := ormer.Engine.Where("organization = ?", organization).Desc("created_at").Get(history)
	if err != nil || !existed {
		return nil, err
	}
	return maskFeishuDryRunHistory(history), nil
}

func safeFeishuHandoffTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}

func firstNonZeroTime(values ...time.Time) time.Time {
	for _, value := range values {
		if !value.IsZero() {
			return value
		}
	}
	return time.Time{}
}

func uniqueNonEmptyStrings(values []string) []string {
	seen := map[string]bool{}
	result := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}
