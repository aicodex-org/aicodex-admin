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

package object

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/conf"
	"github.com/beego/beego/v2/core/logs"
)

const (
	GatewayProjectionPublishErrorInvalidConfig       = "invalid_config"
	GatewayProjectionPublishErrorProviderUnavailable = "provider_unavailable"
	GatewayProjectionPublishErrorInvalidResponse     = "invalid_response"
	GatewayProjectionPublishErrorNotAccepted         = "projection_not_accepted"

	gatewayProjectionPublisherDefaultTimeoutMs = 5000
	gatewayProjectionPublisherDefaultRetries   = 1
)

// GatewayProjectionPublisherConfig 是 admin 到 gateway projection ingestion 的私有服务间配置。
// Token/Endpoint 只能来自环境或私有配置，不应写入 OpenSpec 验证记录。
type GatewayProjectionPublisherConfig struct {
	Enabled      bool
	Endpoint     string
	Token        string
	Caller       string
	Timeout      time.Duration
	FreshnessTTL time.Duration
	MaxRetries   int
}

// GatewayProjectionPublisher 封装 gateway projection HTTP push 行为和脱敏审计出口。
type GatewayProjectionPublisher struct {
	Config GatewayProjectionPublisherConfig
	Client *http.Client
	Audit  func(GatewayProjectionPublishAuditEvent)
}

// GatewayProjectionPublishResult 用脱敏字段表达一次 push 的分类结果。
type GatewayProjectionPublishResult struct {
	Success    bool
	Accepted   bool
	Idempotent bool
	Retryable  bool
	Attempts   int
	StatusCode int
	ErrorCode  string
	Message    string
}

// GatewayProjectionPublishAuditEvent 是 publisher 写审计日志前的结构化摘要。
// 该结构只包含批次、状态和错误码，不携带 token、endpoint 或原始响应。
type GatewayProjectionPublishAuditEvent struct {
	TraceID           string
	Caller            string
	ProjectionBatchID string
	OrgVersion        int64
	Status            string
	StatusCode        int
	ErrorCode         string
	Attempts          int
	Accepted          bool
	Idempotent        bool
	DurationMs        int64
}

type gatewayProjectionPublishEnvelope struct {
	Success bool                                 `json:"success"`
	TraceID string                               `json:"traceId,omitempty"`
	Data    gatewayProjectionPublishResponseData `json:"data,omitempty"`
	Error   *gatewayProjectionPublishError       `json:"error,omitempty"`
}

type gatewayProjectionPublishResponseData struct {
	Accepted   bool   `json:"accepted"`
	Idempotent bool   `json:"idempotent"`
	Reason     string `json:"reason,omitempty"`
}

type gatewayProjectionPublishError struct {
	Code    string `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

// GetGatewayProjectionPublisherConfig 读取 admin-to-gateway projection 发布配置。
// token 和 endpoint 只来自环境或私有配置；调用方记录验证结果时不得输出真实值。
func GetGatewayProjectionPublisherConfig() GatewayProjectionPublisherConfig {
	timeoutMs := gatewayProjectionIntConfig("gatewayOrganizationProjectionTimeoutMs", gatewayProjectionPublisherDefaultTimeoutMs)
	freshnessSeconds := gatewayProjectionIntConfig("gatewayOrganizationProjectionFreshnessTTLSeconds", int(GatewayProjectionDefaultFreshnessTTL/time.Second))
	return GatewayProjectionPublisherConfig{
		Enabled:      conf.GetConfigBool("gatewayOrganizationProjectionEnabled"),
		Endpoint:     strings.TrimSpace(conf.GetConfigString("gatewayOrganizationProjectionEndpoint")),
		Token:        strings.TrimSpace(conf.GetConfigString("gatewayOrganizationProjectionToken")),
		Caller:       firstNonEmpty(conf.GetConfigString("gatewayOrganizationProjectionCaller"), GatewayProjectionDefaultCaller),
		Timeout:      time.Duration(timeoutMs) * time.Millisecond,
		FreshnessTTL: time.Duration(freshnessSeconds) * time.Second,
		MaxRetries:   gatewayProjectionIntConfig("gatewayOrganizationProjectionMaxRetries", gatewayProjectionPublisherDefaultRetries),
	}
}

// Publish 使用服务间 Bearer token 推送 projection batch。
// 网络和 5xx 只在同一个 request body 上有限重试，避免重试时生成新的 projectionBatchId。
func (p GatewayProjectionPublisher) Publish(ctx context.Context, request GatewayProjectionBatchRequest) (GatewayProjectionPublishResult, error) {
	startedAt := time.Now()
	config := p.normalizedConfig()
	result := GatewayProjectionPublishResult{}
	if strings.TrimSpace(config.Endpoint) == "" || strings.TrimSpace(config.Token) == "" {
		result.ErrorCode = GatewayProjectionPublishErrorInvalidConfig
		result.Message = "gateway projection endpoint or token is missing"
		p.writeAudit(request, result, startedAt)
		return result, errors.New(result.Message)
	}
	if strings.TrimSpace(request.Caller) == "" {
		request.Caller = config.Caller
	}
	if strings.TrimSpace(request.Caller) == "" {
		request.Caller = GatewayProjectionDefaultCaller
	}

	body, err := json.Marshal(request)
	if err != nil {
		result.ErrorCode = GatewayProjectionPublishErrorInvalidResponse
		result.Message = err.Error()
		p.writeAudit(request, result, startedAt)
		return result, err
	}

	client := p.Client
	if client == nil {
		client = newGatewayProjectionPublisherHTTPClient(config.Timeout)
	}
	maxRetries := normalizeGatewayProjectionMaxRetries(config.MaxRetries)
	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		result.Attempts = attempt + 1
		reqCtx, cancel := gatewayProjectionRequestContext(ctx, config.Timeout)
		req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, config.Endpoint, bytes.NewReader(body))
		if err != nil {
			cancel()
			result.ErrorCode = GatewayProjectionPublishErrorInvalidConfig
			result.Message = err.Error()
			p.writeAudit(request, result, startedAt)
			return result, err
		}
		req.Header.Set("Authorization", "Bearer "+config.Token)
		req.Header.Set("Content-Type", "application/json")
		req.Close = true

		resp, err := client.Do(req)
		if err != nil {
			cancel()
			lastErr = err
			result = gatewayProjectionTransportErrorResult(result.Attempts, err)
			if attempt < maxRetries && ctx.Err() == nil {
				continue
			}
			p.writeAudit(request, result, startedAt)
			return result, err
		}

		envelope, decodeErr := decodeGatewayProjectionPublishEnvelope(resp)
		// 先完整读取响应体再 cancel request context，避免在 Windows/反向代理组合下提前中断响应解码。
		cancel()
		if decodeErr != nil {
			lastErr = decodeErr
			result = gatewayProjectionResponseDecodeErrorResult(result.Attempts, resp.StatusCode, decodeErr)
		} else {
			result = gatewayProjectionEnvelopeResult(result.Attempts, resp.StatusCode, envelope)
		}
		if result.Success {
			p.writeAudit(request, result, startedAt)
			return result, nil
		}
		if !result.Retryable || attempt >= maxRetries {
			p.writeAudit(request, result, startedAt)
			if lastErr != nil && result.Retryable {
				return result, lastErr
			}
			return result, nil
		}
	}
	p.writeAudit(request, result, startedAt)
	if lastErr != nil {
		return result, lastErr
	}
	return result, nil
}

func (p GatewayProjectionPublisher) normalizedConfig() GatewayProjectionPublisherConfig {
	config := p.Config
	config.Endpoint = strings.TrimSpace(config.Endpoint)
	config.Token = strings.TrimSpace(config.Token)
	config.Caller = firstNonEmpty(config.Caller, GatewayProjectionDefaultCaller)
	if config.Timeout <= 0 {
		config.Timeout = time.Duration(gatewayProjectionPublisherDefaultTimeoutMs) * time.Millisecond
	}
	config.MaxRetries = normalizeGatewayProjectionMaxRetries(config.MaxRetries)
	return config
}

func (p GatewayProjectionPublisher) writeAudit(request GatewayProjectionBatchRequest, result GatewayProjectionPublishResult, startedAt time.Time) {
	status := "error"
	if result.Success {
		status = "ok"
	}
	event := GatewayProjectionPublishAuditEvent{
		TraceID:           request.TraceID,
		Caller:            request.Caller,
		ProjectionBatchID: request.ProjectionBatchID,
		OrgVersion:        request.OrgVersion,
		Status:            status,
		StatusCode:        result.StatusCode,
		ErrorCode:         result.ErrorCode,
		Attempts:          result.Attempts,
		Accepted:          result.Accepted,
		Idempotent:        result.Idempotent,
		DurationMs:        time.Since(startedAt).Milliseconds(),
	}
	if p.Audit != nil {
		p.Audit(event)
	} else {
		// 审计日志只记录批次、状态和错误码，不输出 token、完整 endpoint、Cookie 或原始响应。
		logs.Info("gateway_projection_publish_audit traceId=%s caller=%s projectionBatchId=%s orgVersion=%d sourceVersion=%s generatedAt=%s freshnessExpiresAt=%s subjectCount=%d activeSubjectCount=%d tombstoneSubjectCount=%d status=%s statusCode=%d errorCode=%s failureCategory=%s attempts=%d accepted=%t idempotent=%t durationMs=%d",
			event.TraceID, event.Caller, event.ProjectionBatchID, event.OrgVersion, request.Lineage.SourceVersion, request.GeneratedAt.UTC().Format(time.RFC3339), request.Freshness.ExpiresAt.UTC().Format(time.RFC3339), len(request.Subjects), gatewayProjectionActiveSubjectCount(request.Subjects), gatewayProjectionTombstoneSubjectCount(request.Subjects), event.Status, event.StatusCode, event.ErrorCode, GatewayProjectionFailureCategory(event.ErrorCode), event.Attempts, event.Accepted, event.Idempotent, event.DurationMs)
	}
	recordGatewayProjectionPublishAudit(event, request)
}

// gatewayProjectionEnvelopeResult 只把 accepted 或 idempotent 视为发布成功。
// 4xx 鉴权/契约错误不重试；5xx 由 gatewayProjectionStatusRetryable 标记为有限幂等重试。
func gatewayProjectionEnvelopeResult(attempts int, statusCode int, envelope gatewayProjectionPublishEnvelope) GatewayProjectionPublishResult {
	result := GatewayProjectionPublishResult{
		Attempts:   attempts,
		StatusCode: statusCode,
	}
	if statusCode >= http.StatusOK && statusCode < http.StatusMultipleChoices && envelope.Success && (envelope.Data.Accepted || envelope.Data.Idempotent) {
		result.Success = true
		result.Accepted = envelope.Data.Accepted
		result.Idempotent = envelope.Data.Idempotent
		result.Message = envelope.Data.Reason
		return result
	}
	result.ErrorCode = gatewayProjectionEnvelopeErrorCode(statusCode, envelope)
	result.Message = gatewayProjectionEnvelopeMessage(envelope)
	result.Retryable = gatewayProjectionStatusRetryable(statusCode)
	if statusCode >= http.StatusOK && statusCode < http.StatusMultipleChoices && result.ErrorCode == "" {
		result.ErrorCode = GatewayProjectionPublishErrorNotAccepted
	}
	return result
}

// gatewayProjectionTransportErrorResult 保留原始 error 给调用方排障，但默认审计日志不会输出 Message。
// WeCom 触发点只记录 errorCode，避免 transport error 中携带完整 endpoint。
func gatewayProjectionTransportErrorResult(attempts int, err error) GatewayProjectionPublishResult {
	return GatewayProjectionPublishResult{
		Attempts:  attempts,
		Retryable: true,
		ErrorCode: GatewayProjectionPublishErrorProviderUnavailable,
		Message:   err.Error(),
	}
}

func gatewayProjectionResponseDecodeErrorResult(attempts int, statusCode int, err error) GatewayProjectionPublishResult {
	return GatewayProjectionPublishResult{
		Attempts:   attempts,
		StatusCode: statusCode,
		Retryable:  gatewayProjectionStatusRetryable(statusCode),
		ErrorCode:  GatewayProjectionPublishErrorInvalidResponse,
		Message:    err.Error(),
	}
}

func decodeGatewayProjectionPublishEnvelope(resp *http.Response) (gatewayProjectionPublishEnvelope, error) {
	defer resp.Body.Close()
	envelope := gatewayProjectionPublishEnvelope{}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return envelope, err
	}
	return envelope, nil
}

func gatewayProjectionEnvelopeErrorCode(statusCode int, envelope gatewayProjectionPublishEnvelope) string {
	if envelope.Error != nil && strings.TrimSpace(envelope.Error.Code) != "" {
		return strings.TrimSpace(envelope.Error.Code)
	}
	switch statusCode {
	case http.StatusUnauthorized:
		return "unauthenticated"
	case http.StatusForbidden:
		return "authorization_failed"
	case http.StatusBadRequest:
		return "invalid_argument"
	default:
		if statusCode >= http.StatusInternalServerError {
			return GatewayProjectionPublishErrorProviderUnavailable
		}
	}
	return GatewayProjectionPublishErrorNotAccepted
}

func gatewayProjectionEnvelopeMessage(envelope gatewayProjectionPublishEnvelope) string {
	if envelope.Error != nil && strings.TrimSpace(envelope.Error.Message) != "" {
		return strings.TrimSpace(envelope.Error.Message)
	}
	if strings.TrimSpace(envelope.Data.Reason) != "" {
		return strings.TrimSpace(envelope.Data.Reason)
	}
	return ""
}

func gatewayProjectionStatusRetryable(statusCode int) bool {
	return statusCode >= http.StatusInternalServerError
}

func gatewayProjectionRequestContext(ctx context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	if ctx == nil {
		ctx = context.Background()
	}
	if timeout <= 0 {
		return context.WithCancel(ctx)
	}
	return context.WithTimeout(ctx, timeout)
}

func newGatewayProjectionPublisherHTTPClient(timeout time.Duration) *http.Client {
	if timeout <= 0 {
		timeout = time.Duration(gatewayProjectionPublisherDefaultTimeoutMs) * time.Millisecond
	}
	transport := http.DefaultTransport
	if defaultTransport, ok := http.DefaultTransport.(*http.Transport); ok {
		cloned := defaultTransport.Clone()
		cloned.DisableKeepAlives = true
		transport = cloned
	}
	return &http.Client{Timeout: timeout, Transport: transport}
}

func normalizeGatewayProjectionMaxRetries(value int) int {
	if value < 0 {
		return 0
	}
	return value
}

func gatewayProjectionIntConfig(key string, fallback int) int {
	value := strings.TrimSpace(conf.GetConfigString(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func (r GatewayProjectionPublishResult) String() string {
	return fmt.Sprintf("success=%t accepted=%t idempotent=%t retryable=%t attempts=%d statusCode=%d errorCode=%s",
		r.Success, r.Accepted, r.Idempotent, r.Retryable, r.Attempts, r.StatusCode, r.ErrorCode)
}
