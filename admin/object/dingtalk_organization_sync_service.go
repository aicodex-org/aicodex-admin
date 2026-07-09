// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/beego/beego/v2/core/logs"
	"github.com/xorm-io/core"
)

// DingTalkOrganizationSyncService 编排钉钉同步 run 的创建、快照拉取、差异落库和 run 状态更新。
type DingTalkOrganizationSyncService struct {
	Store             DingTalkOrganizationSyncRunStore
	ConfigStore       DingTalkOrganizationSyncConfigLastSyncStore
	WecomConfigStore  WecomOrganizationSyncConfigStore
	FeishuConfigStore FeishuOrganizationSyncConfigStore
	ObjectStore       DingTalkOrganizationObjectStore
	Now               func() time.Time
	LeaseDuration     time.Duration
	SyncTimeout       time.Duration
	NewSnapshotClient func(appKey string, appSecret string) DingTalkOrganizationSnapshotClient
}

// DingTalkOrganizationSnapshotClient 是同步服务消费的钉钉快照读取接口。
type DingTalkOrganizationSnapshotClient interface {
	GetAccessToken(ctx context.Context) (*DingTalkAccessToken, error)
	FetchDepartmentSnapshots(ctx context.Context, accessToken string, departmentId string) ([]DingTalkDepartmentSnapshot, error)
	FetchUserSnapshots(ctx context.Context, accessToken string, departments []DingTalkDepartmentSnapshot) ([]DingTalkUserSnapshot, error)
}

// DingTalkOrganizationObjectStore 隔离钉钉部门、成员和关系映射的持久化实现。
type DingTalkOrganizationObjectStore interface {
	GetDingTalkDepartmentMapping(organization string, appKey string, departmentId string) (*DingTalkDepartmentMapping, error)
	SaveDingTalkDepartmentMapping(mapping *DingTalkDepartmentMapping) error
	GetDingTalkDepartmentMappings(organization string, appKey string) ([]*DingTalkDepartmentMapping, error)
	GetDingTalkUserMapping(organization string, appKey string, userId string) (*DingTalkUserMapping, error)
	SaveDingTalkUserMapping(mapping *DingTalkUserMapping) error
	GetDingTalkUserMappings(organization string, appKey string) ([]*DingTalkUserMapping, error)
	GetDingTalkUserDepartment(organization string, appKey string, userId string, departmentId string) (*DingTalkUserDepartment, error)
	SaveDingTalkUserDepartment(mapping *DingTalkUserDepartment) error
	GetDingTalkUserDepartments(organization string, appKey string) ([]*DingTalkUserDepartment, error)
	GetDingTalkDepartmentLeader(organization string, appKey string, departmentId string, userId string) (*DingTalkDepartmentLeader, error)
	SaveDingTalkDepartmentLeader(mapping *DingTalkDepartmentLeader) error
	GetDingTalkDepartmentLeaders(organization string, appKey string) ([]*DingTalkDepartmentLeader, error)
	GetDingTalkUserDirectLeader(organization string, appKey string, userId string, leaderUserId string) (*DingTalkUserDirectLeader, error)
	SaveDingTalkUserDirectLeader(mapping *DingTalkUserDirectLeader) error
	GetDingTalkUserDirectLeaders(organization string, appKey string) ([]*DingTalkUserDirectLeader, error)
	GetGroup(owner string, name string) (*Group, error)
	SaveGroup(group *Group) error
	GetUser(owner string, name string) (*User, error)
	GetUserByField(owner string, field string, value string) (*User, error)
	SaveUser(user *User) error
	SaveUserGroups(user *User) error
}

type defaultDingTalkOrganizationObjectStore struct{}

// DingTalkOrganizationSyncRunStats 汇总一次快照应用对部门、成员和关系的影响数量。
type DingTalkOrganizationSyncRunStats struct {
	DepartmentCreatedCount        int
	DepartmentUpdatedCount        int
	DepartmentDisabledCount       int
	UserCreatedCount              int
	UserUpdatedCount              int
	UserDisabledCount             int
	MembershipUpdatedCount        int
	MembershipDisabledCount       int
	DepartmentLeaderUpdatedCount  int
	DepartmentLeaderDisabledCount int
	DirectLeaderUpdatedCount      int
	DirectLeaderDisabledCount     int
}

// StartManualRunAsync 创建手动 run 并异步执行，接口调用方只等待 run 创建结果。
func (s *DingTalkOrganizationSyncService) StartManualRunAsync(config *DingTalkOrganizationSyncConfig, actor string) (*DingTalkOrganizationSyncStartRunResult, error) {
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
		configCopy = *result.Config
	}
	go s.executeRunInBackground(&configCopy, &run)
	return result, nil
}

// StartScheduledRunAsync 创建调度 run 并异步执行，供通用调度器 executor 调用。
func (s *DingTalkOrganizationSyncService) StartScheduledRunAsync(config *DingTalkOrganizationSyncConfig, actor string) (*DingTalkOrganizationSyncStartRunResult, error) {
	result, err := s.StartScheduledRunWithResult(config, actor)
	if err != nil {
		return nil, err
	}
	if result == nil || result.Run == nil {
		return result, nil
	}
	run := *result.Run
	configCopy := *config
	if result.Config != nil {
		configCopy = *result.Config
	}
	go s.executeRunInBackground(&configCopy, &run)
	return result, nil
}

func (s *DingTalkOrganizationSyncService) executeRunInBackground(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun) {
	ctx := context.Background()
	timeout := s.syncTimeout()
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}
	if err := s.ExecuteRun(ctx, config, run); err != nil {
		logs.Warning(fmt.Sprintf("dingtalk organization sync run %s/%s failed: %v", run.Owner, run.Name, err))
	}
}

// ExecuteRun 按 fetch/plan/apply/finalize 阶段执行一次钉钉全量差异同步。
func (s *DingTalkOrganizationSyncService) ExecuteRun(ctx context.Context, config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun) error {
	if err := validateDingTalkOrganizationSyncRunExecutionConfig(config); err != nil {
		return err
	}
	if run == nil {
		return errors.New("dingtalk organization sync run is required")
	}
	if err := s.UpdateRunStage(run, DingTalkOrganizationSyncRunStageFetching); err != nil {
		return err
	}
	snapshot, err := s.FetchFullSnapshot(ctx, config, s.snapshotClient(config))
	if err != nil {
		return s.finishRunFailed(run, DingTalkOrganizationSyncRunStageFetching, "fetch_failed", config.AppSecret, err)
	}
	run.DepartmentFetchedCount = len(snapshot.Departments)
	run.UserFetchedCount = len(snapshot.Users)
	if err := s.UpdateRunStage(run, DingTalkOrganizationSyncRunStagePlanning); err != nil {
		return err
	}
	if err := s.UpdateRunStage(run, DingTalkOrganizationSyncRunStageApplying); err != nil {
		return err
	}
	stats, err := s.ApplyFullSnapshot(config, run, snapshot)
	if err != nil {
		return s.finishRunFailed(run, DingTalkOrganizationSyncRunStageApplying, "apply_failed", config.AppSecret, err)
	}
	applyDingTalkRunStats(run, stats)
	if err := s.UpdateRunStage(run, DingTalkOrganizationSyncRunStageFinalizing); err != nil {
		return err
	}
	return s.FinishRunSucceeded(config, run)
}

// FetchFullSnapshot 从钉钉客户端拉取部门和成员快照并归一化。
func (s *DingTalkOrganizationSyncService) FetchFullSnapshot(ctx context.Context, config *DingTalkOrganizationSyncConfig, client DingTalkOrganizationSnapshotClient) (*DingTalkOrganizationFullSnapshot, error) {
	token, err := client.GetAccessToken(ctx)
	if err != nil {
		return nil, err
	}
	departments, err := client.FetchDepartmentSnapshots(ctx, token.AccessToken, "1")
	if err != nil {
		return nil, err
	}
	users, err := client.FetchUserSnapshots(ctx, token.AccessToken, departments)
	if err != nil {
		return nil, err
	}
	return normalizeDingTalkOrganizationFullSnapshot(&DingTalkOrganizationFullSnapshot{
		Departments: departments,
		Users:       users,
	}), nil
}

// ApplyFullSnapshot 将钉钉快照差异写入本地映射表，并按配置软禁用缺失数据。
func (s *DingTalkOrganizationSyncService) ApplyFullSnapshot(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun, snapshot *DingTalkOrganizationFullSnapshot) (*DingTalkOrganizationSyncRunStats, error) {
	if config == nil {
		return nil, errors.New("dingtalk organization sync config is required")
	}
	if run == nil {
		return nil, errors.New("dingtalk organization sync run is required")
	}
	snapshot = normalizeDingTalkOrganizationFullSnapshot(snapshot)
	stats := &DingTalkOrganizationSyncRunStats{}
	for _, department := range snapshot.Departments {
		created, err := s.upsertDepartment(config, run, department)
		if err != nil {
			return nil, err
		}
		if created {
			stats.DepartmentCreatedCount++
		} else {
			stats.DepartmentUpdatedCount++
		}
	}
	for _, user := range snapshot.Users {
		created, err := s.upsertUser(config, run, user)
		if err != nil {
			return nil, err
		}
		if created {
			stats.UserCreatedCount++
		} else {
			stats.UserUpdatedCount++
		}
	}
	for _, user := range snapshot.Users {
		for index, departmentId := range user.Departments {
			isLeader := index < len(user.IsLeaderInDepartment) && user.IsLeaderInDepartment[index]
			isMain := departmentId != "" && departmentId == user.MainDepartmentId
			updated, err := s.upsertMembership(config, run, user.UserId, departmentId, isMain, isLeader)
			if err != nil {
				return nil, err
			}
			if updated {
				stats.MembershipUpdatedCount++
			}
		}
		for _, leaderUserId := range user.DirectLeaders {
			updated, err := s.upsertDirectLeader(config, run, user.UserId, leaderUserId)
			if err != nil {
				return nil, err
			}
			if updated {
				stats.DirectLeaderUpdatedCount++
			}
		}
	}
	for _, department := range snapshot.Departments {
		for index, userId := range department.DepartmentLeader {
			updated, err := s.upsertDepartmentLeader(config, run, department.Id, userId, index == 0)
			if err != nil {
				return nil, err
			}
			if updated {
				stats.DepartmentLeaderUpdatedCount++
			}
		}
	}
	if config.SoftDisableMissingData {
		disabled, err := s.softDisableMissingData(config, run, snapshot)
		if err != nil {
			return nil, err
		}
		stats.DepartmentDisabledCount = disabled.DepartmentDisabledCount
		stats.UserDisabledCount = disabled.UserDisabledCount
		stats.MembershipDisabledCount = disabled.MembershipDisabledCount
		stats.DepartmentLeaderDisabledCount = disabled.DepartmentLeaderDisabledCount
		stats.DirectLeaderDisabledCount = disabled.DirectLeaderDisabledCount
	}
	return stats, nil
}

func (s *DingTalkOrganizationSyncService) upsertDepartment(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun, snapshot DingTalkDepartmentSnapshot) (bool, error) {
	if snapshot.Id == "" {
		return false, nil
	}
	store := s.objectStore()
	existing, err := store.GetDingTalkDepartmentMapping(config.Organization, config.AppKey, snapshot.Id)
	if err != nil {
		return false, err
	}
	now := s.now()
	groupName := GetDingTalkDepartmentGroupName(config.AppKey, snapshot.Id)
	if existing != nil && existing.GroupName != "" {
		groupName = existing.GroupName
	}
	parentGroupName := ""
	if snapshot.ParentId != "" && snapshot.ParentId != "1" {
		parentGroupName = GetDingTalkDepartmentGroupName(config.AppKey, snapshot.ParentId)
	}
	group, err := store.GetGroup(config.Organization, groupName)
	if err != nil {
		return false, err
	}
	created := group == nil
	if group == nil {
		group = &Group{
			Owner:       config.Organization,
			Name:        groupName,
			CreatedTime: util.GetCurrentTime(),
		}
	}
	group.Owner = config.Organization
	group.Name = groupName
	group.UpdatedTime = util.GetCurrentTime()
	group.DisplayName = firstNonEmpty(snapshot.Name, snapshot.Id)
	group.ParentId = parentGroupName
	group.Type = DingTalkDepartmentGroupType
	group.IsTopGroup = parentGroupName == ""
	group.IsEnabled = true
	if err := store.SaveGroup(group); err != nil {
		return false, err
	}
	mapping := &DingTalkDepartmentMapping{
		Owner:              config.Organization,
		Name:               "dingtalk-dept-map-" + shortDingTalkOrganizationSyncHash(config.Organization, config.AppKey, snapshot.Id),
		Organization:       config.Organization,
		AppKey:             config.AppKey,
		DepartmentId:       snapshot.Id,
		GroupOwner:         config.Organization,
		GroupName:          groupName,
		ParentDepartmentId: snapshot.ParentId,
		ParentGroupOwner:   config.Organization,
		ParentGroupName:    parentGroupName,
		DisplayName:        group.DisplayName,
		Order:              snapshot.Order,
		LeaderUserIdCache:  strings.Join(snapshot.DepartmentLeader, ","),
		IsEnabled:          true,
		MissingSinceRunId:  "",
		LastSeenRunId:      run.Name,
		LastSyncedAt:       now,
	}
	if existing != nil {
		mapping.Owner = existing.Owner
		mapping.Name = existing.Name
		mapping.CreatedAt = existing.CreatedAt
	}
	return created, store.SaveDingTalkDepartmentMapping(mapping)
}

func (s *DingTalkOrganizationSyncService) upsertUser(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun, snapshot DingTalkUserSnapshot) (bool, error) {
	if snapshot.UserId == "" {
		return false, nil
	}
	store := s.objectStore()
	existing, err := store.GetDingTalkUserMapping(config.Organization, config.AppKey, snapshot.UserId)
	if err != nil {
		return false, err
	}
	now := s.now()
	userName := GetDingTalkUserName(config.AppKey, snapshot.UserId)
	var user *User
	if existing != nil {
		if existing.UserName != "" {
			userName = existing.UserName
		}
		if existing.UserOwner != "" && existing.UserName != "" {
			user, err = store.GetUser(existing.UserOwner, existing.UserName)
			if err != nil {
				return false, err
			}
		}
	}
	if user == nil {
		user, err = store.GetUserByField(config.Organization, "DingTalk", snapshot.UserId)
		if err != nil {
			return false, err
		}
	}
	created := user == nil
	if user == nil {
		user = &User{
			Owner:     config.Organization,
			Name:      userName,
			Type:      "normal-user",
			IsAdmin:   false,
			IsDeleted: false,
		}
	}
	user.DingTalk = snapshot.UserId
	user.ExternalId = GetLengthSafeDingTalkUserExternalId(config.AppKey, snapshot.UserId)
	user.DisplayName = firstNonEmpty(snapshot.Name, snapshot.UserId)
	user.Title = firstNonEmpty(snapshot.Position, user.Title)
	if snapshot.Email != "" {
		user.Email = snapshot.Email
	}
	if snapshot.Mobile != "" {
		user.Phone = snapshot.Mobile
	}
	if snapshot.Avatar != "" {
		user.Avatar = snapshot.Avatar
	}
	if user.Type == "" {
		user.Type = "normal-user"
	}
	user.IsForbidden = !isEnabledDingTalkUserStatus(snapshot.Status)
	if err := store.SaveUser(user); err != nil {
		return false, err
	}
	mapping := &DingTalkUserMapping{
		Owner:             config.Organization,
		Name:              "dingtalk-user-map-" + shortDingTalkOrganizationSyncHash(config.Organization, config.AppKey, snapshot.UserId),
		Organization:      config.Organization,
		AppKey:            config.AppKey,
		DingTalkUserId:    snapshot.UserId,
		UnionId:           snapshot.UnionId,
		UserOwner:         user.Owner,
		UserName:          user.Name,
		ExternalId:        GetFullDingTalkUserExternalId(config.AppKey, snapshot.UserId),
		MainDepartmentId:  snapshot.MainDepartmentId,
		Status:            snapshot.Status,
		IsEnabled:         true,
		MissingSinceRunId: "",
		LastSeenRunId:     run.Name,
		LastSyncedAt:      now,
	}
	if existing != nil {
		mapping.Owner = existing.Owner
		mapping.Name = existing.Name
		mapping.CreatedAt = existing.CreatedAt
	}
	return created, store.SaveDingTalkUserMapping(mapping)
}

func (s *DingTalkOrganizationSyncService) upsertMembership(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun, userId string, departmentId string, isMain bool, isLeader bool) (bool, error) {
	if userId == "" || departmentId == "" {
		return false, nil
	}
	store := s.objectStore()
	userMapping, err := store.GetDingTalkUserMapping(config.Organization, config.AppKey, userId)
	if err != nil || userMapping == nil {
		return false, err
	}
	departmentMapping, err := store.GetDingTalkDepartmentMapping(config.Organization, config.AppKey, departmentId)
	if err != nil || departmentMapping == nil {
		return false, err
	}
	now := s.now()
	membership := &DingTalkUserDepartment{
		Owner:          config.Organization,
		Name:           GetDingTalkRelationshipName(config.Organization, config.AppKey, "user-department", userId, departmentId),
		Organization:   config.Organization,
		AppKey:         config.AppKey,
		DingTalkUserId: userId,
		DepartmentId:   departmentId,
		UserOwner:      userMapping.UserOwner,
		UserName:       userMapping.UserName,
		GroupOwner:     departmentMapping.GroupOwner,
		GroupName:      departmentMapping.GroupName,
		IsMain:         isMain,
		IsLeader:       isLeader,
		IsEnabled:      true,
		LastSeenRunId:  run.Name,
		LastSyncedAt:   now,
	}
	existing, err := store.GetDingTalkUserDepartment(config.Organization, config.AppKey, userId, departmentId)
	if err != nil {
		return false, err
	}
	if existing != nil {
		membership.Owner = existing.Owner
		membership.Name = existing.Name
		membership.CreatedAt = existing.CreatedAt
	}
	if err := store.SaveDingTalkUserDepartment(membership); err != nil {
		return false, err
	}
	user, err := store.GetUser(userMapping.UserOwner, userMapping.UserName)
	if err != nil {
		return false, err
	}
	if user != nil {
		user.Groups = addStringIfMissing(removeDisabledDingTalkGroups(store, user.Groups, config.Organization, config.AppKey, userId, departmentId), departmentMapping.GroupName)
		if err := store.SaveUserGroups(user); err != nil {
			return false, err
		}
	}
	return true, nil
}

func (s *DingTalkOrganizationSyncService) upsertDepartmentLeader(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun, departmentId string, userId string, isPrimary bool) (bool, error) {
	if departmentId == "" || userId == "" {
		return false, nil
	}
	store := s.objectStore()
	departmentMapping, err := store.GetDingTalkDepartmentMapping(config.Organization, config.AppKey, departmentId)
	if err != nil || departmentMapping == nil {
		return false, err
	}
	userMapping, err := store.GetDingTalkUserMapping(config.Organization, config.AppKey, userId)
	if err != nil {
		return false, err
	}
	now := s.now()
	leader := &DingTalkDepartmentLeader{
		Owner:          config.Organization,
		Name:           GetDingTalkRelationshipName(config.Organization, config.AppKey, "department-leader", departmentId, userId),
		Organization:   config.Organization,
		AppKey:         config.AppKey,
		DepartmentId:   departmentId,
		DingTalkUserId: userId,
		GroupOwner:     departmentMapping.GroupOwner,
		GroupName:      departmentMapping.GroupName,
		IsPrimary:      isPrimary,
		IsEnabled:      true,
		LastSeenRunId:  run.Name,
		LastSyncedAt:   now,
	}
	if userMapping != nil {
		leader.UserOwner = userMapping.UserOwner
		leader.UserName = userMapping.UserName
	}
	existing, err := store.GetDingTalkDepartmentLeader(config.Organization, config.AppKey, departmentId, userId)
	if err != nil {
		return false, err
	}
	if existing != nil {
		leader.Owner = existing.Owner
		leader.Name = existing.Name
		leader.CreatedAt = existing.CreatedAt
	}
	return true, store.SaveDingTalkDepartmentLeader(leader)
}

func (s *DingTalkOrganizationSyncService) upsertDirectLeader(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun, userId string, leaderUserId string) (bool, error) {
	if userId == "" || leaderUserId == "" {
		return false, nil
	}
	store := s.objectStore()
	userMapping, err := store.GetDingTalkUserMapping(config.Organization, config.AppKey, userId)
	if err != nil || userMapping == nil {
		return false, err
	}
	leaderMapping, err := store.GetDingTalkUserMapping(config.Organization, config.AppKey, leaderUserId)
	if err != nil {
		return false, err
	}
	now := s.now()
	directLeader := &DingTalkUserDirectLeader{
		Owner:                config.Organization,
		Name:                 GetDingTalkRelationshipName(config.Organization, config.AppKey, "direct-leader", userId, leaderUserId),
		Organization:         config.Organization,
		AppKey:               config.AppKey,
		DingTalkUserId:       userId,
		LeaderDingTalkUserId: leaderUserId,
		UserOwner:            userMapping.UserOwner,
		UserName:             userMapping.UserName,
		IsEnabled:            true,
		LastSeenRunId:        run.Name,
		LastSyncedAt:         now,
	}
	if leaderMapping != nil {
		directLeader.LeaderUserOwner = leaderMapping.UserOwner
		directLeader.LeaderUserName = leaderMapping.UserName
	}
	existing, err := store.GetDingTalkUserDirectLeader(config.Organization, config.AppKey, userId, leaderUserId)
	if err != nil {
		return false, err
	}
	if existing != nil {
		directLeader.Owner = existing.Owner
		directLeader.Name = existing.Name
		directLeader.CreatedAt = existing.CreatedAt
	}
	return true, store.SaveDingTalkUserDirectLeader(directLeader)
}

func (s *DingTalkOrganizationSyncService) softDisableMissingData(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun, snapshot *DingTalkOrganizationFullSnapshot) (*DingTalkOrganizationSyncRunStats, error) {
	stats := &DingTalkOrganizationSyncRunStats{}
	seenDepartments := map[string]bool{}
	for _, department := range snapshot.Departments {
		seenDepartments[department.Id] = true
	}
	seenUsers := map[string]bool{}
	seenMemberships := map[string]bool{}
	seenDirectLeaders := map[string]bool{}
	for _, user := range snapshot.Users {
		seenUsers[user.UserId] = true
		for _, departmentId := range user.Departments {
			seenMemberships[user.UserId+"\x1f"+departmentId] = true
		}
		for _, leaderUserId := range user.DirectLeaders {
			seenDirectLeaders[user.UserId+"\x1f"+leaderUserId] = true
		}
	}
	seenDepartmentLeaders := map[string]bool{}
	for _, department := range snapshot.Departments {
		for _, userId := range department.DepartmentLeader {
			seenDepartmentLeaders[department.Id+"\x1f"+userId] = true
		}
	}
	store := s.objectStore()
	departments, err := store.GetDingTalkDepartmentMappings(config.Organization, config.AppKey)
	if err != nil {
		return nil, err
	}
	for _, mapping := range departments {
		if seenDepartments[mapping.DepartmentId] || !mapping.IsEnabled {
			continue
		}
		mapping.IsEnabled = false
		mapping.MissingSinceRunId = run.Name
		if err := store.SaveDingTalkDepartmentMapping(mapping); err != nil {
			return nil, err
		}
		if group, err := store.GetGroup(mapping.GroupOwner, mapping.GroupName); err != nil {
			return nil, err
		} else if group != nil {
			group.IsEnabled = false
			if err := store.SaveGroup(group); err != nil {
				return nil, err
			}
		}
		stats.DepartmentDisabledCount++
	}
	users, err := store.GetDingTalkUserMappings(config.Organization, config.AppKey)
	if err != nil {
		return nil, err
	}
	for _, mapping := range users {
		if seenUsers[mapping.DingTalkUserId] || !mapping.IsEnabled {
			continue
		}
		mapping.IsEnabled = false
		mapping.MissingSinceRunId = run.Name
		if err := store.SaveDingTalkUserMapping(mapping); err != nil {
			return nil, err
		}
		if user, err := store.GetUser(mapping.UserOwner, mapping.UserName); err != nil {
			return nil, err
		} else if user != nil {
			user.IsForbidden = true
			if err := store.SaveUser(user); err != nil {
				return nil, err
			}
		}
		stats.UserDisabledCount++
	}
	memberships, err := store.GetDingTalkUserDepartments(config.Organization, config.AppKey)
	if err != nil {
		return nil, err
	}
	for _, mapping := range memberships {
		if seenMemberships[mapping.DingTalkUserId+"\x1f"+mapping.DepartmentId] || !mapping.IsEnabled {
			continue
		}
		mapping.IsEnabled = false
		mapping.MissingSinceRunId = run.Name
		if err := store.SaveDingTalkUserDepartment(mapping); err != nil {
			return nil, err
		}
		if user, err := store.GetUser(mapping.UserOwner, mapping.UserName); err != nil {
			return nil, err
		} else if user != nil {
			user.Groups = removeString(user.Groups, mapping.GroupName)
			if err := store.SaveUserGroups(user); err != nil {
				return nil, err
			}
		}
		stats.MembershipDisabledCount++
	}
	departmentLeaders, err := store.GetDingTalkDepartmentLeaders(config.Organization, config.AppKey)
	if err != nil {
		return nil, err
	}
	for _, mapping := range departmentLeaders {
		if seenDepartmentLeaders[mapping.DepartmentId+"\x1f"+mapping.DingTalkUserId] || !mapping.IsEnabled {
			continue
		}
		mapping.IsEnabled = false
		mapping.MissingSinceRunId = run.Name
		if err := store.SaveDingTalkDepartmentLeader(mapping); err != nil {
			return nil, err
		}
		stats.DepartmentLeaderDisabledCount++
	}
	directLeaders, err := store.GetDingTalkUserDirectLeaders(config.Organization, config.AppKey)
	if err != nil {
		return nil, err
	}
	for _, mapping := range directLeaders {
		if seenDirectLeaders[mapping.DingTalkUserId+"\x1f"+mapping.LeaderDingTalkUserId] || !mapping.IsEnabled {
			continue
		}
		mapping.IsEnabled = false
		mapping.MissingSinceRunId = run.Name
		if err := store.SaveDingTalkUserDirectLeader(mapping); err != nil {
			return nil, err
		}
		stats.DirectLeaderDisabledCount++
	}
	return stats, nil
}

// UpdateRunStage 更新 run 阶段和心跳，用于长同步过程的可观测性与租约恢复。
func (s *DingTalkOrganizationSyncService) UpdateRunStage(run *DingTalkOrganizationSyncRun, stage DingTalkOrganizationSyncRunStage) error {
	now := s.now().UTC()
	run.Status = DingTalkOrganizationSyncRunStatusRunning
	run.Stage = stage
	run.HeartbeatAt = now
	run.LeaseExpiresAt = now.Add(s.leaseDuration())
	run.UpdatedAt = now
	return s.runStore().UpdateDingTalkOrganizationSyncRun(run)
}

// FinishRunSucceeded 将 run 标记为成功，并更新配置上的最近同步摘要。
func (s *DingTalkOrganizationSyncService) FinishRunSucceeded(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun) error {
	now := s.now().UTC()
	run.Status = DingTalkOrganizationSyncRunStatusSucceeded
	run.Stage = DingTalkOrganizationSyncRunStageFinalizing
	run.FinishedAt = now
	run.HeartbeatAt = now
	run.UpdatedAt = now
	run.ErrorCode = ""
	run.ErrorText = ""
	if err := s.runStore().UpdateDingTalkOrganizationSyncRun(run); err != nil {
		return err
	}
	return s.configLastSyncStore().UpdateDingTalkOrganizationSyncConfigLastSync(config, run, now)
}

func (s *DingTalkOrganizationSyncService) finishRunFailed(run *DingTalkOrganizationSyncRun, stage DingTalkOrganizationSyncRunStage, errorCode string, sensitiveValue string, cause error) error {
	now := s.now().UTC()
	run.Status = DingTalkOrganizationSyncRunStatusFailed
	run.Stage = stage
	run.FinishedAt = now
	run.HeartbeatAt = now
	run.UpdatedAt = now
	run.ErrorCode = errorCode
	if cause != nil {
		run.ErrorText = safeOrganizationSyncErrorText(cause.Error(), sensitiveValue)
	}
	if err := s.runStore().UpdateDingTalkOrganizationSyncRun(run); err != nil {
		return err
	}
	return cause
}

func applyDingTalkRunStats(run *DingTalkOrganizationSyncRun, stats *DingTalkOrganizationSyncRunStats) {
	if run == nil || stats == nil {
		return
	}
	run.DepartmentCreatedCount = stats.DepartmentCreatedCount
	run.DepartmentUpdatedCount = stats.DepartmentUpdatedCount
	run.DepartmentDisabledCount = stats.DepartmentDisabledCount
	run.UserCreatedCount = stats.UserCreatedCount
	run.UserUpdatedCount = stats.UserUpdatedCount
	run.UserDisabledCount = stats.UserDisabledCount
	run.MembershipUpdatedCount = stats.MembershipUpdatedCount
	run.MembershipDisabledCount = stats.MembershipDisabledCount
	run.DepartmentLeaderUpdatedCount = stats.DepartmentLeaderUpdatedCount
	run.DepartmentLeaderDisabledCount = stats.DepartmentLeaderDisabledCount
	run.DirectLeaderUpdatedCount = stats.DirectLeaderUpdatedCount
	run.DirectLeaderDisabledCount = stats.DirectLeaderDisabledCount
}

func normalizeDingTalkOrganizationFullSnapshot(snapshot *DingTalkOrganizationFullSnapshot) *DingTalkOrganizationFullSnapshot {
	if snapshot == nil {
		return &DingTalkOrganizationFullSnapshot{}
	}
	normalized := &DingTalkOrganizationFullSnapshot{}
	seenDepartments := map[string]bool{}
	for _, department := range snapshot.Departments {
		department.Id = strings.TrimSpace(department.Id)
		department.ParentId = strings.TrimSpace(department.ParentId)
		department.DepartmentLeader = compactDingTalkStrings(department.DepartmentLeader)
		if department.Id == "" || seenDepartments[department.Id] {
			continue
		}
		seenDepartments[department.Id] = true
		normalized.Departments = append(normalized.Departments, department)
	}
	seenUsers := map[string]bool{}
	for _, user := range snapshot.Users {
		user.UserId = strings.TrimSpace(user.UserId)
		user.Departments = compactDingTalkStrings(user.Departments)
		user.DirectLeaders = compactDingTalkStrings(user.DirectLeaders)
		if user.UserId == "" || seenUsers[user.UserId] {
			continue
		}
		if user.MainDepartmentId == "" && len(user.Departments) > 0 {
			user.MainDepartmentId = user.Departments[0]
		}
		seenUsers[user.UserId] = true
		normalized.Users = append(normalized.Users, user)
	}
	return normalized
}

func validateDingTalkOrganizationSyncRunExecutionConfig(config *DingTalkOrganizationSyncConfig) error {
	if config == nil {
		return errors.New("dingtalk organization sync config is required")
	}
	if strings.TrimSpace(config.Organization) == "" {
		return errors.New("dingtalk organization sync organization is required")
	}
	if strings.TrimSpace(config.Organization) == "built-in" {
		return errors.New("dingtalk organization sync target organization cannot be built-in")
	}
	if strings.TrimSpace(config.AppKey) == "" {
		return errors.New("dingtalk organization sync app_key is required")
	}
	if strings.TrimSpace(config.AppSecret) == "" || strings.TrimSpace(config.AppSecret) == DingTalkOrganizationSyncMaskedSecret {
		return errors.New("dingtalk organization sync app_secret is required")
	}
	return nil
}

func (s *DingTalkOrganizationSyncService) snapshotClient(config *DingTalkOrganizationSyncConfig) DingTalkOrganizationSnapshotClient {
	if s != nil && s.NewSnapshotClient != nil {
		return s.NewSnapshotClient(config.AppKey, config.AppSecret)
	}
	return NewDingTalkAddressBookClient(config.AppKey, config.AppSecret)
}

func (s *DingTalkOrganizationSyncService) objectStore() DingTalkOrganizationObjectStore {
	if s != nil && s.ObjectStore != nil {
		return s.ObjectStore
	}
	return defaultDingTalkOrganizationObjectStore{}
}

func (s *DingTalkOrganizationSyncService) configLastSyncStore() DingTalkOrganizationSyncConfigLastSyncStore {
	if s != nil && s.ConfigStore != nil {
		return s.ConfigStore
	}
	return defaultDingTalkOrganizationSyncConfigStore{}
}

func (s *DingTalkOrganizationSyncService) wecomConfigStore() WecomOrganizationSyncConfigStore {
	if s != nil && s.WecomConfigStore != nil {
		return s.WecomConfigStore
	}
	return defaultWecomOrganizationSyncConfigStore{}
}

func (s *DingTalkOrganizationSyncService) feishuConfigStore() FeishuOrganizationSyncConfigStore {
	if s != nil && s.FeishuConfigStore != nil {
		return s.FeishuConfigStore
	}
	return defaultFeishuOrganizationSyncConfigStore{}
}

func (s *DingTalkOrganizationSyncService) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func (s *DingTalkOrganizationSyncService) leaseDuration() time.Duration {
	if s != nil && s.LeaseDuration > 0 {
		return s.LeaseDuration
	}
	return DingTalkOrganizationSyncDefaultLeaseDuration
}

func (s *DingTalkOrganizationSyncService) syncTimeout() time.Duration {
	if s != nil {
		return s.SyncTimeout
	}
	return 0
}

func isEnabledDingTalkUserStatus(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "inactive", "disabled", "forbidden":
		return false
	default:
		return true
	}
}

func removeDisabledDingTalkGroups(store DingTalkOrganizationObjectStore, groups []string, organization string, appKey string, userId string, keepDepartmentId string) []string {
	if store == nil {
		return groups
	}
	memberships, err := store.GetDingTalkUserDepartments(organization, appKey)
	if err != nil {
		return groups
	}
	disabled := map[string]bool{}
	for _, membership := range memberships {
		if membership.DingTalkUserId == userId && !membership.IsEnabled && membership.DepartmentId != keepDepartmentId {
			disabled[membership.GroupName] = true
		}
	}
	res := make([]string, 0, len(groups))
	for _, group := range groups {
		if !disabled[group] {
			res = append(res, group)
		}
	}
	return res
}

func dingtalkUserSaveColumns() []string {
	return []string{
		"external_id",
		"display_name",
		"avatar",
		"email",
		"phone",
		"title",
		"type",
		"dingtalk",
		"is_forbidden",
		"updated_time",
	}
}

func (s defaultDingTalkOrganizationObjectStore) GetGroup(owner string, name string) (*Group, error) {
	return getGroup(owner, name)
}

func (s defaultDingTalkOrganizationObjectStore) SaveGroup(group *Group) error {
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

func (s defaultDingTalkOrganizationObjectStore) GetUser(owner string, name string) (*User, error) {
	return getUser(owner, name)
}

func (s defaultDingTalkOrganizationObjectStore) GetUserByField(owner string, field string, value string) (*User, error) {
	return GetUserByField(owner, field, value)
}

func (s defaultDingTalkOrganizationObjectStore) SaveUser(user *User) error {
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
	_, err = updateUser(user.GetId(), user, dingtalkUserSaveColumns())
	return err
}

func (s defaultDingTalkOrganizationObjectStore) SaveUserGroups(user *User) error {
	if user == nil {
		return nil
	}
	_, err := UpdateUser(user.GetId(), user, []string{"groups"}, false)
	return err
}

func (s defaultDingTalkOrganizationObjectStore) GetDingTalkDepartmentMapping(organization string, appKey string, departmentId string) (*DingTalkDepartmentMapping, error) {
	mapping := &DingTalkDepartmentMapping{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("app_key = ?", appKey).And("department_id = ?", departmentId).Get(mapping)
	if err != nil || !existed {
		return nil, err
	}
	return mapping, nil
}

func (s defaultDingTalkOrganizationObjectStore) SaveDingTalkDepartmentMapping(mapping *DingTalkDepartmentMapping) error {
	existing, err := s.GetDingTalkDepartmentMapping(mapping.Organization, mapping.AppKey, mapping.DepartmentId)
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

func (s defaultDingTalkOrganizationObjectStore) GetDingTalkDepartmentMappings(organization string, appKey string) ([]*DingTalkDepartmentMapping, error) {
	mappings := []*DingTalkDepartmentMapping{}
	err := ormer.Engine.Where("organization = ?", organization).And("app_key = ?", appKey).Find(&mappings)
	return mappings, err
}

func (s defaultDingTalkOrganizationObjectStore) GetDingTalkUserMapping(organization string, appKey string, userId string) (*DingTalkUserMapping, error) {
	mapping := &DingTalkUserMapping{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("app_key = ?", appKey).And("ding_talk_user_id = ?", userId).Get(mapping)
	if err != nil || !existed {
		return nil, err
	}
	return mapping, nil
}

func (s defaultDingTalkOrganizationObjectStore) SaveDingTalkUserMapping(mapping *DingTalkUserMapping) error {
	existing, err := s.GetDingTalkUserMapping(mapping.Organization, mapping.AppKey, mapping.DingTalkUserId)
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

func (s defaultDingTalkOrganizationObjectStore) GetDingTalkUserMappings(organization string, appKey string) ([]*DingTalkUserMapping, error) {
	mappings := []*DingTalkUserMapping{}
	err := ormer.Engine.Where("organization = ?", organization).And("app_key = ?", appKey).Find(&mappings)
	return mappings, err
}

func (s defaultDingTalkOrganizationObjectStore) GetDingTalkUserDepartment(organization string, appKey string, userId string, departmentId string) (*DingTalkUserDepartment, error) {
	mapping := &DingTalkUserDepartment{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("app_key = ?", appKey).And("ding_talk_user_id = ?", userId).And("department_id = ?", departmentId).Get(mapping)
	if err != nil || !existed {
		return nil, err
	}
	return mapping, nil
}

func (s defaultDingTalkOrganizationObjectStore) SaveDingTalkUserDepartment(mapping *DingTalkUserDepartment) error {
	existing, err := s.GetDingTalkUserDepartment(mapping.Organization, mapping.AppKey, mapping.DingTalkUserId, mapping.DepartmentId)
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

func (s defaultDingTalkOrganizationObjectStore) GetDingTalkUserDepartments(organization string, appKey string) ([]*DingTalkUserDepartment, error) {
	mappings := []*DingTalkUserDepartment{}
	err := ormer.Engine.Where("organization = ?", organization).And("app_key = ?", appKey).Find(&mappings)
	return mappings, err
}

func (s defaultDingTalkOrganizationObjectStore) GetDingTalkDepartmentLeader(organization string, appKey string, departmentId string, userId string) (*DingTalkDepartmentLeader, error) {
	mapping := &DingTalkDepartmentLeader{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("app_key = ?", appKey).And("department_id = ?", departmentId).And("ding_talk_user_id = ?", userId).Get(mapping)
	if err != nil || !existed {
		return nil, err
	}
	return mapping, nil
}

func (s defaultDingTalkOrganizationObjectStore) SaveDingTalkDepartmentLeader(mapping *DingTalkDepartmentLeader) error {
	existing, err := s.GetDingTalkDepartmentLeader(mapping.Organization, mapping.AppKey, mapping.DepartmentId, mapping.DingTalkUserId)
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

func (s defaultDingTalkOrganizationObjectStore) GetDingTalkDepartmentLeaders(organization string, appKey string) ([]*DingTalkDepartmentLeader, error) {
	mappings := []*DingTalkDepartmentLeader{}
	err := ormer.Engine.Where("organization = ?", organization).And("app_key = ?", appKey).Find(&mappings)
	return mappings, err
}

func (s defaultDingTalkOrganizationObjectStore) GetDingTalkUserDirectLeader(organization string, appKey string, userId string, leaderUserId string) (*DingTalkUserDirectLeader, error) {
	mapping := &DingTalkUserDirectLeader{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("app_key = ?", appKey).And("ding_talk_user_id = ?", userId).And("leader_ding_talk_user_id = ?", leaderUserId).Get(mapping)
	if err != nil || !existed {
		return nil, err
	}
	return mapping, nil
}

func (s defaultDingTalkOrganizationObjectStore) SaveDingTalkUserDirectLeader(mapping *DingTalkUserDirectLeader) error {
	existing, err := s.GetDingTalkUserDirectLeader(mapping.Organization, mapping.AppKey, mapping.DingTalkUserId, mapping.LeaderDingTalkUserId)
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

func (s defaultDingTalkOrganizationObjectStore) GetDingTalkUserDirectLeaders(organization string, appKey string) ([]*DingTalkUserDirectLeader, error) {
	mappings := []*DingTalkUserDirectLeader{}
	err := ormer.Engine.Where("organization = ?", organization).And("app_key = ?", appKey).Find(&mappings)
	return mappings, err
}
