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

func TestWebhookDeliveryWorkerStopWaitAndRestartGeneration(t *testing.T) {
	oldInterval := webhookPollingInterval
	oldProcess := webhookWorkerProcessEvents
	webhookPollingInterval = 5 * time.Millisecond
	var calls atomic.Int32
	callObserved := make(chan struct{}, 8)
	webhookWorkerProcessEvents = func() {
		calls.Add(1)
		select {
		case callObserved <- struct{}{}:
		default:
		}
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		_ = StopWebhookDeliveryWorkerAndWait(ctx)
		webhookPollingInterval = oldInterval
		webhookWorkerProcessEvents = oldProcess
	})

	StartWebhookDeliveryWorker()
	select {
	case <-callObserved:
	case <-time.After(time.Second):
		t.Fatal("webhook worker did not poll")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := StopWebhookDeliveryWorkerAndWait(ctx); err != nil {
		t.Fatalf("StopWebhookDeliveryWorkerAndWait() error = %v", err)
	}
	if err := StopWebhookDeliveryWorkerAndWait(ctx); err != nil {
		t.Fatalf("second StopWebhookDeliveryWorkerAndWait() error = %v", err)
	}
	stoppedAt := calls.Load()
	time.Sleep(20 * time.Millisecond)
	if got := calls.Load(); got != stoppedAt {
		t.Fatalf("webhook calls after stop = %d, want %d", got, stoppedAt)
	}
	for {
		select {
		case <-callObserved:
			continue
		default:
			goto drained
		}
	}

drained:
	StartWebhookDeliveryWorker()
	select {
	case <-callObserved:
	case <-time.After(time.Second):
		t.Fatal("restarted webhook worker did not poll")
	}
	if err := StopWebhookDeliveryWorkerAndWait(ctx); err != nil {
		t.Fatalf("restarted StopWebhookDeliveryWorkerAndWait() error = %v", err)
	}
}

func TestWebhookDeliveryWorkerStopWaitHonorsContext(t *testing.T) {
	oldInterval := webhookPollingInterval
	oldProcess := webhookWorkerProcessEvents
	webhookPollingInterval = time.Millisecond
	processStarted := make(chan struct{})
	processRelease := make(chan struct{})
	secondCall := make(chan struct{})
	var processCalls atomic.Int32
	var processStartedOnce sync.Once
	var processReleaseOnce sync.Once
	var secondCallOnce sync.Once
	webhookWorkerProcessEvents = func() {
		if processCalls.Add(1) == 1 {
			processStartedOnce.Do(func() { close(processStarted) })
		} else {
			secondCallOnce.Do(func() { close(secondCall) })
		}
		<-processRelease
	}
	t.Cleanup(func() {
		processReleaseOnce.Do(func() { close(processRelease) })
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		_ = StopWebhookDeliveryWorkerAndWait(ctx)
		webhookPollingInterval = oldInterval
		webhookWorkerProcessEvents = oldProcess
	})

	StartWebhookDeliveryWorker()
	select {
	case <-processStarted:
	case <-time.After(time.Second):
		t.Fatal("webhook worker did not enter in-flight processing")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if err := StopWebhookDeliveryWorkerAndWait(ctx); err != context.DeadlineExceeded {
		t.Fatalf("StopWebhookDeliveryWorkerAndWait() error = %v, want deadline exceeded", err)
	}
	processReleaseOnce.Do(func() { close(processRelease) })
	waitCtx, waitCancel := context.WithTimeout(context.Background(), time.Second)
	defer waitCancel()
	if err := StopWebhookDeliveryWorkerAndWait(waitCtx); err != nil {
		t.Fatalf("StopWebhookDeliveryWorkerAndWait() after release error = %v", err)
	}
	select {
	case <-secondCall:
		t.Fatalf("webhook worker started %d processing calls after Stop", processCalls.Load())
	default:
	}
}
