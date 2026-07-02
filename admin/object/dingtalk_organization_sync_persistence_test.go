// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"errors"
	"testing"
	"time"

	_ "modernc.org/sqlite"

	"github.com/xorm-io/xorm"
)

func setupDingTalkOrganizationSyncSqlite(t *testing.T) {
	t.Helper()
	engine, err := xorm.NewEngine("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("new sqlite engine error = %v", err)
	}
	engine.DB().SetMaxOpenConns(1)
	if err := engine.Sync2(
		new(DingTalkOrganizationSyncConfig),
		new(DingTalkOrganizationSyncRun),
		new(DingTalkDepartmentMapping),
		new(DingTalkUserMapping),
		new(DingTalkUserDepartment),
		new(DingTalkDepartmentLeader),
		new(DingTalkUserDirectLeader),
		new(WecomOrganizationSyncConfig),
		new(FeishuOrganizationSyncConfig),
		new(OrganizationSyncSchedule),
		new(OrganizationSyncScheduleFire),
	); err != nil {
		t.Fatalf("sync sqlite tables error = %v", err)
	}
	oldOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		ormer = oldOrmer
		_ = engine.Close()
	})
}

func TestDingTalkOrganizationSyncDefaultConfigStorePersistsAndUpdatesLastSync(t *testing.T) {
	setupDingTalkOrganizationSyncSqlite(t)
	store := defaultDingTalkOrganizationSyncConfigStore{}
	syncedAt := time.Date(2026, 7, 2, 11, 0, 0, 0, time.UTC)

	affected, err := store.SaveDingTalkOrganizationSyncConfig(&DingTalkOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         DingTalkOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppKey:       "ding-app",
		AppSecret:    "secret",
		IsEnabled:    true,
	})
	if err != nil || !affected {
		t.Fatalf("SaveDingTalkOrganizationSyncConfig(insert) = %v, %v; want affected nil", affected, err)
	}

	updated := &DingTalkOrganizationSyncConfig{
		Owner:        "ignored-owner",
		Name:         "ignored-name",
		Organization: "engineering",
		AppKey:       "ding-next",
		AppSecret:    "next-secret",
		IsEnabled:    false,
	}
	affected, err = store.SaveDingTalkOrganizationSyncConfig(updated)
	if err != nil || !affected {
		t.Fatalf("SaveDingTalkOrganizationSyncConfig(update) = %v, %v; want affected nil", affected, err)
	}

	config, err := store.GetDingTalkOrganizationSyncConfigByOrganization("engineering")
	if err != nil {
		t.Fatalf("GetDingTalkOrganizationSyncConfigByOrganization() error = %v", err)
	}
	if config == nil || config.Owner != "engineering" || config.Name != DingTalkOrganizationSyncDefaultConfigName || config.AppKey != "ding-next" || config.IsEnabled {
		t.Fatalf("stored config = %#v, want updated config with stable identity", config)
	}

	if err := store.UpdateDingTalkOrganizationSyncConfigLastSync(config, &DingTalkOrganizationSyncRun{
		Owner:        "engineering",
		Name:         "run-1",
		Organization: "engineering",
	}, syncedAt); err != nil {
		t.Fatalf("UpdateDingTalkOrganizationSyncConfigLastSync() error = %v", err)
	}
	config, err = store.GetDingTalkOrganizationSyncConfigByOrganization("engineering")
	if err != nil {
		t.Fatalf("Get after last sync error = %v", err)
	}
	if config.LastRunId != "run-1" || !config.LastSyncedAt.Equal(syncedAt) {
		t.Fatalf("last sync fields = %q/%v, want run-1/%v", config.LastRunId, config.LastSyncedAt, syncedAt)
	}

	configs, err := store.ListDingTalkOrganizationSyncConfigs()
	if err != nil || len(configs) != 1 {
		t.Fatalf("ListDingTalkOrganizationSyncConfigs() = %d, %v; want 1 nil", len(configs), err)
	}
}

func TestDingTalkOrganizationSyncDefaultRunStoreStartsRecoversAndQueriesRuns(t *testing.T) {
	setupDingTalkOrganizationSyncSqlite(t)
	now := time.Date(2026, 7, 2, 12, 0, 0, 0, time.UTC)
	if _, err := (defaultDingTalkOrganizationSyncConfigStore{}).SaveDingTalkOrganizationSyncConfig(&DingTalkOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         DingTalkOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppKey:       "ding-app",
		AppSecret:    "secret",
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("save config error = %v", err)
	}
	if err := (defaultDingTalkOrganizationSyncRunStore{}).CreateDingTalkOrganizationSyncRun(&DingTalkOrganizationSyncRun{
		Owner:          "engineering",
		Name:           "run-stale",
		Organization:   "engineering",
		AppKey:         "ding-app",
		Status:         DingTalkOrganizationSyncRunStatusRunning,
		Stage:          DingTalkOrganizationSyncRunStageFetching,
		StartedAt:      now.Add(-time.Hour),
		LeaseExpiresAt: now.Add(-time.Minute),
	}); err != nil {
		t.Fatalf("insert stale run error = %v", err)
	}

	service := &DingTalkOrganizationSyncService{
		WecomConfigStore:  &memoryWecomOrganizationSyncConfigStore{},
		FeishuConfigStore: &fakeFeishuConfigStore{},
		Now:               func() time.Time { return now },
		LeaseDuration:     15 * time.Minute,
	}
	result, err := service.StartScheduledRunWithResult(&DingTalkOrganizationSyncConfig{
		Organization: "engineering",
		AppKey:       "ignored-app",
		AppSecret:    "ignored-secret",
	}, "scheduler")
	if err != nil {
		t.Fatalf("StartScheduledRunWithResult() error = %v", err)
	}
	if result.StaleRun == nil || result.StaleRun.Name != "run-stale" || result.StaleRun.ErrorCode != DingTalkOrganizationSyncErrorCodeStaleRunning {
		t.Fatalf("stale run = %#v, want recovered stale run", result.StaleRun)
	}
	if result.Run == nil || result.Run.TriggerType != DingTalkOrganizationSyncTriggerScheduled || result.Run.Actor != "scheduler" || result.Config.AppKey != "ding-app" {
		t.Fatalf("new run result = %#v, config = %#v; want scheduled run from locked config", result.Run, result.Config)
	}

	active := &DingTalkOrganizationSyncRun{}
	existed, err := ormer.Engine.Where("organization = ?", "engineering").And("name = ?", "run-stale").Get(active)
	if err != nil || !existed {
		t.Fatalf("load stale run = existed:%v err:%v", existed, err)
	}
	if active.Status != DingTalkOrganizationSyncRunStatusFailed || active.ErrorCode != DingTalkOrganizationSyncErrorCodeStaleRunning {
		t.Fatalf("stale run persisted = %#v, want failed stale_running", active)
	}

	store := defaultDingTalkOrganizationSyncRunStore{}
	running, err := store.GetRunningDingTalkOrganizationSyncRun("engineering")
	if err != nil || running == nil || running.Name != result.Run.Name {
		t.Fatalf("GetRunningDingTalkOrganizationSyncRun() = %#v, %v; want new running run", running, err)
	}
	runs, err := store.GetDingTalkOrganizationSyncRuns("engineering", 0, 10, "triggerType", "scheduled", "startedAt", "ascend")
	if err != nil || len(runs) != 1 || runs[0].Name != result.Run.Name {
		t.Fatalf("GetDingTalkOrganizationSyncRuns() = %#v, %v; want filtered scheduled run", runs, err)
	}
	count, err := store.GetDingTalkOrganizationSyncRunCount("engineering", "triggerType", "scheduled")
	if err != nil || count != 1 {
		t.Fatalf("GetDingTalkOrganizationSyncRunCount() = %d, %v; want 1 nil", count, err)
	}
	result.Run.ErrorText = "provider failed with secret"
	if err := store.UpdateDingTalkOrganizationSyncRun(result.Run); err != nil {
		t.Fatalf("UpdateDingTalkOrganizationSyncRun() error = %v", err)
	}
	runs, total, err := (&DingTalkOrganizationSyncService{}).GetRuns("engineering", 0, 10, "triggerType", "scheduled", "startedAt", "ascend", "secret")
	if err != nil || total != 1 || len(runs) != 1 {
		t.Fatalf("GetRuns() = len:%d total:%d err:%v; want one run", len(runs), total, err)
	}
	if runs[0].ErrorText == result.Run.ErrorText || runs[0].ErrorText == "" {
		t.Fatalf("GetRuns() did not mask sensitive error text: %q", runs[0].ErrorText)
	}
	run, err := (&DingTalkOrganizationSyncService{}).GetRun("engineering", result.Run.Name, "secret")
	if err != nil || run == nil || run.ErrorText == result.Run.ErrorText {
		t.Fatalf("GetRun() = %#v, %v; want masked run", run, err)
	}
	if _, _, err := (&DingTalkOrganizationSyncService{}).GetRuns("", 0, 10, "", "", "", ""); err == nil {
		t.Fatalf("GetRuns(empty organization) error = nil, want validation error")
	}
	if _, err := (&DingTalkOrganizationSyncService{}).GetRun("engineering", "", "secret"); err == nil {
		t.Fatalf("GetRun(empty run id) error = nil, want validation error")
	}

	_, err = service.StartManualRunWithResult(&DingTalkOrganizationSyncConfig{
		Organization: "engineering",
		AppKey:       "ding-app",
		AppSecret:    "secret",
	}, "operator")
	if !errors.Is(err, ErrDingTalkOrganizationSyncRunAlreadyRunning) {
		t.Fatalf("StartManualRunWithResult(active) error = %v, want already running", err)
	}
}

func TestOrganizationSyncDefaultScheduleStorePersistsAndAcquiresFire(t *testing.T) {
	setupDingTalkOrganizationSyncSqlite(t)
	store := defaultOrganizationSyncScheduleStore{}
	now := time.Date(2026, 7, 2, 14, 0, 0, 0, time.UTC)
	windowStart := now.Truncate(5 * time.Minute)
	schedule := &OrganizationSyncSchedule{
		Provider:       string(OrganizationDirectorySourceDingTalk),
		JobType:        OrganizationSyncJobTypeFullDifferential,
		Organization:   "engineering",
		CronExpression: "*/5 * * * *",
		Timezone:       "Asia/Shanghai",
		IsEnabled:      true,
	}

	affected, err := store.SaveOrganizationSyncSchedule(schedule)
	if err != nil || !affected {
		t.Fatalf("SaveOrganizationSyncSchedule(insert) = %v, %v; want affected nil", affected, err)
	}
	if _, _, err := store.AcquireOrganizationSyncScheduleFire(nil, windowStart, "node-a", now, 5*time.Minute); err == nil {
		t.Fatalf("AcquireOrganizationSyncScheduleFire(nil) error = nil, want validation error")
	}
	loaded, err := store.GetOrganizationSyncSchedule(string(OrganizationDirectorySourceDingTalk), OrganizationSyncJobTypeFullDifferential, "engineering")
	if err != nil || loaded == nil || loaded.Name == "" {
		t.Fatalf("GetOrganizationSyncSchedule() = %#v, %v; want stored schedule", loaded, err)
	}
	enabled, err := store.GetEnabledOrganizationSyncSchedules()
	if err != nil || len(enabled) != 1 {
		t.Fatalf("GetEnabledOrganizationSyncSchedules() = %d, %v; want 1 nil", len(enabled), err)
	}

	fire, acquired, err := store.AcquireOrganizationSyncScheduleFire(loaded, windowStart, "node-a", now, 5*time.Minute)
	if err != nil || !acquired || fire == nil || fire.AttemptCount != 1 {
		t.Fatalf("AcquireOrganizationSyncScheduleFire(first) = %#v acquired:%v err:%v; want acquired fire", fire, acquired, err)
	}
	fire.RunId = "run-1"
	fire.Status = OrganizationSyncScheduleFireStatusDispatched
	fire.ErrorText = "safe dispatch summary"
	if err := store.UpdateOrganizationSyncScheduleFire(fire); err != nil {
		t.Fatalf("UpdateOrganizationSyncScheduleFire() error = %v", err)
	}
	if err := store.UpdateOrganizationSyncScheduleDispatchMetadata(loaded, fire); err != nil {
		t.Fatalf("UpdateOrganizationSyncScheduleDispatchMetadata() error = %v", err)
	}
	loaded, err = store.GetOrganizationSyncSchedule(string(OrganizationDirectorySourceDingTalk), OrganizationSyncJobTypeFullDifferential, "engineering")
	if err != nil || loaded.LastRunId != "run-1" || loaded.LastStatus != string(OrganizationSyncScheduleFireStatusDispatched) {
		t.Fatalf("schedule dispatch metadata = %#v, %v; want run-1 dispatched", loaded, err)
	}
}

func TestOrganizationSyncDefaultScheduleStoreUpdatesAndReacquiresStaleFire(t *testing.T) {
	setupDingTalkOrganizationSyncSqlite(t)
	store := defaultOrganizationSyncScheduleStore{}
	now := time.Date(2026, 7, 2, 14, 30, 0, 0, time.UTC)
	windowStart := now.Add(-5 * time.Minute).Truncate(time.Second)
	schedule := &OrganizationSyncSchedule{
		Provider:       string(OrganizationDirectorySourceDingTalk),
		JobType:        OrganizationSyncJobTypeFullDifferential,
		Organization:   "engineering",
		CronExpression: "*/5 * * * *",
		Timezone:       "UTC",
		IsEnabled:      true,
	}
	if affected, err := store.SaveOrganizationSyncSchedule(schedule); err != nil || !affected {
		t.Fatalf("SaveOrganizationSyncSchedule(insert) = %v, %v; want affected nil", affected, err)
	}
	loaded, err := store.GetOrganizationSyncSchedule(string(OrganizationDirectorySourceDingTalk), OrganizationSyncJobTypeFullDifferential, "engineering")
	if err != nil || loaded == nil {
		t.Fatalf("GetOrganizationSyncSchedule() = %#v, %v; want stored schedule", loaded, err)
	}
	fire, acquired, err := store.AcquireOrganizationSyncScheduleFire(loaded, windowStart, "node-a", now, time.Minute)
	if err != nil || !acquired || fire == nil {
		t.Fatalf("AcquireOrganizationSyncScheduleFire(first) = %#v acquired:%v err:%v; want acquired", fire, acquired, err)
	}
	fire.Status = OrganizationSyncScheduleFireStatusSkipped
	fire.RunId = "run-skipped"
	fire.ErrorCode = OrganizationSyncScheduleFireErrorAlreadyRunning
	fire.ErrorText = "already running"
	if err := store.UpdateOrganizationSyncScheduleFire(fire); err != nil {
		t.Fatalf("UpdateOrganizationSyncScheduleFire(skipped) error = %v", err)
	}
	if err := store.UpdateOrganizationSyncScheduleDispatchMetadata(loaded, fire); err != nil {
		t.Fatalf("UpdateOrganizationSyncScheduleDispatchMetadata() error = %v", err)
	}

	updated := *loaded
	updated.CronExpression = "0 3 * * *"
	updated.Timezone = "Asia/Shanghai"
	updated.IsEnabled = false
	if affected, err := store.SaveOrganizationSyncSchedule(&updated); err != nil || !affected {
		t.Fatalf("SaveOrganizationSyncSchedule(update) = %v, %v; want affected nil", affected, err)
	}
	loaded, err = store.GetOrganizationSyncSchedule(string(OrganizationDirectorySourceDingTalk), OrganizationSyncJobTypeFullDifferential, "engineering")
	if err != nil || loaded == nil {
		t.Fatalf("GetOrganizationSyncSchedule(after update) = %#v, %v; want stored schedule", loaded, err)
	}
	if loaded.CronExpression != "0 3 * * *" || loaded.Timezone != "Asia/Shanghai" || loaded.IsEnabled || loaded.LastRunId != "run-skipped" || loaded.LastErrorCode != OrganizationSyncScheduleFireErrorAlreadyRunning {
		t.Fatalf("updated schedule = %#v, want edited schedule preserving dispatch metadata", loaded)
	}

}

func TestOrganizationSyncProviderConfigDefaultWrappersPersistAndAttachSchedules(t *testing.T) {
	setupDingTalkOrganizationSyncSqlite(t)
	syncedAt := time.Date(2026, 7, 2, 15, 0, 0, 0, time.UTC)

	if affected, err := SaveWecomOrganizationSyncConfig(&WecomOrganizationSyncConfig{
		Owner:             "engineering",
		Name:              WecomOrganizationSyncDefaultConfigName,
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "wecom-secret",
		IsEnabled:         true,
	}); err != nil || !affected {
		t.Fatalf("SaveWecomOrganizationSyncConfig() = %v, %v; want affected nil", affected, err)
	}
	if affected, err := SaveWecomOrganizationSyncConfig(&WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww456",
		AddressBookSecret: "wecom-secret-next",
		IsEnabled:         false,
	}); err != nil || !affected {
		t.Fatalf("SaveWecomOrganizationSyncConfig(update) = %v, %v; want affected nil", affected, err)
	}
	wecomConfig, err := GetWecomOrganizationSyncConfigByOrganization("engineering")
	if err != nil || wecomConfig == nil || wecomConfig.CorpId != "ww456" {
		t.Fatalf("GetWecomOrganizationSyncConfigByOrganization() = %#v, %v; want saved config", wecomConfig, err)
	}
	if configs, err := (defaultWecomOrganizationSyncConfigStore{}).ListWecomOrganizationSyncConfigs(); err != nil || len(configs) != 1 {
		t.Fatalf("ListWecomOrganizationSyncConfigs() = %d, %v; want 1 nil", len(configs), err)
	}
	if err := (defaultWecomOrganizationSyncConfigStore{}).UpdateWecomOrganizationSyncConfigLastSync(wecomConfig, &WecomOrganizationSyncRun{Name: "wecom-run-1"}, syncedAt); err != nil {
		t.Fatalf("UpdateWecomOrganizationSyncConfigLastSync() error = %v", err)
	}
	AttachWecomOrganizationSyncScheduleFieldsForResponse(wecomConfig, nil)

	if affected, err := (defaultFeishuOrganizationSyncConfigStore{}).SaveFeishuOrganizationSyncConfig(&FeishuOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         FeishuOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppId:        "cli_123",
		AppSecret:    "feishu-secret",
		IsEnabled:    true,
	}); err != nil || !affected {
		t.Fatalf("SaveFeishuOrganizationSyncConfig() = %v, %v; want affected nil", affected, err)
	}
	if affected, err := (defaultFeishuOrganizationSyncConfigStore{}).SaveFeishuOrganizationSyncConfig(&FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli_456",
		AppSecret:    "feishu-secret-next",
		IsEnabled:    false,
	}); err != nil || !affected {
		t.Fatalf("SaveFeishuOrganizationSyncConfig(update) = %v, %v; want affected nil", affected, err)
	}
	feishuConfig, err := GetFeishuOrganizationSyncConfigByOrganization("engineering")
	if err != nil || feishuConfig == nil || feishuConfig.AppId != "cli_456" {
		t.Fatalf("GetFeishuOrganizationSyncConfigByOrganization() = %#v, %v; want saved config", feishuConfig, err)
	}
	if configs, err := (defaultFeishuOrganizationSyncConfigStore{}).ListFeishuOrganizationSyncConfigs(); err != nil || len(configs) != 1 {
		t.Fatalf("ListFeishuOrganizationSyncConfigs() = %d, %v; want 1 nil", len(configs), err)
	}
	if err := (defaultFeishuOrganizationSyncConfigStore{}).UpdateFeishuOrganizationSyncConfigLastSync(feishuConfig, &FeishuOrganizationSyncRun{Name: "feishu-run-1"}, syncedAt); err != nil {
		t.Fatalf("UpdateFeishuOrganizationSyncConfigLastSync() error = %v", err)
	}
	AttachFeishuOrganizationSyncScheduleFieldsForResponse(feishuConfig, nil)

	dingConfig, err := GetDingTalkOrganizationSyncConfigByOrganization("engineering")
	if err != nil {
		t.Fatalf("GetDingTalkOrganizationSyncConfigByOrganization(before save) error = %v", err)
	}
	if dingConfig != nil {
		t.Fatalf("DingTalk config before save = %#v, want nil", dingConfig)
	}
	AttachDingTalkOrganizationSyncScheduleFieldsForResponse(&DingTalkOrganizationSyncConfig{Organization: "engineering"}, nil)
}

func TestDingTalkOrganizationSyncDefaultObjectStoreUpsertsMappings(t *testing.T) {
	setupDingTalkOrganizationSyncSqlite(t)
	store := defaultDingTalkOrganizationObjectStore{}
	now := time.Date(2026, 7, 2, 13, 0, 0, 0, time.UTC)

	department := &DingTalkDepartmentMapping{
		Owner:        "engineering",
		Name:         "dept-2",
		Organization: "engineering",
		AppKey:       "ding-app",
		DepartmentId: "2",
		GroupOwner:   "engineering",
		GroupName:    "dingtalk-dept-ding-app-2",
		DisplayName:  "研发中心",
		IsEnabled:    true,
		LastSyncedAt: now,
	}
	if err := store.SaveDingTalkDepartmentMapping(department); err != nil {
		t.Fatalf("SaveDingTalkDepartmentMapping(insert) error = %v", err)
	}
	department.DisplayName = "研发平台"
	if err := store.SaveDingTalkDepartmentMapping(department); err != nil {
		t.Fatalf("SaveDingTalkDepartmentMapping(update) error = %v", err)
	}
	loadedDepartment, err := store.GetDingTalkDepartmentMapping("engineering", "ding-app", "2")
	if err != nil || loadedDepartment == nil || loadedDepartment.DisplayName != "研发平台" {
		t.Fatalf("GetDingTalkDepartmentMapping() = %#v, %v; want updated department", loadedDepartment, err)
	}

	user := &DingTalkUserMapping{
		Owner:          "engineering",
		Name:           "user-u1",
		Organization:   "engineering",
		AppKey:         "ding-app",
		DingTalkUserId: "u1",
		UserOwner:      "engineering",
		UserName:       "dingtalk-user-ding-app-u1",
		IsEnabled:      true,
		LastSyncedAt:   now,
	}
	if err := store.SaveDingTalkUserMapping(user); err != nil {
		t.Fatalf("SaveDingTalkUserMapping(insert) error = %v", err)
	}
	user.Status = "active"
	if err := store.SaveDingTalkUserMapping(user); err != nil {
		t.Fatalf("SaveDingTalkUserMapping(update) error = %v", err)
	}
	loadedUser, err := store.GetDingTalkUserMapping("engineering", "ding-app", "u1")
	if err != nil || loadedUser == nil || loadedUser.Status != "active" {
		t.Fatalf("GetDingTalkUserMapping() = %#v, %v; want updated user", loadedUser, err)
	}

	membership := &DingTalkUserDepartment{
		Owner:          "engineering",
		Name:           "membership-u1-2",
		Organization:   "engineering",
		AppKey:         "ding-app",
		DingTalkUserId: "u1",
		DepartmentId:   "2",
		UserOwner:      "engineering",
		UserName:       "dingtalk-user-ding-app-u1",
		GroupOwner:     "engineering",
		GroupName:      "dingtalk-dept-ding-app-2",
		IsEnabled:      true,
		LastSyncedAt:   now,
	}
	if err := store.SaveDingTalkUserDepartment(membership); err != nil {
		t.Fatalf("SaveDingTalkUserDepartment(insert) error = %v", err)
	}
	membership.IsMain = true
	if err := store.SaveDingTalkUserDepartment(membership); err != nil {
		t.Fatalf("SaveDingTalkUserDepartment(update) error = %v", err)
	}
	loadedMembership, err := store.GetDingTalkUserDepartment("engineering", "ding-app", "u1", "2")
	if err != nil || loadedMembership == nil || !loadedMembership.IsMain {
		t.Fatalf("GetDingTalkUserDepartment() = %#v, %v; want main membership", loadedMembership, err)
	}

	departmentLeader := &DingTalkDepartmentLeader{
		Owner:          "engineering",
		Name:           "department-leader-2-u1",
		Organization:   "engineering",
		AppKey:         "ding-app",
		DepartmentId:   "2",
		DingTalkUserId: "u1",
		GroupOwner:     "engineering",
		GroupName:      "dingtalk-dept-ding-app-2",
		IsEnabled:      true,
		LastSyncedAt:   now,
	}
	if err := store.SaveDingTalkDepartmentLeader(departmentLeader); err != nil {
		t.Fatalf("SaveDingTalkDepartmentLeader(insert) error = %v", err)
	}
	departmentLeader.IsPrimary = true
	if err := store.SaveDingTalkDepartmentLeader(departmentLeader); err != nil {
		t.Fatalf("SaveDingTalkDepartmentLeader(update) error = %v", err)
	}
	loadedDepartmentLeader, err := store.GetDingTalkDepartmentLeader("engineering", "ding-app", "2", "u1")
	if err != nil || loadedDepartmentLeader == nil || !loadedDepartmentLeader.IsPrimary {
		t.Fatalf("GetDingTalkDepartmentLeader() = %#v, %v; want primary leader", loadedDepartmentLeader, err)
	}

	directLeader := &DingTalkUserDirectLeader{
		Owner:                "engineering",
		Name:                 "direct-leader-u1-u2",
		Organization:         "engineering",
		AppKey:               "ding-app",
		DingTalkUserId:       "u1",
		LeaderDingTalkUserId: "u2",
		UserOwner:            "engineering",
		UserName:             "dingtalk-user-ding-app-u1",
		IsEnabled:            true,
		LastSyncedAt:         now,
	}
	if err := store.SaveDingTalkUserDirectLeader(directLeader); err != nil {
		t.Fatalf("SaveDingTalkUserDirectLeader(insert) error = %v", err)
	}
	directLeader.LeaderUserName = "dingtalk-user-ding-app-u2"
	if err := store.SaveDingTalkUserDirectLeader(directLeader); err != nil {
		t.Fatalf("SaveDingTalkUserDirectLeader(update) error = %v", err)
	}
	loadedDirectLeader, err := store.GetDingTalkUserDirectLeader("engineering", "ding-app", "u1", "u2")
	if err != nil || loadedDirectLeader == nil || loadedDirectLeader.LeaderUserName != "dingtalk-user-ding-app-u2" {
		t.Fatalf("GetDingTalkUserDirectLeader() = %#v, %v; want updated direct leader", loadedDirectLeader, err)
	}

	if departments, err := store.GetDingTalkDepartmentMappings("engineering", "ding-app"); err != nil || len(departments) != 1 {
		t.Fatalf("GetDingTalkDepartmentMappings() = %d, %v; want 1 nil", len(departments), err)
	}
	if users, err := store.GetDingTalkUserMappings("engineering", "ding-app"); err != nil || len(users) != 1 {
		t.Fatalf("GetDingTalkUserMappings() = %d, %v; want 1 nil", len(users), err)
	}
	if memberships, err := store.GetDingTalkUserDepartments("engineering", "ding-app"); err != nil || len(memberships) != 1 {
		t.Fatalf("GetDingTalkUserDepartments() = %d, %v; want 1 nil", len(memberships), err)
	}
	if leaders, err := store.GetDingTalkDepartmentLeaders("engineering", "ding-app"); err != nil || len(leaders) != 1 {
		t.Fatalf("GetDingTalkDepartmentLeaders() = %d, %v; want 1 nil", len(leaders), err)
	}
	if directLeaders, err := store.GetDingTalkUserDirectLeaders("engineering", "ding-app"); err != nil || len(directLeaders) != 1 {
		t.Fatalf("GetDingTalkUserDirectLeaders() = %d, %v; want 1 nil", len(directLeaders), err)
	}
}
