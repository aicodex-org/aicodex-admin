// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

import * as Setting from "../Setting";

export interface FeishuOrganizationSyncConfig {
  owner?: string;
  name?: string;
  organization: string;
  appId?: string;
  appSecret?: string;
  endpointMode?: string;
  tenantKey?: string;
  isEnabled?: boolean;
  softDisableMissingData?: boolean;
  scheduleEnabled?: boolean;
  scheduleCron?: string;
  scheduleTimezone?: string;
  scheduleLastFireAt?: string;
  scheduleLastStatus?: string;
  scheduleLastErrorText?: string;
  [key: string]: unknown;
}

export interface FeishuSyncDiagnostics {
  failedStage?: string;
  failureCategory?: string;
  retryReadiness?: string;
  operatorAction?: string;
  safeSummary?: string;
  durationMs?: number;
  stats?: Record<string, number>;
  [key: string]: unknown;
}

export interface FeishuDiffCounts {
  toCreate?: number;
  toUpdate?: number;
  toSoftDisable?: number;
  unchanged?: number;
  conflict?: number;
  invalid?: number;
  [key: string]: unknown;
}

export interface FeishuOrganizationSyncRunRecord {
  id?: string;
  name?: string;
  status?: string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  triggerType?: string;
  failedStage?: string;
  failureCategory?: string;
  retryReadiness?: string;
  operatorAction?: string;
  diagnostics?: FeishuSyncDiagnostics;
  safeSummary?: string;
  errorText?: string;
  actor?: string;
  stage?: string;
  departmentCreated?: number;
  departmentUpdated?: number;
  departmentSoftDisabled?: number;
  departmentCreatedCount?: number;
  departmentUpdatedCount?: number;
  departmentDisabledCount?: number;
  userCreated?: number;
  userUpdated?: number;
  userSoftDisabled?: number;
  userCreatedCount?: number;
  userUpdatedCount?: number;
  userDisabledCount?: number;
  membershipCreated?: number;
  membershipUpdated?: number;
  membershipSoftDisabled?: number;
  membershipCreatedCount?: number;
  membershipUpdatedCount?: number;
  membershipDisabledCount?: number;
  [key: string]: unknown;
}

export interface FeishuDryRunPreviewResult {
  status?: string;
  source?: {
    appAlias?: string;
    tenantAlias?: string;
    previewedAt?: string;
  };
  snapshotStats?: {
    departmentCount?: number;
    userCount?: number;
    membershipCount?: number;
  };
  diff?: {
    departments?: FeishuDiffCounts;
    users?: FeishuDiffCounts;
    memberships?: FeishuDiffCounts;
  };
  safeSummary?: string;
  diffCounts?: Record<string, unknown>;
  reasonCounts?: Record<string, number>;
  diagnostics?: FeishuSyncDiagnostics;
  [key: string]: unknown;
}

export interface FeishuDryRunHistoryRecord {
  id?: string;
  name?: string;
  status?: string;
  createdAt?: string;
  appAlias?: string;
  tenantAlias?: string;
  diagnosticAlias?: string;
  safeSummary?: string;
  retentionDays?: number;
  redactionApplied?: boolean;
  redactionVersion?: string;
  requestMarker?: string;
  operatorHash?: string;
  reasonCounts?: Record<string, number>;
  diagnostics?: FeishuSyncDiagnostics;
  snapshotDepartmentCount?: number;
  snapshotUserCount?: number;
  snapshotMembershipCount?: number;
  departmentToCreate?: number;
  departmentToUpdate?: number;
  departmentToSoftDisable?: number;
  userToCreate?: number;
  userToUpdate?: number;
  userToSoftDisable?: number;
  membershipToCreate?: number;
  membershipToUpdate?: number;
  membershipToSoftDisable?: number;
  [key: string]: unknown;
}

export interface FeishuUserBindingConflictIssue {
  id?: string;
  type?: string;
  riskLevel?: string;
  safeSummary?: string;
  recommendedAction?: string;
  blockedReason?: string;
  sourceConnectionIdHash?: string;
  stableHashes?: Record<string, string>;
  sampleAliases?: string[];
  latestRun?: FeishuOrganizationSyncRunRecord;
  latestDryRunHistory?: FeishuDryRunHistoryRecord;
  generatedAt?: string;
  [key: string]: unknown;
}

export interface FeishuUserBindingConflictCounts {
  total?: number;
  duplicateUserIdBinding?: number;
  localUserMultiTenant?: number;
  legacyIdentifierSplit?: number;
  missingTenantKey?: number;
  endpointModeMismatch?: number;
  [key: string]: unknown;
}

export interface FeishuUserBindingConflictSummary {
  organization?: string;
  status?: string;
  riskLevel?: string;
  configured?: boolean;
  enabled?: boolean;
  endpointMode?: string;
  safeSummary?: string;
  issues?: FeishuUserBindingConflictIssue[];
  counts?: FeishuUserBindingConflictCounts;
  latestRun?: FeishuOrganizationSyncRunRecord;
  latestDryRunHistory?: FeishuDryRunHistoryRecord;
  generatedAt?: string;
  sourceConnectionIdHash?: string;
  redaction?: {
    applied?: boolean;
    version?: string;
  };
  [key: string]: unknown;
}

export interface FeishuHandoffCounts {
  departments?: FeishuDiffCounts;
  users?: FeishuDiffCounts;
  memberships?: FeishuDiffCounts;
  [key: string]: unknown;
}

export interface FeishuHandoffAcceptanceChecklistItem {
  id?: string;
  status?: string;
  source?: string;
  safeSummary?: string;
  recommendedActionAlias?: string;
  manualReviewOnly?: boolean;
  providerOwned?: boolean;
  noFallback?: boolean;
  [key: string]: unknown;
}

export interface FeishuHandoffAcceptanceChecklist {
  version?: string;
  executionMode?: string;
  manualReviewOnly?: boolean;
  summary?: Record<string, number | boolean>;
  safeSource?: Record<string, string>;
  items?: FeishuHandoffAcceptanceChecklistItem[];
  providerOwnedEvidenceMissing?: string[];
  manualReviewActions?: string[];
  cannotInfer?: string[];
  noFallback?: string[];
  retention?: {
    redactionApplied?: boolean;
    redactionVersion?: string;
    retentionDays?: number;
    retentionPolicy?: string;
  };
  redaction?: {
    version?: string;
  };
  [key: string]: unknown;
}

export interface FeishuHandoffEvidence {
  evidenceVersion?: string;
  sourceType?: string;
  readiness?: string;
  generatedAt?: string;
  safeSummary?: string;
  counts?: FeishuHandoffCounts;
  blockedReasons?: string[];
  operatorNextActions?: string[];
  cannotInfer?: string[];
  bindingConflicts?: {
    safeSummary?: string;
    blocked?: boolean;
  };
  redaction?: {
    applied?: boolean;
    version?: string;
  };
  acceptanceChecklist?: FeishuHandoffAcceptanceChecklist;
  [key: string]: unknown;
}

export interface FeishuApiResponse<T = unknown> {
  status: "ok" | "error" | string;
  msg?: string;
  data?: T;
  data2?: number;
}

export interface OrganizationSyncSourceStatus {
  defaultOrganization?: string;
  defaultOrganizationSource?: string;
  conflictingProvider?: string;
  conflictingOrganization?: string;
  conflictingConfigured?: boolean;
  conflictingEnabled?: boolean;
  conflictingOrganizations?: string[];
  sourceStatus?: import("../organizationDirectorySourceStatus").OrganizationDirectorySourceStatus;
}

export interface FeishuOrganizationSyncConfigResponse extends OrganizationSyncSourceStatus {
  organization?: string;
  isConfigured?: boolean;
  config?: FeishuOrganizationSyncConfig;
}

type QueryValue = string | number | boolean | null | undefined;
type QueryFilters = Record<string, QueryValue>;

function getHeaders(): HeadersInit {
  return {
    "Accept-Language": Setting.getAcceptLanguage(),
  };
}

function parseJson<T>(res: Response): Promise<FeishuApiResponse<T>> {
  return res.json() as Promise<FeishuApiResponse<T>>;
}

export function getFeishuOrganizationSyncConfig(organization: string): Promise<FeishuApiResponse<FeishuOrganizationSyncConfigResponse>> {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/config?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => parseJson<FeishuOrganizationSyncConfigResponse>(res));
}

export function saveFeishuOrganizationSyncConfig(config: FeishuOrganizationSyncConfig | null): Promise<FeishuApiResponse<FeishuOrganizationSyncConfigResponse>> {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/config`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(Setting.deepCopy(config)),
    headers: getHeaders(),
  }).then(res => parseJson<FeishuOrganizationSyncConfigResponse>(res));
}

export function testFeishuOrganizationSyncConfig(config: FeishuOrganizationSyncConfig | null): Promise<FeishuApiResponse<Record<string, unknown>>> {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/config/test`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(Setting.deepCopy(config)),
    headers: getHeaders(),
  }).then(res => parseJson<Record<string, unknown>>(res));
}

export function dryRunFeishuOrganizationSyncPreview(organization: string): Promise<FeishuApiResponse<FeishuDryRunPreviewResult>> {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/dry-run-preview`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({organization}),
    headers: getHeaders(),
  }).then(res => parseJson<FeishuDryRunPreviewResult>(res));
}

export function getFeishuOrganizationSyncDryRunHistories(organization: string, filters: QueryFilters = {}): Promise<FeishuApiResponse<FeishuDryRunHistoryRecord[]>> {
  const params = new URLSearchParams();
  params.set("organization", organization || "");
  ["sourceConnectionIdHash", "status", "diagnosticAlias", "createdFrom", "createdTo", "topN"].forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      params.set(key, String(filters[key]));
    }
  });
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/dry-run-history?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => parseJson<FeishuDryRunHistoryRecord[]>(res));
}

export function getFeishuOrganizationSyncDryRunHistory(organization: string, historyId: string): Promise<FeishuApiResponse<FeishuDryRunHistoryRecord>> {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/dry-run-history/${encodeURIComponent(historyId)}?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => parseJson<FeishuDryRunHistoryRecord>(res));
}

export function getFeishuOrganizationSyncUserBindingConflicts(organization: string, filters: QueryFilters = {}): Promise<FeishuApiResponse<FeishuUserBindingConflictSummary>> {
  const params = new URLSearchParams();
  params.set("organization", organization || "");
  ["limit", "includeOk"].forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      params.set(key, String(filters[key]));
    }
  });
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/user-binding-conflicts?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => parseJson<FeishuUserBindingConflictSummary>(res));
}

export function getFeishuOrganizationSyncHandoffEvidence(organization: string, filters: QueryFilters = {}): Promise<FeishuApiResponse<FeishuHandoffEvidence>> {
  const params = new URLSearchParams();
  params.set("organization", organization || "");
  ["sourceType", "sourceId"].forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      params.set(key, String(filters[key]));
    }
  });
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/handoff-evidence?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => parseJson<FeishuHandoffEvidence>(res));
}

export function startFeishuOrganizationSyncRun(organization: string): Promise<FeishuApiResponse<FeishuOrganizationSyncRunRecord>> {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/runs`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({organization}),
    headers: getHeaders(),
  }).then(res => parseJson<FeishuOrganizationSyncRunRecord>(res));
}

export function getFeishuOrganizationSyncRuns(
  organization: string,
  page: string | number = "",
  pageSize: string | number = "",
  field = "",
  value = "",
  sortField = "",
  sortOrder = ""
): Promise<FeishuApiResponse<FeishuOrganizationSyncRunRecord[]>> {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/runs?organization=${encodeURIComponent(organization)}&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => parseJson<FeishuOrganizationSyncRunRecord[]>(res));
}

export function getFeishuOrganizationSyncRun(organization: string, runId: string): Promise<FeishuApiResponse<FeishuOrganizationSyncRunRecord>> {
  return fetch(`${Setting.ServerUrl}/api/feishu-org-sync/runs/${encodeURIComponent(runId)}?organization=${encodeURIComponent(organization)}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => parseJson<FeishuOrganizationSyncRunRecord>(res));
}
