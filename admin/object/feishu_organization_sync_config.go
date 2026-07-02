// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/xorm-io/core"
)

type FeishuOrganizationSyncConfigStore interface {
	GetFeishuOrganizationSyncConfigByOrganization(organization string) (*FeishuOrganizationSyncConfig, error)
	SaveFeishuOrganizationSyncConfig(config *FeishuOrganizationSyncConfig) (bool, error)
}

type FeishuAddressBookConnectionTester interface {
	TestConnection(ctx context.Context) (*FeishuAddressBookConnectionTestResult, error)
}

type FeishuOrganizationSyncConfigService struct {
	Store                          FeishuOrganizationSyncConfigStore
	WecomConfigStore               WecomOrganizationSyncConfigStore
	DingTalkConfigStore            DingTalkOrganizationSyncConfigStore
	OrganizationStore              FeishuBusinessOrganizationStore
	ScheduleStore                  OrganizationSyncScheduleStore
	NewAddressBookConnectionTester func(appId string, appSecret string, endpointMode string) FeishuAddressBookConnectionTester
}

type defaultFeishuOrganizationSyncConfigStore struct{}

func (s *FeishuOrganizationSyncConfigService) GetConfig(organization string, isMaskEnabled bool) (*FeishuOrganizationSyncConfig, error) {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return nil, errors.New("feishu organization sync organization is required")
	}
	config, err := s.configStore().GetFeishuOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		return nil, err
	}
	return s.attachScheduleFields(GetMaskedFeishuOrganizationSyncConfig(config, isMaskEnabled))
}

func (s *FeishuOrganizationSyncConfigService) GetDefaultOrganization() (string, error) {
	return getDefaultFeishuOrganizationSyncOrganization(s.configStore())
}

func (s *FeishuOrganizationSyncConfigService) GetSourceStatus(organization string) (*OrganizationSyncSourceConflictStatus, error) {
	defaultOrganization, err := s.GetDefaultOrganization()
	if err != nil {
		return nil, err
	}
	status := &OrganizationSyncSourceConflictStatus{DefaultOrganization: defaultOrganization}
	if defaultOrganization != "" {
		status.DefaultOrganizationSource = "configured"
	}
	wecomOrganizations, err := getConfiguredWecomOrganizationSyncOrganizations(s.wecomConfigStore())
	if err != nil {
		return nil, err
	}
	dingTalkOrganizations, err := getConfiguredDingTalkOrganizationSyncOrganizations(s.dingTalkConfigStore())
	if err != nil {
		return nil, err
	}
	status.ConflictingOrganizations = append(wecomOrganizations, dingTalkOrganizations...)

	organization = strings.TrimSpace(organization)
	if organization == "" {
		organization = defaultOrganization
	}
	sourceStatus, err := (&OrganizationDirectorySourceStatusService{
		WecomConfigStore:    s.wecomConfigStore(),
		FeishuConfigStore:   s.configStore(),
		DingTalkConfigStore: s.dingTalkConfigStore(),
	}).GetStatus(organization, OrganizationDirectorySourceLark)
	if err != nil {
		return nil, err
	}
	status.SourceStatus = sourceStatus
	if organization == "" {
		return status, nil
	}

	config, err := s.wecomConfigStore().GetWecomOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		return nil, err
	}
	if config != nil {
		status.ConflictingProvider = "WeCom"
		status.ConflictingOrganization = organization
		status.ConflictingConfigured = true
		status.ConflictingEnabled = config.IsEnabled
	} else if source := firstConflictingOrganizationDirectorySource(sourceStatus, OrganizationDirectorySourceLark); source != nil {
		status.ConflictingProvider = source.DisplayName
		status.ConflictingOrganization = organization
		status.ConflictingConfigured = true
		status.ConflictingEnabled = source.Enabled
	}
	return status, nil
}

func (s *FeishuOrganizationSyncConfigService) SaveConfig(config *FeishuOrganizationSyncConfig, isMaskEnabled bool) (*FeishuOrganizationSyncConfig, bool, error) {
	prepared, err := s.prepareConfigForSave(config)
	if err != nil {
		return nil, false, err
	}
	if err := (&OrganizationDirectorySourceStatusService{
		WecomConfigStore:    s.wecomConfigStore(),
		FeishuConfigStore:   s.configStore(),
		DingTalkConfigStore: s.dingTalkConfigStore(),
	}).RequireExecutionAllowed(prepared.Organization, OrganizationDirectorySourceLark); err != nil {
		return nil, false, err
	}
	schedule, hasScheduleSettings, err := s.prepareScheduleForSave(prepared.Organization, config)
	if err != nil {
		return nil, false, err
	}
	affected, err := s.configStore().SaveFeishuOrganizationSyncConfig(prepared)
	if err != nil {
		return nil, false, err
	}
	if hasScheduleSettings {
		schedule, err = s.scheduleService().SaveSchedule(schedule)
		if err != nil {
			return nil, false, err
		}
	}
	masked := GetMaskedFeishuOrganizationSyncConfig(prepared, isMaskEnabled)
	if hasScheduleSettings {
		attachFeishuOrganizationSyncScheduleFields(masked, schedule)
		return masked, affected, nil
	}
	masked, err = s.attachScheduleFields(masked)
	return masked, affected, err
}

func (s *FeishuOrganizationSyncConfigService) TestConnection(ctx context.Context, config *FeishuOrganizationSyncConfig) (*FeishuAddressBookConnectionTestResult, error) {
	prepared, err := s.prepareConfig(config)
	if err != nil {
		return nil, err
	}
	if prepared.AppSecret == FeishuOrganizationSyncMaskedSecret {
		existing, err := s.configStore().GetFeishuOrganizationSyncConfigByOrganization(prepared.Organization)
		if err != nil {
			return nil, err
		}
		ApplyFeishuOrganizationSyncConfigSecretUpdate(existing, prepared)
	}
	if prepared.AppSecret == "" || prepared.AppSecret == FeishuOrganizationSyncMaskedSecret {
		return nil, errors.New("feishu organization sync app_secret is required")
	}
	return s.connectionTester(prepared.AppId, prepared.AppSecret, prepared.EndpointMode).TestConnection(ctx)
}

func (s *FeishuOrganizationSyncConfigService) prepareConfigForSave(config *FeishuOrganizationSyncConfig) (*FeishuOrganizationSyncConfig, error) {
	prepared, err := s.prepareConfig(config)
	if err != nil {
		return nil, err
	}
	originalOrganization := prepared.Organization
	var legacyOriginalConfig *FeishuOrganizationSyncConfig
	if prepared.TenantKey != "" {
		if originalOrganization != GetFeishuBusinessOrganizationName(prepared.TenantKey) {
			legacyOriginalConfig, err = s.configStore().GetFeishuOrganizationSyncConfigByOrganization(originalOrganization)
			if err != nil {
				return nil, err
			}
		}
		prepared.Organization, err = ensureFeishuBusinessOrganization(s.organizationStore(), prepared.TenantKey)
		if err != nil {
			return nil, err
		}
		prepared.Owner = prepared.Organization
	}
	existing, err := s.configStore().GetFeishuOrganizationSyncConfigByOrganization(prepared.Organization)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		prepared.Owner = existing.Owner
		prepared.Name = existing.Name
		prepared.CreatedAt = existing.CreatedAt
		prepared.LastRunId = existing.LastRunId
		prepared.LastSyncedAt = existing.LastSyncedAt
		if strings.TrimSpace(prepared.TenantKey) == "" {
			prepared.TenantKey = existing.TenantKey
		}
		ApplyFeishuOrganizationSyncConfigSecretUpdate(existing, prepared)
	} else {
		prepared.Owner = prepared.Organization
		prepared.Name = FeishuOrganizationSyncDefaultConfigName
		if prepared.AppSecret == FeishuOrganizationSyncMaskedSecret && legacyOriginalConfig != nil {
			prepared.AppSecret = legacyOriginalConfig.AppSecret
		}
	}
	if prepared.AppSecret == "" || prepared.AppSecret == FeishuOrganizationSyncMaskedSecret {
		return nil, errors.New("feishu organization sync app_secret is required")
	}
	prepared.Owner = prepared.Organization
	return prepared, nil
}

func (s *FeishuOrganizationSyncConfigService) prepareConfig(config *FeishuOrganizationSyncConfig) (*FeishuOrganizationSyncConfig, error) {
	if config == nil {
		return nil, errors.New("feishu organization sync config is required")
	}
	prepared := *config
	prepared.Organization = strings.TrimSpace(prepared.Organization)
	prepared.AppId = strings.TrimSpace(prepared.AppId)
	prepared.AppSecret = strings.TrimSpace(prepared.AppSecret)
	prepared.EndpointMode = normalizeFeishuEndpointMode(prepared.EndpointMode)
	prepared.TenantKey = strings.TrimSpace(prepared.TenantKey)
	if prepared.Organization == "" {
		return nil, errors.New("feishu organization sync organization is required")
	}
	if prepared.AppId == "" {
		return nil, errors.New("feishu organization sync app_id is required")
	}
	if !isValidFeishuEndpointMode(prepared.EndpointMode) {
		return nil, errors.New("feishu organization sync endpoint_mode is invalid")
	}
	prepared.Owner = prepared.Organization
	if prepared.Name == "" {
		prepared.Name = FeishuOrganizationSyncDefaultConfigName
	}
	return &prepared, nil
}

func (s *FeishuOrganizationSyncConfigService) prepareScheduleForSave(organization string, config *FeishuOrganizationSyncConfig) (*OrganizationSyncSchedule, bool, error) {
	if !hasExplicitFeishuOrganizationSyncScheduleSettings(config) {
		return nil, false, nil
	}
	schedule := &OrganizationSyncSchedule{
		Provider:       OrganizationSyncProviderLark,
		JobType:        OrganizationSyncJobTypeFullDifferential,
		Organization:   organization,
		IsEnabled:      config.ScheduleEnabled,
		CronExpression: config.ScheduleCron,
		Timezone:       config.ScheduleTimezone,
	}
	prepared, err := prepareOrganizationSyncSchedule(schedule)
	if err != nil {
		return nil, true, err
	}
	return prepared, true, nil
}

func (s *FeishuOrganizationSyncConfigService) attachScheduleFields(config *FeishuOrganizationSyncConfig) (*FeishuOrganizationSyncConfig, error) {
	if config == nil {
		return nil, nil
	}
	schedule, err := s.scheduleService().GetSchedule(OrganizationSyncProviderLark, OrganizationSyncJobTypeFullDifferential, config.Organization)
	if err != nil {
		return nil, err
	}
	attachFeishuOrganizationSyncScheduleFields(config, schedule)
	return config, nil
}

func (s *FeishuOrganizationSyncConfigService) scheduleService() *OrganizationSyncScheduleService {
	if s != nil && s.ScheduleStore != nil {
		return &OrganizationSyncScheduleService{Store: s.ScheduleStore}
	}
	return &OrganizationSyncScheduleService{}
}

func (s *FeishuOrganizationSyncConfigService) configStore() FeishuOrganizationSyncConfigStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultFeishuOrganizationSyncConfigStore{}
}

func (s *FeishuOrganizationSyncConfigService) wecomConfigStore() WecomOrganizationSyncConfigStore {
	if s != nil && s.WecomConfigStore != nil {
		return s.WecomConfigStore
	}
	return defaultWecomOrganizationSyncConfigStore{}
}

func (s *FeishuOrganizationSyncConfigService) dingTalkConfigStore() DingTalkOrganizationSyncConfigStore {
	if s != nil && s.DingTalkConfigStore != nil {
		return s.DingTalkConfigStore
	}
	return defaultDingTalkOrganizationSyncConfigStore{}
}

func (s *FeishuOrganizationSyncConfigService) organizationStore() FeishuBusinessOrganizationStore {
	if s != nil && s.OrganizationStore != nil {
		return s.OrganizationStore
	}
	return defaultFeishuBusinessOrganizationStore{}
}

func (s *FeishuOrganizationSyncConfigService) connectionTester(appId string, appSecret string, endpointMode string) FeishuAddressBookConnectionTester {
	if s != nil && s.NewAddressBookConnectionTester != nil {
		return s.NewAddressBookConnectionTester(appId, appSecret, endpointMode)
	}
	return NewFeishuAddressBookClient(appId, appSecret, endpointMode)
}

func hasExplicitFeishuOrganizationSyncScheduleSettings(config *FeishuOrganizationSyncConfig) bool {
	return config != nil && (config.ScheduleEnabled || strings.TrimSpace(config.ScheduleCron) != "" || strings.TrimSpace(config.ScheduleTimezone) != "")
}

func attachFeishuOrganizationSyncScheduleFields(config *FeishuOrganizationSyncConfig, schedule *OrganizationSyncSchedule) {
	if config == nil {
		return
	}
	if schedule == nil {
		schedule = &OrganizationSyncSchedule{
			Provider:     OrganizationSyncProviderLark,
			JobType:      OrganizationSyncJobTypeFullDifferential,
			Organization: config.Organization,
		}
	}
	schedule.ApplyDefaults()
	config.ScheduleEnabled = schedule.IsEnabled
	config.ScheduleCron = schedule.CronExpression
	config.ScheduleTimezone = schedule.Timezone
	config.ScheduleLastFireAt = schedule.LastFireAt
	config.ScheduleLastRunId = schedule.LastRunId
	config.ScheduleLastStatus = schedule.LastStatus
	config.ScheduleLastErrorCode = schedule.LastErrorCode
	config.ScheduleLastErrorText = schedule.LastErrorText
	if schedule.LastStatus != "" || schedule.LastErrorCode != "" || schedule.LastErrorText != "" {
		config.ScheduleDiagnostics = BuildFeishuOrganizationSyncScheduleDiagnostics(&OrganizationSyncScheduleFire{
			Provider:     OrganizationSyncProviderLark,
			JobType:      OrganizationSyncJobTypeFullDifferential,
			Organization: config.Organization,
			WindowStart:  schedule.LastFireAt,
			Status:       OrganizationSyncScheduleFireStatus(schedule.LastStatus),
			RunId:        schedule.LastRunId,
			ErrorCode:    schedule.LastErrorCode,
			ErrorText:    schedule.LastErrorText,
		}, config.AppSecret)
	}
}

func AttachFeishuOrganizationSyncScheduleFieldsForResponse(config *FeishuOrganizationSyncConfig, schedule *OrganizationSyncSchedule) {
	attachFeishuOrganizationSyncScheduleFields(config, schedule)
}

func GetFeishuOrganizationSyncConfigByOrganization(organization string) (*FeishuOrganizationSyncConfig, error) {
	return getFeishuOrganizationSyncConfigByOrganization(organization)
}

func (s defaultFeishuOrganizationSyncConfigStore) GetFeishuOrganizationSyncConfigByOrganization(organization string) (*FeishuOrganizationSyncConfig, error) {
	return getFeishuOrganizationSyncConfigByOrganization(organization)
}

func (s defaultFeishuOrganizationSyncConfigStore) SaveFeishuOrganizationSyncConfig(config *FeishuOrganizationSyncConfig) (bool, error) {
	return saveFeishuOrganizationSyncConfig(config)
}

func (s defaultFeishuOrganizationSyncConfigStore) ListFeishuOrganizationSyncConfigs() ([]*FeishuOrganizationSyncConfig, error) {
	configs := []*FeishuOrganizationSyncConfig{}
	if ormer == nil || ormer.Engine == nil {
		return configs, nil
	}
	err := ormer.Engine.Desc("is_enabled").Desc("updated_at").Find(&configs)
	return configs, err
}

func (s defaultFeishuOrganizationSyncConfigStore) UpdateFeishuOrganizationSyncConfigLastSync(config *FeishuOrganizationSyncConfig, run *FeishuOrganizationSyncRun, syncedAt time.Time) error {
	if config == nil || run == nil {
		return nil
	}
	update := &FeishuOrganizationSyncConfig{
		LastRunId:    run.Name,
		LastSyncedAt: syncedAt.UTC(),
		TenantKey:    run.TenantKey,
	}
	owner := firstNonEmpty(config.Owner, config.Organization)
	name := firstNonEmpty(config.Name, FeishuOrganizationSyncDefaultConfigName)
	affected, err := ormer.Engine.ID(core.PK{owner, name}).Cols("last_run_id", "last_synced_at", "tenant_key").Update(update)
	if err != nil {
		return err
	}
	if affected != 0 || config.Organization == "" {
		return nil
	}
	_, err = ormer.Engine.Where("organization = ?", config.Organization).Cols("last_run_id", "last_synced_at", "tenant_key").Update(update)
	return err
}

func getFeishuOrganizationSyncConfigByOrganization(organization string) (*FeishuOrganizationSyncConfig, error) {
	organization = strings.TrimSpace(organization)
	if organization == "" || ormer == nil || ormer.Engine == nil {
		return nil, nil
	}
	config := &FeishuOrganizationSyncConfig{}
	existed, err := ormer.Engine.Where("organization = ?", organization).Get(config)
	if err != nil || !existed {
		return nil, err
	}
	return config, nil
}

func saveFeishuOrganizationSyncConfig(config *FeishuOrganizationSyncConfig) (bool, error) {
	if config == nil {
		return false, nil
	}
	existing, err := getFeishuOrganizationSyncConfigByOrganization(config.Organization)
	if err != nil {
		return false, err
	}
	if existing == nil {
		affected, err := ormer.Engine.Insert(config)
		return affected != 0, err
	}
	config.Owner = existing.Owner
	config.Name = existing.Name
	if config.CreatedAt.IsZero() {
		config.CreatedAt = existing.CreatedAt
	}
	affected, err := ormer.Engine.ID(core.PK{config.Owner, config.Name}).AllCols().Update(config)
	return affected != 0, err
}
