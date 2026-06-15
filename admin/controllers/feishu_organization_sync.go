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

type feishuOrganizationSyncConfigResponse struct {
	Organization string                               `json:"organization"`
	IsConfigured bool                                 `json:"isConfigured"`
	Config       *object.FeishuOrganizationSyncConfig `json:"config"`
}

type feishuOrganizationSyncRunRequest struct {
	Organization string `json:"organization"`
}

type feishuOrganizationSyncRunStartResponse struct {
	RunId             string                            `json:"runId"`
	Run               *object.FeishuOrganizationSyncRun `json:"run"`
	RecoveredStaleRun *object.FeishuOrganizationSyncRun `json:"recoveredStaleRun,omitempty"`
}

// GetFeishuOrganizationSyncConfig
// @router /feishu-org-sync/config [get]
func (c *ApiController) GetFeishuOrganizationSyncConfig() {
	organization, ok := c.resolveFeishuOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireFeishuOrganizationSyncAdmin(organization) {
		return
	}
	config, err := (&object.FeishuOrganizationSyncConfigService{}).GetConfig(organization, true)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newFeishuOrganizationSyncConfigResponse(organization, config))
}

// SaveFeishuOrganizationSyncConfig
// @router /feishu-org-sync/config [post]
func (c *ApiController) SaveFeishuOrganizationSyncConfig() {
	var config object.FeishuOrganizationSyncConfig
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &config); err != nil {
		c.ResponseError(err.Error())
		return
	}
	organization, ok := c.resolveFeishuOrganizationSyncTarget(config.Organization)
	if !ok {
		return
	}
	if !c.requireFeishuOrganizationSyncAdmin(organization) {
		return
	}
	config.Organization = organization
	savedConfig, _, err := (&object.FeishuOrganizationSyncConfigService{}).SaveConfig(&config, true)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newFeishuOrganizationSyncConfigResponse(organization, savedConfig))
}

// TestFeishuOrganizationSyncConfig
// @router /feishu-org-sync/config/test [post]
func (c *ApiController) TestFeishuOrganizationSyncConfig() {
	var config object.FeishuOrganizationSyncConfig
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &config); err != nil {
		c.ResponseError(err.Error())
		return
	}
	organization, ok := c.resolveFeishuOrganizationSyncTarget(config.Organization)
	if !ok {
		return
	}
	if !c.requireFeishuOrganizationSyncAdmin(organization) {
		return
	}
	config.Organization = organization
	result, err := (&object.FeishuOrganizationSyncConfigService{}).TestConnection(c.Ctx.Request.Context(), &config)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// StartFeishuOrganizationSyncRun
// @router /feishu-org-sync/runs [post]
func (c *ApiController) StartFeishuOrganizationSyncRun() {
	var request feishuOrganizationSyncRunRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}
	organization, ok := c.resolveFeishuOrganizationSyncTarget(request.Organization)
	if !ok {
		return
	}
	if !c.requireFeishuOrganizationSyncAdmin(organization) {
		return
	}
	config, err := object.GetFeishuOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if config == nil {
		c.ResponseError("feishu organization sync config is not configured")
		return
	}
	if !config.IsEnabled {
		c.ResponseError("feishu organization sync config is disabled")
		return
	}
	result, err := (&object.FeishuOrganizationSyncService{}).StartManualRunAsync(config, c.GetSessionUsername())
	if err != nil {
		if errors.Is(err, object.ErrFeishuOrganizationSyncRunAlreadyRunning) {
			c.ResponseError("feishu organization sync run is already running")
			return
		}
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newFeishuOrganizationSyncRunStartResponse(result, config.AppSecret))
}

// GetFeishuOrganizationSyncRuns
// @router /feishu-org-sync/runs [get]
func (c *ApiController) GetFeishuOrganizationSyncRuns() {
	organization, ok := c.resolveFeishuOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireFeishuOrganizationSyncAdmin(organization) {
		return
	}
	limit := c.Ctx.Input.Query("pageSize")
	page := c.Ctx.Input.Query("p")
	field := c.Ctx.Input.Query("field")
	value := c.Ctx.Input.Query("value")
	sortField := c.Ctx.Input.Query("sortField")
	sortOrder := c.Ctx.Input.Query("sortOrder")
	secret := c.getFeishuOrganizationSyncSecretForMasking(organization)
	service := &object.FeishuOrganizationSyncService{}
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

// GetFeishuOrganizationSyncRun
// @router /feishu-org-sync/runs/:runId [get]
func (c *ApiController) GetFeishuOrganizationSyncRun() {
	organization, ok := c.resolveFeishuOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireFeishuOrganizationSyncAdmin(organization) {
		return
	}
	run, err := (&object.FeishuOrganizationSyncService{}).GetRun(organization, c.Ctx.Input.Param(":runId"), c.getFeishuOrganizationSyncSecretForMasking(organization))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(run)
}

func newFeishuOrganizationSyncConfigResponse(organization string, config *object.FeishuOrganizationSyncConfig) *feishuOrganizationSyncConfigResponse {
	if config == nil {
		config = &object.FeishuOrganizationSyncConfig{
			Owner:        organization,
			Name:         object.FeishuOrganizationSyncDefaultConfigName,
			Organization: organization,
			EndpointMode: object.FeishuEndpointModeDomestic,
		}
		object.AttachFeishuOrganizationSyncScheduleFieldsForResponse(config, nil)
		return &feishuOrganizationSyncConfigResponse{Organization: organization, IsConfigured: false, Config: config}
	}
	return &feishuOrganizationSyncConfigResponse{Organization: organization, IsConfigured: true, Config: config}
}

func newFeishuOrganizationSyncRunStartResponse(result *object.FeishuOrganizationSyncStartRunResult, sensitiveValues ...string) *feishuOrganizationSyncRunStartResponse {
	if result == nil {
		return &feishuOrganizationSyncRunStartResponse{}
	}
	run := object.GetMaskedFeishuOrganizationSyncRun(result.Run, sensitiveValues...)
	staleRun := object.GetMaskedFeishuOrganizationSyncRun(result.StaleRun, sensitiveValues...)
	response := &feishuOrganizationSyncRunStartResponse{Run: run, RecoveredStaleRun: staleRun}
	if run != nil {
		response.RunId = run.Name
	}
	return response
}

func (c *ApiController) resolveFeishuOrganizationSyncTarget(explicitOrganization string) (string, bool) {
	isGlobalAdmin, user := c.isGlobalAdmin()
	organization, err := resolveFeishuOrganizationSyncTarget(explicitOrganization, user, isGlobalAdmin)
	if err != nil {
		c.ResponseError(err.Error())
		return "", false
	}
	return organization, true
}

func resolveFeishuOrganizationSyncTarget(explicitOrganization string, user *object.User, isGlobalAdmin bool) (string, error) {
	organization := strings.TrimSpace(explicitOrganization)
	if organization != "" {
		return organization, nil
	}
	if user != nil && user.IsAdmin && !isGlobalAdmin && user.Owner != "" {
		return user.Owner, nil
	}
	return "", errors.New("feishu organization sync organization is required")
}

func (c *ApiController) requireFeishuOrganizationSyncAdmin(organization string) bool {
	isGlobalAdmin, user := c.isGlobalAdmin()
	if isFeishuOrganizationSyncAdmin(user, isGlobalAdmin, organization) {
		return true
	}
	c.ResponseError(c.T("auth:Unauthorized operation"))
	return false
}

func isFeishuOrganizationSyncAdmin(user *object.User, isGlobalAdmin bool, organization string) bool {
	if isGlobalAdmin {
		return true
	}
	return user != nil && user.IsAdmin && user.Owner == organization
}

func (c *ApiController) getFeishuOrganizationSyncSecretForMasking(organization string) string {
	config, err := object.GetFeishuOrganizationSyncConfigByOrganization(organization)
	if err != nil || config == nil {
		return ""
	}
	return config.AppSecret
}
