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
	"fmt"
	"strconv"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/beego/beego/v2/core/logs"
)

type organizationSyncExportResponse struct {
	Organization *object.Organization                  `json:"organization"`
	Groups       []*object.OrganizationSyncExportGroup `json:"groups"`
	Applications []*object.Application                 `json:"applications"`
}

var organizationSyncLegacyExportBuilder = func(organization string) (*object.OrganizationSyncSnapshot, error) {
	return object.GetOrganizationSyncSnapshot(organization)
}

var organizationSyncV2ExportBuilder = func(organization string, sourceConnectionID string, now time.Time) (*object.OrganizationSyncContractV2Snapshot, error) {
	return object.GetOrganizationSyncContractV2Snapshot(organization, sourceConnectionID, now)
}

func (c *ApiController) getOrganizationSyncApiKeyAuth() *object.OrganizationSyncApiKeyAuth {
	authData := c.Ctx.Input.GetData(object.OrganizationSyncApiKeyContextKey)
	if authData == nil {
		return nil
	}
	auth, _ := authData.(*object.OrganizationSyncApiKeyAuth)
	return auth
}

func (c *ApiController) isOrganizationSyncApiKeyRequest() bool {
	return c.getOrganizationSyncApiKeyAuth() != nil
}

func (c *ApiController) requireOrganizationSyncApiKeyAuth() (*object.OrganizationSyncApiKeyAuth, bool) {
	auth := c.getOrganizationSyncApiKeyAuth()
	if auth == nil {
		c.ResponseError("organization sync api key is required")
		return nil, false
	}
	return auth, true
}

func (c *ApiController) requireOrganizationSyncApiKeyOrganization(requestedOrganization string) (string, bool) {
	auth, ok := c.requireOrganizationSyncApiKeyAuth()
	if !ok {
		return "", false
	}
	requestedOrganization = strings.TrimSpace(requestedOrganization)
	if requestedOrganization != "" && requestedOrganization != auth.Organization {
		c.ResponseError("organization sync api key is not allowed to read this organization")
		return "", false
	}
	return auth.Organization, true
}

func paginateOrganizationSyncItems[T any](items []T, pageRaw string, pageSizeRaw string) ([]T, int) {
	total := len(items)
	if strings.TrimSpace(pageRaw) == "" || strings.TrimSpace(pageSizeRaw) == "" {
		return items, total
	}
	page := parseOrganizationSyncPaginationInt(pageRaw, 1)
	pageSize := parseOrganizationSyncPaginationInt(pageSizeRaw, 10)
	pageCount := 0
	if total > 0 {
		pageCount = ((total - 1) / pageSize) + 1
	}
	if pageCount > 0 && page > pageCount {
		page = pageCount
	}
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	return items[start:end], total
}

func parseOrganizationSyncPaginationInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func (c *ApiController) requireOrganizationSyncApiKeyAdmin(organization string) (*object.User, bool) {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		c.ResponseError("organization is required")
		return nil, false
	}
	if organization == "built-in" {
		c.ResponseError("built-in organization cannot use organization sync api keys")
		return nil, false
	}
	userId, ok := c.RequireSignedIn()
	if !ok {
		return nil, false
	}
	if object.IsAppUser(userId) {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return nil, false
	}
	user, err := object.GetUser(userId)
	if err != nil {
		c.ResponseError(err.Error())
		return nil, false
	}
	if user == nil {
		c.ClearUserSession()
		c.ResponseError(fmt.Sprintf(c.T("general:The user: %s doesn't exist"), userId))
		return nil, false
	}
	if user.IsGlobalAdmin() || (user.IsAdmin && user.Owner == organization) {
		return user, true
	}
	c.ResponseError(c.T("auth:Unauthorized operation"))
	return nil, false
}

func (c *ApiController) resolveOrganizationSyncApiKeyListScope() (string, bool) {
	organization := strings.TrimSpace(c.Ctx.Input.Query("organization"))
	userId, ok := c.RequireSignedIn()
	if !ok {
		return "", false
	}
	if object.IsAppUser(userId) {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return "", false
	}
	user, err := object.GetUser(userId)
	if err != nil {
		c.ResponseError(err.Error())
		return "", false
	}
	if user == nil {
		c.ClearUserSession()
		c.ResponseError(fmt.Sprintf(c.T("general:The user: %s doesn't exist"), userId))
		return "", false
	}
	if user.IsGlobalAdmin() {
		return organization, true
	}
	if !user.IsAdmin {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return "", false
	}
	if organization == "" {
		return user.Owner, true
	}
	if organization != user.Owner {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return "", false
	}
	return organization, true
}

func normalizeOrganizationSyncApiKeyRequest(key *object.OrganizationSyncApiKey) {
	if key == nil {
		return
	}
	key.Organization = strings.TrimSpace(key.Organization)
	key.Owner = strings.TrimSpace(key.Owner)
	if key.Organization == "" {
		key.Organization = key.Owner
	}
	key.Owner = key.Organization
}

// GetOrganizationSyncApiKeys
// @Title GetOrganizationSyncApiKeys
// @Tag Organization Sync API Key API
// @Description get organization sync api keys
// @router /organization-sync-api-keys [get]
func (c *ApiController) GetOrganizationSyncApiKeys() {
	organization, ok := c.resolveOrganizationSyncApiKeyListScope()
	if !ok {
		return
	}
	keys, err := object.GetOrganizationSyncApiKeys(organization)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(keys)
}

// AddOrganizationSyncApiKey
// @Title AddOrganizationSyncApiKey
// @Tag Organization Sync API Key API
// @Description add organization sync api key
// @router /organization-sync-api-keys [post]
func (c *ApiController) AddOrganizationSyncApiKey() {
	var key object.OrganizationSyncApiKey
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &key); err != nil {
		c.ResponseError(err.Error())
		return
	}
	normalizeOrganizationSyncApiKeyRequest(&key)
	user, ok := c.requireOrganizationSyncApiKeyAdmin(key.Organization)
	if !ok {
		return
	}
	result, err := object.AddOrganizationSyncApiKey(&key, user.GetId())
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// RotateOrganizationSyncApiKey
// @Title RotateOrganizationSyncApiKey
// @Tag Organization Sync API Key API
// @Description rotate organization sync api key
// @router /organization-sync-api-keys/rotate [post]
func (c *ApiController) RotateOrganizationSyncApiKey() {
	var key object.OrganizationSyncApiKey
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &key); err != nil {
		c.ResponseError(err.Error())
		return
	}
	normalizeOrganizationSyncApiKeyRequest(&key)
	if _, ok := c.requireOrganizationSyncApiKeyAdmin(key.Organization); !ok {
		return
	}
	result, err := object.RotateOrganizationSyncApiKey(util.GetId(key.Owner, key.Name))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// DisableOrganizationSyncApiKey
// @Title DisableOrganizationSyncApiKey
// @Tag Organization Sync API Key API
// @Description disable organization sync api key
// @router /organization-sync-api-keys/disable [post]
func (c *ApiController) DisableOrganizationSyncApiKey() {
	var key object.OrganizationSyncApiKey
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &key); err != nil {
		c.ResponseError(err.Error())
		return
	}
	normalizeOrganizationSyncApiKeyRequest(&key)
	if _, ok := c.requireOrganizationSyncApiKeyAdmin(key.Organization); !ok {
		return
	}
	c.Data["json"] = wrapActionResponse(object.DisableOrganizationSyncApiKey(util.GetId(key.Owner, key.Name)))
	c.ServeJSON()
}

// DeleteOrganizationSyncApiKey
// @Title DeleteOrganizationSyncApiKey
// @Tag Organization Sync API Key API
// @Description delete organization sync api key
// @router /organization-sync-api-keys/delete [post]
func (c *ApiController) DeleteOrganizationSyncApiKey() {
	var key object.OrganizationSyncApiKey
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &key); err != nil {
		c.ResponseError(err.Error())
		return
	}
	normalizeOrganizationSyncApiKeyRequest(&key)
	if _, ok := c.requireOrganizationSyncApiKeyAdmin(key.Organization); !ok {
		return
	}
	c.Data["json"] = wrapActionResponse(object.DeleteOrganizationSyncApiKey(&key))
	c.ServeJSON()
}

// ExportOrganizationSyncSnapshot
// @Title ExportOrganizationSyncSnapshot
// @Tag Organization Sync API
// @Description export organization sync snapshot for the key-bound organization
// @router /organization-sync/export [get]
func (c *ApiController) ExportOrganizationSyncSnapshot() {
	organization, ok := c.requireOrganizationSyncApiKeyOrganization(c.Ctx.Input.Query("organization"))
	if !ok {
		return
	}
	contractVersion := strings.TrimSpace(c.Ctx.Input.Query("contractVersion"))
	if contractVersion == "" || strings.EqualFold(contractVersion, "legacy") {
		resp, err := c.buildOrganizationSyncExportResponse(organization)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		c.ResponseOk(resp)
		return
	}
	if !strings.EqualFold(contractVersion, object.OrganizationSyncContractV2) {
		logOrganizationSyncV2Export(organization, "", "", "", 0, 0, "failed", object.OrganizationSyncContractErrorUnsupportedVersion)
		c.ResponseError(object.OrganizationSyncContractErrorUnsupportedVersion)
		return
	}
	sourceConnectionID := strings.TrimSpace(c.Ctx.Input.Query("sourceConnectionId"))
	resp, err := organizationSyncV2ExportBuilder(organization, sourceConnectionID, time.Now().UTC())
	if err != nil {
		errorCode := organizationSyncV2SafeErrorCode(err)
		logOrganizationSyncV2Export(organization, sourceConnectionID, "", "", 0, 0, "failed", errorCode)
		c.ResponseError(errorCode)
		return
	}
	logOrganizationSyncV2Export(
		organization,
		resp.SourceConnectionID,
		resp.SourceOrgVersion,
		resp.BatchID,
		resp.Diagnostics.MemberRelationCount,
		resp.Diagnostics.DepartmentLeaderCount+resp.Diagnostics.DirectLeaderCount,
		"success",
		"",
	)
	c.ResponseOk(resp)
}

func (c *ApiController) buildOrganizationSyncExportResponse(organization string) (*organizationSyncExportResponse, error) {
	snapshot, err := organizationSyncLegacyExportBuilder(organization)
	if err != nil {
		return nil, err
	}
	return &organizationSyncExportResponse{
		Organization: snapshot.Organization,
		Groups:       snapshot.Groups,
		Applications: snapshot.Applications,
	}, nil
}

func organizationSyncV2SafeErrorCode(err error) string {
	var contractErr *object.OrganizationSyncContractError
	if errors.As(err, &contractErr) && strings.TrimSpace(contractErr.Code) != "" {
		return contractErr.Code
	}
	return object.OrganizationSyncContractErrorInternal
}

func logOrganizationSyncV2Export(organization string, sourceConnectionID string, sourceVersion string, batchID string, memberCount int, leaderCount int, status string, errorCode string) {
	logs.Info(
		"organization_sync_export_v2 organization=%s sourceConnectionId=%s sourceVersion=%s batchId=%s memberRelationCount=%d leaderRelationCount=%d status=%s errorCode=%s",
		strings.TrimSpace(organization),
		strings.TrimSpace(sourceConnectionID),
		strings.TrimSpace(sourceVersion),
		strings.TrimSpace(batchID),
		memberCount,
		leaderCount,
		strings.TrimSpace(status),
		strings.TrimSpace(errorCode),
	)
}
