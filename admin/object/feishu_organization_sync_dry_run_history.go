// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/xorm-io/xorm"
)

const (
	FeishuOrganizationSyncDryRunHistoryRetentionDays = 90
	FeishuOrganizationSyncDryRunHistoryRedactionV1   = "feishu-dry-run-history-redaction-v1"
	FeishuOrganizationSyncDryRunHistoryWarning       = "dry-run history could not be recorded"
)

// FeishuOrganizationSyncDryRunHistory 记录一次飞书/Lark dry-run preview 的脱敏审计摘要。
// 该表只保存聚合计数和 alias，不保存 raw Contact payload 或外部用户标识明细。
type FeishuOrganizationSyncDryRunHistory struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created index" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	// 来源和执行者字段只保存 alias/hash，用于跨请求审计关联，避免落库真实租户、应用或人员标识。
	Organization           string `xorm:"varchar(100) index" json:"organization"`
	Status                 string `xorm:"varchar(50) index" json:"status"`
	EndpointMode           string `xorm:"varchar(50) index" json:"endpointMode"`
	AppAlias               string `xorm:"varchar(100)" json:"appAlias"`
	TenantAlias            string `xorm:"varchar(100)" json:"tenantAlias"`
	SourceConnectionIdHash string `xorm:"varchar(100) index" json:"sourceConnectionIdHash"`
	DiagnosticAlias        string `xorm:"varchar(100) index" json:"diagnosticAlias"`
	OperatorHash           string `xorm:"varchar(100) index" json:"operatorHash"`
	RequestMarker          string `xorm:"varchar(100) index" json:"requestMarker"`

	// Snapshot* 只记录本次 dry-run 输入规模，不能扩展为完整部门树或用户列表。
	SnapshotDepartmentCount int `xorm:"int" json:"snapshotDepartmentCount"`
	SnapshotUserCount       int `xorm:"int" json:"snapshotUserCount"`
	SnapshotMembershipCount int `xorm:"int" json:"snapshotMembershipCount"`

	// Diff 计数用于回看正式写入前的影响面，不携带外部 open_id/user_id/手机号/邮箱等明细。
	DepartmentToCreate      int `xorm:"int" json:"departmentToCreate"`
	DepartmentToUpdate      int `xorm:"int" json:"departmentToUpdate"`
	DepartmentToSoftDisable int `xorm:"int" json:"departmentToSoftDisable"`
	DepartmentUnchanged     int `xorm:"int" json:"departmentUnchanged"`
	DepartmentConflict      int `xorm:"int" json:"departmentConflict"`
	DepartmentInvalid       int `xorm:"int" json:"departmentInvalid"`
	UserToCreate            int `xorm:"int" json:"userToCreate"`
	UserToUpdate            int `xorm:"int" json:"userToUpdate"`
	UserToSoftDisable       int `xorm:"int" json:"userToSoftDisable"`
	UserUnchanged           int `xorm:"int" json:"userUnchanged"`
	UserConflict            int `xorm:"int" json:"userConflict"`
	UserInvalid             int `xorm:"int" json:"userInvalid"`
	MembershipToCreate      int `xorm:"int" json:"membershipToCreate"`
	MembershipToUpdate      int `xorm:"int" json:"membershipToUpdate"`
	MembershipToSoftDisable int `xorm:"int" json:"membershipToSoftDisable"`
	MembershipUnchanged     int `xorm:"int" json:"membershipUnchanged"`
	MembershipConflict      int `xorm:"int" json:"membershipConflict"`
	MembershipInvalid       int `xorm:"int" json:"membershipInvalid"`

	ReasonCountsJson string `xorm:"text" json:"-"`
	DiagnosticsJson  string `xorm:"text" json:"-"`
	SafeSummary      string `xorm:"text" json:"safeSummary"`

	// Retention/Redaction 元数据让 operator 能确认记录生命周期和脱敏版本，归档时不暴露原始 payload。
	RetentionDays      int       `xorm:"int" json:"retentionDays"`
	RetentionExpiresAt time.Time `xorm:"timestampz index" json:"retentionExpiresAt"`
	RedactionApplied   bool      `xorm:"bool" json:"redactionApplied"`
	RedactionVersion   string    `xorm:"varchar(100)" json:"redactionVersion"`

	ReasonCounts map[string]int                        `xorm:"-" json:"reasonCounts"`
	Diagnostics  *FeishuOrganizationSyncRunDiagnostics `xorm:"-" json:"diagnostics,omitempty"`
}

// FeishuOrganizationSyncDryRunHistoryFilter 限定 Admin 只读历史查询范围。
// Organization 是强制边界，其余筛选项只能命中脱敏 alias、状态和时间窗口。
type FeishuOrganizationSyncDryRunHistoryFilter struct {
	Organization           string
	SourceConnectionIdHash string
	Status                 string
	DiagnosticAlias        string
	CreatedFrom            time.Time
	CreatedTo              time.Time
	Offset                 int
	Limit                  int
	TopN                   int
	SortField              string
	SortOrder              string
}

// FeishuOrganizationSyncDryRunHistoryStore 抽象 dry-run history 持久化，便于 preview 服务在测试中验证
// “记录失败不影响 fail-closed preview 语义”的行为。
type FeishuOrganizationSyncDryRunHistoryStore interface {
	CreateFeishuOrganizationSyncDryRunHistory(history *FeishuOrganizationSyncDryRunHistory) error
	GetFeishuOrganizationSyncDryRunHistory(organization string, historyId string) (*FeishuOrganizationSyncDryRunHistory, error)
	GetFeishuOrganizationSyncDryRunHistories(filter FeishuOrganizationSyncDryRunHistoryFilter) ([]*FeishuOrganizationSyncDryRunHistory, error)
	GetFeishuOrganizationSyncDryRunHistoryCount(filter FeishuOrganizationSyncDryRunHistoryFilter) (int64, error)
}

// FeishuOrganizationSyncDryRunHistoryService 提供 dry-run history 的只读查询入口。
// 返回值会统一经过 mask，避免后续 store 实现误把 raw diagnostics 或敏感摘要透出到 Admin API。
type FeishuOrganizationSyncDryRunHistoryService struct {
	Store FeishuOrganizationSyncDryRunHistoryStore
}

type defaultFeishuOrganizationSyncDryRunHistoryStore struct{}

// GetHistories 返回指定组织下的 dry-run history 摘要列表，并在服务层强制组织边界和脱敏。
func (s *FeishuOrganizationSyncDryRunHistoryService) GetHistories(filter FeishuOrganizationSyncDryRunHistoryFilter) ([]*FeishuOrganizationSyncDryRunHistory, int64, error) {
	filter.Organization = strings.TrimSpace(filter.Organization)
	if filter.Organization == "" {
		return nil, 0, fmt.Errorf("feishu dry-run history organization is required")
	}
	store := s.historyStore()
	count, err := store.GetFeishuOrganizationSyncDryRunHistoryCount(filter)
	if err != nil {
		return nil, 0, err
	}
	histories, err := store.GetFeishuOrganizationSyncDryRunHistories(filter)
	if err != nil {
		return nil, 0, err
	}
	return maskFeishuDryRunHistories(histories), count, nil
}

// GetHistory 返回单条 dry-run history 详情，只包含聚合影响、诊断 alias 和 safe summary。
func (s *FeishuOrganizationSyncDryRunHistoryService) GetHistory(organization string, historyId string) (*FeishuOrganizationSyncDryRunHistory, error) {
	organization = strings.TrimSpace(organization)
	historyId = strings.TrimSpace(historyId)
	if organization == "" {
		return nil, fmt.Errorf("feishu dry-run history organization is required")
	}
	if historyId == "" {
		return nil, fmt.Errorf("feishu dry-run history id is required")
	}
	history, err := s.historyStore().GetFeishuOrganizationSyncDryRunHistory(organization, historyId)
	if err != nil {
		return nil, err
	}
	return maskFeishuDryRunHistory(history), nil
}

func (s *FeishuOrganizationSyncDryRunHistoryService) historyStore() FeishuOrganizationSyncDryRunHistoryStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultFeishuOrganizationSyncDryRunHistoryStore{}
}

func newFeishuDryRunHistoryFromPreview(preview *FeishuOrganizationSyncDryRunPreview, operator string, requestMarker string, now time.Time) *FeishuOrganizationSyncDryRunHistory {
	if preview == nil {
		return nil
	}
	source := preview.Source
	diagnosticAlias := "none"
	safeSummary := ""
	if preview.Diagnostics != nil {
		diagnosticAlias = firstNonEmpty(preview.Diagnostics.ReasonCode, preview.Diagnostics.FailureCategory, preview.Diagnostics.FailedStage, "unknown")
		safeSummary = preview.Diagnostics.SafeSummary
	}
	if diagnosticAlias == "none" && preview.Status == FeishuOrganizationSyncDryRunPreviewStatusFailed {
		diagnosticAlias = "unknown"
	}
	history := &FeishuOrganizationSyncDryRunHistory{
		Owner:                   source.Organization,
		Name:                    fmt.Sprintf("feishu-dry-run-history-%d", now.UnixNano()),
		Organization:            source.Organization,
		Status:                  preview.Status,
		EndpointMode:            source.EndpointMode,
		AppAlias:                source.AppAlias,
		TenantAlias:             source.TenantAlias,
		SourceConnectionIdHash:  buildFeishuDryRunSourceConnectionHash(source.Organization, source.TenantAlias, source.AppAlias),
		DiagnosticAlias:         diagnosticAlias,
		OperatorHash:            buildFeishuDryRunOperatorHash(source.Organization, operator),
		RequestMarker:           safeFeishuDryRunRequestMarker(requestMarker, source.Organization, now),
		SnapshotDepartmentCount: preview.SnapshotStats.DepartmentCount,
		SnapshotUserCount:       preview.SnapshotStats.UserCount,
		SnapshotMembershipCount: preview.SnapshotStats.MembershipCount,
		DepartmentToCreate:      preview.Diff.Departments.ToCreate,
		DepartmentToUpdate:      preview.Diff.Departments.ToUpdate,
		DepartmentToSoftDisable: preview.Diff.Departments.ToSoftDisable,
		DepartmentUnchanged:     preview.Diff.Departments.Unchanged,
		DepartmentConflict:      preview.Diff.Departments.Conflict,
		DepartmentInvalid:       preview.Diff.Departments.Invalid,
		UserToCreate:            preview.Diff.Users.ToCreate,
		UserToUpdate:            preview.Diff.Users.ToUpdate,
		UserToSoftDisable:       preview.Diff.Users.ToSoftDisable,
		UserUnchanged:           preview.Diff.Users.Unchanged,
		UserConflict:            preview.Diff.Users.Conflict,
		UserInvalid:             preview.Diff.Users.Invalid,
		MembershipToCreate:      preview.Diff.Memberships.ToCreate,
		MembershipToUpdate:      preview.Diff.Memberships.ToUpdate,
		MembershipToSoftDisable: preview.Diff.Memberships.ToSoftDisable,
		MembershipUnchanged:     preview.Diff.Memberships.Unchanged,
		MembershipConflict:      preview.Diff.Memberships.Conflict,
		MembershipInvalid:       preview.Diff.Memberships.Invalid,
		ReasonCounts:            copyReasonCounts(preview.ReasonCounts),
		Diagnostics:             preview.Diagnostics,
		SafeSummary:             safeFeishuDryRunSummary(safeSummary),
		RetentionDays:           FeishuOrganizationSyncDryRunHistoryRetentionDays,
		RetentionExpiresAt:      now.AddDate(0, 0, FeishuOrganizationSyncDryRunHistoryRetentionDays),
		RedactionApplied:        true,
		RedactionVersion:        FeishuOrganizationSyncDryRunHistoryRedactionV1,
	}
	history.syncFeishuDryRunHistoryJson()
	return history
}

func (h *FeishuOrganizationSyncDryRunHistory) syncFeishuDryRunHistoryJson() {
	if h == nil {
		return
	}
	if h.ReasonCounts == nil {
		h.ReasonCounts = map[string]int{}
	}
	reasonCounts, _ := json.Marshal(h.ReasonCounts)
	diagnostics, _ := json.Marshal(h.Diagnostics)
	h.ReasonCountsJson = string(reasonCounts)
	h.DiagnosticsJson = string(diagnostics)
}

func hydrateFeishuDryRunHistory(history *FeishuOrganizationSyncDryRunHistory) *FeishuOrganizationSyncDryRunHistory {
	if history == nil {
		return nil
	}
	if strings.TrimSpace(history.ReasonCountsJson) != "" {
		_ = json.Unmarshal([]byte(history.ReasonCountsJson), &history.ReasonCounts)
	}
	if strings.TrimSpace(history.DiagnosticsJson) != "" && history.DiagnosticsJson != "null" {
		_ = json.Unmarshal([]byte(history.DiagnosticsJson), &history.Diagnostics)
	}
	if history.ReasonCounts == nil {
		history.ReasonCounts = map[string]int{}
	}
	return history
}

func maskFeishuDryRunHistories(histories []*FeishuOrganizationSyncDryRunHistory) []*FeishuOrganizationSyncDryRunHistory {
	masked := make([]*FeishuOrganizationSyncDryRunHistory, 0, len(histories))
	for _, history := range histories {
		masked = append(masked, maskFeishuDryRunHistory(history))
	}
	return masked
}

func maskFeishuDryRunHistory(history *FeishuOrganizationSyncDryRunHistory) *FeishuOrganizationSyncDryRunHistory {
	if history == nil {
		return nil
	}
	hydrateFeishuDryRunHistory(history)
	masked := *history
	masked.ReasonCounts = copyReasonCounts(history.ReasonCounts)
	if history.Diagnostics != nil {
		diagnostics := *history.Diagnostics
		diagnostics.SafeSummary = safeFeishuDryRunSummary(diagnostics.SafeSummary)
		masked.Diagnostics = &diagnostics
	}
	masked.SafeSummary = safeFeishuDryRunSummary(masked.SafeSummary)
	return &masked
}

func (s defaultFeishuOrganizationSyncDryRunHistoryStore) CreateFeishuOrganizationSyncDryRunHistory(history *FeishuOrganizationSyncDryRunHistory) error {
	if history == nil {
		return nil
	}
	history.syncFeishuDryRunHistoryJson()
	_, err := ormer.Engine.Insert(history)
	return err
}

func (s defaultFeishuOrganizationSyncDryRunHistoryStore) GetFeishuOrganizationSyncDryRunHistory(organization string, historyId string) (*FeishuOrganizationSyncDryRunHistory, error) {
	history := &FeishuOrganizationSyncDryRunHistory{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("name = ?", historyId).Get(history)
	if err != nil || !existed {
		return nil, err
	}
	return hydrateFeishuDryRunHistory(history), nil
}

func (s defaultFeishuOrganizationSyncDryRunHistoryStore) GetFeishuOrganizationSyncDryRunHistories(filter FeishuOrganizationSyncDryRunHistoryFilter) ([]*FeishuOrganizationSyncDryRunHistory, error) {
	histories := []*FeishuOrganizationSyncDryRunHistory{}
	session := getFeishuDryRunHistorySession(filter)
	err := session.Where("organization = ?", filter.Organization).Find(&histories)
	if err != nil {
		return nil, err
	}
	for _, history := range histories {
		hydrateFeishuDryRunHistory(history)
	}
	return histories, nil
}

func (s defaultFeishuOrganizationSyncDryRunHistoryStore) GetFeishuOrganizationSyncDryRunHistoryCount(filter FeishuOrganizationSyncDryRunHistoryFilter) (int64, error) {
	session := getFeishuDryRunHistoryFilterSession(filter)
	return session.Where("organization = ?", filter.Organization).Count(&FeishuOrganizationSyncDryRunHistory{})
}

func getFeishuDryRunHistorySession(filter FeishuOrganizationSyncDryRunHistoryFilter) *xorm.Session {
	session := getFeishuDryRunHistoryFilterSession(filter)
	limit := normalizeFeishuDryRunHistoryLimit(filter.Limit, filter.TopN)
	if filter.Offset >= 0 && limit > 0 {
		session.Limit(limit, filter.Offset)
	}
	sortField := filter.SortField
	if sortField == "" {
		sortField = "createdAt"
	}
	if filter.SortOrder == "ascend" {
		return session.Asc(util.SnakeString(sortField))
	}
	return session.Desc(util.SnakeString(sortField))
}

func getFeishuDryRunHistoryFilterSession(filter FeishuOrganizationSyncDryRunHistoryFilter) *xorm.Session {
	session := ormer.Engine.Prepare()
	if filter.SourceConnectionIdHash != "" {
		session = session.And("source_connection_id_hash = ?", filter.SourceConnectionIdHash)
	}
	if filter.Status != "" {
		session = session.And("status = ?", filter.Status)
	}
	if filter.DiagnosticAlias != "" {
		session = session.And("diagnostic_alias = ?", filter.DiagnosticAlias)
	}
	if !filter.CreatedFrom.IsZero() {
		session = session.And("created_at >= ?", filter.CreatedFrom)
	}
	if !filter.CreatedTo.IsZero() {
		session = session.And("created_at <= ?", filter.CreatedTo)
	}
	return session
}

func normalizeFeishuDryRunHistoryLimit(limit int, topN int) int {
	if topN > 0 && (limit <= 0 || topN < limit) {
		limit = topN
	}
	if limit == 0 {
		limit = 20
	}
	if limit < 0 {
		return -1
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func buildFeishuDryRunSourceConnectionHash(organization string, tenantAlias string, appAlias string) string {
	return "source-" + shortFeishuOrganizationSyncHash(organization, tenantAlias, appAlias)
}

func buildFeishuDryRunOperatorHash(organization string, operator string) string {
	operator = strings.TrimSpace(operator)
	if operator == "" {
		operator = "unknown"
	}
	return "operator-" + shortFeishuOrganizationSyncHash(organization, operator)
}

func safeFeishuDryRunRequestMarker(requestMarker string, organization string, now time.Time) string {
	requestMarker = strings.TrimSpace(requestMarker)
	if requestMarker == "" {
		requestMarker = fmt.Sprintf("dry-run-%d", now.UnixNano())
	}
	return "request-" + shortFeishuOrganizationSyncHash(organization, requestMarker)
}

func copyReasonCounts(reasonCounts map[string]int) map[string]int {
	copied := map[string]int{}
	for key, value := range reasonCounts {
		copied[key] = value
	}
	return copied
}
