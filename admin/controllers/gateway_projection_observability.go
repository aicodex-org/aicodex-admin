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
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

// GetGatewayProjectionObservability
// @Title GetGatewayProjectionObservability
// @Tag Gateway Projection Observability API
// @Description 获取 admin-to-gateway projection producer 的脱敏运行态诊断；该响应不作为 gateway 授权事实来源。
// @Success 200 {object} object.GatewayProjectionObservabilitySnapshot "projection producer 运行态诊断"
// @router /gateway-projection/observability [get]
func (c *ApiController) GetGatewayProjectionObservability() {
	c.ResponseOk(object.GetGatewayProjectionObservabilitySnapshot(time.Now().UTC()))
}

// GetGatewayProjectionRunReadiness
// @Title GetGatewayProjectionRunReadiness
// @Tag Gateway Projection Observability API
// @Description 获取最近一次 admin-to-gateway projection publish run 的脱敏 diff 与 retry readiness；该响应不作为 gateway 授权事实来源。
// @Param organization query string true "Admin 组织 ID"
// @Param traceId query string false "可选 latest run traceId 校验"
// @Param projectionBatchId query string false "可选 latest run projectionBatchId 校验"
// @Success 200 {object} object.GatewayProjectionRunReadinessSummary "projection run retry readiness 脱敏摘要"
// @router /gateway-projection/run-readiness [get]
func (c *ApiController) GetGatewayProjectionRunReadiness() {
	result, err := (object.GatewayProjectionRunReadinessService{}).GetReadiness(object.GatewayProjectionRunReadinessQuery{
		OrganizationID:    c.Ctx.Input.Query("organization"),
		TraceID:           c.Ctx.Input.Query("traceId"),
		ProjectionBatchID: c.Ctx.Input.Query("projectionBatchId"),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetGatewayProjectionIngestionStatus
// @Title GetGatewayProjectionIngestionStatus
// @Tag Gateway Projection Observability API
// @Description 只读查询 Gateway owner projection ingestion status；该响应不触发 publish，也不代表 Insight/API 授权成功。
// @Param organization query string true "Admin 组织 ID"
// @Param latest query bool false "是否查询 latest"
// @Param projectionBatchId query string false "projection batch id"
// @Param orgVersion query int false "gateway org version"
// @Param sourceVersion query string false "Admin source version"
// @Success 200 {object} object.GatewayProjectionIngestionStatusResult "Gateway ingestion status 脱敏摘要"
// @router /gateway-projection/ingestion-status [get]
func (c *ApiController) GetGatewayProjectionIngestionStatus() {
	query := object.GatewayProjectionIngestionStatusQuery{
		OrganizationID:    c.Ctx.Input.Query("organization"),
		Latest:            c.Ctx.Input.Query("latest") == "true",
		ProjectionBatchID: c.Ctx.Input.Query("projectionBatchId"),
		SourceVersion:     c.Ctx.Input.Query("sourceVersion"),
	}
	if orgVersion, err := c.GetInt64("orgVersion"); err == nil {
		query.OrgVersion = orgVersion
	}
	result, err := (object.GatewayProjectionIngestionStatusService{}).GetStatus(c.Ctx.Request.Context(), query)
	if err != nil {
		c.ResponseError(gatewayProjectionIngestionStatusErrorMessage(result), result)
		return
	}
	c.ResponseOk(result)
}

func gatewayProjectionIngestionStatusErrorMessage(result object.GatewayProjectionIngestionStatusResult) string {
	category := result.FailureCategory
	if category == "" {
		category = result.Status
	}
	if category == "" {
		category = object.GatewayProjectionIngestionStatusProviderUnavailable
	}
	// 下游网络错误可能包含私有 endpoint；operator API 只返回稳定分类。
	return "gateway projection ingestion status query failed: " + category
}

// PublishGatewayProjectionManually
// @Title PublishGatewayProjectionManually
// @Tag Gateway Projection Observability API
// @Description 触发一次 admin-only gateway projection 受控手动 publish attempt；该操作不写 gateway 授权事实。
// @Param body body object.GatewayProjectionManualPublishRequest true "手动 publish 请求"
// @Success 200 {object} object.GatewayProjectionManualPublishResult "projection manual publish 脱敏结果"
// @router /gateway-projection/manual-publish [post]
func (c *ApiController) PublishGatewayProjectionManually() {
	request := object.GatewayProjectionManualPublishRequest{}
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}
	result, err := object.GatewayProjectionManualPublishService{}.Publish(c.Ctx.Request.Context(), request)
	if err != nil {
		c.ResponseError(err.Error(), result)
		return
	}
	c.ResponseOk(result)
}
