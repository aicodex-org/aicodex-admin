// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeFeishuNoRunStartStore struct {
	fakeFeishuRunStore
}

func (s *fakeFeishuNoRunStartStore) StartFeishuOrganizationSyncRunWithTrigger(config *FeishuOrganizationSyncConfig, actor string, triggerType FeishuOrganizationSyncTriggerType, now time.Time, leaseDuration time.Duration) (*FeishuOrganizationSyncStartRunResult, error) {
	return &FeishuOrganizationSyncStartRunResult{Config: config}, nil
}

func TestFeishuOrganizationScheduledSyncExecutorHandlesSetupAndSuccessBranches(t *testing.T) {
	executor := &FeishuOrganizationScheduledSyncExecutor{}
	if _, err := executor.ExecuteOrganizationSync(context.Background(), OrganizationSyncDispatchRequest{}); err == nil {
		t.Fatalf("ExecuteOrganizationSync(nil schedule) error = nil, want error")
	}

	configErr := errors.New("config store unavailable")
	executor = &FeishuOrganizationScheduledSyncExecutor{ConfigStore: &fakeFeishuConfigStore{err: configErr}}
	if _, err := executor.ExecuteOrganizationSync(context.Background(), OrganizationSyncDispatchRequest{Schedule: &OrganizationSyncSchedule{Organization: "engineering"}}); !errors.Is(err, configErr) {
		t.Fatalf("ExecuteOrganizationSync(config error) = %v, want %v", err, configErr)
	}

	executor = &FeishuOrganizationScheduledSyncExecutor{
		ConfigStore: &fakeFeishuConfigStore{config: &FeishuOrganizationSyncConfig{
			Owner:        "engineering",
			Name:         FeishuOrganizationSyncDefaultConfigName,
			Organization: "engineering",
			AppId:        "cli_1",
			AppSecret:    "secret",
			EndpointMode: FeishuEndpointModeDomestic,
			IsEnabled:    true,
		}},
		SyncService: &FeishuOrganizationSyncService{
			Store: &fakeFeishuNoRunStartStore{},
			Now:   func() time.Time { return time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC) },
		},
	}

	result, err := executor.ExecuteOrganizationSync(context.Background(), OrganizationSyncDispatchRequest{
		Schedule: &OrganizationSyncSchedule{Organization: "engineering"},
		Actor:    "scheduler:node-a",
	})
	if err != nil {
		t.Fatalf("ExecuteOrganizationSync(success dispatch) error = %v", err)
	}
	if result == nil || result.Status != OrganizationSyncScheduleFireStatusDispatched || result.RunId != "" {
		t.Fatalf("result = %+v, want dispatched without starting background run", result)
	}
}

func TestFeishuOrganizationScheduledSyncExecutorReturnsDispatchDiagnostics(t *testing.T) {
	tests := []struct {
		name       string
		config     *FeishuOrganizationSyncConfig
		runStore   *fakeFeishuRunStore
		wantStatus OrganizationSyncScheduleFireStatus
		wantCode   string
		wantRetry  string
		wantAction string
		wantRunId  string
	}{
		{
			name:       "missing config",
			wantStatus: OrganizationSyncScheduleFireStatusFailed,
			wantCode:   "config_missing",
			wantRetry:  FeishuOrganizationSyncRetryNotReady,
			wantAction: FeishuOrganizationSyncOperatorFixCredentials,
		},
		{
			name: "disabled config",
			config: &FeishuOrganizationSyncConfig{
				Organization: "engineering",
				AppId:        "cli_1",
				AppSecret:    "secret",
				EndpointMode: FeishuEndpointModeDomestic,
				IsEnabled:    false,
			},
			wantStatus: OrganizationSyncScheduleFireStatusSkipped,
			wantCode:   "config_disabled",
			wantRetry:  FeishuOrganizationSyncRetryNotReady,
			wantAction: FeishuOrganizationSyncOperatorManualReview,
		},
		{
			name: "already running",
			config: &FeishuOrganizationSyncConfig{
				Organization: "engineering",
				AppId:        "cli_1",
				AppSecret:    "secret",
				EndpointMode: FeishuEndpointModeDomestic,
				IsEnabled:    true,
			},
			runStore: &fakeFeishuRunStore{running: &FeishuOrganizationSyncRun{
				Name:           "run-active",
				LeaseExpiresAt: time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC).Add(time.Minute),
			}},
			wantStatus: OrganizationSyncScheduleFireStatusSkipped,
			wantCode:   OrganizationSyncScheduleFireErrorAlreadyRunning,
			wantRetry:  FeishuOrganizationSyncRetryNotReady,
			wantAction: FeishuOrganizationSyncOperatorManualReview,
			wantRunId:  "run-active",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			runStore := tt.runStore
			if runStore == nil {
				runStore = &fakeFeishuRunStore{}
			}
			executor := &FeishuOrganizationScheduledSyncExecutor{
				ConfigStore: &fakeFeishuConfigStore{config: tt.config},
				SyncService: &FeishuOrganizationSyncService{
					Store: runStore,
					Now:   func() time.Time { return time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC) },
				},
			}

			result, err := executor.ExecuteOrganizationSync(context.Background(), OrganizationSyncDispatchRequest{
				Schedule: &OrganizationSyncSchedule{Organization: "engineering"},
				Actor:    "scheduler:node-a",
			})
			if err != nil {
				t.Fatalf("ExecuteOrganizationSync() error = %v", err)
			}
			if result == nil || result.Status != tt.wantStatus || result.ErrorCode != tt.wantCode || result.RunId != tt.wantRunId {
				t.Fatalf("result = %+v, want status/code/run %s/%s/%s", result, tt.wantStatus, tt.wantCode, tt.wantRunId)
			}
			if result.Diagnostics == nil {
				t.Fatalf("diagnostics is nil")
			}
			if result.Diagnostics.FailedStage != FeishuOrganizationSyncDiagnosticStageScheduler {
				t.Fatalf("failed stage = %q, want scheduler", result.Diagnostics.FailedStage)
			}
			if result.Diagnostics.RetryReadiness != tt.wantRetry || result.Diagnostics.OperatorAction != tt.wantAction {
				t.Fatalf("retry/action = %q/%q, want %q/%q", result.Diagnostics.RetryReadiness, result.Diagnostics.OperatorAction, tt.wantRetry, tt.wantAction)
			}
		})
	}
}
