// Copyright 2023 The Casdoor Authors. All Rights Reserved.
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

export function getEnforcers(owner: BackendValue, page: BackendValue = "", pageSize: BackendValue = "", field: BackendValue = "", value: BackendValue = "", sortField: BackendValue = "", sortOrder: BackendValue = "") {
  return fetch(`${Setting.ServerUrl}/api/get-enforcers?owner=${owner}&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function getEnforcer(owner: BackendValue, name: BackendValue, loadModelCfg: BackendValue = false) {
  return fetch(`${Setting.ServerUrl}/api/get-enforcer?id=${owner}/${encodeURIComponent(name)}&loadModelCfg=${loadModelCfg}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function updateEnforcer(owner: BackendValue, name: BackendValue, enforcer: BackendValue) {
  const newEnforcer = Setting.deepCopy(enforcer);
  return fetch(`${Setting.ServerUrl}/api/update-enforcer?id=${owner}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newEnforcer),
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function addEnforcer(enforcer: BackendValue) {
  const newEnforcer = Setting.deepCopy(enforcer);
  return fetch(`${Setting.ServerUrl}/api/add-enforcer`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newEnforcer),
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function deleteEnforcer(enforcer: BackendValue) {
  const newEnforcer = Setting.deepCopy(enforcer);
  return fetch(`${Setting.ServerUrl}/api/delete-enforcer`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newEnforcer),
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}
