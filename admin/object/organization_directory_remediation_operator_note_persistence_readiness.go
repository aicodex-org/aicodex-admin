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
	OrganizationDirectoryRemediationOperatorNotePersistenceStorageReadinessOnly = "readiness_only"

	OrganizationDirectoryRemediationOperatorNotePersistenceStatusReadyForDesignReview = "ready_for_design_review"
	OrganizationDirectoryRemediationOperatorNotePersistenceStatusBlocked              = "blocked"

	OrganizationDirectoryRemediationOperatorNotePersistenceBlockerApprovalPacketBlocked = "approval_packet_blocked"
	OrganizationDirectoryRemediationOperatorNotePersistenceBlockerSamplesMissing        = "sample_hashes_missing"
	OrganizationDirectoryRemediationOperatorNotePersistenceBlockerManualGateMissing     = "manual_review_gate_missing"
	OrganizationDirectoryRemediationOperatorNotePersistenceBlockerCannotInferMissing    = "cannot_infer_boundary_missing"
	OrganizationDirectoryRemediationOperatorNotePersistenceBlockerScopeMismatch         = "operator_note_scope_mismatch"
)

// OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery 限定 operator notes 持久化准入的组织范围和筛选条件。
type OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery struct {
	OrganizationId         string
	ReadinessId            string
	ReadinessHash          string
	NoteId                 string
	NoteHash               string
	PacketAuditId          string
	PacketHash             string
	ApprovalPreviewId      string
	ApprovalPreviewHash    string
	DraftId                string
	ActionAlias            string
	EntityType             string
	Keyword                string
	SourceType             string
	SourceConnectionIdHash string
	QualityStatus          string
	ReasonCode             string
	RiskLevel              string
	PacketStatus           string
	Limit                  int
	TopN                   int
}

// OrganizationDirectoryRemediationOperatorNotePersistenceReadinessResult 是面向 operator 的只读持久化准入响应。
type OrganizationDirectoryRemediationOperatorNotePersistenceReadinessResult struct {
	OrganizationId      string                                                                 `json:"organizationId"`
	GeneratedAt         time.Time                                                              `json:"generatedAt"`
	Filters             OrganizationDirectoryRemediationOperatorNotePersistenceReadinessFilter `json:"filters"`
	TotalReadinessCount int                                                                    `json:"totalReadinessCount"`
	Readiness           []OrganizationDirectoryRemediationOperatorNotePersistenceReadiness     `json:"readiness"`
	ExportSummary       OrganizationDirectoryRemediationOperatorNotePersistenceReadinessExport `json:"exportSummary"`
	Boundary            string                                                                 `json:"boundary"`
}

// OrganizationDirectoryRemediationOperatorNotePersistenceReadinessFilter 回显本次准入检查使用的安全筛选条件。
type OrganizationDirectoryRemediationOperatorNotePersistenceReadinessFilter struct {
	ReadinessId            string `json:"readinessId,omitempty"`
	ReadinessHash          string `json:"readinessHash,omitempty"`
	NoteId                 string `json:"noteId,omitempty"`
	NoteHash               string `json:"noteHash,omitempty"`
	PacketAuditId          string `json:"packetAuditId,omitempty"`
	PacketHash             string `json:"packetHash,omitempty"`
	ApprovalPreviewId      string `json:"approvalPreviewId,omitempty"`
	ApprovalPreviewHash    string `json:"approvalPreviewHash,omitempty"`
	DraftId                string `json:"draftId,omitempty"`
	ActionAlias            string `json:"actionAlias,omitempty"`
	EntityType             string `json:"entityType,omitempty"`
	Keyword                string `json:"keyword,omitempty"`
	SourceType             string `json:"sourceType,omitempty"`
	SourceConnectionIdHash string `json:"sourceConnectionIdHash,omitempty"`
	QualityStatus          string `json:"qualityStatus,omitempty"`
	ReasonCode             string `json:"reasonCode,omitempty"`
	RiskLevel              string `json:"riskLevel,omitempty"`
	PacketStatus           string `json:"packetStatus,omitempty"`
	Limit                  int    `json:"limit"`
	TopN                   int    `json:"topN"`
}

// OrganizationDirectoryRemediationOperatorNotePersistenceReadiness 表示一个非持久化的未来 notes store 准入检查。
type OrganizationDirectoryRemediationOperatorNotePersistenceReadiness struct {
	ReadinessId                     string                                                               `json:"readinessId"`
	ReadinessHash                   string                                                               `json:"readinessHash"`
	NoteHash                        string                                                               `json:"noteHash"`
	PacketHash                      string                                                               `json:"packetHash"`
	ApprovalPreviewHash             string                                                               `json:"approvalPreviewHash"`
	DraftId                         string                                                               `json:"draftId"`
	ActionAlias                     string                                                               `json:"actionAlias"`
	EntityType                      string                                                               `json:"entityType"`
	ExecutionMode                   string                                                               `json:"executionMode"`
	AutoExecutionAllowed            bool                                                                 `json:"autoExecutionAllowed"`
	StorageScope                    string                                                               `json:"storageScope"`
	PersistenceAllowed              bool                                                                 `json:"persistenceAllowed"`
	StoreDecisionRequired           bool                                                                 `json:"storeDecisionRequired"`
	ReadinessStatus                 string                                                               `json:"readinessStatus"`
	ReadyForPersistenceDesignReview bool                                                                 `json:"readyForPersistenceDesignReview"`
	IdempotencyKey                  string                                                               `json:"idempotencyKey"`
	IdempotencyComponents           []string                                                             `json:"idempotencyComponents"`
	PermissionChecklist             []string                                                             `json:"permissionChecklist"`
	RetentionChecklist              []string                                                             `json:"retentionChecklist"`
	AuditSemanticsChecklist         []string                                                             `json:"auditSemanticsChecklist"`
	RedactionChecklist              []string                                                             `json:"redactionChecklist"`
	ManualReviewGate                []string                                                             `json:"manualReviewGate"`
	CannotInfer                     []string                                                             `json:"cannotInfer"`
	BlockedReasons                  []string                                                             `json:"blockedReasons"`
	SafeSummary                     string                                                               `json:"safeSummary"`
	ExportSummary                   OrganizationDirectoryRemediationOperatorNotePersistenceReadinessItem `json:"exportSummary"`
}

// OrganizationDirectoryRemediationOperatorNotePersistenceReadinessExport 是前端可复制/下载的脱敏准入集合。
type OrganizationDirectoryRemediationOperatorNotePersistenceReadinessExport struct {
	GeneratedAt           time.Time                                                              `json:"generatedAt"`
	Boundary              string                                                                 `json:"boundary"`
	StorageScope          string                                                                 `json:"storageScope"`
	PersistenceAllowed    bool                                                                   `json:"persistenceAllowed"`
	StoreDecisionRequired bool                                                                   `json:"storeDecisionRequired"`
	Readiness             []OrganizationDirectoryRemediationOperatorNotePersistenceReadinessItem `json:"readiness"`
}

// OrganizationDirectoryRemediationOperatorNotePersistenceReadinessItem 只保留未来持久化准入所需的安全字段。
type OrganizationDirectoryRemediationOperatorNotePersistenceReadinessItem struct {
	ReadinessHash                   string   `json:"readinessHash"`
	NoteHash                        string   `json:"noteHash"`
	PacketHash                      string   `json:"packetHash"`
	ApprovalPreviewHash             string   `json:"approvalPreviewHash"`
	DraftId                         string   `json:"draftId"`
	ActionAlias                     string   `json:"actionAlias"`
	EntityType                      string   `json:"entityType"`
	ExecutionMode                   string   `json:"executionMode"`
	AutoExecutionAllowed            bool     `json:"autoExecutionAllowed"`
	StorageScope                    string   `json:"storageScope"`
	PersistenceAllowed              bool     `json:"persistenceAllowed"`
	StoreDecisionRequired           bool     `json:"storeDecisionRequired"`
	ReadinessStatus                 string   `json:"readinessStatus"`
	ReadyForPersistenceDesignReview bool     `json:"readyForPersistenceDesignReview"`
	IdempotencyKey                  string   `json:"idempotencyKey"`
	IdempotencyComponents           []string `json:"idempotencyComponents"`
	PermissionChecklist             []string `json:"permissionChecklist"`
	RetentionChecklist              []string `json:"retentionChecklist"`
	AuditSemanticsChecklist         []string `json:"auditSemanticsChecklist"`
	RedactionChecklist              []string `json:"redactionChecklist"`
	ManualReviewGate                []string `json:"manualReviewGate"`
	CannotInfer                     []string `json:"cannotInfer"`
	BlockedReasons                  []string `json:"blockedReasons"`
	SafeSummary                     string   `json:"safeSummary"`
}

// OrganizationDirectoryRemediationOperatorNotePersistenceReadinessService 基于只读 operator notes 派生未来持久化准入。
type OrganizationDirectoryRemediationOperatorNotePersistenceReadinessService struct {
	NotesService OrganizationDirectoryRemediationApprovalPacketOperatorNotesService
	Now          func() time.Time
}

// GetOrganizationDirectoryRemediationOperatorNotePersistenceReadiness 使用默认只读服务生成 operator note persistence readiness。
func GetOrganizationDirectoryRemediationOperatorNotePersistenceReadiness(query OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery) (*OrganizationDirectoryRemediationOperatorNotePersistenceReadinessResult, error) {
	return (OrganizationDirectoryRemediationOperatorNotePersistenceReadinessService{}).GetPersistenceReadiness(query)
}

// GetPersistenceReadiness 只生成持久化准入证据，不保存 notes、不创建审计事实、不执行修复。
func (s OrganizationDirectoryRemediationOperatorNotePersistenceReadinessService) GetPersistenceReadiness(query OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery) (*OrganizationDirectoryRemediationOperatorNotePersistenceReadinessResult, error) {
	normalized, err := normalizeOrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery(query)
	if err != nil {
		return nil, err
	}
	result := &OrganizationDirectoryRemediationOperatorNotePersistenceReadinessResult{
		OrganizationId: normalized.OrganizationId,
		GeneratedAt:    s.now(),
		Filters:        newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessFilters(normalized),
		Readiness:      []OrganizationDirectoryRemediationOperatorNotePersistenceReadiness{},
		Boundary:       organizationDirectoryRemediationBoundary,
	}
	if normalized.OrganizationId == "" || normalized.QualityStatus == OrganizationMasterDataQualityStatusReady {
		result.ExportSummary = newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessExport(result.GeneratedAt, result.Readiness)
		return result, nil
	}

	notesResult, err := s.notesService().GetOperatorNotes(OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{
		OrganizationId:         normalized.OrganizationId,
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
	for _, note := range notesResult.Notes {
		readiness := newOrganizationDirectoryRemediationOperatorNotePersistenceReadiness(normalized.OrganizationId, note)
		if organizationDirectoryRemediationOperatorNotePersistenceReadinessMatches(readiness, normalized) {
			result.Readiness = append(result.Readiness, readiness)
		}
	}
	result.TotalReadinessCount = len(result.Readiness)
	result.ExportSummary = newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessExport(result.GeneratedAt, result.Readiness)
	return result, nil
}

func (s OrganizationDirectoryRemediationOperatorNotePersistenceReadinessService) notesService() OrganizationDirectoryRemediationApprovalPacketOperatorNotesService {
	if s.NotesService.Now == nil {
		s.NotesService.Now = s.now
	}
	return s.NotesService
}

func (s OrganizationDirectoryRemediationOperatorNotePersistenceReadinessService) now() time.Time {
	if s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func normalizeOrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery(query OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery) (OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery, error) {
	notesQuery, err := normalizeOrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery(OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{
		OrganizationId:         query.OrganizationId,
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
	query.OrganizationId = notesQuery.OrganizationId
	query.NoteId = notesQuery.NoteId
	query.NoteHash = notesQuery.NoteHash
	query.PacketAuditId = notesQuery.PacketAuditId
	query.PacketHash = notesQuery.PacketHash
	query.ApprovalPreviewId = notesQuery.ApprovalPreviewId
	query.ApprovalPreviewHash = notesQuery.ApprovalPreviewHash
	query.DraftId = notesQuery.DraftId
	query.ActionAlias = notesQuery.ActionAlias
	query.EntityType = notesQuery.EntityType
	query.Keyword = notesQuery.Keyword
	query.SourceType = notesQuery.SourceType
	query.SourceConnectionIdHash = notesQuery.SourceConnectionIdHash
	query.QualityStatus = notesQuery.QualityStatus
	query.ReasonCode = notesQuery.ReasonCode
	query.RiskLevel = notesQuery.RiskLevel
	query.PacketStatus = notesQuery.PacketStatus
	query.Limit = notesQuery.Limit
	query.TopN = notesQuery.TopN
	query.ReadinessId = strings.TrimSpace(query.ReadinessId)
	query.ReadinessHash = strings.TrimSpace(query.ReadinessHash)
	return query, nil
}

func newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessFilters(query OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery) OrganizationDirectoryRemediationOperatorNotePersistenceReadinessFilter {
	return OrganizationDirectoryRemediationOperatorNotePersistenceReadinessFilter{
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
	}
}

func newOrganizationDirectoryRemediationOperatorNotePersistenceReadiness(organizationId string, note OrganizationDirectoryRemediationApprovalPacketOperatorNote) OrganizationDirectoryRemediationOperatorNotePersistenceReadiness {
	idempotencyComponents := organizationDirectoryRemediationOperatorNotePersistenceIdempotencyComponents()
	idempotencySeed := strings.Join([]string{
		strings.TrimSpace(organizationId),
		note.NoteHash,
		note.PacketHash,
		note.ApprovalPreviewHash,
		note.DraftId,
		note.ActionAlias,
		note.EntityType,
		note.NoteScope,
		note.RetentionPolicy,
		note.ExecutionMode,
	}, "|")
	idempotencyKey := "operator-note-persistence:" + strings.TrimPrefix(organizationDirectoryQualityHash(idempotencySeed), "sha256:")
	blockedReasons := organizationDirectoryRemediationOperatorNotePersistenceBlockedReasons(note)
	status := OrganizationDirectoryRemediationOperatorNotePersistenceStatusReadyForDesignReview
	readyForDesignReview := true
	if len(blockedReasons) > 0 {
		status = OrganizationDirectoryRemediationOperatorNotePersistenceStatusBlocked
		readyForDesignReview = false
	}
	hash := organizationDirectoryQualityHash(strings.Join([]string{
		"operator-note-persistence-readiness",
		strings.TrimSpace(organizationId),
		note.NoteHash,
		note.PacketHash,
		note.ApprovalPreviewHash,
		note.DraftId,
		note.ActionAlias,
		note.EntityType,
		idempotencyKey,
		status,
		strings.Join(blockedReasons, ","),
	}, "|"))
	readiness := OrganizationDirectoryRemediationOperatorNotePersistenceReadiness{
		ReadinessId:                     "operator-note-persistence-readiness:" + strings.TrimPrefix(hash, "sha256:"),
		ReadinessHash:                   hash,
		NoteHash:                        note.NoteHash,
		PacketHash:                      note.PacketHash,
		ApprovalPreviewHash:             note.ApprovalPreviewHash,
		DraftId:                         note.DraftId,
		ActionAlias:                     note.ActionAlias,
		EntityType:                      note.EntityType,
		ExecutionMode:                   OrganizationDirectoryRemediationExecutionManualReviewOnly,
		AutoExecutionAllowed:            false,
		StorageScope:                    OrganizationDirectoryRemediationOperatorNotePersistenceStorageReadinessOnly,
		PersistenceAllowed:              false,
		StoreDecisionRequired:           true,
		ReadinessStatus:                 status,
		ReadyForPersistenceDesignReview: readyForDesignReview,
		IdempotencyKey:                  idempotencyKey,
		IdempotencyComponents:           idempotencyComponents,
		PermissionChecklist:             organizationDirectoryRemediationOperatorNotePersistencePermissionChecklist(),
		RetentionChecklist:              organizationDirectoryRemediationOperatorNotePersistenceRetentionChecklist(),
		AuditSemanticsChecklist:         organizationDirectoryRemediationOperatorNotePersistenceAuditSemanticsChecklist(),
		RedactionChecklist:              organizationDirectoryRemediationOperatorNotePersistenceRedactionChecklist(),
		ManualReviewGate:                organizationDirectoryRemediationOperatorNotePersistenceManualReviewGate(),
		CannotInfer:                     append([]string{}, note.CannotInfer...),
		BlockedReasons:                  blockedReasons,
		SafeSummary: fmt.Sprintf("Operator note persistence readiness for %s/%s uses readiness-only storage; future store decision remains required.",
			note.EntityType, note.ActionAlias),
	}
	readiness.ExportSummary = newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessItem(readiness)
	return readiness
}

func organizationDirectoryRemediationOperatorNotePersistenceIdempotencyComponents() []string {
	return []string{
		"organizationId",
		"noteHash",
		"packetHash",
		"approvalPreviewHash",
		"draftId",
		"actionAlias",
		"entityType",
		"noteScope",
		"retentionPolicy",
		"executionMode",
	}
}

func organizationDirectoryRemediationOperatorNotePersistencePermissionChecklist() []string {
	return []string{
		"organization_scoped_operator_permission",
		"future_store_requires_admin_owner_policy",
		"write_permission_not_granted_in_p0",
	}
}

func organizationDirectoryRemediationOperatorNotePersistenceRetentionChecklist() []string {
	return []string{
		"retention_policy_required_before_store",
		"delete_or_expire_workflow_required_before_store",
		"p0_notes_remain_not_persisted",
	}
}

func organizationDirectoryRemediationOperatorNotePersistenceAuditSemanticsChecklist() []string {
	return []string{
		"derived_note_is_not_audit_fact",
		"future_store_must_record_actor_hash_and_reason_alias",
		"copy_export_events_not_persisted_in_p0",
	}
}

func organizationDirectoryRemediationOperatorNotePersistenceRedactionChecklist() []string {
	return []string{
		"stable_hash_only",
		"display_safe_label_only",
		"contact_identifier_not_exported",
		"source_content_not_exported",
	}
}

func organizationDirectoryRemediationOperatorNotePersistenceManualReviewGate() []string {
	return []string{
		"manual_review_only_required",
		"auto_execution_must_remain_false",
		"persistence_requires_separate_store_decision",
	}
}

func organizationDirectoryRemediationOperatorNotePersistenceBlockedReasons(note OrganizationDirectoryRemediationApprovalPacketOperatorNote) []string {
	reasons := []string{}
	if strings.Contains(note.StatusSummary, "packetStatus="+OrganizationDirectoryRemediationApprovalPacketStatusBlocked) {
		reasons = append(reasons, OrganizationDirectoryRemediationOperatorNotePersistenceBlockerApprovalPacketBlocked)
	}
	if len(note.SampleStableHashes) == 0 {
		reasons = append(reasons, OrganizationDirectoryRemediationOperatorNotePersistenceBlockerSamplesMissing)
	}
	if note.ExecutionMode != OrganizationDirectoryRemediationExecutionManualReviewOnly || note.AutoExecutionAllowed {
		reasons = append(reasons, OrganizationDirectoryRemediationOperatorNotePersistenceBlockerManualGateMissing)
	}
	if note.NoteScope != OrganizationDirectoryRemediationOperatorNoteScopeDerivedDraft ||
		note.RetentionPolicy != OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted {
		reasons = append(reasons, OrganizationDirectoryRemediationOperatorNotePersistenceBlockerScopeMismatch)
	}
	if len(note.CannotInfer) == 0 {
		reasons = append(reasons, OrganizationDirectoryRemediationOperatorNotePersistenceBlockerCannotInferMissing)
	}
	return organizationDirectoryRemediationUniqueStrings(reasons)
}

func organizationDirectoryRemediationOperatorNotePersistenceReadinessMatches(readiness OrganizationDirectoryRemediationOperatorNotePersistenceReadiness, query OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery) bool {
	if query.ReadinessId != "" && readiness.ReadinessId != query.ReadinessId {
		return false
	}
	if query.ReadinessHash != "" && readiness.ReadinessHash != query.ReadinessHash {
		return false
	}
	return true
}

func newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessExport(generatedAt time.Time, readiness []OrganizationDirectoryRemediationOperatorNotePersistenceReadiness) OrganizationDirectoryRemediationOperatorNotePersistenceReadinessExport {
	items := make([]OrganizationDirectoryRemediationOperatorNotePersistenceReadinessItem, 0, len(readiness))
	for _, item := range readiness {
		items = append(items, newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessItem(item))
	}
	return OrganizationDirectoryRemediationOperatorNotePersistenceReadinessExport{
		GeneratedAt:           generatedAt,
		Boundary:              organizationDirectoryRemediationBoundary,
		StorageScope:          OrganizationDirectoryRemediationOperatorNotePersistenceStorageReadinessOnly,
		PersistenceAllowed:    false,
		StoreDecisionRequired: true,
		Readiness:             items,
	}
}

func newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessItem(readiness OrganizationDirectoryRemediationOperatorNotePersistenceReadiness) OrganizationDirectoryRemediationOperatorNotePersistenceReadinessItem {
	return OrganizationDirectoryRemediationOperatorNotePersistenceReadinessItem{
		ReadinessHash:                   readiness.ReadinessHash,
		NoteHash:                        readiness.NoteHash,
		PacketHash:                      readiness.PacketHash,
		ApprovalPreviewHash:             readiness.ApprovalPreviewHash,
		DraftId:                         readiness.DraftId,
		ActionAlias:                     readiness.ActionAlias,
		EntityType:                      readiness.EntityType,
		ExecutionMode:                   OrganizationDirectoryRemediationExecutionManualReviewOnly,
		AutoExecutionAllowed:            false,
		StorageScope:                    OrganizationDirectoryRemediationOperatorNotePersistenceStorageReadinessOnly,
		PersistenceAllowed:              false,
		StoreDecisionRequired:           true,
		ReadinessStatus:                 readiness.ReadinessStatus,
		ReadyForPersistenceDesignReview: readiness.ReadyForPersistenceDesignReview,
		IdempotencyKey:                  readiness.IdempotencyKey,
		IdempotencyComponents:           append([]string{}, readiness.IdempotencyComponents...),
		PermissionChecklist:             append([]string{}, readiness.PermissionChecklist...),
		RetentionChecklist:              append([]string{}, readiness.RetentionChecklist...),
		AuditSemanticsChecklist:         append([]string{}, readiness.AuditSemanticsChecklist...),
		RedactionChecklist:              append([]string{}, readiness.RedactionChecklist...),
		ManualReviewGate:                append([]string{}, readiness.ManualReviewGate...),
		CannotInfer:                     append([]string{}, readiness.CannotInfer...),
		BlockedReasons:                  append([]string{}, readiness.BlockedReasons...),
		SafeSummary:                     readiness.SafeSummary,
	}
}
