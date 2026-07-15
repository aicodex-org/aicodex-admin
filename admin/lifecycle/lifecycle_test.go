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

package lifecycle

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"os"
	"reflect"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"

	"github.com/beego/beego/v2/server/web"
)

type lifecycleOrderRecorder struct {
	mu     sync.Mutex
	events []string
}

type recordingLifecycleLogger struct {
	mu     sync.Mutex
	events []lifecycleLogEvent
}

func (l *recordingLifecycleLogger) Log(event lifecycleLogEvent) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.events = append(l.events, event)
}

func (l *recordingLifecycleLogger) snapshot() []lifecycleLogEvent {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]lifecycleLogEvent(nil), l.events...)
}

func (r *lifecycleOrderRecorder) add(event string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events = append(r.events, event)
}

func (r *lifecycleOrderRecorder) snapshot() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]string(nil), r.events...)
}

type fakeLifecycleResource struct {
	name     string
	recorder *lifecycleOrderRecorder
	startErr error
	stopErr  error
	stopMu   sync.Mutex
	stops    int
}

func (r *fakeLifecycleResource) Name() string {
	return r.name
}

func (r *fakeLifecycleResource) Start() error {
	r.recorder.add(r.name + ":start")
	return r.startErr
}

func (r *fakeLifecycleResource) Stop(context.Context) error {
	r.stopMu.Lock()
	r.stops++
	r.stopMu.Unlock()
	r.recorder.add(r.name + ":stop")
	return r.stopErr
}

func (r *fakeLifecycleResource) stopCount() int {
	r.stopMu.Lock()
	defer r.stopMu.Unlock()
	return r.stops
}

type fakeLifecycleHTTPServer struct {
	recorder       *lifecycleOrderRecorder
	runStarted     chan struct{}
	runDone        chan struct{}
	runDoneOnce    sync.Once
	shutdownGate   <-chan struct{}
	shutdownResult error
	leaveRunActive bool
	closeResult    error
	mu             sync.Mutex
	shutdownCalls  int
	closeCalls     int
}

type netLifecycleHTTPServer struct {
	server     *http.Server
	listener   net.Listener
	recorder   *lifecycleOrderRecorder
	runRelease <-chan struct{}
	runStopped chan struct{}
}

func (s *netLifecycleHTTPServer) Run(string) error {
	s.recorder.add("http:start")
	err := s.server.Serve(s.listener)
	close(s.runStopped)
	if s.runRelease != nil {
		<-s.runRelease
	}
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func (s *netLifecycleHTTPServer) Shutdown(ctx context.Context) error {
	s.recorder.add("http:shutdown")
	return s.server.Shutdown(ctx)
}

func (s *netLifecycleHTTPServer) Close() error {
	s.recorder.add("http:close")
	return s.server.Close()
}

func newFakeLifecycleHTTPServer(recorder *lifecycleOrderRecorder) *fakeLifecycleHTTPServer {
	return &fakeLifecycleHTTPServer{
		recorder:   recorder,
		runStarted: make(chan struct{}),
		runDone:    make(chan struct{}),
	}
}

func (s *fakeLifecycleHTTPServer) Run(string) error {
	s.recorder.add("http:start")
	close(s.runStarted)
	<-s.runDone
	return nil
}

func (s *fakeLifecycleHTTPServer) Shutdown(context.Context) error {
	s.mu.Lock()
	s.shutdownCalls++
	s.mu.Unlock()
	s.recorder.add("http:shutdown")
	if s.shutdownGate != nil {
		<-s.shutdownGate
	}
	if !s.leaveRunActive {
		s.runDoneOnce.Do(func() { close(s.runDone) })
	}
	return s.shutdownResult
}

func (s *fakeLifecycleHTTPServer) Close() error {
	s.mu.Lock()
	s.closeCalls++
	s.mu.Unlock()
	s.recorder.add("http:close")
	s.runDoneOnce.Do(func() { close(s.runDone) })
	return s.closeResult
}

func (s *fakeLifecycleHTTPServer) counts() (int, int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.shutdownCalls, s.closeCalls
}

func (s *fakeLifecycleHTTPServer) exit() {
	s.runDoneOnce.Do(func() { close(s.runDone) })
}

func TestAdminLifecycleSignalStopsHTTPThenWorkersOnce(t *testing.T) {
	recorder := &lifecycleOrderRecorder{}
	server := newFakeLifecycleHTTPServer(recorder)
	resources := []lifecycleResource{
		&fakeLifecycleResource{name: "webhook", recorder: recorder},
		&fakeLifecycleResource{name: "gateway", recorder: recorder},
		&fakeLifecycleResource{name: "organization", recorder: recorder},
	}
	signals := make(chan os.Signal, 2)
	lifecycle := newAdminLifecycle(adminLifecycleOptions{
		Address:         ":8000",
		Server:          server,
		Resources:       resources,
		Signals:         signals,
		ShutdownTimeout: time.Second,
	})

	runResult := make(chan error, 1)
	go func() { runResult <- lifecycle.Run() }()
	select {
	case <-server.runStarted:
	case <-time.After(time.Second):
		t.Fatal("HTTP server did not start")
	}

	// 只向注入 channel 发送 signal 值，不向当前测试进程发送真实信号。
	signals <- syscall.SIGTERM
	signals <- syscall.SIGTERM
	select {
	case err := <-runResult:
		if err != nil {
			t.Fatalf("Run() error = %v, want nil", err)
		}
	case <-time.After(time.Second):
		t.Fatal("lifecycle did not stop after signal")
	}

	if err := lifecycle.Stop(); err != nil {
		t.Fatalf("second Stop() error = %v, want nil", err)
	}
	wantOrder := []string{
		"webhook:start",
		"gateway:start",
		"organization:start",
		"http:start",
		"http:shutdown",
		"organization:stop",
		"gateway:stop",
		"webhook:stop",
	}
	if got := recorder.snapshot(); !reflect.DeepEqual(got, wantOrder) {
		t.Fatalf("lifecycle order = %#v, want %#v", got, wantOrder)
	}
	shutdownCalls, closeCalls := server.counts()
	if shutdownCalls != 1 || closeCalls != 0 {
		t.Fatalf("HTTP shutdown/close calls = %d/%d, want 1/0", shutdownCalls, closeCalls)
	}
	for _, resource := range resources {
		if got := resource.(*fakeLifecycleResource).stopCount(); got != 1 {
			t.Fatalf("%s stop count = %d, want 1", resource.Name(), got)
		}
	}
}

func TestAdminLifecycleConcurrentStopSharesOneResult(t *testing.T) {
	recorder := &lifecycleOrderRecorder{}
	shutdownGate := make(chan struct{})
	server := newFakeLifecycleHTTPServer(recorder)
	server.shutdownGate = shutdownGate
	resource := &fakeLifecycleResource{name: "worker", recorder: recorder}
	lifecycle := newAdminLifecycle(adminLifecycleOptions{
		Address:         ":8000",
		Server:          server,
		Resources:       []lifecycleResource{resource},
		Signals:         make(chan os.Signal),
		ShutdownTimeout: time.Second,
	})

	runResult := make(chan error, 1)
	go func() { runResult <- lifecycle.Run() }()
	select {
	case <-server.runStarted:
	case <-time.After(time.Second):
		t.Fatal("HTTP server did not start")
	}

	stopResults := make(chan error, 4)
	for range 4 {
		go func() { stopResults <- lifecycle.Stop() }()
	}
	time.Sleep(20 * time.Millisecond)
	close(shutdownGate)
	for range 4 {
		select {
		case err := <-stopResults:
			if err != nil {
				t.Fatalf("concurrent Stop() error = %v, want nil", err)
			}
		case <-time.After(time.Second):
			t.Fatal("concurrent Stop() did not return")
		}
	}
	select {
	case err := <-runResult:
		if err != nil {
			t.Fatalf("Run() error = %v, want nil", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Run() did not return after concurrent Stop")
	}

	shutdownCalls, closeCalls := server.counts()
	if shutdownCalls != 1 || closeCalls != 0 || resource.stopCount() != 1 {
		t.Fatalf("shutdown/close/stop calls = %d/%d/%d, want 1/0/1", shutdownCalls, closeCalls, resource.stopCount())
	}
}

func TestAdminLifecycleStartFailureRollsBackStartedResources(t *testing.T) {
	recorder := &lifecycleOrderRecorder{}
	server := newFakeLifecycleHTTPServer(recorder)
	startErr := errors.New("synthetic start failure")
	first := &fakeLifecycleResource{name: "first", recorder: recorder}
	second := &fakeLifecycleResource{name: "second", recorder: recorder, startErr: startErr}
	third := &fakeLifecycleResource{name: "third", recorder: recorder}
	lifecycle := newAdminLifecycle(adminLifecycleOptions{
		Address:         ":8000",
		Server:          server,
		Resources:       []lifecycleResource{first, second, third},
		Signals:         make(chan os.Signal),
		ShutdownTimeout: time.Second,
	})

	err := lifecycle.Run()
	if !errors.Is(err, startErr) {
		t.Fatalf("Run() error = %v, want wrapped start error", err)
	}
	wantOrder := []string{"first:start", "second:start", "first:stop"}
	if got := recorder.snapshot(); !reflect.DeepEqual(got, wantOrder) {
		t.Fatalf("rollback order = %#v, want %#v", got, wantOrder)
	}
	if first.stopCount() != 1 || second.stopCount() != 0 || third.stopCount() != 0 {
		t.Fatalf("resource stop counts = %d/%d/%d, want 1/0/0", first.stopCount(), second.stopCount(), third.stopCount())
	}
	select {
	case <-server.runStarted:
		t.Fatal("HTTP server started after worker start failure")
	default:
	}
}

func TestAdminLifecycleHTTPExitRollsBackWorkersInReverseOrder(t *testing.T) {
	recorder := &lifecycleOrderRecorder{}
	server := newFakeLifecycleHTTPServer(recorder)
	first := &fakeLifecycleResource{name: "first", recorder: recorder}
	second := &fakeLifecycleResource{name: "second", recorder: recorder}
	lifecycle := newAdminLifecycle(adminLifecycleOptions{
		Address:         ":8000",
		Server:          server,
		Resources:       []lifecycleResource{first, second},
		Signals:         make(chan os.Signal),
		ShutdownTimeout: time.Second,
	})

	runResult := make(chan error, 1)
	go func() { runResult <- lifecycle.Run() }()
	select {
	case <-server.runStarted:
	case <-time.After(time.Second):
		t.Fatal("HTTP server did not start")
	}
	server.exit()

	select {
	case err := <-runResult:
		if !errors.Is(err, errHTTPServerExited) {
			t.Fatalf("Run() error = %v, want errHTTPServerExited", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Run() did not return after HTTP server exit")
	}
	wantOrder := []string{"first:start", "second:start", "http:start", "second:stop", "first:stop"}
	if got := recorder.snapshot(); !reflect.DeepEqual(got, wantOrder) {
		t.Fatalf("HTTP exit rollback order = %#v, want %#v", got, wantOrder)
	}
	shutdownCalls, closeCalls := server.counts()
	if shutdownCalls != 0 || closeCalls != 0 {
		t.Fatalf("HTTP shutdown/close calls after early exit = %d/%d, want 0/0", shutdownCalls, closeCalls)
	}
}

func TestBeegoLifecycleHTTPServerRejectsBeegoGracefulMode(t *testing.T) {
	app := &web.HttpServer{
		Cfg:    &web.Config{Listen: web.Listen{Graceful: true}},
		Server: &http.Server{},
	}
	server := newBeegoLifecycleHTTPServer(app)

	err := server.Run(":8000")
	if !errors.Is(err, errBeegoGracefulModeConflict) {
		t.Fatalf("Run() error = %v, want errBeegoGracefulModeConflict", err)
	}
}

func TestAdminLifecycleWaitsForInflightRequestAndHTTPRunCleanup(t *testing.T) {
	recorder := &lifecycleOrderRecorder{}
	handlerStarted := make(chan struct{})
	handlerRelease := make(chan struct{})
	runRelease := make(chan struct{})
	var runReleaseOnce sync.Once
	t.Cleanup(func() { runReleaseOnce.Do(func() { close(runRelease) }) })

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Listen() error = %v", err)
	}
	server := &netLifecycleHTTPServer{
		server: &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			close(handlerStarted)
			<-handlerRelease
			_, _ = w.Write([]byte("completed"))
		})},
		listener:   listener,
		recorder:   recorder,
		runRelease: runRelease,
		runStopped: make(chan struct{}),
	}
	resource := &fakeLifecycleResource{name: "worker", recorder: recorder}
	lifecycle := newAdminLifecycle(adminLifecycleOptions{
		Address:         listener.Addr().String(),
		Server:          server,
		Resources:       []lifecycleResource{resource},
		Signals:         make(chan os.Signal),
		ShutdownTimeout: time.Second,
	})

	runResult := make(chan error, 1)
	go func() { runResult <- lifecycle.Run() }()
	requestResult := make(chan struct {
		body string
		err  error
	}, 1)
	go func() {
		response, requestErr := http.Get("http://" + listener.Addr().String())
		if requestErr != nil {
			requestResult <- struct {
				body string
				err  error
			}{err: requestErr}
			return
		}
		defer response.Body.Close()
		body, requestErr := io.ReadAll(response.Body)
		requestResult <- struct {
			body string
			err  error
		}{body: string(body), err: requestErr}
	}()

	select {
	case <-handlerStarted:
	case <-time.After(time.Second):
		t.Fatal("in-flight handler did not start")
	}
	stopResult := make(chan error, 1)
	go func() { stopResult <- lifecycle.Stop() }()
	select {
	case <-server.runStopped:
	case <-time.After(time.Second):
		t.Fatal("HTTP Serve did not stop accepting connections")
	}
	if resource.stopCount() != 0 {
		t.Fatal("worker stopped before in-flight request completed")
	}
	close(handlerRelease)
	select {
	case result := <-requestResult:
		if result.err != nil || result.body != "completed" {
			t.Fatalf("request result = body:%q err:%v, want completed nil", result.body, result.err)
		}
	case <-time.After(time.Second):
		t.Fatal("in-flight request did not complete")
	}
	select {
	case err := <-stopResult:
		t.Fatalf("Stop() returned before HTTP Run cleanup was released: %v", err)
	case <-time.After(30 * time.Millisecond):
	}
	runReleaseOnce.Do(func() { close(runRelease) })
	select {
	case err := <-stopResult:
		if err != nil {
			t.Fatalf("Stop() error = %v, want nil", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Stop() did not return after HTTP cleanup")
	}
	select {
	case err := <-runResult:
		if err != nil {
			t.Fatalf("Run() error = %v, want nil", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Run() did not return after graceful shutdown")
	}
	if got := recorder.snapshot(); !reflect.DeepEqual(got, []string{"worker:start", "http:start", "http:shutdown", "worker:stop"}) {
		t.Fatalf("graceful shutdown order = %#v", got)
	}
	rebound, err := net.Listen("tcp", listener.Addr().String())
	if err != nil {
		t.Fatalf("listener port was not released: %v", err)
	}
	_ = rebound.Close()
}

func TestAdminLifecycleTimeoutForceClosesHTTPAndStillStopsWorkers(t *testing.T) {
	recorder := &lifecycleOrderRecorder{}
	handlerStarted := make(chan struct{})
	handlerExited := make(chan struct{})
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Listen() error = %v", err)
	}
	server := &netLifecycleHTTPServer{
		server: &http.Server{Handler: http.HandlerFunc(func(_ http.ResponseWriter, request *http.Request) {
			close(handlerStarted)
			<-request.Context().Done()
			close(handlerExited)
		})},
		listener:   listener,
		recorder:   recorder,
		runStopped: make(chan struct{}),
	}
	t.Cleanup(func() { _ = server.server.Close() })
	resource := &fakeLifecycleResource{name: "worker", recorder: recorder}
	lifecycle := newAdminLifecycle(adminLifecycleOptions{
		Address:         listener.Addr().String(),
		Server:          server,
		Resources:       []lifecycleResource{resource},
		Signals:         make(chan os.Signal),
		ShutdownTimeout: 40 * time.Millisecond,
	})

	runResult := make(chan error, 1)
	go func() { runResult <- lifecycle.Run() }()
	requestResult := make(chan error, 1)
	go func() {
		response, requestErr := http.Get("http://" + listener.Addr().String())
		if response != nil {
			_ = response.Body.Close()
		}
		requestResult <- requestErr
	}()
	select {
	case <-handlerStarted:
	case <-time.After(time.Second):
		t.Fatal("timeout test handler did not start")
	}

	startedAt := time.Now()
	err = lifecycle.Stop()
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("Stop() error = %v, want context deadline exceeded", err)
	}
	if elapsed := time.Since(startedAt); elapsed > 500*time.Millisecond {
		t.Fatalf("Stop() elapsed = %s, want bounded return", elapsed)
	}
	if resource.stopCount() != 1 {
		t.Fatalf("worker stop count = %d, want 1", resource.stopCount())
	}
	select {
	case <-handlerExited:
	case <-time.After(time.Second):
		t.Fatal("forced HTTP close did not cancel in-flight request")
	}
	select {
	case requestErr := <-requestResult:
		if requestErr == nil {
			t.Fatal("forced HTTP close unexpectedly completed request")
		}
	case <-time.After(time.Second):
		t.Fatal("forced HTTP close did not release client request")
	}
	select {
	case runErr := <-runResult:
		if !errors.Is(runErr, context.DeadlineExceeded) {
			t.Fatalf("Run() error = %v, want shared deadline error", runErr)
		}
	case <-time.After(time.Second):
		t.Fatal("Run() did not return after forced close")
	}
	if got := recorder.snapshot(); !reflect.DeepEqual(got, []string{"worker:start", "http:start", "http:shutdown", "http:close", "worker:stop"}) {
		t.Fatalf("timeout shutdown order = %#v", got)
	}
	rebound, err := net.Listen("tcp", listener.Addr().String())
	if err != nil {
		t.Fatalf("listener port was not released after timeout: %v", err)
	}
	_ = rebound.Close()
}

func TestAdminLifecycleLogsStableCodesWithoutRawErrors(t *testing.T) {
	recorder := &lifecycleOrderRecorder{}
	logger := &recordingLifecycleLogger{}
	httpErr := errors.New("token=super-secret database=private-dsn")
	workerErr := errors.New("password=worker-secret")
	closeErr := errors.New("cookie=close-secret")
	server := newFakeLifecycleHTTPServer(recorder)
	server.shutdownResult = httpErr
	server.closeResult = closeErr
	resource := &fakeLifecycleResource{name: "gateway", recorder: recorder, stopErr: workerErr}
	signals := make(chan os.Signal, 1)
	lifecycle := newAdminLifecycle(adminLifecycleOptions{
		Address:         ":8000",
		Server:          server,
		Resources:       []lifecycleResource{resource},
		Signals:         signals,
		ShutdownTimeout: 250 * time.Millisecond,
		Logger:          logger,
	})

	runResult := make(chan error, 1)
	go func() { runResult <- lifecycle.Run() }()
	select {
	case <-server.runStarted:
	case <-time.After(time.Second):
		t.Fatal("HTTP server did not start")
	}
	signals <- syscall.SIGTERM
	select {
	case err := <-runResult:
		if !errors.Is(err, httpErr) || !errors.Is(err, closeErr) || !errors.Is(err, workerErr) {
			t.Fatalf("Run() error = %v, want joined HTTP, close and worker errors", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Run() did not return after shutdown errors")
	}

	events := logger.snapshot()
	if len(events) != 3 {
		t.Fatalf("lifecycle log events = %#v, want 3", events)
	}
	if events[0].Stage != lifecycleStageShutdown || events[0].Resource != lifecycleResourceHTTP || events[0].ErrorCode != lifecycleErrorHTTPShutdownFailed {
		t.Fatalf("HTTP lifecycle event = %#v", events[0])
	}
	if events[1].Stage != lifecycleStageShutdown || events[1].Resource != lifecycleResourceHTTP || events[1].ErrorCode != lifecycleErrorHTTPForceCloseFailed {
		t.Fatalf("HTTP force-close event = %#v", events[1])
	}
	if events[2].Stage != lifecycleStageStop || events[2].Resource != "gateway" || events[2].ErrorCode != lifecycleErrorResourceStopFailed {
		t.Fatalf("worker lifecycle event = %#v", events[2])
	}
	if events[0].Timeout != 250*time.Millisecond || events[1].Timeout != 250*time.Millisecond || events[2].Timeout != 250*time.Millisecond {
		t.Fatalf("lifecycle event timeouts = %s/%s/%s", events[0].Timeout, events[1].Timeout, events[2].Timeout)
	}
	rendered := strings.ToLower(strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(""+formatLifecycleEventsForTest(events)), "\r", ""), "\n", " ")))
	for _, secret := range []string{"super-secret", "private-dsn", "worker-secret", "close-secret", "token=", "password=", "cookie="} {
		if strings.Contains(rendered, secret) {
			t.Fatalf("lifecycle logs leaked %q: %s", secret, rendered)
		}
	}
}

func formatLifecycleEventsForTest(events []lifecycleLogEvent) string {
	var builder strings.Builder
	for _, event := range events {
		builder.WriteString(event.Level)
		builder.WriteString(" ")
		builder.WriteString(event.Stage)
		builder.WriteString(" ")
		builder.WriteString(event.Resource)
		builder.WriteString(" ")
		builder.WriteString(event.ErrorCode)
	}
	return builder.String()
}

func TestFormatLifecycleLogMessageUsesOnlyStableFields(t *testing.T) {
	message := formatLifecycleLogMessage(lifecycleLogEvent{
		Level:     lifecycleLogLevelError,
		Stage:     lifecycleStageShutdown,
		Resource:  lifecycleResourceHTTP,
		ErrorCode: lifecycleErrorHTTPShutdownTimeout,
		Timeout:   250 * time.Millisecond,
	})
	want := "admin_lifecycle stage=shutdown resource=http errorCode=http_shutdown_timeout timeoutMs=250"
	if message != want {
		t.Fatalf("formatLifecycleLogMessage() = %q, want %q", message, want)
	}
}

func TestNewAdminProcessLifecycleWiresManagedResourcesInStartOrder(t *testing.T) {
	signals := make(chan os.Signal)
	lifecycle := NewAdminProcessLifecycle(":8123", signals)
	if lifecycle.address != ":8123" || lifecycle.signals != signals {
		t.Fatalf("process lifecycle address/signals were not preserved")
	}
	wantNames := []string{"webhook_delivery_worker", "gateway_projection_refresh_worker", "organization_sync_scheduler"}
	gotNames := make([]string, 0, len(lifecycle.resources))
	for _, resource := range lifecycle.resources {
		gotNames = append(gotNames, resource.Name())
	}
	if !reflect.DeepEqual(gotNames, wantNames) {
		t.Fatalf("managed resource order = %#v, want %#v", gotNames, wantNames)
	}
	server, ok := lifecycle.server.(*beegoLifecycleHTTPServer)
	if !ok || server.app != web.BeeApp {
		t.Fatalf("process lifecycle server = %#v, want web.BeeApp adapter", lifecycle.server)
	}
	if _, ok := lifecycle.logger.(beegoLifecycleLogger); !ok {
		t.Fatalf("process lifecycle logger = %T, want beegoLifecycleLogger", lifecycle.logger)
	}
}

func TestFunctionLifecycleResourceOptionalCallbacks(t *testing.T) {
	resource := functionLifecycleResource{name: "optional"}
	if resource.Name() != "optional" || resource.Start() != nil || resource.Stop(context.Background()) != nil {
		t.Fatal("resource with optional callbacks should be a named no-op")
	}
	startErr := errors.New("start failed")
	stopErr := errors.New("stop failed")
	resource.start = func() error { return startErr }
	resource.stop = func(context.Context) error { return stopErr }
	if !errors.Is(resource.Start(), startErr) || !errors.Is(resource.Stop(context.Background()), stopErr) {
		t.Fatal("resource callbacks did not propagate errors")
	}
}

func TestAdminLifecycleDefaultsValidationAndSecondRun(t *testing.T) {
	lifecycle := newAdminLifecycle(adminLifecycleOptions{})
	if lifecycle.shutdownTimeout != defaultAdminShutdownTimeout {
		t.Fatalf("default shutdown timeout = %s", lifecycle.shutdownTimeout)
	}
	if _, ok := lifecycle.logger.(noopLifecycleLogger); !ok {
		t.Fatalf("default logger = %T, want noopLifecycleLogger", lifecycle.logger)
	}
	if err := lifecycle.Run(); err == nil {
		t.Fatal("Run() without HTTP server should fail")
	}
	var nilLifecycle *adminLifecycle
	if err := nilLifecycle.Stop(); err != nil {
		t.Fatalf("nil Stop() error = %v", err)
	}

	recorder := &lifecycleOrderRecorder{}
	server := newFakeLifecycleHTTPServer(recorder)
	signals := make(chan os.Signal, 1)
	lifecycle = newAdminLifecycle(adminLifecycleOptions{Server: server, Resources: []lifecycleResource{nil}, Signals: signals})
	runResult := make(chan error, 1)
	go func() { runResult <- lifecycle.Run() }()
	select {
	case <-server.runStarted:
	case <-time.After(time.Second):
		t.Fatal("HTTP server did not start")
	}
	signals <- syscall.SIGTERM
	if err := <-runResult; err != nil {
		t.Fatalf("first Run() error = %v", err)
	}
	if err := lifecycle.Run(); err == nil {
		t.Fatal("second Run() should fail")
	}
}

func TestAdminLifecycleRunCleanupTimeoutForcesCloseAndLogs(t *testing.T) {
	recorder := &lifecycleOrderRecorder{}
	logger := &recordingLifecycleLogger{}
	server := newFakeLifecycleHTTPServer(recorder)
	server.leaveRunActive = true
	closeErr := errors.New("secret close failure")
	server.closeResult = closeErr
	signals := make(chan os.Signal, 1)
	lifecycle := newAdminLifecycle(adminLifecycleOptions{
		Server:          server,
		Signals:         signals,
		ShutdownTimeout: 20 * time.Millisecond,
		Logger:          logger,
	})
	runResult := make(chan error, 1)
	go func() { runResult <- lifecycle.Run() }()
	select {
	case <-server.runStarted:
	case <-time.After(time.Second):
		t.Fatal("HTTP server did not start")
	}
	signals <- syscall.SIGTERM
	select {
	case err := <-runResult:
		if !errors.Is(err, context.DeadlineExceeded) || !errors.Is(err, closeErr) {
			t.Fatalf("Run() error = %v, want cleanup timeout and close error", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Run() did not return after cleanup timeout")
	}
	events := logger.snapshot()
	if len(events) != 2 || events[0].ErrorCode != lifecycleErrorHTTPRunCleanupTimeout || events[1].ErrorCode != lifecycleErrorHTTPForceCloseFailed {
		t.Fatalf("cleanup timeout log events = %#v", events)
	}
}
