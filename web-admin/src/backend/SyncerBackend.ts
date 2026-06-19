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

import * as Setting from "../Setting";

// SyncerRecord 描述 legacy Syncer API 返回和提交的松散 payload；列表页只收紧当前使用字段，不改变后端契约。
export interface SyncerRecord {
  owner?: string;
  name?: string;
  createdTime?: string;
  organization?: string;
  type?: string;
  host?: string;
  port?: number | string;
  user?: string;
  password?: string;
  databaseType?: string;
  database?: string;
  table?: string;
  tableColumns?: unknown[];
  affiliationTable?: string;
  avatarBaseUrl?: string;
  syncInterval?: number | string;
  isReadOnly?: boolean;
  isEnabled?: boolean;
  [key: string]: unknown;
}

export type SyncerMutation = Partial<SyncerRecord>;

// SyncerResponse 保持历史 Casdoor 风格的 status/msg/data/data2 包装，便于 JS 编辑页继续复用同一 client。
export interface SyncerResponse<T = unknown> {
  status: string;
  msg?: string;
  data?: T;
  data2?: unknown;
}

type QueryValue = string | number | undefined | null;

function getHeaders(): Record<string, string> {
  return {
    "Accept-Language": Setting.getAcceptLanguage(),
  };
}

function cloneSyncer(syncer: SyncerMutation): SyncerMutation {
  return Setting.deepCopy(syncer) as SyncerMutation;
}

function queryValue(value: QueryValue): string | number {
  return value ?? "";
}

export function getSyncers(owner: string, organization: string, page: QueryValue = "", pageSize: QueryValue = "", field: QueryValue = "", value: QueryValue = "", sortField: QueryValue = "", sortOrder: QueryValue = ""): Promise<SyncerResponse<SyncerRecord[]>> {
  return fetch(`${Setting.ServerUrl}/api/get-syncers?owner=${owner}&organization=${organization}&p=${queryValue(page)}&pageSize=${queryValue(pageSize)}&field=${queryValue(field)}&value=${queryValue(value)}&sortField=${queryValue(sortField)}&sortOrder=${queryValue(sortOrder)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getSyncer(owner: string, name: string): Promise<SyncerResponse<SyncerRecord>> {
  return fetch(`${Setting.ServerUrl}/api/get-syncer?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function updateSyncer(owner: string, name: string, syncer: SyncerMutation): Promise<SyncerResponse<SyncerRecord>> {
  const newSyncer = cloneSyncer(syncer);
  return fetch(`${Setting.ServerUrl}/api/update-syncer?id=${owner}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newSyncer),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function addSyncer(syncer: SyncerMutation): Promise<SyncerResponse<SyncerRecord>> {
  const newSyncer = cloneSyncer(syncer);
  return fetch(`${Setting.ServerUrl}/api/add-syncer`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newSyncer),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function testSyncerDb(syncer: SyncerMutation): Promise<SyncerResponse<SyncerRecord>> {
  const newSyncer = cloneSyncer(syncer);
  return fetch(`${Setting.ServerUrl}/api/test-syncer-db`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newSyncer),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function deleteSyncer(syncer: SyncerMutation): Promise<SyncerResponse<SyncerRecord>> {
  const newSyncer = cloneSyncer(syncer);
  return fetch(`${Setting.ServerUrl}/api/delete-syncer`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newSyncer),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function runSyncer(owner: string, name: string): Promise<SyncerResponse> {
  return fetch(`${Setting.ServerUrl}/api/run-syncer?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}
