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
	"fmt"
	"strings"
)

// OrganizationSyncSourceConflictError 表示目标组织已经被另一种通讯录同步来源配置占用。
type OrganizationSyncSourceConflictError struct {
	Provider     string
	Organization string
}

func (e *OrganizationSyncSourceConflictError) Error() string {
	if e == nil {
		return ""
	}
	return fmt.Sprintf("%s organization sync is already configured for organization %s; create a new organization before using another address book sync source", e.Provider, e.Organization)
}

// OrganizationSyncSourceConflictStatus 汇总当前 provider 的默认同步组织和另一来源占用状态，供接口和前端过滤组织候选项。
type OrganizationSyncSourceConflictStatus struct {
	ConflictingProvider       string   `json:"conflictingProvider,omitempty"`
	ConflictingOrganization   string   `json:"conflictingOrganization,omitempty"`
	ConflictingConfigured     bool     `json:"conflictingConfigured"`
	ConflictingEnabled        bool     `json:"conflictingEnabled"`
	ConflictingOrganizations  []string `json:"conflictingOrganizations,omitempty"`
	DefaultOrganization       string   `json:"defaultOrganization,omitempty"`
	DefaultOrganizationSource string   `json:"defaultOrganizationSource,omitempty"`
}

type wecomOrganizationSyncConfigLister interface {
	ListWecomOrganizationSyncConfigs() ([]*WecomOrganizationSyncConfig, error)
}

type feishuOrganizationSyncConfigLister interface {
	ListFeishuOrganizationSyncConfigs() ([]*FeishuOrganizationSyncConfig, error)
}

func validateWecomOrganizationSyncSourceActivation(organization string, store FeishuOrganizationSyncConfigStore) error {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return nil
	}
	if store == nil {
		store = defaultFeishuOrganizationSyncConfigStore{}
	}
	config, err := store.GetFeishuOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		return err
	}
	// 已保存的另一来源配置即表示该业务组织的通讯录主数据源已被占用，未启用草稿也不能再叠加第二套来源。
	if config != nil {
		return &OrganizationSyncSourceConflictError{Provider: "Feishu/Lark", Organization: organization}
	}
	return nil
}

func validateFeishuOrganizationSyncSourceActivation(organization string, store WecomOrganizationSyncConfigStore) error {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return nil
	}
	if store == nil {
		store = defaultWecomOrganizationSyncConfigStore{}
	}
	config, err := store.GetWecomOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		return err
	}
	// 已保存的另一来源配置即表示该业务组织的通讯录主数据源已被占用，未启用草稿也不能再叠加第二套来源。
	if config != nil {
		return &OrganizationSyncSourceConflictError{Provider: "WeCom", Organization: organization}
	}
	return nil
}

func getDefaultWecomOrganizationSyncOrganization(store WecomOrganizationSyncConfigStore) (string, error) {
	organizations, err := getConfiguredWecomOrganizationSyncOrganizations(store)
	if err != nil {
		return "", err
	}
	if len(organizations) == 0 {
		return "", nil
	}
	return organizations[0], nil
}

func getDefaultFeishuOrganizationSyncOrganization(store FeishuOrganizationSyncConfigStore) (string, error) {
	organizations, err := getConfiguredFeishuOrganizationSyncOrganizations(store)
	if err != nil {
		return "", err
	}
	if len(organizations) == 0 {
		return "", nil
	}
	return organizations[0], nil
}

func getConfiguredWecomOrganizationSyncOrganizations(store WecomOrganizationSyncConfigStore) ([]string, error) {
	if store == nil {
		store = defaultWecomOrganizationSyncConfigStore{}
	}
	lister, ok := store.(wecomOrganizationSyncConfigLister)
	if !ok {
		return nil, nil
	}
	configs, err := lister.ListWecomOrganizationSyncConfigs()
	if err != nil {
		return nil, err
	}
	organizations := []string{}
	seen := map[string]bool{}
	for _, config := range configs {
		if config == nil {
			continue
		}
		organization := strings.TrimSpace(config.Organization)
		if organization == "" || organization == "built-in" || seen[organization] {
			continue
		}
		seen[organization] = true
		organizations = append(organizations, organization)
	}
	return organizations, nil
}

func getConfiguredFeishuOrganizationSyncOrganizations(store FeishuOrganizationSyncConfigStore) ([]string, error) {
	if store == nil {
		store = defaultFeishuOrganizationSyncConfigStore{}
	}
	lister, ok := store.(feishuOrganizationSyncConfigLister)
	if !ok {
		return nil, nil
	}
	configs, err := lister.ListFeishuOrganizationSyncConfigs()
	if err != nil {
		return nil, err
	}
	organizations := []string{}
	seen := map[string]bool{}
	for _, config := range configs {
		if config == nil {
			continue
		}
		organization := strings.TrimSpace(config.Organization)
		if organization == "" || organization == "built-in" || seen[organization] {
			continue
		}
		seen[organization] = true
		organizations = append(organizations, organization)
	}
	return organizations, nil
}
