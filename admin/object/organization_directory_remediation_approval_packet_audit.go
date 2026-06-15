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
	"strings"
	"time"
)

const (
	OrganizationDirectoryRemediationApprovalPacketStorageDerivedNonPersistent = "derived_non_persistent"
	OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted       = "not_persisted"

	OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval = "ready_for_approval"
	OrganizationDirectoryRemediationApprovalPacketStatusBlocked          = "blocked"

	OrganizationDirectoryRemediationApprovalPacketEventGeneratedPreview      = "generated_preview"
	OrganizationDirectoryRemediationApprovalPacketEventAvailableForCopy      = "available_for_copy"
	OrganizationDirectoryRemediationApprovalPacketEventAvailableForExport    = "available_for_export"
	OrganizationDirectoryRemediationApprovalPacketEventBlockedReviewRequired = "blocked_review_required"
)

// OrganizationDirectoryRemediationApprovalPacketAuditQuery 限定只读审批包审计的组织范围和筛选条件。
type OrganizationDirectoryRemediationApprovalPacketAuditQuery struct {
	OrganizationId         string
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

// OrganizationDirectoryRemediationApprovalPacketAuditResult 是面向 operator 的只读审批包审计响应。
type OrganizationDirectoryRemediationApprovalPacketAuditResult struct {
	OrganizationId        string                                                    `json:"organizationId"`
	GeneratedAt           time.Time                                                 `json:"generatedAt"`
	Filters               OrganizationDirectoryRemediationApprovalPacketAuditFilter `json:"filters"`
	TotalPacketAuditCount int                                                       `json:"totalPacketAuditCount"`
	PacketAudits          []OrganizationDirectoryRemediationApprovalPacketAudit     `json:"packetAudits"`
	ExportSummary         OrganizationDirectoryRemediationApprovalPacketAuditExport `json:"exportSummary"`
	Boundary              string                                                    `json:"boundary"`
}

// OrganizationDirectoryRemediationApprovalPacketAuditFilter 回显本次审批包审计使用的安全筛选条件。
type OrganizationDirectoryRemediationApprovalPacketAuditFilter struct {
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

// OrganizationDirectoryRemediationApprovalPacketAudit 表示一个由审批预览派生的非持久化审计/历史记录。
type OrganizationDirectoryRemediationApprovalPacketAudit struct {
	PacketAuditId           string                                                  `json:"packetAuditId"`
	PacketHash              string                                                  `json:"packetHash"`
	ApprovalPreviewId       string                                                  `json:"approvalPreviewId"`
	ApprovalPreviewHash     string                                                  `json:"approvalPreviewHash"`
	DraftId                 string                                                  `json:"draftId"`
	ActionAlias             string                                                  `json:"actionAlias"`
	EntityType              string                                                  `json:"entityType"`
	ExecutionMode           string                                                  `json:"executionMode"`
	AutoExecutionAllowed    bool                                                    `json:"autoExecutionAllowed"`
	EventTypes              []string                                                `json:"eventTypes"`
	PacketStatus            string                                                  `json:"packetStatus"`
	RiskLevel               string                                                  `json:"riskLevel"`
	AffectedCount           int                                                     `json:"affectedCount"`
	BlockedReasons          []string                                                `json:"blockedReasons"`
	RequiredApprovals       []string                                                `json:"requiredApprovals"`
	OperatorChecklistDigest []string                                                `json:"operatorChecklistDigest"`
	SampleStableHashes      []string                                                `json:"sampleStableHashes"`
	SafeSummary             string                                                  `json:"safeSummary"`
	ExportSummary           OrganizationDirectoryRemediationApprovalPacketAuditItem `json:"exportSummary"`
	StorageScope            string                                                  `json:"storageScope"`
	RetentionPolicy         string                                                  `json:"retentionPolicy"`
}

// OrganizationDirectoryRemediationApprovalPacketAuditExport 是前端可复制/下载的脱敏审批包审计摘要。
type OrganizationDirectoryRemediationApprovalPacketAuditExport struct {
	GeneratedAt     time.Time                                                 `json:"generatedAt"`
	Boundary        string                                                    `json:"boundary"`
	StorageScope    string                                                    `json:"storageScope"`
	RetentionPolicy string                                                    `json:"retentionPolicy"`
	PacketAudits    []OrganizationDirectoryRemediationApprovalPacketAuditItem `json:"packetAudits"`
}

// OrganizationDirectoryRemediationApprovalPacketAuditItem 只保留审批包审计所需的安全字段。
type OrganizationDirectoryRemediationApprovalPacketAuditItem struct {
	PacketHash              string   `json:"packetHash"`
	ApprovalPreviewHash     string   `json:"approvalPreviewHash"`
	DraftId                 string   `json:"draftId"`
	ActionAlias             string   `json:"actionAlias"`
	EntityType              string   `json:"entityType"`
	ExecutionMode           string   `json:"executionMode"`
	AutoExecutionAllowed    bool     `json:"autoExecutionAllowed"`
	EventTypes              []string `json:"eventTypes"`
	PacketStatus            string   `json:"packetStatus"`
	RiskLevel               string   `json:"riskLevel"`
	AffectedCount           int      `json:"affectedCount"`
	BlockedReasons          []string `json:"blockedReasons"`
	RequiredApprovals       []string `json:"requiredApprovals"`
	OperatorChecklistDigest []string `json:"operatorChecklistDigest"`
	SampleStableHashes      []string `json:"sampleStableHashes"`
	SafeSummary             string   `json:"safeSummary"`
	StorageScope            string   `json:"storageScope"`
	RetentionPolicy         string   `json:"retentionPolicy"`
}

// OrganizationDirectoryRemediationApprovalPacketAuditService 基于审批预览派生只读审计/历史视图。
type OrganizationDirectoryRemediationApprovalPacketAuditService struct {
	ApprovalPreviewService OrganizationDirectoryRemediationApprovalPreviewService
	Now                    func() time.Time
}

// GetOrganizationDirectoryRemediationApprovalPacketAudits 使用默认只读服务生成 approval packet audit。
func GetOrganizationDirectoryRemediationApprovalPacketAudits(query OrganizationDirectoryRemediationApprovalPacketAuditQuery) (*OrganizationDirectoryRemediationApprovalPacketAuditResult, error) {
	return (OrganizationDirectoryRemediationApprovalPacketAuditService{}).GetApprovalPacketAudits(query)
}

// GetApprovalPacketAudits 只派生审计视图，不持久化、不执行修复、不写入 Admin/Gateway/下游系统。
func (s OrganizationDirectoryRemediationApprovalPacketAuditService) GetApprovalPacketAudits(query OrganizationDirectoryRemediationApprovalPacketAuditQuery) (*OrganizationDirectoryRemediationApprovalPacketAuditResult, error) {
	normalized, err := normalizeOrganizationDirectoryRemediationApprovalPacketAuditQuery(query)
	if err != nil {
		return nil, err
	}
	result := &OrganizationDirectoryRemediationApprovalPacketAuditResult{
		OrganizationId: normalized.OrganizationId,
		GeneratedAt:    s.now().UTC(),
		Filters:        newOrganizationDirectoryRemediationApprovalPacketAuditFilters(normalized),
		PacketAudits:   []OrganizationDirectoryRemediationApprovalPacketAudit{},
		Boundary:       organizationDirectoryRemediationBoundary,
	}
	if normalized.OrganizationId == "" || normalized.QualityStatus == OrganizationMasterDataQualityStatusReady {
		result.ExportSummary = newOrganizationDirectoryRemediationApprovalPacketAuditExport(result.GeneratedAt, result.PacketAudits)
		return result, nil
	}

	previewResult, err := s.approvalPreviewService().GetApprovalPreviews(OrganizationDirectoryRemediationApprovalPreviewQuery{
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
	for _, preview := range previewResult.ApprovalPreviews {
		audit := newOrganizationDirectoryRemediationApprovalPacketAudit(preview)
		if !organizationDirectoryRemediationApprovalPacketAuditMatches(audit, normalized) {
			continue
		}
		result.PacketAudits = append(result.PacketAudits, audit)
	}
	result.TotalPacketAuditCount = len(result.PacketAudits)
	result.ExportSummary = newOrganizationDirectoryRemediationApprovalPacketAuditExport(result.GeneratedAt, result.PacketAudits)
	return result, nil
}

func (s OrganizationDirectoryRemediationApprovalPacketAuditService) approvalPreviewService() OrganizationDirectoryRemediationApprovalPreviewService {
	service := s.ApprovalPreviewService
	if service.Now == nil {
		service.Now = s.Now
	}
	if service.PreflightService.Now == nil {
		service.PreflightService.Now = s.Now
	}
	if service.PreflightService.DraftService.Now == nil {
		service.PreflightService.DraftService.Now = s.Now
	}
	return service
}

func (s OrganizationDirectoryRemediationApprovalPacketAuditService) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func normalizeOrganizationDirectoryRemediationApprovalPacketAuditQuery(query OrganizationDirectoryRemediationApprovalPacketAuditQuery) (OrganizationDirectoryRemediationApprovalPacketAuditQuery, error) {
	previewQuery, err := normalizeOrganizationDirectoryRemediationApprovalPreviewQuery(OrganizationDirectoryRemediationApprovalPreviewQuery{
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
	query.OrganizationId = previewQuery.OrganizationId
	query.DraftId = previewQuery.DraftId
	query.ActionAlias = previewQuery.ActionAlias
	query.EntityType = previewQuery.EntityType
	query.Keyword = previewQuery.Keyword
	query.SourceType = previewQuery.SourceType
	query.SourceConnectionIdHash = previewQuery.SourceConnectionIdHash
	query.QualityStatus = previewQuery.QualityStatus
	query.ReasonCode = previewQuery.ReasonCode
	query.Limit = previewQuery.Limit
	query.TopN = previewQuery.TopN
	query.PacketAuditId = normalizeGatewayProjectionString(query.PacketAuditId)
	query.PacketHash = normalizeGatewayProjectionString(query.PacketHash)
	query.ApprovalPreviewId = normalizeGatewayProjectionString(query.ApprovalPreviewId)
	query.ApprovalPreviewHash = normalizeGatewayProjectionString(query.ApprovalPreviewHash)
	query.RiskLevel = strings.ToLower(normalizeGatewayProjectionString(query.RiskLevel))
	query.PacketStatus = strings.ToLower(normalizeGatewayProjectionString(query.PacketStatus))
	if query.RiskLevel != "" && !organizationDirectoryRemediationApprovalRiskSupported(query.RiskLevel) {
		return query, fmt.Errorf("unsupported riskLevel: %s", query.RiskLevel)
	}
	if query.PacketStatus != "" && !organizationDirectoryRemediationApprovalPacketStatusSupported(query.PacketStatus) {
		return query, fmt.Errorf("unsupported packetStatus: %s", query.PacketStatus)
	}
	if query.PacketAuditId != "" && query.PacketHash != "" {
		return query, errors.New("packetAuditId and packetHash cannot both be specified")
	}
	return query, nil
}

func newOrganizationDirectoryRemediationApprovalPacketAuditFilters(query OrganizationDirectoryRemediationApprovalPacketAuditQuery) OrganizationDirectoryRemediationApprovalPacketAuditFilter {
	return OrganizationDirectoryRemediationApprovalPacketAuditFilter{
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

func newOrganizationDirectoryRemediationApprovalPacketAudit(preview OrganizationDirectoryRemediationApprovalPreview) OrganizationDirectoryRemediationApprovalPacketAudit {
	packetStatus := organizationDirectoryRemediationApprovalPacketStatus(preview)
	eventTypes := organizationDirectoryRemediationApprovalPacketEventTypes(packetStatus)
	checklistDigest := organizationDirectoryRemediationApprovalPacketChecklistDigest(preview.OperatorChecklist)
	packetHash := organizationDirectoryQualityHash(strings.Join([]string{
		"approval-packet-audit",
		preview.ApprovalPreviewHash,
		preview.DraftId,
		preview.ActionAlias,
		packetStatus,
		preview.RiskLevel,
		fmt.Sprint(preview.AffectedCount),
		strings.Join(preview.BlockedReasons, ","),
		strings.Join(preview.RequiredApprovals, ","),
		strings.Join(checklistDigest, ","),
		strings.Join(preview.SampleStableHashes, ","),
	}, "|"))
	audit := OrganizationDirectoryRemediationApprovalPacketAudit{
		PacketAuditId:           "approval-packet-audit:" + strings.TrimPrefix(packetHash, "sha256:"),
		PacketHash:              packetHash,
		ApprovalPreviewId:       preview.ApprovalPreviewId,
		ApprovalPreviewHash:     preview.ApprovalPreviewHash,
		DraftId:                 preview.DraftId,
		ActionAlias:             preview.ActionAlias,
		EntityType:              preview.EntityType,
		ExecutionMode:           OrganizationDirectoryRemediationExecutionManualReviewOnly,
		AutoExecutionAllowed:    false,
		EventTypes:              eventTypes,
		PacketStatus:            packetStatus,
		RiskLevel:               preview.RiskLevel,
		AffectedCount:           preview.AffectedCount,
		BlockedReasons:          append([]string{}, preview.BlockedReasons...),
		RequiredApprovals:       append([]string{}, preview.RequiredApprovals...),
		OperatorChecklistDigest: checklistDigest,
		SampleStableHashes:      append([]string{}, preview.SampleStableHashes...),
		SafeSummary:             preview.SafeSummary,
		StorageScope:            OrganizationDirectoryRemediationApprovalPacketStorageDerivedNonPersistent,
		RetentionPolicy:         OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted,
	}
	audit.ExportSummary = newOrganizationDirectoryRemediationApprovalPacketAuditItem(audit)
	return audit
}

func organizationDirectoryRemediationApprovalPacketAuditMatches(audit OrganizationDirectoryRemediationApprovalPacketAudit, query OrganizationDirectoryRemediationApprovalPacketAuditQuery) bool {
	if query.PacketAuditId != "" && audit.PacketAuditId != query.PacketAuditId {
		return false
	}
	if query.PacketHash != "" && audit.PacketHash != query.PacketHash {
		return false
	}
	if query.ApprovalPreviewId != "" && audit.ApprovalPreviewId != query.ApprovalPreviewId {
		return false
	}
	if query.ApprovalPreviewHash != "" && audit.ApprovalPreviewHash != query.ApprovalPreviewHash {
		return false
	}
	if query.RiskLevel != "" && audit.RiskLevel != query.RiskLevel {
		return false
	}
	if query.PacketStatus != "" && audit.PacketStatus != query.PacketStatus {
		return false
	}
	return true
}

func organizationDirectoryRemediationApprovalPacketStatus(preview OrganizationDirectoryRemediationApprovalPreview) string {
	if preview.ReadyForApproval && len(preview.BlockedReasons) == 0 {
		return OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval
	}
	return OrganizationDirectoryRemediationApprovalPacketStatusBlocked
}

func organizationDirectoryRemediationApprovalPacketEventTypes(packetStatus string) []string {
	events := []string{
		OrganizationDirectoryRemediationApprovalPacketEventGeneratedPreview,
		OrganizationDirectoryRemediationApprovalPacketEventAvailableForCopy,
		OrganizationDirectoryRemediationApprovalPacketEventAvailableForExport,
	}
	if packetStatus == OrganizationDirectoryRemediationApprovalPacketStatusBlocked {
		events = append(events, OrganizationDirectoryRemediationApprovalPacketEventBlockedReviewRequired)
	}
	return events
}

func organizationDirectoryRemediationApprovalPacketChecklistDigest(checklist []string) []string {
	digests := make([]string, 0, len(checklist))
	for _, item := range checklist {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		digests = append(digests, organizationDirectoryQualityHash(item))
	}
	return organizationDirectoryRemediationUniqueStrings(digests)
}

func organizationDirectoryRemediationApprovalRiskSupported(riskLevel string) bool {
	switch riskLevel {
	case OrganizationDirectoryRemediationApprovalRiskBlocked,
		OrganizationDirectoryRemediationApprovalRiskLow,
		OrganizationDirectoryRemediationApprovalRiskMedium,
		OrganizationDirectoryRemediationApprovalRiskHigh:
		return true
	default:
		return false
	}
}

func organizationDirectoryRemediationApprovalPacketStatusSupported(packetStatus string) bool {
	switch packetStatus {
	case OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval,
		OrganizationDirectoryRemediationApprovalPacketStatusBlocked:
		return true
	default:
		return false
	}
}

func newOrganizationDirectoryRemediationApprovalPacketAuditExport(generatedAt time.Time, audits []OrganizationDirectoryRemediationApprovalPacketAudit) OrganizationDirectoryRemediationApprovalPacketAuditExport {
	items := make([]OrganizationDirectoryRemediationApprovalPacketAuditItem, 0, len(audits))
	for _, audit := range audits {
		items = append(items, newOrganizationDirectoryRemediationApprovalPacketAuditItem(audit))
	}
	return OrganizationDirectoryRemediationApprovalPacketAuditExport{
		GeneratedAt:     generatedAt,
		Boundary:        organizationDirectoryRemediationBoundary,
		StorageScope:    OrganizationDirectoryRemediationApprovalPacketStorageDerivedNonPersistent,
		RetentionPolicy: OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted,
		PacketAudits:    items,
	}
}

func newOrganizationDirectoryRemediationApprovalPacketAuditItem(audit OrganizationDirectoryRemediationApprovalPacketAudit) OrganizationDirectoryRemediationApprovalPacketAuditItem {
	return OrganizationDirectoryRemediationApprovalPacketAuditItem{
		PacketHash:              audit.PacketHash,
		ApprovalPreviewHash:     audit.ApprovalPreviewHash,
		DraftId:                 audit.DraftId,
		ActionAlias:             audit.ActionAlias,
		EntityType:              audit.EntityType,
		ExecutionMode:           OrganizationDirectoryRemediationExecutionManualReviewOnly,
		AutoExecutionAllowed:    false,
		EventTypes:              append([]string{}, audit.EventTypes...),
		PacketStatus:            audit.PacketStatus,
		RiskLevel:               audit.RiskLevel,
		AffectedCount:           audit.AffectedCount,
		BlockedReasons:          append([]string{}, audit.BlockedReasons...),
		RequiredApprovals:       append([]string{}, audit.RequiredApprovals...),
		OperatorChecklistDigest: append([]string{}, audit.OperatorChecklistDigest...),
		SampleStableHashes:      append([]string{}, audit.SampleStableHashes...),
		SafeSummary:             audit.SafeSummary,
		StorageScope:            OrganizationDirectoryRemediationApprovalPacketStorageDerivedNonPersistent,
		RetentionPolicy:         OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted,
	}
}
