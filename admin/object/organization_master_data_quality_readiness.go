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
	"time"
)

const (
	OrganizationMasterDataQualityStatusReady   = "ready"
	OrganizationMasterDataQualityStatusWarning = "warning"
	OrganizationMasterDataQualityStatusBlocked = "blocked"

	OrganizationMasterDataQualityReasonOrganizationMissing          = "organization_missing"
	OrganizationMasterDataQualityReasonSourceConnectionMissing      = "source_connection_missing"
	OrganizationMasterDataQualityReasonSourceConnectionDisabled     = "source_connection_disabled"
	OrganizationMasterDataQualityReasonSourceFreshnessUntrusted     = "source_freshness_untrusted"
	OrganizationMasterDataQualityReasonSyncLineageMissing           = "sync_lineage_missing"
	OrganizationMasterDataQualityReasonDuplicateSourceConnection    = "duplicate_source_connection"
	OrganizationMasterDataQualityReasonDuplicateDepartmentSourceKey = "duplicate_department_source_key"
	OrganizationMasterDataQualityReasonDuplicateAdminSubject        = "duplicate_admin_subject"
	OrganizationMasterDataQualityReasonDepartmentSourceKeyMissing   = "department_source_key_missing"
	OrganizationMasterDataQualityReasonUserSourceKeyMissing         = "user_source_key_missing"
	OrganizationMasterDataQualityReasonOrphanDepartment             = "orphan_department"
	OrganizationMasterDataQualityReasonMembershipMissingUser        = "membership_missing_user"
	OrganizationMasterDataQualityReasonMembershipMissingDepartment  = "membership_missing_department"
	OrganizationMasterDataQualityReasonSubjectNotActive             = "subject_not_active"
	OrganizationMasterDataQualityReasonMappingMissing               = "mapping_missing"
	OrganizationMasterDataQualityReasonMappingUntrusted             = "mapping_untrusted"
	OrganizationMasterDataQualityReasonLineageFreshnessUnavailable  = "lineage_freshness_unavailable"
	OrganizationMasterDataQualityReasonNoPublishableSubject         = "no_publishable_subject"
)

// OrganizationMasterDataQualityQuery 限定只读质量诊断的组织范围。
type OrganizationMasterDataQualityQuery struct {
	OrganizationId string
}

// OrganizationMasterDataQualityReadiness 是 Admin 组织主数据进入 projection 生产前的脱敏质量摘要。
// 该响应只包含计数和稳定 alias，不携带完整组织树、真实用户明细或 source secret。
type OrganizationMasterDataQualityReadiness struct {
	OrganizationId          string                                        `json:"organizationId"`
	Status                  string                                        `json:"status"`
	GeneratedAt             time.Time                                     `json:"generatedAt"`
	ReasonAliases           []string                                      `json:"reasonAliases"`
	Counts                  OrganizationMasterDataQualityCounts           `json:"counts"`
	SourceConnectionSummary GatewayProjectionSourceConnectionSummary      `json:"sourceConnectionSummary"`
	SyncBatch               OrganizationMasterDataQualitySyncBatchSummary `json:"syncBatch"`
	QualityChecks           []OrganizationMasterDataQualityCheck          `json:"qualityChecks"`
	Boundary                string                                        `json:"boundary"`
}

// OrganizationMasterDataQualityCounts 汇总质量检查的脱敏计数，供 operator 判断阻断面。
type OrganizationMasterDataQualityCounts struct {
	SourceConnectionCount            int `json:"sourceConnectionCount"`
	DepartmentCount                  int `json:"departmentCount"`
	UserCount                        int `json:"userCount"`
	MembershipCount                  int `json:"membershipCount"`
	ActiveSubjectCount               int `json:"activeSubjectCount"`
	TombstoneSubjectCount            int `json:"tombstoneSubjectCount"`
	PublishableSubjectCount          int `json:"publishableSubjectCount"`
	UnmappedSubjectCount             int `json:"unmappedSubjectCount"`
	UntrustedMappingCount            int `json:"untrustedMappingCount"`
	LineageFreshnessUnavailableCount int `json:"lineageFreshnessUnavailableCount"`
	DisabledSubjectCount             int `json:"disabledSubjectCount"`
	UnknownSubjectCount              int `json:"unknownSubjectCount"`
	ConflictedSubjectCount           int `json:"conflictedSubjectCount"`
	StaleSubjectCount                int `json:"staleSubjectCount"`
	OrphanDepartmentCount            int `json:"orphanDepartmentCount"`
	DuplicateSourceKeyCount          int `json:"duplicateSourceKeyCount"`
	DepartmentSourceKeyMissingCount  int `json:"departmentSourceKeyMissingCount"`
	UserSourceKeyMissingCount        int `json:"userSourceKeyMissingCount"`
	MembershipMissingUserCount       int `json:"membershipMissingUserCount"`
	MembershipMissingDepartmentCount int `json:"membershipMissingDepartmentCount"`
}

// OrganizationMasterDataQualitySyncBatchSummary 只暴露 source lineage 可用性，不输出原始 source 响应。
type OrganizationMasterDataQualitySyncBatchSummary struct {
	Present          bool   `json:"present"`
	HasUsableLineage bool   `json:"hasUsableLineage"`
	Status           string `json:"status,omitempty"`
	Freshness        string `json:"freshness,omitempty"`
	OrgVersion       string `json:"orgVersion,omitempty"`
}

// OrganizationMasterDataQualityCheck 是 UI 和 runbook 可展示的稳定质量检查项。
type OrganizationMasterDataQualityCheck struct {
	Alias    string `json:"alias"`
	Status   string `json:"status"`
	Count    int    `json:"count"`
	Summary  string `json:"summary"`
	Boundary string `json:"boundary"`
}

// OrganizationMasterDataQualityService 从 Admin 自有主模型快照构建只读质量 readiness。
// 它不触发 publish，不查询 API/Insight/Gateway 内部库，也不写 gateway 授权事实。
type OrganizationMasterDataQualityService struct {
	Store GatewayProjectionSnapshotStore
	Now   func() time.Time
}

// GetOrganizationMasterDataQualityReadiness 返回默认存储上的组织主数据质量 readiness。
func GetOrganizationMasterDataQualityReadiness(query OrganizationMasterDataQualityQuery) (*OrganizationMasterDataQualityReadiness, error) {
	return (OrganizationMasterDataQualityService{}).GetReadiness(query)
}

// GetReadiness 读取当前组织 projection snapshot 并计算稳定质量状态。
func (s OrganizationMasterDataQualityService) GetReadiness(query OrganizationMasterDataQualityQuery) (*OrganizationMasterDataQualityReadiness, error) {
	organizationID := normalizeGatewayProjectionString(query.OrganizationId)
	result := &OrganizationMasterDataQualityReadiness{
		OrganizationId: organizationID,
		Status:         OrganizationMasterDataQualityStatusReady,
		GeneratedAt:    s.now().UTC(),
		ReasonAliases:  []string{},
		QualityChecks:  []OrganizationMasterDataQualityCheck{},
		Boundary:       "organization master data quality readiness 只服务 Admin producer 排障，不是 gateway authorization facts，也不能证明 API/Gateway/Insight 成功。",
		Counts:         OrganizationMasterDataQualityCounts{},
		SourceConnectionSummary: GatewayProjectionSourceConnectionSummary{
			StatusCounts:    map[string]int{},
			FreshnessCounts: map[string]int{},
		},
	}
	if organizationID == "" {
		result.addCheck(OrganizationMasterDataQualityReasonOrganizationMissing, OrganizationMasterDataQualityStatusBlocked, 1, "未选择组织", "必须先限定 Admin organizationId。")
		result.finalize()
		return result, nil
	}
	snapshot, err := s.snapshotStore().GetGatewayProjectionSnapshot(organizationID)
	if err != nil {
		return nil, err
	}
	if snapshot == nil {
		snapshot = &GatewayProjectionSnapshot{}
	}
	result.evaluateSnapshot(snapshot, organizationID)
	result.finalize()
	return result, nil
}

func (s OrganizationMasterDataQualityService) snapshotStore() GatewayProjectionSnapshotStore {
	if s.Store != nil {
		return s.Store
	}
	return defaultGatewayProjectionSnapshotStore{}
}

func (s OrganizationMasterDataQualityService) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func (r *OrganizationMasterDataQualityReadiness) evaluateSnapshot(snapshot *GatewayProjectionSnapshot, organizationID string) {
	r.SourceConnectionSummary = buildGatewayProjectionSourceConnectionSummary(snapshot.SourceConnections)
	r.SyncBatch = buildOrganizationMasterDataQualitySyncBatchSummary(snapshot.SyncBatch)
	r.Counts.SourceConnectionCount = len(snapshot.SourceConnections)
	r.Counts.DepartmentCount = countOrganizationMasterDataQualityDepartments(snapshot.Departments, organizationID)
	r.Counts.UserCount = countOrganizationMasterDataQualityUsers(snapshot.Users, organizationID)
	r.Counts.MembershipCount = countOrganizationMasterDataQualityMemberships(snapshot.Memberships, organizationID)

	r.evaluateSourceReadiness()
	r.evaluateSyncBatchReadiness()
	r.evaluateSourceKeys(snapshot, organizationID)
	r.evaluateSubjects(snapshot, organizationID)
	r.evaluateDepartmentsAndMemberships(snapshot, organizationID)
	if r.Counts.PublishableSubjectCount == 0 {
		r.addCheck(OrganizationMasterDataQualityReasonNoPublishableSubject, OrganizationMasterDataQualityStatusBlocked, 1, "没有可发布 active/tombstone subject", "需要先补齐生命周期、source lineage 和一等 API user mapping。")
	}
}

func (r *OrganizationMasterDataQualityReadiness) evaluateSourceReadiness() {
	if r.SourceConnectionSummary.Total == 0 {
		r.addCheck(OrganizationMasterDataQualityReasonSourceConnectionMissing, OrganizationMasterDataQualityStatusBlocked, 1, "缺少 SourceConnection", "Admin projection producer 必须基于可信来源连接。")
		return
	}
	if count := r.SourceConnectionSummary.StatusCounts[SourceConnectionStatusDisabled] + r.SourceConnectionSummary.StatusCounts[SourceConnectionStatusError]; count > 0 {
		r.addCheck(OrganizationMasterDataQualityReasonSourceConnectionDisabled, OrganizationMasterDataQualityStatusBlocked, count, "存在禁用或错误的 SourceConnection", "禁用或错误来源不能作为 projection 生产输入。")
	}
	if r.SourceConnectionSummary.HasStaleFreshness || r.SourceConnectionSummary.HasUnavailableFreshness {
		count := r.SourceConnectionSummary.FreshnessCounts[PlatformFreshnessStale] + r.SourceConnectionSummary.FreshnessCounts[PlatformFreshnessUnavailable]
		r.addCheck(OrganizationMasterDataQualityReasonSourceFreshnessUntrusted, OrganizationMasterDataQualityStatusBlocked, maxOrganizationMasterDataQualityCount(count), "来源 freshness 不可信", "需要等待来源同步恢复 fresh 后再发布。")
	}
	if count := r.SourceConnectionSummary.FreshnessCounts[PlatformFreshnessUnknown] + r.SourceConnectionSummary.FreshnessCounts["unknown"]; count > 0 {
		r.addCheck(OrganizationMasterDataQualityReasonSourceFreshnessUntrusted, OrganizationMasterDataQualityStatusWarning, count, "存在未知 freshness 来源", "未知 freshness 只能作为排障信号，不得外推为下游成功。")
	}
}

func (r *OrganizationMasterDataQualityReadiness) evaluateSyncBatchReadiness() {
	if !r.SyncBatch.HasUsableLineage {
		r.addCheck(OrganizationMasterDataQualityReasonSyncLineageMissing, OrganizationMasterDataQualityStatusBlocked, 1, "缺少可用 OrgSyncBatch lineage", "需要具备完成时间和 orgVersion 的 SUCCEEDED/PARTIAL 同步批次。")
	}
}

func (r *OrganizationMasterDataQualityReadiness) evaluateSourceKeys(snapshot *GatewayProjectionSnapshot, organizationID string) {
	sourceConnectionIDs := map[string]int{}
	for _, connection := range snapshot.SourceConnections {
		if connection.OrganizationId != organizationID {
			continue
		}
		if id := normalizeGatewayProjectionString(connection.SourceConnectionId); id != "" {
			sourceConnectionIDs[id]++
		}
	}
	if count := countOrganizationMasterDataQualityDuplicates(sourceConnectionIDs); count > 0 {
		r.Counts.DuplicateSourceKeyCount += count
		r.addCheck(OrganizationMasterDataQualityReasonDuplicateSourceConnection, OrganizationMasterDataQualityStatusBlocked, count, "SourceConnectionId 重复", "来源连接根键必须唯一，重复时不能作为 projection 输入。")
	}

	departmentSourceKeys := map[string]int{}
	userSubjects := map[string]int{}
	for _, department := range snapshot.Departments {
		if department.OrganizationId != organizationID {
			continue
		}
		externalID := normalizeGatewayProjectionString(department.ExternalDepartmentId)
		if externalID == "" {
			r.Counts.DepartmentSourceKeyMissingCount++
			continue
		}
		key := normalizeGatewayProjectionString(department.SourceConnectionId) + "/" + externalID
		departmentSourceKeys[key]++
	}
	if r.Counts.DepartmentSourceKeyMissingCount > 0 {
		r.addCheck(OrganizationMasterDataQualityReasonDepartmentSourceKeyMissing, OrganizationMasterDataQualityStatusWarning, r.Counts.DepartmentSourceKeyMissingCount, "部门缺少外部 source key", "缺失 source key 只能作为诊断展示，不能作为跨服务 join key。")
	}
	if count := countOrganizationMasterDataQualityDuplicates(departmentSourceKeys); count > 0 {
		r.Counts.DuplicateSourceKeyCount += count
		r.addCheck(OrganizationMasterDataQualityReasonDuplicateDepartmentSourceKey, OrganizationMasterDataQualityStatusBlocked, count, "部门 source key 重复", "重复 source key 会破坏来源 lineage，必须先收敛。")
	}
	for _, user := range snapshot.Users {
		if user.OrganizationId != organizationID {
			continue
		}
		adminSubject := normalizeGatewayProjectionString(user.AdminSubject)
		if adminSubject == "" {
			r.Counts.UserSourceKeyMissingCount++
			continue
		}
		userSubjects[adminSubject]++
	}
	if r.Counts.UserSourceKeyMissingCount > 0 {
		r.addCheck(OrganizationMasterDataQualityReasonUserSourceKeyMissing, OrganizationMasterDataQualityStatusWarning, r.Counts.UserSourceKeyMissingCount, "用户缺少稳定 adminSubject", "displayName、手机号、邮箱不能作为 runtime join key。")
	}
	if count := countOrganizationMasterDataQualityDuplicates(userSubjects); count > 0 {
		r.Counts.DuplicateSourceKeyCount += count
		r.addCheck(OrganizationMasterDataQualityReasonDuplicateAdminSubject, OrganizationMasterDataQualityStatusBlocked, count, "adminSubject 重复", "同组织内 adminSubject 必须唯一。")
	}
}

func (r *OrganizationMasterDataQualityReadiness) evaluateSubjects(snapshot *GatewayProjectionSnapshot, organizationID string) {
	mappingsBySubject := map[string]*PlatformApiUserMapping{}
	for i := range snapshot.ApiUserMappings {
		mapping := &snapshot.ApiUserMappings[i]
		if mapping.OrganizationId != organizationID {
			continue
		}
		mappingsBySubject[normalizeGatewayProjectionString(mapping.AdminSubject)] = mapping
	}
	for i := range snapshot.Users {
		user := &snapshot.Users[i]
		if user.OrganizationId != organizationID {
			continue
		}
		candidate := buildPlatformApiUserMappingReadinessSubject(user, mappingsBySubject[normalizeGatewayProjectionString(user.AdminSubject)])
		switch candidate.ReadinessCategory {
		case PlatformApiMappingReadinessActivePublishable:
			r.Counts.ActiveSubjectCount++
			r.Counts.PublishableSubjectCount++
		case PlatformApiMappingReadinessTombstonePublishable:
			r.Counts.TombstoneSubjectCount++
			r.Counts.PublishableSubjectCount++
		case PlatformApiMappingReadinessMappingMissing:
			r.Counts.UnmappedSubjectCount++
		case PlatformApiMappingReadinessMappingUntrusted:
			r.Counts.UntrustedMappingCount++
		case PlatformApiMappingReadinessLineageFreshnessUnavailable:
			r.Counts.LineageFreshnessUnavailableCount++
		}
		r.countSubjectLifecycle(user.LifecycleStatus)
	}
	if r.Counts.UnmappedSubjectCount > 0 {
		r.addCheck(OrganizationMasterDataQualityReasonMappingMissing, OrganizationMasterDataQualityStatusWarning, r.Counts.UnmappedSubjectCount, "存在未映射主体", "需要维护一等 PlatformApiUserMapping.ApiUserId，不能使用展示字段推断。")
	}
	if r.Counts.UntrustedMappingCount > 0 {
		r.addCheck(OrganizationMasterDataQualityReasonMappingUntrusted, OrganizationMasterDataQualityStatusWarning, r.Counts.UntrustedMappingCount, "存在不可信映射", "PENDING_REVIEW、DUPLICATE、CONFLICTED 等状态不能进入运行时投影。")
	}
	if r.Counts.LineageFreshnessUnavailableCount > 0 {
		r.addCheck(OrganizationMasterDataQualityReasonLineageFreshnessUnavailable, OrganizationMasterDataQualityStatusWarning, r.Counts.LineageFreshnessUnavailableCount, "主体 lineage/freshness 不完整", "需要确认 OrgVersion 和 LastSeenBatchId。")
	}
	if count := r.Counts.DisabledSubjectCount + r.Counts.UnknownSubjectCount + r.Counts.ConflictedSubjectCount + r.Counts.StaleSubjectCount; count > 0 {
		r.addCheck(OrganizationMasterDataQualityReasonSubjectNotActive, OrganizationMasterDataQualityStatusWarning, count, "存在非 active 主体", "非 active 主体只能用于 tombstone 或诊断，不得放宽为 active。")
	}
}

func (r *OrganizationMasterDataQualityReadiness) countSubjectLifecycle(status string) {
	switch strings.ToUpper(normalizeGatewayProjectionString(status)) {
	case PlatformLifecycleStatusDisabled, PlatformLifecycleStatusDeleted:
		r.Counts.DisabledSubjectCount++
	case PlatformLifecycleStatusUnknown:
		r.Counts.UnknownSubjectCount++
	case PlatformLifecycleStatusConflicted:
		r.Counts.ConflictedSubjectCount++
	case PlatformLifecycleStatusStale:
		r.Counts.StaleSubjectCount++
	}
}

func (r *OrganizationMasterDataQualityReadiness) evaluateDepartmentsAndMemberships(snapshot *GatewayProjectionSnapshot, organizationID string) {
	departments := map[string]PlatformDepartment{}
	activeDepartments := map[string]bool{}
	activeUsers := map[string]bool{}
	for _, department := range snapshot.Departments {
		if department.OrganizationId != organizationID || normalizeGatewayProjectionString(department.DepartmentId) == "" {
			continue
		}
		departmentID := normalizeGatewayProjectionString(department.DepartmentId)
		departments[departmentID] = department
		if IsPlatformLifecycleStatusUsableForScope(department.LifecycleStatus) {
			activeDepartments[departmentID] = true
		}
	}
	for _, user := range snapshot.Users {
		if user.OrganizationId != organizationID {
			continue
		}
		adminSubject := gatewayProjectionStableSubjectID(user, organizationID)
		if adminSubject != "" && IsPlatformLifecycleStatusUsableForScope(user.LifecycleStatus) {
			activeUsers[adminSubject] = true
		}
	}
	for _, department := range snapshot.Departments {
		if department.OrganizationId != organizationID {
			continue
		}
		parentID := normalizeGatewayProjectionString(department.ParentDepartmentId)
		if parentID != "" && departments[parentID].DepartmentId == "" {
			r.Counts.OrphanDepartmentCount++
		}
	}
	if r.Counts.OrphanDepartmentCount > 0 {
		r.addCheck(OrganizationMasterDataQualityReasonOrphanDepartment, OrganizationMasterDataQualityStatusWarning, r.Counts.OrphanDepartmentCount, "存在疑似 orphan department", "父部门缺失时只能作为诊断，不能扩大可见范围。")
	}
	for _, membership := range snapshot.Memberships {
		if membership.OrganizationId != organizationID || !IsPlatformLifecycleStatusUsableForScope(membership.LifecycleStatus) {
			continue
		}
		adminSubject := normalizeGatewayProjectionString(membership.AdminSubject)
		departmentID := normalizeGatewayProjectionString(membership.DepartmentId)
		if adminSubject == "" || !activeUsers[adminSubject] {
			r.Counts.MembershipMissingUserCount++
		}
		if departmentID == "" || !activeDepartments[departmentID] {
			r.Counts.MembershipMissingDepartmentCount++
		}
	}
	if r.Counts.MembershipMissingUserCount > 0 {
		r.addCheck(OrganizationMasterDataQualityReasonMembershipMissingUser, OrganizationMasterDataQualityStatusBlocked, r.Counts.MembershipMissingUserCount, "成员关系引用缺失 active 用户", "active membership 不能指向缺失或非 active 主体。")
	}
	if r.Counts.MembershipMissingDepartmentCount > 0 {
		r.addCheck(OrganizationMasterDataQualityReasonMembershipMissingDepartment, OrganizationMasterDataQualityStatusWarning, r.Counts.MembershipMissingDepartmentCount, "成员关系引用缺失 active 部门", "缺失部门不会扩大权限，只能进入诊断或等待来源修复。")
	}
}

func (r *OrganizationMasterDataQualityReadiness) addCheck(alias string, status string, count int, summary string, boundary string) {
	if count <= 0 {
		return
	}
	r.ReasonAliases = append(r.ReasonAliases, alias)
	r.QualityChecks = append(r.QualityChecks, OrganizationMasterDataQualityCheck{
		Alias:    alias,
		Status:   status,
		Count:    count,
		Summary:  summary,
		Boundary: boundary,
	})
}

func (r *OrganizationMasterDataQualityReadiness) finalize() {
	r.ReasonAliases = sortedUniqueGatewayProjectionStrings(r.ReasonAliases)
	sort.SliceStable(r.QualityChecks, func(i, j int) bool {
		if r.QualityChecks[i].Status == r.QualityChecks[j].Status {
			return r.QualityChecks[i].Alias < r.QualityChecks[j].Alias
		}
		return organizationMasterDataQualityStatusRank(r.QualityChecks[i].Status) < organizationMasterDataQualityStatusRank(r.QualityChecks[j].Status)
	})
	r.Status = OrganizationMasterDataQualityStatusReady
	for _, check := range r.QualityChecks {
		if check.Status == OrganizationMasterDataQualityStatusBlocked {
			r.Status = OrganizationMasterDataQualityStatusBlocked
			return
		}
		if check.Status == OrganizationMasterDataQualityStatusWarning {
			r.Status = OrganizationMasterDataQualityStatusWarning
		}
	}
}

func buildOrganizationMasterDataQualitySyncBatchSummary(batch *OrgSyncBatch) OrganizationMasterDataQualitySyncBatchSummary {
	if batch == nil {
		return OrganizationMasterDataQualitySyncBatchSummary{}
	}
	return OrganizationMasterDataQualitySyncBatchSummary{
		Present:          true,
		HasUsableLineage: gatewayProjectionSyncBatchUsable(*batch),
		Status:           normalizeGatewayProjectionString(batch.Status),
		Freshness:        normalizeGatewayProjectionString(batch.Freshness),
		OrgVersion:       normalizeGatewayProjectionString(batch.OrgVersion),
	}
}

func countOrganizationMasterDataQualityDepartments(departments []PlatformDepartment, organizationID string) int {
	count := 0
	for _, department := range departments {
		if department.OrganizationId == organizationID {
			count++
		}
	}
	return count
}

func countOrganizationMasterDataQualityUsers(users []PlatformUser, organizationID string) int {
	count := 0
	for _, user := range users {
		if user.OrganizationId == organizationID {
			count++
		}
	}
	return count
}

func countOrganizationMasterDataQualityMemberships(memberships []PlatformMembership, organizationID string) int {
	count := 0
	for _, membership := range memberships {
		if membership.OrganizationId == organizationID {
			count++
		}
	}
	return count
}

func countOrganizationMasterDataQualityDuplicates(values map[string]int) int {
	count := 0
	for _, value := range values {
		if value > 1 {
			count += value - 1
		}
	}
	return count
}

func organizationMasterDataQualityStatusRank(status string) int {
	switch status {
	case OrganizationMasterDataQualityStatusBlocked:
		return 0
	case OrganizationMasterDataQualityStatusWarning:
		return 1
	default:
		return 2
	}
}

func maxOrganizationMasterDataQualityCount(count int) int {
	if count <= 0 {
		return 1
	}
	return count
}
