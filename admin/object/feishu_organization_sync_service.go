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

	"github.com/beego/beego/v2/core/logs"
	"github.com/xorm-io/core"
)

type FeishuOrganizationSyncService struct {
	Store             FeishuOrganizationSyncRunStore
	ConfigStore       FeishuOrganizationSyncConfigLastSyncStore
	Now               func() time.Time
	LeaseDuration     time.Duration
	SyncTimeout       time.Duration
	NewSnapshotClient func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient
}

type FeishuOrganizationSnapshotClient interface {
	GetAccessToken(ctx context.Context) (*FeishuAccessToken, error)
	FetchDepartmentSnapshots(ctx context.Context, accessToken string, departmentId string) ([]FeishuDepartmentSnapshot, error)
	FetchUserSnapshots(ctx context.Context, accessToken string, departments []FeishuDepartmentSnapshot) ([]FeishuUserSnapshot, error)
}

func (s *FeishuOrganizationSyncService) StartManualRunAsync(config *FeishuOrganizationSyncConfig, actor string) (*FeishuOrganizationSyncStartRunResult, error) {
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

func (s *FeishuOrganizationSyncService) StartScheduledRunAsync(config *FeishuOrganizationSyncConfig, actor string) (*FeishuOrganizationSyncStartRunResult, error) {
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

func (s *FeishuOrganizationSyncService) executeRunInBackground(config *FeishuOrganizationSyncConfig, run *FeishuOrganizationSyncRun) {
	ctx := context.Background()
	timeout := s.syncTimeout()
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}
	if err := s.ExecuteRun(ctx, config, run); err != nil {
		logs.Warning(fmt.Sprintf("feishu organization sync run %s/%s failed: %v", run.Owner, run.Name, err))
	}
}

func (s *FeishuOrganizationSyncService) ExecuteRun(ctx context.Context, config *FeishuOrganizationSyncConfig, run *FeishuOrganizationSyncRun) error {
	if err := validateFeishuOrganizationSyncRunExecutionConfig(config); err != nil {
		return err
	}
	if run == nil {
		return errors.New("feishu organization sync run is required")
	}
	if err := s.UpdateRunStage(run, FeishuOrganizationSyncRunStageFetching); err != nil {
		return err
	}
	snapshot, sourceTenantId, err := s.FetchFullSnapshot(ctx, config, s.snapshotClient(config))
	if err != nil {
		return s.finishRunFailed(run, FeishuOrganizationSyncRunStageFetching, "fetch_failed", config.AppSecret, err)
	}
	run.TenantKey = sourceTenantId
	run.DepartmentFetchedCount = len(snapshot.Departments)
	run.UserFetchedCount = len(snapshot.Users)
	if err := s.UpdateRunStage(run, FeishuOrganizationSyncRunStagePlanning); err != nil {
		return err
	}
	if err := s.UpdateRunStage(run, FeishuOrganizationSyncRunStageApplying); err != nil {
		return err
	}
	stats, err := s.ApplyFullSnapshot(config, run, snapshot, sourceTenantId)
	if err != nil {
		return s.finishRunFailed(run, FeishuOrganizationSyncRunStageApplying, "apply_failed", config.AppSecret, err)
	}
	applyFeishuRunStats(run, stats)
	if err := s.UpdateRunStage(run, FeishuOrganizationSyncRunStageFinalizing); err != nil {
		return err
	}
	return s.FinishRunSucceeded(config, run)
}

func (s *FeishuOrganizationSyncService) FetchFullSnapshot(ctx context.Context, config *FeishuOrganizationSyncConfig, client FeishuOrganizationSnapshotClient) (*FeishuOrganizationFullSnapshot, string, error) {
	token, err := client.GetAccessToken(ctx)
	if err != nil {
		return nil, "", err
	}
	departments, err := client.FetchDepartmentSnapshots(ctx, token.TenantAccessToken, "0")
	if err != nil {
		return nil, "", err
	}
	users, err := client.FetchUserSnapshots(ctx, token.TenantAccessToken, departments)
	if err != nil {
		return nil, "", err
	}
	sourceTenantId := strings.TrimSpace(config.TenantKey)
	userDepartments := []FeishuUserDepartmentSnapshot{}
	for _, user := range users {
		if sourceTenantId == "" && user.TenantKey != "" {
			sourceTenantId = user.TenantKey
		}
		for _, departmentId := range user.Departments {
			userDepartments = append(userDepartments, FeishuUserDepartmentSnapshot{
				FeishuUserId: user.UserId,
				DepartmentId: departmentId,
				IsMain:       departmentId != "" && departmentId == user.MainDepartmentId,
			})
		}
	}
	if sourceTenantId == "" {
		sourceTenantId = config.AppId
	}
	return &FeishuOrganizationFullSnapshot{
		Departments:     departments,
		Users:           users,
		UserDepartments: userDepartments,
	}, sourceTenantId, nil
}

type FeishuOrganizationSyncRunStats struct {
	DepartmentCreatedCount  int
	DepartmentUpdatedCount  int
	DepartmentDisabledCount int
	UserCreatedCount        int
	UserUpdatedCount        int
	UserDisabledCount       int
	MembershipUpdatedCount  int
}

func (s *FeishuOrganizationSyncService) ApplyFullSnapshot(config *FeishuOrganizationSyncConfig, run *FeishuOrganizationSyncRun, snapshot *FeishuOrganizationFullSnapshot, sourceTenantId string) (*FeishuOrganizationSyncRunStats, error) {
	stats := &FeishuOrganizationSyncRunStats{}
	if err := projectFeishuSourceConnection(config.Organization, config.AppId, sourceTenantId, config.EndpointMode, run.Name, s.now()); err != nil {
		return nil, err
	}
	for _, department := range snapshot.Departments {
		created, err := s.upsertDepartment(config, run, sourceTenantId, department)
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
		created, err := s.upsertUser(config, run, sourceTenantId, user)
		if err != nil {
			return nil, err
		}
		if created {
			stats.UserCreatedCount++
		} else {
			stats.UserUpdatedCount++
		}
	}
	for _, membership := range snapshot.UserDepartments {
		updated, err := s.upsertMembership(config, run, sourceTenantId, membership)
		if err != nil {
			return nil, err
		}
		if updated {
			stats.MembershipUpdatedCount++
		}
	}
	if config.SoftDisableMissingData {
		deptDisabled, userDisabled, membershipDisabled, err := s.softDisableMissingData(config, run, snapshot, sourceTenantId)
		if err != nil {
			return nil, err
		}
		stats.DepartmentDisabledCount = deptDisabled
		stats.UserDisabledCount = userDisabled
		stats.MembershipUpdatedCount += membershipDisabled
	}
	return stats, nil
}

func (s *FeishuOrganizationSyncService) upsertDepartment(config *FeishuOrganizationSyncConfig, run *FeishuOrganizationSyncRun, sourceTenantId string, snapshot FeishuDepartmentSnapshot) (bool, error) {
	if snapshot.Id == "" {
		return false, nil
	}
	now := s.now()
	groupName := GetFeishuDepartmentGroupName(sourceTenantId, snapshot.Id)
	parentGroupName := ""
	if snapshot.ParentId != "" && snapshot.ParentId != "0" {
		parentGroupName = GetFeishuDepartmentGroupName(sourceTenantId, snapshot.ParentId)
	}
	group, err := getGroup(config.Organization, groupName)
	if err != nil {
		return false, err
	}
	created := group == nil
	if group == nil {
		group = &Group{
			Owner:     config.Organization,
			Name:      groupName,
			Type:      FeishuDepartmentGroupType,
			IsEnabled: true,
		}
	}
	group.DisplayName = firstNonEmpty(snapshot.Name, snapshot.Id)
	group.ParentId = parentGroupName
	group.IsTopGroup = parentGroupName == ""
	group.Type = FeishuDepartmentGroupType
	group.IsEnabled = true
	if err := saveFeishuGroup(group); err != nil {
		return false, err
	}
	mapping := &FeishuDepartmentMapping{
		Owner:              config.Organization,
		Name:               "feishu-dept-map-" + shortFeishuOrganizationSyncHash(config.Organization, config.AppId, snapshot.Id),
		Organization:       config.Organization,
		AppId:              config.AppId,
		TenantKey:          sourceTenantId,
		DepartmentId:       snapshot.Id,
		GroupOwner:         config.Organization,
		GroupName:          groupName,
		ParentDepartmentId: snapshot.ParentId,
		ParentGroupOwner:   config.Organization,
		ParentGroupName:    parentGroupName,
		DisplayName:        group.DisplayName,
		IsEnabled:          true,
		LastSeenRunId:      run.Name,
		LastSyncedAt:       now,
	}
	if err := saveFeishuDepartmentMapping(mapping); err != nil {
		return false, err
	}
	return created, projectFeishuPlatformDepartment(config.Organization, sourceTenantId, run.Name, mapping, now)
}

func (s *FeishuOrganizationSyncService) upsertUser(config *FeishuOrganizationSyncConfig, run *FeishuOrganizationSyncRun, sourceTenantId string, snapshot FeishuUserSnapshot) (bool, error) {
	if snapshot.UserId == "" {
		return false, nil
	}
	now := s.now()
	fullExternalId := GetFullFeishuUserExternalId(sourceTenantId, snapshot.UserId)
	user, err := findFeishuUserByIdentifiers(config.Organization, snapshot)
	if err != nil {
		return false, err
	}
	if user == nil {
		existingMapping, err := getFeishuUserMapping(config.Organization, config.AppId, snapshot.UserId)
		if err != nil {
			return false, err
		}
		if existingMapping != nil {
			user, err = getUser(existingMapping.UserOwner, existingMapping.UserName)
			if err != nil {
				return false, err
			}
		}
	}
	created := user == nil
	if user == nil {
		user = &User{
			Owner:     config.Organization,
			Name:      GetFeishuUserName(sourceTenantId, snapshot.UserId),
			Type:      "normal-user",
			IsAdmin:   false,
			IsDeleted: false,
		}
	}
	user.Lark = snapshot.UserId
	user.ExternalId = GetLengthSafeFeishuUserExternalId(sourceTenantId, snapshot.UserId)
	user.DisplayName = firstNonEmpty(snapshot.Name, snapshot.UserId)
	user.Title = firstNonEmpty(snapshot.Title, user.Title)
	if snapshot.Email != "" {
		user.Email = snapshot.Email
	}
	if snapshot.Mobile != "" {
		user.Phone = snapshot.Mobile
	}
	if snapshot.Avatar != "" {
		user.Avatar = snapshot.Avatar
	}
	if user.Properties == nil {
		user.Properties = map[string]string{}
	}
	setUserProperty(user, FeishuUserPropertyUserId, snapshot.UserId)
	setUserProperty(user, FeishuUserPropertyOpenId, snapshot.OpenId)
	setUserProperty(user, FeishuUserPropertyUnionId, snapshot.UnionId)
	setUserProperty(user, FeishuUserPropertyTenantKey, sourceTenantId)
	setUserProperty(user, FeishuUserPropertyEndpointMode, config.EndpointMode)
	setUserProperty(user, FeishuUserPropertyAppId, config.AppId)
	user.IsForbidden = false
	if err := saveFeishuUser(user); err != nil {
		return false, err
	}
	mapping := &FeishuUserMapping{
		Owner:            config.Organization,
		Name:             "feishu-user-map-" + shortFeishuOrganizationSyncHash(config.Organization, config.AppId, snapshot.UserId),
		Organization:     config.Organization,
		AppId:            config.AppId,
		TenantKey:        sourceTenantId,
		FeishuUserId:     snapshot.UserId,
		OpenId:           snapshot.OpenId,
		UnionId:          snapshot.UnionId,
		UserOwner:        user.Owner,
		UserName:         user.Name,
		ExternalId:       fullExternalId,
		MainDepartmentId: snapshot.MainDepartmentId,
		Status:           snapshot.Status,
		IsEnabled:        true,
		LastSeenRunId:    run.Name,
		LastSyncedAt:     now,
	}
	if err := saveFeishuUserMapping(mapping); err != nil {
		return false, err
	}
	return created, projectFeishuPlatformUser(config.Organization, sourceTenantId, run.Name, mapping, user, now)
}

func (s *FeishuOrganizationSyncService) upsertMembership(config *FeishuOrganizationSyncConfig, run *FeishuOrganizationSyncRun, sourceTenantId string, snapshot FeishuUserDepartmentSnapshot) (bool, error) {
	if snapshot.FeishuUserId == "" || snapshot.DepartmentId == "" {
		return false, nil
	}
	userMapping, err := getFeishuUserMapping(config.Organization, config.AppId, snapshot.FeishuUserId)
	if err != nil || userMapping == nil {
		return false, err
	}
	departmentMapping, err := getFeishuDepartmentMapping(config.Organization, config.AppId, snapshot.DepartmentId)
	if err != nil || departmentMapping == nil {
		return false, err
	}
	now := s.now()
	membership := &FeishuUserDepartment{
		Owner:         config.Organization,
		Name:          GetFeishuRelationshipName(config.Organization, config.AppId, "user-department", snapshot.FeishuUserId, snapshot.DepartmentId),
		Organization:  config.Organization,
		AppId:         config.AppId,
		FeishuUserId:  snapshot.FeishuUserId,
		DepartmentId:  snapshot.DepartmentId,
		UserOwner:     userMapping.UserOwner,
		UserName:      userMapping.UserName,
		GroupOwner:    departmentMapping.GroupOwner,
		GroupName:     departmentMapping.GroupName,
		IsMain:        snapshot.IsMain,
		IsEnabled:     true,
		LastSeenRunId: run.Name,
		LastSyncedAt:  now,
	}
	if err := saveFeishuUserDepartment(membership); err != nil {
		return false, err
	}
	user, err := getUser(userMapping.UserOwner, userMapping.UserName)
	if err != nil {
		return false, err
	}
	if user != nil {
		user.Groups = addStringIfMissing(removeDisabledFeishuGroups(user.Groups, config.Organization, config.AppId, snapshot.FeishuUserId, ""), departmentMapping.GroupName)
		if err := saveFeishuUserGroups(user); err != nil {
			return false, err
		}
	}
	return true, projectFeishuPlatformMembership(config.Organization, sourceTenantId, run.Name, membership, PlatformLifecycleStatusActive, now)
}

func (s *FeishuOrganizationSyncService) softDisableMissingData(config *FeishuOrganizationSyncConfig, run *FeishuOrganizationSyncRun, snapshot *FeishuOrganizationFullSnapshot, sourceTenantId string) (int, int, int, error) {
	seenDepartments := map[string]bool{}
	for _, department := range snapshot.Departments {
		seenDepartments[department.Id] = true
	}
	seenUsers := map[string]bool{}
	for _, user := range snapshot.Users {
		seenUsers[user.UserId] = true
	}
	seenMemberships := map[string]bool{}
	for _, membership := range snapshot.UserDepartments {
		seenMemberships[membership.FeishuUserId+"\x1f"+membership.DepartmentId] = true
	}

	deptDisabled := 0
	userDisabled := 0
	membershipDisabled := 0
	now := s.now()
	departments, err := getFeishuDepartmentMappings(config.Organization, config.AppId)
	if err != nil {
		return 0, 0, 0, err
	}
	for _, mapping := range departments {
		if seenDepartments[mapping.DepartmentId] || !mapping.IsEnabled {
			continue
		}
		mapping.IsEnabled = false
		mapping.MissingSinceRunId = run.Name
		if err := saveFeishuDepartmentMapping(mapping); err != nil {
			return 0, 0, 0, err
		}
		if group, err := getGroup(mapping.GroupOwner, mapping.GroupName); err != nil {
			return 0, 0, 0, err
		} else if group != nil {
			group.IsEnabled = false
			if err := saveFeishuGroup(group); err != nil {
				return 0, 0, 0, err
			}
		}
		if err := projectFeishuPlatformDepartment(config.Organization, firstNonEmpty(sourceTenantId, mapping.TenantKey, config.TenantKey, config.AppId), run.Name, mapping, now); err != nil {
			return 0, 0, 0, err
		}
		deptDisabled++
	}
	users, err := getFeishuUserMappings(config.Organization, config.AppId)
	if err != nil {
		return 0, 0, 0, err
	}
	for _, mapping := range users {
		if seenUsers[mapping.FeishuUserId] || !mapping.IsEnabled {
			continue
		}
		mapping.IsEnabled = false
		mapping.MissingSinceRunId = run.Name
		if err := saveFeishuUserMapping(mapping); err != nil {
			return 0, 0, 0, err
		}
		if err := projectFeishuPlatformUserFromMapping(config.Organization, firstNonEmpty(sourceTenantId, mapping.TenantKey, config.TenantKey, config.AppId), run.Name, mapping, now); err != nil {
			return 0, 0, 0, err
		}
		if user, err := getUser(mapping.UserOwner, mapping.UserName); err != nil {
			return 0, 0, 0, err
		} else if user != nil {
			user.IsForbidden = true
			if err := saveFeishuUser(user); err != nil {
				return 0, 0, 0, err
			}
		}
		userDisabled++
	}
	memberships, err := getFeishuUserDepartments(config.Organization, config.AppId)
	if err != nil {
		return 0, 0, 0, err
	}
	for _, membership := range memberships {
		if seenMemberships[membership.FeishuUserId+"\x1f"+membership.DepartmentId] || !membership.IsEnabled {
			continue
		}
		membership.IsEnabled = false
		membership.MissingSinceRunId = run.Name
		if err := saveFeishuUserDepartment(membership); err != nil {
			return 0, 0, 0, err
		}
		if user, err := getUser(membership.UserOwner, membership.UserName); err != nil {
			return 0, 0, 0, err
		} else if user != nil {
			user.Groups = removeString(user.Groups, membership.GroupName)
			if err := saveFeishuUserGroups(user); err != nil {
				return 0, 0, 0, err
			}
		}
		if err := projectFeishuPlatformMembership(config.Organization, firstNonEmpty(sourceTenantId, config.TenantKey, config.AppId), run.Name, membership, PlatformLifecycleStatusDisabled, now); err != nil {
			return 0, 0, 0, err
		}
		membershipDisabled++
	}
	return deptDisabled, userDisabled, membershipDisabled, nil
}

func (s *FeishuOrganizationSyncService) UpdateRunStage(run *FeishuOrganizationSyncRun, stage FeishuOrganizationSyncRunStage) error {
	now := s.now().UTC()
	run.Status = FeishuOrganizationSyncRunStatusRunning
	run.Stage = stage
	run.HeartbeatAt = now
	run.LeaseExpiresAt = now.Add(s.leaseDuration())
	run.UpdatedAt = now
	return s.runStore().UpdateFeishuOrganizationSyncRun(run)
}

func (s *FeishuOrganizationSyncService) FinishRunSucceeded(config *FeishuOrganizationSyncConfig, run *FeishuOrganizationSyncRun) error {
	now := s.now().UTC()
	run.Status = FeishuOrganizationSyncRunStatusSucceeded
	run.Stage = FeishuOrganizationSyncRunStageFinalizing
	run.FinishedAt = now
	run.HeartbeatAt = now
	run.UpdatedAt = now
	run.ErrorCode = ""
	run.ErrorText = ""
	if err := s.runStore().UpdateFeishuOrganizationSyncRun(run); err != nil {
		return err
	}
	if err := projectFeishuOrgSyncBatch(run, s.now()); err != nil {
		return err
	}
	if store := s.configStore(); store != nil {
		return store.UpdateFeishuOrganizationSyncConfigLastSync(config, run, now)
	}
	return nil
}

func (s *FeishuOrganizationSyncService) finishRunFailed(run *FeishuOrganizationSyncRun, stage FeishuOrganizationSyncRunStage, errorCode string, secret string, cause error) error {
	now := s.now().UTC()
	run.Status = FeishuOrganizationSyncRunStatusFailed
	run.Stage = stage
	run.FinishedAt = now
	run.HeartbeatAt = now
	run.UpdatedAt = now
	run.ErrorCode = errorCode
	run.ErrorText = safeOrganizationSyncErrorText(cause.Error(), secret)
	if err := s.runStore().UpdateFeishuOrganizationSyncRun(run); err != nil {
		return err
	}
	_ = projectFeishuOrgSyncBatch(run, s.now())
	return cause
}

func (s *FeishuOrganizationSyncService) snapshotClient(config *FeishuOrganizationSyncConfig) FeishuOrganizationSnapshotClient {
	if s != nil && s.NewSnapshotClient != nil {
		return s.NewSnapshotClient(config.AppId, config.AppSecret, config.EndpointMode)
	}
	return NewFeishuAddressBookClient(config.AppId, config.AppSecret, config.EndpointMode)
}

func (s *FeishuOrganizationSyncService) configStore() FeishuOrganizationSyncConfigLastSyncStore {
	if s != nil && s.ConfigStore != nil {
		return s.ConfigStore
	}
	return defaultFeishuOrganizationSyncConfigStore{}
}

func (s *FeishuOrganizationSyncService) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s *FeishuOrganizationSyncService) leaseDuration() time.Duration {
	if s != nil && s.LeaseDuration > 0 {
		return s.LeaseDuration
	}
	return FeishuOrganizationSyncDefaultLeaseDuration
}

func (s *FeishuOrganizationSyncService) syncTimeout() time.Duration {
	if s != nil && s.SyncTimeout > 0 {
		return s.SyncTimeout
	}
	return 0
}

func validateFeishuOrganizationSyncRunExecutionConfig(config *FeishuOrganizationSyncConfig) error {
	if config == nil {
		return errors.New("feishu organization sync config is required")
	}
	if strings.TrimSpace(config.Organization) == "" {
		return errors.New("feishu organization sync organization is required")
	}
	if strings.TrimSpace(config.AppId) == "" {
		return errors.New("feishu organization sync app_id is required")
	}
	if strings.TrimSpace(config.AppSecret) == "" || strings.TrimSpace(config.AppSecret) == FeishuOrganizationSyncMaskedSecret {
		return errors.New("feishu organization sync app_secret is required")
	}
	if !isValidFeishuEndpointMode(config.EndpointMode) {
		return errors.New("feishu organization sync endpoint_mode is invalid")
	}
	if !config.IsEnabled {
		return errors.New("feishu organization sync config is disabled")
	}
	return nil
}

func applyFeishuRunStats(run *FeishuOrganizationSyncRun, stats *FeishuOrganizationSyncRunStats) {
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
}

func findFeishuUserByIdentifiers(organization string, snapshot FeishuUserSnapshot) (*User, error) {
	candidates := []string{snapshot.UserId, snapshot.OpenId, snapshot.UnionId}
	returnUser, _, err := ResolveLarkUserByIdentifierCandidates(candidates, func(identifier string) (*User, error) {
		return GetUserByField(organization, "Lark", identifier)
	})
	return returnUser, err
}

func saveFeishuGroup(group *Group) error {
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

func saveFeishuUser(user *User) error {
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
	_, err = updateUser(user.GetId(), user, []string{"external_id", "display_name", "avatar", "email", "phone", "title", "type", "lark", "properties", "is_forbidden", "updated_time"})
	return err
}

func saveFeishuUserGroups(user *User) error {
	_, err := UpdateUser(user.GetId(), user, []string{"groups"}, false)
	return err
}

func saveFeishuDepartmentMapping(mapping *FeishuDepartmentMapping) error {
	existing, err := getFeishuDepartmentMapping(mapping.Organization, mapping.AppId, mapping.DepartmentId)
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

func getFeishuDepartmentMapping(organization string, appId string, departmentId string) (*FeishuDepartmentMapping, error) {
	if organization == "" || appId == "" || departmentId == "" {
		return nil, nil
	}
	mapping := &FeishuDepartmentMapping{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("app_id = ?", appId).And("department_id = ?", departmentId).Get(mapping)
	if err != nil || !existed {
		return nil, err
	}
	return mapping, nil
}

func getFeishuDepartmentMappings(organization string, appId string) ([]*FeishuDepartmentMapping, error) {
	mappings := []*FeishuDepartmentMapping{}
	err := ormer.Engine.Where("organization = ?", organization).And("app_id = ?", appId).Find(&mappings)
	return mappings, err
}

func saveFeishuUserMapping(mapping *FeishuUserMapping) error {
	existing, err := getFeishuUserMapping(mapping.Organization, mapping.AppId, mapping.FeishuUserId)
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

func getFeishuUserMapping(organization string, appId string, userId string) (*FeishuUserMapping, error) {
	if organization == "" || appId == "" || userId == "" {
		return nil, nil
	}
	mapping := &FeishuUserMapping{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("app_id = ?", appId).And("feishu_user_id = ?", userId).Get(mapping)
	if err != nil || !existed {
		return nil, err
	}
	return mapping, nil
}

func getFeishuUserMappings(organization string, appId string) ([]*FeishuUserMapping, error) {
	mappings := []*FeishuUserMapping{}
	err := ormer.Engine.Where("organization = ?", organization).And("app_id = ?", appId).Find(&mappings)
	return mappings, err
}

func saveFeishuUserDepartment(membership *FeishuUserDepartment) error {
	existing, err := getFeishuUserDepartment(membership.Organization, membership.AppId, membership.FeishuUserId, membership.DepartmentId)
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

func getFeishuUserDepartment(organization string, appId string, userId string, departmentId string) (*FeishuUserDepartment, error) {
	if organization == "" || appId == "" || userId == "" || departmentId == "" {
		return nil, nil
	}
	membership := &FeishuUserDepartment{}
	existed, err := ormer.Engine.Where("organization = ?", organization).And("app_id = ?", appId).And("feishu_user_id = ?", userId).And("department_id = ?", departmentId).Get(membership)
	if err != nil || !existed {
		return nil, err
	}
	return membership, nil
}

func getFeishuUserDepartments(organization string, appId string) ([]*FeishuUserDepartment, error) {
	memberships := []*FeishuUserDepartment{}
	err := ormer.Engine.Where("organization = ?", organization).And("app_id = ?", appId).Find(&memberships)
	return memberships, err
}

func projectFeishuSourceConnection(organization string, appId string, sourceTenantId string, endpointMode string, runId string, now time.Time) error {
	sourceConnectionId := GetSourceConnectionId(organization, SourceTypeLark, sourceTenantId)
	metadata := marshalPlatformLineage(map[string]string{
		"sourceType":     SourceTypeLark,
		"sourceTenantId": sourceTenantId,
		"endpointMode":   endpointMode,
		"appId":          appId,
	})
	return savePlatformObject(&SourceConnection{
		Owner:              organization,
		Name:               sourceConnectionId,
		OrganizationId:     organization,
		SourceConnectionId: sourceConnectionId,
		SourceType:         SourceTypeLark,
		SourceTenantId:     sourceTenantId,
		Status:             SourceConnectionStatusActive,
		Freshness:          PlatformFreshnessFresh,
		Metadata:           metadata,
		ConfigRef:          "lark:" + appId,
		LastSeenBatchId:    runId,
		UpdatedAt:          now,
	})
}

func projectFeishuPlatformDepartment(organization string, sourceTenantId string, runId string, mapping *FeishuDepartmentMapping, now time.Time) error {
	if mapping == nil {
		return nil
	}
	sourceConnectionId := GetSourceConnectionId(organization, SourceTypeLark, sourceTenantId)
	departmentId := getWecomLocalId(mapping.GroupOwner, mapping.GroupName)
	parentDepartmentId := ""
	if mapping.ParentGroupOwner != "" && mapping.ParentGroupName != "" {
		parentDepartmentId = getWecomLocalId(mapping.ParentGroupOwner, mapping.ParentGroupName)
	}
	lifecycle := PlatformLifecycleStatusActive
	if !mapping.IsEnabled {
		lifecycle = PlatformLifecycleStatusDisabled
	}
	version := NewPlatformVersionMetadata(organization, sourceConnectionId, runId, now, "")
	if err := savePlatformObject(&PlatformDepartment{
		Owner:                organization,
		Name:                 GetPlatformDepartmentName(organization, departmentId),
		OrganizationId:       organization,
		DepartmentId:         departmentId,
		ParentDepartmentId:   parentDepartmentId,
		DisplayName:          mapping.DisplayName,
		LifecycleStatus:      lifecycle,
		SourceConnectionId:   sourceConnectionId,
		ExternalDepartmentId: mapping.DepartmentId,
		OrgVersion:           version.OrgVersion,
		UpdatedAt:            now,
	}); err != nil {
		return err
	}
	return savePlatformObject(&ExternalIdentity{
		Owner:               organization,
		Name:                GetExternalIdentityName(sourceConnectionId, PlatformSubjectTypeDepartment, mapping.DepartmentId),
		OrganizationId:      organization,
		SourceConnectionId:  sourceConnectionId,
		ExternalSubjectType: PlatformSubjectTypeDepartment,
		ExternalSubjectId:   mapping.DepartmentId,
		PlatformSubjectType: PlatformSubjectTypeDepartment,
		PlatformSubject:     departmentId,
		MappingStatus:       platformMappingStatusFromEnabled(mapping.IsEnabled),
		Lineage:             marshalPlatformLineage(map[string]string{"source": SourceTypeLark, "runId": runId}),
		LastSeenBatchId:     runId,
		UpdatedAt:           now,
	})
}

func projectFeishuPlatformUser(organization string, sourceTenantId string, runId string, mapping *FeishuUserMapping, user *User, now time.Time) error {
	if mapping == nil || user == nil {
		return nil
	}
	return saveFeishuPlatformUserAndIdentity(organization, sourceTenantId, runId, mapping, getWecomLocalId(user.Owner, user.Name), user.DisplayName, mapping.IsEnabled, now)
}

// projectFeishuPlatformUserFromMapping 在软禁用路径中用既有映射回补平台用户主体，
// 避免飞书侧缺失用户时只禁用本地 User，却留下 active 的平台主数据投影。
func projectFeishuPlatformUserFromMapping(organization string, sourceTenantId string, runId string, mapping *FeishuUserMapping, now time.Time) error {
	if mapping == nil {
		return nil
	}
	return saveFeishuPlatformUserAndIdentity(organization, sourceTenantId, runId, mapping, getWecomLocalId(mapping.UserOwner, mapping.UserName), "", mapping.IsEnabled, now)
}

func saveFeishuPlatformUserAndIdentity(organization string, sourceTenantId string, runId string, mapping *FeishuUserMapping, adminSubject string, displayName string, enabled bool, now time.Time) error {
	if mapping == nil || adminSubject == "" {
		return nil
	}
	sourceConnectionId := GetSourceConnectionId(organization, SourceTypeLark, sourceTenantId)
	version := NewPlatformVersionMetadata(organization, sourceConnectionId, runId, now, "")
	lifecycle := PlatformLifecycleStatusActive
	if !enabled {
		lifecycle = PlatformLifecycleStatusDisabled
	}
	if err := savePlatformObject(&PlatformUser{
		Owner:           organization,
		Name:            prefixedStableHash("puser-", organization, adminSubject),
		OrganizationId:  organization,
		AdminSubject:    adminSubject,
		UserOwner:       mapping.UserOwner,
		UserName:        mapping.UserName,
		DisplayName:     displayName,
		LifecycleStatus: lifecycle,
		MappingStatus:   platformMappingStatusFromEnabled(enabled),
		OrgVersion:      version.OrgVersion,
		LastSeenBatchId: runId,
		UpdatedAt:       now,
	}); err != nil {
		return err
	}
	return savePlatformObject(&ExternalIdentity{
		Owner:               organization,
		Name:                GetExternalIdentityName(sourceConnectionId, PlatformSubjectTypeUser, mapping.FeishuUserId),
		OrganizationId:      organization,
		SourceConnectionId:  sourceConnectionId,
		ExternalSubjectType: PlatformSubjectTypeUser,
		ExternalSubjectId:   mapping.FeishuUserId,
		PlatformSubjectType: PlatformSubjectTypeUser,
		PlatformSubject:     adminSubject,
		MappingStatus:       platformMappingStatusFromEnabled(enabled),
		Lineage:             marshalPlatformLineage(map[string]string{"source": SourceTypeLark, "runId": runId}),
		LastSeenBatchId:     runId,
		UpdatedAt:           now,
	})
}

func projectFeishuPlatformMembership(organization string, sourceTenantId string, runId string, membership *FeishuUserDepartment, lifecycleStatus string, now time.Time) error {
	if membership == nil {
		return nil
	}
	sourceConnectionId := GetSourceConnectionId(organization, SourceTypeLark, sourceTenantId)
	adminSubject := getWecomLocalId(membership.UserOwner, membership.UserName)
	departmentId := getWecomLocalId(membership.GroupOwner, membership.GroupName)
	version := NewPlatformVersionMetadata(organization, sourceConnectionId, runId, now, "")
	return savePlatformObject(&PlatformMembership{
		Owner:              organization,
		Name:               GetPlatformMembershipName(organization, adminSubject, departmentId),
		OrganizationId:     organization,
		AdminSubject:       adminSubject,
		DepartmentId:       departmentId,
		IsMain:             lifecycleStatus == PlatformLifecycleStatusActive && membership.IsMain,
		LifecycleStatus:    lifecycleStatus,
		SourceConnectionId: sourceConnectionId,
		OrgVersion:         version.OrgVersion,
		UpdatedAt:          now,
	})
}

func projectFeishuOrgSyncBatch(run *FeishuOrganizationSyncRun, now time.Time) error {
	if run == nil || run.Organization == "" || run.Name == "" {
		return nil
	}
	sourceTenantId := firstNonEmpty(run.TenantKey, run.AppId)
	sourceConnectionId := GetSourceConnectionId(run.Organization, SourceTypeLark, sourceTenantId)
	finishedAt := run.FinishedAt
	if finishedAt.IsZero() {
		finishedAt = now
	}
	version := NewPlatformVersionMetadata(run.Organization, sourceConnectionId, run.Name, finishedAt, "")
	status, freshness := feishuPlatformOrgSyncBatchStatus(run.Status)
	return savePlatformObject(&OrgSyncBatch{
		Owner:              run.Organization,
		Name:               run.Name,
		OrganizationId:     run.Organization,
		SourceConnectionId: sourceConnectionId,
		BatchId:            run.Name,
		Status:             status,
		StartedAt:          run.StartedAt,
		FinishedAt:         run.FinishedAt,
		OrgVersion:         version.OrgVersion,
		Freshness:          freshness,
		ErrorCode:          run.ErrorCode,
		ErrorText:          run.ErrorText,
		UpdatedAt:          now,
	})
}

func feishuPlatformOrgSyncBatchStatus(status FeishuOrganizationSyncRunStatus) (string, string) {
	switch status {
	case FeishuOrganizationSyncRunStatusSucceeded:
		return OrgSyncBatchStatusSucceeded, PlatformFreshnessFresh
	case FeishuOrganizationSyncRunStatusPartial:
		return OrgSyncBatchStatusPartial, PlatformFreshnessStale
	case FeishuOrganizationSyncRunStatusFailed:
		return OrgSyncBatchStatusFailed, PlatformFreshnessUnavailable
	default:
		return OrgSyncBatchStatusRunning, PlatformFreshnessUnknown
	}
}

func savePlatformObject(obj any) error {
	_, err := ormer.Engine.Insert(obj)
	if err == nil {
		return nil
	}
	switch v := obj.(type) {
	case *SourceConnection:
		_, err = ormer.Engine.ID(core.PK{v.Owner, v.Name}).AllCols().Update(v)
	case *PlatformDepartment:
		_, err = ormer.Engine.ID(core.PK{v.Owner, v.Name}).AllCols().Update(v)
	case *PlatformUser:
		_, err = ormer.Engine.ID(core.PK{v.Owner, v.Name}).AllCols().Update(v)
	case *PlatformMembership:
		_, err = ormer.Engine.ID(core.PK{v.Owner, v.Name}).AllCols().Update(v)
	case *ExternalIdentity:
		_, err = ormer.Engine.ID(core.PK{v.Owner, v.Name}).AllCols().Update(v)
	case *OrgSyncBatch:
		_, err = ormer.Engine.ID(core.PK{v.Owner, v.Name}).AllCols().Update(v)
	}
	return err
}

func addStringIfMissing(values []string, value string) []string {
	if strings.TrimSpace(value) == "" {
		return values
	}
	for _, existing := range values {
		if existing == value {
			return values
		}
	}
	return append(values, value)
}

func removeString(values []string, value string) []string {
	res := make([]string, 0, len(values))
	for _, existing := range values {
		if existing != value {
			res = append(res, existing)
		}
	}
	return res
}

func removeDisabledFeishuGroups(groups []string, organization string, appId string, userId string, keepDepartmentId string) []string {
	memberships, err := getFeishuUserDepartments(organization, appId)
	if err != nil {
		return groups
	}
	disabled := map[string]bool{}
	for _, membership := range memberships {
		if membership.FeishuUserId == userId && !membership.IsEnabled && membership.DepartmentId != keepDepartmentId {
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
