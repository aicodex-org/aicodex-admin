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
	"strings"
	"time"
)

const (
	OrganizationDirectoryRemediationPreflightBlockerDraftNotFound       = "draft_not_found"
	OrganizationDirectoryRemediationPreflightBlockerNoAffectedSubjects  = "no_affected_subjects"
	OrganizationDirectoryRemediationPreflightBlockerMissingSamples      = "missing_sanitized_samples"
	OrganizationDirectoryRemediationPreflightBlockerMissingPrecondition = "missing_preconditions"
	OrganizationDirectoryRemediationPreflightBlockerDraftBlocked        = "draft_blocked"
)

// OrganizationDirectoryRemediationPreflightQuery 限定只读 remediation preflight 的组织范围和筛选条件。
type OrganizationDirectoryRemediationPreflightQuery struct {
	OrganizationId         string
	DraftId                string
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

// OrganizationDirectoryRemediationPreflightResult 是面向 operator 的执行前只读预检响应。
type OrganizationDirectoryRemediationPreflightResult struct {
	OrganizationId      string                                           `json:"organizationId"`
	GeneratedAt         time.Time                                        `json:"generatedAt"`
	Filters             OrganizationDirectoryRemediationPreflightFilters `json:"filters"`
	TotalPreflightCount int                                              `json:"totalPreflightCount"`
	Preflights          []OrganizationDirectoryRemediationPreflight      `json:"preflights"`
	ExportSummary       OrganizationDirectoryRemediationPreflightExport  `json:"exportSummary"`
	Boundary            string                                           `json:"boundary"`
}

// OrganizationDirectoryRemediationPreflightFilters 回显本次 preflight 使用的安全筛选条件。
type OrganizationDirectoryRemediationPreflightFilters struct {
	DraftId                string `json:"draftId,omitempty"`
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

// OrganizationDirectoryRemediationPreflight 表示某个 action draft 的人工复核前置检查。
type OrganizationDirectoryRemediationPreflight struct {
	PreflightId          string                                                  `json:"preflightId"`
	DraftId              string                                                  `json:"draftId"`
	ActionAlias          string                                                  `json:"actionAlias"`
	EntityType           string                                                  `json:"entityType"`
	ExecutionMode        string                                                  `json:"executionMode"`
	ReadyForManualReview bool                                                    `json:"readyForManualReview"`
	AutoExecutionAllowed bool                                                    `json:"autoExecutionAllowed"`
	BlockedReasons       []string                                                `json:"blockedReasons"`
	Preconditions        []string                                                `json:"preconditions"`
	SafetyChecklist      []string                                                `json:"safetyChecklist"`
	AffectedCounts       OrganizationDirectoryRemediationCounts                  `json:"affectedCounts"`
	SampleDigests        []OrganizationDirectoryRemediationPreflightSampleDigest `json:"sampleDigests"`
	OperatorNextSteps    []string                                                `json:"operatorNextSteps"`
}

// OrganizationDirectoryRemediationPreflightSampleDigest 是 preflight 可导出的单条脱敏样例摘要。
type OrganizationDirectoryRemediationPreflightSampleDigest struct {
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

// OrganizationDirectoryRemediationPreflightExport 是前端下载使用的脱敏预检摘要。
type OrganizationDirectoryRemediationPreflightExport struct {
	GeneratedAt time.Time                                   `json:"generatedAt"`
	Boundary    string                                      `json:"boundary"`
	Preflights  []OrganizationDirectoryRemediationPreflight `json:"preflights"`
}

// OrganizationDirectoryRemediationPreflightService 基于 action drafts 生成只读执行前预检。
type OrganizationDirectoryRemediationPreflightService struct {
	DraftService OrganizationDirectoryRemediationActionDraftService
	Now          func() time.Time
}

// GetOrganizationDirectoryRemediationPreflights 使用默认只读服务生成 remediation preflights。
func GetOrganizationDirectoryRemediationPreflights(query OrganizationDirectoryRemediationPreflightQuery) (*OrganizationDirectoryRemediationPreflightResult, error) {
	return (OrganizationDirectoryRemediationPreflightService{}).GetPreflights(query)
}

// GetPreflights 只评估人工复核准备状态，不执行修复、不写入 Admin/Gateway/下游系统。
func (s OrganizationDirectoryRemediationPreflightService) GetPreflights(query OrganizationDirectoryRemediationPreflightQuery) (*OrganizationDirectoryRemediationPreflightResult, error) {
	normalized, err := normalizeOrganizationDirectoryRemediationPreflightQuery(query)
	if err != nil {
		return nil, err
	}
	result := &OrganizationDirectoryRemediationPreflightResult{
		OrganizationId: normalized.OrganizationId,
		GeneratedAt:    s.now().UTC(),
		Filters:        newOrganizationDirectoryRemediationPreflightFilters(normalized),
		Preflights:     []OrganizationDirectoryRemediationPreflight{},
		Boundary:       organizationDirectoryRemediationBoundary,
	}
	if normalized.OrganizationId == "" || normalized.QualityStatus == OrganizationMasterDataQualityStatusReady {
		result.ExportSummary = newOrganizationDirectoryRemediationPreflightExport(result.GeneratedAt, result.Preflights)
		return result, nil
	}

	draftResult, err := s.draftService().GetActionDrafts(OrganizationDirectoryRemediationActionDraftQuery{
		OrganizationId:         normalized.OrganizationId,
		ActionAlias:            normalized.ActionAlias,
		EntityType:             normalized.EntityType,
		Keyword:                normalized.Keyword,
		SourceType:             normalized.SourceType,
		SourceConnectionIdHash: normalized.SourceConnectionIdHash,
		QualityStatus:          normalized.QualityStatus,
		ReasonCode:             normalized.ReasonCode,
		Limit:                  normalized.Limit,
		TopN:                   normalized.TopN,
	})
	if err != nil {
		return nil, err
	}
	for _, draft := range draftResult.Drafts {
		if normalized.DraftId != "" && draft.DraftId != normalized.DraftId {
			continue
		}
		result.Preflights = append(result.Preflights, newOrganizationDirectoryRemediationPreflight(draft))
	}
	if normalized.DraftId != "" && len(result.Preflights) == 0 {
		result.Preflights = append(result.Preflights, newOrganizationDirectoryRemediationMissingDraftPreflight(normalized))
	}
	result.TotalPreflightCount = len(result.Preflights)
	result.ExportSummary = newOrganizationDirectoryRemediationPreflightExport(result.GeneratedAt, result.Preflights)
	return result, nil
}

func (s OrganizationDirectoryRemediationPreflightService) draftService() OrganizationDirectoryRemediationActionDraftService {
	service := s.DraftService
	if service.Now == nil {
		service.Now = s.Now
	}
	return service
}

func (s OrganizationDirectoryRemediationPreflightService) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func normalizeOrganizationDirectoryRemediationPreflightQuery(query OrganizationDirectoryRemediationPreflightQuery) (OrganizationDirectoryRemediationPreflightQuery, error) {
	draftQuery, err := normalizeOrganizationDirectoryRemediationActionDraftQuery(OrganizationDirectoryRemediationActionDraftQuery{
		OrganizationId:         query.OrganizationId,
		ActionAlias:            query.ActionAlias,
		EntityType:             query.EntityType,
		Keyword:                query.Keyword,
		SourceType:             query.SourceType,
		SourceConnectionIdHash: query.SourceConnectionIdHash,
		QualityStatus:          query.QualityStatus,
		ReasonCode:             query.ReasonCode,
		Limit:                  query.Limit,
		TopN:                   query.TopN,
	})
	if err != nil {
		return query, err
	}
	query.OrganizationId = draftQuery.OrganizationId
	query.ActionAlias = draftQuery.ActionAlias
	query.EntityType = draftQuery.EntityType
	query.Keyword = draftQuery.Keyword
	query.SourceType = draftQuery.SourceType
	query.SourceConnectionIdHash = draftQuery.SourceConnectionIdHash
	query.QualityStatus = draftQuery.QualityStatus
	query.ReasonCode = draftQuery.ReasonCode
	query.Limit = draftQuery.Limit
	query.TopN = draftQuery.TopN
	query.DraftId = normalizeGatewayProjectionString(query.DraftId)
	return query, nil
}

func newOrganizationDirectoryRemediationPreflightFilters(query OrganizationDirectoryRemediationPreflightQuery) OrganizationDirectoryRemediationPreflightFilters {
	return OrganizationDirectoryRemediationPreflightFilters{
		DraftId:                query.DraftId,
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

func newOrganizationDirectoryRemediationPreflight(draft OrganizationDirectoryRemediationActionDraft) OrganizationDirectoryRemediationPreflight {
	blockers := organizationDirectoryRemediationPreflightBlockers(draft)
	return OrganizationDirectoryRemediationPreflight{
		PreflightId:          organizationDirectoryQualityHash("preflight|" + draft.DraftId),
		DraftId:              draft.DraftId,
		ActionAlias:          draft.ActionAlias,
		EntityType:           draft.EntityType,
		ExecutionMode:        OrganizationDirectoryRemediationExecutionManualReviewOnly,
		ReadyForManualReview: len(blockers) == 0,
		AutoExecutionAllowed: false,
		BlockedReasons:       blockers,
		Preconditions:        append([]string{}, draft.Preconditions...),
		SafetyChecklist:      organizationDirectoryRemediationPreflightSafetyChecklist(draft),
		AffectedCounts:       organizationDirectoryRemediationPreflightAffectedCounts(draft),
		SampleDigests:        organizationDirectoryRemediationPreflightSampleDigests(draft.Samples),
		OperatorNextSteps:    organizationDirectoryRemediationPreflightNextSteps(draft),
	}
}

func newOrganizationDirectoryRemediationMissingDraftPreflight(query OrganizationDirectoryRemediationPreflightQuery) OrganizationDirectoryRemediationPreflight {
	return OrganizationDirectoryRemediationPreflight{
		PreflightId:          organizationDirectoryQualityHash("preflight|missing|" + query.OrganizationId + "|" + query.DraftId),
		DraftId:              query.DraftId,
		ActionAlias:          query.ActionAlias,
		EntityType:           query.EntityType,
		ExecutionMode:        OrganizationDirectoryRemediationExecutionManualReviewOnly,
		ReadyForManualReview: false,
		AutoExecutionAllowed: false,
		BlockedReasons:       []string{OrganizationDirectoryRemediationPreflightBlockerDraftNotFound},
		Preconditions:        []string{},
		SafetyChecklist:      organizationDirectoryRemediationPreflightSafetyChecklist(OrganizationDirectoryRemediationActionDraft{}),
		AffectedCounts:       OrganizationDirectoryRemediationCounts{},
		SampleDigests:        []OrganizationDirectoryRemediationPreflightSampleDigest{},
		OperatorNextSteps:    []string{"重新生成 action draft 后再执行 preflight", "确认筛选条件仍命中 Admin-owned 目录质量问题"},
	}
}

func organizationDirectoryRemediationPreflightBlockers(draft OrganizationDirectoryRemediationActionDraft) []string {
	blockers := []string{}
	if draft.AffectedCount <= 0 {
		blockers = append(blockers, OrganizationDirectoryRemediationPreflightBlockerNoAffectedSubjects)
	}
	if len(draft.Preconditions) == 0 {
		blockers = append(blockers, OrganizationDirectoryRemediationPreflightBlockerMissingPrecondition)
	}
	if len(draft.Samples) == 0 {
		blockers = append(blockers, OrganizationDirectoryRemediationPreflightBlockerMissingSamples)
	}
	if strings.TrimSpace(draft.BlockedReason) != "" {
		blockers = append(blockers, OrganizationDirectoryRemediationPreflightBlockerDraftBlocked)
	}
	return blockers
}

func organizationDirectoryRemediationPreflightSafetyChecklist(draft OrganizationDirectoryRemediationActionDraft) []string {
	checklist := []string{
		"确认当前草案仅用于 manual review，不允许自动执行",
		"确认脱敏样例不包含手机号、邮箱、source payload、token、Cookie 或私有 URL",
		"确认 operator 已核对 Admin owner 边界和 source/org version",
	}
	if draft.ActionAlias != "" {
		checklist = append(checklist, "确认 actionAlias "+draft.ActionAlias+" 的修复 owner 已接受人工复核")
	}
	return checklist
}

func organizationDirectoryRemediationPreflightAffectedCounts(draft OrganizationDirectoryRemediationActionDraft) OrganizationDirectoryRemediationCounts {
	counts := OrganizationDirectoryRemediationCounts{Total: draft.AffectedCount}
	switch draft.EntityType {
	case OrganizationDirectoryQualityEntityDepartment:
		counts.Department = draft.AffectedCount
	case OrganizationDirectoryQualityEntityUser:
		counts.User = draft.AffectedCount
	case OrganizationDirectoryQualityEntityMembership:
		counts.Membership = draft.AffectedCount
	}
	return counts
}

func organizationDirectoryRemediationPreflightSampleDigests(samples []OrganizationDirectoryRemediationActionDraftSample) []OrganizationDirectoryRemediationPreflightSampleDigest {
	digests := make([]OrganizationDirectoryRemediationPreflightSampleDigest, 0, len(samples))
	for _, sample := range samples {
		digests = append(digests, OrganizationDirectoryRemediationPreflightSampleDigest{
			EntityHash:             sample.EntityHash,
			DisplaySafeLabel:       sample.DisplaySafeLabel,
			EntityType:             sample.EntityType,
			SourceType:             sample.SourceType,
			QualityStatus:          sample.QualityStatus,
			ReasonCodes:            append([]string{}, sample.ReasonCodes...),
			LifecycleStatus:        sample.LifecycleStatus,
			SourceConnectionIdHash: sample.SourceConnectionIdHash,
			OrgVersion:             sample.OrgVersion,
			SourceVersion:          sample.SourceVersion,
		})
	}
	return digests
}

func organizationDirectoryRemediationPreflightNextSteps(draft OrganizationDirectoryRemediationActionDraft) []string {
	steps := append([]string{}, draft.OperatorSteps...)
	steps = append(steps, "导出 preflight JSON 供修复 owner 人工复核")
	steps = append(steps, "修复执行仍需走单独审批或人工流程，Admin P0 不自动写入")
	return steps
}

func newOrganizationDirectoryRemediationPreflightExport(generatedAt time.Time, preflights []OrganizationDirectoryRemediationPreflight) OrganizationDirectoryRemediationPreflightExport {
	return OrganizationDirectoryRemediationPreflightExport{
		GeneratedAt: generatedAt,
		Boundary:    organizationDirectoryRemediationBoundary,
		Preflights:  append([]OrganizationDirectoryRemediationPreflight{}, preflights...),
	}
}
