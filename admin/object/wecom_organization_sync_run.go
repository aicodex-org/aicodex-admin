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
	"fmt"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/xorm-io/core"
	"github.com/xorm-io/xorm"
)

// WecomOrganizationSyncStartRunResult 暴露本次创建的 run，以及是否恢复过过期 running。
// 接口层需要把 stale 恢复展示给管理员，但不能把旧 run 当作完整同步结果继续处理。
type WecomOrganizationSyncStartRunResult struct {
	Run      *WecomOrganizationSyncRun `json:"run"`
	StaleRun *WecomOrganizationSyncRun `json:"staleRun,omitempty"`
	// Config 是创建 run 时锁定的配置快照，仅供后台任务使用，不能通过 API 返回。
	Config *WecomOrganizationSyncConfig `json:"-"`
}

type defaultWecomOrganizationSyncRunStore struct{}

// StartManualRunWithResult 在创建新 run 的同时返回 stale running 恢复结果，供 API 明确提示。
func (s *WecomOrganizationSyncService) StartManualRunWithResult(config *WecomOrganizationSyncConfig, actor string) (*WecomOrganizationSyncStartRunResult, error) {
	return s.startRunWithResult(config, actor, WecomOrganizationSyncTriggerManual)
}

// StartScheduledRunWithResult 创建调度器触发的 run，触发来源写入 scheduled 便于审计。
func (s *WecomOrganizationSyncService) StartScheduledRunWithResult(config *WecomOrganizationSyncConfig, actor string) (*WecomOrganizationSyncStartRunResult, error) {
	return s.startRunWithResult(config, actor, WecomOrganizationSyncTriggerScheduled)
}

func (s *WecomOrganizationSyncService) startRunWithResult(config *WecomOrganizationSyncConfig, actor string, triggerType WecomOrganizationSyncTriggerType) (*WecomOrganizationSyncStartRunResult, error) {
	if err := validateWecomOrganizationSyncRunExecutionConfig(config); err != nil {
		return nil, err
	}
	if err := (&OrganizationDirectorySourceStatusService{
		FeishuConfigStore: s.feishuConfigStore(),
	}).RequireExecutionAllowedWithSourceSummary(config.Organization, OrganizationDirectorySourceWeCom, newWecomOrganizationDirectorySourceSummary(config)); err != nil {
		return nil, err
	}
	if err := s.ensureWecomBusinessOrganizationForConfig(config); err != nil {
		return nil, err
	}

	store := s.runStore()
	if startStore, ok := store.(WecomOrganizationSyncRunTriggerStartStore); ok {
		return startStore.StartWecomOrganizationSyncRunWithTrigger(config, actor, triggerType, s.now().UTC(), s.leaseDuration())
	}
	if startStore, ok := store.(WecomOrganizationSyncRunStartStore); ok {
		if triggerType != "" && triggerType != WecomOrganizationSyncTriggerManual {
			return s.startRunWithStore(store, config, actor, triggerType)
		}
		return startStore.StartWecomOrganizationSyncRun(config, actor, s.now().UTC(), s.leaseDuration())
	}
	return s.startRunWithStore(store, config, actor, triggerType)
}

func (s *WecomOrganizationSyncService) GetRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string, sensitiveValues ...string) ([]*WecomOrganizationSyncRun, int64, error) {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return nil, 0, fmt.Errorf("wecom organization sync organization is required")
	}

	count, err := s.GetRunCount(organization, field, value)
	if err != nil {
		return nil, 0, err
	}
	runs, err := s.runStore().GetWecomOrganizationSyncRuns(organization, offset, limit, field, value, sortField, sortOrder)
	if err != nil {
		return nil, 0, err
	}
	return GetMaskedWecomOrganizationSyncRuns(runs, sensitiveValues...), count, nil
}

func (s *WecomOrganizationSyncService) GetRun(organization string, runId string, sensitiveValues ...string) (*WecomOrganizationSyncRun, error) {
	organization = strings.TrimSpace(organization)
	runId = strings.TrimSpace(runId)
	if organization == "" {
		return nil, fmt.Errorf("wecom organization sync organization is required")
	}
	if runId == "" {
		return nil, fmt.Errorf("wecom organization sync run_id is required")
	}

	run, err := s.runStore().GetWecomOrganizationSyncRun(organization, runId)
	if err != nil {
		return nil, err
	}
	return GetMaskedWecomOrganizationSyncRun(run, sensitiveValues...), nil
}

func (s *WecomOrganizationSyncService) GetRunCount(organization string, field string, value string) (int64, error) {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return 0, fmt.Errorf("wecom organization sync organization is required")
	}
	return s.runStore().GetWecomOrganizationSyncRunCount(organization, field, value)
}

func GetMaskedWecomOrganizationSyncRun(run *WecomOrganizationSyncRun, sensitiveValues ...string) *WecomOrganizationSyncRun {
	if run == nil {
		return nil
	}

	maskedRun := *run
	maskedRun.ErrorText = maskWecomOrganizationSyncText(maskedRun.ErrorText, sensitiveValues...)
	return &maskedRun
}

func GetMaskedWecomOrganizationSyncRuns(runs []*WecomOrganizationSyncRun, sensitiveValues ...string) []*WecomOrganizationSyncRun {
	maskedRuns := make([]*WecomOrganizationSyncRun, 0, len(runs))
	for _, run := range runs {
		maskedRuns = append(maskedRuns, GetMaskedWecomOrganizationSyncRun(run, sensitiveValues...))
	}
	return maskedRuns
}

func maskWecomOrganizationSyncText(text string, sensitiveValues ...string) string {
	for _, value := range sensitiveValues {
		value = strings.TrimSpace(value)
		if value == "" || value == WecomOrganizationSyncMaskedSecret {
			continue
		}
		text = strings.ReplaceAll(text, value, WecomOrganizationSyncMaskedSecret)
	}
	return text
}

func (s *WecomOrganizationSyncService) runStore() WecomOrganizationSyncRunStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultWecomOrganizationSyncRunStore{}
}

func (s defaultWecomOrganizationSyncRunStore) GetRunningWecomOrganizationSyncRun(organization string) (*WecomOrganizationSyncRun, error) {
	run := &WecomOrganizationSyncRun{}
	existed, err := ormer.Engine.
		Where("organization = ?", organization).
		And("status = ?", WecomOrganizationSyncRunStatusRunning).
		Desc("started_at").
		Get(run)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return run, nil
}

// StartWecomOrganizationSyncRun 在数据库事务内创建 running 记录。
// 这里用目标组织的配置行做行级锁，保证同组织手动同步启动请求串行执行。
func (s defaultWecomOrganizationSyncRunStore) StartWecomOrganizationSyncRun(config *WecomOrganizationSyncConfig, actor string, now time.Time, leaseDuration time.Duration) (*WecomOrganizationSyncStartRunResult, error) {
	return s.StartWecomOrganizationSyncRunWithTrigger(config, actor, WecomOrganizationSyncTriggerManual, now, leaseDuration)
}

// StartWecomOrganizationSyncRunWithTrigger 在数据库事务内创建带触发来源的 running 记录。
// 这里用目标组织的配置行做行级锁，保证同组织同步启动请求串行执行。
func (s defaultWecomOrganizationSyncRunStore) StartWecomOrganizationSyncRunWithTrigger(config *WecomOrganizationSyncConfig, actor string, triggerType WecomOrganizationSyncTriggerType, now time.Time, leaseDuration time.Duration) (*WecomOrganizationSyncStartRunResult, error) {
	if triggerType == "" {
		triggerType = WecomOrganizationSyncTriggerManual
	}
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

	// 锁住目标组织配置行，串行化同组织启动请求，避免“先查 running 再插入”的并发窗口。
	lockedConfig := &WecomOrganizationSyncConfig{}
	existed, err := session.Where("organization = ?", config.Organization).ForUpdate().Get(lockedConfig)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, fmt.Errorf("wecom organization sync config is not configured")
	}
	if !lockedConfig.IsEnabled {
		return nil, fmt.Errorf("wecom organization sync config is disabled")
	}
	if err := validateWecomOrganizationSyncRunExecutionConfig(lockedConfig); err != nil {
		return nil, err
	}

	// running 记录也在同一事务内检查和更新，避免并发请求同时通过“无 running”判断。
	runningRun := &WecomOrganizationSyncRun{}
	existed, err = session.
		Where("organization = ?", config.Organization).
		And("status = ?", WecomOrganizationSyncRunStatusRunning).
		Desc("started_at").
		ForUpdate().
		Get(runningRun)
	if err != nil {
		return nil, err
	}

	var staleRun *WecomOrganizationSyncRun
	if existed {
		if runningRun.LeaseExpiresAt.IsZero() || runningRun.LeaseExpiresAt.After(now) {
			return nil, ErrWecomOrganizationSyncRunAlreadyRunning
		}
		prepareStaleWecomOrganizationSyncRunFailed(runningRun, now)
		if _, err := session.ID(core.PK{runningRun.Owner, runningRun.Name}).AllCols().Update(runningRun); err != nil {
			return nil, err
		}
		staleRun = runningRun
	}

	// run 记录使用已锁定的配置快照，避免调用方传入的旧配置值污染执行记录。
	run := &WecomOrganizationSyncRun{
		Owner:          lockedConfig.Organization,
		Name:           fmt.Sprintf("wecom-sync-run-%d", now.UnixNano()),
		Organization:   lockedConfig.Organization,
		ConfigName:     lockedConfig.Name,
		CorpId:         lockedConfig.CorpId,
		TriggerType:    triggerType,
		Actor:          actor,
		Status:         WecomOrganizationSyncRunStatusRunning,
		Stage:          WecomOrganizationSyncRunStageFetching,
		StartedAt:      now,
		HeartbeatAt:    now,
		LeaseExpiresAt: now.Add(leaseDuration),
	}
	if _, err := session.Insert(run); err != nil {
		return nil, err
	}
	if err := session.Commit(); err != nil {
		return nil, err
	}
	committed = true
	lockedConfigSnapshot := *lockedConfig
	return &WecomOrganizationSyncStartRunResult{Run: run, StaleRun: staleRun, Config: &lockedConfigSnapshot}, nil
}

func (s defaultWecomOrganizationSyncRunStore) CreateWecomOrganizationSyncRun(run *WecomOrganizationSyncRun) error {
	_, err := ormer.Engine.Insert(run)
	return err
}

func (s defaultWecomOrganizationSyncRunStore) UpdateWecomOrganizationSyncRun(run *WecomOrganizationSyncRun) error {
	_, err := ormer.Engine.ID(core.PK{run.Owner, run.Name}).AllCols().Update(run)
	return err
}

func (s defaultWecomOrganizationSyncRunStore) GetWecomOrganizationSyncRun(organization string, runId string) (*WecomOrganizationSyncRun, error) {
	run := &WecomOrganizationSyncRun{}
	existed, err := ormer.Engine.
		Where("organization = ?", organization).
		And("name = ?", runId).
		Get(run)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return run, nil
}

func (s defaultWecomOrganizationSyncRunStore) GetWecomOrganizationSyncRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string) ([]*WecomOrganizationSyncRun, error) {
	runs := []*WecomOrganizationSyncRun{}
	err := getWecomOrganizationSyncRunSession(offset, limit, field, value, sortField, sortOrder).
		Where("organization = ?", organization).
		Find(&runs)
	if err != nil {
		return nil, err
	}
	return runs, nil
}

func (s defaultWecomOrganizationSyncRunStore) GetWecomOrganizationSyncRunCount(organization string, field string, value string) (int64, error) {
	return getWecomOrganizationSyncRunSession(-1, -1, field, value, "", "").
		Where("organization = ?", organization).
		Count(&WecomOrganizationSyncRun{})
}

func getWecomOrganizationSyncRunSession(offset int, limit int, field string, value string, sortField string, sortOrder string) *xorm.Session {
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
