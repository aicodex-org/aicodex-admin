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

// 这些类型镜像组织树运营 API 的只读展示契约；字段保持可选以兼容旧部署缺省诊断元数据的响应。
export type OrganizationTreeOperationsFilters = {
  query?: string;
  lifecycleStatus?: string;
  sourceConnectionStatus?: string;
  freshness?: string;
  readModelSource?: string;
};

export type OrganizationTreeOperationsLineage = {
  batchId?: string;
  digest?: string;
  lastSeenBatchId?: string;
  readModelSource?: string;
  sourceConnectionId?: string;
  sourceOrgVersion?: string;
};

export type OrganizationTreeOperationsMemberSummary = {
  memberCount?: number;
  activeMemberCount?: number;
  disabledMemberCount?: number;
  conflictedMemberCount?: number;
  mappingIssueCount?: number;
  staleMemberCount?: number;
};

export type OrganizationTreeOperationsNode = {
  departmentId: string;
  departmentName?: string;
  departmentPath?: string;
  parentDepartmentId?: string;
  lifecycleStatus?: string;
  sourceType?: string;
  sourceConnectionId?: string;
  sourceConnectionStatus?: string;
  sourceConnectionFreshness?: string;
  visibilitySource?: string;
  readModelSource?: string;
  lineage?: OrganizationTreeOperationsLineage;
  memberSummary?: OrganizationTreeOperationsMemberSummary;
};

export type OrganizationTreeOperationsDiagnosticItem = {
  subjectType?: string;
  subjectId?: string;
  displayName?: string;
  reason?: string;
  lifecycleStatus?: string;
  mappingStatus?: string;
  sourceType?: string;
  freshness?: string;
  readModelSource?: string;
};

export type OrganizationTreeOperationsMember = {
  stableSubjectId: string;
  displayName?: string;
  departmentId?: string;
  lifecycleStatus?: string;
  mappingStatus?: string;
  sourceType?: string;
  sourceConnectionId?: string;
  readModelSource?: string;
  freshness?: string;
  reason?: string;
  isMain?: boolean;
  lineage?: OrganizationTreeOperationsLineage;
};

export type OrganizationTreeOperationsSourceConnection = {
  sourceConnectionId?: string;
  sourceType?: string;
  status?: string;
  freshness?: string;
  lastSeenBatchId?: string;
  configured?: boolean;
};

export type OrganizationTreeOperationsSummary = {
  totalPlatformDepartmentCount?: number;
  visibleNodeCount?: number;
  filteredNodeCount?: number;
  diagnosticItemCount?: number;
  orgVersion?: string;
  scopeVersion?: string;
  freshness?: string;
  generatedAt?: string;
  readModelSource?: string;
  mappingStatus?: string;
  lifecycleStatus?: string;
};

export type OrganizationTreeOperationsSyncBatch = {
  batchId?: string;
  status?: string;
  orgVersion?: string;
  freshness?: string;
};

export type OrganizationTreeOperationsDiagnostics = {
  organization?: string;
  status?: string;
  reason?: string;
  emptyTreeClass?: string;
  summary?: OrganizationTreeOperationsSummary;
  nodes?: OrganizationTreeOperationsNode[];
  diagnostics?: OrganizationTreeOperationsDiagnosticItem[];
  sourceConnections?: OrganizationTreeOperationsSourceConnection[];
  latestSyncBatch?: OrganizationTreeOperationsSyncBatch;
  lineage?: OrganizationTreeOperationsLineage;
};

export type OrganizationTreeOperationsMembersResponse = {
  organization?: string;
  departmentId?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  members?: OrganizationTreeOperationsMember[];
};

export type OrganizationTreeOperationsRefreshResponse = {
  status?: string;
  diagnostics?: OrganizationTreeOperationsDiagnostics;
};

export type OrganizationTreeOperationsApiResponse<T> = {
  status?: string;
  msg?: string;
  data?: T;
};

function getHeaders(): HeadersInit {
  return {
    "Accept-Language": Setting.getAcceptLanguage(),
  };
}

export function getOrganizationTreeOperationsDiagnostics(
  organization: string,
  filters: OrganizationTreeOperationsFilters = {}
): Promise<OrganizationTreeOperationsApiResponse<OrganizationTreeOperationsDiagnostics>> {
  const params = new URLSearchParams();
  params.set("organization", organization);
  (["query", "lifecycleStatus", "sourceConnectionStatus", "freshness", "readModelSource"] as const).forEach(key => {
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

export function getOrganizationTreeOperationsMembers(
  organization: string,
  departmentId: string,
  page = 1,
  pageSize = 10
): Promise<OrganizationTreeOperationsApiResponse<OrganizationTreeOperationsMembersResponse>> {
  const params = new URLSearchParams();
  params.set("organization", organization);
  params.set("departmentId", departmentId);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  return fetch(`${Setting.ServerUrl}/api/organization-tree-operations/members?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function refreshOrganizationTreeOperations(
  organization: string,
  triggerType: string
): Promise<OrganizationTreeOperationsApiResponse<OrganizationTreeOperationsRefreshResponse>> {
  return fetch(`${Setting.ServerUrl}/api/organization-tree-operations/refresh`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({organization, triggerType}),
    headers: getHeaders(),
  }).then(res => res.json());
}
