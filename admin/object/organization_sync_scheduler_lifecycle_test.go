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
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type cancelAwareOrganizationSyncExecutor struct {
	calls    atomic.Int32
	started  chan struct{}
	canceled chan struct{}
	once     sync.Once
}

func (e *cancelAwareOrganizationSyncExecutor) ExecuteOrganizationSync(ctx context.Context, _ OrganizationSyncDispatchRequest) (*OrganizationSyncDispatchResult, error) {
	e.calls.Add(1)
	e.once.Do(func() { close(e.started) })
	<-ctx.Done()
	close(e.canceled)
	return nil, ctx.Err()
}

type countingOrganizationSyncScheduleStore struct {
	*memoryOrganizationSyncScheduleStore
	listCalls atomic.Int32
	listed    chan struct{}
}

type blockingPeriodicOrganizationSyncScheduleStore struct {
	*memoryOrganizationSyncScheduleStore
	calls         atomic.Int32
	secondStarted chan struct{}
	releaseSecond chan struct{}
	extraCall     chan struct{}
	extraOnce     sync.Once
}

func (s *blockingPeriodicOrganizationSyncScheduleStore) GetEnabledOrganizationSyncSchedules() ([]*OrganizationSyncSchedule, error) {
	call := s.calls.Add(1)
	if call == 2 {
		close(s.secondStarted)
		<-s.releaseSecond
	} else if call > 2 {
		s.extraOnce.Do(func() { close(s.extraCall) })
	}
	return s.memoryOrganizationSyncScheduleStore.GetEnabledOrganizationSyncSchedules()
}

func (s *countingOrganizationSyncScheduleStore) GetEnabledOrganizationSyncSchedules() ([]*OrganizationSyncSchedule, error) {
	s.listCalls.Add(1)
	select {
	case s.listed <- struct{}{}:
	default:
	}
	return s.memoryOrganizationSyncScheduleStore.GetEnabledOrganizationSyncSchedules()
}

func TestOrganizationSyncSchedulerStopCancelsInflightExecutorAndWaits(t *testing.T) {
	now := time.Date(2026, 6, 9, 1, 2, 30, 0, time.UTC)
	store := newMemoryOrganizationSyncScheduleStore()
	_, _ = store.SaveOrganizationSyncSchedule(newEnabledOrganizationSyncSchedule("engineering", "* * * * *"))
	executor := &cancelAwareOrganizationSyncExecutor{started: make(chan struct{}), canceled: make(chan struct{})}
	registry := NewOrganizationSyncExecutorRegistry()
	registry.Register(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, executor)
	scheduler := &OrganizationSyncScheduler{
		Store:        store,
		Registry:     registry,
		NodeID:       "node-lifecycle",
		Now:          func() time.Time { return now },
		ScanInterval: time.Millisecond,
	}

	scheduler.Start(context.Background())
	select {
	case <-executor.started:
	case <-time.After(time.Second):
		t.Fatal("organization sync executor did not start")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := scheduler.Stop(ctx); err != nil {
		t.Fatalf("Stop() error = %v", err)
	}
	if err := scheduler.Wait(ctx); err != nil {
		t.Fatalf("Wait() error = %v", err)
	}
	select {
	case <-executor.canceled:
	default:
		t.Fatal("organization sync executor did not receive context cancellation")
	}
	if got := executor.calls.Load(); got != 1 {
		t.Fatalf("organization sync executor calls = %d, want 1", got)
	}
	if err := scheduler.Stop(ctx); err != nil {
		t.Fatalf("second Stop() error = %v", err)
	}
}

func TestOrganizationSyncSchedulerStartIsIdempotentAndRestartable(t *testing.T) {
	store := &countingOrganizationSyncScheduleStore{
		memoryOrganizationSyncScheduleStore: newMemoryOrganizationSyncScheduleStore(),
		listed:                              make(chan struct{}, 8),
	}
	scheduler := &OrganizationSyncScheduler{
		Store:        store,
		ScanInterval: time.Hour,
	}

	scheduler.Start(context.Background())
	scheduler.Start(context.Background())
	select {
	case <-store.listed:
	case <-time.After(time.Second):
		t.Fatal("organization scheduler initial scan did not run")
	}
	time.Sleep(20 * time.Millisecond)
	if got := store.listCalls.Load(); got != 1 {
		t.Fatalf("duplicate Start() list calls = %d, want 1", got)
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := scheduler.Stop(ctx); err != nil {
		t.Fatalf("first Stop() error = %v", err)
	}
	stoppedAt := store.listCalls.Load()
	time.Sleep(20 * time.Millisecond)
	if got := store.listCalls.Load(); got != stoppedAt {
		t.Fatalf("scheduler ticked after Stop(): got %d, want %d", got, stoppedAt)
	}

	scheduler.Start(context.Background())
	select {
	case <-store.listed:
	case <-time.After(time.Second):
		t.Fatal("restarted organization scheduler did not scan")
	}
	if err := scheduler.Stop(ctx); err != nil {
		t.Fatalf("restarted Stop() error = %v", err)
	}
	if got := store.listCalls.Load(); got != 2 {
		t.Fatalf("scheduler generations list calls = %d, want 2", got)
	}
}

func TestDefaultOrganizationSyncSchedulerCanStopWaitAndRestart(t *testing.T) {
	oldFactory := defaultOrganizationSyncSchedulerFactory
	defaultOrganizationSyncSchedulerMu.Lock()
	oldScheduler := defaultOrganizationSyncScheduler
	defaultOrganizationSyncScheduler = nil
	defaultOrganizationSyncSchedulerMu.Unlock()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := StopOrganizationSyncSchedulerAndWait(ctx); err != nil {
		t.Fatalf("nil default StopOrganizationSyncSchedulerAndWait() error = %v", err)
	}
	if err := WaitOrganizationSyncScheduler(ctx); err != nil {
		t.Fatalf("nil default WaitOrganizationSyncScheduler() error = %v", err)
	}
	createdByProductionFactory := oldFactory()
	if createdByProductionFactory == nil || createdByProductionFactory.Store == nil || createdByProductionFactory.Registry == nil || createdByProductionFactory.NodeID == "" {
		t.Fatalf("production default scheduler factory returned %#v", createdByProductionFactory)
	}
	store := &countingOrganizationSyncScheduleStore{
		memoryOrganizationSyncScheduleStore: newMemoryOrganizationSyncScheduleStore(),
		listed:                              make(chan struct{}, 8),
	}
	var factoryCalls atomic.Int32
	defaultOrganizationSyncSchedulerFactory = func() *OrganizationSyncScheduler {
		factoryCalls.Add(1)
		return &OrganizationSyncScheduler{Store: store, ScanInterval: time.Hour}
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		_ = StopOrganizationSyncSchedulerAndWait(ctx)
		defaultOrganizationSyncSchedulerMu.Lock()
		defaultOrganizationSyncScheduler = oldScheduler
		defaultOrganizationSyncSchedulerMu.Unlock()
		defaultOrganizationSyncSchedulerFactory = oldFactory
	})

	StartOrganizationSyncScheduler()
	StartOrganizationSyncScheduler()
	select {
	case <-store.listed:
	case <-time.After(time.Second):
		t.Fatal("default organization scheduler did not scan")
	}
	time.Sleep(20 * time.Millisecond)
	if got := store.listCalls.Load(); got != 1 {
		t.Fatalf("default scheduler duplicate Start list calls = %d, want 1", got)
	}
	StopOrganizationSyncScheduler()
	if err := WaitOrganizationSyncScheduler(ctx); err != nil {
		t.Fatalf("WaitOrganizationSyncScheduler() error = %v", err)
	}

	StartOrganizationSyncScheduler()
	select {
	case <-store.listed:
	case <-time.After(time.Second):
		t.Fatal("default organization scheduler did not restart")
	}
	if err := StopOrganizationSyncSchedulerAndWait(ctx); err != nil {
		t.Fatalf("restarted StopOrganizationSyncSchedulerAndWait() error = %v", err)
	}
	if got := factoryCalls.Load(); got != 1 {
		t.Fatalf("default scheduler factory calls = %d, want one saved instance", got)
	}
}

func TestOrganizationSyncSchedulerDoesNotConsumeQueuedTickAfterStop(t *testing.T) {
	store := &blockingPeriodicOrganizationSyncScheduleStore{
		memoryOrganizationSyncScheduleStore: newMemoryOrganizationSyncScheduleStore(),
		secondStarted:                       make(chan struct{}),
		releaseSecond:                       make(chan struct{}),
		extraCall:                           make(chan struct{}),
	}
	scheduler := &OrganizationSyncScheduler{Store: store, ScanInterval: time.Millisecond}
	scheduler.Start(context.Background())
	select {
	case <-store.secondStarted:
	case <-time.After(time.Second):
		t.Fatal("scheduler periodic scan did not start")
	}
	time.Sleep(5 * time.Millisecond)
	shortCtx, shortCancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer shortCancel()
	if err := scheduler.Stop(shortCtx); err != context.DeadlineExceeded {
		t.Fatalf("Stop() while scan blocked error = %v, want deadline exceeded", err)
	}
	close(store.releaseSecond)
	waitCtx, waitCancel := context.WithTimeout(context.Background(), time.Second)
	defer waitCancel()
	if err := scheduler.Stop(waitCtx); err != nil {
		t.Fatalf("Stop() after scan release error = %v", err)
	}
	select {
	case <-store.extraCall:
		t.Fatalf("scheduler consumed queued tick after Stop; list calls = %d", store.calls.Load())
	default:
	}
}

func TestOrganizationSyncSchedulerLifecycleBoundaryBranches(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	var nilScheduler *OrganizationSyncScheduler
	if err := nilScheduler.Stop(ctx); err != nil {
		t.Fatalf("nil scheduler Stop() error = %v", err)
	}
	if err := nilScheduler.Wait(ctx); err != nil {
		t.Fatalf("nil scheduler Wait() error = %v", err)
	}
	idleScheduler := &OrganizationSyncScheduler{}
	if err := idleScheduler.Stop(ctx); err != nil {
		t.Fatalf("idle scheduler Stop() error = %v", err)
	}
	if err := idleScheduler.Wait(ctx); err != nil {
		t.Fatalf("idle scheduler Wait() error = %v", err)
	}

	store := newMemoryOrganizationSyncScheduleStore()
	_, _ = store.SaveOrganizationSyncSchedule(newEnabledOrganizationSyncSchedule("engineering", "* * * * *"))
	executor := &cancelAwareOrganizationSyncExecutor{started: make(chan struct{}), canceled: make(chan struct{})}
	registry := NewOrganizationSyncExecutorRegistry()
	registry.Register(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, executor)
	scheduler := &OrganizationSyncScheduler{
		Store:        store,
		Registry:     registry,
		NodeID:       "node-boundary",
		Now:          func() time.Time { return time.Date(2026, 6, 9, 1, 2, 30, 0, time.UTC) },
		ScanInterval: time.Hour,
	}
	scheduler.Start(nil)
	select {
	case <-executor.started:
	case <-time.After(time.Second):
		t.Fatal("boundary executor did not start")
	}
	expiredCtx, expiredCancel := context.WithCancel(context.Background())
	expiredCancel()
	if err := scheduler.Wait(expiredCtx); err != context.Canceled {
		t.Fatalf("Wait(expired) error = %v, want context canceled", err)
	}
	if err := scheduler.Stop(ctx); err != nil {
		t.Fatalf("boundary scheduler Stop() error = %v", err)
	}

	preCanceledCtx, preCanceledCancel := context.WithCancel(context.Background())
	preCanceledCancel()
	preCanceledScheduler := &OrganizationSyncScheduler{Store: newMemoryOrganizationSyncScheduleStore()}
	preCanceledScheduler.Start(preCanceledCtx)
	if err := preCanceledScheduler.Wait(ctx); err != nil {
		t.Fatalf("pre-canceled scheduler Wait() error = %v", err)
	}
}
