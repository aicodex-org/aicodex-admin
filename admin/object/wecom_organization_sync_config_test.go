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
	"strings"
	"testing"
	"time"
)

type memoryWecomOrganizationSyncConfigStore struct {
	config *WecomOrganizationSyncConfig
	saved  *WecomOrganizationSyncConfig
}

type fakeWecomAddressBookConnectionTester struct {
	result *WecomAddressBookConnectionTestResult
}

type memoryWecomBusinessOrganizationStore struct {
	organizations map[string]*Organization
	applications  map[string]*Application
	saved         *Organization
}

func newMemoryWecomBusinessOrganizationStore() *memoryWecomBusinessOrganizationStore {
	return &memoryWecomBusinessOrganizationStore{
		organizations: map[string]*Organization{},
		applications:  map[string]*Application{},
	}
}

func (s *memoryWecomBusinessOrganizationStore) GetOrganization(owner string, name string) (*Organization, error) {
	organization := s.organizations[owner+"/"+name]
	if organization == nil {
		return nil, nil
	}
	copied := *organization
	return &copied, nil
}

func (s *memoryWecomBusinessOrganizationStore) SaveOrganization(organization *Organization) (bool, error) {
	copied := *organization
	s.organizations[organization.Owner+"/"+organization.Name] = &copied
	s.saved = &copied
	return true, nil
}

func (s *memoryWecomBusinessOrganizationStore) GetApplication(owner string, name string) (*Application, error) {
	application := s.applications[owner+"/"+name]
	if application == nil {
		return nil, nil
	}
	copied := *application
	return &copied, nil
}

func (s *memoryWecomBusinessOrganizationStore) SaveApplication(application *Application) (bool, error) {
	copied := *application
	s.applications[application.Owner+"/"+application.Name] = &copied
	return true, nil
}

func (s *memoryWecomOrganizationSyncConfigStore) GetWecomOrganizationSyncConfigByOrganization(organization string) (*WecomOrganizationSyncConfig, error) {
	if s.config == nil || s.config.Organization != organization {
		return nil, nil
	}

	copied := *s.config
	return &copied, nil
}

func (s *memoryWecomOrganizationSyncConfigStore) SaveWecomOrganizationSyncConfig(config *WecomOrganizationSyncConfig) (bool, error) {
	copied := *config
	s.saved = &copied
	s.config = &copied
	return true, nil
}

func (t *fakeWecomAddressBookConnectionTester) TestConnection(ctx context.Context) (*WecomAddressBookConnectionTestResult, error) {
	return t.result, nil
}

func TestWecomOrganizationSyncConfigServiceGetMasksSecret(t *testing.T) {
	store := &memoryWecomOrganizationSyncConfigStore{
		config: &WecomOrganizationSyncConfig{
			Owner:             "built-in",
			Name:              "wecom-org-sync-config",
			Organization:      "built-in",
			CorpId:            "ww123",
			AddressBookSecret: "real-secret",
		},
	}
	service := &WecomOrganizationSyncConfigService{Store: store}

	config, err := service.GetConfig("built-in", true)
	if err != nil {
		t.Fatalf("GetConfig() error = %v", err)
	}

	if config.AddressBookSecret != WecomOrganizationSyncMaskedSecret {
		t.Fatalf("masked secret = %q, want %q", config.AddressBookSecret, WecomOrganizationSyncMaskedSecret)
	}
	if store.config.AddressBookSecret != "real-secret" {
		t.Fatalf("GetConfig should not mutate persisted config, got %q", store.config.AddressBookSecret)
	}
}

func TestWecomOrganizationSyncConfigServiceSavePreservesMaskedSecretAndRunMetadata(t *testing.T) {
	lastSyncedAt := time.Date(2026, 5, 20, 10, 0, 0, 0, time.UTC)
	store := &memoryWecomOrganizationSyncConfigStore{
		config: &WecomOrganizationSyncConfig{
			Owner:             "engineering",
			Name:              "wecom-org-sync-config",
			Organization:      "engineering",
			CorpId:            "ww-old",
			AddressBookSecret: "real-secret",
			IsEnabled:         true,
			LastRunId:         "run-1",
			LastSyncedAt:      lastSyncedAt,
		},
	}
	service := &WecomOrganizationSyncConfigService{Store: store}

	config, affected, err := service.SaveConfig(&WecomOrganizationSyncConfig{
		Organization:           "engineering",
		CorpId:                 "ww-new",
		AddressBookSecret:      WecomOrganizationSyncMaskedSecret,
		IsEnabled:              false,
		SoftDisableMissingData: true,
	}, true)
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}

	if !affected {
		t.Fatalf("SaveConfig() affected = false, want true")
	}
	if store.saved.Owner != "engineering" || store.saved.Name != "wecom-org-sync-config" {
		t.Fatalf("saved identity = %s/%s, want engineering/wecom-org-sync-config", store.saved.Owner, store.saved.Name)
	}
	if store.saved.AddressBookSecret != "real-secret" {
		t.Fatalf("masked incoming secret should preserve old value, got %q", store.saved.AddressBookSecret)
	}
	if store.saved.LastRunId != "run-1" || !store.saved.LastSyncedAt.Equal(lastSyncedAt) {
		t.Fatalf("config save should preserve sync metadata: %#v", store.saved)
	}
	if config.AddressBookSecret != WecomOrganizationSyncMaskedSecret {
		t.Fatalf("returned config should be masked, got %q", config.AddressBookSecret)
	}
}

func TestWecomOrganizationSyncConfigServiceSavesAndReadsScheduleSettings(t *testing.T) {
	configStore := &memoryWecomOrganizationSyncConfigStore{}
	scheduleStore := newMemoryOrganizationSyncScheduleStore()
	service := &WecomOrganizationSyncConfigService{
		Store:         configStore,
		ScheduleStore: scheduleStore,
	}

	config, _, err := service.SaveConfig(&WecomOrganizationSyncConfig{
		Organization:           "engineering",
		CorpId:                 "ww123",
		AddressBookSecret:      "real-secret",
		IsEnabled:              true,
		SoftDisableMissingData: true,
		ScheduleEnabled:        true,
		ScheduleCron:           "*/15 * * * *",
		ScheduleTimezone:       "UTC",
	}, true)
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}

	if !config.ScheduleEnabled || config.ScheduleCron != "*/15 * * * *" || config.ScheduleTimezone != "UTC" {
		t.Fatalf("returned schedule fields = enabled:%v cron:%q timezone:%q", config.ScheduleEnabled, config.ScheduleCron, config.ScheduleTimezone)
	}
	schedule := scheduleStore.schedules[organizationSyncScheduleIdentityKey(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, "engineering")]
	if schedule == nil {
		t.Fatalf("expected generic schedule to be saved")
	}
	if !schedule.IsEnabled || schedule.CronExpression != "*/15 * * * *" || schedule.Timezone != "UTC" {
		t.Fatalf("unexpected saved schedule: %#v", schedule)
	}

	readConfig, err := service.GetConfig("engineering", true)
	if err != nil {
		t.Fatalf("GetConfig() error = %v", err)
	}
	if !readConfig.ScheduleEnabled || readConfig.ScheduleCron != "*/15 * * * *" || readConfig.ScheduleTimezone != "UTC" {
		t.Fatalf("read schedule fields = enabled:%v cron:%q timezone:%q", readConfig.ScheduleEnabled, readConfig.ScheduleCron, readConfig.ScheduleTimezone)
	}
}

func TestWecomOrganizationSyncConfigServiceSaveSchedulePreservesDispatchMetadata(t *testing.T) {
	lastFireAt := time.Date(2026, 6, 9, 1, 0, 0, 0, time.UTC)
	configStore := &memoryWecomOrganizationSyncConfigStore{
		config: &WecomOrganizationSyncConfig{
			Owner:             "engineering",
			Name:              "wecom-org-sync-config",
			Organization:      "engineering",
			CorpId:            "ww123",
			AddressBookSecret: "real-secret",
			IsEnabled:         true,
		},
	}
	scheduleStore := newMemoryOrganizationSyncScheduleStore()
	existingSchedule := newEnabledOrganizationSyncSchedule("engineering", "0 2 * * *")
	existingSchedule.LastFireAt = lastFireAt
	existingSchedule.LastRunId = "run-scheduled"
	existingSchedule.LastStatus = string(OrganizationSyncScheduleFireStatusDispatched)
	_, _ = scheduleStore.SaveOrganizationSyncSchedule(existingSchedule)
	service := &WecomOrganizationSyncConfigService{
		Store:         configStore,
		ScheduleStore: scheduleStore,
	}

	_, _, err := service.SaveConfig(&WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: WecomOrganizationSyncMaskedSecret,
		IsEnabled:         true,
		ScheduleEnabled:   true,
		ScheduleCron:      "*/30 * * * *",
		ScheduleTimezone:  "UTC",
	}, true)
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}

	schedule := scheduleStore.schedules[organizationSyncScheduleIdentityKey(OrganizationSyncProviderWeCom, OrganizationSyncJobTypeFullDifferential, "engineering")]
	if schedule.LastFireAt != lastFireAt || schedule.LastRunId != "run-scheduled" || schedule.LastStatus != string(OrganizationSyncScheduleFireStatusDispatched) {
		t.Fatalf("schedule dispatch metadata should be preserved when editing settings: %#v", schedule)
	}
	if schedule.CronExpression != "*/30 * * * *" || schedule.Timezone != "UTC" {
		t.Fatalf("schedule settings should still be updated: %#v", schedule)
	}
}

func TestWecomOrganizationSyncConfigServiceSaveRetargetsBuiltInToCorpOrganization(t *testing.T) {
	corpId := "wwe7e01c69367e67bf"
	configStore := &memoryWecomOrganizationSyncConfigStore{}
	organizationStore := newMemoryWecomBusinessOrganizationStore()
	service := &WecomOrganizationSyncConfigService{
		Store:             configStore,
		OrganizationStore: organizationStore,
	}

	config, _, err := service.SaveConfig(&WecomOrganizationSyncConfig{
		Organization:           "built-in",
		CorpId:                 corpId,
		AddressBookSecret:      "secret",
		IsEnabled:              true,
		SoftDisableMissingData: false,
	}, true)
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}

	wantOrganization := GetWecomBusinessOrganizationName(corpId)
	if wantOrganization == "" || wantOrganization == "built-in" || !strings.HasPrefix(wantOrganization, "wecom-") {
		t.Fatalf("derived organization = %q, want non-built-in wecom-*", wantOrganization)
	}
	if config.Organization != wantOrganization || configStore.saved.Organization != wantOrganization || configStore.saved.Owner != wantOrganization {
		t.Fatalf("config organization = returned:%q saved:%q owner:%q, want %q", config.Organization, configStore.saved.Organization, configStore.saved.Owner, wantOrganization)
	}

	organization := organizationStore.organizations["admin/"+wantOrganization]
	if organization == nil {
		t.Fatalf("business organization %q should be created", wantOrganization)
	}
	if organization.DisplayName != GetWecomBusinessOrganizationAutoDisplayName(corpId) {
		t.Fatalf("organization display name = %q, want %q", organization.DisplayName, GetWecomBusinessOrganizationAutoDisplayName(corpId))
	}

	wantApplication := GetWecomBusinessApplicationName(corpId)
	if organization.DefaultApplication != wantApplication {
		t.Fatalf("organization default application = %q, want %q", organization.DefaultApplication, wantApplication)
	}
	application := organizationStore.applications["admin/"+wantApplication]
	if application == nil {
		t.Fatalf("business application %q should be created", wantApplication)
	}
	if application.Organization != wantOrganization {
		t.Fatalf("application organization = %q, want %q", application.Organization, wantOrganization)
	}
}

func TestWecomOrganizationSyncConfigServiceSaveRejectsMissingRequiredFields(t *testing.T) {
	service := &WecomOrganizationSyncConfigService{Store: &memoryWecomOrganizationSyncConfigStore{}}

	_, _, err := service.SaveConfig(&WecomOrganizationSyncConfig{
		Organization:      "built-in",
		AddressBookSecret: "secret",
	}, true)
	if err == nil || !strings.Contains(err.Error(), "corp_id") {
		t.Fatalf("missing corp_id error = %v", err)
	}

	_, _, err = service.SaveConfig(&WecomOrganizationSyncConfig{
		Organization:      "built-in",
		CorpId:            "ww123",
		AddressBookSecret: WecomOrganizationSyncMaskedSecret,
	}, true)
	if err == nil || !strings.Contains(err.Error(), "address_book_secret") {
		t.Fatalf("masked secret without existing config error = %v", err)
	}
}

func TestWecomOrganizationSyncConfigServiceTestConnectionPreservesMaskedSecretWithoutSaving(t *testing.T) {
	store := &memoryWecomOrganizationSyncConfigStore{
		config: &WecomOrganizationSyncConfig{
			Owner:             "built-in",
			Name:              "wecom-org-sync-config",
			Organization:      "built-in",
			CorpId:            "ww-old",
			AddressBookSecret: "real-secret",
		},
	}
	var testerCorpId string
	var testerSecret string
	service := &WecomOrganizationSyncConfigService{
		Store: store,
		NewAddressBookConnectionTester: func(corpId string, addressBookSecret string) WecomAddressBookConnectionTester {
			testerCorpId = corpId
			testerSecret = addressBookSecret
			return &fakeWecomAddressBookConnectionTester{
				result: &WecomAddressBookConnectionTestResult{
					AccessTokenOk:                      true,
					DepartmentSnapshotOk:               true,
					UserSnapshotOk:                     true,
					DepartmentLeaderFieldAvailable:     true,
					DirectLeaderFieldAvailable:         true,
					IsLeaderInDepartmentFieldAvailable: true,
				},
			}
		},
	}

	result, err := service.TestConnection(context.Background(), &WecomOrganizationSyncConfig{
		Organization:      "built-in",
		CorpId:            "ww-new",
		AddressBookSecret: WecomOrganizationSyncMaskedSecret,
	})
	if err != nil {
		t.Fatalf("TestConnection() error = %v", err)
	}

	if !result.IsReadyForOrganizationSync() {
		t.Fatalf("connection result should be ready: %#v", result)
	}
	if testerCorpId != "ww-new" || testerSecret != "real-secret" {
		t.Fatalf("tester credentials = %s/%s, want ww-new/real-secret", testerCorpId, testerSecret)
	}
	if store.saved != nil {
		t.Fatalf("connection test must not save config: %#v", store.saved)
	}
}
