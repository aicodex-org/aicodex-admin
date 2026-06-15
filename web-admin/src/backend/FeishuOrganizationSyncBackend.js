// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

import * as Setting from "../Setting";

function getHeaders() {
  return {
    "Accept-Language": Setting.getAcceptLanguage(),
  };
}

export function getFeishuOrganizationSyncConfig(organization) {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/config?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function saveFeishuOrganizationSyncConfig(config) {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/config`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(Setting.deepCopy(config)),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function testFeishuOrganizationSyncConfig(config) {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/config/test`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(Setting.deepCopy(config)),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function dryRunFeishuOrganizationSyncPreview(organization) {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/dry-run-preview`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({organization}),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getFeishuOrganizationSyncDryRunHistories(organization, filters = {}) {
  const params = new URLSearchParams();
  params.set("organization", organization || "");
  ["sourceConnectionIdHash", "status", "diagnosticAlias", "createdFrom", "createdTo", "topN"].forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      params.set(key, filters[key]);
    }
  });
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/dry-run-history?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getFeishuOrganizationSyncDryRunHistory(organization, historyId) {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/dry-run-history/${encodeURIComponent(historyId)}?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getFeishuOrganizationSyncUserBindingConflicts(organization, filters = {}) {
  const params = new URLSearchParams();
  params.set("organization", organization || "");
  ["limit", "includeOk"].forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      params.set(key, filters[key]);
    }
  });
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/user-binding-conflicts?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function startFeishuOrganizationSyncRun(organization) {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/runs`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({organization}),
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getFeishuOrganizationSyncRuns(organization, page = "", pageSize = "", field = "", value = "", sortField = "", sortOrder = "") {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/runs?organization=${encodeURIComponent(organization)}&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getFeishuOrganizationSyncRun(organization, runId) {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/runs/${encodeURIComponent(runId)}?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}
