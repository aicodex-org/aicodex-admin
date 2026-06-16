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

function getHeaders() {
  return {
    "Accept-Language": Setting.getAcceptLanguage(),
  };
}

export function getOrganizationTreeOperationsDiagnostics(organization, filters = {}) {
  const params = new URLSearchParams();
  params.set("organization", organization);
  ["query", "lifecycleStatus", "sourceConnectionStatus", "freshness", "readModelSource"].forEach(key => {
    if (filters[key]) {
      params.set(key, filters[key]);
    }
  });

  return fetch(`${Setting.ServerUrl}/api/organization-tree-operations/diagnostics?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getOrganizationTreeOperationsMembers(organization, departmentId, page = 1, pageSize = 10) {
  const params = new URLSearchParams();
  params.set("organization", organization);
  params.set("departmentId", departmentId);
  params.set("page", page);
  params.set("pageSize", pageSize);

  return fetch(`${Setting.ServerUrl}/api/organization-tree-operations/members?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function refreshOrganizationTreeOperations(organization, triggerType) {
  return fetch(`${Setting.ServerUrl}/api/organization-tree-operations/refresh`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({organization, triggerType}),
    headers: getHeaders(),
  }).then(res => res.json());
}
