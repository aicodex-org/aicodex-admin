// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"regexp"
	"strings"
	"time"
)

const (
	WecomOrganizationSyncDryRunPreviewStatusSucceeded = "succeeded"
	WecomOrganizationSyncDryRunPreviewStatusFailed    = "failed"

	WecomOrganizationSyncDryRunReasonCredentialMissing         = "credential_missing"
	WecomOrganizationSyncDryRunReasonPermissionMissing         = "contact_permission_missing"
	WecomOrganizationSyncDryRunReasonRuntimeAuthorization      = "runtime_authorization_required"
	WecomOrganizationSyncDryRunReasonContractMismatch          = "contract_mismatch"
	WecomOrganizationSyncDryRunReasonSnapshotClientUnavailable = "snapshot_client_unavailable"
)

const (
	wecomDryRunReasonMissingDepartmentIdentifier = "missing_department_identifier"
	wecomDryRunReasonMissingUserIdentifier       = "missing_user_identifier"
	wecomDryRunReasonWouldSoftDisable            = "would_soft_disable"
)

const (
	wecomOrganizationSyncDryRunStageConfigValidation = "config_validation"
	wecomOrganizationSyncDryRunStageFetch            = "fetch"
	wecomOrganizationSyncDryRunStagePlanning         = "planning"
)

// WecomOrganizationSyncDryRunPreview 是企业微信预览影响 API 的脱敏聚合响应。
// 它只描述影响规模和安全诊断，不包含 raw WeCom payload 或外部用户明细。
type WecomOrganizationSyncDryRunPreview struct {
	Status         string                                   `json:"status"`
	Source         WecomOrganizationSyncDryRunSource        `json:"source"`
	SnapshotStats  WecomOrganizationSyncDryRunSnapshotStats `json:"snapshotStats"`
	Diff           WecomOrganizationSyncDryRunDiff          `json:"diff"`
	ReasonCounts   map[string]int                           `json:"reasonCounts"`
	Diagnostics    *WecomOrganizationSyncDryRunDiagnostics  `json:"diagnostics,omitempty"`
	HistoryWarning string                                   `json:"historyWarning,omitempty"`
}

// WecomOrganizationSyncDryRunSource 只暴露组织和 Corp ID 的安全 alias。
type WecomOrganizationSyncDryRunSource struct {
	Organization string `json:"organization"`
	CorpAlias    string `json:"corpAlias"`
	PreviewedAt  string `json:"previewedAt"`
}

// WecomOrganizationSyncDryRunSnapshotStats 保存本次快照规模。
type WecomOrganizationSyncDryRunSnapshotStats struct {
	DepartmentCount   int `json:"departmentCount"`
	UserCount         int `json:"userCount"`
	RelationshipCount int `json:"relationshipCount"`
}

// WecomOrganizationSyncDryRunDiff 汇总企业微信部门、用户和关系影响。
type WecomOrganizationSyncDryRunDiff struct {
	Departments   WecomOrganizationSyncDryRunDiffCounts `json:"departments"`
	Users         WecomOrganizationSyncDryRunDiffCounts `json:"users"`
	Relationships WecomOrganizationSyncDryRunDiffCounts `json:"relationships"`
}

// WecomOrganizationSyncDryRunDiffCounts 是每类资源的只读 diff 计数。
type WecomOrganizationSyncDryRunDiffCounts struct {
	ToCreate      int `json:"toCreate"`
	ToUpdate      int `json:"toUpdate"`
	ToSoftDisable int `json:"toSoftDisable"`
	Unchanged     int `json:"unchanged"`
	Conflict      int `json:"conflict"`
	Invalid       int `json:"invalid"`
}

// WecomOrganizationSyncDryRunDiagnostics 是轻量预览诊断，不复用正式 run，避免误导为真实同步结果。
type WecomOrganizationSyncDryRunDiagnostics struct {
	FailedStage     string `json:"failedStage"`
	FailureCategory string `json:"failureCategory"`
	ReasonCode      string `json:"reasonCode"`
	OperatorAction  string `json:"operatorAction"`
	SafeSummary     string `json:"safeSummary"`
}

// WecomOrganizationSyncDryRunPreviewService 计算企业微信组织同步预览。
// 它只读取 provider snapshot 和本地映射状态，不调用正式写入路径。
type WecomOrganizationSyncDryRunPreviewService struct {
	Now               func() time.Time
	ObjectStore       WecomOrganizationObjectStore
	NewSnapshotClient func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient
	HistoryStore      WecomOrganizationSyncDryRunHistoryStore
	Operator          string
	RequestMarker     string
}

// Preview 拉取企业微信通讯录快照并计算只读预览结果。
// 失败场景按 fail-closed 处理：返回脱敏诊断和可审计 history，不进入正式同步写入路径。
func (s *WecomOrganizationSyncDryRunPreviewService) Preview(ctx context.Context, config *WecomOrganizationSyncConfig) (*WecomOrganizationSyncDryRunPreview, error) {
	prepared, err := prepareWecomOrganizationSyncDryRunConfig(config)
	if err != nil {
		preview := s.failedPreview(config, wecomOrganizationSyncDryRunStageConfigValidation, classifyWecomDryRunFailureReason(err), err.Error())
		s.recordHistory(preview)
		return preview, nil
	}

	syncService := &WecomOrganizationSyncService{
		Now:               s.now,
		ObjectStore:       s.objectStore(),
		NewSnapshotClient: s.snapshotClientFactory(),
	}
	snapshot, err := syncService.FetchFullSnapshot(ctx, syncService.snapshotClient(prepared))
	if err != nil {
		preview := s.failedPreview(prepared, wecomOrganizationSyncDryRunStageFetch, classifyWecomDryRunFailureReason(err), err.Error())
		s.recordHistory(preview)
		return preview, nil
	}
	if missingFields := getMissingWecomOrganizationSnapshotFields(snapshot); len(missingFields) > 0 {
		preview := s.failedPreview(prepared, wecomOrganizationSyncDryRunStageFetch, WecomOrganizationSyncDryRunReasonContractMismatch, "missing required wecom organization snapshot fields: "+strings.Join(missingFields, ", "))
		attachWecomDryRunSnapshotStats(preview, snapshot)
		s.recordHistory(preview)
		return preview, nil
	}

	preview, err := s.buildPreview(prepared, snapshot)
	if err != nil {
		return nil, err
	}
	s.recordHistory(preview)
	return preview, nil
}

func (s *WecomOrganizationSyncDryRunPreviewService) buildPreview(config *WecomOrganizationSyncConfig, snapshot *WecomOrganizationFullSnapshot) (*WecomOrganizationSyncDryRunPreview, error) {
	if snapshot == nil {
		snapshot = &WecomOrganizationFullSnapshot{}
	}
	existing, err := s.objectStore().GetWecomOrganizationSyncExistingState(config.Organization, config.CorpId)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		existing = &WecomOrganizationSyncExistingState{}
	}
	preview := &WecomOrganizationSyncDryRunPreview{
		Status: WecomOrganizationSyncDryRunPreviewStatusSucceeded,
		Source: WecomOrganizationSyncDryRunSource{
			Organization: config.Organization,
			CorpAlias:    "corp-" + shortWecomOrganizationSyncHash(config.Organization, config.CorpId),
			PreviewedAt:  s.now().UTC().Format(time.RFC3339Nano),
		},
		ReasonCounts: map[string]int{},
	}
	attachWecomDryRunSnapshotStats(preview, snapshot)
	plan := BuildWecomOrganizationSyncPlan(config.Organization, config.CorpId, "wecom-dry-run-"+shortWecomOrganizationSyncHash(config.Organization, config.CorpId, preview.Source.PreviewedAt), snapshot, *existing)
	stats := buildWecomOrganizationSyncRunStats(snapshot, plan, existing)
	preview.Diff.Departments = WecomOrganizationSyncDryRunDiffCounts{
		ToCreate:      stats.DepartmentCreatedCount,
		ToUpdate:      stats.DepartmentUpdatedCount,
		ToSoftDisable: stats.DepartmentDisabledCount,
	}
	preview.Diff.Users = WecomOrganizationSyncDryRunDiffCounts{
		ToCreate:      stats.UserCreatedCount,
		ToUpdate:      stats.UserUpdatedCount,
		ToSoftDisable: stats.UserDisabledCount,
	}
	preview.Diff.Relationships = buildWecomDryRunRelationshipDiff(plan, existing)
	if preview.Diff.Departments.ToSoftDisable > 0 || preview.Diff.Users.ToSoftDisable > 0 || preview.Diff.Relationships.ToSoftDisable > 0 {
		incrementWecomDryRunReason(preview, wecomDryRunReasonWouldSoftDisable)
	}
	incrementWecomDryRunInvalidReasons(preview, snapshot)
	return preview, nil
}

func buildWecomDryRunRelationshipDiff(plan *WecomOrganizationSyncPlan, existing *WecomOrganizationSyncExistingState) WecomOrganizationSyncDryRunDiffCounts {
	counts := WecomOrganizationSyncDryRunDiffCounts{}
	if plan == nil {
		return counts
	}
	existingUserDepartments := map[string]bool{}
	existingDepartmentLeaders := map[string]bool{}
	existingDirectLeaders := map[string]bool{}
	if existing != nil {
		for _, membership := range existing.UserDepartments {
			if key := wecomRelationshipKey(membership.WecomUserId, membership.DepartmentId); key != "" {
				existingUserDepartments[key] = true
			}
		}
		for _, leader := range existing.DepartmentLeaders {
			if key := wecomRelationshipKey(leader.DepartmentId, leader.LeaderWecomUserId); key != "" {
				existingDepartmentLeaders[key] = true
			}
		}
		for _, leader := range existing.DirectLeaders {
			if key := wecomRelationshipKey(leader.WecomUserId, leader.LeaderWecomUserId); key != "" {
				existingDirectLeaders[key] = true
			}
		}
	}
	for _, membership := range plan.UserDepartmentUpserts {
		if existingUserDepartments[wecomRelationshipKey(membership.WecomUserId, membership.DepartmentId)] {
			counts.ToUpdate++
		} else {
			counts.ToCreate++
		}
	}
	for _, leader := range plan.DepartmentLeaderUpserts {
		if existingDepartmentLeaders[wecomRelationshipKey(leader.DepartmentId, leader.LeaderWecomUserId)] {
			counts.ToUpdate++
		} else {
			counts.ToCreate++
		}
	}
	for _, leader := range plan.DirectLeaderUpserts {
		if existingDirectLeaders[wecomRelationshipKey(leader.WecomUserId, leader.LeaderWecomUserId)] {
			counts.ToUpdate++
		} else {
			counts.ToCreate++
		}
	}
	counts.ToSoftDisable = len(plan.UserDepartmentDisables) + len(plan.DepartmentLeaderDisables) + len(plan.DirectLeaderDisables)
	return counts
}

func attachWecomDryRunSnapshotStats(preview *WecomOrganizationSyncDryRunPreview, snapshot *WecomOrganizationFullSnapshot) {
	if preview == nil || snapshot == nil {
		return
	}
	preview.SnapshotStats = WecomOrganizationSyncDryRunSnapshotStats{
		DepartmentCount:   len(snapshot.Departments),
		UserCount:         len(snapshot.Users),
		RelationshipCount: len(snapshot.UserDepartments) + len(snapshot.DepartmentLeaders) + len(snapshot.DirectLeaders),
	}
}

func incrementWecomDryRunInvalidReasons(preview *WecomOrganizationSyncDryRunPreview, snapshot *WecomOrganizationFullSnapshot) {
	if preview == nil || snapshot == nil {
		return
	}
	for _, department := range snapshot.Departments {
		if strings.TrimSpace(department.Id) == "" {
			preview.Diff.Departments.Invalid++
			incrementWecomDryRunReason(preview, wecomDryRunReasonMissingDepartmentIdentifier)
		}
	}
	for _, user := range snapshot.Users {
		if strings.TrimSpace(user.UserId) == "" {
			preview.Diff.Users.Invalid++
			incrementWecomDryRunReason(preview, wecomDryRunReasonMissingUserIdentifier)
		}
	}
	for _, membership := range snapshot.UserDepartments {
		if strings.TrimSpace(membership.WecomUserId) == "" {
			preview.Diff.Relationships.Invalid++
			incrementWecomDryRunReason(preview, wecomDryRunReasonMissingUserIdentifier)
		}
		if strings.TrimSpace(membership.DepartmentId) == "" {
			preview.Diff.Relationships.Invalid++
			incrementWecomDryRunReason(preview, wecomDryRunReasonMissingDepartmentIdentifier)
		}
	}
}

func (s *WecomOrganizationSyncDryRunPreviewService) failedPreview(config *WecomOrganizationSyncConfig, stage string, reason string, summary string) *WecomOrganizationSyncDryRunPreview {
	organization := ""
	corpAlias := ""
	if config != nil {
		organization = strings.TrimSpace(config.Organization)
		if strings.TrimSpace(config.CorpId) != "" {
			corpAlias = "corp-" + shortWecomOrganizationSyncHash(config.Organization, config.CorpId)
		}
	}
	return &WecomOrganizationSyncDryRunPreview{
		Status: WecomOrganizationSyncDryRunPreviewStatusFailed,
		Source: WecomOrganizationSyncDryRunSource{
			Organization: organization,
			CorpAlias:    corpAlias,
			PreviewedAt:  s.now().UTC().Format(time.RFC3339Nano),
		},
		ReasonCounts: map[string]int{reason: 1},
		Diagnostics:  buildWecomDryRunDiagnostics(stage, reason, summary, wecomDryRunSensitiveValues(config)...),
	}
}

func prepareWecomOrganizationSyncDryRunConfig(config *WecomOrganizationSyncConfig) (*WecomOrganizationSyncConfig, error) {
	if config == nil {
		return nil, errors.New("wecom organization sync config is required")
	}
	prepared := *config
	prepared.Organization = strings.TrimSpace(prepared.Organization)
	prepared.CorpId = strings.TrimSpace(prepared.CorpId)
	prepared.AddressBookSecret = strings.TrimSpace(prepared.AddressBookSecret)
	if err := validateWecomOrganizationSyncRunExecutionConfig(&prepared); err != nil {
		return nil, err
	}
	if !prepared.IsEnabled {
		return nil, errors.New("wecom organization sync config is disabled")
	}
	return &prepared, nil
}

func classifyWecomDryRunFailureReason(err error) string {
	text := strings.ToLower(err.Error())
	switch {
	case strings.Contains(text, "config is required") || strings.Contains(text, "organization is required") || strings.Contains(text, "target organization cannot be built-in") || strings.Contains(text, "corp_id is required") || strings.Contains(text, "address_book_secret is required") || strings.Contains(text, "credential_missing"):
		return WecomOrganizationSyncDryRunReasonCredentialMissing
	case strings.Contains(text, "permission") || strings.Contains(text, "scope") || strings.Contains(text, "48009"):
		return WecomOrganizationSyncDryRunReasonPermissionMissing
	case strings.Contains(text, "missing required") || strings.Contains(text, "unexpected") || strings.Contains(text, "decode") || strings.Contains(text, "contract"):
		return WecomOrganizationSyncDryRunReasonContractMismatch
	case strings.Contains(text, "snapshot client"):
		return WecomOrganizationSyncDryRunReasonSnapshotClientUnavailable
	default:
		return WecomOrganizationSyncDryRunReasonRuntimeAuthorization
	}
}

func buildWecomDryRunDiagnostics(stage string, reason string, summary string, sensitiveValues ...string) *WecomOrganizationSyncDryRunDiagnostics {
	diagnostics := &WecomOrganizationSyncDryRunDiagnostics{
		FailedStage: stage,
		ReasonCode:  reason,
		SafeSummary: safeWecomDryRunSummary(summary, sensitiveValues...),
	}
	switch reason {
	case WecomOrganizationSyncDryRunReasonCredentialMissing:
		diagnostics.FailureCategory = "configuration"
		diagnostics.OperatorAction = "fix_credentials"
	case WecomOrganizationSyncDryRunReasonPermissionMissing:
		diagnostics.FailureCategory = "permission"
		diagnostics.OperatorAction = "grant_contact_scope"
	case WecomOrganizationSyncDryRunReasonContractMismatch:
		diagnostics.FailureCategory = "contract"
		diagnostics.OperatorAction = "manual_review"
	default:
		diagnostics.FailureCategory = "provider"
		diagnostics.OperatorAction = "manual_review"
	}
	return diagnostics
}

func safeWecomDryRunSummary(summary string, sensitiveValues ...string) string {
	safe := safeOrganizationSyncErrorText(summary, sensitiveValues...)
	safe = wecomDryRunKeyValueSecretPattern.ReplaceAllString(safe, "$1=***")
	safe = wecomDryRunIdentifierPattern.ReplaceAllString(safe, "$1=***")
	safe = wecomDryRunEmailPattern.ReplaceAllString(safe, "***")
	safe = wecomDryRunPhonePattern.ReplaceAllString(safe, "***")
	return safe
}

func wecomDryRunSensitiveValues(config *WecomOrganizationSyncConfig) []string {
	if config == nil {
		return nil
	}
	values := []string{}
	for _, value := range []string{config.CorpId, config.AddressBookSecret} {
		value = strings.TrimSpace(value)
		if value != "" && value != WecomOrganizationSyncMaskedSecret {
			values = append(values, value)
		}
	}
	return values
}

func (s *WecomOrganizationSyncDryRunPreviewService) snapshotClientFactory() func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
	return func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
		if s != nil && s.NewSnapshotClient != nil {
			return s.NewSnapshotClient(corpId, addressBookSecret)
		}
		return NewWecomAddressBookClient(corpId, addressBookSecret)
	}
}

func (s *WecomOrganizationSyncDryRunPreviewService) objectStore() WecomOrganizationObjectStore {
	if s != nil && s.ObjectStore != nil {
		return s.ObjectStore
	}
	return defaultWecomOrganizationObjectStore{}
}

func (s *WecomOrganizationSyncDryRunPreviewService) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s *WecomOrganizationSyncDryRunPreviewService) historyStore() WecomOrganizationSyncDryRunHistoryStore {
	if s != nil && s.HistoryStore != nil {
		return s.HistoryStore
	}
	return defaultWecomOrganizationSyncDryRunHistoryStore{}
}

func (s *WecomOrganizationSyncDryRunPreviewService) recordHistory(preview *WecomOrganizationSyncDryRunPreview) {
	if preview == nil {
		return
	}
	if s == nil || s.HistoryStore == nil {
		if ormer == nil || ormer.Engine == nil {
			return
		}
	}
	history := newWecomDryRunHistoryFromPreview(preview, s.operator(), s.requestMarker(), s.now().UTC())
	if history == nil || history.Organization == "" {
		return
	}
	if err := s.historyStore().CreateWecomOrganizationSyncDryRunHistory(history); err != nil {
		preview.HistoryWarning = WecomOrganizationSyncDryRunHistoryWarning
	}
}

func (s *WecomOrganizationSyncDryRunPreviewService) operator() string {
	if s == nil {
		return ""
	}
	return s.Operator
}

func (s *WecomOrganizationSyncDryRunPreviewService) requestMarker() string {
	if s == nil {
		return ""
	}
	return s.RequestMarker
}

func incrementWecomDryRunReason(preview *WecomOrganizationSyncDryRunPreview, reason string) {
	if preview == nil || reason == "" {
		return
	}
	if preview.ReasonCounts == nil {
		preview.ReasonCounts = map[string]int{}
	}
	preview.ReasonCounts[reason]++
}

func shortWecomOrganizationSyncHash(values ...string) string {
	normalized := make([]string, len(values))
	for i, value := range values {
		normalized[i] = strings.TrimSpace(value)
	}
	sum := sha256.Sum256([]byte(strings.Join(normalized, "\x1f")))
	return hex.EncodeToString(sum[:])[:24]
}

var (
	wecomDryRunKeyValueSecretPattern = regexp.MustCompile(`(?i)\b(token|secret)\s*[:=]\s*[^,\s;]+`)
	wecomDryRunIdentifierPattern     = regexp.MustCompile(`(?i)\b(corp_id|userid|user_id|wecom_user_id)\s*[:=]\s*[^,\s;]+`)
	wecomDryRunEmailPattern          = regexp.MustCompile(`(?i)\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b`)
	wecomDryRunPhonePattern          = regexp.MustCompile(`\b1[3-9]\d{9}\b`)
)
