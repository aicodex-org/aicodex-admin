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
	"fmt"
	"strconv"
	"strings"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
)

type organizationSyncExportResponse struct {
	Organization *object.Organization                  `json:"organization"`
	Groups       []*object.OrganizationSyncExportGroup `json:"groups"`
	Applications []*object.Application                 `json:"applications"`
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
	resp, err := c.buildOrganizationSyncExportResponse(organization)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(resp)
}

func (c *ApiController) buildOrganizationSyncExportResponse(organization string) (*organizationSyncExportResponse, error) {
	snapshot, err := object.GetOrganizationSyncSnapshot(organization)
	if err != nil {
		return nil, err
	}
	return &organizationSyncExportResponse{
		Organization: snapshot.Organization,
		Groups:       snapshot.Groups,
		Applications: snapshot.Applications,
	}, nil
}
