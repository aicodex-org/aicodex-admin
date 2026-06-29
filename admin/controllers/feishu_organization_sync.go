// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

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

type feishuOrganizationSyncConfigResponse struct {
	Organization              string                                    `json:"organization"`
	IsConfigured              bool                                      `json:"isConfigured"`
	Config                    *object.FeishuOrganizationSyncConfig      `json:"config"`
	DefaultOrganization       string                                    `json:"defaultOrganization,omitempty"`
	DefaultOrganizationSource string                                    `json:"defaultOrganizationSource,omitempty"`
	ConflictingProvider       string                                    `json:"conflictingProvider,omitempty"`
	ConflictingOrganization   string                                    `json:"conflictingOrganization,omitempty"`
	ConflictingConfigured     bool                                      `json:"conflictingConfigured"`
	ConflictingEnabled        bool                                      `json:"conflictingEnabled"`
	ConflictingOrganizations  []string                                  `json:"conflictingOrganizations,omitempty"`
	SourceStatus              *object.OrganizationDirectorySourceStatus `json:"sourceStatus,omitempty"`
}

type feishuOrganizationSyncRunRequest struct {
	Organization string `json:"organization"`
}

type feishuOrganizationSyncDryRunPreviewRequest struct {
	Organization string `json:"organization"`
}

type feishuOrganizationSyncRunStartResponse struct {
	RunId             string                            `json:"runId"`
	Run               *object.FeishuOrganizationSyncRun `json:"run"`
	RecoveredStaleRun *object.FeishuOrganizationSyncRun `json:"recoveredStaleRun,omitempty"`
}

var getFeishuOrganizationSyncUserBindingConflictDiagnostics = func(filter object.FeishuUserBindingConflictDiagnosticsFilter) (*object.FeishuUserBindingConflictDiagnostics, error) {
	return (&object.FeishuOrganizationSyncUserBindingConflictService{}).GetDiagnostics(filter)
}

var getFeishuOrganizationSyncHandoffEvidence = func(filter object.FeishuOrganizationSyncHandoffEvidenceFilter) (*object.FeishuOrganizationSyncHandoffEvidence, error) {
	return (&object.FeishuOrganizationSyncHandoffEvidenceService{}).GetEvidence(filter)
}

// GetFeishuOrganizationSyncConfig
// @router /feishu-org-sync/config [get]
func (c *ApiController) GetFeishuOrganizationSyncConfig() {
	service := &object.FeishuOrganizationSyncConfigService{}
	organization, sourceStatus, ok := c.resolveFeishuOrganizationSyncConfigTarget(c.Ctx.Input.Query("organization"), service)
	if !ok {
		return
	}
	if organization != "" && !c.requireFeishuOrganizationSyncAdmin(organization) {
		return
	}
	if organization == "" {
		c.ResponseOk(newFeishuOrganizationSyncConfigResponse(organization, nil, sourceStatus))
		return
	}
	config, err := service.GetConfig(organization, true)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newFeishuOrganizationSyncConfigResponse(organization, config, sourceStatus))
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
	resolvedOrganization := organization
	if savedConfig != nil && savedConfig.Organization != "" {
		resolvedOrganization = savedConfig.Organization
	}
	sourceStatus, err := (&object.FeishuOrganizationSyncConfigService{}).GetSourceStatus(resolvedOrganization)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newFeishuOrganizationSyncConfigResponse(resolvedOrganization, savedConfig, sourceStatus))
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

// DryRunFeishuOrganizationSyncPreview
// @router /feishu-org-sync/dry-run-preview [post]
func (c *ApiController) DryRunFeishuOrganizationSyncPreview() {
	var request feishuOrganizationSyncDryRunPreviewRequest
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
	preview, err := (&object.FeishuOrganizationSyncDryRunPreviewService{
		Operator:      c.GetSessionUsername(),
		RequestMarker: c.getFeishuOrganizationSyncRequestMarker(),
	}).Preview(c.Ctx.Request.Context(), config)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(preview)
}

// GetFeishuOrganizationSyncDryRunHistories
// @router /feishu-org-sync/dry-run-history [get]
func (c *ApiController) GetFeishuOrganizationSyncDryRunHistories() {
	organization, ok := c.resolveFeishuOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireFeishuOrganizationSyncAdmin(organization) {
		return
	}
	filter, err := c.getFeishuOrganizationSyncDryRunHistoryFilter(organization)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	histories, count, err := (&object.FeishuOrganizationSyncDryRunHistoryService{}).GetHistories(filter)
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

// GetFeishuOrganizationSyncDryRunHistory
// @router /feishu-org-sync/dry-run-history/:historyId [get]
func (c *ApiController) GetFeishuOrganizationSyncDryRunHistory() {
	organization, ok := c.resolveFeishuOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireFeishuOrganizationSyncAdmin(organization) {
		return
	}
	history, err := (&object.FeishuOrganizationSyncDryRunHistoryService{}).GetHistory(organization, c.Ctx.Input.Param(":historyId"))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(history)
}

// GetFeishuOrganizationSyncUserBindingConflicts
// @router /feishu-org-sync/user-binding-conflicts [get]
func (c *ApiController) GetFeishuOrganizationSyncUserBindingConflicts() {
	organization, ok := c.resolveFeishuOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireFeishuOrganizationSyncAdmin(organization) {
		return
	}
	diagnostics, err := getFeishuOrganizationSyncUserBindingConflictDiagnostics(c.getFeishuOrganizationSyncUserBindingConflictFilter(organization))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(diagnostics)
}

// GetFeishuOrganizationSyncHandoffEvidence
// @router /feishu-org-sync/handoff-evidence [get]
func (c *ApiController) GetFeishuOrganizationSyncHandoffEvidence() {
	organization, ok := c.resolveFeishuOrganizationSyncTarget(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	if !c.requireFeishuOrganizationSyncAdmin(organization) {
		return
	}
	evidence, err := getFeishuOrganizationSyncHandoffEvidence(c.getFeishuOrganizationSyncHandoffEvidenceFilter(organization))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(evidence)
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

func newFeishuOrganizationSyncConfigResponse(organization string, config *object.FeishuOrganizationSyncConfig, sourceStatuses ...*object.OrganizationSyncSourceConflictStatus) *feishuOrganizationSyncConfigResponse {
	sourceStatus := firstFeishuOrganizationSyncSourceStatus(sourceStatuses...)
	if config == nil {
		config = &object.FeishuOrganizationSyncConfig{
			Owner:        organization,
			Name:         object.FeishuOrganizationSyncDefaultConfigName,
			Organization: organization,
			EndpointMode: object.FeishuEndpointModeDomestic,
		}
		object.AttachFeishuOrganizationSyncScheduleFieldsForResponse(config, nil)
		response := &feishuOrganizationSyncConfigResponse{Organization: organization, IsConfigured: false, Config: config}
		applyFeishuOrganizationSyncSourceStatus(response, sourceStatus)
		return response
	}
	response := &feishuOrganizationSyncConfigResponse{Organization: organization, IsConfigured: true, Config: config}
	applyFeishuOrganizationSyncSourceStatus(response, sourceStatus)
	return response
}

func firstFeishuOrganizationSyncSourceStatus(sourceStatuses ...*object.OrganizationSyncSourceConflictStatus) *object.OrganizationSyncSourceConflictStatus {
	if len(sourceStatuses) == 0 {
		return nil
	}
	return sourceStatuses[0]
}

func applyFeishuOrganizationSyncSourceStatus(response *feishuOrganizationSyncConfigResponse, sourceStatus *object.OrganizationSyncSourceConflictStatus) {
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

func (c *ApiController) resolveFeishuOrganizationSyncConfigTarget(explicitOrganization string, service *object.FeishuOrganizationSyncConfigService) (string, *object.OrganizationSyncSourceConflictStatus, bool) {
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

	resolvedOrganization, err := resolveFeishuOrganizationSyncTarget(organization, user, isGlobalAdmin)
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

func (c *ApiController) getFeishuOrganizationSyncRequestMarker() string {
	for _, header := range []string{"X-Request-Id", "X-Codex-Request-Id", "X-Trace-Id"} {
		if value := strings.TrimSpace(c.Ctx.Request.Header.Get(header)); value != "" {
			return value
		}
	}
	return ""
}

func (c *ApiController) getFeishuOrganizationSyncDryRunHistoryFilter(organization string) (object.FeishuOrganizationSyncDryRunHistoryFilter, error) {
	filter := object.FeishuOrganizationSyncDryRunHistoryFilter{
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
	if filter.CreatedFrom, err = parseFeishuDryRunHistoryTime(c.Ctx.Input.Query("createdFrom")); err != nil {
		return filter, err
	}
	if filter.CreatedTo, err = parseFeishuDryRunHistoryTime(c.Ctx.Input.Query("createdTo")); err != nil {
		return filter, err
	}
	return filter, nil
}

func (c *ApiController) getFeishuOrganizationSyncUserBindingConflictFilter(organization string) object.FeishuUserBindingConflictDiagnosticsFilter {
	return object.FeishuUserBindingConflictDiagnosticsFilter{
		Organization: organization,
		Limit:        util.ParseInt(c.Ctx.Input.Query("limit")),
		IncludeOk:    parseFeishuOrganizationSyncBoolQuery(c.Ctx.Input.Query("includeOk")),
	}
}

func (c *ApiController) getFeishuOrganizationSyncHandoffEvidenceFilter(organization string) object.FeishuOrganizationSyncHandoffEvidenceFilter {
	return object.FeishuOrganizationSyncHandoffEvidenceFilter{
		Organization: organization,
		SourceType:   strings.TrimSpace(c.Ctx.Input.Query("sourceType")),
		SourceId:     strings.TrimSpace(c.Ctx.Input.Query("sourceId")),
	}
}

func parseFeishuOrganizationSyncBoolQuery(text string) bool {
	switch strings.ToLower(strings.TrimSpace(text)) {
	case "1", "true", "yes", "y", "on":
		return true
	default:
		return false
	}
}

func parseFeishuDryRunHistoryTime(text string) (time.Time, error) {
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
