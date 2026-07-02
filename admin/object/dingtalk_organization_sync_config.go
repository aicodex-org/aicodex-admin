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

// DingTalkOrganizationSyncConfigStore 隔离钉钉同步配置持久化，便于控制器、调度器和测试复用同一套校验。
type DingTalkOrganizationSyncConfigStore interface {
	GetDingTalkOrganizationSyncConfigByOrganization(organization string) (*DingTalkOrganizationSyncConfig, error)
	SaveDingTalkOrganizationSyncConfig(config *DingTalkOrganizationSyncConfig) (bool, error)
}

// DingTalkAddressBookConnectionTester 抽象钉钉连接测试，方便配置服务在测试中替换真实客户端。
type DingTalkAddressBookConnectionTester interface {
	TestConnection(ctx context.Context) (*DingTalkAddressBookConnectionTestResult, error)
}

// DingTalkOrganizationSyncConfigService 负责钉钉同步配置校验、单来源守卫、连接测试和调度配置附加。
type DingTalkOrganizationSyncConfigService struct {
	Store                          DingTalkOrganizationSyncConfigStore
	WecomConfigStore               WecomOrganizationSyncConfigStore
	FeishuConfigStore              FeishuOrganizationSyncConfigStore
	ScheduleStore                  OrganizationSyncScheduleStore
	NewAddressBookConnectionTester func(appKey string, appSecret string) DingTalkAddressBookConnectionTester
}

type defaultDingTalkOrganizationSyncConfigStore struct{}

// GetConfig 读取目标组织钉钉配置，并按接口需要附加调度字段和 mask secret。
func (s *DingTalkOrganizationSyncConfigService) GetConfig(organization string, isMaskEnabled bool) (*DingTalkOrganizationSyncConfig, error) {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return nil, errors.New("dingtalk organization sync organization is required")
	}
	config, err := s.configStore().GetDingTalkOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		return nil, err
	}
	return s.attachScheduleFields(GetMaskedDingTalkOrganizationSyncConfig(config, isMaskEnabled))
}

// GetDefaultOrganization 返回已配置钉钉同步的默认组织，用于页面首次进入时定位目标组织。
func (s *DingTalkOrganizationSyncConfigService) GetDefaultOrganization() (string, error) {
	return getDefaultDingTalkOrganizationSyncOrganization(s.configStore())
}

// GetSourceStatus 返回钉钉页面需要的统一通讯录来源状态和候选组织占用摘要。
func (s *DingTalkOrganizationSyncConfigService) GetSourceStatus(organization string) (*OrganizationSyncSourceConflictStatus, error) {
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
	feishuOrganizations, err := getConfiguredFeishuOrganizationSyncOrganizations(s.feishuConfigStore())
	if err != nil {
		return nil, err
	}
	status.ConflictingOrganizations = append(wecomOrganizations, feishuOrganizations...)

	organization = strings.TrimSpace(organization)
	if organization == "" {
		organization = defaultOrganization
	}
	sourceStatus, err := (&OrganizationDirectorySourceStatusService{
		WecomConfigStore:    s.wecomConfigStore(),
		FeishuConfigStore:   s.feishuConfigStore(),
		DingTalkConfigStore: s.configStore(),
	}).GetStatus(organization, OrganizationDirectorySourceDingTalk)
	if err != nil {
		return nil, err
	}
	status.SourceStatus = sourceStatus
	if organization == "" {
		return status, nil
	}
	if source := firstConflictingOrganizationDirectorySource(sourceStatus, OrganizationDirectorySourceDingTalk); source != nil {
		status.ConflictingProvider = source.DisplayName
		status.ConflictingOrganization = organization
		status.ConflictingConfigured = true
		status.ConflictingEnabled = source.Enabled
	}
	return status, nil
}

// SaveConfig 校验并保存钉钉配置，同时维护通用调度配置和单来源约束。
func (s *DingTalkOrganizationSyncConfigService) SaveConfig(config *DingTalkOrganizationSyncConfig, isMaskEnabled bool) (*DingTalkOrganizationSyncConfig, bool, error) {
	prepared, err := s.prepareConfigForSave(config)
	if err != nil {
		return nil, false, err
	}
	if err := (&OrganizationDirectorySourceStatusService{
		WecomConfigStore:    s.wecomConfigStore(),
		FeishuConfigStore:   s.feishuConfigStore(),
		DingTalkConfigStore: s.configStore(),
	}).RequireExecutionAllowed(prepared.Organization, OrganizationDirectorySourceDingTalk); err != nil {
		return nil, false, err
	}
	schedule, hasScheduleSettings, err := s.prepareScheduleForSave(prepared.Organization, config)
	if err != nil {
		return nil, false, err
	}
	affected, err := s.configStore().SaveDingTalkOrganizationSyncConfig(prepared)
	if err != nil {
		return nil, false, err
	}
	if hasScheduleSettings {
		schedule, err = s.scheduleService().SaveSchedule(schedule)
		if err != nil {
			return nil, false, err
		}
	}
	masked := GetMaskedDingTalkOrganizationSyncConfig(prepared, isMaskEnabled)
	if hasScheduleSettings {
		attachDingTalkOrganizationSyncScheduleFields(masked, schedule)
		return masked, affected, nil
	}
	masked, err = s.attachScheduleFields(masked)
	return masked, affected, err
}

// TestConnection 使用待保存配置验证钉钉通讯录读取权限，不写入同步 run 或本地组织主数据。
func (s *DingTalkOrganizationSyncConfigService) TestConnection(ctx context.Context, config *DingTalkOrganizationSyncConfig) (*DingTalkAddressBookConnectionTestResult, error) {
	prepared, err := s.prepareConfig(config)
	if err != nil {
		return nil, err
	}
	if prepared.AppSecret == DingTalkOrganizationSyncMaskedSecret {
		existing, err := s.configStore().GetDingTalkOrganizationSyncConfigByOrganization(prepared.Organization)
		if err != nil {
			return nil, err
		}
		ApplyDingTalkOrganizationSyncConfigSecretUpdate(existing, prepared)
	}
	if prepared.AppSecret == "" || prepared.AppSecret == DingTalkOrganizationSyncMaskedSecret {
		return nil, errors.New("dingtalk organization sync app_secret is required")
	}
	return s.connectionTester(prepared.AppKey, prepared.AppSecret).TestConnection(ctx)
}

func (s *DingTalkOrganizationSyncConfigService) prepareConfigForSave(config *DingTalkOrganizationSyncConfig) (*DingTalkOrganizationSyncConfig, error) {
	prepared, err := s.prepareConfig(config)
	if err != nil {
		return nil, err
	}
	if prepared.Organization == "built-in" {
		return nil, errors.New("dingtalk organization sync target organization cannot be built-in")
	}
	existing, err := s.configStore().GetDingTalkOrganizationSyncConfigByOrganization(prepared.Organization)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		prepared.Owner = existing.Owner
		prepared.Name = existing.Name
		prepared.CreatedAt = existing.CreatedAt
		prepared.LastRunId = existing.LastRunId
		prepared.LastSyncedAt = existing.LastSyncedAt
		ApplyDingTalkOrganizationSyncConfigSecretUpdate(existing, prepared)
	} else {
		prepared.Owner = prepared.Organization
		prepared.Name = DingTalkOrganizationSyncDefaultConfigName
	}
	if prepared.AppSecret == "" || prepared.AppSecret == DingTalkOrganizationSyncMaskedSecret {
		return nil, errors.New("dingtalk organization sync app_secret is required")
	}
	prepared.Owner = prepared.Organization
	if prepared.Name == "" {
		prepared.Name = DingTalkOrganizationSyncDefaultConfigName
	}
	return prepared, nil
}

func (s *DingTalkOrganizationSyncConfigService) prepareConfig(config *DingTalkOrganizationSyncConfig) (*DingTalkOrganizationSyncConfig, error) {
	if config == nil {
		return nil, errors.New("dingtalk organization sync config is required")
	}
	prepared := *config
	prepared.Organization = strings.TrimSpace(prepared.Organization)
	prepared.AppKey = strings.TrimSpace(prepared.AppKey)
	prepared.AppSecret = strings.TrimSpace(prepared.AppSecret)
	if prepared.Organization == "" {
		return nil, errors.New("dingtalk organization sync organization is required")
	}
	if prepared.AppKey == "" {
		return nil, errors.New("dingtalk organization sync app_key is required")
	}
	prepared.Owner = prepared.Organization
	if prepared.Name == "" {
		prepared.Name = DingTalkOrganizationSyncDefaultConfigName
	}
	return &prepared, nil
}

func (s *DingTalkOrganizationSyncConfigService) prepareScheduleForSave(organization string, config *DingTalkOrganizationSyncConfig) (*OrganizationSyncSchedule, bool, error) {
	if !hasExplicitDingTalkOrganizationSyncScheduleSettings(config) {
		return nil, false, nil
	}
	schedule := &OrganizationSyncSchedule{
		Provider:       OrganizationSyncProviderDingTalk,
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

func (s *DingTalkOrganizationSyncConfigService) attachScheduleFields(config *DingTalkOrganizationSyncConfig) (*DingTalkOrganizationSyncConfig, error) {
	if config == nil {
		return nil, nil
	}
	schedule, err := s.scheduleService().GetSchedule(OrganizationSyncProviderDingTalk, OrganizationSyncJobTypeFullDifferential, config.Organization)
	if err != nil {
		return nil, err
	}
	attachDingTalkOrganizationSyncScheduleFields(config, schedule)
	return config, nil
}

func (s *DingTalkOrganizationSyncConfigService) scheduleService() *OrganizationSyncScheduleService {
	if s != nil && s.ScheduleStore != nil {
		return &OrganizationSyncScheduleService{Store: s.ScheduleStore}
	}
	return &OrganizationSyncScheduleService{}
}

func (s *DingTalkOrganizationSyncConfigService) configStore() DingTalkOrganizationSyncConfigStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultDingTalkOrganizationSyncConfigStore{}
}

func (s *DingTalkOrganizationSyncConfigService) wecomConfigStore() WecomOrganizationSyncConfigStore {
	if s != nil && s.WecomConfigStore != nil {
		return s.WecomConfigStore
	}
	return defaultWecomOrganizationSyncConfigStore{}
}

func (s *DingTalkOrganizationSyncConfigService) feishuConfigStore() FeishuOrganizationSyncConfigStore {
	if s != nil && s.FeishuConfigStore != nil {
		return s.FeishuConfigStore
	}
	return defaultFeishuOrganizationSyncConfigStore{}
}

func (s *DingTalkOrganizationSyncConfigService) connectionTester(appKey string, appSecret string) DingTalkAddressBookConnectionTester {
	if s != nil && s.NewAddressBookConnectionTester != nil {
		return s.NewAddressBookConnectionTester(appKey, appSecret)
	}
	return NewDingTalkAddressBookClient(appKey, appSecret)
}

func hasExplicitDingTalkOrganizationSyncScheduleSettings(config *DingTalkOrganizationSyncConfig) bool {
	return config != nil && (config.ScheduleEnabled || strings.TrimSpace(config.ScheduleCron) != "" || strings.TrimSpace(config.ScheduleTimezone) != "")
}

func attachDingTalkOrganizationSyncScheduleFields(config *DingTalkOrganizationSyncConfig, schedule *OrganizationSyncSchedule) {
	if config == nil {
		return
	}
	if schedule == nil {
		schedule = &OrganizationSyncSchedule{
			Provider:     OrganizationSyncProviderDingTalk,
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
}

// AttachDingTalkOrganizationSyncScheduleFieldsForResponse 将通用调度摘要投影到钉钉配置响应。
func AttachDingTalkOrganizationSyncScheduleFieldsForResponse(config *DingTalkOrganizationSyncConfig, schedule *OrganizationSyncSchedule) {
	attachDingTalkOrganizationSyncScheduleFields(config, schedule)
}

// GetDingTalkOrganizationSyncConfigByOrganization 读取目标组织的钉钉同步配置。
func GetDingTalkOrganizationSyncConfigByOrganization(organization string) (*DingTalkOrganizationSyncConfig, error) {
	return getDingTalkOrganizationSyncConfigByOrganization(organization)
}

// SaveDingTalkOrganizationSyncConfig 保存目标组织的钉钉同步配置。
func SaveDingTalkOrganizationSyncConfig(config *DingTalkOrganizationSyncConfig) (bool, error) {
	return saveDingTalkOrganizationSyncConfig(config)
}

func (s defaultDingTalkOrganizationSyncConfigStore) GetDingTalkOrganizationSyncConfigByOrganization(organization string) (*DingTalkOrganizationSyncConfig, error) {
	return getDingTalkOrganizationSyncConfigByOrganization(organization)
}

func (s defaultDingTalkOrganizationSyncConfigStore) SaveDingTalkOrganizationSyncConfig(config *DingTalkOrganizationSyncConfig) (bool, error) {
	return saveDingTalkOrganizationSyncConfig(config)
}

func (s defaultDingTalkOrganizationSyncConfigStore) ListDingTalkOrganizationSyncConfigs() ([]*DingTalkOrganizationSyncConfig, error) {
	configs := []*DingTalkOrganizationSyncConfig{}
	if ormer == nil || ormer.Engine == nil {
		return configs, nil
	}
	err := ormer.Engine.Desc("is_enabled").Desc("updated_at").Find(&configs)
	return configs, err
}

func (s defaultDingTalkOrganizationSyncConfigStore) UpdateDingTalkOrganizationSyncConfigLastSync(config *DingTalkOrganizationSyncConfig, run *DingTalkOrganizationSyncRun, syncedAt time.Time) error {
	if config == nil || run == nil {
		return nil
	}
	update := &DingTalkOrganizationSyncConfig{LastRunId: run.Name, LastSyncedAt: syncedAt.UTC()}
	owner := firstNonEmpty(config.Owner, config.Organization)
	name := firstNonEmpty(config.Name, DingTalkOrganizationSyncDefaultConfigName)
	affected, err := ormer.Engine.ID(core.PK{owner, name}).Cols("last_run_id", "last_synced_at").Update(update)
	if err != nil {
		return err
	}
	if affected != 0 || config.Organization == "" {
		return nil
	}
	_, err = ormer.Engine.Where("organization = ?", config.Organization).Cols("last_run_id", "last_synced_at").Update(update)
	return err
}

func getDingTalkOrganizationSyncConfigByOrganization(organization string) (*DingTalkOrganizationSyncConfig, error) {
	organization = strings.TrimSpace(organization)
	if organization == "" || ormer == nil || ormer.Engine == nil {
		return nil, nil
	}
	config := &DingTalkOrganizationSyncConfig{}
	existed, err := ormer.Engine.Where("organization = ?", organization).Get(config)
	if err != nil || !existed {
		return nil, err
	}
	return config, nil
}

func saveDingTalkOrganizationSyncConfig(config *DingTalkOrganizationSyncConfig) (bool, error) {
	if config == nil {
		return false, nil
	}
	existing, err := getDingTalkOrganizationSyncConfigByOrganization(config.Organization)
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
