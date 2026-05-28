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
	"testing"
	"time"
)

func (s *memoryWecomOrganizationSyncRunStore) GetWecomOrganizationSyncRun(organization string, runId string) (*WecomOrganizationSyncRun, error) {
	for _, run := range s.runs {
		if run.Organization == organization && run.Name == runId {
			copied := *run
			return &copied, nil
		}
	}
	return nil, nil
}

func (s *memoryWecomOrganizationSyncRunStore) GetWecomOrganizationSyncRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string) ([]*WecomOrganizationSyncRun, error) {
	runs := make([]*WecomOrganizationSyncRun, 0)
	for _, run := range s.runs {
		if run.Organization != organization {
			continue
		}
		copied := *run
		runs = append(runs, &copied)
	}
	return runs, nil
}

func (s *memoryWecomOrganizationSyncRunStore) GetWecomOrganizationSyncRunCount(organization string, field string, value string) (int64, error) {
	var count int64
	for _, run := range s.runs {
		if run.Organization == organization {
			count++
		}
	}
	return count, nil
}

func TestWecomOrganizationSyncServiceStartManualRunResultReportsStaleRecovery(t *testing.T) {
	now := time.Date(2026, 5, 20, 12, 0, 0, 0, time.UTC)
	store := &memoryWecomOrganizationSyncRunStore{
		runningRun: &WecomOrganizationSyncRun{
			Owner:          "engineering",
			Name:           "run-stale",
			Organization:   "engineering",
			Status:         WecomOrganizationSyncRunStatusRunning,
			LeaseExpiresAt: now.Add(-time.Minute),
		},
	}
	service := &WecomOrganizationSyncService{
		Store:         store,
		Now:           func() time.Time { return now },
		LeaseDuration: 10 * time.Minute,
	}

	result, err := service.StartManualRunWithResult(&WecomOrganizationSyncConfig{
		Owner:             "engineering",
		Name:              "config",
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "secret",
	}, "engineering/admin")
	if err != nil {
		t.Fatalf("StartManualRunWithResult() error = %v", err)
	}

	if result == nil || result.Run == nil {
		t.Fatalf("expected created run result, got %#v", result)
	}
	if result.StaleRun == nil || result.StaleRun.Name != "run-stale" {
		t.Fatalf("expected stale run recovery in result, got %#v", result)
	}
	if result.Run.Status != WecomOrganizationSyncRunStatusRunning {
		t.Fatalf("new run status = %s, want running", result.Run.Status)
	}
	if result.Config == nil || result.Config.CorpId != "ww123" || result.Config.AddressBookSecret != "secret" {
		t.Fatalf("expected run result to keep execution config snapshot, got %#v", result.Config)
	}
}

func TestWecomOrganizationSyncServiceStartManualRunRejectsMaskedSecret(t *testing.T) {
	now := time.Date(2026, 5, 20, 12, 0, 0, 0, time.UTC)
	store := &memoryWecomOrganizationSyncRunStore{}
	service := &WecomOrganizationSyncService{
		Store: store,
		Now:   func() time.Time { return now },
	}

	_, err := service.StartManualRunWithResult(&WecomOrganizationSyncConfig{
		Owner:             "engineering",
		Name:              "config",
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: WecomOrganizationSyncMaskedSecret,
	}, "engineering/admin")

	if err == nil || err.Error() != "wecom organization sync address_book_secret is required" {
		t.Fatalf("StartManualRunWithResult() error = %v, want address_book_secret required", err)
	}
	if store.createdRun != nil {
		t.Fatalf("masked secret must not create run: %#v", store.createdRun)
	}
}

func TestWecomOrganizationSyncServiceGetRunsFiltersOrganizationAndMasksErrorText(t *testing.T) {
	store := &memoryWecomOrganizationSyncRunStore{
		runs: []*WecomOrganizationSyncRun{
			{
				Owner:        "built-in",
				Name:         "run-1",
				Organization: "built-in",
				Status:       WecomOrganizationSyncRunStatusFailed,
				ErrorText:    "request failed with secret real-secret",
			},
			{
				Owner:        "engineering",
				Name:         "run-2",
				Organization: "engineering",
				Status:       WecomOrganizationSyncRunStatusSucceeded,
			},
		},
	}
	service := &WecomOrganizationSyncService{Store: store}

	runs, count, err := service.GetRuns("built-in", 0, 20, "", "", "", "", "real-secret")
	if err != nil {
		t.Fatalf("GetRuns() error = %v", err)
	}

	if count != 1 || len(runs) != 1 {
		t.Fatalf("runs/count = %d/%d, want 1/1", len(runs), count)
	}
	if runs[0].Name != "run-1" {
		t.Fatalf("run name = %s, want run-1", runs[0].Name)
	}
	if runs[0].ErrorText != "request failed with secret ***" {
		t.Fatalf("masked error text = %q", runs[0].ErrorText)
	}
	if store.runs[0].ErrorText != "request failed with secret real-secret" {
		t.Fatalf("masking should not mutate stored run, got %q", store.runs[0].ErrorText)
	}
}

func TestWecomOrganizationSyncServiceGetRunRequiresMatchingOrganization(t *testing.T) {
	store := &memoryWecomOrganizationSyncRunStore{
		runs: []*WecomOrganizationSyncRun{
			{
				Owner:        "engineering",
				Name:         "run-2",
				Organization: "engineering",
				Status:       WecomOrganizationSyncRunStatusSucceeded,
			},
		},
	}
	service := &WecomOrganizationSyncService{Store: store}

	run, err := service.GetRun("built-in", "run-2", "")
	if err != nil {
		t.Fatalf("GetRun() error = %v", err)
	}
	if run != nil {
		t.Fatalf("cross-organization run should not be returned: %#v", run)
	}
}
