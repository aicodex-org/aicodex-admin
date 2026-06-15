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

// GetOrganizationMasterDataQualityReadiness
// @Title GetOrganizationMasterDataQualityReadiness
// @Tag Platform API Mapping API
// @Description 获取 Admin 组织主数据质量 readiness；该响应只用于 producer 排障，不是 gateway 授权事实。
// @router /get-organization-master-data-quality-readiness [get]
func (c *ApiController) GetOrganizationMasterDataQualityReadiness() {
	readiness, err := object.GetOrganizationMasterDataQualityReadiness(object.OrganizationMasterDataQualityQuery{
		OrganizationId: c.Ctx.Input.Query("organization"),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(readiness)
}

// GetOrganizationDirectoryQuality
// @Title GetOrganizationDirectoryQuality
// @Tag Platform API Mapping API
// @Description 获取 Admin 组织目录质量明细；该响应只用于 producer 排障，不是 gateway 授权事实。
// @router /organization-master-data-quality/directory [get]
func (c *ApiController) GetOrganizationDirectoryQuality() {
	result, err := object.GetOrganizationDirectoryQuality(newOrganizationDirectoryQualityQuery(map[string]string{
		"organization":           c.Ctx.Input.Query("organization"),
		"entityType":             c.Ctx.Input.Query("entityType"),
		"keyword":                c.Ctx.Input.Query("keyword"),
		"sourceType":             c.Ctx.Input.Query("sourceType"),
		"sourceConnectionIdHash": c.Ctx.Input.Query("sourceConnectionIdHash"),
		"qualityStatus":          c.Ctx.Input.Query("qualityStatus"),
		"reasonCode":             c.Ctx.Input.Query("reasonCode"),
		"lifecycleStatus":        c.Ctx.Input.Query("lifecycleStatus"),
		"p":                      c.Ctx.Input.Query("p"),
		"pageSize":               c.Ctx.Input.Query("pageSize"),
	}))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetOrganizationDirectoryRemediationPlan
// @Title GetOrganizationDirectoryRemediationPlan
// @Tag Platform API Mapping API
// @Description 获取 Admin 组织目录质量 remediation plan；该响应只用于只读 producer 排障，不执行修复。
// @router /organization-master-data-quality/remediation-plan [get]
func (c *ApiController) GetOrganizationDirectoryRemediationPlan() {
	result, err := object.GetOrganizationDirectoryRemediationPlan(newOrganizationDirectoryRemediationPlanQuery(map[string]string{
		"organization":           c.Ctx.Input.Query("organization"),
		"entityType":             c.Ctx.Input.Query("entityType"),
		"keyword":                c.Ctx.Input.Query("keyword"),
		"sourceType":             c.Ctx.Input.Query("sourceType"),
		"sourceConnectionIdHash": c.Ctx.Input.Query("sourceConnectionIdHash"),
		"qualityStatus":          c.Ctx.Input.Query("qualityStatus"),
		"reasonCode":             c.Ctx.Input.Query("reasonCode"),
		"lifecycleStatus":        c.Ctx.Input.Query("lifecycleStatus"),
		"limit":                  c.Ctx.Input.Query("limit"),
		"topN":                   c.Ctx.Input.Query("topN"),
	}))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetOrganizationDirectoryRemediationActionDrafts
// @Title GetOrganizationDirectoryRemediationActionDrafts
// @Tag Platform API Mapping API
// @Description 获取 Admin 组织目录质量 remediation action drafts；该响应只读且只支持人工复核，不执行修复。
// @router /organization-master-data-quality/remediation-action-drafts [get]
func (c *ApiController) GetOrganizationDirectoryRemediationActionDrafts() {
	result, err := object.GetOrganizationDirectoryRemediationActionDrafts(newOrganizationDirectoryRemediationActionDraftQuery(map[string]string{
		"organization":           c.Ctx.Input.Query("organization"),
		"actionAlias":            c.Ctx.Input.Query("actionAlias"),
		"entityType":             c.Ctx.Input.Query("entityType"),
		"keyword":                c.Ctx.Input.Query("keyword"),
		"sourceType":             c.Ctx.Input.Query("sourceType"),
		"sourceConnectionIdHash": c.Ctx.Input.Query("sourceConnectionIdHash"),
		"qualityStatus":          c.Ctx.Input.Query("qualityStatus"),
		"reasonCode":             c.Ctx.Input.Query("reasonCode"),
		"limit":                  c.Ctx.Input.Query("limit"),
		"topN":                   c.Ctx.Input.Query("topN"),
	}))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetOrganizationDirectoryRemediationPreflights
// @Title GetOrganizationDirectoryRemediationPreflights
// @Tag Platform API Mapping API
// @Description 获取 Admin 组织目录质量 remediation preflight；该响应只读且只用于人工复核前检查，不执行修复。
// @router /organization-master-data-quality/remediation-preflight [get]
func (c *ApiController) GetOrganizationDirectoryRemediationPreflights() {
	result, err := object.GetOrganizationDirectoryRemediationPreflights(newOrganizationDirectoryRemediationPreflightQuery(map[string]string{
		"organization":           c.Ctx.Input.Query("organization"),
		"draftId":                c.Ctx.Input.Query("draftId"),
		"actionAlias":            c.Ctx.Input.Query("actionAlias"),
		"entityType":             c.Ctx.Input.Query("entityType"),
		"keyword":                c.Ctx.Input.Query("keyword"),
		"sourceType":             c.Ctx.Input.Query("sourceType"),
		"sourceConnectionIdHash": c.Ctx.Input.Query("sourceConnectionIdHash"),
		"qualityStatus":          c.Ctx.Input.Query("qualityStatus"),
		"reasonCode":             c.Ctx.Input.Query("reasonCode"),
		"limit":                  c.Ctx.Input.Query("limit"),
		"topN":                   c.Ctx.Input.Query("topN"),
	}))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetOrganizationDirectoryRemediationApprovalPreviews
// @Title GetOrganizationDirectoryRemediationApprovalPreviews
// @Tag Platform API Mapping API
// @Description 获取 Admin 组织目录质量 remediation execution approval preview；该响应只读且只用于执行前人工审批预览，不执行修复。
// @router /organization-master-data-quality/remediation-approval-preview [get]
func (c *ApiController) GetOrganizationDirectoryRemediationApprovalPreviews() {
	result, err := object.GetOrganizationDirectoryRemediationApprovalPreviews(newOrganizationDirectoryRemediationApprovalPreviewQuery(map[string]string{
		"organization":           c.Ctx.Input.Query("organization"),
		"draftId":                c.Ctx.Input.Query("draftId"),
		"actionAlias":            c.Ctx.Input.Query("actionAlias"),
		"entityType":             c.Ctx.Input.Query("entityType"),
		"keyword":                c.Ctx.Input.Query("keyword"),
		"sourceType":             c.Ctx.Input.Query("sourceType"),
		"sourceConnectionIdHash": c.Ctx.Input.Query("sourceConnectionIdHash"),
		"qualityStatus":          c.Ctx.Input.Query("qualityStatus"),
		"reasonCode":             c.Ctx.Input.Query("reasonCode"),
		"limit":                  c.Ctx.Input.Query("limit"),
		"topN":                   c.Ctx.Input.Query("topN"),
	}))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

func newOrganizationDirectoryQualityQuery(values map[string]string) object.OrganizationDirectoryQualityQuery {
	return object.OrganizationDirectoryQualityQuery{
		OrganizationId:         values["organization"],
		EntityType:             values["entityType"],
		Keyword:                values["keyword"],
		SourceType:             values["sourceType"],
		SourceConnectionIdHash: values["sourceConnectionIdHash"],
		QualityStatus:          values["qualityStatus"],
		ReasonCode:             values["reasonCode"],
		LifecycleStatus:        values["lifecycleStatus"],
		Page:                   util.ParseInt(values["p"]),
		PageSize:               util.ParseInt(values["pageSize"]),
	}
}

func newOrganizationDirectoryRemediationPlanQuery(values map[string]string) object.OrganizationDirectoryRemediationPlanQuery {
	return object.OrganizationDirectoryRemediationPlanQuery{
		OrganizationId:         values["organization"],
		EntityType:             values["entityType"],
		Keyword:                values["keyword"],
		SourceType:             values["sourceType"],
		SourceConnectionIdHash: values["sourceConnectionIdHash"],
		QualityStatus:          values["qualityStatus"],
		ReasonCode:             values["reasonCode"],
		LifecycleStatus:        values["lifecycleStatus"],
		Limit:                  util.ParseInt(values["limit"]),
		TopN:                   util.ParseInt(values["topN"]),
	}
}

func newOrganizationDirectoryRemediationActionDraftQuery(values map[string]string) object.OrganizationDirectoryRemediationActionDraftQuery {
	return object.OrganizationDirectoryRemediationActionDraftQuery{
		OrganizationId:         values["organization"],
		ActionAlias:            values["actionAlias"],
		EntityType:             values["entityType"],
		Keyword:                values["keyword"],
		SourceType:             values["sourceType"],
		SourceConnectionIdHash: values["sourceConnectionIdHash"],
		QualityStatus:          values["qualityStatus"],
		ReasonCode:             values["reasonCode"],
		Limit:                  util.ParseInt(values["limit"]),
		TopN:                   util.ParseInt(values["topN"]),
	}
}

func newOrganizationDirectoryRemediationPreflightQuery(values map[string]string) object.OrganizationDirectoryRemediationPreflightQuery {
	return object.OrganizationDirectoryRemediationPreflightQuery{
		OrganizationId:         values["organization"],
		DraftId:                values["draftId"],
		ActionAlias:            values["actionAlias"],
		EntityType:             values["entityType"],
		Keyword:                values["keyword"],
		SourceType:             values["sourceType"],
		SourceConnectionIdHash: values["sourceConnectionIdHash"],
		QualityStatus:          values["qualityStatus"],
		ReasonCode:             values["reasonCode"],
		Limit:                  util.ParseInt(values["limit"]),
		TopN:                   util.ParseInt(values["topN"]),
	}
}

func newOrganizationDirectoryRemediationApprovalPreviewQuery(values map[string]string) object.OrganizationDirectoryRemediationApprovalPreviewQuery {
	return object.OrganizationDirectoryRemediationApprovalPreviewQuery{
		OrganizationId:         values["organization"],
		DraftId:                values["draftId"],
		ActionAlias:            values["actionAlias"],
		EntityType:             values["entityType"],
		Keyword:                values["keyword"],
		SourceType:             values["sourceType"],
		SourceConnectionIdHash: values["sourceConnectionIdHash"],
		QualityStatus:          values["qualityStatus"],
		ReasonCode:             values["reasonCode"],
		Limit:                  util.ParseInt(values["limit"]),
		TopN:                   util.ParseInt(values["topN"]),
	}
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
