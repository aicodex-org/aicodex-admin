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
import type {OrganizationDirectorySourceStatus} from "../organizationDirectorySourceStatus";

export interface DingTalkOrganizationSyncConfig {
  owner?: string;
  name?: string;
  organization: string;
  appKey?: string;
  appSecret?: string;
  isEnabled?: boolean;
  softDisableMissingData?: boolean;
  scheduleEnabled?: boolean;
  scheduleCron?: string;
  scheduleTimezone?: string;
  scheduleLastFireAt?: string;
  scheduleLastStatus?: string;
  scheduleLastErrorText?: string;
}

export interface DingTalkOrganizationSyncRunRecord {
  name?: string;
  status?: string;
  stage?: string;
  triggerType?: string;
  actor?: string;
  startedAt?: string;
  finishedAt?: string;
  departmentCreatedCount?: number;
  departmentUpdatedCount?: number;
  departmentDisabledCount?: number;
  userCreatedCount?: number;
  userUpdatedCount?: number;
  userDisabledCount?: number;
  membershipUpdatedCount?: number;
  membershipDisabledCount?: number;
  departmentLeaderUpdatedCount?: number;
  departmentLeaderDisabledCount?: number;
  directLeaderUpdatedCount?: number;
  directLeaderDisabledCount?: number;
  errorText?: string;
}

export interface DingTalkOrganizationSyncConnectionTestResult {
  accessTokenOk?: boolean;
  departmentSnapshotOk?: boolean;
  userSnapshotOk?: boolean;
  departmentCount?: number;
  userCount?: number;
  missingFields?: string[];
}

export interface DingTalkOrganizationSyncSourceStatus {
  defaultOrganization?: string;
  defaultOrganizationSource?: string;
  conflictingProvider?: string;
  conflictingOrganization?: string;
  conflictingConfigured?: boolean;
  conflictingEnabled?: boolean;
  conflictingOrganizations?: string[];
  sourceStatus?: OrganizationDirectorySourceStatus;
}

export interface DingTalkOrganizationSyncConfigResponse extends DingTalkOrganizationSyncSourceStatus {
  organization?: string;
  isConfigured?: boolean;
  config?: DingTalkOrganizationSyncConfig;
}

export interface DingTalkApiResponse<T = unknown> {
  status: "ok" | "error" | string;
  msg?: string;
  data?: T;
  data2?: number;
}

function getHeaders(): HeadersInit {
  return {
    "Accept-Language": Setting.getAcceptLanguage(),
  };
}

function parseJson<T>(res: Response): Promise<DingTalkApiResponse<T>> {
  return res.json() as Promise<DingTalkApiResponse<T>>;
}

export function getDingTalkOrganizationSyncConfig(organization: string): Promise<DingTalkApiResponse<DingTalkOrganizationSyncConfigResponse>> {
  return fetch(`${Setting.ServerUrl}/api/dingtalk-org-sync/config?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => parseJson<DingTalkOrganizationSyncConfigResponse>(res));
}

export function saveDingTalkOrganizationSyncConfig(config: DingTalkOrganizationSyncConfig | null): Promise<DingTalkApiResponse<DingTalkOrganizationSyncConfigResponse>> {
  return fetch(`${Setting.ServerUrl}/api/dingtalk-org-sync/config`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(Setting.deepCopy(config)),
    headers: getHeaders(),
  }).then(res => parseJson<DingTalkOrganizationSyncConfigResponse>(res));
}

export function testDingTalkOrganizationSyncConfig(config: DingTalkOrganizationSyncConfig | null): Promise<DingTalkApiResponse<DingTalkOrganizationSyncConnectionTestResult>> {
  return fetch(`${Setting.ServerUrl}/api/dingtalk-org-sync/config/test`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(Setting.deepCopy(config)),
    headers: getHeaders(),
  }).then(res => parseJson<DingTalkOrganizationSyncConnectionTestResult>(res));
}

export function startDingTalkOrganizationSyncRun(organization: string): Promise<DingTalkApiResponse<DingTalkOrganizationSyncRunRecord>> {
  return fetch(`${Setting.ServerUrl}/api/dingtalk-org-sync/runs`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({organization}),
    headers: getHeaders(),
  }).then(res => parseJson<DingTalkOrganizationSyncRunRecord>(res));
}

export function getDingTalkOrganizationSyncRuns(
  organization: string,
  page: string | number = "",
  pageSize: string | number = "",
  field = "",
  value = "",
  sortField = "",
  sortOrder = ""
): Promise<DingTalkApiResponse<DingTalkOrganizationSyncRunRecord[]>> {
  return fetch(`${Setting.ServerUrl}/api/dingtalk-org-sync/runs?organization=${encodeURIComponent(organization)}&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => parseJson<DingTalkOrganizationSyncRunRecord[]>(res));
}

export function getDingTalkOrganizationSyncRun(organization: string, runId: string): Promise<DingTalkApiResponse<DingTalkOrganizationSyncRunRecord>> {
  return fetch(`${Setting.ServerUrl}/api/dingtalk-org-sync/runs/${encodeURIComponent(runId)}?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => parseJson<DingTalkOrganizationSyncRunRecord>(res));
}
