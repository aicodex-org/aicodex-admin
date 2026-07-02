// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"testing"
	"time"
)

func TestDingTalkOrganizationScheduledSyncExecutorDispatchStates(t *testing.T) {
	now := time.Date(2026, 7, 1, 1, 30, 0, 0, time.UTC)

	if _, err := (&DingTalkOrganizationScheduledSyncExecutor{}).ExecuteOrganizationSync(context.Background(), OrganizationSyncDispatchRequest{}); err == nil {
		t.Fatalf("ExecuteOrganizationSync(nil schedule) error = nil, want validation error")
	}
	var defaultExecutor *DingTalkOrganizationScheduledSyncExecutor
	if defaultExecutor.configStore() == nil || defaultExecutor.wecomConfigStore() == nil || defaultExecutor.feishuConfigStore() == nil || defaultExecutor.syncService() == nil {
		t.Fatalf("nil DingTalk scheduled executor should provide default collaborators")
	}

	missing, err := (&DingTalkOrganizationScheduledSyncExecutor{
		ConfigStore: &memoryDingTalkOrganizationSyncConfigStore{},
	}).ExecuteOrganizationSync(context.Background(), OrganizationSyncDispatchRequest{
		Schedule: &OrganizationSyncSchedule{Provider: OrganizationSyncProviderDingTalk, JobType: OrganizationSyncJobTypeFullDifferential, Organization: "engineering"},
		Actor:    "scheduler:node-a",
	})
	if err != nil {
		t.Fatalf("ExecuteOrganizationSync(missing) error = %v", err)
	}
	if missing.Status != OrganizationSyncScheduleFireStatusFailed || missing.ErrorCode != "config_missing" {
		t.Fatalf("missing result = %#v, want failed config_missing", missing)
	}

	disabled, err := (&DingTalkOrganizationScheduledSyncExecutor{
		ConfigStore: &memoryDingTalkOrganizationSyncConfigStore{config: &DingTalkOrganizationSyncConfig{
			Owner: "engineering", Name: DingTalkOrganizationSyncDefaultConfigName, Organization: "engineering", AppKey: "ding-app", AppSecret: "secret", IsEnabled: false,
		}},
	}).ExecuteOrganizationSync(context.Background(), OrganizationSyncDispatchRequest{
		Schedule: &OrganizationSyncSchedule{Provider: OrganizationSyncProviderDingTalk, JobType: OrganizationSyncJobTypeFullDifferential, Organization: "engineering"},
		Actor:    "scheduler:node-a",
	})
	if err != nil {
		t.Fatalf("ExecuteOrganizationSync(disabled) error = %v", err)
	}
	if disabled.Status != OrganizationSyncScheduleFireStatusSkipped || disabled.ErrorCode != "config_disabled" {
		t.Fatalf("disabled result = %#v, want skipped config_disabled", disabled)
	}

	runStore := &memoryDingTalkOrganizationSyncRunStore{
		runningRun: &DingTalkOrganizationSyncRun{
			Owner: "engineering", Name: "run-active", Organization: "engineering", Status: DingTalkOrganizationSyncRunStatusRunning, LeaseExpiresAt: now.Add(time.Minute),
		},
	}
	alreadyRunning, err := (&DingTalkOrganizationScheduledSyncExecutor{
		ConfigStore: &memoryDingTalkOrganizationSyncConfigStore{config: &DingTalkOrganizationSyncConfig{
			Owner: "engineering", Name: DingTalkOrganizationSyncDefaultConfigName, Organization: "engineering", AppKey: "ding-app", AppSecret: "secret", IsEnabled: true,
		}},
		WecomConfigStore:  &memoryWecomOrganizationSyncConfigStore{},
		FeishuConfigStore: &fakeFeishuConfigStore{},
		SyncService: &DingTalkOrganizationSyncService{
			Store: runStore,
			Now:   func() time.Time { return now },
		},
	}).ExecuteOrganizationSync(context.Background(), OrganizationSyncDispatchRequest{
		Schedule: &OrganizationSyncSchedule{Provider: OrganizationSyncProviderDingTalk, JobType: OrganizationSyncJobTypeFullDifferential, Organization: "engineering"},
		Actor:    "scheduler:node-a",
	})
	if err != nil {
		t.Fatalf("ExecuteOrganizationSync(alreadyRunning) error = %v", err)
	}
	if alreadyRunning.Status != OrganizationSyncScheduleFireStatusSkipped || alreadyRunning.ErrorCode != OrganizationSyncScheduleFireErrorAlreadyRunning || alreadyRunning.RunId != "run-active" {
		t.Fatalf("already running result = %#v, want skipped already_running with run id", alreadyRunning)
	}
}

func TestDingTalkOrganizationScheduledSyncExecutorSkipsSourceConflictAndDispatchesRun(t *testing.T) {
	now := time.Date(2026, 7, 1, 2, 0, 0, 0, time.UTC)
	configStore := &memoryDingTalkOrganizationSyncConfigStore{config: &DingTalkOrganizationSyncConfig{
		Owner: "engineering", Name: DingTalkOrganizationSyncDefaultConfigName, Organization: "engineering", AppKey: "ding-app", AppSecret: "secret", IsEnabled: true,
	}}

	conflictRunStore := &memoryDingTalkOrganizationSyncRunStore{}
	conflict, err := (&DingTalkOrganizationScheduledSyncExecutor{
		ConfigStore:       configStore,
		WecomConfigStore:  &memoryWecomOrganizationSyncConfigStore{config: &WecomOrganizationSyncConfig{Owner: "engineering", Name: WecomOrganizationSyncDefaultConfigName, Organization: "engineering", CorpId: "ww-engineering", AddressBookSecret: "wecom-secret"}},
		FeishuConfigStore: &fakeFeishuConfigStore{},
		SyncService: &DingTalkOrganizationSyncService{
			Store: conflictRunStore,
			Now:   func() time.Time { return now },
		},
	}).ExecuteOrganizationSync(context.Background(), OrganizationSyncDispatchRequest{
		Schedule: &OrganizationSyncSchedule{Provider: OrganizationSyncProviderDingTalk, JobType: OrganizationSyncJobTypeFullDifferential, Organization: "engineering"},
		Actor:    "scheduler:node-a",
	})
	if err != nil {
		t.Fatalf("ExecuteOrganizationSync(conflict) error = %v", err)
	}
	if conflict.Status != OrganizationSyncScheduleFireStatusSkipped || conflict.ErrorCode != string(OrganizationDirectorySourceReasonAmbiguous) {
		t.Fatalf("conflict result = %#v, want skipped source_ambiguous", conflict)
	}
	if conflictRunStore.createdRun != nil {
		t.Fatalf("conflicting scheduled sync should not create run: %#v", conflictRunStore.createdRun)
	}

	successRunStore := &memoryDingTalkOrganizationSyncRunStore{}
	dispatched, err := (&DingTalkOrganizationScheduledSyncExecutor{
		ConfigStore:       configStore,
		WecomConfigStore:  &memoryWecomOrganizationSyncConfigStore{},
		FeishuConfigStore: &fakeFeishuConfigStore{},
		SyncService: &DingTalkOrganizationSyncService{
			Store:         successRunStore,
			Now:           func() time.Time { return now },
			LeaseDuration: 10 * time.Minute,
		},
	}).ExecuteOrganizationSync(context.Background(), OrganizationSyncDispatchRequest{
		Schedule: &OrganizationSyncSchedule{Provider: OrganizationSyncProviderDingTalk, JobType: OrganizationSyncJobTypeFullDifferential, Organization: "engineering"},
		Actor:    "scheduler:node-a",
	})
	if err != nil {
		t.Fatalf("ExecuteOrganizationSync(success) error = %v", err)
	}
	if dispatched.Status != OrganizationSyncScheduleFireStatusDispatched || dispatched.RunId == "" {
		t.Fatalf("dispatched result = %#v, want dispatched with run id", dispatched)
	}
	if successRunStore.createdRun == nil || successRunStore.createdRun.TriggerType != DingTalkOrganizationSyncTriggerScheduled {
		t.Fatalf("scheduled run = %#v, want scheduled trigger", successRunStore.createdRun)
	}
}
