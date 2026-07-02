// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package controllers

import (
	"encoding/json"
	"errors"
	"strings"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/beego/beego/v2/core/utils/pagination"
)

type dingTalkOrganizationSyncConfigResponse struct {
	Organization              string                                    `json:"organization"`
	IsConfigured              bool                                      `json:"isConfigured"`
	Config                    *object.DingTalkOrganizationSyncConfig    `json:"config"`
	DefaultOrganization       string                                    `json:"defaultOrganization,omitempty"`
	DefaultOrganizationSource string                                    `json:"defaultOrganizationSource,omitempty"`
	ConflictingProvider       string                                    `json:"conflictingProvider,omitempty"`
	ConflictingOrganization   string                                    `json:"conflictingOrganization,omitempty"`
	ConflictingConfigured     bool                                      `json:"conflictingConfigured"`
	ConflictingEnabled        bool                                      `json:"conflictingEnabled"`
	ConflictingOrganizations  []string                                  `json:"conflictingOrganizations,omitempty"`
	SourceStatus              *object.OrganizationDirectorySourceStatus `json:"sourceStatus,omitempty"`
}

type dingTalkOrganizationSyncRunRequest struct {
	Organization string `json:"organization"`
}

type dingTalkOrganizationSyncRunStartResponse struct {
	RunId             string                              `json:"runId"`
	Run               *object.DingTalkOrganizationSyncRun `json:"run"`
	RecoveredStaleRun *object.DingTalkOrganizationSyncRun `json:"recoveredStaleRun,omitempty"`
}

// GetDingTalkOrganizationSyncConfig 返回目标组织的钉钉同步配置、调度摘要和来源占用状态。
// @router /dingtalk-org-sync/config [get]
func (c *ApiController) GetDingTalkOrganizationSyncConfig() {
	service := &object.DingTalkOrganizationSyncConfigService{}
	organization, sourceStatus, ok := c.resolveDingTalkOrganizationSyncConfigTarget(c.Ctx.Input.Query("organization"), service)
	if !ok {
		return
	}
	if organization != "" && !c.requireDingTalkOrganizationSyncAdmin(organization) {
		return
	}
	if organization == "" {
		c.ResponseOk(newDingTalkOrganizationSyncConfigResponse(organization, nil, sourceStatus))
		return
	}
	config, err := service.GetConfig(organization, true)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newDingTalkOrganizationSyncConfigResponse(organization, config, sourceStatus))
}

// SaveDingTalkOrganizationSyncConfig 保存钉钉同步配置，并通过服务层执行单来源守卫。
// @router /dingtalk-org-sync/config [post]
func (c *ApiController) SaveDingTalkOrganizationSyncConfig() {
	var config object.DingTalkOrganizationSyncConfig
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &config); err != nil {
		c.ResponseError(err.Error())
		return
	}
	organization, ok := c.resolveDingTalkOrganizationSyncTarget(config.Organization)
	if !ok {
		return
	}
	if !c.requireDingTalkOrganizationSyncAdmin(organization) {
		return
	}
	config.Organization = organization
	savedConfig, _, err := (&object.DingTalkOrganizationSyncConfigService{}).SaveConfig(&config, true)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	resolvedOrganization := organization
	if savedConfig != nil && savedConfig.Organization != "" {
		resolvedOrganization = savedConfig.Organization
	}
	sourceStatus, err := (&object.DingTalkOrganizationSyncConfigService{}).GetSourceStatus(resolvedOrganization)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newDingTalkOrganizationSyncConfigResponse(resolvedOrganization, savedConfig, sourceStatus))
}

// TestDingTalkOrganizationSyncConfig 验证钉钉通讯录读取权限，不创建同步 run。
// @router /dingtalk-org-sync/config/test [post]
func (c *ApiController) TestDingTalkOrganizationSyncConfig() {
	var config object.DingTalkOrganizationSyncConfig
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &config); err != nil {
		c.ResponseError(err.Error())
		return
	}
	organization, ok := c.resolveDingTalkOrganizationSyncTarget(config.Organization)
	if !ok {
		return
	}
	if !c.requireDingTalkOrganizationSyncAdmin(organization) {
		return
	}
	config.Organization = organization
	result, err := (&object.DingTalkOrganizationSyncConfigService{}).TestConnection(c.Ctx.Request.Context(), &config)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// StartDingTalkOrganizationSyncRun 为目标组织创建一次手动钉钉全量差异同步 run。
// @router /dingtalk-org-sync/runs [post]
func (c *ApiController) StartDingTalkOrganizationSyncRun() {
	var request dingTalkOrganizationSyncRunRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}
	organization, ok := c.resolveDingTalkOrganizationSyncTarget(request.Organization)
	if !ok {
		return
	}
	if !c.requireDingTalkOrganizationSyncAdmin(organization) {
		return
	}
	config, err := object.GetDingTalkOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if config == nil {
		c.ResponseError("dingtalk organization sync config is not configured")
		return
	}
	if !config.IsEnabled {
		c.ResponseError("dingtalk organization sync config is disabled")
		return
	}
	result, err := (&object.DingTalkOrganizationSyncService{}).StartManualRunAsync(config, c.GetSessionUsername())
	if err != nil {
		if errors.Is(err, object.ErrDingTalkOrganizationSyncRunAlreadyRunning) {
			c.ResponseError("dingtalk organization sync run is already running")
			return
		}
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newDingTalkOrganizationSyncRunStartResponse(result, config.AppSecret))
}

// GetDingTalkOrganizationSyncRuns 查询钉钉同步 run 列表，并返回脱敏错误摘要。
// @router /dingtalk-org-sync/runs [get]
func (c *ApiController) GetDingTalkOrganizationSyncRuns() {
	organization, ok := c.resolveDingTalkOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireDingTalkOrganizationSyncAdmin(organization) {
		return
	}
	limit := c.Ctx.Input.Query("pageSize")
	page := c.Ctx.Input.Query("p")
	field := c.Ctx.Input.Query("field")
	value := c.Ctx.Input.Query("value")
	sortField := c.Ctx.Input.Query("sortField")
	sortOrder := c.Ctx.Input.Query("sortOrder")
	secret := c.getDingTalkOrganizationSyncSecretForMasking(organization)
	service := &object.DingTalkOrganizationSyncService{}
	if limit == "" || page == "" {
		runs, _, err := service.GetRuns(organization, -1, -1, field, value, sortField, sortOrder, secret)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		c.ResponseOk(runs)
		return
	}
	limitNumber := util.ParseInt(limit)
	count, err := service.GetRunCount(organization, field, value)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	paginator := pagination.NewPaginator(c.Ctx.Request, limitNumber, count)
	runs, _, err := service.GetRuns(organization, paginator.Offset(), limitNumber, field, value, sortField, sortOrder, secret)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(runs, paginator.Nums())
}

// GetDingTalkOrganizationSyncRun 查询单个钉钉同步 run，并返回脱敏错误摘要。
// @router /dingtalk-org-sync/runs/:runId [get]
func (c *ApiController) GetDingTalkOrganizationSyncRun() {
	organization, ok := c.resolveDingTalkOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireDingTalkOrganizationSyncAdmin(organization) {
		return
	}
	run, err := (&object.DingTalkOrganizationSyncService{}).GetRun(organization, c.Ctx.Input.Param(":runId"), c.getDingTalkOrganizationSyncSecretForMasking(organization))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(run)
}

func newDingTalkOrganizationSyncConfigResponse(organization string, config *object.DingTalkOrganizationSyncConfig, sourceStatuses ...*object.OrganizationSyncSourceConflictStatus) *dingTalkOrganizationSyncConfigResponse {
	sourceStatus := firstDingTalkOrganizationSyncSourceStatus(sourceStatuses...)
	if config == nil {
		config = &object.DingTalkOrganizationSyncConfig{
			Owner:        organization,
			Name:         object.DingTalkOrganizationSyncDefaultConfigName,
			Organization: organization,
		}
		object.AttachDingTalkOrganizationSyncScheduleFieldsForResponse(config, nil)
		response := &dingTalkOrganizationSyncConfigResponse{Organization: organization, IsConfigured: false, Config: config}
		applyDingTalkOrganizationSyncSourceStatus(response, sourceStatus)
		return response
	}
	response := &dingTalkOrganizationSyncConfigResponse{Organization: organization, IsConfigured: true, Config: config}
	applyDingTalkOrganizationSyncSourceStatus(response, sourceStatus)
	return response
}

func firstDingTalkOrganizationSyncSourceStatus(sourceStatuses ...*object.OrganizationSyncSourceConflictStatus) *object.OrganizationSyncSourceConflictStatus {
	if len(sourceStatuses) == 0 {
		return nil
	}
	return sourceStatuses[0]
}

func applyDingTalkOrganizationSyncSourceStatus(response *dingTalkOrganizationSyncConfigResponse, sourceStatus *object.OrganizationSyncSourceConflictStatus) {
	if response == nil || sourceStatus == nil {
		return
	}
	response.DefaultOrganization = sourceStatus.DefaultOrganization
	response.DefaultOrganizationSource = sourceStatus.DefaultOrganizationSource
	response.ConflictingProvider = sourceStatus.ConflictingProvider
	response.ConflictingOrganization = sourceStatus.ConflictingOrganization
	response.ConflictingConfigured = sourceStatus.ConflictingConfigured
	response.ConflictingEnabled = sourceStatus.ConflictingEnabled
	response.ConflictingOrganizations = sourceStatus.ConflictingOrganizations
	response.SourceStatus = sourceStatus.SourceStatus
}

func newDingTalkOrganizationSyncRunStartResponse(result *object.DingTalkOrganizationSyncStartRunResult, sensitiveValues ...string) *dingTalkOrganizationSyncRunStartResponse {
	if result == nil {
		return &dingTalkOrganizationSyncRunStartResponse{}
	}
	run := object.GetMaskedDingTalkOrganizationSyncRun(result.Run, sensitiveValues...)
	staleRun := object.GetMaskedDingTalkOrganizationSyncRun(result.StaleRun, sensitiveValues...)
	response := &dingTalkOrganizationSyncRunStartResponse{Run: run, RecoveredStaleRun: staleRun}
	if run != nil {
		response.RunId = run.Name
	}
	return response
}

func (c *ApiController) resolveDingTalkOrganizationSyncTarget(explicitOrganization string) (string, bool) {
	isGlobalAdmin, user := c.isGlobalAdmin()
	organization, err := resolveDingTalkOrganizationSyncTarget(explicitOrganization, user, isGlobalAdmin)
	if err != nil {
		c.ResponseError(err.Error())
		return "", false
	}
	return organization, true
}

func (c *ApiController) resolveDingTalkOrganizationSyncConfigTarget(explicitOrganization string, service *object.DingTalkOrganizationSyncConfigService) (string, *object.OrganizationSyncSourceConflictStatus, bool) {
	isGlobalAdmin, user := c.isGlobalAdmin()
	organization := strings.TrimSpace(explicitOrganization)
	if organization == "" && isGlobalAdmin {
		sourceStatus, err := service.GetSourceStatus("")
		if err != nil {
			c.ResponseError(err.Error())
			return "", nil, false
		}
		return sourceStatus.DefaultOrganization, sourceStatus, true
	}

	resolvedOrganization, err := resolveDingTalkOrganizationSyncTarget(organization, user, isGlobalAdmin)
	if err != nil {
		c.ResponseError(err.Error())
		return "", nil, false
	}
	sourceStatus, err := service.GetSourceStatus(resolvedOrganization)
	if err != nil {
		c.ResponseError(err.Error())
		return "", nil, false
	}
	return resolvedOrganization, sourceStatus, true
}

func resolveDingTalkOrganizationSyncTarget(explicitOrganization string, user *object.User, isGlobalAdmin bool) (string, error) {
	organization := strings.TrimSpace(explicitOrganization)
	if organization != "" {
		return organization, nil
	}
	if user != nil && user.IsAdmin && !isGlobalAdmin && user.Owner != "" {
		return user.Owner, nil
	}
	return "", errors.New("dingtalk organization sync organization is required")
}

func (c *ApiController) requireDingTalkOrganizationSyncAdmin(organization string) bool {
	isGlobalAdmin, user := c.isGlobalAdmin()
	if isDingTalkOrganizationSyncAdmin(user, isGlobalAdmin, organization) {
		return true
	}
	c.ResponseError(c.T("auth:Unauthorized operation"))
	return false
}

func isDingTalkOrganizationSyncAdmin(user *object.User, isGlobalAdmin bool, organization string) bool {
	if isGlobalAdmin {
		return true
	}
	return user != nil && user.IsAdmin && user.Owner == organization
}

func (c *ApiController) getDingTalkOrganizationSyncSecretForMasking(organization string) string {
	config, err := object.GetDingTalkOrganizationSyncConfigByOrganization(organization)
	if err != nil || config == nil {
		return ""
	}
	return config.AppSecret
}
