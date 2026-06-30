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
type BackendValue = import("./BackendTypes").BackendValue;

function getHeaders() {
  return {
    "Accept-Language": Setting.getAcceptLanguage(),
  };
}

export function getWecomOrganizationSyncConfig(organization: BackendValue) {
  return fetch(`${Setting.ServerUrl}/api/wecom-org-sync/config?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function saveWecomOrganizationSyncConfig(config: BackendValue) {
  const newConfig = Setting.deepCopy(config);
  return fetch(`${Setting.ServerUrl}/api/wecom-org-sync/config`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newConfig),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function testWecomOrganizationSyncConfig(config: BackendValue) {
  const newConfig = Setting.deepCopy(config);
  return fetch(`${Setting.ServerUrl}/api/wecom-org-sync/config/test`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newConfig),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function dryRunWecomOrganizationSyncPreview(organization: BackendValue) {
  return fetch(`${Setting.ServerUrl}/api/wecom-org-sync/dry-run-preview`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({organization}),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getWecomOrganizationSyncDryRunHistories(organization: BackendValue, filters: BackendValue = {}) {
  const params = new URLSearchParams();
  params.set("organization", organization || "");
  ["sourceConnectionIdHash", "status", "diagnosticAlias", "createdFrom", "createdTo", "topN"].forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      params.set(key, filters[key]);
    }
  });
  return fetch(`${Setting.ServerUrl}/api/wecom-org-sync/dry-run-history?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getWecomOrganizationSyncDryRunHistory(organization: BackendValue, historyId: BackendValue) {
  return fetch(`${Setting.ServerUrl}/api/wecom-org-sync/dry-run-history/${encodeURIComponent(historyId)}?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function startWecomOrganizationSyncRun(organization: BackendValue) {
  return fetch(`${Setting.ServerUrl}/api/wecom-org-sync/runs`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({organization}),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getWecomOrganizationSyncRuns(organization: BackendValue, page: BackendValue = "", pageSize: BackendValue = "", field: BackendValue = "", value: BackendValue = "", sortField: BackendValue = "", sortOrder: BackendValue = "") {
  return fetch(`${Setting.ServerUrl}/api/wecom-org-sync/runs?organization=${encodeURIComponent(organization)}&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getWecomOrganizationSyncRun(organization: BackendValue, runId: BackendValue) {
  return fetch(`${Setting.ServerUrl}/api/wecom-org-sync/runs/${encodeURIComponent(runId)}?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}
