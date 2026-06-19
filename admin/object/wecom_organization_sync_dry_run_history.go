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
	WecomOrganizationSyncDryRunHistoryRetentionDays = 90
	WecomOrganizationSyncDryRunHistoryRedactionV1   = "wecom-dry-run-history-redaction-v1"
	WecomOrganizationSyncDryRunHistoryWarning       = "dry-run history could not be recorded"
)

// WecomOrganizationSyncDryRunHistory 记录一次企业微信 dry-run preview 的脱敏摘要。
// 该表不保存 raw WeCom payload、用户明细、手机号、邮箱、token 或 secret。
type WecomOrganizationSyncDryRunHistory struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created index" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	Organization           string `xorm:"varchar(100) index" json:"organization"`
	Status                 string `xorm:"varchar(50) index" json:"status"`
	CorpAlias              string `xorm:"varchar(100)" json:"corpAlias"`
	SourceConnectionIdHash string `xorm:"varchar(100) index" json:"sourceConnectionIdHash"`
	DiagnosticAlias        string `xorm:"varchar(100) index" json:"diagnosticAlias"`
	OperatorHash           string `xorm:"varchar(100) index" json:"operatorHash"`
	RequestMarker          string `xorm:"varchar(100) index" json:"requestMarker"`

	SnapshotDepartmentCount   int `xorm:"int" json:"snapshotDepartmentCount"`
	SnapshotUserCount         int `xorm:"int" json:"snapshotUserCount"`
	SnapshotRelationshipCount int `xorm:"int" json:"snapshotRelationshipCount"`

	DepartmentToCreate        int `xorm:"int" json:"departmentToCreate"`
	DepartmentToUpdate        int `xorm:"int" json:"departmentToUpdate"`
	DepartmentToSoftDisable   int `xorm:"int" json:"departmentToSoftDisable"`
	DepartmentUnchanged       int `xorm:"int" json:"departmentUnchanged"`
	DepartmentConflict        int `xorm:"int" json:"departmentConflict"`
	DepartmentInvalid         int `xorm:"int" json:"departmentInvalid"`
	UserToCreate              int `xorm:"int" json:"userToCreate"`
	UserToUpdate              int `xorm:"int" json:"userToUpdate"`
	UserToSoftDisable         int `xorm:"int" json:"userToSoftDisable"`
	UserUnchanged             int `xorm:"int" json:"userUnchanged"`
	UserConflict              int `xorm:"int" json:"userConflict"`
	UserInvalid               int `xorm:"int" json:"userInvalid"`
	RelationshipToCreate      int `xorm:"int" json:"relationshipToCreate"`
	RelationshipToUpdate      int `xorm:"int" json:"relationshipToUpdate"`
	RelationshipToSoftDisable int `xorm:"int" json:"relationshipToSoftDisable"`
	RelationshipUnchanged     int `xorm:"int" json:"relationshipUnchanged"`
	RelationshipConflict      int `xorm:"int" json:"relationshipConflict"`
	RelationshipInvalid       int `xorm:"int" json:"relationshipInvalid"`

	ReasonCountsJson string `xorm:"text" json:"-"`
	DiagnosticsJson  string `xorm:"text" json:"-"`
	SafeSummary      string `xorm:"text" json:"safeSummary"`

	RetentionDays      int       `xorm:"int" json:"retentionDays"`
	RetentionExpiresAt time.Time `xorm:"timestampz index" json:"retentionExpiresAt"`
	RedactionApplied   bool      `xorm:"bool" json:"redactionApplied"`
	RedactionVersion   string    `xorm:"varchar(100)" json:"redactionVersion"`

	ReasonCounts map[string]int                          `xorm:"-" json:"reasonCounts"`
	Diagnostics  *WecomOrganizationSyncDryRunDiagnostics `xorm:"-" json:"diagnostics,omitempty"`
}

// WecomOrganizationSyncDryRunHistoryFilter 描述 dry-run 历史只读查询条件。
// 过滤字段只接受脱敏 alias/hash 和聚合状态，避免把 provider 原始标识暴露为查询面。
type WecomOrganizationSyncDryRunHistoryFilter struct {
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

// WecomOrganizationSyncDryRunHistoryStore 封装 dry-run 历史持久化边界。
// 实现方只保存脱敏摘要，不保存 raw WeCom payload、用户明细或凭据。
type WecomOrganizationSyncDryRunHistoryStore interface {
	CreateWecomOrganizationSyncDryRunHistory(history *WecomOrganizationSyncDryRunHistory) error
	GetWecomOrganizationSyncDryRunHistory(organization string, historyId string) (*WecomOrganizationSyncDryRunHistory, error)
	GetWecomOrganizationSyncDryRunHistories(filter WecomOrganizationSyncDryRunHistoryFilter) ([]*WecomOrganizationSyncDryRunHistory, error)
	GetWecomOrganizationSyncDryRunHistoryCount(filter WecomOrganizationSyncDryRunHistoryFilter) (int64, error)
}

// WecomOrganizationSyncDryRunHistoryService 提供 Admin 侧 dry-run 历史只读查询服务。
// 服务返回前会重新脱敏摘要字段，防止历史数据中残留敏感片段。
type WecomOrganizationSyncDryRunHistoryService struct {
	Store WecomOrganizationSyncDryRunHistoryStore
}

type defaultWecomOrganizationSyncDryRunHistoryStore struct{}

// GetHistories 返回目标组织的企业微信 dry-run 历史摘要列表和总数。
// 该方法只读，不触发正式同步，也不会返回 provider 原始 payload。
func (s *WecomOrganizationSyncDryRunHistoryService) GetHistories(filter WecomOrganizationSyncDryRunHistoryFilter) ([]*WecomOrganizationSyncDryRunHistory, int64, error) {
	filter.Organization = strings.TrimSpace(filter.Organization)
	if filter.Organization == "" {
		return nil, 0, fmt.Errorf("wecom dry-run history organization is required")
	}
	count, err := s.historyStore().GetWecomOrganizationSyncDryRunHistoryCount(filter)
	if err != nil {
		return nil, 0, err
	}
	histories, err := s.historyStore().GetWecomOrganizationSyncDryRunHistories(filter)
	if err != nil {
		return nil, 0, err
	}
	return maskWecomDryRunHistories(histories), count, nil
}

// GetHistory 返回单条企业微信 dry-run 历史详情。
// 详情仍然保持脱敏聚合视图，不展开完整组织树、用户列表或外部账号明细。
func (s *WecomOrganizationSyncDryRunHistoryService) GetHistory(organization string, historyId string) (*WecomOrganizationSyncDryRunHistory, error) {
	organization = strings.TrimSpace(organization)
	historyId = strings.TrimSpace(historyId)
	if organization == "" {
		return nil, fmt.Errorf("wecom dry-run history organization is required")
	}
	if historyId == "" {
		return nil, fmt.Errorf("wecom dry-run history id is required")
	}
	history, err := s.historyStore().GetWecomOrganizationSyncDryRunHistory(organization, historyId)
	if err != nil {
		return nil, err
	}
	return maskWecomDryRunHistory(history), nil
}

func (s *WecomOrganizationSyncDryRunHistoryService) historyStore() WecomOrganizationSyncDryRunHistoryStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultWecomOrganizationSyncDryRunHistoryStore{}
}

func newWecomDryRunHistoryFromPreview(preview *WecomOrganizationSyncDryRunPreview, operator string, requestMarker string, now time.Time) *WecomOrganizationSyncDryRunHistory {
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
	if diagnosticAlias == "none" && preview.Status == WecomOrganizationSyncDryRunPreviewStatusFailed {
		diagnosticAlias = "unknown"
	}
	history := &WecomOrganizationSyncDryRunHistory{
		Owner:                     source.Organization,
		Name:                      fmt.Sprintf("wecom-dry-run-history-%d", now.UnixNano()),
		Organization:              source.Organization,
		Status:                    preview.Status,
		CorpAlias:                 source.CorpAlias,
		SourceConnectionIdHash:    buildWecomDryRunSourceConnectionHash(source.Organization, source.CorpAlias),
		DiagnosticAlias:           diagnosticAlias,
		OperatorHash:              buildWecomDryRunOperatorHash(source.Organization, operator),
		RequestMarker:             safeWecomDryRunRequestMarker(requestMarker, source.Organization, now),
		SnapshotDepartmentCount:   preview.SnapshotStats.DepartmentCount,
		SnapshotUserCount:         preview.SnapshotStats.UserCount,
		SnapshotRelationshipCount: preview.SnapshotStats.RelationshipCount,
		DepartmentToCreate:        preview.Diff.Departments.ToCreate,
		DepartmentToUpdate:        preview.Diff.Departments.ToUpdate,
		DepartmentToSoftDisable:   preview.Diff.Departments.ToSoftDisable,
		DepartmentUnchanged:       preview.Diff.Departments.Unchanged,
		DepartmentConflict:        preview.Diff.Departments.Conflict,
		DepartmentInvalid:         preview.Diff.Departments.Invalid,
		UserToCreate:              preview.Diff.Users.ToCreate,
		UserToUpdate:              preview.Diff.Users.ToUpdate,
		UserToSoftDisable:         preview.Diff.Users.ToSoftDisable,
		UserUnchanged:             preview.Diff.Users.Unchanged,
		UserConflict:              preview.Diff.Users.Conflict,
		UserInvalid:               preview.Diff.Users.Invalid,
		RelationshipToCreate:      preview.Diff.Relationships.ToCreate,
		RelationshipToUpdate:      preview.Diff.Relationships.ToUpdate,
		RelationshipToSoftDisable: preview.Diff.Relationships.ToSoftDisable,
		RelationshipUnchanged:     preview.Diff.Relationships.Unchanged,
		RelationshipConflict:      preview.Diff.Relationships.Conflict,
		RelationshipInvalid:       preview.Diff.Relationships.Invalid,
		ReasonCounts:              copyReasonCounts(preview.ReasonCounts),
		Diagnostics:               preview.Diagnostics,
		SafeSummary:               safeWecomDryRunSummary(safeSummary),
		RetentionDays:             WecomOrganizationSyncDryRunHistoryRetentionDays,
		RetentionExpiresAt:        now.AddDate(0, 0, WecomOrganizationSyncDryRunHistoryRetentionDays),
		RedactionApplied:          true,
		RedactionVersion:          WecomOrganizationSyncDryRunHistoryRedactionV1,
	}
	history.syncWecomDryRunHistoryJson()
	return history
}

func (h *WecomOrganizationSyncDryRunHistory) syncWecomDryRunHistoryJson() {
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

func hydrateWecomDryRunHistory(history *WecomOrganizationSyncDryRunHistory) *WecomOrganizationSyncDryRunHistory {
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

func maskWecomDryRunHistories(histories []*WecomOrganizationSyncDryRunHistory) []*WecomOrganizationSyncDryRunHistory {
	masked := make([]*WecomOrganizationSyncDryRunHistory, 0, len(histories))
	for _, history := range histories {
		masked = append(masked, maskWecomDryRunHistory(history))
	}
	return masked
}

func maskWecomDryRunHistory(history *WecomOrganizationSyncDryRunHistory) *WecomOrganizationSyncDryRunHistory {
	if history == nil {
		return nil
	}
	hydrateWecomDryRunHistory(history)
	masked := *history
	masked.ReasonCounts = copyReasonCounts(history.ReasonCounts)
	if history.Diagnostics != nil {
		diagnostics := *history.Diagnostics
		diagnostics.SafeSummary = safeWecomDryRunSummary(diagnostics.SafeSummary)
		masked.Diagnostics = &diagnostics
	}
	masked.SafeSummary = safeWecomDryRunSummary(masked.SafeSummary)
	return &masked
}

func (s defaultWecomOrganizationSyncDryRunHistoryStore) CreateWecomOrganizationSyncDryRunHistory(history *WecomOrganizationSyncDryRunHistory) error {
	if history == nil {
		return nil
	}
	history.syncWecomDryRunHistoryJson()
	_, err := ormer.Engine.Insert(history)
	return err
}

func (s defaultWecomOrganizationSyncDryRunHistoryStore) GetWecomOrganizationSyncDryRunHistory(organization string, historyId string) (*WecomOrganizationSyncDryRunHistory, error) {
	history := &WecomOrganizationSyncDryRunHistory{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("name = ?", historyId).Get(history)
	if err != nil || !existed {
		return nil, err
	}
	return hydrateWecomDryRunHistory(history), nil
}

func (s defaultWecomOrganizationSyncDryRunHistoryStore) GetWecomOrganizationSyncDryRunHistories(filter WecomOrganizationSyncDryRunHistoryFilter) ([]*WecomOrganizationSyncDryRunHistory, error) {
	histories := []*WecomOrganizationSyncDryRunHistory{}
	err := getWecomDryRunHistorySession(filter).Where("organization = ?", filter.Organization).Find(&histories)
	if err != nil {
		return nil, err
	}
	for _, history := range histories {
		hydrateWecomDryRunHistory(history)
	}
	return histories, nil
}

func (s defaultWecomOrganizationSyncDryRunHistoryStore) GetWecomOrganizationSyncDryRunHistoryCount(filter WecomOrganizationSyncDryRunHistoryFilter) (int64, error) {
	return getWecomDryRunHistoryFilterSession(filter).Where("organization = ?", filter.Organization).Count(&WecomOrganizationSyncDryRunHistory{})
}

func getWecomDryRunHistorySession(filter WecomOrganizationSyncDryRunHistoryFilter) *xorm.Session {
	session := getWecomDryRunHistoryFilterSession(filter)
	limit := normalizeWecomDryRunHistoryLimit(filter.Limit, filter.TopN)
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

func getWecomDryRunHistoryFilterSession(filter WecomOrganizationSyncDryRunHistoryFilter) *xorm.Session {
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

func normalizeWecomDryRunHistoryLimit(limit int, topN int) int {
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

func buildWecomDryRunSourceConnectionHash(organization string, corpAlias string) string {
	return "source-" + shortWecomOrganizationSyncHash(organization, corpAlias)
}

func buildWecomDryRunOperatorHash(organization string, operator string) string {
	operator = strings.TrimSpace(operator)
	if operator == "" {
		operator = "unknown"
	}
	return "operator-" + shortWecomOrganizationSyncHash(organization, operator)
}

func safeWecomDryRunRequestMarker(requestMarker string, organization string, now time.Time) string {
	requestMarker = strings.TrimSpace(requestMarker)
	if requestMarker == "" {
		requestMarker = fmt.Sprintf("dry-run-%d", now.UnixNano())
	}
	return "request-" + shortWecomOrganizationSyncHash(organization, requestMarker)
}
