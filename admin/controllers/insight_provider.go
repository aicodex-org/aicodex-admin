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

// InsightUsageIdentity 是 insight 查询 api 用量时需要的 admin-to-api 用户映射。
// 该结构只服务报表范围消费，不代表 gateway 运行时授权事实。
type InsightUsageIdentity struct {
	ApiUserId          string `json:"apiUserId,omitempty"`
	MappingStatus      string `json:"mappingStatus"`
	MappingSource      string `json:"mappingSource,omitempty"`
	SourceConnectionId string `json:"sourceConnectionId,omitempty"`
	SourceType         string `json:"sourceType,omitempty"`
	ExternalSubjectId  string `json:"externalSubjectId,omitempty"`
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
	OrgVersion        string                 `json:"orgVersion"`
	ScopeVersion      string                 `json:"scopeVersion"`
	Freshness         string                 `json:"freshness"`
}

// InsightScopeResponse 描述 admin provider 已计算完成的 insight 报表范围。
// DepartmentIds/AdminUserIds/ApiUserIds 是报表查询输入，不应被 api 侧当作 gateway 授权矩阵。
type InsightScopeResponse struct {
	// AdminUserId 表示本次 provider 调用的当前 admin 用户，用于 insight/api 跨服务审计。
	AdminUserId             string                   `json:"adminUserId"`
	TraceId                 string                   `json:"traceId,omitempty"`
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
	OrgVersion              string                   `json:"orgVersion"`
	Freshness               string                   `json:"freshness"`
	LifecycleStatus         string                   `json:"lifecycleStatus"`
}

type InsightDepartmentScope struct {
	DepartmentId            string   `json:"departmentId"`
	AdminUserIds            []string `json:"adminUserIds"`
	ApiUserIds              []string `json:"apiUserIds"`
	IncludeChildDepartments bool     `json:"includeChildDepartments"`
	MappingStatus           string   `json:"mappingStatus"`
	LifecycleStatus         string   `json:"lifecycleStatus"`
	SourceType              string   `json:"sourceType"`
	SourceConnectionId      string   `json:"sourceConnectionId,omitempty"`
}

type InsightOrganizationTreeNode struct {
	DepartmentId       string `json:"departmentId"`
	DepartmentName     string `json:"departmentName"`
	ParentDepartmentId string `json:"parentDepartmentId"`
	DepartmentPath     string `json:"departmentPath"`
	HasChildren        bool   `json:"hasChildren"`
	SourceType         string `json:"sourceType"`
	SourceConnectionId string `json:"sourceConnectionId,omitempty"`
	LifecycleStatus    string `json:"lifecycleStatus"`
}

type insightDepartmentSourceMetadata struct {
	SourceType         string
	SourceConnectionId string
	LifecycleStatus    string
}

type insightDepartmentSourceMetadataIndex map[string]insightDepartmentSourceMetadata

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

var getInsightWecomUserMappingFunc = object.GetWecomUserMapping

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

	data, providerErr := buildInsightCurrentUserResponseWithResolver(user, roles, groups, generatedAt, newInsightUsageIdentityResolverFromConfig(), traceId)
	if providerErr != nil {
		c.writeInsightProviderError(getInsightProviderHTTPStatus(providerErr), providerErr, insightProviderAuditEvent{TraceId: traceId, AdminUserId: user.GetId(), Organization: user.Owner, MappingStatus: providerErr.MappingStatus, Status: "error", ErrorCode: providerErr.Code})
		return
	}
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
	users, groups, platformDepartments, err := getInsightProviderScopeSource(organization)
	if err != nil {
		c.writeInsightProviderError(http.StatusInternalServerError, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, ""), insightProviderAuditEvent{TraceId: traceId, AdminUserId: user.GetId(), Organization: organization, Status: "error", ErrorCode: InsightProviderErrorUnavailable})
		return
	}

	departmentMetadata := buildInsightDepartmentSourceMetadataIndex(platformDepartments)
	data, providerErr := calculateInsightScopeForOrganizationWithResolverAndDepartmentMetadata(user, organization, users, groups, generatedAt, newInsightUsageIdentityResolverFromConfig(), traceId, departmentMetadata)
	if providerErr != nil {
		providerErr.TraceId = traceId
		c.writeInsightProviderError(getInsightProviderHTTPStatus(providerErr), providerErr, insightProviderAuditEvent{TraceId: traceId, AdminUserId: user.GetId(), Organization: organization, MappingStatus: providerErr.MappingStatus, Status: "error", ErrorCode: providerErr.Code})
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
	platformDepartments, err := object.GetPlatformDepartments(organization)
	if err != nil {
		c.writeInsightProviderError(http.StatusInternalServerError, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, ""), insightProviderAuditEvent{TraceId: traceId, AdminUserId: user.GetId(), Organization: organization, Status: "error", ErrorCode: InsightProviderErrorUnavailable})
		return
	}

	departmentMetadata := buildInsightDepartmentSourceMetadataIndex(platformDepartments)
	data := buildInsightOrganizationTreeForOrganizationWithDepartmentMetadata(user, organization, groups, departmentMetadata)
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
	data, _ := buildInsightCurrentUserResponseWithResolver(user, roles, groups, generatedAt, nil, "")
	return data
}

func buildInsightCurrentUserResponseWithResolver(user *object.User, roles []string, groups []InsightProviderGroup, generatedAt time.Time, resolver insightUsageIdentityResolver, traceId string) (*InsightCurrentUserResponse, *InsightProviderError) {
	usageIdentity, providerErr := resolveInsightUsageIdentityWithResolver(user, resolver, traceId)
	if providerErr != nil {
		return nil, providerErr
	}
	version := buildInsightProviderVersionMetadata(user.Owner, generatedAt, traceId)
	return &InsightCurrentUserResponse{
		AdminUserId:       user.GetId(),
		Username:          user.Name,
		DisplayName:       getInsightUserDisplayName(user),
		Organization:      user.Owner,
		ApiOrganizationId: resolveInsightAPIOrganizationID(user),
		Roles:             deduplicateStrings(roles),
		Groups:            groups,
		UsageIdentity:     usageIdentity,
		GeneratedAt:       formatInsightTime(generatedAt),
		OrgVersion:        version.OrgVersion,
		ScopeVersion:      version.ScopeVersion,
		Freshness:         version.Freshness,
	}, nil
}

func getInsightUserDisplayName(user *object.User) string {
	if user == nil {
		return ""
	}
	// Insight 面向企业微信组织视角，优先使用组织同步的中文展示名；通用友好名只作为兜底。
	if strings.TrimSpace(user.DisplayName) != "" {
		return strings.TrimSpace(user.DisplayName)
	}
	return user.GetFriendlyName()
}

func calculateInsightScope(currentUser *object.User, users []*object.User, groups []*object.Group, generatedAt time.Time) (*InsightScopeResponse, *InsightProviderError) {
	organization := getInsightScopeOrganization(currentUser, users)
	return calculateInsightScopeForOrganization(currentUser, organization, users, groups, generatedAt)
}

func calculateInsightScopeForOrganization(currentUser *object.User, organization string, users []*object.User, groups []*object.Group, generatedAt time.Time) (*InsightScopeResponse, *InsightProviderError) {
	return calculateInsightScopeForOrganizationWithResolver(currentUser, organization, users, groups, generatedAt, newInsightUsageIdentityResolverFromConfig(), "")
}

func calculateInsightScopeForOrganizationWithResolver(currentUser *object.User, organization string, users []*object.User, groups []*object.Group, generatedAt time.Time, resolver insightUsageIdentityResolver, traceId string) (*InsightScopeResponse, *InsightProviderError) {
	return calculateInsightScopeForOrganizationWithResolverAndDepartmentMetadata(currentUser, organization, users, groups, generatedAt, resolver, traceId, nil)
}

// calculateInsightScopeForOrganizationWithResolverAndDepartmentMetadata 按全局管理员、组织管理员、部门负责人、自定义范围、自身范围依次降级。
// 每个分支都必须在用户身份映射不确定时 fail-closed，避免 insight 展示超出 admin 已确认的用量主体。
func calculateInsightScopeForOrganizationWithResolverAndDepartmentMetadata(currentUser *object.User, organization string, users []*object.User, groups []*object.Group, generatedAt time.Time, resolver insightUsageIdentityResolver, traceId string, departmentMetadata insightDepartmentSourceMetadataIndex) (*InsightScopeResponse, *InsightProviderError) {
	if providerErr := validateInsightProviderActiveUser(currentUser, ""); providerErr != nil {
		return nil, providerErr
	}

	organization = normalizeInsightScopeOrganization(currentUser, organization)
	apiOrganizationId := resolveInsightAPIOrganizationID(currentUser)
	orgUsers := filterInsightUsersByOwner(users, organization)
	orgGroups := filterInsightGroupsByOwner(groups, organization)

	if currentUser.IsGlobalAdmin() || currentUser.IsAdmin {
		return buildInsightAllCompanyScope(currentUser.GetId(), organization, apiOrganizationId, orgUsers, orgGroups, generatedAt, resolver, traceId, departmentMetadata)
	}

	managedGroups := getInsightManagedGroups(currentUser, orgGroups)
	if len(managedGroups) > 0 {
		return buildInsightDepartmentTreeScope(currentUser.GetId(), organization, apiOrganizationId, orgUsers, orgGroups, managedGroups, generatedAt, resolver, traceId, departmentMetadata)
	}

	customUsers := getInsightCustomScopeUsers(currentUser, orgUsers)
	if len(customUsers) > 0 {
		return buildInsightCustomUsersScope(currentUser.GetId(), organization, apiOrganizationId, customUsers, generatedAt, resolver, traceId)
	}

	return buildInsightSelfScope(currentUser.GetId(), organization, apiOrganizationId, currentUser, generatedAt, resolver, traceId)
}

func buildInsightAllCompanyScope(adminUserId string, organization string, apiOrganizationId string, users []*object.User, groups []*object.Group, generatedAt time.Time, resolver insightUsageIdentityResolver, traceId string, departmentMetadata insightDepartmentSourceMetadataIndex) (*InsightScopeResponse, *InsightProviderError) {
	userIdentityCache := newInsightUsageIdentityCache(resolver, traceId)
	adminUserIds, apiUserIds, mappingStatus, providerErr := mapInsightQueryableUsersToUsageIdsWithCache(users, userIdentityCache)
	if providerErr != nil {
		return nil, providerErr
	}
	if mappingStatus != MappingStatusOK {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "usage user mapping is not deterministic", "", mappingStatus)
	}
	departmentIds, departments, providerErr := buildInsightAllCompanyDepartmentScopesWithMetadata(users, groups, userIdentityCache, departmentMetadata)
	if providerErr != nil {
		return nil, providerErr
	}
	version := buildInsightProviderVersionMetadata(organization, generatedAt, traceId)

	return &InsightScopeResponse{
		AdminUserId:             adminUserId,
		TraceId:                 traceId,
		ScopeType:               ScopeTypeAllCompany,
		Organization:            organization,
		ApiOrganizationId:       apiOrganizationId,
		DepartmentIds:           departmentIds,
		AdminUserIds:            adminUserIds,
		ApiUserIds:              apiUserIds,
		Departments:             departments,
		IncludeChildDepartments: true,
		MappingStatus:           MappingStatusOK,
		GeneratedAt:             formatInsightTime(generatedAt),
		ScopeVersion:            insightProviderScopeVersion,
		OrgVersion:              version.OrgVersion,
		Freshness:               version.Freshness,
		LifecycleStatus:         object.PlatformLifecycleStatusActive,
	}, nil
}

func buildInsightAllCompanyDepartmentScopes(users []*object.User, groups []*object.Group, cache *insightUsageIdentityCache) ([]string, []InsightDepartmentScope, *InsightProviderError) {
	return buildInsightAllCompanyDepartmentScopesWithMetadata(users, groups, cache, nil)
}

func buildInsightAllCompanyDepartmentScopesWithMetadata(users []*object.User, groups []*object.Group, cache *insightUsageIdentityCache, departmentMetadata insightDepartmentSourceMetadataIndex) ([]string, []InsightDepartmentScope, *InsightProviderError) {
	departmentIds := []string{}
	departments := []InsightDepartmentScope{}
	for _, group := range groups {
		if group == nil {
			continue
		}
		// 全公司组织用量按用户直接所属部门生成映射，避免父子部门同时展开时重复累计同一批成员。
		departmentUsers := filterInsightUsersByDirectGroup(users, group)
		if len(departmentUsers) == 0 {
			continue
		}
		adminUserIds, apiUserIds, mappingStatus, providerErr := mapInsightQueryableUsersToUsageIdsWithCache(departmentUsers, cache)
		if providerErr != nil {
			return nil, nil, providerErr
		}
		if mappingStatus != MappingStatusOK {
			return nil, nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "usage user mapping is not deterministic", "", mappingStatus)
		}
		if len(adminUserIds) == 0 || len(apiUserIds) == 0 {
			continue
		}
		departmentId := group.GetId()
		sourceMetadata := getInsightDepartmentSourceMetadata(group, departmentMetadata)
		departmentIds = append(departmentIds, departmentId)
		departments = append(departments, InsightDepartmentScope{
			DepartmentId:            departmentId,
			AdminUserIds:            adminUserIds,
			ApiUserIds:              apiUserIds,
			IncludeChildDepartments: false,
			MappingStatus:           MappingStatusOK,
			LifecycleStatus:         sourceMetadata.LifecycleStatus,
			SourceType:              sourceMetadata.SourceType,
			SourceConnectionId:      sourceMetadata.SourceConnectionId,
		})
	}
	sortInsightDepartmentScopes(departments)
	return deduplicateStrings(departmentIds), departments, nil
}

func buildInsightDepartmentTreeScope(adminUserId string, organization string, apiOrganizationId string, users []*object.User, groups []*object.Group, managedGroups []*object.Group, generatedAt time.Time, resolver insightUsageIdentityResolver, traceId string, departmentMetadata insightDepartmentSourceMetadataIndex) (*InsightScopeResponse, *InsightProviderError) {
	groupByName := indexInsightGroupsByName(groups)
	allDepartmentIds := []string{}
	departments := []InsightDepartmentScope{}
	scopeAdminUserIdSet := map[string]bool{}
	scopeApiUserIdSet := map[string]bool{}
	userIdentityCache := newInsightUsageIdentityCache(resolver, traceId)
	type insightDepartmentCandidate struct {
		group *object.Group
		users []*object.User
	}
	departmentCandidates := []insightDepartmentCandidate{}
	scopeCandidateUsers := []*object.User{}

	for _, group := range managedGroups {
		subtreeNames := getInsightSubtreeGroupNames(group.Name, groupByName)
		departmentUsers := filterInsightUsersByGroups(users, subtreeNames)
		if len(departmentUsers) == 0 {
			continue
		}
		departmentCandidates = append(departmentCandidates, insightDepartmentCandidate{group: group, users: departmentUsers})
		scopeCandidateUsers = append(scopeCandidateUsers, departmentUsers...)
	}

	if len(departmentCandidates) == 0 {
		return buildInsightEmptyScope(adminUserId, organization, apiOrganizationId, generatedAt, traceId), nil
	}

	// 部门负责人可能同时管理多个部门；先按整个 scope 预热解析缓存，避免按部门循环调用 api resolver。
	_, _, mappingStatus, providerErr := mapInsightQueryableUsersToUsageIdsWithCache(scopeCandidateUsers, userIdentityCache)
	if providerErr != nil {
		return nil, providerErr
	}
	if mappingStatus != MappingStatusOK {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "usage user mapping is not deterministic", "", mappingStatus)
	}

	for _, candidate := range departmentCandidates {
		group := candidate.group
		adminUserIds, apiUserIds, mappingStatus, providerErr := mapInsightQueryableUsersToUsageIdsWithCache(candidate.users, userIdentityCache)
		if providerErr != nil {
			return nil, providerErr
		}
		if mappingStatus != MappingStatusOK {
			return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "usage user mapping is not deterministic", "", mappingStatus)
		}
		if len(adminUserIds) == 0 || len(apiUserIds) == 0 {
			continue
		}

		departmentId := group.GetId()
		sourceMetadata := getInsightDepartmentSourceMetadata(group, departmentMetadata)
		allDepartmentIds = append(allDepartmentIds, departmentId)
		departments = append(departments, InsightDepartmentScope{
			DepartmentId:            departmentId,
			AdminUserIds:            adminUserIds,
			ApiUserIds:              apiUserIds,
			IncludeChildDepartments: true,
			MappingStatus:           MappingStatusOK,
			LifecycleStatus:         sourceMetadata.LifecycleStatus,
			SourceType:              sourceMetadata.SourceType,
			SourceConnectionId:      sourceMetadata.SourceConnectionId,
		})
		for _, id := range adminUserIds {
			scopeAdminUserIdSet[id] = true
		}
		for _, id := range apiUserIds {
			scopeApiUserIdSet[id] = true
		}
	}

	if len(departments) == 0 {
		return buildInsightEmptyScope(adminUserId, organization, apiOrganizationId, generatedAt, traceId), nil
	}

	sortInsightDepartmentScopes(departments)
	version := buildInsightProviderVersionMetadata(organization, generatedAt, traceId)
	return &InsightScopeResponse{
		AdminUserId:             adminUserId,
		TraceId:                 traceId,
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
		OrgVersion:              version.OrgVersion,
		Freshness:               version.Freshness,
		LifecycleStatus:         object.PlatformLifecycleStatusActive,
	}, nil
}

func buildInsightCustomUsersScope(adminUserId string, organization string, apiOrganizationId string, users []*object.User, generatedAt time.Time, resolver insightUsageIdentityResolver, traceId string) (*InsightScopeResponse, *InsightProviderError) {
	adminUserIds, apiUserIds, mappingStatus, providerErr := mapInsightUsersToUsageIdsWithResolver(users, resolver, traceId)
	if providerErr != nil {
		return nil, providerErr
	}
	if mappingStatus != MappingStatusOK {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "usage user mapping is not deterministic", "", mappingStatus)
	}
	version := buildInsightProviderVersionMetadata(organization, generatedAt, traceId)
	return &InsightScopeResponse{
		AdminUserId:       adminUserId,
		TraceId:           traceId,
		ScopeType:         ScopeTypeCustomUsers,
		Organization:      organization,
		ApiOrganizationId: apiOrganizationId,
		AdminUserIds:      adminUserIds,
		ApiUserIds:        apiUserIds,
		Departments:       []InsightDepartmentScope{},
		MappingStatus:     MappingStatusOK,
		GeneratedAt:       formatInsightTime(generatedAt),
		ScopeVersion:      insightProviderScopeVersion,
		OrgVersion:        version.OrgVersion,
		Freshness:         version.Freshness,
		LifecycleStatus:   object.PlatformLifecycleStatusActive,
	}, nil
}

func buildInsightSelfScope(adminUserId string, organization string, apiOrganizationId string, currentUser *object.User, generatedAt time.Time, resolver insightUsageIdentityResolver, traceId string) (*InsightScopeResponse, *InsightProviderError) {
	adminUserIds, apiUserIds, mappingStatus, providerErr := mapInsightUsersToUsageIdsWithResolver([]*object.User{currentUser}, resolver, traceId)
	if providerErr != nil {
		return nil, providerErr
	}
	if mappingStatus != MappingStatusOK {
		return nil, newInsightProviderError(InsightProviderErrorAuthorizationFailed, "current user usage mapping is not deterministic", "", mappingStatus)
	}
	version := buildInsightProviderVersionMetadata(organization, generatedAt, traceId)
	return &InsightScopeResponse{
		AdminUserId:       adminUserId,
		TraceId:           traceId,
		ScopeType:         ScopeTypeSelf,
		Organization:      organization,
		ApiOrganizationId: apiOrganizationId,
		AdminUserIds:      adminUserIds,
		ApiUserIds:        apiUserIds,
		Departments:       []InsightDepartmentScope{},
		MappingStatus:     MappingStatusOK,
		GeneratedAt:       formatInsightTime(generatedAt),
		ScopeVersion:      insightProviderScopeVersion,
		OrgVersion:        version.OrgVersion,
		Freshness:         version.Freshness,
		LifecycleStatus:   object.PlatformLifecycleStatusActive,
	}, nil
}

func buildInsightEmptyScope(adminUserId string, organization string, apiOrganizationId string, generatedAt time.Time, traceId string) *InsightScopeResponse {
	version := buildInsightProviderVersionMetadata(organization, generatedAt, traceId)
	return &InsightScopeResponse{
		AdminUserId:       adminUserId,
		TraceId:           traceId,
		ScopeType:         ScopeTypeEmpty,
		Organization:      organization,
		ApiOrganizationId: apiOrganizationId,
		AdminUserIds:      []string{},
		ApiUserIds:        []string{},
		Departments:       []InsightDepartmentScope{},
		MappingStatus:     MappingStatusOK,
		GeneratedAt:       formatInsightTime(generatedAt),
		ScopeVersion:      insightProviderScopeVersion,
		OrgVersion:        version.OrgVersion,
		Freshness:         version.Freshness,
		LifecycleStatus:   object.PlatformLifecycleStatusActive,
	}
}

func buildInsightOrganizationTree(currentUser *object.User, groups []*object.Group) []InsightOrganizationTreeNode {
	organization := getInsightScopeOrganization(currentUser, nil)
	return buildInsightOrganizationTreeForOrganization(currentUser, organization, groups)
}

func buildInsightOrganizationTreeForOrganization(currentUser *object.User, organization string, groups []*object.Group) []InsightOrganizationTreeNode {
	return buildInsightOrganizationTreeForOrganizationWithDepartmentMetadata(currentUser, organization, groups, nil)
}

func buildInsightOrganizationTreeForOrganizationWithDepartmentMetadata(currentUser *object.User, organization string, groups []*object.Group, departmentMetadata insightDepartmentSourceMetadataIndex) []InsightOrganizationTreeNode {
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
		sourceMetadata := getInsightDepartmentSourceMetadata(group, departmentMetadata)
		nodes = append(nodes, InsightOrganizationTreeNode{
			DepartmentId:       group.GetId(),
			DepartmentName:     getInsightGroupDisplayName(group),
			ParentDepartmentId: parentDepartmentId,
			DepartmentPath:     getInsightDepartmentPath(group, groupByName, visibleNames),
			HasChildren:        hasInsightVisibleChild(group.Name, orgGroups, visibleNames),
			SourceType:         sourceMetadata.SourceType,
			SourceConnectionId: sourceMetadata.SourceConnectionId,
			LifecycleStatus:    sourceMetadata.LifecycleStatus,
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

// buildInsightProviderVersionMetadata 生成 insight provider 的 admin scope 快照版本。
// 这里使用字符串哈希版本，不能和 api gateway projection 的 int64 版本混用。
func buildInsightProviderVersionMetadata(organization string, generatedAt time.Time, traceId string) object.PlatformVersionMetadata {
	return object.NewPlatformVersionMetadata(organization, "", insightProviderScopeVersion, generatedAt, traceId)
}

// buildInsightDepartmentSourceMetadataIndex 汇总平台部门元数据，供旧 Group 树补足来源连接和 lifecycle。
func buildInsightDepartmentSourceMetadataIndex(platformDepartments []*object.PlatformDepartment) insightDepartmentSourceMetadataIndex {
	if len(platformDepartments) == 0 {
		return nil
	}
	index := insightDepartmentSourceMetadataIndex{}
	for _, department := range platformDepartments {
		if department == nil {
			continue
		}
		departmentId := strings.TrimSpace(department.DepartmentId)
		if departmentId == "" {
			continue
		}
		metadata := insightDepartmentSourceMetadata{
			SourceConnectionId: strings.TrimSpace(department.SourceConnectionId),
			LifecycleStatus:    strings.TrimSpace(department.LifecycleStatus),
		}
		if metadata.SourceConnectionId == "" && metadata.LifecycleStatus == "" {
			continue
		}
		index[departmentId] = metadata
	}
	if len(index) == 0 {
		return nil
	}
	return index
}

// getInsightDepartmentSourceMetadata 优先使用平台部门覆盖旧 Group 派生元数据。
// 这样 provider 输出的 sourceConnection/lifecycle 与组织主模型保持一致。
func getInsightDepartmentSourceMetadata(group *object.Group, departmentMetadata insightDepartmentSourceMetadataIndex) insightDepartmentSourceMetadata {
	metadata := insightDepartmentSourceMetadata{
		SourceType:         getInsightGroupSourceType(group),
		SourceConnectionId: getInsightGroupSourceConnectionId(group),
		LifecycleStatus:    getInsightGroupLifecycleStatus(group),
	}
	if group == nil || departmentMetadata == nil {
		return metadata
	}
	if override, ok := departmentMetadata[group.GetId()]; ok {
		if override.SourceConnectionId != "" {
			metadata.SourceConnectionId = override.SourceConnectionId
		}
		if override.LifecycleStatus != "" {
			metadata.LifecycleStatus = override.LifecycleStatus
		}
	}
	return metadata
}

func getInsightGroupSourceType(group *object.Group) string {
	if group != nil && group.Type == object.WecomDepartmentGroupType {
		return object.SourceTypeWecom
	}
	return "group"
}

func getInsightGroupSourceConnectionId(group *object.Group) string {
	if group == nil || group.Type != object.WecomDepartmentGroupType {
		return ""
	}
	corpId := getInsightWecomCorpIdFromDepartmentGroupName(group.Name)
	if corpId == "" {
		return ""
	}
	return object.GetSourceConnectionId(group.Owner, object.SourceTypeWecom, corpId)
}

func getInsightWecomCorpIdFromDepartmentGroupName(groupName string) string {
	name := strings.TrimSpace(groupName)
	if !strings.HasPrefix(name, object.WecomDepartmentGroupNamePrefix) {
		return ""
	}
	remainder := strings.TrimPrefix(name, object.WecomDepartmentGroupNamePrefix)
	lastSeparator := strings.LastIndex(remainder, "-")
	if lastSeparator <= 0 || lastSeparator == len(remainder)-1 {
		return ""
	}
	return strings.TrimSpace(remainder[:lastSeparator])
}

func getInsightGroupLifecycleStatus(group *object.Group) string {
	if group != nil && group.Type == object.WecomDepartmentGroupType && !group.IsEnabled {
		return object.PlatformLifecycleStatusDisabled
	}
	return object.PlatformLifecycleStatusActive
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

func getInsightProviderHTTPStatus(providerErr *InsightProviderError) int {
	if providerErr == nil {
		return http.StatusInternalServerError
	}
	switch providerErr.Code {
	case InsightProviderErrorUnauthenticated:
		return http.StatusUnauthorized
	case InsightProviderErrorAuthorizationFailed:
		return http.StatusForbidden
	case InsightProviderErrorInvalidArgument:
		return http.StatusBadRequest
	default:
		return http.StatusServiceUnavailable
	}
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

// getInsightProviderScopeOrganization 只允许全局管理员显式选择组织；普通用户始终被限制在自身 Owner。
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

func getInsightProviderScopeSource(organization string) ([]*object.User, []*object.Group, []*object.PlatformDepartment, error) {
	users, err := object.GetUsers(organization)
	if err != nil {
		return nil, nil, nil, err
	}
	groups, err := object.GetGroups(organization)
	if err != nil {
		return nil, nil, nil, err
	}
	platformDepartments, err := object.GetPlatformDepartments(organization)
	if err != nil {
		return nil, nil, nil, err
	}
	return users, groups, platformDepartments, nil
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
	identity, _ := resolveInsightUsageIdentityWithResolver(user, nil, "")
	return identity
}

// resolveInsightUsageIdentityWithResolver 先尊重 admin 手工 apiUserId 映射，再按确认的外部身份调用 api resolver。
// resolver 不可用、返回异常或映射不确定时由调用方 fail-closed，而不是猜测用量主体。
func resolveInsightUsageIdentityWithResolver(user *object.User, resolver insightUsageIdentityResolver, traceId string) (InsightUsageIdentity, *InsightProviderError) {
	identity := resolveInsightManualUsageIdentity(user)
	if identity.MappingStatus != MappingStatusMissing || !isInsightUsageIdentityResolverEnabled(resolver) {
		return withInsightSourceIdentity(identity, user), nil
	}
	item, ok := buildInsightUsageIdentityResolveItem(user)
	if !ok {
		return withInsightSourceIdentity(InsightUsageIdentity{MappingStatus: MappingStatusMissing}, user), nil
	}
	results, providerErr := resolver.Resolve(traceId, []insightUsageIdentityResolveItem{item})
	if providerErr != nil {
		return InsightUsageIdentity{}, providerErr
	}
	resultByRequestId, providerErr := mapInsightUsageIdentityResultsByRequestId(results, map[string]bool{item.RequestId: true}, traceId)
	if providerErr != nil {
		return InsightUsageIdentity{}, providerErr
	}
	result, ok := resultByRequestId[item.RequestId]
	if !ok {
		return withInsightSourceIdentity(InsightUsageIdentity{MappingStatus: MappingStatusMissing}, user), nil
	}
	return withInsightSourceIdentity(insightUsageIdentityFromResolverResult(result), user), nil
}

func resolveInsightManualUsageIdentity(user *object.User) InsightUsageIdentity {
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

func insightUsageIdentityFromResolverResult(result insightUsageIdentityResolveResult) InsightUsageIdentity {
	if result.MappingStatus != MappingStatusOK {
		return InsightUsageIdentity{MappingStatus: firstNonEmptyInsightString(result.MappingStatus, MappingStatusMissing), MappingSource: "wecom.resolver"}
	}
	if result.ApiUserId <= 0 {
		return InsightUsageIdentity{MappingStatus: MappingStatusInvalid, MappingSource: "wecom.resolver"}
	}
	return InsightUsageIdentity{ApiUserId: strconv.Itoa(result.ApiUserId), MappingStatus: MappingStatusOK, MappingSource: "wecom.resolver"}
}

// buildInsightUsageIdentityResolveItem 只向 api resolver 发送稳定来源身份和兼容企业微信外部 ID。
// mappingStatus 未确认或本地映射已禁用时不发起解析，避免弱身份被自动绑定。
func buildInsightUsageIdentityResolveItem(user *object.User) (insightUsageIdentityResolveItem, bool) {
	if user == nil {
		return insightUsageIdentityResolveItem{}, false
	}
	if !isInsightExternalIdentityConfirmed(user) {
		return insightUsageIdentityResolveItem{}, false
	}
	requestId := user.GetId()
	adminSubject := strings.TrimSpace(user.Id)
	if adminSubject == "" {
		adminSubject = requestId
	}
	corpId, wecomUserId := getInsightUserWecomIdentity(user)
	wecomExternalId := ""
	sourceConnectionId := ""
	sourceType := ""
	externalSubjectId := ""
	if corpId != "" && wecomUserId != "" {
		sourceConnectionId = object.GetSourceConnectionId(user.Owner, object.SourceTypeWecom, corpId)
		sourceType = object.SourceTypeWecom
		externalSubjectId = wecomUserId
		wecomExternalId = object.GetWecomUserFullExternalId(corpId, wecomUserId)
		if mapping, err := getInsightWecomUserMappingFunc(user.Owner, corpId, wecomUserId); err == nil && mapping != nil {
			if !mapping.IsEnabled {
				return insightUsageIdentityResolveItem{}, false
			}
			if strings.TrimSpace(mapping.ExternalId) != "" {
				wecomExternalId = strings.TrimSpace(mapping.ExternalId)
			}
		}
	}
	item := insightUsageIdentityResolveItem{
		RequestId:          requestId,
		AdminSubject:       adminSubject,
		SourceConnectionId: sourceConnectionId,
		SourceType:         sourceType,
		ExternalSubjectId:  externalSubjectId,
		WecomExternalId:    wecomExternalId,
		WecomCorpId:        corpId,
		WecomUserId:        wecomUserId,
	}
	return item, item.AdminSubject != "" || item.WecomExternalId != ""
}

func withInsightSourceIdentity(identity InsightUsageIdentity, user *object.User) InsightUsageIdentity {
	if user == nil || !isInsightExternalIdentityConfirmed(user) {
		return identity
	}
	corpId, wecomUserId := getInsightUserWecomIdentity(user)
	if corpId == "" || wecomUserId == "" {
		return identity
	}
	identity.SourceConnectionId = object.GetSourceConnectionId(user.Owner, object.SourceTypeWecom, corpId)
	identity.SourceType = object.SourceTypeWecom
	identity.ExternalSubjectId = wecomUserId
	return identity
}

// isInsightExternalIdentityConfirmed 兼容旧数据空状态，但显式非 confirmed 状态必须 fail-closed。
func isInsightExternalIdentityConfirmed(user *object.User) bool {
	status := getInsightExternalIdentityMappingStatus(user)
	return status == "" || strings.EqualFold(status, object.PlatformMappingStatusConfirmed)
}

func getInsightExternalIdentityMappingStatus(user *object.User) string {
	if user == nil || user.Properties == nil {
		return ""
	}
	for _, key := range []string{"externalIdentityMappingStatus", "external_identity_mapping_status", "mappingStatus"} {
		if value := strings.TrimSpace(user.Properties[key]); value != "" {
			return value
		}
	}
	return ""
}

func getInsightUserWecomIdentity(user *object.User) (string, string) {
	if user == nil {
		return "", ""
	}
	corpId := ""
	wecomUserId := strings.TrimSpace(user.Wecom)
	if user.Properties != nil {
		corpId = strings.TrimSpace(user.Properties[object.WecomUserPropertyCorpId])
		if value := strings.TrimSpace(user.Properties[object.WecomUserPropertyUserId]); value != "" {
			wecomUserId = value
		}
	}
	return corpId, wecomUserId
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
	return mapInsightUsersToUsageIdsWithPolicy(users, false)
}

func mapInsightQueryableUsersToUsageIds(users []*object.User) ([]string, []string, string) {
	return mapInsightUsersToUsageIdsWithPolicy(users, true)
}

func mapInsightUsersToUsageIdsWithPolicy(users []*object.User, skipMissing bool) ([]string, []string, string) {
	adminUserIds, apiUserIds, mappingStatus, _ := mapInsightUsersToUsageIdsWithPolicyAndResolver(users, skipMissing, nil, "")
	return adminUserIds, apiUserIds, mappingStatus
}

func mapInsightUsersToUsageIdsWithResolver(users []*object.User, resolver insightUsageIdentityResolver, traceId string) ([]string, []string, string, *InsightProviderError) {
	return mapInsightUsersToUsageIdsWithPolicyAndResolver(users, false, resolver, traceId)
}

func mapInsightQueryableUsersToUsageIdsWithResolver(users []*object.User, resolver insightUsageIdentityResolver, traceId string) ([]string, []string, string, *InsightProviderError) {
	return mapInsightUsersToUsageIdsWithPolicyAndResolver(users, true, resolver, traceId)
}

type insightUsageIdentityCache struct {
	resolver insightUsageIdentityResolver
	traceId  string
	items    map[string]InsightUsageIdentity
}

func newInsightUsageIdentityCache(resolver insightUsageIdentityResolver, traceId string) *insightUsageIdentityCache {
	return &insightUsageIdentityCache{resolver: resolver, traceId: traceId, items: map[string]InsightUsageIdentity{}}
}

func mapInsightQueryableUsersToUsageIdsWithCache(users []*object.User, cache *insightUsageIdentityCache) ([]string, []string, string, *InsightProviderError) {
	if cache == nil {
		return mapInsightUsersToUsageIdsWithPolicyAndResolver(users, true, nil, "")
	}
	return mapInsightUsersToUsageIdsWithPolicyAndCache(users, true, cache)
}

func mapInsightUsersToUsageIdsWithPolicyAndResolver(users []*object.User, skipMissing bool, resolver insightUsageIdentityResolver, traceId string) ([]string, []string, string, *InsightProviderError) {
	return mapInsightUsersToUsageIdsWithPolicyAndCache(users, skipMissing, newInsightUsageIdentityCache(resolver, traceId))
}

// mapInsightUsersToUsageIdsWithPolicyAndCache 将 admin 用户集合映射为 api 用量用户集合。
// skipMissing 只用于部门/全公司聚合范围；SELF/CUSTOM 必须严格要求每个用户都有确定映射。
func mapInsightUsersToUsageIdsWithPolicyAndCache(users []*object.User, skipMissing bool, cache *insightUsageIdentityCache) ([]string, []string, string, *InsightProviderError) {
	adminUserIds := []string{}
	apiUserIds := []string{}
	adminToApiUserId := map[string]string{}
	apiToAdminUserId := map[string]string{}
	resolverEnabled := cache != nil && isInsightUsageIdentityResolverEnabled(cache.resolver)
	pendingUsers := []*object.User{}
	pendingItems := []insightUsageIdentityResolveItem{}
	pendingAdminUserIds := map[string]bool{}
	for _, user := range users {
		if user == nil {
			continue
		}
		adminUserId := user.GetId()
		identity, ok := InsightUsageIdentity{}, false
		if cache != nil {
			identity, ok = cache.items[adminUserId]
		}
		if !ok {
			identity = resolveInsightManualUsageIdentity(user)
		}
		if identity.MappingStatus == MappingStatusMissing && resolverEnabled && !ok {
			if item, ok := buildInsightUsageIdentityResolveItem(user); ok {
				if pendingAdminUserIds[adminUserId] {
					// 同一 scope 内可能因父子部门重叠重复收集成员，resolver 请求必须按 admin 用户去重。
					continue
				}
				pendingAdminUserIds[adminUserId] = true
				pendingUsers = append(pendingUsers, user)
				pendingItems = append(pendingItems, item)
				continue
			}
		}
		if identity.MappingStatus == MappingStatusMissing && skipMissing {
			// 企业微信组织同步会先带来组织成员，再逐步补齐 API 用户映射；聚合范围只包含已映射成员，避免未绑定成员阻断整个部门或全公司视图。
			// 缓存命中的 MISSING 已经代表 resolver 解析过，不能在父子部门循环中反复请求 api provider。
			continue
		}
		if identity.MappingStatus != MappingStatusOK {
			return nil, nil, identity.MappingStatus, nil
		}
		if mappingStatus := appendInsightUsageMapping(adminUserId, identity.ApiUserId, adminToApiUserId, apiToAdminUserId, &adminUserIds, &apiUserIds); mappingStatus != MappingStatusOK {
			return nil, nil, mappingStatus, nil
		}
	}

	if len(pendingItems) > 0 {
		results, providerErr := cache.resolver.Resolve(cache.traceId, pendingItems)
		if providerErr != nil {
			return nil, nil, "", providerErr
		}
		expectedRequestIds := map[string]bool{}
		for _, item := range pendingItems {
			expectedRequestIds[item.RequestId] = true
		}
		resultByRequestId, providerErr := mapInsightUsageIdentityResultsByRequestId(results, expectedRequestIds, cache.traceId)
		if providerErr != nil {
			return nil, nil, "", providerErr
		}
		for _, user := range pendingUsers {
			adminUserId := user.GetId()
			result, ok := resultByRequestId[adminUserId]
			if !ok {
				return nil, nil, MappingStatusMissing, nil
			}
			identity := insightUsageIdentityFromResolverResult(result)
			cache.items[adminUserId] = identity
			if identity.MappingStatus == MappingStatusMissing && skipMissing {
				// 部门/全公司聚合只统计已经完成用量身份映射的成员；企业微信同步成员可能先于 API 账号绑定到达。
				continue
			}
			if identity.MappingStatus != MappingStatusOK {
				return nil, nil, identity.MappingStatus, nil
			}
			if mappingStatus := appendInsightUsageMapping(adminUserId, identity.ApiUserId, adminToApiUserId, apiToAdminUserId, &adminUserIds, &apiUserIds); mappingStatus != MappingStatusOK {
				return nil, nil, mappingStatus, nil
			}
		}
	}
	return deduplicateStrings(adminUserIds), deduplicateStrings(apiUserIds), MappingStatusOK, nil
}

func appendInsightUsageMapping(adminUserId string, apiUserId string, adminToApiUserId map[string]string, apiToAdminUserId map[string]string, adminUserIds *[]string, apiUserIds *[]string) string {
	// 用量 ID 必须与 admin 用户一一确定映射，避免多个 admin 用户合并到同一个报表主体。
	if existingApiUserId, ok := adminToApiUserId[adminUserId]; ok && existingApiUserId != apiUserId {
		return MappingStatusAmbiguous
	}
	if existingAdminUserId, ok := apiToAdminUserId[apiUserId]; ok && existingAdminUserId != adminUserId {
		return MappingStatusAmbiguous
	}
	adminToApiUserId[adminUserId] = apiUserId
	apiToAdminUserId[apiUserId] = adminUserId
	*adminUserIds = append(*adminUserIds, adminUserId)
	*apiUserIds = append(*apiUserIds, apiUserId)
	return MappingStatusOK
}

func mapInsightUsageIdentityResultsByRequestId(results []insightUsageIdentityResolveResult, expectedRequestIds map[string]bool, traceId string) (map[string]insightUsageIdentityResolveResult, *InsightProviderError) {
	resultByRequestId := map[string]insightUsageIdentityResolveResult{}
	for _, result := range results {
		requestId := strings.TrimSpace(result.RequestId)
		if requestId == "" {
			return nil, newInsightProviderError(InsightProviderErrorUnavailable, "usage identity resolver returned empty requestId", traceId, "")
		}
		if len(expectedRequestIds) > 0 && !expectedRequestIds[requestId] {
			return nil, newInsightProviderError(InsightProviderErrorUnavailable, "usage identity resolver returned unexpected requestId", traceId, "")
		}
		if _, exists := resultByRequestId[requestId]; exists {
			return nil, newInsightProviderError(InsightProviderErrorUnavailable, "usage identity resolver returned duplicate requestId", traceId, "")
		}
		// resolver 返回必须和本次请求一一对应，避免异常响应把其他用户的用量身份串到当前 scope。
		result.RequestId = requestId
		resultByRequestId[requestId] = result
	}
	for requestId := range expectedRequestIds {
		if _, ok := resultByRequestId[requestId]; !ok {
			// 缺少本次请求的结果属于 provider 协议异常，不能误判为用户映射缺失。
			return nil, newInsightProviderError(InsightProviderErrorUnavailable, "usage identity resolver omitted expected requestId", traceId, "")
		}
	}
	return resultByRequestId, nil
}

func isInsightUsageIdentityResolverEnabled(resolver insightUsageIdentityResolver) bool {
	return resolver != nil && resolver.Enabled()
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

func filterInsightUsersByDirectGroup(users []*object.User, group *object.Group) []*object.User {
	if group == nil {
		return []*object.User{}
	}
	result := []*object.User{}
	departmentId := group.GetId()
	for _, user := range users {
		if user == nil {
			continue
		}
		for _, groupRef := range user.Groups {
			_, groupName := util.GetOwnerAndNameFromIdNoCheck(groupRef)
			if groupRef == departmentId || groupName == group.Name {
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
