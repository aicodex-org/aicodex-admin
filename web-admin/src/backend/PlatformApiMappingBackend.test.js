/* eslint-env jest */

import {
  getGatewayProjectionIngestionStatus,
  getGatewayProjectionPublishAttempt,
  getGatewayProjectionPublishAttemptCleanupDryRun,
  getGatewayProjectionPublishAttemptCleanupExecuteReadiness,
  getGatewayProjectionPublishAttemptRetentionReadiness,
  getGatewayProjectionPublishAttempts,
  getGatewayProjectionRunReadiness,
  getOrganizationDirectoryQuality,
  getOrganizationDirectoryRemediationActionDrafts,
  getOrganizationDirectoryRemediationApprovalPacketAudit,
  getOrganizationDirectoryRemediationApprovalPreview,
  getOrganizationDirectoryRemediationPlan,
  getOrganizationDirectoryRemediationPreflight,
  getOrganizationMasterDataQualityReadiness,
  getPlatformApiOrganizationMappings,
  getPlatformApiUserMappingReadiness,
  getPlatformApiUserMappings,
  publishGatewayProjectionManually,
  updatePlatformApiOrganizationMapping,
  updatePlatformApiUserMapping
} from "./PlatformApiMappingBackend";

jest.mock("../Setting", () => ({
  ServerUrl: "https://admin.example.invalid",
  getAcceptLanguage: () => "en",
}));

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  }));
});

afterEach(() => {
  jest.resetAllMocks();
});

test("loads platform api mappings with explicit organization query", async() => {
  await getPlatformApiOrganizationMappings("org-a");
  await getPlatformApiUserMappings("org-a", {current: 2, pageSize: 20, keyword: "alice"});
  await getPlatformApiUserMappingReadiness("org-a", {
    keyword: "alice",
    readinessCategory: "mapping_missing",
    mappingStatus: "CONFIRMED",
    limit: 20,
  });
  await getGatewayProjectionRunReadiness("org-a", {
    traceId: "trace-synthetic",
    projectionBatchId: "batch-synthetic",
  });
  await getGatewayProjectionPublishAttempts("org-a", {
    source: "manual",
    status: "error",
    from: "2026-06-15T00:00:00.000Z",
    limit: 20,
  });
  await getGatewayProjectionPublishAttemptRetentionReadiness("org-a", {
    source: "manual",
    status: "error",
    failureCategory: "gateway_unavailable",
    from: "2026-06-15T00:00:00.000Z",
    limit: 100,
  });
  await getGatewayProjectionPublishAttemptCleanupDryRun("org-a", {
    source: "manual",
    status: "error",
    failureCategory: "gateway_unavailable",
    olderThan: "2026-05-16T00:00:00.000Z",
    limit: 100,
  });
  await getGatewayProjectionPublishAttemptCleanupExecuteReadiness("org-a", {
    source: "manual",
    status: "error",
    failureCategory: "gateway_unavailable",
    olderThan: "2026-05-16T00:00:00.000Z",
    dryRunGeneratedAt: "2026-06-15T00:10:00.000Z",
    maxDryRunAgeSeconds: 900,
    approvalEvidence: "dry_run_export_reviewed,candidate_count_reviewed",
    limit: 100,
  });
  await getGatewayProjectionPublishAttempt("org-a", "attempt-synthetic");
  await getOrganizationMasterDataQualityReadiness("org-a");
  await getOrganizationDirectoryQuality("org-a", {
    entityType: "user",
    keyword: "alice",
    sourceType: "wecom",
    sourceConnectionIdHash: "sha256:source",
    qualityStatus: "blocked",
    reasonCode: "mapping_missing",
    lifecycleStatus: "ACTIVE",
    current: 3,
    pageSize: 50,
  });
  await getOrganizationDirectoryRemediationPlan("org-a", {
    entityType: "user",
    keyword: "alice",
    sourceType: "wecom",
    sourceConnectionIdHash: "sha256:source",
    qualityStatus: "blocked",
    reasonCode: "mapping_missing",
    lifecycleStatus: "ACTIVE",
    limit: 30,
    topN: 10,
  });
  await getOrganizationDirectoryRemediationActionDrafts("org-a", {
    actionAlias: "mapping_review",
    entityType: "user",
    keyword: "alice",
    sourceType: "wecom",
    sourceConnectionIdHash: "sha256:source",
    qualityStatus: "blocked",
    reasonCode: "mapping_missing",
    limit: 30,
    topN: 10,
  });
  await getOrganizationDirectoryRemediationPreflight("org-a", {
    draftId: "sha256:draft",
    actionAlias: "mapping_review",
    entityType: "user",
    keyword: "alice",
    sourceType: "wecom",
    sourceConnectionIdHash: "sha256:source",
    qualityStatus: "blocked",
    reasonCode: "mapping_missing",
    limit: 30,
    topN: 10,
  });
  await getGatewayProjectionIngestionStatus("org-a", {
    latest: true,
    projectionBatchId: "batch-synthetic",
    orgVersion: 202606151200,
    sourceVersion: "orgv-synthetic",
  });
  await publishGatewayProjectionManually("org-a", {traceId: "trace-synthetic", reason: "operator-check"});

  expect(global.fetch).toHaveBeenNthCalledWith(
    1,
    "https://admin.example.invalid/api/get-platform-api-organization-mappings?organization=org-a",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    2,
    "https://admin.example.invalid/api/get-platform-api-user-mappings?organization=org-a&p=2&pageSize=20&keyword=alice",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    3,
    "https://admin.example.invalid/api/get-platform-api-user-mapping-readiness?organization=org-a&keyword=alice&readinessCategory=mapping_missing&mappingStatus=CONFIRMED&limit=20",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    4,
    "https://admin.example.invalid/api/gateway-projection/run-readiness?organization=org-a&traceId=trace-synthetic&projectionBatchId=batch-synthetic",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    5,
    "https://admin.example.invalid/api/gateway-projection/publish-attempts?organization=org-a&source=manual&status=error&from=2026-06-15T00%3A00%3A00.000Z&limit=20",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    6,
    "https://admin.example.invalid/api/gateway-projection/publish-attempt-retention-readiness?organization=org-a&source=manual&status=error&failureCategory=gateway_unavailable&from=2026-06-15T00%3A00%3A00.000Z&limit=100",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    7,
    "https://admin.example.invalid/api/gateway-projection/publish-attempt-retention-cleanup-dry-run?organization=org-a&source=manual&status=error&failureCategory=gateway_unavailable&olderThan=2026-05-16T00%3A00%3A00.000Z&limit=100",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    8,
    "https://admin.example.invalid/api/gateway-projection/publish-attempt-retention-cleanup-execute-readiness?organization=org-a&source=manual&status=error&failureCategory=gateway_unavailable&olderThan=2026-05-16T00%3A00%3A00.000Z&dryRunGeneratedAt=2026-06-15T00%3A10%3A00.000Z&maxDryRunAgeSeconds=900&approvalEvidence=dry_run_export_reviewed%2Ccandidate_count_reviewed&limit=100",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    9,
    "https://admin.example.invalid/api/gateway-projection/publish-attempts/attempt-synthetic?organization=org-a",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    10,
    "https://admin.example.invalid/api/get-organization-master-data-quality-readiness?organization=org-a",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    11,
    "https://admin.example.invalid/api/organization-master-data-quality/directory?organization=org-a&entityType=user&keyword=alice&sourceType=wecom&sourceConnectionIdHash=sha256%3Asource&qualityStatus=blocked&reasonCode=mapping_missing&lifecycleStatus=ACTIVE&p=3&pageSize=50",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    12,
    "https://admin.example.invalid/api/organization-master-data-quality/remediation-plan?organization=org-a&entityType=user&keyword=alice&sourceType=wecom&sourceConnectionIdHash=sha256%3Asource&qualityStatus=blocked&reasonCode=mapping_missing&lifecycleStatus=ACTIVE&limit=30&topN=10",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    13,
    "https://admin.example.invalid/api/organization-master-data-quality/remediation-action-drafts?organization=org-a&actionAlias=mapping_review&entityType=user&keyword=alice&sourceType=wecom&sourceConnectionIdHash=sha256%3Asource&qualityStatus=blocked&reasonCode=mapping_missing&limit=30&topN=10",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    14,
    "https://admin.example.invalid/api/organization-master-data-quality/remediation-preflight?organization=org-a&draftId=sha256%3Adraft&actionAlias=mapping_review&entityType=user&keyword=alice&sourceType=wecom&sourceConnectionIdHash=sha256%3Asource&qualityStatus=blocked&reasonCode=mapping_missing&limit=30&topN=10",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    15,
    "https://admin.example.invalid/api/gateway-projection/ingestion-status?organization=org-a&latest=true&projectionBatchId=batch-synthetic&orgVersion=202606151200&sourceVersion=orgv-synthetic",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    16,
    "https://admin.example.invalid/api/gateway-projection/manual-publish",
    expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({
        organizationId: "org-a",
        traceId: "trace-synthetic",
        reason: "operator-check",
      }),
      headers: expect.objectContaining({
        "Accept-Language": "en",
        "Content-Type": "application/json",
      }),
    })
  );
});

test("updates platform api mappings with json body and no sensitive fields", async() => {
  const organizationMapping = {
    organizationId: "org-a",
    apiOrganizationId: "api-org-synthetic",
    mappingStatus: "CONFIRMED",
  };
  const userMapping = {
    organizationId: "org-a",
    adminSubject: "org-a/alice",
    apiUserId: "api-user-synthetic",
    mappingStatus: "CONFIRMED",
  };

  await updatePlatformApiOrganizationMapping(organizationMapping);
  await updatePlatformApiUserMapping(userMapping);

  expect(global.fetch).toHaveBeenNthCalledWith(
    1,
    "https://admin.example.invalid/api/update-platform-api-organization-mapping",
    expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify(organizationMapping),
      headers: expect.objectContaining({
        "Accept-Language": "en",
        "Content-Type": "application/json",
      }),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    2,
    "https://admin.example.invalid/api/update-platform-api-user-mapping",
    expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify(userMapping),
      headers: expect.objectContaining({
        "Accept-Language": "en",
        "Content-Type": "application/json",
      }),
    })
  );
});

test("loads organization directory remediation approval preview with safe filters", async() => {
  await getOrganizationDirectoryRemediationApprovalPreview("org-a", {
    draftId: "sha256:draft",
    actionAlias: "mapping_review",
    entityType: "user",
    keyword: "alice",
    sourceType: "wecom",
    sourceConnectionIdHash: "sha256:source",
    qualityStatus: "blocked",
    reasonCode: "mapping_missing",
    limit: 30,
    topN: 10,
  });

  expect(global.fetch).toHaveBeenCalledWith(
    "https://admin.example.invalid/api/organization-master-data-quality/remediation-approval-preview?organization=org-a&draftId=sha256%3Adraft&actionAlias=mapping_review&entityType=user&keyword=alice&sourceType=wecom&sourceConnectionIdHash=sha256%3Asource&qualityStatus=blocked&reasonCode=mapping_missing&limit=30&topN=10",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
});

test("loads organization directory remediation approval packet audit with safe filters", async() => {
  await getOrganizationDirectoryRemediationApprovalPacketAudit("org-a", {
    packetAuditId: "approval-packet-audit:packet",
    approvalPreviewId: "approval-preview:preview",
    approvalPreviewHash: "sha256:preview",
    draftId: "sha256:draft",
    actionAlias: "mapping_review",
    entityType: "user",
    keyword: "alice",
    sourceType: "wecom",
    sourceConnectionIdHash: "sha256:source",
    qualityStatus: "blocked",
    reasonCode: "mapping_missing",
    riskLevel: "medium",
    packetStatus: "ready_for_approval",
    limit: 30,
    topN: 10,
  });

  expect(global.fetch).toHaveBeenCalledWith(
    "https://admin.example.invalid/api/organization-master-data-quality/remediation-approval-packet-audit?organization=org-a&packetAuditId=approval-packet-audit%3Apacket&approvalPreviewId=approval-preview%3Apreview&approvalPreviewHash=sha256%3Apreview&draftId=sha256%3Adraft&actionAlias=mapping_review&entityType=user&keyword=alice&sourceType=wecom&sourceConnectionIdHash=sha256%3Asource&qualityStatus=blocked&reasonCode=mapping_missing&riskLevel=medium&packetStatus=ready_for_approval&limit=30&topN=10",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
});
