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
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/beego/beego/v2/core/logs"
	"github.com/robfig/cron/v3"
	"github.com/xorm-io/core"
)

const (
	OrganizationSyncProviderWeCom           = "wecom"
	OrganizationSyncProviderLark            = "lark"
	OrganizationSyncProviderDingTalk        = "dingtalk"
	OrganizationSyncJobTypeFullDifferential = "full-differential"

	OrganizationSyncDefaultCronExpression = "0 2 * * *"
	OrganizationSyncDefaultTimezone       = "Asia/Shanghai"
	OrganizationSyncDefaultLeaseDuration  = 5 * time.Minute
	OrganizationSyncDefaultScanInterval   = time.Minute
	OrganizationSyncScheduleLookback      = 48 * time.Hour

	OrganizationSyncScheduleFireErrorMissingExecutor = "missing_executor"
	OrganizationSyncScheduleFireErrorDispatchFailed  = "dispatch_failed"
	OrganizationSyncScheduleFireErrorAlreadyRunning  = "already_running"
	OrganizationSyncScheduleFireErrorSourceConflict  = "sync_source_conflict"
)

// OrganizationSyncScheduleFireStatus 表示调度 fire 的派发锁阶段或终态。
type OrganizationSyncScheduleFireStatus string

const (
	OrganizationSyncScheduleFireStatusAcquired    OrganizationSyncScheduleFireStatus = "acquired"
	OrganizationSyncScheduleFireStatusDispatching OrganizationSyncScheduleFireStatus = "dispatching"
	OrganizationSyncScheduleFireStatusDispatched  OrganizationSyncScheduleFireStatus = "dispatched"
	OrganizationSyncScheduleFireStatusSkipped     OrganizationSyncScheduleFireStatus = "skipped"
	OrganizationSyncScheduleFireStatusFailed      OrganizationSyncScheduleFireStatus = "failed"
)

// OrganizationSyncSchedule 保存 provider-neutral 的组织同步调度配置。
type OrganizationSyncSchedule struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	// Provider、JobType、Organization 构成调度身份，后续钉钉、飞书同步复用同一模型。
	Provider     string `xorm:"varchar(50) index unique(org_sync_schedule_identity)" json:"provider"`
	JobType      string `xorm:"varchar(100) index unique(org_sync_schedule_identity)" json:"jobType"`
	Organization string `xorm:"varchar(100) index unique(org_sync_schedule_identity)" json:"organization"`

	CronExpression string `xorm:"varchar(100)" json:"cronExpression"`
	Timezone       string `xorm:"varchar(100)" json:"timezone"`
	IsEnabled      bool   `xorm:"bool index" json:"isEnabled"`

	// Last* 字段是运维诊断用的最近派发摘要，不表示 provider 同步最终成功。
	LastFireAt    time.Time `xorm:"timestampz index" json:"lastFireAt"`
	LastRunId     string    `xorm:"varchar(100) index" json:"lastRunId"`
	LastStatus    string    `xorm:"varchar(50) index" json:"lastStatus"`
	LastErrorCode string    `xorm:"varchar(100)" json:"lastErrorCode"`
	LastErrorText string    `xorm:"text" json:"lastErrorText"`
}

// OrganizationSyncScheduleFire 记录一个调度窗口的派发锁和派发结果。
type OrganizationSyncScheduleFire struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	// ScheduleName + WindowStart 是集群唯一窗口键，保证同一窗口只有一个有效派发者。
	ScheduleName string    `xorm:"varchar(100) index unique(org_sync_schedule_fire_window)" json:"scheduleName"`
	Provider     string    `xorm:"varchar(50) index" json:"provider"`
	JobType      string    `xorm:"varchar(100) index" json:"jobType"`
	Organization string    `xorm:"varchar(100) index" json:"organization"`
	WindowStart  time.Time `xorm:"timestampz index unique(org_sync_schedule_fire_window)" json:"windowStart"`

	// Locked* 字段是跨节点派发租约；过期的非终态 fire 可被其它节点接管。
	LockedBy      string                                `xorm:"varchar(150) index" json:"lockedBy"`
	LockedAt      time.Time                             `xorm:"timestampz" json:"lockedAt"`
	LockExpiresAt time.Time                             `xorm:"timestampz index" json:"lockExpiresAt"`
	Status        OrganizationSyncScheduleFireStatus    `xorm:"varchar(50) index" json:"status"`
	RunId         string                                `xorm:"varchar(100) index" json:"runId"`
	ErrorCode     string                                `xorm:"varchar(100)" json:"errorCode"`
	ErrorText     string                                `xorm:"text" json:"errorText"`
	AttemptCount  int                                   `xorm:"int" json:"attemptCount"`
	Diagnostics   *FeishuOrganizationSyncRunDiagnostics `xorm:"-" json:"diagnostics,omitempty"`
}

// OrganizationSyncDispatchRequest 是通用调度器传给具体 provider executor 的派发上下文。
type OrganizationSyncDispatchRequest struct {
	Schedule    *OrganizationSyncSchedule
	WindowStart time.Time
	NodeID      string
	Actor       string
}

// OrganizationSyncDispatchResult 只描述派发结果；provider run 的最终同步结果由各自 run 表记录。
type OrganizationSyncDispatchResult struct {
	Status      OrganizationSyncScheduleFireStatus
	RunId       string
	ErrorCode   string
	ErrorText   string
	Diagnostics *FeishuOrganizationSyncRunDiagnostics
}

// OrganizationSyncExecutor 由具体 provider 实现，用于把已抢到的 fire 派发为实际同步任务。
type OrganizationSyncExecutor interface {
	ExecuteOrganizationSync(ctx context.Context, request OrganizationSyncDispatchRequest) (*OrganizationSyncDispatchResult, error)
}

// OrganizationSyncExecutorRegistry 按 provider + jobType 注册执行器；集群安全不依赖内存注册表。
type OrganizationSyncExecutorRegistry struct {
	mu        sync.RWMutex
	executors map[string]OrganizationSyncExecutor
}

// OrganizationSyncScheduleStore 隔离调度配置和 fire 锁的持久化实现。
type OrganizationSyncScheduleStore interface {
	GetOrganizationSyncSchedule(provider string, jobType string, organization string) (*OrganizationSyncSchedule, error)
	SaveOrganizationSyncSchedule(schedule *OrganizationSyncSchedule) (bool, error)
	GetEnabledOrganizationSyncSchedules() ([]*OrganizationSyncSchedule, error)
	AcquireOrganizationSyncScheduleFire(schedule *OrganizationSyncSchedule, windowStart time.Time, nodeID string, now time.Time, leaseDuration time.Duration) (*OrganizationSyncScheduleFire, bool, error)
	UpdateOrganizationSyncScheduleFire(fire *OrganizationSyncScheduleFire) error
	UpdateOrganizationSyncScheduleDispatchMetadata(schedule *OrganizationSyncSchedule, fire *OrganizationSyncScheduleFire) error
}

// OrganizationSyncScheduleService 负责调度配置默认值、校验和保存。
type OrganizationSyncScheduleService struct {
	Store OrganizationSyncScheduleStore
}

// OrganizationSyncScheduler 在每个节点本地扫描到期 schedule，真正的去重由持久化 fire 锁完成。
type OrganizationSyncScheduler struct {
	Store           OrganizationSyncScheduleStore
	Registry        *OrganizationSyncExecutorRegistry
	NodeID          string
	Now             func() time.Time
	LeaseDuration   time.Duration
	ScanInterval    time.Duration
	SensitiveValues []string
}

type defaultOrganizationSyncScheduleStore struct{}

var defaultOrganizationSyncExecutorRegistry = NewOrganizationSyncExecutorRegistry()

func NewOrganizationSyncExecutorRegistry() *OrganizationSyncExecutorRegistry {
	return &OrganizationSyncExecutorRegistry{executors: map[string]OrganizationSyncExecutor{}}
}

// RegisterOrganizationSyncExecutor 注册默认调度器使用的 provider executor。
func RegisterOrganizationSyncExecutor(provider string, jobType string, executor OrganizationSyncExecutor) {
	defaultOrganizationSyncExecutorRegistry.Register(provider, jobType, executor)
}

func (r *OrganizationSyncExecutorRegistry) Register(provider string, jobType string, executor OrganizationSyncExecutor) {
	if r == nil || executor == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.executors[organizationSyncScheduleIdentityKey(provider, jobType, "")] = executor
}

func (r *OrganizationSyncExecutorRegistry) Get(provider string, jobType string) OrganizationSyncExecutor {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.executors[organizationSyncScheduleIdentityKey(provider, jobType, "")]
}

// GetSchedule 返回已保存 schedule；不存在时返回默认关闭的虚拟配置。
func (s *OrganizationSyncScheduleService) GetSchedule(provider string, jobType string, organization string) (*OrganizationSyncSchedule, error) {
	provider = strings.TrimSpace(provider)
	jobType = strings.TrimSpace(jobType)
	organization = strings.TrimSpace(organization)
	schedule, err := s.store().GetOrganizationSyncSchedule(provider, jobType, organization)
	if err != nil {
		return nil, err
	}
	if schedule == nil {
		schedule = &OrganizationSyncSchedule{
			Provider:     provider,
			JobType:      jobType,
			Organization: organization,
		}
	}
	schedule.ApplyDefaults()
	return schedule, nil
}

// SaveSchedule 校验 cron/时区后保存通用调度配置。
func (s *OrganizationSyncScheduleService) SaveSchedule(schedule *OrganizationSyncSchedule) (*OrganizationSyncSchedule, error) {
	prepared, err := prepareOrganizationSyncSchedule(schedule)
	if err != nil {
		return nil, err
	}
	_, err = s.store().SaveOrganizationSyncSchedule(prepared)
	if err != nil {
		return nil, err
	}
	return prepared, nil
}

func (s *OrganizationSyncScheduleService) store() OrganizationSyncScheduleStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultOrganizationSyncScheduleStore{}
}

// ApplyDefaults 填充默认 cron、时区和稳定对象名；不会自动启用定时任务。
func (s *OrganizationSyncSchedule) ApplyDefaults() {
	if s == nil {
		return
	}
	s.Provider = strings.TrimSpace(s.Provider)
	s.JobType = strings.TrimSpace(s.JobType)
	s.Organization = strings.TrimSpace(s.Organization)
	s.CronExpression = strings.TrimSpace(s.CronExpression)
	s.Timezone = strings.TrimSpace(s.Timezone)
	if s.CronExpression == "" {
		s.CronExpression = OrganizationSyncDefaultCronExpression
	}
	if s.Timezone == "" {
		s.Timezone = OrganizationSyncDefaultTimezone
	}
	if s.Owner == "" {
		s.Owner = s.Organization
	}
	if s.Name == "" {
		s.Name = GetOrganizationSyncScheduleName(s.Provider, s.JobType, s.Organization)
	}
}

func prepareOrganizationSyncSchedule(schedule *OrganizationSyncSchedule) (*OrganizationSyncSchedule, error) {
	if schedule == nil {
		return nil, fmt.Errorf("organization sync schedule is required")
	}
	prepared := *schedule
	prepared.ApplyDefaults()
	if prepared.Provider == "" {
		return nil, fmt.Errorf("organization sync schedule provider is required")
	}
	if prepared.JobType == "" {
		return nil, fmt.Errorf("organization sync schedule job_type is required")
	}
	if prepared.Organization == "" {
		return nil, fmt.Errorf("organization sync schedule organization is required")
	}
	if _, err := cron.ParseStandard(prepared.CronExpression); err != nil {
		return nil, fmt.Errorf("invalid organization sync schedule cron: %w", err)
	}
	if _, err := time.LoadLocation(prepared.Timezone); err != nil {
		return nil, fmt.Errorf("invalid organization sync schedule timezone: %w", err)
	}
	return &prepared, nil
}

// RunOnce 扫描当前节点看到的启用 schedule；单个 schedule 失败不会阻断后续 schedule。
func (s *OrganizationSyncScheduler) RunOnce(ctx context.Context) error {
	store := s.store()
	schedules, err := store.GetEnabledOrganizationSyncSchedules()
	if err != nil {
		return err
	}
	for _, schedule := range schedules {
		if err := s.runSchedule(ctx, schedule); err != nil {
			logs.Warning(fmt.Sprintf("organization sync schedule %s dispatch failed: %v", schedule.Name, err))
		}
	}
	return nil
}

// Start 启动本地轻量 tick；集群安全仍由数据库 fire 唯一窗口和租约保证。
func (s *OrganizationSyncScheduler) Start(ctx context.Context) {
	interval := s.scanInterval()
	if interval <= 0 {
		interval = OrganizationSyncDefaultScanInterval
	}
	go func() {
		if err := s.RunOnce(ctx); err != nil {
			logs.Warning(fmt.Sprintf("organization sync scheduler initial scan failed: %v", err))
		}
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := s.RunOnce(ctx); err != nil {
					logs.Warning(fmt.Sprintf("organization sync scheduler scan failed: %v", err))
				}
			}
		}
	}()
}

// StartOrganizationSyncScheduler 在数据库表初始化后启动默认组织同步调度器。
func StartOrganizationSyncScheduler() {
	scheduler := &OrganizationSyncScheduler{
		Store:    defaultOrganizationSyncScheduleStore{},
		Registry: defaultOrganizationSyncExecutorRegistry,
		NodeID:   defaultOrganizationSyncSchedulerNodeID(),
	}
	scheduler.Start(context.Background())
}

func (s *OrganizationSyncScheduler) runSchedule(ctx context.Context, schedule *OrganizationSyncSchedule) error {
	prepared, err := prepareOrganizationSyncSchedule(schedule)
	if err != nil {
		return s.recordInvalidSchedule(schedule, err)
	}
	windowStart, due, err := getOrganizationSyncDueWindow(prepared, s.now())
	if err != nil {
		return s.recordInvalidSchedule(schedule, err)
	}
	if !due {
		return nil
	}

	fire, acquired, err := s.store().AcquireOrganizationSyncScheduleFire(prepared, windowStart, s.nodeID(), s.now(), s.leaseDuration())
	if err != nil {
		return err
	}
	if !acquired {
		return nil
	}

	fire.Status = OrganizationSyncScheduleFireStatusDispatching
	if err := s.store().UpdateOrganizationSyncScheduleFire(fire); err != nil {
		return err
	}

	executor := s.registry().Get(prepared.Provider, prepared.JobType)
	if executor == nil {
		fire.Status = OrganizationSyncScheduleFireStatusFailed
		fire.ErrorCode = OrganizationSyncScheduleFireErrorMissingExecutor
		fire.ErrorText = "organization sync executor is not registered"
		return s.finishFire(prepared, fire)
	}

	result, err := executor.ExecuteOrganizationSync(ctx, OrganizationSyncDispatchRequest{
		Schedule:    prepared,
		WindowStart: windowStart,
		NodeID:      s.nodeID(),
		Actor:       "scheduler:" + s.nodeID(),
	})
	if err != nil {
		fire.Status = OrganizationSyncScheduleFireStatusFailed
		fire.ErrorCode = OrganizationSyncScheduleFireErrorDispatchFailed
		fire.ErrorText = safeOrganizationSyncErrorText(err.Error(), s.SensitiveValues...)
		return s.finishFire(prepared, fire)
	}
	applyOrganizationSyncDispatchResult(fire, result)
	return s.finishFire(prepared, fire)
}

func (s *OrganizationSyncScheduler) recordInvalidSchedule(schedule *OrganizationSyncSchedule, cause error) error {
	if schedule == nil {
		return cause
	}
	schedule.ApplyDefaults()
	fire := &OrganizationSyncScheduleFire{
		ScheduleName: schedule.Name,
		Provider:     schedule.Provider,
		JobType:      schedule.JobType,
		Organization: schedule.Organization,
		WindowStart:  s.now(),
		Status:       OrganizationSyncScheduleFireStatusFailed,
		ErrorCode:    "invalid_schedule",
		ErrorText:    safeOrganizationSyncErrorText(cause.Error(), s.SensitiveValues...),
	}
	return s.store().UpdateOrganizationSyncScheduleDispatchMetadata(schedule, fire)
}

func (s *OrganizationSyncScheduler) finishFire(schedule *OrganizationSyncSchedule, fire *OrganizationSyncScheduleFire) error {
	if fire == nil {
		return nil
	}
	if fire.Provider == OrganizationSyncProviderLark && fire.Diagnostics == nil {
		fire.Diagnostics = BuildFeishuOrganizationSyncScheduleDiagnostics(fire, s.SensitiveValues...)
	}
	if err := s.store().UpdateOrganizationSyncScheduleFire(fire); err != nil {
		return err
	}
	return s.store().UpdateOrganizationSyncScheduleDispatchMetadata(schedule, fire)
}

func (s *OrganizationSyncScheduler) store() OrganizationSyncScheduleStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultOrganizationSyncScheduleStore{}
}

func (s *OrganizationSyncScheduler) registry() *OrganizationSyncExecutorRegistry {
	if s != nil && s.Registry != nil {
		return s.Registry
	}
	return defaultOrganizationSyncExecutorRegistry
}

func (s *OrganizationSyncScheduler) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s *OrganizationSyncScheduler) nodeID() string {
	if s != nil && strings.TrimSpace(s.NodeID) != "" {
		return strings.TrimSpace(s.NodeID)
	}
	return defaultOrganizationSyncSchedulerNodeID()
}

func (s *OrganizationSyncScheduler) leaseDuration() time.Duration {
	if s != nil && s.LeaseDuration > 0 {
		return s.LeaseDuration
	}
	return OrganizationSyncDefaultLeaseDuration
}

func (s *OrganizationSyncScheduler) scanInterval() time.Duration {
	if s != nil && s.ScanInterval > 0 {
		return s.ScanInterval
	}
	return OrganizationSyncDefaultScanInterval
}

func applyOrganizationSyncDispatchResult(fire *OrganizationSyncScheduleFire, result *OrganizationSyncDispatchResult) {
	if fire == nil {
		return
	}
	if result == nil {
		fire.Status = OrganizationSyncScheduleFireStatusDispatched
		return
	}
	status := result.Status
	if status == "" {
		status = OrganizationSyncScheduleFireStatusDispatched
	}
	if !isTerminalOrganizationSyncScheduleFireStatus(status) {
		status = OrganizationSyncScheduleFireStatusFailed
	}
	fire.Status = status
	fire.RunId = result.RunId
	fire.ErrorCode = result.ErrorCode
	fire.ErrorText = result.ErrorText
	fire.Diagnostics = result.Diagnostics
}

func getOrganizationSyncDueWindow(schedule *OrganizationSyncSchedule, now time.Time) (time.Time, bool, error) {
	if schedule == nil || !schedule.IsEnabled {
		return time.Time{}, false, nil
	}
	prepared, err := prepareOrganizationSyncSchedule(schedule)
	if err != nil {
		return time.Time{}, false, err
	}
	location, err := time.LoadLocation(prepared.Timezone)
	if err != nil {
		return time.Time{}, false, err
	}
	cronSchedule, err := cron.ParseStandard(prepared.CronExpression)
	if err != nil {
		return time.Time{}, false, err
	}

	localNow := now.In(location)
	cursor := localNow.Add(-OrganizationSyncScheduleLookback)
	var latest time.Time
	for {
		next := cronSchedule.Next(cursor)
		if next.After(localNow) {
			break
		}
		if !next.After(cursor) {
			return time.Time{}, false, fmt.Errorf("organization sync schedule cron did not advance")
		}
		latest = next
		cursor = next
	}
	if latest.IsZero() {
		return time.Time{}, false, nil
	}
	windowStart := latest.UTC().Truncate(time.Second)
	if !prepared.LastFireAt.IsZero() && !prepared.LastFireAt.Before(windowStart) {
		return time.Time{}, false, nil
	}
	return windowStart, true, nil
}

func isTerminalOrganizationSyncScheduleFireStatus(status OrganizationSyncScheduleFireStatus) bool {
	return status == OrganizationSyncScheduleFireStatusDispatched ||
		status == OrganizationSyncScheduleFireStatusSkipped ||
		status == OrganizationSyncScheduleFireStatusFailed
}

func safeOrganizationSyncErrorText(text string, sensitiveValues ...string) string {
	safeText := text
	for _, value := range sensitiveValues {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		safeText = strings.ReplaceAll(safeText, value, "***")
	}
	return sensitiveFieldPattern.ReplaceAllString(safeText, "$1***")
}

var sensitiveFieldPattern = regexp.MustCompile(`(?i)\b(secret\s*[=:]\s*|token\s*[=:]?\s+|password\s*[=:]\s*|credential\s*[=:]\s*|authorization\s*[:=]\s*)[^\s,;]+`)

// GetOrganizationSyncScheduleName 根据 provider/jobType/organization 生成稳定 schedule 对象名。
func GetOrganizationSyncScheduleName(provider string, jobType string, organization string) string {
	return "org-sync-schedule-" + shortOrganizationSyncHash(provider, jobType, organization)
}

// GetOrganizationSyncScheduleFireName 根据 schedule 和窗口生成稳定 fire 对象名。
func GetOrganizationSyncScheduleFireName(scheduleName string, windowStart time.Time) string {
	return "org-sync-fire-" + shortOrganizationSyncHash(scheduleName, windowStart.UTC().Format(time.RFC3339))
}

func organizationSyncScheduleIdentityKey(provider string, jobType string, organization string) string {
	return strings.TrimSpace(provider) + "\x1f" + strings.TrimSpace(jobType) + "\x1f" + strings.TrimSpace(organization)
}

func organizationSyncScheduleFireWindowKey(scheduleName string, windowStart time.Time) string {
	return strings.TrimSpace(scheduleName) + "\x1f" + windowStart.UTC().Format(time.RFC3339)
}

func shortOrganizationSyncHash(values ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(values, "\x1f")))
	return hex.EncodeToString(sum[:])[:24]
}

func defaultOrganizationSyncSchedulerNodeID() string {
	hostname, err := os.Hostname()
	if err != nil || hostname == "" {
		hostname = "unknown-host"
	}
	return fmt.Sprintf("%s:%d", hostname, os.Getpid())
}

func (s defaultOrganizationSyncScheduleStore) GetOrganizationSyncSchedule(provider string, jobType string, organization string) (*OrganizationSyncSchedule, error) {
	if ormer == nil || ormer.Engine == nil {
		return nil, nil
	}
	schedule := &OrganizationSyncSchedule{}
	existed, err := ormer.Engine.
		Where("provider = ?", strings.TrimSpace(provider)).
		And("job_type = ?", strings.TrimSpace(jobType)).
		And("organization = ?", strings.TrimSpace(organization)).
		Get(schedule)
	if err != nil || !existed {
		return nil, err
	}
	return schedule, nil
}

func (s defaultOrganizationSyncScheduleStore) SaveOrganizationSyncSchedule(schedule *OrganizationSyncSchedule) (bool, error) {
	prepared, err := prepareOrganizationSyncSchedule(schedule)
	if err != nil {
		return false, err
	}
	if ormer == nil || ormer.Engine == nil {
		return false, nil
	}

	existing, err := s.GetOrganizationSyncSchedule(prepared.Provider, prepared.JobType, prepared.Organization)
	if err != nil {
		return false, err
	}
	if existing == nil {
		affected, err := ormer.Engine.Insert(prepared)
		return affected != 0, err
	}

	prepared.Owner = existing.Owner
	prepared.Name = existing.Name
	if prepared.CreatedAt.IsZero() {
		prepared.CreatedAt = existing.CreatedAt
	}
	// 管理员编辑 cron/时区/启用状态时，不应清空最近派发审计信息。
	prepared.LastFireAt = existing.LastFireAt
	prepared.LastRunId = existing.LastRunId
	prepared.LastStatus = existing.LastStatus
	prepared.LastErrorCode = existing.LastErrorCode
	prepared.LastErrorText = existing.LastErrorText
	affected, err := ormer.Engine.ID(core.PK{prepared.Owner, prepared.Name}).AllCols().Update(prepared)
	return affected != 0, err
}

func (s defaultOrganizationSyncScheduleStore) GetEnabledOrganizationSyncSchedules() ([]*OrganizationSyncSchedule, error) {
	schedules := []*OrganizationSyncSchedule{}
	if ormer == nil || ormer.Engine == nil {
		return schedules, nil
	}
	err := ormer.Engine.Where("is_enabled = ?", true).Find(&schedules)
	return schedules, err
}

func (s defaultOrganizationSyncScheduleStore) AcquireOrganizationSyncScheduleFire(schedule *OrganizationSyncSchedule, windowStart time.Time, nodeID string, now time.Time, leaseDuration time.Duration) (*OrganizationSyncScheduleFire, bool, error) {
	if schedule == nil {
		return nil, false, fmt.Errorf("organization sync schedule is required")
	}
	if ormer == nil || ormer.Engine == nil {
		return nil, false, nil
	}

	fire := newOrganizationSyncScheduleFire(schedule, windowStart, nodeID, now, leaseDuration)
	session := ormer.Engine.NewSession()
	if err := session.Begin(); err != nil {
		session.Close()
		return nil, false, err
	}
	if _, err := session.Insert(fire); err == nil {
		if err := session.Commit(); err != nil {
			session.Close()
			return nil, false, err
		}
		session.Close()
		return fire, true, nil
	}
	_ = session.Rollback()
	session.Close()

	session = ormer.Engine.NewSession()
	defer session.Close()
	if err := session.Begin(); err != nil {
		return nil, false, err
	}
	existing := &OrganizationSyncScheduleFire{}
	existed, err := session.
		Where("schedule_name = ?", schedule.Name).
		And("window_start = ?", windowStart.UTC()).
		ForUpdate().
		Get(existing)
	if err != nil {
		_ = session.Rollback()
		return nil, false, err
	}
	if !existed {
		_ = session.Rollback()
		return nil, false, fmt.Errorf("organization sync schedule fire insert failed and existing fire was not found")
	}
	if isTerminalOrganizationSyncScheduleFireStatus(existing.Status) || existing.LockExpiresAt.After(now) {
		_ = session.Rollback()
		return existing, false, nil
	}

	existing.Status = OrganizationSyncScheduleFireStatusAcquired
	existing.LockedBy = nodeID
	existing.LockedAt = now.UTC()
	existing.LockExpiresAt = now.UTC().Add(leaseDuration)
	existing.AttemptCount++
	existing.RunId = ""
	existing.ErrorCode = ""
	existing.ErrorText = ""
	if _, err := session.ID(core.PK{existing.Owner, existing.Name}).AllCols().Update(existing); err != nil {
		_ = session.Rollback()
		return nil, false, err
	}
	if err := session.Commit(); err != nil {
		return nil, false, err
	}
	return existing, true, nil
}

func (s defaultOrganizationSyncScheduleStore) UpdateOrganizationSyncScheduleFire(fire *OrganizationSyncScheduleFire) error {
	if fire == nil || ormer == nil || ormer.Engine == nil {
		return nil
	}
	_, err := ormer.Engine.ID(core.PK{fire.Owner, fire.Name}).AllCols().Update(fire)
	return err
}

func (s defaultOrganizationSyncScheduleStore) UpdateOrganizationSyncScheduleDispatchMetadata(schedule *OrganizationSyncSchedule, fire *OrganizationSyncScheduleFire) error {
	if schedule == nil || fire == nil || ormer == nil || ormer.Engine == nil {
		return nil
	}
	update := &OrganizationSyncSchedule{
		LastFireAt:    fire.WindowStart,
		LastRunId:     fire.RunId,
		LastStatus:    string(fire.Status),
		LastErrorCode: fire.ErrorCode,
		LastErrorText: fire.ErrorText,
	}
	_, err := ormer.Engine.ID(core.PK{schedule.Owner, schedule.Name}).Cols("last_fire_at", "last_run_id", "last_status", "last_error_code", "last_error_text").Update(update)
	return err
}

func newOrganizationSyncScheduleFire(schedule *OrganizationSyncSchedule, windowStart time.Time, nodeID string, now time.Time, leaseDuration time.Duration) *OrganizationSyncScheduleFire {
	return &OrganizationSyncScheduleFire{
		Owner:         schedule.Organization,
		Name:          GetOrganizationSyncScheduleFireName(schedule.Name, windowStart),
		ScheduleName:  schedule.Name,
		Provider:      schedule.Provider,
		JobType:       schedule.JobType,
		Organization:  schedule.Organization,
		WindowStart:   windowStart.UTC(),
		Status:        OrganizationSyncScheduleFireStatusAcquired,
		LockedBy:      nodeID,
		LockedAt:      now.UTC(),
		LockExpiresAt: now.UTC().Add(leaseDuration),
		AttemptCount:  1,
	}
}
