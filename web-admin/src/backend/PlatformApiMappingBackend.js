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

export function getOrganizationMasterDataQualityReadiness(organization) {
  return fetch(`${Setting.ServerUrl}/api/get-organization-master-data-quality-readiness?organization=${encodeURIComponent(organization || "")}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getOrganizationDirectoryQuality(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.entityType) {
    query.set("entityType", options.entityType);
  }
  if (options.keyword) {
    query.set("keyword", options.keyword);
  }
  if (options.sourceType) {
    query.set("sourceType", options.sourceType);
  }
  if (options.sourceConnectionIdHash) {
    query.set("sourceConnectionIdHash", options.sourceConnectionIdHash);
  }
  if (options.qualityStatus) {
    query.set("qualityStatus", options.qualityStatus);
  }
  if (options.reasonCode) {
    query.set("reasonCode", options.reasonCode);
  }
  if (options.lifecycleStatus) {
    query.set("lifecycleStatus", options.lifecycleStatus);
  }
  if (options.current !== undefined && options.pageSize !== undefined) {
    query.set("p", options.current);
    query.set("pageSize", options.pageSize);
  }

  return fetch(`${Setting.ServerUrl}/api/organization-master-data-quality/directory?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getOrganizationDirectoryRemediationPlan(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.entityType) {
    query.set("entityType", options.entityType);
  }
  if (options.keyword) {
    query.set("keyword", options.keyword);
  }
  if (options.sourceType) {
    query.set("sourceType", options.sourceType);
  }
  if (options.sourceConnectionIdHash) {
    query.set("sourceConnectionIdHash", options.sourceConnectionIdHash);
  }
  if (options.qualityStatus) {
    query.set("qualityStatus", options.qualityStatus);
  }
  if (options.reasonCode) {
    query.set("reasonCode", options.reasonCode);
  }
  if (options.lifecycleStatus) {
    query.set("lifecycleStatus", options.lifecycleStatus);
  }
  if (options.limit) {
    query.set("limit", options.limit);
  }
  if (options.topN) {
    query.set("topN", options.topN);
  }

  return fetch(`${Setting.ServerUrl}/api/organization-master-data-quality/remediation-plan?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getOrganizationDirectoryRemediationActionDrafts(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.actionAlias) {
    query.set("actionAlias", options.actionAlias);
  }
  if (options.entityType) {
    query.set("entityType", options.entityType);
  }
  if (options.keyword) {
    query.set("keyword", options.keyword);
  }
  if (options.sourceType) {
    query.set("sourceType", options.sourceType);
  }
  if (options.sourceConnectionIdHash) {
    query.set("sourceConnectionIdHash", options.sourceConnectionIdHash);
  }
  if (options.qualityStatus) {
    query.set("qualityStatus", options.qualityStatus);
  }
  if (options.reasonCode) {
    query.set("reasonCode", options.reasonCode);
  }
  if (options.limit) {
    query.set("limit", options.limit);
  }
  if (options.topN) {
    query.set("topN", options.topN);
  }

  return fetch(`${Setting.ServerUrl}/api/organization-master-data-quality/remediation-action-drafts?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getOrganizationDirectoryRemediationPreflight(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.draftId) {
    query.set("draftId", options.draftId);
  }
  if (options.actionAlias) {
    query.set("actionAlias", options.actionAlias);
  }
  if (options.entityType) {
    query.set("entityType", options.entityType);
  }
  if (options.keyword) {
    query.set("keyword", options.keyword);
  }
  if (options.sourceType) {
    query.set("sourceType", options.sourceType);
  }
  if (options.sourceConnectionIdHash) {
    query.set("sourceConnectionIdHash", options.sourceConnectionIdHash);
  }
  if (options.qualityStatus) {
    query.set("qualityStatus", options.qualityStatus);
  }
  if (options.reasonCode) {
    query.set("reasonCode", options.reasonCode);
  }
  if (options.limit) {
    query.set("limit", options.limit);
  }
  if (options.topN) {
    query.set("topN", options.topN);
  }

  return fetch(`${Setting.ServerUrl}/api/organization-master-data-quality/remediation-preflight?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function publishGatewayProjectionManually(organization, options = {}) {
  return fetch(`${Setting.ServerUrl}/api/gateway-projection/manual-publish`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
      organizationId: organization || "",
      traceId: options.traceId || "",
      reason: options.reason || "operator-manual-publish",
    }),
    headers: getJsonHeaders(),
  }).then(res => res.json());
}

export function getGatewayProjectionPublishAttempts(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.source) {
    query.set("source", options.source);
  }
  if (options.status) {
    query.set("status", options.status);
  }
  if (options.failureCategory) {
    query.set("failureCategory", options.failureCategory);
  }
  if (options.from) {
    query.set("from", options.from);
  }
  if (options.to) {
    query.set("to", options.to);
  }
  if (options.limit) {
    query.set("limit", options.limit);
  }

  return fetch(`${Setting.ServerUrl}/api/gateway-projection/publish-attempts?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getGatewayProjectionPublishAttempt(organization, attemptId) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");

  return fetch(`${Setting.ServerUrl}/api/gateway-projection/publish-attempts/${encodeURIComponent(attemptId || "")}?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getGatewayProjectionPublishAttemptRetentionReadiness(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.source) {
    query.set("source", options.source);
  }
  if (options.status) {
    query.set("status", options.status);
  }
  if (options.failureCategory) {
    query.set("failureCategory", options.failureCategory);
  }
  if (options.from) {
    query.set("from", options.from);
  }
  if (options.to) {
    query.set("to", options.to);
  }
  if (options.limit) {
    query.set("limit", options.limit);
  }

  return fetch(`${Setting.ServerUrl}/api/gateway-projection/publish-attempt-retention-readiness?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getGatewayProjectionPublishAttemptCleanupDryRun(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.source) {
    query.set("source", options.source);
  }
  if (options.status) {
    query.set("status", options.status);
  }
  if (options.failureCategory) {
    query.set("failureCategory", options.failureCategory);
  }
  if (options.olderThan) {
    query.set("olderThan", options.olderThan);
  }
  if (options.limit) {
    query.set("limit", options.limit);
  }

  return fetch(`${Setting.ServerUrl}/api/gateway-projection/publish-attempt-retention-cleanup-dry-run?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getGatewayProjectionPublishAttemptCleanupExecuteReadiness(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.source) {
    query.set("source", options.source);
  }
  if (options.status) {
    query.set("status", options.status);
  }
  if (options.failureCategory) {
    query.set("failureCategory", options.failureCategory);
  }
  if (options.olderThan) {
    query.set("olderThan", options.olderThan);
  }
  if (options.dryRunGeneratedAt) {
    query.set("dryRunGeneratedAt", options.dryRunGeneratedAt);
  }
  if (options.maxDryRunAgeSeconds) {
    query.set("maxDryRunAgeSeconds", options.maxDryRunAgeSeconds);
  }
  if (options.approvalEvidence) {
    query.set("approvalEvidence", options.approvalEvidence);
  }
  if (options.limit) {
    query.set("limit", options.limit);
  }

  return fetch(`${Setting.ServerUrl}/api/gateway-projection/publish-attempt-retention-cleanup-execute-readiness?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getGatewayProjectionRunReadiness(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.traceId) {
    query.set("traceId", options.traceId);
  }
  if (options.projectionBatchId) {
    query.set("projectionBatchId", options.projectionBatchId);
  }

  return fetch(`${Setting.ServerUrl}/api/gateway-projection/run-readiness?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getGatewayProjectionIngestionStatus(organization, options = {}) {
  const query = new URLSearchParams();
  query.set("organization", organization || "");
  if (options.latest !== undefined) {
    query.set("latest", String(!!options.latest));
  }
  if (options.projectionBatchId) {
    query.set("projectionBatchId", options.projectionBatchId);
  }
  if (options.orgVersion) {
    query.set("orgVersion", options.orgVersion);
  }
  if (options.sourceVersion) {
    query.set("sourceVersion", options.sourceVersion);
  }

  return fetch(`${Setting.ServerUrl}/api/gateway-projection/ingestion-status?${query.toString()}`, {
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
