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
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
)

const (
	OrganizationDirectoryQualityEntityDepartment = "department"
	OrganizationDirectoryQualityEntityUser       = "user"
	OrganizationDirectoryQualityEntityMembership = "membership"
)

// OrganizationDirectoryQualityQuery 限定 Admin 主数据目录质量明细读取范围和筛选条件。
type OrganizationDirectoryQualityQuery struct {
	OrganizationId         string
	EntityType             string
	Keyword                string
	SourceType             string
	SourceConnectionIdHash string
	QualityStatus          string
	ReasonCode             string
	LifecycleStatus        string
	Page                   int
	PageSize               int
}

// OrganizationDirectoryQualityResult 是组织目录质量列表的只读脱敏响应。
type OrganizationDirectoryQualityResult struct {
	OrganizationId string                              `json:"organizationId"`
	EntityType     string                              `json:"entityType"`
	GeneratedAt    time.Time                           `json:"generatedAt"`
	Page           int                                 `json:"page"`
	PageSize       int                                 `json:"pageSize"`
	Total          int                                 `json:"total"`
	Summary        OrganizationDirectoryQualitySummary `json:"summary"`
	ReasonAliases  []string                            `json:"reasonAliases"`
	Items          []OrganizationDirectoryQualityItem  `json:"items"`
	Boundary       string                              `json:"boundary"`
}

// OrganizationDirectoryQualitySummary 汇总当前筛选结果的状态计数。
type OrganizationDirectoryQualitySummary struct {
	Ready   int `json:"ready"`
	Warning int `json:"warning"`
	Blocked int `json:"blocked"`
	Total   int `json:"total"`
}

// OrganizationDirectoryQualityItem 是单条 PlatformDepartment/User/Membership 的脱敏质量明细。
type OrganizationDirectoryQualityItem struct {
	EntityType             string                 `json:"entityType"`
	EntityId               string                 `json:"entityId"`
	DisplayName            string                 `json:"displayName,omitempty"`
	OrganizationId         string                 `json:"organizationId"`
	SourceType             string                 `json:"sourceType,omitempty"`
	SourceConnectionIdHash string                 `json:"sourceConnectionIdHash,omitempty"`
	ExternalIdHash         string                 `json:"externalIdHash,omitempty"`
	SyncBatchId            string                 `json:"syncBatchId,omitempty"`
	OrgVersion             string                 `json:"orgVersion,omitempty"`
	SourceVersion          string                 `json:"sourceVersion,omitempty"`
	LifecycleStatus        string                 `json:"lifecycleStatus,omitempty"`
	QualityStatus          string                 `json:"qualityStatus"`
	ReasonCodes            []string               `json:"reasonCodes"`
	RemediationHints       []string               `json:"remediationHints"`
	Detail                 map[string]interface{} `json:"detail,omitempty"`
}

// OrganizationDirectoryQualityService 从 Admin 自有主模型快照构建目录质量明细。
// 它只读 Admin producer 数据，不触发 publish，也不读取 API/Gateway/Insight 内部库。
type OrganizationDirectoryQualityService struct {
	Store GatewayProjectionSnapshotStore
	Now   func() time.Time
}

func GetOrganizationDirectoryQuality(query OrganizationDirectoryQualityQuery) (*OrganizationDirectoryQualityResult, error) {
	return (OrganizationDirectoryQualityService{}).GetDirectory(query)
}

func (s OrganizationDirectoryQualityService) GetDirectory(query OrganizationDirectoryQualityQuery) (*OrganizationDirectoryQualityResult, error) {
	normalized, err := normalizeOrganizationDirectoryQualityQuery(query)
	if err != nil {
		return nil, err
	}
	result := &OrganizationDirectoryQualityResult{
		OrganizationId: normalized.OrganizationId,
		EntityType:     normalized.EntityType,
		GeneratedAt:    s.now().UTC(),
		Page:           normalized.Page,
		PageSize:       normalized.PageSize,
		Items:          []OrganizationDirectoryQualityItem{},
		ReasonAliases:  []string{},
		Boundary:       "organization directory quality 只服务 Admin producer 排障，不是 gateway authorization facts，也不能证明 API/Gateway/Insight 成功。",
	}
	if normalized.OrganizationId == "" {
		return result, nil
	}
	snapshot, err := s.snapshotStore().GetGatewayProjectionSnapshot(normalized.OrganizationId)
	if err != nil {
		return nil, err
	}
	if snapshot == nil {
		snapshot = &GatewayProjectionSnapshot{}
	}
	items := buildOrganizationDirectoryQualityItems(snapshot, normalized)
	items = filterOrganizationDirectoryQualityItems(items, normalized)
	result.Total = len(items)
	result.Summary = summarizeOrganizationDirectoryQualityItems(items)
	result.ReasonAliases = collectOrganizationDirectoryQualityReasonAliases(items)
	result.Items = paginateOrganizationDirectoryQualityItems(items, normalized.Page, normalized.PageSize)
	return result, nil
}

func (s OrganizationDirectoryQualityService) snapshotStore() GatewayProjectionSnapshotStore {
	if s.Store != nil {
		return s.Store
	}
	return defaultGatewayProjectionSnapshotStore{}
}

func (s OrganizationDirectoryQualityService) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func normalizeOrganizationDirectoryQualityQuery(query OrganizationDirectoryQualityQuery) (OrganizationDirectoryQualityQuery, error) {
	query.OrganizationId = normalizeGatewayProjectionString(query.OrganizationId)
	query.EntityType = strings.ToLower(normalizeGatewayProjectionString(query.EntityType))
	if query.EntityType == "" {
		query.EntityType = OrganizationDirectoryQualityEntityDepartment
	}
	switch query.EntityType {
	case OrganizationDirectoryQualityEntityDepartment, OrganizationDirectoryQualityEntityUser, OrganizationDirectoryQualityEntityMembership:
	default:
		return query, fmt.Errorf("unsupported entityType: %s", query.EntityType)
	}
	query.QualityStatus = strings.ToLower(normalizeGatewayProjectionString(query.QualityStatus))
	if query.QualityStatus != "" && query.QualityStatus != OrganizationMasterDataQualityStatusReady && query.QualityStatus != OrganizationMasterDataQualityStatusWarning && query.QualityStatus != OrganizationMasterDataQualityStatusBlocked {
		return query, fmt.Errorf("unsupported qualityStatus: %s", query.QualityStatus)
	}
	query.Keyword = normalizeGatewayProjectionString(query.Keyword)
	query.SourceType = strings.ToLower(normalizeGatewayProjectionString(query.SourceType))
	query.SourceConnectionIdHash = normalizeGatewayProjectionString(query.SourceConnectionIdHash)
	query.ReasonCode = normalizeGatewayProjectionString(query.ReasonCode)
	query.LifecycleStatus = strings.ToUpper(normalizeGatewayProjectionString(query.LifecycleStatus))
	if query.Page < 0 {
		return query, errors.New("page must be greater than or equal to 1")
	}
	if query.Page == 0 {
		query.Page = 1
	}
	if query.PageSize < 0 {
		return query, errors.New("pageSize must be greater than or equal to 1")
	}
	if query.PageSize == 0 {
		query.PageSize = 20
	}
	if query.PageSize > 100 {
		query.PageSize = 100
	}
	return query, nil
}

func buildOrganizationDirectoryQualityItems(snapshot *GatewayProjectionSnapshot, query OrganizationDirectoryQualityQuery) []OrganizationDirectoryQualityItem {
	context := newOrganizationDirectoryQualityContext(snapshot, query.OrganizationId)
	switch query.EntityType {
	case OrganizationDirectoryQualityEntityDepartment:
		return context.departmentItems()
	case OrganizationDirectoryQualityEntityUser:
		return context.userItems()
	case OrganizationDirectoryQualityEntityMembership:
		return context.membershipItems()
	default:
		return []OrganizationDirectoryQualityItem{}
	}
}

type organizationDirectoryQualityContext struct {
	organizationID        string
	connectionsByID       map[string]SourceConnection
	departmentsByID       map[string]PlatformDepartment
	usersBySubject        map[string]PlatformUser
	apiMappingsBySubject  map[string]PlatformApiUserMapping
	externalBySubject     map[string]ExternalIdentity
	memberships           []PlatformMembership
	membershipCountByUser map[string]int
	duplicateDeptKeys     map[string]bool
	duplicateSubjects     map[string]bool
	syncBatch             *OrgSyncBatch
}

func newOrganizationDirectoryQualityContext(snapshot *GatewayProjectionSnapshot, organizationID string) organizationDirectoryQualityContext {
	ctx := organizationDirectoryQualityContext{
		organizationID:        organizationID,
		connectionsByID:       map[string]SourceConnection{},
		departmentsByID:       map[string]PlatformDepartment{},
		usersBySubject:        map[string]PlatformUser{},
		apiMappingsBySubject:  map[string]PlatformApiUserMapping{},
		externalBySubject:     map[string]ExternalIdentity{},
		memberships:           []PlatformMembership{},
		membershipCountByUser: map[string]int{},
		duplicateDeptKeys:     map[string]bool{},
		duplicateSubjects:     map[string]bool{},
		syncBatch:             snapshot.SyncBatch,
	}
	deptKeys := map[string]int{}
	subjects := map[string]int{}
	for _, connection := range snapshot.SourceConnections {
		if connection.OrganizationId == organizationID {
			ctx.connectionsByID[normalizeGatewayProjectionString(connection.SourceConnectionId)] = connection
		}
	}
	for _, department := range snapshot.Departments {
		if department.OrganizationId != organizationID {
			continue
		}
		ctx.departmentsByID[department.DepartmentId] = department
		key := organizationDirectoryQualityDepartmentSourceKey(department)
		if key != "" {
			deptKeys[key]++
		}
	}
	for _, user := range snapshot.Users {
		if user.OrganizationId != organizationID {
			continue
		}
		ctx.usersBySubject[user.AdminSubject] = user
		if user.AdminSubject != "" {
			subjects[user.AdminSubject]++
		}
	}
	for _, mapping := range snapshot.ApiUserMappings {
		if mapping.OrganizationId == organizationID {
			ctx.apiMappingsBySubject[mapping.AdminSubject] = mapping
		}
	}
	for _, identity := range snapshot.ExternalIdentities {
		if identity.OrganizationId == organizationID && identity.PlatformSubjectType == PlatformSubjectTypeUser {
			if _, ok := ctx.externalBySubject[identity.PlatformSubject]; !ok {
				ctx.externalBySubject[identity.PlatformSubject] = identity
			}
		}
	}
	for _, membership := range snapshot.Memberships {
		if membership.OrganizationId == organizationID {
			ctx.memberships = append(ctx.memberships, membership)
			ctx.membershipCountByUser[membership.AdminSubject]++
		}
	}
	for key, count := range deptKeys {
		if count > 1 {
			ctx.duplicateDeptKeys[key] = true
		}
	}
	for subject, count := range subjects {
		if count > 1 {
			ctx.duplicateSubjects[subject] = true
		}
	}
	return ctx
}

func (c organizationDirectoryQualityContext) departmentItems() []OrganizationDirectoryQualityItem {
	items := []OrganizationDirectoryQualityItem{}
	for _, department := range c.departmentsByID {
		connection := c.connectionsByID[normalizeGatewayProjectionString(department.SourceConnectionId)]
		item := OrganizationDirectoryQualityItem{
			EntityType:             OrganizationDirectoryQualityEntityDepartment,
			EntityId:               department.DepartmentId,
			DisplayName:            department.DisplayName,
			OrganizationId:         department.OrganizationId,
			SourceType:             connection.SourceType,
			SourceConnectionIdHash: organizationDirectoryQualityHash(department.SourceConnectionId),
			ExternalIdHash:         organizationDirectoryQualityHash(department.ExternalDepartmentId),
			SyncBatchId:            firstNonEmpty(connection.LastSeenBatchId, c.syncBatchID()),
			OrgVersion:             department.OrgVersion,
			SourceVersion:          c.syncBatchOrgVersion(),
			LifecycleStatus:        department.LifecycleStatus,
			ReasonCodes:            []string{},
			RemediationHints:       []string{},
			Detail: map[string]interface{}{
				"parentDepartmentId": department.ParentDepartmentId,
			},
		}
		if department.LifecycleStatus != "" && !strings.EqualFold(department.LifecycleStatus, PlatformLifecycleStatusActive) {
			item.addWarning(OrganizationMasterDataQualityReasonSubjectNotActive, "确认部门生命周期；非 ACTIVE 部门不会作为健康主数据进入下游。")
		}
		c.applySourceQuality(&item, department.SourceConnectionId)
		if normalizeGatewayProjectionString(department.ExternalDepartmentId) == "" {
			item.addBlocked(OrganizationMasterDataQualityReasonDepartmentSourceKeyMissing, "补齐部门外部 source key，避免使用展示名或路径作为 join key。")
		}
		if c.duplicateDeptKeys[organizationDirectoryQualityDepartmentSourceKey(department)] {
			item.addBlocked(OrganizationMasterDataQualityReasonDuplicateDepartmentSourceKey, "收敛重复 sourceConnectionId + externalDepartmentId。")
		}
		if department.ParentDepartmentId != "" {
			if parent, ok := c.departmentsByID[department.ParentDepartmentId]; !ok || !strings.EqualFold(parent.LifecycleStatus, PlatformLifecycleStatusActive) {
				item.addWarning(OrganizationMasterDataQualityReasonOrphanDepartment, "修复父部门缺口或生命周期，避免组织路径不可诊断。")
			}
		}
		item.finalizeQuality()
		items = append(items, item)
	}
	return sortOrganizationDirectoryQualityItems(items)
}

func (c organizationDirectoryQualityContext) userItems() []OrganizationDirectoryQualityItem {
	items := []OrganizationDirectoryQualityItem{}
	for _, user := range c.usersBySubject {
		identity := c.externalBySubject[user.AdminSubject]
		item := OrganizationDirectoryQualityItem{
			EntityType:             OrganizationDirectoryQualityEntityUser,
			EntityId:               user.AdminSubject,
			DisplayName:            user.DisplayName,
			OrganizationId:         user.OrganizationId,
			SourceConnectionIdHash: organizationDirectoryQualityHash(identity.SourceConnectionId),
			ExternalIdHash:         organizationDirectoryQualityHash(identity.ExternalSubjectId),
			SyncBatchId:            firstNonEmpty(user.LastSeenBatchId, identity.LastSeenBatchId, c.syncBatchID()),
			OrgVersion:             user.OrgVersion,
			SourceVersion:          c.syncBatchOrgVersion(),
			LifecycleStatus:        user.LifecycleStatus,
			ReasonCodes:            []string{},
			RemediationHints:       []string{},
			Detail: map[string]interface{}{
				"membershipCount": c.membershipCountByUser[user.AdminSubject],
				"mappingStatus":   user.MappingStatus,
			},
		}
		if connection, ok := c.connectionsByID[normalizeGatewayProjectionString(identity.SourceConnectionId)]; ok {
			item.SourceType = connection.SourceType
		}
		if normalizeGatewayProjectionString(user.AdminSubject) == "" {
			item.addBlocked(OrganizationMasterDataQualityReasonUserSourceKeyMissing, "补齐稳定 adminSubject；不得使用手机号、邮箱或展示名自动 join。")
		}
		if c.duplicateSubjects[user.AdminSubject] {
			item.addBlocked(OrganizationMasterDataQualityReasonDuplicateAdminSubject, "收敛同组织内重复 adminSubject。")
		}
		if user.LifecycleStatus != "" && !strings.EqualFold(user.LifecycleStatus, PlatformLifecycleStatusActive) {
			item.addWarning(OrganizationMasterDataQualityReasonSubjectNotActive, "确认用户生命周期；非 ACTIVE 用户只能作为 tombstone/诊断对象。")
		}
		c.applyUserMappingQuality(&item, user)
		if normalizeGatewayProjectionString(user.OrgVersion) == "" || normalizeGatewayProjectionString(user.LastSeenBatchId) == "" {
			item.addBlocked(OrganizationMasterDataQualityReasonLineageFreshnessUnavailable, "补齐用户 orgVersion 和 lastSeenBatchId lineage。")
		}
		item.finalizeQuality()
		items = append(items, item)
	}
	return sortOrganizationDirectoryQualityItems(items)
}

func (c organizationDirectoryQualityContext) membershipItems() []OrganizationDirectoryQualityItem {
	items := []OrganizationDirectoryQualityItem{}
	for _, membership := range c.membershipsForOrganization() {
		connection := c.connectionsByID[normalizeGatewayProjectionString(membership.SourceConnectionId)]
		entityID := membership.AdminSubject + "|" + membership.DepartmentId
		item := OrganizationDirectoryQualityItem{
			EntityType:             OrganizationDirectoryQualityEntityMembership,
			EntityId:               entityID,
			DisplayName:            entityID,
			OrganizationId:         membership.OrganizationId,
			SourceType:             connection.SourceType,
			SourceConnectionIdHash: organizationDirectoryQualityHash(membership.SourceConnectionId),
			SyncBatchId:            firstNonEmpty(connection.LastSeenBatchId, c.syncBatchID()),
			OrgVersion:             membership.OrgVersion,
			SourceVersion:          c.syncBatchOrgVersion(),
			LifecycleStatus:        membership.LifecycleStatus,
			ReasonCodes:            []string{},
			RemediationHints:       []string{},
			Detail: map[string]interface{}{
				"adminSubject": membership.AdminSubject,
				"departmentId": membership.DepartmentId,
				"isMain":       membership.IsMain,
				"isManager":    membership.IsManager,
			},
		}
		if membership.LifecycleStatus != "" && !strings.EqualFold(membership.LifecycleStatus, PlatformLifecycleStatusActive) {
			item.addWarning(OrganizationMasterDataQualityReasonSubjectNotActive, "确认 membership 生命周期；非 ACTIVE 关系不会作为健康成员关系。")
		}
		c.applySourceQuality(&item, membership.SourceConnectionId)
		if user, ok := c.usersBySubject[membership.AdminSubject]; !ok || !strings.EqualFold(user.LifecycleStatus, PlatformLifecycleStatusActive) {
			item.addBlocked(OrganizationMasterDataQualityReasonMembershipMissingUser, "补齐 active PlatformUser 或修复 membership.adminSubject。")
		}
		if department, ok := c.departmentsByID[membership.DepartmentId]; !ok || !strings.EqualFold(department.LifecycleStatus, PlatformLifecycleStatusActive) {
			item.addBlocked(OrganizationMasterDataQualityReasonMembershipMissingDepartment, "补齐 active PlatformDepartment 或修复 membership.departmentId。")
		}
		item.finalizeQuality()
		items = append(items, item)
	}
	return sortOrganizationDirectoryQualityItems(items)
}

func (c organizationDirectoryQualityContext) membershipsForOrganization() []PlatformMembership {
	return c.memberships
}

func (c organizationDirectoryQualityContext) applySourceQuality(item *OrganizationDirectoryQualityItem, sourceConnectionID string) {
	sourceConnectionID = normalizeGatewayProjectionString(sourceConnectionID)
	if sourceConnectionID == "" {
		item.addBlocked(OrganizationMasterDataQualityReasonSourceConnectionMissing, "补齐 sourceConnectionId，确保来源 lineage 可追踪。")
		return
	}
	connection, ok := c.connectionsByID[sourceConnectionID]
	if !ok {
		item.addBlocked(OrganizationMasterDataQualityReasonSourceConnectionMissing, "修复缺失的 SourceConnection。")
		return
	}
	switch connection.Status {
	case SourceConnectionStatusDisabled, SourceConnectionStatusError:
		item.addBlocked(OrganizationMasterDataQualityReasonSourceConnectionDisabled, "恢复或替换禁用/错误的 SourceConnection。")
	}
	switch connection.Freshness {
	case PlatformFreshnessUnavailable:
		item.addBlocked(OrganizationMasterDataQualityReasonSourceFreshnessUntrusted, "等待来源同步恢复可用后再消费该记录。")
	case PlatformFreshnessStale, PlatformFreshnessUnknown:
		item.addWarning(OrganizationMasterDataQualityReasonSourceFreshnessUntrusted, "等待来源 refresh 或确认 stale lineage。")
	}
}

func (c organizationDirectoryQualityContext) applyUserMappingQuality(item *OrganizationDirectoryQualityItem, user PlatformUser) {
	mapping, ok := c.apiMappingsBySubject[user.AdminSubject]
	if !ok || normalizeGatewayProjectionString(mapping.ApiUserId) == "" {
		item.addBlocked(OrganizationMasterDataQualityReasonMappingMissing, "补齐 confirmed PlatformApiUserMapping。")
		return
	}
	if !strings.EqualFold(mapping.MappingStatus, PlatformMappingStatusConfirmed) || !strings.EqualFold(user.MappingStatus, PlatformMappingStatusConfirmed) {
		item.addBlocked(OrganizationMasterDataQualityReasonMappingUntrusted, "收敛 PlatformUser 与 PlatformApiUserMapping 的 confirmed 状态。")
	}
}

func (c organizationDirectoryQualityContext) syncBatchID() string {
	if c.syncBatch == nil {
		return ""
	}
	return c.syncBatch.BatchId
}

func (c organizationDirectoryQualityContext) syncBatchOrgVersion() string {
	if c.syncBatch == nil {
		return ""
	}
	return c.syncBatch.OrgVersion
}

func (item *OrganizationDirectoryQualityItem) addBlocked(reason string, hint string) {
	item.ReasonCodes = appendUniqueOrganizationDirectoryQualityValue(item.ReasonCodes, reason)
	item.RemediationHints = appendUniqueOrganizationDirectoryQualityValue(item.RemediationHints, hint)
	item.QualityStatus = OrganizationMasterDataQualityStatusBlocked
}

func (item *OrganizationDirectoryQualityItem) addWarning(reason string, hint string) {
	item.ReasonCodes = appendUniqueOrganizationDirectoryQualityValue(item.ReasonCodes, reason)
	item.RemediationHints = appendUniqueOrganizationDirectoryQualityValue(item.RemediationHints, hint)
	if item.QualityStatus != OrganizationMasterDataQualityStatusBlocked {
		item.QualityStatus = OrganizationMasterDataQualityStatusWarning
	}
}

func (item *OrganizationDirectoryQualityItem) finalizeQuality() {
	if item.QualityStatus == "" {
		item.QualityStatus = OrganizationMasterDataQualityStatusReady
	}
	sort.Strings(item.ReasonCodes)
	sort.Strings(item.RemediationHints)
}

func filterOrganizationDirectoryQualityItems(items []OrganizationDirectoryQualityItem, query OrganizationDirectoryQualityQuery) []OrganizationDirectoryQualityItem {
	result := []OrganizationDirectoryQualityItem{}
	for _, item := range items {
		if query.Keyword != "" && !organizationDirectoryQualityMatchesKeyword(item, query.Keyword) {
			continue
		}
		if query.SourceType != "" && !strings.EqualFold(item.SourceType, query.SourceType) {
			continue
		}
		if query.SourceConnectionIdHash != "" && item.SourceConnectionIdHash != query.SourceConnectionIdHash {
			continue
		}
		if query.QualityStatus != "" && item.QualityStatus != query.QualityStatus {
			continue
		}
		if query.ReasonCode != "" && !organizationDirectoryQualityContainsString(item.ReasonCodes, query.ReasonCode) {
			continue
		}
		if query.LifecycleStatus != "" && !strings.EqualFold(item.LifecycleStatus, query.LifecycleStatus) {
			continue
		}
		result = append(result, item)
	}
	return result
}

func paginateOrganizationDirectoryQualityItems(items []OrganizationDirectoryQualityItem, page int, pageSize int) []OrganizationDirectoryQualityItem {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize
	if offset >= len(items) {
		return []OrganizationDirectoryQualityItem{}
	}
	end := offset + pageSize
	if end > len(items) {
		end = len(items)
	}
	return items[offset:end]
}

func summarizeOrganizationDirectoryQualityItems(items []OrganizationDirectoryQualityItem) OrganizationDirectoryQualitySummary {
	summary := OrganizationDirectoryQualitySummary{Total: len(items)}
	for _, item := range items {
		switch item.QualityStatus {
		case OrganizationMasterDataQualityStatusBlocked:
			summary.Blocked++
		case OrganizationMasterDataQualityStatusWarning:
			summary.Warning++
		default:
			summary.Ready++
		}
	}
	return summary
}

func collectOrganizationDirectoryQualityReasonAliases(items []OrganizationDirectoryQualityItem) []string {
	set := map[string]bool{}
	for _, item := range items {
		for _, reason := range item.ReasonCodes {
			set[reason] = true
		}
	}
	aliases := make([]string, 0, len(set))
	for reason := range set {
		aliases = append(aliases, reason)
	}
	sort.Strings(aliases)
	return aliases
}

func sortOrganizationDirectoryQualityItems(items []OrganizationDirectoryQualityItem) []OrganizationDirectoryQualityItem {
	sort.Slice(items, func(i, j int) bool {
		if items[i].QualityStatus != items[j].QualityStatus {
			return organizationDirectoryQualityStatusRank(items[i].QualityStatus) > organizationDirectoryQualityStatusRank(items[j].QualityStatus)
		}
		if items[i].EntityId != items[j].EntityId {
			return items[i].EntityId < items[j].EntityId
		}
		return items[i].DisplayName < items[j].DisplayName
	})
	return items
}

func organizationDirectoryQualityStatusRank(status string) int {
	switch status {
	case OrganizationMasterDataQualityStatusBlocked:
		return 3
	case OrganizationMasterDataQualityStatusWarning:
		return 2
	default:
		return 1
	}
}

func organizationDirectoryQualityMatchesKeyword(item OrganizationDirectoryQualityItem, keyword string) bool {
	keyword = strings.ToLower(strings.TrimSpace(keyword))
	if keyword == "" {
		return true
	}
	values := []string{item.EntityId, item.DisplayName, item.SourceType, item.SyncBatchId, item.OrgVersion, item.SourceVersion, item.LifecycleStatus, item.QualityStatus}
	for _, value := range values {
		if strings.Contains(strings.ToLower(value), keyword) {
			return true
		}
	}
	for _, reason := range item.ReasonCodes {
		if strings.Contains(strings.ToLower(reason), keyword) {
			return true
		}
	}
	return false
}

func organizationDirectoryQualityHash(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(value))
	return "sha256:" + hex.EncodeToString(sum[:])
}

func organizationDirectoryQualityDepartmentSourceKey(department PlatformDepartment) string {
	sourceConnectionID := normalizeGatewayProjectionString(department.SourceConnectionId)
	externalID := normalizeGatewayProjectionString(department.ExternalDepartmentId)
	if sourceConnectionID == "" || externalID == "" {
		return ""
	}
	return sourceConnectionID + "/" + externalID
}

func appendUniqueOrganizationDirectoryQualityValue(values []string, value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return values
	}
	if organizationDirectoryQualityContainsString(values, value) {
		return values
	}
	return append(values, value)
}

func organizationDirectoryQualityContainsString(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
