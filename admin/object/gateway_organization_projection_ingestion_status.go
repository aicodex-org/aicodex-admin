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
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	GatewayProjectionIngestionStatusAccepted            = "accepted"
	GatewayProjectionIngestionStatusApplied             = "applied"
	GatewayProjectionIngestionStatusStale               = "stale"
	GatewayProjectionIngestionStatusConflict            = "conflict"
	GatewayProjectionIngestionStatusLineageInvalid      = "lineage_invalid"
	GatewayProjectionIngestionStatusUnmappedSubjects    = "unmapped_subjects"
	GatewayProjectionIngestionStatusNotFound            = "not_found"
	GatewayProjectionIngestionStatusProviderUnavailable = "provider_unavailable"
	GatewayProjectionIngestionStatusInvalidResponse     = "invalid_response"
	GatewayProjectionIngestionStatusUnknown             = "unknown"
)

// GatewayProjectionIngestionStatusQuery 是 Admin operator 查询 Gateway ingestion receipt 的只读条件。
// 这些字段会作为 query 转发给 Gateway owner contract，不用于读取下游数据库。
type GatewayProjectionIngestionStatusQuery struct {
	OrganizationID    string `json:"organizationId,omitempty"`
	Latest            bool   `json:"latest"`
	ProjectionBatchID string `json:"projectionBatchId,omitempty"`
	OrgVersion        int64  `json:"orgVersion,omitempty"`
	SourceVersion     string `json:"sourceVersion,omitempty"`
}

// GatewayProjectionIngestionStatusResult 是 Admin 返回给 operator 的脱敏 Gateway owner 状态 envelope。
// 它只保留稳定状态、聚合计数和 lineage 摘要，不包含 endpoint、token、raw response 或 subject 明细。
type GatewayProjectionIngestionStatusResult struct {
	Success         bool                                    `json:"success"`
	Status          string                                  `json:"status"`
	StatusAlias     string                                  `json:"statusAlias"`
	FailureCategory string                                  `json:"failureCategory,omitempty"`
	ReasonCode      string                                  `json:"reasonCode,omitempty"`
	Freshness       GatewayProjectionIngestionFreshness     `json:"freshness"`
	Lineage         GatewayProjectionIngestionLineage       `json:"lineage"`
	SubjectCounts   GatewayProjectionIngestionSubjectCounts `json:"subjectCounts"`
	ReceivedAt      string                                  `json:"receivedAt,omitempty"`
	AppliedAt       string                                  `json:"appliedAt,omitempty"`
	DurationMs      int64                                   `json:"durationMs,omitempty"`
	Query           GatewayProjectionIngestionStatusQuery   `json:"query"`
}

type GatewayProjectionIngestionFreshness struct {
	Status    string `json:"status,omitempty"`
	ExpiresAt string `json:"expiresAt,omitempty"`
}

type GatewayProjectionIngestionLineage struct {
	SourceVersion     string `json:"sourceVersion,omitempty"`
	OrgVersion        int64  `json:"orgVersion,omitempty"`
	ProjectionBatchID string `json:"projectionBatchId,omitempty"`
}

type GatewayProjectionIngestionSubjectCounts struct {
	Total     int `json:"total"`
	Active    int `json:"active"`
	Tombstone int `json:"tombstone"`
	Unmapped  int `json:"unmapped"`
	Invalid   int `json:"invalid"`
}

// GatewayProjectionIngestionStatusService 封装 Admin 到 Gateway ingestion-status contract 的只读访问。
// 该服务不触发 publish，不写 Gateway facts，也不读取 Gateway/API/Insight 数据库。
type GatewayProjectionIngestionStatusService struct {
	Config GatewayProjectionPublisherConfig
	Client *http.Client
	Now    func() time.Time
}

type gatewayProjectionIngestionStatusEnvelope struct {
	Success bool                                   `json:"success"`
	Data    gatewayProjectionIngestionStatusData   `json:"data,omitempty"`
	Error   *gatewayProjectionIngestionStatusError `json:"error,omitempty"`
}

type gatewayProjectionIngestionStatusData struct {
	Status        string                                  `json:"status"`
	ReasonCode    string                                  `json:"reasonCode,omitempty"`
	Freshness     GatewayProjectionIngestionFreshness     `json:"freshness,omitempty"`
	Lineage       GatewayProjectionIngestionLineage       `json:"lineage,omitempty"`
	SubjectCounts GatewayProjectionIngestionSubjectCounts `json:"subjectCounts,omitempty"`
	ReceivedAt    string                                  `json:"receivedAt,omitempty"`
	AppliedAt     string                                  `json:"appliedAt,omitempty"`
	DurationMs    int64                                   `json:"durationMs,omitempty"`
}

type gatewayProjectionIngestionStatusError struct {
	Code    string `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

func (s GatewayProjectionIngestionStatusService) GetStatus(ctx context.Context, query GatewayProjectionIngestionStatusQuery) (GatewayProjectionIngestionStatusResult, error) {
	startedAt := s.now()
	query = normalizeGatewayProjectionIngestionStatusQuery(query)
	result := GatewayProjectionIngestionStatusResult{
		Status:      GatewayProjectionIngestionStatusProviderUnavailable,
		StatusAlias: GatewayProjectionIngestionStatusProviderUnavailable,
		Query:       query,
	}
	config := s.publisherConfig()
	endpoint := gatewayProjectionIngestionStatusEndpoint(config)
	if strings.TrimSpace(endpoint) == "" || strings.TrimSpace(config.Token) == "" {
		result.FailureCategory = GatewayProjectionPublishErrorInvalidConfig
		result.ReasonCode = GatewayProjectionPublishErrorInvalidConfig
		return result, errors.New("gateway projection ingestion status endpoint or token is missing")
	}

	requestURL, err := buildGatewayProjectionIngestionStatusURL(endpoint, query)
	if err != nil {
		result.FailureCategory = GatewayProjectionPublishErrorInvalidConfig
		result.ReasonCode = GatewayProjectionPublishErrorInvalidConfig
		return result, err
	}
	reqCtx, cancel := gatewayProjectionRequestContext(ctx, config.Timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, requestURL, nil)
	if err != nil {
		result.FailureCategory = GatewayProjectionPublishErrorInvalidConfig
		result.ReasonCode = GatewayProjectionPublishErrorInvalidConfig
		return result, err
	}
	req.Header.Set("Authorization", "Bearer "+config.Token)
	req.Header.Set("Accept", "application/json")
	req.Close = true

	client := s.Client
	if client == nil {
		client = newGatewayProjectionPublisherHTTPClient(config.Timeout)
	}
	resp, err := client.Do(req)
	if err != nil {
		result.FailureCategory = GatewayProjectionIngestionStatusProviderUnavailable
		result.ReasonCode = GatewayProjectionIngestionStatusProviderUnavailable
		return result, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		result.FailureCategory = GatewayProjectionIngestionStatusInvalidResponse
		result.ReasonCode = GatewayProjectionIngestionStatusInvalidResponse
		return result, err
	}
	result.DurationMs = gatewayProjectionIngestionDurationMs(startedAt)
	return decodeGatewayProjectionIngestionStatusResponse(result, resp.StatusCode, body)
}

func (s GatewayProjectionIngestionStatusService) publisherConfig() GatewayProjectionPublisherConfig {
	if s.Config.Endpoint != "" || s.Config.StatusEndpoint != "" || s.Config.Token != "" || s.Config.Caller != "" || s.Config.Timeout > 0 || s.Config.Enabled {
		config := s.Config
		if config.Timeout <= 0 {
			config.Timeout = time.Duration(gatewayProjectionPublisherDefaultTimeoutMs) * time.Millisecond
		}
		return config
	}
	config := GetGatewayProjectionPublisherConfig()
	if config.Timeout <= 0 {
		config.Timeout = time.Duration(gatewayProjectionPublisherDefaultTimeoutMs) * time.Millisecond
	}
	return config
}

func (s GatewayProjectionIngestionStatusService) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func normalizeGatewayProjectionIngestionStatusQuery(query GatewayProjectionIngestionStatusQuery) GatewayProjectionIngestionStatusQuery {
	query.OrganizationID = normalizeGatewayProjectionString(query.OrganizationID)
	query.ProjectionBatchID = normalizeGatewayProjectionString(query.ProjectionBatchID)
	query.SourceVersion = normalizeGatewayProjectionString(query.SourceVersion)
	return query
}

func gatewayProjectionIngestionStatusEndpoint(config GatewayProjectionPublisherConfig) string {
	if strings.TrimSpace(config.StatusEndpoint) != "" {
		return strings.TrimSpace(config.StatusEndpoint)
	}
	endpoint := strings.TrimSpace(config.Endpoint)
	if endpoint == "" {
		return ""
	}
	parsed, err := url.Parse(endpoint)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}
	path := strings.TrimRight(parsed.Path, "/")
	if strings.HasSuffix(path, "/batches") {
		parsed.Path = strings.TrimSuffix(path, "/batches") + "/ingestion-status"
	} else {
		parsed.Path = path + "/ingestion-status"
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return parsed.String()
}

func buildGatewayProjectionIngestionStatusURL(endpoint string, query GatewayProjectionIngestionStatusQuery) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(endpoint))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("invalid gateway projection ingestion status endpoint")
	}
	values := parsed.Query()
	if query.OrganizationID != "" {
		values.Set("organization", query.OrganizationID)
	}
	if query.Latest {
		values.Set("latest", "true")
	}
	if query.ProjectionBatchID != "" {
		values.Set("projectionBatchId", query.ProjectionBatchID)
	}
	if query.OrgVersion > 0 {
		values.Set("orgVersion", strconv.FormatInt(query.OrgVersion, 10))
	}
	if query.SourceVersion != "" {
		values.Set("sourceVersion", query.SourceVersion)
	}
	parsed.RawQuery = values.Encode()
	return parsed.String(), nil
}

func decodeGatewayProjectionIngestionStatusResponse(result GatewayProjectionIngestionStatusResult, statusCode int, body []byte) (GatewayProjectionIngestionStatusResult, error) {
	envelope := gatewayProjectionIngestionStatusEnvelope{}
	if err := json.Unmarshal(body, &envelope); err != nil {
		result.Status = GatewayProjectionIngestionStatusInvalidResponse
		result.StatusAlias = result.Status
		result.FailureCategory = GatewayProjectionIngestionStatusInvalidResponse
		result.ReasonCode = GatewayProjectionIngestionStatusInvalidResponse
		return result, err
	}
	if envelope.Error != nil && strings.TrimSpace(envelope.Error.Code) != "" {
		status := mapGatewayProjectionIngestionStatus(envelope.Error.Code)
		result.Status = status
		result.StatusAlias = status
		result.Success = false
		result.FailureCategory = gatewayProjectionIngestionFailureCategory(status)
		result.ReasonCode = normalizeGatewayProjectionString(envelope.Error.Code)
		return result, nil
	}
	status := mapGatewayProjectionIngestionStatus(envelope.Data.Status)
	if status == GatewayProjectionIngestionStatusUnknown && statusCode == http.StatusNotFound {
		status = GatewayProjectionIngestionStatusNotFound
	}
	if status == GatewayProjectionIngestionStatusUnknown && statusCode >= http.StatusInternalServerError {
		status = GatewayProjectionIngestionStatusProviderUnavailable
	}
	result.Status = status
	result.StatusAlias = status
	result.Success = status == GatewayProjectionIngestionStatusApplied || status == GatewayProjectionIngestionStatusAccepted
	result.FailureCategory = gatewayProjectionIngestionFailureCategory(status)
	result.ReasonCode = normalizeGatewayProjectionString(firstNonEmpty(envelope.Data.ReasonCode, result.FailureCategory))
	result.Freshness = envelope.Data.Freshness
	result.Lineage = envelope.Data.Lineage
	result.SubjectCounts = envelope.Data.SubjectCounts
	result.ReceivedAt = envelope.Data.ReceivedAt
	result.AppliedAt = envelope.Data.AppliedAt
	if envelope.Data.DurationMs > 0 {
		result.DurationMs = envelope.Data.DurationMs
	}
	return result, nil
}

func mapGatewayProjectionIngestionStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case GatewayProjectionIngestionStatusAccepted:
		return GatewayProjectionIngestionStatusAccepted
	case GatewayProjectionIngestionStatusApplied:
		return GatewayProjectionIngestionStatusApplied
	case GatewayProjectionIngestionStatusStale:
		return GatewayProjectionIngestionStatusStale
	case GatewayProjectionIngestionStatusConflict:
		return GatewayProjectionIngestionStatusConflict
	case GatewayProjectionIngestionStatusLineageInvalid:
		return GatewayProjectionIngestionStatusLineageInvalid
	case GatewayProjectionIngestionStatusUnmappedSubjects, "unmapped":
		return GatewayProjectionIngestionStatusUnmappedSubjects
	case GatewayProjectionIngestionStatusNotFound:
		return GatewayProjectionIngestionStatusNotFound
	case GatewayProjectionIngestionStatusProviderUnavailable:
		return GatewayProjectionIngestionStatusProviderUnavailable
	case GatewayProjectionPublishErrorInvalidConfig:
		return GatewayProjectionPublishErrorInvalidConfig
	case GatewayProjectionIngestionStatusInvalidResponse:
		return GatewayProjectionIngestionStatusInvalidResponse
	default:
		return GatewayProjectionIngestionStatusUnknown
	}
}

func gatewayProjectionIngestionFailureCategory(status string) string {
	switch status {
	case GatewayProjectionIngestionStatusApplied, GatewayProjectionIngestionStatusAccepted:
		return ""
	case GatewayProjectionIngestionStatusUnknown:
		return GatewayProjectionIngestionStatusInvalidResponse
	default:
		return status
	}
}

func gatewayProjectionIngestionDurationMs(startedAt time.Time) int64 {
	duration := time.Since(startedAt).Milliseconds()
	if duration < 0 {
		return 0
	}
	return duration
}
