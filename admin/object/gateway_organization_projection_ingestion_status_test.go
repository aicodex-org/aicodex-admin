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
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestGatewayProjectionIngestionStatusQueriesGatewayAndSanitizesApplied(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("method = %s, want GET", r.Method)
		}
		if r.Header.Get("Authorization") != "Bearer projection-secret" {
			t.Fatalf("Authorization header mismatch: %q", r.Header.Get("Authorization"))
		}
		query := r.URL.Query()
		if query.Get("latest") != "true" || query.Get("projectionBatchId") != "batch-applied" ||
			query.Get("orgVersion") != "202606151200" || query.Get("sourceVersion") != "orgv-applied" {
			t.Fatalf("unexpected query: %s", r.URL.RawQuery)
		}
		_, _ = w.Write([]byte(`{
			"success": true,
			"data": {
				"status": "applied",
				"reasonCode": "projection_applied",
				"freshness": {"status": "fresh", "expiresAt": "2026-06-15T13:00:00Z"},
				"lineage": {"sourceVersion": "orgv-applied", "orgVersion": 202606151200, "projectionBatchId": "batch-applied"},
				"subjectCounts": {"total": 3, "active": 2, "tombstone": 1, "unmapped": 0, "invalid": 0},
				"receivedAt": "2026-06-15T12:00:00Z",
				"appliedAt": "2026-06-15T12:00:02Z",
				"durationMs": 2000,
				"rawGatewayResponse": "must-not-leak",
				"endpoint": "https://gateway.internal.invalid"
			}
		}`))
	}))
	defer server.Close()

	result, err := (GatewayProjectionIngestionStatusService{
		Config: GatewayProjectionPublisherConfig{
			Enabled:        true,
			Endpoint:       server.URL + "/api/gateway-organization-projection/v1/batches",
			StatusEndpoint: server.URL + "/api/gateway-organization-projection/v1/ingestion-status",
			Token:          "projection-secret",
			Timeout:        time.Second,
		},
	}).GetStatus(context.Background(), GatewayProjectionIngestionStatusQuery{
		OrganizationID:    "org-a",
		Latest:            true,
		ProjectionBatchID: "batch-applied",
		OrgVersion:        202606151200,
		SourceVersion:     "orgv-applied",
	})
	if err != nil {
		t.Fatalf("GetStatus() error = %v", err)
	}
	if result.Status != GatewayProjectionIngestionStatusApplied || result.FailureCategory != "" {
		t.Fatalf("result = %#v, want applied without failure", result)
	}
	if result.Query.ProjectionBatchID != "batch-applied" || !result.Query.Latest {
		t.Fatalf("query summary mismatch: %#v", result.Query)
	}
	if result.SubjectCounts.Total != 3 || result.SubjectCounts.Active != 2 || result.SubjectCounts.Tombstone != 1 {
		t.Fatalf("subject counts mismatch: %#v", result.SubjectCounts)
	}
	raw, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("marshal result: %v", err)
	}
	serialized := string(raw)
	for _, forbidden := range []string{"projection-secret", "gateway.internal.invalid", "rawGatewayResponse", "Authorization", "Cookie"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("ingestion status leaked %q: %s", forbidden, serialized)
		}
	}
}

func TestGatewayProjectionIngestionStatusDoesNotTreatNotFoundAsSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{
			"success": false,
			"error": {"code": "not_found", "message": "projection not found"}
		}`))
	}))
	defer server.Close()

	result, err := (GatewayProjectionIngestionStatusService{
		Config: GatewayProjectionPublisherConfig{
			Enabled:        true,
			StatusEndpoint: server.URL + "/api/gateway-organization-projection/v1/ingestion-status",
			Token:          "projection-secret",
			Timeout:        time.Second,
		},
	}).GetStatus(context.Background(), GatewayProjectionIngestionStatusQuery{OrganizationID: "org-a", ProjectionBatchID: "missing-batch"})
	if err != nil {
		t.Fatalf("GetStatus() should return sanitized not_found result without transport error, got %v", err)
	}
	if result.Status != GatewayProjectionIngestionStatusNotFound || result.FailureCategory != GatewayProjectionIngestionStatusNotFound {
		t.Fatalf("not_found result mismatch: %#v", result)
	}
	if result.Success {
		t.Fatalf("not_found must not be treated as success: %#v", result)
	}
}

func TestGatewayProjectionIngestionStatusFailsClosedOnMissingConfig(t *testing.T) {
	result, err := (GatewayProjectionIngestionStatusService{
		Config: GatewayProjectionPublisherConfig{Enabled: true},
	}).GetStatus(context.Background(), GatewayProjectionIngestionStatusQuery{OrganizationID: "org-a", Latest: true})
	if err == nil {
		t.Fatalf("expected missing config error")
	}
	if result.Status != GatewayProjectionIngestionStatusProviderUnavailable ||
		result.FailureCategory != GatewayProjectionPublishErrorInvalidConfig {
		t.Fatalf("missing config result mismatch: %#v", result)
	}
}

func TestGatewayProjectionIngestionStatusDerivesEndpointAndMapsConflict(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/ingestion-status") {
			t.Fatalf("path = %s, want derived ingestion-status path", r.URL.Path)
		}
		_, _ = w.Write([]byte(`{
			"success": true,
			"data": {
				"status": "conflict",
				"reasonCode": "old_org_version",
				"lineage": {"sourceVersion": "orgv-conflict", "orgVersion": 1001, "projectionBatchId": "batch-conflict"},
				"subjectCounts": {"total": 4, "unmapped": 2}
			}
		}`))
	}))
	defer server.Close()

	result, err := (GatewayProjectionIngestionStatusService{
		Config: GatewayProjectionPublisherConfig{
			Enabled:  true,
			Endpoint: server.URL + "/api/gateway-organization-projection/v1/batches",
			Token:    "projection-secret",
			Timeout:  time.Second,
		},
	}).GetStatus(context.Background(), GatewayProjectionIngestionStatusQuery{OrganizationID: "org-a", SourceVersion: "orgv-conflict"})
	if err != nil {
		t.Fatalf("GetStatus() error = %v", err)
	}
	if result.Status != GatewayProjectionIngestionStatusConflict || result.FailureCategory != GatewayProjectionIngestionStatusConflict {
		t.Fatalf("conflict mapping mismatch: %#v", result)
	}
	if result.Lineage.SourceVersion != "orgv-conflict" || result.SubjectCounts.Unmapped != 2 {
		t.Fatalf("lineage/count mismatch: %#v counts=%#v", result.Lineage, result.SubjectCounts)
	}
}

func TestGatewayProjectionIngestionStatusMapsStableGatewayStatuses(t *testing.T) {
	cases := map[string]string{
		"accepted":             "",
		"applied":              "",
		"stale":                GatewayProjectionIngestionStatusStale,
		"conflict":             GatewayProjectionIngestionStatusConflict,
		"lineage_invalid":      GatewayProjectionIngestionStatusLineageInvalid,
		"unmapped":             GatewayProjectionIngestionStatusUnmappedSubjects,
		"unmapped_subjects":    GatewayProjectionIngestionStatusUnmappedSubjects,
		"not_found":            GatewayProjectionIngestionStatusNotFound,
		"provider_unavailable": GatewayProjectionIngestionStatusProviderUnavailable,
		"invalid_config":       GatewayProjectionPublishErrorInvalidConfig,
		"invalid_response":     GatewayProjectionIngestionStatusInvalidResponse,
		"future-status":        GatewayProjectionIngestionStatusInvalidResponse,
	}
	for input, wantFailure := range cases {
		status := mapGatewayProjectionIngestionStatus(input)
		failure := gatewayProjectionIngestionFailureCategory(status)
		if failure != wantFailure {
			t.Fatalf("status %q mapped to %q failure %q, want failure %q", input, status, failure, wantFailure)
		}
	}
}

func TestGatewayProjectionIngestionStatusFailsClosedOnInvalidResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"success": true, "data":`))
	}))
	defer server.Close()

	result, err := (GatewayProjectionIngestionStatusService{
		Config: GatewayProjectionPublisherConfig{
			Enabled:        true,
			StatusEndpoint: server.URL + "/api/gateway-organization-projection/v1/ingestion-status",
			Token:          "projection-secret",
			Timeout:        time.Second,
		},
	}).GetStatus(context.Background(), GatewayProjectionIngestionStatusQuery{OrganizationID: "org-a", Latest: true})
	if err == nil {
		t.Fatalf("expected invalid response error")
	}
	if result.Status != GatewayProjectionIngestionStatusInvalidResponse ||
		result.FailureCategory != GatewayProjectionIngestionStatusInvalidResponse {
		t.Fatalf("invalid response result mismatch: %#v", result)
	}
}

func TestGatewayProjectionIngestionStatusFailsClosedOnGatewayUnavailable(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte(`{"success": false}`))
	}))
	defer server.Close()

	result, err := (GatewayProjectionIngestionStatusService{
		Config: GatewayProjectionPublisherConfig{
			Enabled:        true,
			StatusEndpoint: server.URL + "/api/gateway-organization-projection/v1/ingestion-status",
			Token:          "projection-secret",
			Timeout:        time.Second,
		},
		Now: func() time.Time { return time.Now().Add(time.Second) },
	}).GetStatus(context.Background(), GatewayProjectionIngestionStatusQuery{OrganizationID: "org-a", Latest: true})
	if err != nil {
		t.Fatalf("Gateway 503 envelope should be classified without transport error, got %v", err)
	}
	if result.Status != GatewayProjectionIngestionStatusProviderUnavailable ||
		result.FailureCategory != GatewayProjectionIngestionStatusProviderUnavailable ||
		result.DurationMs != 0 {
		t.Fatalf("provider unavailable result mismatch: %#v", result)
	}
}

func TestGatewayProjectionIngestionStatusDerivesEndpointByAppendingPath(t *testing.T) {
	endpoint := gatewayProjectionIngestionStatusEndpoint(GatewayProjectionPublisherConfig{
		Endpoint: "https://gateway.example.invalid/api/gateway-organization-projection/v1",
	})
	if endpoint != "https://gateway.example.invalid/api/gateway-organization-projection/v1/ingestion-status" {
		t.Fatalf("derived endpoint = %q", endpoint)
	}
	if got := gatewayProjectionIngestionStatusEndpoint(GatewayProjectionPublisherConfig{Endpoint: "://bad"}); got != "" {
		t.Fatalf("invalid endpoint should fail closed, got %q", got)
	}
}
