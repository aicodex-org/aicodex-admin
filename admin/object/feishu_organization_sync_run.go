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
	FeishuOrganizationSyncDefaultLeaseDuration  = 30 * time.Minute
	FeishuOrganizationSyncErrorCodeStaleRunning = "stale_running"
)

var ErrFeishuOrganizationSyncRunAlreadyRunning = errors.New("feishu organization sync run already running")

type FeishuOrganizationSyncStartRunResult struct {
	Run      *FeishuOrganizationSyncRun    `json:"run"`
	StaleRun *FeishuOrganizationSyncRun    `json:"staleRun,omitempty"`
	Config   *FeishuOrganizationSyncConfig `json:"-"`
}

type FeishuOrganizationSyncRunStore interface {
	GetRunningFeishuOrganizationSyncRun(organization string) (*FeishuOrganizationSyncRun, error)
	CreateFeishuOrganizationSyncRun(run *FeishuOrganizationSyncRun) error
	UpdateFeishuOrganizationSyncRun(run *FeishuOrganizationSyncRun) error
	GetFeishuOrganizationSyncRun(organization string, runId string) (*FeishuOrganizationSyncRun, error)
	GetFeishuOrganizationSyncRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string) ([]*FeishuOrganizationSyncRun, error)
	GetFeishuOrganizationSyncRunCount(organization string, field string, value string) (int64, error)
}

type FeishuOrganizationSyncRunTriggerStartStore interface {
	StartFeishuOrganizationSyncRunWithTrigger(config *FeishuOrganizationSyncConfig, actor string, triggerType FeishuOrganizationSyncTriggerType, now time.Time, leaseDuration time.Duration) (*FeishuOrganizationSyncStartRunResult, error)
}

type FeishuOrganizationSyncConfigLastSyncStore interface {
	UpdateFeishuOrganizationSyncConfigLastSync(config *FeishuOrganizationSyncConfig, run *FeishuOrganizationSyncRun, syncedAt time.Time) error
}

type defaultFeishuOrganizationSyncRunStore struct{}

func (s *FeishuOrganizationSyncService) StartManualRunWithResult(config *FeishuOrganizationSyncConfig, actor string) (*FeishuOrganizationSyncStartRunResult, error) {
	return s.startRunWithResult(config, actor, FeishuOrganizationSyncTriggerManual)
}

func (s *FeishuOrganizationSyncService) StartScheduledRunWithResult(config *FeishuOrganizationSyncConfig, actor string) (*FeishuOrganizationSyncStartRunResult, error) {
	return s.startRunWithResult(config, actor, FeishuOrganizationSyncTriggerScheduled)
}

func (s *FeishuOrganizationSyncService) startRunWithResult(config *FeishuOrganizationSyncConfig, actor string, triggerType FeishuOrganizationSyncTriggerType) (*FeishuOrganizationSyncStartRunResult, error) {
	if err := validateFeishuOrganizationSyncRunExecutionConfig(config); err != nil {
		return nil, err
	}
	store := s.runStore()
	if startStore, ok := store.(FeishuOrganizationSyncRunTriggerStartStore); ok {
		return startStore.StartFeishuOrganizationSyncRunWithTrigger(config, actor, triggerType, s.now().UTC(), s.leaseDuration())
	}
	return s.startRunWithStore(store, config, actor, triggerType)
}

func (s *FeishuOrganizationSyncService) startRunWithStore(store FeishuOrganizationSyncRunStore, config *FeishuOrganizationSyncConfig, actor string, triggerType FeishuOrganizationSyncTriggerType) (*FeishuOrganizationSyncStartRunResult, error) {
	now := s.now().UTC()
	runningRun, err := store.GetRunningFeishuOrganizationSyncRun(config.Organization)
	if err != nil {
		return nil, err
	}
	var staleRun *FeishuOrganizationSyncRun
	if runningRun != nil {
		if runningRun.LeaseExpiresAt.IsZero() || runningRun.LeaseExpiresAt.After(now) {
			return nil, ErrFeishuOrganizationSyncRunAlreadyRunning
		}
		prepareStaleFeishuOrganizationSyncRunFailed(runningRun, now)
		if err := store.UpdateFeishuOrganizationSyncRun(runningRun); err != nil {
			return nil, err
		}
		staleRun = runningRun
	}
	run := newFeishuOrganizationSyncRun(config, actor, triggerType, now, s.leaseDuration())
	if err := store.CreateFeishuOrganizationSyncRun(run); err != nil {
		return nil, err
	}
	configCopy := *config
	return &FeishuOrganizationSyncStartRunResult{Run: run, StaleRun: staleRun, Config: &configCopy}, nil
}

func (s *FeishuOrganizationSyncService) GetRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string, sensitiveValues ...string) ([]*FeishuOrganizationSyncRun, int64, error) {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return nil, 0, fmt.Errorf("feishu organization sync organization is required")
	}
	count, err := s.GetRunCount(organization, field, value)
	if err != nil {
		return nil, 0, err
	}
	runs, err := s.runStore().GetFeishuOrganizationSyncRuns(organization, offset, limit, field, value, sortField, sortOrder)
	if err != nil {
		return nil, 0, err
	}
	return GetMaskedFeishuOrganizationSyncRuns(runs, sensitiveValues...), count, nil
}

func (s *FeishuOrganizationSyncService) GetRun(organization string, runId string, sensitiveValues ...string) (*FeishuOrganizationSyncRun, error) {
	organization = strings.TrimSpace(organization)
	runId = strings.TrimSpace(runId)
	if organization == "" {
		return nil, fmt.Errorf("feishu organization sync organization is required")
	}
	if runId == "" {
		return nil, fmt.Errorf("feishu organization sync run_id is required")
	}
	run, err := s.runStore().GetFeishuOrganizationSyncRun(organization, runId)
	if err != nil {
		return nil, err
	}
	return GetMaskedFeishuOrganizationSyncRun(run, sensitiveValues...), nil
}

func (s *FeishuOrganizationSyncService) GetRunCount(organization string, field string, value string) (int64, error) {
	return s.runStore().GetFeishuOrganizationSyncRunCount(strings.TrimSpace(organization), field, value)
}

func GetMaskedFeishuOrganizationSyncRun(run *FeishuOrganizationSyncRun, sensitiveValues ...string) *FeishuOrganizationSyncRun {
	if run == nil {
		return nil
	}
	masked := *run
	masked.ErrorText = safeOrganizationSyncErrorText(masked.ErrorText, sensitiveValues...)
	masked.Diagnostics = BuildFeishuOrganizationSyncRunDiagnostics(&masked, sensitiveValues...)
	return &masked
}

func GetMaskedFeishuOrganizationSyncRuns(runs []*FeishuOrganizationSyncRun, sensitiveValues ...string) []*FeishuOrganizationSyncRun {
	maskedRuns := make([]*FeishuOrganizationSyncRun, 0, len(runs))
	for _, run := range runs {
		maskedRuns = append(maskedRuns, GetMaskedFeishuOrganizationSyncRun(run, sensitiveValues...))
	}
	return maskedRuns
}

func newFeishuOrganizationSyncRun(config *FeishuOrganizationSyncConfig, actor string, triggerType FeishuOrganizationSyncTriggerType, now time.Time, leaseDuration time.Duration) *FeishuOrganizationSyncRun {
	if triggerType == "" {
		triggerType = FeishuOrganizationSyncTriggerManual
	}
	return &FeishuOrganizationSyncRun{
		Owner:          config.Organization,
		Name:           fmt.Sprintf("feishu-sync-run-%d", now.UnixNano()),
		Organization:   config.Organization,
		ConfigName:     config.Name,
		AppId:          config.AppId,
		EndpointMode:   normalizeFeishuEndpointMode(config.EndpointMode),
		TenantKey:      config.TenantKey,
		TriggerType:    triggerType,
		Actor:          actor,
		Status:         FeishuOrganizationSyncRunStatusRunning,
		Stage:          FeishuOrganizationSyncRunStageFetching,
		StartedAt:      now,
		HeartbeatAt:    now,
		LeaseExpiresAt: now.Add(leaseDuration),
	}
}

func prepareStaleFeishuOrganizationSyncRunFailed(run *FeishuOrganizationSyncRun, now time.Time) {
	run.Status = FeishuOrganizationSyncRunStatusFailed
	run.Stage = FeishuOrganizationSyncRunStageFinalizing
	run.FinishedAt = now
	run.UpdatedAt = now
	run.ErrorCode = FeishuOrganizationSyncErrorCodeStaleRunning
	run.ErrorText = "previous running Feishu organization sync lease expired"
}

func (s *FeishuOrganizationSyncService) runStore() FeishuOrganizationSyncRunStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultFeishuOrganizationSyncRunStore{}
}

func (s defaultFeishuOrganizationSyncRunStore) GetRunningFeishuOrganizationSyncRun(organization string) (*FeishuOrganizationSyncRun, error) {
	run := &FeishuOrganizationSyncRun{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("status = ?", FeishuOrganizationSyncRunStatusRunning).Desc("started_at").Get(run)
	if err != nil || !existed {
		return nil, err
	}
	return run, nil
}

func (s defaultFeishuOrganizationSyncRunStore) StartFeishuOrganizationSyncRunWithTrigger(config *FeishuOrganizationSyncConfig, actor string, triggerType FeishuOrganizationSyncTriggerType, now time.Time, leaseDuration time.Duration) (*FeishuOrganizationSyncStartRunResult, error) {
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

	lockedConfig := &FeishuOrganizationSyncConfig{}
	existed, err := session.Where("organization = ?", config.Organization).ForUpdate().Get(lockedConfig)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, fmt.Errorf("feishu organization sync config is not configured")
	}
	if !lockedConfig.IsEnabled {
		return nil, fmt.Errorf("feishu organization sync config is disabled")
	}
	if err := validateFeishuOrganizationSyncRunExecutionConfig(lockedConfig); err != nil {
		return nil, err
	}

	runningRun := &FeishuOrganizationSyncRun{}
	existed, err = session.Where("organization = ?", config.Organization).And("status = ?", FeishuOrganizationSyncRunStatusRunning).Desc("started_at").ForUpdate().Get(runningRun)
	if err != nil {
		return nil, err
	}
	var staleRun *FeishuOrganizationSyncRun
	if existed {
		if runningRun.LeaseExpiresAt.IsZero() || runningRun.LeaseExpiresAt.After(now) {
			return nil, ErrFeishuOrganizationSyncRunAlreadyRunning
		}
		prepareStaleFeishuOrganizationSyncRunFailed(runningRun, now)
		if _, err := session.ID(core.PK{runningRun.Owner, runningRun.Name}).AllCols().Update(runningRun); err != nil {
			return nil, err
		}
		staleRun = runningRun
	}
	run := newFeishuOrganizationSyncRun(lockedConfig, actor, triggerType, now, leaseDuration)
	if _, err := session.Insert(run); err != nil {
		return nil, err
	}
	if err := session.Commit(); err != nil {
		return nil, err
	}
	committed = true
	configSnapshot := *lockedConfig
	return &FeishuOrganizationSyncStartRunResult{Run: run, StaleRun: staleRun, Config: &configSnapshot}, nil
}

func (s defaultFeishuOrganizationSyncRunStore) CreateFeishuOrganizationSyncRun(run *FeishuOrganizationSyncRun) error {
	_, err := ormer.Engine.Insert(run)
	return err
}

func (s defaultFeishuOrganizationSyncRunStore) UpdateFeishuOrganizationSyncRun(run *FeishuOrganizationSyncRun) error {
	_, err := ormer.Engine.ID(core.PK{run.Owner, run.Name}).AllCols().Update(run)
	return err
}

func (s defaultFeishuOrganizationSyncRunStore) GetFeishuOrganizationSyncRun(organization string, runId string) (*FeishuOrganizationSyncRun, error) {
	run := &FeishuOrganizationSyncRun{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("name = ?", runId).Get(run)
	if err != nil || !existed {
		return nil, err
	}
	return run, nil
}

func (s defaultFeishuOrganizationSyncRunStore) GetFeishuOrganizationSyncRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string) ([]*FeishuOrganizationSyncRun, error) {
	runs := []*FeishuOrganizationSyncRun{}
	err := getFeishuOrganizationSyncRunSession(offset, limit, field, value, sortField, sortOrder).Where("organization = ?", organization).Find(&runs)
	return runs, err
}

func (s defaultFeishuOrganizationSyncRunStore) GetFeishuOrganizationSyncRunCount(organization string, field string, value string) (int64, error) {
	return getFeishuOrganizationSyncRunSession(-1, -1, field, value, "", "").Where("organization = ?", organization).Count(&FeishuOrganizationSyncRun{})
}

func getFeishuOrganizationSyncRunSession(offset int, limit int, field string, value string, sortField string, sortOrder string) *xorm.Session {
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
