// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"errors"
	"regexp"
	"strings"
	"time"
)

const (
	FeishuOrganizationSyncDiagnosticStageConfigValidation = "config_validation"
	FeishuOrganizationSyncDiagnosticStageTenantToken      = "tenant_token"
	FeishuOrganizationSyncDiagnosticStageDepartmentFetch  = "department_fetch"
	FeishuOrganizationSyncDiagnosticStageUserFetch        = "user_fetch"
	FeishuOrganizationSyncDiagnosticStageUpsertDepartment = "upsert_department"
	FeishuOrganizationSyncDiagnosticStageUpsertUser       = "upsert_user"
	FeishuOrganizationSyncDiagnosticStageUpsertMembership = "upsert_membership"
	FeishuOrganizationSyncDiagnosticStageProjection       = "projection"
	FeishuOrganizationSyncDiagnosticStageSoftDisable      = "soft_disable"
	FeishuOrganizationSyncDiagnosticStageScheduler        = "scheduler"
	FeishuOrganizationSyncDiagnosticStageUnknown          = "unknown"

	FeishuOrganizationSyncFailureCategoryConfiguration = "configuration"
	FeishuOrganizationSyncFailureCategoryCredentials   = "credentials"
	FeishuOrganizationSyncFailureCategoryPermission    = "permission"
	FeishuOrganizationSyncFailureCategoryProvider      = "provider"
	FeishuOrganizationSyncFailureCategoryContract      = "contract"
	FeishuOrganizationSyncFailureCategoryLocalApply    = "local_apply"
	FeishuOrganizationSyncFailureCategoryProjection    = "projection"
	FeishuOrganizationSyncFailureCategoryPartialSync   = "partial_sync"
	FeishuOrganizationSyncFailureCategoryUnknown       = "unknown"

	FeishuOrganizationSyncReasonMissingSecret         = "missing_secret"
	FeishuOrganizationSyncReasonInvalidAppCredentials = "invalid_app_credentials"
	FeishuOrganizationSyncReasonContactScopeMissing   = "contact_scope_missing"
	FeishuOrganizationSyncReasonTenantUnavailable     = "tenant_unavailable"
	FeishuOrganizationSyncReasonRateLimited           = "rate_limited"
	FeishuOrganizationSyncReasonContractMismatch      = "contract_mismatch"
	FeishuOrganizationSyncReasonMappingConflict       = "mapping_conflict"
	FeishuOrganizationSyncReasonProjectionFailed      = "projection_failed"
	FeishuOrganizationSyncReasonPartialSync           = "partial_sync"
	FeishuOrganizationSyncReasonUnknown               = "unknown"

	FeishuOrganizationSyncRetrySafe      = "safe_retry"
	FeishuOrganizationSyncRetryWaitLimit = "wait_rate_limit"
	FeishuOrganizationSyncRetryNotReady  = "not_ready"
	FeishuOrganizationSyncRetryUnknown   = "unknown"

	FeishuOrganizationSyncOperatorFixCredentials         = "fix_credentials"
	FeishuOrganizationSyncOperatorGrantContactScope      = "grant_contact_scope"
	FeishuOrganizationSyncOperatorWaitRateLimit          = "wait_rate_limit"
	FeishuOrganizationSyncOperatorInspectMappingConflict = "inspect_mapping_conflict"
	FeishuOrganizationSyncOperatorInspectProjection      = "inspect_projection"
	FeishuOrganizationSyncOperatorManualReview           = "manual_review"
	FeishuOrganizationSyncOperatorUnknown                = "unknown"
)

// FeishuOrganizationSyncRunDiagnostics 是面向 operator 的脱敏运行诊断视图。
// 它只暴露聚合统计和稳定枚举，避免前端或报告解析原始 provider 错误。
type FeishuOrganizationSyncRunDiagnostics struct {
	FailedStage     string                                `json:"failedStage,omitempty"`
	FailureCategory string                                `json:"failureCategory,omitempty"`
	ReasonCode      string                                `json:"reasonCode,omitempty"`
	RetryReadiness  string                                `json:"retryReadiness,omitempty"`
	OperatorAction  string                                `json:"operatorAction,omitempty"`
	SafeSummary     string                                `json:"safeSummary,omitempty"`
	Stats           FeishuOrganizationSyncDiagnosticStats `json:"stats"`
	StartedAt       string                                `json:"startedAt,omitempty"`
	FinishedAt      string                                `json:"finishedAt,omitempty"`
	DurationMs      int64                                 `json:"durationMs"`
}

// FeishuOrganizationSyncDiagnosticStats 只包含同步规模相关的聚合计数。
// 这里不放部门树、用户列表或 Contact 标识，避免诊断响应泄漏通讯录明细。
type FeishuOrganizationSyncDiagnosticStats struct {
	DepartmentCount int `json:"departmentCount"`
	UserCount       int `json:"userCount"`
	MembershipCount int `json:"membershipCount"`
	DisabledCount   int `json:"disabledCount"`
}

type feishuSyncStageError struct {
	code string
	err  error
}

func newFeishuSyncStageError(code string, err error) error {
	if err == nil {
		return nil
	}
	return &feishuSyncStageError{code: code, err: err}
}

func wrapFeishuSyncStageError(code string, err error) error {
	var stageErr *feishuSyncStageError
	if errors.As(err, &stageErr) {
		return err
	}
	return newFeishuSyncStageError(code, err)
}

func (e *feishuSyncStageError) Error() string {
	if e == nil || e.err == nil {
		return ""
	}
	return e.err.Error()
}

func (e *feishuSyncStageError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.err
}

func feishuSyncErrorCodeFromError(err error, fallback string) string {
	var stageErr *feishuSyncStageError
	if errors.As(err, &stageErr) && stageErr.code != "" {
		return stageErr.code
	}
	return fallback
}

// BuildFeishuOrganizationSyncRunDiagnostics 从 run 持久字段派生脱敏诊断对象。
// sensitiveValues 用于补充本地已知 secret 的二次脱敏，调用方不得传入或返回 raw provider payload。
func BuildFeishuOrganizationSyncRunDiagnostics(run *FeishuOrganizationSyncRun, sensitiveValues ...string) *FeishuOrganizationSyncRunDiagnostics {
	if run == nil {
		return nil
	}
	diagnostics := &FeishuOrganizationSyncRunDiagnostics{
		Stats: FeishuOrganizationSyncDiagnosticStats{
			DepartmentCount: run.DepartmentFetchedCount,
			UserCount:       run.UserFetchedCount,
			MembershipCount: run.MembershipUpdatedCount,
			DisabledCount:   run.DepartmentDisabledCount + run.UserDisabledCount,
		},
		StartedAt:  feishuDiagnosticTimeString(run.StartedAt),
		FinishedAt: feishuDiagnosticTimeString(run.FinishedAt),
		DurationMs: feishuDiagnosticDurationMs(run),
	}
	if run.Status == FeishuOrganizationSyncRunStatusRunning {
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryNotReady
		return diagnostics
	}
	if run.Status == FeishuOrganizationSyncRunStatusSucceeded {
		return diagnostics
	}
	classifyFeishuOrganizationSyncRunDiagnostics(run, diagnostics)
	diagnostics.SafeSummary = safeFeishuDiagnosticSummary(run, sensitiveValues...)
	return diagnostics
}

// BuildFeishuOrganizationSyncScheduleDiagnostics 从调度 fire 元数据派生 Feishu 调度诊断。
// 调度失败可能早于 run 创建，因此这里复用同一个 operator 诊断 DTO，但不要求新增持久 diagnostics 表。
func BuildFeishuOrganizationSyncScheduleDiagnostics(fire *OrganizationSyncScheduleFire, sensitiveValues ...string) *FeishuOrganizationSyncRunDiagnostics {
	if fire == nil {
		return nil
	}
	diagnostics := &FeishuOrganizationSyncRunDiagnostics{
		FailedStage:    FeishuOrganizationSyncDiagnosticStageScheduler,
		RetryReadiness: FeishuOrganizationSyncRetryUnknown,
		OperatorAction: FeishuOrganizationSyncOperatorUnknown,
		SafeSummary:    safeFeishuScheduleDiagnosticSummary(fire.ErrorText, sensitiveValues...),
		StartedAt:      feishuDiagnosticTimeString(fire.WindowStart),
	}
	classifyFeishuOrganizationSyncScheduleDiagnostics(fire, diagnostics)
	return diagnostics
}

func classifyFeishuOrganizationSyncRunDiagnostics(run *FeishuOrganizationSyncRun, diagnostics *FeishuOrganizationSyncRunDiagnostics) {
	diagnostics.FailedStage = classifyFeishuDiagnosticStage(run)
	if run.Status == FeishuOrganizationSyncRunStatusPartial {
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryPartialSync
		diagnostics.ReasonCode = FeishuOrganizationSyncReasonPartialSync
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetrySafe
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorManualReview
		return
	}
	reason := classifyFeishuDiagnosticReason(run)
	diagnostics.ReasonCode = reason
	switch reason {
	case FeishuOrganizationSyncReasonMissingSecret:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryConfiguration
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryNotReady
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorFixCredentials
	case FeishuOrganizationSyncReasonInvalidAppCredentials:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryCredentials
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryNotReady
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorFixCredentials
	case FeishuOrganizationSyncReasonContactScopeMissing:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryPermission
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryNotReady
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorGrantContactScope
	case FeishuOrganizationSyncReasonTenantUnavailable:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryProvider
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetrySafe
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorManualReview
	case FeishuOrganizationSyncReasonRateLimited:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryProvider
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryWaitLimit
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorWaitRateLimit
	case FeishuOrganizationSyncReasonContractMismatch:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryContract
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryNotReady
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorManualReview
	case FeishuOrganizationSyncReasonMappingConflict:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryLocalApply
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryNotReady
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorInspectMappingConflict
	case FeishuOrganizationSyncReasonProjectionFailed:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryProjection
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryNotReady
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorInspectProjection
	default:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryUnknown
		diagnostics.ReasonCode = FeishuOrganizationSyncReasonUnknown
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryUnknown
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorUnknown
	}
}

func classifyFeishuOrganizationSyncScheduleDiagnostics(fire *OrganizationSyncScheduleFire, diagnostics *FeishuOrganizationSyncRunDiagnostics) {
	code := strings.ToLower(strings.TrimSpace(fire.ErrorCode))
	switch code {
	case "config_missing":
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryConfiguration
		diagnostics.ReasonCode = FeishuOrganizationSyncReasonMissingSecret
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryNotReady
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorFixCredentials
	case "config_disabled":
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryConfiguration
		diagnostics.ReasonCode = FeishuOrganizationSyncReasonMissingSecret
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryNotReady
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorManualReview
	case OrganizationSyncScheduleFireErrorAlreadyRunning:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryUnknown
		diagnostics.ReasonCode = FeishuOrganizationSyncReasonUnknown
		diagnostics.RetryReadiness = FeishuOrganizationSyncRetryNotReady
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorManualReview
	default:
		run := &FeishuOrganizationSyncRun{
			Status:    FeishuOrganizationSyncRunStatusFailed,
			Stage:     FeishuOrganizationSyncRunStageFinalizing,
			ErrorCode: fire.ErrorCode,
			ErrorText: fire.ErrorText,
		}
		classifyFeishuOrganizationSyncRunDiagnostics(run, diagnostics)
		diagnostics.FailedStage = FeishuOrganizationSyncDiagnosticStageScheduler
	}
}

func classifyFeishuDiagnosticStage(run *FeishuOrganizationSyncRun) string {
	code := strings.ToLower(strings.TrimSpace(run.ErrorCode))
	switch {
	case strings.Contains(code, "config"):
		return FeishuOrganizationSyncDiagnosticStageConfigValidation
	case strings.Contains(code, "tenant_token") || strings.Contains(code, "token"):
		return FeishuOrganizationSyncDiagnosticStageTenantToken
	case strings.Contains(code, "department_fetch"):
		return FeishuOrganizationSyncDiagnosticStageDepartmentFetch
	case strings.Contains(code, "user_fetch"):
		return FeishuOrganizationSyncDiagnosticStageUserFetch
	case strings.Contains(code, "upsert_department"):
		return FeishuOrganizationSyncDiagnosticStageUpsertDepartment
	case strings.Contains(code, "upsert_user"):
		return FeishuOrganizationSyncDiagnosticStageUpsertUser
	case strings.Contains(code, "upsert_membership"):
		return FeishuOrganizationSyncDiagnosticStageUpsertMembership
	case strings.Contains(code, "projection"):
		return FeishuOrganizationSyncDiagnosticStageProjection
	case strings.Contains(code, "soft_disable"):
		return FeishuOrganizationSyncDiagnosticStageSoftDisable
	case strings.Contains(code, "scheduler"):
		return FeishuOrganizationSyncDiagnosticStageScheduler
	}
	switch run.Stage {
	case FeishuOrganizationSyncRunStageFetching:
		return FeishuOrganizationSyncDiagnosticStageDepartmentFetch
	case FeishuOrganizationSyncRunStageApplying:
		return FeishuOrganizationSyncDiagnosticStageUpsertDepartment
	case FeishuOrganizationSyncRunStageFinalizing:
		return FeishuOrganizationSyncDiagnosticStageUnknown
	default:
		return FeishuOrganizationSyncDiagnosticStageUnknown
	}
}

func classifyFeishuDiagnosticReason(run *FeishuOrganizationSyncRun) string {
	text := strings.ToLower(run.ErrorCode + " " + run.ErrorText)
	switch {
	case strings.Contains(text, "missing_secret") || strings.Contains(text, "app_secret is required"):
		return FeishuOrganizationSyncReasonMissingSecret
	case strings.Contains(text, "invalid_app_credentials") || strings.Contains(text, "invalid app") || strings.Contains(text, "app secret"):
		return FeishuOrganizationSyncReasonInvalidAppCredentials
	case strings.Contains(text, "contact_scope_missing") || strings.Contains(text, "permission") || strings.Contains(text, "scope"):
		return FeishuOrganizationSyncReasonContactScopeMissing
	case strings.Contains(text, "rate_limited") || strings.Contains(text, "rate limit") || strings.Contains(text, "too many requests"):
		return FeishuOrganizationSyncReasonRateLimited
	case strings.Contains(text, "contract_mismatch") || strings.Contains(text, "unexpected payload") || strings.Contains(text, "unexpected contact") || strings.Contains(text, "decode"):
		return FeishuOrganizationSyncReasonContractMismatch
	case strings.Contains(text, "mapping_conflict") || strings.Contains(text, "duplicate"):
		return FeishuOrganizationSyncReasonMappingConflict
	case strings.Contains(text, "projection"):
		return FeishuOrganizationSyncReasonProjectionFailed
	case strings.Contains(text, "tenant_unavailable") || strings.Contains(text, "unavailable") || strings.Contains(text, "timeout"):
		return FeishuOrganizationSyncReasonTenantUnavailable
	default:
		return FeishuOrganizationSyncReasonUnknown
	}
}

func safeFeishuDiagnosticSummary(run *FeishuOrganizationSyncRun, sensitiveValues ...string) string {
	summary := safeOrganizationSyncErrorText(run.ErrorText, sensitiveValues...)
	if run.Status == FeishuOrganizationSyncRunStatusPartial && strings.TrimSpace(summary) == "" {
		summary = "partial sync failed before a complete snapshot was applied; missing-data soft-disable was not applied for this run"
	}
	summary = feishuDiagnosticContactIdentifierPattern.ReplaceAllString(summary, "$1=***")
	summary = feishuDiagnosticTokenNamePattern.ReplaceAllString(summary, "token")
	summary = feishuDiagnosticEmailPattern.ReplaceAllString(summary, "***")
	summary = feishuDiagnosticPhonePattern.ReplaceAllString(summary, "***")
	return summary
}

func safeFeishuScheduleDiagnosticSummary(text string, sensitiveValues ...string) string {
	run := &FeishuOrganizationSyncRun{ErrorText: text}
	return safeFeishuDiagnosticSummary(run, sensitiveValues...)
}

func feishuDiagnosticTimeString(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}

func feishuDiagnosticDurationMs(run *FeishuOrganizationSyncRun) int64 {
	if run.StartedAt.IsZero() || run.FinishedAt.IsZero() || run.FinishedAt.Before(run.StartedAt) {
		return 0
	}
	return run.FinishedAt.Sub(run.StartedAt).Milliseconds()
}

var (
	feishuDiagnosticContactIdentifierPattern = regexp.MustCompile(`(?i)\b(open_id|union_id|user_id)\s*[:=]\s*[^,\s;]+`)
	feishuDiagnosticTokenNamePattern         = regexp.MustCompile(`(?i)\btenant_access_token\b`)
	feishuDiagnosticEmailPattern             = regexp.MustCompile(`(?i)\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b`)
	feishuDiagnosticPhonePattern             = regexp.MustCompile(`\b1[3-9]\d{9}\b`)
)
