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

type cancelAwareGatewayProjectionPublisher struct {
	started  chan struct{}
	canceled chan struct{}
}

type periodicCancelAwareGatewayProjectionPublisher struct {
	calls           atomic.Int32
	periodicStarted chan struct{}
	extraCall       chan struct{}
	extraOnce       sync.Once
}

func (p *periodicCancelAwareGatewayProjectionPublisher) BuildAndPublishOrganization(ctx context.Context, _ string, _ string) (GatewayProjectionServiceResult, error) {
	call := p.calls.Add(1)
	if call == 1 {
		return GatewayProjectionServiceResult{Publish: GatewayProjectionPublishResult{Success: true}}, nil
	}
	if call == 2 {
		close(p.periodicStarted)
		<-ctx.Done()
		return GatewayProjectionServiceResult{}, ctx.Err()
	}
	p.extraOnce.Do(func() { close(p.extraCall) })
	return GatewayProjectionServiceResult{}, ctx.Err()
}

func (p *cancelAwareGatewayProjectionPublisher) BuildAndPublishOrganization(ctx context.Context, _ string, _ string) (GatewayProjectionServiceResult, error) {
	close(p.started)
	<-ctx.Done()
	close(p.canceled)
	return GatewayProjectionServiceResult{}, ctx.Err()
}

func TestGatewayProjectionRefreshDefaultWorkerCancelsInflightPublishAndWaits(t *testing.T) {
	oldConfigProvider := gatewayProjectionRefreshWorkerConfigProvider
	oldFactory := gatewayProjectionRefreshWorkerFactory
	publisher := &cancelAwareGatewayProjectionPublisher{started: make(chan struct{}), canceled: make(chan struct{})}
	gatewayProjectionRefreshWorkerConfigProvider = func() GatewayProjectionRefreshConfig {
		return GatewayProjectionRefreshConfig{
			Enabled:      true,
			InitialDelay: 0,
			Interval:     time.Hour,
			BatchSize:    1,
			FreshnessTTL: 2 * time.Hour,
		}
	}
	gatewayProjectionRefreshWorkerFactory = func(config GatewayProjectionRefreshConfig) *GatewayProjectionRefreshWorker {
		return &GatewayProjectionRefreshWorker{
			Config:    config,
			Store:     &memoryGatewayProjectionRefreshOrganizationStore{organizations: []string{"org-a"}},
			Publisher: publisher,
		}
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		_ = StopGatewayProjectionRefreshWorkerAndWait(ctx)
		gatewayProjectionRefreshWorkerConfigProvider = oldConfigProvider
		gatewayProjectionRefreshWorkerFactory = oldFactory
	})

	StartGatewayProjectionRefreshWorker()
	select {
	case <-publisher.started:
	case <-time.After(time.Second):
		t.Fatal("gateway refresh publisher did not start")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := StopGatewayProjectionRefreshWorkerAndWait(ctx); err != nil {
		t.Fatalf("StopGatewayProjectionRefreshWorkerAndWait() error = %v", err)
	}
	select {
	case <-publisher.canceled:
	default:
		t.Fatal("gateway refresh publisher did not receive context cancellation")
	}
	if err := StopGatewayProjectionRefreshWorkerAndWait(ctx); err != nil {
		t.Fatalf("second StopGatewayProjectionRefreshWorkerAndWait() error = %v", err)
	}
}

func TestGatewayProjectionRefreshDefaultWorkerRestartUsesNewGeneration(t *testing.T) {
	oldConfigProvider := gatewayProjectionRefreshWorkerConfigProvider
	oldFactory := gatewayProjectionRefreshWorkerFactory
	gatewayProjectionRefreshWorkerConfigProvider = func() GatewayProjectionRefreshConfig {
		return GatewayProjectionRefreshConfig{
			Enabled:      true,
			InitialDelay: time.Hour,
			Interval:     time.Hour,
			BatchSize:    1,
			FreshnessTTL: 2 * time.Hour,
		}
	}
	var generations atomic.Int32
	gatewayProjectionRefreshWorkerFactory = func(config GatewayProjectionRefreshConfig) *GatewayProjectionRefreshWorker {
		generations.Add(1)
		return &GatewayProjectionRefreshWorker{Config: config}
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		_ = StopGatewayProjectionRefreshWorkerAndWait(ctx)
		gatewayProjectionRefreshWorkerConfigProvider = oldConfigProvider
		gatewayProjectionRefreshWorkerFactory = oldFactory
	})

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	for range 2 {
		StartGatewayProjectionRefreshWorker()
		if err := StopGatewayProjectionRefreshWorkerAndWait(ctx); err != nil {
			t.Fatalf("StopGatewayProjectionRefreshWorkerAndWait() error = %v", err)
		}
	}
	if got := generations.Load(); got != 2 {
		t.Fatalf("gateway refresh generations = %d, want 2", got)
	}
}

func TestGatewayProjectionRefreshWorkerDoesNotConsumeQueuedTickAfterCancel(t *testing.T) {
	oldMinimumInterval := gatewayProjectionRefreshMinimumInterval
	gatewayProjectionRefreshMinimumInterval = time.Millisecond
	t.Cleanup(func() { gatewayProjectionRefreshMinimumInterval = oldMinimumInterval })
	publisher := &periodicCancelAwareGatewayProjectionPublisher{
		periodicStarted: make(chan struct{}),
		extraCall:       make(chan struct{}),
	}
	worker := &GatewayProjectionRefreshWorker{
		Config: GatewayProjectionRefreshConfig{
			Enabled:      true,
			Interval:     time.Millisecond,
			InitialDelay: 0,
			BatchSize:    1,
			FreshnessTTL: time.Hour,
		},
		Store:     &memoryGatewayProjectionRefreshOrganizationStore{organizations: []string{"org-a"}},
		Publisher: publisher,
	}
	ctx, cancel := context.WithCancel(context.Background())
	runDone := make(chan struct{})
	go func() {
		worker.run(ctx)
		close(runDone)
	}()
	select {
	case <-publisher.periodicStarted:
	case <-time.After(time.Second):
		t.Fatal("gateway periodic publish did not start")
	}
	time.Sleep(5 * time.Millisecond)
	cancel()
	select {
	case <-runDone:
	case <-time.After(time.Second):
		t.Fatal("gateway refresh worker did not exit after cancel")
	}
	select {
	case <-publisher.extraCall:
		t.Fatalf("gateway refresh consumed queued tick after cancel; calls = %d", publisher.calls.Load())
	default:
	}
}
