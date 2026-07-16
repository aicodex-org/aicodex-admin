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

/** 退役判断只消费 copy-safe 的 Provider category/type，不接收 endpoint、token 或钱包地址。 */
export interface Web3WalletProviderIdentity {
  category?: string | null;
  type?: string | null;
}

function normalizedIdentity(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

/** 同时识别规范和错配的历史钱包认证 Provider，避免通过重标 category/type 绕过退役边界。 */
export function isRetiredWeb3WalletProvider(provider: Web3WalletProviderIdentity | null | undefined): boolean {
  const category = normalizedIdentity(provider?.category);
  const providerType = normalizedIdentity(provider?.type);
  return category === "web3" || providerType === "metamask" || providerType === "web3onboard";
}

type RetiredWeb3TokenStorage = Pick<Storage, "length" | "key" | "removeItem">;

/** 只按固定前缀删除历史钱包 token 条目，不读取或解析凭据值。 */
export function clearRetiredWeb3WalletAuthTokens(storage: RetiredWeb3TokenStorage = window.localStorage): void {
  const retiredKeys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith("Web3AuthToken_")) {
      retiredKeys.push(key);
    }
  }
  retiredKeys.forEach(key => storage.removeItem(key));
}
