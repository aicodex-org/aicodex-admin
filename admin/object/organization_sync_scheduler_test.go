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
	"strings"
	"testing"
	"time"

	"github.com/xorm-io/xorm"
)

type memoryOrganizationSyncScheduleStore struct {
	schedules map[string]*OrganizationSyncSchedule
	fires     map[string]*OrganizationSyncScheduleFire
}

type recordingOrganizationSyncExecutor struct {
	result *OrganizationSyncDispatchResult
	err    error
	calls  []OrganizationSyncDispatchRequest
}

type failingUpdateOrganizationSyncScheduleStore struct {
	*memoryOrganizationSyncScheduleStore
	err error
}

func (s *failingUpdateOrganizationSyncScheduleStore) UpdateOrganizationSyncScheduleFire(fire *OrganizationSyncScheduleFire) error {
	return s.err
}

func newMemoryOrganizationSyncScheduleStore() *memoryOrganizationSyncScheduleStore {
	return &memoryOrganizationSyncScheduleStore{
		schedules: map[string]*OrganizationSyncSchedule{},
		fires:     map[string]*OrganizationSyncScheduleFire{},
	}
}

func (s *memoryOrganizationSyncScheduleStore) GetOrganizationSyncSchedule(provider string, jobType string, organization string) (*OrganizationSyncSchedule, error) {
	schedule := s.schedules[organizationSyncScheduleIdentityKey(provider, jobType, organization)]
	if schedule == nil {
		return nil, nil
	}
	copied := *schedule
	return &copied, nil
}

func (s *memoryOrganizationSyncScheduleStore) SaveOrganizationSyncSchedule(schedule *OrganizationSyncSchedule) (bool, error) {
	prepared, err := prepareOrganizationSyncSchedule(schedule)
	if err != nil {
		return false, err
	}
	copied := *prepared
	if existing := s.schedules[organizationSyncScheduleIdentityKey(schedule.Provider, schedule.JobType, schedule.Organization)]; existing != nil {
		copied.LastFireAt = existing.LastFireAt
		copied.LastRunId = existing.LastRunId
		copied.LastStatus = existing.LastStatus
		copied.LastErrorCode = existing.LastErrorCode
		copied.LastErrorText = existing.LastErrorText
	}
	s.schedules[organizationSyncScheduleIdentityKey(schedule.Provider, schedule.JobType, schedule.Organization)] = &copied
	return true, nil
}

func (s *memoryOrganizationSyncScheduleStore) GetEnabledOrganizationSyncSchedules() ([]*OrganizationSyncSchedule, error) {
	schedules := make([]*OrganizationSyncSchedule, 0)
	for _, schedule := range s.schedules {
		if !schedule.IsEnabled {
			continue
		}
		copied := *schedule
		schedules = append(schedules, &copied)
	}
	return schedules, nil
}

func (s *memoryOrganizationSyncScheduleStore) AcquireOrganizationSyncScheduleFire(schedule *OrganizationSyncSchedule, windowStart time.Time, nodeID string, now time.Time, leaseDuration time.Duration) (*OrganizationSyncScheduleFire, bool, error) {
	key := organizationSyncScheduleFireWindowKey(schedule.Name, windowStart)
	if existing := s.fires[key]; existing != nil {
		if isTerminalOrganizationSyncScheduleFireStatus(existing.Status) || existing.LockExpiresAt.After(now) {
			copied := *existing
			return &copied, false, nil
		}
		existing.Status = OrganizationSyncScheduleFireStatusAcquired
		existing.LockedBy = nodeID
		existing.LockedAt = now
		existing.LockExpiresAt = now.Add(leaseDuration)
		existing.AttemptCount++
		existing.ErrorCode = ""
		existing.ErrorText = ""
		existing.RunId = ""
		copied := *existing
		return &copied, true, nil
	}

	fire := &OrganizationSyncScheduleFire{
		Owner:         schedule.Organization,
		Name:          GetOrganizationSyncScheduleFireName(schedule.Name, windowStart),
		ScheduleName:  schedule.Name,
		Provider:      schedule.Provider,
		JobType:       schedule.JobType,
		Organization:  schedule.Organization,
		WindowStart:   windowStart,
		Status:        OrganizationSyncScheduleFireStatusAcquired,
		LockedBy:      nodeID,
		LockedAt:      now,
		LockExpiresAt: now.Add(leaseDuration),
		AttemptCount:  1,
	}
	s.fires[key] = fire
	copied := *fire
	return &copied, true, nil
}

func (s *memoryOrganizationSyncScheduleStore) UpdateOrganizationSyncScheduleFire(fire *OrganizationSyncScheduleFire) error {
	if fire == nil {
		return nil
	}
	copied := *fire
	s.fires[organizationSyncScheduleFireWindowKey(fire.ScheduleName, fire.WindowStart)] = &copied
	return nil
}

func (s *memoryOrganizationSyncScheduleStore) UpdateOrganizationSyncScheduleDispatchMetadata(schedule *OrganizationSyncSchedule, fire *OrganizationSyncScheduleFire) error {
	if schedule == nil || fire == nil {
		return nil
	}
	existing := s.schedules[organizationSyncScheduleIdentityKey(schedule.Provider, schedule.JobType, schedule.Organization)]
	if existing == nil {
		return nil
	}
	existing.LastFireAt = fire.WindowStart
	existing.LastRunId = fire.RunId
	existing.LastStatus = string(fire.Status)
	existing.LastErrorCode = fire.ErrorCode
	existing.LastErrorText = fire.ErrorText
	return nil
}

func (e *recordingOrganizationSyncExecutor) ExecuteOrganizationSync(ctx context.Context, request OrganizationSyncDispatchRequest) (*OrganizationSyncDispatchResult, error) {
	e.calls = append(e.calls, request)
	return e.result, e.err
}

func TestOrganizationSyncSchedulerDefaultScheduleIsDisabled(t *testing.T) {
	store := newMemoryOrganizationSyncScheduleStore()
	service := &OrganizationSyncScheduleService{Store: store}

	schedule, err := service.GetSchedule(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, "engineering")
	if err != nil {
		t.Fatalf("GetSchedule() error = %v", err)
	}
	if schedule == nil {
		t.Fatalf("expected default schedule")
	}
	if schedule.IsEnabled {
		t.Fatalf("default schedule should be disabled: %#v", schedule)
	}
	if schedule.CronExpression != OrganizationSyncDefaultCronExpression || schedule.Timezone != OrganizationSyncDefaultTimezone {
		t.Fatalf("default schedule cron/timezone = %q/%q", schedule.CronExpression, schedule.Timezone)
	}

	executor := &recordingOrganizationSyncExecutor{}
	scheduler := &OrganizationSyncScheduler{
		Store:    store,
		Registry: NewOrganizationSyncExecutorRegistry(),
		Now:      func() time.Time { return time.Date(2026, 6, 9, 1, 0, 0, 0, time.UTC) },
		NodeID:   "node-a",
	}
	scheduler.Registry.Register(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, executor)
	if err := scheduler.RunOnce(context.Background()); err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}
	if len(executor.calls) != 0 {
		t.Fatalf("disabled default schedule should not dispatch, calls = %#v", executor.calls)
	}
}

func TestOrganizationSyncScheduleServiceSaveRejectsInvalidCronAndTimezone(t *testing.T) {
	service := &OrganizationSyncScheduleService{Store: newMemoryOrganizationSyncScheduleStore()}

	_, err := service.SaveSchedule(&OrganizationSyncSchedule{
		Provider:       OrganizationSyncProviderWeCom,
		JobType:        OrganizationSyncJobTypeFullDifferential,
		Organization:   "engineering",
		IsEnabled:      true,
		CronExpression: "bad cron",
		Timezone:       OrganizationSyncDefaultTimezone,
	})
	if err == nil || !strings.Contains(err.Error(), "cron") {
		t.Fatalf("invalid cron error = %v", err)
	}

	_, err = service.SaveSchedule(&OrganizationSyncSchedule{
		Provider:       OrganizationSyncProviderWeCom,
		JobType:        OrganizationSyncJobTypeFullDifferential,
		Organization:   "engineering",
		IsEnabled:      true,
		CronExpression: OrganizationSyncDefaultCronExpression,
		Timezone:       "Mars/Base",
	})
	if err == nil || !strings.Contains(err.Error(), "timezone") {
		t.Fatalf("invalid timezone error = %v", err)
	}
}

func TestOrganizationSyncSchedulerDeduplicatesSameWindow(t *testing.T) {
	now := time.Date(2026, 6, 9, 1, 2, 30, 0, time.UTC)
	store := newMemoryOrganizationSyncScheduleStore()
	schedule := newEnabledOrganizationSyncSchedule("engineering", "* * * * *")
	_, _ = store.SaveOrganizationSyncSchedule(schedule)
	executor := &recordingOrganizationSyncExecutor{
		result: &OrganizationSyncDispatchResult{Status: OrganizationSyncScheduleFireStatusDispatched, RunId: "run-1"},
	}
	registry := NewOrganizationSyncExecutorRegistry()
	registry.Register(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, executor)

	for _, nodeID := range []string{"node-a", "node-b"} {
		scheduler := &OrganizationSyncScheduler{
			Store:         store,
			Registry:      registry,
			NodeID:        nodeID,
			Now:           func() time.Time { return now },
			LeaseDuration: time.Minute,
		}
		if err := scheduler.RunOnce(context.Background()); err != nil {
			t.Fatalf("RunOnce(%s) error = %v", nodeID, err)
		}
	}

	if len(executor.calls) != 1 {
		t.Fatalf("same window should dispatch once, calls = %d", len(executor.calls))
	}
	fire := firstMemoryOrganizationSyncScheduleFire(store)
	if fire == nil || fire.Status != OrganizationSyncScheduleFireStatusDispatched || fire.RunId != "run-1" || fire.AttemptCount != 1 {
		t.Fatalf("unexpected fire after dedupe: %#v", fire)
	}
}

func TestOrganizationSyncSchedulerRecoversStaleFire(t *testing.T) {
	now := time.Date(2026, 6, 9, 1, 2, 30, 0, time.UTC)
	windowStart := time.Date(2026, 6, 9, 1, 2, 0, 0, time.UTC)
	store := newMemoryOrganizationSyncScheduleStore()
	schedule := newEnabledOrganizationSyncSchedule("engineering", "* * * * *")
	_, _ = store.SaveOrganizationSyncSchedule(schedule)
	store.fires[organizationSyncScheduleFireWindowKey(schedule.Name, windowStart)] = &OrganizationSyncScheduleFire{
		Owner:         "engineering",
		Name:          GetOrganizationSyncScheduleFireName(schedule.Name, windowStart),
		ScheduleName:  schedule.Name,
		Provider:      schedule.Provider,
		JobType:       schedule.JobType,
		Organization:  schedule.Organization,
		WindowStart:   windowStart,
		Status:        OrganizationSyncScheduleFireStatusDispatching,
		LockedBy:      "node-a",
		LockedAt:      now.Add(-10 * time.Minute),
		LockExpiresAt: now.Add(-time.Minute),
		AttemptCount:  1,
	}
	executor := &recordingOrganizationSyncExecutor{
		result: &OrganizationSyncDispatchResult{Status: OrganizationSyncScheduleFireStatusDispatched, RunId: "run-2"},
	}
	registry := NewOrganizationSyncExecutorRegistry()
	registry.Register(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, executor)

	scheduler := &OrganizationSyncScheduler{
		Store:         store,
		Registry:      registry,
		NodeID:        "node-b",
		Now:           func() time.Time { return now },
		LeaseDuration: time.Minute,
	}
	if err := scheduler.RunOnce(context.Background()); err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}

	fire := firstMemoryOrganizationSyncScheduleFire(store)
	if len(executor.calls) != 1 || fire == nil || fire.LockedBy != "node-b" || fire.AttemptCount != 2 || fire.RunId != "run-2" {
		t.Fatalf("stale fire should be recovered and dispatched once, fire=%#v calls=%d", fire, len(executor.calls))
	}
}

func TestOrganizationSyncSchedulerHandlesMissingExecutorSafely(t *testing.T) {
	now := time.Date(2026, 6, 9, 1, 2, 30, 0, time.UTC)
	store := newMemoryOrganizationSyncScheduleStore()
	_, _ = store.SaveOrganizationSyncSchedule(newEnabledOrganizationSyncSchedule("engineering", "* * * * *"))
	scheduler := &OrganizationSyncScheduler{
		Store:    store,
		Registry: NewOrganizationSyncExecutorRegistry(),
		NodeID:   "node-a",
		Now:      func() time.Time { return now },
	}

	if err := scheduler.RunOnce(context.Background()); err != nil {
		t.Fatalf("RunOnce() should not fail process for missing executor, error = %v", err)
	}

	fire := firstMemoryOrganizationSyncScheduleFire(store)
	if fire == nil || fire.Status != OrganizationSyncScheduleFireStatusFailed || fire.ErrorCode != OrganizationSyncScheduleFireErrorMissingExecutor {
		t.Fatalf("missing executor should mark fire failed: %#v", fire)
	}
}

func TestOrganizationSyncSchedulerRecordsInvalidScheduleAndContinues(t *testing.T) {
	now := time.Date(2026, 6, 9, 1, 2, 30, 0, time.UTC)
	store := newMemoryOrganizationSyncScheduleStore()
	invalidSchedule := &OrganizationSyncSchedule{
		Provider:       OrganizationSyncProviderWeCom,
		JobType:        OrganizationSyncJobTypeFullDifferential,
		Organization:   "invalid-org",
		CronExpression: "bad cron",
		Timezone:       "UTC",
		IsEnabled:      true,
	}
	invalidSchedule.ApplyDefaults()
	store.schedules[organizationSyncScheduleIdentityKey(invalidSchedule.Provider, invalidSchedule.JobType, invalidSchedule.Organization)] = invalidSchedule
	_, _ = store.SaveOrganizationSyncSchedule(newEnabledOrganizationSyncSchedule("valid-org", "* * * * *"))
	executor := &recordingOrganizationSyncExecutor{
		result: &OrganizationSyncDispatchResult{Status: OrganizationSyncScheduleFireStatusDispatched, RunId: "run-valid"},
	}
	registry := NewOrganizationSyncExecutorRegistry()
	registry.Register(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, executor)
	scheduler := &OrganizationSyncScheduler{
		Store:    store,
		Registry: registry,
		NodeID:   "node-a",
		Now:      func() time.Time { return now },
	}

	if err := scheduler.RunOnce(context.Background()); err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}

	if len(executor.calls) != 1 || executor.calls[0].Schedule.Organization != "valid-org" {
		t.Fatalf("invalid schedule should not stop valid dispatch, calls = %#v", executor.calls)
	}
	invalidSchedule = store.schedules[organizationSyncScheduleIdentityKey(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, "invalid-org")]
	if invalidSchedule.LastStatus != string(OrganizationSyncScheduleFireStatusFailed) || invalidSchedule.LastErrorCode != "invalid_schedule" {
		t.Fatalf("invalid schedule should record safe failure metadata: %#v", invalidSchedule)
	}
}

func TestOrganizationSyncSchedulerRecordsSkippedDispatchOutcome(t *testing.T) {
	now := time.Date(2026, 6, 9, 1, 2, 30, 0, time.UTC)
	store := newMemoryOrganizationSyncScheduleStore()
	_, _ = store.SaveOrganizationSyncSchedule(newEnabledOrganizationSyncSchedule("engineering", "* * * * *"))
	executor := &recordingOrganizationSyncExecutor{
		result: &OrganizationSyncDispatchResult{
			Status:    OrganizationSyncScheduleFireStatusSkipped,
			RunId:     "run-active",
			ErrorCode: OrganizationSyncScheduleFireErrorAlreadyRunning,
			ErrorText: "sync already running",
		},
	}
	registry := NewOrganizationSyncExecutorRegistry()
	registry.Register(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, executor)
	scheduler := &OrganizationSyncScheduler{
		Store:    store,
		Registry: registry,
		NodeID:   "node-a",
		Now:      func() time.Time { return now },
	}

	if err := scheduler.RunOnce(context.Background()); err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}

	fire := firstMemoryOrganizationSyncScheduleFire(store)
	if fire == nil || fire.Status != OrganizationSyncScheduleFireStatusSkipped || fire.RunId != "run-active" || fire.ErrorCode != OrganizationSyncScheduleFireErrorAlreadyRunning {
		t.Fatalf("skipped outcome should be recorded: %#v", fire)
	}
}

func TestOrganizationSyncSchedulerAttachesFeishuDispatchDiagnostics(t *testing.T) {
	now := time.Date(2026, 6, 9, 1, 2, 30, 0, time.UTC)
	store := newMemoryOrganizationSyncScheduleStore()
	schedule := newEnabledOrganizationSyncSchedule("engineering", "* * * * *")
	schedule.Provider = OrganizationSyncProviderLark
	schedule.ApplyDefaults()
	_, _ = store.SaveOrganizationSyncSchedule(schedule)
	executor := &recordingOrganizationSyncExecutor{
		result: &OrganizationSyncDispatchResult{
			Status:    OrganizationSyncScheduleFireStatusFailed,
			ErrorCode: "config_missing",
			ErrorText: "secret=real-secret",
		},
	}
	registry := NewOrganizationSyncExecutorRegistry()
	registry.Register(OrganizationSyncProviderLark, OrganizationSyncJobTypeFullDifferential, executor)
	scheduler := &OrganizationSyncScheduler{
		Store:           store,
		Registry:        registry,
		NodeID:          "node-a",
		Now:             func() time.Time { return now },
		SensitiveValues: []string{"real-secret"},
	}

	if err := scheduler.RunOnce(context.Background()); err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}

	fire := firstMemoryOrganizationSyncScheduleFire(store)
	if fire == nil || fire.Diagnostics == nil {
		t.Fatalf("fire diagnostics = %+v, want attached Feishu diagnostics", fire)
	}
	if fire.Diagnostics.FailedStage != FeishuOrganizationSyncDiagnosticStageScheduler || fire.Diagnostics.OperatorAction != FeishuOrganizationSyncOperatorFixCredentials {
		t.Fatalf("fire diagnostics = %+v, want scheduler/fix_credentials", fire.Diagnostics)
	}
	if strings.Contains(fire.Diagnostics.SafeSummary, "real-secret") {
		t.Fatalf("fire diagnostics leaked secret: %q", fire.Diagnostics.SafeSummary)
	}
}

func TestApplyOrganizationSyncDispatchResultPreservesDiagnostics(t *testing.T) {
	fire := &OrganizationSyncScheduleFire{}
	diagnostics := &FeishuOrganizationSyncRunDiagnostics{FailedStage: FeishuOrganizationSyncDiagnosticStageScheduler}

	applyOrganizationSyncDispatchResult(nil, &OrganizationSyncDispatchResult{})
	applyOrganizationSyncDispatchResult(fire, nil)
	if fire.Status != OrganizationSyncScheduleFireStatusDispatched {
		t.Fatalf("nil result should default to dispatched, got %s", fire.Status)
	}

	applyOrganizationSyncDispatchResult(fire, &OrganizationSyncDispatchResult{
		Status:      OrganizationSyncScheduleFireStatusDispatched,
		RunId:       "run-1",
		Diagnostics: diagnostics,
	})

	if fire.Status != OrganizationSyncScheduleFireStatusDispatched || fire.RunId != "run-1" || fire.Diagnostics != diagnostics {
		t.Fatalf("fire = %+v, want dispatch result fields and diagnostics", fire)
	}

	applyOrganizationSyncDispatchResult(fire, &OrganizationSyncDispatchResult{Status: OrganizationSyncScheduleFireStatusDispatching})
	if fire.Status != OrganizationSyncScheduleFireStatusFailed {
		t.Fatalf("non-terminal dispatch result should become failed, got %s", fire.Status)
	}
}

func TestOrganizationSyncSchedulerFinishFireHandlesNilAndStoreErrors(t *testing.T) {
	scheduler := &OrganizationSyncScheduler{}
	if err := scheduler.finishFire(&OrganizationSyncSchedule{}, nil); err != nil {
		t.Fatalf("finishFire(nil) error = %v", err)
	}

	storeErr := errors.New("store update failed")
	store := &failingUpdateOrganizationSyncScheduleStore{memoryOrganizationSyncScheduleStore: newMemoryOrganizationSyncScheduleStore(), err: storeErr}
	scheduler = &OrganizationSyncScheduler{Store: store}
	err := scheduler.finishFire(&OrganizationSyncSchedule{}, &OrganizationSyncScheduleFire{})
	if !errors.Is(err, storeErr) {
		t.Fatalf("finishFire(store error) = %v, want %v", err, storeErr)
	}
}

func TestOrganizationSyncSchedulerMasksSensitiveDispatchError(t *testing.T) {
	now := time.Date(2026, 6, 9, 1, 2, 30, 0, time.UTC)
	store := newMemoryOrganizationSyncScheduleStore()
	_, _ = store.SaveOrganizationSyncSchedule(newEnabledOrganizationSyncSchedule("engineering", "* * * * *"))
	executor := &recordingOrganizationSyncExecutor{
		err: errors.New("provider failed with secret=real-secret token abc123"),
	}
	registry := NewOrganizationSyncExecutorRegistry()
	registry.Register(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, executor)
	scheduler := &OrganizationSyncScheduler{
		Store:           store,
		Registry:        registry,
		NodeID:          "node-a",
		Now:             func() time.Time { return now },
		SensitiveValues: []string{"real-secret", "abc123"},
	}

	if err := scheduler.RunOnce(context.Background()); err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}

	fire := firstMemoryOrganizationSyncScheduleFire(store)
	if fire == nil || fire.Status != OrganizationSyncScheduleFireStatusFailed || fire.ErrorCode != OrganizationSyncScheduleFireErrorDispatchFailed {
		t.Fatalf("dispatch error should mark fire failed: %#v", fire)
	}
	if strings.Contains(fire.ErrorText, "real-secret") || strings.Contains(fire.ErrorText, "abc123") {
		t.Fatalf("fire error text leaked sensitive value: %q", fire.ErrorText)
	}
}

func TestOrganizationSyncScheduleFirePersistenceEnforcesWindowUniqueness(t *testing.T) {
	engine, err := xorm.NewEngine("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("NewEngine() error = %v", err)
	}
	defer engine.Close()
	if err := engine.Sync2(new(OrganizationSyncScheduleFire)); err != nil {
		t.Fatalf("Sync2() error = %v", err)
	}
	windowStart := time.Date(2026, 6, 9, 1, 2, 0, 0, time.UTC)

	_, err = engine.Insert(&OrganizationSyncScheduleFire{
		Owner:        "engineering",
		Name:         "fire-1",
		ScheduleName: "schedule-a",
		WindowStart:  windowStart,
	})
	if err != nil {
		t.Fatalf("first Insert() error = %v", err)
	}
	_, err = engine.Insert(&OrganizationSyncScheduleFire{
		Owner:        "engineering",
		Name:         "fire-2",
		ScheduleName: "schedule-a",
		WindowStart:  windowStart,
	})
	if err == nil {
		t.Fatalf("expected duplicate schedule window insert to fail")
	}
}

func newEnabledOrganizationSyncSchedule(organization string, cronExpression string) *OrganizationSyncSchedule {
	schedule := &OrganizationSyncSchedule{
		Provider:       OrganizationSyncProviderWeCom,
		JobType:        OrganizationSyncJobTypeFullDifferential,
		Organization:   organization,
		CronExpression: cronExpression,
		Timezone:       "UTC",
		IsEnabled:      true,
	}
	schedule.ApplyDefaults()
	return schedule
}

func firstMemoryOrganizationSyncScheduleFire(store *memoryOrganizationSyncScheduleStore) *OrganizationSyncScheduleFire {
	for _, fire := range store.fires {
		copied := *fire
		return &copied
	}
	return nil
}
