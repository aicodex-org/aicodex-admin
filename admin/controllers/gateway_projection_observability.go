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
	"strconv"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

var getGatewayProjectionCleanupApprovalDecisionDraftReadiness = func(query object.GatewayProjectionCleanupApprovalDecisionDraftReadinessQuery) (*object.GatewayProjectionCleanupApprovalDecisionDraftReadiness, error) {
	return (object.GatewayProjectionPublishAttemptHistoryService{}).CleanupApprovalDecisionDraftReadiness(query)
}

var getGatewayProjectionCleanupExecutionGateOwnerBoundaryPreflight = func(query object.GatewayProjectionCleanupExecutionGateOwnerBoundaryPreflightQuery) (*object.GatewayProjectionCleanupExecutionGateOwnerBoundaryPreflight, error) {
	return (object.GatewayProjectionPublishAttemptHistoryService{}).CleanupExecutionGateOwnerBoundaryPreflight(query)
}

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

// GetGatewayProjectionPublishAttempts
// @Title GetGatewayProjectionPublishAttempts
// @Tag Gateway Projection Observability API
// @Description 获取 admin-to-gateway projection producer 的脱敏 publish attempt history 列表；该响应不作为 gateway 授权事实来源。
// @Param organization query string true "Admin 组织 ID"
// @Param source query string false "manual 或 scheduled"
// @Param status query string false "ok 或 error"
// @Param failureCategory query string false "稳定失败分类 alias"
// @Param from query string false "RFC3339 开始时间"
// @Param to query string false "RFC3339 结束时间"
// @Param limit query int false "最大返回数量"
// @Success 200 {object} object.GatewayProjectionPublishAttemptList "projection publish attempt history 列表"
// @router /gateway-projection/publish-attempts [get]
func (c *ApiController) GetGatewayProjectionPublishAttempts() {
	organization := strings.TrimSpace(c.Ctx.Input.Query("organization"))
	if organization == "" {
		c.ResponseError("gateway projection organization is required")
		return
	}
	result, err := (object.GatewayProjectionPublishAttemptHistoryService{}).List(object.GatewayProjectionPublishAttemptQuery{
		OrganizationId:  organization,
		Source:          c.Ctx.Input.Query("source"),
		Status:          c.Ctx.Input.Query("status"),
		FailureCategory: c.Ctx.Input.Query("failureCategory"),
		From:            parseGatewayProjectionQueryTime(c.Ctx.Input.Query("from")),
		To:              parseGatewayProjectionQueryTime(c.Ctx.Input.Query("to")),
		Limit:           parseGatewayProjectionQueryInt(c.Ctx.Input.Query("limit")),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetGatewayProjectionPublishAttempt
// @Title GetGatewayProjectionPublishAttempt
// @Tag Gateway Projection Observability API
// @Description 获取单条 admin-to-gateway projection publish attempt 的脱敏详情；该响应不包含原始 payload 或凭据。
// @Param attemptId path string true "Attempt ID"
// @Param organization query string true "Admin 组织 ID"
// @Success 200 {object} object.GatewayProjectionPublishAttempt "projection publish attempt 脱敏详情"
// @router /gateway-projection/publish-attempts/:attemptId [get]
func (c *ApiController) GetGatewayProjectionPublishAttempt() {
	organization := strings.TrimSpace(c.Ctx.Input.Query("organization"))
	if organization == "" {
		c.ResponseError("gateway projection organization is required")
		return
	}
	result, err := (object.GatewayProjectionPublishAttemptHistoryService{}).Detail(object.GatewayProjectionPublishAttemptQuery{
		OrganizationId: organization,
		AttemptId:      c.Ctx.Input.Param(":attemptId"),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if result == nil {
		c.ResponseError("gateway projection publish attempt not found")
		return
	}
	c.ResponseOk(result)
}

// GetGatewayProjectionPublishAttemptRetentionReadiness
// @Title GetGatewayProjectionPublishAttemptRetentionReadiness
// @Tag Gateway Projection Observability API
// @Description 获取 admin-to-gateway projection publish attempt retention 只读 readiness；该响应不执行 cleanup。
// @Param organization query string true "Admin 组织 ID"
// @Param source query string false "manual 或 scheduled"
// @Param status query string false "ok 或 error"
// @Param failureCategory query string false "稳定失败分类 alias"
// @Param from query string false "RFC3339 开始时间"
// @Param to query string false "RFC3339 结束时间"
// @Param limit query int false "最大统计数量"
// @Success 200 {object} object.GatewayProjectionPublishAttemptRetentionReadiness "projection publish attempt retention readiness 脱敏摘要"
// @router /gateway-projection/publish-attempt-retention-readiness [get]
func (c *ApiController) GetGatewayProjectionPublishAttemptRetentionReadiness() {
	organization := strings.TrimSpace(c.Ctx.Input.Query("organization"))
	if organization == "" {
		c.ResponseError("gateway projection organization is required")
		return
	}
	result, err := (object.GatewayProjectionPublishAttemptHistoryService{}).RetentionReadiness(object.GatewayProjectionPublishAttemptQuery{
		OrganizationId:  organization,
		Source:          c.Ctx.Input.Query("source"),
		Status:          c.Ctx.Input.Query("status"),
		FailureCategory: c.Ctx.Input.Query("failureCategory"),
		From:            parseGatewayProjectionQueryTime(c.Ctx.Input.Query("from")),
		To:              parseGatewayProjectionQueryTime(c.Ctx.Input.Query("to")),
		Limit:           parseGatewayProjectionQueryInt(c.Ctx.Input.Query("limit")),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetGatewayProjectionPublishAttemptRetentionCleanupDryRun
// @Title GetGatewayProjectionPublishAttemptRetentionCleanupDryRun
// @Tag Gateway Projection Observability API
// @Description 生成 admin-to-gateway projection publish attempt retention cleanup 只读 dry-run 计划；P0 不执行删除或更新。
// @Param organization query string true "Admin 组织 ID"
// @Param source query string false "manual 或 scheduled"
// @Param status query string false "ok 或 error"
// @Param failureCategory query string false "稳定失败分类 alias"
// @Param olderThan query string false "RFC3339 清理候选上限时间；默认按 retention window 计算"
// @Param limit query int false "最大统计数量"
// @Success 200 {object} object.GatewayProjectionPublishAttemptCleanupDryRunPlan "projection publish attempt cleanup dry-run 脱敏计划"
// @router /gateway-projection/publish-attempt-retention-cleanup-dry-run [get]
func (c *ApiController) GetGatewayProjectionPublishAttemptRetentionCleanupDryRun() {
	organization := strings.TrimSpace(c.Ctx.Input.Query("organization"))
	if organization == "" {
		c.ResponseError("gateway projection organization is required")
		return
	}
	result, err := (object.GatewayProjectionPublishAttemptHistoryService{}).CleanupDryRun(object.GatewayProjectionPublishAttemptCleanupDryRunQuery{
		OrganizationId:  organization,
		Source:          c.Ctx.Input.Query("source"),
		Status:          c.Ctx.Input.Query("status"),
		FailureCategory: c.Ctx.Input.Query("failureCategory"),
		OlderThan:       parseGatewayProjectionQueryTime(c.Ctx.Input.Query("olderThan")),
		Limit:           parseGatewayProjectionQueryInt(c.Ctx.Input.Query("limit")),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetGatewayProjectionPublishAttemptRetentionCleanupExecuteReadiness
// @Title GetGatewayProjectionPublishAttemptRetentionCleanupExecuteReadiness
// @Tag Gateway Projection Observability API
// @Description 生成 admin-to-gateway projection publish attempt retention cleanup 执行前只读 readiness；P0 不执行删除或更新。
// @Param organization query string true "Admin 组织 ID"
// @Param source query string false "manual 或 scheduled"
// @Param status query string false "ok 或 error"
// @Param failureCategory query string false "稳定失败分类 alias"
// @Param olderThan query string false "RFC3339 清理候选上限时间"
// @Param dryRunGeneratedAt query string false "RFC3339 dry-run 生成时间"
// @Param maxDryRunAgeSeconds query int false "dry-run 新鲜度最大年龄秒数"
// @Param approvalEvidence query string false "逗号分隔的脱敏审批材料 alias"
// @Param limit query int false "最大统计数量"
// @Success 200 {object} object.GatewayProjectionPublishAttemptCleanupExecuteReadiness "projection cleanup execute readiness 脱敏结果"
// @router /gateway-projection/publish-attempt-retention-cleanup-execute-readiness [get]
func (c *ApiController) GetGatewayProjectionPublishAttemptRetentionCleanupExecuteReadiness() {
	organization := strings.TrimSpace(c.Ctx.Input.Query("organization"))
	if organization == "" {
		c.ResponseError("gateway projection organization is required")
		return
	}
	result, err := (object.GatewayProjectionPublishAttemptHistoryService{}).CleanupExecuteReadiness(object.GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery{
		OrganizationId:          organization,
		Source:                  c.Ctx.Input.Query("source"),
		Status:                  c.Ctx.Input.Query("status"),
		FailureCategory:         c.Ctx.Input.Query("failureCategory"),
		OlderThan:               parseGatewayProjectionQueryTime(c.Ctx.Input.Query("olderThan")),
		Limit:                   parseGatewayProjectionQueryInt(c.Ctx.Input.Query("limit")),
		DryRunGeneratedAt:       parseGatewayProjectionQueryTime(c.Ctx.Input.Query("dryRunGeneratedAt")),
		MaxDryRunAgeSeconds:     int64(parseGatewayProjectionQueryInt(c.Ctx.Input.Query("maxDryRunAgeSeconds"))),
		ApprovalEvidenceAliases: parseGatewayProjectionQueryCSV(c.Ctx.Input.Query("approvalEvidence")),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetGatewayProjectionPublishAttemptRetentionCleanupApprovalPolicyReadiness
// @Title GetGatewayProjectionPublishAttemptRetentionCleanupApprovalPolicyReadiness
// @Tag Gateway Projection Observability API
// @Description 生成 admin-to-gateway projection cleanup approval policy 的只读 readiness；P0 不执行 cleanup、不创建真实审批决策。
// @Param organization query string true "Admin 组织 ID"
// @Param source query string false "manual 或 scheduled"
// @Param status query string false "ok 或 error"
// @Param failureCategory query string false "稳定失败分类 alias"
// @Param olderThan query string false "RFC3339 清理候选上限时间"
// @Param readinessHash query string false "脱敏 readiness hash"
// @Param dryRunGeneratedAt query string false "RFC3339 dry-run 生成时间"
// @Param maxDryRunAgeSeconds query int false "dry-run 新鲜度最大年龄秒数"
// @Param approvalEvidence query string false "逗号分隔的脱敏审批材料 alias"
// @Param limit query int false "最大统计数量"
// @Success 200 {object} object.GatewayProjectionCleanupApprovalPolicyReadiness "projection cleanup approval policy readiness 脱敏结果"
// @router /gateway-projection/publish-attempt-retention-cleanup-approval-policy-readiness [get]
func (c *ApiController) GetGatewayProjectionPublishAttemptRetentionCleanupApprovalPolicyReadiness() {
	organization := strings.TrimSpace(c.Ctx.Input.Query("organization"))
	if organization == "" {
		c.ResponseError("gateway projection organization is required")
		return
	}
	result, err := (object.GatewayProjectionPublishAttemptHistoryService{}).CleanupApprovalPolicyReadiness(object.GatewayProjectionCleanupApprovalPolicyReadinessQuery{
		OrganizationId:          organization,
		Source:                  c.Ctx.Input.Query("source"),
		Status:                  c.Ctx.Input.Query("status"),
		FailureCategory:         c.Ctx.Input.Query("failureCategory"),
		OlderThan:               parseGatewayProjectionQueryTime(c.Ctx.Input.Query("olderThan")),
		ReadinessHash:           c.Ctx.Input.Query("readinessHash"),
		Limit:                   parseGatewayProjectionQueryInt(c.Ctx.Input.Query("limit")),
		DryRunGeneratedAt:       parseGatewayProjectionQueryTime(c.Ctx.Input.Query("dryRunGeneratedAt")),
		MaxDryRunAgeSeconds:     int64(parseGatewayProjectionQueryInt(c.Ctx.Input.Query("maxDryRunAgeSeconds"))),
		ApprovalEvidenceAliases: parseGatewayProjectionQueryCSV(c.Ctx.Input.Query("approvalEvidence")),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetGatewayProjectionPublishAttemptRetentionCleanupApprovalDecisionDraftReadiness
// @Title GetGatewayProjectionPublishAttemptRetentionCleanupApprovalDecisionDraftReadiness
// @Tag Gateway Projection Observability API
// @Description 生成 admin-to-gateway projection cleanup approval decision draft 的只读 readiness；P0 不创建真实审批决策、不执行 cleanup。
// @Param organization query string true "Admin 组织 ID"
// @Param source query string false "manual 或 scheduled"
// @Param status query string false "ok 或 error"
// @Param failureCategory query string false "稳定失败分类 alias"
// @Param olderThan query string false "RFC3339 清理候选上限时间"
// @Param readinessHash query string false "脱敏 readiness hash"
// @Param dryRunGeneratedAt query string false "RFC3339 dry-run 生成时间"
// @Param maxDryRunAgeSeconds query int false "dry-run 新鲜度最大年龄秒数"
// @Param approvalEvidence query string false "逗号分隔的脱敏审批材料 alias"
// @Param limit query int false "最大统计数量"
// @Success 200 {object} object.GatewayProjectionCleanupApprovalDecisionDraftReadiness "projection cleanup approval decision draft readiness 脱敏结果"
// @router /gateway-projection/publish-attempt-retention-cleanup-approval-decision-draft-readiness [get]
func (c *ApiController) GetGatewayProjectionPublishAttemptRetentionCleanupApprovalDecisionDraftReadiness() {
	organization := strings.TrimSpace(c.Ctx.Input.Query("organization"))
	if organization == "" {
		c.ResponseError("gateway projection organization is required")
		return
	}
	result, err := getGatewayProjectionCleanupApprovalDecisionDraftReadiness(object.GatewayProjectionCleanupApprovalDecisionDraftReadinessQuery{
		OrganizationId:          organization,
		Source:                  c.Ctx.Input.Query("source"),
		Status:                  c.Ctx.Input.Query("status"),
		FailureCategory:         c.Ctx.Input.Query("failureCategory"),
		OlderThan:               parseGatewayProjectionQueryTime(c.Ctx.Input.Query("olderThan")),
		ReadinessHash:           c.Ctx.Input.Query("readinessHash"),
		Limit:                   parseGatewayProjectionQueryInt(c.Ctx.Input.Query("limit")),
		DryRunGeneratedAt:       parseGatewayProjectionQueryTime(c.Ctx.Input.Query("dryRunGeneratedAt")),
		MaxDryRunAgeSeconds:     int64(parseGatewayProjectionQueryInt(c.Ctx.Input.Query("maxDryRunAgeSeconds"))),
		ApprovalEvidenceAliases: parseGatewayProjectionQueryCSV(c.Ctx.Input.Query("approvalEvidence")),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetGatewayProjectionPublishAttemptRetentionCleanupExecutionGateOwnerBoundaryPreflight
// @Title GetGatewayProjectionPublishAttemptRetentionCleanupExecutionGateOwnerBoundaryPreflight
// @Tag Gateway Projection Observability API
// @Description 生成 admin-to-gateway projection cleanup execution gate owner-boundary 只读 preflight；P0 不创建真实执行门禁、不执行 cleanup。
// @Param organization query string true "Admin 组织 ID"
// @Param source query string false "manual 或 scheduled"
// @Param status query string false "ok 或 error"
// @Param failureCategory query string false "稳定失败分类 alias"
// @Param olderThan query string false "RFC3339 清理候选上限时间"
// @Param readinessHash query string false "脱敏 readiness hash"
// @Param dryRunGeneratedAt query string false "RFC3339 dry-run 生成时间"
// @Param maxDryRunAgeSeconds query int false "dry-run 新鲜度最大年龄秒数"
// @Param approvalEvidence query string false "逗号分隔的脱敏审批材料 alias"
// @Param limit query int false "最大统计数量"
// @Success 200 {object} object.GatewayProjectionCleanupExecutionGateOwnerBoundaryPreflight "projection cleanup execution gate owner-boundary preflight 脱敏结果"
// @router /gateway-projection/publish-attempt-retention-cleanup-execution-gate-owner-boundary-preflight [get]
func (c *ApiController) GetGatewayProjectionPublishAttemptRetentionCleanupExecutionGateOwnerBoundaryPreflight() {
	organization := strings.TrimSpace(c.Ctx.Input.Query("organization"))
	if organization == "" {
		c.ResponseError("gateway projection organization is required")
		return
	}
	result, err := getGatewayProjectionCleanupExecutionGateOwnerBoundaryPreflight(object.GatewayProjectionCleanupExecutionGateOwnerBoundaryPreflightQuery{
		OrganizationId:          organization,
		Source:                  c.Ctx.Input.Query("source"),
		Status:                  c.Ctx.Input.Query("status"),
		FailureCategory:         c.Ctx.Input.Query("failureCategory"),
		OlderThan:               parseGatewayProjectionQueryTime(c.Ctx.Input.Query("olderThan")),
		ReadinessHash:           c.Ctx.Input.Query("readinessHash"),
		Limit:                   parseGatewayProjectionQueryInt(c.Ctx.Input.Query("limit")),
		DryRunGeneratedAt:       parseGatewayProjectionQueryTime(c.Ctx.Input.Query("dryRunGeneratedAt")),
		MaxDryRunAgeSeconds:     int64(parseGatewayProjectionQueryInt(c.Ctx.Input.Query("maxDryRunAgeSeconds"))),
		ApprovalEvidenceAliases: parseGatewayProjectionQueryCSV(c.Ctx.Input.Query("approvalEvidence")),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// GetGatewayProjectionPublishAttemptRetentionCleanupApprovalAuditTrail
// @Title GetGatewayProjectionPublishAttemptRetentionCleanupApprovalAuditTrail
// @Tag Gateway Projection Observability API
// @Description 获取 admin-to-gateway projection cleanup execute readiness 的审批审计 trail；该响应不执行 cleanup，也不代表下游授权成功。
// @Param organization query string true "Admin 组织 ID"
// @Param action query string false "approve/reject/copy/export/refresh"
// @Param approvalState query string false "审批状态 alias"
// @Param readinessHash query string false "脱敏 readiness hash"
// @Param limit query int false "最大返回数量"
// @Success 200 {object} object.GatewayProjectionCleanupApprovalAuditTrail "projection cleanup approval audit trail"
// @router /gateway-projection/publish-attempt-retention-cleanup-approval-audit-trail [get]
func (c *ApiController) GetGatewayProjectionPublishAttemptRetentionCleanupApprovalAuditTrail() {
	organization := strings.TrimSpace(c.Ctx.Input.Query("organization"))
	if organization == "" {
		c.ResponseError("gateway projection organization is required")
		return
	}
	result, err := (object.GatewayProjectionPublishAttemptHistoryService{}).ListCleanupApprovalAuditTrail(object.GatewayProjectionCleanupApprovalAuditTrailQuery{
		OrganizationId: organization,
		Action:         c.Ctx.Input.Query("action"),
		ApprovalState:  c.Ctx.Input.Query("approvalState"),
		ReadinessHash:  c.Ctx.Input.Query("readinessHash"),
		Limit:          parseGatewayProjectionQueryInt(c.Ctx.Input.Query("limit")),
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// RecordGatewayProjectionPublishAttemptRetentionCleanupApprovalAuditTrail
// @Title RecordGatewayProjectionPublishAttemptRetentionCleanupApprovalAuditTrail
// @Tag Gateway Projection Observability API
// @Description 记录 cleanup execute readiness 的安全 operator action；P0 不执行 cleanup、不删除或更新 publish attempt。
// @Param body body object.GatewayProjectionCleanupApprovalAuditTrailRequest true "安全 action 审计请求"
// @Success 200 {object} object.GatewayProjectionCleanupApprovalAuditRecord "projection cleanup approval audit record"
// @router /gateway-projection/publish-attempt-retention-cleanup-approval-audit-trail [post]
func (c *ApiController) RecordGatewayProjectionPublishAttemptRetentionCleanupApprovalAuditTrail() {
	request := object.GatewayProjectionCleanupApprovalAuditTrailRequest{}
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}
	result, err := (object.GatewayProjectionPublishAttemptHistoryService{}).RecordCleanupApprovalAuditTrail(request)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
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

func parseGatewayProjectionQueryTime(value string) time.Time {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}
	}
	return parsed
}

func parseGatewayProjectionQueryInt(value string) int {
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0
	}
	return parsed
}

func parseGatewayProjectionQueryCSV(value string) []string {
	items := []string{}
	for _, item := range strings.Split(value, ",") {
		item = strings.TrimSpace(item)
		if item != "" {
			items = append(items, item)
		}
	}
	return items
}
