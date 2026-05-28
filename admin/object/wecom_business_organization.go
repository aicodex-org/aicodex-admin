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
	"errors"
	"strings"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/xorm-io/core"
)

const (
	WecomBusinessOrganizationOwner      = "admin"
	WecomBusinessOrganizationNamePrefix = "wecom-"
	WecomBusinessApplicationNamePrefix  = "app-wecom-"
)

// WecomBusinessOrganizationStore 隔离业务组织初始化和显示名更新，避免同步服务直接绑定 Xorm。
type WecomBusinessOrganizationStore interface {
	GetOrganization(owner string, name string) (*Organization, error)
	SaveOrganization(organization *Organization) (bool, error)
	GetApplication(owner string, name string) (*Application, error)
	SaveApplication(application *Application) (bool, error)
}

type defaultWecomBusinessOrganizationStore struct{}

// GetWecomBusinessOrganizationName 根据 Corp ID 生成稳定的本地业务组织名。
// 组织名只用于 aicodex-admin 内部寻址，企业微信原始 Corp ID 仍保存在配置和映射表中。
func GetWecomBusinessOrganizationName(corpId string) string {
	corpId = strings.TrimSpace(corpId)
	if corpId == "" {
		return ""
	}
	return boundedWecomName(WecomBusinessOrganizationNamePrefix, strings.ToLower(corpId), 100)
}

// GetWecomBusinessApplicationName 根据 Corp ID 生成企业微信业务组织的默认应用名。
// 企业微信同步用户依赖该应用作为编辑、登录和后续 Provider 配置的稳定上下文。
func GetWecomBusinessApplicationName(corpId string) string {
	corpId = strings.TrimSpace(corpId)
	if corpId == "" {
		return ""
	}
	return boundedWecomName(WecomBusinessApplicationNamePrefix, strings.ToLower(corpId), 100)
}

// GetWecomBusinessOrganizationAutoDisplayName 返回自动创建组织的兜底显示名。
// 后续成功拉取企业微信根部门后，只有仍保持该兜底名的组织会被自动改名。
func GetWecomBusinessOrganizationAutoDisplayName(corpId string) string {
	name := strings.TrimPrefix(GetWecomBusinessOrganizationName(corpId), WecomBusinessOrganizationNamePrefix)
	if name == "" {
		return "WeCom Organization"
	}
	return "WeCom " + name
}

func ensureWecomBusinessOrganization(store WecomBusinessOrganizationStore, corpId string) (string, error) {
	if store == nil {
		return "", errors.New("wecom business organization store is required")
	}

	name := GetWecomBusinessOrganizationName(corpId)
	if name == "" {
		return "", errors.New("wecom organization sync corp_id is required")
	}
	applicationName := GetWecomBusinessApplicationName(corpId)
	if applicationName == "" {
		return "", errors.New("wecom organization sync application name is required")
	}

	existing, err := store.GetOrganization(WecomBusinessOrganizationOwner, name)
	if err != nil {
		return "", err
	}
	if existing != nil {
		if err := ensureWecomBusinessApplication(store, corpId, name); err != nil {
			return "", err
		}
		if existing.DefaultApplication == "" {
			// 同步用户编辑页会读取所属应用；历史已创建但无默认应用的业务组织在这里自愈。
			existing.DefaultApplication = applicationName
			if _, err := store.SaveOrganization(existing); err != nil {
				return "", err
			}
		}
		return name, nil
	}

	organization := newWecomBusinessOrganization(corpId)
	if _, err := store.SaveOrganization(organization); err != nil {
		return "", err
	}
	if err := ensureWecomBusinessApplication(store, corpId, name); err != nil {
		return "", err
	}
	return name, nil
}

func ensureWecomBusinessApplication(store WecomBusinessOrganizationStore, corpId string, organizationName string) error {
	name := GetWecomBusinessApplicationName(corpId)
	if name == "" {
		return errors.New("wecom organization sync application name is required")
	}

	existing, err := store.GetApplication(WecomBusinessOrganizationOwner, name)
	if err != nil {
		return err
	}
	if existing != nil {
		return nil
	}

	_, err = store.SaveApplication(newWecomBusinessApplication(corpId, organizationName))
	return err
}

func updateWecomBusinessOrganizationDisplayName(store WecomBusinessOrganizationStore, corpId string, displayName string) error {
	if store == nil {
		return errors.New("wecom business organization store is required")
	}

	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		return nil
	}

	name := GetWecomBusinessOrganizationName(corpId)
	if name == "" {
		return errors.New("wecom organization sync corp_id is required")
	}

	organization, err := store.GetOrganization(WecomBusinessOrganizationOwner, name)
	if err != nil {
		return err
	}
	if organization == nil {
		return nil
	}

	autoDisplayName := GetWecomBusinessOrganizationAutoDisplayName(corpId)
	if organization.DisplayName != "" && organization.DisplayName != autoDisplayName {
		// 管理员手动改过显示名时不自动覆盖，避免同步影响后台识别。
		return nil
	}
	if organization.DisplayName == displayName {
		return nil
	}

	organization.DisplayName = displayName
	_, err = store.SaveOrganization(organization)
	return err
}

func newWecomBusinessOrganization(corpId string) *Organization {
	name := GetWecomBusinessOrganizationName(corpId)
	return &Organization{
		Owner:              WecomBusinessOrganizationOwner,
		Name:               name,
		CreatedTime:        util.GetCurrentTime(),
		DisplayName:        GetWecomBusinessOrganizationAutoDisplayName(corpId),
		DefaultApplication: GetWecomBusinessApplicationName(corpId),
		WebsiteUrl:         "https://example.com",
		Favicon:            "/branding/favicon-32.png",
		PasswordType:       "bcrypt",
		PasswordOptions:    []string{"AtLeast6"},
		CountryCodes:       []string{"US", "ES", "FR", "DE", "GB", "CN", "JP", "KR", "VN", "ID", "SG", "IN"},
		DefaultAvatar:      "/branding/icon-only.svg",
		UserTypes:          []string{},
		Tags:               []string{},
		Languages:          []string{"en", "es", "fr", "de", "ja", "zh", "vi", "pt", "tr", "pl", "uk"},
		InitScore:          2000,
		AccountItems:       getBuiltInAccountItems(),
		EnableSoftDeletion: false,
		IsProfilePublic:    false,
		UseEmailAsUsername: false,
		EnableTour:         true,
		DcrPolicy:          "open",
	}
}

func newWecomBusinessApplication(corpId string, organizationName string) *Application {
	return &Application{
		Owner:                WecomBusinessOrganizationOwner,
		Name:                 GetWecomBusinessApplicationName(corpId),
		CreatedTime:          util.GetCurrentTime(),
		DisplayName:          GetWecomBusinessOrganizationAutoDisplayName(corpId),
		Category:             "Default",
		Type:                 "All",
		Scopes:               []*ScopeItem{},
		Logo:                 "/branding/logo-full-aligned.svg",
		HomepageUrl:          "https://git.leagsoft.com/aicodex/aicodex-admin",
		Organization:         organizationName,
		Cert:                 "cert-built-in",
		EnablePassword:       false,
		EnableSignUp:         false,
		EnableSigninSession:  false,
		EnableCodeSignin:     false,
		Providers:            []*ProviderItem{},
		Tags:                 []string{},
		RedirectUris:         []string{},
		GrantTypes:           []string{"authorization_code", "password", "client_credentials", "token", "id_token", "refresh_token"},
		TokenFormat:          "JWT",
		TokenFields:          []string{},
		ExpireInHours:        168,
		RefreshExpireInHours: 168,
		CookieExpireInHours:  720,
		FormOffset:           2,
	}
}

func (s defaultWecomBusinessOrganizationStore) GetOrganization(owner string, name string) (*Organization, error) {
	return getOrganization(owner, name)
}

func (s defaultWecomBusinessOrganizationStore) SaveOrganization(organization *Organization) (bool, error) {
	if organization == nil {
		return false, nil
	}

	existing, err := getOrganization(organization.Owner, organization.Name)
	if err != nil {
		return false, err
	}
	if existing == nil {
		return AddOrganization(organization)
	}
	if organization.CreatedTime == "" {
		organization.CreatedTime = existing.CreatedTime
	}

	affected, err := ormer.Engine.ID(core.PK{organization.Owner, organization.Name}).AllCols().Update(organization)
	return affected != 0, err
}

func (s defaultWecomBusinessOrganizationStore) GetApplication(owner string, name string) (*Application, error) {
	return getApplication(owner, name)
}

func (s defaultWecomBusinessOrganizationStore) SaveApplication(application *Application) (bool, error) {
	if application == nil {
		return false, nil
	}

	existing, err := getApplication(application.Owner, application.Name)
	if err != nil {
		return false, err
	}
	if existing != nil {
		return false, nil
	}
	return AddApplication(application)
}
