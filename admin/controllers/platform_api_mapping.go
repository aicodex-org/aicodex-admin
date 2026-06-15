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
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/beego/beego/v2/core/logs"
	"github.com/beego/beego/v2/core/utils/pagination"
)

// GetPlatformApiOrganizationMappings
// @Title GetPlatformApiOrganizationMappings
// @Tag Platform API Mapping API
// @Description get platform organization to aicodex-api organization mappings
// @router /get-platform-api-organization-mappings [get]
func (c *ApiController) GetPlatformApiOrganizationMappings() {
	organizationId := c.Ctx.Input.Query("organization")
	mappings, err := object.GetPlatformApiOrganizationMappings(organizationId)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(mappings)
}

// UpdatePlatformApiOrganizationMapping
// @Title UpdatePlatformApiOrganizationMapping
// @Tag Platform API Mapping API
// @Description create or update a platform organization to aicodex-api organization mapping
// @router /update-platform-api-organization-mapping [post]
func (c *ApiController) UpdatePlatformApiOrganizationMapping() {
	mapping := &object.PlatformApiOrganizationMapping{}
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, mapping); err != nil {
		writePlatformApiMappingAudit("update_api_organization_mapping", "", "", "", "", "error", "INVALID_ARGUMENT")
		c.ResponseError(err.Error())
		return
	}
	if err := object.SavePlatformApiOrganizationMapping(mapping); err != nil {
		writePlatformApiMappingAudit("update_api_organization_mapping", mapping.OrganizationId, "", mapping.MappingStatus, mapping.MappingSource, "error", "SAVE_FAILED")
		c.ResponseError(err.Error())
		return
	}
	writePlatformApiMappingAudit("update_api_organization_mapping", mapping.OrganizationId, "", mapping.MappingStatus, mapping.MappingSource, "ok", "")
	c.ResponseOk(mapping)
}

// GetPlatformApiUserMappings
// @Title GetPlatformApiUserMappings
// @Tag Platform API Mapping API
// @Description get platform admin subject to aicodex-api user mappings
// @router /get-platform-api-user-mappings [get]
func (c *ApiController) GetPlatformApiUserMappings() {
	organizationId := c.Ctx.Input.Query("organization")
	limit := c.Ctx.Input.Query("pageSize")
	page := c.Ctx.Input.Query("p")
	keyword := c.Ctx.Input.Query("keyword")

	if limit == "" || page == "" {
		mappings, err := object.GetPlatformApiUserMappings(organizationId)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		c.ResponseOk(mappings)
		return
	}

	limitInt := util.ParseInt(limit)
	count, err := object.GetPlatformApiUserMappingCount(organizationId, keyword)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	paginator := pagination.NewPaginator(c.Ctx.Request, limitInt, count)
	mappings, err := object.GetPaginationPlatformApiUserMappings(organizationId, paginator.Offset(), limitInt, keyword)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(mappings, paginator.Nums())
}

// GetPlatformApiUserMappingReadiness
// @Title GetPlatformApiUserMappingReadiness
// @Tag Platform API Mapping API
// @Description 获取 Platform API 用户映射的只读可发布主体 readiness 诊断
// @router /get-platform-api-user-mapping-readiness [get]
func (c *ApiController) GetPlatformApiUserMappingReadiness() {
	readiness, err := object.GetPlatformApiUserMappingReadiness(object.PlatformApiUserMappingReadinessQuery{
		OrganizationId:     c.Ctx.Input.Query("organization"),
		Keyword:            c.Ctx.Input.Query("keyword"),
		ReadinessCategory:  c.Ctx.Input.Query("readinessCategory"),
		UserMappingStatus:  c.Ctx.Input.Query("mappingStatus"),
		MaxCandidateResult: util.ParseInt(c.Ctx.Input.Query("limit")),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(readiness)
}

// UpdatePlatformApiUserMapping
// @Title UpdatePlatformApiUserMapping
// @Tag Platform API Mapping API
// @Description create or update a platform admin subject to aicodex-api user mapping
// @router /update-platform-api-user-mapping [post]
func (c *ApiController) UpdatePlatformApiUserMapping() {
	mapping := &object.PlatformApiUserMapping{}
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, mapping); err != nil {
		writePlatformApiMappingAudit("update_api_user_mapping", "", "", "", "", "error", "INVALID_ARGUMENT")
		c.ResponseError(err.Error())
		return
	}
	if err := object.SavePlatformApiUserMapping(mapping); err != nil {
		writePlatformApiMappingAudit("update_api_user_mapping", mapping.OrganizationId, mapping.AdminSubject, mapping.MappingStatus, mapping.MappingSource, "error", "SAVE_FAILED")
		c.ResponseError(err.Error())
		return
	}
	writePlatformApiMappingAudit("update_api_user_mapping", mapping.OrganizationId, mapping.AdminSubject, mapping.MappingStatus, mapping.MappingSource, "ok", "")
	c.ResponseOk(mapping)
}

// writePlatformApiMappingAudit 只记录管理动作和主体哈希，避免在仓库日志中扩散 api/user 明文映射值。
func writePlatformApiMappingAudit(action string, organizationId string, adminSubject string, mappingStatus string, mappingSource string, status string, errorCode string) {
	logs.Info("platform_api_mapping_audit action=%s organizationId=%s adminSubjectHash=%s mappingStatus=%s mappingSource=%s status=%s errorCode=%s",
		action,
		strings.TrimSpace(organizationId),
		hashPlatformApiMappingAuditValue(adminSubject),
		strings.TrimSpace(mappingStatus),
		strings.TrimSpace(mappingSource),
		status,
		errorCode)
}

func hashPlatformApiMappingAuditValue(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(value))
	return "sha256:" + hex.EncodeToString(sum[:])
}
