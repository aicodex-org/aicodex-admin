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
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestBuildGatewayProjectionBatchMapsPlatformModelToAPIContract(t *testing.T) {
	generatedAt := time.Date(2026, 6, 5, 9, 0, 0, 0, time.UTC)
	finishedAt := time.Date(2026, 6, 5, 9, 30, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, finishedAt)

	result, err := BuildGatewayProjectionBatch(input)
	if err != nil {
		t.Fatalf("BuildGatewayProjectionBatch() error = %v", err)
	}

	if result.Request.Caller != "aicodex-admin" || result.Request.TraceID != "trace-projection-1" {
		t.Fatalf("request wrapper mismatch: %#v", result.Request)
	}
	batch := result.Request.GatewayProjectionBatch
	if batch.ProjectionBatchID == "" || !strings.Contains(batch.ProjectionBatchID, "org-a") {
		t.Fatalf("projectionBatchId should be stable and organization-scoped, got %q", batch.ProjectionBatchID)
	}
	if batch.OrgVersion != finishedAt.UnixMilli() {
		t.Fatalf("gateway orgVersion = %d, want finishedAt unix milli %d", batch.OrgVersion, finishedAt.UnixMilli())
	}
	if batch.Lineage.SourceService != "aicodex-admin" || batch.Lineage.SourceVersion != "orgv-source-1" {
		t.Fatalf("lineage should separate admin source version from gateway orgVersion: %#v", batch.Lineage)
	}
	if !strings.HasPrefix(batch.Lineage.Digest, "sha256:") {
		t.Fatalf("lineage digest should use sha256 prefix, got %q", batch.Lineage.Digest)
	}
	if batch.Freshness.ExpiresAt != generatedAt.Add(time.Hour) {
		t.Fatalf("freshness expiresAt = %s", batch.Freshness.ExpiresAt)
	}
	if len(batch.Subjects) != 1 {
		t.Fatalf("subjects = %#v, want one published subject", batch.Subjects)
	}

	subject := batch.Subjects[0]
	if subject.StableSubjectID != "admin-user-1" || subject.APISubjectID != "10001" || subject.SubjectType != "user" {
		t.Fatalf("subject identity mismatch: %#v", subject)
	}
	if subject.OrganizationID != "org-a" || subject.LifecycleStatus != "active" {
		t.Fatalf("subject org/lifecycle mismatch: %#v", subject)
	}
	if !reflect.DeepEqual(subject.DepartmentIDs, []string{"dept-a", "dept-b"}) {
		t.Fatalf("departmentIds = %#v, want sorted active memberships", subject.DepartmentIDs)
	}
	if !reflect.DeepEqual(subject.RoleIDs, []string{"role-a", "role-b"}) {
		t.Fatalf("roleIds = %#v, want sorted explicit mapping roles", subject.RoleIDs)
	}
	if !reflect.DeepEqual(subject.PositionIDs, []string{"pos-a", "pos-b"}) {
		t.Fatalf("positionIds = %#v, want sorted explicit mapping positions", subject.PositionIDs)
	}
	if subject.OrgVersion != batch.OrgVersion || subject.FreshnessExpiresAt != batch.Freshness.ExpiresAt {
		t.Fatalf("subject version/freshness should mirror batch: subject=%#v batch=%#v", subject, batch)
	}
	if !strings.HasPrefix(subject.ProjectionVersion, "pv-") {
		t.Fatalf("projectionVersion should be a stable generated version, got %q", subject.ProjectionVersion)
	}

	raw, err := json.Marshal(result.Request)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}
	fields := map[string]any{}
	if err := json.Unmarshal(raw, &fields); err != nil {
		t.Fatalf("unmarshal request: %v", err)
	}
	for _, field := range []string{"caller", "traceId", "projectionBatchId", "orgVersion", "generatedAt", "freshness", "lineage", "subjects"} {
		if _, ok := fields[field]; !ok {
			t.Fatalf("request JSON missing flat api field %q: %s", field, string(raw))
		}
	}
	if _, ok := fields["batch"]; ok {
		t.Fatalf("request JSON must not nest projection batch under batch: %s", string(raw))
	}
}

func TestBuildGatewayProjectionBatchFailsClosedForMappingsAndLifecycle(t *testing.T) {
	generatedAt := time.Date(2026, 6, 5, 10, 0, 0, 0, time.UTC)
	finishedAt := generatedAt.Add(5 * time.Minute)
	input := gatewayProjectionTestInput(generatedAt, finishedAt)
	input.Users = append(input.Users,
		PlatformUser{
			OrganizationId:  "org-a",
			AdminSubject:    "missing-api",
			LifecycleStatus: PlatformLifecycleStatusActive,
			MappingStatus:   PlatformMappingStatusConfirmed,
		},
		PlatformUser{
			OrganizationId:  "org-a",
			AdminSubject:    "pending-api",
			LifecycleStatus: PlatformLifecycleStatusActive,
			MappingStatus:   PlatformMappingStatusConfirmed,
		},
		PlatformUser{
			OrganizationId:  "org-a",
			AdminSubject:    "stale-user",
			LifecycleStatus: PlatformLifecycleStatusStale,
			MappingStatus:   PlatformMappingStatusConfirmed,
		},
		PlatformUser{
			OrganizationId:  "org-a",
			AdminSubject:    "empty-platform-mapping",
			LifecycleStatus: PlatformLifecycleStatusActive,
			MappingStatus:   "",
		},
		PlatformUser{
			OrganizationId:  "org-a",
			AdminSubject:    "disabled-active-mapping",
			LifecycleStatus: PlatformLifecycleStatusActive,
			MappingStatus:   PlatformMappingStatusDisabled,
		},
	)
	input.ExternalIdentities = append(input.ExternalIdentities,
		ExternalIdentity{
			OrganizationId:      "org-a",
			SourceConnectionId:  "src-a",
			ExternalSubjectType: PlatformSubjectTypeUser,
			ExternalSubjectId:   "pending-api",
			PlatformSubjectType: PlatformSubjectTypeUser,
			PlatformSubject:     "pending-api",
			MappingStatus:       PlatformMappingStatusPendingReview,
			Lineage:             `{"apiSubjectId":"10002"}`,
		},
		ExternalIdentity{
			OrganizationId:      "org-a",
			SourceConnectionId:  "src-a",
			ExternalSubjectType: PlatformSubjectTypeUser,
			ExternalSubjectId:   "stale-user",
			PlatformSubjectType: PlatformSubjectTypeUser,
			PlatformSubject:     "stale-user",
			MappingStatus:       PlatformMappingStatusConfirmed,
			Lineage:             `{"apiSubjectId":"10003"}`,
		},
		ExternalIdentity{
			OrganizationId:      "org-a",
			SourceConnectionId:  "src-a",
			ExternalSubjectType: PlatformSubjectTypeUser,
			ExternalSubjectId:   "empty-platform-mapping",
			PlatformSubjectType: PlatformSubjectTypeUser,
			PlatformSubject:     "empty-platform-mapping",
			MappingStatus:       PlatformMappingStatusConfirmed,
			Lineage:             `{"apiSubjectId":"10004"}`,
		},
		ExternalIdentity{
			OrganizationId:      "org-a",
			SourceConnectionId:  "src-a",
			ExternalSubjectType: PlatformSubjectTypeUser,
			ExternalSubjectId:   "disabled-active-mapping",
			PlatformSubjectType: PlatformSubjectTypeUser,
			PlatformSubject:     "disabled-active-mapping",
			MappingStatus:       PlatformMappingStatusDisabled,
			Lineage:             `{"apiSubjectId":"10005"}`,
		},
	)

	result, err := BuildGatewayProjectionBatch(input)
	if err != nil {
		t.Fatalf("BuildGatewayProjectionBatch() error = %v", err)
	}

	subjectByStableID := map[string]GatewayProjectedSubject{}
	for _, subject := range result.Request.Subjects {
		subjectByStableID[subject.StableSubjectID] = subject
	}
	if _, ok := subjectByStableID["missing-api"]; ok {
		t.Fatalf("missing apiSubjectId must not be published: %#v", result.Request.Subjects)
	}
	if _, ok := subjectByStableID["pending-api"]; ok {
		t.Fatalf("untrusted external identity must not be published: %#v", result.Request.Subjects)
	}
	if _, ok := subjectByStableID["empty-platform-mapping"]; ok {
		t.Fatalf("empty PlatformUser mappingStatus must not be published even with confirmed ExternalIdentity: %#v", result.Request.Subjects)
	}
	if _, ok := subjectByStableID["disabled-active-mapping"]; ok {
		t.Fatalf("active subject must still require confirmed PlatformUser mappingStatus: %#v", result.Request.Subjects)
	}
	stale := subjectByStableID["stale-user"]
	if stale.APISubjectID != "10003" || stale.LifecycleStatus != "unknown" {
		t.Fatalf("stale lifecycle should publish fail-closed unknown when api subject is known: %#v", stale)
	}
	if result.Summary.SkippedByReason[GatewayProjectionSkipMappingMissing] != 1 {
		t.Fatalf("mapping_missing summary = %#v", result.Summary.SkippedByReason)
	}
	if result.Summary.SkippedByReason[GatewayProjectionSkipMappingUntrusted] != 3 {
		t.Fatalf("mapping_untrusted summary = %#v", result.Summary.SkippedByReason)
	}
}

func TestBuildGatewayProjectionBatchUsesExplicitAdminUserMapping(t *testing.T) {
	generatedAt := time.Date(2026, 6, 5, 10, 30, 0, 0, time.UTC)
	finishedAt := generatedAt.Add(5 * time.Minute)
	input := gatewayProjectionTestInput(generatedAt, finishedAt)
	input.ExternalIdentities = []ExternalIdentity{
		{
			OrganizationId:      "org-a",
			SourceConnectionId:  "src-a",
			ExternalSubjectType: PlatformSubjectTypeUser,
			ExternalSubjectId:   "external-user-1",
			PlatformSubjectType: PlatformSubjectTypeUser,
			PlatformSubject:     "admin-user-1",
			MappingStatus:       PlatformMappingStatusConfirmed,
			Lineage:             `{"sourceType":"wecom","externalSubjectId":"external-user-1"}`,
		},
	}
	input.AdminUsers = []User{
		{
			Owner: "org-a",
			Name:  "local-user-1",
			Properties: map[string]string{
				"aicodexApiUserId": "10009",
			},
		},
	}

	result, err := BuildGatewayProjectionBatch(input)
	if err != nil {
		t.Fatalf("BuildGatewayProjectionBatch() error = %v", err)
	}
	if len(result.Request.Subjects) != 1 {
		t.Fatalf("subjects = %#v, want one mapped subject", result.Request.Subjects)
	}
	if result.Request.Subjects[0].APISubjectID != "10009" {
		t.Fatalf("apiSubjectId should come from explicit admin user mapping, got %#v", result.Request.Subjects[0])
	}
}

func TestBuildGatewayProjectionBatchGeneratesStableDigestAndSubjectVersion(t *testing.T) {
	generatedAt := time.Date(2026, 6, 5, 11, 0, 0, 0, time.UTC)
	finishedAt := generatedAt.Add(5 * time.Minute)
	first := gatewayProjectionTestInput(generatedAt, finishedAt)
	second := gatewayProjectionTestInput(generatedAt, finishedAt)
	second.Memberships = []PlatformMembership{second.Memberships[2], second.Memberships[0], second.Memberships[1]}
	second.ExternalIdentities = []ExternalIdentity{second.ExternalIdentities[0]}
	second.Users = []PlatformUser{second.Users[0]}

	firstResult, err := BuildGatewayProjectionBatch(first)
	if err != nil {
		t.Fatalf("first build error = %v", err)
	}
	secondResult, err := BuildGatewayProjectionBatch(second)
	if err != nil {
		t.Fatalf("second build error = %v", err)
	}
	if firstResult.Request.Lineage.Digest != secondResult.Request.Lineage.Digest {
		t.Fatalf("digest should be stable across input ordering: first=%s second=%s", firstResult.Request.Lineage.Digest, secondResult.Request.Lineage.Digest)
	}
	if firstResult.Request.Subjects[0].ProjectionVersion != secondResult.Request.Subjects[0].ProjectionVersion {
		t.Fatalf("projectionVersion should be stable across input ordering: first=%s second=%s", firstResult.Request.Subjects[0].ProjectionVersion, secondResult.Request.Subjects[0].ProjectionVersion)
	}

	changed := gatewayProjectionTestInput(generatedAt, finishedAt)
	changed.Departments = append(changed.Departments, PlatformDepartment{
		OrganizationId:  "org-a",
		DepartmentId:    "dept-c",
		LifecycleStatus: PlatformLifecycleStatusActive,
	})
	changed.Memberships = append(changed.Memberships, PlatformMembership{
		OrganizationId:  "org-a",
		AdminSubject:    "admin-user-1",
		DepartmentId:    "dept-c",
		LifecycleStatus: PlatformLifecycleStatusActive,
	})
	changedResult, err := BuildGatewayProjectionBatch(changed)
	if err != nil {
		t.Fatalf("changed build error = %v", err)
	}
	if changedResult.Request.Lineage.Digest == firstResult.Request.Lineage.Digest {
		t.Fatalf("digest should change when subject input changes")
	}
	if changedResult.Request.Subjects[0].ProjectionVersion == firstResult.Request.Subjects[0].ProjectionVersion {
		t.Fatalf("projectionVersion should change when subject departmentIds change")
	}
}

func TestBuildGatewayProjectionBatchRefreshKeepsOrgVersionAndRenewsFreshness(t *testing.T) {
	finishedAt := time.Date(2026, 6, 5, 9, 30, 0, 0, time.UTC)
	first := gatewayProjectionTestInput(time.Date(2026, 6, 5, 10, 0, 0, 0, time.UTC), finishedAt)
	second := gatewayProjectionTestInput(time.Date(2026, 6, 5, 10, 15, 0, 0, time.UTC), finishedAt)

	firstResult, err := BuildGatewayProjectionBatch(first)
	if err != nil {
		t.Fatalf("first refresh build error = %v", err)
	}
	secondResult, err := BuildGatewayProjectionBatch(second)
	if err != nil {
		t.Fatalf("second refresh build error = %v", err)
	}

	if firstResult.Request.OrgVersion != secondResult.Request.OrgVersion {
		t.Fatalf("refresh must keep orgVersion for unchanged source snapshot: first=%d second=%d", firstResult.Request.OrgVersion, secondResult.Request.OrgVersion)
	}
	if firstResult.Request.ProjectionBatchID == secondResult.Request.ProjectionBatchID {
		t.Fatalf("refresh should create a new projectionBatchId when freshness moves: %s", firstResult.Request.ProjectionBatchID)
	}
	if firstResult.Request.Subjects[0].ProjectionVersion == secondResult.Request.Subjects[0].ProjectionVersion {
		t.Fatalf("refresh should create a new subject projectionVersion when freshness moves")
	}
	if !secondResult.Request.Freshness.ExpiresAt.After(firstResult.Request.Freshness.ExpiresAt) {
		t.Fatalf("refresh freshness should move forward: first=%s second=%s", firstResult.Request.Freshness.ExpiresAt, secondResult.Request.Freshness.ExpiresAt)
	}
}

func TestBuildGatewayProjectionBatchPublishesLifecycleTombstoneSubjects(t *testing.T) {
	generatedAt := time.Date(2026, 6, 5, 11, 30, 0, 0, time.UTC)
	finishedAt := generatedAt.Add(5 * time.Minute)
	input := gatewayProjectionTestInput(generatedAt, finishedAt)
	input.Users = append(input.Users,
		PlatformUser{
			OrganizationId:  "org-a",
			AdminSubject:    "disabled-user",
			LifecycleStatus: PlatformLifecycleStatusDisabled,
			MappingStatus:   PlatformMappingStatusDisabled,
		},
		PlatformUser{
			OrganizationId:  "org-a",
			AdminSubject:    "deleted-user",
			LifecycleStatus: PlatformLifecycleStatusDeleted,
			MappingStatus:   PlatformMappingStatusConfirmed,
		},
		PlatformUser{
			OrganizationId:  "org-a",
			AdminSubject:    "conflicted-user",
			LifecycleStatus: PlatformLifecycleStatusConflicted,
			MappingStatus:   PlatformMappingStatusConfirmed,
		},
	)
	input.ExternalIdentities = append(input.ExternalIdentities,
		ExternalIdentity{
			OrganizationId:      "org-a",
			SourceConnectionId:  "src-a",
			ExternalSubjectType: PlatformSubjectTypeUser,
			ExternalSubjectId:   "disabled-user",
			PlatformSubjectType: PlatformSubjectTypeUser,
			PlatformSubject:     "disabled-user",
			MappingStatus:       PlatformMappingStatusDisabled,
			Lineage:             `{"apiSubjectId":"10002"}`,
		},
		ExternalIdentity{
			OrganizationId:      "org-a",
			SourceConnectionId:  "src-a",
			ExternalSubjectType: PlatformSubjectTypeUser,
			ExternalSubjectId:   "deleted-user",
			PlatformSubjectType: PlatformSubjectTypeUser,
			PlatformSubject:     "deleted-user",
			MappingStatus:       PlatformMappingStatusConfirmed,
			Lineage:             `{"apiSubjectId":"10003"}`,
		},
		ExternalIdentity{
			OrganizationId:      "org-a",
			SourceConnectionId:  "src-a",
			ExternalSubjectType: PlatformSubjectTypeUser,
			ExternalSubjectId:   "conflicted-user",
			PlatformSubjectType: PlatformSubjectTypeUser,
			PlatformSubject:     "conflicted-user",
			MappingStatus:       PlatformMappingStatusConfirmed,
			Lineage:             `{"apiSubjectId":"10004"}`,
		},
	)

	result, err := BuildGatewayProjectionBatch(input)
	if err != nil {
		t.Fatalf("BuildGatewayProjectionBatch() error = %v", err)
	}
	lifecycleBySubject := map[string]string{}
	for _, subject := range result.Request.Subjects {
		lifecycleBySubject[subject.StableSubjectID] = subject.LifecycleStatus
	}
	expected := map[string]string{
		"admin-user-1":    "active",
		"disabled-user":   "disabled",
		"deleted-user":    "deleted",
		"conflicted-user": "conflicted",
	}
	if !reflect.DeepEqual(lifecycleBySubject, expected) {
		t.Fatalf("full projection must include active and tombstone subjects: got %#v want %#v", lifecycleBySubject, expected)
	}
}

func gatewayProjectionTestInput(generatedAt time.Time, finishedAt time.Time) GatewayProjectionBuildInput {
	return GatewayProjectionBuildInput{
		TraceID:        "trace-projection-1",
		Caller:         "aicodex-admin",
		OrganizationID: "org-a",
		GeneratedAt:    generatedAt,
		FreshnessTTL:   time.Hour,
		SourceConnections: []SourceConnection{
			{
				OrganizationId:     "org-a",
				SourceConnectionId: "src-a",
				SourceType:         SourceTypeWecom,
				Status:             SourceConnectionStatusActive,
			},
		},
		Users: []PlatformUser{
			{
				OrganizationId:  "org-a",
				AdminSubject:    "admin-user-1",
				UserOwner:       "org-a",
				UserName:        "local-user-1",
				LifecycleStatus: PlatformLifecycleStatusActive,
				MappingStatus:   PlatformMappingStatusConfirmed,
			},
		},
		Departments: []PlatformDepartment{
			{
				OrganizationId:  "org-a",
				DepartmentId:    "dept-b",
				LifecycleStatus: PlatformLifecycleStatusActive,
			},
			{
				OrganizationId:  "org-a",
				DepartmentId:    "dept-a",
				LifecycleStatus: PlatformLifecycleStatusActive,
			},
		},
		Memberships: []PlatformMembership{
			{
				OrganizationId:  "org-a",
				AdminSubject:    "admin-user-1",
				DepartmentId:    "dept-b",
				LifecycleStatus: PlatformLifecycleStatusActive,
			},
			{
				OrganizationId:  "org-a",
				AdminSubject:    "admin-user-1",
				DepartmentId:    "dept-a",
				LifecycleStatus: PlatformLifecycleStatusActive,
			},
			{
				OrganizationId:  "org-a",
				AdminSubject:    "admin-user-1",
				DepartmentId:    "dept-a",
				LifecycleStatus: PlatformLifecycleStatusActive,
			},
		},
		ExternalIdentities: []ExternalIdentity{
			{
				OrganizationId:      "org-a",
				SourceConnectionId:  "src-a",
				ExternalSubjectType: PlatformSubjectTypeUser,
				ExternalSubjectId:   "external-user-1",
				PlatformSubjectType: PlatformSubjectTypeUser,
				PlatformSubject:     "admin-user-1",
				MappingStatus:       PlatformMappingStatusConfirmed,
				Lineage:             `{"apiSubjectId":"10001","roleIds":["role-b","role-a","role-b"],"positionIds":["pos-b","pos-a"]}`,
			},
		},
		SyncBatch: &OrgSyncBatch{
			OrganizationId:     "org-a",
			SourceConnectionId: "src-a",
			BatchId:            "run-1",
			Status:             OrgSyncBatchStatusSucceeded,
			FinishedAt:         finishedAt,
			OrgVersion:         "orgv-source-1",
			Freshness:          PlatformFreshnessFresh,
		},
	}
}

func TestGatewayProjectionPublisherSendsBearerAndTreatsAcceptedOrIdempotentAsSuccess(t *testing.T) {
	request := gatewayProjectionPublishTestRequest()
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Method != http.MethodPost || r.URL.Path != "/api/gateway-organization-projection/v1/batches" {
			t.Fatalf("unexpected request target: %s %s", r.Method, r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer projection-secret" {
			t.Fatalf("Authorization header = %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Fatalf("Content-Type = %q", r.Header.Get("Content-Type"))
		}
		body := GatewayProjectionBatchRequest{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		if body.Caller != "aicodex-admin" || body.TraceID != "trace-publish-1" || body.ProjectionBatchID != "batch-publish-1" {
			t.Fatalf("unexpected request body: %#v", body)
		}
		if calls == 1 {
			_, _ = w.Write([]byte(`{"success":true,"traceId":"trace-publish-1","data":{"accepted":true,"idempotent":false}}`))
			return
		}
		_, _ = w.Write([]byte(`{"success":true,"traceId":"trace-publish-1","data":{"accepted":true,"idempotent":true}}`))
	}))
	defer server.Close()

	publisher := GatewayProjectionPublisher{
		Config: GatewayProjectionPublisherConfig{
			Endpoint: server.URL + "/api/gateway-organization-projection/v1/batches",
			Token:    "projection-secret",
			Caller:   "aicodex-admin",
			Timeout:  time.Second,
		},
		Client: server.Client(),
	}
	first, err := publisher.Publish(context.Background(), request)
	if err != nil {
		t.Fatalf("first Publish() error = %v", err)
	}
	if !first.Success || !first.Accepted || first.Idempotent || first.Attempts != 1 {
		t.Fatalf("unexpected first result: %#v", first)
	}
	second, err := publisher.Publish(context.Background(), request)
	if err != nil {
		t.Fatalf("second Publish() error = %v", err)
	}
	if !second.Success || !second.Accepted || !second.Idempotent || second.Attempts != 1 {
		t.Fatalf("unexpected second result: %#v", second)
	}
}

func TestGatewayProjectionPublisherClassifiesNonRetryableErrors(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		errorCode  string
	}{
		{name: "unauthorized", statusCode: http.StatusUnauthorized, errorCode: "unauthenticated"},
		{name: "forbidden", statusCode: http.StatusForbidden, errorCode: "authorization_failed"},
		{name: "bad request", statusCode: http.StatusBadRequest, errorCode: "projection_expired"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				w.WriteHeader(tt.statusCode)
				_, _ = w.Write([]byte(`{"success":false,"error":{"code":"` + tt.errorCode + `","message":"rejected"}}`))
			}))
			defer server.Close()

			publisher := GatewayProjectionPublisher{
				Config: GatewayProjectionPublisherConfig{
					Endpoint:   server.URL,
					Token:      "projection-secret",
					Caller:     "aicodex-admin",
					Timeout:    time.Second,
					MaxRetries: 2,
				},
				Client: server.Client(),
			}
			result, err := publisher.Publish(context.Background(), gatewayProjectionPublishTestRequest())
			if err != nil {
				t.Fatalf("Publish() error = %v", err)
			}
			if result.Success || result.Retryable || result.ErrorCode != tt.errorCode || result.Attempts != 1 {
				t.Fatalf("unexpected non-retryable result: %#v", result)
			}
			if calls != 1 {
				t.Fatalf("non-retryable status should not retry, calls=%d", calls)
			}
		})
	}
}

func TestGatewayProjectionPublisherRetries5xxWithSameBatchID(t *testing.T) {
	request := gatewayProjectionPublishTestRequest()
	calls := 0
	seenBatchIDs := []string{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		body := GatewayProjectionBatchRequest{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		seenBatchIDs = append(seenBatchIDs, body.ProjectionBatchID)
		if calls == 1 {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"success":false,"error":{"code":"authorization_unavailable","message":"temporary"}}`))
			return
		}
		_, _ = w.Write([]byte(`{"success":true,"data":{"accepted":true}}`))
	}))
	defer server.Close()

	publisher := GatewayProjectionPublisher{
		Config: GatewayProjectionPublisherConfig{
			Endpoint:   server.URL,
			Token:      "projection-secret",
			Caller:     "aicodex-admin",
			Timeout:    time.Second,
			MaxRetries: 1,
		},
		Client: server.Client(),
	}
	result, err := publisher.Publish(context.Background(), request)
	if err != nil {
		t.Fatalf("Publish() error = %v", err)
	}
	if !result.Success || result.Attempts != 2 {
		t.Fatalf("expected retry then success, got %#v", result)
	}
	if !reflect.DeepEqual(seenBatchIDs, []string{"batch-publish-1", "batch-publish-1"}) {
		t.Fatalf("retry must keep projectionBatchId stable, got %#v", seenBatchIDs)
	}
}

func TestGatewayProjectionPublisherRetriesTransportTimeout(t *testing.T) {
	request := gatewayProjectionPublishTestRequest()
	attempts := 0
	publisher := GatewayProjectionPublisher{
		Config: GatewayProjectionPublisherConfig{
			Endpoint:   "http://gateway-projection",
			Token:      "projection-secret",
			Caller:     "aicodex-admin",
			Timeout:    10 * time.Millisecond,
			MaxRetries: 1,
		},
		Client: &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				attempts++
				return nil, context.DeadlineExceeded
			}),
		},
	}
	result, err := publisher.Publish(context.Background(), request)
	if err == nil {
		t.Fatalf("expected transport retry exhaustion error")
	}
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected timeout error, got %v", err)
	}
	if result.Success || !result.Retryable || result.ErrorCode != GatewayProjectionPublishErrorProviderUnavailable || result.Attempts != 2 {
		t.Fatalf("unexpected timeout result: %#v", result)
	}
	if attempts != 2 {
		t.Fatalf("timeout should retry once, attempts=%d", attempts)
	}
}

func TestGatewayProjectionPublisherKeepsRequestContextUntilResponseBodyRead(t *testing.T) {
	request := gatewayProjectionPublishTestRequest()
	publisher := GatewayProjectionPublisher{
		Config: GatewayProjectionPublisherConfig{
			Endpoint:   "http://gateway-projection",
			Token:      "projection-secret",
			Caller:     "aicodex-admin",
			Timeout:    time.Second,
			MaxRetries: 0,
		},
		Client: &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				return &http.Response{
					StatusCode: http.StatusOK,
					Header:     http.Header{"Content-Type": []string{"application/json"}},
					Body:       &contextAwareBody{ctx: r.Context(), payload: []byte(`{"success":true,"data":{"accepted":true}}`)},
				}, nil
			}),
		},
	}

	result, err := publisher.Publish(context.Background(), request)
	if err != nil {
		t.Fatalf("Publish() error = %v", err)
	}
	if !result.Success || !result.Accepted {
		t.Fatalf("unexpected publish result: %#v", result)
	}
}

func TestGatewayProjectionServiceBuildsAndPublishesOrganization(t *testing.T) {
	generatedAt := time.Date(2026, 6, 5, 13, 0, 0, 0, time.UTC)
	finishedAt := generatedAt.Add(10 * time.Minute)
	store := &memoryGatewayProjectionSnapshotStore{
		snapshot: GatewayProjectionSnapshot{
			SourceConnections:  []SourceConnection{{OrganizationId: "org-a", SourceConnectionId: "src-a", SourceType: SourceTypeWecom, Status: SourceConnectionStatusActive}},
			Users:              gatewayProjectionTestInput(generatedAt, finishedAt).Users,
			Departments:        gatewayProjectionTestInput(generatedAt, finishedAt).Departments,
			Memberships:        gatewayProjectionTestInput(generatedAt, finishedAt).Memberships,
			ExternalIdentities: gatewayProjectionTestInput(generatedAt, finishedAt).ExternalIdentities,
			SyncBatch:          gatewayProjectionTestInput(generatedAt, finishedAt).SyncBatch,
		},
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body := GatewayProjectionBatchRequest{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode service publish body: %v", err)
		}
		if body.Caller != "aicodex-admin" || body.TraceID != "trace-service-1" || len(body.Subjects) != 1 {
			t.Fatalf("unexpected service publish body: %#v", body)
		}
		_, _ = w.Write([]byte(`{"success":true,"data":{"accepted":true}}`))
	}))
	defer server.Close()

	service := &GatewayProjectionService{
		Store: store,
		Config: GatewayProjectionPublisherConfig{
			Endpoint:     server.URL,
			Token:        "projection-secret",
			Caller:       "aicodex-admin",
			Timeout:      time.Second,
			FreshnessTTL: time.Hour,
		},
		Now: func() time.Time { return generatedAt },
	}

	result, err := service.BuildAndPublishOrganization(context.Background(), "org-a", "trace-service-1")
	if err != nil {
		t.Fatalf("BuildAndPublishOrganization() error = %v", err)
	}
	if !result.Publish.Success || result.Build.Summary.PublishedSubjectCount != 1 {
		t.Fatalf("unexpected service result: %#v", result)
	}
	if store.organizationSeen != "org-a" {
		t.Fatalf("store organization = %q, want org-a", store.organizationSeen)
	}
}

func TestWecomOrganizationSyncGatewayProjectionTriggerIsConfigGated(t *testing.T) {
	publisher := &fakeGatewayProjectionOrganizationPublisher{}
	service := &WecomOrganizationSyncService{GatewayProjectionService: publisher}
	config := &WecomOrganizationSyncConfig{Organization: "org-a"}
	run := &WecomOrganizationSyncRun{Name: "run-1"}

	t.Setenv("gatewayOrganizationProjectionEnabled", "")
	service.publishGatewayProjectionAfterSuccessfulSync(context.Background(), config, run)
	if publisher.calls != 0 {
		t.Fatalf("gateway projection should be disabled by default, calls=%d", publisher.calls)
	}

	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	service.publishGatewayProjectionAfterSuccessfulSync(context.Background(), config, run)
	if publisher.calls != 1 || publisher.organizationSeen != "org-a" || publisher.traceSeen != "run-1" {
		t.Fatalf("gateway projection trigger mismatch: %#v", publisher)
	}
}

func TestGatewayProjectionPublishFailureCodeDoesNotLeakEndpoint(t *testing.T) {
	result := GatewayProjectionServiceResult{}
	errorCode := gatewayProjectionPublishFailureCode(result)
	if errorCode != "gateway_projection_failed" {
		t.Fatalf("unexpected fallback error code: %s", errorCode)
	}
	if strings.Contains(errorCode, "http://") || strings.Contains(errorCode, "https://") {
		t.Fatalf("fallback error code must not contain endpoint: %s", errorCode)
	}

	result.Publish.ErrorCode = GatewayProjectionPublishErrorProviderUnavailable
	if got := gatewayProjectionPublishFailureCode(result); got != GatewayProjectionPublishErrorProviderUnavailable {
		t.Fatalf("publish error code should be preserved, got %s", got)
	}
}

func gatewayProjectionPublishTestRequest() GatewayProjectionBatchRequest {
	generatedAt := time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC)
	return GatewayProjectionBatchRequest{
		Caller:  "aicodex-admin",
		TraceID: "trace-publish-1",
		GatewayProjectionBatch: GatewayProjectionBatch{
			ProjectionBatchID: "batch-publish-1",
			OrgVersion:        202606051200,
			GeneratedAt:       generatedAt,
			Freshness: GatewayProjectionFreshness{
				ExpiresAt: generatedAt.Add(time.Hour),
			},
			Lineage: GatewayProjectionLineage{
				SourceService: "aicodex-admin",
				SourceVersion: "orgv-publish-1",
				Digest:        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			},
			Subjects: []GatewayProjectedSubject{
				{
					StableSubjectID:    "admin-user-1",
					APISubjectID:       "10001",
					SubjectType:        "user",
					OrganizationID:     "org-a",
					LifecycleStatus:    "active",
					ProjectionVersion:  "pv-publish-1",
					OrgVersion:         202606051200,
					FreshnessExpiresAt: generatedAt.Add(time.Hour),
				},
			},
		},
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

type contextAwareBody struct {
	ctx     context.Context
	payload []byte
	offset  int
}

func (b *contextAwareBody) Read(p []byte) (int, error) {
	if err := b.ctx.Err(); err != nil {
		return 0, err
	}
	if b.offset >= len(b.payload) {
		return 0, io.EOF
	}
	n := copy(p, b.payload[b.offset:])
	b.offset += n
	return n, nil
}

func (b *contextAwareBody) Close() error {
	return nil
}

type memoryGatewayProjectionSnapshotStore struct {
	organizationSeen string
	snapshot         GatewayProjectionSnapshot
	err              error
}

func (s *memoryGatewayProjectionSnapshotStore) GetGatewayProjectionSnapshot(organizationID string) (*GatewayProjectionSnapshot, error) {
	s.organizationSeen = organizationID
	if s.err != nil {
		return nil, s.err
	}
	copied := s.snapshot
	return &copied, nil
}

type fakeGatewayProjectionOrganizationPublisher struct {
	calls            int
	organizationSeen string
	traceSeen        string
	err              error
}

func (p *fakeGatewayProjectionOrganizationPublisher) BuildAndPublishOrganization(ctx context.Context, organizationID string, traceID string) (GatewayProjectionServiceResult, error) {
	p.calls++
	p.organizationSeen = organizationID
	p.traceSeen = traceID
	return GatewayProjectionServiceResult{
		Publish: GatewayProjectionPublishResult{Success: true, Accepted: true, Attempts: 1},
	}, p.err
}
