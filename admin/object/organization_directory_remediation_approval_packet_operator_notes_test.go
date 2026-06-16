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

func TestOrganizationDirectoryRemediationApprovalPacketOperatorNotesBuildsDerivedHandoffDraft(t *testing.T) {
	result, err := newOrganizationDirectoryRemediationApprovalPacketOperatorNotesTestService().GetOperatorNotes(OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("GetOperatorNotes() error = %v", err)
	}
	if result.OrganizationId != "org-a" || result.GeneratedAt != organizationDirectoryQualityFixedNow().UTC() {
		t.Fatalf("result identity = %+v, want org-a and fixed time", result)
	}
	if result.TotalNoteCount != 1 || len(result.Notes) != 1 {
		t.Fatalf("result = %+v, want one operator note", result)
	}
	note := result.Notes[0]
	if note.NoteId == "" || !strings.HasPrefix(note.NoteHash, "sha256:") || note.PacketHash == "" || note.ApprovalPreviewHash == "" {
		t.Fatalf("note identity = %+v, want stable note/packet/preview hashes", note)
	}
	if note.ExecutionMode != OrganizationDirectoryRemediationExecutionManualReviewOnly || note.AutoExecutionAllowed {
		t.Fatalf("execution flags = %+v, want manual review only and auto execution disabled", note)
	}
	if note.NoteScope != OrganizationDirectoryRemediationOperatorNoteScopeDerivedDraft ||
		note.RetentionPolicy != OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted ||
		note.NoteFormat != OrganizationDirectoryRemediationOperatorNoteFormatMarkdown {
		t.Fatalf("note scope = %+v/%+v/%+v, want derived markdown draft", note.NoteScope, note.RetentionPolicy, note.NoteFormat)
	}
	if note.HandoffSummary == "" ||
		note.RiskSummary == "" ||
		note.StatusSummary == "" ||
		len(note.ChecklistSummary) == 0 ||
		len(note.CannotInfer) == 0 ||
		len(note.OperatorNextSteps) == 0 ||
		len(note.SampleStableHashes) == 0 ||
		!strings.Contains(note.MarkdownSummary, "manual_review_only") {
		t.Fatalf("note = %+v, want populated handoff note draft", note)
	}
	if note.ExportSummary.NoteHash != note.NoteHash ||
		note.ExportSummary.AutoExecutionAllowed ||
		!strings.Contains(note.ExportSummary.MarkdownSummary, "cannotInfer") {
		t.Fatalf("export summary = %+v, want sanitized note export", note.ExportSummary)
	}
}

func TestOrganizationDirectoryRemediationApprovalPacketOperatorNotesFailsClosedForBlankReadyAndMissingPacket(t *testing.T) {
	service := newOrganizationDirectoryRemediationApprovalPacketOperatorNotesTestService()

	blank, err := service.GetOperatorNotes(OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{})
	if err != nil {
		t.Fatalf("GetOperatorNotes(blank) error = %v", err)
	}
	if blank.TotalNoteCount != 0 || blank.OrganizationId != "" || len(blank.Notes) != 0 {
		t.Fatalf("blank = %+v, want scoped empty result", blank)
	}

	ready, err := service.GetOperatorNotes(OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{
		OrganizationId: "org-a",
		QualityStatus:  OrganizationMasterDataQualityStatusReady,
	})
	if err != nil {
		t.Fatalf("GetOperatorNotes(ready) error = %v", err)
	}
	if ready.TotalNoteCount != 0 || len(ready.Notes) != 0 {
		t.Fatalf("ready = %+v, want empty fail-closed result", ready)
	}

	missing, err := service.GetOperatorNotes(OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{
		OrganizationId: "org-a",
		PacketHash:     "sha256:missing",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
	})
	if err != nil {
		t.Fatalf("GetOperatorNotes(missing packet) error = %v", err)
	}
	if missing.TotalNoteCount != 0 || len(missing.Notes) != 0 {
		t.Fatalf("missing = %+v, want empty notes result", missing)
	}
}

func TestOrganizationDirectoryRemediationApprovalPacketOperatorNotesBlocksAndRedactsMarkdown(t *testing.T) {
	result, err := newOrganizationDirectoryRemediationApprovalPacketOperatorNotesTestService().GetOperatorNotes(OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{
		OrganizationId: "org-a",
		DraftId:        "sha256:missing",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		PacketStatus:   OrganizationDirectoryRemediationApprovalPacketStatusBlocked,
		RiskLevel:      OrganizationDirectoryRemediationApprovalRiskBlocked,
	})
	if err != nil {
		t.Fatalf("GetOperatorNotes(blocked) error = %v", err)
	}
	if result.TotalNoteCount != 1 || len(result.Notes) != 1 {
		t.Fatalf("result = %+v, want one blocked note", result)
	}
	note := result.Notes[0]
	if !strings.Contains(note.RiskSummary, OrganizationDirectoryRemediationApprovalRiskBlocked) ||
		!organizationDirectoryQualityContains(note.CannotInfer, OrganizationDirectoryRemediationOperatorNoteCannotInferAutoExecution) ||
		!strings.Contains(note.MarkdownSummary, OrganizationDirectoryRemediationPreflightBlockerDraftNotFound) {
		t.Fatalf("note = %+v, want blocked note summary with cannotInfer", note)
	}
	payload, err := json.Marshal(result.ExportSummary)
	if err != nil {
		t.Fatalf("Marshal(exportSummary) error = %v", err)
	}
	serialized := strings.ToLower(string(payload))
	for _, forbidden := range []string{"token", "cookie", "secret", "phone", "email", "payload", "private url", "@example", "org-a/alice"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("operator note export leaks forbidden term %q: %s", forbidden, serialized)
		}
	}
}

func TestOrganizationDirectoryRemediationApprovalPacketOperatorNotesRejectsInvalidFilters(t *testing.T) {
	service := newOrganizationDirectoryRemediationApprovalPacketOperatorNotesTestService()
	cases := []struct {
		name  string
		query OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery
	}{
		{name: "bad risk", query: OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{OrganizationId: "org-a", RiskLevel: "critical"}},
		{name: "bad status", query: OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{OrganizationId: "org-a", PacketStatus: "executed"}},
		{name: "bad entity", query: OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{OrganizationId: "org-a", EntityType: "organization_tree"}},
		{name: "bad limit", query: OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{OrganizationId: "org-a", Limit: 101}},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := service.GetOperatorNotes(tt.query); err == nil {
				t.Fatalf("GetOperatorNotes(%+v) error = nil, want validation error", tt.query)
			}
		})
	}
}

func newOrganizationDirectoryRemediationApprovalPacketOperatorNotesTestService() OrganizationDirectoryRemediationApprovalPacketOperatorNotesService {
	return OrganizationDirectoryRemediationApprovalPacketOperatorNotesService{
		AuditService: OrganizationDirectoryRemediationApprovalPacketAuditService{
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
		},
		Now: organizationDirectoryQualityFixedNow,
	}
}
