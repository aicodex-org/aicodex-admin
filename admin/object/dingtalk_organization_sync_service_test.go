// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

type memoryDingTalkOrganizationSyncRunStore struct {
	runningRun *DingTalkOrganizationSyncRun
	createdRun *DingTalkOrganizationSyncRun
	runs       []*DingTalkOrganizationSyncRun
}

func (s *memoryDingTalkOrganizationSyncRunStore) GetRunningDingTalkOrganizationSyncRun(organization string) (*DingTalkOrganizationSyncRun, error) {
	if s.runningRun == nil || s.runningRun.Organization != organization || s.runningRun.Status != DingTalkOrganizationSyncRunStatusRunning {
		return nil, nil
	}
	copied := *s.runningRun
	return &copied, nil
}

func (s *memoryDingTalkOrganizationSyncRunStore) CreateDingTalkOrganizationSyncRun(run *DingTalkOrganizationSyncRun) error {
	copied := *run
	s.createdRun = &copied
	s.runs = append(s.runs, &copied)
	return nil
}

func (s *memoryDingTalkOrganizationSyncRunStore) UpdateDingTalkOrganizationSyncRun(run *DingTalkOrganizationSyncRun) error {
	copied := *run
	if s.runningRun != nil && s.runningRun.Name == run.Name {
		s.runningRun = &copied
		return nil
	}
	for i, item := range s.runs {
		if item.Organization == run.Organization && item.Name == run.Name {
			s.runs[i] = &copied
			return nil
		}
	}
	s.runs = append(s.runs, &copied)
	return nil
}

func (s *memoryDingTalkOrganizationSyncRunStore) GetDingTalkOrganizationSyncRun(organization string, runId string) (*DingTalkOrganizationSyncRun, error) {
	for _, run := range s.runs {
		if run.Organization == organization && run.Name == runId {
			copied := *run
			return &copied, nil
		}
	}
	return nil, nil
}

func (s *memoryDingTalkOrganizationSyncRunStore) GetDingTalkOrganizationSyncRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string) ([]*DingTalkOrganizationSyncRun, error) {
	runs := []*DingTalkOrganizationSyncRun{}
	for _, run := range s.runs {
		if run.Organization == organization {
			copied := *run
			runs = append(runs, &copied)
		}
	}
	return runs, nil
}

func (s *memoryDingTalkOrganizationSyncRunStore) GetDingTalkOrganizationSyncRunCount(organization string, field string, value string) (int64, error) {
	var count int64
	for _, run := range s.runs {
		if run.Organization == organization {
			count++
		}
	}
	return count, nil
}

type memoryDingTalkOrganizationObjectStore struct {
	departments   map[string]*DingTalkDepartmentMapping
	users         map[string]*DingTalkUserMapping
	memberships   map[string]*DingTalkUserDepartment
	leaders       map[string]*DingTalkDepartmentLeader
	directLeaders map[string]*DingTalkUserDirectLeader
	localGroups   map[string]*Group
	localUsers    map[string]*User
}

type fakeDingTalkOrganizationSnapshotClient struct {
	token       *DingTalkAccessToken
	departments []DingTalkDepartmentSnapshot
	users       []DingTalkUserSnapshot
	tokenErr    error
	deptErr     error
	userErr     error
}

func (c *fakeDingTalkOrganizationSnapshotClient) GetAccessToken(ctx context.Context) (*DingTalkAccessToken, error) {
	if c.tokenErr != nil {
		return nil, c.tokenErr
	}
	if c.token != nil {
		return c.token, nil
	}
	return &DingTalkAccessToken{AccessToken: "token"}, nil
}

func (c *fakeDingTalkOrganizationSnapshotClient) FetchDepartmentSnapshots(ctx context.Context, accessToken string, departmentId string) ([]DingTalkDepartmentSnapshot, error) {
	if c.deptErr != nil {
		return nil, c.deptErr
	}
	return c.departments, nil
}

func (c *fakeDingTalkOrganizationSnapshotClient) FetchUserSnapshots(ctx context.Context, accessToken string, departments []DingTalkDepartmentSnapshot) ([]DingTalkUserSnapshot, error) {
	if c.userErr != nil {
		return nil, c.userErr
	}
	return c.users, nil
}

func newMemoryDingTalkOrganizationObjectStore() *memoryDingTalkOrganizationObjectStore {
	return &memoryDingTalkOrganizationObjectStore{
		departments:   map[string]*DingTalkDepartmentMapping{},
		users:         map[string]*DingTalkUserMapping{},
		memberships:   map[string]*DingTalkUserDepartment{},
		leaders:       map[string]*DingTalkDepartmentLeader{},
		directLeaders: map[string]*DingTalkUserDirectLeader{},
		localGroups:   map[string]*Group{},
		localUsers:    map[string]*User{},
	}
}

func dingtalkDepartmentKey(organization string, appKey string, departmentId string) string {
	return organization + "|" + appKey + "|" + departmentId
}

func dingtalkUserKey(organization string, appKey string, userId string) string {
	return organization + "|" + appKey + "|" + userId
}

func dingtalkRelationshipKey(organization string, appKey string, left string, right string) string {
	return organization + "|" + appKey + "|" + left + "|" + right
}

func localDingTalkObjectKey(owner string, name string) string {
	return owner + "|" + name
}

func hasDingTalkString(values []string, value string) bool {
	for _, item := range values {
		if item == value {
			return true
		}
	}
	return false
}

func (s *memoryDingTalkOrganizationObjectStore) GetDingTalkDepartmentMapping(organization string, appKey string, departmentId string) (*DingTalkDepartmentMapping, error) {
	mapping := s.departments[dingtalkDepartmentKey(organization, appKey, departmentId)]
	if mapping == nil {
		return nil, nil
	}
	copied := *mapping
	return &copied, nil
}

func (s *memoryDingTalkOrganizationObjectStore) SaveDingTalkDepartmentMapping(mapping *DingTalkDepartmentMapping) error {
	copied := *mapping
	s.departments[dingtalkDepartmentKey(mapping.Organization, mapping.AppKey, mapping.DepartmentId)] = &copied
	return nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetDingTalkDepartmentMappings(organization string, appKey string) ([]*DingTalkDepartmentMapping, error) {
	out := []*DingTalkDepartmentMapping{}
	for _, mapping := range s.departments {
		if mapping.Organization == organization && mapping.AppKey == appKey {
			copied := *mapping
			out = append(out, &copied)
		}
	}
	return out, nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetDingTalkUserMapping(organization string, appKey string, userId string) (*DingTalkUserMapping, error) {
	mapping := s.users[dingtalkUserKey(organization, appKey, userId)]
	if mapping == nil {
		return nil, nil
	}
	copied := *mapping
	return &copied, nil
}

func (s *memoryDingTalkOrganizationObjectStore) SaveDingTalkUserMapping(mapping *DingTalkUserMapping) error {
	copied := *mapping
	s.users[dingtalkUserKey(mapping.Organization, mapping.AppKey, mapping.DingTalkUserId)] = &copied
	return nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetDingTalkUserMappings(organization string, appKey string) ([]*DingTalkUserMapping, error) {
	out := []*DingTalkUserMapping{}
	for _, mapping := range s.users {
		if mapping.Organization == organization && mapping.AppKey == appKey {
			copied := *mapping
			out = append(out, &copied)
		}
	}
	return out, nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetDingTalkUserDepartment(organization string, appKey string, userId string, departmentId string) (*DingTalkUserDepartment, error) {
	mapping := s.memberships[dingtalkRelationshipKey(organization, appKey, userId, departmentId)]
	if mapping == nil {
		return nil, nil
	}
	copied := *mapping
	return &copied, nil
}

func (s *memoryDingTalkOrganizationObjectStore) SaveDingTalkUserDepartment(mapping *DingTalkUserDepartment) error {
	copied := *mapping
	s.memberships[dingtalkRelationshipKey(mapping.Organization, mapping.AppKey, mapping.DingTalkUserId, mapping.DepartmentId)] = &copied
	return nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetDingTalkUserDepartments(organization string, appKey string) ([]*DingTalkUserDepartment, error) {
	out := []*DingTalkUserDepartment{}
	for _, mapping := range s.memberships {
		if mapping.Organization == organization && mapping.AppKey == appKey {
			copied := *mapping
			out = append(out, &copied)
		}
	}
	return out, nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetDingTalkDepartmentLeader(organization string, appKey string, departmentId string, userId string) (*DingTalkDepartmentLeader, error) {
	mapping := s.leaders[dingtalkRelationshipKey(organization, appKey, departmentId, userId)]
	if mapping == nil {
		return nil, nil
	}
	copied := *mapping
	return &copied, nil
}

func (s *memoryDingTalkOrganizationObjectStore) SaveDingTalkDepartmentLeader(mapping *DingTalkDepartmentLeader) error {
	copied := *mapping
	s.leaders[dingtalkRelationshipKey(mapping.Organization, mapping.AppKey, mapping.DepartmentId, mapping.DingTalkUserId)] = &copied
	return nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetDingTalkDepartmentLeaders(organization string, appKey string) ([]*DingTalkDepartmentLeader, error) {
	out := []*DingTalkDepartmentLeader{}
	for _, mapping := range s.leaders {
		if mapping.Organization == organization && mapping.AppKey == appKey {
			copied := *mapping
			out = append(out, &copied)
		}
	}
	return out, nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetDingTalkUserDirectLeader(organization string, appKey string, userId string, leaderUserId string) (*DingTalkUserDirectLeader, error) {
	mapping := s.directLeaders[dingtalkRelationshipKey(organization, appKey, userId, leaderUserId)]
	if mapping == nil {
		return nil, nil
	}
	copied := *mapping
	return &copied, nil
}

func (s *memoryDingTalkOrganizationObjectStore) SaveDingTalkUserDirectLeader(mapping *DingTalkUserDirectLeader) error {
	copied := *mapping
	s.directLeaders[dingtalkRelationshipKey(mapping.Organization, mapping.AppKey, mapping.DingTalkUserId, mapping.LeaderDingTalkUserId)] = &copied
	return nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetDingTalkUserDirectLeaders(organization string, appKey string) ([]*DingTalkUserDirectLeader, error) {
	out := []*DingTalkUserDirectLeader{}
	for _, mapping := range s.directLeaders {
		if mapping.Organization == organization && mapping.AppKey == appKey {
			copied := *mapping
			out = append(out, &copied)
		}
	}
	return out, nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetGroup(owner string, name string) (*Group, error) {
	group := s.localGroups[localDingTalkObjectKey(owner, name)]
	if group == nil {
		return nil, nil
	}
	copied := *group
	return &copied, nil
}

func (s *memoryDingTalkOrganizationObjectStore) SaveGroup(group *Group) error {
	if group == nil {
		return nil
	}
	copied := *group
	s.localGroups[localDingTalkObjectKey(group.Owner, group.Name)] = &copied
	return nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetUser(owner string, name string) (*User, error) {
	user := s.localUsers[localDingTalkObjectKey(owner, name)]
	if user == nil {
		return nil, nil
	}
	copied := *user
	return &copied, nil
}

func (s *memoryDingTalkOrganizationObjectStore) GetUserByField(owner string, field string, value string) (*User, error) {
	for _, user := range s.localUsers {
		if user.Owner != owner {
			continue
		}
		if strings.EqualFold(field, "DingTalk") && user.DingTalk == value {
			copied := *user
			return &copied, nil
		}
		if strings.EqualFold(field, "ExternalId") && user.ExternalId == value {
			copied := *user
			return &copied, nil
		}
	}
	return nil, nil
}

func (s *memoryDingTalkOrganizationObjectStore) SaveUser(user *User) error {
	if user == nil {
		return nil
	}
	copied := *user
	s.localUsers[localDingTalkObjectKey(user.Owner, user.Name)] = &copied
	return nil
}

func (s *memoryDingTalkOrganizationObjectStore) SaveUserGroups(user *User) error {
	if user == nil {
		return nil
	}
	existing := s.localUsers[localDingTalkObjectKey(user.Owner, user.Name)]
	if existing == nil {
		copied := *user
		s.localUsers[localDingTalkObjectKey(user.Owner, user.Name)] = &copied
		return nil
	}
	existing.Groups = append([]string{}, user.Groups...)
	return nil
}

func TestDingTalkOrganizationSyncServiceStartManualRunResultReportsStaleRecovery(t *testing.T) {
	now := time.Date(2026, 7, 1, 12, 0, 0, 0, time.UTC)
	store := &memoryDingTalkOrganizationSyncRunStore{
		runningRun: &DingTalkOrganizationSyncRun{
			Owner:          "engineering",
			Name:           "run-stale",
			Organization:   "engineering",
			Status:         DingTalkOrganizationSyncRunStatusRunning,
			LeaseExpiresAt: now.Add(-time.Minute),
		},
	}
	service := &DingTalkOrganizationSyncService{
		Store:             store,
		WecomConfigStore:  &memoryWecomOrganizationSyncConfigStore{},
		FeishuConfigStore: &fakeFeishuConfigStore{},
		Now:               func() time.Time { return now },
		LeaseDuration:     10 * time.Minute,
	}

	result, err := service.StartManualRunWithResult(&DingTalkOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         DingTalkOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppKey:       "ding-app",
		AppSecret:    "secret",
		IsEnabled:    true,
	}, "engineering/admin")
	if err != nil {
		t.Fatalf("StartManualRunWithResult() error = %v", err)
	}

	if result == nil || result.Run == nil {
		t.Fatalf("expected created run result, got %#v", result)
	}
	if result.StaleRun == nil || result.StaleRun.Name != "run-stale" || result.StaleRun.ErrorCode != DingTalkOrganizationSyncErrorCodeStaleRunning {
		t.Fatalf("expected stale run recovery in result, got %#v", result.StaleRun)
	}
	if result.Run.Status != DingTalkOrganizationSyncRunStatusRunning || result.Run.TriggerType != DingTalkOrganizationSyncTriggerManual {
		t.Fatalf("new run = %#v, want running manual run", result.Run)
	}
	if result.Config == nil || result.Config.AppKey != "ding-app" || result.Config.AppSecret != "secret" {
		t.Fatalf("expected run result to keep execution config snapshot, got %#v", result.Config)
	}
}

func TestDingTalkOrganizationSyncServiceStartManualRunRejectsActiveRunningRun(t *testing.T) {
	now := time.Date(2026, 7, 1, 12, 0, 0, 0, time.UTC)
	store := &memoryDingTalkOrganizationSyncRunStore{
		runningRun: &DingTalkOrganizationSyncRun{
			Owner:          "engineering",
			Name:           "run-active",
			Organization:   "engineering",
			Status:         DingTalkOrganizationSyncRunStatusRunning,
			LeaseExpiresAt: now.Add(time.Minute),
		},
	}
	service := &DingTalkOrganizationSyncService{
		Store:             store,
		WecomConfigStore:  &memoryWecomOrganizationSyncConfigStore{},
		FeishuConfigStore: &fakeFeishuConfigStore{},
		Now:               func() time.Time { return now },
	}

	_, err := service.StartManualRunWithResult(&DingTalkOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         DingTalkOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppKey:       "ding-app",
		AppSecret:    "secret",
		IsEnabled:    true,
	}, "engineering/admin")

	if !errors.Is(err, ErrDingTalkOrganizationSyncRunAlreadyRunning) {
		t.Fatalf("StartManualRunWithResult() error = %v, want already running", err)
	}
	if store.createdRun != nil {
		t.Fatalf("active running run must not create duplicate: %#v", store.createdRun)
	}
}

func TestDingTalkOrganizationSyncServiceApplyFullSnapshotPersistsMappingsRelationshipsAndSoftDisables(t *testing.T) {
	now := time.Date(2026, 7, 1, 12, 30, 0, 0, time.UTC)
	store := newMemoryDingTalkOrganizationObjectStore()
	store.localGroups[localDingTalkObjectKey("engineering", "stale-group")] = &Group{
		Owner: "engineering", Name: "stale-group", IsEnabled: true,
	}
	store.localUsers[localDingTalkObjectKey("engineering", "stale-local-user")] = &User{
		Owner: "engineering", Name: "stale-local-user", Groups: []string{"stale-group"},
	}
	store.departments[dingtalkDepartmentKey("engineering", "ding-app", "stale-dept")] = &DingTalkDepartmentMapping{
		Organization: "engineering", AppKey: "ding-app", DepartmentId: "stale-dept", GroupOwner: "engineering", GroupName: "stale-group", IsEnabled: true,
	}
	store.users[dingtalkUserKey("engineering", "ding-app", "stale-user")] = &DingTalkUserMapping{
		Organization: "engineering", AppKey: "ding-app", DingTalkUserId: "stale-user", UserOwner: "engineering", UserName: "stale-local-user", IsEnabled: true,
	}
	store.memberships[dingtalkRelationshipKey("engineering", "ding-app", "stale-user", "stale-dept")] = &DingTalkUserDepartment{
		Organization: "engineering", AppKey: "ding-app", DingTalkUserId: "stale-user", DepartmentId: "stale-dept", UserOwner: "engineering", UserName: "stale-local-user", GroupOwner: "engineering", GroupName: "stale-group", IsEnabled: true,
	}
	store.leaders[dingtalkRelationshipKey("engineering", "ding-app", "stale-dept", "stale-user")] = &DingTalkDepartmentLeader{
		Organization: "engineering", AppKey: "ding-app", DepartmentId: "stale-dept", DingTalkUserId: "stale-user", IsEnabled: true,
	}
	store.directLeaders[dingtalkRelationshipKey("engineering", "ding-app", "stale-user", "u2")] = &DingTalkUserDirectLeader{
		Organization: "engineering", AppKey: "ding-app", DingTalkUserId: "stale-user", LeaderDingTalkUserId: "u2", IsEnabled: true,
	}
	service := &DingTalkOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	config := &DingTalkOrganizationSyncConfig{
		Owner:                  "engineering",
		Name:                   DingTalkOrganizationSyncDefaultConfigName,
		Organization:           "engineering",
		AppKey:                 "ding-app",
		AppSecret:              "secret",
		SoftDisableMissingData: true,
	}
	run := &DingTalkOrganizationSyncRun{
		Owner:        "engineering",
		Name:         "run-1",
		Organization: "engineering",
		AppKey:       "ding-app",
	}

	stats, err := service.ApplyFullSnapshot(config, run, &DingTalkOrganizationFullSnapshot{
		Departments: []DingTalkDepartmentSnapshot{
			{Id: "2", ParentId: "1", Name: "研发中心", Order: 10, DepartmentLeader: []string{"u2"}},
			{Id: "4", ParentId: "2", Name: "平台组", Order: 5},
		},
		Users: []DingTalkUserSnapshot{
			{UserId: "u1", UnionId: "union-u1", Name: "张三", Mobile: "13000000000", Email: "zhangsan@example.com", Avatar: "https://example.com/avatar.png", Position: "研发负责人", Departments: []string{"2", "4"}, DepartmentOrders: []int{20, 10}, IsLeaderInDepartment: []bool{true, false}, DirectLeaders: []string{"u2"}, MainDepartmentId: "2", Status: "active"},
			{UserId: "u2", Name: "李四", Departments: []string{"2"}, MainDepartmentId: "2", Status: "active"},
		},
	})
	if err != nil {
		t.Fatalf("ApplyFullSnapshot() error = %v", err)
	}

	if stats.DepartmentCreatedCount != 2 || stats.UserCreatedCount != 2 || stats.MembershipUpdatedCount != 3 || stats.DepartmentLeaderUpdatedCount != 1 || stats.DirectLeaderUpdatedCount != 1 {
		t.Fatalf("stats = %#v, want created departments/users and relationship updates", stats)
	}
	if stats.DepartmentDisabledCount != 1 || stats.UserDisabledCount != 1 || stats.MembershipDisabledCount != 1 || stats.DepartmentLeaderDisabledCount != 1 || stats.DirectLeaderDisabledCount != 1 {
		t.Fatalf("disable stats = %#v, want stale mappings disabled", stats)
	}

	dept := store.departments[dingtalkDepartmentKey("engineering", "ding-app", "2")]
	if dept == nil || !dept.IsEnabled || dept.DisplayName != "研发中心" || dept.ParentDepartmentId != "1" || dept.LastSeenRunId != "run-1" {
		t.Fatalf("department mapping = %#v, want enabled normalized department", dept)
	}
	user := store.users[dingtalkUserKey("engineering", "ding-app", "u1")]
	if user == nil || !user.IsEnabled || user.UnionId != "union-u1" || user.MainDepartmentId != "2" || user.Status != "active" {
		t.Fatalf("user mapping = %#v, want enabled normalized user", user)
	}
	localGroup := store.localGroups[localDingTalkObjectKey("engineering", GetDingTalkDepartmentGroupName("ding-app", "2"))]
	if localGroup == nil || localGroup.DisplayName != "研发中心" || localGroup.Type != DingTalkDepartmentGroupType || !localGroup.IsEnabled || !localGroup.IsTopGroup {
		t.Fatalf("local group = %#v, want enabled top DingTalk department group", localGroup)
	}
	localUser := store.localUsers[localDingTalkObjectKey("engineering", GetDingTalkUserName("ding-app", "u1"))]
	if localUser == nil || localUser.Id == "" || localUser.DisplayName != "张三" || localUser.Title != "研发负责人" || localUser.Email != "zhangsan@example.com" || localUser.Phone != "13000000000" || localUser.Avatar != "https://example.com/avatar.png" || localUser.DingTalk != "u1" || localUser.ExternalId != GetLengthSafeDingTalkUserExternalId("ding-app", "u1") || localUser.IsForbidden {
		t.Fatalf("local user = %#v, want visible active DingTalk user", localUser)
	}
	if !hasDingTalkString(localUser.Groups, GetDingTalkDepartmentGroupName("ding-app", "2")) || !hasDingTalkString(localUser.Groups, GetDingTalkDepartmentGroupName("ding-app", "4")) {
		t.Fatalf("local user groups = %#v, want DingTalk department groups", localUser.Groups)
	}
	membership := store.memberships[dingtalkRelationshipKey("engineering", "ding-app", "u1", "2")]
	if membership == nil || !membership.IsEnabled || !membership.IsMain || !membership.IsLeader {
		t.Fatalf("membership = %#v, want main leader membership", membership)
	}
	leader := store.leaders[dingtalkRelationshipKey("engineering", "ding-app", "2", "u2")]
	if leader == nil || !leader.IsEnabled {
		t.Fatalf("department leader = %#v, want enabled leader relationship", leader)
	}
	directLeader := store.directLeaders[dingtalkRelationshipKey("engineering", "ding-app", "u1", "u2")]
	if directLeader == nil || !directLeader.IsEnabled {
		t.Fatalf("direct leader = %#v, want enabled direct leader relationship", directLeader)
	}
	if stale := store.departments[dingtalkDepartmentKey("engineering", "ding-app", "stale-dept")]; stale == nil || stale.IsEnabled || stale.MissingSinceRunId != "run-1" {
		t.Fatalf("stale department = %#v, want soft disabled by run-1", stale)
	}
	if staleGroup := store.localGroups[localDingTalkObjectKey("engineering", "stale-group")]; staleGroup == nil || staleGroup.IsEnabled {
		t.Fatalf("stale local group = %#v, want disabled", staleGroup)
	}
	if staleUser := store.localUsers[localDingTalkObjectKey("engineering", "stale-local-user")]; staleUser == nil || !staleUser.IsForbidden || hasDingTalkString(staleUser.Groups, "stale-group") {
		t.Fatalf("stale local user = %#v, want forbidden and removed from stale group", staleUser)
	}
	if stale := store.directLeaders[dingtalkRelationshipKey("engineering", "ding-app", "stale-user", "u2")]; stale == nil || stale.IsEnabled || stale.MissingSinceRunId != "run-1" {
		t.Fatalf("stale direct leader = %#v, want soft disabled by run-1", stale)
	}
}

func TestDingTalkOrganizationSyncServiceApplyFullSnapshotUpdatesExistingMappings(t *testing.T) {
	now := time.Date(2026, 7, 1, 13, 0, 0, 0, time.UTC)
	store := newMemoryDingTalkOrganizationObjectStore()
	service := &DingTalkOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	config := &DingTalkOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         DingTalkOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppKey:       "ding-app",
		AppSecret:    "secret",
	}
	firstRun := &DingTalkOrganizationSyncRun{Owner: "engineering", Name: "run-1", Organization: "engineering", AppKey: "ding-app"}
	secondRun := &DingTalkOrganizationSyncRun{Owner: "engineering", Name: "run-2", Organization: "engineering", AppKey: "ding-app"}

	_, err := service.ApplyFullSnapshot(config, firstRun, &DingTalkOrganizationFullSnapshot{
		Departments: []DingTalkDepartmentSnapshot{{Id: "2", ParentId: "1", Name: "研发中心", Order: 10, DepartmentLeader: []string{"u1"}}},
		Users: []DingTalkUserSnapshot{
			{UserId: "u1", Name: "张三", Departments: []string{"2"}, DepartmentOrders: []int{10}, IsLeaderInDepartment: []bool{true}, DirectLeaders: []string{"u2"}, MainDepartmentId: "2", Status: "active"},
			{UserId: "u2", Name: "李四", Departments: []string{"2"}, MainDepartmentId: "2", Status: "active"},
		},
	})
	if err != nil {
		t.Fatalf("first ApplyFullSnapshot() error = %v", err)
	}
	firstLocalUser := store.localUsers[localDingTalkObjectKey("engineering", GetDingTalkUserName("ding-app", "u1"))]
	if firstLocalUser == nil || firstLocalUser.Id == "" {
		t.Fatalf("first local user = %#v, want generated ID", firstLocalUser)
	}
	firstUserId := firstLocalUser.Id

	stats, err := service.ApplyFullSnapshot(config, secondRun, &DingTalkOrganizationFullSnapshot{
		Departments: []DingTalkDepartmentSnapshot{{Id: "2", ParentId: "1", Name: "研发平台", Order: 30, DepartmentLeader: []string{"u2"}}},
		Users: []DingTalkUserSnapshot{
			{UserId: "u1", UnionId: "union-u1", Name: "张三-更新", Departments: []string{"2"}, DepartmentOrders: []int{30}, IsLeaderInDepartment: []bool{false}, DirectLeaders: []string{"u2"}, MainDepartmentId: "2", Status: "inactive"},
			{UserId: "u2", Name: "李四", Departments: []string{"2"}, MainDepartmentId: "2", Status: "active"},
		},
	})
	if err != nil {
		t.Fatalf("second ApplyFullSnapshot() error = %v", err)
	}
	if stats.DepartmentCreatedCount != 0 || stats.UserCreatedCount != 0 || stats.DepartmentUpdatedCount != 1 || stats.UserUpdatedCount != 2 {
		t.Fatalf("stats = %#v, want existing department and users updated without creates", stats)
	}
	dept := store.departments[dingtalkDepartmentKey("engineering", "ding-app", "2")]
	if dept.DisplayName != "研发平台" || dept.Order != 30 || dept.LastSeenRunId != "run-2" {
		t.Fatalf("updated department = %#v, want run-2 platform update", dept)
	}
	user := store.users[dingtalkUserKey("engineering", "ding-app", "u1")]
	if user.UnionId != "union-u1" || user.Status != "inactive" || user.LastSeenRunId != "run-2" {
		t.Fatalf("updated user = %#v, want updated identity/status and run marker", user)
	}
	localUser := store.localUsers[localDingTalkObjectKey("engineering", GetDingTalkUserName("ding-app", "u1"))]
	if localUser.DisplayName != "张三-更新" || !localUser.IsForbidden {
		t.Fatalf("updated local user = %#v, want inactive DingTalk user forbidden", localUser)
	}
	if localUser.Id != firstUserId {
		t.Fatalf("updated local user ID = %q, want preserved ID %q", localUser.Id, firstUserId)
	}
	membership := store.memberships[dingtalkRelationshipKey("engineering", "ding-app", "u1", "2")]
	if membership.IsLeader || membership.LastSeenRunId != "run-2" {
		t.Fatalf("updated membership = %#v, want non-leader membership from run-2", membership)
	}
	leader := store.leaders[dingtalkRelationshipKey("engineering", "ding-app", "2", "u2")]
	if leader == nil || !leader.IsEnabled || leader.LastSeenRunId != "run-2" {
		t.Fatalf("updated department leader = %#v, want u2 leader from run-2", leader)
	}
}

func TestDingTalkOrganizationSyncServiceExecuteRunSucceedsAndUpdatesLastSync(t *testing.T) {
	now := time.Date(2026, 7, 2, 9, 30, 0, 0, time.UTC)
	runStore := &memoryDingTalkOrganizationSyncRunStore{}
	configStore := &memoryDingTalkOrganizationSyncConfigStore{}
	objectStore := newMemoryDingTalkOrganizationObjectStore()
	service := &DingTalkOrganizationSyncService{
		Store:       runStore,
		ConfigStore: configStore,
		ObjectStore: objectStore,
		Now:         func() time.Time { return now },
		NewSnapshotClient: func(appKey string, appSecret string) DingTalkOrganizationSnapshotClient {
			return &fakeDingTalkOrganizationSnapshotClient{
				departments: []DingTalkDepartmentSnapshot{
					{Id: "2", ParentId: "1", Name: "研发中心", DepartmentLeader: []string{"u1"}},
				},
				users: []DingTalkUserSnapshot{
					{UserId: "u1", Name: "张三", Departments: []string{"2"}, MainDepartmentId: "2", Status: "active"},
				},
			}
		},
	}
	config := &DingTalkOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         DingTalkOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppKey:       "ding-app",
		AppSecret:    "real-secret",
		IsEnabled:    true,
	}
	run := &DingTalkOrganizationSyncRun{
		Owner:        "engineering",
		Name:         "run-success",
		Organization: "engineering",
		AppKey:       "ding-app",
		Status:       DingTalkOrganizationSyncRunStatusRunning,
	}

	if err := service.ExecuteRun(context.Background(), config, run); err != nil {
		t.Fatalf("ExecuteRun() error = %v", err)
	}

	if run.Status != DingTalkOrganizationSyncRunStatusSucceeded || run.Stage != DingTalkOrganizationSyncRunStageFinalizing {
		t.Fatalf("run status/stage = %s/%s, want succeeded/finalizing", run.Status, run.Stage)
	}
	if run.DepartmentFetchedCount != 1 || run.UserFetchedCount != 1 || run.DepartmentCreatedCount != 1 || run.UserCreatedCount != 1 || run.DepartmentLeaderUpdatedCount != 1 {
		t.Fatalf("run counts = %#v, want fetched and applied counts", run)
	}
	if configStore.lastSyncRun == nil || configStore.lastSyncRun.Name != "run-success" || !configStore.lastSyncedAt.Equal(now) {
		t.Fatalf("last sync update = run:%#v at:%v, want run-success at now", configStore.lastSyncRun, configStore.lastSyncedAt)
	}
	if len(runStore.runs) == 0 || runStore.runs[len(runStore.runs)-1].Status != DingTalkOrganizationSyncRunStatusSucceeded {
		t.Fatalf("run store updates = %#v, want succeeded run persisted", runStore.runs)
	}
}

func TestDingTalkOrganizationSyncServiceExecuteRunFetchFailureMasksSecret(t *testing.T) {
	now := time.Date(2026, 7, 2, 10, 0, 0, 0, time.UTC)
	runStore := &memoryDingTalkOrganizationSyncRunStore{}
	service := &DingTalkOrganizationSyncService{
		Store:       runStore,
		ObjectStore: newMemoryDingTalkOrganizationObjectStore(),
		Now:         func() time.Time { return now },
		NewSnapshotClient: func(appKey string, appSecret string) DingTalkOrganizationSnapshotClient {
			return &fakeDingTalkOrganizationSnapshotClient{tokenErr: errors.New("token failed for super-secret")}
		},
	}
	config := &DingTalkOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         DingTalkOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppKey:       "ding-app",
		AppSecret:    "super-secret",
		IsEnabled:    true,
	}
	run := &DingTalkOrganizationSyncRun{
		Owner:        "engineering",
		Name:         "run-failed",
		Organization: "engineering",
		AppKey:       "ding-app",
		Status:       DingTalkOrganizationSyncRunStatusRunning,
	}

	err := service.ExecuteRun(context.Background(), config, run)
	if err == nil || err.Error() != "token failed for super-secret" {
		t.Fatalf("ExecuteRun() error = %v, want original fetch error returned", err)
	}
	if run.Status != DingTalkOrganizationSyncRunStatusFailed || run.Stage != DingTalkOrganizationSyncRunStageFetching || run.ErrorCode != "fetch_failed" {
		t.Fatalf("failed run = %#v, want fetch_failed", run)
	}
	if run.ErrorText == "" || strings.Contains(run.ErrorText, "super-secret") {
		t.Fatalf("safe error text = %q, want non-empty text without secret", run.ErrorText)
	}
}

func TestDingTalkOrganizationSyncServiceRejectsInvalidExecutionConfig(t *testing.T) {
	service := &DingTalkOrganizationSyncService{}

	invalidConfigs := []*DingTalkOrganizationSyncConfig{
		nil,
		{Organization: "", AppKey: "ding-app", AppSecret: "secret"},
		{Organization: "built-in", AppKey: "ding-app", AppSecret: "secret"},
		{Organization: "engineering", AppKey: "", AppSecret: "secret"},
		{Organization: "engineering", AppKey: "ding-app", AppSecret: DingTalkOrganizationSyncMaskedSecret},
	}
	for _, config := range invalidConfigs {
		if _, err := service.StartManualRunWithResult(config, "actor"); err == nil {
			t.Fatalf("StartManualRunWithResult(%#v) error = nil, want validation error", config)
		}
	}
}

func TestDingTalkOrganizationSyncServiceHelpersNormalizeDefaultsAndNilInputs(t *testing.T) {
	applyDingTalkRunStats(nil, &DingTalkOrganizationSyncRunStats{DepartmentCreatedCount: 1})
	run := &DingTalkOrganizationSyncRun{}
	applyDingTalkRunStats(run, nil)
	if run.DepartmentCreatedCount != 0 {
		t.Fatalf("applyDingTalkRunStats(nil stats) mutated run: %#v", run)
	}
	applyDingTalkRunStats(run, &DingTalkOrganizationSyncRunStats{
		DepartmentCreatedCount:        1,
		UserUpdatedCount:              2,
		MembershipDisabledCount:       3,
		DepartmentLeaderDisabledCount: 4,
		DirectLeaderUpdatedCount:      5,
	})
	if run.DepartmentCreatedCount != 1 || run.UserUpdatedCount != 2 || run.MembershipDisabledCount != 3 || run.DepartmentLeaderDisabledCount != 4 || run.DirectLeaderUpdatedCount != 5 {
		t.Fatalf("applyDingTalkRunStats() = %#v, want selected stats copied", run)
	}

	emptySnapshot := normalizeDingTalkOrganizationFullSnapshot(nil)
	if emptySnapshot == nil || len(emptySnapshot.Departments) != 0 || len(emptySnapshot.Users) != 0 {
		t.Fatalf("normalizeDingTalkOrganizationFullSnapshot(nil) = %#v, want empty snapshot", emptySnapshot)
	}
	normalized := normalizeDingTalkOrganizationFullSnapshot(&DingTalkOrganizationFullSnapshot{
		Departments: []DingTalkDepartmentSnapshot{
			{Id: " ", Name: "empty"},
			{Id: "2", DepartmentLeader: []string{" u1 ", "u1", ""}},
			{Id: "2", Name: "duplicate"},
		},
		Users: []DingTalkUserSnapshot{
			{UserId: " ", Departments: []string{"2"}},
			{UserId: "u1", Departments: []string{" 2 ", "2", ""}, DirectLeaders: []string{" u2 ", "u2"}},
			{UserId: "u1", Name: "duplicate"},
		},
	})
	if len(normalized.Departments) != 1 || len(normalized.Users) != 1 {
		t.Fatalf("normalized snapshot = %#v, want duplicate and empty IDs skipped", normalized)
	}
	if normalized.Departments[0].DepartmentLeader[0] != "u1" || normalized.Users[0].MainDepartmentId != "2" || len(normalized.Users[0].DirectLeaders) != 1 {
		t.Fatalf("normalized snapshot = %#v, want compact leaders and main department fallback", normalized)
	}

	var service *DingTalkOrganizationSyncService
	if service.objectStore() == nil || service.configLastSyncStore() == nil || service.wecomConfigStore() == nil || service.feishuConfigStore() == nil || service.now().IsZero() || service.leaseDuration() <= 0 || service.syncTimeout() != 0 {
		t.Fatalf("nil DingTalk service should provide defaults")
	}
	config := &DingTalkOrganizationSyncConfig{AppKey: "ding-app", AppSecret: "secret"}
	if service.snapshotClient(config) == nil {
		t.Fatalf("nil DingTalk service should create default snapshot client")
	}
}
