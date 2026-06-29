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
	"errors"
	"strings"
	"time"

	"github.com/xorm-io/core"
)

const WecomOrganizationSyncDefaultConfigName = "wecom-org-sync-config"

// WecomOrganizationSyncConfigStore 隔离同步配置的持久化细节，便于接口层复用同一套校验和脱敏语义。
type WecomOrganizationSyncConfigStore interface {
	GetWecomOrganizationSyncConfigByOrganization(organization string) (*WecomOrganizationSyncConfig, error)
	SaveWecomOrganizationSyncConfig(config *WecomOrganizationSyncConfig) (bool, error)
}

type WecomAddressBookConnectionTester interface {
	TestConnection(ctx context.Context) (*WecomAddressBookConnectionTestResult, error)
}

// WecomOrganizationSyncConfigService 统一处理配置保存、Secret 保留和返回脱敏。
type WecomOrganizationSyncConfigService struct {
	Store                          WecomOrganizationSyncConfigStore
	FeishuConfigStore              FeishuOrganizationSyncConfigStore
	ScheduleStore                  OrganizationSyncScheduleStore
	OrganizationStore              WecomBusinessOrganizationStore
	Now                            func() time.Time
	NewAddressBookConnectionTester func(corpId string, addressBookSecret string) WecomAddressBookConnectionTester
}

type defaultWecomOrganizationSyncConfigStore struct{}

func (s *WecomOrganizationSyncConfigService) GetConfig(organization string, isMaskEnabled bool) (*WecomOrganizationSyncConfig, error) {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return nil, errors.New("wecom organization sync organization is required")
	}

	config, err := s.configStore().GetWecomOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		return nil, err
	}
	return s.attachScheduleFields(GetMaskedWecomOrganizationSyncConfig(config, isMaskEnabled))
}

func (s *WecomOrganizationSyncConfigService) GetDefaultOrganization() (string, error) {
	return getDefaultWecomOrganizationSyncOrganization(s.configStore())
}

func (s *WecomOrganizationSyncConfigService) GetSourceStatus(organization string) (*OrganizationSyncSourceConflictStatus, error) {
	defaultOrganization, err := s.GetDefaultOrganization()
	if err != nil {
		return nil, err
	}
	status := &OrganizationSyncSourceConflictStatus{DefaultOrganization: defaultOrganization}
	if defaultOrganization != "" {
		status.DefaultOrganizationSource = "configured"
	}
	feishuOrganizations, err := getConfiguredFeishuOrganizationSyncOrganizations(s.feishuConfigStore())
	if err != nil {
		return nil, err
	}
	status.ConflictingOrganizations = feishuOrganizations

	organization = strings.TrimSpace(organization)
	if organization == "" {
		organization = defaultOrganization
	}
	sourceStatus, err := (&OrganizationDirectorySourceStatusService{
		WecomConfigStore:  s.configStore(),
		FeishuConfigStore: s.feishuConfigStore(),
	}).GetStatus(organization, OrganizationDirectorySourceWeCom)
	if err != nil {
		return nil, err
	}
	status.SourceStatus = sourceStatus
	if organization == "" {
		return status, nil
	}

	config, err := s.feishuConfigStore().GetFeishuOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		return nil, err
	}
	if config != nil {
		status.ConflictingProvider = "Feishu/Lark"
		status.ConflictingOrganization = organization
		status.ConflictingConfigured = true
		status.ConflictingEnabled = config.IsEnabled
	}
	return status, nil
}

func (s *WecomOrganizationSyncConfigService) SaveConfig(config *WecomOrganizationSyncConfig, isMaskEnabled bool) (*WecomOrganizationSyncConfig, bool, error) {
	prepared, err := s.prepareConfigForSave(config)
	if err != nil {
		return nil, false, err
	}
	if err := (&OrganizationDirectorySourceStatusService{
		WecomConfigStore:  s.configStore(),
		FeishuConfigStore: s.feishuConfigStore(),
	}).RequireExecutionAllowed(prepared.Organization, OrganizationDirectorySourceWeCom); err != nil {
		return nil, false, err
	}
	schedule, hasScheduleSettings, err := s.prepareScheduleForSave(prepared.Organization, config)
	if err != nil {
		return nil, false, err
	}

	affected, err := s.configStore().SaveWecomOrganizationSyncConfig(prepared)
	if err != nil {
		return nil, false, err
	}
	if hasScheduleSettings {
		schedule, err = s.scheduleService().SaveSchedule(schedule)
		if err != nil {
			return nil, false, err
		}
	}
	masked := GetMaskedWecomOrganizationSyncConfig(prepared, isMaskEnabled)
	if hasScheduleSettings {
		attachWecomOrganizationSyncScheduleFields(masked, schedule)
		return masked, affected, nil
	}
	masked, err = s.attachScheduleFields(masked)
	return masked, affected, err
}

func (s *WecomOrganizationSyncConfigService) TestConnection(ctx context.Context, config *WecomOrganizationSyncConfig) (*WecomAddressBookConnectionTestResult, error) {
	prepared, err := s.prepareConfig(config, false)
	if err != nil {
		return nil, err
	}

	tester := s.connectionTester(prepared.CorpId, prepared.AddressBookSecret)
	return tester.TestConnection(ctx)
}

func (s *WecomOrganizationSyncConfigService) prepareConfigForSave(config *WecomOrganizationSyncConfig) (*WecomOrganizationSyncConfig, error) {
	return s.prepareConfig(config, true)
}

func (s *WecomOrganizationSyncConfigService) prepareConfig(config *WecomOrganizationSyncConfig, retargetBuiltIn bool) (*WecomOrganizationSyncConfig, error) {
	if config == nil {
		return nil, errors.New("wecom organization sync config is required")
	}

	prepared := *config
	prepared.Organization = strings.TrimSpace(prepared.Organization)
	prepared.CorpId = strings.TrimSpace(prepared.CorpId)
	prepared.AddressBookSecret = strings.TrimSpace(prepared.AddressBookSecret)

	if prepared.Organization == "" {
		return nil, errors.New("wecom organization sync organization is required")
	}
	if prepared.CorpId == "" {
		return nil, errors.New("wecom organization sync corp_id is required")
	}

	originalOrganization := prepared.Organization
	var legacyBuiltInConfig *WecomOrganizationSyncConfig
	if retargetBuiltIn && originalOrganization == "built-in" {
		var err error
		// 兼容已经误保存到 built-in 的测试配置：改绑业务组织时只借用旧 Secret，不继承旧 run 元信息。
		legacyBuiltInConfig, err = s.configStore().GetWecomOrganizationSyncConfigByOrganization(originalOrganization)
		if err != nil {
			return nil, err
		}
		businessOrganization := GetWecomBusinessOrganizationName(prepared.CorpId)
		existingBusinessConfig, err := s.configStore().GetWecomOrganizationSyncConfigByOrganization(businessOrganization)
		if err != nil {
			return nil, err
		}
		hasReusableSecret := legacyBuiltInConfig != nil && legacyBuiltInConfig.AddressBookSecret != "" && legacyBuiltInConfig.AddressBookSecret != WecomOrganizationSyncMaskedSecret ||
			existingBusinessConfig != nil && existingBusinessConfig.AddressBookSecret != "" && existingBusinessConfig.AddressBookSecret != WecomOrganizationSyncMaskedSecret
		if (prepared.AddressBookSecret == "" || prepared.AddressBookSecret == WecomOrganizationSyncMaskedSecret) && !hasReusableSecret {
			return nil, errors.New("wecom organization sync address_book_secret is required")
		}
		prepared.Organization, err = ensureWecomBusinessOrganization(s.organizationStore(), prepared.CorpId)
		if err != nil {
			return nil, err
		}
	}

	existing, err := s.configStore().GetWecomOrganizationSyncConfigByOrganization(prepared.Organization)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		prepared.Owner = existing.Owner
		prepared.Name = existing.Name
		prepared.CreatedAt = existing.CreatedAt
		prepared.LastRunId = existing.LastRunId
		prepared.LastSyncedAt = existing.LastSyncedAt
		ApplyWecomOrganizationSyncConfigSecretUpdate(existing, &prepared)
	} else {
		prepared.Owner = prepared.Organization
		prepared.Name = WecomOrganizationSyncDefaultConfigName
		if prepared.AddressBookSecret == WecomOrganizationSyncMaskedSecret && legacyBuiltInConfig != nil {
			prepared.AddressBookSecret = legacyBuiltInConfig.AddressBookSecret
		}
	}

	if prepared.AddressBookSecret == "" || prepared.AddressBookSecret == WecomOrganizationSyncMaskedSecret {
		return nil, errors.New("wecom organization sync address_book_secret is required")
	}
	// 企业微信组织同步对象的 owner 必须等于目标组织，避免跨组织配置被错误复用。
	prepared.Owner = prepared.Organization
	if prepared.Name == "" {
		prepared.Name = WecomOrganizationSyncDefaultConfigName
	}

	return &prepared, nil
}

func (s *WecomOrganizationSyncConfigService) organizationStore() WecomBusinessOrganizationStore {
	if s != nil && s.OrganizationStore != nil {
		return s.OrganizationStore
	}
	return defaultWecomBusinessOrganizationStore{}
}

func (s *WecomOrganizationSyncConfigService) configStore() WecomOrganizationSyncConfigStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultWecomOrganizationSyncConfigStore{}
}

func (s *WecomOrganizationSyncConfigService) feishuConfigStore() FeishuOrganizationSyncConfigStore {
	if s != nil && s.FeishuConfigStore != nil {
		return s.FeishuConfigStore
	}
	return defaultFeishuOrganizationSyncConfigStore{}
}

func (s *WecomOrganizationSyncConfigService) scheduleService() *OrganizationSyncScheduleService {
	if s != nil && s.ScheduleStore != nil {
		return &OrganizationSyncScheduleService{Store: s.ScheduleStore}
	}
	return &OrganizationSyncScheduleService{}
}

func (s *WecomOrganizationSyncConfigService) prepareScheduleForSave(organization string, config *WecomOrganizationSyncConfig) (*OrganizationSyncSchedule, bool, error) {
	if !hasExplicitWecomOrganizationSyncScheduleSettings(config) {
		return nil, false, nil
	}
	schedule := &OrganizationSyncSchedule{
		Provider:       OrganizationSyncProviderWeCom,
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

func (s *WecomOrganizationSyncConfigService) attachScheduleFields(config *WecomOrganizationSyncConfig) (*WecomOrganizationSyncConfig, error) {
	if config == nil {
		return nil, nil
	}
	schedule, err := s.scheduleService().GetSchedule(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, config.Organization)
	if err != nil {
		return nil, err
	}
	attachWecomOrganizationSyncScheduleFields(config, schedule)
	return config, nil
}

func hasExplicitWecomOrganizationSyncScheduleSettings(config *WecomOrganizationSyncConfig) bool {
	if config == nil {
		return false
	}
	return config.ScheduleEnabled || strings.TrimSpace(config.ScheduleCron) != "" || strings.TrimSpace(config.ScheduleTimezone) != ""
}

func attachWecomOrganizationSyncScheduleFields(config *WecomOrganizationSyncConfig, schedule *OrganizationSyncSchedule) {
	if config == nil {
		return
	}
	if schedule == nil {
		schedule = &OrganizationSyncSchedule{
			Provider:     OrganizationSyncProviderWeCom,
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

// AttachWecomOrganizationSyncScheduleFieldsForResponse 为未保存 WeCom 配置的默认响应补齐调度字段。
func AttachWecomOrganizationSyncScheduleFieldsForResponse(config *WecomOrganizationSyncConfig, schedule *OrganizationSyncSchedule) {
	attachWecomOrganizationSyncScheduleFields(config, schedule)
}

func (s *WecomOrganizationSyncConfigService) connectionTester(corpId string, addressBookSecret string) WecomAddressBookConnectionTester {
	if s != nil && s.NewAddressBookConnectionTester != nil {
		return s.NewAddressBookConnectionTester(corpId, addressBookSecret)
	}
	return NewWecomAddressBookClient(corpId, addressBookSecret)
}

func GetWecomOrganizationSyncConfigByOrganization(organization string) (*WecomOrganizationSyncConfig, error) {
	return getWecomOrganizationSyncConfigByOrganization(organization)
}

func SaveWecomOrganizationSyncConfig(config *WecomOrganizationSyncConfig) (bool, error) {
	return saveWecomOrganizationSyncConfig(config)
}

func (s defaultWecomOrganizationSyncConfigStore) GetWecomOrganizationSyncConfigByOrganization(organization string) (*WecomOrganizationSyncConfig, error) {
	return getWecomOrganizationSyncConfigByOrganization(organization)
}

func (s defaultWecomOrganizationSyncConfigStore) SaveWecomOrganizationSyncConfig(config *WecomOrganizationSyncConfig) (bool, error) {
	return saveWecomOrganizationSyncConfig(config)
}

func (s defaultWecomOrganizationSyncConfigStore) ListWecomOrganizationSyncConfigs() ([]*WecomOrganizationSyncConfig, error) {
	configs := []*WecomOrganizationSyncConfig{}
	if ormer == nil || ormer.Engine == nil {
		return configs, nil
	}
	err := ormer.Engine.Desc("is_enabled").Desc("updated_at").Find(&configs)
	return configs, err
}

// UpdateWecomOrganizationSyncConfigLastSync 只写最近成功同步元信息，不触碰 CorpId、Secret 或启用状态。
// 它是成功 run 的展示缓存；写回失败时由同步编排记录 warning，不反向改写 run 终态。
func (s defaultWecomOrganizationSyncConfigStore) UpdateWecomOrganizationSyncConfigLastSync(config *WecomOrganizationSyncConfig, run *WecomOrganizationSyncRun, syncedAt time.Time) error {
	if config == nil || run == nil {
		return nil
	}

	update := &WecomOrganizationSyncConfig{
		LastRunId:    run.Name,
		LastSyncedAt: syncedAt.UTC(),
	}
	owner := firstNonEmpty(config.Owner, config.Organization)
	name := firstNonEmpty(config.Name, WecomOrganizationSyncDefaultConfigName)
	affected, err := ormer.Engine.ID(core.PK{owner, name}).Cols("last_run_id", "last_synced_at").Update(update)
	if err != nil {
		return err
	}
	if affected != 0 || config.Organization == "" {
		return nil
	}

	// 兼容历史配置主键异常或名称调整场景，按组织维度兜底写回最近成功同步信息。
	_, err = ormer.Engine.Where("organization = ?", config.Organization).Cols("last_run_id", "last_synced_at").Update(update)
	return err
}

func getWecomOrganizationSyncConfigByOrganization(organization string) (*WecomOrganizationSyncConfig, error) {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return nil, nil
	}

	config := &WecomOrganizationSyncConfig{}
	existed, err := ormer.Engine.Where("organization = ?", organization).Get(config)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return config, nil
}

func saveWecomOrganizationSyncConfig(config *WecomOrganizationSyncConfig) (bool, error) {
	if config == nil {
		return false, nil
	}

	existing, err := getWecomOrganizationSyncConfigByOrganization(config.Organization)
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
