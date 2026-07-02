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

type memoryDingTalkOrganizationSyncConfigStore struct {
	config        *DingTalkOrganizationSyncConfig
	configs       []*DingTalkOrganizationSyncConfig
	saved         *DingTalkOrganizationSyncConfig
	lastSyncRun   *DingTalkOrganizationSyncRun
	lastSyncedAt  time.Time
	lastSyncError error
	err           error
}

func (s *memoryDingTalkOrganizationSyncConfigStore) GetDingTalkOrganizationSyncConfigByOrganization(organization string) (*DingTalkOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.config == nil || s.config.Organization != organization {
		for _, config := range s.configs {
			if config != nil && config.Organization == organization {
				copied := *config
				return &copied, nil
			}
		}
		return nil, nil
	}
	copied := *s.config
	return &copied, nil
}

func (s *memoryDingTalkOrganizationSyncConfigStore) SaveDingTalkOrganizationSyncConfig(config *DingTalkOrganizationSyncConfig) (bool, error) {
	copied := *config
	s.saved = &copied
	s.config = &copied
	return true, nil
}

func (s *memoryDingTalkOrganizationSyncConfigStore) ListDingTalkOrganizationSyncConfigs() ([]*DingTalkOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	configs := []*DingTalkOrganizationSyncConfig{}
	if s.config != nil {
		copied := *s.config
		configs = append(configs, &copied)
	}
	for _, config := range s.configs {
		if config == nil {
			continue
		}
		copied := *config
		configs = append(configs, &copied)
	}
	return configs, nil
}

func (s *memoryDingTalkOrganizationSyncConfigStore) UpdateDingTalkOrganizationSyncConfigLastSync(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun, syncedAt time.Time) error {
	if s.lastSyncError != nil {
		return s.lastSyncError
	}
	if config != nil {
		copied := *config
		s.config = &copied
	}
	if run != nil {
		copied := *run
		s.lastSyncRun = &copied
	}
	s.lastSyncedAt = syncedAt
	return nil
}

type dingtalkOrganizationSyncConfigStoreWithoutList struct{}

func (s *dingtalkOrganizationSyncConfigStoreWithoutList) GetDingTalkOrganizationSyncConfigByOrganization(organization string) (*DingTalkOrganizationSyncConfig, error) {
	return nil, nil
}

func (s *dingtalkOrganizationSyncConfigStoreWithoutList) SaveDingTalkOrganizationSyncConfig(config *DingTalkOrganizationSyncConfig) (bool, error) {
	return true, nil
}

type fakeDingTalkConnectionTester struct {
	result *DingTalkAddressBookConnectionTestResult
	err    error
	called bool
}

func (t *fakeDingTalkConnectionTester) TestConnection(ctx context.Context) (*DingTalkAddressBookConnectionTestResult, error) {
	t.called = true
	return t.result, t.err
}

func TestDingTalkOrganizationSyncConfigServiceSavePreservesMaskedSecretAndRunMetadata(t *testing.T) {
	lastSyncedAt := time.Date(2026, 7, 1, 10, 0, 0, 0, time.UTC)
	store := &memoryDingTalkOrganizationSyncConfigStore{
		config: &DingTalkOrganizationSyncConfig{
			Owner:        "engineering",
			Name:         DingTalkOrganizationSyncDefaultConfigName,
			Organization: "engineering",
			AppKey:       "old-app-key",
			AppSecret:    "real-secret",
			IsEnabled:    true,
			LastRunId:    "run-1",
			LastSyncedAt: lastSyncedAt,
		},
	}
	service := &DingTalkOrganizationSyncConfigService{
		Store:             store,
		WecomConfigStore:  &memoryWecomOrganizationSyncConfigStore{},
		FeishuConfigStore: &fakeFeishuConfigStore{},
	}

	config, affected, err := service.SaveConfig(&DingTalkOrganizationSyncConfig{
		Organization:           " engineering ",
		AppKey:                 " new-app-key ",
		AppSecret:              DingTalkOrganizationSyncMaskedSecret,
		IsEnabled:              false,
		SoftDisableMissingData: true,
	}, true)
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}

	if !affected {
		t.Fatalf("SaveConfig() affected = false, want true")
	}
	if store.saved.Owner != "engineering" || store.saved.Name != DingTalkOrganizationSyncDefaultConfigName {
		t.Fatalf("saved identity = %s/%s, want engineering/%s", store.saved.Owner, store.saved.Name, DingTalkOrganizationSyncDefaultConfigName)
	}
	if store.saved.AppSecret != "real-secret" {
		t.Fatalf("masked incoming secret should preserve old value, got %q", store.saved.AppSecret)
	}
	if store.saved.LastRunId != "run-1" || !store.saved.LastSyncedAt.Equal(lastSyncedAt) {
		t.Fatalf("config save should preserve sync metadata: %#v", store.saved)
	}
	if config.AppSecret != DingTalkOrganizationSyncMaskedSecret {
		t.Fatalf("returned config should be masked, got %q", config.AppSecret)
	}
}

func TestDingTalkOrganizationSyncConfigServiceGetConfigAttachesScheduleAndMasksSecret(t *testing.T) {
	lastFireAt := time.Date(2026, 7, 2, 8, 0, 0, 0, time.UTC)
	store := &memoryDingTalkOrganizationSyncConfigStore{
		config: &DingTalkOrganizationSyncConfig{
			Owner:        "engineering",
			Name:         DingTalkOrganizationSyncDefaultConfigName,
			Organization: "engineering",
			AppKey:       "ding-app",
			AppSecret:    "real-secret",
			IsEnabled:    true,
		},
	}
	scheduleStore := newMemoryOrganizationSyncScheduleStore()
	_, err := scheduleStore.SaveOrganizationSyncSchedule(&OrganizationSyncSchedule{
		Provider:       OrganizationSyncProviderDingTalk,
		JobType:        OrganizationSyncJobTypeFullDifferential,
		Organization:   "engineering",
		IsEnabled:      true,
		CronExpression: "*/30 * * * *",
		Timezone:       "Asia/Shanghai",
		LastFireAt:     lastFireAt,
		LastRunId:      "run-1",
		LastStatus:     string(OrganizationSyncScheduleFireStatusDispatched),
		LastErrorCode:  "previous_error",
		LastErrorText:  "safe error",
	})
	if err != nil {
		t.Fatalf("SaveOrganizationSyncSchedule() error = %v", err)
	}
	service := &DingTalkOrganizationSyncConfigService{
		Store:         store,
		ScheduleStore: scheduleStore,
	}

	config, err := service.GetConfig(" engineering ", true)
	if err != nil {
		t.Fatalf("GetConfig() error = %v", err)
	}

	if config.AppSecret != DingTalkOrganizationSyncMaskedSecret {
		t.Fatalf("GetConfig() AppSecret = %q, want masked", config.AppSecret)
	}
	if !config.ScheduleEnabled || config.ScheduleCron != "*/30 * * * *" || config.ScheduleTimezone != "Asia/Shanghai" {
		t.Fatalf("schedule fields = enabled:%v cron:%q timezone:%q", config.ScheduleEnabled, config.ScheduleCron, config.ScheduleTimezone)
	}
	if !config.ScheduleLastFireAt.Equal(lastFireAt) || config.ScheduleLastRunId != "run-1" || config.ScheduleLastStatus != string(OrganizationSyncScheduleFireStatusDispatched) {
		t.Fatalf("schedule summary = %#v, want persisted dispatch summary", config)
	}
}

func TestDingTalkOrganizationSyncConfigServiceSaveConfigPersistsScheduleSettings(t *testing.T) {
	store := &memoryDingTalkOrganizationSyncConfigStore{}
	scheduleStore := newMemoryOrganizationSyncScheduleStore()
	service := &DingTalkOrganizationSyncConfigService{
		Store:             store,
		WecomConfigStore:  &memoryWecomOrganizationSyncConfigStore{},
		FeishuConfigStore: &fakeFeishuConfigStore{},
		ScheduleStore:     scheduleStore,
	}

	config, affected, err := service.SaveConfig(&DingTalkOrganizationSyncConfig{
		Organization:     "engineering",
		AppKey:           "ding-app",
		AppSecret:        "real-secret",
		IsEnabled:        true,
		ScheduleEnabled:  true,
		ScheduleCron:     "*/15 * * * *",
		ScheduleTimezone: "Asia/Shanghai",
	}, true)
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}
	if !affected {
		t.Fatalf("SaveConfig() affected = false, want true")
	}
	if config.AppSecret != DingTalkOrganizationSyncMaskedSecret {
		t.Fatalf("returned secret = %q, want masked", config.AppSecret)
	}
	if !config.ScheduleEnabled || config.ScheduleCron != "*/15 * * * *" || config.ScheduleTimezone != "Asia/Shanghai" {
		t.Fatalf("returned schedule fields = %#v", config)
	}
	schedule, err := scheduleStore.GetOrganizationSyncSchedule(OrganizationSyncProviderDingTalk, OrganizationSyncJobTypeFullDifferential, "engineering")
	if err != nil {
		t.Fatalf("GetOrganizationSyncSchedule() error = %v", err)
	}
	if schedule == nil || !schedule.IsEnabled || schedule.CronExpression != "*/15 * * * *" || schedule.Timezone != "Asia/Shanghai" {
		t.Fatalf("persisted schedule = %#v, want enabled DingTalk schedule", schedule)
	}
}

func TestDingTalkOrganizationSyncConfigServiceTestConnectionUsesStoredMaskedSecret(t *testing.T) {
	tester := &fakeDingTalkConnectionTester{result: &DingTalkAddressBookConnectionTestResult{
		DepartmentCount: 2,
		UserCount:       3,
	}}
	var capturedAppKey string
	var capturedSecret string
	service := &DingTalkOrganizationSyncConfigService{
		Store: &memoryDingTalkOrganizationSyncConfigStore{config: &DingTalkOrganizationSyncConfig{
			Organization: "engineering",
			AppKey:       "ding-app",
			AppSecret:    "stored-secret",
		}},
		NewAddressBookConnectionTester: func(appKey string, appSecret string) DingTalkAddressBookConnectionTester {
			capturedAppKey = appKey
			capturedSecret = appSecret
			return tester
		},
	}

	result, err := service.TestConnection(context.Background(), &DingTalkOrganizationSyncConfig{
		Organization: " engineering ",
		AppKey:       " ding-next ",
		AppSecret:    DingTalkOrganizationSyncMaskedSecret,
	})
	if err != nil {
		t.Fatalf("TestConnection() error = %v", err)
	}
	if !tester.called || result.DepartmentCount != 2 || result.UserCount != 3 {
		t.Fatalf("connection tester result = %#v called:%v", result, tester.called)
	}
	if capturedAppKey != "ding-next" || capturedSecret != "stored-secret" {
		t.Fatalf("connection tester credentials = %q/%q, want trimmed app key and stored secret", capturedAppKey, capturedSecret)
	}
}

func TestDingTalkOrganizationSyncConfigServiceSourceStatusDefaultsAndStoreErrors(t *testing.T) {
	service := &DingTalkOrganizationSyncConfigService{
		Store: &memoryDingTalkOrganizationSyncConfigStore{configs: []*DingTalkOrganizationSyncConfig{
			{Organization: "engineering", AppKey: "ding-app", AppSecret: "secret", IsEnabled: true},
		}},
		WecomConfigStore: &memoryWecomOrganizationSyncConfigStore{configs: []*WecomOrganizationSyncConfig{
			{Organization: "finance", CorpId: "ww-finance", AddressBookSecret: "wecom-secret", IsEnabled: false},
		}},
		FeishuConfigStore: &fakeFeishuConfigStore{configs: []*FeishuOrganizationSyncConfig{
			{Organization: "sales", AppId: "cli-sales", AppSecret: "feishu-secret", IsEnabled: true},
		}},
	}

	status, err := service.GetSourceStatus("")
	if err != nil {
		t.Fatalf("GetSourceStatus() error = %v", err)
	}
	if status.DefaultOrganization != "engineering" || status.DefaultOrganizationSource != "configured" {
		t.Fatalf("default status = %#v, want engineering configured default", status)
	}
	if status.SourceStatus == nil || status.SourceStatus.State != OrganizationDirectorySourceStateOwned {
		t.Fatalf("source status = %#v, want DingTalk owned default organization", status.SourceStatus)
	}
	if len(status.ConflictingOrganizations) != 2 {
		t.Fatalf("conflicting organizations = %#v, want WeCom and Feishu occupied candidates", status.ConflictingOrganizations)
	}

	boom := errors.New("wecom list failed")
	_, err = (&DingTalkOrganizationSyncConfigService{
		Store:             &memoryDingTalkOrganizationSyncConfigStore{},
		WecomConfigStore:  &memoryWecomOrganizationSyncConfigStore{err: boom},
		FeishuConfigStore: &fakeFeishuConfigStore{},
	}).GetSourceStatus("engineering")
	if !errors.Is(err, boom) {
		t.Fatalf("GetSourceStatus() error = %v, want wecom list failed", err)
	}
}

func TestDingTalkOrganizationSyncModelHelpersCoverNilAndLengthSafeBranches(t *testing.T) {
	if GetMaskedDingTalkOrganizationSyncConfig(nil, true) != nil {
		t.Fatalf("GetMaskedDingTalkOrganizationSyncConfig(nil) should return nil")
	}
	ApplyDingTalkOrganizationSyncConfigSecretUpdate(nil, &DingTalkOrganizationSyncConfig{AppSecret: DingTalkOrganizationSyncMaskedSecret})
	newConfig := &DingTalkOrganizationSyncConfig{AppSecret: DingTalkOrganizationSyncMaskedSecret}
	ApplyDingTalkOrganizationSyncConfigSecretUpdate(&DingTalkOrganizationSyncConfig{AppSecret: "real-secret"}, newConfig)
	if newConfig.AppSecret != "real-secret" {
		t.Fatalf("masked placeholder should preserve old secret, got %q", newConfig.AppSecret)
	}
	ApplyDingTalkOrganizationSyncConfigSecretUpdate(&DingTalkOrganizationSyncConfig{AppSecret: "real-secret"}, nil)

	if externalId := GetFullDingTalkUserExternalId("", "u1"); externalId != "" {
		t.Fatalf("GetFullDingTalkUserExternalId(empty app) = %q, want empty", externalId)
	}
	longUserId := strings.Repeat("u", DingTalkUserExternalIdMaxLength)
	lengthSafe := GetLengthSafeDingTalkUserExternalId("ding-app", longUserId)
	if !strings.HasPrefix(lengthSafe, "dingtalk:") || len(lengthSafe) > DingTalkUserExternalIdMaxLength {
		t.Fatalf("GetLengthSafeDingTalkUserExternalId(long) = %q, want length-safe dingtalk id", lengthSafe)
	}
	if bounded := boundedDingTalkName("prefix-", "", 100); bounded != "prefix-unknown" {
		t.Fatalf("boundedDingTalkName(empty) = %q, want prefix-unknown", bounded)
	}
	if userName := GetDingTalkUserName("ding-app", strings.Repeat("x", 300)); !strings.HasPrefix(userName, DingTalkUserNamePrefix) || len(userName) > 255 {
		t.Fatalf("GetDingTalkUserName(long) = %q, want bounded user name", userName)
	}
}

func TestDingTalkOrganizationSyncConfigServiceRejectsBuiltInAndMissingRequiredFields(t *testing.T) {
	service := &DingTalkOrganizationSyncConfigService{Store: &memoryDingTalkOrganizationSyncConfigStore{}}

	_, _, err := service.SaveConfig(&DingTalkOrganizationSyncConfig{
		Organization: "built-in",
		AppKey:       "ding-app",
		AppSecret:    "real-secret",
	}, true)
	if err == nil || !strings.Contains(err.Error(), "built-in") {
		t.Fatalf("built-in error = %v, want built-in rejection", err)
	}

	_, _, err = service.SaveConfig(&DingTalkOrganizationSyncConfig{
		Organization: "engineering",
		AppSecret:    "real-secret",
	}, true)
	if err == nil || !strings.Contains(err.Error(), "app_key") {
		t.Fatalf("missing app_key error = %v", err)
	}

	_, _, err = service.SaveConfig(&DingTalkOrganizationSyncConfig{
		Organization: "engineering",
		AppKey:       "ding-app",
		AppSecret:    DingTalkOrganizationSyncMaskedSecret,
	}, true)
	if err == nil || !strings.Contains(err.Error(), "app_secret") {
		t.Fatalf("missing app_secret error = %v", err)
	}
}

func TestDingTalkOrganizationSyncConfigServiceRejectsOtherConfiguredSources(t *testing.T) {
	for _, tt := range []struct {
		name        string
		wecomStore  WecomOrganizationSyncConfigStore
		feishuStore FeishuOrganizationSyncConfigStore
		want        string
	}{
		{
			name: "wecom",
			wecomStore: &memoryWecomOrganizationSyncConfigStore{config: &WecomOrganizationSyncConfig{
				Owner:             "engineering",
				Name:              WecomOrganizationSyncDefaultConfigName,
				Organization:      "engineering",
				CorpId:            "ww-engineering",
				AddressBookSecret: "wecom-secret",
				IsEnabled:         false,
			}},
			feishuStore: &fakeFeishuConfigStore{},
			want:        "WeCom",
		},
		{
			name:       "feishu",
			wecomStore: &memoryWecomOrganizationSyncConfigStore{},
			feishuStore: &fakeFeishuConfigStore{config: &FeishuOrganizationSyncConfig{
				Owner:        "engineering",
				Name:         FeishuOrganizationSyncDefaultConfigName,
				Organization: "engineering",
				AppId:        "cli-engineering",
				AppSecret:    "feishu-secret",
				EndpointMode: FeishuEndpointModeDomestic,
				IsEnabled:    false,
			}},
			want: "Feishu/Lark",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			store := &memoryDingTalkOrganizationSyncConfigStore{}
			service := &DingTalkOrganizationSyncConfigService{
				Store:             store,
				WecomConfigStore:  tt.wecomStore,
				FeishuConfigStore: tt.feishuStore,
			}

			_, _, err := service.SaveConfig(&DingTalkOrganizationSyncConfig{
				Organization: "engineering",
				AppKey:       "ding-app",
				AppSecret:    "ding-secret",
				IsEnabled:    true,
			}, true)
			if err == nil || !strings.Contains(err.Error(), tt.want) || !strings.Contains(err.Error(), "engineering") {
				t.Fatalf("SaveConfig() error = %v, want %s conflict", err, tt.want)
			}
			if store.saved != nil {
				t.Fatalf("conflicting config should not be saved: %#v", store.saved)
			}
		})
	}
}

func TestWecomAndFeishuOrganizationSyncConfigServiceRejectDingTalkConfiguredSource(t *testing.T) {
	dingTalkStore := &memoryDingTalkOrganizationSyncConfigStore{config: &DingTalkOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         DingTalkOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppKey:       "ding-engineering",
		AppSecret:    "ding-secret",
		IsEnabled:    false,
	}}

	wecomStore := &memoryWecomOrganizationSyncConfigStore{}
	_, _, err := (&WecomOrganizationSyncConfigService{
		Store:               wecomStore,
		FeishuConfigStore:   &fakeFeishuConfigStore{},
		DingTalkConfigStore: dingTalkStore,
	}).SaveConfig(&WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww-engineering",
		AddressBookSecret: "wecom-secret",
		IsEnabled:         true,
	}, true)
	if err == nil || !strings.Contains(err.Error(), "DingTalk") || !strings.Contains(err.Error(), "engineering") {
		t.Fatalf("WeCom SaveConfig() error = %v, want DingTalk conflict", err)
	}
	if wecomStore.saved != nil {
		t.Fatalf("WeCom conflicting config should not be saved: %#v", wecomStore.saved)
	}

	feishuStore := &fakeFeishuConfigStore{}
	_, _, err = (&FeishuOrganizationSyncConfigService{
		Store:               feishuStore,
		WecomConfigStore:    &memoryWecomOrganizationSyncConfigStore{},
		DingTalkConfigStore: dingTalkStore,
	}).SaveConfig(&FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli-engineering",
		AppSecret:    "feishu-secret",
		EndpointMode: FeishuEndpointModeDomestic,
		IsEnabled:    true,
	}, true)
	if err == nil || !strings.Contains(err.Error(), "DingTalk") || !strings.Contains(err.Error(), "engineering") {
		t.Fatalf("Feishu SaveConfig() error = %v, want DingTalk conflict", err)
	}
	if feishuStore.saved != nil {
		t.Fatalf("Feishu conflicting config should not be saved: %#v", feishuStore.saved)
	}
}

func TestOrganizationDirectorySourceStatusServiceIncludesDingTalk(t *testing.T) {
	service := &OrganizationDirectorySourceStatusService{
		WecomConfigStore: &memoryWecomOrganizationSyncConfigStore{configs: []*WecomOrganizationSyncConfig{
			{Owner: "sales", Name: WecomOrganizationSyncDefaultConfigName, Organization: "sales", CorpId: "ww-sales", IsEnabled: true},
		}},
		FeishuConfigStore: &fakeFeishuConfigStore{configs: []*FeishuOrganizationSyncConfig{
			{Owner: "finance", Name: FeishuOrganizationSyncDefaultConfigName, Organization: "finance", AppId: "cli-finance", AppSecret: "feishu-secret", IsEnabled: true},
			{Owner: "sales", Name: FeishuOrganizationSyncDefaultConfigName, Organization: "sales", AppId: "cli-sales", AppSecret: "feishu-secret", IsEnabled: true},
		}},
		DingTalkConfigStore: &memoryDingTalkOrganizationSyncConfigStore{configs: []*DingTalkOrganizationSyncConfig{
			{Owner: "engineering", Name: DingTalkOrganizationSyncDefaultConfigName, Organization: "engineering", AppKey: "ding-engineering", AppSecret: "ding-secret", IsEnabled: true},
			{Owner: "sales", Name: DingTalkOrganizationSyncDefaultConfigName, Organization: "sales", AppKey: "ding-sales", AppSecret: "ding-secret", IsEnabled: false},
		}},
	}

	owned, err := service.GetStatus("engineering", OrganizationDirectorySourceDingTalk)
	if err != nil {
		t.Fatalf("GetStatus(owned) error = %v", err)
	}
	if owned.State != OrganizationDirectorySourceStateOwned || owned.OwningSource == nil || owned.OwningSource.Source != OrganizationDirectorySourceDingTalk || owned.OwningSource.DisplayName != "DingTalk" {
		t.Fatalf("owned status = %#v, want DingTalk owner", owned)
	}

	occupied, err := service.GetStatus("engineering", OrganizationDirectorySourceWeCom)
	if err != nil {
		t.Fatalf("GetStatus(occupied) error = %v", err)
	}
	if occupied.State != OrganizationDirectorySourceStateOccupied || occupied.OccupyingSource == nil || occupied.OccupyingSource.Source != OrganizationDirectorySourceDingTalk {
		t.Fatalf("occupied status = %#v, want DingTalk occupying WeCom page", occupied)
	}

	ambiguous, err := service.GetStatus("sales", OrganizationDirectorySourceDingTalk)
	if err != nil {
		t.Fatalf("GetStatus(ambiguous) error = %v", err)
	}
	if ambiguous.State != OrganizationDirectorySourceStateAmbiguous || len(ambiguous.Sources) != 3 {
		t.Fatalf("ambiguous status = %#v, want three source summaries", ambiguous)
	}

	status, err := service.GetCandidateStatus(OrganizationDirectorySourceWeCom)
	if err != nil {
		t.Fatalf("GetCandidateStatus() error = %v", err)
	}
	states := map[string]OrganizationDirectorySourceState{}
	for _, item := range status.Statuses {
		states[item.Organization] = item.State
	}
	if states["engineering"] != OrganizationDirectorySourceStateOccupied || states["finance"] != OrganizationDirectorySourceStateOccupied || states["sales"] != OrganizationDirectorySourceStateAmbiguous {
		t.Fatalf("candidate states = %#v, want dingtalk occupied, feishu occupied and sales ambiguous", states)
	}
}

func TestDingTalkOrganizationSyncSourceGuardHandlesEmptyAndStoreErrors(t *testing.T) {
	if organizations, err := getConfiguredDingTalkOrganizationSyncOrganizations(&dingtalkOrganizationSyncConfigStoreWithoutList{}); err != nil || len(organizations) != 0 {
		t.Fatalf("getConfiguredDingTalkOrganizationSyncOrganizations(non-lister) = %#v, %v; want empty nil", organizations, err)
	}
	if organization, err := getDefaultDingTalkOrganizationSyncOrganization(&dingtalkOrganizationSyncConfigStoreWithoutList{}); err != nil || organization != "" {
		t.Fatalf("getDefaultDingTalkOrganizationSyncOrganization() = %q, %v; want empty nil", organization, err)
	}

	boom := errors.New("store failed")
	if _, err := getConfiguredDingTalkOrganizationSyncOrganizations(&memoryDingTalkOrganizationSyncConfigStore{err: boom}); !errors.Is(err, boom) {
		t.Fatalf("getConfiguredDingTalkOrganizationSyncOrganizations() error = %v, want store failed", err)
	}
}
