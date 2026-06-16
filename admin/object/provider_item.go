// Copyright 2021 The Casdoor Authors. All Rights Reserved.
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
	"fmt"
	"strings"
)

// ErrProviderLoginOrganizationUnavailable 表示 Provider 登录组织无法解析或不可用，调用方必须 fail closed。
var ErrProviderLoginOrganizationUnavailable = errors.New("provider login organization is unavailable")

type ProviderItem struct {
	Owner string `json:"owner"`
	Name  string `json:"name"`

	CanSignUp    bool      `json:"canSignUp"`
	CanSignIn    bool      `json:"canSignIn"`
	CanUnlink    bool      `json:"canUnlink"`
	BindingRule  *[]string `json:"bindingRule"`
	CountryCodes []string  `json:"countryCodes"`
	Prompted     bool      `json:"prompted"`
	SignupGroup  string    `json:"signupGroup"`
	Rule         string    `json:"rule"`
	// TargetOrganization 指定该 Provider 登录后匹配用户的组织；为空时回退 Application.Organization 以兼容旧数据。
	TargetOrganization string    `json:"targetOrganization"`
	Provider           *Provider `json:"provider"`
}

func (application *Application) GetProviderItem(providerName string) *ProviderItem {
	for _, providerItem := range application.Providers {
		if providerItem.Name == providerName ||
			(providerItem.Owner != "" && providerItem.Owner+"/"+providerItem.Name == providerName) ||
			(providerItem.Provider != nil && providerItem.Provider.Owner+"/"+providerItem.Provider.Name == providerName) {
			return providerItem
		}
	}
	return nil
}

func (application *Application) GetProviderItemByType(providerType string) *ProviderItem {
	for _, item := range application.Providers {
		if item.Provider.Type == providerType {
			return item
		}
	}
	return nil
}

// IsProviderVisibleForLogin checks application binding visibility without assuming the ProviderItem exists.
func (application *Application) IsProviderVisibleForLogin(providerName string) bool {
	if application == nil {
		return false
	}

	providerItem := application.GetProviderItem(providerName)
	return providerItem != nil && providerItem.IsProviderVisible()
}

func (pi *ProviderItem) IsProviderVisible() bool {
	if pi.Provider == nil {
		return false
	}
	return pi.Provider.Category == "OAuth" || pi.Provider.Category == "SAML" || pi.Provider.Category == "Web3"
}

func (pi *ProviderItem) isProviderPrompted() bool {
	return pi.IsProviderVisible() && pi.Prompted
}

// ResolveProviderLoginOrganization 解析 Provider 登录用户查找组织，并在组织不可用时阻断跨组织猜测。
func (application *Application) ResolveProviderLoginOrganization(providerName string, isOrganizationAvailable func(name string) (bool, error)) (string, error) {
	if application == nil {
		return "", fmt.Errorf("%w: application is nil", ErrProviderLoginOrganizationUnavailable)
	}

	targetOrganization := ""
	if providerItem := application.GetProviderItem(providerName); providerItem != nil {
		targetOrganization = strings.TrimSpace(providerItem.TargetOrganization)
	}
	if targetOrganization == "" {
		targetOrganization = strings.TrimSpace(application.Organization)
	}
	if targetOrganization == "" {
		return "", fmt.Errorf("%w: empty organization", ErrProviderLoginOrganizationUnavailable)
	}

	if isOrganizationAvailable != nil {
		ok, err := isOrganizationAvailable(targetOrganization)
		if err != nil {
			return "", err
		}
		if !ok {
			return "", fmt.Errorf("%w: %s", ErrProviderLoginOrganizationUnavailable, targetOrganization)
		}
	}

	return targetOrganization, nil
}

// ResolveProviderLoginOrganizationObject 返回 Provider 登录组织对象，供登录链路复用同一组织上下文。
func (application *Application) ResolveProviderLoginOrganizationObject(providerName string) (string, *Organization, error) {
	var resolvedOrganization *Organization
	targetOrganization, err := application.ResolveProviderLoginOrganization(providerName, func(name string) (bool, error) {
		organization, err := getOrganization("admin", name)
		if err != nil {
			return false, err
		}
		resolvedOrganization = organization
		return organization != nil, nil
	})
	if err != nil {
		return "", nil, err
	}
	return targetOrganization, resolvedOrganization, nil
}
