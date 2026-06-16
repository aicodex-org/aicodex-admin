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
	"errors"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	webcontext "github.com/beego/beego/v2/server/web/context"
)

func TestGatewayProjectionIngestionStatusErrorMessageIsSanitized(t *testing.T) {
	message := gatewayProjectionIngestionStatusErrorMessage(object.GatewayProjectionIngestionStatusResult{
		Status:          object.GatewayProjectionIngestionStatusProviderUnavailable,
		FailureCategory: object.GatewayProjectionIngestionStatusProviderUnavailable,
	})
	if !strings.Contains(message, object.GatewayProjectionIngestionStatusProviderUnavailable) {
		t.Fatalf("message = %q, want stable failure category", message)
	}
	for _, forbidden := range []string{"https://gateway.internal.invalid", "projection-secret", "Authorization", "Cookie"} {
		if strings.Contains(message, forbidden) {
			t.Fatalf("message leaked %q: %s", forbidden, message)
		}
	}
}

func TestParseGatewayProjectionQueryCSVTrimsEmptyApprovalEvidence(t *testing.T) {
	got := parseGatewayProjectionQueryCSV(" dry_run_export_reviewed, ,candidate_count_reviewed ,,")
	want := []string{"dry_run_export_reviewed", "candidate_count_reviewed"}
	if len(got) != len(want) {
		t.Fatalf("csv = %#v, want %#v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("csv[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestGatewayProjectionCleanupApprovalDecisionDraftHandlerIsExposed(t *testing.T) {
	if _, ok := reflect.TypeOf(&ApiController{}).MethodByName("GetGatewayProjectionPublishAttemptRetentionCleanupApprovalDecisionDraftReadiness"); !ok {
		t.Fatalf("ApiController should expose cleanup approval decision draft readiness handler")
	}
}

func TestGatewayProjectionCleanupApprovalDecisionDraftHandlerReturnsReadOnlyEnvelope(t *testing.T) {
	controller := newGatewayProjectionObservabilityTestController("/api/gateway-projection/publish-attempt-retention-cleanup-approval-decision-draft-readiness?organization=org-a&approvalEvidence=dry_run_export_reviewed")

	controller.GetGatewayProjectionPublishAttemptRetentionCleanupApprovalDecisionDraftReadiness()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "ok" {
		t.Fatalf("response = %#v, want ok response", controller.Data["json"])
	}
	draft, ok := resp.Data.(*object.GatewayProjectionCleanupApprovalDecisionDraftReadiness)
	if !ok {
		t.Fatalf("response data = %#v, want decision draft readiness", resp.Data)
	}
	if draft.ExecutionMode != "manual_review_only" || draft.CleanupExecutionAllowed || draft.ExecuteGuardrail.Enabled {
		t.Fatalf("draft execution boundary = mode %q allowed=%v guardrail=%#v, want read-only disabled", draft.ExecutionMode, draft.CleanupExecutionAllowed, draft.ExecuteGuardrail)
	}
}

func TestGatewayProjectionCleanupApprovalDecisionDraftHandlerRequiresOrganization(t *testing.T) {
	controller := newGatewayProjectionObservabilityTestController("/api/gateway-projection/publish-attempt-retention-cleanup-approval-decision-draft-readiness")

	controller.GetGatewayProjectionPublishAttemptRetentionCleanupApprovalDecisionDraftReadiness()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "organization is required") {
		t.Fatalf("response = %#v, want organization required error", controller.Data["json"])
	}
}

func TestGatewayProjectionCleanupApprovalDecisionDraftHandlerFailsClosedOnServiceError(t *testing.T) {
	original := getGatewayProjectionCleanupApprovalDecisionDraftReadiness
	defer func() {
		getGatewayProjectionCleanupApprovalDecisionDraftReadiness = original
	}()
	getGatewayProjectionCleanupApprovalDecisionDraftReadiness = func(query object.GatewayProjectionCleanupApprovalDecisionDraftReadinessQuery) (*object.GatewayProjectionCleanupApprovalDecisionDraftReadiness, error) {
		if query.OrganizationId != "org-a" {
			t.Fatalf("organization = %q, want org-a", query.OrganizationId)
		}
		return nil, errors.New("assert decision draft unavailable")
	}
	controller := newGatewayProjectionObservabilityTestController("/api/gateway-projection/publish-attempt-retention-cleanup-approval-decision-draft-readiness?organization=org-a")

	controller.GetGatewayProjectionPublishAttemptRetentionCleanupApprovalDecisionDraftReadiness()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "decision draft unavailable") {
		t.Fatalf("response = %#v, want service error", controller.Data["json"])
	}
}

func TestGatewayProjectionCleanupExecutionGateOwnerBoundaryHandlerIsExposed(t *testing.T) {
	if _, ok := reflect.TypeOf(&ApiController{}).MethodByName("GetGatewayProjectionPublishAttemptRetentionCleanupExecutionGateOwnerBoundaryPreflight"); !ok {
		t.Fatalf("ApiController should expose cleanup execution gate owner-boundary preflight handler")
	}
}

func TestGatewayProjectionCleanupExecutionGateOwnerBoundaryHandlerReturnsReadOnlyEnvelope(t *testing.T) {
	controller := newGatewayProjectionObservabilityTestController("/api/gateway-projection/publish-attempt-retention-cleanup-execution-gate-owner-boundary-preflight?organization=org-a&approvalEvidence=dry_run_export_reviewed")

	controller.GetGatewayProjectionPublishAttemptRetentionCleanupExecutionGateOwnerBoundaryPreflight()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "ok" {
		t.Fatalf("response = %#v, want ok response", controller.Data["json"])
	}
	preflight, ok := resp.Data.(*object.GatewayProjectionCleanupExecutionGateOwnerBoundaryPreflight)
	if !ok {
		t.Fatalf("response data = %#v, want execution gate owner-boundary preflight", resp.Data)
	}
	if preflight.ExecutionMode != "manual_review_only" || preflight.CleanupExecutionAllowed || preflight.ExecuteGuardrail.Enabled || !preflight.NoFallback.Enforced {
		t.Fatalf("preflight boundary = mode %q allowed=%v guardrail=%#v noFallback=%#v, want read-only disabled", preflight.ExecutionMode, preflight.CleanupExecutionAllowed, preflight.ExecuteGuardrail, preflight.NoFallback)
	}
}

func TestGatewayProjectionCleanupExecutionGateOwnerBoundaryHandlerRequiresOrganization(t *testing.T) {
	controller := newGatewayProjectionObservabilityTestController("/api/gateway-projection/publish-attempt-retention-cleanup-execution-gate-owner-boundary-preflight")

	controller.GetGatewayProjectionPublishAttemptRetentionCleanupExecutionGateOwnerBoundaryPreflight()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "organization is required") {
		t.Fatalf("response = %#v, want organization required error", controller.Data["json"])
	}
}

func TestGatewayProjectionCleanupExecutionGateOwnerBoundaryHandlerFailsClosedOnServiceError(t *testing.T) {
	original := getGatewayProjectionCleanupExecutionGateOwnerBoundaryPreflight
	defer func() {
		getGatewayProjectionCleanupExecutionGateOwnerBoundaryPreflight = original
	}()
	getGatewayProjectionCleanupExecutionGateOwnerBoundaryPreflight = func(query object.GatewayProjectionCleanupExecutionGateOwnerBoundaryPreflightQuery) (*object.GatewayProjectionCleanupExecutionGateOwnerBoundaryPreflight, error) {
		if query.OrganizationId != "org-a" {
			t.Fatalf("organization = %q, want org-a", query.OrganizationId)
		}
		return nil, errors.New("assert execution gate preflight unavailable")
	}
	controller := newGatewayProjectionObservabilityTestController("/api/gateway-projection/publish-attempt-retention-cleanup-execution-gate-owner-boundary-preflight?organization=org-a")

	controller.GetGatewayProjectionPublishAttemptRetentionCleanupExecutionGateOwnerBoundaryPreflight()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "execution gate preflight unavailable") {
		t.Fatalf("response = %#v, want service error", controller.Data["json"])
	}
}

func newGatewayProjectionObservabilityTestController(target string) *ApiController {
	request := httptest.NewRequest("GET", target, nil)
	recorder := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(recorder, request)
	controller := &ApiController{}
	controller.Init(ctx, "ApiController", "GetGatewayProjectionPublishAttemptRetentionCleanupApprovalDecisionDraftReadiness", controller)
	return controller
}
