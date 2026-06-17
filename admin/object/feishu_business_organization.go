// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"errors"
	"strings"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/xorm-io/core"
)

const (
	FeishuBusinessOrganizationOwner      = "admin"
	FeishuBusinessOrganizationNamePrefix = "feishu-"
	FeishuBusinessApplicationNamePrefix  = "app-feishu-"
)

// FeishuBusinessOrganizationStore 隔离飞书/Lark 业务组织初始化，避免配置服务直接绑定 Xorm。
type FeishuBusinessOrganizationStore interface {
	GetOrganization(owner string, name string) (*Organization, error)
	SaveOrganization(organization *Organization) (bool, error)
	GetApplication(owner string, name string) (*Application, error)
	SaveApplication(application *Application) (bool, error)
}

type defaultFeishuBusinessOrganizationStore struct{}

func GetFeishuBusinessOrganizationName(sourceTenantId string) string {
	sourceTenantId = strings.TrimSpace(sourceTenantId)
	if sourceTenantId == "" {
		return ""
	}
	return boundedFeishuName(FeishuBusinessOrganizationNamePrefix, strings.ToLower(sourceTenantId), 100)
}

func GetFeishuBusinessApplicationName(sourceTenantId string) string {
	sourceTenantId = strings.TrimSpace(sourceTenantId)
	if sourceTenantId == "" {
		return ""
	}
	return boundedFeishuName(FeishuBusinessApplicationNamePrefix, strings.ToLower(sourceTenantId), 100)
}

func GetFeishuBusinessOrganizationAutoDisplayName(sourceTenantId string) string {
	name := strings.TrimPrefix(GetFeishuBusinessOrganizationName(sourceTenantId), FeishuBusinessOrganizationNamePrefix)
	if name == "" {
		return "Feishu Organization"
	}
	return "Feishu " + name
}

func ensureFeishuBusinessOrganization(store FeishuBusinessOrganizationStore, sourceTenantId string) (string, error) {
	if store == nil {
		return "", errors.New("feishu business organization store is required")
	}
	name := GetFeishuBusinessOrganizationName(sourceTenantId)
	if name == "" {
		return "", errors.New("feishu organization sync tenant_key is required")
	}
	applicationName := GetFeishuBusinessApplicationName(sourceTenantId)
	if applicationName == "" {
		return "", errors.New("feishu organization sync application name is required")
	}

	existing, err := store.GetOrganization(FeishuBusinessOrganizationOwner, name)
	if err != nil {
		return "", err
	}
	if existing != nil {
		if err := ensureFeishuBusinessApplication(store, sourceTenantId, name); err != nil {
			return "", err
		}
		if existing.DefaultApplication == "" {
			existing.DefaultApplication = applicationName
			if _, err := store.SaveOrganization(existing); err != nil {
				return "", err
			}
		}
		return name, nil
	}

	if _, err := store.SaveOrganization(newFeishuBusinessOrganization(sourceTenantId)); err != nil {
		return "", err
	}
	if err := ensureFeishuBusinessApplication(store, sourceTenantId, name); err != nil {
		return "", err
	}
	return name, nil
}

func ensureFeishuBusinessApplication(store FeishuBusinessOrganizationStore, sourceTenantId string, organizationName string) error {
	name := GetFeishuBusinessApplicationName(sourceTenantId)
	if name == "" {
		return errors.New("feishu organization sync application name is required")
	}
	existing, err := store.GetApplication(FeishuBusinessOrganizationOwner, name)
	if err != nil {
		return err
	}
	if existing != nil {
		return nil
	}
	_, err = store.SaveApplication(newFeishuBusinessApplication(sourceTenantId, organizationName))
	return err
}

func newFeishuBusinessOrganization(sourceTenantId string) *Organization {
	name := GetFeishuBusinessOrganizationName(sourceTenantId)
	return &Organization{
		Owner:              FeishuBusinessOrganizationOwner,
		Name:               name,
		CreatedTime:        util.GetCurrentTime(),
		DisplayName:        GetFeishuBusinessOrganizationAutoDisplayName(sourceTenantId),
		DefaultApplication: GetFeishuBusinessApplicationName(sourceTenantId),
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

func newFeishuBusinessApplication(sourceTenantId string, organizationName string) *Application {
	return &Application{
		Owner:                FeishuBusinessOrganizationOwner,
		Name:                 GetFeishuBusinessApplicationName(sourceTenantId),
		CreatedTime:          util.GetCurrentTime(),
		DisplayName:          GetFeishuBusinessOrganizationAutoDisplayName(sourceTenantId),
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

func (s defaultFeishuBusinessOrganizationStore) GetOrganization(owner string, name string) (*Organization, error) {
	return getOrganization(owner, name)
}

func (s defaultFeishuBusinessOrganizationStore) SaveOrganization(organization *Organization) (bool, error) {
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
	affected, err := ormer.Engine.ID(core.PK{organization.Owner, organization.Name}).AllCols().Update(organization)
	return affected != 0, err
}

func (s defaultFeishuBusinessOrganizationStore) GetApplication(owner string, name string) (*Application, error) {
	return getApplication(owner, name)
}

func (s defaultFeishuBusinessOrganizationStore) SaveApplication(application *Application) (bool, error) {
	if application == nil {
		return false, nil
	}
	existing, err := getApplication(application.Owner, application.Name)
	if err != nil {
		return false, err
	}
	if existing == nil {
		return AddApplication(application)
	}
	affected, err := ormer.Engine.ID(core.PK{application.Owner, application.Name}).AllCols().Update(application)
	return affected != 0, err
}
