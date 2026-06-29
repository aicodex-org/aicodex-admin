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
	"testing"
	"time"
)

type memoryWecomOrganizationSyncConfigStore struct {
	config  *WecomOrganizationSyncConfig
	configs []*WecomOrganizationSyncConfig
	saved   *WecomOrganizationSyncConfig
	err     error
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

func (s *memoryWecomOrganizationSyncConfigStore) SaveWecomOrganizationSyncConfig(config *WecomOrganizationSyncConfig) (bool, error) {
	copied := *config
	s.saved = &copied
	s.config = &copied
	return true, nil
}

func (s *memoryWecomOrganizationSyncConfigStore) ListWecomOrganizationSyncConfigs() ([]*WecomOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	configs := []*WecomOrganizationSyncConfig{}
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

type wecomOrganizationSyncConfigStoreWithoutList struct{}

func (s *wecomOrganizationSyncConfigStoreWithoutList) GetWecomOrganizationSyncConfigByOrganization(organization string) (*WecomOrganizationSyncConfig, error) {
	return nil, nil
}

func (s *wecomOrganizationSyncConfigStoreWithoutList) SaveWecomOrganizationSyncConfig(config *WecomOrganizationSyncConfig) (bool, error) {
	return true, nil
}

type feishuOrganizationSyncConfigStoreWithoutList struct{}

func (s *feishuOrganizationSyncConfigStoreWithoutList) GetFeishuOrganizationSyncConfigByOrganization(organization string) (*FeishuOrganizationSyncConfig, error) {
	return nil, nil
}

func (s *feishuOrganizationSyncConfigStoreWithoutList) SaveFeishuOrganizationSyncConfig(config *FeishuOrganizationSyncConfig) (bool, error) {
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
	service := &WecomOrganizationSyncConfigService{
		Store:             store,
		FeishuConfigStore: &fakeFeishuConfigStore{},
	}

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

func TestWecomOrganizationSyncConfigServiceRejectsEnabledConfigWhenFeishuEnabled(t *testing.T) {
	wecomStore := &memoryWecomOrganizationSyncConfigStore{}
	feishuStore := &fakeFeishuConfigStore{config: &FeishuOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         FeishuOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppId:        "cli_a",
		AppSecret:    "feishu-secret",
		EndpointMode: FeishuEndpointModeDomestic,
		IsEnabled:    true,
	}}
	service := &WecomOrganizationSyncConfigService{
		Store:             wecomStore,
		FeishuConfigStore: feishuStore,
	}

	_, _, err := service.SaveConfig(&WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "wecom-secret",
		IsEnabled:         true,
	}, true)
	if err == nil {
		t.Fatalf("SaveConfig() error = nil, want Feishu conflict")
	}
	if !strings.Contains(err.Error(), "Feishu/Lark") || !strings.Contains(err.Error(), "engineering") {
		t.Fatalf("SaveConfig() error = %q, want Feishu conflict with organization", err.Error())
	}
	if wecomStore.saved != nil {
		t.Fatalf("conflicting enabled config should not be saved: %#v", wecomStore.saved)
	}
}

func TestWecomOrganizationSyncConfigServiceRejectsDisabledDraftWhenFeishuEnabled(t *testing.T) {
	wecomStore := &memoryWecomOrganizationSyncConfigStore{}
	feishuStore := &fakeFeishuConfigStore{config: &FeishuOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         FeishuOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppId:        "cli_a",
		AppSecret:    "feishu-secret",
		EndpointMode: FeishuEndpointModeDomestic,
		IsEnabled:    true,
	}}
	service := &WecomOrganizationSyncConfigService{
		Store:             wecomStore,
		FeishuConfigStore: feishuStore,
	}

	_, _, err := service.SaveConfig(&WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "wecom-secret",
		IsEnabled:         false,
	}, true)
	if err == nil {
		t.Fatalf("SaveConfig() error = nil, want Feishu conflict")
	}
	if !strings.Contains(err.Error(), "Feishu/Lark") || !strings.Contains(err.Error(), "engineering") {
		t.Fatalf("SaveConfig() error = %q, want Feishu conflict with organization", err.Error())
	}
	if wecomStore.saved != nil {
		t.Fatalf("conflicting disabled draft should not be saved: %#v", wecomStore.saved)
	}
}

func TestWecomOrganizationSyncConfigServiceRejectsConfigWhenFeishuConfiguredButDisabled(t *testing.T) {
	wecomStore := &memoryWecomOrganizationSyncConfigStore{}
	feishuStore := &fakeFeishuConfigStore{config: &FeishuOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         FeishuOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppId:        "cli_a",
		AppSecret:    "feishu-secret",
		EndpointMode: FeishuEndpointModeDomestic,
		IsEnabled:    false,
	}}
	service := &WecomOrganizationSyncConfigService{
		Store:             wecomStore,
		FeishuConfigStore: feishuStore,
	}

	_, _, err := service.SaveConfig(&WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "wecom-secret",
		IsEnabled:         false,
	}, true)
	if err == nil {
		t.Fatalf("SaveConfig() error = nil, want configured Feishu conflict")
	}
	if !strings.Contains(err.Error(), "Feishu/Lark") || !strings.Contains(err.Error(), "engineering") {
		t.Fatalf("SaveConfig() error = %q, want Feishu conflict with organization", err.Error())
	}
	if wecomStore.saved != nil {
		t.Fatalf("conflicting config should not be saved: %#v", wecomStore.saved)
	}
}

func TestWecomOrganizationSyncConfigServiceGetSourceStatusReturnsDefaultAndFeishuConflict(t *testing.T) {
	wecomStore := &memoryWecomOrganizationSyncConfigStore{configs: []*WecomOrganizationSyncConfig{
		{Owner: "built-in", Name: WecomOrganizationSyncDefaultConfigName, Organization: "built-in", CorpId: "ww-built-in"},
		{Owner: "engineering", Name: WecomOrganizationSyncDefaultConfigName, Organization: "engineering", CorpId: "ww123"},
	}}
	feishuStore := &fakeFeishuConfigStore{config: &FeishuOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         FeishuOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppId:        "cli_a",
		AppSecret:    "feishu-secret",
		EndpointMode: FeishuEndpointModeDomestic,
		IsEnabled:    false,
	}}
	service := &WecomOrganizationSyncConfigService{
		Store:             wecomStore,
		FeishuConfigStore: feishuStore,
	}

	status, err := service.GetSourceStatus("")
	if err != nil {
		t.Fatalf("GetSourceStatus() error = %v", err)
	}
	if status.DefaultOrganization != "engineering" || status.DefaultOrganizationSource != "configured" {
		t.Fatalf("default organization status = %#v, want engineering from configured source", status)
	}
	if !status.ConflictingConfigured || status.ConflictingProvider != "Feishu/Lark" || status.ConflictingOrganization != "engineering" {
		t.Fatalf("conflict status = %#v, want configured Feishu/Lark conflict for engineering", status)
	}
	if status.ConflictingEnabled || len(status.ConflictingOrganizations) != 1 || status.ConflictingOrganizations[0] != "engineering" {
		t.Fatalf("conflicting organizations = enabled:%v organizations:%v, want disabled engineering", status.ConflictingEnabled, status.ConflictingOrganizations)
	}
}

func TestOrganizationSyncConfigServiceGetSourceStatusHandlesEmptyAndErrors(t *testing.T) {
	status, err := (&WecomOrganizationSyncConfigService{
		Store:             &wecomOrganizationSyncConfigStoreWithoutList{},
		FeishuConfigStore: &feishuOrganizationSyncConfigStoreWithoutList{},
	}).GetSourceStatus("")
	if err != nil {
		t.Fatalf("Wecom GetSourceStatus(empty) error = %v", err)
	}
	if status.DefaultOrganization != "" || status.ConflictingConfigured {
		t.Fatalf("Wecom empty source status = %#v, want no default or conflict", status)
	}

	status, err = (&FeishuOrganizationSyncConfigService{
		Store:            &feishuOrganizationSyncConfigStoreWithoutList{},
		WecomConfigStore: &wecomOrganizationSyncConfigStoreWithoutList{},
	}).GetSourceStatus("")
	if err != nil {
		t.Fatalf("Feishu GetSourceStatus(empty) error = %v", err)
	}
	if status.DefaultOrganization != "" || status.ConflictingConfigured {
		t.Fatalf("Feishu empty source status = %#v, want no default or conflict", status)
	}

	boom := errors.New("status store failed")
	if _, err := (&WecomOrganizationSyncConfigService{
		Store:             &memoryWecomOrganizationSyncConfigStore{err: boom},
		FeishuConfigStore: &fakeFeishuConfigStore{},
	}).GetSourceStatus(""); !errors.Is(err, boom) {
		t.Fatalf("Wecom GetSourceStatus(default error) = %v, want status store failed", err)
	}
	if _, err := (&WecomOrganizationSyncConfigService{
		Store:             &memoryWecomOrganizationSyncConfigStore{},
		FeishuConfigStore: &fakeFeishuConfigStore{err: boom},
	}).GetSourceStatus("engineering"); !errors.Is(err, boom) {
		t.Fatalf("Wecom GetSourceStatus(conflict error) = %v, want status store failed", err)
	}
	if _, err := (&FeishuOrganizationSyncConfigService{
		Store:            &fakeFeishuConfigStore{err: boom},
		WecomConfigStore: &memoryWecomOrganizationSyncConfigStore{},
	}).GetSourceStatus(""); !errors.Is(err, boom) {
		t.Fatalf("Feishu GetSourceStatus(default error) = %v, want status store failed", err)
	}
	if _, err := (&FeishuOrganizationSyncConfigService{
		Store:            &fakeFeishuConfigStore{},
		WecomConfigStore: &memoryWecomOrganizationSyncConfigStore{err: boom},
	}).GetSourceStatus("engineering"); !errors.Is(err, boom) {
		t.Fatalf("Feishu GetSourceStatus(conflict error) = %v, want status store failed", err)
	}
}

func TestOrganizationDirectorySourceStatusServiceClassifiesSources(t *testing.T) {
	wecomStore := &memoryWecomOrganizationSyncConfigStore{configs: []*WecomOrganizationSyncConfig{
		{Owner: "engineering", Name: WecomOrganizationSyncDefaultConfigName, Organization: "engineering", CorpId: "ww-engineering", IsEnabled: true},
		{Owner: "sales", Name: WecomOrganizationSyncDefaultConfigName, Organization: "sales", CorpId: "ww-sales", IsEnabled: false},
	}}
	feishuStore := &fakeFeishuConfigStore{configs: []*FeishuOrganizationSyncConfig{
		{Owner: "finance", Name: FeishuOrganizationSyncDefaultConfigName, Organization: "finance", AppId: "cli-finance", AppSecret: "feishu-secret", IsEnabled: true},
		{Owner: "sales", Name: FeishuOrganizationSyncDefaultConfigName, Organization: "sales", AppId: "cli-sales", AppSecret: "feishu-secret", IsEnabled: true},
	}}
	service := &OrganizationDirectorySourceStatusService{
		WecomConfigStore:  wecomStore,
		FeishuConfigStore: feishuStore,
	}

	available, err := service.GetStatus("support", OrganizationDirectorySourceWeCom)
	if err != nil {
		t.Fatalf("GetStatus(available) error = %v", err)
	}
	if available.State != OrganizationDirectorySourceStateAvailable || len(available.Sources) != 0 {
		t.Fatalf("available status = %#v, want available with no sources", available)
	}

	owned, err := service.GetStatus("engineering", OrganizationDirectorySourceWeCom)
	if err != nil {
		t.Fatalf("GetStatus(owned) error = %v", err)
	}
	if owned.State != OrganizationDirectorySourceStateOwned || owned.OwningSource == nil || owned.OwningSource.Source != OrganizationDirectorySourceWeCom {
		t.Fatalf("owned status = %#v, want WeCom owner", owned)
	}

	occupied, err := service.GetStatus("finance", OrganizationDirectorySourceWeCom)
	if err != nil {
		t.Fatalf("GetStatus(occupied) error = %v", err)
	}
	if occupied.State != OrganizationDirectorySourceStateOccupied || occupied.OwningSource == nil || occupied.OwningSource.Source != OrganizationDirectorySourceLark {
		t.Fatalf("occupied status = %#v, want Lark owner", occupied)
	}

	ambiguous, err := service.GetStatus("sales", OrganizationDirectorySourceWeCom)
	if err != nil {
		t.Fatalf("GetStatus(ambiguous) error = %v", err)
	}
	if ambiguous.State != OrganizationDirectorySourceStateAmbiguous || len(ambiguous.Sources) != 2 {
		t.Fatalf("ambiguous status = %#v, want two sanitized sources", ambiguous)
	}
	for _, source := range ambiguous.Sources {
		if strings.Contains(source.DisplayName, "secret") || strings.Contains(source.Organization, "secret") {
			t.Fatalf("source summary leaks secret-like value: %#v", source)
		}
	}
}

func TestOrganizationDirectorySourceStatusServiceDecideExecution(t *testing.T) {
	service := &OrganizationDirectorySourceStatusService{
		WecomConfigStore: &memoryWecomOrganizationSyncConfigStore{configs: []*WecomOrganizationSyncConfig{
			{Owner: "engineering", Name: WecomOrganizationSyncDefaultConfigName, Organization: "engineering", CorpId: "ww-engineering", IsEnabled: true},
			{Owner: "sales", Name: WecomOrganizationSyncDefaultConfigName, Organization: "sales", CorpId: "ww-sales", IsEnabled: true},
		}},
		FeishuConfigStore: &fakeFeishuConfigStore{configs: []*FeishuOrganizationSyncConfig{
			{Owner: "finance", Name: FeishuOrganizationSyncDefaultConfigName, Organization: "finance", AppId: "cli-finance", AppSecret: "feishu-secret", IsEnabled: true},
			{Owner: "sales", Name: FeishuOrganizationSyncDefaultConfigName, Organization: "sales", AppId: "cli-sales", AppSecret: "feishu-secret", IsEnabled: true},
		}},
	}

	owned, err := service.DecideExecution("engineering", OrganizationDirectorySourceWeCom)
	if err != nil {
		t.Fatalf("DecideExecution(owned) error = %v", err)
	}
	if !owned.Allowed || owned.ReasonCode != "" {
		t.Fatalf("owned decision = %#v, want allowed without reason", owned)
	}

	occupied, err := service.DecideExecution("finance", OrganizationDirectorySourceWeCom)
	if err != nil {
		t.Fatalf("DecideExecution(occupied) error = %v", err)
	}
	if occupied.Allowed || occupied.ReasonCode != OrganizationDirectorySourceReasonOccupied {
		t.Fatalf("occupied decision = %#v, want source_occupied denial", occupied)
	}

	ambiguous, err := service.DecideExecution("sales", OrganizationDirectorySourceWeCom)
	if err != nil {
		t.Fatalf("DecideExecution(ambiguous) error = %v", err)
	}
	if ambiguous.Allowed || ambiguous.ReasonCode != OrganizationDirectorySourceReasonAmbiguous {
		t.Fatalf("ambiguous decision = %#v, want source_ambiguous denial", ambiguous)
	}
}

func TestOrganizationDirectorySourceStatusServiceDecisionFailsClosedWhenUnavailable(t *testing.T) {
	boom := errors.New("status store failed")
	service := &OrganizationDirectorySourceStatusService{
		WecomConfigStore: &memoryWecomOrganizationSyncConfigStore{err: boom},
	}

	decision, err := service.DecideExecution("engineering", OrganizationDirectorySourceWeCom)
	if !errors.Is(err, boom) {
		t.Fatalf("DecideExecution() error = %v, want store failure", err)
	}
	if decision == nil || decision.Allowed || decision.ReasonCode != OrganizationDirectorySourceReasonUnavailable {
		t.Fatalf("decision = %#v, want source_status_unavailable denial", decision)
	}

	err = service.RequireExecutionAllowed("engineering", OrganizationDirectorySourceWeCom)
	var decisionErr *OrganizationDirectorySourceDecisionError
	if !errors.As(err, &decisionErr) || decisionErr.ReasonCode != OrganizationDirectorySourceReasonUnavailable {
		t.Fatalf("RequireExecutionAllowed() error = %v, want source_status_unavailable decision error", err)
	}
}

func TestOrganizationDirectorySourceStatusServiceWithCurrentSummary(t *testing.T) {
	service := &OrganizationDirectorySourceStatusService{
		WecomConfigStore: &memoryWecomOrganizationSyncConfigStore{config: &WecomOrganizationSyncConfig{
			Owner:        "engineering",
			Name:         WecomOrganizationSyncDefaultConfigName,
			Organization: "engineering",
			CorpId:       "ww-engineering",
			IsEnabled:    true,
		}},
		FeishuConfigStore: &fakeFeishuConfigStore{},
	}

	ambiguous, err := service.GetStatusWithSourceSummary(" engineering ", OrganizationDirectorySourceLark, &OrganizationDirectorySourceSummary{
		Source:       "feishu",
		Organization: " engineering ",
		Configured:   true,
		Enabled:      true,
	})
	if err != nil {
		t.Fatalf("GetStatusWithSourceSummary(ambiguous) error = %v", err)
	}
	if ambiguous.State != OrganizationDirectorySourceStateAmbiguous || len(ambiguous.Sources) != 2 {
		t.Fatalf("status = %#v, want ambiguous with WeCom and Lark summaries", ambiguous)
	}

	owned, err := service.GetStatusWithSourceSummary("engineering", OrganizationDirectorySourceWeCom, &OrganizationDirectorySourceSummary{
		Source:       " wecom ",
		Organization: "engineering",
		Configured:   true,
		Enabled:      true,
	})
	if err != nil {
		t.Fatalf("GetStatusWithSourceSummary(owned) error = %v", err)
	}
	if owned.State != OrganizationDirectorySourceStateOwned || len(owned.Sources) != 1 || owned.Sources[0].Source != OrganizationDirectorySourceWeCom {
		t.Fatalf("status = %#v, want owned current WeCom source without duplicate persisted summary", owned)
	}

	decision, err := service.DecideExecutionWithSourceSummary("engineering", OrganizationDirectorySourceLark, &OrganizationDirectorySourceSummary{
		Source:       OrganizationDirectorySourceLark,
		Organization: "engineering",
		Configured:   true,
		Enabled:      true,
	})
	if err != nil {
		t.Fatalf("DecideExecutionWithSourceSummary() error = %v", err)
	}
	if decision.Allowed || decision.ReasonCode != OrganizationDirectorySourceReasonAmbiguous {
		t.Fatalf("decision = %#v, want source_ambiguous denial", decision)
	}
}

func TestOrganizationDirectorySourceDecisionErrorMessages(t *testing.T) {
	var empty *OrganizationDirectorySourceDecisionError
	if empty.Error() != "" {
		t.Fatalf("nil decision error = %q, want empty string", empty.Error())
	}

	tests := []struct {
		name       string
		err        *OrganizationDirectorySourceDecisionError
		contains   []string
		notContain string
	}{
		{
			name: "occupied with source display name",
			err: &OrganizationDirectorySourceDecisionError{
				ReasonCode:   OrganizationDirectorySourceReasonOccupied,
				Organization: "engineering",
				Source:       &OrganizationDirectorySourceSummary{DisplayName: "WeCom"},
			},
			contains: []string{"WeCom", "engineering", "create a new organization"},
		},
		{
			name:     "ambiguous",
			err:      &OrganizationDirectorySourceDecisionError{ReasonCode: OrganizationDirectorySourceReasonAmbiguous, Organization: "engineering"},
			contains: []string{"multiple configured", "engineering"},
		},
		{
			name:     "unavailable",
			err:      &OrganizationDirectorySourceDecisionError{ReasonCode: OrganizationDirectorySourceReasonUnavailable, Organization: "engineering"},
			contains: []string{"unavailable", "engineering"},
		},
		{
			name:     "unknown reason",
			err:      &OrganizationDirectorySourceDecisionError{ReasonCode: "custom_reason", Organization: "engineering"},
			contains: []string{"decision denied", "engineering"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			message := tt.err.Error()
			for _, expected := range tt.contains {
				if !strings.Contains(message, expected) {
					t.Fatalf("error = %q, want substring %q", message, expected)
				}
			}
			if tt.notContain != "" && strings.Contains(message, tt.notContain) {
				t.Fatalf("error = %q, should not contain %q", message, tt.notContain)
			}
		})
	}
}

func TestOrganizationDirectorySourceHelpersNormalizeAndCompact(t *testing.T) {
	if normalizeOrganizationDirectorySource(" Feishu ") != OrganizationDirectorySourceLark {
		t.Fatalf("Feishu alias should normalize to lark")
	}
	if normalizeOrganizationDirectorySource(" DINGTALK ") != OrganizationDirectorySourceDingTalk {
		t.Fatalf("DingTalk source should normalize case-insensitively")
	}
	if normalizeOrganizationDirectorySource(" custom ") != OrganizationDirectorySource("custom") {
		t.Fatalf("unknown source should normalize whitespace and case")
	}
	if organizationDirectorySourceDisplayName(OrganizationDirectorySourceWeCom) != "WeCom" ||
		organizationDirectorySourceDisplayName(OrganizationDirectorySourceLark) != "Feishu/Lark" ||
		organizationDirectorySourceDisplayName(OrganizationDirectorySourceDingTalk) != "DingTalk" ||
		organizationDirectorySourceDisplayName("custom") != "custom" {
		t.Fatalf("display names are not stable")
	}

	compacted := compactOrganizationDirectorySourceSummaries([]*OrganizationDirectorySourceSummary{
		nil,
		{Source: "feishu", Organization: " engineering "},
		{Source: OrganizationDirectorySourceLark, Organization: "engineering-duplicate"},
		{Source: OrganizationDirectorySourceWeCom, Organization: " "},
		{Source: OrganizationDirectorySourceDingTalk, Organization: "sales"},
	})
	if len(compacted) != 2 {
		t.Fatalf("compacted = %#v, want lark and dingtalk summaries only", compacted)
	}
	if compacted[0].Source != OrganizationDirectorySourceLark || compacted[0].Organization != "engineering" {
		t.Fatalf("first compacted summary = %#v, want normalized lark engineering", compacted[0])
	}
	if compacted[1].Source != OrganizationDirectorySourceDingTalk || compacted[1].Organization != "sales" {
		t.Fatalf("second compacted summary = %#v, want dingtalk sales", compacted[1])
	}

	if newWecomOrganizationDirectorySourceSummary(nil) != nil || newFeishuOrganizationDirectorySourceSummary(nil) != nil {
		t.Fatalf("nil configs should return nil source summaries")
	}
	wecomSummary := newWecomOrganizationDirectorySourceSummary(&WecomOrganizationSyncConfig{Organization: " engineering ", IsEnabled: true})
	feishuSummary := newFeishuOrganizationDirectorySourceSummary(&FeishuOrganizationSyncConfig{Organization: " finance ", IsEnabled: false})
	if wecomSummary.Organization != "engineering" || !wecomSummary.Enabled || wecomSummary.DisplayName != "WeCom" {
		t.Fatalf("wecom summary = %#v, want sanitized enabled summary", wecomSummary)
	}
	if feishuSummary.Organization != "finance" || feishuSummary.Enabled || feishuSummary.DisplayName != "Feishu/Lark" {
		t.Fatalf("feishu summary = %#v, want sanitized disabled summary", feishuSummary)
	}
}

func TestOrganizationDirectorySourceStatusServiceReturnsCandidateStatus(t *testing.T) {
	service := &OrganizationDirectorySourceStatusService{
		WecomConfigStore: &memoryWecomOrganizationSyncConfigStore{configs: []*WecomOrganizationSyncConfig{
			{Owner: "engineering", Name: WecomOrganizationSyncDefaultConfigName, Organization: "engineering", CorpId: "ww-engineering", IsEnabled: true},
			{Owner: "sales", Name: WecomOrganizationSyncDefaultConfigName, Organization: "sales", CorpId: "ww-sales", IsEnabled: true},
		}},
		FeishuConfigStore: &fakeFeishuConfigStore{configs: []*FeishuOrganizationSyncConfig{
			{Owner: "finance", Name: FeishuOrganizationSyncDefaultConfigName, Organization: "finance", AppId: "cli-finance", AppSecret: "feishu-secret", IsEnabled: true},
			{Owner: "sales", Name: FeishuOrganizationSyncDefaultConfigName, Organization: "sales", AppId: "cli-sales", AppSecret: "feishu-secret", IsEnabled: false},
		}},
	}

	status, err := service.GetCandidateStatus(OrganizationDirectorySourceWeCom)
	if err != nil {
		t.Fatalf("GetCandidateStatus() error = %v", err)
	}
	if status.CurrentSource != OrganizationDirectorySourceWeCom {
		t.Fatalf("current source = %q, want wecom", status.CurrentSource)
	}
	if len(status.Statuses) != 2 {
		t.Fatalf("candidate statuses = %#v, want finance occupied and sales ambiguous", status.Statuses)
	}
	states := map[string]OrganizationDirectorySourceState{}
	for _, item := range status.Statuses {
		states[item.Organization] = item.State
	}
	if states["finance"] != OrganizationDirectorySourceStateOccupied || states["sales"] != OrganizationDirectorySourceStateAmbiguous {
		t.Fatalf("candidate states = %#v, want finance occupied and sales ambiguous", states)
	}
}

func TestOrganizationSyncSourceGuardFiltersConfiguredOrganizations(t *testing.T) {
	wecomOrganizations, err := getConfiguredWecomOrganizationSyncOrganizations(&memoryWecomOrganizationSyncConfigStore{configs: []*WecomOrganizationSyncConfig{
		nil,
		{Owner: "built-in", Name: WecomOrganizationSyncDefaultConfigName, Organization: "built-in"},
		{Owner: "engineering", Name: WecomOrganizationSyncDefaultConfigName, Organization: "engineering"},
		{Owner: "engineering", Name: WecomOrganizationSyncDefaultConfigName, Organization: "engineering"},
		{Owner: "finance", Name: WecomOrganizationSyncDefaultConfigName, Organization: " finance "},
	}})
	if err != nil {
		t.Fatalf("getConfiguredWecomOrganizationSyncOrganizations() error = %v", err)
	}
	if strings.Join(wecomOrganizations, ",") != "engineering,finance" {
		t.Fatalf("wecom organizations = %#v, want engineering and finance without built-in or duplicates", wecomOrganizations)
	}

	feishuOrganizations, err := getConfiguredFeishuOrganizationSyncOrganizations(&fakeFeishuConfigStore{configs: []*FeishuOrganizationSyncConfig{
		nil,
		{Owner: "built-in", Name: FeishuOrganizationSyncDefaultConfigName, Organization: "built-in"},
		{Owner: "engineering", Name: FeishuOrganizationSyncDefaultConfigName, Organization: "engineering"},
		{Owner: "engineering", Name: FeishuOrganizationSyncDefaultConfigName, Organization: "engineering"},
		{Owner: "finance", Name: FeishuOrganizationSyncDefaultConfigName, Organization: " finance "},
	}})
	if err != nil {
		t.Fatalf("getConfiguredFeishuOrganizationSyncOrganizations() error = %v", err)
	}
	if strings.Join(feishuOrganizations, ",") != "engineering,finance" {
		t.Fatalf("feishu organizations = %#v, want engineering and finance without built-in or duplicates", feishuOrganizations)
	}
}

func TestOrganizationSyncSourceGuardHandlesStoresWithoutList(t *testing.T) {
	wecomOrganizations, err := getConfiguredWecomOrganizationSyncOrganizations(&wecomOrganizationSyncConfigStoreWithoutList{})
	if err != nil {
		t.Fatalf("getConfiguredWecomOrganizationSyncOrganizations() error = %v", err)
	}
	if len(wecomOrganizations) != 0 {
		t.Fatalf("wecom organizations = %#v, want empty list for non-lister store", wecomOrganizations)
	}

	feishuOrganizations, err := getConfiguredFeishuOrganizationSyncOrganizations(&feishuOrganizationSyncConfigStoreWithoutList{})
	if err != nil {
		t.Fatalf("getConfiguredFeishuOrganizationSyncOrganizations() error = %v", err)
	}
	if len(feishuOrganizations) != 0 {
		t.Fatalf("feishu organizations = %#v, want empty list for non-lister store", feishuOrganizations)
	}
}

func TestOrganizationSyncSourceGuardHandlesEmptyAndStoreErrors(t *testing.T) {
	if err := validateWecomOrganizationSyncSourceActivation("  ", &fakeFeishuConfigStore{}); err != nil {
		t.Fatalf("validateWecomOrganizationSyncSourceActivation(empty) error = %v", err)
	}
	if err := validateFeishuOrganizationSyncSourceActivation("  ", &memoryWecomOrganizationSyncConfigStore{}); err != nil {
		t.Fatalf("validateFeishuOrganizationSyncSourceActivation(empty) error = %v", err)
	}

	boom := errors.New("store failed")
	if err := validateWecomOrganizationSyncSourceActivation("engineering", &fakeFeishuConfigStore{err: boom}); !errors.Is(err, boom) {
		t.Fatalf("validateWecomOrganizationSyncSourceActivation() error = %v, want store failed", err)
	}
	if err := validateFeishuOrganizationSyncSourceActivation("engineering", &memoryWecomOrganizationSyncConfigStore{err: boom}); !errors.Is(err, boom) {
		t.Fatalf("validateFeishuOrganizationSyncSourceActivation() error = %v, want store failed", err)
	}
	if _, err := getConfiguredWecomOrganizationSyncOrganizations(&memoryWecomOrganizationSyncConfigStore{err: boom}); !errors.Is(err, boom) {
		t.Fatalf("getConfiguredWecomOrganizationSyncOrganizations() error = %v, want store failed", err)
	}
	if _, err := getConfiguredFeishuOrganizationSyncOrganizations(&fakeFeishuConfigStore{err: boom}); !errors.Is(err, boom) {
		t.Fatalf("getConfiguredFeishuOrganizationSyncOrganizations() error = %v, want store failed", err)
	}
	if organization, err := getDefaultWecomOrganizationSyncOrganization(&wecomOrganizationSyncConfigStoreWithoutList{}); err != nil || organization != "" {
		t.Fatalf("getDefaultWecomOrganizationSyncOrganization() = %q, %v; want empty nil", organization, err)
	}
	if organization, err := getDefaultFeishuOrganizationSyncOrganization(&feishuOrganizationSyncConfigStoreWithoutList{}); err != nil || organization != "" {
		t.Fatalf("getDefaultFeishuOrganizationSyncOrganization() = %q, %v; want empty nil", organization, err)
	}
}

func TestOrganizationSyncSourceGuardRejectsConfiguredActivation(t *testing.T) {
	err := validateWecomOrganizationSyncSourceActivation(" engineering ", &fakeFeishuConfigStore{config: &FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli-engineering",
		AppSecret:    "feishu-secret",
	}})
	var conflictErr *OrganizationSyncSourceConflictError
	if !errors.As(err, &conflictErr) || conflictErr.Provider != "Feishu/Lark" || conflictErr.Organization != "engineering" {
		t.Fatalf("validateWecomOrganizationSyncSourceActivation() error = %v, want Feishu/Lark conflict", err)
	}

	err = validateFeishuOrganizationSyncSourceActivation(" engineering ", &memoryWecomOrganizationSyncConfigStore{config: &WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww-engineering",
		AddressBookSecret: "wecom-secret",
	}})
	if !errors.As(err, &conflictErr) || conflictErr.Provider != "WeCom" || conflictErr.Organization != "engineering" {
		t.Fatalf("validateFeishuOrganizationSyncSourceActivation() error = %v, want WeCom conflict", err)
	}
}

func TestOrganizationSyncSourceConflictErrorIncludesProviderAndOrganization(t *testing.T) {
	var empty *OrganizationSyncSourceConflictError
	if empty.Error() != "" {
		t.Fatalf("nil conflict error = %q, want empty string", empty.Error())
	}

	err := (&OrganizationSyncSourceConflictError{Provider: "DingTalk", Organization: "engineering"}).Error()
	if !strings.Contains(err, "DingTalk") || !strings.Contains(err, "engineering") || !strings.Contains(err, "create a new organization") {
		t.Fatalf("conflict error = %q, want provider, organization and remediation", err)
	}
}

func TestWecomOrganizationSyncConfigServiceSavesAndReadsScheduleSettings(t *testing.T) {
	configStore := &memoryWecomOrganizationSyncConfigStore{}
	scheduleStore := newMemoryOrganizationSyncScheduleStore()
	service := &WecomOrganizationSyncConfigService{
		Store:             configStore,
		FeishuConfigStore: &fakeFeishuConfigStore{},
		ScheduleStore:     scheduleStore,
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
		Store:             configStore,
		FeishuConfigStore: &fakeFeishuConfigStore{},
		ScheduleStore:     scheduleStore,
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
		FeishuConfigStore: &fakeFeishuConfigStore{},
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
