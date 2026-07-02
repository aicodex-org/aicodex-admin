// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"errors"
	"reflect"
	"strings"
	"testing"
)

type sourceGuardWecomListStore struct {
	configs []*WecomOrganizationSyncConfig
	err     error
}

func (s *sourceGuardWecomListStore) GetWecomOrganizationSyncConfigByOrganization(organization string) (*WecomOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	for _, config := range s.configs {
		if config != nil && config.Organization == organization {
			copied := *config
			return &copied, nil
		}
	}
	return nil, nil
}

func (s *sourceGuardWecomListStore) ListWecomOrganizationSyncConfigs() ([]*WecomOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.configs, nil
}

func (s *sourceGuardWecomListStore) SaveWecomOrganizationSyncConfig(config *WecomOrganizationSyncConfig) (bool, error) {
	return true, nil
}

type sourceGuardFeishuListStore struct {
	configs []*FeishuOrganizationSyncConfig
	err     error
}

type sourceGuardFeishuGetErrorStore struct {
	*sourceGuardFeishuListStore
	err error
}

func (s *sourceGuardFeishuListStore) GetFeishuOrganizationSyncConfigByOrganization(organization string) (*FeishuOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	for _, config := range s.configs {
		if config != nil && config.Organization == organization {
			copied := *config
			return &copied, nil
		}
	}
	return nil, nil
}

func (s *sourceGuardFeishuListStore) ListFeishuOrganizationSyncConfigs() ([]*FeishuOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.configs, nil
}

func (s *sourceGuardFeishuListStore) SaveFeishuOrganizationSyncConfig(config *FeishuOrganizationSyncConfig) (bool, error) {
	return true, nil
}

func (s *sourceGuardFeishuGetErrorStore) GetFeishuOrganizationSyncConfigByOrganization(organization string) (*FeishuOrganizationSyncConfig, error) {
	return nil, s.err
}

type sourceGuardDingTalkListStore struct {
	configs []*DingTalkOrganizationSyncConfig
	err     error
}

func (s *sourceGuardDingTalkListStore) GetDingTalkOrganizationSyncConfigByOrganization(organization string) (*DingTalkOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	for _, config := range s.configs {
		if config != nil && config.Organization == organization {
			copied := *config
			return &copied, nil
		}
	}
	return nil, nil
}

func (s *sourceGuardDingTalkListStore) ListDingTalkOrganizationSyncConfigs() ([]*DingTalkOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.configs, nil
}

func (s *sourceGuardDingTalkListStore) SaveDingTalkOrganizationSyncConfig(config *DingTalkOrganizationSyncConfig) (bool, error) {
	return true, nil
}

func TestOrganizationDirectorySourceGuardHelpersCoverNilAndErrorBranches(t *testing.T) {
	var conflict *OrganizationSyncSourceConflictError
	if conflict.Error() != "" {
		t.Fatalf("nil conflict Error() = %q, want empty", conflict.Error())
	}
	if msg := (&OrganizationSyncSourceConflictError{Provider: "WeCom", Organization: "engineering"}).Error(); !strings.Contains(msg, "WeCom") || !strings.Contains(msg, "engineering") {
		t.Fatalf("conflict Error() = %q, want provider and organization", msg)
	}

	var decisionErr *OrganizationDirectorySourceDecisionError
	if decisionErr.Error() != "" {
		t.Fatalf("nil decision Error() = %q, want empty", decisionErr.Error())
	}
	errorCases := []OrganizationDirectorySourceReasonCode{
		OrganizationDirectorySourceReasonOccupied,
		OrganizationDirectorySourceReasonAmbiguous,
		OrganizationDirectorySourceReasonUnavailable,
		OrganizationDirectorySourceReasonCode("unknown"),
	}
	for _, reason := range errorCases {
		msg := (&OrganizationDirectorySourceDecisionError{
			ReasonCode:   reason,
			Organization: "engineering",
			Source:       &OrganizationDirectorySourceSummary{DisplayName: "DingTalk"},
		}).Error()
		if !strings.Contains(msg, "engineering") {
			t.Fatalf("decision Error(%s) = %q, want organization", reason, msg)
		}
	}

	decision := newOrganizationDirectorySourceDecision(nil)
	if decision.Allowed || decision.ReasonCode != OrganizationDirectorySourceReasonUnavailable {
		t.Fatalf("newOrganizationDirectorySourceDecision(nil) = %#v, want unavailable denial", decision)
	}
	err := organizationDirectorySourceDecisionError("engineering", nil, errors.New("status failed"))
	var sourceErr *OrganizationDirectorySourceDecisionError
	if !errors.As(err, &sourceErr) || sourceErr.ReasonCode != OrganizationDirectorySourceReasonUnavailable {
		t.Fatalf("organizationDirectorySourceDecisionError(nil decision) = %T:%v, want unavailable decision error", err, err)
	}
	err = organizationDirectorySourceDecisionError("engineering", &OrganizationDirectorySourceDecision{}, errors.New("status failed"))
	if !errors.As(err, &sourceErr) || sourceErr.ReasonCode != OrganizationDirectorySourceReasonUnavailable {
		t.Fatalf("organizationDirectorySourceDecisionError(empty reason) = %T:%v, want unavailable decision error", err, err)
	}
}

func TestOrganizationDirectorySourceGuardSummariesAndConfiguredOrganizations(t *testing.T) {
	if firstConflictingOrganizationDirectorySource(nil, OrganizationDirectorySourceDingTalk) != nil {
		t.Fatalf("nil status should not have conflicting source")
	}
	status := &OrganizationDirectorySourceStatus{
		OccupyingSource: &OrganizationDirectorySourceSummary{Source: OrganizationDirectorySourceWeCom, DisplayName: "WeCom", Organization: "engineering"},
		Sources: []*OrganizationDirectorySourceSummary{
			{Source: OrganizationDirectorySourceDingTalk, DisplayName: "DingTalk", Organization: "engineering"},
		},
	}
	if source := firstConflictingOrganizationDirectorySource(status, OrganizationDirectorySourceDingTalk); source == nil || source.Source != OrganizationDirectorySourceWeCom {
		t.Fatalf("firstConflictingOrganizationDirectorySource() = %#v, want WeCom", source)
	}
	status.OccupyingSource = nil
	if source := firstConflictingOrganizationDirectorySource(status, OrganizationDirectorySourceWeCom); source == nil || source.Source != OrganizationDirectorySourceDingTalk {
		t.Fatalf("firstConflictingOrganizationDirectorySource(fallback) = %#v, want DingTalk", source)
	}

	sources := appendCurrentOrganizationDirectorySourceSummary([]*OrganizationDirectorySourceSummary{nil}, nil)
	if len(sources) != 1 {
		t.Fatalf("append nil current summary changed sources: %#v", sources)
	}
	sources = appendCurrentOrganizationDirectorySourceSummary(sources, &OrganizationDirectorySourceSummary{Source: OrganizationDirectorySourceDingTalk})
	if len(sources) != 1 {
		t.Fatalf("empty organization current summary should be ignored: %#v", sources)
	}
	sources = appendCurrentOrganizationDirectorySourceSummary([]*OrganizationDirectorySourceSummary{
		{Source: OrganizationDirectorySourceDingTalk, Organization: "engineering"},
	}, &OrganizationDirectorySourceSummary{Source: OrganizationDirectorySource(" dingtalk "), Organization: "engineering"})
	if len(sources) != 1 {
		t.Fatalf("same source current summary should not duplicate: %#v", sources)
	}

	compacted := compactOrganizationDirectorySourceSummaries([]*OrganizationDirectorySourceSummary{
		nil,
		{Source: OrganizationDirectorySourceWeCom, Organization: " "},
		{Source: OrganizationDirectorySource("feishu"), Organization: "engineering"},
		{Source: OrganizationDirectorySourceLark, Organization: "engineering-duplicate"},
		{Source: OrganizationDirectorySourceDingTalk, Organization: "finance"},
	})
	if len(compacted) != 2 || compacted[0].Source != OrganizationDirectorySourceLark || compacted[1].Source != OrganizationDirectorySourceDingTalk {
		t.Fatalf("compacted sources = %#v, want lark and dingtalk only", compacted)
	}
	if organizationDirectorySourceDisplayName(OrganizationDirectorySource("custom")) != "custom" {
		t.Fatalf("custom source display name should fall back to raw source")
	}

	wecomOrganizations, err := getConfiguredWecomOrganizationSyncOrganizations(&sourceGuardWecomListStore{configs: []*WecomOrganizationSyncConfig{
		nil,
		{Organization: "engineering"},
		{Organization: "engineering"},
		{Organization: "built-in"},
		{Organization: " "},
		{Organization: "finance"},
	}})
	if err != nil || !reflect.DeepEqual(wecomOrganizations, []string{"engineering", "finance"}) {
		t.Fatalf("wecom organizations = %#v, %v; want engineering finance", wecomOrganizations, err)
	}
	feishuOrganizations, err := getConfiguredFeishuOrganizationSyncOrganizations(&sourceGuardFeishuListStore{configs: []*FeishuOrganizationSyncConfig{
		nil,
		{Organization: "engineering"},
		{Organization: "built-in"},
	}})
	if err != nil || !reflect.DeepEqual(feishuOrganizations, []string{"engineering"}) {
		t.Fatalf("feishu organizations = %#v, %v; want engineering", feishuOrganizations, err)
	}
	dingTalkOrganizations, err := getConfiguredDingTalkOrganizationSyncOrganizations(&sourceGuardDingTalkListStore{configs: []*DingTalkOrganizationSyncConfig{
		nil,
		{Organization: "engineering"},
		{Organization: "built-in"},
		{Organization: "engineering"},
	}})
	if err != nil || !reflect.DeepEqual(dingTalkOrganizations, []string{"engineering"}) {
		t.Fatalf("dingtalk organizations = %#v, %v; want engineering", dingTalkOrganizations, err)
	}
}

func TestOrganizationSyncProviderConfigValidationAndDefaultBranches(t *testing.T) {
	wecomService := &WecomOrganizationSyncConfigService{
		Store:               &sourceGuardWecomListStore{},
		FeishuConfigStore:   &sourceGuardFeishuListStore{},
		DingTalkConfigStore: &sourceGuardDingTalkListStore{},
	}
	if _, err := wecomService.GetConfig("", true); err == nil || !strings.Contains(err.Error(), "organization") {
		t.Fatalf("WeCom GetConfig(empty) error = %v, want organization validation", err)
	}
	wecomValidationCases := []struct {
		name   string
		config *WecomOrganizationSyncConfig
		want   string
	}{
		{name: "nil config", want: "config"},
		{name: "missing organization", config: &WecomOrganizationSyncConfig{CorpId: "ww123", AddressBookSecret: "secret"}, want: "organization"},
		{name: "missing corp id", config: &WecomOrganizationSyncConfig{Organization: "engineering", AddressBookSecret: "secret"}, want: "corp_id"},
		{name: "missing secret", config: &WecomOrganizationSyncConfig{Organization: "engineering", CorpId: "ww123"}, want: "address_book_secret"},
	}
	for _, tc := range wecomValidationCases {
		t.Run("wecom "+tc.name, func(t *testing.T) {
			_, err := wecomService.prepareConfig(tc.config, false)
			if err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("prepareConfig() error = %v, want %q", err, tc.want)
			}
		})
	}
	if wecomService.organizationStore() == nil || wecomService.configStore() == nil || wecomService.connectionTester("ww123", "secret") == nil {
		t.Fatalf("WeCom default stores/tester should be available")
	}
	var nilWecomService *WecomOrganizationSyncConfigService
	if nilWecomService.configStore() == nil || nilWecomService.feishuConfigStore() == nil || nilWecomService.dingTalkConfigStore() == nil || nilWecomService.scheduleService() == nil {
		t.Fatalf("nil WeCom service should still expose default collaborators")
	}
	AttachWecomOrganizationSyncScheduleFieldsForResponse(nil, nil)
	if hasExplicitWecomOrganizationSyncScheduleSettings(nil) {
		t.Fatalf("nil WeCom config should not report explicit schedule settings")
	}
	wecomService.ScheduleStore = newMemoryOrganizationSyncScheduleStore()
	savedWecom, affected, err := wecomService.SaveConfig(&WecomOrganizationSyncConfig{
		Organization:           "engineering",
		CorpId:                 "ww123",
		AddressBookSecret:      "secret",
		IsEnabled:              true,
		ScheduleEnabled:        true,
		ScheduleCron:           "* * * * *",
		ScheduleTimezone:       "UTC",
		SoftDisableMissingData: true,
	}, true)
	if err != nil || !affected || savedWecom == nil || !savedWecom.ScheduleEnabled || savedWecom.ScheduleCron != "* * * * *" || savedWecom.AddressBookSecret != WecomOrganizationSyncMaskedSecret {
		t.Fatalf("WeCom SaveConfig(schedule) = %#v affected:%v err:%v, want masked scheduled config", savedWecom, affected, err)
	}

	feishuService := &FeishuOrganizationSyncConfigService{
		Store:               &sourceGuardFeishuListStore{},
		WecomConfigStore:    &sourceGuardWecomListStore{},
		DingTalkConfigStore: &sourceGuardDingTalkListStore{},
	}
	if _, err := feishuService.GetConfig("", true); err == nil || !strings.Contains(err.Error(), "organization") {
		t.Fatalf("Feishu GetConfig(empty) error = %v, want organization validation", err)
	}
	feishuValidationCases := []struct {
		name   string
		config *FeishuOrganizationSyncConfig
		want   string
	}{
		{name: "nil config", want: "config"},
		{name: "missing organization", config: &FeishuOrganizationSyncConfig{AppId: "cli_123", AppSecret: "secret"}, want: "organization"},
		{name: "missing app id", config: &FeishuOrganizationSyncConfig{Organization: "engineering", AppSecret: "secret"}, want: "app_id"},
		{name: "invalid endpoint", config: &FeishuOrganizationSyncConfig{Organization: "engineering", AppId: "cli_123", AppSecret: "secret", EndpointMode: "mars"}, want: "endpoint_mode"},
	}
	for _, tc := range feishuValidationCases {
		t.Run("feishu "+tc.name, func(t *testing.T) {
			_, err := feishuService.prepareConfig(tc.config)
			if err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("prepareConfig() error = %v, want %q", err, tc.want)
			}
		})
	}
	if _, err := feishuService.TestConnection(nil, &FeishuOrganizationSyncConfig{Organization: "engineering", AppId: "cli_123"}); err == nil || !strings.Contains(err.Error(), "app_secret") {
		t.Fatalf("Feishu TestConnection(missing secret) error = %v, want app_secret validation", err)
	}
	if feishuService.organizationStore() == nil || feishuService.configStore() == nil || feishuService.wecomConfigStore() == nil || feishuService.connectionTester("cli_123", "secret", "") == nil {
		t.Fatalf("Feishu default stores/tester should be available")
	}
	AttachFeishuOrganizationSyncScheduleFieldsForResponse(nil, nil)
	if hasExplicitFeishuOrganizationSyncScheduleSettings(nil) {
		t.Fatalf("nil Feishu config should not report explicit schedule settings")
	}
	feishuService.ScheduleStore = newMemoryOrganizationSyncScheduleStore()
	savedFeishu, affected, err := feishuService.SaveConfig(&FeishuOrganizationSyncConfig{
		Organization:     "engineering",
		AppId:            "cli_123",
		AppSecret:        "secret",
		IsEnabled:        true,
		ScheduleEnabled:  true,
		ScheduleCron:     "* * * * *",
		ScheduleTimezone: "UTC",
	}, true)
	if err != nil || !affected || savedFeishu == nil || !savedFeishu.ScheduleEnabled || savedFeishu.ScheduleCron != "* * * * *" || savedFeishu.AppSecret != FeishuOrganizationSyncMaskedSecret {
		t.Fatalf("Feishu SaveConfig(schedule) = %#v affected:%v err:%v, want masked scheduled config", savedFeishu, affected, err)
	}
}

func TestWecomOrganizationSyncConfigServicePropagatesErrorsAndConflicts(t *testing.T) {
	boom := errors.New("store failed")

	service := &WecomOrganizationSyncConfigService{
		Store: &sourceGuardWecomListStore{err: boom},
	}
	if _, err := service.GetConfig("engineering", true); !errors.Is(err, boom) {
		t.Fatalf("GetConfig() error = %v, want store failure", err)
	}
	if _, err := service.GetSourceStatus(""); !errors.Is(err, boom) {
		t.Fatalf("GetSourceStatus(default organization) error = %v, want store failure", err)
	}

	service = &WecomOrganizationSyncConfigService{
		Store:             &sourceGuardWecomListStore{},
		FeishuConfigStore: &sourceGuardFeishuListStore{err: boom},
	}
	if _, err := service.GetSourceStatus(""); !errors.Is(err, boom) {
		t.Fatalf("GetSourceStatus(feishu list) error = %v, want store failure", err)
	}

	service = &WecomOrganizationSyncConfigService{
		Store:               &sourceGuardWecomListStore{},
		FeishuConfigStore:   &sourceGuardFeishuListStore{},
		DingTalkConfigStore: &sourceGuardDingTalkListStore{err: boom},
	}
	if _, err := service.GetSourceStatus(""); !errors.Is(err, boom) {
		t.Fatalf("GetSourceStatus(dingtalk list) error = %v, want store failure", err)
	}

	service = &WecomOrganizationSyncConfigService{
		Store:               &sourceGuardWecomListStore{},
		FeishuConfigStore:   &sourceGuardFeishuGetErrorStore{sourceGuardFeishuListStore: &sourceGuardFeishuListStore{}, err: boom},
		DingTalkConfigStore: &sourceGuardDingTalkListStore{},
	}
	if _, err := service.GetSourceStatus("engineering"); !errors.Is(err, boom) {
		t.Fatalf("GetSourceStatus(feishu get) error = %v, want store failure", err)
	}

	service = &WecomOrganizationSyncConfigService{
		Store:             &sourceGuardWecomListStore{},
		FeishuConfigStore: &sourceGuardFeishuListStore{},
		DingTalkConfigStore: &sourceGuardDingTalkListStore{configs: []*DingTalkOrganizationSyncConfig{
			{Organization: "engineering", IsEnabled: true},
		}},
	}
	status, err := service.GetSourceStatus("engineering")
	if err != nil {
		t.Fatalf("GetSourceStatus(dingtalk conflict) error = %v", err)
	}
	if status.ConflictingProvider != "DingTalk" || status.ConflictingOrganization != "engineering" || !status.ConflictingConfigured || !status.ConflictingEnabled {
		t.Fatalf("DingTalk conflict status = %#v, want enabled DingTalk conflict", status)
	}

	service = &WecomOrganizationSyncConfigService{
		Store:               &sourceGuardWecomListStore{},
		FeishuConfigStore:   &sourceGuardFeishuListStore{},
		DingTalkConfigStore: &sourceGuardDingTalkListStore{},
	}
	_, _, err = service.SaveConfig(&WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "secret",
		ScheduleEnabled:   true,
		ScheduleCron:      "bad cron",
	}, true)
	if err == nil || !strings.Contains(err.Error(), "cron") {
		t.Fatalf("SaveConfig(invalid schedule) error = %v, want cron validation", err)
	}
	if _, err := service.TestConnection(nil, &WecomOrganizationSyncConfig{Organization: "engineering", CorpId: "ww123"}); err == nil || !strings.Contains(err.Error(), "address_book_secret") {
		t.Fatalf("TestConnection(missing secret) error = %v, want local secret validation", err)
	}
	if config, err := service.attachScheduleFields(nil); err != nil || config != nil {
		t.Fatalf("attachScheduleFields(nil) = %#v, %v; want nil nil", config, err)
	}
}
