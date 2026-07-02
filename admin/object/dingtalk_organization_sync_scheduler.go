// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"errors"
)

// DingTalkOrganizationScheduledSyncExecutor 将通用调度 fire 派发到钉钉全量差异同步。
type DingTalkOrganizationScheduledSyncExecutor struct {
	ConfigStore       DingTalkOrganizationSyncConfigStore
	WecomConfigStore  WecomOrganizationSyncConfigStore
	FeishuConfigStore FeishuOrganizationSyncConfigStore
	SyncService       *DingTalkOrganizationSyncService
}

func init() {
	RegisterOrganizationSyncExecutor(OrganizationSyncProviderDingTalk, OrganizationSyncJobTypeFullDifferential, &DingTalkOrganizationScheduledSyncExecutor{})
}

// ExecuteOrganizationSync 校验钉钉配置和统一来源状态后派发调度同步 run。
func (e *DingTalkOrganizationScheduledSyncExecutor) ExecuteOrganizationSync(ctx context.Context, request OrganizationSyncDispatchRequest) (*OrganizationSyncDispatchResult, error) {
	if request.Schedule == nil {
		return nil, errors.New("dingtalk scheduled sync schedule is required")
	}
	config, err := e.configStore().GetDingTalkOrganizationSyncConfigByOrganization(request.Schedule.Organization)
	if err != nil {
		return nil, err
	}
	if config == nil {
		return newDingTalkOrganizationSyncDispatchResult(OrganizationSyncScheduleFireStatusFailed, "", "config_missing", "dingtalk organization sync config is not configured"), nil
	}
	if !config.IsEnabled {
		return newDingTalkOrganizationSyncDispatchResult(OrganizationSyncScheduleFireStatusSkipped, "", "config_disabled", "dingtalk organization sync config is disabled"), nil
	}
	service := e.syncService()
	if service.WecomConfigStore == nil {
		service.WecomConfigStore = e.wecomConfigStore()
	}
	if service.FeishuConfigStore == nil {
		service.FeishuConfigStore = e.feishuConfigStore()
	}
	result, err := service.StartScheduledRunAsync(config, request.Actor)
	if errors.Is(err, ErrDingTalkOrganizationSyncRunAlreadyRunning) {
		return e.alreadyRunningResult(config.Organization)
	}
	var sourceConflict *OrganizationSyncSourceConflictError
	if errors.As(err, &sourceConflict) {
		return newDingTalkOrganizationSyncDispatchResult(OrganizationSyncScheduleFireStatusSkipped, "", OrganizationSyncScheduleFireErrorSourceConflict, err.Error()), nil
	}
	var sourceDecision *OrganizationDirectorySourceDecisionError
	if errors.As(err, &sourceDecision) {
		return newDingTalkOrganizationSyncDispatchResult(OrganizationSyncScheduleFireStatusSkipped, "", string(sourceDecision.ReasonCode), err.Error()), nil
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

func (e *DingTalkOrganizationScheduledSyncExecutor) alreadyRunningResult(organization string) (*OrganizationSyncDispatchResult, error) {
	result := &OrganizationSyncDispatchResult{
		Status:    OrganizationSyncScheduleFireStatusSkipped,
		ErrorCode: OrganizationSyncScheduleFireErrorAlreadyRunning,
		ErrorText: "dingtalk organization sync run already running",
	}
	runningRun, err := e.syncService().runStore().GetRunningDingTalkOrganizationSyncRun(organization)
	if err != nil {
		return nil, err
	}
	if runningRun != nil {
		result.RunId = runningRun.Name
	}
	return result, nil
}

func newDingTalkOrganizationSyncDispatchResult(status OrganizationSyncScheduleFireStatus, runId string, errorCode string, errorText string) *OrganizationSyncDispatchResult {
	return &OrganizationSyncDispatchResult{
		Status:    status,
		RunId:     runId,
		ErrorCode: errorCode,
		ErrorText: errorText,
	}
}

func (e *DingTalkOrganizationScheduledSyncExecutor) configStore() DingTalkOrganizationSyncConfigStore {
	if e != nil && e.ConfigStore != nil {
		return e.ConfigStore
	}
	return defaultDingTalkOrganizationSyncConfigStore{}
}

func (e *DingTalkOrganizationScheduledSyncExecutor) wecomConfigStore() WecomOrganizationSyncConfigStore {
	if e != nil && e.WecomConfigStore != nil {
		return e.WecomConfigStore
	}
	return defaultWecomOrganizationSyncConfigStore{}
}

func (e *DingTalkOrganizationScheduledSyncExecutor) feishuConfigStore() FeishuOrganizationSyncConfigStore {
	if e != nil && e.FeishuConfigStore != nil {
		return e.FeishuConfigStore
	}
	return defaultFeishuOrganizationSyncConfigStore{}
}

func (e *DingTalkOrganizationScheduledSyncExecutor) syncService() *DingTalkOrganizationSyncService {
	if e != nil && e.SyncService != nil {
		return e.SyncService
	}
	return &DingTalkOrganizationSyncService{}
}
