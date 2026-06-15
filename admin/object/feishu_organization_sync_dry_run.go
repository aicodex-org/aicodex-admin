// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"
)

const (
	FeishuOrganizationSyncDryRunPreviewStatusSucceeded = "succeeded"
	FeishuOrganizationSyncDryRunPreviewStatusFailed    = "failed"

	FeishuOrganizationSyncDryRunReasonCredentialMissing            = "credential_missing"
	FeishuOrganizationSyncDryRunReasonInvalidAppCredentials        = "invalid_app_credentials"
	FeishuOrganizationSyncDryRunReasonContactPermissionMissing     = "contact_permission_missing"
	FeishuOrganizationSyncDryRunReasonRuntimeAuthorizationRequired = "runtime_authorization_required"
	FeishuOrganizationSyncDryRunReasonContractMismatch             = "contract_mismatch"
)

const (
	feishuDryRunReasonDuplicateExternalIdentifier = "duplicate_external_identifier"
	feishuDryRunReasonMissingDepartmentIdentifier = "missing_department_identifier"
	feishuDryRunReasonMissingParentDepartment     = "missing_parent_department"
	feishuDryRunReasonMissingUserIdentifier       = "missing_user_identifier"
	feishuDryRunReasonUnmappedUser                = "unmapped_user"
	feishuDryRunReasonUnmappedDepartment          = "unmapped_department"
	feishuDryRunReasonWouldSoftDisable            = "would_soft_disable"
)

// FeishuOrganizationSyncDryRunPreview 是 dry-run preview API 返回的脱敏聚合视图。
// 它不包含完整 Contact payload 或外部身份明细，只承载 operator 决策所需的规模和风险计数。
type FeishuOrganizationSyncDryRunPreview struct {
	Status         string                                    `json:"status"`
	Source         FeishuOrganizationSyncDryRunSource        `json:"source"`
	SnapshotStats  FeishuOrganizationSyncDryRunSnapshotStats `json:"snapshotStats"`
	Diff           FeishuOrganizationSyncDryRunDiff          `json:"diff"`
	ReasonCounts   map[string]int                            `json:"reasonCounts"`
	Diagnostics    *FeishuOrganizationSyncRunDiagnostics     `json:"diagnostics,omitempty"`
	HistoryWarning string                                    `json:"historyWarning,omitempty"`
}

// FeishuOrganizationSyncDryRunSource 描述 dry-run 使用的来源别名。
// App 和租户只暴露 hash alias，避免在 API 响应中泄漏真实应用或租户标识。
type FeishuOrganizationSyncDryRunSource struct {
	Organization string `json:"organization"`
	EndpointMode string `json:"endpointMode"`
	AppAlias     string `json:"appAlias"`
	TenantAlias  string `json:"tenantAlias"`
	PreviewedAt  string `json:"previewedAt"`
}

// FeishuOrganizationSyncDryRunSnapshotStats 记录本次 Contact snapshot 的聚合规模。
type FeishuOrganizationSyncDryRunSnapshotStats struct {
	DepartmentCount int `json:"departmentCount"`
	UserCount       int `json:"userCount"`
	MembershipCount int `json:"membershipCount"`
}

// FeishuOrganizationSyncDryRunDiff 汇总部门、用户和成员关系三类资源的预期变化。
type FeishuOrganizationSyncDryRunDiff struct {
	Departments FeishuOrganizationSyncDryRunDiffCounts `json:"departments"`
	Users       FeishuOrganizationSyncDryRunDiffCounts `json:"users"`
	Memberships FeishuOrganizationSyncDryRunDiffCounts `json:"memberships"`
}

// FeishuOrganizationSyncDryRunDiffCounts 是每类资源的只读 diff 计数。
type FeishuOrganizationSyncDryRunDiffCounts struct {
	ToCreate      int `json:"toCreate"`
	ToUpdate      int `json:"toUpdate"`
	ToSoftDisable int `json:"toSoftDisable"`
	Unchanged     int `json:"unchanged"`
	Conflict      int `json:"conflict"`
	Invalid       int `json:"invalid"`
}

// FeishuOrganizationSyncDryRunPreviewService 计算 Feishu/Lark 组织同步预览。
// 它只读取 snapshot 和本地映射状态，不调用真实写入路径。
type FeishuOrganizationSyncDryRunPreviewService struct {
	Now               func() time.Time
	NewSnapshotClient func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient
	HistoryStore      FeishuOrganizationSyncDryRunHistoryStore
	Operator          string
	RequestMarker     string
}

// Preview 拉取一次 normalized snapshot 并返回脱敏聚合 diff。
func (s *FeishuOrganizationSyncDryRunPreviewService) Preview(ctx context.Context, config *FeishuOrganizationSyncConfig) (*FeishuOrganizationSyncDryRunPreview, error) {
	prepared, err := prepareFeishuOrganizationSyncDryRunConfig(config)
	if err != nil {
		preview := s.failedPreview(config, FeishuOrganizationSyncDiagnosticStageConfigValidation, classifyFeishuDryRunFailureReason(err), err.Error())
		s.recordHistory(preview)
		return preview, nil
	}
	syncService := &FeishuOrganizationSyncService{
		Now: s.now,
		NewSnapshotClient: func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient {
			return s.snapshotClient(appId, appSecret, endpointMode)
		},
	}
	snapshot, sourceTenantId, err := syncService.FetchFullSnapshot(ctx, prepared, syncService.snapshotClient(prepared))
	if err != nil {
		stage := classifyFeishuDiagnosticStage(&FeishuOrganizationSyncRun{ErrorCode: feishuSyncErrorCodeFromError(err, "runtime_authorization_required")})
		reason := classifyFeishuDryRunFailureReason(err)
		preview := s.failedPreview(prepared, stage, reason, err.Error())
		s.recordHistory(preview)
		return preview, nil
	}
	preview, err := s.buildPreview(prepared, snapshot, firstNonEmpty(sourceTenantId, prepared.TenantKey, prepared.AppId))
	if err != nil {
		return nil, err
	}
	s.recordHistory(preview)
	return preview, nil
}

func (s *FeishuOrganizationSyncDryRunPreviewService) buildPreview(config *FeishuOrganizationSyncConfig, snapshot *FeishuOrganizationFullSnapshot, sourceTenantId string) (*FeishuOrganizationSyncDryRunPreview, error) {
	if snapshot == nil {
		snapshot = &FeishuOrganizationFullSnapshot{}
	}
	preview := &FeishuOrganizationSyncDryRunPreview{
		Status: FeishuOrganizationSyncDryRunPreviewStatusSucceeded,
		Source: FeishuOrganizationSyncDryRunSource{
			Organization: config.Organization,
			EndpointMode: normalizeFeishuEndpointMode(config.EndpointMode),
			AppAlias:     "app-" + shortFeishuOrganizationSyncHash(config.Organization, config.AppId),
			TenantAlias:  "tenant-" + shortFeishuOrganizationSyncHash(config.Organization, sourceTenantId),
			PreviewedAt:  s.now().UTC().Format(time.RFC3339Nano),
		},
		SnapshotStats: FeishuOrganizationSyncDryRunSnapshotStats{
			DepartmentCount: len(snapshot.Departments),
			UserCount:       len(snapshot.Users),
			MembershipCount: len(snapshot.UserDepartments),
		},
		ReasonCounts: map[string]int{},
	}
	if err := s.diffDepartments(config, snapshot, sourceTenantId, preview); err != nil {
		return nil, err
	}
	if err := s.diffUsers(config, snapshot, sourceTenantId, preview); err != nil {
		return nil, err
	}
	if err := s.diffMemberships(config, snapshot, preview); err != nil {
		return nil, err
	}
	return preview, nil
}

func (s *FeishuOrganizationSyncDryRunPreviewService) diffDepartments(config *FeishuOrganizationSyncConfig, snapshot *FeishuOrganizationFullSnapshot, sourceTenantId string, preview *FeishuOrganizationSyncDryRunPreview) error {
	duplicates := duplicateFeishuDepartmentSnapshotIds(snapshot.Departments)
	incoming := map[string]FeishuDepartmentSnapshot{}
	for _, department := range snapshot.Departments {
		id := strings.TrimSpace(department.Id)
		if id == "" {
			preview.Diff.Departments.Invalid++
			incrementFeishuDryRunReason(preview, feishuDryRunReasonMissingDepartmentIdentifier)
			continue
		}
		if duplicates[id] {
			continue
		}
		incoming[id] = department
	}
	for id := range duplicates {
		if id != "" {
			preview.Diff.Departments.Conflict++
			incrementFeishuDryRunReason(preview, feishuDryRunReasonDuplicateExternalIdentifier)
		}
	}
	for id, department := range incoming {
		if department.ParentId != "" && department.ParentId != "0" && incoming[department.ParentId].Id == "" {
			parentMapping, err := getFeishuDepartmentMapping(config.Organization, config.AppId, department.ParentId)
			if err != nil {
				return err
			}
			if parentMapping == nil {
				preview.Diff.Departments.Invalid++
				incrementFeishuDryRunReason(preview, feishuDryRunReasonMissingParentDepartment)
				continue
			}
		}
		mapping, err := getFeishuDepartmentMapping(config.Organization, config.AppId, id)
		if err != nil {
			return err
		}
		if mapping == nil {
			preview.Diff.Departments.ToCreate++
			continue
		}
		displayName := firstNonEmpty(department.Name, department.Id)
		parentGroupName := ""
		if department.ParentId != "" && department.ParentId != "0" {
			parentGroupName = GetFeishuDepartmentGroupName(sourceTenantId, department.ParentId)
		}
		if !mapping.IsEnabled || mapping.DisplayName != displayName || mapping.ParentDepartmentId != department.ParentId || mapping.ParentGroupName != parentGroupName {
			preview.Diff.Departments.ToUpdate++
		} else {
			preview.Diff.Departments.Unchanged++
		}
	}
	if config.SoftDisableMissingData {
		mappings, err := getFeishuDepartmentMappings(config.Organization, config.AppId)
		if err != nil {
			return err
		}
		for _, mapping := range mappings {
			if mapping.IsEnabled && !duplicates[mapping.DepartmentId] && incoming[mapping.DepartmentId].Id == "" {
				preview.Diff.Departments.ToSoftDisable++
				incrementFeishuDryRunReason(preview, feishuDryRunReasonWouldSoftDisable)
			}
		}
	}
	return nil
}

func (s *FeishuOrganizationSyncDryRunPreviewService) diffUsers(config *FeishuOrganizationSyncConfig, snapshot *FeishuOrganizationFullSnapshot, sourceTenantId string, preview *FeishuOrganizationSyncDryRunPreview) error {
	duplicates := duplicateFeishuUserSnapshotIds(snapshot.Users)
	incoming := map[string]FeishuUserSnapshot{}
	for _, user := range snapshot.Users {
		id := strings.TrimSpace(user.UserId)
		if id == "" {
			preview.Diff.Users.Invalid++
			incrementFeishuDryRunReason(preview, feishuDryRunReasonMissingUserIdentifier)
			continue
		}
		if duplicates[id] {
			continue
		}
		incoming[id] = user
	}
	for id := range duplicates {
		if id != "" {
			preview.Diff.Users.Conflict++
			incrementFeishuDryRunReason(preview, feishuDryRunReasonDuplicateExternalIdentifier)
		}
	}
	for id, user := range incoming {
		mapping, err := getFeishuUserMapping(config.Organization, config.AppId, id)
		if err != nil {
			return err
		}
		localUser, err := findFeishuUserByIdentifiers(config.Organization, user)
		if err != nil {
			return err
		}
		if mapping == nil && localUser == nil {
			preview.Diff.Users.ToCreate++
			continue
		}
		if mapping == nil {
			preview.Diff.Users.ToUpdate++
			continue
		}
		needsUpdate := !mapping.IsEnabled || mapping.OpenId != user.OpenId || mapping.UnionId != user.UnionId || mapping.MainDepartmentId != user.MainDepartmentId || mapping.Status != user.Status
		if localUser != nil {
			needsUpdate = needsUpdate || localUser.DisplayName != firstNonEmpty(user.Name, user.UserId) || localUser.Lark != user.UserId || localUser.ExternalId != GetLengthSafeFeishuUserExternalId(sourceTenantId, user.UserId)
		}
		if needsUpdate {
			preview.Diff.Users.ToUpdate++
		} else {
			preview.Diff.Users.Unchanged++
		}
	}
	if config.SoftDisableMissingData {
		mappings, err := getFeishuUserMappings(config.Organization, config.AppId)
		if err != nil {
			return err
		}
		for _, mapping := range mappings {
			if mapping.IsEnabled && !duplicates[mapping.FeishuUserId] && incoming[mapping.FeishuUserId].UserId == "" {
				preview.Diff.Users.ToSoftDisable++
				incrementFeishuDryRunReason(preview, feishuDryRunReasonWouldSoftDisable)
			}
		}
	}
	return nil
}

func (s *FeishuOrganizationSyncDryRunPreviewService) diffMemberships(config *FeishuOrganizationSyncConfig, snapshot *FeishuOrganizationFullSnapshot, preview *FeishuOrganizationSyncDryRunPreview) error {
	duplicates := duplicateFeishuMembershipSnapshotIds(snapshot.UserDepartments)
	incoming := map[string]FeishuUserDepartmentSnapshot{}
	for _, membership := range snapshot.UserDepartments {
		key := membership.FeishuUserId + "\x1f" + membership.DepartmentId
		if strings.TrimSpace(membership.FeishuUserId) == "" {
			preview.Diff.Memberships.Invalid++
			incrementFeishuDryRunReason(preview, feishuDryRunReasonMissingUserIdentifier)
			continue
		}
		if strings.TrimSpace(membership.DepartmentId) == "" {
			preview.Diff.Memberships.Invalid++
			incrementFeishuDryRunReason(preview, feishuDryRunReasonMissingDepartmentIdentifier)
			continue
		}
		if duplicates[key] {
			continue
		}
		incoming[key] = membership
	}
	for key := range duplicates {
		if key != "" {
			preview.Diff.Memberships.Conflict++
			incrementFeishuDryRunReason(preview, feishuDryRunReasonDuplicateExternalIdentifier)
		}
	}
	for key, membership := range incoming {
		userMapping, err := getFeishuUserMapping(config.Organization, config.AppId, membership.FeishuUserId)
		if err != nil {
			return err
		}
		if userMapping == nil && !hasFeishuDryRunSnapshotUser(snapshot, membership.FeishuUserId) {
			preview.Diff.Memberships.Invalid++
			incrementFeishuDryRunReason(preview, feishuDryRunReasonUnmappedUser)
			continue
		}
		departmentMapping, err := getFeishuDepartmentMapping(config.Organization, config.AppId, membership.DepartmentId)
		if err != nil {
			return err
		}
		if departmentMapping == nil && !hasFeishuDryRunSnapshotDepartment(snapshot, membership.DepartmentId) {
			preview.Diff.Memberships.Invalid++
			incrementFeishuDryRunReason(preview, feishuDryRunReasonUnmappedDepartment)
			continue
		}
		existing, err := getFeishuUserDepartment(config.Organization, config.AppId, membership.FeishuUserId, membership.DepartmentId)
		if err != nil {
			return err
		}
		if existing == nil {
			preview.Diff.Memberships.ToCreate++
			continue
		}
		if !existing.IsEnabled || existing.IsMain != membership.IsMain {
			preview.Diff.Memberships.ToUpdate++
		} else {
			preview.Diff.Memberships.Unchanged++
		}
		_ = key
	}
	if config.SoftDisableMissingData {
		memberships, err := getFeishuUserDepartments(config.Organization, config.AppId)
		if err != nil {
			return err
		}
		for _, membership := range memberships {
			key := membership.FeishuUserId + "\x1f" + membership.DepartmentId
			if membership.IsEnabled && !duplicates[key] {
				if _, ok := incoming[key]; !ok {
					preview.Diff.Memberships.ToSoftDisable++
					incrementFeishuDryRunReason(preview, feishuDryRunReasonWouldSoftDisable)
				}
			}
		}
	}
	return nil
}

func (s *FeishuOrganizationSyncDryRunPreviewService) failedPreview(config *FeishuOrganizationSyncConfig, stage string, reason string, summary string) *FeishuOrganizationSyncDryRunPreview {
	organization := ""
	endpointMode := ""
	appAlias := ""
	tenantAlias := ""
	if config != nil {
		organization = config.Organization
		endpointMode = normalizeFeishuEndpointMode(config.EndpointMode)
		if strings.TrimSpace(config.AppId) != "" {
			appAlias = "app-" + shortFeishuOrganizationSyncHash(config.Organization, config.AppId)
		}
		if strings.TrimSpace(config.TenantKey) != "" {
			tenantAlias = "tenant-" + shortFeishuOrganizationSyncHash(config.Organization, config.TenantKey)
		}
	}
	return &FeishuOrganizationSyncDryRunPreview{
		Status: FeishuOrganizationSyncDryRunPreviewStatusFailed,
		Source: FeishuOrganizationSyncDryRunSource{
			Organization: organization,
			EndpointMode: endpointMode,
			AppAlias:     appAlias,
			TenantAlias:  tenantAlias,
			PreviewedAt:  s.now().UTC().Format(time.RFC3339Nano),
		},
		ReasonCounts: map[string]int{reason: 1},
		Diagnostics:  buildFeishuDryRunDiagnostics(stage, reason, summary, feishuDryRunSensitiveValues(config)...),
	}
}

func prepareFeishuOrganizationSyncDryRunConfig(config *FeishuOrganizationSyncConfig) (*FeishuOrganizationSyncConfig, error) {
	if config == nil {
		return nil, errors.New("feishu organization sync config is required")
	}
	prepared := *config
	prepared.Organization = strings.TrimSpace(prepared.Organization)
	prepared.AppId = strings.TrimSpace(prepared.AppId)
	prepared.AppSecret = strings.TrimSpace(prepared.AppSecret)
	prepared.EndpointMode = normalizeFeishuEndpointMode(prepared.EndpointMode)
	prepared.TenantKey = strings.TrimSpace(prepared.TenantKey)
	if prepared.Organization == "" {
		return nil, errors.New("feishu organization sync organization is required")
	}
	if prepared.AppId == "" {
		return nil, errors.New("feishu organization sync app_id is required")
	}
	if prepared.AppSecret == "" || prepared.AppSecret == FeishuOrganizationSyncMaskedSecret {
		return nil, errors.New("feishu organization sync app_secret is required")
	}
	if !isValidFeishuEndpointMode(prepared.EndpointMode) {
		return nil, errors.New("feishu organization sync endpoint_mode is invalid")
	}
	if !prepared.IsEnabled {
		return nil, errors.New("feishu organization sync config is disabled")
	}
	return &prepared, nil
}

func classifyFeishuDryRunFailureReason(err error) string {
	text := strings.ToLower(err.Error())
	switch {
	case strings.Contains(text, "config is required") || strings.Contains(text, "organization is required") || strings.Contains(text, "app_id is required") || strings.Contains(text, "app_secret is required") || strings.Contains(text, "endpoint_mode is invalid") || strings.Contains(text, "credential_missing"):
		return FeishuOrganizationSyncDryRunReasonCredentialMissing
	case strings.Contains(text, "invalid app") || strings.Contains(text, "app secret"):
		return FeishuOrganizationSyncDryRunReasonInvalidAppCredentials
	case strings.Contains(text, "permission") || strings.Contains(text, "scope"):
		return FeishuOrganizationSyncDryRunReasonContactPermissionMissing
	case strings.Contains(text, "decode") || strings.Contains(text, "unexpected") || strings.Contains(text, "contract"):
		return FeishuOrganizationSyncDryRunReasonContractMismatch
	default:
		return FeishuOrganizationSyncDryRunReasonRuntimeAuthorizationRequired
	}
}

func buildFeishuDryRunDiagnostics(stage string, reason string, summary string, sensitiveValues ...string) *FeishuOrganizationSyncRunDiagnostics {
	diagnostics := &FeishuOrganizationSyncRunDiagnostics{
		FailedStage:    firstNonEmpty(stage, FeishuOrganizationSyncDiagnosticStageUnknown),
		ReasonCode:     reason,
		RetryReadiness: FeishuOrganizationSyncRetryNotReady,
		SafeSummary:    safeFeishuDryRunSummary(summary, sensitiveValues...),
	}
	switch reason {
	case FeishuOrganizationSyncDryRunReasonCredentialMissing:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryConfiguration
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorFixCredentials
	case FeishuOrganizationSyncDryRunReasonInvalidAppCredentials:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryCredentials
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorFixCredentials
	case FeishuOrganizationSyncDryRunReasonContactPermissionMissing:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryPermission
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorGrantContactScope
	case FeishuOrganizationSyncDryRunReasonContractMismatch:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryContract
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorManualReview
	default:
		diagnostics.FailureCategory = FeishuOrganizationSyncFailureCategoryProvider
		diagnostics.OperatorAction = FeishuOrganizationSyncOperatorManualReview
	}
	return diagnostics
}

func safeFeishuDryRunSummary(summary string, sensitiveValues ...string) string {
	safe := safeFeishuDiagnosticSummary(&FeishuOrganizationSyncRun{ErrorText: summary}, sensitiveValues...)
	return feishuDryRunKeyValueSecretPattern.ReplaceAllString(safe, "$1=***")
}

func feishuDryRunSensitiveValues(config *FeishuOrganizationSyncConfig) []string {
	if config == nil {
		return nil
	}
	values := []string{}
	for _, value := range []string{config.AppSecret, config.TenantKey} {
		if strings.TrimSpace(value) != "" && strings.TrimSpace(value) != FeishuOrganizationSyncMaskedSecret {
			values = append(values, value)
		}
	}
	return values
}

func (s *FeishuOrganizationSyncDryRunPreviewService) snapshotClient(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient {
	if s != nil && s.NewSnapshotClient != nil {
		return s.NewSnapshotClient(appId, appSecret, endpointMode)
	}
	return NewFeishuAddressBookClient(appId, appSecret, endpointMode)
}

func (s *FeishuOrganizationSyncDryRunPreviewService) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s *FeishuOrganizationSyncDryRunPreviewService) historyStore() FeishuOrganizationSyncDryRunHistoryStore {
	if s != nil && s.HistoryStore != nil {
		return s.HistoryStore
	}
	return defaultFeishuOrganizationSyncDryRunHistoryStore{}
}

func (s *FeishuOrganizationSyncDryRunPreviewService) recordHistory(preview *FeishuOrganizationSyncDryRunPreview) {
	if preview == nil {
		return
	}
	if s == nil || s.HistoryStore == nil {
		if ormer == nil || ormer.Engine == nil {
			return
		}
	}
	history := newFeishuDryRunHistoryFromPreview(preview, s.operator(), s.requestMarker(), s.now().UTC())
	if history == nil || history.Organization == "" {
		return
	}
	if err := s.historyStore().CreateFeishuOrganizationSyncDryRunHistory(history); err != nil {
		preview.HistoryWarning = FeishuOrganizationSyncDryRunHistoryWarning
	}
}

func (s *FeishuOrganizationSyncDryRunPreviewService) operator() string {
	if s == nil {
		return ""
	}
	return s.Operator
}

func (s *FeishuOrganizationSyncDryRunPreviewService) requestMarker() string {
	if s == nil {
		return ""
	}
	return s.RequestMarker
}

func duplicateFeishuDepartmentSnapshotIds(departments []FeishuDepartmentSnapshot) map[string]bool {
	counts := map[string]int{}
	for _, department := range departments {
		id := strings.TrimSpace(department.Id)
		if id != "" {
			counts[id]++
		}
	}
	return feishuDryRunDuplicateMap(counts)
}

func duplicateFeishuUserSnapshotIds(users []FeishuUserSnapshot) map[string]bool {
	counts := map[string]int{}
	for _, user := range users {
		id := strings.TrimSpace(user.UserId)
		if id != "" {
			counts[id]++
		}
	}
	return feishuDryRunDuplicateMap(counts)
}

func duplicateFeishuMembershipSnapshotIds(memberships []FeishuUserDepartmentSnapshot) map[string]bool {
	counts := map[string]int{}
	for _, membership := range memberships {
		if strings.TrimSpace(membership.FeishuUserId) != "" && strings.TrimSpace(membership.DepartmentId) != "" {
			counts[membership.FeishuUserId+"\x1f"+membership.DepartmentId]++
		}
	}
	return feishuDryRunDuplicateMap(counts)
}

func feishuDryRunDuplicateMap(counts map[string]int) map[string]bool {
	duplicates := map[string]bool{}
	for id, count := range counts {
		if count > 1 {
			duplicates[id] = true
		}
	}
	return duplicates
}

func hasFeishuDryRunSnapshotUser(snapshot *FeishuOrganizationFullSnapshot, userId string) bool {
	for _, user := range snapshot.Users {
		if user.UserId == userId {
			return true
		}
	}
	return false
}

func hasFeishuDryRunSnapshotDepartment(snapshot *FeishuOrganizationFullSnapshot, departmentId string) bool {
	for _, department := range snapshot.Departments {
		if department.Id == departmentId {
			return true
		}
	}
	return false
}

func incrementFeishuDryRunReason(preview *FeishuOrganizationSyncDryRunPreview, reason string) {
	if preview == nil || reason == "" {
		return
	}
	if preview.ReasonCounts == nil {
		preview.ReasonCounts = map[string]int{}
	}
	preview.ReasonCounts[reason]++
}

var feishuDryRunKeyValueSecretPattern = regexp.MustCompile(`(?i)\b(token|secret)\s*[:=]\s*[^,\s;]+`)
