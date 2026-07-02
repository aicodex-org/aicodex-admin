// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/xorm-io/core"
	"github.com/xorm-io/xorm"
)

const (
	DingTalkOrganizationSyncDefaultLeaseDuration  = 30 * time.Minute
	DingTalkOrganizationSyncErrorCodeStaleRunning = "stale_running"
)

// ErrDingTalkOrganizationSyncRunAlreadyRunning 表示同一组织仍有有效租约的钉钉同步 run。
var ErrDingTalkOrganizationSyncRunAlreadyRunning = errors.New("dingtalk organization sync run already running")

// DingTalkOrganizationSyncStartRunResult 返回新 run，并在恢复过期 running run 时附带旧 run 摘要。
type DingTalkOrganizationSyncStartRunResult struct {
	Run      *DingTalkOrganizationSyncRun    `json:"run"`
	StaleRun *DingTalkOrganizationSyncRun    `json:"staleRun,omitempty"`
	Config   *DingTalkOrganizationSyncConfig `json:"-"`
}

// DingTalkOrganizationSyncRunStore 隔离钉钉同步 run 持久化和查询。
type DingTalkOrganizationSyncRunStore interface {
	GetRunningDingTalkOrganizationSyncRun(organization string) (*DingTalkOrganizationSyncRun, error)
	CreateDingTalkOrganizationSyncRun(run *DingTalkOrganizationSyncRun) error
	UpdateDingTalkOrganizationSyncRun(run *DingTalkOrganizationSyncRun) error
	GetDingTalkOrganizationSyncRun(organization string, runId string) (*DingTalkOrganizationSyncRun, error)
	GetDingTalkOrganizationSyncRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string) ([]*DingTalkOrganizationSyncRun, error)
	GetDingTalkOrganizationSyncRunCount(organization string, field string, value string) (int64, error)
}

// DingTalkOrganizationSyncRunTriggerStartStore 允许默认 store 在一次事务内按触发类型创建 run。
type DingTalkOrganizationSyncRunTriggerStartStore interface {
	StartDingTalkOrganizationSyncRunWithTrigger(config *DingTalkOrganizationSyncConfig, actor string, triggerType DingTalkOrganizationSyncTriggerType, now time.Time, leaseDuration time.Duration) (*DingTalkOrganizationSyncStartRunResult, error)
}

// DingTalkOrganizationSyncConfigLastSyncStore 更新配置上的最近成功同步摘要。
type DingTalkOrganizationSyncConfigLastSyncStore interface {
	UpdateDingTalkOrganizationSyncConfigLastSync(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun, syncedAt time.Time) error
}

type defaultDingTalkOrganizationSyncRunStore struct{}

// StartManualRunWithResult 创建手动触发的钉钉同步 run，但不负责后台执行。
func (s *DingTalkOrganizationSyncService) StartManualRunWithResult(config *DingTalkOrganizationSyncConfig, actor string) (*DingTalkOrganizationSyncStartRunResult, error) {
	return s.startRunWithResult(config, actor, DingTalkOrganizationSyncTriggerManual)
}

// StartScheduledRunWithResult 创建调度触发的钉钉同步 run，但不负责后台执行。
func (s *DingTalkOrganizationSyncService) StartScheduledRunWithResult(config *DingTalkOrganizationSyncConfig, actor string) (*DingTalkOrganizationSyncStartRunResult, error) {
	return s.startRunWithResult(config, actor, DingTalkOrganizationSyncTriggerScheduled)
}

func (s *DingTalkOrganizationSyncService) startRunWithResult(config *DingTalkOrganizationSyncConfig, actor string, triggerType DingTalkOrganizationSyncTriggerType) (*DingTalkOrganizationSyncStartRunResult, error) {
	if err := validateDingTalkOrganizationSyncRunExecutionConfig(config); err != nil {
		return nil, err
	}
	if err := (&OrganizationDirectorySourceStatusService{
		WecomConfigStore:  s.wecomConfigStore(),
		FeishuConfigStore: s.feishuConfigStore(),
	}).RequireExecutionAllowedWithSourceSummary(config.Organization, OrganizationDirectorySourceDingTalk, newDingTalkOrganizationDirectorySourceSummary(config)); err != nil {
		return nil, err
	}
	store := s.runStore()
	if startStore, ok := store.(DingTalkOrganizationSyncRunTriggerStartStore); ok {
		return startStore.StartDingTalkOrganizationSyncRunWithTrigger(config, actor, triggerType, s.now().UTC(), s.leaseDuration())
	}
	return s.startRunWithStore(store, config, actor, triggerType)
}

func (s *DingTalkOrganizationSyncService) startRunWithStore(store DingTalkOrganizationSyncRunStore, config *DingTalkOrganizationSyncConfig, actor string, triggerType DingTalkOrganizationSyncTriggerType) (*DingTalkOrganizationSyncStartRunResult, error) {
	now := s.now().UTC()
	runningRun, err := store.GetRunningDingTalkOrganizationSyncRun(config.Organization)
	if err != nil {
		return nil, err
	}
	var staleRun *DingTalkOrganizationSyncRun
	if runningRun != nil {
		if runningRun.LeaseExpiresAt.IsZero() || runningRun.LeaseExpiresAt.After(now) {
			return nil, ErrDingTalkOrganizationSyncRunAlreadyRunning
		}
		prepareStaleDingTalkOrganizationSyncRunFailed(runningRun, now)
		if err := store.UpdateDingTalkOrganizationSyncRun(runningRun); err != nil {
			return nil, err
		}
		staleRun = runningRun
	}
	run := newDingTalkOrganizationSyncRun(config, actor, triggerType, now, s.leaseDuration())
	if err := store.CreateDingTalkOrganizationSyncRun(run); err != nil {
		return nil, err
	}
	configCopy := *config
	return &DingTalkOrganizationSyncStartRunResult{Run: run, StaleRun: staleRun, Config: &configCopy}, nil
}

// GetRuns 查询钉钉同步 run 列表，并在返回前清理错误摘要中的敏感值。
func (s *DingTalkOrganizationSyncService) GetRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string, sensitiveValues ...string) ([]*DingTalkOrganizationSyncRun, int64, error) {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return nil, 0, fmt.Errorf("dingtalk organization sync organization is required")
	}
	count, err := s.GetRunCount(organization, field, value)
	if err != nil {
		return nil, 0, err
	}
	runs, err := s.runStore().GetDingTalkOrganizationSyncRuns(organization, offset, limit, field, value, sortField, sortOrder)
	if err != nil {
		return nil, 0, err
	}
	return GetMaskedDingTalkOrganizationSyncRuns(runs, sensitiveValues...), count, nil
}

// GetRun 查询单个钉钉同步 run，并在返回前清理错误摘要中的敏感值。
func (s *DingTalkOrganizationSyncService) GetRun(organization string, runId string, sensitiveValues ...string) (*DingTalkOrganizationSyncRun, error) {
	organization = strings.TrimSpace(organization)
	runId = strings.TrimSpace(runId)
	if organization == "" {
		return nil, fmt.Errorf("dingtalk organization sync organization is required")
	}
	if runId == "" {
		return nil, fmt.Errorf("dingtalk organization sync run_id is required")
	}
	run, err := s.runStore().GetDingTalkOrganizationSyncRun(organization, runId)
	if err != nil {
		return nil, err
	}
	return GetMaskedDingTalkOrganizationSyncRun(run, sensitiveValues...), nil
}

// GetRunCount 返回钉钉同步 run 的分页总数。
func (s *DingTalkOrganizationSyncService) GetRunCount(organization string, field string, value string) (int64, error) {
	return s.runStore().GetDingTalkOrganizationSyncRunCount(strings.TrimSpace(organization), field, value)
}

// GetMaskedDingTalkOrganizationSyncRun 返回不暴露 secret/token 的 run 副本。
func GetMaskedDingTalkOrganizationSyncRun(run *DingTalkOrganizationSyncRun, sensitiveValues ...string) *DingTalkOrganizationSyncRun {
	if run == nil {
		return nil
	}
	masked := *run
	masked.ErrorText = safeOrganizationSyncErrorText(masked.ErrorText, sensitiveValues...)
	return &masked
}

// GetMaskedDingTalkOrganizationSyncRuns 批量清理 run 错误摘要中的敏感值。
func GetMaskedDingTalkOrganizationSyncRuns(runs []*DingTalkOrganizationSyncRun, sensitiveValues ...string) []*DingTalkOrganizationSyncRun {
	maskedRuns := make([]*DingTalkOrganizationSyncRun, 0, len(runs))
	for _, run := range runs {
		maskedRuns = append(maskedRuns, GetMaskedDingTalkOrganizationSyncRun(run, sensitiveValues...))
	}
	return maskedRuns
}

func newDingTalkOrganizationSyncRun(config *DingTalkOrganizationSyncConfig, actor string, triggerType DingTalkOrganizationSyncTriggerType, now time.Time, leaseDuration time.Duration) *DingTalkOrganizationSyncRun {
	if triggerType == "" {
		triggerType = DingTalkOrganizationSyncTriggerManual
	}
	return &DingTalkOrganizationSyncRun{
		Owner:          config.Organization,
		Name:           fmt.Sprintf("dingtalk-sync-run-%d", now.UnixNano()),
		Organization:   config.Organization,
		ConfigName:     config.Name,
		AppKey:         config.AppKey,
		TriggerType:    triggerType,
		Actor:          actor,
		Status:         DingTalkOrganizationSyncRunStatusRunning,
		Stage:          DingTalkOrganizationSyncRunStageFetching,
		StartedAt:      now,
		HeartbeatAt:    now,
		LeaseExpiresAt: now.Add(leaseDuration),
	}
}

func prepareStaleDingTalkOrganizationSyncRunFailed(run *DingTalkOrganizationSyncRun, now time.Time) {
	run.Status = DingTalkOrganizationSyncRunStatusFailed
	run.Stage = DingTalkOrganizationSyncRunStageFinalizing
	run.FinishedAt = now
	run.UpdatedAt = now
	run.ErrorCode = DingTalkOrganizationSyncErrorCodeStaleRunning
	run.ErrorText = "previous running DingTalk organization sync lease expired"
}

func (s *DingTalkOrganizationSyncService) runStore() DingTalkOrganizationSyncRunStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultDingTalkOrganizationSyncRunStore{}
}

func (s defaultDingTalkOrganizationSyncRunStore) GetRunningDingTalkOrganizationSyncRun(organization string) (*DingTalkOrganizationSyncRun, error) {
	run := &DingTalkOrganizationSyncRun{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("status = ?", DingTalkOrganizationSyncRunStatusRunning).Desc("started_at").Get(run)
	if err != nil || !existed {
		return nil, err
	}
	return run, nil
}

func (s defaultDingTalkOrganizationSyncRunStore) StartDingTalkOrganizationSyncRunWithTrigger(config *DingTalkOrganizationSyncConfig, actor string, triggerType DingTalkOrganizationSyncTriggerType, now time.Time, leaseDuration time.Duration) (*DingTalkOrganizationSyncStartRunResult, error) {
	session := ormer.Engine.NewSession()
	defer session.Close()
	if err := session.Begin(); err != nil {
		return nil, err
	}
	committed := false
	defer func() {
		if !committed {
			_ = session.Rollback()
		}
	}()

	lockedConfig := &DingTalkOrganizationSyncConfig{}
	existed, err := session.Where("organization = ?", config.Organization).ForUpdate().Get(lockedConfig)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, fmt.Errorf("dingtalk organization sync config is not configured")
	}
	if !lockedConfig.IsEnabled {
		return nil, fmt.Errorf("dingtalk organization sync config is disabled")
	}
	if err := validateDingTalkOrganizationSyncRunExecutionConfig(lockedConfig); err != nil {
		return nil, err
	}

	runningRun := &DingTalkOrganizationSyncRun{}
	existed, err = session.Where("organization = ?", config.Organization).And("status = ?", DingTalkOrganizationSyncRunStatusRunning).Desc("started_at").ForUpdate().Get(runningRun)
	if err != nil {
		return nil, err
	}
	var staleRun *DingTalkOrganizationSyncRun
	if existed {
		if runningRun.LeaseExpiresAt.IsZero() || runningRun.LeaseExpiresAt.After(now) {
			return nil, ErrDingTalkOrganizationSyncRunAlreadyRunning
		}
		prepareStaleDingTalkOrganizationSyncRunFailed(runningRun, now)
		if _, err := session.ID(core.PK{runningRun.Owner, runningRun.Name}).AllCols().Update(runningRun); err != nil {
			return nil, err
		}
		staleRun = runningRun
	}
	run := newDingTalkOrganizationSyncRun(lockedConfig, actor, triggerType, now, leaseDuration)
	if _, err := session.Insert(run); err != nil {
		return nil, err
	}
	if err := session.Commit(); err != nil {
		return nil, err
	}
	committed = true
	configSnapshot := *lockedConfig
	return &DingTalkOrganizationSyncStartRunResult{Run: run, StaleRun: staleRun, Config: &configSnapshot}, nil
}

func (s defaultDingTalkOrganizationSyncRunStore) CreateDingTalkOrganizationSyncRun(run *DingTalkOrganizationSyncRun) error {
	_, err := ormer.Engine.Insert(run)
	return err
}

func (s defaultDingTalkOrganizationSyncRunStore) UpdateDingTalkOrganizationSyncRun(run *DingTalkOrganizationSyncRun) error {
	_, err := ormer.Engine.ID(core.PK{run.Owner, run.Name}).AllCols().Update(run)
	return err
}

func (s defaultDingTalkOrganizationSyncRunStore) GetDingTalkOrganizationSyncRun(organization string, runId string) (*DingTalkOrganizationSyncRun, error) {
	run := &DingTalkOrganizationSyncRun{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("name = ?", runId).Get(run)
	if err != nil || !existed {
		return nil, err
	}
	return run, nil
}

func (s defaultDingTalkOrganizationSyncRunStore) GetDingTalkOrganizationSyncRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string) ([]*DingTalkOrganizationSyncRun, error) {
	runs := []*DingTalkOrganizationSyncRun{}
	err := getDingTalkOrganizationSyncRunSession(offset, limit, field, value, sortField, sortOrder).Where("organization = ?", organization).Find(&runs)
	return runs, err
}

func (s defaultDingTalkOrganizationSyncRunStore) GetDingTalkOrganizationSyncRunCount(organization string, field string, value string) (int64, error) {
	return getDingTalkOrganizationSyncRunSession(-1, -1, field, value, "", "").Where("organization = ?", organization).Count(&DingTalkOrganizationSyncRun{})
}

func getDingTalkOrganizationSyncRunSession(offset int, limit int, field string, value string, sortField string, sortOrder string) *xorm.Session {
	session := ormer.Engine.Prepare()
	if offset != -1 && limit != -1 {
		session.Limit(limit, offset)
	}
	if field != "" && value != "" && util.FilterField(field) {
		session = session.And(fmt.Sprintf("%s like ?", util.SnakeString(field)), fmt.Sprintf("%%%s%%", value))
	}
	if sortField == "" {
		sortField = "createdAt"
	}
	if sortOrder == "ascend" {
		return session.Asc(util.SnakeString(sortField))
	}
	return session.Desc(util.SnakeString(sortField))
}
