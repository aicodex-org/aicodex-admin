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

package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	webcontext "github.com/beego/beego/v2/server/web/context"
)

func TestNewOrganizationDirectoryQualityQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryQualityQuery(map[string]string{
		"organization":              " org-a ",
		"entityType":                object.OrganizationDirectoryQualityEntityUser,
		"keyword":                   "Alice",
		"sourceType":                object.SourceTypeWecom,
		"sourceConnectionIdHash":    "sha256:source",
		"qualityStatus":             object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":                object.OrganizationMasterDataQualityReasonMappingMissing,
		"lifecycleStatus":           object.PlatformLifecycleStatusActive,
		"p":                         "2",
		"pageSize":                  "50",
		"ignoredPrivateQueryString": "redacted",
	})

	if query.OrganizationId != " org-a " ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "Alice" ||
		query.SourceType != object.SourceTypeWecom ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.LifecycleStatus != object.PlatformLifecycleStatusActive ||
		query.Page != 2 ||
		query.PageSize != 50 {
		t.Fatalf("query = %+v, want parsed operator filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationPlanQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationPlanQuery(map[string]string{
		"organization":           " org-a ",
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "Alice",
		"sourceType":             object.SourceTypeWecom,
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"lifecycleStatus":        object.PlatformLifecycleStatusActive,
		"limit":                  "30",
		"topN":                   "10",
	})

	if query.OrganizationId != " org-a " ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "Alice" ||
		query.SourceType != object.SourceTypeWecom ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.LifecycleStatus != object.PlatformLifecycleStatusActive ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation plan filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationActionDraftQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationActionDraftQuery(map[string]string{
		"organization":           " org-a ",
		"actionAlias":            object.OrganizationDirectoryRemediationActionMappingReview,
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "Alice",
		"sourceType":             object.SourceTypeWecom,
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"limit":                  "30",
		"topN":                   "10",
	})

	if query.OrganizationId != " org-a " ||
		query.ActionAlias != object.OrganizationDirectoryRemediationActionMappingReview ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "Alice" ||
		query.SourceType != object.SourceTypeWecom ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation action draft filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationPreflightQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationPreflightQuery(map[string]string{
		"organization":           "org-a",
		"draftId":                "sha256:draft",
		"actionAlias":            object.OrganizationDirectoryRemediationActionMappingReview,
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "alice",
		"sourceType":             "wecom",
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"limit":                  "30",
		"topN":                   "10",
	})
	if query.OrganizationId != "org-a" ||
		query.DraftId != "sha256:draft" ||
		query.ActionAlias != object.OrganizationDirectoryRemediationActionMappingReview ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "alice" ||
		query.SourceType != "wecom" ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation preflight filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationApprovalPreviewQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationApprovalPreviewQuery(map[string]string{
		"organization":           "org-a",
		"draftId":                "sha256:draft",
		"actionAlias":            object.OrganizationDirectoryRemediationActionMappingReview,
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "alice",
		"sourceType":             "wecom",
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"limit":                  "30",
		"topN":                   "10",
	})
	if query.OrganizationId != "org-a" ||
		query.DraftId != "sha256:draft" ||
		query.ActionAlias != object.OrganizationDirectoryRemediationActionMappingReview ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "alice" ||
		query.SourceType != "wecom" ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation approval preview filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationApprovalPacketAuditQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationApprovalPacketAuditQuery(map[string]string{
		"organization":           "org-a",
		"packetAuditId":          "approval-packet-audit:packet",
		"packetHash":             "",
		"approvalPreviewId":      "approval-preview:preview",
		"approvalPreviewHash":    "sha256:preview",
		"draftId":                "sha256:draft",
		"actionAlias":            object.OrganizationDirectoryRemediationActionMappingReview,
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "alice",
		"sourceType":             "wecom",
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"riskLevel":              object.OrganizationDirectoryRemediationApprovalRiskMedium,
		"packetStatus":           object.OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval,
		"limit":                  "30",
		"topN":                   "10",
	})
	if query.OrganizationId != "org-a" ||
		query.PacketAuditId != "approval-packet-audit:packet" ||
		query.ApprovalPreviewId != "approval-preview:preview" ||
		query.ApprovalPreviewHash != "sha256:preview" ||
		query.DraftId != "sha256:draft" ||
		query.ActionAlias != object.OrganizationDirectoryRemediationActionMappingReview ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "alice" ||
		query.SourceType != "wecom" ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.RiskLevel != object.OrganizationDirectoryRemediationApprovalRiskMedium ||
		query.PacketStatus != object.OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation approval packet audit filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationApprovalPacketOperatorNotesQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery(map[string]string{
		"organization":           "org-a",
		"noteId":                 "operator-note:note",
		"noteHash":               "sha256:note",
		"packetAuditId":          "approval-packet-audit:packet",
		"packetHash":             "sha256:packet",
		"approvalPreviewId":      "approval-preview:preview",
		"approvalPreviewHash":    "sha256:preview",
		"draftId":                "sha256:draft",
		"actionAlias":            object.OrganizationDirectoryRemediationActionMappingReview,
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "alice",
		"sourceType":             "wecom",
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"riskLevel":              object.OrganizationDirectoryRemediationApprovalRiskMedium,
		"packetStatus":           object.OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval,
		"limit":                  "30",
		"topN":                   "10",
	})
	if query.OrganizationId != "org-a" ||
		query.NoteId != "operator-note:note" ||
		query.NoteHash != "sha256:note" ||
		query.PacketAuditId != "approval-packet-audit:packet" ||
		query.PacketHash != "sha256:packet" ||
		query.ApprovalPreviewId != "approval-preview:preview" ||
		query.ApprovalPreviewHash != "sha256:preview" ||
		query.DraftId != "sha256:draft" ||
		query.ActionAlias != object.OrganizationDirectoryRemediationActionMappingReview ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "alice" ||
		query.SourceType != "wecom" ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.RiskLevel != object.OrganizationDirectoryRemediationApprovalRiskMedium ||
		query.PacketStatus != object.OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation approval packet operator notes filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationOperatorNotePersistenceReadinessQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery(map[string]string{
		"organization":           "org-a",
		"readinessId":            "operator-note-persistence-readiness:sample",
		"readinessHash":          "sha256:readiness",
		"noteId":                 "operator-note:note",
		"noteHash":               "sha256:note",
		"packetAuditId":          "approval-packet-audit:packet",
		"packetHash":             "sha256:packet",
		"approvalPreviewId":      "approval-preview:preview",
		"approvalPreviewHash":    "sha256:preview",
		"draftId":                "sha256:draft",
		"actionAlias":            object.OrganizationDirectoryRemediationActionMappingReview,
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "alice",
		"sourceType":             "wecom",
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"riskLevel":              object.OrganizationDirectoryRemediationApprovalRiskMedium,
		"packetStatus":           object.OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval,
		"limit":                  "30",
		"topN":                   "10",
	})
	if query.OrganizationId != "org-a" ||
		query.ReadinessId != "operator-note-persistence-readiness:sample" ||
		query.ReadinessHash != "sha256:readiness" ||
		query.NoteId != "operator-note:note" ||
		query.NoteHash != "sha256:note" ||
		query.PacketAuditId != "approval-packet-audit:packet" ||
		query.PacketHash != "sha256:packet" ||
		query.ApprovalPreviewId != "approval-preview:preview" ||
		query.ApprovalPreviewHash != "sha256:preview" ||
		query.DraftId != "sha256:draft" ||
		query.ActionAlias != object.OrganizationDirectoryRemediationActionMappingReview ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "alice" ||
		query.SourceType != "wecom" ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.RiskLevel != object.OrganizationDirectoryRemediationApprovalRiskMedium ||
		query.PacketStatus != object.OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation operator note persistence readiness filters", query)
	}
}

func TestNewOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQueryParsesOperatorFilters(t *testing.T) {
	query := newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery(map[string]string{
		"organization":           "org-a",
		"searchId":               "operator-note-readonly-audit-search:sample",
		"readinessId":            "operator-note-persistence-readiness:sample",
		"readinessHash":          "sha256:readiness",
		"noteId":                 "operator-note:note",
		"noteHash":               "sha256:note",
		"packetAuditId":          "approval-packet-audit:packet",
		"packetHash":             "sha256:packet",
		"approvalPreviewId":      "approval-preview:preview",
		"approvalPreviewHash":    "sha256:preview",
		"draftId":                "sha256:draft",
		"remediationRunId":       "run-20260616",
		"actionAlias":            object.OrganizationDirectoryRemediationActionMappingReview,
		"entityType":             object.OrganizationDirectoryQualityEntityUser,
		"keyword":                "alice",
		"sourceType":             "wecom",
		"sourceConnectionIdHash": "sha256:source",
		"qualityStatus":          object.OrganizationMasterDataQualityStatusBlocked,
		"reasonCode":             object.OrganizationMasterDataQualityReasonMappingMissing,
		"checklistAlias":         "manual_review_only_required",
		"riskLevel":              object.OrganizationDirectoryRemediationApprovalRiskMedium,
		"packetStatus":           object.OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval,
		"readinessStatus":        object.OrganizationDirectoryRemediationOperatorNotePersistenceStatusReadyForDesignReview,
		"includeHistorical":      "true",
		"historyMode":            object.OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModePersistent,
		"limit":                  "30",
		"topN":                   "10",
	})
	if query.OrganizationId != "org-a" ||
		query.SearchId != "operator-note-readonly-audit-search:sample" ||
		query.ReadinessId != "operator-note-persistence-readiness:sample" ||
		query.ReadinessHash != "sha256:readiness" ||
		query.NoteId != "operator-note:note" ||
		query.NoteHash != "sha256:note" ||
		query.PacketAuditId != "approval-packet-audit:packet" ||
		query.PacketHash != "sha256:packet" ||
		query.ApprovalPreviewId != "approval-preview:preview" ||
		query.ApprovalPreviewHash != "sha256:preview" ||
		query.DraftId != "sha256:draft" ||
		query.RemediationRunId != "run-20260616" ||
		query.ActionAlias != object.OrganizationDirectoryRemediationActionMappingReview ||
		query.EntityType != object.OrganizationDirectoryQualityEntityUser ||
		query.Keyword != "alice" ||
		query.SourceType != "wecom" ||
		query.SourceConnectionIdHash != "sha256:source" ||
		query.QualityStatus != object.OrganizationMasterDataQualityStatusBlocked ||
		query.ReasonCode != object.OrganizationMasterDataQualityReasonMappingMissing ||
		query.ChecklistAlias != "manual_review_only_required" ||
		query.RiskLevel != object.OrganizationDirectoryRemediationApprovalRiskMedium ||
		query.PacketStatus != object.OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval ||
		query.ReadinessStatus != object.OrganizationDirectoryRemediationOperatorNotePersistenceStatusReadyForDesignReview ||
		!query.IncludeHistorical ||
		query.HistoryMode != object.OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModePersistent ||
		query.Limit != 30 ||
		query.TopN != 10 {
		t.Fatalf("query = %+v, want parsed remediation operator note readonly audit search filters", query)
	}
}

func TestGetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHandlerReturnsReadonlyBoundary(t *testing.T) {
	controller, recorder := newOrganizationDirectoryQualityTestControllerWithRequest(
		t,
		http.MethodGet,
		"/api/organization-master-data-quality/remediation-operator-note-readonly-audit-search?organization=org-a&includeHistorical=true&historyMode=persistent&limit=20&topN=10",
	)

	controller.GetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch()

	var response struct {
		Status string                                                                       `json:"status"`
		Msg    string                                                                       `json:"msg"`
		Data   object.OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchResult `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("response body = %q, unmarshal error = %v", recorder.Body.String(), err)
	}
	if response.Status != "ok" || response.Msg != "" {
		t.Fatalf("response = %+v, want ok readonly audit search response", response)
	}
	if response.Data.OrganizationId != "org-a" ||
		response.Data.SearchScope != object.OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchScopeCurrentDerived ||
		!response.Data.PersistenceRequiredForHistoricalSearch ||
		!organizationDirectoryQualityControllerTestContains(response.Data.CannotInfer, object.OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferHistoricalCompleteness) {
		t.Fatalf("response data = %+v, want scoped historical-boundary readonly audit search", response.Data)
	}
}

func TestGetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHandlerFailsClosedOnInvalidHistoryMode(t *testing.T) {
	controller, recorder := newOrganizationDirectoryQualityTestControllerWithRequest(
		t,
		http.MethodGet,
		"/api/organization-master-data-quality/remediation-operator-note-readonly-audit-search?organization=org-a&historyMode=durable_store",
	)

	controller.GetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch()

	var response struct {
		Status string `json:"status"`
		Msg    string `json:"msg"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("response body = %q, unmarshal error = %v", recorder.Body.String(), err)
	}
	if response.Status != "error" || !strings.Contains(response.Msg, "unsupported operator note audit search history mode") {
		t.Fatalf("response = %+v, want operator-readable invalid history mode error", response)
	}
}

func organizationDirectoryQualityControllerTestContains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func newOrganizationDirectoryQualityTestControllerWithRequest(t *testing.T, method string, target string) (*ApiController, *httptest.ResponseRecorder) {
	t.Helper()

	request := httptest.NewRequest(method, target, strings.NewReader(""))
	request.Host = "door.example.com"
	request.Header.Set("Accept-Language", "zh-CN")

	recorder := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(recorder, request)

	controller := &ApiController{}
	controller.Init(ctx, "ApiController", "GetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch", controller)
	return controller, recorder
}
