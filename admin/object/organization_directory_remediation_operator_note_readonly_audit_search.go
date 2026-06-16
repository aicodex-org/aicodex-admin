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
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchScopeCurrentDerived = "current_derived_non_persistent"

	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModeCurrentDerived = "current_derived"
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModePersistent     = "persistent"

	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferHistoricalCompleteness   = "historical_search_completeness"
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferSavedOperatorComments    = "saved_operator_comments"
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferHandoffAcknowledgements  = "handoff_acknowledgements"
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferDurableRetentionEvidence = "durable_retention_evidence"

	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedToken              = "credential_value"
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedCookie             = "session_identifier"
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedSecret             = "private_credential"
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedPrivateURL         = "private_url"
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedContactIdentifier  = "contact_identifier"
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedRawSourcePayload   = "source_content_redacted"
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedFullOrgTree        = "full_organization_tree"
	OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedExecutionArtifacts = "execution_artifacts"
)

// OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery 限定只读交接备注审计检索的组织范围和安全筛选条件。
type OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery struct {
	OrganizationId         string
	SearchId               string
	NoteId                 string
	NoteHash               string
	ReadinessId            string
	ReadinessHash          string
	PacketAuditId          string
	PacketHash             string
	ApprovalPreviewId      string
	ApprovalPreviewHash    string
	DraftId                string
	RemediationRunId       string
	ActionAlias            string
	EntityType             string
	Keyword                string
	SourceType             string
	SourceConnectionIdHash string
	QualityStatus          string
	ReasonCode             string
	ChecklistAlias         string
	RiskLevel              string
	PacketStatus           string
	ReadinessStatus        string
	IncludeHistorical      bool
	HistoryMode            string
	Limit                  int
	TopN                   int
}

// OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchResult 是面向 operator 的只读备注审计检索响应。
type OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchResult struct {
	SearchId                               string                                                                `json:"searchId"`
	OrganizationId                         string                                                                `json:"organizationId"`
	GeneratedAt                            time.Time                                                             `json:"generatedAt"`
	Filters                                OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchFilter `json:"filters"`
	SearchScope                            string                                                                `json:"searchScope"`
	PersistenceRequiredForHistoricalSearch bool                                                                  `json:"persistenceRequiredForHistoricalSearch"`
	CannotInfer                            []string                                                              `json:"cannotInfer"`
	TotalItemCount                         int                                                                   `json:"totalItemCount"`
	Items                                  []OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem `json:"items"`
	ExportSummary                          OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchExport `json:"exportSummary"`
	Boundary                               string                                                                `json:"boundary"`
}

// OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchFilter 回显本次只读检索使用的安全筛选条件。
type OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchFilter struct {
	SearchId               string `json:"searchId,omitempty"`
	NoteId                 string `json:"noteId,omitempty"`
	NoteHash               string `json:"noteHash,omitempty"`
	ReadinessId            string `json:"readinessId,omitempty"`
	ReadinessHash          string `json:"readinessHash,omitempty"`
	PacketAuditId          string `json:"packetAuditId,omitempty"`
	PacketHash             string `json:"packetHash,omitempty"`
	ApprovalPreviewId      string `json:"approvalPreviewId,omitempty"`
	ApprovalPreviewHash    string `json:"approvalPreviewHash,omitempty"`
	DraftId                string `json:"draftId,omitempty"`
	RemediationRunId       string `json:"remediationRunId,omitempty"`
	ActionAlias            string `json:"actionAlias,omitempty"`
	EntityType             string `json:"entityType,omitempty"`
	Keyword                string `json:"keyword,omitempty"`
	SourceType             string `json:"sourceType,omitempty"`
	SourceConnectionIdHash string `json:"sourceConnectionIdHash,omitempty"`
	QualityStatus          string `json:"qualityStatus,omitempty"`
	ReasonCode             string `json:"reasonCode,omitempty"`
	ChecklistAlias         string `json:"checklistAlias,omitempty"`
	RiskLevel              string `json:"riskLevel,omitempty"`
	PacketStatus           string `json:"packetStatus,omitempty"`
	ReadinessStatus        string `json:"readinessStatus,omitempty"`
	IncludeHistorical      bool   `json:"includeHistorical"`
	HistoryMode            string `json:"historyMode,omitempty"`
	Limit                  int    `json:"limit"`
	TopN                   int    `json:"topN"`
}

// OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem 是一个脱敏的交接备注/准入检索结果。
type OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem struct {
	AuditSearchItemId    string                                                                    `json:"auditSearchItemId"`
	NoteHash             string                                                                    `json:"noteHash"`
	ReadinessHash        string                                                                    `json:"readinessHash"`
	PacketHash           string                                                                    `json:"packetHash"`
	ApprovalPreviewHash  string                                                                    `json:"approvalPreviewHash"`
	DraftId              string                                                                    `json:"draftId"`
	ActionAlias          string                                                                    `json:"actionAlias"`
	EntityType           string                                                                    `json:"entityType"`
	RiskLevel            string                                                                    `json:"riskLevel"`
	PacketStatus         string                                                                    `json:"packetStatus"`
	ReadinessStatus      string                                                                    `json:"readinessStatus"`
	ChecklistAliases     []string                                                                  `json:"checklistAliases"`
	ReasonAliases        []string                                                                  `json:"reasonAliases"`
	DisplaySafeLabel     string                                                                    `json:"displaySafeLabel"`
	ExecutionMode        string                                                                    `json:"executionMode"`
	AutoExecutionAllowed bool                                                                      `json:"autoExecutionAllowed"`
	NoteScope            string                                                                    `json:"noteScope"`
	RetentionPolicy      string                                                                    `json:"retentionPolicy"`
	StorageScope         string                                                                    `json:"storageScope"`
	ManualReviewOnly     bool                                                                      `json:"manualReviewOnly"`
	RedactedFields       []string                                                                  `json:"redactedFields"`
	SourceVersionSummary string                                                                    `json:"sourceVersionSummary"`
	OrgVersionSummary    string                                                                    `json:"orgVersionSummary"`
	CannotInfer          []string                                                                  `json:"cannotInfer"`
	BlockedReasons       []string                                                                  `json:"blockedReasons"`
	SafeSummary          string                                                                    `json:"safeSummary"`
	MarkdownSummary      string                                                                    `json:"markdownSummary"`
	ExportSummary        OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemExport `json:"exportSummary"`
}

// OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchExport 是前端可复制/下载的脱敏检索集合。
type OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchExport struct {
	GeneratedAt                            time.Time                                                                   `json:"generatedAt"`
	Boundary                               string                                                                      `json:"boundary"`
	SearchScope                            string                                                                      `json:"searchScope"`
	PersistenceRequiredForHistoricalSearch bool                                                                        `json:"persistenceRequiredForHistoricalSearch"`
	CannotInfer                            []string                                                                    `json:"cannotInfer"`
	Items                                  []OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemExport `json:"items"`
}

// OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemExport 只保留交接审计检索所需的安全字段。
type OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemExport struct {
	NoteHash             string   `json:"noteHash"`
	ReadinessHash        string   `json:"readinessHash"`
	PacketHash           string   `json:"packetHash"`
	ApprovalPreviewHash  string   `json:"approvalPreviewHash"`
	DraftId              string   `json:"draftId"`
	ActionAlias          string   `json:"actionAlias"`
	EntityType           string   `json:"entityType"`
	RiskLevel            string   `json:"riskLevel"`
	PacketStatus         string   `json:"packetStatus"`
	ReadinessStatus      string   `json:"readinessStatus"`
	ChecklistAliases     []string `json:"checklistAliases"`
	ReasonAliases        []string `json:"reasonAliases"`
	DisplaySafeLabel     string   `json:"displaySafeLabel"`
	ExecutionMode        string   `json:"executionMode"`
	AutoExecutionAllowed bool     `json:"autoExecutionAllowed"`
	NoteScope            string   `json:"noteScope"`
	RetentionPolicy      string   `json:"retentionPolicy"`
	StorageScope         string   `json:"storageScope"`
	ManualReviewOnly     bool     `json:"manualReviewOnly"`
	RedactedFields       []string `json:"redactedFields"`
	SourceVersionSummary string   `json:"sourceVersionSummary"`
	OrgVersionSummary    string   `json:"orgVersionSummary"`
	CannotInfer          []string `json:"cannotInfer"`
	BlockedReasons       []string `json:"blockedReasons"`
	SafeSummary          string   `json:"safeSummary"`
	MarkdownSummary      string   `json:"markdownSummary"`
}

// OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchService 基于只读 readiness/notes 派生检索结果。
type OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchService struct {
	ReadinessService OrganizationDirectoryRemediationOperatorNotePersistenceReadinessService
	Now              func() time.Time
}

// GetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch 使用默认只读服务生成交接备注审计检索结果。
func GetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch(query OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery) (*OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchResult, error) {
	return (OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchService{}).Search(query)
}

// Search 只聚合当前可派生 handoff/readiness 元数据，不保存 notes、不创建审计事实、不执行修复。
func (s OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchService) Search(query OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery) (*OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchResult, error) {
	normalized, err := normalizeOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery(query)
	if err != nil {
		return nil, err
	}
	historicalRequired := organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRequiresPersistence(normalized)
	cannotInfer := organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInfer(historicalRequired)
	result := &OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchResult{
		OrganizationId:                         normalized.OrganizationId,
		GeneratedAt:                            s.now(),
		Filters:                                newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchFilters(normalized),
		SearchScope:                            OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchScopeCurrentDerived,
		PersistenceRequiredForHistoricalSearch: historicalRequired,
		CannotInfer:                            cannotInfer,
		Items:                                  []OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem{},
		Boundary:                               organizationDirectoryRemediationBoundary,
	}
	if normalized.OrganizationId == "" || normalized.QualityStatus == OrganizationMasterDataQualityStatusReady {
		result.SearchId = organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchId(normalized, nil, historicalRequired)
		result.ExportSummary = newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchExport(result.GeneratedAt, historicalRequired, cannotInfer, result.Items)
		return result, nil
	}

	readinessResult, err := s.readinessService().GetPersistenceReadiness(OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{
		OrganizationId:         normalized.OrganizationId,
		ReadinessId:            normalized.ReadinessId,
		ReadinessHash:          normalized.ReadinessHash,
		NoteId:                 normalized.NoteId,
		NoteHash:               normalized.NoteHash,
		PacketAuditId:          normalized.PacketAuditId,
		PacketHash:             normalized.PacketHash,
		ApprovalPreviewId:      normalized.ApprovalPreviewId,
		ApprovalPreviewHash:    normalized.ApprovalPreviewHash,
		DraftId:                normalized.DraftId,
		ActionAlias:            normalized.ActionAlias,
		EntityType:             normalized.EntityType,
		Keyword:                normalized.Keyword,
		SourceType:             normalized.SourceType,
		SourceConnectionIdHash: normalized.SourceConnectionIdHash,
		QualityStatus:          normalized.QualityStatus,
		ReasonCode:             normalized.ReasonCode,
		RiskLevel:              normalized.RiskLevel,
		PacketStatus:           normalized.PacketStatus,
		Limit:                  normalized.Limit,
		TopN:                   normalized.TopN,
	})
	if err != nil {
		return nil, err
	}
	for _, readiness := range readinessResult.Readiness {
		item := newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem(normalized, readiness, historicalRequired, cannotInfer)
		if organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemMatches(item, normalized) {
			result.Items = append(result.Items, item)
		}
	}
	result.TotalItemCount = len(result.Items)
	result.SearchId = organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchId(normalized, result.Items, historicalRequired)
	if normalized.SearchId != "" && normalized.SearchId != result.SearchId {
		result.Items = []OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem{}
		result.TotalItemCount = 0
	}
	result.ExportSummary = newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchExport(result.GeneratedAt, historicalRequired, cannotInfer, result.Items)
	return result, nil
}

func (s OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchService) readinessService() OrganizationDirectoryRemediationOperatorNotePersistenceReadinessService {
	if s.ReadinessService.Now == nil {
		s.ReadinessService.Now = s.now
	}
	return s.ReadinessService
}

func (s OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchService) now() time.Time {
	if s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func normalizeOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery(query OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery) (OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery, error) {
	readinessQuery, err := normalizeOrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery(OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{
		OrganizationId:         query.OrganizationId,
		ReadinessId:            query.ReadinessId,
		ReadinessHash:          query.ReadinessHash,
		NoteId:                 query.NoteId,
		NoteHash:               query.NoteHash,
		PacketAuditId:          query.PacketAuditId,
		PacketHash:             query.PacketHash,
		ApprovalPreviewId:      query.ApprovalPreviewId,
		ApprovalPreviewHash:    query.ApprovalPreviewHash,
		DraftId:                query.DraftId,
		ActionAlias:            query.ActionAlias,
		EntityType:             query.EntityType,
		Keyword:                query.Keyword,
		SourceType:             query.SourceType,
		SourceConnectionIdHash: query.SourceConnectionIdHash,
		QualityStatus:          query.QualityStatus,
		ReasonCode:             query.ReasonCode,
		RiskLevel:              query.RiskLevel,
		PacketStatus:           query.PacketStatus,
		Limit:                  query.Limit,
		TopN:                   query.TopN,
	})
	if err != nil {
		return query, err
	}
	query.OrganizationId = readinessQuery.OrganizationId
	query.ReadinessId = readinessQuery.ReadinessId
	query.ReadinessHash = readinessQuery.ReadinessHash
	query.NoteId = readinessQuery.NoteId
	query.NoteHash = readinessQuery.NoteHash
	query.PacketAuditId = readinessQuery.PacketAuditId
	query.PacketHash = readinessQuery.PacketHash
	query.ApprovalPreviewId = readinessQuery.ApprovalPreviewId
	query.ApprovalPreviewHash = readinessQuery.ApprovalPreviewHash
	query.DraftId = readinessQuery.DraftId
	query.ActionAlias = readinessQuery.ActionAlias
	query.EntityType = readinessQuery.EntityType
	query.Keyword = readinessQuery.Keyword
	query.SourceType = readinessQuery.SourceType
	query.SourceConnectionIdHash = readinessQuery.SourceConnectionIdHash
	query.QualityStatus = readinessQuery.QualityStatus
	query.ReasonCode = readinessQuery.ReasonCode
	query.RiskLevel = readinessQuery.RiskLevel
	query.PacketStatus = readinessQuery.PacketStatus
	query.Limit = readinessQuery.Limit
	query.TopN = readinessQuery.TopN
	query.SearchId = strings.TrimSpace(query.SearchId)
	query.RemediationRunId = strings.TrimSpace(query.RemediationRunId)
	query.ChecklistAlias = strings.TrimSpace(query.ChecklistAlias)
	query.ReadinessStatus = strings.TrimSpace(query.ReadinessStatus)
	query.HistoryMode = strings.TrimSpace(query.HistoryMode)
	if query.ReadinessStatus != "" && !organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchReadinessStatusSupported(query.ReadinessStatus) {
		return query, fmt.Errorf("unsupported operator note readiness status filter %q", query.ReadinessStatus)
	}
	if query.HistoryMode != "" && !organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModeSupported(query.HistoryMode) {
		return query, fmt.Errorf("unsupported operator note audit search history mode %q", query.HistoryMode)
	}
	return query, nil
}

func newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchFilters(query OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery) OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchFilter {
	return OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchFilter{
		SearchId:               query.SearchId,
		NoteId:                 query.NoteId,
		NoteHash:               query.NoteHash,
		ReadinessId:            query.ReadinessId,
		ReadinessHash:          query.ReadinessHash,
		PacketAuditId:          query.PacketAuditId,
		PacketHash:             query.PacketHash,
		ApprovalPreviewId:      query.ApprovalPreviewId,
		ApprovalPreviewHash:    query.ApprovalPreviewHash,
		DraftId:                query.DraftId,
		RemediationRunId:       query.RemediationRunId,
		ActionAlias:            query.ActionAlias,
		EntityType:             query.EntityType,
		Keyword:                query.Keyword,
		SourceType:             query.SourceType,
		SourceConnectionIdHash: query.SourceConnectionIdHash,
		QualityStatus:          query.QualityStatus,
		ReasonCode:             query.ReasonCode,
		ChecklistAlias:         query.ChecklistAlias,
		RiskLevel:              query.RiskLevel,
		PacketStatus:           query.PacketStatus,
		ReadinessStatus:        query.ReadinessStatus,
		IncludeHistorical:      query.IncludeHistorical,
		HistoryMode:            query.HistoryMode,
		Limit:                  query.Limit,
		TopN:                   query.TopN,
	}
}

func newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem(query OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery, readiness OrganizationDirectoryRemediationOperatorNotePersistenceReadiness, historicalRequired bool, resultCannotInfer []string) OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem {
	riskLevel := query.RiskLevel
	if riskLevel == "" {
		riskLevel = OrganizationDirectoryRemediationApprovalRiskMedium
		if organizationDirectoryQualityContainsString(readiness.BlockedReasons, OrganizationDirectoryRemediationOperatorNotePersistenceBlockerApprovalPacketBlocked) {
			riskLevel = OrganizationDirectoryRemediationApprovalRiskBlocked
		}
	}
	packetStatus := query.PacketStatus
	if packetStatus == "" {
		packetStatus = OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval
		if organizationDirectoryQualityContainsString(readiness.BlockedReasons, OrganizationDirectoryRemediationOperatorNotePersistenceBlockerApprovalPacketBlocked) {
			packetStatus = OrganizationDirectoryRemediationApprovalPacketStatusBlocked
		}
	}
	checklistAliases := organizationDirectoryRemediationUniqueStrings(append(append(append(append([]string{},
		readiness.PermissionChecklist...),
		readiness.RetentionChecklist...),
		readiness.AuditSemanticsChecklist...),
		readiness.ManualReviewGate...))
	reasonAliases := organizationDirectoryRemediationUniqueStrings(append([]string{}, readiness.BlockedReasons...))
	if query.ReasonCode != "" {
		reasonAliases = append(reasonAliases, query.ReasonCode)
	}
	if len(reasonAliases) == 0 {
		reasonAliases = append(reasonAliases, readiness.ReadinessStatus)
	}
	cannotInfer := organizationDirectoryRemediationUniqueStrings(append(append([]string{}, readiness.CannotInfer...), resultCannotInfer...))
	displaySafeLabel := fmt.Sprintf("%s/%s operator note readonly audit", readiness.EntityType, readiness.ActionAlias)
	hash := organizationDirectoryQualityHash(strings.Join([]string{
		"operator-note-readonly-audit-search-item",
		readiness.NoteHash,
		readiness.ReadinessHash,
		readiness.PacketHash,
		readiness.ApprovalPreviewHash,
		readiness.DraftId,
		readiness.ActionAlias,
		readiness.EntityType,
		riskLevel,
		packetStatus,
		readiness.ReadinessStatus,
		fmt.Sprintf("%t", historicalRequired),
	}, "|"))
	item := OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem{
		AuditSearchItemId:    "operator-note-readonly-audit-search-item:" + strings.TrimPrefix(hash, "sha256:"),
		NoteHash:             readiness.NoteHash,
		ReadinessHash:        readiness.ReadinessHash,
		PacketHash:           readiness.PacketHash,
		ApprovalPreviewHash:  readiness.ApprovalPreviewHash,
		DraftId:              readiness.DraftId,
		ActionAlias:          readiness.ActionAlias,
		EntityType:           readiness.EntityType,
		RiskLevel:            riskLevel,
		PacketStatus:         packetStatus,
		ReadinessStatus:      readiness.ReadinessStatus,
		ChecklistAliases:     checklistAliases,
		ReasonAliases:        organizationDirectoryRemediationUniqueStrings(reasonAliases),
		DisplaySafeLabel:     displaySafeLabel,
		ExecutionMode:        OrganizationDirectoryRemediationExecutionManualReviewOnly,
		AutoExecutionAllowed: false,
		NoteScope:            OrganizationDirectoryRemediationOperatorNoteScopeDerivedDraft,
		RetentionPolicy:      OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted,
		StorageScope:         OrganizationDirectoryRemediationOperatorNotePersistenceStorageReadinessOnly,
		ManualReviewOnly:     true,
		RedactedFields:       organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedFields(),
		SourceVersionSummary: "sourceVersion=current_derived_metadata_only",
		OrgVersionSummary:    "orgVersion=current_admin_read_model_only",
		CannotInfer:          cannotInfer,
		BlockedReasons:       append([]string{}, readiness.BlockedReasons...),
		SafeSummary: fmt.Sprintf("Readonly handoff audit search for %s remains manual-review-only; persistenceRequiredForHistoricalSearch=%t.",
			displaySafeLabel, historicalRequired),
	}
	item.MarkdownSummary = organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchMarkdown(item, historicalRequired)
	item.ExportSummary = newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemExport(item)
	return item
}

func organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemMatches(item OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem, query OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery) bool {
	if query.ReadinessStatus != "" && item.ReadinessStatus != query.ReadinessStatus {
		return false
	}
	if query.ChecklistAlias != "" && !organizationDirectoryQualityContainsString(item.ChecklistAliases, query.ChecklistAlias) {
		return false
	}
	return true
}

func organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRequiresPersistence(query OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery) bool {
	return query.IncludeHistorical ||
		query.HistoryMode == OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModePersistent ||
		query.RemediationRunId != ""
}

func organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInfer(historicalRequired bool) []string {
	cannotInfer := []string{
		OrganizationDirectoryRemediationOperatorNoteCannotInferRealPersonIdentity,
		OrganizationDirectoryRemediationOperatorNoteCannotInferContactIdentifier,
		OrganizationDirectoryRemediationOperatorNoteCannotInferSourceContent,
		OrganizationDirectoryRemediationOperatorNoteCannotInferGatewayAPIExecutionState,
		OrganizationDirectoryRemediationOperatorNoteCannotInferAutoExecution,
		OrganizationDirectoryRemediationOperatorNoteCannotInferPersistentAuditEvidence,
	}
	if historicalRequired {
		cannotInfer = append(cannotInfer,
			OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferHistoricalCompleteness,
			OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferSavedOperatorComments,
			OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferHandoffAcknowledgements,
			OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferDurableRetentionEvidence,
		)
	}
	return organizationDirectoryRemediationUniqueStrings(cannotInfer)
}

func organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedFields() []string {
	return []string{
		OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedToken,
		OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedCookie,
		OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedSecret,
		OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedPrivateURL,
		OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedContactIdentifier,
		OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedRawSourcePayload,
		OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedFullOrgTree,
		OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedExecutionArtifacts,
	}
}

func organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchMarkdown(item OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem, historicalRequired bool) string {
	lines := []string{
		"# Operator Note Readonly Audit Search",
		"",
		fmt.Sprintf("- noteHash: `%s`", item.NoteHash),
		fmt.Sprintf("- readinessHash: `%s`", item.ReadinessHash),
		fmt.Sprintf("- packetHash: `%s`", item.PacketHash),
		fmt.Sprintf("- approvalPreviewHash: `%s`", item.ApprovalPreviewHash),
		fmt.Sprintf("- draftId: `%s`", item.DraftId),
		fmt.Sprintf("- actionAlias: `%s`", item.ActionAlias),
		fmt.Sprintf("- entityType: `%s`", item.EntityType),
		fmt.Sprintf("- riskLevel: `%s`", item.RiskLevel),
		fmt.Sprintf("- packetStatus: `%s`", item.PacketStatus),
		fmt.Sprintf("- readinessStatus: `%s`", item.ReadinessStatus),
		fmt.Sprintf("- executionMode: `%s`", item.ExecutionMode),
		fmt.Sprintf("- autoExecutionAllowed: `%t`", item.AutoExecutionAllowed),
		fmt.Sprintf("- manualReviewOnly: `%t`", item.ManualReviewOnly),
		fmt.Sprintf("- persistenceRequiredForHistoricalSearch: `%t`", historicalRequired),
		"",
		"## Safe Summary",
		item.SafeSummary,
		"",
		"## Checklist Aliases",
		"- " + strings.Join(item.ChecklistAliases, "\n- "),
		"",
		"## Reason Aliases",
		"- " + strings.Join(item.ReasonAliases, "\n- "),
		"",
		"## cannotInfer",
		"- " + strings.Join(item.CannotInfer, "\n- "),
		"",
		"## Redacted Fields",
		"- " + strings.Join(item.RedactedFields, "\n- "),
	}
	return strings.Join(lines, "\n")
}

func organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchReadinessStatusSupported(readinessStatus string) bool {
	switch readinessStatus {
	case OrganizationDirectoryRemediationOperatorNotePersistenceStatusReadyForDesignReview,
		OrganizationDirectoryRemediationOperatorNotePersistenceStatusBlocked:
		return true
	default:
		return false
	}
}

func organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModeSupported(historyMode string) bool {
	switch historyMode {
	case OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModeCurrentDerived,
		OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModePersistent:
		return true
	default:
		return false
	}
}

func organizationDirectoryRemediationOperatorNoteReadonlyAuditSearchId(query OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery, items []OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem, historicalRequired bool) string {
	itemHashes := make([]string, 0, len(items))
	for _, item := range items {
		itemHashes = append(itemHashes, item.AuditSearchItemId)
	}
	hash := organizationDirectoryQualityHash(strings.Join([]string{
		"operator-note-readonly-audit-search",
		query.OrganizationId,
		query.NoteHash,
		query.ReadinessHash,
		query.PacketHash,
		query.ApprovalPreviewHash,
		query.DraftId,
		query.RemediationRunId,
		query.ActionAlias,
		query.EntityType,
		query.RiskLevel,
		query.PacketStatus,
		query.ReadinessStatus,
		query.ChecklistAlias,
		fmt.Sprintf("%t", historicalRequired),
		strings.Join(itemHashes, ","),
	}, "|"))
	return "operator-note-readonly-audit-search:" + strings.TrimPrefix(hash, "sha256:")
}

func newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchExport(generatedAt time.Time, historicalRequired bool, cannotInfer []string, items []OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem) OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchExport {
	exportItems := make([]OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemExport, 0, len(items))
	for _, item := range items {
		exportItems = append(exportItems, newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemExport(item))
	}
	return OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchExport{
		GeneratedAt:                            generatedAt,
		Boundary:                               organizationDirectoryRemediationBoundary,
		SearchScope:                            OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchScopeCurrentDerived,
		PersistenceRequiredForHistoricalSearch: historicalRequired,
		CannotInfer:                            append([]string{}, cannotInfer...),
		Items:                                  exportItems,
	}
}

func newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemExport(item OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItem) OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemExport {
	return OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchItemExport{
		NoteHash:             item.NoteHash,
		ReadinessHash:        item.ReadinessHash,
		PacketHash:           item.PacketHash,
		ApprovalPreviewHash:  item.ApprovalPreviewHash,
		DraftId:              item.DraftId,
		ActionAlias:          item.ActionAlias,
		EntityType:           item.EntityType,
		RiskLevel:            item.RiskLevel,
		PacketStatus:         item.PacketStatus,
		ReadinessStatus:      item.ReadinessStatus,
		ChecklistAliases:     append([]string{}, item.ChecklistAliases...),
		ReasonAliases:        append([]string{}, item.ReasonAliases...),
		DisplaySafeLabel:     item.DisplaySafeLabel,
		ExecutionMode:        OrganizationDirectoryRemediationExecutionManualReviewOnly,
		AutoExecutionAllowed: false,
		NoteScope:            OrganizationDirectoryRemediationOperatorNoteScopeDerivedDraft,
		RetentionPolicy:      OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted,
		StorageScope:         OrganizationDirectoryRemediationOperatorNotePersistenceStorageReadinessOnly,
		ManualReviewOnly:     true,
		RedactedFields:       append([]string{}, item.RedactedFields...),
		SourceVersionSummary: item.SourceVersionSummary,
		OrgVersionSummary:    item.OrgVersionSummary,
		CannotInfer:          append([]string{}, item.CannotInfer...),
		BlockedReasons:       append([]string{}, item.BlockedReasons...),
		SafeSummary:          item.SafeSummary,
		MarkdownSummary:      item.MarkdownSummary,
	}
}
