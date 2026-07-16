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
)

// Web3WalletAuthRetiredErrorCode 是所有退役 Web3 钱包认证写入和登录尝试共用的稳定 API alias。
const Web3WalletAuthRetiredErrorCode = "PROVIDER_WEB3_WALLET_AUTH_RETIRED"

// ErrWeb3WalletAuthRetired 在退役钱包认证创建状态、重新激活 binding 或消费凭据前返回。
var ErrWeb3WalletAuthRetired = errors.New(Web3WalletAuthRetiredErrorCode)

// IsRetiredWeb3WalletProvider 同时识别规范和错配的历史 category/type 组合，
// 防止调用方把 MetaMask 或 Web3Onboard 标记成 OAuth 来绕过退役边界。
func IsRetiredWeb3WalletProvider(provider *Provider) bool {
	if provider == nil {
		return false
	}

	category := strings.TrimSpace(provider.Category)
	providerType := strings.TrimSpace(provider.Type)
	return strings.EqualFold(category, "Web3") ||
		strings.EqualFold(providerType, "MetaMask") ||
		strings.EqualFold(providerType, "Web3Onboard")
}
