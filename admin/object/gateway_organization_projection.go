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
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	GatewayProjectionDefaultCaller       = "aicodex-admin"
	GatewayProjectionDefaultSource       = "aicodex-admin"
	GatewayProjectionDefaultFreshnessTTL = time.Hour

	GatewayProjectionSkipMappingMissing    = "mapping_missing"
	GatewayProjectionSkipMappingUntrusted  = "mapping_untrusted"
	GatewayProjectionSkipLifecycleInvalid  = "lifecycle_invalid"
	GatewayProjectionSkipSourceDataInvalid = "source_data_invalid"
)

var gatewayProjectionIDUnsafeChars = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

// GatewayProjectionBuildInput 是从 admin 平台组织主模型构建 gateway 投影的最小快照。
// 这里不接收 Insight scope 输出，避免把报表查询范围误用为 gateway runtime authorization fact。
type GatewayProjectionBuildInput struct {
	TraceID        string
	Caller         string
	OrganizationID string
	GeneratedAt    time.Time
	FreshnessTTL   time.Duration

	SourceConnections  []SourceConnection
	AdminUsers         []User
	Users              []PlatformUser
	Departments        []PlatformDepartment
	Memberships        []PlatformMembership
	ExternalIdentities []ExternalIdentity
	SyncBatch          *OrgSyncBatch
}

// GatewayProjectionBuildResult 同时返回可推送请求和构建摘要，便于调用方审计被跳过主体。
type GatewayProjectionBuildResult struct {
	Request GatewayProjectionBatchRequest
	Summary GatewayProjectionBuildSummary
}

// GatewayProjectionBuildSummary 记录 projection 构建的发布数量和 fail-closed 跳过原因。
type GatewayProjectionBuildSummary struct {
	PublishedSubjectCount int            `json:"publishedSubjectCount"`
	SkippedSubjectCount   int            `json:"skippedSubjectCount"`
	SkippedByReason       map[string]int `json:"skippedByReason"`
}

// GatewayProjectionBatchRequest 对齐 api ingestion 的扁平请求体，不能把 batch 嵌套到子对象中。
type GatewayProjectionBatchRequest struct {
	Caller  string `json:"caller"`
	TraceID string `json:"traceId,omitempty"`
	GatewayProjectionBatch
}

// GatewayProjectionBatch 对齐 api `ProjectionBatch` JSON contract；字段名不得按 admin 本地习惯重命名。
// OrgVersion 使用 gateway ingestion 要求的 int64 版本；admin 原始 `orgv-*` 字符串只保留在 lineage.sourceVersion。
type GatewayProjectionBatch struct {
	ProjectionBatchID string                     `json:"projectionBatchId"`
	OrgVersion        int64                      `json:"orgVersion"`
	GeneratedAt       time.Time                  `json:"generatedAt"`
	Freshness         GatewayProjectionFreshness `json:"freshness"`
	Lineage           GatewayProjectionLineage   `json:"lineage"`
	Subjects          []GatewayProjectedSubject  `json:"subjects"`
}

// GatewayProjectionFreshness 表示 gateway runtime 可信任该批次的截止时间。
type GatewayProjectionFreshness struct {
	ExpiresAt time.Time `json:"expiresAt"`
}

// GatewayProjectionLineage 保留 admin source snapshot 与 projection digest，供 api 排查和幂等诊断。
type GatewayProjectionLineage struct {
	SourceService string `json:"sourceService"`
	SourceVersion string `json:"sourceVersion"`
	Digest        string `json:"digest"`
}

// GatewayProjectedSubject 是 gateway runtime authorization 的主体快照。
// 非 active lifecycle 也可发布，用于让 gateway fail closed 地拒绝或失效主体。
type GatewayProjectedSubject struct {
	StableSubjectID    string    `json:"stableSubjectId"`
	APISubjectID       string    `json:"apiSubjectId"`
	SubjectType        string    `json:"subjectType"`
	OrganizationID     string    `json:"organizationId"`
	DepartmentIDs      []string  `json:"departmentIds"`
	RoleIDs            []string  `json:"roleIds"`
	PositionIDs        []string  `json:"positionIds"`
	LifecycleStatus    string    `json:"lifecycleStatus"`
	ProjectionVersion  string    `json:"projectionVersion"`
	OrgVersion         int64     `json:"orgVersion"`
	FreshnessExpiresAt time.Time `json:"freshnessExpiresAt"`
}

type gatewayProjectionSubjectMapping struct {
	apiSubjectID string
	roleIDs      []string
	positionIDs  []string
}

// BuildGatewayProjectionBatch 将 admin 组织主模型转换为 gateway ingestion 可直接接收的批次。
// 缺失或不可信映射一律 fail closed 进入 skipped summary，不用昵称、手机号、邮箱或 Insight scope 猜测主体。
func BuildGatewayProjectionBatch(input GatewayProjectionBuildInput) (GatewayProjectionBuildResult, error) {
	organizationID := normalizeGatewayProjectionString(input.OrganizationID)
	if organizationID == "" && input.SyncBatch != nil {
		organizationID = normalizeGatewayProjectionString(input.SyncBatch.OrganizationId)
	}
	if organizationID == "" {
		return GatewayProjectionBuildResult{}, errors.New("gateway projection organization is required")
	}

	generatedAt := input.GeneratedAt.UTC()
	if generatedAt.IsZero() {
		generatedAt = time.Now().UTC()
	}
	ttl := input.FreshnessTTL
	if ttl <= 0 {
		ttl = GatewayProjectionDefaultFreshnessTTL
	}
	freshnessExpiresAt := generatedAt.Add(ttl).UTC()
	orgVersion := gatewayProjectionOrgVersion(input.SyncBatch, generatedAt)
	sourceVersion := gatewayProjectionSourceVersion(input, organizationID)
	if sourceVersion == "" {
		return GatewayProjectionBuildResult{}, errors.New("gateway projection source version is required")
	}

	summary := GatewayProjectionBuildSummary{SkippedByReason: map[string]int{}}
	activeDepartments, hasDepartmentSnapshot := buildGatewayProjectionActiveDepartments(input.Departments, organizationID)
	membershipsBySubject := buildGatewayProjectionMemberships(input.Memberships, organizationID, activeDepartments, hasDepartmentSnapshot)
	users := filterGatewayProjectionUsers(input.Users, organizationID)
	confirmedMappings, tombstoneMappings, untrustedMappings := buildGatewayProjectionSubjectMappings(input.ExternalIdentities, organizationID)
	mergeGatewayProjectionAdminUserMappings(confirmedMappings, untrustedMappings, input.AdminUsers, users, organizationID)

	subjects := make([]GatewayProjectedSubject, 0, len(users))
	for _, user := range users {
		stableSubjectID := gatewayProjectionStableSubjectID(user, organizationID)
		if stableSubjectID == "" {
			summary.addSkip(GatewayProjectionSkipSourceDataInvalid)
			continue
		}
		lifecycleStatus, ok := gatewayProjectionLifecycleStatus(user.LifecycleStatus)
		if !ok {
			summary.addSkip(GatewayProjectionSkipLifecycleInvalid)
			continue
		}
		if !gatewayProjectionMappingTrustedForLifecycle(user.MappingStatus, lifecycleStatus) {
			summary.addSkip(GatewayProjectionSkipMappingUntrusted)
			continue
		}
		mapping, ok := gatewayProjectionSubjectMappingForLifecycle(stableSubjectID, lifecycleStatus, confirmedMappings, tombstoneMappings)
		if !ok || mapping.apiSubjectID == "" {
			if untrustedMappings[stableSubjectID] {
				summary.addSkip(GatewayProjectionSkipMappingUntrusted)
			} else {
				summary.addSkip(GatewayProjectionSkipMappingMissing)
			}
			continue
		}

		subject := GatewayProjectedSubject{
			StableSubjectID:    stableSubjectID,
			APISubjectID:       mapping.apiSubjectID,
			SubjectType:        "user",
			OrganizationID:     organizationID,
			DepartmentIDs:      membershipsBySubject[stableSubjectID],
			RoleIDs:            mapping.roleIDs,
			PositionIDs:        mapping.positionIDs,
			LifecycleStatus:    lifecycleStatus,
			OrgVersion:         orgVersion,
			FreshnessExpiresAt: freshnessExpiresAt,
		}
		subject.ProjectionVersion = buildGatewayProjectionSubjectVersion(subject)
		subjects = append(subjects, subject)
	}
	sort.Slice(subjects, func(i, j int) bool {
		return subjects[i].StableSubjectID < subjects[j].StableSubjectID
	})
	summary.PublishedSubjectCount = len(subjects)

	digest := buildGatewayProjectionDigest(orgVersion, sourceVersion, freshnessExpiresAt, subjects)
	batch := GatewayProjectionBatch{
		ProjectionBatchID: buildGatewayProjectionBatchID(organizationID, input.SyncBatch, orgVersion, digest),
		OrgVersion:        orgVersion,
		GeneratedAt:       generatedAt,
		Freshness: GatewayProjectionFreshness{
			ExpiresAt: freshnessExpiresAt,
		},
		Lineage: GatewayProjectionLineage{
			SourceService: GatewayProjectionDefaultSource,
			SourceVersion: sourceVersion,
			Digest:        digest,
		},
		Subjects: subjects,
	}
	return GatewayProjectionBuildResult{
		Request: GatewayProjectionBatchRequest{
			Caller:                 firstNonEmpty(input.Caller, GatewayProjectionDefaultCaller),
			TraceID:                normalizeGatewayProjectionString(input.TraceID),
			GatewayProjectionBatch: batch,
		},
		Summary: summary,
	}, nil
}

func (s *GatewayProjectionBuildSummary) addSkip(reason string) {
	if s.SkippedByReason == nil {
		s.SkippedByReason = map[string]int{}
	}
	s.SkippedSubjectCount++
	s.SkippedByReason[reason]++
}

// gatewayProjectionOrgVersion 生成 gateway 专用 int64 版本。
// WeCom 同步成功批次优先使用完成时间，手工或测试快照才回退到生成时间，避免把 admin 的 `orgv-*` 字符串塞进 api DTO。
func gatewayProjectionOrgVersion(batch *OrgSyncBatch, generatedAt time.Time) int64 {
	if batch != nil && !batch.FinishedAt.IsZero() {
		return batch.FinishedAt.UTC().UnixMilli()
	}
	return generatedAt.UTC().UnixMilli()
}

// gatewayProjectionSourceVersion 保留 admin 主模型的原始 source snapshot 版本。
// 该值用于 lineage 排查和幂等诊断，不参与 gateway 的数值 orgVersion 排序。
func gatewayProjectionSourceVersion(input GatewayProjectionBuildInput, organizationID string) string {
	if input.SyncBatch != nil && normalizeGatewayProjectionString(input.SyncBatch.OrgVersion) != "" {
		return normalizeGatewayProjectionString(input.SyncBatch.OrgVersion)
	}
	values := []string{}
	for _, user := range input.Users {
		if user.OrganizationId == organizationID {
			values = append(values, normalizeGatewayProjectionString(user.OrgVersion))
		}
	}
	for _, department := range input.Departments {
		if department.OrganizationId == organizationID {
			values = append(values, normalizeGatewayProjectionString(department.OrgVersion))
		}
	}
	for _, membership := range input.Memberships {
		if membership.OrganizationId == organizationID {
			values = append(values, normalizeGatewayProjectionString(membership.OrgVersion))
		}
	}
	sort.Strings(values)
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

// buildGatewayProjectionSubjectMappings 分开记录 active 和 tombstone 可用的 apiSubjectId 映射。
// active 只接受 CONFIRMED；DISABLED 只能作为非 active lifecycle 的 tombstone 映射来源。
func buildGatewayProjectionSubjectMappings(identities []ExternalIdentity, organizationID string) (map[string]gatewayProjectionSubjectMapping, map[string]gatewayProjectionSubjectMapping, map[string]bool) {
	confirmed := map[string]gatewayProjectionSubjectMapping{}
	tombstone := map[string]gatewayProjectionSubjectMapping{}
	untrusted := map[string]bool{}
	for _, identity := range identities {
		if identity.OrganizationId != organizationID || identity.PlatformSubjectType != PlatformSubjectTypeUser {
			continue
		}
		stableSubjectID := normalizeGatewayProjectionString(identity.PlatformSubject)
		if stableSubjectID == "" {
			continue
		}
		if !gatewayProjectionIdentityMappingUsableForTombstone(identity.MappingStatus) {
			untrusted[stableSubjectID] = true
			continue
		}
		mapping, ok := parseGatewayProjectionIdentityLineage(identity.Lineage)
		if !ok || mapping.apiSubjectID == "" {
			continue
		}
		if existing, exists := tombstone[stableSubjectID]; exists && existing.apiSubjectID != mapping.apiSubjectID {
			delete(tombstone, stableSubjectID)
			untrusted[stableSubjectID] = true
			continue
		}
		tombstone[stableSubjectID] = mapping
		if IsConfirmedExternalIdentityMappingStatus(identity.MappingStatus) {
			if existing, exists := confirmed[stableSubjectID]; exists && existing.apiSubjectID != mapping.apiSubjectID {
				delete(confirmed, stableSubjectID)
				delete(tombstone, stableSubjectID)
				untrusted[stableSubjectID] = true
				continue
			}
			confirmed[stableSubjectID] = mapping
		}
	}
	return confirmed, tombstone, untrusted
}

// parseGatewayProjectionIdentityLineage 从 lineage JSON 中提取 api 侧主体映射。
// 只有恰好一个 apiSubjectId 时才可信；多个候选值可能代表脏数据或歧义映射，必须跳过。
func parseGatewayProjectionIdentityLineage(lineage string) (gatewayProjectionSubjectMapping, bool) {
	values := map[string]any{}
	if err := json.Unmarshal([]byte(lineage), &values); err != nil {
		return gatewayProjectionSubjectMapping{}, false
	}
	apiSubjectIDs := []string{}
	for _, key := range []string{"apiSubjectId", "api_subject_id", "aicodexApiUserId", "aicodex_api_user_id", "apiUserId", "api_user_id"} {
		apiSubjectIDs = append(apiSubjectIDs, gatewayProjectionStringValues(values[key])...)
	}
	apiSubjectIDs = sortedUniqueGatewayProjectionStrings(apiSubjectIDs)
	if len(apiSubjectIDs) != 1 {
		return gatewayProjectionSubjectMapping{}, false
	}
	return gatewayProjectionSubjectMapping{
		apiSubjectID: apiSubjectIDs[0],
		roleIDs:      sortedUniqueGatewayProjectionStrings(gatewayProjectionStringValues(values["roleIds"])),
		positionIDs:  sortedUniqueGatewayProjectionStrings(gatewayProjectionStringValues(values["positionIds"])),
	}, true
}

// mergeGatewayProjectionAdminUserMappings 兼容 admin 用户属性上的显式 apiSubjectId。
// 这是人工或 resolver 写入的补充锚点；若与 ExternalIdentity 冲突，统一降级为 untrusted。
func mergeGatewayProjectionAdminUserMappings(confirmed map[string]gatewayProjectionSubjectMapping, untrusted map[string]bool, adminUsers []User, platformUsers []PlatformUser, organizationID string) {
	usersByID := map[string]User{}
	for _, user := range adminUsers {
		if user.Owner != organizationID || normalizeGatewayProjectionString(user.Name) == "" {
			continue
		}
		usersByID[user.GetId()] = user
	}
	for _, platformUser := range platformUsers {
		stableSubjectID := gatewayProjectionStableSubjectID(platformUser, organizationID)
		if stableSubjectID == "" {
			continue
		}
		userID := gatewayProjectionPlatformUserID(platformUser, organizationID)
		user, ok := usersByID[userID]
		if !ok {
			continue
		}
		mapping, found, trusted := parseGatewayProjectionAdminUserMapping(user.Properties)
		if !found {
			continue
		}
		if !trusted {
			delete(confirmed, stableSubjectID)
			untrusted[stableSubjectID] = true
			continue
		}
		if existing, exists := confirmed[stableSubjectID]; exists && existing.apiSubjectID != mapping.apiSubjectID {
			delete(confirmed, stableSubjectID)
			untrusted[stableSubjectID] = true
			continue
		}
		if existing, exists := confirmed[stableSubjectID]; exists {
			mapping.roleIDs = existing.roleIDs
			mapping.positionIDs = existing.positionIDs
		}
		confirmed[stableSubjectID] = mapping
	}
}

// parseGatewayProjectionAdminUserMapping 只读取 admin 用户上显式维护的 api subject 字段。
// 这些字段是人工或 resolver 已确认映射；多个值视为不可信，不能降级猜测。
func parseGatewayProjectionAdminUserMapping(properties map[string]string) (gatewayProjectionSubjectMapping, bool, bool) {
	if properties == nil {
		return gatewayProjectionSubjectMapping{}, false, true
	}
	apiSubjectIDs := []string{}
	for _, key := range []string{"aicodexApiUserId", "aicodex_api_user_id", "apiUserId", "api_user_id"} {
		apiSubjectIDs = append(apiSubjectIDs, splitGatewayProjectionList(properties[key])...)
	}
	apiSubjectIDs = sortedUniqueGatewayProjectionStrings(apiSubjectIDs)
	if len(apiSubjectIDs) == 0 {
		return gatewayProjectionSubjectMapping{}, false, true
	}
	if len(apiSubjectIDs) != 1 {
		return gatewayProjectionSubjectMapping{}, true, false
	}
	return gatewayProjectionSubjectMapping{apiSubjectID: apiSubjectIDs[0]}, true, true
}

func buildGatewayProjectionActiveDepartments(departments []PlatformDepartment, organizationID string) (map[string]bool, bool) {
	active := map[string]bool{}
	hasSnapshot := false
	for _, department := range departments {
		if department.OrganizationId != organizationID || normalizeGatewayProjectionString(department.DepartmentId) == "" {
			continue
		}
		hasSnapshot = true
		if IsPlatformLifecycleStatusUsableForScope(department.LifecycleStatus) {
			active[normalizeGatewayProjectionString(department.DepartmentId)] = true
		}
	}
	return active, hasSnapshot
}

func buildGatewayProjectionMemberships(memberships []PlatformMembership, organizationID string, activeDepartments map[string]bool, hasDepartmentSnapshot bool) map[string][]string {
	bySubject := map[string][]string{}
	for _, membership := range memberships {
		adminSubject := normalizeGatewayProjectionString(membership.AdminSubject)
		departmentID := normalizeGatewayProjectionString(membership.DepartmentId)
		if membership.OrganizationId != organizationID || adminSubject == "" || departmentID == "" {
			continue
		}
		if !IsPlatformLifecycleStatusUsableForScope(membership.LifecycleStatus) {
			continue
		}
		if hasDepartmentSnapshot && !activeDepartments[departmentID] {
			continue
		}
		bySubject[adminSubject] = append(bySubject[adminSubject], departmentID)
	}
	for subject, departmentIDs := range bySubject {
		bySubject[subject] = sortedUniqueGatewayProjectionStrings(departmentIDs)
	}
	return bySubject
}

func filterGatewayProjectionUsers(users []PlatformUser, organizationID string) []PlatformUser {
	filtered := make([]PlatformUser, 0, len(users))
	for _, user := range users {
		if user.OrganizationId == organizationID {
			filtered = append(filtered, user)
		}
	}
	sort.Slice(filtered, func(i, j int) bool {
		return gatewayProjectionStableSubjectID(filtered[i], organizationID) < gatewayProjectionStableSubjectID(filtered[j], organizationID)
	})
	return filtered
}

func gatewayProjectionStableSubjectID(user PlatformUser, organizationID string) string {
	if value := normalizeGatewayProjectionString(user.AdminSubject); value != "" {
		return value
	}
	if user.UserOwner != "" && user.UserName != "" {
		return getWecomLocalId(user.UserOwner, user.UserName)
	}
	if user.Name != "" {
		return getWecomLocalId(organizationID, user.Name)
	}
	return ""
}

func gatewayProjectionPlatformUserID(user PlatformUser, organizationID string) string {
	if user.UserOwner != "" && user.UserName != "" {
		return getWecomLocalId(user.UserOwner, user.UserName)
	}
	if user.Name != "" {
		return getWecomLocalId(organizationID, user.Name)
	}
	return ""
}

// gatewayProjectionMappingTrustedForLifecycle 对 active 和 tombstone 使用不同信任门槛。
// active 必须 CONFIRMED；非 active tombstone 可使用 DISABLED 映射来显式撤销 gateway 主体。
func gatewayProjectionMappingTrustedForLifecycle(mappingStatus string, lifecycleStatus string) bool {
	status := normalizeGatewayProjectionString(mappingStatus)
	if IsConfirmedExternalIdentityMappingStatus(status) {
		return true
	}
	return lifecycleStatus != "active" && strings.EqualFold(status, PlatformMappingStatusDisabled)
}

func gatewayProjectionIdentityMappingUsableForTombstone(mappingStatus string) bool {
	status := normalizeGatewayProjectionString(mappingStatus)
	return IsConfirmedExternalIdentityMappingStatus(status) || strings.EqualFold(status, PlatformMappingStatusDisabled)
}

func gatewayProjectionSubjectMappingForLifecycle(stableSubjectID string, lifecycleStatus string, confirmedMappings map[string]gatewayProjectionSubjectMapping, tombstoneMappings map[string]gatewayProjectionSubjectMapping) (gatewayProjectionSubjectMapping, bool) {
	if lifecycleStatus == "active" {
		mapping, ok := confirmedMappings[stableSubjectID]
		return mapping, ok
	}
	if mapping, ok := confirmedMappings[stableSubjectID]; ok {
		return mapping, true
	}
	mapping, ok := tombstoneMappings[stableSubjectID]
	return mapping, ok
}

// gatewayProjectionLifecycleStatus 把 admin 大写 lifecycle 映射为 api contract 的小写枚举。
// 空值、UNKNOWN 和 STALE 只能转为 `unknown`，不能降级成 active；未知枚举直接跳过以保持 fail closed。
func gatewayProjectionLifecycleStatus(status string) (string, bool) {
	switch strings.ToUpper(normalizeGatewayProjectionString(status)) {
	case PlatformLifecycleStatusActive:
		return "active", true
	case PlatformLifecycleStatusDisabled:
		return "disabled", true
	case PlatformLifecycleStatusDeleted:
		return "deleted", true
	case PlatformLifecycleStatusConflicted:
		return "conflicted", true
	case "", PlatformLifecycleStatusUnknown, PlatformLifecycleStatusStale:
		return "unknown", true
	default:
		return "", false
	}
}

// buildGatewayProjectionSubjectVersion 基于 gateway 会消费的 subject 字段生成稳定版本。
// freshness 进入版本输入，确保过期窗口变化会触发 api 侧幂等差异。
func buildGatewayProjectionSubjectVersion(subject GatewayProjectedSubject) string {
	input := struct {
		StableSubjectID    string    `json:"stableSubjectId"`
		APISubjectID       string    `json:"apiSubjectId"`
		SubjectType        string    `json:"subjectType"`
		OrganizationID     string    `json:"organizationId"`
		DepartmentIDs      []string  `json:"departmentIds"`
		RoleIDs            []string  `json:"roleIds"`
		PositionIDs        []string  `json:"positionIds"`
		LifecycleStatus    string    `json:"lifecycleStatus"`
		OrgVersion         int64     `json:"orgVersion"`
		FreshnessExpiresAt time.Time `json:"freshnessExpiresAt"`
	}{
		StableSubjectID:    subject.StableSubjectID,
		APISubjectID:       subject.APISubjectID,
		SubjectType:        subject.SubjectType,
		OrganizationID:     subject.OrganizationID,
		DepartmentIDs:      subject.DepartmentIDs,
		RoleIDs:            subject.RoleIDs,
		PositionIDs:        subject.PositionIDs,
		LifecycleStatus:    subject.LifecycleStatus,
		OrgVersion:         subject.OrgVersion,
		FreshnessExpiresAt: subject.FreshnessExpiresAt.UTC(),
	}
	return "pv-" + gatewayProjectionSHA256Hex(input)
}

// buildGatewayProjectionDigest 汇总批次级版本、source lineage 和已排序 subjects。
// digest 只服务幂等与排查，不包含 token、endpoint、手机号、邮箱或原始外部响应。
func buildGatewayProjectionDigest(orgVersion int64, sourceVersion string, freshnessExpiresAt time.Time, subjects []GatewayProjectedSubject) string {
	input := struct {
		OrgVersion         int64                     `json:"orgVersion"`
		SourceVersion      string                    `json:"sourceVersion"`
		FreshnessExpiresAt time.Time                 `json:"freshnessExpiresAt"`
		Subjects           []GatewayProjectedSubject `json:"subjects"`
	}{
		OrgVersion:         orgVersion,
		SourceVersion:      sourceVersion,
		FreshnessExpiresAt: freshnessExpiresAt.UTC(),
		Subjects:           subjects,
	}
	return "sha256:" + gatewayProjectionSHA256Hex(input)
}

// buildGatewayProjectionBatchID 生成可重复推送的批次 id。
// id 只使用脱敏后的组织、source batch、数值 orgVersion 和 digest 前缀，避免泄漏原始 sourceVersion 或凭据。
func buildGatewayProjectionBatchID(organizationID string, batch *OrgSyncBatch, orgVersion int64, digest string) string {
	sourceBatchID := "manual"
	if batch != nil && normalizeGatewayProjectionString(batch.BatchId) != "" {
		sourceBatchID = normalizeGatewayProjectionString(batch.BatchId)
	}
	digestPart := strings.TrimPrefix(digest, "sha256:")
	if len(digestPart) > 12 {
		digestPart = digestPart[:12]
	}
	return fmt.Sprintf("gwp-%s-%s-%d-%s",
		sanitizeGatewayProjectionIDPart(organizationID),
		sanitizeGatewayProjectionIDPart(sourceBatchID),
		orgVersion,
		digestPart,
	)
}

func gatewayProjectionSHA256Hex(value any) string {
	raw, err := json.Marshal(value)
	if err != nil {
		raw = []byte(fmt.Sprintf("%#v", value))
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

func gatewayProjectionStringValues(value any) []string {
	switch typed := value.(type) {
	case nil:
		return nil
	case string:
		return splitGatewayProjectionList(typed)
	case []string:
		return typed
	case []any:
		values := []string{}
		for _, item := range typed {
			values = append(values, gatewayProjectionStringValues(item)...)
		}
		return values
	case float64:
		if typed == float64(int64(typed)) {
			return []string{strconv.FormatInt(int64(typed), 10)}
		}
	case json.Number:
		return []string{typed.String()}
	}
	return nil
}

func splitGatewayProjectionList(value string) []string {
	values := []string{}
	for _, part := range strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == ';' || r == '\n' || r == '\t' || r == ' '
	}) {
		if normalized := normalizeGatewayProjectionString(part); normalized != "" {
			values = append(values, normalized)
		}
	}
	return values
}

func sortedUniqueGatewayProjectionStrings(values []string) []string {
	seen := map[string]bool{}
	result := []string{}
	for _, value := range values {
		normalized := normalizeGatewayProjectionString(value)
		if normalized == "" || seen[normalized] {
			continue
		}
		seen[normalized] = true
		result = append(result, normalized)
	}
	sort.Strings(result)
	return result
}

func sanitizeGatewayProjectionIDPart(value string) string {
	value = gatewayProjectionIDUnsafeChars.ReplaceAllString(normalizeGatewayProjectionString(value), "-")
	value = strings.Trim(value, "-")
	if value == "" {
		return "unknown"
	}
	if len(value) > 48 {
		return value[:48]
	}
	return value
}

func normalizeGatewayProjectionString(value string) string {
	return strings.TrimSpace(value)
}
