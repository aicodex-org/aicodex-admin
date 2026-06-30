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
type BackendValue = import("./BackendTypes").BackendValue;

export function getCerts(owner: BackendValue, page: BackendValue = "", pageSize: BackendValue = "", field: BackendValue = "", value: BackendValue = "", sortField: BackendValue = "", sortOrder: BackendValue = "") {
  return fetch(`${Setting.ServerUrl}/api/get-certs?owner=${owner}&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function getGlobalCerts(page: BackendValue = "", pageSize: BackendValue = "", field: BackendValue = "", value: BackendValue = "", sortField: BackendValue = "", sortOrder: BackendValue = "") {
  return fetch(`${Setting.ServerUrl}/api/get-global-certs?&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function getCert(owner: BackendValue, name: BackendValue) {
  return fetch(`${Setting.ServerUrl}/api/get-cert?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function updateCert(owner: BackendValue, name: BackendValue, cert: BackendValue) {
  const newCert = Setting.deepCopy(cert);
  return fetch(`${Setting.ServerUrl}/api/update-cert?id=${owner}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newCert),
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function addCert(cert: BackendValue) {
  const newCert = Setting.deepCopy(cert);
  return fetch(`${Setting.ServerUrl}/api/add-cert`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newCert),
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function deleteCert(cert: BackendValue) {
  const newCert = Setting.deepCopy(cert);
  return fetch(`${Setting.ServerUrl}/api/delete-cert`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newCert),
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function refreshDomainExpire(owner: BackendValue, name: BackendValue) {
  return fetch(`${Setting.ServerUrl}/api/update-cert-domain-expire?id=${owner}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
  }).then(res => res.json());
}
