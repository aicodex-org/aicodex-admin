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
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/beego/beego/v2/core/logs"
)

const (
	GatewayProjectionPublishAttemptSourceManual    = "manual"
	GatewayProjectionPublishAttemptSourceScheduled = "scheduled"

	defaultGatewayProjectionPublishAttemptLimit = 20
	maxGatewayProjectionPublishAttemptLimit     = 100
)

// GatewayProjectionPublishAttempt 是 Admin producer 的脱敏发布尝试台账。
// 它只记录 producer 诊断字段，不保存 projection payload、token、私有 URL 或真实用户明细。
type GatewayProjectionPublishAttempt struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created index" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	AttemptId             string            `xorm:"varchar(100) notnull index unique" json:"attemptId"`
	OrganizationId        string            `xorm:"varchar(100) notnull index" json:"organizationId"`
	Source                string            `xorm:"varchar(50) index" json:"source"`
	Status                string            `xorm:"varchar(50) index" json:"status"`
	TraceId               string            `xorm:"varchar(255) index" json:"traceId,omitempty"`
	Caller                string            `xorm:"varchar(100)" json:"caller,omitempty"`
	ProjectionBatchId     string            `xorm:"varchar(255) index" json:"projectionBatchId,omitempty"`
	OrgVersion            int64             `json:"orgVersion,omitempty"`
	SourceVersion         string            `xorm:"varchar(255) index" json:"sourceVersion,omitempty"`
	GeneratedAt           time.Time         `xorm:"timestampz" json:"generatedAt,omitempty"`
	FreshnessExpiresAt    time.Time         `xorm:"timestampz" json:"freshnessExpiresAt,omitempty"`
	SubjectCount          int               `json:"subjectCount"`
	ActiveSubjectCount    int               `json:"activeSubjectCount"`
	TombstoneSubjectCount int               `json:"tombstoneSubjectCount"`
	SkippedSubjectCount   int               `json:"skippedSubjectCount"`
	SkippedByReasonJSON   string            `xorm:"text 'skipped_by_reason'" json:"-"`
	SkippedByReason       map[string]int    `xorm:"-" json:"skippedByReason,omitempty"`
	ErrorCode             string            `xorm:"varchar(100) index" json:"errorCode,omitempty"`
	FailureCategory       string            `xorm:"varchar(100) index" json:"failureCategory,omitempty"`
	Attempts              int               `json:"attempts"`
	StatusCode            int               `json:"statusCode,omitempty"`
	Accepted              bool              `json:"accepted"`
	Idempotent            bool              `json:"idempotent"`
	Retryable             bool              `json:"retryable"`
	DurationMs            int64             `json:"durationMs"`
	AuditHash             string            `xorm:"varchar(100)" json:"auditHash,omitempty"`
	Metadata              map[string]string `xorm:"-" json:"metadata,omitempty"`
	MetadataJSON          string            `xorm:"text 'metadata'" json:"-"`
}

// GatewayProjectionPublishAttemptQuery 限定 history 查询范围和筛选条件。
type GatewayProjectionPublishAttemptQuery struct {
	OrganizationId string
	AttemptId      string
	Source         string
	Status         string
	From           time.Time
	To             time.Time
	Limit          int
}

type GatewayProjectionPublishAttemptList struct {
	GeneratedAt string                                 `json:"generatedAt"`
	Filters     GatewayProjectionPublishAttemptFilters `json:"filters"`
	Total       int                                    `json:"total"`
	Attempts    []*GatewayProjectionPublishAttempt     `json:"attempts"`
}

type GatewayProjectionPublishAttemptFilters struct {
	OrganizationId string `json:"organizationId,omitempty"`
	Source         string `json:"source,omitempty"`
	Status         string `json:"status,omitempty"`
	From           string `json:"from,omitempty"`
	To             string `json:"to,omitempty"`
	Limit          int    `json:"limit"`
}

type GatewayProjectionPublishAttemptStore interface {
	RecordGatewayProjectionPublishAttempt(attempt *GatewayProjectionPublishAttempt) error
	ListGatewayProjectionPublishAttempts(query GatewayProjectionPublishAttemptQuery) ([]*GatewayProjectionPublishAttempt, error)
	GetGatewayProjectionPublishAttempt(query GatewayProjectionPublishAttemptQuery) (*GatewayProjectionPublishAttempt, error)
}

type GatewayProjectionPublishAttemptHistoryService struct {
	Store GatewayProjectionPublishAttemptStore
	Now   func() time.Time
}

type defaultGatewayProjectionPublishAttemptStore struct{}

// Record 保存一次脱敏 publish attempt；写入失败只影响 Admin 诊断，不改变 projection 发布结果。
func (s GatewayProjectionPublishAttemptHistoryService) Record(attempt *GatewayProjectionPublishAttempt) error {
	if attempt == nil {
		return nil
	}
	normalized := normalizeGatewayProjectionPublishAttempt(attempt, s.now())
	if normalized.OrganizationId == "" {
		return nil
	}
	return s.store().RecordGatewayProjectionPublishAttempt(normalized)
}

func (s GatewayProjectionPublishAttemptHistoryService) List(query GatewayProjectionPublishAttemptQuery) (*GatewayProjectionPublishAttemptList, error) {
	query = normalizeGatewayProjectionPublishAttemptQuery(query)
	attempts, err := s.store().ListGatewayProjectionPublishAttempts(query)
	if err != nil {
		return nil, err
	}
	for i := range attempts {
		attempts[i] = cloneGatewayProjectionPublishAttempt(attempts[i])
	}
	return &GatewayProjectionPublishAttemptList{
		GeneratedAt: formatGatewayProjectionObservabilityTime(s.now()),
		Filters: GatewayProjectionPublishAttemptFilters{
			OrganizationId: query.OrganizationId,
			Source:         query.Source,
			Status:         query.Status,
			From:           formatGatewayProjectionObservabilityTime(query.From),
			To:             formatGatewayProjectionObservabilityTime(query.To),
			Limit:          query.Limit,
		},
		Total:    len(attempts),
		Attempts: attempts,
	}, nil
}

func (s GatewayProjectionPublishAttemptHistoryService) Detail(query GatewayProjectionPublishAttemptQuery) (*GatewayProjectionPublishAttempt, error) {
	query = normalizeGatewayProjectionPublishAttemptQuery(query)
	attempt, err := s.store().GetGatewayProjectionPublishAttempt(query)
	if err != nil || attempt == nil {
		return attempt, err
	}
	return cloneGatewayProjectionPublishAttempt(attempt), nil
}

func (s GatewayProjectionPublishAttemptHistoryService) store() GatewayProjectionPublishAttemptStore {
	if s.Store != nil {
		return s.Store
	}
	return defaultGatewayProjectionPublishAttemptStore{}
}

func (s GatewayProjectionPublishAttemptHistoryService) now() time.Time {
	if s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s defaultGatewayProjectionPublishAttemptStore) RecordGatewayProjectionPublishAttempt(attempt *GatewayProjectionPublishAttempt) error {
	if attempt == nil || ormer == nil || ormer.Engine == nil {
		return nil
	}
	_, err := ormer.Engine.Insert(attempt)
	return err
}

func (s defaultGatewayProjectionPublishAttemptStore) ListGatewayProjectionPublishAttempts(query GatewayProjectionPublishAttemptQuery) ([]*GatewayProjectionPublishAttempt, error) {
	attempts := []*GatewayProjectionPublishAttempt{}
	if ormer == nil || ormer.Engine == nil {
		return attempts, nil
	}
	session := ormer.Engine.Desc("created_at")
	if query.OrganizationId != "" {
		session = session.Where("organization_id = ?", query.OrganizationId)
	}
	if query.Source != "" {
		session = session.And("source = ?", query.Source)
	}
	if query.Status != "" {
		session = session.And("status = ?", query.Status)
	}
	if !query.From.IsZero() {
		session = session.And("created_at >= ?", query.From)
	}
	if !query.To.IsZero() {
		session = session.And("created_at <= ?", query.To)
	}
	if query.Limit > 0 {
		session = session.Limit(query.Limit)
	}
	err := session.Find(&attempts)
	return attempts, err
}

func (s defaultGatewayProjectionPublishAttemptStore) GetGatewayProjectionPublishAttempt(query GatewayProjectionPublishAttemptQuery) (*GatewayProjectionPublishAttempt, error) {
	if ormer == nil || ormer.Engine == nil || strings.TrimSpace(query.AttemptId) == "" {
		return nil, nil
	}
	attempt := &GatewayProjectionPublishAttempt{}
	session := ormer.Engine.Where("attempt_id = ?", strings.TrimSpace(query.AttemptId))
	if query.OrganizationId != "" {
		session = session.And("organization_id = ?", query.OrganizationId)
	}
	existed, err := session.Get(attempt)
	if err != nil || !existed {
		return nil, err
	}
	return attempt, nil
}

func normalizeGatewayProjectionPublishAttempt(attempt *GatewayProjectionPublishAttempt, now time.Time) *GatewayProjectionPublishAttempt {
	copied := *attempt
	copied.OrganizationId = normalizeGatewayProjectionString(copied.OrganizationId)
	copied.Source = normalizeGatewayProjectionAttemptSource(copied.Source)
	copied.Status = normalizeGatewayProjectionAttemptStatus(copied.Status, copied.Accepted || copied.Idempotent)
	if copied.FailureCategory == "" {
		copied.FailureCategory = GatewayProjectionFailureCategory(copied.ErrorCode)
	}
	if copied.CreatedAt.IsZero() {
		copied.CreatedAt = now
	}
	if copied.AttemptId == "" {
		copied.AttemptId = buildGatewayProjectionPublishAttemptID(copied)
	}
	copied.Owner = firstNonEmpty(copied.Owner, copied.OrganizationId)
	copied.Name = firstNonEmpty(copied.Name, copied.AttemptId)
	copied.SkippedByReason = cloneGatewayProjectionSkipSummary(copied.SkippedByReason)
	copied.SkippedByReasonJSON = gatewayProjectionAttemptMapJSON(copied.SkippedByReason)
	copied.Metadata = cloneGatewayProjectionAttemptMetadata(copied.Metadata)
	copied.MetadataJSON = gatewayProjectionAttemptMetadataJSON(copied.Metadata)
	return &copied
}

func normalizeGatewayProjectionPublishAttemptQuery(query GatewayProjectionPublishAttemptQuery) GatewayProjectionPublishAttemptQuery {
	query.OrganizationId = normalizeGatewayProjectionString(query.OrganizationId)
	query.AttemptId = normalizeGatewayProjectionString(query.AttemptId)
	query.Source = normalizeGatewayProjectionString(query.Source)
	query.Status = normalizeGatewayProjectionString(query.Status)
	if query.Limit <= 0 {
		query.Limit = defaultGatewayProjectionPublishAttemptLimit
	}
	if query.Limit > maxGatewayProjectionPublishAttemptLimit {
		query.Limit = maxGatewayProjectionPublishAttemptLimit
	}
	return query
}

func normalizeGatewayProjectionAttemptSource(source string) string {
	source = strings.ToLower(strings.TrimSpace(source))
	if source == GatewayProjectionPublishAttemptSourceManual {
		return source
	}
	return GatewayProjectionPublishAttemptSourceScheduled
}

func normalizeGatewayProjectionAttemptStatus(status string, success bool) string {
	status = strings.ToLower(strings.TrimSpace(status))
	if status == "ok" || status == "error" {
		return status
	}
	if success {
		return "ok"
	}
	return "error"
}

func buildGatewayProjectionPublishAttemptID(attempt GatewayProjectionPublishAttempt) string {
	createdAt := attempt.CreatedAt.UTC().Format(time.RFC3339Nano)
	return prefixedStableHash("gpa-", attempt.OrganizationId, attempt.Source, attempt.TraceId, attempt.ProjectionBatchId, attempt.SourceVersion, createdAt)
}

func gatewayProjectionAttemptMapJSON(values map[string]int) string {
	if len(values) == 0 {
		return ""
	}
	raw, _ := json.Marshal(values)
	return string(raw)
}

func gatewayProjectionAttemptMetadataJSON(values map[string]string) string {
	if len(values) == 0 {
		return ""
	}
	raw, _ := json.Marshal(values)
	return string(raw)
}

func cloneGatewayProjectionPublishAttempt(attempt *GatewayProjectionPublishAttempt) *GatewayProjectionPublishAttempt {
	if attempt == nil {
		return nil
	}
	cloned := *attempt
	cloned.SkippedByReason = cloneGatewayProjectionSkipSummary(attempt.SkippedByReason)
	if len(cloned.SkippedByReason) == 0 && strings.TrimSpace(attempt.SkippedByReasonJSON) != "" {
		_ = json.Unmarshal([]byte(attempt.SkippedByReasonJSON), &cloned.SkippedByReason)
	}
	cloned.Metadata = cloneGatewayProjectionAttemptMetadata(attempt.Metadata)
	if len(cloned.Metadata) == 0 && strings.TrimSpace(attempt.MetadataJSON) != "" {
		_ = json.Unmarshal([]byte(attempt.MetadataJSON), &cloned.Metadata)
	}
	return &cloned
}

func cloneGatewayProjectionAttemptMetadata(values map[string]string) map[string]string {
	if len(values) == 0 {
		return nil
	}
	cloned := make(map[string]string, len(values))
	for key, value := range values {
		cloned[key] = value
	}
	return cloned
}

func buildGatewayProjectionPublishAttemptFromResult(source string, organizationID string, result GatewayProjectionServiceResult, sourceConnections []SourceConnection, startedAt time.Time, durationMs int64, auditHash string) *GatewayProjectionPublishAttempt {
	request := result.Build.Request
	publish := result.Publish
	active, tombstone := countGatewayProjectionSubjectLifecycle(request.Subjects)
	status := "error"
	if publish.Success {
		status = "ok"
	}
	failureCategory := GatewayProjectionFailureCategory(publish.ErrorCode)
	sourceSummary := buildGatewayProjectionSourceConnectionSummary(sourceConnections)
	if failureCategory == "" {
		failureCategory = gatewayProjectionBuildFailureCategory(result.Build)
	}
	if failureCategory == "" {
		failureCategory = gatewayProjectionSourceConnectionFailureCategory(sourceSummary)
	}
	return &GatewayProjectionPublishAttempt{
		OrganizationId:        organizationID,
		Source:                source,
		Status:                status,
		TraceId:               request.TraceID,
		Caller:                request.Caller,
		ProjectionBatchId:     request.ProjectionBatchID,
		OrgVersion:            request.OrgVersion,
		SourceVersion:         request.Lineage.SourceVersion,
		GeneratedAt:           request.GeneratedAt,
		FreshnessExpiresAt:    request.Freshness.ExpiresAt,
		SubjectCount:          len(request.Subjects),
		ActiveSubjectCount:    active,
		TombstoneSubjectCount: tombstone,
		SkippedSubjectCount:   result.Build.Summary.SkippedSubjectCount,
		SkippedByReason:       cloneGatewayProjectionSkipSummary(result.Build.Summary.SkippedByReason),
		ErrorCode:             publish.ErrorCode,
		FailureCategory:       failureCategory,
		Attempts:              publish.Attempts,
		StatusCode:            publish.StatusCode,
		Accepted:              publish.Accepted,
		Idempotent:            publish.Idempotent,
		Retryable:             publish.Retryable,
		DurationMs:            durationMs,
		AuditHash:             auditHash,
		CreatedAt:             startedAt.UTC(),
	}
}

func buildGatewayProjectionPublishAttemptFromManualResult(organizationID string, result GatewayProjectionManualPublishResult, startedAt time.Time, auditHash string) *GatewayProjectionPublishAttempt {
	return &GatewayProjectionPublishAttempt{
		OrganizationId:        organizationID,
		Source:                GatewayProjectionPublishAttemptSourceManual,
		Status:                result.Status,
		TraceId:               result.TraceID,
		ProjectionBatchId:     result.ProjectionBatchID,
		OrgVersion:            result.OrgVersion,
		SourceVersion:         result.SourceVersion,
		GeneratedAt:           parseGatewayProjectionAttemptTime(result.GeneratedAt),
		FreshnessExpiresAt:    parseGatewayProjectionAttemptTime(result.FreshnessExpiresAt),
		SubjectCount:          result.SubjectCount,
		ActiveSubjectCount:    result.ActiveSubjectCount,
		TombstoneSubjectCount: result.TombstoneSubjectCount,
		SkippedSubjectCount:   result.SkippedSubjectCount,
		SkippedByReason:       cloneGatewayProjectionSkipSummary(result.SkippedByReason),
		ErrorCode:             result.ErrorCode,
		FailureCategory:       result.FailureCategory,
		Accepted:              result.Accepted,
		Idempotent:            result.Idempotent,
		Retryable:             result.Retryable,
		DurationMs:            result.DurationMs,
		AuditHash:             auditHash,
		CreatedAt:             startedAt.UTC(),
		Metadata: map[string]string{
			"publisherConfigured":  strings.ToLower(strings.TrimSpace(boolString(result.Publisher.Configured))),
			"readinessTotal":       strings.TrimSpace(intString(result.Readiness.TotalSubjectCount)),
			"readinessPublishable": strings.TrimSpace(intString(result.Readiness.PublishableSubjectCount)),
		},
	}
}

func recordGatewayProjectionPublishAttemptSafely(service GatewayProjectionPublishAttemptHistoryService, attempt *GatewayProjectionPublishAttempt) string {
	if attempt == nil {
		return ""
	}
	if err := service.Record(attempt); err != nil {
		logs.Warning("gateway_projection_publish_attempt_record_failed source=%s status=%s failureCategory=%s error=%s",
			attempt.Source, attempt.Status, attempt.FailureCategory, err.Error())
		return ""
	}
	normalized := normalizeGatewayProjectionPublishAttempt(attempt, service.now())
	return normalized.AttemptId
}

func parseGatewayProjectionAttemptTime(value string) time.Time {
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(value))
	if err != nil {
		return time.Time{}
	}
	return parsed
}

func boolString(value bool) string {
	if value {
		return "true"
	}
	return "false"
}

func intString(value int) string {
	return strconv.Itoa(value)
}
