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
	OrganizationDirectoryRemediationExecutionManualReviewOnly = "manual_review_only"
)

// OrganizationDirectoryRemediationActionDraftQuery 限定只读 remediation action draft 的组织范围和筛选条件。
type OrganizationDirectoryRemediationActionDraftQuery struct {
	OrganizationId         string
	ActionAlias            string
	EntityType             string
	Keyword                string
	SourceType             string
	SourceConnectionIdHash string
	QualityStatus          string
	ReasonCode             string
	Limit                  int
	TopN                   int
}

// OrganizationDirectoryRemediationActionDraftResult 是面向 operator 的脱敏修复草案响应。
type OrganizationDirectoryRemediationActionDraftResult struct {
	OrganizationId  string                                             `json:"organizationId"`
	GeneratedAt     time.Time                                          `json:"generatedAt"`
	Filters         OrganizationDirectoryRemediationActionDraftFilters `json:"filters"`
	TotalDraftCount int                                                `json:"totalDraftCount"`
	Drafts          []OrganizationDirectoryRemediationActionDraft      `json:"drafts"`
	ExportSummary   OrganizationDirectoryRemediationActionDraftExport  `json:"exportSummary"`
	Boundary        string                                             `json:"boundary"`
}

// OrganizationDirectoryRemediationActionDraftFilters 回显本次草案生成使用的安全筛选条件。
type OrganizationDirectoryRemediationActionDraftFilters struct {
	ActionAlias            string `json:"actionAlias,omitempty"`
	EntityType             string `json:"entityType,omitempty"`
	Keyword                string `json:"keyword,omitempty"`
	SourceType             string `json:"sourceType,omitempty"`
	SourceConnectionIdHash string `json:"sourceConnectionIdHash,omitempty"`
	QualityStatus          string `json:"qualityStatus,omitempty"`
	ReasonCode             string `json:"reasonCode,omitempty"`
	Limit                  int    `json:"limit"`
	TopN                   int    `json:"topN"`
}

// OrganizationDirectoryRemediationActionDraft 表示某类 action 在某类实体上的人工复核草案。
type OrganizationDirectoryRemediationActionDraft struct {
	DraftId       string                                              `json:"draftId"`
	ActionAlias   string                                              `json:"actionAlias"`
	Priority      string                                              `json:"priority"`
	EntityType    string                                              `json:"entityType"`
	AffectedCount int                                                 `json:"affectedCount"`
	SafeSummary   string                                              `json:"safeSummary"`
	BlockedReason string                                              `json:"blockedReason,omitempty"`
	Preconditions []string                                            `json:"preconditions"`
	OperatorSteps []string                                            `json:"operatorSteps"`
	ExecutionMode string                                              `json:"executionMode"`
	Samples       []OrganizationDirectoryRemediationActionDraftSample `json:"samples"`
}

// OrganizationDirectoryRemediationActionDraftSample 是可复制/导出的单条脱敏样例。
type OrganizationDirectoryRemediationActionDraftSample struct {
	EntityHash             string   `json:"entityHash"`
	DisplaySafeLabel       string   `json:"displaySafeLabel"`
	EntityType             string   `json:"entityType"`
	SourceType             string   `json:"sourceType,omitempty"`
	QualityStatus          string   `json:"qualityStatus"`
	ReasonCodes            []string `json:"reasonCodes"`
	LifecycleStatus        string   `json:"lifecycleStatus,omitempty"`
	SourceConnectionIdHash string   `json:"sourceConnectionIdHash,omitempty"`
	OrgVersion             string   `json:"orgVersion,omitempty"`
	SourceVersion          string   `json:"sourceVersion,omitempty"`
}

// OrganizationDirectoryRemediationActionDraftExport 是前端下载使用的脱敏草案摘要。
type OrganizationDirectoryRemediationActionDraftExport struct {
	GeneratedAt time.Time                                     `json:"generatedAt"`
	Boundary    string                                        `json:"boundary"`
	Drafts      []OrganizationDirectoryRemediationActionDraft `json:"drafts"`
}

// OrganizationDirectoryRemediationActionDraftService 基于 Admin 目录质量 read model 生成只读修复草案。
type OrganizationDirectoryRemediationActionDraftService struct {
	QualityService OrganizationDirectoryQualityService
	Now            func() time.Time
}

// GetOrganizationDirectoryRemediationActionDrafts 使用默认只读服务生成 remediation action drafts。
func GetOrganizationDirectoryRemediationActionDrafts(query OrganizationDirectoryRemediationActionDraftQuery) (*OrganizationDirectoryRemediationActionDraftResult, error) {
	return (OrganizationDirectoryRemediationActionDraftService{}).GetActionDrafts(query)
}

// GetActionDrafts 只生成 manual_review_only 草案，不执行修复、不写入 Admin/Gateway/下游系统。
func (s OrganizationDirectoryRemediationActionDraftService) GetActionDrafts(query OrganizationDirectoryRemediationActionDraftQuery) (*OrganizationDirectoryRemediationActionDraftResult, error) {
	normalized, err := normalizeOrganizationDirectoryRemediationActionDraftQuery(query)
	if err != nil {
		return nil, err
	}
	result := &OrganizationDirectoryRemediationActionDraftResult{
		OrganizationId: normalized.OrganizationId,
		GeneratedAt:    s.now().UTC(),
		Filters:        newOrganizationDirectoryRemediationActionDraftFilters(normalized),
		Drafts:         []OrganizationDirectoryRemediationActionDraft{},
		Boundary:       organizationDirectoryRemediationBoundary,
	}
	if normalized.OrganizationId == "" || normalized.QualityStatus == OrganizationMasterDataQualityStatusReady {
		result.ExportSummary = newOrganizationDirectoryRemediationActionDraftExport(result.GeneratedAt, result.Drafts)
		return result, nil
	}

	builders := map[string]*organizationDirectoryRemediationActionDraftBuilder{}
	for _, entityType := range organizationDirectoryRemediationEntityTypes(normalized.EntityType) {
		directory, err := s.qualityService().GetDirectory(OrganizationDirectoryQualityQuery{
			OrganizationId:         normalized.OrganizationId,
			EntityType:             entityType,
			Keyword:                normalized.Keyword,
			SourceType:             normalized.SourceType,
			SourceConnectionIdHash: normalized.SourceConnectionIdHash,
			QualityStatus:          normalized.QualityStatus,
			ReasonCode:             normalized.ReasonCode,
			Page:                   1,
			PageSize:               normalized.Limit,
		})
		if err != nil {
			return nil, err
		}
		for _, item := range directory.Items {
			addOrganizationDirectoryRemediationActionDraftItem(builders, item, normalized)
		}
	}

	drafts := make([]OrganizationDirectoryRemediationActionDraft, 0, len(builders))
	for _, builder := range builders {
		drafts = append(drafts, builder.draft(normalized.Limit))
	}
	sortOrganizationDirectoryRemediationActionDrafts(drafts)
	result.TotalDraftCount = len(drafts)
	if len(drafts) > normalized.TopN {
		drafts = drafts[:normalized.TopN]
	}
	result.Drafts = drafts
	result.ExportSummary = newOrganizationDirectoryRemediationActionDraftExport(result.GeneratedAt, drafts)
	return result, nil
}

func (s OrganizationDirectoryRemediationActionDraftService) qualityService() OrganizationDirectoryQualityService {
	service := s.QualityService
	if service.Now == nil {
		service.Now = s.Now
	}
	return service
}

func (s OrganizationDirectoryRemediationActionDraftService) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func normalizeOrganizationDirectoryRemediationActionDraftQuery(query OrganizationDirectoryRemediationActionDraftQuery) (OrganizationDirectoryRemediationActionDraftQuery, error) {
	query.OrganizationId = normalizeGatewayProjectionString(query.OrganizationId)
	query.ActionAlias = normalizeGatewayProjectionString(query.ActionAlias)
	if query.ActionAlias != "" && !organizationDirectoryRemediationActionAliasSupported(query.ActionAlias) {
		return query, fmt.Errorf("unsupported actionAlias: %s", query.ActionAlias)
	}
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

func newOrganizationDirectoryRemediationActionDraftFilters(query OrganizationDirectoryRemediationActionDraftQuery) OrganizationDirectoryRemediationActionDraftFilters {
	return OrganizationDirectoryRemediationActionDraftFilters{
		ActionAlias:            query.ActionAlias,
		EntityType:             query.EntityType,
		Keyword:                query.Keyword,
		SourceType:             query.SourceType,
		SourceConnectionIdHash: query.SourceConnectionIdHash,
		QualityStatus:          query.QualityStatus,
		ReasonCode:             query.ReasonCode,
		Limit:                  query.Limit,
		TopN:                   query.TopN,
	}
}

func organizationDirectoryRemediationActionAliasSupported(actionAlias string) bool {
	switch actionAlias {
	case OrganizationDirectoryRemediationActionSourceRefresh,
		OrganizationDirectoryRemediationActionBlockedByCredentials,
		OrganizationDirectoryRemediationActionMappingReview,
		OrganizationDirectoryRemediationActionIdentityConflictReview,
		OrganizationDirectoryRemediationActionLifecycleCleanup,
		OrganizationDirectoryRemediationActionMembershipRepair,
		OrganizationDirectoryRemediationActionManualInvestigation:
		return true
	default:
		return false
	}
}

type organizationDirectoryRemediationActionDraftBuilder struct {
	actionAlias string
	priority    string
	entityType  string
	reasonCodes map[string]bool
	items       []OrganizationDirectoryQualityItem
	seenItems   map[string]bool
}

func addOrganizationDirectoryRemediationActionDraftItem(builders map[string]*organizationDirectoryRemediationActionDraftBuilder, item OrganizationDirectoryQualityItem, query OrganizationDirectoryRemediationActionDraftQuery) {
	seenActionForItem := map[string]bool{}
	for _, reasonCode := range item.ReasonCodes {
		actionAlias := organizationDirectoryRemediationActionAlias(reasonCode)
		if query.ActionAlias != "" && actionAlias != query.ActionAlias {
			continue
		}
		if query.ReasonCode != "" && reasonCode != query.ReasonCode {
			continue
		}
		if seenActionForItem[actionAlias] {
			continue
		}
		seenActionForItem[actionAlias] = true
		key := actionAlias + ":" + item.EntityType
		builder := builders[key]
		if builder == nil {
			builder = &organizationDirectoryRemediationActionDraftBuilder{
				actionAlias: actionAlias,
				priority:    OrganizationDirectoryRemediationPriorityP3,
				entityType:  item.EntityType,
				reasonCodes: map[string]bool{},
				seenItems:   map[string]bool{},
			}
			builders[key] = builder
		}
		for _, itemReasonCode := range item.ReasonCodes {
			if organizationDirectoryRemediationActionAlias(itemReasonCode) == actionAlias {
				builder.reasonCodes[itemReasonCode] = true
			}
		}
		candidatePriority := organizationDirectoryRemediationPriority(reasonCode, item)
		if organizationDirectoryRemediationPriorityRank(candidatePriority) < organizationDirectoryRemediationPriorityRank(builder.priority) {
			builder.priority = candidatePriority
		}
		itemKey := item.EntityType + ":" + item.EntityId
		if !builder.seenItems[itemKey] {
			builder.seenItems[itemKey] = true
			builder.items = append(builder.items, item)
		}
	}
}

func (b *organizationDirectoryRemediationActionDraftBuilder) draft(limit int) OrganizationDirectoryRemediationActionDraft {
	reasonCodes := organizationDirectoryRemediationSortedKeys(b.reasonCodes)
	summary, steps, blockedReason := organizationDirectoryRemediationOperatorText(b.actionAlias, b.priority)
	preconditions := organizationDirectoryRemediationActionDraftPreconditions(b.actionAlias)
	samples := make([]OrganizationDirectoryRemediationActionDraftSample, 0, organizationDirectoryRemediationSampleLimit(limit))
	for _, item := range b.items {
		if len(samples) >= organizationDirectoryRemediationSampleLimit(limit) {
			break
		}
		samples = append(samples, newOrganizationDirectoryRemediationActionDraftSample(item))
	}
	return OrganizationDirectoryRemediationActionDraft{
		DraftId:       organizationDirectoryQualityHash(b.actionAlias + "|" + b.entityType + "|" + strings.Join(reasonCodes, ",")),
		ActionAlias:   b.actionAlias,
		Priority:      b.priority,
		EntityType:    b.entityType,
		AffectedCount: len(b.items),
		SafeSummary:   summary,
		BlockedReason: blockedReason,
		Preconditions: preconditions,
		OperatorSteps: steps,
		ExecutionMode: OrganizationDirectoryRemediationExecutionManualReviewOnly,
		Samples:       samples,
	}
}

func newOrganizationDirectoryRemediationActionDraftSample(item OrganizationDirectoryQualityItem) OrganizationDirectoryRemediationActionDraftSample {
	entityHash := organizationDirectoryQualityHash(item.EntityType + ":" + item.EntityId)
	labelHash := strings.TrimPrefix(entityHash, "sha256:")
	if len(labelHash) > 12 {
		labelHash = labelHash[:12]
	}
	return OrganizationDirectoryRemediationActionDraftSample{
		EntityHash:             entityHash,
		DisplaySafeLabel:       item.EntityType + ":" + labelHash,
		EntityType:             item.EntityType,
		SourceType:             item.SourceType,
		QualityStatus:          item.QualityStatus,
		ReasonCodes:            append([]string{}, item.ReasonCodes...),
		LifecycleStatus:        item.LifecycleStatus,
		SourceConnectionIdHash: item.SourceConnectionIdHash,
		OrgVersion:             item.OrgVersion,
		SourceVersion:          item.SourceVersion,
	}
}

func organizationDirectoryRemediationActionDraftPreconditions(actionAlias string) []string {
	switch actionAlias {
	case OrganizationDirectoryRemediationActionBlockedByCredentials:
		return []string{"确认当前 operator 有 source connection 配置查看权限", "准备好不含密钥明文的连接状态和错误摘要"}
	case OrganizationDirectoryRemediationActionIdentityConflictReview:
		return []string{"确认重复主体或来源键的 owner 边界", "准备一份人工确认后的保留键和合并策略"}
	case OrganizationDirectoryRemediationActionMappingReview:
		return []string{"确认目标 API user 映射来源可信", "不得用手机号、邮箱或展示名自动推断 apiUserId"}
	case OrganizationDirectoryRemediationActionMembershipRepair:
		return []string{"确认成员关系两端的 active 用户和部门存在", "修复前先核对 source batch 和 orgVersion"}
	case OrganizationDirectoryRemediationActionSourceRefresh:
		return []string{"确认最近一次 source refresh 状态", "等待可用 OrgSyncBatch 后再重新生成草案"}
	case OrganizationDirectoryRemediationActionLifecycleCleanup:
		return []string{"确认 lifecycle 状态来自可信 source batch", "区分 active 修复、tombstone 和诊断保留对象"}
	default:
		return []string{"确认 reason code 对应的 Admin owner 边界", "只使用脱敏样例定位问题，不直接写入修复"}
	}
}

func sortOrganizationDirectoryRemediationActionDrafts(drafts []OrganizationDirectoryRemediationActionDraft) {
	sort.Slice(drafts, func(i, j int) bool {
		if drafts[i].Priority != drafts[j].Priority {
			return organizationDirectoryRemediationPriorityRank(drafts[i].Priority) < organizationDirectoryRemediationPriorityRank(drafts[j].Priority)
		}
		if drafts[i].AffectedCount != drafts[j].AffectedCount {
			return drafts[i].AffectedCount > drafts[j].AffectedCount
		}
		if drafts[i].ActionAlias != drafts[j].ActionAlias {
			return drafts[i].ActionAlias < drafts[j].ActionAlias
		}
		return drafts[i].EntityType < drafts[j].EntityType
	})
}

func newOrganizationDirectoryRemediationActionDraftExport(generatedAt time.Time, drafts []OrganizationDirectoryRemediationActionDraft) OrganizationDirectoryRemediationActionDraftExport {
	return OrganizationDirectoryRemediationActionDraftExport{
		GeneratedAt: generatedAt,
		Boundary:    organizationDirectoryRemediationBoundary,
		Drafts:      append([]OrganizationDirectoryRemediationActionDraft{}, drafts...),
	}
}
