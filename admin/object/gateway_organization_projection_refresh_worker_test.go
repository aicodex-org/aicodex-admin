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
	"errors"
	"reflect"
	"testing"
	"time"
)

func TestGatewayProjectionRefreshConfigDefaultsBelowFreshnessTTL(t *testing.T) {
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "http://gateway-projection.local/api/gateway-organization-projection/v1/batches")
	t.Setenv("gatewayOrganizationProjectionToken", "projection-secret")
	t.Setenv("gatewayOrganizationProjectionFreshnessTTLSeconds", "1800")
	t.Setenv("gatewayOrganizationProjectionRefreshEnabled", "")
	t.Setenv("gatewayOrganizationProjectionRefreshIntervalSeconds", "")
	t.Setenv("gatewayOrganizationProjectionRefreshInitialDelaySeconds", "")
	t.Setenv("gatewayOrganizationProjectionRefreshBatchSize", "")

	config := GetGatewayProjectionRefreshConfig()
	if !config.Enabled || config.DisabledReason != "" {
		t.Fatalf("refresh config should be enabled by publisher config: %#v", config)
	}
	if config.Interval != 15*time.Minute || config.Interval >= 30*time.Minute {
		t.Fatalf("refresh interval = %s, want default 15m and below 30m TTL", config.Interval)
	}
	if config.InitialDelay != time.Minute || config.BatchSize != gatewayProjectionRefreshDefaultBatchSize {
		t.Fatalf("unexpected delay/batch defaults: %#v", config)
	}
}

func TestGatewayProjectionRefreshConfigRequiresPublisherCredentials(t *testing.T) {
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "")
	t.Setenv("gatewayOrganizationProjectionToken", "")
	t.Setenv("gatewayOrganizationProjectionRefreshEnabled", "true")

	config := GetGatewayProjectionRefreshConfig()
	if config.Enabled || config.DisabledReason != GatewayProjectionRefreshErrorInvalidConfig {
		t.Fatalf("refresh config should be disabled without endpoint/token: %#v", config)
	}
}

func TestNormalizeGatewayProjectionRefreshIntervalStaysBelowFreshnessTTL(t *testing.T) {
	tests := []struct {
		name        string
		interval    time.Duration
		freshness   time.Duration
		wantMaximum time.Duration
	}{
		{name: "default below 30m ttl", interval: 0, freshness: 30 * time.Minute, wantMaximum: 30 * time.Minute},
		{name: "configured too large falls back", interval: 30 * time.Minute, freshness: 30 * time.Minute, wantMaximum: 30 * time.Minute},
		{name: "short ttl uses half", interval: 10 * time.Minute, freshness: 10 * time.Minute, wantMaximum: 10 * time.Minute},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeGatewayProjectionRefreshInterval(tt.interval, tt.freshness)
			if got <= 0 || got >= tt.wantMaximum {
				t.Fatalf("normalized interval = %s, want positive and below %s", got, tt.wantMaximum)
			}
		})
	}
}

func TestGatewayProjectionRefreshWorkerPublishesUniqueOrganizations(t *testing.T) {
	resetGatewayProjectionObservabilityForTest()
	now := time.Date(2026, 6, 9, 10, 0, 0, 0, time.UTC)
	worker := &GatewayProjectionRefreshWorker{
		Config: GatewayProjectionRefreshConfig{Enabled: true, Interval: 15 * time.Minute, BatchSize: 10},
		Store:  &memoryGatewayProjectionRefreshOrganizationStore{organizations: []string{"org-b", "org-a", "org-a", "", "built-in"}},
		Publisher: &fakeGatewayProjectionRefreshPublisher{
			result: GatewayProjectionServiceResult{Publish: GatewayProjectionPublishResult{Success: true, Accepted: true, Attempts: 1}},
		},
		Now: func() time.Time { return now },
	}
	publisher := worker.Publisher.(*fakeGatewayProjectionRefreshPublisher)

	result, err := worker.RunOnce(context.Background())
	if err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}
	if result.Organizations != 2 || result.Published != 2 || result.Failed != 0 {
		t.Fatalf("unexpected refresh result: %#v", result)
	}
	if !reflect.DeepEqual(publisher.organizations, []string{"org-a", "org-b"}) {
		t.Fatalf("published organizations = %#v, want sorted unique org-a/org-b", publisher.organizations)
	}
	if publisher.traces[0] == publisher.traces[1] || publisher.traces[0] == "" {
		t.Fatalf("each organization should get a stable diagnostic trace, got %#v", publisher.traces)
	}
	snapshot := GetGatewayProjectionObservabilitySnapshot(now)
	if snapshot.Refresh.LastRunAt == "" || snapshot.Refresh.LastSuccessAt == "" || snapshot.Refresh.NextRunAt == "" {
		t.Fatalf("refresh observability should record run/success/next times: %#v", snapshot.Refresh)
	}
	if snapshot.Refresh.LastPublished != 2 || snapshot.Refresh.LastFailed != 0 || !snapshot.Refresh.IntervalLessThanTTL {
		t.Fatalf("refresh observability counts mismatch: %#v", snapshot.Refresh)
	}
}

func TestGatewayProjectionRefreshBatchUsableRequiresSourceVersion(t *testing.T) {
	finishedAt := time.Date(2026, 6, 9, 9, 0, 0, 0, time.UTC)
	tests := []struct {
		name  string
		batch OrgSyncBatch
		want  bool
	}{
		{
			name:  "succeeded with version",
			batch: OrgSyncBatch{Status: OrgSyncBatchStatusSucceeded, OrgVersion: "orgv-a", FinishedAt: finishedAt},
			want:  true,
		},
		{
			name:  "partial with version",
			batch: OrgSyncBatch{Status: OrgSyncBatchStatusPartial, OrgVersion: "orgv-b", FinishedAt: finishedAt},
			want:  true,
		},
		{
			name:  "running skipped",
			batch: OrgSyncBatch{Status: OrgSyncBatchStatusRunning, OrgVersion: "orgv-c", FinishedAt: finishedAt},
			want:  false,
		},
		{
			name:  "missing source version skipped",
			batch: OrgSyncBatch{Status: OrgSyncBatchStatusSucceeded, FinishedAt: finishedAt},
			want:  false,
		},
		{
			name:  "missing finished time skipped",
			batch: OrgSyncBatch{Status: OrgSyncBatchStatusSucceeded, OrgVersion: "orgv-d"},
			want:  false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := gatewayProjectionRefreshBatchUsable(tt.batch); got != tt.want {
				t.Fatalf("gatewayProjectionRefreshBatchUsable() = %t, want %t", got, tt.want)
			}
		})
	}
}

func TestLatestGatewayProjectionUsableSyncBatchSkipsUnusableLatest(t *testing.T) {
	oldSuccess := time.Date(2026, 6, 9, 9, 0, 0, 0, time.UTC)
	newFailed := oldSuccess.Add(time.Hour)
	batch := latestGatewayProjectionUsableSyncBatch([]OrgSyncBatch{
		{Name: "failed-new", Status: OrgSyncBatchStatusFailed, OrgVersion: "orgv-failed", FinishedAt: newFailed},
		{Name: "running-newer", Status: OrgSyncBatchStatusRunning, OrgVersion: "orgv-running", FinishedAt: newFailed.Add(time.Minute)},
		{Name: "success-old", Status: OrgSyncBatchStatusSucceeded, OrgVersion: "orgv-success", FinishedAt: oldSuccess},
		{Name: "partial-empty-version", Status: OrgSyncBatchStatusPartial, FinishedAt: newFailed.Add(2 * time.Minute)},
	})
	if batch == nil || batch.Name != "success-old" || batch.OrgVersion != "orgv-success" {
		t.Fatalf("latest usable sync batch = %#v, want success-old", batch)
	}
}

func TestGatewayProjectionRefreshWorkerCountsFailuresWithoutStopping(t *testing.T) {
	worker := &GatewayProjectionRefreshWorker{
		Config: GatewayProjectionRefreshConfig{Enabled: true, Interval: 15 * time.Minute, BatchSize: 10},
		Store:  &memoryGatewayProjectionRefreshOrganizationStore{organizations: []string{"org-a", "org-b", "org-c"}},
		Publisher: &fakeGatewayProjectionRefreshPublisher{
			resultByOrganization: map[string]GatewayProjectionServiceResult{
				"org-a": {Publish: GatewayProjectionPublishResult{Success: true, Idempotent: true, Attempts: 1}},
				"org-b": {Publish: GatewayProjectionPublishResult{Success: false, ErrorCode: GatewayProjectionPublishErrorProviderUnavailable, Attempts: 2}},
				"org-c": {Publish: GatewayProjectionPublishResult{Success: true, Accepted: true, Attempts: 1}},
			},
			errByOrganization: map[string]error{
				"org-b": errors.New("transport failed"),
			},
		},
		Now: func() time.Time { return time.Date(2026, 6, 9, 10, 30, 0, 0, time.UTC) },
	}

	result, err := worker.RunOnce(context.Background())
	if err != nil {
		t.Fatalf("RunOnce() should not fail on per-organization publish errors: %v", err)
	}
	if result.Published != 2 || result.Failed != 1 || result.Organizations != 3 {
		t.Fatalf("unexpected publish/failure counts: %#v", result)
	}
}

func TestGatewayProjectionRefreshWorkerSkipsReentrantRun(t *testing.T) {
	worker := &GatewayProjectionRefreshWorker{
		Config: GatewayProjectionRefreshConfig{Enabled: true, Interval: 15 * time.Minute, BatchSize: 10},
		Store:  &memoryGatewayProjectionRefreshOrganizationStore{organizations: []string{"org-a"}},
		Now:    func() time.Time { return time.Date(2026, 6, 9, 11, 0, 0, 0, time.UTC) },
	}
	publisher := &fakeGatewayProjectionRefreshPublisher{
		result: GatewayProjectionServiceResult{Publish: GatewayProjectionPublishResult{Success: true, Accepted: true, Attempts: 1}},
	}
	publisher.onPublish = func() {
		nested, err := worker.RunOnce(context.Background())
		if err != nil {
			t.Fatalf("nested RunOnce() error = %v", err)
		}
		if nested.Skipped != 1 || nested.ErrorCode != "refresh_in_progress" {
			t.Fatalf("nested run should be skipped as in progress, got %#v", nested)
		}
	}
	worker.Publisher = publisher

	result, err := worker.RunOnce(context.Background())
	if err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}
	if result.Published != 1 || publisher.calls != 1 {
		t.Fatalf("outer run should publish once, result=%#v publisher=%#v", result, publisher)
	}
}

func TestGatewayProjectionRefreshWorkerReportsStoreFailure(t *testing.T) {
	worker := &GatewayProjectionRefreshWorker{
		Config: GatewayProjectionRefreshConfig{Enabled: true, Interval: 15 * time.Minute, BatchSize: 10},
		Store:  &memoryGatewayProjectionRefreshOrganizationStore{err: errors.New("store unavailable")},
	}
	result, err := worker.RunOnce(context.Background())
	if err == nil {
		t.Fatalf("expected store error")
	}
	if result.ErrorCode != GatewayProjectionRefreshErrorProviderUnavailable || result.Published != 0 {
		t.Fatalf("unexpected store failure result: %#v", result)
	}
}

type memoryGatewayProjectionRefreshOrganizationStore struct {
	organizations []string
	err           error
}

func (s *memoryGatewayProjectionRefreshOrganizationStore) ListGatewayProjectionRefreshOrganizations(limit int) ([]string, error) {
	if s.err != nil {
		return nil, s.err
	}
	return append([]string{}, s.organizations...), nil
}

type fakeGatewayProjectionRefreshPublisher struct {
	calls                int
	organizations        []string
	traces               []string
	result               GatewayProjectionServiceResult
	resultByOrganization map[string]GatewayProjectionServiceResult
	errByOrganization    map[string]error
	onPublish            func()
}

func (p *fakeGatewayProjectionRefreshPublisher) BuildAndPublishOrganization(ctx context.Context, organizationID string, traceID string) (GatewayProjectionServiceResult, error) {
	p.calls++
	p.organizations = append(p.organizations, organizationID)
	p.traces = append(p.traces, traceID)
	if p.onPublish != nil {
		p.onPublish()
	}
	if result, ok := p.resultByOrganization[organizationID]; ok {
		return result, p.errByOrganization[organizationID]
	}
	return p.result, p.errByOrganization[organizationID]
}
