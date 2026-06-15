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
	"encoding/json"
	"strings"
	"testing"
)

func TestOrganizationDirectoryRemediationApprovalPacketAuditDerivesNonPersistentAuditRecord(t *testing.T) {
	result, err := newOrganizationDirectoryRemediationApprovalPacketAuditTestService().GetApprovalPacketAudits(OrganizationDirectoryRemediationApprovalPacketAuditQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("GetApprovalPacketAudits() error = %v", err)
	}
	if result.OrganizationId != "org-a" || result.GeneratedAt != organizationDirectoryQualityFixedNow().UTC() {
		t.Fatalf("result identity = %+v, want org-a and fixed time", result)
	}
	if result.TotalPacketAuditCount != 1 || len(result.PacketAudits) != 1 {
		t.Fatalf("result = %+v, want one packet audit", result)
	}
	audit := result.PacketAudits[0]
	if audit.PacketAuditId == "" || !strings.HasPrefix(audit.PacketHash, "sha256:") || audit.ApprovalPreviewHash == "" {
		t.Fatalf("audit identity = %+v, want stable packet audit id/hash and preview hash", audit)
	}
	if audit.ExecutionMode != OrganizationDirectoryRemediationExecutionManualReviewOnly || audit.AutoExecutionAllowed {
		t.Fatalf("execution flags = %+v, want manual review only and auto execution disabled", audit)
	}
	if audit.StorageScope != OrganizationDirectoryRemediationApprovalPacketStorageDerivedNonPersistent ||
		audit.RetentionPolicy != OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted {
		t.Fatalf("storage = %+v/%+v, want derived non-persistent scope", audit.StorageScope, audit.RetentionPolicy)
	}
	if audit.PacketStatus != OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval ||
		audit.RiskLevel != OrganizationDirectoryRemediationApprovalRiskMedium ||
		audit.AffectedCount == 0 ||
		len(audit.EventTypes) == 0 ||
		len(audit.RequiredApprovals) == 0 ||
		len(audit.OperatorChecklistDigest) == 0 ||
		len(audit.SampleStableHashes) == 0 ||
		audit.SafeSummary == "" {
		t.Fatalf("audit = %+v, want populated ready approval packet audit", audit)
	}
	if !organizationDirectoryQualityContains(audit.EventTypes, OrganizationDirectoryRemediationApprovalPacketEventAvailableForCopy) ||
		!organizationDirectoryQualityContains(audit.EventTypes, OrganizationDirectoryRemediationApprovalPacketEventAvailableForExport) {
		t.Fatalf("eventTypes = %+v, want copy/export availability", audit.EventTypes)
	}
	if audit.ExportSummary.PacketHash != audit.PacketHash ||
		audit.ExportSummary.StorageScope != OrganizationDirectoryRemediationApprovalPacketStorageDerivedNonPersistent ||
		audit.ExportSummary.AutoExecutionAllowed {
		t.Fatalf("export summary = %+v, want sanitized non-persistent manual-review summary", audit.ExportSummary)
	}
}

func TestOrganizationDirectoryRemediationApprovalPacketAuditFailsClosedForBlankReadyAndMissingPreview(t *testing.T) {
	service := newOrganizationDirectoryRemediationApprovalPacketAuditTestService()

	blank, err := service.GetApprovalPacketAudits(OrganizationDirectoryRemediationApprovalPacketAuditQuery{})
	if err != nil {
		t.Fatalf("GetApprovalPacketAudits(blank) error = %v", err)
	}
	if blank.TotalPacketAuditCount != 0 || blank.OrganizationId != "" || len(blank.PacketAudits) != 0 {
		t.Fatalf("blank = %+v, want scoped empty result", blank)
	}

	ready, err := service.GetApprovalPacketAudits(OrganizationDirectoryRemediationApprovalPacketAuditQuery{
		OrganizationId: "org-a",
		QualityStatus:  OrganizationMasterDataQualityStatusReady,
	})
	if err != nil {
		t.Fatalf("GetApprovalPacketAudits(ready) error = %v", err)
	}
	if ready.TotalPacketAuditCount != 0 || len(ready.PacketAudits) != 0 {
		t.Fatalf("ready = %+v, want empty fail-closed result", ready)
	}

	missing, err := service.GetApprovalPacketAudits(OrganizationDirectoryRemediationApprovalPacketAuditQuery{
		OrganizationId:         "org-a",
		ApprovalPreviewHash:    "sha256:missing",
		ActionAlias:            OrganizationDirectoryRemediationActionMappingReview,
		EntityType:             OrganizationDirectoryQualityEntityUser,
		PacketStatus:           OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval,
		SourceConnectionIdHash: "",
	})
	if err != nil {
		t.Fatalf("GetApprovalPacketAudits(missing preview) error = %v", err)
	}
	if missing.TotalPacketAuditCount != 0 || len(missing.PacketAudits) != 0 {
		t.Fatalf("missing = %+v, want empty audit result", missing)
	}
}

func TestOrganizationDirectoryRemediationApprovalPacketAuditFiltersBlockedAndRedactsExport(t *testing.T) {
	result, err := newOrganizationDirectoryRemediationApprovalPacketAuditTestService().GetApprovalPacketAudits(OrganizationDirectoryRemediationApprovalPacketAuditQuery{
		OrganizationId: "org-a",
		DraftId:        "sha256:missing",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		PacketStatus:   OrganizationDirectoryRemediationApprovalPacketStatusBlocked,
		RiskLevel:      OrganizationDirectoryRemediationApprovalRiskBlocked,
	})
	if err != nil {
		t.Fatalf("GetApprovalPacketAudits(blocked) error = %v", err)
	}
	if result.TotalPacketAuditCount != 1 || len(result.PacketAudits) != 1 {
		t.Fatalf("result = %+v, want one blocked audit", result)
	}
	audit := result.PacketAudits[0]
	if audit.PacketStatus != OrganizationDirectoryRemediationApprovalPacketStatusBlocked ||
		audit.RiskLevel != OrganizationDirectoryRemediationApprovalRiskBlocked ||
		!organizationDirectoryQualityContains(audit.BlockedReasons, OrganizationDirectoryRemediationPreflightBlockerDraftNotFound) ||
		!organizationDirectoryQualityContains(audit.EventTypes, OrganizationDirectoryRemediationApprovalPacketEventBlockedReviewRequired) {
		t.Fatalf("audit = %+v, want blocked audit summary", audit)
	}

	payload, err := json.Marshal(result.ExportSummary)
	if err != nil {
		t.Fatalf("Marshal(exportSummary) error = %v", err)
	}
	serialized := strings.ToLower(string(payload))
	for _, forbidden := range []string{"token", "cookie", "secret", "phone", "email", "payload", "private url", "@example"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("export summary leaks forbidden term %q: %s", forbidden, serialized)
		}
	}
}

func TestOrganizationDirectoryRemediationApprovalPacketAuditRejectsInvalidFilters(t *testing.T) {
	service := newOrganizationDirectoryRemediationApprovalPacketAuditTestService()
	cases := []struct {
		name  string
		query OrganizationDirectoryRemediationApprovalPacketAuditQuery
	}{
		{name: "bad risk", query: OrganizationDirectoryRemediationApprovalPacketAuditQuery{OrganizationId: "org-a", RiskLevel: "critical"}},
		{name: "bad status", query: OrganizationDirectoryRemediationApprovalPacketAuditQuery{OrganizationId: "org-a", PacketStatus: "executed"}},
		{name: "bad entity", query: OrganizationDirectoryRemediationApprovalPacketAuditQuery{OrganizationId: "org-a", EntityType: "organization_tree"}},
		{name: "bad limit", query: OrganizationDirectoryRemediationApprovalPacketAuditQuery{OrganizationId: "org-a", Limit: 101}},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := service.GetApprovalPacketAudits(tt.query); err == nil {
				t.Fatalf("GetApprovalPacketAudits(%+v) error = nil, want validation error", tt.query)
			}
		})
	}
}

func TestOrganizationDirectoryRemediationApprovalPacketAuditHelpers(t *testing.T) {
	ready := organizationDirectoryRemediationApprovalPacketStatus(OrganizationDirectoryRemediationApprovalPreview{ReadyForApproval: true})
	if ready != OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval {
		t.Fatalf("ready status = %s, want ready_for_approval", ready)
	}
	blocked := organizationDirectoryRemediationApprovalPacketStatus(OrganizationDirectoryRemediationApprovalPreview{BlockedReasons: []string{"x"}})
	if blocked != OrganizationDirectoryRemediationApprovalPacketStatusBlocked {
		t.Fatalf("blocked status = %s, want blocked", blocked)
	}
	digest := organizationDirectoryRemediationApprovalPacketChecklistDigest([]string{"确认审批预览仅用于 manual review", "确认审批预览仅用于 manual review"})
	if len(digest) != 1 || !strings.HasPrefix(digest[0], "sha256:") {
		t.Fatalf("digest = %+v, want unique hashes", digest)
	}
}

func newOrganizationDirectoryRemediationApprovalPacketAuditTestService() OrganizationDirectoryRemediationApprovalPacketAuditService {
	return OrganizationDirectoryRemediationApprovalPacketAuditService{
		ApprovalPreviewService: OrganizationDirectoryRemediationApprovalPreviewService{
			PreflightService: OrganizationDirectoryRemediationPreflightService{
				DraftService: OrganizationDirectoryRemediationActionDraftService{
					QualityService: OrganizationDirectoryQualityService{
						Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
						Now:   organizationDirectoryQualityFixedNow,
					},
					Now: organizationDirectoryQualityFixedNow,
				},
				Now: organizationDirectoryQualityFixedNow,
			},
			Now: organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}
}
