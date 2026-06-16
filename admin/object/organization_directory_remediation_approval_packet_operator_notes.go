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
	OrganizationDirectoryRemediationOperatorNoteScopeDerivedDraft = "derived_note_draft"
	OrganizationDirectoryRemediationOperatorNoteFormatMarkdown    = "markdown"

	OrganizationDirectoryRemediationOperatorNoteCannotInferRealPersonIdentity       = "real_person_identity"
	OrganizationDirectoryRemediationOperatorNoteCannotInferContactIdentifier        = "contact_identifier"
	OrganizationDirectoryRemediationOperatorNoteCannotInferSourceContent            = "source_content"
	OrganizationDirectoryRemediationOperatorNoteCannotInferGatewayAPIExecutionState = "gateway_or_api_execution_state"
	OrganizationDirectoryRemediationOperatorNoteCannotInferAutoExecution            = "auto_execution_allowed"
	OrganizationDirectoryRemediationOperatorNoteCannotInferPersistentAuditEvidence  = "persistent_audit_evidence"
)

// OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery 限定只读 operator handoff notes 的组织范围和筛选条件。
type OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery struct {
	OrganizationId         string
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

// OrganizationDirectoryRemediationApprovalPacketOperatorNotesResult 是面向 operator 的只读交接备注响应。
type OrganizationDirectoryRemediationApprovalPacketOperatorNotesResult struct {
	OrganizationId string                                                            `json:"organizationId"`
	GeneratedAt    time.Time                                                         `json:"generatedAt"`
	Filters        OrganizationDirectoryRemediationApprovalPacketOperatorNotesFilter `json:"filters"`
	TotalNoteCount int                                                               `json:"totalNoteCount"`
	Notes          []OrganizationDirectoryRemediationApprovalPacketOperatorNote      `json:"notes"`
	ExportSummary  OrganizationDirectoryRemediationApprovalPacketOperatorNotesExport `json:"exportSummary"`
	Boundary       string                                                            `json:"boundary"`
}

// OrganizationDirectoryRemediationApprovalPacketOperatorNotesFilter 回显本次备注生成使用的安全筛选条件。
type OrganizationDirectoryRemediationApprovalPacketOperatorNotesFilter struct {
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

// OrganizationDirectoryRemediationApprovalPacketOperatorNote 是非持久化派生 handoff note 草稿。
type OrganizationDirectoryRemediationApprovalPacketOperatorNote struct {
	NoteId               string                                                           `json:"noteId"`
	NoteHash             string                                                           `json:"noteHash"`
	PacketHash           string                                                           `json:"packetHash"`
	ApprovalPreviewHash  string                                                           `json:"approvalPreviewHash"`
	DraftId              string                                                           `json:"draftId"`
	ActionAlias          string                                                           `json:"actionAlias"`
	EntityType           string                                                           `json:"entityType"`
	ExecutionMode        string                                                           `json:"executionMode"`
	AutoExecutionAllowed bool                                                             `json:"autoExecutionAllowed"`
	NoteScope            string                                                           `json:"noteScope"`
	RetentionPolicy      string                                                           `json:"retentionPolicy"`
	NoteFormat           string                                                           `json:"noteFormat"`
	HandoffSummary       string                                                           `json:"handoffSummary"`
	RiskSummary          string                                                           `json:"riskSummary"`
	StatusSummary        string                                                           `json:"statusSummary"`
	ChecklistSummary     []string                                                         `json:"checklistSummary"`
	CannotInfer          []string                                                         `json:"cannotInfer"`
	OperatorNextSteps    []string                                                         `json:"operatorNextSteps"`
	SampleStableHashes   []string                                                         `json:"sampleStableHashes"`
	MarkdownSummary      string                                                           `json:"markdownSummary"`
	ExportSummary        OrganizationDirectoryRemediationApprovalPacketOperatorNoteExport `json:"exportSummary"`
}

// OrganizationDirectoryRemediationApprovalPacketOperatorNotesExport 是前端可复制/下载的脱敏备注集合。
type OrganizationDirectoryRemediationApprovalPacketOperatorNotesExport struct {
	GeneratedAt     time.Time                                                          `json:"generatedAt"`
	Boundary        string                                                             `json:"boundary"`
	NoteScope       string                                                             `json:"noteScope"`
	RetentionPolicy string                                                             `json:"retentionPolicy"`
	Notes           []OrganizationDirectoryRemediationApprovalPacketOperatorNoteExport `json:"notes"`
}

// OrganizationDirectoryRemediationApprovalPacketOperatorNoteExport 只保留交接协作所需的安全字段。
type OrganizationDirectoryRemediationApprovalPacketOperatorNoteExport struct {
	NoteHash             string   `json:"noteHash"`
	PacketHash           string   `json:"packetHash"`
	ApprovalPreviewHash  string   `json:"approvalPreviewHash"`
	DraftId              string   `json:"draftId"`
	ActionAlias          string   `json:"actionAlias"`
	EntityType           string   `json:"entityType"`
	ExecutionMode        string   `json:"executionMode"`
	AutoExecutionAllowed bool     `json:"autoExecutionAllowed"`
	NoteScope            string   `json:"noteScope"`
	RetentionPolicy      string   `json:"retentionPolicy"`
	NoteFormat           string   `json:"noteFormat"`
	HandoffSummary       string   `json:"handoffSummary"`
	RiskSummary          string   `json:"riskSummary"`
	StatusSummary        string   `json:"statusSummary"`
	ChecklistSummary     []string `json:"checklistSummary"`
	CannotInfer          []string `json:"cannotInfer"`
	OperatorNextSteps    []string `json:"operatorNextSteps"`
	SampleStableHashes   []string `json:"sampleStableHashes"`
	MarkdownSummary      string   `json:"markdownSummary"`
}

// OrganizationDirectoryRemediationApprovalPacketOperatorNotesService 基于审批包审计派生只读交接备注草稿。
type OrganizationDirectoryRemediationApprovalPacketOperatorNotesService struct {
	AuditService OrganizationDirectoryRemediationApprovalPacketAuditService
	Now          func() time.Time
}

// GetOrganizationDirectoryRemediationApprovalPacketOperatorNotes 使用默认只读服务生成 approval packet operator notes。
func GetOrganizationDirectoryRemediationApprovalPacketOperatorNotes(query OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery) (*OrganizationDirectoryRemediationApprovalPacketOperatorNotesResult, error) {
	return (OrganizationDirectoryRemediationApprovalPacketOperatorNotesService{}).GetOperatorNotes(query)
}

// GetOperatorNotes 只派生 handoff note 草稿，不持久化、不执行修复、不写入 Admin/Gateway/下游系统。
func (s OrganizationDirectoryRemediationApprovalPacketOperatorNotesService) GetOperatorNotes(query OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery) (*OrganizationDirectoryRemediationApprovalPacketOperatorNotesResult, error) {
	normalized, err := normalizeOrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery(query)
	if err != nil {
		return nil, err
	}
	result := &OrganizationDirectoryRemediationApprovalPacketOperatorNotesResult{
		OrganizationId: normalized.OrganizationId,
		GeneratedAt:    s.now(),
		Filters:        newOrganizationDirectoryRemediationApprovalPacketOperatorNotesFilters(normalized),
		Notes:          []OrganizationDirectoryRemediationApprovalPacketOperatorNote{},
		Boundary:       organizationDirectoryRemediationBoundary,
	}
	if normalized.OrganizationId == "" || normalized.QualityStatus == OrganizationMasterDataQualityStatusReady {
		result.ExportSummary = newOrganizationDirectoryRemediationApprovalPacketOperatorNotesExport(result.GeneratedAt, result.Notes)
		return result, nil
	}

	auditQuery := OrganizationDirectoryRemediationApprovalPacketAuditQuery{
		OrganizationId:         normalized.OrganizationId,
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
	}
	audits, err := s.auditService().GetApprovalPacketAudits(auditQuery)
	if err != nil {
		return nil, err
	}
	for _, audit := range audits.PacketAudits {
		note := newOrganizationDirectoryRemediationApprovalPacketOperatorNote(audit)
		if organizationDirectoryRemediationApprovalPacketOperatorNoteMatches(note, normalized) {
			result.Notes = append(result.Notes, note)
		}
	}
	result.TotalNoteCount = len(result.Notes)
	result.ExportSummary = newOrganizationDirectoryRemediationApprovalPacketOperatorNotesExport(result.GeneratedAt, result.Notes)
	return result, nil
}

func (s OrganizationDirectoryRemediationApprovalPacketOperatorNotesService) auditService() OrganizationDirectoryRemediationApprovalPacketAuditService {
	if s.AuditService.Now == nil {
		s.AuditService.Now = s.now
	}
	return s.AuditService
}

func (s OrganizationDirectoryRemediationApprovalPacketOperatorNotesService) now() time.Time {
	if s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func normalizeOrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery(query OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery) (OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery, error) {
	auditQuery, err := normalizeOrganizationDirectoryRemediationApprovalPacketAuditQuery(OrganizationDirectoryRemediationApprovalPacketAuditQuery{
		OrganizationId:         query.OrganizationId,
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
	query.OrganizationId = auditQuery.OrganizationId
	query.PacketAuditId = auditQuery.PacketAuditId
	query.PacketHash = auditQuery.PacketHash
	query.ApprovalPreviewId = auditQuery.ApprovalPreviewId
	query.ApprovalPreviewHash = auditQuery.ApprovalPreviewHash
	query.DraftId = auditQuery.DraftId
	query.ActionAlias = auditQuery.ActionAlias
	query.EntityType = auditQuery.EntityType
	query.Keyword = auditQuery.Keyword
	query.SourceType = auditQuery.SourceType
	query.SourceConnectionIdHash = auditQuery.SourceConnectionIdHash
	query.QualityStatus = auditQuery.QualityStatus
	query.ReasonCode = auditQuery.ReasonCode
	query.RiskLevel = auditQuery.RiskLevel
	query.PacketStatus = auditQuery.PacketStatus
	query.Limit = auditQuery.Limit
	query.TopN = auditQuery.TopN
	query.NoteId = strings.TrimSpace(query.NoteId)
	query.NoteHash = strings.TrimSpace(query.NoteHash)
	return query, nil
}

func newOrganizationDirectoryRemediationApprovalPacketOperatorNotesFilters(query OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery) OrganizationDirectoryRemediationApprovalPacketOperatorNotesFilter {
	return OrganizationDirectoryRemediationApprovalPacketOperatorNotesFilter{
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

func newOrganizationDirectoryRemediationApprovalPacketOperatorNote(audit OrganizationDirectoryRemediationApprovalPacketAudit) OrganizationDirectoryRemediationApprovalPacketOperatorNote {
	cannotInfer := organizationDirectoryRemediationOperatorNoteCannotInfer()
	checklist := organizationDirectoryRemediationUniqueStrings(append([]string{}, audit.OperatorChecklistDigest...))
	nextSteps := organizationDirectoryRemediationApprovalPacketOperatorNextSteps(audit)
	handoffSummary := fmt.Sprintf("Handoff draft for %s %s affecting %d sanitized subjects; packet=%s, preview=%s.",
		audit.EntityType, audit.ActionAlias, audit.AffectedCount, audit.PacketHash, audit.ApprovalPreviewHash)
	riskSummary := fmt.Sprintf("risk=%s; requiredApprovals=%s; blockedReasons=%s.",
		audit.RiskLevel, strings.Join(audit.RequiredApprovals, ","), strings.Join(audit.BlockedReasons, ","))
	statusSummary := fmt.Sprintf("packetStatus=%s; storageScope=%s; retentionPolicy=%s; executionMode=%s; autoExecutionAllowed=false.",
		audit.PacketStatus, OrganizationDirectoryRemediationApprovalPacketStorageDerivedNonPersistent, OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted, OrganizationDirectoryRemediationExecutionManualReviewOnly)
	hash := organizationDirectoryQualityHash(strings.Join([]string{
		"operator-note",
		audit.PacketHash,
		audit.ApprovalPreviewHash,
		audit.DraftId,
		audit.ActionAlias,
		audit.EntityType,
		audit.PacketStatus,
		audit.RiskLevel,
		strings.Join(audit.BlockedReasons, ","),
		strings.Join(checklist, ","),
		strings.Join(audit.SampleStableHashes, ","),
		strings.Join(cannotInfer, ","),
	}, "|"))
	note := OrganizationDirectoryRemediationApprovalPacketOperatorNote{
		NoteId:               "operator-note:" + strings.TrimPrefix(hash, "sha256:"),
		NoteHash:             hash,
		PacketHash:           audit.PacketHash,
		ApprovalPreviewHash:  audit.ApprovalPreviewHash,
		DraftId:              audit.DraftId,
		ActionAlias:          audit.ActionAlias,
		EntityType:           audit.EntityType,
		ExecutionMode:        OrganizationDirectoryRemediationExecutionManualReviewOnly,
		AutoExecutionAllowed: false,
		NoteScope:            OrganizationDirectoryRemediationOperatorNoteScopeDerivedDraft,
		RetentionPolicy:      OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted,
		NoteFormat:           OrganizationDirectoryRemediationOperatorNoteFormatMarkdown,
		HandoffSummary:       handoffSummary,
		RiskSummary:          riskSummary,
		StatusSummary:        statusSummary,
		ChecklistSummary:     checklist,
		CannotInfer:          cannotInfer,
		OperatorNextSteps:    nextSteps,
		SampleStableHashes:   append([]string{}, audit.SampleStableHashes...),
	}
	note.MarkdownSummary = organizationDirectoryRemediationApprovalPacketOperatorNoteMarkdown(note)
	note.ExportSummary = newOrganizationDirectoryRemediationApprovalPacketOperatorNoteExport(note)
	return note
}

func organizationDirectoryRemediationApprovalPacketOperatorNextSteps(audit OrganizationDirectoryRemediationApprovalPacketAudit) []string {
	steps := []string{
		"将这份脱敏交接备注草稿交给人工 reviewer。",
		"仅基于 packet hash、preview hash、risk、blocker、checklist 和 sample stable hashes 做人工核对。",
	}
	if audit.PacketStatus == OrganizationDirectoryRemediationApprovalPacketStatusBlocked {
		steps = append(steps, "先处理 blocked reasons，再将审批包视为可进入人工审批。")
	} else {
		steps = append(steps, "未来如需执行 remediation，必须在此派生备注之外确认 required approvals。")
	}
	steps = append(steps, "不得从此备注推断真实身份、联系方式、原始来源内容或下游执行状态。")
	return steps
}

func organizationDirectoryRemediationOperatorNoteCannotInfer() []string {
	return []string{
		OrganizationDirectoryRemediationOperatorNoteCannotInferRealPersonIdentity,
		OrganizationDirectoryRemediationOperatorNoteCannotInferContactIdentifier,
		OrganizationDirectoryRemediationOperatorNoteCannotInferSourceContent,
		OrganizationDirectoryRemediationOperatorNoteCannotInferGatewayAPIExecutionState,
		OrganizationDirectoryRemediationOperatorNoteCannotInferAutoExecution,
		OrganizationDirectoryRemediationOperatorNoteCannotInferPersistentAuditEvidence,
	}
}

func organizationDirectoryRemediationApprovalPacketOperatorNoteMarkdown(note OrganizationDirectoryRemediationApprovalPacketOperatorNote) string {
	lines := []string{
		"# Remediation Approval Packet Handoff Note",
		"",
		fmt.Sprintf("- noteHash: `%s`", note.NoteHash),
		fmt.Sprintf("- packetHash: `%s`", note.PacketHash),
		fmt.Sprintf("- approvalPreviewHash: `%s`", note.ApprovalPreviewHash),
		fmt.Sprintf("- draftId: `%s`", note.DraftId),
		fmt.Sprintf("- actionAlias: `%s`", note.ActionAlias),
		fmt.Sprintf("- entityType: `%s`", note.EntityType),
		fmt.Sprintf("- executionMode: `%s`", note.ExecutionMode),
		fmt.Sprintf("- autoExecutionAllowed: `%t`", note.AutoExecutionAllowed),
		fmt.Sprintf("- noteScope: `%s`", note.NoteScope),
		fmt.Sprintf("- retentionPolicy: `%s`", note.RetentionPolicy),
		"",
		"## Handoff Summary",
		note.HandoffSummary,
		"",
		"## Risk Summary",
		note.RiskSummary,
		"",
		"## Status Summary",
		note.StatusSummary,
		"",
		"## Checklist Summary",
		"- " + strings.Join(note.ChecklistSummary, "\n- "),
		"",
		"## cannotInfer",
		"- " + strings.Join(note.CannotInfer, "\n- "),
		"",
		"## Operator Next Steps",
		"- " + strings.Join(note.OperatorNextSteps, "\n- "),
		"",
		"## Sample Stable Hashes",
		"- " + strings.Join(note.SampleStableHashes, "\n- "),
	}
	return strings.Join(lines, "\n")
}

func organizationDirectoryRemediationApprovalPacketOperatorNoteMatches(note OrganizationDirectoryRemediationApprovalPacketOperatorNote, query OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery) bool {
	if query.NoteId != "" && note.NoteId != query.NoteId {
		return false
	}
	if query.NoteHash != "" && note.NoteHash != query.NoteHash {
		return false
	}
	return true
}

func newOrganizationDirectoryRemediationApprovalPacketOperatorNotesExport(generatedAt time.Time, notes []OrganizationDirectoryRemediationApprovalPacketOperatorNote) OrganizationDirectoryRemediationApprovalPacketOperatorNotesExport {
	items := make([]OrganizationDirectoryRemediationApprovalPacketOperatorNoteExport, 0, len(notes))
	for _, note := range notes {
		items = append(items, newOrganizationDirectoryRemediationApprovalPacketOperatorNoteExport(note))
	}
	return OrganizationDirectoryRemediationApprovalPacketOperatorNotesExport{
		GeneratedAt:     generatedAt,
		Boundary:        organizationDirectoryRemediationBoundary,
		NoteScope:       OrganizationDirectoryRemediationOperatorNoteScopeDerivedDraft,
		RetentionPolicy: OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted,
		Notes:           items,
	}
}

func newOrganizationDirectoryRemediationApprovalPacketOperatorNoteExport(note OrganizationDirectoryRemediationApprovalPacketOperatorNote) OrganizationDirectoryRemediationApprovalPacketOperatorNoteExport {
	return OrganizationDirectoryRemediationApprovalPacketOperatorNoteExport{
		NoteHash:             note.NoteHash,
		PacketHash:           note.PacketHash,
		ApprovalPreviewHash:  note.ApprovalPreviewHash,
		DraftId:              note.DraftId,
		ActionAlias:          note.ActionAlias,
		EntityType:           note.EntityType,
		ExecutionMode:        OrganizationDirectoryRemediationExecutionManualReviewOnly,
		AutoExecutionAllowed: false,
		NoteScope:            OrganizationDirectoryRemediationOperatorNoteScopeDerivedDraft,
		RetentionPolicy:      OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted,
		NoteFormat:           OrganizationDirectoryRemediationOperatorNoteFormatMarkdown,
		HandoffSummary:       note.HandoffSummary,
		RiskSummary:          note.RiskSummary,
		StatusSummary:        note.StatusSummary,
		ChecklistSummary:     append([]string{}, note.ChecklistSummary...),
		CannotInfer:          append([]string{}, note.CannotInfer...),
		OperatorNextSteps:    append([]string{}, note.OperatorNextSteps...),
		SampleStableHashes:   append([]string{}, note.SampleStableHashes...),
		MarkdownSummary:      note.MarkdownSummary,
	}
}
