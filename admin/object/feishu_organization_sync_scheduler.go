// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"errors"
)

// FeishuOrganizationScheduledSyncExecutor 将通用调度 fire 派发到飞书/Lark 全量差异同步。
type FeishuOrganizationScheduledSyncExecutor struct {
	ConfigStore FeishuOrganizationSyncConfigStore
	SyncService *FeishuOrganizationSyncService
}

func init() {
	RegisterOrganizationSyncExecutor(OrganizationSyncProviderLark, OrganizationSyncJobTypeFullDifferential, &FeishuOrganizationScheduledSyncExecutor{})
}

func (e *FeishuOrganizationScheduledSyncExecutor) ExecuteOrganizationSync(ctx context.Context, request OrganizationSyncDispatchRequest) (*OrganizationSyncDispatchResult, error) {
	if request.Schedule == nil {
		return nil, errors.New("feishu scheduled sync schedule is required")
	}
	config, err := e.configStore().GetFeishuOrganizationSyncConfigByOrganization(request.Schedule.Organization)
	if err != nil {
		return nil, err
	}
	if config == nil {
		return newFeishuOrganizationSyncDispatchResult(OrganizationSyncScheduleFireStatusFailed, "", "config_missing", "feishu organization sync config is not configured"), nil
	}
	if !config.IsEnabled {
		return newFeishuOrganizationSyncDispatchResult(OrganizationSyncScheduleFireStatusSkipped, "", "config_disabled", "feishu organization sync config is disabled"), nil
	}
	result, err := e.syncService().StartScheduledRunAsync(config, request.Actor)
	if errors.Is(err, ErrFeishuOrganizationSyncRunAlreadyRunning) {
		return e.alreadyRunningResult(config.Organization)
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

func (e *FeishuOrganizationScheduledSyncExecutor) alreadyRunningResult(organization string) (*OrganizationSyncDispatchResult, error) {
	result := &OrganizationSyncDispatchResult{
		Status:    OrganizationSyncScheduleFireStatusSkipped,
		ErrorCode: OrganizationSyncScheduleFireErrorAlreadyRunning,
		ErrorText: "feishu organization sync run already running",
	}
	runningRun, err := e.syncService().runStore().GetRunningFeishuOrganizationSyncRun(organization)
	if err != nil {
		return nil, err
	}
	if runningRun != nil {
		result.RunId = runningRun.Name
	}
	result.Diagnostics = BuildFeishuOrganizationSyncScheduleDiagnostics(&OrganizationSyncScheduleFire{
		Status:    result.Status,
		RunId:     result.RunId,
		ErrorCode: result.ErrorCode,
		ErrorText: result.ErrorText,
	})
	return result, nil
}

func newFeishuOrganizationSyncDispatchResult(status OrganizationSyncScheduleFireStatus, runId string, errorCode string, errorText string) *OrganizationSyncDispatchResult {
	result := &OrganizationSyncDispatchResult{
		Status:    status,
		RunId:     runId,
		ErrorCode: errorCode,
		ErrorText: errorText,
	}
	result.Diagnostics = BuildFeishuOrganizationSyncScheduleDiagnostics(&OrganizationSyncScheduleFire{
		Status:    result.Status,
		RunId:     result.RunId,
		ErrorCode: result.ErrorCode,
		ErrorText: result.ErrorText,
	})
	return result
}

func (e *FeishuOrganizationScheduledSyncExecutor) configStore() FeishuOrganizationSyncConfigStore {
	if e != nil && e.ConfigStore != nil {
		return e.ConfigStore
	}
	return defaultFeishuOrganizationSyncConfigStore{}
}

func (e *FeishuOrganizationScheduledSyncExecutor) syncService() *FeishuOrganizationSyncService {
	if e != nil && e.SyncService != nil {
		return e.SyncService
	}
	return &FeishuOrganizationSyncService{}
}
