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
)

// WecomOrganizationScheduledSyncExecutor 将通用调度 fire 派发到企业微信全量差异同步。
type WecomOrganizationScheduledSyncExecutor struct {
	ConfigStore       WecomOrganizationSyncConfigStore
	FeishuConfigStore FeishuOrganizationSyncConfigStore
	SyncService       *WecomOrganizationSyncService
}

func init() {
	RegisterOrganizationSyncExecutor(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, &WecomOrganizationScheduledSyncExecutor{})
}

func (e *WecomOrganizationScheduledSyncExecutor) ExecuteOrganizationSync(ctx context.Context, request OrganizationSyncDispatchRequest) (*OrganizationSyncDispatchResult, error) {
	if request.Schedule == nil {
		return nil, errors.New("wecom scheduled sync schedule is required")
	}
	config, err := e.configStore().GetWecomOrganizationSyncConfigByOrganization(request.Schedule.Organization)
	if err != nil {
		return nil, err
	}
	if config == nil {
		return &OrganizationSyncDispatchResult{
			Status:    OrganizationSyncScheduleFireStatusFailed,
			ErrorCode: "config_missing",
			ErrorText: "wecom organization sync config is not configured",
		}, nil
	}
	if !config.IsEnabled {
		return &OrganizationSyncDispatchResult{
			Status:    OrganizationSyncScheduleFireStatusSkipped,
			ErrorCode: "config_disabled",
			ErrorText: "wecom organization sync config is disabled",
		}, nil
	}

	service := e.syncService()
	if service.FeishuConfigStore == nil {
		service.FeishuConfigStore = e.feishuConfigStore()
	}
	result, err := service.StartScheduledRunAsync(config, request.Actor)
	if errors.Is(err, ErrWecomOrganizationSyncRunAlreadyRunning) {
		return e.alreadyRunningResult(config.Organization)
	}
	var sourceConflict *OrganizationSyncSourceConflictError
	if errors.As(err, &sourceConflict) {
		return &OrganizationSyncDispatchResult{
			Status:    OrganizationSyncScheduleFireStatusSkipped,
			ErrorCode: OrganizationSyncScheduleFireErrorSourceConflict,
			ErrorText: err.Error(),
		}, nil
	}
	var sourceDecision *OrganizationDirectorySourceDecisionError
	if errors.As(err, &sourceDecision) {
		return &OrganizationSyncDispatchResult{
			Status:    OrganizationSyncScheduleFireStatusSkipped,
			ErrorCode: string(sourceDecision.ReasonCode),
			ErrorText: err.Error(),
		}, nil
	}
	if err != nil {
		return nil, err
	}
	dispatchResult := &OrganizationSyncDispatchResult{Status: OrganizationSyncScheduleFireStatusDispatched}
	if result != nil && result.Run != nil {
		dispatchResult.RunId = result.Run.Name
	}
	return dispatchResult, nil
}

func (e *WecomOrganizationScheduledSyncExecutor) alreadyRunningResult(organization string) (*OrganizationSyncDispatchResult, error) {
	result := &OrganizationSyncDispatchResult{
		Status:    OrganizationSyncScheduleFireStatusSkipped,
		ErrorCode: OrganizationSyncScheduleFireErrorAlreadyRunning,
		ErrorText: "wecom organization sync run already running",
	}
	runningRun, err := e.syncService().runStore().GetRunningWecomOrganizationSyncRun(organization)
	if err != nil {
		return nil, err
	}
	if runningRun != nil {
		result.RunId = runningRun.Name
	}
	return result, nil
}

func (e *WecomOrganizationScheduledSyncExecutor) configStore() WecomOrganizationSyncConfigStore {
	if e != nil && e.ConfigStore != nil {
		return e.ConfigStore
	}
	return defaultWecomOrganizationSyncConfigStore{}
}

func (e *WecomOrganizationScheduledSyncExecutor) feishuConfigStore() FeishuOrganizationSyncConfigStore {
	if e != nil && e.FeishuConfigStore != nil {
		return e.FeishuConfigStore
	}
	return defaultFeishuOrganizationSyncConfigStore{}
}

func (e *WecomOrganizationScheduledSyncExecutor) syncService() *WecomOrganizationSyncService {
	if e != nil && e.SyncService != nil {
		return e.SyncService
	}
	return &WecomOrganizationSyncService{}
}
