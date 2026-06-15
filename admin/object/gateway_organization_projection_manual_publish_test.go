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
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestGatewayProjectionManualPublishRejectsMissingOrganization(t *testing.T) {
	_, err := (GatewayProjectionManualPublishService{}).Publish(context.Background(), GatewayProjectionManualPublishRequest{})
	if err == nil || !strings.Contains(err.Error(), "organization is required") {
		t.Fatalf("expected missing organization error, got %v", err)
	}
}

func TestGatewayProjectionManualPublishUsesDefaultServicePublisher(t *testing.T) {
	generatedAt := time.Now().UTC()
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(5*time.Minute))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-manual-1"
	input.Users[0].LastSeenBatchId = "batch-manual-1"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer projection-secret" {
			t.Fatalf("Authorization header should use service token, got %q", r.Header.Get("Authorization"))
		}
		body := GatewayProjectionBatchRequest{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		if body.TraceID != "trace-default-publisher" || len(body.Subjects) != 1 {
			t.Fatalf("unexpected request body: %#v", body)
		}
		_, _ = w.Write([]byte(`{"success":true,"data":{"accepted":true,"idempotent":true}}`))
	}))
	defer server.Close()

	result, err := (GatewayProjectionManualPublishService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: GatewayProjectionSnapshot{
			SourceConnections: input.SourceConnections,
			Users:             input.Users,
			ApiUserMappings:   input.ApiUserMappings,
			Departments:       input.Departments,
			Memberships:       input.Memberships,
			SyncBatch:         input.SyncBatch,
		}},
		Config: GatewayProjectionPublisherConfig{
			Enabled:      true,
			Endpoint:     server.URL,
			Token:        "projection-secret",
			Caller:       GatewayProjectionDefaultCaller,
			FreshnessTTL: time.Hour,
			Timeout:      time.Second,
		},
	}).Publish(context.Background(), GatewayProjectionManualPublishRequest{
		OrganizationID: "org-a",
		TraceID:        "trace-default-publisher",
	})
	if err != nil {
		t.Fatalf("Publish() error = %v", err)
	}
	if result.Status != "ok" || !result.Accepted || !result.Idempotent || result.DurationMs < 0 {
		t.Fatalf("default service result mismatch: %#v", result)
	}
}

func TestGatewayProjectionManualPublishBlocksUnsafePreflight(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC)
	publisher := &fakeGatewayProjectionManualPublisher{}
	service := GatewayProjectionManualPublishService{
		Store: &memoryGatewayProjectionSnapshotStore{
			snapshot: GatewayProjectionSnapshot{
				SourceConnections: []SourceConnection{{OrganizationId: "org-a", Status: SourceConnectionStatusDisabled, Freshness: PlatformFreshnessStale}},
				SyncBatch:         &OrgSyncBatch{OrganizationId: "org-a", OrgVersion: "orgv-a", FinishedAt: generatedAt},
			},
		},
		Publisher: publisher,
		Config: GatewayProjectionPublisherConfig{
			Enabled: false,
		},
		Now: func() time.Time { return generatedAt },
	}

	result, err := service.Publish(context.Background(), GatewayProjectionManualPublishRequest{
		OrganizationID: "org-a",
		TraceID:        "trace-manual-1",
		Reason:         "operator-check",
	})
	if err != nil {
		t.Fatalf("Publish() error = %v", err)
	}
	if result.Status != "error" || result.FailureCategory != "publisher_disabled" {
		t.Fatalf("blocked result = %#v, want publisher_disabled error", result)
	}
	if publisher.calls != 0 {
		t.Fatalf("manual preflight must not call publisher when unsafe, calls=%d", publisher.calls)
	}
	if !containsGatewayProjectionManualDisabledReason(result.DisabledReasons, "publisher_disabled") ||
		!containsGatewayProjectionManualDisabledReason(result.DisabledReasons, GatewayProjectionFailureSourceConnectionDisabled) ||
		!containsGatewayProjectionManualDisabledReason(result.DisabledReasons, GatewayProjectionFailureNoPublishableSubjects) {
		t.Fatalf("disabled reasons = %#v", result.DisabledReasons)
	}
}

func TestGatewayProjectionManualPublishHelpersHandleEmptySnapshot(t *testing.T) {
	readiness := buildGatewayProjectionManualPublishReadiness(nil)
	if readiness.TotalSubjectCount != 0 || readiness.PublishableSubjectCount != 0 {
		t.Fatalf("nil readiness = %#v, want empty", readiness)
	}
	build, err := buildGatewayProjectionManualPublishDryRun(GatewayProjectionPublisherConfig{Caller: GatewayProjectionDefaultCaller}, nil, "org-a", "trace-empty", time.Now().UTC())
	if err == nil || build.Summary.PublishedSubjectCount != 0 {
		t.Fatalf("nil dry-run build=%#v err=%v, want source version error", build, err)
	}
	snapshot, err := (gatewayProjectionStaticSnapshotStore{}).GetGatewayProjectionSnapshot("org-a")
	if err != nil || snapshot == nil {
		t.Fatalf("empty static snapshot store returned snapshot=%#v err=%v", snapshot, err)
	}
	if _, ok := (GatewayProjectionManualPublishService{}).snapshotStore().(defaultGatewayProjectionSnapshotStore); !ok {
		t.Fatalf("nil manual service should use default snapshot store")
	}
	explicitStore := &memoryGatewayProjectionSnapshotStore{}
	if (GatewayProjectionManualPublishService{Store: explicitStore}).snapshotStore() != explicitStore {
		t.Fatalf("manual service should preserve explicit snapshot store")
	}
}

func TestGatewayProjectionManualPublishReturnsSanitizedAcceptedEnvelope(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 11, 0, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(5*time.Minute))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-manual-1"
	input.Users[0].LastSeenBatchId = "batch-manual-1"
	snapshot := GatewayProjectionSnapshot{
		SourceConnections:  input.SourceConnections,
		Users:              input.Users,
		ApiUserMappings:    input.ApiUserMappings,
		Departments:        input.Departments,
		Memberships:        input.Memberships,
		ExternalIdentities: input.ExternalIdentities,
		SyncBatch:          input.SyncBatch,
	}
	publisher := &fakeGatewayProjectionManualPublisher{
		result: GatewayProjectionServiceResult{
			Build: GatewayProjectionBuildResult{
				Request: inputManualGatewayProjectionRequest(generatedAt),
				Summary: GatewayProjectionBuildSummary{
					PublishedSubjectCount: 1,
					SkippedSubjectCount:   2,
					SkippedByReason:       map[string]int{GatewayProjectionSkipMappingMissing: 2},
				},
			},
			Publish: GatewayProjectionPublishResult{
				Success:    true,
				Accepted:   true,
				Idempotent: false,
				Retryable:  false,
				Attempts:   1,
				StatusCode: 200,
			},
		},
	}
	service := GatewayProjectionManualPublishService{
		Store:     &memoryGatewayProjectionSnapshotStore{snapshot: snapshot},
		Publisher: publisher,
		Config: GatewayProjectionPublisherConfig{
			Enabled:      true,
			Endpoint:     "https://gateway.example.invalid/api/gateway-organization-projection/v1/batches",
			Token:        "projection-secret",
			Caller:       GatewayProjectionDefaultCaller,
			FreshnessTTL: time.Hour,
		},
		Now: func() time.Time { return generatedAt },
	}

	result, err := service.Publish(context.Background(), GatewayProjectionManualPublishRequest{
		OrganizationID: "org-a",
		TraceID:        "trace-manual-2",
	})
	if err != nil {
		t.Fatalf("Publish() error = %v", err)
	}
	if publisher.calls != 1 || publisher.organizationSeen != "org-a" || publisher.traceSeen != "trace-manual-2" {
		t.Fatalf("publisher call mismatch: %#v", publisher)
	}
	if result.Status != "ok" || !result.Accepted || result.Retryable || result.ProjectionBatchID != "batch-manual-1" {
		t.Fatalf("accepted envelope mismatch: %#v", result)
	}
	if result.SubjectCount != 1 || result.SkippedSubjectCount != 2 || result.SkippedByReason[GatewayProjectionSkipMappingMissing] != 2 {
		t.Fatalf("subject summary mismatch: %#v", result)
	}
	if result.Readiness.ActivePublishableCount != 1 || result.Readiness.PublishableSubjectCount != 1 {
		t.Fatalf("readiness summary mismatch: %#v", result.Readiness)
	}

	raw, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("marshal manual publish result: %v", err)
	}
	serialized := string(raw)
	for _, forbidden := range []string{"projection-secret", "gateway.example.invalid", "tenant-secret", "operator@example.invalid", "secret-sensitive"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("manual publish envelope leaked sensitive value %q: %s", forbidden, serialized)
		}
	}
}

func TestGatewayProjectionManualPublishMapsPublisherFailure(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 12, 0, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(5*time.Minute))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-manual-1"
	input.Users[0].LastSeenBatchId = "batch-manual-1"
	publisher := &fakeGatewayProjectionManualPublisher{
		result: GatewayProjectionServiceResult{
			Build: GatewayProjectionBuildResult{
				Request: inputManualGatewayProjectionRequest(generatedAt),
				Summary: GatewayProjectionBuildSummary{PublishedSubjectCount: 1},
			},
			Publish: GatewayProjectionPublishResult{
				Success:    false,
				Retryable:  true,
				ErrorCode:  GatewayProjectionPublishErrorProviderUnavailable,
				Attempts:   2,
				StatusCode: 503,
			},
		},
	}
	service := GatewayProjectionManualPublishService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: GatewayProjectionSnapshot{
			SourceConnections: input.SourceConnections,
			Users:             input.Users,
			ApiUserMappings:   input.ApiUserMappings,
			Departments:       input.Departments,
			Memberships:       input.Memberships,
			SyncBatch:         input.SyncBatch,
		}},
		Publisher: publisher,
		Config: GatewayProjectionPublisherConfig{
			Enabled:  true,
			Endpoint: "https://gateway.example.invalid/projection",
			Token:    "projection-secret",
			Caller:   GatewayProjectionDefaultCaller,
		},
		Now: func() time.Time { return generatedAt },
	}

	result, err := service.Publish(context.Background(), GatewayProjectionManualPublishRequest{OrganizationID: "org-a"})
	if err != nil {
		t.Fatalf("Publish() error = %v", err)
	}
	if result.Status != "error" || !result.Retryable || result.FailureCategory != GatewayProjectionFailureGatewayUnavailable {
		t.Fatalf("failure envelope mismatch: %#v", result)
	}
}

func TestGatewayProjectionManualPublishMapsTransportErrorWithoutGatewayCode(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 12, 30, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(5*time.Minute))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-manual-1"
	input.Users[0].LastSeenBatchId = "batch-manual-1"
	publisher := &fakeGatewayProjectionManualPublisher{
		result: GatewayProjectionServiceResult{
			Build: GatewayProjectionBuildResult{
				Request: inputManualGatewayProjectionRequest(generatedAt),
				Summary: GatewayProjectionBuildSummary{PublishedSubjectCount: 1},
			},
			Publish: GatewayProjectionPublishResult{
				Success:  false,
				Attempts: 1,
			},
		},
		err: errors.New("transport unavailable"),
	}
	service := GatewayProjectionManualPublishService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: GatewayProjectionSnapshot{
			SourceConnections: input.SourceConnections,
			Users:             input.Users,
			ApiUserMappings:   input.ApiUserMappings,
			Departments:       input.Departments,
			Memberships:       input.Memberships,
			SyncBatch:         input.SyncBatch,
		}},
		Publisher: publisher,
		Config: GatewayProjectionPublisherConfig{
			Enabled:  true,
			Endpoint: "https://gateway.example.invalid/projection",
			Token:    "projection-secret",
			Caller:   GatewayProjectionDefaultCaller,
		},
		Now: func() time.Time { return generatedAt },
	}

	result, err := service.Publish(context.Background(), GatewayProjectionManualPublishRequest{OrganizationID: "org-a"})
	if err == nil {
		t.Fatalf("expected transport error")
	}
	if result.Status != "error" || result.FailureCategory != GatewayProjectionFailureGatewayUnavailable || result.ErrorCode != GatewayProjectionPublishErrorProviderUnavailable {
		t.Fatalf("transport error envelope mismatch: %#v", result)
	}
}

func inputManualGatewayProjectionRequest(generatedAt time.Time) GatewayProjectionBatchRequest {
	request := gatewayProjectionPublishTestRequest()
	request.TraceID = "trace-manual-2"
	request.ProjectionBatchID = "batch-manual-1"
	request.OrgVersion = generatedAt.UnixMilli()
	request.GeneratedAt = generatedAt
	request.Freshness.ExpiresAt = generatedAt.Add(time.Hour)
	request.Lineage.SourceVersion = "orgv-manual-1"
	request.Subjects[0].OrgVersion = request.OrgVersion
	request.Subjects[0].FreshnessExpiresAt = request.Freshness.ExpiresAt
	return request
}

func containsGatewayProjectionManualDisabledReason(reasons []string, want string) bool {
	for _, reason := range reasons {
		if reason == want {
			return true
		}
	}
	return false
}

type fakeGatewayProjectionManualPublisher struct {
	calls            int
	organizationSeen string
	traceSeen        string
	result           GatewayProjectionServiceResult
	err              error
}

func (p *fakeGatewayProjectionManualPublisher) BuildAndPublishOrganization(ctx context.Context, organizationID string, traceID string) (GatewayProjectionServiceResult, error) {
	p.calls++
	p.organizationSeen = organizationID
	p.traceSeen = traceID
	return p.result, p.err
}
