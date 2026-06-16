// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package controllers

import (
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

func TestGetFeishuOrganizationSyncHandoffEvidenceFilterParsesQuery(t *testing.T) {
	controller := newFeishuOrganizationSyncDryRunHistoryTestController("/api/feishu-org-sync/handoff-evidence?sourceType=run&sourceId=run-1")

	filter := controller.getFeishuOrganizationSyncHandoffEvidenceFilter("engineering")
	if filter.Organization != "engineering" || filter.SourceType != "run" || filter.SourceId != "run-1" {
		t.Fatalf("filter = %+v, want organization/sourceType/sourceId", filter)
	}
}

func TestGetFeishuOrganizationSyncHandoffEvidenceReturnsSafeEvidence(t *testing.T) {
	oldGetter := getFeishuOrganizationSyncHandoffEvidence
	defer func() {
		getFeishuOrganizationSyncHandoffEvidence = oldGetter
	}()

	var gotFilter object.FeishuOrganizationSyncHandoffEvidenceFilter
	getFeishuOrganizationSyncHandoffEvidence = func(filter object.FeishuOrganizationSyncHandoffEvidenceFilter) (*object.FeishuOrganizationSyncHandoffEvidence, error) {
		gotFilter = filter
		return &object.FeishuOrganizationSyncHandoffEvidence{
			Organization:           "engineering",
			EvidenceVersion:        object.FeishuHandoffEvidenceVersion,
			SourceType:             object.FeishuHandoffEvidenceSourceRun,
			SourceIdHash:           "run-safe",
			SourceConnectionIdHash: "source-safe",
			Readiness:              object.FeishuHandoffEvidenceReadinessReady,
			SafeSummary:            "handoff evidence ready user_id=***",
			Redaction: object.FeishuHandoffEvidenceRedaction{
				Applied: true,
				Version: object.FeishuHandoffEvidenceRedactionV1,
			},
			AcceptanceChecklist: object.FeishuHandoffAcceptanceChecklist{
				Version:          object.FeishuHandoffAcceptanceChecklistVersion,
				ExecutionMode:    object.FeishuHandoffAcceptanceExecutionManualReviewOnly,
				ManualReviewOnly: true,
				SafeSource: object.FeishuHandoffAcceptanceSafeSource{
					SourceType:             object.FeishuHandoffEvidenceSourceRun,
					SourceIdHash:           "run-safe",
					SourceConnectionIdHash: "source-safe",
					Readiness:              object.FeishuHandoffEvidenceReadinessReady,
				},
				Summary: object.FeishuHandoffAcceptanceSummary{
					Total:       2,
					Passed:      1,
					CannotInfer: 1,
					DerivedOnly: true,
					NoFallback:  true,
				},
				Items: []object.FeishuHandoffAcceptanceChecklistItem{
					{
						Id:               "redaction",
						Status:           object.FeishuHandoffAcceptanceStatusPassed,
						Source:           object.FeishuHandoffAcceptanceSourceAdminLocalMetadata,
						SafeSummary:      "safe redaction summary",
						ManualReviewOnly: true,
					},
					{
						Id:                     "provider_truth",
						Status:                 object.FeishuHandoffAcceptanceStatusCannotInfer,
						Source:                 object.FeishuHandoffAcceptanceSourceExternalOwnerNeeded,
						SafeSummary:            "provider truth requires manual review",
						RecommendedActionAlias: "validate_real_tenant_runtime",
						ProviderOwned:          true,
						ManualReviewOnly:       true,
						CannotInfer:            true,
						NoFallback:             true,
					},
				},
				ProviderOwnedEvidenceMissing: []string{"live_contact_v3_credentials"},
				ManualReviewActions:          []string{"validate_real_tenant_runtime"},
				CannotInfer:                  []string{"provider_truth"},
				NoFallback:                   []string{"production_readiness"},
				Retention: object.FeishuHandoffAcceptanceRetention{
					RedactionApplied: true,
					RetentionDays:    object.FeishuOrganizationSyncDryRunHistoryRetentionDays,
					RetentionPolicy:  "redacted_summary_retained",
				},
			},
		}, nil
	}

	controller := newFeishuOrganizationSyncDryRunHistoryTestController("/api/feishu-org-sync/handoff-evidence?organization=engineering&sourceType=run&sourceId=run-raw")
	controller.Ctx.Input.SetData("currentUserId", "app/app-feishu-handoff-test")

	controller.GetFeishuOrganizationSyncHandoffEvidence()

	if gotFilter.Organization != "engineering" || gotFilter.SourceType != "run" || gotFilter.SourceId != "run-raw" {
		t.Fatalf("filter = %+v, want query fields", gotFilter)
	}
	body := controller.Ctx.ResponseWriter.ResponseWriter.(*httptest.ResponseRecorder).Body.String()
	if !strings.Contains(body, "handoff evidence ready") || !strings.Contains(body, "run-safe") {
		t.Fatalf("response missing safe evidence: %s", body)
	}
	for _, expected := range []string{"acceptanceChecklist", object.FeishuHandoffAcceptanceChecklistVersion, "provider_truth", "production_readiness", "validate_real_tenant_runtime"} {
		if !strings.Contains(body, expected) {
			t.Fatalf("response missing checklist field %q: %s", expected, body)
		}
	}
	for _, forbidden := range []string{"run-raw", "open-shared", "union-shared", "ou-shared", "alice@example.test", "13800138000"} {
		if strings.Contains(body, forbidden) {
			t.Fatalf("response leaked forbidden value %q: %s", forbidden, body)
		}
	}
}

func TestGetFeishuOrganizationSyncHandoffEvidenceHandlesErrors(t *testing.T) {
	oldGetter := getFeishuOrganizationSyncHandoffEvidence
	defer func() {
		getFeishuOrganizationSyncHandoffEvidence = oldGetter
	}()
	getFeishuOrganizationSyncHandoffEvidence = func(filter object.FeishuOrganizationSyncHandoffEvidenceFilter) (*object.FeishuOrganizationSyncHandoffEvidence, error) {
		return nil, errors.New("safe evidence error")
	}

	controller := newFeishuOrganizationSyncDryRunHistoryTestController("/api/feishu-org-sync/handoff-evidence?organization=engineering")
	controller.Ctx.Input.SetData("currentUserId", "app/app-feishu-handoff-test")
	controller.GetFeishuOrganizationSyncHandoffEvidence()

	body := controller.Ctx.ResponseWriter.ResponseWriter.(*httptest.ResponseRecorder).Body.String()
	if !strings.Contains(body, "safe evidence error") {
		t.Fatalf("response should contain safe error: %s", body)
	}
}
