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

function getJsonHeaders() {
  return {
    ...getHeaders(),
    "Content-Type": "application/json",
  };
}

export function getPlatformApiOrganizationMappings(organization) {
  return fetch(`${Setting.ServerUrl}/api/get-platform-api-organization-mappings?organization=${encodeURIComponent(organization || "")}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function updatePlatformApiOrganizationMapping(mapping) {
  return fetch(`${Setting.ServerUrl}/api/update-platform-api-organization-mapping`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(mapping),
    headers: getJsonHeaders(),
  }).then(res => res.json());
}

export function getPlatformApiUserMappings(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.current !== undefined && options.pageSize !== undefined) {
    query.set("p", options.current);
    query.set("pageSize", options.pageSize);
  }
  if (options.keyword) {
    query.set("keyword", options.keyword);
  }

  return fetch(`${Setting.ServerUrl}/api/get-platform-api-user-mappings?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getPlatformApiUserMappingReadiness(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.keyword) {
    query.set("keyword", options.keyword);
  }
  if (options.readinessCategory) {
    query.set("readinessCategory", options.readinessCategory);
  }
  if (options.mappingStatus) {
    query.set("mappingStatus", options.mappingStatus);
  }
  if (options.limit) {
    query.set("limit", options.limit);
  }

  return fetch(`${Setting.ServerUrl}/api/get-platform-api-user-mapping-readiness?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function updatePlatformApiUserMapping(mapping) {
  return fetch(`${Setting.ServerUrl}/api/update-platform-api-user-mapping`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(mapping),
    headers: getJsonHeaders(),
  }).then(res => res.json());
}
