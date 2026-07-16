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

// validateRetiredWeb3WalletProviderBindings 只从服务端持有的记录解析 Provider 身份；
// 请求内嵌的 Provider 数据可能伪造 category/type，因此有意忽略。
func validateRetiredWeb3WalletProviderBindings(oldApplication, application *Application) error {
	if application == nil || len(application.Providers) == 0 {
		return nil
	}

	providerMap, err := getProviderMap(application.Organization)
	if err != nil {
		return err
	}

	oldBindings := map[string]*ProviderItem{}
	if oldApplication != nil {
		for _, providerItem := range oldApplication.Providers {
			if providerItem != nil {
				oldBindings[providerItem.Name] = providerItem
			}
		}
	}

	for _, providerItem := range application.Providers {
		if providerItem == nil {
			continue
		}
		provider := providerMap[providerItem.Name]
		if !IsRetiredWeb3WalletProvider(provider) {
			continue
		}
		if oldBindings[providerItem.Name] == nil || providerItem.CanSignIn || providerItem.CanSignUp || providerItem.Prompted {
			return ErrWeb3WalletAuthRetired
		}
	}

	return nil
}
