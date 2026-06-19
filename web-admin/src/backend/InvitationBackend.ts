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

export interface InvitationRecord {
  owner: string;
  name: string;
  createdTime?: string;
  updatedTime?: string;
  displayName?: string;
  code?: string;
  defaultCode?: string;
  quota?: number;
  usedCount?: number;
  application?: string;
  username?: string;
  email?: string;
  phone?: string;
  signupGroup?: string;
  state?: string;
  tag?: string;
}

export type InvitationMutation = Partial<InvitationRecord> & {
  owner: string;
  name: string;
};

export type InvitationSendDestination = string;

export interface InvitationResponse<T = unknown> {
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

function cloneInvitation(invitation: InvitationMutation): InvitationMutation {
  return Setting.deepCopy(invitation) as InvitationMutation;
}

export function getInvitations(owner: string, page: string | number = "", pageSize: string | number = "", field: string | number = "", value: string | number = "", sortField: string | number = "", sortOrder: string | number | null = ""): Promise<InvitationResponse<InvitationRecord[]>> {
  return fetch(`${Setting.ServerUrl}/api/get-invitations?owner=${owner}&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getInvitation(owner: string, name: string): Promise<InvitationResponse<InvitationRecord>> {
  return fetch(`${Setting.ServerUrl}/api/get-invitation?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getInvitationCodeInfo(code: string, applicationName: string): Promise<InvitationResponse<InvitationRecord>> {
  return fetch(`${Setting.ServerUrl}/api/get-invitation-info?code=${code}&applicationId=${encodeURIComponent(applicationName)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function updateInvitation(owner: string, name: string, invitation: InvitationMutation): Promise<InvitationResponse> {
  const newInvitation = cloneInvitation(invitation);
  return fetch(`${Setting.ServerUrl}/api/update-invitation?id=${owner}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newInvitation),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function addInvitation(invitation: InvitationMutation): Promise<InvitationResponse> {
  const newInvitation = cloneInvitation(invitation);
  return fetch(`${Setting.ServerUrl}/api/add-invitation`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newInvitation),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function deleteInvitation(invitation: InvitationMutation): Promise<InvitationResponse> {
  const newInvitation = cloneInvitation(invitation);
  return fetch(`${Setting.ServerUrl}/api/delete-invitation`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(newInvitation),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function verifyInvitation(owner: string, name: string): Promise<InvitationResponse> {
  return fetch(`${Setting.ServerUrl}/api/verify-invitation?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function sendInvitation(invitation: InvitationMutation, destinations: InvitationSendDestination[]): Promise<InvitationResponse> {
  return fetch(`${Setting.ServerUrl}/api/send-invitation?id=${invitation.owner}/${encodeURIComponent(invitation.name)}`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(destinations),
    headers: getHeaders(),
  }).then(res => res.json());
}
