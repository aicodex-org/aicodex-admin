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
	FeishuUserBindingDiagnosticsStatusDisabled = "disabled"
	FeishuUserBindingDiagnosticsStatusEmpty    = "empty"
	FeishuUserBindingDiagnosticsStatusOK       = "ok"
	FeishuUserBindingDiagnosticsStatusWarning  = "warning"
	FeishuUserBindingDiagnosticsStatusBlocked  = "blocked"

	FeishuUserBindingRiskNone     = "none"
	FeishuUserBindingRiskLow      = "low"
	FeishuUserBindingRiskMedium   = "medium"
	FeishuUserBindingRiskHigh     = "high"
	FeishuUserBindingRiskCritical = "critical"

	FeishuUserBindingConflictDuplicateUserIDBinding = "duplicate_user_id_binding"
	FeishuUserBindingConflictLocalUserMultiTenant   = "local_user_multi_tenant_binding"
	FeishuUserBindingConflictLegacyIdentifierSplit  = "legacy_identifier_split"
	FeishuUserBindingConflictMissingTenantKey       = "missing_tenant_key"
	FeishuUserBindingConflictEndpointModeMismatch   = "endpoint_mode_mismatch"

	FeishuUserBindingActionInspectMapping      = "inspect_mapping"
	FeishuUserBindingActionConfirmPrimaryUser  = "confirm_primary_user"
	FeishuUserBindingActionBackfillTenantKey   = "backfill_tenant_key"
	FeishuUserBindingActionAlignEndpointMode   = "align_endpoint_mode"
	FeishuUserBindingActionNoAction            = "no_action"
	FeishuUserBindingConflictRedactionV1       = "feishu-user-binding-conflict-redaction-v1"
	defaultFeishuUserBindingConflictIssueLimit = 20
	maxFeishuUserBindingConflictIssueLimit     = 100
)

// FeishuUserBindingConflictDiagnostics 是 Admin 只读的飞书用户绑定风险摘要。
// 所有用户和外部身份都以 hash/sample alias 表达，避免 API 泄漏真实账号资料。
type FeishuUserBindingConflictDiagnostics struct {
	Organization           string                             `json:"organization"`
	Status                 string                             `json:"status"`
	RiskLevel              string                             `json:"riskLevel"`
	SourceConnectionIdHash string                             `json:"sourceConnectionIdHash"`
	Configured             bool                               `json:"configured"`
	Enabled                bool                               `json:"enabled"`
	EndpointMode           string                             `json:"endpointMode"`
	AppAlias               string                             `json:"appAlias"`
	TenantAlias            string                             `json:"tenantAlias"`
	Counts                 FeishuUserBindingConflictCounts    `json:"counts"`
	Issues                 []*FeishuUserBindingConflictIssue  `json:"issues"`
	LatestRun              *FeishuUserBindingConflictLinkage  `json:"latestRun,omitempty"`
	LatestDryRunHistory    *FeishuUserBindingConflictLinkage  `json:"latestDryRunHistory,omitempty"`
	Redaction              FeishuUserBindingConflictRedaction `json:"redaction"`
	GeneratedAt            string                             `json:"generatedAt"`
	SafeSummary            string                             `json:"safeSummary"`
}

// FeishuUserBindingConflictCounts 按稳定风险类型汇总数量，供 UI 快速展示。
type FeishuUserBindingConflictCounts struct {
	Total                  int `json:"total"`
	DuplicateUserIDBinding int `json:"duplicateUserIdBinding"`
	LocalUserMultiTenant   int `json:"localUserMultiTenant"`
	LegacyIdentifierSplit  int `json:"legacyIdentifierSplit"`
	MissingTenantKey       int `json:"missingTenantKey"`
	EndpointModeMismatch   int `json:"endpointModeMismatch"`
}

// FeishuUserBindingConflictIssue 描述单条脱敏风险，不返回真实 user_id/open_id/union_id 或本地用户名。
type FeishuUserBindingConflictIssue struct {
	Id                     string                            `json:"id"`
	Type                   string                            `json:"type"`
	RiskLevel              string                            `json:"riskLevel"`
	SafeSummary            string                            `json:"safeSummary"`
	RecommendedAction      string                            `json:"recommendedAction"`
	BlockedReason          string                            `json:"blockedReason,omitempty"`
	SourceConnectionIdHash string                            `json:"sourceConnectionIdHash"`
	StableHashes           map[string]string                 `json:"stableHashes"`
	SampleAliases          []string                          `json:"sampleAliases"`
	LatestRun              *FeishuUserBindingConflictLinkage `json:"latestRun,omitempty"`
	LatestDryRunHistory    *FeishuUserBindingConflictLinkage `json:"latestDryRunHistory,omitempty"`
}

// FeishuUserBindingConflictLinkage 只暴露 run/history id 和状态，用于 operator 关联最近一次诊断上下文。
type FeishuUserBindingConflictLinkage struct {
	Id        string `json:"id"`
	Status    string `json:"status,omitempty"`
	CreatedAt string `json:"createdAt,omitempty"`
}

// FeishuUserBindingConflictRedaction 让调用方确认响应已经按当前版本脱敏。
type FeishuUserBindingConflictRedaction struct {
	Applied bool   `json:"applied"`
	Version string `json:"version"`
}

type FeishuUserBindingConflictDiagnosticsFilter struct {
	Organization string
	Limit        int
	IncludeOk    bool
}

type FeishuOrganizationSyncUserBindingConflictService struct {
	Now func() time.Time
}

type feishuBindingUserIdentity struct {
	User         *User
	Lark         string
	UserID       string
	OpenID       string
	UnionID      string
	TenantKey    string
	EndpointMode string
}

type feishuBindingIdentityRecord struct {
	TenantKey string
	UserID    string
	OpenID    string
	UnionID   string
	Lark      string
}

type feishuBindingIdentityCluster struct {
	Identifiers map[string]bool
	Samples     map[string]bool
}

// GetDiagnostics 扫描 Admin 本地绑定状态并返回脱敏风险摘要，不调用任何写入路径。
func (s *FeishuOrganizationSyncUserBindingConflictService) GetDiagnostics(filter FeishuUserBindingConflictDiagnosticsFilter) (*FeishuUserBindingConflictDiagnostics, error) {
	organization := strings.TrimSpace(filter.Organization)
	if organization == "" {
		return nil, fmt.Errorf("feishu user binding diagnostics organization is required")
	}
	limit := normalizeFeishuUserBindingConflictLimit(filter.Limit)
	now := s.now().UTC()
	config, err := GetFeishuOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		return nil, err
	}
	diagnostics := &FeishuUserBindingConflictDiagnostics{
		Organization: organization,
		Status:       FeishuUserBindingDiagnosticsStatusDisabled,
		RiskLevel:    FeishuUserBindingRiskNone,
		Counts:       FeishuUserBindingConflictCounts{},
		Issues:       []*FeishuUserBindingConflictIssue{},
		Redaction: FeishuUserBindingConflictRedaction{
			Applied: true,
			Version: FeishuUserBindingConflictRedactionV1,
		},
		GeneratedAt: now.Format(time.RFC3339Nano),
		SafeSummary: "飞书组织同步未配置或未启用，绑定诊断未执行。",
	}
	if config == nil {
		return diagnostics, nil
	}
	sourceTenantId := firstNonEmpty(config.TenantKey, config.AppId)
	diagnostics.Configured = true
	diagnostics.Enabled = config.IsEnabled
	diagnostics.EndpointMode = normalizeFeishuEndpointMode(config.EndpointMode)
	diagnostics.AppAlias = "app-" + shortFeishuOrganizationSyncHash(organization, config.AppId)
	diagnostics.TenantAlias = "tenant-" + shortFeishuOrganizationSyncHash(organization, sourceTenantId)
	diagnostics.SourceConnectionIdHash = buildFeishuDryRunSourceConnectionHash(organization, diagnostics.TenantAlias, diagnostics.AppAlias)
	diagnostics.LatestRun, _ = getLatestFeishuUserBindingRunLinkage(organization)
	diagnostics.LatestDryRunHistory, _ = getLatestFeishuUserBindingHistoryLinkage(organization)
	if !config.IsEnabled {
		return diagnostics, nil
	}

	mappings, err := getFeishuUserMappingsByOrganization(organization)
	if err != nil {
		return nil, err
	}
	users, err := getFeishuBindingUsersByOrganization(organization)
	if err != nil {
		return nil, err
	}
	identities := buildFeishuBindingUserIdentities(users)
	issues := buildFeishuUserBindingConflictIssues(config, diagnostics, mappings, identities)
	sortFeishuUserBindingConflictIssues(issues)
	diagnostics.Counts = countFeishuUserBindingConflicts(issues)
	diagnostics.RiskLevel = highestFeishuUserBindingRisk(issues)
	diagnostics.Status = feishuUserBindingDiagnosticsStatus(diagnostics.RiskLevel, len(mappings), len(users), len(issues))
	diagnostics.SafeSummary = feishuUserBindingSafeSummary(diagnostics.Status, diagnostics.RiskLevel, diagnostics.Counts)
	if !filter.IncludeOk && limit >= 0 && len(issues) > limit {
		issues = issues[:limit]
	}
	diagnostics.Issues = issues
	return diagnostics, nil
}

func (s *FeishuOrganizationSyncUserBindingConflictService) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func buildFeishuUserBindingConflictIssues(config *FeishuOrganizationSyncConfig, base *FeishuUserBindingConflictDiagnostics, mappings []*FeishuUserMapping, identities []*feishuBindingUserIdentity) []*FeishuUserBindingConflictIssue {
	issues := []*FeishuUserBindingConflictIssue{}
	issues = append(issues, findDuplicateFeishuUserIDBindingIssues(config, base, mappings, identities)...)
	issues = append(issues, findLocalUserMultiTenantIssues(base, mappings, identities)...)
	issues = append(issues, findLegacyIdentifierSplitIssues(config, base, mappings, identities)...)
	issues = append(issues, findMissingTenantKeyIssues(config, base, mappings, identities)...)
	issues = append(issues, findEndpointModeMismatchIssues(config, base, identities)...)
	return issues
}

func findDuplicateFeishuUserIDBindingIssues(config *FeishuOrganizationSyncConfig, base *FeishuUserBindingConflictDiagnostics, mappings []*FeishuUserMapping, identities []*feishuBindingUserIdentity) []*FeishuUserBindingConflictIssue {
	grouped := map[string]map[string]bool{}
	for _, mapping := range mappings {
		if strings.TrimSpace(mapping.FeishuUserId) == "" {
			continue
		}
		key := feishuUserBindingExternalKey(firstNonEmpty(mapping.TenantKey, config.TenantKey, config.AppId), mapping.FeishuUserId)
		if grouped[key] == nil {
			grouped[key] = map[string]bool{}
		}
		grouped[key][feishuLocalUserKey(mapping.UserOwner, mapping.UserName)] = true
	}
	for _, identity := range identities {
		if strings.TrimSpace(identity.Lark) == "" {
			continue
		}
		key := feishuUserBindingExternalKey(firstNonEmpty(identity.TenantKey, config.TenantKey, config.AppId), identity.Lark)
		if grouped[key] == nil {
			grouped[key] = map[string]bool{}
		}
		grouped[key][feishuLocalUserKey(identity.User.Owner, identity.User.Name)] = true
	}
	issues := []*FeishuUserBindingConflictIssue{}
	for key, localUsers := range grouped {
		if len(localUsers) <= 1 {
			continue
		}
		issues = append(issues, newFeishuUserBindingConflictIssue(base, FeishuUserBindingConflictDuplicateUserIDBinding, FeishuUserBindingRiskCritical, key, localUsers, "同一飞书 user_id 命中多个本地用户，正式同步前需要确认主账号。", FeishuUserBindingActionConfirmPrimaryUser, "duplicate_user_id_binding_blocks_safe_sync"))
	}
	return issues
}

func findLocalUserMultiTenantIssues(base *FeishuUserBindingConflictDiagnostics, mappings []*FeishuUserMapping, identities []*feishuBindingUserIdentity) []*FeishuUserBindingConflictIssue {
	grouped := map[string][]feishuBindingIdentityRecord{}
	for _, mapping := range mappings {
		localKey := feishuLocalUserKey(mapping.UserOwner, mapping.UserName)
		if localKey == "" {
			continue
		}
		grouped[localKey] = append(grouped[localKey], feishuBindingIdentityRecord{
			TenantKey: mapping.TenantKey,
			UserID:    mapping.FeishuUserId,
			OpenID:    mapping.OpenId,
			UnionID:   mapping.UnionId,
		})
	}
	for _, identity := range identities {
		localKey := feishuLocalUserKey(identity.User.Owner, identity.User.Name)
		if localKey == "" {
			continue
		}
		grouped[localKey] = append(grouped[localKey], feishuBindingIdentityRecord{
			TenantKey: identity.TenantKey,
			UserID:    identity.UserID,
			OpenID:    identity.OpenID,
			UnionID:   identity.UnionID,
			Lark:      identity.Lark,
		})
	}
	issues := []*FeishuUserBindingConflictIssue{}
	for localKey, records := range grouped {
		// 同一飞书身份可能同时来自通讯录同步映射和扫码登录属性；tenant alias 不同不等于多租户复用。
		clusters := clusterFeishuBindingIdentityRecords(records)
		if len(clusters) <= 1 {
			continue
		}
		normalized := map[string]bool{}
		for _, cluster := range clusters {
			for sample := range cluster.Samples {
				normalized[sample] = true
			}
		}
		issues = append(issues, newFeishuUserBindingConflictIssue(base, FeishuUserBindingConflictLocalUserMultiTenant, FeishuUserBindingRiskHigh, localKey, normalized, "同一本地用户关联多个飞书 tenant/user identity，需确认是否跨租户复用。", FeishuUserBindingActionInspectMapping, "local_user_multi_tenant_requires_review"))
	}
	return issues
}

func clusterFeishuBindingIdentityRecords(records []feishuBindingIdentityRecord) []feishuBindingIdentityCluster {
	clusters := []feishuBindingIdentityCluster{}
	for _, record := range records {
		identifiers := feishuBindingIdentityIdentifiers(record)
		sample := feishuBindingIdentitySampleKey(record)
		matches := []int{}
		for index, cluster := range clusters {
			if feishuBindingIdentityClusterMatches(cluster, identifiers) {
				matches = append(matches, index)
			}
		}
		if len(matches) == 0 {
			clusters = append(clusters, feishuBindingIdentityCluster{
				Identifiers: identifiers,
				Samples:     map[string]bool{},
			})
			if strings.TrimSpace(sample) != "" {
				clusters[len(clusters)-1].Samples[sample] = true
			}
			continue
		}
		target := matches[0]
		mergeFeishuBindingIdentityCluster(&clusters[target], identifiers, sample)
		for i := len(matches) - 1; i > 0; i-- {
			index := matches[i]
			mergeFeishuBindingIdentityCluster(&clusters[target], clusters[index].Identifiers, "")
			for clusterSample := range clusters[index].Samples {
				clusters[target].Samples[clusterSample] = true
			}
			clusters = append(clusters[:index], clusters[index+1:]...)
		}
	}
	normalized := make([]feishuBindingIdentityCluster, 0, len(clusters))
	for _, cluster := range clusters {
		if len(cluster.Identifiers) == 0 && len(cluster.Samples) == 0 {
			continue
		}
		normalized = append(normalized, cluster)
	}
	return normalized
}

func feishuBindingIdentityIdentifiers(record feishuBindingIdentityRecord) map[string]bool {
	identifiers := map[string]bool{}
	for prefix, identifier := range map[string]string{
		"user_id":  record.UserID,
		"open_id":  record.OpenID,
		"union_id": record.UnionID,
		"lark":     record.Lark,
	} {
		identifier = strings.TrimSpace(identifier)
		if identifier != "" {
			identifiers[prefix+":"+identifier] = true
		}
	}
	return identifiers
}

func feishuBindingIdentitySampleKey(record feishuBindingIdentityRecord) string {
	return feishuUserBindingExternalKey(record.TenantKey, firstNonEmpty(record.UserID, record.Lark, record.OpenID, record.UnionID))
}

func feishuBindingIdentityClusterMatches(cluster feishuBindingIdentityCluster, identifiers map[string]bool) bool {
	for identifier := range identifiers {
		if cluster.Identifiers[identifier] {
			return true
		}
	}
	return false
}

func mergeFeishuBindingIdentityCluster(cluster *feishuBindingIdentityCluster, identifiers map[string]bool, sample string) {
	if cluster.Identifiers == nil {
		cluster.Identifiers = map[string]bool{}
	}
	if cluster.Samples == nil {
		cluster.Samples = map[string]bool{}
	}
	for identifier := range identifiers {
		cluster.Identifiers[identifier] = true
	}
	if strings.TrimSpace(sample) != "" {
		cluster.Samples[sample] = true
	}
}

func findLegacyIdentifierSplitIssues(config *FeishuOrganizationSyncConfig, base *FeishuUserBindingConflictDiagnostics, mappings []*FeishuUserMapping, identities []*feishuBindingUserIdentity) []*FeishuUserBindingConflictIssue {
	byLark := map[string]map[string]bool{}
	for _, identity := range identities {
		localKey := feishuLocalUserKey(identity.User.Owner, identity.User.Name)
		for _, identifier := range []string{identity.Lark, identity.UserID, identity.OpenID, identity.UnionID} {
			identifier = strings.TrimSpace(identifier)
			if identifier == "" {
				continue
			}
			if byLark[identifier] == nil {
				byLark[identifier] = map[string]bool{}
			}
			byLark[identifier][localKey] = true
		}
	}
	issues := []*FeishuUserBindingConflictIssue{}
	for _, mapping := range mappings {
		candidates := []string{mapping.FeishuUserId, mapping.OpenId, mapping.UnionId}
		matchedUsers := map[string]bool{}
		for _, candidate := range candidates {
			for localUser := range byLark[strings.TrimSpace(candidate)] {
				matchedUsers[localUser] = true
			}
		}
		mappingLocal := feishuLocalUserKey(mapping.UserOwner, mapping.UserName)
		if mappingLocal != "" {
			matchedUsers[mappingLocal] = true
		}
		if len(matchedUsers) <= 1 {
			continue
		}
		key := feishuUserBindingExternalKey(firstNonEmpty(mapping.TenantKey, config.TenantKey, config.AppId), mapping.FeishuUserId)
		issues = append(issues, newFeishuUserBindingConflictIssue(base, FeishuUserBindingConflictLegacyIdentifierSplit, FeishuUserBindingRiskHigh, key, matchedUsers, "历史 open_id/union_id 兼容匹配命中不同本地用户，可能导致重复用户。", FeishuUserBindingActionConfirmPrimaryUser, "legacy_identifier_split_requires_review"))
	}
	return issues
}

func findMissingTenantKeyIssues(config *FeishuOrganizationSyncConfig, base *FeishuUserBindingConflictDiagnostics, mappings []*FeishuUserMapping, identities []*feishuBindingUserIdentity) []*FeishuUserBindingConflictIssue {
	seen := map[string]bool{}
	issues := []*FeishuUserBindingConflictIssue{}
	for _, mapping := range mappings {
		if strings.TrimSpace(mapping.TenantKey) != "" {
			continue
		}
		key := "mapping:" + feishuLocalUserKey(mapping.UserOwner, mapping.UserName) + ":" + strings.TrimSpace(mapping.FeishuUserId)
		if seen[key] {
			continue
		}
		seen[key] = true
		issues = append(issues, newFeishuUserBindingConflictIssue(base, FeishuUserBindingConflictMissingTenantKey, FeishuUserBindingRiskMedium, key, map[string]bool{feishuUserBindingExternalKey(config.AppId, mapping.FeishuUserId): true}, "飞书用户映射缺少 tenant_key，跨租户判断只能回退到 App ID。", FeishuUserBindingActionBackfillTenantKey, "missing_tenant_key_reduces_binding_confidence"))
	}
	for _, identity := range identities {
		if strings.TrimSpace(identity.UserID) == "" || strings.TrimSpace(identity.TenantKey) != "" {
			continue
		}
		key := "user:" + feishuLocalUserKey(identity.User.Owner, identity.User.Name)
		if seen[key] {
			continue
		}
		seen[key] = true
		issues = append(issues, newFeishuUserBindingConflictIssue(base, FeishuUserBindingConflictMissingTenantKey, FeishuUserBindingRiskMedium, key, map[string]bool{feishuLocalUserKey(identity.User.Owner, identity.User.Name): true}, "本地 Lark OAuth 标识缺少 tenant_key，扫码登录与同步来源无法强校验租户。", FeishuUserBindingActionBackfillTenantKey, "missing_tenant_key_reduces_binding_confidence"))
	}
	return issues
}

func findEndpointModeMismatchIssues(config *FeishuOrganizationSyncConfig, base *FeishuUserBindingConflictDiagnostics, identities []*feishuBindingUserIdentity) []*FeishuUserBindingConflictIssue {
	expected := normalizeFeishuEndpointMode(config.EndpointMode)
	issues := []*FeishuUserBindingConflictIssue{}
	for _, identity := range identities {
		actual := normalizeFeishuEndpointMode(identity.EndpointMode)
		if actual == "" || actual == expected {
			continue
		}
		localKey := feishuLocalUserKey(identity.User.Owner, identity.User.Name)
		issues = append(issues, newFeishuUserBindingConflictIssue(base, FeishuUserBindingConflictEndpointModeMismatch, FeishuUserBindingRiskMedium, localKey+":"+actual+":"+expected, map[string]bool{localKey: true}, "本地 OAuth endpoint mode 与当前同步配置不一致，可能混用国内飞书和海外 Lark 身份。", FeishuUserBindingActionAlignEndpointMode, "endpoint_mode_mismatch_requires_review"))
	}
	return issues
}

func newFeishuUserBindingConflictIssue(base *FeishuUserBindingConflictDiagnostics, issueType string, riskLevel string, stableKey string, samples map[string]bool, summary string, action string, blockedReason string) *FeishuUserBindingConflictIssue {
	aliases := feishuUserBindingSampleAliases(samples, 3)
	return &FeishuUserBindingConflictIssue{
		Id:                     "binding-" + shortFeishuOrganizationSyncHash(base.Organization, issueType, stableKey),
		Type:                   issueType,
		RiskLevel:              riskLevel,
		SafeSummary:            summary,
		RecommendedAction:      action,
		BlockedReason:          blockedReason,
		SourceConnectionIdHash: base.SourceConnectionIdHash,
		StableHashes: map[string]string{
			"issue": "issue-" + shortFeishuOrganizationSyncHash(base.Organization, issueType, stableKey),
		},
		SampleAliases:       aliases,
		LatestRun:           base.LatestRun,
		LatestDryRunHistory: base.LatestDryRunHistory,
	}
}

func buildFeishuBindingUserIdentities(users []*User) []*feishuBindingUserIdentity {
	identities := make([]*feishuBindingUserIdentity, 0, len(users))
	for _, user := range users {
		if user == nil {
			continue
		}
		identity := &feishuBindingUserIdentity{
			User:         user,
			Lark:         strings.TrimSpace(user.Lark),
			UserID:       strings.TrimSpace(getUserProperty(user, FeishuUserPropertyUserId)),
			OpenID:       strings.TrimSpace(getUserProperty(user, FeishuUserPropertyOpenId)),
			UnionID:      strings.TrimSpace(getUserProperty(user, FeishuUserPropertyUnionId)),
			TenantKey:    strings.TrimSpace(getUserProperty(user, FeishuUserPropertyTenantKey)),
			EndpointMode: strings.TrimSpace(getUserProperty(user, FeishuUserPropertyEndpointMode)),
		}
		if identity.Lark == "" && identity.UserID == "" && identity.OpenID == "" && identity.UnionID == "" && identity.TenantKey == "" && identity.EndpointMode == "" {
			continue
		}
		identities = append(identities, identity)
	}
	return identities
}

func countFeishuUserBindingConflicts(issues []*FeishuUserBindingConflictIssue) FeishuUserBindingConflictCounts {
	counts := FeishuUserBindingConflictCounts{Total: len(issues)}
	for _, issue := range issues {
		switch issue.Type {
		case FeishuUserBindingConflictDuplicateUserIDBinding:
			counts.DuplicateUserIDBinding++
		case FeishuUserBindingConflictLocalUserMultiTenant:
			counts.LocalUserMultiTenant++
		case FeishuUserBindingConflictLegacyIdentifierSplit:
			counts.LegacyIdentifierSplit++
		case FeishuUserBindingConflictMissingTenantKey:
			counts.MissingTenantKey++
		case FeishuUserBindingConflictEndpointModeMismatch:
			counts.EndpointModeMismatch++
		}
	}
	return counts
}

func highestFeishuUserBindingRisk(issues []*FeishuUserBindingConflictIssue) string {
	risk := FeishuUserBindingRiskNone
	for _, issue := range issues {
		if feishuUserBindingRiskRank(issue.RiskLevel) > feishuUserBindingRiskRank(risk) {
			risk = issue.RiskLevel
		}
	}
	return risk
}

func feishuUserBindingRiskRank(risk string) int {
	switch risk {
	case FeishuUserBindingRiskCritical:
		return 5
	case FeishuUserBindingRiskHigh:
		return 4
	case FeishuUserBindingRiskMedium:
		return 3
	case FeishuUserBindingRiskLow:
		return 2
	case FeishuUserBindingRiskNone:
		return 1
	default:
		return 0
	}
}

func feishuUserBindingDiagnosticsStatus(riskLevel string, mappingCount int, userCount int, issueCount int) string {
	if issueCount == 0 {
		if mappingCount == 0 && userCount == 0 {
			return FeishuUserBindingDiagnosticsStatusEmpty
		}
		return FeishuUserBindingDiagnosticsStatusOK
	}
	if riskLevel == FeishuUserBindingRiskCritical || riskLevel == FeishuUserBindingRiskHigh {
		return FeishuUserBindingDiagnosticsStatusBlocked
	}
	return FeishuUserBindingDiagnosticsStatusWarning
}

func feishuUserBindingSafeSummary(status string, riskLevel string, counts FeishuUserBindingConflictCounts) string {
	switch status {
	case FeishuUserBindingDiagnosticsStatusEmpty:
		return "未发现可诊断的飞书用户绑定记录。"
	case FeishuUserBindingDiagnosticsStatusOK:
		return "未发现阻断级飞书用户绑定风险。"
	case FeishuUserBindingDiagnosticsStatusBlocked:
		return fmt.Sprintf("发现 %d 个飞书用户绑定风险，最高风险级别为 %s，建议先处理后再正式同步。", counts.Total, riskLevel)
	case FeishuUserBindingDiagnosticsStatusWarning:
		return fmt.Sprintf("发现 %d 个飞书用户绑定风险，最高风险级别为 %s。", counts.Total, riskLevel)
	default:
		return "飞书用户绑定诊断状态未知。"
	}
}

func sortFeishuUserBindingConflictIssues(issues []*FeishuUserBindingConflictIssue) {
	sort.SliceStable(issues, func(i, j int) bool {
		if feishuUserBindingRiskRank(issues[i].RiskLevel) != feishuUserBindingRiskRank(issues[j].RiskLevel) {
			return feishuUserBindingRiskRank(issues[i].RiskLevel) > feishuUserBindingRiskRank(issues[j].RiskLevel)
		}
		if issues[i].Type != issues[j].Type {
			return issues[i].Type < issues[j].Type
		}
		return issues[i].Id < issues[j].Id
	})
}

func feishuUserBindingSampleAliases(samples map[string]bool, limit int) []string {
	keys := make([]string, 0, len(samples))
	for key := range samples {
		if strings.TrimSpace(key) != "" {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	if limit > 0 && len(keys) > limit {
		keys = keys[:limit]
	}
	aliases := make([]string, 0, len(keys))
	for _, key := range keys {
		aliases = append(aliases, "sample-"+shortFeishuOrganizationSyncHash(key))
	}
	return aliases
}

func feishuUserBindingExternalKey(tenantKey string, userId string) string {
	tenantKey = strings.TrimSpace(tenantKey)
	userId = strings.TrimSpace(userId)
	if tenantKey == "" && userId == "" {
		return ""
	}
	return tenantKey + "\x1f" + userId
}

func feishuLocalUserKey(owner string, name string) string {
	owner = strings.TrimSpace(owner)
	name = strings.TrimSpace(name)
	if owner == "" || name == "" {
		return ""
	}
	return owner + "/" + name
}

func removeEmptyBoolKeys(values map[string]bool) map[string]bool {
	res := map[string]bool{}
	for key, value := range values {
		if strings.TrimSpace(key) != "" && value {
			res[key] = true
		}
	}
	return res
}

func normalizeFeishuUserBindingConflictLimit(limit int) int {
	if limit == 0 {
		return defaultFeishuUserBindingConflictIssueLimit
	}
	if limit < 0 {
		return -1
	}
	if limit > maxFeishuUserBindingConflictIssueLimit {
		return maxFeishuUserBindingConflictIssueLimit
	}
	return limit
}

func getFeishuUserMappingsByOrganization(organization string) ([]*FeishuUserMapping, error) {
	mappings := []*FeishuUserMapping{}
	err := ormer.Engine.Where("organization = ?", organization).Find(&mappings)
	return mappings, err
}

func getFeishuBindingUsersByOrganization(organization string) ([]*User, error) {
	users := []*User{}
	err := ormer.Engine.Where("owner = ?", organization).Find(&users)
	return users, err
}

func getLatestFeishuUserBindingRunLinkage(organization string) (*FeishuUserBindingConflictLinkage, error) {
	run := &FeishuOrganizationSyncRun{}
	existed, err := ormer.Engine.Where("organization = ?", organization).Desc("created_at").Get(run)
	if err != nil || !existed {
		return nil, err
	}
	return &FeishuUserBindingConflictLinkage{
		Id:        run.Name,
		Status:    string(run.Status),
		CreatedAt: run.CreatedAt.UTC().Format(time.RFC3339Nano),
	}, nil
}

func getLatestFeishuUserBindingHistoryLinkage(organization string) (*FeishuUserBindingConflictLinkage, error) {
	history := &FeishuOrganizationSyncDryRunHistory{}
	existed, err := ormer.Engine.Where("organization = ?", organization).Desc("created_at").Get(history)
	if err != nil || !existed {
		return nil, err
	}
	return &FeishuUserBindingConflictLinkage{
		Id:        history.Name,
		Status:    history.Status,
		CreatedAt: history.CreatedAt.UTC().Format(time.RFC3339Nano),
	}, nil
}
