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

	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
	"github.com/xorm-io/xorm"
	_ "modernc.org/sqlite"
)

type fakeFeishuSnapshotClient struct {
	token         *FeishuAccessToken
	departments   []FeishuDepartmentSnapshot
	users         []FeishuUserSnapshot
	err           error
	tokenErr      error
	departmentErr error
	userErr       error
}

func (c *fakeFeishuSnapshotClient) GetAccessToken(ctx context.Context) (*FeishuAccessToken, error) {
	if c.tokenErr != nil {
		return nil, c.tokenErr
	}
	if c.err != nil {
		return nil, c.err
	}
	return c.token, nil
}

func (c *fakeFeishuSnapshotClient) FetchDepartmentSnapshots(ctx context.Context, accessToken string, departmentId string) ([]FeishuDepartmentSnapshot, error) {
	if c.departmentErr != nil {
		return nil, c.departmentErr
	}
	if c.err != nil {
		return nil, c.err
	}
	return c.departments, nil
}

func (c *fakeFeishuSnapshotClient) FetchUserSnapshots(ctx context.Context, accessToken string, departments []FeishuDepartmentSnapshot) ([]FeishuUserSnapshot, error) {
	if c.userErr != nil {
		return nil, c.userErr
	}
	if c.err != nil {
		return nil, c.err
	}
	return c.users, nil
}

type fakeFeishuRunStore struct {
	running *FeishuOrganizationSyncRun
	created *FeishuOrganizationSyncRun
	updated *FeishuOrganizationSyncRun
	run     *FeishuOrganizationSyncRun
	runs    []*FeishuOrganizationSyncRun
}

func (s *fakeFeishuRunStore) GetRunningFeishuOrganizationSyncRun(organization string) (*FeishuOrganizationSyncRun, error) {
	return s.running, nil
}

func (s *fakeFeishuRunStore) CreateFeishuOrganizationSyncRun(run *FeishuOrganizationSyncRun) error {
	s.created = run
	return nil
}

func (s *fakeFeishuRunStore) UpdateFeishuOrganizationSyncRun(run *FeishuOrganizationSyncRun) error {
	copy := *run
	s.updated = &copy
	return nil
}

func (s *fakeFeishuRunStore) GetFeishuOrganizationSyncRun(organization string, runId string) (*FeishuOrganizationSyncRun, error) {
	if s.run != nil && s.run.Organization == organization && s.run.Name == runId {
		return s.run, nil
	}
	return nil, nil
}

func (s *fakeFeishuRunStore) GetFeishuOrganizationSyncRuns(organization string, offset int, limit int, field string, value string, sortField string, sortOrder string) ([]*FeishuOrganizationSyncRun, error) {
	runs := []*FeishuOrganizationSyncRun{}
	for _, run := range s.runs {
		if run != nil && run.Organization == organization {
			runs = append(runs, run)
		}
	}
	return runs, nil
}

func (s *fakeFeishuRunStore) GetFeishuOrganizationSyncRunCount(organization string, field string, value string) (int64, error) {
	count := int64(0)
	for _, run := range s.runs {
		if run != nil && run.Organization == organization {
			count++
		}
	}
	return count, nil
}

type fakeFeishuConfigLastSyncStore struct {
	config *FeishuOrganizationSyncConfig
	run    *FeishuOrganizationSyncRun
	at     time.Time
}

func (s *fakeFeishuConfigLastSyncStore) UpdateFeishuOrganizationSyncConfigLastSync(config *FeishuOrganizationSyncConfig, run *FeishuOrganizationSyncRun, syncedAt time.Time) error {
	s.config = config
	s.run = run
	s.at = syncedAt
	return nil
}

func TestFeishuOrganizationSyncServiceFetchFullSnapshotUsesTenantKeyFromUser(t *testing.T) {
	client := &fakeFeishuSnapshotClient{
		token:       &FeishuAccessToken{TenantAccessToken: "token"},
		departments: []FeishuDepartmentSnapshot{{Id: "od-1", Name: "研发"}},
		users: []FeishuUserSnapshot{{
			UserId:           "ou_1",
			TenantKey:        "tenant-a",
			Departments:      []string{"od-1"},
			MainDepartmentId: "od-1",
		}},
	}
	service := &FeishuOrganizationSyncService{}
	snapshot, sourceTenantId, err := service.FetchFullSnapshot(context.Background(), &FeishuOrganizationSyncConfig{AppId: "cli_1"}, client)
	if err != nil {
		t.Fatalf("FetchFullSnapshot() error = %v", err)
	}
	if sourceTenantId != "tenant-a" {
		t.Fatalf("sourceTenantId = %q, want tenant-a", sourceTenantId)
	}
	if len(snapshot.UserDepartments) != 1 || !snapshot.UserDepartments[0].IsMain {
		t.Fatalf("user departments = %+v, want one main membership", snapshot.UserDepartments)
	}
}

func TestFeishuOrganizationSyncServiceFetchFullSnapshotFallsBackToAppId(t *testing.T) {
	client := &fakeFeishuSnapshotClient{
		token:       &FeishuAccessToken{TenantAccessToken: "token"},
		departments: []FeishuDepartmentSnapshot{{Id: "od-1"}},
		users:       []FeishuUserSnapshot{{UserId: "ou_1", Departments: []string{"od-1"}}},
	}
	service := &FeishuOrganizationSyncService{}
	_, sourceTenantId, err := service.FetchFullSnapshot(context.Background(), &FeishuOrganizationSyncConfig{AppId: "cli_1"}, client)
	if err != nil {
		t.Fatalf("FetchFullSnapshot() error = %v", err)
	}
	if sourceTenantId != "cli_1" {
		t.Fatalf("sourceTenantId = %q, want cli_1", sourceTenantId)
	}
}

func TestFeishuOrganizationSyncServiceStartManualRunRejectsMissingSecret(t *testing.T) {
	service := &FeishuOrganizationSyncService{Store: &fakeFeishuRunStore{}}
	_, err := service.StartManualRunWithResult(&FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli_1",
		EndpointMode: "feishu",
		IsEnabled:    true,
	}, "alice")
	if err == nil {
		t.Fatalf("StartManualRunWithResult() expected error")
	}
}

func TestFeishuOrganizationSyncServiceStartManualRunRejectsActiveRunningRun(t *testing.T) {
	now := time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC)
	store := &fakeFeishuRunStore{running: &FeishuOrganizationSyncRun{LeaseExpiresAt: now.Add(time.Minute)}}
	service := &FeishuOrganizationSyncService{Store: store, Now: func() time.Time { return now }}
	_, err := service.StartManualRunWithResult(&FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli_1",
		AppSecret:    "secret",
		EndpointMode: "feishu",
		IsEnabled:    true,
	}, "alice")
	if !errors.Is(err, ErrFeishuOrganizationSyncRunAlreadyRunning) {
		t.Fatalf("err = %v, want ErrFeishuOrganizationSyncRunAlreadyRunning", err)
	}
}

func TestFeishuOrganizationSyncServiceApplyFullSnapshotProjectsAndSoftDisables(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC)
	service := &FeishuOrganizationSyncService{Now: func() time.Time { return now }}
	config := &FeishuOrganizationSyncConfig{
		Organization:           "engineering",
		AppId:                  "cli_1",
		AppSecret:              "secret",
		EndpointMode:           FeishuEndpointModeDomestic,
		IsEnabled:              true,
		SoftDisableMissingData: true,
	}
	run := &FeishuOrganizationSyncRun{Owner: "engineering", Name: "run-1", Organization: "engineering", AppId: "cli_1"}
	snapshot := &FeishuOrganizationFullSnapshot{
		Departments: []FeishuDepartmentSnapshot{
			{Id: "od-root", ParentId: "0", Name: "总部"},
			{Id: "od-rd", ParentId: "od-root", Name: "研发"},
		},
		Users: []FeishuUserSnapshot{{
			UserId:           "ou_1",
			OpenId:           "open_1",
			UnionId:          "union_1",
			TenantKey:        "tenant-a",
			Name:             "Alice",
			Email:            "alice@example.test",
			Departments:      []string{"od-rd"},
			MainDepartmentId: "od-rd",
		}},
		UserDepartments: []FeishuUserDepartmentSnapshot{{FeishuUserId: "ou_1", DepartmentId: "od-rd", IsMain: true}},
	}

	stats, err := service.ApplyFullSnapshot(config, run, snapshot, "tenant-a")
	if err != nil {
		t.Fatalf("ApplyFullSnapshot() error = %v", err)
	}
	if stats.DepartmentCreatedCount != 2 || stats.UserCreatedCount != 1 || stats.MembershipUpdatedCount != 1 {
		t.Fatalf("stats = %+v, want created departments/users and one membership", stats)
	}

	childGroupName := GetFeishuDepartmentGroupName("tenant-a", "od-rd")
	childGroup, err := getGroup("engineering", childGroupName)
	if err != nil || childGroup == nil {
		t.Fatalf("child group = %+v err=%v, want created", childGroup, err)
	}
	if !childGroup.IsEnabled || childGroup.ParentId != GetFeishuDepartmentGroupName("tenant-a", "od-root") {
		t.Fatalf("child group = %+v, want enabled with parent", childGroup)
	}
	user, err := GetUserByField("engineering", "Lark", "ou_1")
	if err != nil || user == nil {
		t.Fatalf("user = %+v err=%v, want created by Lark user_id", user, err)
	}
	if user.Properties[FeishuUserPropertyOpenId] != "open_1" || user.Properties[FeishuUserPropertyTenantKey] != "tenant-a" {
		t.Fatalf("user properties = %+v, want Lark identifiers preserved", user.Properties)
	}
	if len(user.Groups) != 1 || user.Groups[0] != childGroupName {
		t.Fatalf("user groups = %+v, want feishu child department only", user.Groups)
	}
	sourceConnectionId := GetSourceConnectionId("engineering", SourceTypeLark, "tenant-a")
	assertFeishuProjectionCounts(t, sourceConnectionId, 2, 1, 1, 3)

	updateRun := &FeishuOrganizationSyncRun{Owner: "engineering", Name: "run-2", Organization: "engineering", AppId: "cli_1"}
	snapshot.Users[0].Name = "Alice Updated"
	updateStats, err := service.ApplyFullSnapshot(config, updateRun, snapshot, "tenant-a")
	if err != nil {
		t.Fatalf("ApplyFullSnapshot() update run error = %v", err)
	}
	if updateStats.DepartmentUpdatedCount != 2 || updateStats.UserUpdatedCount != 1 || updateStats.MembershipUpdatedCount != 1 {
		t.Fatalf("update stats = %+v, want updated departments/users/membership", updateStats)
	}
	updatedUser, err := GetUserByField("engineering", "Lark", "ou_1")
	if err != nil || updatedUser == nil || updatedUser.DisplayName != "Alice Updated" {
		t.Fatalf("updated user = %+v err=%v, want display name refreshed", updatedUser, err)
	}

	nextRun := &FeishuOrganizationSyncRun{Owner: "engineering", Name: "run-3", Organization: "engineering", AppId: "cli_1"}
	nextSnapshot := &FeishuOrganizationFullSnapshot{
		Departments: []FeishuDepartmentSnapshot{{Id: "od-root", ParentId: "0", Name: "总部"}},
	}
	nextStats, err := service.ApplyFullSnapshot(config, nextRun, nextSnapshot, "tenant-a")
	if err != nil {
		t.Fatalf("ApplyFullSnapshot() second run error = %v", err)
	}
	if nextStats.DepartmentDisabledCount != 1 || nextStats.UserDisabledCount != 1 || nextStats.MembershipUpdatedCount != 1 {
		t.Fatalf("second stats = %+v, want one disabled department/user/membership", nextStats)
	}
	disabledGroup, err := getGroup("engineering", childGroupName)
	if err != nil || disabledGroup == nil || disabledGroup.IsEnabled {
		t.Fatalf("disabled group = %+v err=%v, want disabled", disabledGroup, err)
	}
	disabledUser, err := GetUserByField("engineering", "Lark", "ou_1")
	if err != nil || disabledUser == nil || !disabledUser.IsForbidden || len(disabledUser.Groups) != 0 {
		t.Fatalf("disabled user = %+v err=%v, want forbidden with feishu group removed", disabledUser, err)
	}
	platformUser := &PlatformUser{}
	existed, err := ormer.Engine.Where("organization_id = ?", "engineering").And("user_name = ?", user.Name).Get(platformUser)
	if err != nil || !existed {
		t.Fatalf("platform user existed=%v err=%v", existed, err)
	}
	if platformUser.LifecycleStatus != PlatformLifecycleStatusDisabled || platformUser.MappingStatus != PlatformMappingStatusDisabled {
		t.Fatalf("platform user = %+v, want disabled lifecycle and mapping", platformUser)
	}
	platformMembership := &PlatformMembership{}
	existed, err = ormer.Engine.Where("organization_id = ?", "engineering").And("admin_subject = ?", getWecomLocalId(user.Owner, user.Name)).Get(platformMembership)
	if err != nil || !existed {
		t.Fatalf("platform membership existed=%v err=%v", existed, err)
	}
	if platformMembership.SourceConnectionId != sourceConnectionId || platformMembership.LifecycleStatus != PlatformLifecycleStatusDisabled || platformMembership.IsMain {
		t.Fatalf("platform membership = %+v, want disabled on same source connection with non-main", platformMembership)
	}
}

func TestFeishuOrganizationSyncServiceFinishRunSucceededProjectsBatch(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC)
	runStore := &fakeFeishuRunStore{}
	configStore := &fakeFeishuConfigLastSyncStore{}
	service := &FeishuOrganizationSyncService{
		Store:       runStore,
		ConfigStore: configStore,
		Now:         func() time.Time { return now },
	}
	config := &FeishuOrganizationSyncConfig{Organization: "engineering", AppId: "cli_1"}
	run := &FeishuOrganizationSyncRun{
		Owner:        "engineering",
		Name:         "run-success",
		Organization: "engineering",
		AppId:        "cli_1",
		TenantKey:    "tenant-a",
		Status:       FeishuOrganizationSyncRunStatusRunning,
		StartedAt:    now.Add(-time.Minute),
	}

	if err := service.FinishRunSucceeded(config, run); err != nil {
		t.Fatalf("FinishRunSucceeded() error = %v", err)
	}
	if runStore.updated == nil || runStore.updated.Status != FeishuOrganizationSyncRunStatusSucceeded {
		t.Fatalf("updated run = %+v, want succeeded", runStore.updated)
	}
	if configStore.run == nil || configStore.run.Name != "run-success" || !configStore.at.Equal(now) {
		t.Fatalf("last sync store = %+v at=%v, want run-success at now", configStore.run, configStore.at)
	}
	batch := &OrgSyncBatch{}
	existed, err := ormer.Engine.Where("organization_id = ?", "engineering").And("batch_id = ?", "run-success").Get(batch)
	if err != nil || !existed {
		t.Fatalf("org sync batch existed=%v err=%v", existed, err)
	}
	if batch.Status != OrgSyncBatchStatusSucceeded || batch.Freshness != PlatformFreshnessFresh {
		t.Fatalf("batch = %+v, want succeeded/fresh", batch)
	}
}

func TestFeishuOrganizationSyncServiceUpsertUserReusesExistingMapping(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 13, 0, 0, 0, time.UTC)
	service := &FeishuOrganizationSyncService{Now: func() time.Time { return now }}
	config := &FeishuOrganizationSyncConfig{Organization: "engineering", AppId: "cli-a", TenantKey: "tenant-a", EndpointMode: FeishuEndpointModeDomestic}
	run := &FeishuOrganizationSyncRun{Name: "run-user-reuse"}
	existingUser := &User{Owner: "engineering", Name: "existing-feishu-user", Type: "normal-user", DisplayName: "Old Name"}
	if err := saveFeishuUser(existingUser); err != nil {
		t.Fatalf("save existing user error = %v", err)
	}
	if err := saveFeishuUserMapping(&FeishuUserMapping{
		Owner:        "engineering",
		Name:         "existing-map",
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		FeishuUserId: "ou-existing",
		UserOwner:    existingUser.Owner,
		UserName:     existingUser.Name,
		IsEnabled:    false,
	}); err != nil {
		t.Fatalf("save existing mapping error = %v", err)
	}

	created, err := service.upsertUser(config, run, "tenant-a", FeishuUserSnapshot{
		UserId:  "ou-existing",
		OpenId:  "open-existing",
		UnionId: "union-existing",
		Name:    "New Name",
		Title:   "Dev",
		Email:   "new@example.com",
		Mobile:  "13800138000",
		Avatar:  "https://avatar.example.com/u.png",
		Status:  "active",
	})
	if err != nil {
		t.Fatalf("upsertUser() error = %v", err)
	}
	if created {
		t.Fatalf("upsertUser() created = true, want false")
	}
	user, err := getUser(existingUser.Owner, existingUser.Name)
	if err != nil || user == nil {
		t.Fatalf("get reused user user=%v err=%v", user, err)
	}
	if user.DisplayName != "New Name" || user.Email != "new@example.com" || user.Phone != "13800138000" || user.Avatar == "" || user.Lark != "ou-existing" || user.IsForbidden {
		t.Fatalf("reused user not refreshed: display=%q email=%q phone=%q avatar=%q lark=%q forbidden=%v", user.DisplayName, user.Email, user.Phone, user.Avatar, user.Lark, user.IsForbidden)
	}
	mapping, err := getFeishuUserMapping("engineering", "cli-a", "ou-existing")
	if err != nil || mapping == nil {
		t.Fatalf("get refreshed mapping mapping=%v err=%v", mapping, err)
	}
	if !mapping.IsEnabled || mapping.LastSeenRunId != run.Name || mapping.UserName != existingUser.Name {
		t.Fatalf("mapping not re-enabled/refreshed: enabled=%v run=%q user=%q", mapping.IsEnabled, mapping.LastSeenRunId, mapping.UserName)
	}
	assertFeishuProjectionCounts(t, GetSourceConnectionId("engineering", SourceTypeLark, "tenant-a"), 0, 1, 0, 1)
}

func TestFeishuOrganizationSyncServiceSkipsInvalidOrUnmappedInputs(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 13, 30, 0, 0, time.UTC)
	service := &FeishuOrganizationSyncService{Now: func() time.Time { return now }}
	config := &FeishuOrganizationSyncConfig{Organization: "engineering", AppId: "cli-a", TenantKey: "tenant-a", EndpointMode: FeishuEndpointModeDomestic}
	run := &FeishuOrganizationSyncRun{Name: "run-skip-inputs"}

	created, err := service.upsertUser(config, run, "tenant-a", FeishuUserSnapshot{})
	if err != nil || created {
		t.Fatalf("empty upsertUser() created=%v err=%v, want false nil", created, err)
	}
	updated, err := service.upsertMembership(config, run, "tenant-a", FeishuUserDepartmentSnapshot{})
	if err != nil || updated {
		t.Fatalf("empty upsertMembership() updated=%v err=%v, want false nil", updated, err)
	}
	updated, err = service.upsertMembership(config, run, "tenant-a", FeishuUserDepartmentSnapshot{FeishuUserId: "missing-user", DepartmentId: "missing-dept"})
	if err != nil || updated {
		t.Fatalf("unmapped upsertMembership() updated=%v err=%v, want false nil", updated, err)
	}
	if err := saveFeishuUserMapping(&FeishuUserMapping{
		Owner:        "engineering",
		Name:         "seen-user-map",
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		FeishuUserId: "seen-user",
		UserOwner:    "engineering",
		UserName:     "seen-user",
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("save seen user mapping error = %v", err)
	}
	updated, err = service.upsertMembership(config, run, "tenant-a", FeishuUserDepartmentSnapshot{FeishuUserId: "seen-user", DepartmentId: "missing-dept"})
	if err != nil || updated {
		t.Fatalf("missing department upsertMembership() updated=%v err=%v, want false nil", updated, err)
	}
	if err := saveFeishuDepartmentMapping(&FeishuDepartmentMapping{
		Owner:        "engineering",
		Name:         "seen-dept-map",
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		DepartmentId: "seen-dept",
		GroupOwner:   "engineering",
		GroupName:    GetFeishuDepartmentGroupName("tenant-a", "seen-dept"),
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("save seen department mapping error = %v", err)
	}
	updated, err = service.upsertMembership(config, run, "tenant-a", FeishuUserDepartmentSnapshot{FeishuUserId: "seen-user", DepartmentId: "seen-dept"})
	if err != nil || !updated {
		t.Fatalf("mapped upsertMembership without local user updated=%v err=%v, want true nil", updated, err)
	}
	if err := saveFeishuDepartmentMapping(&FeishuDepartmentMapping{
		Owner:        "engineering",
		Name:         "disabled-dept-map",
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		DepartmentId: "disabled-dept",
		GroupOwner:   "engineering",
		GroupName:    GetFeishuDepartmentGroupName("tenant-a", "disabled-dept"),
		IsEnabled:    false,
	}); err != nil {
		t.Fatalf("save disabled department mapping error = %v", err)
	}
	if err := saveFeishuUserMapping(&FeishuUserMapping{
		Owner:        "engineering",
		Name:         "disabled-user-map",
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		FeishuUserId: "disabled-user",
		UserOwner:    "engineering",
		UserName:     "disabled-user",
		IsEnabled:    false,
	}); err != nil {
		t.Fatalf("save disabled user mapping error = %v", err)
	}
	if err := saveFeishuUserDepartment(&FeishuUserDepartment{
		Owner:        "engineering",
		Name:         "disabled-membership",
		Organization: "engineering",
		AppId:        "cli-a",
		FeishuUserId: "disabled-user",
		DepartmentId: "disabled-dept",
		UserOwner:    "engineering",
		UserName:     "disabled-user",
		GroupOwner:   "engineering",
		GroupName:    GetFeishuDepartmentGroupName("tenant-a", "disabled-dept"),
		IsEnabled:    false,
	}); err != nil {
		t.Fatalf("save disabled membership error = %v", err)
	}

	deptDisabled, userDisabled, membershipDisabled, err := service.softDisableMissingData(config, run, &FeishuOrganizationFullSnapshot{
		Departments: []FeishuDepartmentSnapshot{{Id: "seen-dept"}},
		Users:       []FeishuUserSnapshot{{UserId: "seen-user"}},
		UserDepartments: []FeishuUserDepartmentSnapshot{{
			FeishuUserId: "seen-user",
			DepartmentId: "seen-dept",
		}},
	}, "tenant-a")
	if err != nil {
		t.Fatalf("softDisableMissingData() error = %v", err)
	}
	if deptDisabled != 0 || userDisabled != 0 || membershipDisabled != 0 {
		t.Fatalf("softDisableMissingData() disabled=(%d,%d,%d), want all zero", deptDisabled, userDisabled, membershipDisabled)
	}
	assertFeishuProjectionCounts(t, GetSourceConnectionId("engineering", SourceTypeLark, "tenant-a"), 0, 0, 1, 0)
}

func TestProjectFeishuPlatformUserGuardsAndDisabledLifecycle(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 14, 0, 0, 0, time.UTC)
	if err := projectFeishuPlatformUser("engineering", "tenant-a", "run-nil", nil, &User{}, now); err != nil {
		t.Fatalf("projectFeishuPlatformUser(nil mapping) error = %v", err)
	}
	if err := projectFeishuPlatformUser("engineering", "tenant-a", "run-nil", &FeishuUserMapping{}, nil, now); err != nil {
		t.Fatalf("projectFeishuPlatformUser(nil user) error = %v", err)
	}
	if err := projectFeishuPlatformUserFromMapping("engineering", "tenant-a", "run-nil", nil, now); err != nil {
		t.Fatalf("projectFeishuPlatformUserFromMapping(nil) error = %v", err)
	}
	if err := saveFeishuPlatformUserAndIdentity("engineering", "tenant-a", "run-empty", &FeishuUserMapping{}, "", "", true, now); err != nil {
		t.Fatalf("saveFeishuPlatformUserAndIdentity(empty subject) error = %v", err)
	}

	mapping := &FeishuUserMapping{
		Owner:        "engineering",
		Name:         "disabled-map",
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		FeishuUserId: "ou-disabled",
		UserOwner:    "engineering",
		UserName:     "disabled-user",
		IsEnabled:    false,
	}
	if err := projectFeishuPlatformUserFromMapping("engineering", "tenant-a", "run-disabled", mapping, now); err != nil {
		t.Fatalf("projectFeishuPlatformUserFromMapping(disabled) error = %v", err)
	}
	sourceConnectionId := GetSourceConnectionId("engineering", SourceTypeLark, "tenant-a")
	identity := &ExternalIdentity{}
	existed, err := ormer.Engine.Where("source_connection_id = ?", sourceConnectionId).And("external_subject_id = ?", "ou-disabled").Get(identity)
	if err != nil || !existed {
		t.Fatalf("disabled external identity existed=%v err=%v", existed, err)
	}
	if identity.MappingStatus != PlatformMappingStatusDisabled {
		t.Fatalf("disabled identity mapping status=%q, want %q", identity.MappingStatus, PlatformMappingStatusDisabled)
	}
	platformUser := &PlatformUser{}
	existed, err = ormer.Engine.Where("organization_id = ?", "engineering").And("admin_subject = ?", getWecomLocalId("engineering", "disabled-user")).Get(platformUser)
	if err != nil || !existed {
		t.Fatalf("disabled platform user existed=%v err=%v", existed, err)
	}
	if platformUser.LifecycleStatus != PlatformLifecycleStatusDisabled || platformUser.MappingStatus != PlatformMappingStatusDisabled {
		t.Fatalf("disabled platform user lifecycle=%q mapping=%q", platformUser.LifecycleStatus, platformUser.MappingStatus)
	}
}

func TestFeishuOrganizationSyncServiceSoftDisableFailsClosedOnStoreReadErrors(t *testing.T) {
	tests := []struct {
		name      string
		dropModel interface{}
	}{
		{name: "departments", dropModel: new(FeishuDepartmentMapping)},
		{name: "users", dropModel: new(FeishuUserMapping)},
		{name: "memberships", dropModel: new(FeishuUserDepartment)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setupFeishuOrganizationSyncSqlite(t)
			service := &FeishuOrganizationSyncService{Now: func() time.Time { return time.Date(2026, 6, 15, 14, 30, 0, 0, time.UTC) }}
			config := &FeishuOrganizationSyncConfig{Organization: "engineering", AppId: "cli-a", TenantKey: "tenant-a", EndpointMode: FeishuEndpointModeDomestic}
			run := &FeishuOrganizationSyncRun{Name: "run-store-read-error"}
			if err := ormer.Engine.DropTables(tt.dropModel); err != nil {
				t.Fatalf("drop table %s error = %v", tt.name, err)
			}

			deptDisabled, userDisabled, membershipDisabled, err := service.softDisableMissingData(config, run, &FeishuOrganizationFullSnapshot{}, "tenant-a")
			if err == nil {
				t.Fatalf("softDisableMissingData() error = nil, want store read error")
			}
			if deptDisabled != 0 || userDisabled != 0 || membershipDisabled != 0 {
				t.Fatalf("softDisableMissingData() disabled=(%d,%d,%d), want all zero on read error", deptDisabled, userDisabled, membershipDisabled)
			}
		})
	}
}

func TestFeishuOrganizationSyncServiceSoftDisableFailsClosedOnProjectionError(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	service := &FeishuOrganizationSyncService{Now: func() time.Time { return time.Date(2026, 6, 15, 14, 45, 0, 0, time.UTC) }}
	config := &FeishuOrganizationSyncConfig{Organization: "engineering", AppId: "cli-a", TenantKey: "tenant-a", EndpointMode: FeishuEndpointModeDomestic}
	run := &FeishuOrganizationSyncRun{Name: "run-projection-error"}
	if err := saveFeishuDepartmentMapping(&FeishuDepartmentMapping{
		Owner:        "engineering",
		Name:         "missing-dept-map",
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		DepartmentId: "missing-dept",
		GroupOwner:   "engineering",
		GroupName:    GetFeishuDepartmentGroupName("tenant-a", "missing-dept"),
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("save department mapping error = %v", err)
	}
	if err := ormer.Engine.DropTables(new(PlatformDepartment)); err != nil {
		t.Fatalf("drop platform department table error = %v", err)
	}

	deptDisabled, userDisabled, membershipDisabled, err := service.softDisableMissingData(config, run, &FeishuOrganizationFullSnapshot{}, "tenant-a")
	if err == nil {
		t.Fatalf("softDisableMissingData() error = nil, want projection error")
	}
	if deptDisabled != 0 || userDisabled != 0 || membershipDisabled != 0 {
		t.Fatalf("softDisableMissingData() disabled=(%d,%d,%d), want all zero before failed projection", deptDisabled, userDisabled, membershipDisabled)
	}
}

func TestFeishuOrganizationSyncServiceSoftDisableFailsClosedOnMembershipProjectionError(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	service := &FeishuOrganizationSyncService{Now: func() time.Time { return time.Date(2026, 6, 15, 15, 0, 0, 0, time.UTC) }}
	config := &FeishuOrganizationSyncConfig{Organization: "engineering", AppId: "cli-a", TenantKey: "tenant-a", EndpointMode: FeishuEndpointModeDomestic}
	run := &FeishuOrganizationSyncRun{Name: "run-membership-projection-error"}
	if err := saveFeishuUserDepartment(&FeishuUserDepartment{
		Owner:        "engineering",
		Name:         "missing-membership",
		Organization: "engineering",
		AppId:        "cli-a",
		FeishuUserId: "missing-user",
		DepartmentId: "missing-dept",
		UserOwner:    "engineering",
		UserName:     "missing-user",
		GroupOwner:   "engineering",
		GroupName:    GetFeishuDepartmentGroupName("tenant-a", "missing-dept"),
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("save membership error = %v", err)
	}
	if err := ormer.Engine.DropTables(new(PlatformMembership)); err != nil {
		t.Fatalf("drop platform membership table error = %v", err)
	}

	deptDisabled, userDisabled, membershipDisabled, err := service.softDisableMissingData(config, run, &FeishuOrganizationFullSnapshot{}, "tenant-a")
	if err == nil {
		t.Fatalf("softDisableMissingData() error = nil, want membership projection error")
	}
	if deptDisabled != 0 || userDisabled != 0 || membershipDisabled != 0 {
		t.Fatalf("softDisableMissingData() disabled=(%d,%d,%d), want all zero before failed membership projection", deptDisabled, userDisabled, membershipDisabled)
	}
}

func TestFeishuOrganizationSyncServiceApplyFullSnapshotReturnsDiagnosticStageErrors(t *testing.T) {
	tests := []struct {
		name          string
		breakStore    func(t *testing.T)
		snapshot      *FeishuOrganizationFullSnapshot
		wantErrorCode string
	}{
		{
			name: "upsert user",
			breakStore: func(t *testing.T) {
				if err := ormer.Engine.DropTables(new(FeishuUserMapping)); err != nil {
					t.Fatalf("drop user mapping table error = %v", err)
				}
			},
			snapshot: &FeishuOrganizationFullSnapshot{
				Users: []FeishuUserSnapshot{{UserId: "ou_1", Name: "Alice"}},
			},
			wantErrorCode: "upsert_user_failed",
		},
		{
			name: "projection",
			breakStore: func(t *testing.T) {
				if err := ormer.Engine.DropTables(new(SourceConnection)); err != nil {
					t.Fatalf("drop source connection table error = %v", err)
				}
			},
			snapshot:      &FeishuOrganizationFullSnapshot{},
			wantErrorCode: "projection_failed",
		},
		{
			name: "soft disable",
			breakStore: func(t *testing.T) {
				if err := ormer.Engine.DropTables(new(FeishuDepartmentMapping)); err != nil {
					t.Fatalf("drop department mapping table error = %v", err)
				}
			},
			snapshot:      &FeishuOrganizationFullSnapshot{},
			wantErrorCode: "soft_disable_failed",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setupFeishuOrganizationSyncSqlite(t)
			service := &FeishuOrganizationSyncService{Now: func() time.Time { return time.Date(2026, 6, 15, 16, 30, 0, 0, time.UTC) }}
			config := &FeishuOrganizationSyncConfig{
				Organization:           "engineering",
				AppId:                  "cli_1",
				AppSecret:              "secret",
				EndpointMode:           FeishuEndpointModeDomestic,
				IsEnabled:              true,
				SoftDisableMissingData: true,
			}
			run := &FeishuOrganizationSyncRun{Owner: "engineering", Name: "run-apply-diagnostic", Organization: "engineering", AppId: "cli_1"}
			tt.breakStore(t)

			_, err := service.ApplyFullSnapshot(config, run, tt.snapshot, "tenant-a")
			if err == nil {
				t.Fatalf("ApplyFullSnapshot() error = nil, want %s", tt.wantErrorCode)
			}
			if got := feishuSyncErrorCodeFromError(err, ""); got != tt.wantErrorCode {
				t.Fatalf("diagnostic error code = %q, want %q", got, tt.wantErrorCode)
			}
		})
	}
}

func TestFeishuOrganizationSyncServiceExecuteRunSuccessUpdatesStagesAndStats(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC)
	runStore := &fakeFeishuRunStore{}
	configStore := &fakeFeishuConfigLastSyncStore{}
	service := &FeishuOrganizationSyncService{
		Store:       runStore,
		ConfigStore: configStore,
		Now:         func() time.Time { return now },
		NewSnapshotClient: func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient {
			return &fakeFeishuSnapshotClient{
				token:       &FeishuAccessToken{TenantAccessToken: "token"},
				departments: []FeishuDepartmentSnapshot{{Id: "od-root", ParentId: "0", Name: "总部"}},
				users: []FeishuUserSnapshot{{
					UserId:           "ou_1",
					TenantKey:        "tenant-a",
					Name:             "Alice",
					Departments:      []string{"od-root"},
					MainDepartmentId: "od-root",
				}},
			}
		},
	}
	config := &FeishuOrganizationSyncConfig{
		Organization:           "engineering",
		AppId:                  "cli_1",
		AppSecret:              "secret",
		EndpointMode:           FeishuEndpointModeDomestic,
		IsEnabled:              true,
		SoftDisableMissingData: true,
	}
	run := &FeishuOrganizationSyncRun{Owner: "engineering", Name: "run-execute", Organization: "engineering", AppId: "cli_1"}

	if err := service.ExecuteRun(context.Background(), config, run); err != nil {
		t.Fatalf("ExecuteRun() error = %v", err)
	}
	if run.Status != FeishuOrganizationSyncRunStatusSucceeded || run.Stage != FeishuOrganizationSyncRunStageFinalizing {
		t.Fatalf("run status/stage = %s/%s, want succeeded/finalizing", run.Status, run.Stage)
	}
	if run.DepartmentFetchedCount != 1 || run.UserFetchedCount != 1 || run.DepartmentCreatedCount != 1 || run.UserCreatedCount != 1 || run.MembershipUpdatedCount != 1 {
		t.Fatalf("run counts = %+v, want fetched and applied counts", run)
	}
	if runStore.updated == nil || runStore.updated.Status != FeishuOrganizationSyncRunStatusSucceeded {
		t.Fatalf("updated run = %+v, want final succeeded update", runStore.updated)
	}
	if configStore.run == nil || configStore.run.Name != "run-execute" {
		t.Fatalf("config store run = %+v, want run-execute", configStore.run)
	}
}

func TestFeishuOrganizationSyncServiceExecuteRunFailureRedactsSecretAndProjectsBatch(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC)
	runStore := &fakeFeishuRunStore{}
	service := &FeishuOrganizationSyncService{
		Store: runStore,
		Now:   func() time.Time { return now },
		NewSnapshotClient: func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient {
			return &fakeFeishuSnapshotClient{err: errors.New("token failed with secret=real-secret")}
		},
	}
	config := &FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli_1",
		AppSecret:    "real-secret",
		EndpointMode: FeishuEndpointModeDomestic,
		IsEnabled:    true,
	}
	run := &FeishuOrganizationSyncRun{Owner: "engineering", Name: "run-failed", Organization: "engineering", AppId: "cli_1"}

	if err := service.ExecuteRun(context.Background(), config, run); err == nil {
		t.Fatalf("ExecuteRun() expected fetch error")
	}
	if run.Status != FeishuOrganizationSyncRunStatusFailed || run.ErrorCode != "tenant_token_failed" {
		t.Fatalf("run = %+v, want failed tenant token fetch", run)
	}
	if strings.Contains(run.ErrorText, "real-secret") {
		t.Fatalf("run error leaked secret: %q", run.ErrorText)
	}
	batch := &OrgSyncBatch{}
	existed, err := ormer.Engine.Where("organization_id = ?", "engineering").And("batch_id = ?", "run-failed").Get(batch)
	if err != nil || !existed {
		t.Fatalf("failed batch existed=%v err=%v", existed, err)
	}
	if batch.Status != OrgSyncBatchStatusFailed || batch.Freshness != PlatformFreshnessUnavailable {
		t.Fatalf("failed batch = %+v, want failed/unavailable", batch)
	}
}

func TestFeishuOrganizationSyncServiceExecuteRunFailureWritesDiagnosticErrorCodes(t *testing.T) {
	tests := []struct {
		name          string
		client        *fakeFeishuSnapshotClient
		wantErrorCode string
		wantStage     string
	}{
		{
			name:          "tenant token",
			client:        &fakeFeishuSnapshotClient{tokenErr: errors.New("invalid app secret")},
			wantErrorCode: "tenant_token_failed",
			wantStage:     FeishuOrganizationSyncDiagnosticStageTenantToken,
		},
		{
			name: "user fetch",
			client: &fakeFeishuSnapshotClient{
				token:       &FeishuAccessToken{TenantAccessToken: "token"},
				departments: []FeishuDepartmentSnapshot{{Id: "od-root"}},
				userErr:     errors.New("missing contact scope"),
			},
			wantErrorCode: "user_fetch_failed",
			wantStage:     FeishuOrganizationSyncDiagnosticStageUserFetch,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setupFeishuOrganizationSyncSqlite(t)
			now := time.Date(2026, 6, 15, 16, 0, 0, 0, time.UTC)
			runStore := &fakeFeishuRunStore{}
			service := &FeishuOrganizationSyncService{
				Store: runStore,
				Now:   func() time.Time { return now },
				NewSnapshotClient: func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient {
					return tt.client
				},
			}
			config := &FeishuOrganizationSyncConfig{
				Organization: "engineering",
				AppId:        "cli_1",
				AppSecret:    "real-secret",
				EndpointMode: FeishuEndpointModeDomestic,
				IsEnabled:    true,
			}
			run := &FeishuOrganizationSyncRun{Owner: "engineering", Name: "run-diagnostic-failure", Organization: "engineering", AppId: "cli_1"}

			if err := service.ExecuteRun(context.Background(), config, run); err == nil {
				t.Fatalf("ExecuteRun() expected error")
			}
			if run.ErrorCode != tt.wantErrorCode {
				t.Fatalf("run error code = %q, want %q", run.ErrorCode, tt.wantErrorCode)
			}
			diagnostics := BuildFeishuOrganizationSyncRunDiagnostics(run, config.AppSecret)
			if diagnostics.FailedStage != tt.wantStage {
				t.Fatalf("diagnostics failed stage = %q, want %q", diagnostics.FailedStage, tt.wantStage)
			}
		})
	}
}

func TestFeishuOrganizationSyncServiceRunInspectionReturnsDiagnosticsAndSafeNotFound(t *testing.T) {
	run := &FeishuOrganizationSyncRun{
		Name:         "run-failed",
		Organization: "engineering",
		Status:       FeishuOrganizationSyncRunStatusFailed,
		Stage:        FeishuOrganizationSyncRunStageFetching,
		ErrorCode:    "contact_scope_missing",
		ErrorText:    "permission denied secret=real-secret user_id=ou_1",
	}
	store := &fakeFeishuRunStore{
		run:  run,
		runs: []*FeishuOrganizationSyncRun{run, {Name: "other-run", Organization: "other-org"}},
	}
	service := &FeishuOrganizationSyncService{Store: store}

	got, err := service.GetRun("engineering", "run-failed", "real-secret")
	if err != nil {
		t.Fatalf("GetRun() error = %v", err)
	}
	if got == nil || got.Diagnostics == nil {
		t.Fatalf("GetRun() = %+v, want diagnostics", got)
	}
	if got.Diagnostics.ReasonCode != FeishuOrganizationSyncReasonContactScopeMissing || got.Diagnostics.OperatorAction != FeishuOrganizationSyncOperatorGrantContactScope {
		t.Fatalf("diagnostics = %+v, want contact permission action", got.Diagnostics)
	}
	if strings.Contains(got.Diagnostics.SafeSummary, "real-secret") || strings.Contains(got.Diagnostics.SafeSummary, "ou_1") {
		t.Fatalf("diagnostics leaked sensitive values: %q", got.Diagnostics.SafeSummary)
	}

	runs, count, err := service.GetRuns("engineering", 0, 20, "", "", "", "", "real-secret")
	if err != nil {
		t.Fatalf("GetRuns() error = %v", err)
	}
	if count != 1 || len(runs) != 1 || runs[0].Diagnostics == nil {
		t.Fatalf("GetRuns() count=%d runs=%+v, want one run with diagnostics", count, runs)
	}

	missing, err := service.GetRun("engineering", "other-run", "real-secret")
	if err != nil {
		t.Fatalf("GetRun(other org) error = %v", err)
	}
	if missing != nil {
		t.Fatalf("GetRun(other org) = %+v, want safe nil not-found", missing)
	}
}

func setupFeishuOrganizationSyncSqlite(t *testing.T) {
	t.Helper()
	engine, err := xorm.NewEngine("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("new sqlite engine error = %v", err)
	}
	engine.DB().SetMaxOpenConns(1)
	if err := engine.Sync2(
		new(Organization),
		new(Group),
		new(User),
		new(Syncer),
		new(FeishuDepartmentMapping),
		new(FeishuUserMapping),
		new(FeishuUserDepartment),
		new(FeishuOrganizationSyncRun),
		new(SourceConnection),
		new(PlatformDepartment),
		new(PlatformUser),
		new(PlatformMembership),
		new(ExternalIdentity),
		new(OrgSyncBatch),
	); err != nil {
		t.Fatalf("sync sqlite tables error = %v", err)
	}
	oldOrmer := ormer
	oldUserEnforcer := userEnforcer
	ormer = &Ormer{Engine: engine}
	userEnforcer = NewUserGroupEnforcer(newTestUserGroupCasbinEnforcer(t))
	if _, err := ormer.Engine.Insert(&Organization{Owner: "admin", Name: "engineering"}); err != nil {
		t.Fatalf("insert test organization error = %v", err)
	}
	t.Cleanup(func() {
		userEnforcer = oldUserEnforcer
		ormer = oldOrmer
		_ = engine.Close()
	})
}

func newTestUserGroupCasbinEnforcer(t *testing.T) *casbin.Enforcer {
	t.Helper()
	m, err := model.NewModelFromString(`
[request_definition]
r = sub, obj, act
[policy_definition]
p = sub, obj, act
[role_definition]
g = _, _
[policy_effect]
e = some(where (p.eft == allow))
[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
`)
	if err != nil {
		t.Fatalf("new casbin model error = %v", err)
	}
	enforcer, err := casbin.NewEnforcer(m)
	if err != nil {
		t.Fatalf("new casbin enforcer error = %v", err)
	}
	return enforcer
}

func assertFeishuProjectionCounts(t *testing.T, sourceConnectionId string, departments int64, users int64, memberships int64, externalIdentities int64) {
	t.Helper()
	if count, err := ormer.Engine.Where("source_connection_id = ?", sourceConnectionId).Count(&PlatformDepartment{}); err != nil || count != departments {
		t.Fatalf("platform departments count=%d err=%v, want %d", count, err, departments)
	}
	if count, err := ormer.Engine.Where("organization_id = ?", "engineering").Count(&PlatformUser{}); err != nil || count != users {
		t.Fatalf("platform users count=%d err=%v, want %d", count, err, users)
	}
	if count, err := ormer.Engine.Where("source_connection_id = ?", sourceConnectionId).Count(&PlatformMembership{}); err != nil || count != memberships {
		t.Fatalf("platform memberships count=%d err=%v, want %d", count, err, memberships)
	}
	if count, err := ormer.Engine.Where("source_connection_id = ?", sourceConnectionId).Count(&ExternalIdentity{}); err != nil || count != externalIdentities {
		t.Fatalf("external identities count=%d err=%v, want %d", count, err, externalIdentities)
	}
}
