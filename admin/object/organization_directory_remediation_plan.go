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
	"fmt"
	"sort"
	"strings"
	"time"
)

const (
	OrganizationDirectoryRemediationActionSourceRefresh          = "source_refresh"
	OrganizationDirectoryRemediationActionBlockedByCredentials   = "blocked_by_credentials"
	OrganizationDirectoryRemediationActionMappingReview          = "mapping_review"
	OrganizationDirectoryRemediationActionIdentityConflictReview = "identity_conflict_review"
	OrganizationDirectoryRemediationActionLifecycleCleanup       = "lifecycle_cleanup"
	OrganizationDirectoryRemediationActionMembershipRepair       = "membership_repair"
	OrganizationDirectoryRemediationActionManualInvestigation    = "manual_investigation"

	OrganizationDirectoryRemediationPriorityP0 = "P0"
	OrganizationDirectoryRemediationPriorityP1 = "P1"
	OrganizationDirectoryRemediationPriorityP2 = "P2"
	OrganizationDirectoryRemediationPriorityP3 = "P3"
)

const organizationDirectoryRemediationBoundary = "organization directory remediation plan 是 Admin producer 只读诊断；不会执行修复、写 gateway facts、触发 projection publish 或读取 API/Gateway/Insight 内部库。"

// OrganizationDirectoryRemediationPlanQuery 限定只读 remediation plan 的组织范围和质量筛选条件。
type OrganizationDirectoryRemediationPlanQuery struct {
	OrganizationId         string
	EntityType             string
	Keyword                string
	SourceType             string
	SourceConnectionIdHash string
	QualityStatus          string
	ReasonCode             string
	LifecycleStatus        string
	Limit                  int
	TopN                   int
}

// OrganizationDirectoryRemediationPlanResult 是面向 operator 的脱敏修复计划摘要。
type OrganizationDirectoryRemediationPlanResult struct {
	OrganizationId string                                      `json:"organizationId"`
	GeneratedAt    time.Time                                   `json:"generatedAt"`
	Filters        OrganizationDirectoryRemediationPlanFilters `json:"filters"`
	TotalPlanCount int                                         `json:"totalPlanCount"`
	Plans          []OrganizationDirectoryRemediationPlan      `json:"plans"`
	ExportSummary  OrganizationDirectoryRemediationExport      `json:"exportSummary"`
	Boundary       string                                      `json:"boundary"`
}

// OrganizationDirectoryRemediationPlanFilters 回显本次 plan 聚合使用的脱敏查询条件。
type OrganizationDirectoryRemediationPlanFilters struct {
	EntityType             string `json:"entityType,omitempty"`
	Keyword                string `json:"keyword,omitempty"`
	SourceType             string `json:"sourceType,omitempty"`
	SourceConnectionIdHash string `json:"sourceConnectionIdHash,omitempty"`
	QualityStatus          string `json:"qualityStatus,omitempty"`
	ReasonCode             string `json:"reasonCode,omitempty"`
	LifecycleStatus        string `json:"lifecycleStatus,omitempty"`
	Limit                  int    `json:"limit"`
	TopN                   int    `json:"topN"`
}

// OrganizationDirectoryRemediationPlan 表示同一 action alias 下的一组待处理质量问题。
type OrganizationDirectoryRemediationPlan struct {
	PlanId             string                                 `json:"planId"`
	PlanKey            string                                 `json:"planKey"`
	Priority           string                                 `json:"priority"`
	ActionAlias        string                                 `json:"actionAlias"`
	ReasonCodes        []string                               `json:"reasonCodes"`
	AffectedCounts     OrganizationDirectoryRemediationCounts `json:"affectedCounts"`
	SampleEntityIds    []string                               `json:"sampleEntityIds"`
	SampleEntityHashes []string                               `json:"sampleEntityHashes"`
	SourceVersions     []string                               `json:"sourceVersions"`
	OrgVersions        []string                               `json:"orgVersions"`
	SafeSummary        string                                 `json:"safeSummary"`
	OperatorActions    []string                               `json:"operatorActions"`
	BlockedReason      string                                 `json:"blockedReason,omitempty"`
}

// OrganizationDirectoryRemediationCounts 记录 remediation plan 影响的 Admin 主模型实体数量。
type OrganizationDirectoryRemediationCounts struct {
	Department int `json:"department"`
	User       int `json:"user"`
	Membership int `json:"membership"`
	Total      int `json:"total"`
}

// OrganizationDirectoryRemediationExport 是前端可直接下载的脱敏 plan 摘要。
type OrganizationDirectoryRemediationExport struct {
	GeneratedAt time.Time                                    `json:"generatedAt"`
	Boundary    string                                       `json:"boundary"`
	Plans       []OrganizationDirectoryRemediationExportPlan `json:"plans"`
}

// OrganizationDirectoryRemediationExportPlan 只保留跨团队协作所需的安全字段。
type OrganizationDirectoryRemediationExportPlan struct {
	PlanKey            string                                 `json:"planKey"`
	Priority           string                                 `json:"priority"`
	ActionAlias        string                                 `json:"actionAlias"`
	ReasonCodes        []string                               `json:"reasonCodes"`
	AffectedCounts     OrganizationDirectoryRemediationCounts `json:"affectedCounts"`
	SampleEntityIds    []string                               `json:"sampleEntityIds"`
	SampleEntityHashes []string                               `json:"sampleEntityHashes"`
	SourceVersions     []string                               `json:"sourceVersions"`
	OrgVersions        []string                               `json:"orgVersions"`
	SafeSummary        string                                 `json:"safeSummary"`
	OperatorActions    []string                               `json:"operatorActions"`
	BlockedReason      string                                 `json:"blockedReason,omitempty"`
}

// OrganizationDirectoryRemediationPlanService 基于 Admin 目录质量 read model 聚合只读修复计划。
type OrganizationDirectoryRemediationPlanService struct {
	QualityService OrganizationDirectoryQualityService
	Now            func() time.Time
}

// GetOrganizationDirectoryRemediationPlan 使用默认只读服务生成组织目录 remediation plan。
func GetOrganizationDirectoryRemediationPlan(query OrganizationDirectoryRemediationPlanQuery) (*OrganizationDirectoryRemediationPlanResult, error) {
	return (OrganizationDirectoryRemediationPlanService{}).GetPlan(query)
}

// GetPlan 只读取 Admin-owned 目录质量结果并聚合 operator plan，不执行任何修复或下游写入。
func (s OrganizationDirectoryRemediationPlanService) GetPlan(query OrganizationDirectoryRemediationPlanQuery) (*OrganizationDirectoryRemediationPlanResult, error) {
	normalized, err := normalizeOrganizationDirectoryRemediationPlanQuery(query)
	if err != nil {
		return nil, err
	}
	result := &OrganizationDirectoryRemediationPlanResult{
		OrganizationId: normalized.OrganizationId,
		GeneratedAt:    s.now().UTC(),
		Filters:        newOrganizationDirectoryRemediationPlanFilters(normalized),
		Plans:          []OrganizationDirectoryRemediationPlan{},
		Boundary:       organizationDirectoryRemediationBoundary,
	}
	if normalized.OrganizationId == "" || normalized.QualityStatus == OrganizationMasterDataQualityStatusReady {
		result.ExportSummary = newOrganizationDirectoryRemediationExport(result.GeneratedAt, result.Plans)
		return result, nil
	}

	accumulators := map[string]*organizationDirectoryRemediationAccumulator{}
	for _, entityType := range organizationDirectoryRemediationEntityTypes(normalized.EntityType) {
		directory, err := s.qualityService().GetDirectory(OrganizationDirectoryQualityQuery{
			OrganizationId:         normalized.OrganizationId,
			EntityType:             entityType,
			Keyword:                normalized.Keyword,
			SourceType:             normalized.SourceType,
			SourceConnectionIdHash: normalized.SourceConnectionIdHash,
			QualityStatus:          normalized.QualityStatus,
			ReasonCode:             normalized.ReasonCode,
			LifecycleStatus:        normalized.LifecycleStatus,
			Page:                   1,
			PageSize:               normalized.Limit,
		})
		if err != nil {
			return nil, err
		}
		for _, item := range directory.Items {
			if item.QualityStatus == OrganizationMasterDataQualityStatusReady {
				continue
			}
			addOrganizationDirectoryRemediationItem(accumulators, item, normalized.Limit)
		}
	}

	plans := make([]OrganizationDirectoryRemediationPlan, 0, len(accumulators))
	for _, accumulator := range accumulators {
		plans = append(plans, accumulator.plan())
	}
	sortOrganizationDirectoryRemediationPlans(plans)
	result.TotalPlanCount = len(plans)
	if len(plans) > normalized.TopN {
		plans = plans[:normalized.TopN]
	}
	result.Plans = plans
	result.ExportSummary = newOrganizationDirectoryRemediationExport(result.GeneratedAt, plans)
	return result, nil
}

func (s OrganizationDirectoryRemediationPlanService) qualityService() OrganizationDirectoryQualityService {
	service := s.QualityService
	if service.Now == nil {
		service.Now = s.Now
	}
	return service
}

func (s OrganizationDirectoryRemediationPlanService) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func normalizeOrganizationDirectoryRemediationPlanQuery(query OrganizationDirectoryRemediationPlanQuery) (OrganizationDirectoryRemediationPlanQuery, error) {
	query.OrganizationId = normalizeGatewayProjectionString(query.OrganizationId)
	query.EntityType = strings.ToLower(normalizeGatewayProjectionString(query.EntityType))
	switch query.EntityType {
	case "", OrganizationDirectoryQualityEntityDepartment, OrganizationDirectoryQualityEntityUser, OrganizationDirectoryQualityEntityMembership:
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
	if query.Limit < 0 {
		return query, errors.New("limit must be greater than or equal to 1")
	}
	if query.Limit == 0 {
		query.Limit = 20
	}
	if query.Limit > 100 {
		return query, errors.New("limit must be less than or equal to 100")
	}
	if query.TopN < 0 {
		return query, errors.New("topN must be greater than or equal to 1")
	}
	if query.TopN == 0 {
		query.TopN = 20
	}
	if query.TopN > 100 {
		return query, errors.New("topN must be less than or equal to 100")
	}
	return query, nil
}

func newOrganizationDirectoryRemediationPlanFilters(query OrganizationDirectoryRemediationPlanQuery) OrganizationDirectoryRemediationPlanFilters {
	return OrganizationDirectoryRemediationPlanFilters{
		EntityType:             query.EntityType,
		Keyword:                query.Keyword,
		SourceType:             query.SourceType,
		SourceConnectionIdHash: query.SourceConnectionIdHash,
		QualityStatus:          query.QualityStatus,
		ReasonCode:             query.ReasonCode,
		LifecycleStatus:        query.LifecycleStatus,
		Limit:                  query.Limit,
		TopN:                   query.TopN,
	}
}

func organizationDirectoryRemediationEntityTypes(entityType string) []string {
	if entityType != "" {
		return []string{entityType}
	}
	return []string{
		OrganizationDirectoryQualityEntityDepartment,
		OrganizationDirectoryQualityEntityUser,
		OrganizationDirectoryQualityEntityMembership,
	}
}

type organizationDirectoryRemediationAccumulator struct {
	actionAlias        string
	priority           string
	reasonCodes        map[string]bool
	affectedCounts     OrganizationDirectoryRemediationCounts
	sampleEntityIds    []string
	sampleEntityHashes []string
	sourceVersions     map[string]bool
	orgVersions        map[string]bool
	seenEntities       map[string]bool
}

func addOrganizationDirectoryRemediationItem(accumulators map[string]*organizationDirectoryRemediationAccumulator, item OrganizationDirectoryQualityItem, limit int) {
	seenActionForItem := map[string]bool{}
	for _, reasonCode := range item.ReasonCodes {
		actionAlias := organizationDirectoryRemediationActionAlias(reasonCode)
		accumulator := accumulators[actionAlias]
		if accumulator == nil {
			accumulator = &organizationDirectoryRemediationAccumulator{
				actionAlias:    actionAlias,
				priority:       OrganizationDirectoryRemediationPriorityP3,
				reasonCodes:    map[string]bool{},
				sourceVersions: map[string]bool{},
				orgVersions:    map[string]bool{},
				seenEntities:   map[string]bool{},
			}
			accumulators[actionAlias] = accumulator
		}
		accumulator.reasonCodes[reasonCode] = true
		candidatePriority := organizationDirectoryRemediationPriority(reasonCode, item)
		if organizationDirectoryRemediationPriorityRank(candidatePriority) < organizationDirectoryRemediationPriorityRank(accumulator.priority) {
			accumulator.priority = candidatePriority
		}
		if seenActionForItem[actionAlias] {
			continue
		}
		seenActionForItem[actionAlias] = true
		accumulator.addItem(item, limit)
	}
}

func (a *organizationDirectoryRemediationAccumulator) addItem(item OrganizationDirectoryQualityItem, limit int) {
	entityKey := item.EntityType + ":" + item.EntityId
	if a.seenEntities[entityKey] {
		return
	}
	a.seenEntities[entityKey] = true
	switch item.EntityType {
	case OrganizationDirectoryQualityEntityDepartment:
		a.affectedCounts.Department++
	case OrganizationDirectoryQualityEntityUser:
		a.affectedCounts.User++
	case OrganizationDirectoryQualityEntityMembership:
		a.affectedCounts.Membership++
	}
	a.affectedCounts.Total++
	sampleHash := organizationDirectoryQualityHash(entityKey)
	if len(a.sampleEntityHashes) < organizationDirectoryRemediationSampleLimit(limit) {
		a.sampleEntityIds = append(a.sampleEntityIds, item.EntityType+":"+sampleHash)
		a.sampleEntityHashes = append(a.sampleEntityHashes, sampleHash)
	}
	if item.SourceVersion != "" {
		a.sourceVersions[item.SourceVersion] = true
	}
	if item.OrgVersion != "" {
		a.orgVersions[item.OrgVersion] = true
	}
}

func (a *organizationDirectoryRemediationAccumulator) plan() OrganizationDirectoryRemediationPlan {
	reasonCodes := organizationDirectoryRemediationSortedKeys(a.reasonCodes)
	sourceVersions := organizationDirectoryRemediationSortedKeys(a.sourceVersions)
	orgVersions := organizationDirectoryRemediationSortedKeys(a.orgVersions)
	summary, actions, blockedReason := organizationDirectoryRemediationOperatorText(a.actionAlias, a.priority)
	return OrganizationDirectoryRemediationPlan{
		PlanId:             organizationDirectoryQualityHash(a.actionAlias + "|" + strings.Join(reasonCodes, ",")),
		PlanKey:            a.actionAlias,
		Priority:           a.priority,
		ActionAlias:        a.actionAlias,
		ReasonCodes:        reasonCodes,
		AffectedCounts:     a.affectedCounts,
		SampleEntityIds:    append([]string{}, a.sampleEntityIds...),
		SampleEntityHashes: append([]string{}, a.sampleEntityHashes...),
		SourceVersions:     sourceVersions,
		OrgVersions:        orgVersions,
		SafeSummary:        summary,
		OperatorActions:    actions,
		BlockedReason:      blockedReason,
	}
}

func organizationDirectoryRemediationActionAlias(reasonCode string) string {
	switch reasonCode {
	case OrganizationMasterDataQualityReasonSourceFreshnessUntrusted,
		OrganizationMasterDataQualityReasonSyncLineageMissing,
		OrganizationMasterDataQualityReasonLineageFreshnessUnavailable:
		return OrganizationDirectoryRemediationActionSourceRefresh
	case OrganizationMasterDataQualityReasonSourceConnectionMissing,
		OrganizationMasterDataQualityReasonSourceConnectionDisabled:
		return OrganizationDirectoryRemediationActionBlockedByCredentials
	case OrganizationMasterDataQualityReasonMappingMissing,
		OrganizationMasterDataQualityReasonMappingUntrusted:
		return OrganizationDirectoryRemediationActionMappingReview
	case OrganizationMasterDataQualityReasonDuplicateAdminSubject,
		OrganizationMasterDataQualityReasonDuplicateDepartmentSourceKey,
		OrganizationMasterDataQualityReasonDuplicateSourceConnection:
		return OrganizationDirectoryRemediationActionIdentityConflictReview
	case OrganizationMasterDataQualityReasonSubjectNotActive:
		return OrganizationDirectoryRemediationActionLifecycleCleanup
	case OrganizationMasterDataQualityReasonMembershipMissingUser,
		OrganizationMasterDataQualityReasonMembershipMissingDepartment,
		OrganizationMasterDataQualityReasonOrphanDepartment:
		return OrganizationDirectoryRemediationActionMembershipRepair
	default:
		return OrganizationDirectoryRemediationActionManualInvestigation
	}
}

func organizationDirectoryRemediationPriority(reasonCode string, item OrganizationDirectoryQualityItem) string {
	switch organizationDirectoryRemediationActionAlias(reasonCode) {
	case OrganizationDirectoryRemediationActionBlockedByCredentials, OrganizationDirectoryRemediationActionIdentityConflictReview:
		return OrganizationDirectoryRemediationPriorityP0
	case OrganizationDirectoryRemediationActionMappingReview, OrganizationDirectoryRemediationActionMembershipRepair:
		return OrganizationDirectoryRemediationPriorityP1
	case OrganizationDirectoryRemediationActionSourceRefresh:
		if item.QualityStatus == OrganizationMasterDataQualityStatusBlocked || reasonCode == OrganizationMasterDataQualityReasonLineageFreshnessUnavailable || reasonCode == OrganizationMasterDataQualityReasonSyncLineageMissing {
			return OrganizationDirectoryRemediationPriorityP1
		}
		return OrganizationDirectoryRemediationPriorityP2
	case OrganizationDirectoryRemediationActionLifecycleCleanup:
		return OrganizationDirectoryRemediationPriorityP2
	default:
		return OrganizationDirectoryRemediationPriorityP3
	}
}

func organizationDirectoryRemediationOperatorText(actionAlias string, priority string) (string, []string, string) {
	switch actionAlias {
	case OrganizationDirectoryRemediationActionBlockedByCredentials:
		return "SourceConnection 凭据、状态或连接缺失阻断目录质量，需先恢复可信来源连接。", []string{"检查 SourceConnection 状态和凭据引用", "恢复来源连接后重新运行目录质量查询"}, "source connection unavailable"
	case OrganizationDirectoryRemediationActionIdentityConflictReview:
		return "存在重复主体或重复来源键，继续下游消费前需要先收敛唯一性。", []string{"定位重复 adminSubject/source key", "保留一个稳定主键并修正其余记录"}, "identity conflict blocks deterministic projection"
	case OrganizationDirectoryRemediationActionMappingReview:
		return "用户到 API 主体的一等映射缺失或不可信，需要 mapping owner 确认。", []string{"补齐 confirmed PlatformApiUserMapping", "复核 PENDING、DUPLICATE 或 CONFLICTED 映射"}, ""
	case OrganizationDirectoryRemediationActionMembershipRepair:
		return "成员关系或部门父子引用缺少 active 端点，需先修复 source 主数据关系。", []string{"补齐 active PlatformUser/PlatformDepartment", "修复 membership adminSubject、departmentId 或父部门引用"}, ""
	case OrganizationDirectoryRemediationActionSourceRefresh:
		if priority == OrganizationDirectoryRemediationPriorityP1 {
			return "来源 lineage 或 freshness 不可用，需等待或恢复 source refresh 后再判断。", []string{"检查最近一次 source refresh 批次", "确认 orgVersion、lastSeenBatchId 和 freshness"}, "source lineage unavailable"
		}
		return "来源 freshness 过期或未知，建议等待 refresh 或确认来源快照版本。", []string{"等待下一次 source refresh", "对照 source/org version 后再重试质量判断"}, ""
	case OrganizationDirectoryRemediationActionLifecycleCleanup:
		return "存在非 ACTIVE 主体或关系，只能作为 tombstone/诊断对象处理。", []string{"确认 lifecycle 状态是否符合预期", "清理或恢复需要进入 active scope 的对象"}, ""
	default:
		return "存在尚未归类的 blocked/warning 质量原因，需要人工排查。", []string{"查看 reason code 和脱敏样例", "按 Admin 主数据 owner 边界定位数据来源"}, ""
	}
}

func sortOrganizationDirectoryRemediationPlans(plans []OrganizationDirectoryRemediationPlan) {
	sort.Slice(plans, func(i, j int) bool {
		if plans[i].Priority != plans[j].Priority {
			return organizationDirectoryRemediationPriorityRank(plans[i].Priority) < organizationDirectoryRemediationPriorityRank(plans[j].Priority)
		}
		if plans[i].AffectedCounts.Total != plans[j].AffectedCounts.Total {
			return plans[i].AffectedCounts.Total > plans[j].AffectedCounts.Total
		}
		return plans[i].ActionAlias < plans[j].ActionAlias
	})
}

func organizationDirectoryRemediationPriorityRank(priority string) int {
	switch priority {
	case OrganizationDirectoryRemediationPriorityP0:
		return 0
	case OrganizationDirectoryRemediationPriorityP1:
		return 1
	case OrganizationDirectoryRemediationPriorityP2:
		return 2
	default:
		return 3
	}
}

func organizationDirectoryRemediationSortedKeys(values map[string]bool) []string {
	result := make([]string, 0, len(values))
	for value := range values {
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}

func organizationDirectoryRemediationSampleLimit(limit int) int {
	if limit <= 0 || limit > 5 {
		return 5
	}
	return limit
}

func newOrganizationDirectoryRemediationExport(generatedAt time.Time, plans []OrganizationDirectoryRemediationPlan) OrganizationDirectoryRemediationExport {
	export := OrganizationDirectoryRemediationExport{
		GeneratedAt: generatedAt,
		Boundary:    organizationDirectoryRemediationBoundary,
		Plans:       []OrganizationDirectoryRemediationExportPlan{},
	}
	for _, plan := range plans {
		export.Plans = append(export.Plans, OrganizationDirectoryRemediationExportPlan{
			PlanKey:            plan.PlanKey,
			Priority:           plan.Priority,
			ActionAlias:        plan.ActionAlias,
			ReasonCodes:        append([]string{}, plan.ReasonCodes...),
			AffectedCounts:     plan.AffectedCounts,
			SampleEntityIds:    append([]string{}, plan.SampleEntityIds...),
			SampleEntityHashes: append([]string{}, plan.SampleEntityHashes...),
			SourceVersions:     append([]string{}, plan.SourceVersions...),
			OrgVersions:        append([]string{}, plan.OrgVersions...),
			SafeSummary:        plan.SafeSummary,
			OperatorActions:    append([]string{}, plan.OperatorActions...),
			BlockedReason:      plan.BlockedReason,
		})
	}
	return export
}
