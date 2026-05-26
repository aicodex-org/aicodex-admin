package controllers

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/conf"
	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/beego/beego/v2/core/logs"
	"github.com/golang-jwt/jwt/v5"
)

const (
	InsightProviderErrorUnauthenticated     = "UNAUTHENTICATED"
	InsightProviderErrorAuthorizationFailed = "AUTHORIZATION_FAILED"
	InsightProviderErrorInvalidArgument     = "INVALID_ARGUMENT"
	InsightProviderErrorUnavailable         = "PROVIDER_UNAVAILABLE"

	MappingStatusOK        = "OK"
	MappingStatusMissing   = "MISSING"
	MappingStatusAmbiguous = "AMBIGUOUS"
	MappingStatusInvalid   = "INVALID"

	ScopeTypeAllCompany     = "ALL_COMPANY"
	ScopeTypeDepartmentTree = "DEPARTMENT_TREE"
	ScopeTypeCustomUsers    = "CUSTOM_USERS"
	ScopeTypeSelf           = "SELF"
	ScopeTypeEmpty          = "EMPTY"

	insightProviderScopeVersion          = "2026-05-21"
	insightProviderDefaultRequiredScopes = "profile insight.scope.read"
)

type InsightProviderEnvelope struct {
	Status  string                `json:"status"`
	TraceId string                `json:"traceId"`
	Data    interface{}           `json:"data,omitempty"`
	Error   *InsightProviderError `json:"error,omitempty"`
}

type InsightProviderError struct {
	Code          string `json:"code"`
	Message       string `json:"message"`
	TraceId       string `json:"traceId,omitempty"`
	MappingStatus string `json:"mappingStatus,omitempty"`
}

type InsightUsageIdentity struct {
	ApiUserId     string `json:"apiUserId,omitempty"`
	MappingStatus string `json:"mappingStatus"`
	MappingSource string `json:"mappingSource,omitempty"`
}

type InsightProviderGroup struct {
	DepartmentId       string `json:"departmentId"`
	DepartmentName     string `json:"departmentName"`
	ParentDepartmentId string `json:"parentDepartmentId,omitempty"`
}

type InsightCurrentUserResponse struct {
	AdminUserId       string                 `json:"adminUserId"`
	Username          string                 `json:"username"`
	DisplayName       string                 `json:"displayName"`
	Organization      string                 `json:"organization"`
	ApiOrganizationId string                 `json:"apiOrganizationId,omitempty"`
	Roles             []string               `json:"roles"`
	Groups            []InsightProviderGroup `json:"groups"`
	UsageIdentity     InsightUsageIdentity   `json:"usageIdentity"`
	GeneratedAt       string                 `json:"generatedAt"`
}

type InsightScopeResponse struct {
	// AdminUserId 表示本次 provider 调用的当前 admin 用户，用于 insight/api 跨服务审计。
	AdminUserId             string                   `json:"adminUserId"`
	ScopeType               string                   `json:"scopeType"`
	Organization            string                   `json:"organization"`
	ApiOrganizationId       string                   `json:"apiOrganizationId,omitempty"`
	DepartmentIds           []string                 `json:"departmentIds"`
	AdminUserIds            []string                 `json:"adminUserIds"`
	ApiUserIds              []string                 `json:"apiUserIds"`
	Departments             []InsightDepartmentScope `json:"departments"`
	IncludeChildDepartments bool                     `json:"includeChildDepartments"`
	MappingStatus           string                   `json:"mappingStatus"`
	GeneratedAt             string                   `json:"generatedAt"`
	ScopeVersion            string                   `json:"scopeVersion"`
}

type InsightDepartmentScope struct {
	DepartmentId            string   `json:"departmentId"`
	AdminUserIds            []string `json:"adminUserIds"`
	ApiUserIds              []string `json:"apiUserIds"`
	IncludeChildDepartments bool     `json:"includeChildDepartments"`
	MappingStatus           string   `json:"mappingStatus"`
}

type InsightOrganizationTreeNode struct {
	DepartmentId       string `json:"departmentId"`
	DepartmentName     string `json:"departmentName"`
	ParentDepartmentId string `json:"parentDepartmentId"`
	DepartmentPath     string `json:"departmentPath"`
	HasChildren        bool   `json:"hasChildren"`
	SourceType         string `json:"sourceType"`
}

type insightProviderAuditEvent struct {
	TraceId        string
	AdminUserId    string
	Organization   string
	ScopeType      string
	GroupCount     int
	AdminUserCount int
	ApiUserCount   int
	MappingStatus  string
	Status         string
	ErrorCode      string
}

// GetInsightCurrentUser 返回 insight 只读消费的当前 admin 用户白名单字段。
func (c *ApiController) GetInsightCurrentUser() {
	traceId := c.getInsightProviderTraceId()
	generatedAt := time.Now().UTC()
	user, providerErr := c.requireInsightProviderUser(traceId)
	if providerErr != nil {
		c.writeInsightProviderError(http.StatusUnauthorized, providerErr, insightProviderAuditEvent{TraceId: traceId, Status: "error", ErrorCode: providerErr.Code})
		return
	}

	roles, err := getInsightProviderRoleIds(user)
	if err != nil {
		c.writeInsightProviderError(http.StatusInternalServerError, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, ""), insightProviderAuditEvent{TraceId: traceId, AdminUserId: user.GetId(), Organization: user.Owner, Status: "error", ErrorCode: InsightProviderErrorUnavailable})
		return
	}
	groups, err := getInsightProviderUserGroups(user)
	if err != nil {
		c.writeInsightProviderError(http.StatusInternalServerError, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, ""), insightProviderAuditEvent{TraceId: traceId, AdminUserId: user.GetId(), Organization: user.Owner, Status: "error", ErrorCode: InsightProviderErrorUnavailable})
		return
	}

	data := buildInsightCurrentUserResponse(user, roles, groups, generatedAt)
	c.writeInsightProviderSuccess(traceId, data, insightProviderAuditEvent{
		TraceId:        traceId,
		AdminUserId:    user.GetId(),
		Organization:   user.Owner,
		GroupCount:     len(groups),
		AdminUserCount: 1,
		ApiUserCount:   countNonEmptyStrings([]string{data.UsageIdentity.ApiUserId}),
		MappingStatus:  data.UsageIdentity.MappingStatus,
		Status:         "ok",
	})
}

// GetInsightCurrentUserScope 在 admin 服务端计算 insight 可查询的用量 scope。
func (c *ApiController) GetInsightCurrentUserScope() {
	traceId := c.getInsightProviderTraceId()
	generatedAt := time.Now().UTC()
	user, providerErr := c.requireInsightProviderUser(traceId)
	if providerErr != nil {
		c.writeInsightProviderError(http.StatusUnauthorized, providerErr, insightProviderAuditEvent{TraceId: traceId, Status: "error", ErrorCode: providerErr.Code})
		return
	}

	organization := c.getInsightProviderScopeOrganization(user)
	users, groups, err := getInsightProviderScopeSource(organization)
	if err != nil {
		c.writeInsightProviderError(http.StatusInternalServerError, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, ""), insightProviderAuditEvent{TraceId: traceId, AdminUserId: user.GetId(), Organization: organization, Status: "error", ErrorCode: InsightProviderErrorUnavailable})
		return
	}

	data, providerErr := calculateInsightScopeForOrganization(user, organization, users, groups, generatedAt)
	if providerErr != nil {
		providerErr.TraceId = traceId
		c.writeInsightProviderError(http.StatusForbidden, providerErr, insightProviderAuditEvent{TraceId: traceId, AdminUserId: user.GetId(), Organization: organization, MappingStatus: providerErr.MappingStatus, Status: "error", ErrorCode: providerErr.Code})
		return
	}

	c.writeInsightProviderSuccess(traceId, data, insightProviderAuditEvent{
		TraceId:        traceId,
		AdminUserId:    user.GetId(),
		Organization:   data.Organization,
		ScopeType:      data.ScopeType,
		GroupCount:     len(data.DepartmentIds),
		AdminUserCount: len(data.AdminUserIds),
		ApiUserCount:   len(data.ApiUserIds),
		MappingStatus:  data.MappingStatus,
		Status:         "ok",
	})
}

// GetInsightCurrentUserOrganizationTree 返回当前用户可管理的 group/部门树节点。
func (c *ApiController) GetInsightCurrentUserOrganizationTree() {
	traceId := c.getInsightProviderTraceId()
	user, providerErr := c.requireInsightProviderUser(traceId)
	if providerErr != nil {
		c.writeInsightProviderError(http.StatusUnauthorized, providerErr, insightProviderAuditEvent{TraceId: traceId, Status: "error", ErrorCode: providerErr.Code})
		return
	}

	organization := c.getInsightProviderScopeOrganization(user)
	groups, err := object.GetGroups(organization)
	if err != nil {
		c.writeInsightProviderError(http.StatusInternalServerError, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, ""), insightProviderAuditEvent{TraceId: traceId, AdminUserId: user.GetId(), Organization: organization, Status: "error", ErrorCode: InsightProviderErrorUnavailable})
		return
	}

	data := buildInsightOrganizationTreeForOrganization(user, organization, groups)
	c.writeInsightProviderSuccess(traceId, data, insightProviderAuditEvent{
		TraceId:       traceId,
		AdminUserId:   user.GetId(),
		Organization:  organization,
		GroupCount:    len(data),
		MappingStatus: MappingStatusOK,
		Status:        "ok",
	})
}

func buildInsightCurrentUserResponse(user *object.User, roles []string, groups []InsightProviderGroup, generatedAt time.Time) *InsightCurrentUserResponse {
	return &InsightCurrentUserResponse{
		AdminUserId:       user.GetId(),
		Username:          user.Name,
		DisplayName:       user.GetFriendlyName(),
		Organization:      user.Owner,
		ApiOrganizationId: resolveInsightAPIOrganizationID(user),
		Roles:             deduplicateStrings(roles),
		Groups:            groups,
		UsageIdentity:     resolveInsightUsageIdentity(user),
		GeneratedAt:       formatInsightTime(generatedAt),
	}
}

func calculateInsightScope(currentUser *object.User, users []*object.User, groups []*object.Group, generatedAt time.Time) (*InsightScopeResponse, *InsightProviderError) {
	organization := getInsightScopeOrganization(currentUser, users)
	return calculateInsightScopeForOrganization(currentUser, organization, users, groups, generatedAt)
}

func calculateInsightScopeForOrganization(currentUser *object.User, organization string, users []*object.User, groups []*object.Group, generatedAt time.Time) (*InsightScopeResponse, *InsightProviderError) {
	if providerErr := validateInsightProviderActiveUser(currentUser, ""); providerErr != nil {
		return nil, providerErr
	}

	organization = normalizeInsightScopeOrganization(currentUser, organization)
	apiOrganizationId := resolveInsightAPIOrganizationID(currentUser)
	orgUsers := filterInsightUsersByOwner(users, organization)
	orgGroups := filterInsightGroupsByOwner(groups, organization)

	if currentUser.IsGlobalAdmin() || currentUser.IsAdmin {
		return buildInsightAllCompanyScope(currentUser.GetId(), organization, apiOrganizationId, orgUsers, generatedAt)
	}

	managedGroups := getInsightManagedGroups(currentUser, orgGroups)
	if len(managedGroups) > 0 {
		return buildInsightDepartmentTreeScope(currentUser.GetId(), organization, apiOrganizationId, orgUsers, orgGroups, managedGroups, generatedAt)
	}

	customUsers := getInsightCustomScopeUsers(currentUser, orgUsers)
	if len(customUsers) > 0 {
		return buildInsightCustomUsersScope(currentUser.GetId(), organization, apiOrganizationId, customUsers, generatedAt)
	}

	return buildInsightSelfScope(currentUser.GetId(), organization, apiOrganizationId, currentUser, generatedAt)
}

func buildInsightAllCompanyScope(adminUserId string, organization string, apiOrganizationId string, users []*object.User, generatedAt time.Time) (*InsightScopeResponse, *InsightProviderError) {
	adminUserIds, apiUserIds, mappingStatus := mapInsightUsersToUsageIds(users)
	if mappingStatus != MappingStatusOK {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "usage user mapping is not deterministic", "", mappingStatus)
	}

	return &InsightScopeResponse{
		AdminUserId:             adminUserId,
		ScopeType:               ScopeTypeAllCompany,
		Organization:            organization,
		ApiOrganizationId:       apiOrganizationId,
		AdminUserIds:            adminUserIds,
		ApiUserIds:              apiUserIds,
		Departments:             []InsightDepartmentScope{},
		IncludeChildDepartments: true,
		MappingStatus:           MappingStatusOK,
		GeneratedAt:             formatInsightTime(generatedAt),
		ScopeVersion:            insightProviderScopeVersion,
	}, nil
}

func buildInsightDepartmentTreeScope(adminUserId string, organization string, apiOrganizationId string, users []*object.User, groups []*object.Group, managedGroups []*object.Group, generatedAt time.Time) (*InsightScopeResponse, *InsightProviderError) {
	groupByName := indexInsightGroupsByName(groups)
	allDepartmentIds := []string{}
	departments := []InsightDepartmentScope{}
	scopeAdminUserIdSet := map[string]bool{}
	scopeApiUserIdSet := map[string]bool{}

	for _, group := range managedGroups {
		subtreeNames := getInsightSubtreeGroupNames(group.Name, groupByName)
		departmentUsers := filterInsightUsersByGroups(users, subtreeNames)
		if len(departmentUsers) == 0 {
			continue
		}

		adminUserIds, apiUserIds, mappingStatus := mapInsightUsersToUsageIds(departmentUsers)
		if mappingStatus != MappingStatusOK {
			return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "usage user mapping is not deterministic", "", mappingStatus)
		}

		departmentId := group.GetId()
		allDepartmentIds = append(allDepartmentIds, departmentId)
		departments = append(departments, InsightDepartmentScope{
			DepartmentId:            departmentId,
			AdminUserIds:            adminUserIds,
			ApiUserIds:              apiUserIds,
			IncludeChildDepartments: true,
			MappingStatus:           MappingStatusOK,
		})
		for _, id := range adminUserIds {
			scopeAdminUserIdSet[id] = true
		}
		for _, id := range apiUserIds {
			scopeApiUserIdSet[id] = true
		}
	}

	if len(departments) == 0 {
		return buildInsightEmptyScope(adminUserId, organization, apiOrganizationId, generatedAt), nil
	}

	sortInsightDepartmentScopes(departments)
	return &InsightScopeResponse{
		AdminUserId:             adminUserId,
		ScopeType:               ScopeTypeDepartmentTree,
		Organization:            organization,
		ApiOrganizationId:       apiOrganizationId,
		DepartmentIds:           deduplicateStrings(allDepartmentIds),
		AdminUserIds:            sortedStringSet(scopeAdminUserIdSet),
		ApiUserIds:              sortedStringSet(scopeApiUserIdSet),
		Departments:             departments,
		IncludeChildDepartments: true,
		MappingStatus:           MappingStatusOK,
		GeneratedAt:             formatInsightTime(generatedAt),
		ScopeVersion:            insightProviderScopeVersion,
	}, nil
}

func buildInsightCustomUsersScope(adminUserId string, organization string, apiOrganizationId string, users []*object.User, generatedAt time.Time) (*InsightScopeResponse, *InsightProviderError) {
	adminUserIds, apiUserIds, mappingStatus := mapInsightUsersToUsageIds(users)
	if mappingStatus != MappingStatusOK {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "usage user mapping is not deterministic", "", mappingStatus)
	}
	return &InsightScopeResponse{
		AdminUserId:       adminUserId,
		ScopeType:         ScopeTypeCustomUsers,
		Organization:      organization,
		ApiOrganizationId: apiOrganizationId,
		AdminUserIds:      adminUserIds,
		ApiUserIds:        apiUserIds,
		Departments:       []InsightDepartmentScope{},
		MappingStatus:     MappingStatusOK,
		GeneratedAt:       formatInsightTime(generatedAt),
		ScopeVersion:      insightProviderScopeVersion,
	}, nil
}

func buildInsightSelfScope(adminUserId string, organization string, apiOrganizationId string, currentUser *object.User, generatedAt time.Time) (*InsightScopeResponse, *InsightProviderError) {
	adminUserIds, apiUserIds, mappingStatus := mapInsightUsersToUsageIds([]*object.User{currentUser})
	if mappingStatus != MappingStatusOK {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "current user usage mapping is not deterministic", "", mappingStatus)
	}
	return &InsightScopeResponse{
		AdminUserId:       adminUserId,
		ScopeType:         ScopeTypeSelf,
		Organization:      organization,
		ApiOrganizationId: apiOrganizationId,
		AdminUserIds:      adminUserIds,
		ApiUserIds:        apiUserIds,
		Departments:       []InsightDepartmentScope{},
		MappingStatus:     MappingStatusOK,
		GeneratedAt:       formatInsightTime(generatedAt),
		ScopeVersion:      insightProviderScopeVersion,
	}, nil
}

func buildInsightEmptyScope(adminUserId string, organization string, apiOrganizationId string, generatedAt time.Time) *InsightScopeResponse {
	return &InsightScopeResponse{
		AdminUserId:       adminUserId,
		ScopeType:         ScopeTypeEmpty,
		Organization:      organization,
		ApiOrganizationId: apiOrganizationId,
		AdminUserIds:      []string{},
		ApiUserIds:        []string{},
		Departments:       []InsightDepartmentScope{},
		MappingStatus:     MappingStatusOK,
		GeneratedAt:       formatInsightTime(generatedAt),
		ScopeVersion:      insightProviderScopeVersion,
	}
}

func buildInsightOrganizationTree(currentUser *object.User, groups []*object.Group) []InsightOrganizationTreeNode {
	organization := getInsightScopeOrganization(currentUser, nil)
	return buildInsightOrganizationTreeForOrganization(currentUser, organization, groups)
}

func buildInsightOrganizationTreeForOrganization(currentUser *object.User, organization string, groups []*object.Group) []InsightOrganizationTreeNode {
	if currentUser == nil {
		return []InsightOrganizationTreeNode{}
	}

	organization = normalizeInsightScopeOrganization(currentUser, organization)
	orgGroups := filterInsightGroupsByOwner(groups, organization)
	groupByName := indexInsightGroupsByName(orgGroups)
	visibleNames := map[string]bool{}

	if currentUser.IsGlobalAdmin() || currentUser.IsAdmin {
		for _, group := range orgGroups {
			visibleNames[group.Name] = true
		}
	} else {
		for _, group := range getInsightManagedGroups(currentUser, orgGroups) {
			for name := range getInsightSubtreeGroupNames(group.Name, groupByName) {
				visibleNames[name] = true
			}
		}
	}

	nodes := []InsightOrganizationTreeNode{}
	for _, group := range orgGroups {
		if !visibleNames[group.Name] {
			continue
		}
		parentDepartmentId := ""
		if visibleNames[group.ParentId] {
			parentDepartmentId = util.GetId(group.Owner, group.ParentId)
		}
		nodes = append(nodes, InsightOrganizationTreeNode{
			DepartmentId:       group.GetId(),
			DepartmentName:     getInsightGroupDisplayName(group),
			ParentDepartmentId: parentDepartmentId,
			DepartmentPath:     getInsightDepartmentPath(group, groupByName, visibleNames),
			HasChildren:        hasInsightVisibleChild(group.Name, orgGroups, visibleNames),
			SourceType:         "group",
		})
	}

	sort.Slice(nodes, func(i, j int) bool {
		if nodes[i].DepartmentPath == nodes[j].DepartmentPath {
			return nodes[i].DepartmentId < nodes[j].DepartmentId
		}
		return nodes[i].DepartmentPath < nodes[j].DepartmentPath
	})
	return nodes
}

func (c *ApiController) requireInsightProviderUser(traceId string) (*object.User, *InsightProviderError) {
	token := getInsightBearerToken(c.Ctx.Request.Header.Get("Authorization"))
	if token != "" {
		return getInsightProviderUserByBearerToken(token, c.Ctx.Request.Host, traceId)
	}

	userId := c.GetSessionUsername()
	if userId == "" {
		return nil, newInsightProviderError(InsightProviderErrorUnauthenticated, "missing user token or login session", traceId, "")
	}
	user, err := object.GetUser(userId)
	if err != nil {
		return nil, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, "")
	}
	if user == nil {
		return nil, newInsightProviderError(InsightProviderErrorUnauthenticated, "login session user does not exist", traceId, "")
	}
	if providerErr := validateInsightProviderActiveUser(user, traceId); providerErr != nil {
		return nil, providerErr
	}
	return user, nil
}

func getInsightProviderUserByBearerToken(token string, host string, traceId string) (*object.User, *InsightProviderError) {
	mapClaims := jwt.MapClaims{}
	if _, _, err := jwt.NewParser().ParseUnverified(token, mapClaims); err != nil {
		return nil, newInsightProviderError(InsightProviderErrorUnauthenticated, "invalid bearer token", traceId, "")
	}

	audiences := extractInsightAudiences(mapClaims["aud"])
	if !isInsightAudienceAllowed(audiences) {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "token audience is not allowed for insight provider", traceId, "")
	}

	application, err := getInsightApplicationByAudience(audiences)
	if err != nil {
		return nil, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, "")
	}
	if application == nil {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "token audience does not match an admin application", traceId, "")
	}

	// 生产路径校验签名、issuer/audience/expiry/scope；scope/audience 的具体值通过配置收紧。
	claims, err := object.ParseJwtTokenByApplication(token, application)
	if err != nil {
		return nil, newInsightProviderError(InsightProviderErrorUnauthenticated, "invalid bearer token signature or expiry", traceId, "")
	}
	if !isInsightAudienceAllowed([]string(claims.Audience)) {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "token audience is not allowed for insight provider", traceId, "")
	}
	if claims.TokenType != "" && claims.TokenType != "access-token" {
		return nil, newInsightProviderError(InsightProviderErrorUnauthenticated, "bearer token is not an access token", traceId, "")
	}
	if !isInsightIssuerAllowed(claims.Issuer) {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "token issuer is not allowed for insight provider", traceId, "")
	}
	if !hasInsightRequiredScopes(claims.Scope) {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "token scope is not allowed for insight provider", traceId, "")
	}

	user, err := getInsightUserFromClaims(claims, application)
	if err != nil {
		return nil, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, "")
	}
	if user == nil {
		return nil, newInsightProviderError(InsightProviderErrorUnauthenticated, "token subject user does not exist", traceId, "")
	}
	if providerErr := validateInsightProviderActiveUser(user, traceId); providerErr != nil {
		return nil, providerErr
	}
	return user, nil
}

func getInsightUserFromClaims(claims *object.Claims, application *object.Application) (*object.User, error) {
	if claims.User != nil && claims.User.Owner != "" && claims.User.Name != "" {
		return object.GetUser(claims.User.GetId())
	}

	owner := application.Organization
	if owner == "" && len(claims.Audience) > 0 {
		if app, err := object.GetApplicationByClientId(claims.Audience[0]); err == nil && app != nil {
			owner = app.Organization
		}
	}
	if owner == "" || claims.Subject == "" {
		return nil, nil
	}

	users, err := object.GetUsers(owner)
	if err != nil {
		return nil, err
	}
	for _, user := range users {
		if user.Id == claims.Subject {
			return user, nil
		}
	}
	return nil, nil
}

func (c *ApiController) writeInsightProviderSuccess(traceId string, data interface{}, audit insightProviderAuditEvent) {
	c.Data["json"] = InsightProviderEnvelope{Status: "ok", TraceId: traceId, Data: data}
	c.ServeJSON()
	writeInsightProviderAudit(audit)
}

func (c *ApiController) writeInsightProviderError(status int, providerErr *InsightProviderError, audit insightProviderAuditEvent) {
	if providerErr == nil {
		providerErr = newInsightProviderError(InsightProviderErrorUnavailable, "provider unavailable", "", "")
	}
	c.Ctx.Output.SetStatus(status)
	c.Data["json"] = InsightProviderEnvelope{Status: "error", TraceId: providerErr.TraceId, Error: providerErr}
	c.ServeJSON()
	writeInsightProviderAudit(audit)
}

func writeInsightProviderAudit(event insightProviderAuditEvent) {
	// 审计日志只输出稳定诊断字段，避免 token、手机号、邮箱等敏感值进入日志。
	logs.Info("insight_admin_provider_audit traceId=%s adminUserId=%s organization=%s scopeType=%s groupCount=%d adminUserCount=%d apiUserCount=%d mappingStatus=%s status=%s errorCode=%s",
		event.TraceId, event.AdminUserId, event.Organization, event.ScopeType, event.GroupCount, event.AdminUserCount, event.ApiUserCount, event.MappingStatus, event.Status, event.ErrorCode)
}

func newInsightProviderError(code string, message string, traceId string, mappingStatus string) *InsightProviderError {
	return &InsightProviderError{Code: code, Message: message, TraceId: traceId, MappingStatus: mappingStatus}
}

func validateInsightProviderActiveUser(user *object.User, traceId string) *InsightProviderError {
	if user == nil {
		return newInsightProviderError(InsightProviderErrorUnauthenticated, "current user is required", traceId, "")
	}
	if !isInsightActiveUser(user) {
		return newInsightProviderError(InsightProviderErrorAuthorizationFailed, "current user is disabled or deleted", traceId, "")
	}
	return nil
}

func isInsightActiveUser(user *object.User) bool {
	return user != nil && !user.IsForbidden && !user.IsDeleted
}

func (c *ApiController) getInsightProviderTraceId() string {
	for _, header := range []string{"X-Trace-Id", "X-Request-Id"} {
		if value := strings.TrimSpace(c.Ctx.Request.Header.Get(header)); value != "" {
			return value
		}
	}
	return util.GenerateId()
}

func (c *ApiController) getInsightProviderScopeOrganization(user *object.User) string {
	if user != nil && user.IsGlobalAdmin() {
		if organization := strings.TrimSpace(c.Ctx.Input.Query("organization")); organization != "" {
			return organization
		}
	}
	if user == nil {
		return ""
	}
	return user.Owner
}

func getInsightProviderScopeSource(organization string) ([]*object.User, []*object.Group, error) {
	users, err := object.GetUsers(organization)
	if err != nil {
		return nil, nil, err
	}
	groups, err := object.GetGroups(organization)
	if err != nil {
		return nil, nil, err
	}
	return users, groups, nil
}

func getInsightProviderRoleIds(user *object.User) ([]string, error) {
	err := object.ExtendUserWithRolesAndPermissions(user)
	if err != nil {
		return nil, err
	}
	roles := []string{}
	for _, role := range user.Roles {
		if role != nil {
			roles = append(roles, role.GetId())
		}
	}
	return roles, nil
}

func getInsightProviderUserGroups(user *object.User) ([]InsightProviderGroup, error) {
	groups, err := object.GetGroups(user.Owner)
	if err != nil {
		return nil, err
	}
	groupByName := indexInsightGroupsByName(groups)
	result := []InsightProviderGroup{}
	for _, groupRef := range user.Groups {
		_, groupName := util.GetOwnerAndNameFromIdNoCheck(groupRef)
		group, ok := groupByName[groupName]
		if !ok {
			continue
		}
		parentDepartmentId := ""
		if group.ParentId != "" {
			parentDepartmentId = util.GetId(group.Owner, group.ParentId)
		}
		result = append(result, InsightProviderGroup{
			DepartmentId:       group.GetId(),
			DepartmentName:     getInsightGroupDisplayName(group),
			ParentDepartmentId: parentDepartmentId,
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].DepartmentId < result[j].DepartmentId })
	return result, nil
}

func resolveInsightUsageIdentity(user *object.User) InsightUsageIdentity {
	if user == nil {
		return InsightUsageIdentity{MappingStatus: MappingStatusMissing}
	}
	values := []string{}
	if user.Properties != nil {
		for _, key := range []string{"aicodexApiUserId", "aicodex_api_user_id", "apiUserId"} {
			for _, value := range splitInsightCsv(user.Properties[key]) {
				values = append(values, value)
			}
		}
	}

	values = deduplicateStrings(values)
	if len(values) == 0 {
		return InsightUsageIdentity{MappingStatus: MappingStatusMissing}
	}
	if len(values) > 1 {
		return InsightUsageIdentity{MappingStatus: MappingStatusAmbiguous}
	}
	if !isPositiveInsightAPIUserID(values[0]) {
		return InsightUsageIdentity{MappingStatus: MappingStatusInvalid}
	}
	return InsightUsageIdentity{ApiUserId: values[0], MappingStatus: MappingStatusOK, MappingSource: "properties.aicodexApiUserId"}
}

func resolveInsightAPIOrganizationID(user *object.User) string {
	if user == nil || user.Properties == nil {
		return ""
	}
	values := []string{}
	for _, key := range []string{"aicodexApiOrganizationId", "aicodex_api_organization_id", "apiOrganizationId", "api_organization_id"} {
		for _, value := range splitInsightCsv(user.Properties[key]) {
			values = append(values, value)
		}
	}

	values = deduplicateStrings(values)
	if len(values) != 1 {
		return ""
	}
	// aicodex-api provider 使用独立组织 UUID；admin 仍保留自身 organization 名称用于权限计算。
	return values[0]
}

func isPositiveInsightAPIUserID(value string) bool {
	value = strings.TrimSpace(value)
	// aicodex-api 的用量聚合按内部正整数用户 ID 查询，admin 侧先拦截非数字映射。
	parsed, err := strconv.Atoi(value)
	return err == nil && parsed > 0
}

func mapInsightUsersToUsageIds(users []*object.User) ([]string, []string, string) {
	adminUserIds := []string{}
	apiUserIds := []string{}
	adminToApiUserId := map[string]string{}
	apiToAdminUserId := map[string]string{}
	for _, user := range users {
		if user == nil {
			continue
		}
		identity := resolveInsightUsageIdentity(user)
		if identity.MappingStatus != MappingStatusOK {
			return nil, nil, identity.MappingStatus
		}
		adminUserId := user.GetId()
		// 用量 ID 必须与 admin 用户一一确定映射，避免多个 admin 用户合并到同一个报表主体。
		if existingApiUserId, ok := adminToApiUserId[adminUserId]; ok && existingApiUserId != identity.ApiUserId {
			return nil, nil, MappingStatusAmbiguous
		}
		if existingAdminUserId, ok := apiToAdminUserId[identity.ApiUserId]; ok && existingAdminUserId != adminUserId {
			return nil, nil, MappingStatusAmbiguous
		}
		adminToApiUserId[adminUserId] = identity.ApiUserId
		apiToAdminUserId[identity.ApiUserId] = adminUserId
		adminUserIds = append(adminUserIds, adminUserId)
		apiUserIds = append(apiUserIds, identity.ApiUserId)
	}
	return deduplicateStrings(adminUserIds), deduplicateStrings(apiUserIds), MappingStatusOK
}

func getInsightScopeOrganization(currentUser *object.User, users []*object.User) string {
	if currentUser == nil {
		return ""
	}
	if currentUser.IsGlobalAdmin() {
		for _, user := range users {
			if user != nil && user.Owner != "" && user.Owner != currentUser.Owner {
				return user.Owner
			}
		}
	}
	return currentUser.Owner
}

func normalizeInsightScopeOrganization(currentUser *object.User, organization string) string {
	organization = strings.TrimSpace(organization)
	if currentUser == nil {
		return ""
	}
	// 非全局管理员只能使用本人所属组织，避免内部调用误传 organization 造成越权。
	if !currentUser.IsGlobalAdmin() || organization == "" {
		return currentUser.Owner
	}
	return organization
}

func filterInsightUsersByOwner(users []*object.User, owner string) []*object.User {
	result := []*object.User{}
	for _, user := range users {
		if isInsightActiveUser(user) && user.Owner == owner {
			result = append(result, user)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].GetId() < result[j].GetId() })
	return result
}

func filterInsightGroupsByOwner(groups []*object.Group, owner string) []*object.Group {
	result := []*object.Group{}
	for _, group := range groups {
		if group != nil && group.Owner == owner {
			result = append(result, group)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].GetId() < result[j].GetId() })
	return result
}

func getInsightManagedGroups(currentUser *object.User, groups []*object.Group) []*object.Group {
	result := []*object.Group{}
	for _, group := range groups {
		if isInsightGroupManagedByUser(group, currentUser) {
			result = append(result, group)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].GetId() < result[j].GetId() })
	return result
}

func isInsightGroupManagedByUser(group *object.Group, user *object.User) bool {
	if group == nil || user == nil {
		return false
	}
	manager := strings.TrimSpace(group.Manager)
	if manager == "" {
		return false
	}
	return manager == user.GetId() || manager == user.Name || (user.Id != "" && manager == user.Id)
}

func indexInsightGroupsByName(groups []*object.Group) map[string]*object.Group {
	result := map[string]*object.Group{}
	for _, group := range groups {
		if group != nil {
			result[group.Name] = group
		}
	}
	return result
}

func getInsightSubtreeGroupNames(rootName string, groupByName map[string]*object.Group) map[string]bool {
	result := map[string]bool{rootName: true}
	changed := true
	for changed {
		changed = false
		for _, group := range groupByName {
			if group != nil && result[group.ParentId] && !result[group.Name] {
				result[group.Name] = true
				changed = true
			}
		}
	}
	return result
}

func filterInsightUsersByGroups(users []*object.User, groupNames map[string]bool) []*object.User {
	result := []*object.User{}
	for _, user := range users {
		if user == nil {
			continue
		}
		for _, groupRef := range user.Groups {
			_, groupName := util.GetOwnerAndNameFromIdNoCheck(groupRef)
			if groupNames[groupName] || groupNames[groupRef] {
				result = append(result, user)
				break
			}
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].GetId() < result[j].GetId() })
	return result
}

func getInsightCustomScopeUsers(currentUser *object.User, orgUsers []*object.User) []*object.User {
	if currentUser == nil || currentUser.Properties == nil {
		return nil
	}
	// 当前没有专用权限模型，先只接受显式配置的用户 ID 列表，避免从展示字段推断范围。
	customIds := splitInsightCsv(currentUser.Properties["insightScopeAdminUserIds"])
	if len(customIds) == 0 {
		customIds = splitInsightCsv(currentUser.Properties["insightCustomAdminUserIds"])
	}
	if len(customIds) == 0 {
		return nil
	}

	customSet := map[string]bool{}
	for _, id := range customIds {
		customSet[id] = true
	}
	result := []*object.User{}
	for _, user := range orgUsers {
		if user != nil && customSet[user.GetId()] {
			result = append(result, user)
		}
	}
	return result
}

func getInsightDepartmentPath(group *object.Group, groupByName map[string]*object.Group, visibleNames map[string]bool) string {
	names := []string{getInsightGroupDisplayName(group)}
	visited := map[string]bool{group.Name: true}
	for parentName := group.ParentId; parentName != ""; {
		parent, ok := groupByName[parentName]
		if !ok || !visibleNames[parent.Name] || visited[parent.Name] {
			break
		}
		names = append([]string{getInsightGroupDisplayName(parent)}, names...)
		visited[parent.Name] = true
		parentName = parent.ParentId
	}
	return strings.Join(names, "/")
}

func hasInsightVisibleChild(parentName string, groups []*object.Group, visibleNames map[string]bool) bool {
	for _, group := range groups {
		if group != nil && group.ParentId == parentName && visibleNames[group.Name] {
			return true
		}
	}
	return false
}

func getInsightGroupDisplayName(group *object.Group) string {
	if group == nil {
		return ""
	}
	if group.DisplayName != "" {
		return group.DisplayName
	}
	return group.Name
}

func getInsightBearerToken(authorization string) string {
	authorization = strings.TrimSpace(authorization)
	if authorization == "" {
		return ""
	}
	parts := strings.Fields(authorization)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}

func extractInsightAudiences(value interface{}) []string {
	switch v := value.(type) {
	case string:
		return splitInsightCsv(v)
	case []string:
		return deduplicateStrings(v)
	case []interface{}:
		result := []string{}
		for _, item := range v {
			if text, ok := item.(string); ok {
				result = append(result, strings.TrimSpace(text))
			}
		}
		return deduplicateStrings(result)
	default:
		return []string{}
	}
}

func getInsightApplicationByAudience(audiences []string) (*object.Application, error) {
	for _, audience := range getInsightAllowedTokenAudiences(audiences) {
		application, err := object.GetApplicationByClientId(audience)
		if err != nil {
			return nil, err
		}
		if application != nil {
			return application, nil
		}
	}
	return nil, nil
}

func isInsightAudienceAllowed(audiences []string) bool {
	return len(getInsightAllowedTokenAudiences(audiences)) > 0
}

func getInsightAllowedTokenAudiences(audiences []string) []string {
	audiences = deduplicateStrings(audiences)
	allowedAudiences := splitInsightCsv(conf.GetConfigString("insightProviderAllowedAudiences"))
	if len(allowedAudiences) == 0 {
		allowedAudiences = splitInsightCsv(conf.GetConfigString("insightProviderAudience"))
	}
	if len(allowedAudiences) == 0 {
		return []string{}
	}
	allowedSet := map[string]bool{}
	for _, audience := range allowedAudiences {
		allowedSet[audience] = true
	}
	result := []string{}
	for _, audience := range audiences {
		if allowedSet[audience] {
			result = append(result, audience)
		}
	}
	return result
}

func isInsightIssuerAllowed(issuer string) bool {
	issuer = strings.TrimSpace(issuer)
	allowedIssuers := splitInsightCsv(conf.GetConfigString("insightProviderAllowedIssuers"))
	if len(allowedIssuers) == 0 {
		return issuer != ""
	}
	for _, allowedIssuer := range allowedIssuers {
		if issuer == allowedIssuer {
			return true
		}
	}
	return false
}

func hasInsightRequiredScopes(scope string) bool {
	requiredScopes := splitInsightCsv(conf.GetConfigString("insightProviderRequiredScopes"))
	if len(requiredScopes) == 0 {
		// 默认要求 insight 专用 scope，避免生产漏配时任意 admin token 都可调用 provider。
		requiredScopes = splitInsightCsv(insightProviderDefaultRequiredScopes)
	}
	scopeSet := map[string]bool{}
	for _, item := range splitInsightCsv(scope) {
		scopeSet[item] = true
	}
	for _, required := range requiredScopes {
		if !scopeSet[required] {
			return false
		}
	}
	return true
}

func splitInsightCsv(value string) []string {
	value = strings.ReplaceAll(value, ",", " ")
	parts := strings.Fields(value)
	result := []string{}
	for _, part := range parts {
		if text := strings.TrimSpace(part); text != "" {
			result = append(result, text)
		}
	}
	return deduplicateStrings(result)
}

func deduplicateStrings(values []string) []string {
	seen := map[string]bool{}
	result := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}

func sortedStringSet(values map[string]bool) []string {
	result := []string{}
	for value := range values {
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}

func countNonEmptyStrings(values []string) int {
	count := 0
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			count++
		}
	}
	return count
}

func sortInsightDepartmentScopes(departments []InsightDepartmentScope) {
	sort.Slice(departments, func(i, j int) bool {
		return departments[i].DepartmentId < departments[j].DepartmentId
	})
}

func formatInsightTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

func (e *InsightProviderError) Error() string {
	if e == nil {
		return ""
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}
