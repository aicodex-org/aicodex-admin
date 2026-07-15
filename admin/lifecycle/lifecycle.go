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
	"fmt"
	"os"
	"sync"
	"sync/atomic"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"github.com/beego/beego/v2/core/logs"
	"github.com/beego/beego/v2/server/web"
)

const defaultAdminShutdownTimeout = 30 * time.Second

const (
	lifecycleLogLevelError = "error"

	lifecycleStageStart    = "start"
	lifecycleStageShutdown = "shutdown"
	lifecycleStageStop     = "stop"
	lifecycleStageWait     = "wait"

	lifecycleResourceHTTP = "http"

	lifecycleErrorResourceStartFailed   = "resource_start_failed"
	lifecycleErrorResourceStopFailed    = "resource_stop_failed"
	lifecycleErrorResourceStopTimeout   = "resource_stop_timeout"
	lifecycleErrorHTTPServerExited      = "http_server_exited"
	lifecycleErrorBeegoGracefulConflict = "beego_graceful_mode_conflict"
	lifecycleErrorHTTPShutdownFailed    = "http_shutdown_failed"
	lifecycleErrorHTTPShutdownTimeout   = "http_shutdown_timeout"
	lifecycleErrorHTTPForceCloseFailed  = "http_force_close_failed"
	lifecycleErrorHTTPRunCleanupTimeout = "http_run_cleanup_timeout"
)

var (
	errHTTPServerExited          = errors.New("http server exited before shutdown")
	errBeegoGracefulModeConflict = errors.New("beego graceful mode conflicts with admin lifecycle")
)

// lifecycleResource 是由 Admin 顶层 lifecycle 管理的进程内资源。
type lifecycleResource interface {
	Name() string
	Start() error
	Stop(context.Context) error
}

type functionLifecycleResource struct {
	name  string
	start func() error
	stop  func(context.Context) error
}

func (r functionLifecycleResource) Name() string {
	return r.name
}

func (r functionLifecycleResource) Start() error {
	if r.start == nil {
		return nil
	}
	return r.start()
}

func (r functionLifecycleResource) Stop(ctx context.Context) error {
	if r.stop == nil {
		return nil
	}
	return r.stop(ctx)
}

// lifecycleHTTPServer 隔离 Beego server 与可独立验证的 net/http server。
type lifecycleHTTPServer interface {
	Run(address string) error
	Shutdown(context.Context) error
	Close() error
}

// lifecycleLogEvent 只携带固定维度，不允许附带底层 error 文本。
type lifecycleLogEvent struct {
	Level     string
	Stage     string
	Resource  string
	ErrorCode string
	Timeout   time.Duration
}

type lifecycleLogger interface {
	Log(lifecycleLogEvent)
}

type noopLifecycleLogger struct{}

func (noopLifecycleLogger) Log(lifecycleLogEvent) {}

type beegoLifecycleLogger struct{}

func (beegoLifecycleLogger) Log(event lifecycleLogEvent) {
	message := formatLifecycleLogMessage(event)
	if event.Level == lifecycleLogLevelError {
		logs.Error(message)
		return
	}
	logs.Info(message)
}

func formatLifecycleLogMessage(event lifecycleLogEvent) string {
	return fmt.Sprintf(
		"admin_lifecycle stage=%s resource=%s errorCode=%s timeoutMs=%d",
		event.Stage,
		event.Resource,
		event.ErrorCode,
		event.Timeout.Milliseconds(),
	)
}

type beegoLifecycleHTTPServer struct {
	app *web.HttpServer
}

func newBeegoLifecycleHTTPServer(app *web.HttpServer) *beegoLifecycleHTTPServer {
	return &beegoLifecycleHTTPServer{app: app}
}

func (s *beegoLifecycleHTTPServer) Run(address string) error {
	if s == nil || s.app == nil || s.app.Cfg == nil || s.app.Server == nil {
		return errors.New("beego HTTP server is not initialized")
	}
	if s.app.Cfg.Listen.Graceful {
		return errBeegoGracefulModeConflict
	}
	s.app.Run(address)
	return nil
}

func (s *beegoLifecycleHTTPServer) Shutdown(ctx context.Context) error {
	if s == nil || s.app == nil || s.app.Server == nil {
		return errors.New("beego HTTP server is not initialized")
	}
	return s.app.Server.Shutdown(ctx)
}

func (s *beegoLifecycleHTTPServer) Close() error {
	if s == nil || s.app == nil || s.app.Server == nil {
		return errors.New("beego HTTP server is not initialized")
	}
	return s.app.Server.Close()
}

type adminLifecycleOptions struct {
	Address         string
	Server          lifecycleHTTPServer
	Resources       []lifecycleResource
	Signals         <-chan os.Signal
	ShutdownTimeout time.Duration
	Logger          lifecycleLogger
}

// adminLifecycle 统一管理可控 worker 与主 HTTP server 的启动和停止。
type adminLifecycle struct {
	address         string
	server          lifecycleHTTPServer
	resources       []lifecycleResource
	signals         <-chan os.Signal
	shutdownTimeout time.Duration
	logger          lifecycleLogger

	mu               sync.Mutex
	started          bool
	startedResources []lifecycleResource
	serverDone       chan struct{}
	serverErr        error

	stopping atomic.Bool
	stopOnce sync.Once
	stopDone chan struct{}
	stopErr  error
}

func newAdminLifecycle(options adminLifecycleOptions) *adminLifecycle {
	timeout := options.ShutdownTimeout
	if timeout <= 0 {
		timeout = defaultAdminShutdownTimeout
	}
	logger := options.Logger
	if logger == nil {
		logger = noopLifecycleLogger{}
	}
	return &adminLifecycle{
		address:         options.Address,
		server:          options.Server,
		resources:       append([]lifecycleResource(nil), options.Resources...),
		signals:         options.Signals,
		shutdownTimeout: timeout,
		logger:          logger,
		stopDone:        make(chan struct{}),
	}
}

// NewAdminProcessLifecycle 创建使用现有 Beego server 与三个受控 worker 的进程 lifecycle。
func NewAdminProcessLifecycle(address string, signals <-chan os.Signal) *adminLifecycle {
	return newAdminLifecycle(adminLifecycleOptions{
		Address: address,
		Server:  newBeegoLifecycleHTTPServer(web.BeeApp),
		Resources: []lifecycleResource{
			functionLifecycleResource{
				name: "webhook_delivery_worker",
				start: func() error {
					object.StartWebhookDeliveryWorker()
					return nil
				},
				stop: object.StopWebhookDeliveryWorkerAndWait,
			},
			functionLifecycleResource{
				name: "gateway_projection_refresh_worker",
				start: func() error {
					object.StartGatewayProjectionRefreshWorker()
					return nil
				},
				stop: object.StopGatewayProjectionRefreshWorkerAndWait,
			},
			functionLifecycleResource{
				name: "organization_sync_scheduler",
				start: func() error {
					object.StartOrganizationSyncScheduler()
					return nil
				},
				stop: object.StopOrganizationSyncSchedulerAndWait,
			},
		},
		Signals:         signals,
		ShutdownTimeout: defaultAdminShutdownTimeout,
		Logger:          beegoLifecycleLogger{},
	})
}

// Run 按既有顺序启动受控资源与 HTTP，并阻塞到 signal、Stop 或 server 提前退出。
func (l *adminLifecycle) Run() error {
	if l == nil || l.server == nil {
		return errors.New("admin lifecycle HTTP server is required")
	}

	l.mu.Lock()
	if l.started {
		l.mu.Unlock()
		return errors.New("admin lifecycle already started")
	}
	l.started = true
	l.mu.Unlock()

	for _, resource := range l.resources {
		if resource == nil {
			continue
		}
		if err := resource.Start(); err != nil {
			l.logError(lifecycleStageStart, resource.Name(), lifecycleErrorResourceStartFailed)
			return errors.Join(fmt.Errorf("start resource %s: %w", resource.Name(), err), l.stop(false))
		}
		l.mu.Lock()
		l.startedResources = append(l.startedResources, resource)
		l.mu.Unlock()
	}

	l.mu.Lock()
	l.serverDone = make(chan struct{})
	l.mu.Unlock()
	go func() {
		err := l.server.Run(l.address)
		l.mu.Lock()
		l.serverErr = err
		close(l.serverDone)
		l.mu.Unlock()
	}()

	select {
	case <-l.signals:
		return l.Stop()
	case <-l.serverDone:
		if l.stopping.Load() {
			<-l.stopDone
			return l.stopErr
		}
		l.mu.Lock()
		err := l.serverErr
		l.mu.Unlock()
		if err == nil {
			err = errHTTPServerExited
		}
		serverErrorCode := lifecycleErrorHTTPServerExited
		if errors.Is(err, errBeegoGracefulModeConflict) {
			serverErrorCode = lifecycleErrorBeegoGracefulConflict
		}
		l.logError(lifecycleStageStart, lifecycleResourceHTTP, serverErrorCode)
		return errors.Join(err, l.stop(false))
	case <-l.stopDone:
		return l.stopErr
	}
}

// Stop 幂等执行一次有界 shutdown；重复调用共享同一次结果。
func (l *adminLifecycle) Stop() error {
	if l == nil {
		return nil
	}
	return l.stop(true)
}

func (l *adminLifecycle) stop(includeHTTP bool) error {
	l.stopOnce.Do(func() {
		l.stopping.Store(true)
		ctx, cancel := context.WithTimeout(context.Background(), l.shutdownTimeout)
		defer cancel()

		var stopErrors []error
		if includeHTTP && l.server != nil {
			shutdownErr := l.server.Shutdown(ctx)
			if shutdownErr != nil {
				stopErrors = append(stopErrors, shutdownErr)
				shutdownCode := lifecycleErrorHTTPShutdownFailed
				if isContextTimeout(shutdownErr) {
					shutdownCode = lifecycleErrorHTTPShutdownTimeout
				}
				l.logError(lifecycleStageShutdown, lifecycleResourceHTTP, shutdownCode)
				if closeErr := l.server.Close(); closeErr != nil {
					stopErrors = append(stopErrors, closeErr)
					l.logError(lifecycleStageShutdown, lifecycleResourceHTTP, lifecycleErrorHTTPForceCloseFailed)
				}
			}
			l.mu.Lock()
			serverDone := l.serverDone
			l.mu.Unlock()
			if serverDone != nil {
				select {
				case <-serverDone:
				case <-ctx.Done():
					if shutdownErr == nil {
						stopErrors = append(stopErrors, ctx.Err())
						l.logError(lifecycleStageWait, lifecycleResourceHTTP, lifecycleErrorHTTPRunCleanupTimeout)
						if closeErr := l.server.Close(); closeErr != nil {
							stopErrors = append(stopErrors, closeErr)
							l.logError(lifecycleStageShutdown, lifecycleResourceHTTP, lifecycleErrorHTTPForceCloseFailed)
						}
					}
				}
			}
		}

		l.mu.Lock()
		startedResources := append([]lifecycleResource(nil), l.startedResources...)
		l.mu.Unlock()
		for i := len(startedResources) - 1; i >= 0; i-- {
			if err := startedResources[i].Stop(ctx); err != nil {
				stopErrors = append(stopErrors, err)
				stopCode := lifecycleErrorResourceStopFailed
				if isContextTimeout(err) {
					stopCode = lifecycleErrorResourceStopTimeout
				}
				l.logError(lifecycleStageStop, startedResources[i].Name(), stopCode)
			}
		}
		l.stopErr = errors.Join(stopErrors...)
		close(l.stopDone)
	})
	<-l.stopDone
	return l.stopErr
}

func (l *adminLifecycle) logError(stage string, resource string, errorCode string) {
	if l == nil || l.logger == nil {
		return
	}
	l.logger.Log(lifecycleLogEvent{
		Level:     lifecycleLogLevelError,
		Stage:     stage,
		Resource:  resource,
		ErrorCode: errorCode,
		Timeout:   l.shutdownTimeout,
	})
}

func isContextTimeout(err error) bool {
	return errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled)
}
