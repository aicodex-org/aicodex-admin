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

import * as Setting from "../Setting";

export interface OrganizationSyncApiKeyRecord {
  owner?: string;
  name?: string;
  displayName?: string;
  organization?: string;
  keyPrefix?: string;
  expireTime?: string;
  state?: string;
  // 仅创建或轮换响应会带一次性明文；列表响应不应包含该字段。
  secret?: string;
  lastUsedTime?: string;
  lastUsedIp?: string;
  lastUsedUserAgent?: string;
  createdBy?: string;
}

export type OrganizationSyncApiKeyMutation = Partial<OrganizationSyncApiKeyRecord>;

export interface OrganizationSyncApiKeyResponse<T = unknown> {
  status: string;
  msg?: string;
  data?: T;
  data2?: unknown;
}

function getHeaders(): Record<string, string> {
  return {
    "Accept-Language": Setting.getAcceptLanguage(),
  };
}

function cloneKey(key: OrganizationSyncApiKeyMutation): OrganizationSyncApiKeyMutation {
  return Setting.deepCopy(key) as OrganizationSyncApiKeyMutation;
}

export function getOrganizationSyncApiKeys(organization = ""): Promise<OrganizationSyncApiKeyResponse<OrganizationSyncApiKeyRecord[]>> {
  return fetch(`${Setting.ServerUrl}/api/organization-sync-api-keys?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function addOrganizationSyncApiKey(key: OrganizationSyncApiKeyMutation): Promise<OrganizationSyncApiKeyResponse<OrganizationSyncApiKeyRecord>> {
  const newKey = cloneKey(key);
  return fetch(`${Setting.ServerUrl}/api/organization-sync-api-keys`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newKey),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function rotateOrganizationSyncApiKey(key: OrganizationSyncApiKeyMutation): Promise<OrganizationSyncApiKeyResponse<OrganizationSyncApiKeyRecord>> {
  const newKey = cloneKey(key);
  return fetch(`${Setting.ServerUrl}/api/organization-sync-api-keys/rotate`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newKey),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function disableOrganizationSyncApiKey(key: OrganizationSyncApiKeyMutation): Promise<OrganizationSyncApiKeyResponse<OrganizationSyncApiKeyRecord>> {
  const newKey = cloneKey(key);
  return fetch(`${Setting.ServerUrl}/api/organization-sync-api-keys/disable`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newKey),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function deleteOrganizationSyncApiKey(key: OrganizationSyncApiKeyMutation): Promise<OrganizationSyncApiKeyResponse<OrganizationSyncApiKeyRecord>> {
  const newKey = cloneKey(key);
  return fetch(`${Setting.ServerUrl}/api/organization-sync-api-keys/delete`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newKey),
    headers: getHeaders(),
  }).then(res => res.json());
}
