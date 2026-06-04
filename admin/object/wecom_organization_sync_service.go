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
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/beego/beego/v2/core/logs"
	"github.com/xorm-io/core"
)

const (
	WecomOrganizationSyncDefaultLeaseDuration  = 30 * time.Minute
	WecomOrganizationSyncErrorCodeStaleRunning = "stale_running"

	WecomDepartmentGroupType          = "wecom-department"
	WecomDepartmentGroupNamePrefix    = "wecom-dept-"
	WecomDepartmentMappingNamePrefix  = "wecom-dept-map-"
	WecomUserNamePrefix               = "wecom-user-"
	WecomUserMappingNamePrefix        = "wecom-user-map-"
	WecomUserExternalIdMaxLength      = 100
	WecomUserPropertyCorpId           = "wecomCorpId"
	WecomUserPropertyUserId           = "wecomUserId"
	WecomUserPropertyOpenUserId       = "wecomOpenUserId"
	WecomUserPropertyAlias            = "wecomAlias"
	WecomUserPropertyBizMail          = "wecomBizMail"
	WecomUserPropertyMainDepartmentId = "wecomMainDepartmentId"
	WecomUserPropertyStatus           = "wecomStatus"
)

var ErrWecomOrganizationSyncRunAlreadyRunning = errors.New("wecom organization sync run already running")

// WecomOrganizationSyncRunStore 隔离同步执行记录的持久化细节。
type WecomOrganizationSyncRunStore interface {
	GetRunningWecomOrganizationSyncRun(organization string) (*WecomOrganizationSyncRun, error)
	CreateWecomOrganizationSyncRun(run *WecomOrganizationSyncRun) error
	UpdateWecomOrganizationSyncRun(run *WecomOrganizationSyncRun) error
	GetWecomOrganizationSyncRun(organization string, runId string) (*WecomOrganizationSyncRun, error)
	GetWecomOrganizationSyncRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string) ([]*WecomOrganizationSyncRun, error)
	GetWecomOrganizationSyncRunCount(organization string, field string, value string) (int64, error)
}

// WecomOrganizationSyncRunStartStore 可选实现事务化运行锁，默认数据库仓储用它收紧并发窗口。
type WecomOrganizationSyncRunStartStore interface {
	StartWecomOrganizationSyncRun(config *WecomOrganizationSyncConfig, actor string, now time.Time, leaseDuration time.Duration) (*WecomOrganizationSyncStartRunResult, error)
}

// WecomOrganizationSyncConfigLastSyncStore 写回配置上的最近成功同步信息，供后台配置页展示和排障。
type WecomOrganizationSyncConfigLastSyncStore interface {
	UpdateWecomOrganizationSyncConfigLastSync(config *WecomOrganizationSyncConfig, run *WecomOrganizationSyncRun, syncedAt time.Time) error
}

// WecomOrganizationSyncRunStats 是一次同步执行可展示的统计和安全错误摘要。
// 这里不承载原始外部 API 响应，避免把 Secret、手机号等敏感信息写入运行记录。
type WecomOrganizationSyncRunStats struct {
	DepartmentFetchedCount   int
	DepartmentCreatedCount   int
	DepartmentUpdatedCount   int
	DepartmentDisabledCount  int
	UserFetchedCount         int
	UserCreatedCount         int
	UserUpdatedCount         int
	UserDisabledCount        int
	MembershipUpdatedCount   int
	ManagerUpdatedCount      int
	DirectLeaderUpdatedCount int
	ErrorCode                string
	ErrorText                string
}

// WecomOrganizationObjectStore 隔离 Group/User 和企业微信映射表的落库细节。
// 同步服务只依赖稳定身份查询与保存能力，便于后续把事务边界收口到仓储层。
type WecomOrganizationObjectStore interface {
	GetGroup(owner string, name string) (*Group, error)
	SaveGroup(group *Group) error
	GetWecomDepartmentMapping(organization string, corpId string, departmentId string) (*WecomDepartmentMapping, error)
	SaveWecomDepartmentMapping(mapping *WecomDepartmentMapping) error

	FindUserByWecomIdentity(organization string, corpId string, wecomUserId string, fullExternalId string) (*User, error)
	FindPossibleDuplicateUsers(organization string, corpId string, wecomUserId string, fullExternalId string, displayName string, phone string, email string) ([]string, error)
	GetUser(owner string, name string) (*User, error)
	SaveUser(user *User) error
	SaveUserGroups(user *User) error
	GetWecomUserMapping(organization string, corpId string, wecomUserId string) (*WecomUserMapping, error)
	SaveWecomUserMapping(mapping *WecomUserMapping) error
	GetWecomUserDepartment(organization string, corpId string, wecomUserId string, departmentId string) (*WecomUserDepartment, error)
	SaveWecomUserDepartment(membership *WecomUserDepartment) error
	GetWecomDepartmentLeader(organization string, corpId string, departmentId string, leaderWecomUserId string) (*WecomDepartmentLeader, error)
	SaveWecomDepartmentLeader(leader *WecomDepartmentLeader) error
	GetWecomUserDirectLeader(organization string, corpId string, wecomUserId string, leaderWecomUserId string) (*WecomUserDirectLeader, error)
	SaveWecomUserDirectLeader(leader *WecomUserDirectLeader) error
	SaveSourceConnection(connection *SourceConnection) error
	SavePlatformDepartment(department *PlatformDepartment) error
	SavePlatformUser(user *PlatformUser) error
	SavePlatformMembership(membership *PlatformMembership) error
	SaveExternalIdentity(identity *ExternalIdentity) error
	SaveLifecycleEvent(event *LifecycleEvent) error
	SaveOrgSyncBatch(batch *OrgSyncBatch) error
	GetWecomOrganizationSyncExistingState(organization string, corpId string) (*WecomOrganizationSyncExistingState, error)
}

// WecomOrganizationSyncService 编排运行锁、快照拉取、差异计划和后续落库步骤。
type WecomOrganizationSyncService struct {
	Store             WecomOrganizationSyncRunStore
	ConfigStore       WecomOrganizationSyncConfigLastSyncStore
	ObjectStore       WecomOrganizationObjectStore
	OrganizationStore WecomBusinessOrganizationStore
	Now               func() time.Time
	LeaseDuration     time.Duration
	SyncTimeout       time.Duration
	NewSnapshotClient func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient
}

// defaultWecomOrganizationObjectStore 是当前同步服务的 Xorm 默认实现。
// 它只封装对象读写细节；后续如果需要批量事务，应优先在该仓储层收口。
type defaultWecomOrganizationObjectStore struct{}

// WecomOrganizationSnapshotClient 向同步服务提供规范化企业微信快照，避免暴露具体 API 路径。
type WecomOrganizationSnapshotClient interface {
	GetAccessToken(ctx context.Context) (*WecomAccessToken, error)
	FetchDepartmentSnapshots(ctx context.Context, accessToken string, departmentId string) ([]WecomDepartmentSnapshot, error)
	FetchUserSnapshots(ctx context.Context, accessToken string) ([]WecomUserSnapshot, error)
}

// WecomOrganizationFullSnapshot 分离保存部门、成员、成员部门、部门负责人和直属上级关系。
type WecomOrganizationFullSnapshot struct {
	Departments       []WecomDepartmentSnapshot
	Users             []WecomUserSnapshot
	UserDepartments   []WecomSnapshotUserDepartment
	DepartmentLeaders []WecomSnapshotDepartmentLeader
	DirectLeaders     []WecomSnapshotDirectLeader
}

// WecomSnapshotUserDepartment 表示一条企业微信成员部门关系。
type WecomSnapshotUserDepartment struct {
	WecomUserId  string
	DepartmentId string
	IsMain       bool
	IsLeader     bool
}

// WecomSnapshotDepartmentLeader 表示一条明确的企业微信部门负责人关系。
type WecomSnapshotDepartmentLeader struct {
	DepartmentId      string
	LeaderWecomUserId string
	IsPrimary         bool
}

// WecomSnapshotDirectLeader 表示一条明确的企业微信直属上级关系。
type WecomSnapshotDirectLeader struct {
	WecomUserId       string
	LeaderWecomUserId string
}

// WecomOrganizationSyncExistingState 保存用于生成差异计划的既有企业微信来源记录。
type WecomOrganizationSyncExistingState struct {
	Departments       []WecomDepartmentMapping
	Users             []WecomUserMapping
	UserDepartments   []WecomUserDepartment
	DepartmentLeaders []WecomDepartmentLeader
	DirectLeaders     []WecomUserDirectLeader
}

// WecomOrganizationSyncPlan 是内存差异计划；执行计划时只能 upsert 或软禁用，不能清空重建。
type WecomOrganizationSyncPlan struct {
	Organization string
	CorpId       string
	RunId        string

	DepartmentUpserts        []WecomDepartmentSnapshot
	DepartmentDisables       []WecomDepartmentMapping
	UserUpserts              []WecomUserSnapshot
	UserDisables             []WecomUserMapping
	UserDepartmentUpserts    []WecomSnapshotUserDepartment
	UserDepartmentDisables   []WecomUserDepartment
	DepartmentLeaderUpserts  []WecomSnapshotDepartmentLeader
	DepartmentLeaderDisables []WecomDepartmentLeader
	DirectLeaderUpserts      []WecomSnapshotDirectLeader
	DirectLeaderDisables     []WecomUserDirectLeader
}

// StartManualRun 在校验组织维度租约后创建 running 同步记录。
// 过期 running 记录只能先标记为失败，不能作为完整快照参与缺失数据软禁用。
func (s *WecomOrganizationSyncService) StartManualRun(config *WecomOrganizationSyncConfig, actor string) (*WecomOrganizationSyncRun, error) {
	result, err := s.StartManualRunWithResult(config, actor)
	if err != nil {
		return nil, err
	}
	return result.Run, nil
}

func (s *WecomOrganizationSyncService) startManualRunWithStore(store WecomOrganizationSyncRunStore, config *WecomOrganizationSyncConfig, actor string) (*WecomOrganizationSyncStartRunResult, error) {
	if err := validateWecomOrganizationSyncRunExecutionConfig(config); err != nil {
		return nil, err
	}

	now := s.now().UTC()
	runningRun, err := store.GetRunningWecomOrganizationSyncRun(config.Organization)
	if err != nil {
		return nil, err
	}
	var staleRun *WecomOrganizationSyncRun
	if runningRun != nil {
		if runningRun.LeaseExpiresAt.IsZero() || runningRun.LeaseExpiresAt.After(now) {
			return nil, ErrWecomOrganizationSyncRunAlreadyRunning
		}
		if err := s.markStaleRunFailed(runningRun, now); err != nil {
			return nil, err
		}
		staleRun = runningRun
	}

	run := &WecomOrganizationSyncRun{
		Owner:          config.Organization,
		Name:           fmt.Sprintf("wecom-sync-run-%d", now.UnixNano()),
		Organization:   config.Organization,
		ConfigName:     config.Name,
		CorpId:         config.CorpId,
		TriggerType:    WecomOrganizationSyncTriggerManual,
		Actor:          actor,
		Status:         WecomOrganizationSyncRunStatusRunning,
		Stage:          WecomOrganizationSyncRunStageFetching,
		StartedAt:      now,
		HeartbeatAt:    now,
		LeaseExpiresAt: now.Add(s.leaseDuration()),
	}
	if err := store.CreateWecomOrganizationSyncRun(run); err != nil {
		return nil, err
	}
	configSnapshot := *config
	return &WecomOrganizationSyncStartRunResult{Run: run, StaleRun: staleRun, Config: &configSnapshot}, nil
}

func (s *WecomOrganizationSyncService) markStaleRunFailed(run *WecomOrganizationSyncRun, now time.Time) error {
	prepareStaleWecomOrganizationSyncRunFailed(run, now)
	return s.runStore().UpdateWecomOrganizationSyncRun(run)
}

func prepareStaleWecomOrganizationSyncRunFailed(run *WecomOrganizationSyncRun, now time.Time) {
	run.Status = WecomOrganizationSyncRunStatusFailed
	run.Stage = WecomOrganizationSyncRunStageFinalizing
	run.FinishedAt = now
	run.UpdatedAt = now
	run.ErrorCode = WecomOrganizationSyncErrorCodeStaleRunning
	run.ErrorText = "previous running WeCom organization sync lease expired"
}

// UpdateRunStage 刷新 running 同步记录的阶段、心跳和租约。
// 长耗时同步每完成一个关键阶段前后都应调用它，便于后续识别 stale running。
func (s *WecomOrganizationSyncService) UpdateRunStage(run *WecomOrganizationSyncRun, stage WecomOrganizationSyncRunStage) error {
	if err := s.requireRunStoreAndRun(run); err != nil {
		return err
	}

	now := s.now().UTC()
	run.Status = WecomOrganizationSyncRunStatusRunning
	run.Stage = stage
	run.HeartbeatAt = now
	run.LeaseExpiresAt = now.Add(s.leaseDuration())
	run.UpdatedAt = now
	return s.runStore().UpdateWecomOrganizationSyncRun(run)
}

// FinishRunSucceeded 将同步执行记录置为完整成功终态。
func (s *WecomOrganizationSyncService) FinishRunSucceeded(run *WecomOrganizationSyncRun) error {
	if err := s.requireRunStoreAndRun(run); err != nil {
		return err
	}

	now := s.now().UTC()
	run.Status = WecomOrganizationSyncRunStatusSucceeded
	run.Stage = WecomOrganizationSyncRunStageFinalizing
	run.FinishedAt = now
	run.HeartbeatAt = now
	run.UpdatedAt = now
	run.ErrorCode = ""
	run.ErrorText = ""
	if err := s.runStore().UpdateWecomOrganizationSyncRun(run); err != nil {
		return err
	}
	return s.projectWecomOrgSyncBatch(run)
}

// FinishRunFailed 将同步执行记录置为失败终态。
// errorText 必须由调用方传入已脱敏、可展示给管理员的安全摘要。
func (s *WecomOrganizationSyncService) FinishRunFailed(run *WecomOrganizationSyncRun, stage WecomOrganizationSyncRunStage, errorCode string, errorText string) error {
	if err := s.requireRunStoreAndRun(run); err != nil {
		return err
	}

	now := s.now().UTC()
	run.Status = WecomOrganizationSyncRunStatusFailed
	run.Stage = stage
	run.FinishedAt = now
	run.HeartbeatAt = now
	run.UpdatedAt = now
	run.ErrorCode = errorCode
	run.ErrorText = errorText
	if err := s.runStore().UpdateWecomOrganizationSyncRun(run); err != nil {
		return err
	}
	return s.projectWecomOrgSyncBatch(run)
}

// FinishRunPartial 将同步执行记录置为部分失败终态。
// partial 不能作为完整快照执行缺失数据软禁用，调用方需要在编排层控制。
func (s *WecomOrganizationSyncService) FinishRunPartial(run *WecomOrganizationSyncRun, errorCode string, errorText string) error {
	if err := s.requireRunStoreAndRun(run); err != nil {
		return err
	}

	now := s.now().UTC()
	run.Status = WecomOrganizationSyncRunStatusPartial
	run.Stage = WecomOrganizationSyncRunStageFinalizing
	run.FinishedAt = now
	run.HeartbeatAt = now
	run.UpdatedAt = now
	run.ErrorCode = errorCode
	run.ErrorText = errorText
	if err := s.runStore().UpdateWecomOrganizationSyncRun(run); err != nil {
		return err
	}
	return s.projectWecomOrgSyncBatch(run)
}

// FinalizeRun 根据同步终态统一收口运行记录和缺失数据软禁用策略。
// 只有 succeeded 代表完整快照可信，才能执行缺失数据软禁用；failed/partial 只记录执行结果。
func (s *WecomOrganizationSyncService) FinalizeRun(run *WecomOrganizationSyncRun, plan *WecomOrganizationSyncPlan, status WecomOrganizationSyncRunStatus, errorCode string, errorText string) error {
	return s.FinalizeRunWithOptions(run, plan, status, errorCode, errorText, true)
}

// FinalizeRunWithOptions 让同步编排显式传入是否执行缺失数据软禁用。
// 旧调用默认保持“成功后软禁用”的兼容语义，配置驱动的真实同步必须使用本方法。
func (s *WecomOrganizationSyncService) FinalizeRunWithOptions(run *WecomOrganizationSyncRun, plan *WecomOrganizationSyncPlan, status WecomOrganizationSyncRunStatus, errorCode string, errorText string, softDisableMissingData bool) error {
	switch status {
	case WecomOrganizationSyncRunStatusSucceeded:
		if plan != nil && softDisableMissingData {
			if err := s.ApplyMissingDataDisables(plan); err != nil {
				return err
			}
		}
		return s.FinishRunSucceeded(run)
	case WecomOrganizationSyncRunStatusFailed:
		stage := run.Stage
		if stage == "" {
			stage = WecomOrganizationSyncRunStageFinalizing
		}
		return s.FinishRunFailed(run, stage, errorCode, errorText)
	case WecomOrganizationSyncRunStatusPartial:
		return s.FinishRunPartial(run, errorCode, errorText)
	default:
		return fmt.Errorf("unsupported wecom organization sync final status: %s", status)
	}
}

// StartManualRunAsync 创建运行记录后在后台执行全量差异同步，接口层可以快速返回 run id。
func (s *WecomOrganizationSyncService) StartManualRunAsync(config *WecomOrganizationSyncConfig, actor string) (*WecomOrganizationSyncStartRunResult, error) {
	result, err := s.StartManualRunWithResult(config, actor)
	if err != nil {
		return nil, err
	}
	if result == nil || result.Run == nil {
		return result, nil
	}

	run := *result.Run
	configCopy := *config
	if result.Config != nil {
		// 使用创建 run 时锁定的配置快照，避免并发保存配置后 run 记录与实际调用 Corp ID/Secret 不一致。
		configCopy = *result.Config
	}
	go s.executeManualRunInBackground(&configCopy, &run)
	return result, nil
}

func (s *WecomOrganizationSyncService) executeManualRunInBackground(config *WecomOrganizationSyncConfig, run *WecomOrganizationSyncRun) {
	ctx := context.Background()
	timeout := s.syncTimeout()
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	// ExecuteManualRun 内部会把可恢复失败写入 run 终态；这里保留 warning 便于从服务日志定位后台任务。
	if err := s.ExecuteManualRun(ctx, config, run); err != nil {
		logs.Warning(fmt.Sprintf("wecom organization sync run %s/%s failed: %v", run.Owner, run.Name, err))
	}
}

// ExecuteManualRun 执行一次已创建 run 的完整全量差异同步。
// 调用方必须先通过 StartManualRunWithResult 拿到 running 记录，避免绕过运行锁。
func (s *WecomOrganizationSyncService) ExecuteManualRun(ctx context.Context, config *WecomOrganizationSyncConfig, run *WecomOrganizationSyncRun) error {
	if err := validateWecomOrganizationSyncRunExecutionConfig(config); err != nil {
		return err
	}
	if run == nil {
		return errors.New("wecom organization sync run is required")
	}

	stats := WecomOrganizationSyncRunStats{}
	if err := s.UpdateRunStage(run, WecomOrganizationSyncRunStageFetching); err != nil {
		return err
	}

	snapshot, err := s.FetchFullSnapshot(ctx, s.snapshotClient(config))
	if err != nil {
		return s.finishExecuteManualRunFailed(run, stats, WecomOrganizationSyncRunStageFetching, "fetch_failed", config.AddressBookSecret, err)
	}
	stats.DepartmentFetchedCount = len(snapshot.Departments)
	stats.UserFetchedCount = len(snapshot.Users)
	if missingFields := getMissingWecomOrganizationSnapshotFields(snapshot); len(missingFields) > 0 {
		err := fmt.Errorf("missing required wecom organization snapshot fields: %s", strings.Join(missingFields, ", "))
		return s.finishExecuteManualRunFailed(run, stats, WecomOrganizationSyncRunStageFetching, "missing_fields", config.AddressBookSecret, err)
	}

	if err := s.UpdateRunStage(run, WecomOrganizationSyncRunStagePlanning); err != nil {
		return err
	}
	existing, err := s.objectStore().GetWecomOrganizationSyncExistingState(config.Organization, config.CorpId)
	if err != nil {
		return s.finishExecuteManualRunFailed(run, stats, WecomOrganizationSyncRunStagePlanning, "planning_failed", config.AddressBookSecret, err)
	}
	if existing == nil {
		existing = &WecomOrganizationSyncExistingState{}
	}
	plan := BuildWecomOrganizationSyncPlan(config.Organization, config.CorpId, run.Name, snapshot, *existing)
	stats = buildWecomOrganizationSyncRunStats(snapshot, plan, existing)

	if err := s.UpdateRunStats(run, stats); err != nil {
		return err
	}
	if err := s.UpdateRunStage(run, WecomOrganizationSyncRunStageApplying); err != nil {
		return err
	}

	if err := s.ApplyDepartmentUpserts(plan); err != nil {
		return s.finishExecuteManualRunFailed(run, stats, WecomOrganizationSyncRunStageApplying, "apply_failed", config.AddressBookSecret, err)
	}
	if err := s.ApplyUserUpserts(plan); err != nil {
		return s.finishExecuteManualRunFailed(run, stats, WecomOrganizationSyncRunStageApplying, "apply_failed", config.AddressBookSecret, err)
	}
	if err := s.ApplyUserDepartmentRelationships(plan); err != nil {
		return s.finishExecuteManualRunFailed(run, stats, WecomOrganizationSyncRunStageApplying, "apply_failed", config.AddressBookSecret, err)
	}
	if err := s.ApplyDepartmentLeaderRelationships(plan); err != nil {
		return s.finishExecuteManualRunFailed(run, stats, WecomOrganizationSyncRunStageApplying, "apply_failed", config.AddressBookSecret, err)
	}
	if err := s.ApplyDirectLeaderRelationships(plan); err != nil {
		return s.finishExecuteManualRunFailed(run, stats, WecomOrganizationSyncRunStageApplying, "apply_failed", config.AddressBookSecret, err)
	}

	if err := s.UpdateRunStats(run, stats); err != nil {
		return err
	}
	if err := s.FinalizeRunWithOptions(run, plan, WecomOrganizationSyncRunStatusSucceeded, "", "", config.SoftDisableMissingData); err != nil {
		return s.finishExecuteManualRunFailed(run, stats, WecomOrganizationSyncRunStageFinalizing, "finalize_failed", config.AddressBookSecret, err)
	}
	if err := s.updateBusinessOrganizationDisplayName(config, snapshot); err != nil {
		// 业务组织显示名是同步后的展示元信息；失败时记录日志，不反向改写已成功 run。
		logs.Warning(fmt.Sprintf("wecom business organization display name update failed for %s/%s: %v", run.Owner, run.Name, err))
	}
	if err := s.updateConfigLastSync(config, run); err != nil {
		// 最近同步信息只服务配置页展示和排障；数据同步已经成功时，不反向改写 run 终态。
		logs.Warning(fmt.Sprintf("wecom organization sync config last sync update failed for %s/%s: %v", run.Owner, run.Name, err))
	}
	return nil
}

// finishExecuteManualRunFailed 统一失败收口：先保存已知统计和脱敏错误摘要，再把 run 置为 failed。
// 失败 run 的统计只代表失败前已计划或已拉取的信息，不能作为完整组织快照使用。
func (s *WecomOrganizationSyncService) finishExecuteManualRunFailed(run *WecomOrganizationSyncRun, stats WecomOrganizationSyncRunStats, stage WecomOrganizationSyncRunStage, errorCode string, secret string, cause error) error {
	errorText := maskWecomOrganizationSyncText(cause.Error(), secret)
	stats.ErrorCode = errorCode
	stats.ErrorText = errorText
	if err := s.UpdateRunStats(run, stats); err != nil {
		return err
	}
	if err := s.FinishRunFailed(run, stage, errorCode, errorText); err != nil {
		return err
	}
	return cause
}

// buildWecomOrganizationSyncRunStats 根据“本次快照 + 既有映射”计算展示统计。
// 部门/成员新增与更新按稳定企业微信 ID 判断；关系类只展示变更总量，避免误导为本地对象创建数量。
func buildWecomOrganizationSyncRunStats(snapshot *WecomOrganizationFullSnapshot, plan *WecomOrganizationSyncPlan, existing *WecomOrganizationSyncExistingState) WecomOrganizationSyncRunStats {
	stats := WecomOrganizationSyncRunStats{}
	if snapshot != nil {
		stats.DepartmentFetchedCount = len(snapshot.Departments)
		stats.UserFetchedCount = len(snapshot.Users)
	}
	if plan == nil {
		return stats
	}

	existingDepartmentIds := map[string]bool{}
	existingUserIds := map[string]bool{}
	if existing != nil {
		for _, department := range existing.Departments {
			if department.DepartmentId != "" {
				existingDepartmentIds[department.DepartmentId] = true
			}
		}
		for _, user := range existing.Users {
			if user.WecomUserId != "" {
				existingUserIds[user.WecomUserId] = true
			}
		}
	}

	for _, department := range plan.DepartmentUpserts {
		if existingDepartmentIds[department.Id] {
			stats.DepartmentUpdatedCount++
			continue
		}
		stats.DepartmentCreatedCount++
	}
	stats.DepartmentDisabledCount = len(plan.DepartmentDisables)
	for _, user := range plan.UserUpserts {
		if existingUserIds[user.UserId] {
			stats.UserUpdatedCount++
			continue
		}
		stats.UserCreatedCount++
	}
	stats.UserDisabledCount = len(plan.UserDisables)
	stats.MembershipUpdatedCount = len(plan.UserDepartmentUpserts) + len(plan.UserDepartmentDisables)
	stats.ManagerUpdatedCount = len(plan.DepartmentLeaderUpserts) + len(plan.DepartmentLeaderDisables)
	stats.DirectLeaderUpdatedCount = len(plan.DirectLeaderUpserts) + len(plan.DirectLeaderDisables)
	return stats
}

// getMissingWecomOrganizationSnapshotFields 校验同步必需字段是否可见。
// 字段不存在和字段为空含义不同：只要企业微信响应包含字段，即使数组为空，也表示应用权限满足同步要求。
func getMissingWecomOrganizationSnapshotFields(snapshot *WecomOrganizationFullSnapshot) []string {
	if snapshot == nil {
		return []string{"department_leader", "direct_leader", "is_leader_in_dept"}
	}

	departmentLeaderAvailable := false
	for _, department := range snapshot.Departments {
		if department.HasDepartmentLeaderField {
			departmentLeaderAvailable = true
			break
		}
	}

	directLeaderAvailable := false
	isLeaderInDepartmentAvailable := false
	for _, user := range snapshot.Users {
		if user.HasDirectLeaderField {
			directLeaderAvailable = true
		}
		if user.HasIsLeaderInDepartmentField {
			isLeaderInDepartmentAvailable = true
		}
		if directLeaderAvailable && isLeaderInDepartmentAvailable {
			break
		}
	}

	missingFields := make([]string, 0, 3)
	if !departmentLeaderAvailable {
		missingFields = append(missingFields, "department_leader")
	}
	if !directLeaderAvailable {
		missingFields = append(missingFields, "direct_leader")
	}
	if !isLeaderInDepartmentAvailable {
		missingFields = append(missingFields, "is_leader_in_dept")
	}
	return missingFields
}

func validateWecomOrganizationSyncRunTargetConfig(config *WecomOrganizationSyncConfig) error {
	if config == nil {
		return errors.New("wecom organization sync config is required")
	}
	if config.Organization == "" {
		return errors.New("wecom organization sync organization is required")
	}
	if config.Organization == "built-in" {
		return errors.New("wecom organization sync target organization cannot be built-in")
	}
	if config.CorpId == "" {
		return errors.New("wecom organization sync corp_id is required")
	}
	return nil
}

// validateWecomOrganizationSyncRunExecutionConfig 校验真实执行所需配置。
// 脱敏占位符只能用于页面回显，不能作为后台任务调用企业微信 API 的 Secret。
func validateWecomOrganizationSyncRunExecutionConfig(config *WecomOrganizationSyncConfig) error {
	if err := validateWecomOrganizationSyncRunTargetConfig(config); err != nil {
		return err
	}
	if config.AddressBookSecret == "" {
		return errors.New("wecom organization sync address_book_secret is required")
	}
	if config.AddressBookSecret == WecomOrganizationSyncMaskedSecret {
		return errors.New("wecom organization sync address_book_secret is required")
	}
	return nil
}

// UpdateRunStats 持久化同步统计数量和已脱敏错误摘要。
// 成功、失败和部分失败都可以复用该方法；终态由 FinalizeRun/FinishRun* 方法负责。
func (s *WecomOrganizationSyncService) UpdateRunStats(run *WecomOrganizationSyncRun, stats WecomOrganizationSyncRunStats) error {
	if err := s.requireRunStoreAndRun(run); err != nil {
		return err
	}

	run.DepartmentFetchedCount = stats.DepartmentFetchedCount
	run.DepartmentCreatedCount = stats.DepartmentCreatedCount
	run.DepartmentUpdatedCount = stats.DepartmentUpdatedCount
	run.DepartmentDisabledCount = stats.DepartmentDisabledCount
	run.UserFetchedCount = stats.UserFetchedCount
	run.UserCreatedCount = stats.UserCreatedCount
	run.UserUpdatedCount = stats.UserUpdatedCount
	run.UserDisabledCount = stats.UserDisabledCount
	run.MembershipUpdatedCount = stats.MembershipUpdatedCount
	run.ManagerUpdatedCount = stats.ManagerUpdatedCount
	run.DirectLeaderUpdatedCount = stats.DirectLeaderUpdatedCount
	run.ErrorCode = stats.ErrorCode
	run.ErrorText = stats.ErrorText
	run.UpdatedAt = s.now().UTC()
	return s.runStore().UpdateWecomOrganizationSyncRun(run)
}

func (s *WecomOrganizationSyncService) requireRunStoreAndRun(run *WecomOrganizationSyncRun) error {
	if run == nil {
		return errors.New("wecom organization sync run is required")
	}
	return nil
}

func (s *WecomOrganizationSyncService) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func (s *WecomOrganizationSyncService) leaseDuration() time.Duration {
	if s != nil && s.LeaseDuration > 0 {
		return s.LeaseDuration
	}
	return WecomOrganizationSyncDefaultLeaseDuration
}

func (s *WecomOrganizationSyncService) syncTimeout() time.Duration {
	if s != nil && s.SyncTimeout > 0 {
		return s.SyncTimeout
	}
	return s.leaseDuration()
}

func (s *WecomOrganizationSyncService) snapshotClient(config *WecomOrganizationSyncConfig) WecomOrganizationSnapshotClient {
	if s != nil && s.NewSnapshotClient != nil {
		return s.NewSnapshotClient(config.CorpId, config.AddressBookSecret)
	}
	return NewWecomAddressBookClient(config.CorpId, config.AddressBookSecret)
}

// NormalizeWecomOrganizationSnapshot 派生可查询关系，但不从一种关系推断另一种关系。
// 部门层级、部门负责人、成员部门和直属上级始终作为独立事实处理。
func NormalizeWecomOrganizationSnapshot(departments []WecomDepartmentSnapshot, users []WecomUserSnapshot) *WecomOrganizationFullSnapshot {
	snapshot := &WecomOrganizationFullSnapshot{
		Departments: departments,
		Users:       users,
	}

	for _, user := range users {
		mainDepartmentAssigned := false
		for index, departmentId := range user.Departments {
			if departmentId == "" {
				continue
			}
			isMain := !mainDepartmentAssigned && user.MainDepartmentId != "" && departmentId == user.MainDepartmentId
			if isMain {
				mainDepartmentAssigned = true
			}
			snapshot.UserDepartments = append(snapshot.UserDepartments, WecomSnapshotUserDepartment{
				WecomUserId:  user.UserId,
				DepartmentId: departmentId,
				IsMain:       isMain,
				IsLeader:     boolAt(user.IsLeaderInDepartment, index),
			})
		}
		for _, leaderId := range user.DirectLeaders {
			if user.UserId == "" || leaderId == "" {
				continue
			}
			snapshot.DirectLeaders = append(snapshot.DirectLeaders, WecomSnapshotDirectLeader{
				WecomUserId:       user.UserId,
				LeaderWecomUserId: leaderId,
			})
		}
	}

	departmentLeaderSeen := map[string]bool{}
	departmentHasPrimary := map[string]bool{}
	for _, department := range departments {
		for _, leaderId := range department.DepartmentLeader {
			addDepartmentLeader(snapshot, departmentLeaderSeen, departmentHasPrimary, department.Id, leaderId)
		}
	}
	for _, membership := range snapshot.UserDepartments {
		if !membership.IsLeader {
			continue
		}
		addDepartmentLeader(snapshot, departmentLeaderSeen, departmentHasPrimary, membership.DepartmentId, membership.WecomUserId)
	}

	return snapshot
}

// FetchFullSnapshot 获取 token、部门快照和成员快照，并在生成计划前完成规范化。
func (s *WecomOrganizationSyncService) FetchFullSnapshot(ctx context.Context, client WecomOrganizationSnapshotClient) (*WecomOrganizationFullSnapshot, error) {
	if client == nil {
		return nil, errors.New("wecom organization snapshot client is required")
	}

	token, err := client.GetAccessToken(ctx)
	if err != nil {
		return nil, err
	}
	if token == nil || token.AccessToken == "" {
		return nil, errors.New("wecom organization snapshot access token is empty")
	}

	departments, err := client.FetchDepartmentSnapshots(ctx, token.AccessToken, "")
	if err != nil {
		return nil, err
	}
	users, err := client.FetchUserSnapshots(ctx, token.AccessToken)
	if err != nil {
		return nil, err
	}
	return NormalizeWecomOrganizationSnapshot(departments, users), nil
}

// ApplyDepartmentUpserts 将企业微信部门快照按稳定部门 ID upsert 到本地 Group 和映射表。
// 这里刻意不改 Group.Name：部门重命名只更新展示名，避免破坏本地引用。
func (s *WecomOrganizationSyncService) ApplyDepartmentUpserts(plan *WecomOrganizationSyncPlan) error {
	if plan == nil {
		return errors.New("wecom organization sync plan is required")
	}
	if plan.Organization == "" {
		return errors.New("wecom organization sync organization is required")
	}
	if plan.CorpId == "" {
		return errors.New("wecom organization sync corp_id is required")
	}

	store := s.objectStore()
	now := s.now().UTC()
	if err := s.projectWecomSourceConnection(store, plan, now); err != nil {
		return err
	}
	for _, department := range plan.DepartmentUpserts {
		if department.Id == "" {
			continue
		}

		mapping, err := store.GetWecomDepartmentMapping(plan.Organization, plan.CorpId, department.Id)
		if err != nil {
			return err
		}

		groupName := GetWecomDepartmentGroupName(plan.CorpId, department.Id)
		if mapping != nil && mapping.GroupName != "" {
			groupName = mapping.GroupName
		}

		group, err := store.GetGroup(plan.Organization, groupName)
		if err != nil {
			return err
		}
		if group == nil {
			group = &Group{
				Owner:       plan.Organization,
				Name:        groupName,
				CreatedTime: util.GetCurrentTime(),
			}
		}

		parentGroupOwner, parentGroupName, isTopGroup, err := s.resolveWecomParentGroup(plan, department)
		if err != nil {
			return err
		}

		group.Owner = plan.Organization
		group.Name = groupName
		group.UpdatedTime = util.GetCurrentTime()
		group.DisplayName = wecomDepartmentDisplayName(department)
		group.ParentId = parentGroupName
		group.Type = WecomDepartmentGroupType
		group.IsTopGroup = isTopGroup
		group.IsEnabled = true
		if err := store.SaveGroup(group); err != nil {
			return err
		}

		if mapping == nil {
			mapping = &WecomDepartmentMapping{
				Owner: plan.Organization,
				Name:  GetWecomDepartmentMappingName(plan.Organization, plan.CorpId, department.Id),
			}
		}
		mapping.Organization = plan.Organization
		mapping.CorpId = plan.CorpId
		mapping.DepartmentId = department.Id
		mapping.GroupOwner = plan.Organization
		mapping.GroupName = groupName
		mapping.ParentDepartmentId = department.ParentId
		mapping.ParentGroupOwner = parentGroupOwner
		mapping.ParentGroupName = parentGroupName
		mapping.DisplayName = group.DisplayName
		mapping.Order = department.Order
		mapping.PrimaryLeaderWecomUserId = firstString(department.DepartmentLeader)
		mapping.IsEnabled = true
		mapping.MissingSinceRunId = ""
		mapping.LastSeenRunId = plan.RunId
		mapping.LastSyncedAt = now
		if err := store.SaveWecomDepartmentMapping(mapping); err != nil {
			return err
		}
		if err := s.projectWecomPlatformDepartment(store, plan, mapping, now); err != nil {
			return err
		}
	}
	return nil
}

// ApplyUserUpserts 将企业微信成员快照按 userid upsert 到本地 User 和映射表。
// 已绑定用户只更新企业微信来源资料，不重命名本地账号。
func (s *WecomOrganizationSyncService) ApplyUserUpserts(plan *WecomOrganizationSyncPlan) error {
	if plan == nil {
		return errors.New("wecom organization sync plan is required")
	}
	if plan.Organization == "" {
		return errors.New("wecom organization sync organization is required")
	}
	if plan.CorpId == "" {
		return errors.New("wecom organization sync corp_id is required")
	}

	store := s.objectStore()
	now := s.now().UTC()
	if err := s.projectWecomSourceConnection(store, plan, now); err != nil {
		return err
	}
	for _, snapshot := range plan.UserUpserts {
		if snapshot.UserId == "" {
			continue
		}

		// User.ExternalId 只有 varchar(100)，完整企业微信外部标识始终保存到映射表。
		// 当完整标识超长时，User.ExternalId 只写入长度安全的 hash 形态用于快速匹配。
		fullExternalId := GetWecomUserFullExternalId(plan.CorpId, snapshot.UserId)
		userExternalId := GetLengthSafeWecomUserExternalId(plan.CorpId, snapshot.UserId)

		mapping, err := store.GetWecomUserMapping(plan.Organization, plan.CorpId, snapshot.UserId)
		if err != nil {
			return err
		}

		user, err := s.resolveWecomUser(plan, mapping, snapshot, fullExternalId)
		if err != nil {
			return err
		}
		applyWecomUserSnapshot(user, plan.CorpId, userExternalId, snapshot)
		if err := store.SaveUser(user); err != nil {
			return err
		}

		if mapping == nil {
			mapping = &WecomUserMapping{
				Owner: plan.Organization,
				Name:  GetWecomUserMappingName(plan.Organization, plan.CorpId, snapshot.UserId),
			}
		}
		mapping.Organization = plan.Organization
		mapping.CorpId = plan.CorpId
		mapping.WecomUserId = snapshot.UserId
		mapping.UserOwner = user.Owner
		mapping.UserName = user.Name
		mapping.ExternalId = fullExternalId
		mapping.MainDepartmentId = snapshot.MainDepartmentId
		mapping.Status = snapshot.Status
		possibleDuplicateUsers, err := store.FindPossibleDuplicateUsers(
			plan.Organization,
			plan.CorpId,
			snapshot.UserId,
			fullExternalId,
			wecomUserDisplayName(snapshot),
			firstNonEmpty(snapshot.Mobile, snapshot.Telephone),
			firstNonEmpty(snapshot.Email, snapshot.BizMail),
		)
		if err != nil {
			return err
		}
		// 只记录疑似重复账号供管理员排查；同步身份绑定仍然只相信企业微信稳定标识。
		mapping.PossibleDuplicateUsers = marshalWecomPossibleDuplicateUsers(possibleDuplicateUsers)
		mapping.IsEnabled = isEnabledWecomUserStatus(snapshot.Status)
		mapping.MissingSinceRunId = ""
		mapping.LastSeenRunId = plan.RunId
		mapping.LastSyncedAt = now
		if err := store.SaveWecomUserMapping(mapping); err != nil {
			return err
		}
		if err := s.projectWecomPlatformUserAndIdentity(store, plan, mapping, user, now); err != nil {
			return err
		}
	}
	return nil
}

// ApplyUserDepartmentRelationships 同步企业微信成员部门关系，并只维护企业微信来源的部门组成员关系。
// 手工用户组、角色相关组和其他来源组不在这里增删，避免组织同步覆盖本地授权配置。
func (s *WecomOrganizationSyncService) ApplyUserDepartmentRelationships(plan *WecomOrganizationSyncPlan) error {
	if plan == nil {
		return errors.New("wecom organization sync plan is required")
	}
	if plan.Organization == "" {
		return errors.New("wecom organization sync organization is required")
	}
	if plan.CorpId == "" {
		return errors.New("wecom organization sync corp_id is required")
	}

	store := s.objectStore()
	now := s.now().UTC()
	if err := s.projectWecomSourceConnection(store, plan, now); err != nil {
		return err
	}
	// 先处理失效关系，再处理本次快照中的启用关系。
	// 如果用户从 A 部门调整到 B 部门，这个顺序能先移除旧企业微信部门组，再补上新部门组。
	for _, membership := range plan.UserDepartmentDisables {
		if err := s.disableWecomUserDepartmentMembership(store, plan, membership, now); err != nil {
			return err
		}
	}

	// 企业微信理论上只会给一个主部门，但同步层仍按用户兜底去重。
	// 一旦上游异常返回多个主部门，只把本次快照里遇到的第一个启用关系标为主部门。
	mainDepartmentAssigned := map[string]bool{}
	for _, membership := range plan.UserDepartmentUpserts {
		if err := s.upsertWecomUserDepartmentMembership(store, plan, membership, now, mainDepartmentAssigned); err != nil {
			return err
		}
	}
	return nil
}

// ApplyDepartmentLeaderRelationships 同步企业微信部门负责人关系。
// 完整负责人列表写入关系表；Group.Manager 只作为旧页面兼容展示缓存，不作为授权事实来源。
func (s *WecomOrganizationSyncService) ApplyDepartmentLeaderRelationships(plan *WecomOrganizationSyncPlan) error {
	if plan == nil {
		return errors.New("wecom organization sync plan is required")
	}
	if plan.Organization == "" {
		return errors.New("wecom organization sync organization is required")
	}
	if plan.CorpId == "" {
		return errors.New("wecom organization sync corp_id is required")
	}

	store := s.objectStore()
	now := s.now().UTC()
	if err := s.projectWecomSourceConnection(store, plan, now); err != nil {
		return err
	}
	for _, leader := range plan.DepartmentLeaderDisables {
		if err := s.disableWecomDepartmentLeader(store, plan, leader, now); err != nil {
			return err
		}
	}

	// 企业微信可能通过部门字段和成员字段合并出负责人；这里按部门兜底主负责人唯一。
	// 管理范围计算读取所有启用负责人关系，只有 is_primary=true 的那条会回写 Group.Manager。
	primaryLeaderAssigned := map[string]bool{}
	for _, leader := range plan.DepartmentLeaderUpserts {
		if err := s.upsertWecomDepartmentLeader(store, plan, leader, now, primaryLeaderAssigned); err != nil {
			return err
		}
	}
	return nil
}

// ApplyDirectLeaderRelationships 同步企业微信直属上级关系。
// 该关系只能来自 direct_leader 快照字段，不从部门层级、负责人或成员排序推断。
func (s *WecomOrganizationSyncService) ApplyDirectLeaderRelationships(plan *WecomOrganizationSyncPlan) error {
	if plan == nil {
		return errors.New("wecom organization sync plan is required")
	}
	if plan.Organization == "" {
		return errors.New("wecom organization sync organization is required")
	}
	if plan.CorpId == "" {
		return errors.New("wecom organization sync corp_id is required")
	}

	store := s.objectStore()
	now := s.now().UTC()
	if err := s.projectWecomSourceConnection(store, plan, now); err != nil {
		return err
	}
	for _, leader := range plan.DirectLeaderDisables {
		if err := s.disableWecomDirectLeader(store, plan, leader, now); err != nil {
			return err
		}
	}
	for _, leader := range plan.DirectLeaderUpserts {
		if err := s.upsertWecomDirectLeader(store, plan, leader, now); err != nil {
			return err
		}
	}
	return nil
}

// ApplyMissingDataDisables 对完整成功快照中缺失的企业微信部门和成员做软禁用。
// 调用方必须保证本次同步已完整成功；失败或 partial 场景不得调用该方法。
func (s *WecomOrganizationSyncService) ApplyMissingDataDisables(plan *WecomOrganizationSyncPlan) error {
	if plan == nil {
		return errors.New("wecom organization sync plan is required")
	}
	if plan.Organization == "" {
		return errors.New("wecom organization sync organization is required")
	}
	if plan.CorpId == "" {
		return errors.New("wecom organization sync corp_id is required")
	}

	store := s.objectStore()
	now := s.now().UTC()
	if err := s.projectWecomSourceConnection(store, plan, now); err != nil {
		return err
	}
	for _, department := range plan.DepartmentDisables {
		if err := s.disableMissingWecomDepartment(store, plan, department, now); err != nil {
			return err
		}
	}
	for _, user := range plan.UserDisables {
		if err := s.disableMissingWecomUser(store, plan, user, now); err != nil {
			return err
		}
	}
	return nil
}

// BuildWecomOrganizationSyncPlan 基于稳定企业微信标识和关系端点做差异比较。
// 这里只准备 upsert/disable 操作，不修改本地 User、Group 或关系表。
func BuildWecomOrganizationSyncPlan(organization string, corpId string, runId string, snapshot *WecomOrganizationFullSnapshot, existing WecomOrganizationSyncExistingState) *WecomOrganizationSyncPlan {
	plan := &WecomOrganizationSyncPlan{
		Organization: organization,
		CorpId:       corpId,
		RunId:        runId,
	}
	if snapshot == nil {
		return plan
	}

	currentDepartmentIds := map[string]bool{}
	for _, department := range snapshot.Departments {
		if department.Id == "" {
			continue
		}
		currentDepartmentIds[department.Id] = true
		plan.DepartmentUpserts = append(plan.DepartmentUpserts, department)
	}
	for _, department := range existing.Departments {
		if department.DepartmentId != "" && !currentDepartmentIds[department.DepartmentId] {
			plan.DepartmentDisables = append(plan.DepartmentDisables, department)
		}
	}

	currentUserIds := map[string]bool{}
	for _, user := range snapshot.Users {
		if user.UserId == "" {
			continue
		}
		currentUserIds[user.UserId] = true
		plan.UserUpserts = append(plan.UserUpserts, user)
	}
	for _, user := range existing.Users {
		if user.WecomUserId != "" && !currentUserIds[user.WecomUserId] {
			plan.UserDisables = append(plan.UserDisables, user)
		}
	}

	currentUserDepartmentKeys := map[string]bool{}
	for _, membership := range snapshot.UserDepartments {
		key := wecomRelationshipKey(membership.WecomUserId, membership.DepartmentId)
		if key == "" {
			continue
		}
		currentUserDepartmentKeys[key] = true
		plan.UserDepartmentUpserts = append(plan.UserDepartmentUpserts, membership)
	}
	for _, membership := range existing.UserDepartments {
		key := wecomRelationshipKey(membership.WecomUserId, membership.DepartmentId)
		if key != "" && !currentUserDepartmentKeys[key] {
			plan.UserDepartmentDisables = append(plan.UserDepartmentDisables, membership)
		}
	}

	currentDepartmentLeaderKeys := map[string]bool{}
	for _, leader := range snapshot.DepartmentLeaders {
		key := wecomRelationshipKey(leader.DepartmentId, leader.LeaderWecomUserId)
		if key == "" {
			continue
		}
		currentDepartmentLeaderKeys[key] = true
		plan.DepartmentLeaderUpserts = append(plan.DepartmentLeaderUpserts, leader)
	}
	for _, leader := range existing.DepartmentLeaders {
		key := wecomRelationshipKey(leader.DepartmentId, leader.LeaderWecomUserId)
		if key != "" && !currentDepartmentLeaderKeys[key] {
			plan.DepartmentLeaderDisables = append(plan.DepartmentLeaderDisables, leader)
		}
	}

	currentDirectLeaderKeys := map[string]bool{}
	for _, leader := range snapshot.DirectLeaders {
		key := wecomRelationshipKey(leader.WecomUserId, leader.LeaderWecomUserId)
		if key == "" {
			continue
		}
		currentDirectLeaderKeys[key] = true
		plan.DirectLeaderUpserts = append(plan.DirectLeaderUpserts, leader)
	}
	for _, leader := range existing.DirectLeaders {
		key := wecomRelationshipKey(leader.WecomUserId, leader.LeaderWecomUserId)
		if key != "" && !currentDirectLeaderKeys[key] {
			plan.DirectLeaderDisables = append(plan.DirectLeaderDisables, leader)
		}
	}

	return plan
}

func (s *WecomOrganizationSyncService) objectStore() WecomOrganizationObjectStore {
	if s != nil && s.ObjectStore != nil {
		return s.ObjectStore
	}
	return defaultWecomOrganizationObjectStore{}
}

// projectWecomSourceConnection 把企业微信配置和同步批次投影为平台来源连接。
// 企业微信 CorpId 只作为 source tenant lineage 保存，不能替代平台 organizationId。
func (s *WecomOrganizationSyncService) projectWecomSourceConnection(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, now time.Time) error {
	if store == nil || plan == nil || plan.Organization == "" || plan.CorpId == "" {
		return nil
	}
	sourceConnectionId := GetSourceConnectionId(plan.Organization, SourceTypeWecom, plan.CorpId)
	metadata := marshalPlatformLineage(map[string]string{
		"sourceType":     SourceTypeWecom,
		"sourceTenantId": plan.CorpId,
	})
	return store.SaveSourceConnection(&SourceConnection{
		Owner:              plan.Organization,
		Name:               sourceConnectionId,
		OrganizationId:     plan.Organization,
		SourceConnectionId: sourceConnectionId,
		SourceType:         SourceTypeWecom,
		SourceTenantId:     plan.CorpId,
		Status:             SourceConnectionStatusActive,
		Freshness:          PlatformFreshnessFresh,
		Metadata:           metadata,
		ConfigRef:          "wecom:" + plan.CorpId,
		LastSeenBatchId:    plan.RunId,
		UpdatedAt:          now,
	})
}

// projectWecomPlatformDepartment 将企业微信部门映射投影为平台部门和外部身份。
// provider 后续读取 SourceConnection、ExternalIdentity、lifecycle 和 orgVersion 来判断来源和可见性。
func (s *WecomOrganizationSyncService) projectWecomPlatformDepartment(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, mapping *WecomDepartmentMapping, now time.Time) error {
	if store == nil || plan == nil || mapping == nil || mapping.DepartmentId == "" {
		return nil
	}
	sourceConnectionId := GetSourceConnectionId(plan.Organization, SourceTypeWecom, plan.CorpId)
	departmentId := getWecomLocalId(firstNonEmpty(mapping.GroupOwner, plan.Organization), mapping.GroupName)
	if departmentId == "" {
		departmentId = getWecomLocalId(plan.Organization, GetWecomDepartmentGroupName(plan.CorpId, mapping.DepartmentId))
	}
	parentDepartmentId := ""
	if mapping.ParentGroupOwner != "" && mapping.ParentGroupName != "" {
		parentDepartmentId = getWecomLocalId(mapping.ParentGroupOwner, mapping.ParentGroupName)
	}
	lifecycleStatus := PlatformLifecycleStatusActive
	if !mapping.IsEnabled {
		lifecycleStatus = PlatformLifecycleStatusDisabled
	}
	version := NewPlatformVersionMetadata(plan.Organization, sourceConnectionId, plan.RunId, now, "")
	if err := store.SavePlatformDepartment(&PlatformDepartment{
		Owner:                plan.Organization,
		Name:                 GetPlatformDepartmentName(plan.Organization, departmentId),
		OrganizationId:       plan.Organization,
		DepartmentId:         departmentId,
		ParentDepartmentId:   parentDepartmentId,
		DisplayName:          mapping.DisplayName,
		LifecycleStatus:      lifecycleStatus,
		SourceConnectionId:   sourceConnectionId,
		ExternalDepartmentId: mapping.DepartmentId,
		OrgVersion:           version.OrgVersion,
		UpdatedAt:            now,
	}); err != nil {
		return err
	}
	return store.SaveExternalIdentity(&ExternalIdentity{
		Owner:               plan.Organization,
		Name:                GetExternalIdentityName(sourceConnectionId, PlatformSubjectTypeDepartment, mapping.DepartmentId),
		OrganizationId:      plan.Organization,
		SourceConnectionId:  sourceConnectionId,
		ExternalSubjectType: PlatformSubjectTypeDepartment,
		ExternalSubjectId:   mapping.DepartmentId,
		PlatformSubjectType: PlatformSubjectTypeDepartment,
		PlatformSubject:     departmentId,
		MappingStatus:       platformMappingStatusFromEnabled(mapping.IsEnabled),
		Lineage:             marshalWecomProjectionLineage(plan, mapping.DepartmentId),
		LastSeenBatchId:     plan.RunId,
		UpdatedAt:           now,
	})
}

// projectWecomPlatformUserAndIdentity 用已落库本地用户生成平台用户主体和 confirmed 外部身份。
func (s *WecomOrganizationSyncService) projectWecomPlatformUserAndIdentity(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, mapping *WecomUserMapping, user *User, now time.Time) error {
	if user == nil || mapping == nil {
		return nil
	}
	return s.saveWecomPlatformUserAndIdentity(store, plan, mapping, getWecomLocalId(user.Owner, user.Name), user.DisplayName, mapping.IsEnabled, now)
}

// projectWecomPlatformUserFromMapping 在软禁用路径中用既有映射回补平台用户主体，避免缺失 User 对象时丢失 lifecycle 投影。
func (s *WecomOrganizationSyncService) projectWecomPlatformUserFromMapping(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, mapping *WecomUserMapping, now time.Time) error {
	if mapping == nil {
		return nil
	}
	return s.saveWecomPlatformUserAndIdentity(store, plan, mapping, getWecomLocalId(mapping.UserOwner, mapping.UserName), "", mapping.IsEnabled, now)
}

// saveWecomPlatformUserAndIdentity 只使用企业微信 userid 与 adminSubject 建立稳定身份映射。
// 手机号、邮箱、姓名等弱标识不会写入自动 join 键，只能作为展示或重复候选诊断信息。
func (s *WecomOrganizationSyncService) saveWecomPlatformUserAndIdentity(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, mapping *WecomUserMapping, adminSubject string, displayName string, enabled bool, now time.Time) error {
	if store == nil || plan == nil || mapping == nil || mapping.WecomUserId == "" || adminSubject == "" {
		return nil
	}
	sourceConnectionId := GetSourceConnectionId(plan.Organization, SourceTypeWecom, plan.CorpId)
	version := NewPlatformVersionMetadata(plan.Organization, sourceConnectionId, plan.RunId, now, "")
	lifecycleStatus := PlatformLifecycleStatusActive
	if !enabled {
		lifecycleStatus = PlatformLifecycleStatusDisabled
	}
	if err := store.SavePlatformUser(&PlatformUser{
		Owner:           plan.Organization,
		Name:            prefixedStableHash("puser-", plan.Organization, adminSubject),
		OrganizationId:  plan.Organization,
		AdminSubject:    adminSubject,
		UserOwner:       mapping.UserOwner,
		UserName:        mapping.UserName,
		DisplayName:     displayName,
		LifecycleStatus: lifecycleStatus,
		MappingStatus:   platformMappingStatusFromEnabled(enabled),
		OrgVersion:      version.OrgVersion,
		LastSeenBatchId: plan.RunId,
		UpdatedAt:       now,
	}); err != nil {
		return err
	}
	return store.SaveExternalIdentity(&ExternalIdentity{
		Owner:               plan.Organization,
		Name:                GetExternalIdentityName(sourceConnectionId, PlatformSubjectTypeUser, mapping.WecomUserId),
		OrganizationId:      plan.Organization,
		SourceConnectionId:  sourceConnectionId,
		ExternalSubjectType: PlatformSubjectTypeUser,
		ExternalSubjectId:   mapping.WecomUserId,
		PlatformSubjectType: PlatformSubjectTypeUser,
		PlatformSubject:     adminSubject,
		MappingStatus:       platformMappingStatusFromEnabled(enabled),
		Lineage:             marshalWecomProjectionLineage(plan, mapping.WecomUserId),
		LastSeenBatchId:     plan.RunId,
		UpdatedAt:           now,
	})
}

// projectWecomPlatformMembership 将成员部门关系投影为平台 membership 权威事实。
// disabled 关系必须清掉 main/manager 标记，避免 scope 继续把已失效关系当负责人或主部门使用。
func (s *WecomOrganizationSyncService) projectWecomPlatformMembership(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, membership *WecomUserDepartment, now time.Time, lifecycleStatus string) error {
	if store == nil || plan == nil || membership == nil || membership.WecomUserId == "" || membership.DepartmentId == "" {
		return nil
	}
	adminSubject := getWecomLocalId(membership.UserOwner, membership.UserName)
	departmentId := getWecomLocalId(membership.GroupOwner, membership.GroupName)
	if adminSubject == "" || departmentId == "" {
		return nil
	}
	sourceConnectionId := GetSourceConnectionId(plan.Organization, SourceTypeWecom, plan.CorpId)
	version := NewPlatformVersionMetadata(plan.Organization, sourceConnectionId, plan.RunId, now, "")
	return store.SavePlatformMembership(&PlatformMembership{
		Owner:              plan.Organization,
		Name:               GetPlatformMembershipName(plan.Organization, adminSubject, departmentId),
		OrganizationId:     plan.Organization,
		AdminSubject:       adminSubject,
		DepartmentId:       departmentId,
		IsMain:             lifecycleStatus == PlatformLifecycleStatusActive && membership.IsMain,
		IsManager:          lifecycleStatus == PlatformLifecycleStatusActive && membership.IsLeader,
		LifecycleStatus:    lifecycleStatus,
		SourceConnectionId: sourceConnectionId,
		OrgVersion:         version.OrgVersion,
		UpdatedAt:          now,
	})
}

// projectWecomDepartmentLeaderMembership 将部门负责人关系折叠为 membership manager 语义。
// 负责人事实仍来自企业微信 leader 快照，不从部门层级或用户排序推断。
func (s *WecomOrganizationSyncService) projectWecomDepartmentLeaderMembership(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, leader *WecomDepartmentLeader, now time.Time, lifecycleStatus string) error {
	if leader == nil {
		return nil
	}
	membership := &WecomUserDepartment{
		Organization:  leader.Organization,
		CorpId:        leader.CorpId,
		WecomUserId:   leader.LeaderWecomUserId,
		DepartmentId:  leader.DepartmentId,
		UserOwner:     leader.LeaderUserOwner,
		UserName:      leader.LeaderUserName,
		GroupOwner:    leader.GroupOwner,
		GroupName:     leader.GroupName,
		IsLeader:      lifecycleStatus == PlatformLifecycleStatusActive,
		IsEnabled:     lifecycleStatus == PlatformLifecycleStatusActive,
		LastSeenRunId: leader.LastSeenRunId,
	}
	return s.projectWecomPlatformMembership(store, plan, membership, now, lifecycleStatus)
}

// projectWecomLifecycleEvent 记录会影响 org/scope version 的主体生命周期变更。
func (s *WecomOrganizationSyncService) projectWecomLifecycleEvent(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, subjectType string, subject string, lifecycleStatus string, reason string, now time.Time) error {
	if store == nil || plan == nil || subject == "" {
		return nil
	}
	return store.SaveLifecycleEvent(&LifecycleEvent{
		Owner:           plan.Organization,
		Name:            GetLifecycleEventName(plan.Organization, subjectType, subject, plan.RunId, now),
		OrganizationId:  plan.Organization,
		SubjectType:     subjectType,
		Subject:         subject,
		LifecycleStatus: lifecycleStatus,
		Reason:          reason,
		BatchId:         plan.RunId,
		OccurredAt:      now,
		UpdatedAt:       now,
	})
}

// projectWecomOrgSyncBatch 把同步 run 收口为 provider 可读的版本和新鲜度批次记录。
// insight 只消费这些 admin provider 元数据，不能把它当 gateway runtime authorization fact。
func (s *WecomOrganizationSyncService) projectWecomOrgSyncBatch(run *WecomOrganizationSyncRun) error {
	if run == nil || run.Organization == "" || run.CorpId == "" || run.Name == "" {
		return nil
	}
	store := s.objectStore()
	sourceConnectionId := GetSourceConnectionId(run.Organization, SourceTypeWecom, run.CorpId)
	finishedAt := run.FinishedAt
	if finishedAt.IsZero() {
		finishedAt = s.now().UTC()
	}
	version := NewPlatformVersionMetadata(run.Organization, sourceConnectionId, run.Name, finishedAt, "")
	status, freshness := platformOrgSyncBatchStatus(run.Status)
	return store.SaveOrgSyncBatch(&OrgSyncBatch{
		Owner:              run.Organization,
		Name:               run.Name,
		OrganizationId:     run.Organization,
		SourceConnectionId: sourceConnectionId,
		BatchId:            run.Name,
		Status:             status,
		StartedAt:          run.StartedAt,
		FinishedAt:         finishedAt,
		OrgVersion:         version.OrgVersion,
		Freshness:          freshness,
		ErrorCode:          run.ErrorCode,
		ErrorText:          run.ErrorText,
		UpdatedAt:          finishedAt,
	})
}

// platformOrgSyncBatchStatus 将同步终态映射为 provider 新鲜度。
// partial 只能表示 stale，failed 表示 unavailable，调用方据此 fail-closed 或提示数据不可用。
func platformOrgSyncBatchStatus(status WecomOrganizationSyncRunStatus) (string, string) {
	switch status {
	case WecomOrganizationSyncRunStatusSucceeded:
		return OrgSyncBatchStatusSucceeded, PlatformFreshnessFresh
	case WecomOrganizationSyncRunStatusPartial:
		return OrgSyncBatchStatusPartial, PlatformFreshnessStale
	case WecomOrganizationSyncRunStatusFailed:
		return OrgSyncBatchStatusFailed, PlatformFreshnessUnavailable
	default:
		return OrgSyncBatchStatusRunning, PlatformFreshnessUnknown
	}
}

func platformMappingStatusFromEnabled(enabled bool) string {
	if enabled {
		return PlatformMappingStatusConfirmed
	}
	return PlatformMappingStatusDisabled
}

func marshalWecomProjectionLineage(plan *WecomOrganizationSyncPlan, externalSubjectId string) string {
	if plan == nil {
		return "{}"
	}
	return marshalPlatformLineage(map[string]string{
		"sourceType":        SourceTypeWecom,
		"sourceTenantId":    plan.CorpId,
		"externalSubjectId": externalSubjectId,
		"batchId":           plan.RunId,
	})
}

func marshalPlatformLineage(values map[string]string) string {
	raw, err := json.Marshal(values)
	if err != nil {
		return "{}"
	}
	return string(raw)
}

func (s *WecomOrganizationSyncService) organizationStore() WecomBusinessOrganizationStore {
	if s != nil && s.OrganizationStore != nil {
		return s.OrganizationStore
	}
	return defaultWecomBusinessOrganizationStore{}
}

func (s *WecomOrganizationSyncService) ensureWecomBusinessOrganizationForConfig(config *WecomOrganizationSyncConfig) error {
	if config == nil {
		return nil
	}
	if config.Organization != GetWecomBusinessOrganizationName(config.CorpId) {
		return nil
	}
	// 历史配置可能已绑定业务组织但缺少默认应用；启动同步前补齐，避免后续用户编辑缺少应用上下文。
	_, err := ensureWecomBusinessOrganization(s.organizationStore(), config.CorpId)
	return err
}

func (s *WecomOrganizationSyncService) configLastSyncStore() WecomOrganizationSyncConfigLastSyncStore {
	if s != nil && s.ConfigStore != nil {
		return s.ConfigStore
	}
	return defaultWecomOrganizationSyncConfigStore{}
}

func (s *WecomOrganizationSyncService) updateConfigLastSync(config *WecomOrganizationSyncConfig, run *WecomOrganizationSyncRun) error {
	if config == nil || run == nil {
		return nil
	}
	return s.configLastSyncStore().UpdateWecomOrganizationSyncConfigLastSync(config, run, s.now().UTC())
}

func (s *WecomOrganizationSyncService) updateBusinessOrganizationDisplayName(config *WecomOrganizationSyncConfig, snapshot *WecomOrganizationFullSnapshot) error {
	if config == nil || snapshot == nil {
		return nil
	}
	if config.Organization != GetWecomBusinessOrganizationName(config.CorpId) {
		return nil
	}

	displayName := getWecomRootDepartmentDisplayName(snapshot)
	if displayName == "" {
		return nil
	}
	return updateWecomBusinessOrganizationDisplayName(s.organizationStore(), config.CorpId, displayName)
}

func getWecomRootDepartmentDisplayName(snapshot *WecomOrganizationFullSnapshot) string {
	if snapshot == nil {
		return ""
	}

	for _, department := range snapshot.Departments {
		if department.ParentId == "0" && department.Name != "" {
			return department.Name
		}
	}
	for _, department := range snapshot.Departments {
		if department.Id == "1" && department.Name != "" {
			return department.Name
		}
	}
	for _, department := range snapshot.Departments {
		if department.ParentId == "" && department.Name != "" {
			return department.Name
		}
	}
	for _, department := range snapshot.Departments {
		if department.Name != "" {
			return department.Name
		}
	}
	return ""
}

func (s *WecomOrganizationSyncService) resolveWecomParentGroup(plan *WecomOrganizationSyncPlan, department WecomDepartmentSnapshot) (string, string, bool, error) {
	if department.ParentId == "" || department.ParentId == "0" || department.ParentId == department.Id {
		return "", "", true, nil
	}

	parentGroupName := GetWecomDepartmentGroupName(plan.CorpId, department.ParentId)
	parentMapping, err := s.objectStore().GetWecomDepartmentMapping(plan.Organization, plan.CorpId, department.ParentId)
	if err != nil {
		return "", "", false, err
	}
	if parentMapping != nil && parentMapping.GroupName != "" {
		parentGroupName = parentMapping.GroupName
	}
	return plan.Organization, parentGroupName, false, nil
}

func (s *WecomOrganizationSyncService) resolveWecomUser(plan *WecomOrganizationSyncPlan, mapping *WecomUserMapping, snapshot WecomUserSnapshot, fullExternalId string) (*User, error) {
	store := s.objectStore()
	// 匹配顺序必须先尊重映射表，再查 User 上的企业微信稳定标识。
	// 这样可以保留管理员手工绑定过的本地用户名，不因为企业微信 userid 变化展示字段而重命名。
	if mapping != nil && mapping.UserOwner != "" && mapping.UserName != "" {
		user, err := store.GetUser(mapping.UserOwner, mapping.UserName)
		if err != nil {
			return nil, err
		}
		if user != nil {
			return user, nil
		}
	}

	user, err := store.FindUserByWecomIdentity(plan.Organization, plan.CorpId, snapshot.UserId, fullExternalId)
	if err != nil {
		return nil, err
	}
	if user != nil {
		return user, nil
	}

	userName := GetWecomUserName(snapshot.UserId)
	existingUser, err := store.GetUser(plan.Organization, userName)
	if err != nil {
		return nil, err
	}
	if existingUser != nil && !isUserBoundToWecom(existingUser, snapshot.UserId, fullExternalId) {
		// 理论上 wecom-user-<userid> 足够稳定；若本地已有同名非绑定用户，用 hash 名避开误覆盖。
		userName = getHashedWecomUserName(snapshot.UserId)
	}

	return &User{
		Owner:       plan.Organization,
		Name:        userName,
		Id:          util.GenerateId(),
		Type:        "normal-user",
		CreatedTime: util.GetCurrentTime(),
		UpdatedTime: util.GetCurrentTime(),
		Properties:  map[string]string{},
	}, nil
}

func (s *WecomOrganizationSyncService) upsertWecomUserDepartmentMembership(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, snapshot WecomSnapshotUserDepartment, now time.Time, mainDepartmentAssigned map[string]bool) error {
	if snapshot.WecomUserId == "" || snapshot.DepartmentId == "" {
		return nil
	}

	userMapping, err := store.GetWecomUserMapping(plan.Organization, plan.CorpId, snapshot.WecomUserId)
	if err != nil {
		return err
	}
	if userMapping == nil || userMapping.UserOwner == "" || userMapping.UserName == "" {
		return fmt.Errorf("wecom user mapping not found for userid %q", snapshot.WecomUserId)
	}

	departmentMapping, err := store.GetWecomDepartmentMapping(plan.Organization, plan.CorpId, snapshot.DepartmentId)
	if err != nil {
		return err
	}
	if departmentMapping == nil || departmentMapping.GroupOwner == "" || departmentMapping.GroupName == "" {
		return fmt.Errorf("wecom department mapping not found for department %q", snapshot.DepartmentId)
	}

	user, err := store.GetUser(userMapping.UserOwner, userMapping.UserName)
	if err != nil {
		return err
	}
	if user == nil {
		return fmt.Errorf("local user not found for wecom userid %q", snapshot.WecomUserId)
	}

	existing, err := store.GetWecomUserDepartment(plan.Organization, plan.CorpId, snapshot.WecomUserId, snapshot.DepartmentId)
	if err != nil {
		return err
	}

	if existing != nil {
		// 关系恢复或部门映射修正时，旧关系记录可能指向旧 Group。
		// 此处只移除旧企业微信部门组，不碰用户已有的手工组和其他系统来源组。
		oldGroupId := getWecomGroupId(existing.GroupOwner, existing.GroupName)
		newGroupId := getWecomGroupId(departmentMapping.GroupOwner, departmentMapping.GroupName)
		if oldGroupId != "" && oldGroupId != newGroupId {
			user.Groups = removeStringValue(user.Groups, oldGroupId)
		}
	}

	isMain := false
	if snapshot.IsMain {
		mainKey := plan.Organization + "\x1f" + plan.CorpId + "\x1f" + snapshot.WecomUserId
		if !mainDepartmentAssigned[mainKey] {
			isMain = true
			mainDepartmentAssigned[mainKey] = true
		}
	}

	membership := existing
	if membership == nil {
		membership = &WecomUserDepartment{
			Owner: plan.Organization,
			Name:  GetWecomRelationshipName(plan.Organization, plan.CorpId, WecomRelationshipTypeUserDepartment, snapshot.WecomUserId, snapshot.DepartmentId),
		}
	}
	if membership.Owner == "" {
		membership.Owner = plan.Organization
	}
	if membership.Name == "" {
		membership.Name = GetWecomRelationshipName(plan.Organization, plan.CorpId, WecomRelationshipTypeUserDepartment, snapshot.WecomUserId, snapshot.DepartmentId)
	}
	membership.Organization = plan.Organization
	membership.CorpId = plan.CorpId
	membership.WecomUserId = snapshot.WecomUserId
	membership.DepartmentId = snapshot.DepartmentId
	membership.UserOwner = userMapping.UserOwner
	membership.UserName = userMapping.UserName
	membership.GroupOwner = departmentMapping.GroupOwner
	membership.GroupName = departmentMapping.GroupName
	membership.IsMain = isMain
	membership.IsLeader = snapshot.IsLeader
	membership.IsEnabled = true
	membership.MissingSinceRunId = ""
	membership.LastSeenRunId = plan.RunId
	membership.LastSyncedAt = now
	if err := store.SaveWecomUserDepartment(membership); err != nil {
		return err
	}
	if err := s.projectWecomPlatformMembership(store, plan, membership, now, PlatformLifecycleStatusActive); err != nil {
		return err
	}

	groupId := getWecomGroupId(membership.GroupOwner, membership.GroupName)
	if groupId != "" {
		// User.Groups 仍是后台现有用户组展示和授权联动字段。
		// 成员部门关系表是权限范围事实来源，这里只做兼容性的部门组补齐。
		user.Groups = appendStringOnce(user.Groups, groupId)
	}
	return store.SaveUserGroups(user)
}

func (s *WecomOrganizationSyncService) disableWecomUserDepartmentMembership(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, stale WecomUserDepartment, now time.Time) error {
	if stale.WecomUserId == "" || stale.DepartmentId == "" {
		return nil
	}

	membership, err := store.GetWecomUserDepartment(plan.Organization, plan.CorpId, stale.WecomUserId, stale.DepartmentId)
	if err != nil {
		return err
	}
	if membership == nil {
		copied := stale
		membership = &copied
	}
	if membership.Owner == "" {
		membership.Owner = plan.Organization
	}
	if membership.Name == "" {
		membership.Name = GetWecomRelationshipName(plan.Organization, plan.CorpId, WecomRelationshipTypeUserDepartment, stale.WecomUserId, stale.DepartmentId)
	}
	membership.Organization = plan.Organization
	membership.CorpId = plan.CorpId
	membership.WecomUserId = stale.WecomUserId
	membership.DepartmentId = stale.DepartmentId
	membership.IsEnabled = false
	membership.IsMain = false
	membership.MissingSinceRunId = plan.RunId
	membership.LastSyncedAt = now
	if err := store.SaveWecomUserDepartment(membership); err != nil {
		return err
	}
	if err := s.projectWecomPlatformMembership(store, plan, membership, now, PlatformLifecycleStatusDisabled); err != nil {
		return err
	}
	if err := s.projectWecomLifecycleEvent(store, plan, PlatformSubjectTypeUser, getWecomLocalId(membership.UserOwner, membership.UserName), PlatformLifecycleStatusDisabled, "wecom_membership_disabled", now); err != nil {
		return err
	}

	user, err := s.getUserForWecomMembership(store, plan, membership)
	if err != nil {
		return err
	}
	if user == nil {
		return nil
	}
	groupId := getWecomGroupId(membership.GroupOwner, membership.GroupName)
	if groupId == "" {
		return nil
	}
	// 只按当前失效关系对应的企业微信部门组做精确删除，避免覆盖手工维护的组成员关系。
	updatedGroups := removeStringValue(user.Groups, groupId)
	if stringSlicesEqual(updatedGroups, user.Groups) {
		return nil
	}
	user.Groups = updatedGroups
	return store.SaveUserGroups(user)
}

func (s *WecomOrganizationSyncService) getUserForWecomMembership(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, membership *WecomUserDepartment) (*User, error) {
	if membership.UserOwner != "" && membership.UserName != "" {
		return store.GetUser(membership.UserOwner, membership.UserName)
	}

	userMapping, err := store.GetWecomUserMapping(plan.Organization, plan.CorpId, membership.WecomUserId)
	if err != nil {
		return nil, err
	}
	if userMapping == nil || userMapping.UserOwner == "" || userMapping.UserName == "" {
		return nil, nil
	}
	return store.GetUser(userMapping.UserOwner, userMapping.UserName)
}

func (s *WecomOrganizationSyncService) upsertWecomDepartmentLeader(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, snapshot WecomSnapshotDepartmentLeader, now time.Time, primaryLeaderAssigned map[string]bool) error {
	if snapshot.DepartmentId == "" || snapshot.LeaderWecomUserId == "" {
		return nil
	}

	departmentMapping, err := store.GetWecomDepartmentMapping(plan.Organization, plan.CorpId, snapshot.DepartmentId)
	if err != nil {
		return err
	}
	if departmentMapping == nil || departmentMapping.GroupOwner == "" || departmentMapping.GroupName == "" {
		return fmt.Errorf("wecom department mapping not found for department %q", snapshot.DepartmentId)
	}

	userMapping, err := store.GetWecomUserMapping(plan.Organization, plan.CorpId, snapshot.LeaderWecomUserId)
	if err != nil {
		return err
	}
	if userMapping == nil || userMapping.UserOwner == "" || userMapping.UserName == "" {
		return fmt.Errorf("wecom user mapping not found for department leader userid %q", snapshot.LeaderWecomUserId)
	}

	existing, err := store.GetWecomDepartmentLeader(plan.Organization, plan.CorpId, snapshot.DepartmentId, snapshot.LeaderWecomUserId)
	if err != nil {
		return err
	}

	isPrimary := false
	if snapshot.IsPrimary {
		primaryKey := plan.Organization + "\x1f" + plan.CorpId + "\x1f" + snapshot.DepartmentId
		if !primaryLeaderAssigned[primaryKey] {
			isPrimary = true
			primaryLeaderAssigned[primaryKey] = true
		}
	}

	oldLeaderLocalId := ""
	if existing != nil {
		oldLeaderLocalId = getWecomLocalId(existing.LeaderUserOwner, existing.LeaderUserName)
	}

	leader := existing
	if leader == nil {
		leader = &WecomDepartmentLeader{
			Owner: plan.Organization,
			Name:  GetWecomRelationshipName(plan.Organization, plan.CorpId, WecomRelationshipTypeDepartmentLead, snapshot.DepartmentId, snapshot.LeaderWecomUserId),
		}
	}
	if leader.Owner == "" {
		leader.Owner = plan.Organization
	}
	if leader.Name == "" {
		leader.Name = GetWecomRelationshipName(plan.Organization, plan.CorpId, WecomRelationshipTypeDepartmentLead, snapshot.DepartmentId, snapshot.LeaderWecomUserId)
	}
	leader.Organization = plan.Organization
	leader.CorpId = plan.CorpId
	leader.DepartmentId = snapshot.DepartmentId
	leader.GroupOwner = departmentMapping.GroupOwner
	leader.GroupName = departmentMapping.GroupName
	leader.LeaderWecomUserId = snapshot.LeaderWecomUserId
	leader.LeaderUserOwner = userMapping.UserOwner
	leader.LeaderUserName = userMapping.UserName
	leader.IsPrimary = isPrimary
	leader.IsEnabled = true
	leader.MissingSinceRunId = ""
	leader.LastSeenRunId = plan.RunId
	leader.LastSyncedAt = now
	if err := store.SaveWecomDepartmentLeader(leader); err != nil {
		return err
	}
	if err := s.projectWecomDepartmentLeaderMembership(store, plan, leader, now, PlatformLifecycleStatusActive); err != nil {
		return err
	}

	leaderLocalId := getWecomLocalId(leader.LeaderUserOwner, leader.LeaderUserName)
	if isPrimary {
		return s.setWecomDepartmentPrimaryLeaderCache(store, departmentMapping, snapshot.LeaderWecomUserId, leaderLocalId)
	}

	// 负责人仍存在但不再是主负责人时，要同步清理旧展示缓存。
	// 清理条件做精确匹配，避免非主负责人覆盖已经设置好的新主负责人。
	if oldLeaderLocalId != "" {
		if err := s.clearWecomDepartmentPrimaryLeaderCacheIfMatching(store, departmentMapping, snapshot.LeaderWecomUserId, oldLeaderLocalId); err != nil {
			return err
		}
	}
	return s.clearWecomDepartmentPrimaryLeaderCacheIfMatching(store, departmentMapping, snapshot.LeaderWecomUserId, leaderLocalId)
}

func (s *WecomOrganizationSyncService) disableWecomDepartmentLeader(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, stale WecomDepartmentLeader, now time.Time) error {
	if stale.DepartmentId == "" || stale.LeaderWecomUserId == "" {
		return nil
	}

	leader, err := store.GetWecomDepartmentLeader(plan.Organization, plan.CorpId, stale.DepartmentId, stale.LeaderWecomUserId)
	if err != nil {
		return err
	}
	if leader == nil {
		copied := stale
		leader = &copied
	}
	if leader.Owner == "" {
		leader.Owner = plan.Organization
	}
	if leader.Name == "" {
		leader.Name = GetWecomRelationshipName(plan.Organization, plan.CorpId, WecomRelationshipTypeDepartmentLead, stale.DepartmentId, stale.LeaderWecomUserId)
	}
	leader.Organization = plan.Organization
	leader.CorpId = plan.CorpId
	leader.DepartmentId = stale.DepartmentId
	leader.LeaderWecomUserId = stale.LeaderWecomUserId
	leader.IsPrimary = false
	leader.IsEnabled = false
	leader.MissingSinceRunId = plan.RunId
	leader.LastSyncedAt = now
	if err := store.SaveWecomDepartmentLeader(leader); err != nil {
		return err
	}
	if err := s.projectWecomDepartmentLeaderMembership(store, plan, leader, now, PlatformLifecycleStatusDisabled); err != nil {
		return err
	}

	departmentMapping, err := s.getDepartmentMappingForLeader(store, plan, leader)
	if err != nil {
		return err
	}
	if departmentMapping == nil {
		return nil
	}
	return s.clearWecomDepartmentPrimaryLeaderCacheIfMatching(store, departmentMapping, stale.LeaderWecomUserId, getWecomLocalId(leader.LeaderUserOwner, leader.LeaderUserName))
}

func (s *WecomOrganizationSyncService) getDepartmentMappingForLeader(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, leader *WecomDepartmentLeader) (*WecomDepartmentMapping, error) {
	if leader == nil || leader.DepartmentId == "" {
		return nil, nil
	}
	return store.GetWecomDepartmentMapping(plan.Organization, plan.CorpId, leader.DepartmentId)
}

func (s *WecomOrganizationSyncService) setWecomDepartmentPrimaryLeaderCache(store WecomOrganizationObjectStore, mapping *WecomDepartmentMapping, primaryLeaderWecomUserId string, primaryLeaderLocalId string) error {
	if mapping == nil {
		return nil
	}
	group, err := store.GetGroup(mapping.GroupOwner, mapping.GroupName)
	if err != nil {
		return err
	}
	if group == nil {
		return fmt.Errorf("local group not found for wecom department %q", mapping.DepartmentId)
	}

	group.Manager = primaryLeaderLocalId
	if err := store.SaveGroup(group); err != nil {
		return err
	}

	// 主负责人关系表是事实来源，映射表字段只作为查询和展示缓存同步派生。
	mapping.PrimaryLeaderWecomUserId = primaryLeaderWecomUserId
	return store.SaveWecomDepartmentMapping(mapping)
}

func (s *WecomOrganizationSyncService) clearWecomDepartmentPrimaryLeaderCacheIfMatching(store WecomOrganizationObjectStore, mapping *WecomDepartmentMapping, leaderWecomUserId string, leaderLocalId string) error {
	if mapping == nil {
		return nil
	}

	group, err := store.GetGroup(mapping.GroupOwner, mapping.GroupName)
	if err != nil {
		return err
	}
	if group == nil {
		return nil
	}

	changed := false
	if leaderLocalId != "" && group.Manager == leaderLocalId {
		group.Manager = ""
		changed = true
	}
	if changed {
		if err := store.SaveGroup(group); err != nil {
			return err
		}
	}

	if leaderWecomUserId != "" && mapping.PrimaryLeaderWecomUserId == leaderWecomUserId {
		mapping.PrimaryLeaderWecomUserId = ""
		return store.SaveWecomDepartmentMapping(mapping)
	}
	return nil
}

func (s *WecomOrganizationSyncService) upsertWecomDirectLeader(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, snapshot WecomSnapshotDirectLeader, now time.Time) error {
	if snapshot.WecomUserId == "" || snapshot.LeaderWecomUserId == "" {
		return nil
	}

	userMapping, err := store.GetWecomUserMapping(plan.Organization, plan.CorpId, snapshot.WecomUserId)
	if err != nil {
		return err
	}
	if userMapping == nil || userMapping.UserOwner == "" || userMapping.UserName == "" {
		return fmt.Errorf("wecom user mapping not found for userid %q", snapshot.WecomUserId)
	}

	leaderMapping, err := store.GetWecomUserMapping(plan.Organization, plan.CorpId, snapshot.LeaderWecomUserId)
	if err != nil {
		return err
	}
	if leaderMapping == nil || leaderMapping.UserOwner == "" || leaderMapping.UserName == "" {
		return fmt.Errorf("wecom user mapping not found for direct leader userid %q", snapshot.LeaderWecomUserId)
	}

	existing, err := store.GetWecomUserDirectLeader(plan.Organization, plan.CorpId, snapshot.WecomUserId, snapshot.LeaderWecomUserId)
	if err != nil {
		return err
	}

	leader := existing
	if leader == nil {
		leader = &WecomUserDirectLeader{
			Owner: plan.Organization,
			Name:  GetWecomRelationshipName(plan.Organization, plan.CorpId, WecomRelationshipTypeDirectLeader, snapshot.WecomUserId, snapshot.LeaderWecomUserId),
		}
	}
	if leader.Owner == "" {
		leader.Owner = plan.Organization
	}
	if leader.Name == "" {
		leader.Name = GetWecomRelationshipName(plan.Organization, plan.CorpId, WecomRelationshipTypeDirectLeader, snapshot.WecomUserId, snapshot.LeaderWecomUserId)
	}
	leader.Organization = plan.Organization
	leader.CorpId = plan.CorpId
	leader.WecomUserId = snapshot.WecomUserId
	leader.LeaderWecomUserId = snapshot.LeaderWecomUserId
	leader.UserOwner = userMapping.UserOwner
	leader.UserName = userMapping.UserName
	leader.LeaderUserOwner = leaderMapping.UserOwner
	leader.LeaderUserName = leaderMapping.UserName
	leader.IsEnabled = true
	leader.MissingSinceRunId = ""
	leader.LastSeenRunId = plan.RunId
	leader.LastSyncedAt = now
	return store.SaveWecomUserDirectLeader(leader)
}

func (s *WecomOrganizationSyncService) disableWecomDirectLeader(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, stale WecomUserDirectLeader, now time.Time) error {
	if stale.WecomUserId == "" || stale.LeaderWecomUserId == "" {
		return nil
	}

	leader, err := store.GetWecomUserDirectLeader(plan.Organization, plan.CorpId, stale.WecomUserId, stale.LeaderWecomUserId)
	if err != nil {
		return err
	}
	if leader == nil {
		copied := stale
		leader = &copied
	}
	if leader.Owner == "" {
		leader.Owner = plan.Organization
	}
	if leader.Name == "" {
		leader.Name = GetWecomRelationshipName(plan.Organization, plan.CorpId, WecomRelationshipTypeDirectLeader, stale.WecomUserId, stale.LeaderWecomUserId)
	}
	leader.Organization = plan.Organization
	leader.CorpId = plan.CorpId
	leader.WecomUserId = stale.WecomUserId
	leader.LeaderWecomUserId = stale.LeaderWecomUserId
	leader.IsEnabled = false
	leader.MissingSinceRunId = plan.RunId
	leader.LastSyncedAt = now
	return store.SaveWecomUserDirectLeader(leader)
}

func (s *WecomOrganizationSyncService) disableMissingWecomDepartment(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, stale WecomDepartmentMapping, now time.Time) error {
	if stale.DepartmentId == "" {
		return nil
	}

	mapping, err := store.GetWecomDepartmentMapping(plan.Organization, plan.CorpId, stale.DepartmentId)
	if err != nil {
		return err
	}
	if mapping == nil {
		copied := stale
		mapping = &copied
	}
	if mapping.Owner == "" {
		mapping.Owner = plan.Organization
	}
	if mapping.Name == "" {
		mapping.Name = GetWecomDepartmentMappingName(plan.Organization, plan.CorpId, stale.DepartmentId)
	}
	mapping.Organization = plan.Organization
	mapping.CorpId = plan.CorpId
	mapping.DepartmentId = stale.DepartmentId
	mapping.IsEnabled = false
	mapping.MissingSinceRunId = keepFirstMissingRunId(mapping.MissingSinceRunId, plan.RunId)
	mapping.LastSyncedAt = now
	if err := store.SaveWecomDepartmentMapping(mapping); err != nil {
		return err
	}
	if err := s.projectWecomPlatformDepartment(store, plan, mapping, now); err != nil {
		return err
	}

	groupOwner := firstNonEmpty(mapping.GroupOwner, stale.GroupOwner)
	groupName := firstNonEmpty(mapping.GroupName, stale.GroupName)
	if groupOwner == "" || groupName == "" {
		return nil
	}
	group, err := store.GetGroup(groupOwner, groupName)
	if err != nil {
		return err
	}
	if group == nil {
		return nil
	}
	// 缺失部门只软禁用本地 Group，保留对象和映射，便于误删后恢复。
	group.IsEnabled = false
	return store.SaveGroup(group)
}

func (s *WecomOrganizationSyncService) disableMissingWecomUser(store WecomOrganizationObjectStore, plan *WecomOrganizationSyncPlan, stale WecomUserMapping, now time.Time) error {
	if stale.WecomUserId == "" {
		return nil
	}

	mapping, err := store.GetWecomUserMapping(plan.Organization, plan.CorpId, stale.WecomUserId)
	if err != nil {
		return err
	}
	if mapping == nil {
		copied := stale
		mapping = &copied
	}
	if mapping.Owner == "" {
		mapping.Owner = plan.Organization
	}
	if mapping.Name == "" {
		mapping.Name = GetWecomUserMappingName(plan.Organization, plan.CorpId, stale.WecomUserId)
	}
	mapping.Organization = plan.Organization
	mapping.CorpId = plan.CorpId
	mapping.WecomUserId = stale.WecomUserId
	mapping.IsEnabled = false
	mapping.MissingSinceRunId = keepFirstMissingRunId(mapping.MissingSinceRunId, plan.RunId)
	mapping.LastSyncedAt = now
	if err := store.SaveWecomUserMapping(mapping); err != nil {
		return err
	}
	if err := s.projectWecomPlatformUserFromMapping(store, plan, mapping, now); err != nil {
		return err
	}

	userOwner := firstNonEmpty(mapping.UserOwner, stale.UserOwner)
	userName := firstNonEmpty(mapping.UserName, stale.UserName)
	if userOwner == "" || userName == "" {
		return nil
	}
	user, err := store.GetUser(userOwner, userName)
	if err != nil {
		return err
	}
	if user == nil {
		return nil
	}
	// 用户缺失时不删除账号、不清空用户组，只禁止继续作为有效企业微信成员使用。
	user.IsForbidden = true
	user.IsDeleted = false
	return store.SaveUser(user)
}

func applyWecomUserSnapshot(user *User, corpId string, externalId string, snapshot WecomUserSnapshot) {
	user.Owner = strings.TrimSpace(user.Owner)
	user.UpdatedTime = util.GetCurrentTime()
	if user.CreatedTime == "" {
		user.CreatedTime = user.UpdatedTime
	}
	if user.Id == "" {
		user.Id = util.GenerateId()
	}
	if user.Type == "" {
		user.Type = "normal-user"
	}
	if user.SignupApplication == "" {
		// 企业微信同步用户需要稳定应用上下文，否则后台编辑页无法读取用户所属应用。
		user.SignupApplication = GetWecomBusinessApplicationName(corpId)
	}
	user.ExternalId = externalId
	user.Wecom = snapshot.UserId
	user.DisplayName = wecomUserDisplayName(snapshot)
	// 头像、手机号、邮箱在新建自建应用中可能不会返回；组织同步不应清空后续 OAuth 或人事主数据回填的资料。
	applyNonEmptyWecomUserField(&user.Phone, snapshot.Mobile, snapshot.Telephone)
	applyNonEmptyWecomUserField(&user.Email, snapshot.Email, snapshot.BizMail)
	user.Title = snapshot.Position
	applyNonEmptyWecomUserField(&user.Avatar, snapshot.Avatar, snapshot.ThumbAvatar)
	user.IsForbidden = isForbiddenWecomUserStatus(snapshot.Status)
	if user.Properties == nil {
		user.Properties = map[string]string{}
	}
	setWecomUserProperty(user, WecomUserPropertyCorpId, corpId)
	setWecomUserProperty(user, WecomUserPropertyUserId, snapshot.UserId)
	setWecomUserProperty(user, WecomUserPropertyOpenUserId, snapshot.OpenUserId)
	setWecomUserProperty(user, WecomUserPropertyAlias, snapshot.Alias)
	setWecomUserProperty(user, WecomUserPropertyBizMail, snapshot.BizMail)
	setWecomUserProperty(user, WecomUserPropertyMainDepartmentId, snapshot.MainDepartmentId)
	if snapshot.Status == 0 {
		setWecomUserProperty(user, WecomUserPropertyStatus, "")
	} else {
		setWecomUserProperty(user, WecomUserPropertyStatus, fmt.Sprintf("%d", snapshot.Status))
	}
}

func applyNonEmptyWecomUserField(target *string, values ...string) {
	value := firstNonEmpty(values...)
	if value != "" {
		*target = value
	}
}

func setWecomUserProperty(user *User, key string, value string) {
	if user.Properties == nil {
		user.Properties = map[string]string{}
	}
	if value == "" {
		delete(user.Properties, key)
		return
	}
	user.Properties[key] = value
}

func isUserBoundToWecom(user *User, wecomUserId string, fullExternalId string) bool {
	if user == nil {
		return false
	}
	if user.Wecom == wecomUserId || user.ExternalId == fullExternalId {
		return true
	}
	return user.Properties != nil && user.Properties[WecomUserPropertyUserId] == wecomUserId
}

func isPossibleDuplicateSelf(user *User, wecomUserId string, fullExternalId string, lengthSafeExternalId string) bool {
	if isUserBoundToWecom(user, wecomUserId, fullExternalId) {
		return true
	}
	return user != nil && lengthSafeExternalId != "" && user.ExternalId == lengthSafeExternalId
}

func marshalWecomPossibleDuplicateUsers(userIds []string) string {
	if len(userIds) == 0 {
		return ""
	}
	data, err := json.Marshal(userIds)
	if err != nil {
		return ""
	}
	return string(data)
}

func isEnabledWecomUserStatus(status int) bool {
	return status == 0 || status == 1
}

func isForbiddenWecomUserStatus(status int) bool {
	return status == 2 || status == 4 || status == 5
}

func wecomDepartmentDisplayName(department WecomDepartmentSnapshot) string {
	if department.Name != "" {
		return department.Name
	}
	return department.Id
}

func wecomUserDisplayName(user WecomUserSnapshot) string {
	if user.Name != "" {
		return user.Name
	}
	return user.UserId
}

func firstString(values []string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func keepFirstMissingRunId(existing string, current string) string {
	if existing != "" {
		return existing
	}
	return current
}

func getWecomGroupId(owner string, name string) string {
	return getWecomLocalId(owner, name)
}

func getWecomLocalId(owner string, name string) string {
	if owner == "" || name == "" {
		return ""
	}
	return util.GetId(owner, name)
}

func appendStringOnce(values []string, value string) []string {
	if value == "" || stringSliceContains(values, value) {
		return values
	}
	return append(values, value)
}

func removeStringValue(values []string, value string) []string {
	if value == "" {
		return values
	}
	result := make([]string, 0, len(values))
	for _, item := range values {
		if item != value {
			result = append(result, item)
		}
	}
	return result
}

func stringSliceContains(values []string, value string) bool {
	for _, item := range values {
		if item == value {
			return true
		}
	}
	return false
}

func stringSlicesEqual(left []string, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for index := range left {
		if left[index] != right[index] {
			return false
		}
	}
	return true
}

// GetWecomDepartmentGroupName 返回企业微信部门对应的稳定本地 Group.Name。
// Group.Name 在当前表结构中有全局唯一索引，因此新建部门组必须同时包含企业 ID 和部门 ID。
func GetWecomDepartmentGroupName(corpId string, departmentId string) string {
	return boundedWecomName(WecomDepartmentGroupNamePrefix, corpId+"-"+departmentId, 100)
}

// GetWecomDepartmentMappingName 返回企业微信部门映射记录的稳定对象名。
func GetWecomDepartmentMappingName(organization string, corpId string, departmentId string) string {
	return boundedWecomName(WecomDepartmentMappingNamePrefix, organization+"-"+corpId+"-"+departmentId, 100)
}

// GetWecomUserName 返回企业微信成员新建本地 User 时使用的稳定用户名。
func GetWecomUserName(userId string) string {
	return boundedWecomName(WecomUserNamePrefix, userId, 255)
}

func getHashedWecomUserName(userId string) string {
	return WecomUserNamePrefix + shortWecomHash(userId, 24)
}

// GetWecomUserMappingName 返回企业微信成员映射记录的稳定对象名。
func GetWecomUserMappingName(organization string, corpId string, userId string) string {
	return boundedWecomName(WecomUserMappingNamePrefix, organization+"-"+corpId+"-"+userId, 100)
}

// GetWecomUserFullExternalId 返回完整企业微信外部身份标识。
func GetWecomUserFullExternalId(corpId string, userId string) string {
	return "wecom:" + corpId + ":" + userId
}

// GetWecomUserMapping 返回已同步企业微信成员与本地用户的稳定映射。
// Insight 用量身份解析只读取该映射中的 ExternalId，不修改同步状态。
func GetWecomUserMapping(organization string, corpId string, wecomUserId string) (*WecomUserMapping, error) {
	return defaultWecomOrganizationObjectStore{}.GetWecomUserMapping(organization, corpId, wecomUserId)
}

// GetLengthSafeWecomUserExternalId 返回可安全写入 User.ExternalId 的企业微信身份标识。
// 完整标识超出 User.ExternalId 长度时改写为 sha256，完整值仍保存在 WecomUserMapping.ExternalId。
func GetLengthSafeWecomUserExternalId(corpId string, userId string) string {
	fullExternalId := GetWecomUserFullExternalId(corpId, userId)
	if len(fullExternalId) <= WecomUserExternalIdMaxLength {
		return fullExternalId
	}
	return "wecom:sha256:" + sha256Hex(fullExternalId)
}

func boundedWecomName(prefix string, raw string, maxLength int) string {
	sanitized := sanitizeWecomIdentifier(raw)
	if sanitized == "" {
		return prefix + shortWecomHash(raw, 24)
	}

	name := prefix + sanitized
	if len(name) <= maxLength {
		return name
	}

	hash := shortWecomHash(raw, 12)
	available := maxLength - len(prefix) - len(hash) - 1
	if available <= 0 {
		return prefix + hash
	}
	if available > len(sanitized) {
		available = len(sanitized)
	}
	return prefix + sanitized[:available] + "-" + hash
}

func sanitizeWecomIdentifier(value string) string {
	value = strings.TrimSpace(value)
	var builder strings.Builder
	lastDash := false
	for _, r := range value {
		if isSafeWecomNameRune(r) {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			builder.WriteByte('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), ".-_")
}

func isSafeWecomNameRune(r rune) bool {
	return r >= 'a' && r <= 'z' ||
		r >= 'A' && r <= 'Z' ||
		r >= '0' && r <= '9' ||
		r == '.' || r == '_' || r == '-'
}

func shortWecomHash(value string, length int) string {
	hash := sha256Hex(value)
	if length <= 0 || length >= len(hash) {
		return hash
	}
	return hash[:length]
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func (s defaultWecomOrganizationObjectStore) GetGroup(owner string, name string) (*Group, error) {
	return getGroup(owner, name)
}

func (s defaultWecomOrganizationObjectStore) SaveGroup(group *Group) error {
	if group == nil {
		return nil
	}
	existing, err := getGroup(group.Owner, group.Name)
	if err != nil {
		return err
	}
	if existing == nil {
		_, err = AddGroup(group)
		return err
	}
	if group.CreatedTime == "" {
		group.CreatedTime = existing.CreatedTime
	}
	_, err = UpdateGroup(existing.GetId(), group)
	return err
}

func (s defaultWecomOrganizationObjectStore) GetWecomDepartmentMapping(organization string, corpId string, departmentId string) (*WecomDepartmentMapping, error) {
	if organization == "" || corpId == "" || departmentId == "" {
		return nil, nil
	}

	mapping := &WecomDepartmentMapping{}
	existed, err := ormer.Engine.
		Where("organization = ?", organization).
		And("corp_id = ?", corpId).
		And("department_id = ?", departmentId).
		Get(mapping)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return mapping, nil
}

func (s defaultWecomOrganizationObjectStore) SaveWecomDepartmentMapping(mapping *WecomDepartmentMapping) error {
	if mapping == nil {
		return nil
	}
	existing, err := s.GetWecomDepartmentMapping(mapping.Organization, mapping.CorpId, mapping.DepartmentId)
	if err != nil {
		return err
	}
	if existing == nil {
		_, err = ormer.Engine.Insert(mapping)
		return err
	}
	mapping.Owner = existing.Owner
	mapping.Name = existing.Name
	_, err = ormer.Engine.ID(core.PK{mapping.Owner, mapping.Name}).AllCols().Update(mapping)
	return err
}

func (s defaultWecomOrganizationObjectStore) FindUserByWecomIdentity(organization string, corpId string, wecomUserId string, fullExternalId string) (*User, error) {
	if organization == "" || wecomUserId == "" {
		return nil, nil
	}

	// 优先匹配 User.Wecom，这是登录绑定和组织同步都能共用的稳定企业微信 userid。
	user := &User{}
	existed, err := ormer.Engine.Where("owner = ?", organization).And("wecom = ?", wecomUserId).Get(user)
	if err != nil {
		return nil, err
	}
	if existed {
		return user, nil
	}

	if fullExternalId != "" {
		user = &User{}
		existed, err = ormer.Engine.Where("owner = ?", organization).And("external_id = ?", fullExternalId).Get(user)
		if err != nil {
			return nil, err
		}
		if existed {
			return user, nil
		}
	}

	// 兼容历史同步已经写入长度安全 ExternalId，但映射表缺失或待修复的情况。
	lengthSafeExternalId := GetLengthSafeWecomUserExternalId(corpId, wecomUserId)
	if lengthSafeExternalId != "" && lengthSafeExternalId != fullExternalId {
		user = &User{}
		existed, err = ormer.Engine.Where("owner = ?", organization).And("external_id = ?", lengthSafeExternalId).Get(user)
		if err != nil {
			return nil, err
		}
		if existed {
			return user, nil
		}
	}

	users, err := GetUsers(organization)
	if err != nil {
		return nil, err
	}
	for _, item := range users {
		if item.Properties != nil && item.Properties[WecomUserPropertyUserId] == wecomUserId {
			return item, nil
		}
	}
	return nil, nil
}

// FindPossibleDuplicateUsers 只提供弱标识重复候选，不能驱动自动绑定。
// 自动 join 仍必须依赖 sourceConnectionId、externalSubjectId 和 adminSubject 这类稳定身份字段。
func (s defaultWecomOrganizationObjectStore) FindPossibleDuplicateUsers(organization string, corpId string, wecomUserId string, fullExternalId string, displayName string, phone string, email string) ([]string, error) {
	organization = strings.TrimSpace(organization)
	displayName = strings.TrimSpace(displayName)
	phone = strings.TrimSpace(phone)
	email = strings.TrimSpace(email)
	if organization == "" || (displayName == "" && phone == "" && email == "") {
		return nil, nil
	}

	conditions := []string{}
	args := []interface{}{}
	if displayName != "" {
		conditions = append(conditions, "display_name = ?")
		args = append(args, displayName)
	}
	if phone != "" {
		conditions = append(conditions, "phone = ?")
		args = append(args, phone)
	}
	if email != "" {
		conditions = append(conditions, "email = ?")
		args = append(args, email)
	}

	users := []*User{}
	err := ormer.Engine.
		Where("owner = ?", organization).
		And("("+strings.Join(conditions, " OR ")+")", args...).
		Find(&users)
	if err != nil {
		return nil, err
	}

	lengthSafeExternalId := GetLengthSafeWecomUserExternalId(corpId, wecomUserId)
	userIds := make([]string, 0, len(users))
	for _, user := range users {
		if isPossibleDuplicateSelf(user, wecomUserId, fullExternalId, lengthSafeExternalId) {
			continue
		}
		userIds = append(userIds, user.GetId())
	}
	sort.Strings(userIds)
	return userIds, nil
}

func (s defaultWecomOrganizationObjectStore) GetUser(owner string, name string) (*User, error) {
	return getUser(owner, name)
}

func (s defaultWecomOrganizationObjectStore) SaveUser(user *User) error {
	if user == nil {
		return nil
	}
	existing, err := getUser(user.Owner, user.Name)
	if err != nil {
		return err
	}
	if existing == nil {
		_, err = AddUsers([]*User{user})
		return err
	}
	if user.CreatedTime == "" {
		user.CreatedTime = existing.CreatedTime
	}
	_, err = updateUser(user.GetId(), user, wecomUserSaveColumns())
	return err
}

func wecomUserSaveColumns() []string {
	return []string{
		"external_id",
		"display_name",
		"avatar",
		"email",
		"phone",
		"title",
		"type",
		"wecom",
		"signup_application",
		"properties",
		"is_forbidden",
		"updated_time",
	}
}

func (s defaultWecomOrganizationObjectStore) SaveUserGroups(user *User) error {
	if user == nil {
		return nil
	}
	_, err := UpdateUser(user.GetId(), user, []string{"groups"}, false)
	return err
}

func (s defaultWecomOrganizationObjectStore) GetWecomUserMapping(organization string, corpId string, wecomUserId string) (*WecomUserMapping, error) {
	if organization == "" || corpId == "" || wecomUserId == "" {
		return nil, nil
	}
	if ormer == nil || ormer.Engine == nil {
		return nil, nil
	}

	mapping := &WecomUserMapping{}
	existed, err := ormer.Engine.
		Where("organization = ?", organization).
		And("corp_id = ?", corpId).
		And("wecom_user_id = ?", wecomUserId).
		Get(mapping)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return mapping, nil
}

func (s defaultWecomOrganizationObjectStore) SaveWecomUserMapping(mapping *WecomUserMapping) error {
	if mapping == nil {
		return nil
	}
	existing, err := s.GetWecomUserMapping(mapping.Organization, mapping.CorpId, mapping.WecomUserId)
	if err != nil {
		return err
	}
	if existing == nil {
		_, err = ormer.Engine.Insert(mapping)
		return err
	}
	mapping.Owner = existing.Owner
	mapping.Name = existing.Name
	_, err = ormer.Engine.ID(core.PK{mapping.Owner, mapping.Name}).AllCols().Update(mapping)
	return err
}

func (s defaultWecomOrganizationObjectStore) GetWecomUserDepartment(organization string, corpId string, wecomUserId string, departmentId string) (*WecomUserDepartment, error) {
	if organization == "" || corpId == "" || wecomUserId == "" || departmentId == "" {
		return nil, nil
	}

	membership := &WecomUserDepartment{}
	existed, err := ormer.Engine.
		Where("organization = ?", organization).
		And("corp_id = ?", corpId).
		And("wecom_user_id = ?", wecomUserId).
		And("department_id = ?", departmentId).
		Get(membership)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return membership, nil
}

func (s defaultWecomOrganizationObjectStore) SaveWecomUserDepartment(membership *WecomUserDepartment) error {
	if membership == nil {
		return nil
	}
	existing, err := s.GetWecomUserDepartment(membership.Organization, membership.CorpId, membership.WecomUserId, membership.DepartmentId)
	if err != nil {
		return err
	}
	if existing == nil {
		_, err = ormer.Engine.Insert(membership)
		return err
	}
	membership.Owner = existing.Owner
	membership.Name = existing.Name
	_, err = ormer.Engine.ID(core.PK{membership.Owner, membership.Name}).AllCols().Update(membership)
	return err
}

func (s defaultWecomOrganizationObjectStore) GetWecomDepartmentLeader(organization string, corpId string, departmentId string, leaderWecomUserId string) (*WecomDepartmentLeader, error) {
	if organization == "" || corpId == "" || departmentId == "" || leaderWecomUserId == "" {
		return nil, nil
	}

	leader := &WecomDepartmentLeader{}
	existed, err := ormer.Engine.
		Where("organization = ?", organization).
		And("corp_id = ?", corpId).
		And("department_id = ?", departmentId).
		And("leader_wecom_user_id = ?", leaderWecomUserId).
		Get(leader)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return leader, nil
}

func (s defaultWecomOrganizationObjectStore) SaveWecomDepartmentLeader(leader *WecomDepartmentLeader) error {
	if leader == nil {
		return nil
	}
	existing, err := s.GetWecomDepartmentLeader(leader.Organization, leader.CorpId, leader.DepartmentId, leader.LeaderWecomUserId)
	if err != nil {
		return err
	}
	if existing == nil {
		_, err = ormer.Engine.Insert(leader)
		return err
	}
	leader.Owner = existing.Owner
	leader.Name = existing.Name
	_, err = ormer.Engine.ID(core.PK{leader.Owner, leader.Name}).AllCols().Update(leader)
	return err
}

func (s defaultWecomOrganizationObjectStore) GetWecomUserDirectLeader(organization string, corpId string, wecomUserId string, leaderWecomUserId string) (*WecomUserDirectLeader, error) {
	if organization == "" || corpId == "" || wecomUserId == "" || leaderWecomUserId == "" {
		return nil, nil
	}

	leader := &WecomUserDirectLeader{}
	existed, err := ormer.Engine.
		Where("organization = ?", organization).
		And("corp_id = ?", corpId).
		And("wecom_user_id = ?", wecomUserId).
		And("leader_wecom_user_id = ?", leaderWecomUserId).
		Get(leader)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return leader, nil
}

func (s defaultWecomOrganizationObjectStore) SaveWecomUserDirectLeader(leader *WecomUserDirectLeader) error {
	if leader == nil {
		return nil
	}
	existing, err := s.GetWecomUserDirectLeader(leader.Organization, leader.CorpId, leader.WecomUserId, leader.LeaderWecomUserId)
	if err != nil {
		return err
	}
	if existing == nil {
		_, err = ormer.Engine.Insert(leader)
		return err
	}
	leader.Owner = existing.Owner
	leader.Name = existing.Name
	_, err = ormer.Engine.ID(core.PK{leader.Owner, leader.Name}).AllCols().Update(leader)
	return err
}

func (s defaultWecomOrganizationObjectStore) SaveSourceConnection(connection *SourceConnection) error {
	if connection == nil {
		return nil
	}
	return savePlatformRecord(connection.Owner, connection.Name, connection, &SourceConnection{})
}

func (s defaultWecomOrganizationObjectStore) SavePlatformDepartment(department *PlatformDepartment) error {
	if department == nil {
		return nil
	}
	return savePlatformRecord(department.Owner, department.Name, department, &PlatformDepartment{})
}

func (s defaultWecomOrganizationObjectStore) SavePlatformUser(user *PlatformUser) error {
	if user == nil {
		return nil
	}
	return savePlatformRecord(user.Owner, user.Name, user, &PlatformUser{})
}

func (s defaultWecomOrganizationObjectStore) SavePlatformMembership(membership *PlatformMembership) error {
	if membership == nil {
		return nil
	}
	return savePlatformRecord(membership.Owner, membership.Name, membership, &PlatformMembership{})
}

func (s defaultWecomOrganizationObjectStore) SaveExternalIdentity(identity *ExternalIdentity) error {
	if identity == nil {
		return nil
	}
	return savePlatformRecord(identity.Owner, identity.Name, identity, &ExternalIdentity{})
}

func (s defaultWecomOrganizationObjectStore) SaveLifecycleEvent(event *LifecycleEvent) error {
	if event == nil {
		return nil
	}
	return savePlatformRecord(event.Owner, event.Name, event, &LifecycleEvent{})
}

func (s defaultWecomOrganizationObjectStore) SaveOrgSyncBatch(batch *OrgSyncBatch) error {
	if batch == nil {
		return nil
	}
	return savePlatformRecord(batch.Owner, batch.Name, batch, &OrgSyncBatch{})
}

// savePlatformRecord 按 owner/name 幂等 upsert 平台投影记录，保证重复同步覆盖同一主键快照而不是追加副本。
func savePlatformRecord(owner string, name string, model any, existing any) error {
	if owner == "" || name == "" || model == nil || existing == nil {
		return nil
	}
	if ormer == nil || ormer.Engine == nil {
		return nil
	}
	existed, err := ormer.Engine.ID(core.PK{owner, name}).Get(existing)
	if err != nil {
		return err
	}
	if !existed {
		_, err = ormer.Engine.Insert(model)
		return err
	}
	_, err = ormer.Engine.ID(core.PK{owner, name}).AllCols().Update(model)
	return err
}

func (s defaultWecomOrganizationObjectStore) GetWecomOrganizationSyncExistingState(organization string, corpId string) (*WecomOrganizationSyncExistingState, error) {
	state := &WecomOrganizationSyncExistingState{}
	if organization == "" || corpId == "" {
		return state, nil
	}

	if err := ormer.Engine.Where("organization = ?", organization).And("corp_id = ?", corpId).Find(&state.Departments); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization = ?", organization).And("corp_id = ?", corpId).Find(&state.Users); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization = ?", organization).And("corp_id = ?", corpId).Find(&state.UserDepartments); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization = ?", organization).And("corp_id = ?", corpId).Find(&state.DepartmentLeaders); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization = ?", organization).And("corp_id = ?", corpId).Find(&state.DirectLeaders); err != nil {
		return nil, err
	}
	return state, nil
}

func addDepartmentLeader(snapshot *WecomOrganizationFullSnapshot, seen map[string]bool, hasPrimary map[string]bool, departmentId string, leaderId string) {
	if departmentId == "" || leaderId == "" {
		return
	}

	key := departmentId + "\x1f" + leaderId
	if seen[key] {
		return
	}
	seen[key] = true

	isPrimary := !hasPrimary[departmentId]
	if isPrimary {
		hasPrimary[departmentId] = true
	}
	snapshot.DepartmentLeaders = append(snapshot.DepartmentLeaders, WecomSnapshotDepartmentLeader{
		DepartmentId:      departmentId,
		LeaderWecomUserId: leaderId,
		IsPrimary:         isPrimary,
	})
}

func wecomRelationshipKey(left string, right string) string {
	if left == "" || right == "" {
		return ""
	}
	return left + "\x1f" + right
}

func boolAt(values []bool, index int) bool {
	if index < 0 || index >= len(values) {
		return false
	}
	return values[index]
}
