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

package controllers

import (
	"encoding/json"
	"errors"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/beego/beego/v2/core/utils/pagination"
)

type wecomOrganizationSyncConfigResponse struct {
	Organization              string                                    `json:"organization"`
	IsConfigured              bool                                      `json:"isConfigured"`
	Config                    *object.WecomOrganizationSyncConfig       `json:"config"`
	DefaultOrganization       string                                    `json:"defaultOrganization,omitempty"`
	DefaultOrganizationSource string                                    `json:"defaultOrganizationSource,omitempty"`
	ConflictingProvider       string                                    `json:"conflictingProvider,omitempty"`
	ConflictingOrganization   string                                    `json:"conflictingOrganization,omitempty"`
	ConflictingConfigured     bool                                      `json:"conflictingConfigured"`
	ConflictingEnabled        bool                                      `json:"conflictingEnabled"`
	ConflictingOrganizations  []string                                  `json:"conflictingOrganizations,omitempty"`
	SourceStatus              *object.OrganizationDirectorySourceStatus `json:"sourceStatus,omitempty"`
}

type wecomOrganizationSyncRunRequest struct {
	Organization string `json:"organization"`
}

type wecomOrganizationSyncDryRunPreviewRequest struct {
	Organization string `json:"organization"`
}

type wecomOrganizationSyncRunStartResponse struct {
	RunId             string                           `json:"runId"`
	Run               *object.WecomOrganizationSyncRun `json:"run"`
	RecoveredStaleRun *object.WecomOrganizationSyncRun `json:"recoveredStaleRun,omitempty"`
}

// GetWecomOrganizationSyncConfig
// @Title GetWecomOrganizationSyncConfig
// @Tag WeCom Organization Sync API
// @Description get WeCom organization sync config
// @Param   organization     query    string  true        "The target organization"
// @Success 200 {object} controllers.Response The Response object
// @router /wecom-org-sync/config [get]
func (c *ApiController) GetWecomOrganizationSyncConfig() {
	service := &object.WecomOrganizationSyncConfigService{}
	organization, sourceStatus, ok := c.resolveWecomOrganizationSyncConfigTarget(c.Ctx.Input.Query("organization"), service)
	if !ok {
		return
	}
	if organization != "" && !c.requireWecomOrganizationSyncAdmin(organization) {
		return
	}

	if organization == "" {
		c.ResponseOk(newWecomOrganizationSyncConfigResponse(organization, nil, sourceStatus))
		return
	}

	config, err := service.GetConfig(organization, true)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newWecomOrganizationSyncConfigResponse(organization, config, sourceStatus))
}

// SaveWecomOrganizationSyncConfig
// @Title SaveWecomOrganizationSyncConfig
// @Tag WeCom Organization Sync API
// @Description save WeCom organization sync config
// @Param   body    body   object.WecomOrganizationSyncConfig  true        "The WeCom organization sync config"
// @Success 200 {object} controllers.Response The Response object
// @router /wecom-org-sync/config [post]
func (c *ApiController) SaveWecomOrganizationSyncConfig() {
	var config object.WecomOrganizationSyncConfig
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &config)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	organization, ok := c.resolveWecomOrganizationSyncTarget(config.Organization)
	if !ok {
		return
	}
	if !c.requireWecomOrganizationSyncAdmin(organization) {
		return
	}

	config.Organization = organization
	savedConfig, _, err := (&object.WecomOrganizationSyncConfigService{}).SaveConfig(&config, true)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	resolvedOrganization := organization
	if savedConfig != nil && savedConfig.Organization != "" {
		resolvedOrganization = savedConfig.Organization
	}
	sourceStatus, err := (&object.WecomOrganizationSyncConfigService{}).GetSourceStatus(resolvedOrganization)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newWecomOrganizationSyncConfigResponse(resolvedOrganization, savedConfig, sourceStatus))
}

// TestWecomOrganizationSyncConfig
// @Title TestWecomOrganizationSyncConfig
// @Tag WeCom Organization Sync API
// @Description test WeCom organization sync config
// @Param   body    body   object.WecomOrganizationSyncConfig  true        "The WeCom organization sync config"
// @Success 200 {object} object.WecomAddressBookConnectionTestResult The connection test result
// @router /wecom-org-sync/config/test [post]
func (c *ApiController) TestWecomOrganizationSyncConfig() {
	var config object.WecomOrganizationSyncConfig
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &config)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	organization, ok := c.resolveWecomOrganizationSyncTarget(config.Organization)
	if !ok {
		return
	}
	if !c.requireWecomOrganizationSyncAdmin(organization) {
		return
	}

	config.Organization = organization
	result, err := (&object.WecomOrganizationSyncConfigService{}).TestConnection(c.Ctx.Request.Context(), &config)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// StartWecomOrganizationSyncRun
// @Title StartWecomOrganizationSyncRun
// @Tag WeCom Organization Sync API
// @Description start a WeCom organization sync run
// @Param   body    body   controllers.wecomOrganizationSyncRunRequest  true        "The target organization"
// @Success 200 {object} controllers.Response The Response object
// @router /wecom-org-sync/runs [post]
func (c *ApiController) StartWecomOrganizationSyncRun() {
	var request wecomOrganizationSyncRunRequest
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &request)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	organization, ok := c.resolveWecomOrganizationSyncTarget(request.Organization)
	if !ok {
		return
	}
	if !c.requireWecomOrganizationSyncAdmin(organization) {
		return
	}

	config, err := object.GetWecomOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if config == nil {
		c.ResponseError("wecom organization sync config is not configured")
		return
	}
	if !config.IsEnabled {
		c.ResponseError("wecom organization sync config is disabled")
		return
	}

	// 手动触发接口只负责创建 run 并快速返回，真实全量同步在后台执行并写回 run 终态。
	result, err := (&object.WecomOrganizationSyncService{}).StartManualRunAsync(config, c.GetSessionUsername())
	if err != nil {
		if errors.Is(err, object.ErrWecomOrganizationSyncRunAlreadyRunning) {
			c.ResponseError("wecom organization sync run is already running")
			return
		}
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newWecomOrganizationSyncRunStartResponse(result, config.AddressBookSecret))
}

// DryRunWecomOrganizationSyncPreview
// @Title DryRunWecomOrganizationSyncPreview
// @Tag WeCom Organization Sync API
// @Description 预览企业微信组织同步影响，不写入本地组织主数据
// @Param   body    body   controllers.wecomOrganizationSyncDryRunPreviewRequest  true        "目标组织"
// @Success 200 {object} object.WecomOrganizationSyncDryRunPreview 响应对象
// @router /wecom-org-sync/dry-run-preview [post]
func (c *ApiController) DryRunWecomOrganizationSyncPreview() {
	var request wecomOrganizationSyncDryRunPreviewRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}

	organization, ok := c.resolveWecomOrganizationSyncTarget(request.Organization)
	if !ok {
		return
	}
	if !c.requireWecomOrganizationSyncAdmin(organization) {
		return
	}

	config, err := object.GetWecomOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if config == nil {
		c.ResponseError("wecom organization sync config is not configured")
		return
	}

	preview, err := (&object.WecomOrganizationSyncDryRunPreviewService{
		Operator:      c.GetSessionUsername(),
		RequestMarker: c.getWecomOrganizationSyncRequestMarker(),
	}).Preview(c.Ctx.Request.Context(), config)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(preview)
}

// GetWecomOrganizationSyncDryRunHistories
// @Title GetWecomOrganizationSyncDryRunHistories
// @Tag WeCom Organization Sync API
// @Description 查询企业微信组织同步 dry-run 预览历史
// @Param   organization     query    string  true        "目标组织"
// @Success 200 {array} object.WecomOrganizationSyncDryRunHistory 响应对象
// @router /wecom-org-sync/dry-run-history [get]
func (c *ApiController) GetWecomOrganizationSyncDryRunHistories() {
	organization, ok := c.resolveWecomOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireWecomOrganizationSyncAdmin(organization) {
		return
	}
	filter, err := c.getWecomOrganizationSyncDryRunHistoryFilter(organization)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	histories, count, err := (&object.WecomOrganizationSyncDryRunHistoryService{}).GetHistories(filter)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if filter.Limit > 0 && c.Ctx.Input.Query("p") != "" {
		c.ResponseOk(histories, count)
		return
	}
	c.ResponseOk(histories)
}

// GetWecomOrganizationSyncDryRunHistory
// @Title GetWecomOrganizationSyncDryRunHistory
// @Tag WeCom Organization Sync API
// @Description 查询单条企业微信组织同步 dry-run 预览历史详情
// @Param   organization     query    string  true        "目标组织"
// @Param   historyId        path     string  true        "dry-run 历史 ID"
// @Success 200 {object} object.WecomOrganizationSyncDryRunHistory 响应对象
// @router /wecom-org-sync/dry-run-history/:historyId [get]
func (c *ApiController) GetWecomOrganizationSyncDryRunHistory() {
	organization, ok := c.resolveWecomOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireWecomOrganizationSyncAdmin(organization) {
		return
	}
	history, err := (&object.WecomOrganizationSyncDryRunHistoryService{}).GetHistory(organization, c.Ctx.Input.Param(":historyId"))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(history)
}

// GetWecomOrganizationSyncRuns
// @Title GetWecomOrganizationSyncRuns
// @Tag WeCom Organization Sync API
// @Description get WeCom organization sync runs
// @Param   organization     query    string  true        "The target organization"
// @Success 200 {array} object.WecomOrganizationSyncRun The Response object
// @router /wecom-org-sync/runs [get]
func (c *ApiController) GetWecomOrganizationSyncRuns() {
	organization, ok := c.resolveWecomOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireWecomOrganizationSyncAdmin(organization) {
		return
	}

	limit := c.Ctx.Input.Query("pageSize")
	page := c.Ctx.Input.Query("p")
	field := c.Ctx.Input.Query("field")
	value := c.Ctx.Input.Query("value")
	sortField := c.Ctx.Input.Query("sortField")
	sortOrder := c.Ctx.Input.Query("sortOrder")
	secret := c.getWecomOrganizationSyncSecretForMasking(organization)

	service := &object.WecomOrganizationSyncService{}
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
	count, err := (&object.WecomOrganizationSyncService{}).GetRunCount(organization, field, value)
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

// GetWecomOrganizationSyncRun
// @Title GetWecomOrganizationSyncRun
// @Tag WeCom Organization Sync API
// @Description get a WeCom organization sync run
// @Param   organization     query    string  true        "The target organization"
// @Param   runId            path     string  true        "The sync run id"
// @Success 200 {object} object.WecomOrganizationSyncRun The Response object
// @router /wecom-org-sync/runs/:runId [get]
func (c *ApiController) GetWecomOrganizationSyncRun() {
	organization, ok := c.resolveWecomOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireWecomOrganizationSyncAdmin(organization) {
		return
	}

	runId := c.Ctx.Input.Param(":runId")
	run, err := (&object.WecomOrganizationSyncService{}).GetRun(organization, runId, c.getWecomOrganizationSyncSecretForMasking(organization))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(run)
}

// GetCurrentOrganizationManagementScope
// @Title GetCurrentOrganizationManagementScope
// @Tag Organization Management Scope API
// @Description get current user's organization management scope
// @Param   organization     query    string  false        "The target organization"
// @Success 200 {object} object.OrganizationManagementScope The Response object
// @router /org-management-scope/current [get]
func (c *ApiController) GetCurrentOrganizationManagementScope() {
	if err := validateOrganizationManagementScopeCurrentRequest(c.Ctx.Input.Query("userId")); err != nil {
		c.ResponseError(err.Error())
		return
	}

	userId, ok := c.RequireSignedIn()
	if !ok {
		return
	}
	if object.IsAppUser(userId) {
		c.ResponseError("organization management scope requires current user login")
		return
	}

	user, err := object.GetUser(userId)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if user == nil {
		c.ClearUserSession()
		c.ResponseError("current user does not exist")
		return
	}

	organization, isAdminScope, err := resolveOrganizationManagementScopeTarget(c.Ctx.Input.Query("organization"), user, user.IsGlobalAdmin())
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	scope, err := (&object.OrganizationManagementScopeService{}).GetCurrentScope(user, organization, isAdminScope)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(scope)
}

func newWecomOrganizationSyncConfigResponse(organization string, config *object.WecomOrganizationSyncConfig, sourceStatuses ...*object.OrganizationSyncSourceConflictStatus) *wecomOrganizationSyncConfigResponse {
	sourceStatus := firstWecomOrganizationSyncSourceStatus(sourceStatuses...)
	if config == nil {
		config = &object.WecomOrganizationSyncConfig{
			Owner:        organization,
			Name:         object.WecomOrganizationSyncDefaultConfigName,
			Organization: organization,
		}
		object.AttachWecomOrganizationSyncScheduleFieldsForResponse(config, nil)
		response := &wecomOrganizationSyncConfigResponse{
			Organization: organization,
			IsConfigured: false,
			Config:       config,
		}
		applyWecomOrganizationSyncSourceStatus(response, sourceStatus)
		return response
	}

	response := &wecomOrganizationSyncConfigResponse{
		Organization: organization,
		IsConfigured: true,
		Config:       config,
	}
	applyWecomOrganizationSyncSourceStatus(response, sourceStatus)
	return response
}

func firstWecomOrganizationSyncSourceStatus(sourceStatuses ...*object.OrganizationSyncSourceConflictStatus) *object.OrganizationSyncSourceConflictStatus {
	if len(sourceStatuses) == 0 {
		return nil
	}
	return sourceStatuses[0]
}

func applyWecomOrganizationSyncSourceStatus(response *wecomOrganizationSyncConfigResponse, sourceStatus *object.OrganizationSyncSourceConflictStatus) {
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

func newWecomOrganizationSyncRunStartResponse(result *object.WecomOrganizationSyncStartRunResult, sensitiveValues ...string) *wecomOrganizationSyncRunStartResponse {
	if result == nil {
		return &wecomOrganizationSyncRunStartResponse{}
	}

	run := object.GetMaskedWecomOrganizationSyncRun(result.Run, sensitiveValues...)
	staleRun := object.GetMaskedWecomOrganizationSyncRun(result.StaleRun, sensitiveValues...)
	response := &wecomOrganizationSyncRunStartResponse{
		Run:               run,
		RecoveredStaleRun: staleRun,
	}
	if run != nil {
		response.RunId = run.Name
	}
	return response
}

func (c *ApiController) resolveWecomOrganizationSyncTarget(explicitOrganization string) (string, bool) {
	isGlobalAdmin, user := c.isGlobalAdmin()
	organization, err := resolveWecomOrganizationSyncTarget(explicitOrganization, user, isGlobalAdmin)
	if err != nil {
		c.ResponseError(err.Error())
		return "", false
	}
	return organization, true
}

func (c *ApiController) resolveWecomOrganizationSyncConfigTarget(explicitOrganization string, service *object.WecomOrganizationSyncConfigService) (string, *object.OrganizationSyncSourceConflictStatus, bool) {
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

	resolvedOrganization, err := resolveWecomOrganizationSyncTarget(organization, user, isGlobalAdmin)
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

func resolveWecomOrganizationSyncTarget(explicitOrganization string, user *object.User, isGlobalAdmin bool) (string, error) {
	organization := strings.TrimSpace(explicitOrganization)
	if organization != "" {
		return organization, nil
	}

	if user != nil && user.IsAdmin && !isGlobalAdmin && user.Owner != "" {
		return user.Owner, nil
	}
	return "", errors.New("wecom organization sync organization is required")
}

func (c *ApiController) requireWecomOrganizationSyncAdmin(organization string) bool {
	isGlobalAdmin, user := c.isGlobalAdmin()
	if isWecomOrganizationSyncAdmin(user, isGlobalAdmin, organization) {
		return true
	}

	c.ResponseError(c.T("auth:Unauthorized operation"))
	return false
}

func isWecomOrganizationSyncAdmin(user *object.User, isGlobalAdmin bool, organization string) bool {
	if isGlobalAdmin {
		return true
	}
	return user != nil && user.IsAdmin && user.Owner == organization
}

func (c *ApiController) getWecomOrganizationSyncSecretForMasking(organization string) string {
	config, err := object.GetWecomOrganizationSyncConfigByOrganization(organization)
	if err != nil || config == nil {
		return ""
	}
	return config.AddressBookSecret
}

func (c *ApiController) getWecomOrganizationSyncRequestMarker() string {
	for _, header := range []string{"X-Request-Id", "X-Codex-Request-Id", "X-Trace-Id"} {
		if value := strings.TrimSpace(c.Ctx.Request.Header.Get(header)); value != "" {
			return value
		}
	}
	return ""
}

func (c *ApiController) getWecomOrganizationSyncDryRunHistoryFilter(organization string) (object.WecomOrganizationSyncDryRunHistoryFilter, error) {
	filter := object.WecomOrganizationSyncDryRunHistoryFilter{
		Organization:           organization,
		SourceConnectionIdHash: strings.TrimSpace(c.Ctx.Input.Query("sourceConnectionIdHash")),
		Status:                 strings.TrimSpace(c.Ctx.Input.Query("status")),
		DiagnosticAlias:        strings.TrimSpace(c.Ctx.Input.Query("diagnosticAlias")),
		Limit:                  util.ParseInt(c.Ctx.Input.Query("pageSize")),
		TopN:                   util.ParseInt(c.Ctx.Input.Query("topN")),
		SortField:              strings.TrimSpace(c.Ctx.Input.Query("sortField")),
		SortOrder:              strings.TrimSpace(c.Ctx.Input.Query("sortOrder")),
	}
	if filter.Limit == 0 {
		filter.Limit = util.ParseInt(c.Ctx.Input.Query("limit"))
	}
	if page := util.ParseInt(c.Ctx.Input.Query("p")); page > 0 && filter.Limit > 0 {
		filter.Offset = (page - 1) * filter.Limit
	} else {
		filter.Offset = 0
	}
	var err error
	if filter.CreatedFrom, err = parseWecomDryRunHistoryTime(c.Ctx.Input.Query("createdFrom")); err != nil {
		return filter, err
	}
	if filter.CreatedTo, err = parseWecomDryRunHistoryTime(c.Ctx.Input.Query("createdTo")); err != nil {
		return filter, err
	}
	return filter, nil
}

func parseWecomDryRunHistoryTime(text string) (time.Time, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return time.Time{}, nil
	}
	value, err := time.Parse(time.RFC3339Nano, text)
	if err != nil {
		return time.Time{}, err
	}
	return value.UTC(), nil
}

func resolveOrganizationManagementScopeTarget(explicitOrganization string, user *object.User, isGlobalAdmin bool) (string, bool, error) {
	if user == nil {
		return "", false, errors.New("organization management scope current user is required")
	}

	organization := strings.TrimSpace(explicitOrganization)
	if organization == "" {
		organization = user.Owner
	}
	if organization == "" {
		return "", false, errors.New("organization management scope organization is required")
	}

	if isGlobalAdmin {
		return organization, true, nil
	}
	if user.Owner != organization {
		return "", false, errors.New("organization management scope organization is not authorized")
	}
	return organization, user.IsAdmin, nil
}

func validateOrganizationManagementScopeCurrentRequest(userId string) error {
	if strings.TrimSpace(userId) != "" {
		// 该接口的权限边界是“当前登录用户”，不能复用历史 app user 的 userId 覆盖语义。
		return errors.New("organization management scope only supports current user query")
	}
	return nil
}
