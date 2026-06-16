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
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"github.com/beego/beego/v2/core/logs"
)

const (
	organizationTreeEmptyClassBusinessEmpty   = "business_empty"
	organizationTreeEmptyClassTestDataGap     = "test_data_gap"
	organizationTreeEmptyClassUntrusted       = "untrusted_read_model"
	organizationTreeOperationRefreshStatus    = "refresh_status"
	organizationTreeOperationRefreshReadModel = "refresh_read_model"
	organizationTreeOperationsDefaultPageSize = 20
	organizationTreeOperationsMaxPageSize     = 100
)

var (
	getOrganizationTreeOperationsWecomConfig = object.GetWecomOrganizationSyncConfigByOrganization
	startOrganizationTreeOperationsWecomRun  = func(config *object.WecomOrganizationSyncConfig, actor string) (*object.WecomOrganizationSyncStartRunResult, error) {
		return (&object.WecomOrganizationSyncService{}).StartManualRunAsync(config, actor)
	}
)

type organizationTreeOperationsDiagnosticRequest struct {
	Organization           string
	Query                  string
	LifecycleStatus        string
	SourceConnectionStatus string
	Freshness              string
	ReadModelSource        string
}

type organizationTreeOperationsMemberRequest struct {
	Organization string
	DepartmentId string
	Page         int
	PageSize     int
}

// OrganizationTreeOperationsDiagnosticResponse 是 admin 内部组织树运营诊断视图。
// 该响应只服务后台排障和受控刷新，不作为组织主数据、Insight fallback 或 gateway 授权事实来源。
type OrganizationTreeOperationsDiagnosticResponse struct {
	Organization      string                                     `json:"organization"`
	Status            string                                     `json:"status"`
	EmptyTreeClass    string                                     `json:"emptyTreeClass,omitempty"`
	Reason            string                                     `json:"reason,omitempty"`
	Summary           OrganizationTreeOperationsSummary          `json:"summary"`
	Nodes             []OrganizationTreeOperationsNode           `json:"nodes"`
	Diagnostics       []OrganizationTreeOperationsDiagnosticItem `json:"diagnostics"`
	SourceConnections []OrganizationTreeOperationsSourceSummary  `json:"sourceConnections"`
	LatestSyncBatch   *OrganizationTreeOperationsSyncBatch       `json:"latestSyncBatch,omitempty"`
	Lineage           InsightOrganizationTreeLineage             `json:"lineage"`
}

// OrganizationTreeOperationsSummary 汇总组织树 read model 的版本、新鲜度和数据质量信号。
// orgVersion/scopeVersion/freshness/readModelSource 用于诊断和交接，不改变下游跨服务 contract。
type OrganizationTreeOperationsSummary struct {
	TotalPlatformDepartmentCount int    `json:"totalPlatformDepartmentCount"`
	VisibleNodeCount             int    `json:"visibleNodeCount"`
	FilteredNodeCount            int    `json:"filteredNodeCount"`
	DiagnosticItemCount          int    `json:"diagnosticItemCount"`
	OrgVersion                   string `json:"orgVersion"`
	ScopeVersion                 string `json:"scopeVersion"`
	Freshness                    string `json:"freshness"`
	GeneratedAt                  string `json:"generatedAt"`
	ReadModelSource              string `json:"readModelSource"`
	MappingStatus                string `json:"mappingStatus"`
	LifecycleStatus              string `json:"lifecycleStatus"`
}

// OrganizationTreeOperationsNode 是运营页可展示的组织树节点。
// display/path 类字段只用于展示和搜索，授权与 join 仍以平台稳定标识和后端 scope 计算为准。
type OrganizationTreeOperationsNode struct {
	DepartmentId              string                                  `json:"departmentId"`
	DepartmentName            string                                  `json:"departmentName"`
	ParentDepartmentId        string                                  `json:"parentDepartmentId"`
	DepartmentPath            string                                  `json:"departmentPath"`
	HasChildren               bool                                    `json:"hasChildren"`
	SourceType                string                                  `json:"sourceType"`
	SourceConnectionId        string                                  `json:"sourceConnectionId,omitempty"`
	SourceConnectionStatus    string                                  `json:"sourceConnectionStatus,omitempty"`
	SourceConnectionFreshness string                                  `json:"sourceConnectionFreshness,omitempty"`
	LifecycleStatus           string                                  `json:"lifecycleStatus"`
	VisibilitySource          string                                  `json:"visibilitySource,omitempty"`
	ReadModelSource           string                                  `json:"readModelSource"`
	Lineage                   InsightOrganizationTreeNodeLineage      `json:"lineage,omitempty"`
	MemberSummary             OrganizationTreeOperationsMemberSummary `json:"memberSummary"`
}

// OrganizationTreeOperationsMemberSummary 是部门维度成员诊断摘要。
// 摘要可以随部门树返回；成员明细必须通过按部门分页接口懒加载。
type OrganizationTreeOperationsMemberSummary struct {
	MemberCount           int `json:"memberCount"`
	ActiveMemberCount     int `json:"activeMemberCount"`
	DisabledMemberCount   int `json:"disabledMemberCount"`
	ConflictedMemberCount int `json:"conflictedMemberCount"`
	MappingIssueCount     int `json:"mappingIssueCount"`
	StaleMemberCount      int `json:"staleMemberCount"`
}

// OrganizationTreeOperationsMemberListResponse 是按部门懒加载的成员诊断分页结果。
// 该响应只服务 admin 管理页诊断，不能作为 Insight/API/gateway 跨服务合同。
type OrganizationTreeOperationsMemberListResponse struct {
	Organization string                                 `json:"organization"`
	DepartmentId string                                 `json:"departmentId"`
	Page         int                                    `json:"page"`
	PageSize     int                                    `json:"pageSize"`
	Total        int                                    `json:"total"`
	Members      []OrganizationTreeOperationsMemberItem `json:"members"`
}

// OrganizationTreeOperationsMemberItem 是单个成员的脱敏诊断项。
// StableSubjectId 是 adminSubject 的短哈希，displayName 只用于展示，不能作为 join 或授权 key。
type OrganizationTreeOperationsMemberItem struct {
	StableSubjectId    string                                  `json:"stableSubjectId"`
	DisplayName        string                                  `json:"displayName,omitempty"`
	DepartmentId       string                                  `json:"departmentId"`
	LifecycleStatus    string                                  `json:"lifecycleStatus"`
	MappingStatus      string                                  `json:"mappingStatus"`
	SourceType         string                                  `json:"sourceType"`
	SourceConnectionId string                                  `json:"sourceConnectionId,omitempty"`
	ReadModelSource    string                                  `json:"readModelSource"`
	Freshness          string                                  `json:"freshness,omitempty"`
	Reason             string                                  `json:"reason"`
	IsMain             bool                                    `json:"isMain"`
	IsManager          bool                                    `json:"isManager"`
	IsDirectLeader     bool                                    `json:"isDirectLeader"`
	Lineage            OrganizationTreeOperationsMemberLineage `json:"lineage"`
}

// OrganizationTreeOperationsMemberLineage 汇总成员来源血缘，不包含外部 subject 明文或 API 用户 ID。
type OrganizationTreeOperationsMemberLineage struct {
	SourceType         string `json:"sourceType,omitempty"`
	SourceConnectionId string `json:"sourceConnectionId,omitempty"`
	SourceOrgVersion   string `json:"sourceOrgVersion,omitempty"`
	LastSeenBatchId    string `json:"lastSeenBatchId,omitempty"`
	Digest             string `json:"digest,omitempty"`
}

// OrganizationTreeOperationsDiagnosticItem 描述被 fail closed 或需要关注的脱敏异常项。
// disabled/deleted/conflicted/stale/mapping 不确定等状态只能进入诊断，不得扩大可见范围。
type OrganizationTreeOperationsDiagnosticItem struct {
	SubjectType        string `json:"subjectType"`
	SubjectId          string `json:"subjectId"`
	ParentSubjectId    string `json:"parentSubjectId,omitempty"`
	DisplayName        string `json:"displayName,omitempty"`
	Reason             string `json:"reason"`
	LifecycleStatus    string `json:"lifecycleStatus,omitempty"`
	MappingStatus      string `json:"mappingStatus,omitempty"`
	SourceType         string `json:"sourceType,omitempty"`
	SourceConnectionId string `json:"sourceConnectionId,omitempty"`
	Freshness          string `json:"freshness,omitempty"`
	ReadModelSource    string `json:"readModelSource,omitempty"`
}

// OrganizationTreeOperationsSourceSummary 汇总来源连接健康度和最近批次线索。
// 不返回 token、secret、原始来源响应或可反推出凭据的配置值。
type OrganizationTreeOperationsSourceSummary struct {
	SourceConnectionId string `json:"sourceConnectionId"`
	SourceType         string `json:"sourceType"`
	Status             string `json:"status"`
	Freshness          string `json:"freshness"`
	LastSeenBatchId    string `json:"lastSeenBatchId,omitempty"`
	Configured         bool   `json:"configured"`
}

// OrganizationTreeOperationsSyncBatch 是最近组织同步批次的脱敏摘要。
// 仅暴露定位版本和刷新状态所需字段，不携带完整同步输入或错误详情。
type OrganizationTreeOperationsSyncBatch struct {
	BatchId            string `json:"batchId"`
	SourceConnectionId string `json:"sourceConnectionId,omitempty"`
	Status             string `json:"status"`
	OrgVersion         string `json:"orgVersion,omitempty"`
	Freshness          string `json:"freshness,omitempty"`
	StartedAt          string `json:"startedAt,omitempty"`
	FinishedAt         string `json:"finishedAt,omitempty"`
	ErrorCode          string `json:"errorCode,omitempty"`
}

type organizationTreeOperationsRefreshRequest struct {
	Organization string `json:"organization"`
	TriggerType  string `json:"triggerType"`
}

// OrganizationTreeOperationsRefreshResponse 返回受控刷新动作的执行状态。
// refresh_status 只重新读取诊断；refresh_read_model 复用既有同步路径且不得直接写 gateway authorization facts。
type OrganizationTreeOperationsRefreshResponse struct {
	TraceId      string                                        `json:"traceId"`
	Organization string                                        `json:"organization"`
	TriggerType  string                                        `json:"triggerType"`
	Status       string                                        `json:"status"`
	Reason       string                                        `json:"reason,omitempty"`
	RunId        string                                        `json:"runId,omitempty"`
	Diagnostics  *OrganizationTreeOperationsDiagnosticResponse `json:"diagnostics,omitempty"`
}

type organizationTreeOperationsAuditEvent struct {
	TraceId      string
	Actor        string
	Organization string
	Operation    string
	Status       string
	Reason       string
	Lineage      InsightOrganizationTreeLineage
}

// GetOrganizationTreeOperationsDiagnostics
// @Title GetOrganizationTreeOperationsDiagnostics
// @Tag Organization Tree Operations API
// @Description 获取 admin-only 组织树运营诊断，复用后端 scope/read model 口径并保持 fail closed。
// @Param   organization     query    string  true        "目标组织"
// @Success 200 {object} controllers.OrganizationTreeOperationsDiagnosticResponse "组织树运营诊断响应"
// @router /organization-tree-operations/diagnostics [get]
func (c *ApiController) GetOrganizationTreeOperationsDiagnostics() {
	request := organizationTreeOperationsDiagnosticRequest{
		Organization:           c.Ctx.Input.Query("organization"),
		Query:                  c.Ctx.Input.Query("query"),
		LifecycleStatus:        c.Ctx.Input.Query("lifecycleStatus"),
		SourceConnectionStatus: c.Ctx.Input.Query("sourceConnectionStatus"),
		Freshness:              c.Ctx.Input.Query("freshness"),
		ReadModelSource:        c.Ctx.Input.Query("readModelSource"),
	}
	organization, user, isAdminScope, ok := c.resolveOrganizationTreeOperationsTarget(request.Organization)
	if !ok {
		return
	}
	request.Organization = organization

	diagnostics, err := c.buildOrganizationTreeOperationsDiagnostics(user, isAdminScope, request)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(diagnostics)
}

// GetOrganizationTreeOperationsMembers
// @Title GetOrganizationTreeOperationsMembers
// @Tag Organization Tree Operations API
// @Description 按部门分页获取 admin-only 成员诊断列表，默认不随组织树全量展开成员。
// @Param   organization     query    string  true        "目标组织"
// @Param   departmentId     query    string  true        "平台部门 ID"
// @Success 200 {object} controllers.OrganizationTreeOperationsMemberListResponse "部门成员诊断分页响应"
// @router /organization-tree-operations/members [get]
func (c *ApiController) GetOrganizationTreeOperationsMembers() {
	request := organizationTreeOperationsMemberRequest{
		Organization: c.Ctx.Input.Query("organization"),
		DepartmentId: c.Ctx.Input.Query("departmentId"),
		Page:         parseOrganizationTreeOperationsIntQuery(c.Ctx.Input.Query("page")),
		PageSize:     parseOrganizationTreeOperationsIntQuery(c.Ctx.Input.Query("pageSize")),
	}
	organization, user, isAdminScope, ok := c.resolveOrganizationTreeOperationsTarget(request.Organization)
	if !ok {
		return
	}
	request.Organization = organization
	if strings.TrimSpace(request.DepartmentId) == "" {
		c.ResponseError("departmentId is required")
		return
	}

	members, err := c.buildOrganizationTreeOperationsDepartmentMembers(user, isAdminScope, request)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(members)
}

// RefreshOrganizationTreeOperations
// @Title RefreshOrganizationTreeOperations
// @Tag Organization Tree Operations API
// @Description 刷新组织树诊断状态，或通过受控同步路径触发幂等 read model 刷新。
// @Param   body    body   controllers.organizationTreeOperationsRefreshRequest  true        "刷新请求"
// @Success 200 {object} controllers.OrganizationTreeOperationsRefreshResponse "组织树刷新响应"
// @router /organization-tree-operations/refresh [post]
func (c *ApiController) RefreshOrganizationTreeOperations() {
	traceId := c.getInsightProviderTraceId()
	var request organizationTreeOperationsRefreshRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}
	organization, user, isAdminScope, ok := c.resolveOrganizationTreeOperationsTarget(request.Organization)
	if !ok {
		writeOrganizationTreeOperationsAudit(organizationTreeOperationsAuditEvent{TraceId: traceId, Operation: request.TriggerType, Status: "rejected", Reason: "unauthorized"})
		return
	}
	triggerType := strings.TrimSpace(request.TriggerType)
	if triggerType == "" {
		triggerType = organizationTreeOperationRefreshStatus
	}

	response := OrganizationTreeOperationsRefreshResponse{
		TraceId:      traceId,
		Organization: organization,
		TriggerType:  triggerType,
	}
	switch triggerType {
	case organizationTreeOperationRefreshStatus:
		diagnostics, err := c.buildOrganizationTreeOperationsDiagnostics(user, isAdminScope, organizationTreeOperationsDiagnosticRequest{Organization: organization})
		if err != nil {
			c.ResponseError(err.Error())
			writeOrganizationTreeOperationsAudit(organizationTreeOperationsAuditEvent{TraceId: traceId, Actor: user.GetId(), Organization: organization, Operation: triggerType, Status: "error", Reason: err.Error()})
			return
		}
		response.Status = "ok"
		response.Diagnostics = diagnostics
		writeOrganizationTreeOperationsAudit(organizationTreeOperationsAuditEvent{TraceId: traceId, Actor: user.GetId(), Organization: organization, Operation: triggerType, Status: "ok", Lineage: diagnostics.Lineage})
		c.ResponseOk(response)
	case organizationTreeOperationRefreshReadModel:
		result := c.triggerOrganizationTreeOperationsSourceRefresh(traceId, user, organization)
		c.ResponseOk(result)
	default:
		response.Status = "unsupported"
		response.Reason = "unsupported triggerType"
		writeOrganizationTreeOperationsAudit(organizationTreeOperationsAuditEvent{TraceId: traceId, Actor: user.GetId(), Organization: organization, Operation: triggerType, Status: "unsupported", Reason: response.Reason})
		c.ResponseOk(response)
	}
}

func (c *ApiController) resolveOrganizationTreeOperationsTarget(explicitOrganization string) (string, *object.User, bool, bool) {
	user, ok := c.RequireSignedInUser()
	if !ok {
		return "", nil, false, false
	}
	isGlobalAdmin := user.IsGlobalAdmin()
	organization, isAdminScope, err := resolveOrganizationManagementScopeTarget(explicitOrganization, user, isGlobalAdmin)
	if err != nil {
		c.ResponseError(err.Error())
		return "", nil, false, false
	}
	if !isAdminScope {
		c.Ctx.Output.SetStatus(http.StatusForbidden)
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return "", nil, false, false
	}
	return organization, user, isAdminScope, true
}

func (c *ApiController) buildOrganizationTreeOperationsDiagnostics(user *object.User, isAdminScope bool, request organizationTreeOperationsDiagnosticRequest) (*OrganizationTreeOperationsDiagnosticResponse, error) {
	input, err := c.buildOrganizationTreeOperationsReadModelInput(user, isAdminScope, request.Organization)
	if err != nil {
		return nil, err
	}
	return buildOrganizationTreeOperationsDiagnosticsFromInput(input, request), nil
}

func (c *ApiController) buildOrganizationTreeOperationsDepartmentMembers(user *object.User, isAdminScope bool, request organizationTreeOperationsMemberRequest) (*OrganizationTreeOperationsMemberListResponse, error) {
	input, err := c.buildOrganizationTreeOperationsReadModelInput(user, isAdminScope, request.Organization)
	if err != nil {
		return nil, err
	}
	return buildOrganizationTreeOperationsDepartmentMembersFromInput(input, request), nil
}

func (c *ApiController) buildOrganizationTreeOperationsReadModelInput(user *object.User, isAdminScope bool, organization string) (insightOrganizationTreeReadModelInput, error) {
	scope, err := (&object.OrganizationManagementScopeService{}).GetCurrentScope(user, organization, isAdminScope)
	if err != nil {
		return insightOrganizationTreeReadModelInput{}, err
	}
	groups, err := object.GetGroups(organization)
	if err != nil {
		return insightOrganizationTreeReadModelInput{}, err
	}
	platformDepartments, err := object.GetPlatformDepartments(organization)
	if err != nil {
		return insightOrganizationTreeReadModelInput{}, err
	}
	platformUsers, err := object.GetPlatformUsers(organization)
	if err != nil {
		return insightOrganizationTreeReadModelInput{}, err
	}
	platformMemberships, err := object.GetPlatformMemberships(organization)
	if err != nil {
		return insightOrganizationTreeReadModelInput{}, err
	}
	externalIdentities, err := object.GetExternalIdentities(organization)
	if err != nil {
		return insightOrganizationTreeReadModelInput{}, err
	}
	platformApiUserMappings, err := object.GetPlatformApiUserMappings(organization)
	if err != nil {
		return insightOrganizationTreeReadModelInput{}, err
	}
	sourceConnections, err := object.GetSourceConnections(organization)
	if err != nil {
		return insightOrganizationTreeReadModelInput{}, err
	}
	syncBatches, err := object.GetOrgSyncBatches(organization)
	if err != nil {
		return insightOrganizationTreeReadModelInput{}, err
	}
	input := insightOrganizationTreeReadModelInput{
		CurrentUser:             user,
		Organization:            organization,
		GeneratedAt:             time.Now().UTC(),
		Scope:                   scope,
		PlatformDepartments:     dereferenceInsightPlatformDepartments(platformDepartments),
		PlatformUsers:           dereferenceOrganizationTreeOperationsPlatformUsers(platformUsers),
		PlatformMemberships:     dereferenceOrganizationTreeOperationsPlatformMemberships(platformMemberships),
		ExternalIdentities:      dereferenceOrganizationTreeOperationsExternalIdentities(externalIdentities),
		PlatformApiUserMappings: dereferenceOrganizationTreeOperationsPlatformApiUserMappings(platformApiUserMappings),
		Groups:                  groups,
		SourceConnections:       dereferenceInsightSourceConnections(sourceConnections),
		SyncBatches:             dereferenceInsightOrgSyncBatches(syncBatches),
	}
	return input, nil
}

func buildOrganizationTreeOperationsDiagnosticsFromInput(input insightOrganizationTreeReadModelInput, request organizationTreeOperationsDiagnosticRequest) *OrganizationTreeOperationsDiagnosticResponse {
	readModel := buildInsightOrganizationTreeReadModel(input)
	providerErr := validateInsightOrganizationTreeReadModelTrusted(input, readModel)
	connectionIndex := indexInsightOrganizationTreeSourceConnections(input.SourceConnections)
	memberSummaries := buildOrganizationTreeOperationsMemberSummaries(input, readModel.ReadModelSource, connectionIndex)
	nodes := buildOrganizationTreeOperationsNodes(readModel, connectionIndex, memberSummaries)
	diagnostics := buildOrganizationTreeOperationsDiagnosticItems(input, readModel, connectionIndex, providerErr)
	nodes, diagnostics = filterOrganizationTreeOperationsResults(nodes, diagnostics, request)
	emptyClass, reason := classifyOrganizationTreeOperationsEmptyTree(input, readModel, providerErr)
	sources := buildOrganizationTreeOperationsSourceSummaries(input.SourceConnections)
	latestBatch := newOrganizationTreeOperationsSyncBatch(latestInsightOrganizationTreeAnySyncBatch(input.SyncBatches))
	status := "ok"
	if providerErr != nil {
		status = "fail_closed"
	}
	summary := OrganizationTreeOperationsSummary{
		TotalPlatformDepartmentCount: len(input.PlatformDepartments),
		VisibleNodeCount:             len(nodes),
		FilteredNodeCount:            maxInt(len(input.PlatformDepartments)-len(readModel.Nodes), 0),
		DiagnosticItemCount:          len(diagnostics),
		OrgVersion:                   readModel.OrgVersion,
		ScopeVersion:                 readModel.ScopeVersion,
		Freshness:                    readModel.Freshness,
		GeneratedAt:                  readModel.GeneratedAt,
		ReadModelSource:              readModel.ReadModelSource,
		MappingStatus:                readModel.MappingStatus,
		LifecycleStatus:              readModel.LifecycleStatus,
	}
	return &OrganizationTreeOperationsDiagnosticResponse{
		Organization:      readModel.Organization,
		Status:            status,
		EmptyTreeClass:    emptyClass,
		Reason:            reason,
		Summary:           summary,
		Nodes:             nodes,
		Diagnostics:       diagnostics,
		SourceConnections: sources,
		LatestSyncBatch:   latestBatch,
		Lineage:           readModel.Lineage,
	}
}

func buildOrganizationTreeOperationsNodes(readModel InsightOrganizationTreeResponse, connections map[string]object.SourceConnection, memberSummaries map[string]OrganizationTreeOperationsMemberSummary) []OrganizationTreeOperationsNode {
	nodes := make([]OrganizationTreeOperationsNode, 0, len(readModel.Nodes))
	for _, node := range readModel.Nodes {
		sourceStatus := ""
		sourceFreshness := ""
		if connection, ok := connections[node.SourceConnectionId]; ok {
			sourceStatus = connection.Status
			sourceFreshness = connection.Freshness
		}
		nodes = append(nodes, OrganizationTreeOperationsNode{
			DepartmentId:              node.DepartmentId,
			DepartmentName:            node.DepartmentName,
			ParentDepartmentId:        node.ParentDepartmentId,
			DepartmentPath:            node.DepartmentPath,
			HasChildren:               node.HasChildren,
			SourceType:                node.SourceType,
			SourceConnectionId:        node.SourceConnectionId,
			SourceConnectionStatus:    sourceStatus,
			SourceConnectionFreshness: sourceFreshness,
			LifecycleStatus:           node.LifecycleStatus,
			VisibilitySource:          node.VisibilitySource,
			ReadModelSource:           readModel.ReadModelSource,
			Lineage:                   node.Lineage,
			MemberSummary:             memberSummaries[node.DepartmentId],
		})
	}
	return nodes
}

func buildOrganizationTreeOperationsDepartmentMembersFromInput(input insightOrganizationTreeReadModelInput, request organizationTreeOperationsMemberRequest) *OrganizationTreeOperationsMemberListResponse {
	readModel := buildInsightOrganizationTreeReadModel(input)
	connectionIndex := indexInsightOrganizationTreeSourceConnections(input.SourceConnections)
	request = normalizeOrganizationTreeOperationsMemberRequest(request)
	departmentId := strings.TrimSpace(request.DepartmentId)
	// 成员诊断必须先落在当前 read model 可见部门内，避免通过分页接口扩大管理范围。
	if !organizationTreeOperationsReadModelContainsDepartment(readModel, departmentId) {
		return &OrganizationTreeOperationsMemberListResponse{
			Organization: readModel.Organization,
			DepartmentId: departmentId,
			Page:         request.Page,
			PageSize:     request.PageSize,
			Total:        0,
			Members:      []OrganizationTreeOperationsMemberItem{},
		}
	}
	items := buildOrganizationTreeOperationsMemberItems(input, readModel.ReadModelSource, connectionIndex, departmentId)
	total := len(items)
	start := (request.Page - 1) * request.PageSize
	if start > total {
		start = total
	}
	end := start + request.PageSize
	if end > total {
		end = total
	}
	return &OrganizationTreeOperationsMemberListResponse{
		Organization: readModel.Organization,
		DepartmentId: departmentId,
		Page:         request.Page,
		PageSize:     request.PageSize,
		Total:        total,
		Members:      items[start:end],
	}
}

func organizationTreeOperationsReadModelContainsDepartment(readModel InsightOrganizationTreeResponse, departmentId string) bool {
	departmentId = strings.TrimSpace(departmentId)
	if departmentId == "" {
		return false
	}
	for _, node := range readModel.Nodes {
		if strings.TrimSpace(node.DepartmentId) == departmentId {
			return true
		}
	}
	return false
}

func buildOrganizationTreeOperationsMemberSummaries(input insightOrganizationTreeReadModelInput, readModelSource string, connections map[string]object.SourceConnection) map[string]OrganizationTreeOperationsMemberSummary {
	summaries := map[string]OrganizationTreeOperationsMemberSummary{}
	for _, item := range buildOrganizationTreeOperationsMemberItems(input, readModelSource, connections, "") {
		summary := summaries[item.DepartmentId]
		summary.MemberCount++
		if item.Reason == "ok" {
			summary.ActiveMemberCount++
		}
		normalizedLifecycle := strings.ToLower(strings.TrimSpace(item.LifecycleStatus))
		switch normalizedLifecycle {
		case strings.ToLower(object.PlatformLifecycleStatusDisabled), strings.ToLower(object.PlatformLifecycleStatusDeleted):
			summary.DisabledMemberCount++
		case strings.ToLower(object.PlatformLifecycleStatusConflicted):
			summary.ConflictedMemberCount++
		case strings.ToLower(object.PlatformLifecycleStatusStale):
			summary.StaleMemberCount++
		}
		if item.MappingStatus != MappingStatusOK {
			summary.MappingIssueCount++
			if strings.EqualFold(item.MappingStatus, object.PlatformMappingStatusConflicted) {
				summary.ConflictedMemberCount++
			}
		}
		if normalizedLifecycle != strings.ToLower(object.PlatformLifecycleStatusStale) && (strings.Contains(item.Reason, "source_connection_freshness") || strings.EqualFold(item.Freshness, object.PlatformFreshnessStale) || strings.EqualFold(item.Freshness, object.PlatformFreshnessUnknown) || strings.EqualFold(item.Freshness, object.PlatformFreshnessUnavailable)) {
			summary.StaleMemberCount++
		}
		summaries[item.DepartmentId] = summary
	}
	return summaries
}

func buildOrganizationTreeOperationsMemberItems(input insightOrganizationTreeReadModelInput, readModelSource string, connections map[string]object.SourceConnection, departmentId string) []OrganizationTreeOperationsMemberItem {
	organization := normalizeInsightScopeOrganization(input.CurrentUser, input.Organization)
	if organization == "" && input.Scope != nil {
		organization = strings.TrimSpace(input.Scope.Organization)
	}
	departmentId = strings.TrimSpace(departmentId)
	usersBySubject := indexOrganizationTreeOperationsPlatformUsers(input.PlatformUsers)
	identitiesBySubject := indexOrganizationTreeOperationsExternalIdentities(input.ExternalIdentities)
	apiMappingsBySubject := indexOrganizationTreeOperationsPlatformApiUserMappings(input.PlatformApiUserMappings)
	batchesBySource := indexOrganizationTreeOperationsBatchesBySource(input.SyncBatches)
	items := []OrganizationTreeOperationsMemberItem{}
	for _, membership := range input.PlatformMemberships {
		if membership.OrganizationId != organization || strings.TrimSpace(membership.AdminSubject) == "" || strings.TrimSpace(membership.DepartmentId) == "" {
			continue
		}
		if departmentId != "" && membership.DepartmentId != departmentId {
			continue
		}
		user := usersBySubject[membership.AdminSubject]
		identity := selectOrganizationTreeOperationsExternalIdentity(identitiesBySubject[membership.AdminSubject], membership.SourceConnectionId)
		apiMapping := apiMappingsBySubject[membership.AdminSubject]
		item := buildOrganizationTreeOperationsMemberItem(organization, membership, user, identity, apiMapping, connections, batchesBySource, readModelSource)
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].DisplayName == items[j].DisplayName {
			return items[i].StableSubjectId < items[j].StableSubjectId
		}
		return items[i].DisplayName < items[j].DisplayName
	})
	return items
}

func buildOrganizationTreeOperationsMemberItem(organization string, membership object.PlatformMembership, user *object.PlatformUser, identity *object.ExternalIdentity, apiMapping *object.PlatformApiUserMapping, connections map[string]object.SourceConnection, batches map[string]object.OrgSyncBatch, readModelSource string) OrganizationTreeOperationsMemberItem {
	sourceConnectionId := strings.TrimSpace(membership.SourceConnectionId)
	sourceType := "platform"
	freshness := ""
	if connection, ok := connections[sourceConnectionId]; ok {
		sourceType = firstNonEmptyInsightString(strings.TrimSpace(connection.SourceType), sourceType)
		freshness = strings.TrimSpace(connection.Freshness)
	}
	if freshness == "" {
		if batch, ok := batches[sourceConnectionId]; ok {
			freshness = strings.TrimSpace(batch.Freshness)
		}
	}
	lifecycleStatus := organizationTreeOperationsMemberLifecycleStatus(membership, user)
	mappingStatus := organizationTreeOperationsMemberMappingStatus(membership, user, identity, apiMapping)
	reason := organizationTreeOperationsMemberReason(lifecycleStatus, mappingStatus, sourceConnectionId, connections)
	sourceOrgVersion := strings.TrimSpace(membership.OrgVersion)
	if sourceOrgVersion == "" && user != nil {
		sourceOrgVersion = strings.TrimSpace(user.OrgVersion)
	}
	lastSeenBatchId := ""
	if user != nil {
		lastSeenBatchId = strings.TrimSpace(user.LastSeenBatchId)
	}
	if identity != nil && strings.TrimSpace(identity.LastSeenBatchId) != "" {
		lastSeenBatchId = strings.TrimSpace(identity.LastSeenBatchId)
	}
	if lastSeenBatchId == "" {
		if batch, ok := batches[sourceConnectionId]; ok {
			lastSeenBatchId = strings.TrimSpace(batch.BatchId)
		}
	}
	displayName := ""
	if user != nil {
		displayName = strings.TrimSpace(user.DisplayName)
	}
	return OrganizationTreeOperationsMemberItem{
		StableSubjectId:    insightStableHash("subj-", organization, membership.AdminSubject)[:21],
		DisplayName:        displayName,
		DepartmentId:       strings.TrimSpace(membership.DepartmentId),
		LifecycleStatus:    lifecycleStatus,
		MappingStatus:      mappingStatus,
		SourceType:         sourceType,
		SourceConnectionId: sourceConnectionId,
		ReadModelSource:    readModelSource,
		Freshness:          freshness,
		Reason:             reason,
		IsMain:             membership.IsMain,
		IsManager:          membership.IsManager,
		IsDirectLeader:     membership.IsDirectLeader,
		Lineage: OrganizationTreeOperationsMemberLineage{
			SourceType:         sourceType,
			SourceConnectionId: sourceConnectionId,
			SourceOrgVersion:   sourceOrgVersion,
			LastSeenBatchId:    lastSeenBatchId,
			Digest:             insightStableHash("sha256:", organization, membership.DepartmentId, membership.AdminSubject, lifecycleStatus, mappingStatus, sourceConnectionId, sourceOrgVersion, lastSeenBatchId),
		},
	}
}

func organizationTreeOperationsMemberLifecycleStatus(membership object.PlatformMembership, user *object.PlatformUser) string {
	membershipStatus := strings.TrimSpace(membership.LifecycleStatus)
	if membershipStatus != "" && !object.IsPlatformLifecycleStatusUsableForScope(membershipStatus) {
		return membershipStatus
	}
	if user != nil && strings.TrimSpace(user.LifecycleStatus) != "" {
		return strings.TrimSpace(user.LifecycleStatus)
	}
	if membershipStatus != "" {
		return membershipStatus
	}
	return object.PlatformLifecycleStatusUnknown
}

func organizationTreeOperationsMemberMappingStatus(membership object.PlatformMembership, user *object.PlatformUser, identity *object.ExternalIdentity, apiMapping *object.PlatformApiUserMapping) string {
	if user == nil {
		return MappingStatusMissing
	}
	if strings.TrimSpace(membership.SourceConnectionId) != "" && identity == nil {
		return MappingStatusMissing
	}
	if apiMapping == nil {
		return MappingStatusMissing
	}
	for _, status := range []string{user.MappingStatus, identityMappingStatus(identity), apiMapping.MappingStatus} {
		status = strings.TrimSpace(status)
		if status == "" {
			continue
		}
		if !object.IsConfirmedPlatformApiMappingStatus(status) {
			return status
		}
	}
	if strings.TrimSpace(apiMapping.ApiUserId) == "" {
		return MappingStatusInvalid
	}
	return MappingStatusOK
}

func identityMappingStatus(identity *object.ExternalIdentity) string {
	if identity == nil {
		return ""
	}
	return strings.TrimSpace(identity.MappingStatus)
}

func organizationTreeOperationsMemberReason(lifecycleStatus string, mappingStatus string, sourceConnectionId string, connections map[string]object.SourceConnection) string {
	if reason := organizationTreeOperationsSourceReason(sourceConnectionId, connections); reason != "" {
		return reason
	}
	if !object.IsPlatformLifecycleStatusUsableForScope(lifecycleStatus) {
		return "lifecycle_" + strings.ToLower(strings.TrimSpace(lifecycleStatus))
	}
	if mappingStatus != MappingStatusOK {
		if mappingStatus == MappingStatusMissing {
			return "mapping_missing"
		}
		return "mapping_" + strings.ToLower(strings.TrimSpace(mappingStatus))
	}
	return "ok"
}

func organizationTreeOperationsSourceReason(sourceConnectionId string, connections map[string]object.SourceConnection) string {
	sourceConnectionId = strings.TrimSpace(sourceConnectionId)
	if sourceConnectionId == "" {
		return ""
	}
	connection, ok := connections[sourceConnectionId]
	if !ok {
		return "source_connection_missing"
	}
	if !strings.EqualFold(strings.TrimSpace(connection.Status), object.SourceConnectionStatusActive) {
		return "source_connection_" + strings.ToLower(strings.TrimSpace(connection.Status))
	}
	if !strings.EqualFold(strings.TrimSpace(connection.Freshness), object.PlatformFreshnessFresh) {
		return "source_connection_freshness_" + strings.ToLower(strings.TrimSpace(connection.Freshness))
	}
	return ""
}

func normalizeOrganizationTreeOperationsMemberRequest(request organizationTreeOperationsMemberRequest) organizationTreeOperationsMemberRequest {
	if request.Page <= 0 {
		request.Page = 1
	}
	if request.PageSize <= 0 {
		request.PageSize = organizationTreeOperationsDefaultPageSize
	}
	if request.PageSize > organizationTreeOperationsMaxPageSize {
		request.PageSize = organizationTreeOperationsMaxPageSize
	}
	return request
}

func parseOrganizationTreeOperationsIntQuery(value string) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return 0
	}
	return parsed
}

func indexOrganizationTreeOperationsPlatformUsers(users []object.PlatformUser) map[string]*object.PlatformUser {
	index := map[string]*object.PlatformUser{}
	for i := range users {
		user := &users[i]
		adminSubject := strings.TrimSpace(user.AdminSubject)
		if adminSubject == "" {
			continue
		}
		index[adminSubject] = user
	}
	return index
}

func indexOrganizationTreeOperationsExternalIdentities(identities []object.ExternalIdentity) map[string][]object.ExternalIdentity {
	index := map[string][]object.ExternalIdentity{}
	for _, identity := range identities {
		if identity.PlatformSubjectType != object.PlatformSubjectTypeUser || strings.TrimSpace(identity.PlatformSubject) == "" {
			continue
		}
		index[identity.PlatformSubject] = append(index[identity.PlatformSubject], identity)
	}
	return index
}

func selectOrganizationTreeOperationsExternalIdentity(identities []object.ExternalIdentity, sourceConnectionId string) *object.ExternalIdentity {
	sourceConnectionId = strings.TrimSpace(sourceConnectionId)
	for i := range identities {
		if sourceConnectionId != "" && strings.TrimSpace(identities[i].SourceConnectionId) == sourceConnectionId {
			return &identities[i]
		}
	}
	if len(identities) == 0 {
		return nil
	}
	return &identities[0]
}

func indexOrganizationTreeOperationsPlatformApiUserMappings(mappings []object.PlatformApiUserMapping) map[string]*object.PlatformApiUserMapping {
	index := map[string]*object.PlatformApiUserMapping{}
	for i := range mappings {
		mapping := &mappings[i]
		adminSubject := strings.TrimSpace(mapping.AdminSubject)
		if adminSubject == "" {
			continue
		}
		index[adminSubject] = mapping
	}
	return index
}

func indexOrganizationTreeOperationsBatchesBySource(batches []object.OrgSyncBatch) map[string]object.OrgSyncBatch {
	index := map[string]object.OrgSyncBatch{}
	for _, batch := range batches {
		sourceConnectionId := strings.TrimSpace(batch.SourceConnectionId)
		if sourceConnectionId == "" {
			continue
		}
		existing, ok := index[sourceConnectionId]
		if !ok || batch.FinishedAt.After(existing.FinishedAt) || batch.StartedAt.After(existing.StartedAt) {
			index[sourceConnectionId] = batch
		}
	}
	return index
}

func dereferenceOrganizationTreeOperationsPlatformUsers(values []*object.PlatformUser) []object.PlatformUser {
	result := make([]object.PlatformUser, 0, len(values))
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}

func dereferenceOrganizationTreeOperationsPlatformMemberships(values []*object.PlatformMembership) []object.PlatformMembership {
	result := make([]object.PlatformMembership, 0, len(values))
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}

func dereferenceOrganizationTreeOperationsExternalIdentities(values []*object.ExternalIdentity) []object.ExternalIdentity {
	result := make([]object.ExternalIdentity, 0, len(values))
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}

func dereferenceOrganizationTreeOperationsPlatformApiUserMappings(values []*object.PlatformApiUserMapping) []object.PlatformApiUserMapping {
	result := make([]object.PlatformApiUserMapping, 0, len(values))
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}

func buildOrganizationTreeOperationsDiagnosticItems(input insightOrganizationTreeReadModelInput, readModel InsightOrganizationTreeResponse, connections map[string]object.SourceConnection, providerErr *InsightProviderError) []OrganizationTreeOperationsDiagnosticItem {
	visibleNodeIds := map[string]bool{}
	for _, node := range readModel.Nodes {
		visibleNodeIds[node.DepartmentId] = true
	}
	items := []OrganizationTreeOperationsDiagnosticItem{}
	for _, department := range input.PlatformDepartments {
		if visibleNodeIds[department.DepartmentId] {
			continue
		}
		reason, freshness := organizationTreeOperationsDepartmentReason(department, connections)
		if reason == "" {
			reason = "not_in_current_scope"
		}
		items = append(items, OrganizationTreeOperationsDiagnosticItem{
			SubjectType:        object.PlatformSubjectTypeDepartment,
			SubjectId:          department.DepartmentId,
			ParentSubjectId:    department.ParentDepartmentId,
			DisplayName:        department.DisplayName,
			Reason:             reason,
			LifecycleStatus:    department.LifecycleStatus,
			SourceConnectionId: strings.TrimSpace(department.SourceConnectionId),
			Freshness:          freshness,
			ReadModelSource:    readModel.ReadModelSource,
		})
	}
	if providerErr != nil {
		items = append(items, OrganizationTreeOperationsDiagnosticItem{
			SubjectType:     "read_model",
			SubjectId:       readModel.Organization,
			Reason:          providerErr.Code,
			Freshness:       readModel.Freshness,
			ReadModelSource: readModel.ReadModelSource,
		})
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Reason == items[j].Reason {
			return items[i].SubjectId < items[j].SubjectId
		}
		return items[i].Reason < items[j].Reason
	})
	return items
}

func organizationTreeOperationsDepartmentReason(department object.PlatformDepartment, connections map[string]object.SourceConnection) (string, string) {
	if !object.IsPlatformLifecycleStatusUsableForScope(department.LifecycleStatus) {
		return "lifecycle_" + strings.ToLower(strings.TrimSpace(department.LifecycleStatus)), ""
	}
	sourceConnectionId := strings.TrimSpace(department.SourceConnectionId)
	if sourceConnectionId == "" {
		return "", ""
	}
	connection, ok := connections[sourceConnectionId]
	if !ok {
		return "source_connection_missing", object.PlatformFreshnessUnknown
	}
	if !strings.EqualFold(strings.TrimSpace(connection.Status), object.SourceConnectionStatusActive) {
		return "source_connection_" + strings.ToLower(strings.TrimSpace(connection.Status)), connection.Freshness
	}
	if !strings.EqualFold(strings.TrimSpace(connection.Freshness), object.PlatformFreshnessFresh) {
		return "source_connection_freshness_" + strings.ToLower(strings.TrimSpace(connection.Freshness)), connection.Freshness
	}
	return "", connection.Freshness
}

func classifyOrganizationTreeOperationsEmptyTree(input insightOrganizationTreeReadModelInput, readModel InsightOrganizationTreeResponse, providerErr *InsightProviderError) (string, string) {
	if len(readModel.Nodes) > 0 {
		return "", ""
	}
	visibleDepartments, _ := visibleInsightOrganizationTreeDepartmentIds(input.Scope, input.CurrentUser)
	if len(visibleDepartments) == 0 {
		return organizationTreeEmptyClassBusinessEmpty, "scope_has_no_manageable_departments"
	}
	if len(input.PlatformDepartments) == 0 {
		return organizationTreeEmptyClassTestDataGap, "platform_departments_missing"
	}
	if providerErr != nil {
		return organizationTreeEmptyClassUntrusted, "read_model_fail_closed"
	}
	return organizationTreeEmptyClassTestDataGap, "visible_departments_missing_from_read_model"
}

func buildOrganizationTreeOperationsSourceSummaries(connections []object.SourceConnection) []OrganizationTreeOperationsSourceSummary {
	summaries := make([]OrganizationTreeOperationsSourceSummary, 0, len(connections))
	for _, connection := range connections {
		summaries = append(summaries, OrganizationTreeOperationsSourceSummary{
			SourceConnectionId: strings.TrimSpace(connection.SourceConnectionId),
			SourceType:         strings.TrimSpace(connection.SourceType),
			Status:             strings.TrimSpace(connection.Status),
			Freshness:          strings.TrimSpace(connection.Freshness),
			LastSeenBatchId:    strings.TrimSpace(connection.LastSeenBatchId),
			Configured:         strings.TrimSpace(connection.ConfigRef) != "",
		})
	}
	sort.Slice(summaries, func(i, j int) bool {
		return summaries[i].SourceConnectionId < summaries[j].SourceConnectionId
	})
	return summaries
}

func latestInsightOrganizationTreeAnySyncBatch(batches []object.OrgSyncBatch) *object.OrgSyncBatch {
	var selected *object.OrgSyncBatch
	for i := range batches {
		batch := batches[i]
		if selected == nil || batch.FinishedAt.After(selected.FinishedAt) || batch.StartedAt.After(selected.StartedAt) {
			copied := batch
			selected = &copied
		}
	}
	return selected
}

func newOrganizationTreeOperationsSyncBatch(batch *object.OrgSyncBatch) *OrganizationTreeOperationsSyncBatch {
	if batch == nil {
		return nil
	}
	return &OrganizationTreeOperationsSyncBatch{
		BatchId:            batch.BatchId,
		SourceConnectionId: batch.SourceConnectionId,
		Status:             batch.Status,
		OrgVersion:         batch.OrgVersion,
		Freshness:          batch.Freshness,
		StartedAt:          formatInsightTime(batch.StartedAt),
		FinishedAt:         formatInsightTime(batch.FinishedAt),
		ErrorCode:          batch.ErrorCode,
	}
}

func filterOrganizationTreeOperationsResults(nodes []OrganizationTreeOperationsNode, diagnostics []OrganizationTreeOperationsDiagnosticItem, request organizationTreeOperationsDiagnosticRequest) ([]OrganizationTreeOperationsNode, []OrganizationTreeOperationsDiagnosticItem) {
	filteredNodes := make([]OrganizationTreeOperationsNode, 0, len(nodes))
	for _, node := range nodes {
		if !matchesOrganizationTreeOperationsNode(node, request) {
			continue
		}
		filteredNodes = append(filteredNodes, node)
	}
	filteredDiagnostics := make([]OrganizationTreeOperationsDiagnosticItem, 0, len(diagnostics))
	for _, item := range diagnostics {
		if !matchesOrganizationTreeOperationsDiagnosticItem(item, request) {
			continue
		}
		filteredDiagnostics = append(filteredDiagnostics, item)
	}
	return filteredNodes, filteredDiagnostics
}

func matchesOrganizationTreeOperationsNode(node OrganizationTreeOperationsNode, request organizationTreeOperationsDiagnosticRequest) bool {
	if !containsOrganizationTreeOperationsText([]string{node.DepartmentId, node.DepartmentName, node.ParentDepartmentId, node.DepartmentPath, node.SourceConnectionId}, request.Query) {
		return false
	}
	if !matchesOptionalFold(node.LifecycleStatus, request.LifecycleStatus) {
		return false
	}
	if !matchesOptionalFold(node.SourceConnectionStatus, request.SourceConnectionStatus) {
		return false
	}
	if !matchesOptionalFold(node.SourceConnectionFreshness, request.Freshness) {
		return false
	}
	return matchesOptionalFold(node.ReadModelSource, request.ReadModelSource)
}

func matchesOrganizationTreeOperationsDiagnosticItem(item OrganizationTreeOperationsDiagnosticItem, request organizationTreeOperationsDiagnosticRequest) bool {
	if !containsOrganizationTreeOperationsText([]string{item.SubjectId, item.ParentSubjectId, item.DisplayName, item.SourceConnectionId, item.Reason}, request.Query) {
		return false
	}
	if !matchesOptionalFold(item.LifecycleStatus, request.LifecycleStatus) {
		return false
	}
	if request.SourceConnectionStatus != "" && !strings.Contains(strings.ToLower(item.Reason), strings.ToLower(request.SourceConnectionStatus)) {
		return false
	}
	if !matchesOptionalFold(item.Freshness, request.Freshness) {
		return false
	}
	return matchesOptionalFold(item.ReadModelSource, request.ReadModelSource)
}

func containsOrganizationTreeOperationsText(values []string, query string) bool {
	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return true
	}
	for _, value := range values {
		if strings.Contains(strings.ToLower(value), query) {
			return true
		}
	}
	return false
}

func matchesOptionalFold(value string, expected string) bool {
	expected = strings.TrimSpace(expected)
	if expected == "" {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(value), expected)
}

func (c *ApiController) triggerOrganizationTreeOperationsSourceRefresh(traceId string, user *object.User, organization string) OrganizationTreeOperationsRefreshResponse {
	response := OrganizationTreeOperationsRefreshResponse{
		TraceId:      traceId,
		Organization: organization,
		TriggerType:  organizationTreeOperationRefreshReadModel,
	}
	config, err := getOrganizationTreeOperationsWecomConfig(organization)
	if err != nil {
		response.Status = "error"
		response.Reason = err.Error()
		writeOrganizationTreeOperationsAudit(organizationTreeOperationsAuditEvent{TraceId: traceId, Actor: user.GetId(), Organization: organization, Operation: response.TriggerType, Status: response.Status, Reason: response.Reason})
		return response
	}
	if config == nil || !config.IsEnabled {
		response.Status = "unavailable"
		response.Reason = "source sync config is not enabled"
		writeOrganizationTreeOperationsAudit(organizationTreeOperationsAuditEvent{TraceId: traceId, Actor: user.GetId(), Organization: organization, Operation: response.TriggerType, Status: response.Status, Reason: response.Reason})
		return response
	}
	result, err := startOrganizationTreeOperationsWecomRun(config, user.GetId())
	if err != nil {
		response.Status = "error"
		response.Reason = err.Error()
		if errors.Is(err, object.ErrWecomOrganizationSyncRunAlreadyRunning) {
			response.Status = "running"
			response.Reason = "source sync run is already running"
		}
		writeOrganizationTreeOperationsAudit(organizationTreeOperationsAuditEvent{TraceId: traceId, Actor: user.GetId(), Organization: organization, Operation: response.TriggerType, Status: response.Status, Reason: response.Reason})
		return response
	}
	response.Status = "accepted"
	if result != nil && result.Run != nil {
		response.RunId = result.Run.Name
	}
	writeOrganizationTreeOperationsAudit(organizationTreeOperationsAuditEvent{TraceId: traceId, Actor: user.GetId(), Organization: organization, Operation: response.TriggerType, Status: response.Status, Reason: response.Reason})
	return response
}

func writeOrganizationTreeOperationsAudit(event organizationTreeOperationsAuditEvent) {
	// 运营审计只记录脱敏 lineage 摘要和稳定状态，不输出 token、Cookie、手机号、邮箱或完整来源响应。
	logs.Info("organization_tree_operations_audit traceId=%s actor=%s organization=%s operation=%s status=%s reason=%s readModelSource=%s orgVersion=%s sourceConnectionId=%s batchId=%s",
		event.TraceId, event.Actor, event.Organization, event.Operation, event.Status, event.Reason, event.Lineage.ReadModelSource, event.Lineage.SourceOrgVersion, event.Lineage.SourceConnectionId, event.Lineage.BatchId)
}

func maxInt(a int, b int) int {
	if a > b {
		return a
	}
	return b
}
