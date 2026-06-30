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
import * as Conf from "../Conf";
type BackendValue = import("./BackendTypes").BackendValue;

export function getResources(owner: BackendValue, user: BackendValue, page: BackendValue = "", pageSize: BackendValue = "", field: BackendValue = "", value: BackendValue = "", sortField: BackendValue = "", sortOrder: BackendValue = "") {
  return fetch(`${Setting.ServerUrl}/api/get-resources?owner=${owner}&user=${user}&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function getResource(owner: BackendValue, name: BackendValue) {
  return fetch(`${Setting.ServerUrl}/api/get-resource?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function updateResource(owner: BackendValue, name: BackendValue, resource: BackendValue) {
  const newResource = Setting.deepCopy(resource);
  return fetch(`${Setting.ServerUrl}/api/update-resource?id=${owner}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newResource),
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function addResource(resource: BackendValue) {
  const newResource = Setting.deepCopy(resource);
  return fetch(`${Setting.ServerUrl}/api/add-resource`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newResource),
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function deleteResource(resource: BackendValue, provider: BackendValue = "") {
  const newResource = Setting.deepCopy(resource);
  return fetch(`${Setting.ServerUrl}/api/delete-resource?provider=${provider}`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newResource),
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}

export function uploadResource(owner: BackendValue, user: BackendValue, tag: BackendValue, parent: BackendValue, fullFilePath: BackendValue, file: Blob, application: BackendValue = Conf.DefaultApplication, provider: BackendValue = "") {
  application = application || Conf.DefaultApplication;
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${Setting.ServerUrl}/api/upload-resource?owner=${owner}&user=${user}&application=${application}&tag=${tag}&parent=${parent}&fullFilePath=${encodeURIComponent(fullFilePath)}&provider=${provider}`, {
    body: formData,
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => res.json());
}
