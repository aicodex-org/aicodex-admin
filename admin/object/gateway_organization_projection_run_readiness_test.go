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
	"time"
)

func TestGatewayProjectionRunReadinessClassifiesSafeRetryForStableTransientFailure(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 13, 0, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(5*time.Minute))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-run-1"
	input.Users[0].LastSeenBatchId = "batch-run-1"
	build, err := BuildGatewayProjectionBatch(input)
	if err != nil {
		t.Fatalf("BuildGatewayProjectionBatch() error = %v", err)
	}
	resetGatewayProjectionObservabilityForTest()
	recordGatewayProjectionServiceObservability(build, GatewayProjectionPublishResult{
		Success:    false,
		Retryable:  true,
		ErrorCode:  GatewayProjectionPublishErrorProviderUnavailable,
		StatusCode: 503,
		Attempts:   2,
	}, input.SourceConnections, 42)

	summary, err := (GatewayProjectionRunReadinessService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: gatewayProjectionSnapshotFromInput(input)},
		Config: GatewayProjectionPublisherConfig{
			Enabled:      true,
			Endpoint:     "https://gateway.example.invalid/projection",
			Token:        "projection-secret",
			Caller:       GatewayProjectionDefaultCaller,
			FreshnessTTL: time.Hour,
		},
		Now: func() time.Time { return generatedAt },
	}).GetReadiness(GatewayProjectionRunReadinessQuery{OrganizationID: "org-a", TraceID: build.Request.TraceID})
	if err != nil {
		t.Fatalf("GetReadiness() error = %v", err)
	}

	if summary.Retry.Readiness != GatewayProjectionRetryReadinessSafeRetry || !summary.Retry.SafeToRetry {
		t.Fatalf("retry summary = %#v, want safe retry", summary.Retry)
	}
	if summary.LastFailureAlias != GatewayProjectionFailureGatewayUnavailable {
		t.Fatalf("last failure alias = %q", summary.LastFailureAlias)
	}
	if summary.Diff.SourceVersionChanged || summary.Diff.SubjectCountChanged {
		t.Fatalf("diff should be stable: %#v", summary.Diff)
	}
	if summary.Target.ContractVersionStatus != GatewayProjectionContractVersionNotDeclared {
		t.Fatalf("contract version status = %q", summary.Target.ContractVersionStatus)
	}
	if summary.Target.ProjectionVersionCount == 0 || summary.Target.ProjectionVersionSample == "" {
		t.Fatalf("projection version summary missing: %#v", summary.Target)
	}
}

func TestGatewayProjectionRunReadinessRejectsMissingOrganization(t *testing.T) {
	_, err := (GatewayProjectionRunReadinessService{}).GetReadiness(GatewayProjectionRunReadinessQuery{})
	if err == nil || !strings.Contains(err.Error(), "organization is required") {
		t.Fatalf("expected missing organization error, got %v", err)
	}
}

func TestGatewayProjectionRunReadinessHandlesMissingLatestRun(t *testing.T) {
	resetGatewayProjectionObservabilityForTest()
	generatedAt := time.Date(2026, 6, 15, 13, 30, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(5*time.Minute))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-run-no-latest"
	input.Users[0].LastSeenBatchId = "batch-run-no-latest"

	summary, err := (GatewayProjectionRunReadinessService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: gatewayProjectionSnapshotFromInput(input)},
		Config: GatewayProjectionPublisherConfig{
			Enabled:      true,
			Endpoint:     "https://gateway.example.invalid/projection",
			Token:        "projection-secret",
			Caller:       GatewayProjectionDefaultCaller,
			FreshnessTTL: time.Hour,
		},
		Now: func() time.Time { return generatedAt },
	}).GetReadiness(GatewayProjectionRunReadinessQuery{OrganizationID: "org-a"})
	if err != nil {
		t.Fatalf("GetReadiness() error = %v", err)
	}
	if summary.Latest != nil || summary.RunReference.Available || summary.Diff.Compared {
		t.Fatalf("missing latest should be explicit: latest=%#v reference=%#v diff=%#v", summary.Latest, summary.RunReference, summary.Diff)
	}
	if summary.Retry.Readiness != GatewayProjectionRetryReadinessUnknown || !containsGatewayProjectionManualDisabledReason(summary.Retry.Reasons, "latest_run_unavailable") {
		t.Fatalf("retry summary = %#v, want unknown latest", summary.Retry)
	}
}

func TestGatewayProjectionRunReadinessWaitsForStaleSource(t *testing.T) {
	resetGatewayProjectionObservabilityForTest()
	generatedAt := time.Date(2026, 6, 15, 14, 0, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(5*time.Minute))
	input.SourceConnections[0].Freshness = PlatformFreshnessStale
	input.Users[0].OrgVersion = "orgv-run-2"
	input.Users[0].LastSeenBatchId = "batch-run-2"
	build, err := BuildGatewayProjectionBatch(input)
	if err != nil {
		t.Fatalf("BuildGatewayProjectionBatch() error = %v", err)
	}
	latest := buildGatewayProjectionLatestPublish(build.Request, GatewayProjectionPublishResult{
		Success:   false,
		Retryable: true,
		ErrorCode: GatewayProjectionPublishErrorProviderUnavailable,
	}, 17)
	latest.SourceConnectionSummary = buildGatewayProjectionSourceConnectionSummary(input.SourceConnections)
	recordGatewayProjectionLatestPublish(latest)

	summary, err := (GatewayProjectionRunReadinessService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: gatewayProjectionSnapshotFromInput(input)},
		Config: GatewayProjectionPublisherConfig{
			Enabled:      true,
			Endpoint:     "https://gateway.example.invalid/projection",
			Token:        "projection-secret",
			Caller:       GatewayProjectionDefaultCaller,
			FreshnessTTL: time.Hour,
		},
		Now: func() time.Time { return generatedAt },
	}).GetReadiness(GatewayProjectionRunReadinessQuery{OrganizationID: "org-a"})
	if err != nil {
		t.Fatalf("GetReadiness() error = %v", err)
	}

	if summary.Retry.Readiness != GatewayProjectionRetryReadinessWaitSourceRefresh || summary.Retry.SafeToRetry {
		t.Fatalf("retry summary = %#v, want wait source refresh", summary.Retry)
	}
	if !summary.Source.SourceConnectionSummary.HasStaleFreshness {
		t.Fatalf("source summary should keep stale freshness: %#v", summary.Source.SourceConnectionSummary)
	}
}

func TestGatewayProjectionRunReadinessBlocksPublisherTokenMissing(t *testing.T) {
	resetGatewayProjectionObservabilityForTest()
	generatedAt := time.Date(2026, 6, 15, 14, 30, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(5*time.Minute))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-run-token"
	input.Users[0].LastSeenBatchId = "batch-run-token"

	summary, err := (GatewayProjectionRunReadinessService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: gatewayProjectionSnapshotFromInput(input)},
		Config: GatewayProjectionPublisherConfig{
			Enabled:      true,
			Endpoint:     "https://gateway.example.invalid/projection",
			FreshnessTTL: time.Hour,
		},
		Now: func() time.Time { return generatedAt },
	}).GetReadiness(GatewayProjectionRunReadinessQuery{OrganizationID: "org-a"})
	if err != nil {
		t.Fatalf("GetReadiness() error = %v", err)
	}
	if summary.Retry.Readiness != GatewayProjectionRetryReadinessFixPublisherConfig ||
		!containsGatewayProjectionManualDisabledReason(summary.Retry.Reasons, GatewayProjectionFailureProjectionTokenMissing) {
		t.Fatalf("retry summary = %#v, want publisher config fix", summary.Retry)
	}
}

func TestGatewayProjectionRunReadinessBlocksMappingAndInvalidSubjectData(t *testing.T) {
	resetGatewayProjectionObservabilityForTest()
	generatedAt := time.Date(2026, 6, 15, 15, 0, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(5*time.Minute))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-run-3"
	input.Users[0].LastSeenBatchId = "batch-run-3"
	input.ApiUserMappings = nil
	input.Users = append(input.Users, input.Users[0])
	input.Users[1].Name = "invalid"
	input.Users[1].AdminSubject = "org-a/invalid"
	input.Users[1].LifecycleStatus = "BROKEN"

	summary, err := (GatewayProjectionRunReadinessService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: gatewayProjectionSnapshotFromInput(input)},
		Config: GatewayProjectionPublisherConfig{
			Enabled:      true,
			Endpoint:     "https://gateway.example.invalid/projection",
			Token:        "projection-secret",
			Caller:       GatewayProjectionDefaultCaller,
			FreshnessTTL: time.Hour,
		},
		Now: func() time.Time { return generatedAt },
	}).GetReadiness(GatewayProjectionRunReadinessQuery{OrganizationID: "org-a"})
	if err != nil {
		t.Fatalf("GetReadiness() error = %v", err)
	}

	if summary.Retry.Readiness != GatewayProjectionRetryReadinessFixMappingOrSubject || summary.Retry.SafeToRetry {
		t.Fatalf("retry summary = %#v, want mapping/subject fix", summary.Retry)
	}
	if summary.Current.UnmappedSubjectCount == 0 || summary.Current.InvalidSubjectCount == 0 {
		t.Fatalf("current diff counts = %#v, want unmapped and invalid counts", summary.Current)
	}
}

func TestGatewayProjectionRunReadinessInspectsGatewayContractMismatch(t *testing.T) {
	resetGatewayProjectionObservabilityForTest()
	generatedAt := time.Date(2026, 6, 15, 15, 30, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(5*time.Minute))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-run-contract"
	input.Users[0].LastSeenBatchId = "batch-run-contract"
	build, err := BuildGatewayProjectionBatch(input)
	if err != nil {
		t.Fatalf("BuildGatewayProjectionBatch() error = %v", err)
	}
	recordGatewayProjectionServiceObservability(build, GatewayProjectionPublishResult{
		Success:   false,
		Retryable: false,
		ErrorCode: "stale_projection",
	}, input.SourceConnections, 9)

	summary, err := (GatewayProjectionRunReadinessService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: gatewayProjectionSnapshotFromInput(input)},
		Config: GatewayProjectionPublisherConfig{
			Enabled:      true,
			Endpoint:     "https://gateway.example.invalid/projection",
			Token:        "projection-secret",
			Caller:       GatewayProjectionDefaultCaller,
			FreshnessTTL: time.Hour,
		},
		Now: func() time.Time { return generatedAt },
	}).GetReadiness(GatewayProjectionRunReadinessQuery{OrganizationID: "org-a", ProjectionBatchID: "other-batch"})
	if err != nil {
		t.Fatalf("GetReadiness() error = %v", err)
	}
	if summary.Retry.Readiness != GatewayProjectionRetryReadinessInspectContract || summary.RunReference.Matched {
		t.Fatalf("summary = %#v, want inspect contract and mismatched reference", summary)
	}
}

func TestGatewayProjectionRunReadinessSanitizesResponseAndChecksRequestedRun(t *testing.T) {
	resetGatewayProjectionObservabilityForTest()
	generatedAt := time.Date(2026, 6, 15, 16, 0, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(5*time.Minute))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-run-4"
	input.Users[0].LastSeenBatchId = "batch-run-4"
	build, err := BuildGatewayProjectionBatch(input)
	if err != nil {
		t.Fatalf("BuildGatewayProjectionBatch() error = %v", err)
	}
	build.Request.TraceID = "trace-run-4"
	build.Request.ProjectionBatchID = "batch-run-4"
	recordGatewayProjectionServiceObservability(build, GatewayProjectionPublishResult{
		Success:   false,
		ErrorCode: "stale_projection",
	}, input.SourceConnections, 23)

	summary, err := (GatewayProjectionRunReadinessService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: gatewayProjectionSnapshotFromInput(input)},
		Config: GatewayProjectionPublisherConfig{
			Enabled:      false,
			Endpoint:     "https://gateway.example.invalid/projection",
			Token:        "projection-secret",
			FreshnessTTL: time.Hour,
		},
		Now: func() time.Time { return generatedAt },
	}).GetReadiness(GatewayProjectionRunReadinessQuery{
		OrganizationID:    "org-a",
		TraceID:           "trace-run-4",
		ProjectionBatchID: "batch-run-4",
	})
	if err != nil {
		t.Fatalf("GetReadiness() error = %v", err)
	}

	if !summary.RunReference.Matched || summary.LastFailureAlias != GatewayProjectionFailureGatewayContractMismatch {
		t.Fatalf("run reference/failure mismatch: %#v alias=%q", summary.RunReference, summary.LastFailureAlias)
	}
	if summary.Retry.Readiness != GatewayProjectionRetryReadinessFixPublisherConfig {
		t.Fatalf("disabled publisher should be config action, got %#v", summary.Retry)
	}
	raw, err := json.Marshal(summary)
	if err != nil {
		t.Fatalf("marshal summary: %v", err)
	}
	serialized := string(raw)
	for _, forbidden := range []string{"projection-secret", "gateway.example.invalid", "Authorization", "Cookie", "operator@example.invalid"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("run readiness leaked sensitive value %q: %s", forbidden, serialized)
		}
	}
}

func gatewayProjectionSnapshotFromInput(input GatewayProjectionBuildInput) GatewayProjectionSnapshot {
	return GatewayProjectionSnapshot{
		SourceConnections:  input.SourceConnections,
		AdminUsers:         input.AdminUsers,
		Users:              input.Users,
		ApiUserMappings:    input.ApiUserMappings,
		Departments:        input.Departments,
		Memberships:        input.Memberships,
		ExternalIdentities: input.ExternalIdentities,
		SyncBatch:          input.SyncBatch,
	}
}
