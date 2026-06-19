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

export interface GroupRecord {
  owner: string;
  name: string;
  createdTime?: string;
  updatedTime?: string;
  displayName?: string;
  type?: string;
  parentId?: string;
  parentName?: string;
  users?: string[];
  children?: GroupTreeNode[];
  key?: string;
  title?: string;
  isTopGroup?: boolean;
  haveChildren?: boolean;
  isEnabled?: boolean;
  [key: string]: unknown;
}

export interface GroupTreeNode extends GroupRecord {
  key: string;
  title: string;
  children?: GroupTreeNode[];
}

export type GroupMutation = Partial<GroupRecord> & {
  owner: string;
  name: string;
};

export interface GroupResponse<T = unknown> {
  status: string;
  msg?: string;
  data?: T;
  data2?: unknown;
}

export type GroupQueryValue = string | number | boolean | readonly (string | number | boolean)[] | null | undefined;

function getHeaders(): Record<string, string> {
  return {
    "Accept-Language": Setting.getAcceptLanguage(),
  };
}

function cloneGroup(group: GroupMutation): GroupMutation {
  return Setting.deepCopy(group) as GroupMutation;
}

export function getGroups(owner: string, withTree: true, page?: GroupQueryValue, pageSize?: GroupQueryValue, field?: GroupQueryValue, value?: GroupQueryValue, sortField?: GroupQueryValue, sortOrder?: GroupQueryValue): Promise<GroupResponse<GroupTreeNode[]>>;
export function getGroups(owner?: string, withTree?: false, page?: GroupQueryValue, pageSize?: GroupQueryValue, field?: GroupQueryValue, value?: GroupQueryValue, sortField?: GroupQueryValue, sortOrder?: GroupQueryValue): Promise<GroupResponse<GroupRecord[]>>;
export function getGroups(owner?: string, withTree?: boolean, page?: GroupQueryValue, pageSize?: GroupQueryValue, field?: GroupQueryValue, value?: GroupQueryValue, sortField?: GroupQueryValue, sortOrder?: GroupQueryValue): Promise<GroupResponse<GroupRecord[] | GroupTreeNode[]>>;
export function getGroups(owner = "", withTree = false, page: GroupQueryValue = "", pageSize: GroupQueryValue = "", field: GroupQueryValue = "", value: GroupQueryValue = "", sortField: GroupQueryValue = "", sortOrder: GroupQueryValue = ""): Promise<GroupResponse<GroupRecord[] | GroupTreeNode[]>> {
  return fetch(`${Setting.ServerUrl}/api/get-groups?owner=${owner}&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}&withTree=${withTree}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getGroup(owner: string, name: string): Promise<GroupResponse<GroupRecord>> {
  return fetch(`${Setting.ServerUrl}/api/get-group?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function updateGroup(owner: string, name: string, group: GroupMutation): Promise<GroupResponse> {
  const newGroup = cloneGroup(group);
  return fetch(`${Setting.ServerUrl}/api/update-group?id=${owner}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newGroup),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function addGroup(group: GroupMutation): Promise<GroupResponse> {
  const newGroup = cloneGroup(group);
  return fetch(`${Setting.ServerUrl}/api/add-group`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newGroup),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function deleteGroup(group: GroupMutation): Promise<GroupResponse> {
  const newGroup = cloneGroup(group);
  return fetch(`${Setting.ServerUrl}/api/delete-group`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newGroup),
    headers: getHeaders(),
  }).then(res => res.json());
}
