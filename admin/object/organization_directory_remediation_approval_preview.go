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
	"fmt"
	"strings"
	"time"
)

const (
	OrganizationDirectoryRemediationApprovalRiskBlocked = "blocked"
	OrganizationDirectoryRemediationApprovalRiskLow     = "low"
	OrganizationDirectoryRemediationApprovalRiskMedium  = "medium"
	OrganizationDirectoryRemediationApprovalRiskHigh    = "high"

	OrganizationDirectoryRemediationApprovalBlockerMissingPreflightSamples = "missing_preflight_samples"
)

// OrganizationDirectoryRemediationApprovalPreviewQuery 限定只读 remediation execution approval preview 的组织范围和筛选条件。
type OrganizationDirectoryRemediationApprovalPreviewQuery struct {
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

// OrganizationDirectoryRemediationApprovalPreviewResult 是面向 operator 的执行审批预览响应。
type OrganizationDirectoryRemediationApprovalPreviewResult struct {
	OrganizationId            string                                                 `json:"organizationId"`
	GeneratedAt               time.Time                                              `json:"generatedAt"`
	Filters                   OrganizationDirectoryRemediationApprovalPreviewFilters `json:"filters"`
	TotalApprovalPreviewCount int                                                    `json:"totalApprovalPreviewCount"`
	ApprovalPreviews          []OrganizationDirectoryRemediationApprovalPreview      `json:"approvalPreviews"`
	ExportSummary             OrganizationDirectoryRemediationApprovalPreviewExport  `json:"exportSummary"`
	Boundary                  string                                                 `json:"boundary"`
}

// OrganizationDirectoryRemediationApprovalPreviewFilters 回显本次审批预览使用的安全筛选条件。
type OrganizationDirectoryRemediationApprovalPreviewFilters struct {
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

// OrganizationDirectoryRemediationApprovalPreview 表示某个 action draft/preflight 的只读审批包预览。
type OrganizationDirectoryRemediationApprovalPreview struct {
	ApprovalPreviewId    string                                                    `json:"approvalPreviewId"`
	ApprovalPreviewHash  string                                                    `json:"approvalPreviewHash"`
	DraftId              string                                                    `json:"draftId"`
	ActionAlias          string                                                    `json:"actionAlias"`
	EntityType           string                                                    `json:"entityType"`
	ExecutionMode        string                                                    `json:"executionMode"`
	AutoExecutionAllowed bool                                                      `json:"autoExecutionAllowed"`
	ReadyForApproval     bool                                                      `json:"readyForApproval"`
	AffectedCount        int                                                       `json:"affectedCount"`
	RiskLevel            string                                                    `json:"riskLevel"`
	Preconditions        []string                                                  `json:"preconditions"`
	BlockedReasons       []string                                                  `json:"blockedReasons"`
	RequiredApprovals    []string                                                  `json:"requiredApprovals"`
	OperatorChecklist    []string                                                  `json:"operatorChecklist"`
	SafeSummary          string                                                    `json:"safeSummary"`
	ExportSummary        OrganizationDirectoryRemediationApprovalPreviewExportItem `json:"exportSummary"`
	SampleStableHashes   []string                                                  `json:"sampleStableHashes"`
}

// OrganizationDirectoryRemediationApprovalPreviewExport 是前端可复制/下载的脱敏审批预览摘要。
type OrganizationDirectoryRemediationApprovalPreviewExport struct {
	GeneratedAt      time.Time                                                   `json:"generatedAt"`
	Boundary         string                                                      `json:"boundary"`
	ApprovalPreviews []OrganizationDirectoryRemediationApprovalPreviewExportItem `json:"approvalPreviews"`
}

// OrganizationDirectoryRemediationApprovalPreviewExportItem 只保留审批准备所需的安全字段。
type OrganizationDirectoryRemediationApprovalPreviewExportItem struct {
	ApprovalPreviewHash  string   `json:"approvalPreviewHash"`
	DraftId              string   `json:"draftId"`
	ActionAlias          string   `json:"actionAlias"`
	EntityType           string   `json:"entityType"`
	ExecutionMode        string   `json:"executionMode"`
	AutoExecutionAllowed bool     `json:"autoExecutionAllowed"`
	ReadyForApproval     bool     `json:"readyForApproval"`
	AffectedCount        int      `json:"affectedCount"`
	RiskLevel            string   `json:"riskLevel"`
	Preconditions        []string `json:"preconditions"`
	BlockedReasons       []string `json:"blockedReasons"`
	RequiredApprovals    []string `json:"requiredApprovals"`
	OperatorChecklist    []string `json:"operatorChecklist"`
	SafeSummary          string   `json:"safeSummary"`
	SampleStableHashes   []string `json:"sampleStableHashes"`
}

// OrganizationDirectoryRemediationApprovalPreviewService 基于 preflight 结果生成只读审批预览。
type OrganizationDirectoryRemediationApprovalPreviewService struct {
	PreflightService OrganizationDirectoryRemediationPreflightService
	Now              func() time.Time
}

// GetOrganizationDirectoryRemediationApprovalPreviews 使用默认只读服务生成 remediation execution approval previews。
func GetOrganizationDirectoryRemediationApprovalPreviews(query OrganizationDirectoryRemediationApprovalPreviewQuery) (*OrganizationDirectoryRemediationApprovalPreviewResult, error) {
	return (OrganizationDirectoryRemediationApprovalPreviewService{}).GetApprovalPreviews(query)
}

// GetApprovalPreviews 只生成审批预览，不执行修复、不写入 Admin/Gateway/下游系统。
func (s OrganizationDirectoryRemediationApprovalPreviewService) GetApprovalPreviews(query OrganizationDirectoryRemediationApprovalPreviewQuery) (*OrganizationDirectoryRemediationApprovalPreviewResult, error) {
	normalized, err := normalizeOrganizationDirectoryRemediationApprovalPreviewQuery(query)
	if err != nil {
		return nil, err
	}
	result := &OrganizationDirectoryRemediationApprovalPreviewResult{
		OrganizationId:   normalized.OrganizationId,
		GeneratedAt:      s.now().UTC(),
		Filters:          newOrganizationDirectoryRemediationApprovalPreviewFilters(normalized),
		ApprovalPreviews: []OrganizationDirectoryRemediationApprovalPreview{},
		Boundary:         organizationDirectoryRemediationBoundary,
	}
	if normalized.OrganizationId == "" || normalized.QualityStatus == OrganizationMasterDataQualityStatusReady {
		result.ExportSummary = newOrganizationDirectoryRemediationApprovalPreviewExport(result.GeneratedAt, result.ApprovalPreviews)
		return result, nil
	}

	preflightResult, err := s.preflightService().GetPreflights(OrganizationDirectoryRemediationPreflightQuery{
		OrganizationId:         normalized.OrganizationId,
		DraftId:                normalized.DraftId,
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
	for _, preflight := range preflightResult.Preflights {
		result.ApprovalPreviews = append(result.ApprovalPreviews, newOrganizationDirectoryRemediationApprovalPreview(preflight))
	}
	result.TotalApprovalPreviewCount = len(result.ApprovalPreviews)
	result.ExportSummary = newOrganizationDirectoryRemediationApprovalPreviewExport(result.GeneratedAt, result.ApprovalPreviews)
	return result, nil
}

func (s OrganizationDirectoryRemediationApprovalPreviewService) preflightService() OrganizationDirectoryRemediationPreflightService {
	service := s.PreflightService
	if service.Now == nil {
		service.Now = s.Now
	}
	if service.DraftService.Now == nil {
		service.DraftService.Now = s.Now
	}
	return service
}

func (s OrganizationDirectoryRemediationApprovalPreviewService) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func normalizeOrganizationDirectoryRemediationApprovalPreviewQuery(query OrganizationDirectoryRemediationApprovalPreviewQuery) (OrganizationDirectoryRemediationApprovalPreviewQuery, error) {
	preflightQuery, err := normalizeOrganizationDirectoryRemediationPreflightQuery(OrganizationDirectoryRemediationPreflightQuery{
		OrganizationId:         query.OrganizationId,
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
	})
	if err != nil {
		return query, err
	}
	query.OrganizationId = preflightQuery.OrganizationId
	query.DraftId = preflightQuery.DraftId
	query.ActionAlias = preflightQuery.ActionAlias
	query.EntityType = preflightQuery.EntityType
	query.Keyword = preflightQuery.Keyword
	query.SourceType = preflightQuery.SourceType
	query.SourceConnectionIdHash = preflightQuery.SourceConnectionIdHash
	query.QualityStatus = preflightQuery.QualityStatus
	query.ReasonCode = preflightQuery.ReasonCode
	query.Limit = preflightQuery.Limit
	query.TopN = preflightQuery.TopN
	return query, nil
}

func newOrganizationDirectoryRemediationApprovalPreviewFilters(query OrganizationDirectoryRemediationApprovalPreviewQuery) OrganizationDirectoryRemediationApprovalPreviewFilters {
	return OrganizationDirectoryRemediationApprovalPreviewFilters{
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

func newOrganizationDirectoryRemediationApprovalPreview(preflight OrganizationDirectoryRemediationPreflight) OrganizationDirectoryRemediationApprovalPreview {
	blockedReasons := organizationDirectoryRemediationApprovalPreviewBlockers(preflight)
	sampleHashes := organizationDirectoryRemediationApprovalSampleStableHashes(preflight.SampleDigests)
	hash := organizationDirectoryQualityHash(strings.Join([]string{
		"approval-preview",
		preflight.PreflightId,
		preflight.DraftId,
		preflight.ActionAlias,
		fmt.Sprint(preflight.AffectedCounts.Total),
		strings.Join(blockedReasons, ","),
		strings.Join(sampleHashes, ","),
	}, "|"))
	preview := OrganizationDirectoryRemediationApprovalPreview{
		ApprovalPreviewId:    "approval-preview:" + strings.TrimPrefix(hash, "sha256:"),
		ApprovalPreviewHash:  hash,
		DraftId:              preflight.DraftId,
		ActionAlias:          preflight.ActionAlias,
		EntityType:           preflight.EntityType,
		ExecutionMode:        OrganizationDirectoryRemediationExecutionManualReviewOnly,
		AutoExecutionAllowed: false,
		ReadyForApproval:     preflight.ReadyForManualReview && len(blockedReasons) == 0,
		AffectedCount:        preflight.AffectedCounts.Total,
		RiskLevel:            organizationDirectoryRemediationApprovalRiskLevel(preflight, blockedReasons),
		Preconditions:        append([]string{}, preflight.Preconditions...),
		BlockedReasons:       blockedReasons,
		RequiredApprovals:    organizationDirectoryRemediationApprovalRequiredApprovals(preflight),
		OperatorChecklist:    organizationDirectoryRemediationApprovalChecklist(preflight),
		SafeSummary:          organizationDirectoryRemediationApprovalSafeSummary(preflight),
		SampleStableHashes:   sampleHashes,
	}
	preview.ExportSummary = newOrganizationDirectoryRemediationApprovalPreviewExportItem(preview)
	return preview
}

func organizationDirectoryRemediationApprovalPreviewBlockers(preflight OrganizationDirectoryRemediationPreflight) []string {
	blockers := append([]string{}, preflight.BlockedReasons...)
	if len(preflight.SampleDigests) == 0 {
		blockers = append(blockers, OrganizationDirectoryRemediationApprovalBlockerMissingPreflightSamples)
	}
	if len(preflight.Preconditions) == 0 {
		blockers = append(blockers, OrganizationDirectoryRemediationPreflightBlockerMissingPrecondition)
	}
	if preflight.AffectedCounts.Total <= 0 {
		blockers = append(blockers, OrganizationDirectoryRemediationPreflightBlockerNoAffectedSubjects)
	}
	return organizationDirectoryRemediationUniqueStrings(blockers)
}

func organizationDirectoryRemediationApprovalRiskLevel(preflight OrganizationDirectoryRemediationPreflight, blockers []string) string {
	if len(blockers) > 0 || !preflight.ReadyForManualReview {
		return OrganizationDirectoryRemediationApprovalRiskBlocked
	}
	if preflight.AffectedCounts.Total >= 20 ||
		preflight.ActionAlias == OrganizationDirectoryRemediationActionIdentityConflictReview ||
		preflight.ActionAlias == OrganizationDirectoryRemediationActionBlockedByCredentials {
		return OrganizationDirectoryRemediationApprovalRiskHigh
	}
	if preflight.AffectedCounts.Total <= 1 &&
		(preflight.ActionAlias == OrganizationDirectoryRemediationActionLifecycleCleanup || preflight.ActionAlias == OrganizationDirectoryRemediationActionManualInvestigation) {
		return OrganizationDirectoryRemediationApprovalRiskLow
	}
	return OrganizationDirectoryRemediationApprovalRiskMedium
}

func organizationDirectoryRemediationApprovalRequiredApprovals(preflight OrganizationDirectoryRemediationPreflight) []string {
	approvals := []string{"organization_directory_owner"}
	switch preflight.ActionAlias {
	case OrganizationDirectoryRemediationActionMappingReview:
		approvals = append(approvals, "api_mapping_owner")
	case OrganizationDirectoryRemediationActionIdentityConflictReview:
		approvals = append(approvals, "identity_owner", "security_reviewer")
	case OrganizationDirectoryRemediationActionMembershipRepair:
		approvals = append(approvals, "membership_owner")
	case OrganizationDirectoryRemediationActionBlockedByCredentials, OrganizationDirectoryRemediationActionSourceRefresh:
		approvals = append(approvals, "source_connection_owner")
	default:
		approvals = append(approvals, "data_steward")
	}
	return organizationDirectoryRemediationUniqueStrings(approvals)
}

func organizationDirectoryRemediationApprovalChecklist(preflight OrganizationDirectoryRemediationPreflight) []string {
	checklist := []string{
		"确认审批预览仅用于 manual review，P0 不允许自动执行",
		"确认 autoExecutionAllowed=false 且没有执行/修复入口",
		"确认导出 JSON 只包含 stable hash、状态、reason 和版本摘要",
		"确认审批人已查看 preflight blocker 与 required approvals",
	}
	if preflight.AffectedCounts.Total > 0 {
		checklist = append(checklist, fmt.Sprintf("确认受影响对象数量为 %d，且样例已脱敏", preflight.AffectedCounts.Total))
	}
	return checklist
}

func organizationDirectoryRemediationApprovalSafeSummary(preflight OrganizationDirectoryRemediationPreflight) string {
	action := preflight.ActionAlias
	if action == "" {
		action = "unknown_action"
	}
	entity := preflight.EntityType
	if entity == "" {
		entity = "unknown_entity"
	}
	return fmt.Sprintf("%s/%s approval preview covers %d Admin-owned records; manual review only, no remediation execution.", action, entity, preflight.AffectedCounts.Total)
}

func organizationDirectoryRemediationApprovalSampleStableHashes(samples []OrganizationDirectoryRemediationPreflightSampleDigest) []string {
	hashes := make([]string, 0, len(samples))
	for _, sample := range samples {
		if sample.EntityHash != "" {
			hashes = append(hashes, sample.EntityHash)
		}
	}
	return organizationDirectoryRemediationUniqueStrings(hashes)
}

func newOrganizationDirectoryRemediationApprovalPreviewExport(generatedAt time.Time, previews []OrganizationDirectoryRemediationApprovalPreview) OrganizationDirectoryRemediationApprovalPreviewExport {
	items := make([]OrganizationDirectoryRemediationApprovalPreviewExportItem, 0, len(previews))
	for _, preview := range previews {
		items = append(items, newOrganizationDirectoryRemediationApprovalPreviewExportItem(preview))
	}
	return OrganizationDirectoryRemediationApprovalPreviewExport{
		GeneratedAt:      generatedAt,
		Boundary:         organizationDirectoryRemediationBoundary,
		ApprovalPreviews: items,
	}
}

func newOrganizationDirectoryRemediationApprovalPreviewExportItem(preview OrganizationDirectoryRemediationApprovalPreview) OrganizationDirectoryRemediationApprovalPreviewExportItem {
	return OrganizationDirectoryRemediationApprovalPreviewExportItem{
		ApprovalPreviewHash:  preview.ApprovalPreviewHash,
		DraftId:              preview.DraftId,
		ActionAlias:          preview.ActionAlias,
		EntityType:           preview.EntityType,
		ExecutionMode:        OrganizationDirectoryRemediationExecutionManualReviewOnly,
		AutoExecutionAllowed: false,
		ReadyForApproval:     preview.ReadyForApproval,
		AffectedCount:        preview.AffectedCount,
		RiskLevel:            preview.RiskLevel,
		Preconditions:        append([]string{}, preview.Preconditions...),
		BlockedReasons:       append([]string{}, preview.BlockedReasons...),
		RequiredApprovals:    append([]string{}, preview.RequiredApprovals...),
		OperatorChecklist:    append([]string{}, preview.OperatorChecklist...),
		SafeSummary:          preview.SafeSummary,
		SampleStableHashes:   append([]string{}, preview.SampleStableHashes...),
	}
}

func organizationDirectoryRemediationUniqueStrings(values []string) []string {
	seen := map[string]bool{}
	unique := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		unique = append(unique, value)
	}
	return unique
}
