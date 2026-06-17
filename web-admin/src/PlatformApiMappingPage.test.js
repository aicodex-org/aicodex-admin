/* eslint-env jest */
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

import React from "react";
import {fireEvent, render, screen, wait} from "@testing-library/react";
import * as Setting from "./Setting";
import * as PlatformApiMappingBackend from "./backend/PlatformApiMappingBackend";
import PlatformApiMappingPage from "./PlatformApiMappingPage";

jest.setTimeout(15000);

jest.mock("./backend/PlatformApiMappingBackend", () => ({
  getPlatformApiOrganizationMappings: jest.fn(),
  getOrganizationMasterDataQualityReadiness: jest.fn(),
  getPlatformApiUserMappingReadiness: jest.fn(),
  getGatewayProjectionRunReadiness: jest.fn(),
  getGatewayProjectionIngestionStatus: jest.fn(),
  getGatewayProjectionPublishAttempts: jest.fn(),
  getGatewayProjectionPublishAttempt: jest.fn(),
  getGatewayProjectionPublishAttemptRetentionReadiness: jest.fn(),
  getGatewayProjectionPublishAttemptCleanupDryRun: jest.fn(),
  getGatewayProjectionPublishAttemptCleanupExecuteReadiness: jest.fn(),
  getGatewayProjectionPublishAttemptCleanupApprovalPolicyReadiness: jest.fn(),
  getGatewayProjectionPublishAttemptCleanupApprovalDecisionDraftReadiness: jest.fn(),
  getGatewayProjectionPublishAttemptCleanupExecutionGateOwnerBoundaryPreflight: jest.fn(),
  getGatewayProjectionPublishAttemptCleanupApprovalAuditTrail: jest.fn(),
  recordGatewayProjectionPublishAttemptCleanupApprovalAuditTrail: jest.fn(),
  updatePlatformApiOrganizationMapping: jest.fn(),
  getPlatformApiUserMappings: jest.fn(),
  publishGatewayProjectionManually: jest.fn(),
  updatePlatformApiUserMapping: jest.fn(),
}));

jest.mock("./common/select/OrganizationSelect", () => (props) => (
  <select data-testid="organization-select" value={props.initValue} onChange={event => props.onChange(event.target.value)}>
    <option value="org-alpha">联软科技集团</option>
  </select>
));

const mockMatchMedia = query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
  PlatformApiMappingBackend.getPlatformApiOrganizationMappings.mockResolvedValue({
    status: "ok",
    data: [{
      name: "org-mapping-1",
      organizationId: "org-alpha",
      apiOrganizationId: "api-org-uuid",
      mappingStatus: "PENDING_REVIEW",
      mappingSource: "MANUAL",
      lineage: "{}",
    }],
  });
  PlatformApiMappingBackend.getPlatformApiUserMappings.mockResolvedValue({
    status: "ok",
    data: [{
      name: "user-mapping-1",
      organizationId: "org-alpha",
      adminSubject: "org-alpha/user-one",
      apiUserId: "api-user-1",
      mappingStatus: "CONFIRMED",
      mappingSource: "MIGRATION",
      lineage: "{}",
    }],
    data2: 1,
  });
  PlatformApiMappingBackend.getPlatformApiUserMappingReadiness.mockResolvedValue({
    status: "ok",
    data: {
      totalSubjectCount: 1,
      counts: {
        active_publishable: 1,
        mapping_missing: 0,
      },
      candidates: [{
        adminSubject: "org-alpha/user-one",
        apiUserId: "api-user-1",
        readinessCategory: "active_publishable",
        platformMappingStatus: "CONFIRMED",
      }],
      remediationGuidance: [{
        category: "mapping_missing",
        code: "mapping_missing_requires_confirmed_api_user_mapping",
        summary: "缺少一等 API user mapping",
        operatorActions: [
          "补齐同一 organizationId + adminSubject 的 PlatformApiUserMapping.ApiUserId",
          "重新读取 readiness counts",
        ],
        minimumUnblockCondition: "存在 confirmed PlatformApiUserMapping.ApiUserId",
        boundary: "display/phone/email/legacy lineage 只能作为诊断候选",
      }],
    },
  });
  PlatformApiMappingBackend.getGatewayProjectionRunReadiness.mockResolvedValue({
    status: "ok",
    data: {
      source: {
        sourceVersion: "orgv-run-1",
        orgVersion: 202606151300,
      },
      target: {
        contractVersionStatus: "not_declared_by_gateway_contract",
        projectionVersionCount: 1,
        projectionVersionSample: "pv-synthetic",
      },
      current: {
        subjectCount: 1,
        activeSubjectCount: 1,
        tombstoneSubjectCount: 0,
        unmappedSubjectCount: 0,
        invalidSubjectCount: 0,
      },
      diff: {
        compared: true,
        subjectCountChanged: false,
      },
      retry: {
        readiness: "safe_retry",
        safeToRetry: true,
        operatorAction: "可安全 retry 同一 Admin producer 输入；仍需下游受控验证确认 Gateway/API/Insight 行为。",
      },
      runReference: {
        available: true,
        matched: true,
        storageScope: "latest_in_process_observability",
      },
      lastFailureAlias: "gateway_unavailable",
    },
  });
  PlatformApiMappingBackend.getGatewayProjectionPublishAttempts.mockResolvedValue({
    status: "ok",
    data: {
      attempts: [{
        attemptId: "attempt-synthetic",
        source: "manual",
        status: "error",
        traceId: "trace-synthetic",
        projectionBatchId: "batch-synthetic",
        orgVersion: 202606151300,
        sourceVersion: "orgv-run-1",
        subjectCount: 1,
        activeSubjectCount: 1,
        tombstoneSubjectCount: 0,
        skippedSubjectCount: 2,
        skippedByReason: {mapping_missing: 2},
        failureCategory: "gateway_unavailable",
        accepted: false,
        idempotent: false,
        retryable: true,
        durationMs: 321,
        createdAt: "2026-06-15T13:00:00Z",
        retention: {
          windowSeconds: 2592000,
          expiresAt: "2026-07-15T13:00:00Z",
          cleanupEligible: false,
          cleanupReason: "within_retention_window",
        },
        receiptQueryHint: {
          available: true,
          organizationId: "org-alpha",
          projectionBatchId: "batch-synthetic",
          orgVersion: 202606151300,
          sourceVersion: "orgv-run-1",
        },
      }],
    },
  });
  PlatformApiMappingBackend.getGatewayProjectionPublishAttemptRetentionReadiness.mockResolvedValue({
    status: "ok",
    data: {
      total: 1,
      cleanupEligibleCount: 0,
      blockedCount: 1,
      retentionWindowSeconds: 2592000,
      reasonCounts: {
        within_retention_window: 1,
      },
      samples: [{
        attemptId: "attempt-synthetic",
        source: "manual",
        status: "error",
        cleanupEligible: false,
        cleanupReason: "within_retention_window",
        projectionBatchId: "batch-synthetic",
        sourceVersion: "orgv-run-1",
      }],
    },
  });
  PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupDryRun.mockResolvedValue({
    status: "ok",
    data: {
      total: 1,
      candidateCount: 1,
      blockedCount: 0,
      retentionWindowSeconds: 2592000,
      reasonCounts: {
        retention_expired_with_diagnostic_summary: 1,
      },
      diagnosticCompleteness: {
        completeCount: 1,
        missingCount: 0,
      },
      receiptHintCoverage: {
        availableCount: 1,
        unavailableCount: 0,
      },
      operatorActionSummary: "cleanup_candidates_ready_for_future_execute_gate",
      safetyChecklist: [
        "organization_scope_required",
        "dry_run_only_no_db_delete_or_update",
      ],
      executeGuardrail: {
        enabled: false,
        dryRunOnly: true,
        irreversible: false,
        disabledReason: "cleanup_execution_not_enabled",
        requiredConfirmation: "not_available_in_p0",
      },
    },
  });
  PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupExecuteReadiness.mockResolvedValue({
    status: "ok",
    data: {
      generatedAt: "2026-06-15T13:05:00Z",
      readiness: "approval_required",
      safeNextAction: "collect_approval_package",
      disabledReasons: ["approval_evidence_missing", "cleanup_execution_not_enabled"],
      dryRunId: "dryrun-synthetic",
      dryRunHash: "dryrun-hash-synthetic",
      retentionPolicyVersion: "gateway_projection_publish_attempt_retention.v1",
      candidateCount: 1,
      blockedCount: 0,
      missingDiagnosticSummaryCount: 0,
      receiptHintAvailableCount: 1,
      receiptHintMissingCount: 0,
      lastDryRunFreshness: {
        status: "fresh",
        ageSeconds: 0,
        maxAgeSeconds: 900,
      },
      operatorApproval: {
        required: true,
        status: "missing",
        requiredEvidenceAliases: ["dry_run_export_reviewed"],
        missingEvidenceAliases: ["dry_run_export_reviewed"],
      },
      executeGuardrail: {
        enabled: false,
        dryRunOnly: true,
        irreversible: false,
      },
      export: {
        readiness: "approval_required",
        safeNextAction: "collect_approval_package",
        dryRunHash: "dryrun-hash-synthetic",
        samples: [],
      },
    },
  });
  PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupApprovalPolicyReadiness.mockResolvedValue({
    status: "ok",
    data: {
      generatedAt: "2026-06-15T13:06:30Z",
      policyVersion: "gateway_projection_cleanup_approval_policy.v1",
      policyStatus: "manual_review_ready",
      storageScope: "derived_policy_readiness_not_persisted",
      retentionPolicyVersion: "gateway_projection_publish_attempt_retention.v1",
      approvalAuditStorageScope: "admin_cleanup_approval_audit_trail.v1",
      readinessHash: "dryrun-hash-synthetic",
      dryRunId: "dryrun-synthetic",
      safeNextAction: "wait_for_cleanup_execute_gate",
      candidateCount: 1,
      blockedCount: 0,
      manualReview: {
        required: true,
        status: "ready",
        requiredActionAliases: ["approve", "copy", "export"],
      },
      cannotInfer: {
        value: false,
        reasonAliases: [],
      },
      policyGates: [{
        name: "manual_review_actions",
        status: "pass",
      }],
      auditSummary: {
        actionCounts: {approve: 1, copy: 1, export: 1},
        approvalStateCounts: {approved_preview: 1},
      },
      executeGuardrail: {
        enabled: false,
        dryRunOnly: true,
      },
      export: {
        policyVersion: "gateway_projection_cleanup_approval_policy.v1",
        policyStatus: "manual_review_ready",
        readinessHash: "dryrun-hash-synthetic",
        policyGates: [],
      },
    },
  });
  PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupApprovalDecisionDraftReadiness.mockResolvedValue({
    status: "ok",
    data: {
      generatedAt: "2026-06-15T13:07:00Z",
      decisionDraftId: "decision-draft-synthetic",
      decisionDraftHash: "decision-draft-hash-synthetic",
      decisionReadiness: "draft_ready",
      decisionState: "manual_review_ready_no_execution",
      decisionSummary: "decision_draft_ready_for_manual_review_without_cleanup_execution",
      executionMode: "manual_review_only",
      cleanupExecutionAllowed: false,
      policyVersion: "gateway_projection_cleanup_approval_policy.v1",
      policyStatus: "manual_review_ready",
      readinessHash: "dryrun-hash-synthetic",
      dryRunId: "dryrun-synthetic",
      candidateCount: 1,
      blockedCount: 0,
      manualReviewChecklist: {
        required: true,
        status: "ready",
        requiredActionAliases: ["approve", "copy", "export"],
        requiredEvidenceAliases: ["dry_run_export_reviewed"],
      },
      cannotInfer: {
        value: false,
        reasonAliases: [],
      },
      blockingReasons: [],
      copySafeLabels: [
        "admin_producer_diagnostics_only",
        "manual_review_only",
        "cleanup_execution_not_enabled",
      ],
      retentionSummary: {
        retentionPolicyVersion: "gateway_projection_publish_attempt_retention.v1",
        candidateCount: 1,
        blockedCount: 0,
      },
      auditSummary: {
        actionCounts: {approve: 1, copy: 1, export: 1},
        approvalStateCounts: {approved_preview: 1},
      },
      redactionSummary: {
        status: "redacted",
        copySafe: true,
        redactedFields: ["token", "raw_gateway_response"],
      },
      operatorNextAction: "review_decision_draft_with_master_control",
      executeGuardrail: {
        enabled: false,
        dryRunOnly: true,
      },
      export: {
        decisionDraftId: "decision-draft-synthetic",
        decisionReadiness: "draft_ready",
        executionMode: "manual_review_only",
        cleanupExecutionAllowed: false,
      },
    },
  });
  PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupExecutionGateOwnerBoundaryPreflight.mockResolvedValue({
    status: "ok",
    data: {
      generatedAt: "2026-06-15T13:08:00Z",
      gatePreflightId: "execution-gate-preflight-synthetic",
      gatePreflightHash: "execution-gate-preflight-hash-synthetic",
      gateReadiness: "owner_boundary_ready",
      gateState: "owner_boundary_ready_no_execution",
      gateSummary: "execution_gate_preflight_ready_for_owner_boundary_review_without_cleanup_execution",
      executionMode: "manual_review_only",
      cleanupExecutionAllowed: false,
      gateVersion: "gateway_projection_cleanup_execution_gate_owner_boundary.v1",
      decisionDraftId: "decision-draft-synthetic",
      decisionDraftHash: "decision-draft-hash-synthetic",
      decisionReadiness: "draft_ready",
      policyVersion: "gateway_projection_cleanup_approval_policy.v1",
      policyStatus: "manual_review_ready",
      readinessHash: "dryrun-hash-synthetic",
      dryRunId: "dryrun-synthetic",
      candidateCount: 1,
      blockedCount: 0,
      ownerBoundary: {
        adminAuthorityOnly: true,
        producerDiagnosticsOnly: true,
        downstreamReceiptHintOnly: true,
        externalOwnerAliases: ["api_gateway_ingestion_owner", "insight_consumer_owner"],
        forbiddenActionAliases: ["write_gateway_authorization_facts", "execute_cleanup_delete_or_update"],
      },
      manualReviewBlockers: [],
      cannotInfer: {
        value: false,
        reasonAliases: [],
      },
      noFallback: {
        enforced: true,
        reasonAliases: ["admin_owner_boundary_only", "cleanup_execution_not_enabled"],
        forbiddenFallbackAliases: ["api_gateway_internal_db", "admin_page_tree_json"],
      },
      retentionSummary: {
        retentionPolicyVersion: "gateway_projection_publish_attempt_retention.v1",
        candidateCount: 1,
        blockedCount: 0,
      },
      redactionSummary: {
        status: "redacted",
        copySafe: true,
        redactedFields: ["token", "raw_gateway_response"],
      },
      operatorNextAction: "request_master_control_owner_boundary_review",
      executeGuardrail: {
        enabled: false,
        dryRunOnly: true,
      },
      copySafeLabels: [
        "owner_boundary_preflight_only",
        "manual_review_only",
        "no_fallback_enforced",
      ],
      export: {
        gatePreflightId: "execution-gate-preflight-synthetic",
        gateReadiness: "owner_boundary_ready",
        executionMode: "manual_review_only",
        cleanupExecutionAllowed: false,
        noFallback: {
          enforced: true,
        },
      },
    },
  });
  PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupApprovalAuditTrail.mockResolvedValue({
    status: "ok",
    data: {
      generatedAt: "2026-06-15T13:06:00Z",
      storageScope: "admin_cleanup_approval_audit_trail.v1",
      total: 1,
      summary: {
        actionCounts: {approve: 1},
        approvalStateCounts: {approved_preview: 1},
        candidateCount: 1,
        blockedCount: 0,
        disabledReasonCount: 2,
        latestActionAt: "2026-06-15T13:06:00Z",
      },
      records: [{
        auditId: "gcaa-synthetic",
        action: "approve",
        approvalState: "approved_preview",
        readinessHash: "dryrun-hash-synthetic",
        candidateCount: 1,
        blockedCount: 0,
        disabledReasons: ["approval_evidence_missing", "cleanup_execution_not_enabled"],
        safeNextAction: "collect_approval_package",
        storageScope: "admin_cleanup_approval_audit_trail.v1",
        executeEnabled: false,
        dryRunOnly: true,
        createdAt: "2026-06-15T13:06:00Z",
      }],
      executeGuardrail: {
        enabled: false,
        dryRunOnly: true,
      },
      export: {
        storageScope: "admin_cleanup_approval_audit_trail.v1",
        records: [],
      },
    },
  });
  PlatformApiMappingBackend.recordGatewayProjectionPublishAttemptCleanupApprovalAuditTrail.mockResolvedValue({
    status: "ok",
    data: {
      auditId: "gcaa-recorded",
      action: "approve",
      storageScope: "admin_cleanup_approval_audit_trail.v1",
      executeEnabled: false,
      dryRunOnly: true,
    },
  });
  PlatformApiMappingBackend.getGatewayProjectionPublishAttempt.mockResolvedValue({
    status: "ok",
    data: {
      attemptId: "attempt-synthetic",
      source: "manual",
      status: "error",
      traceId: "trace-synthetic",
      projectionBatchId: "batch-synthetic",
      subjectCount: 1,
      activeSubjectCount: 1,
      tombstoneSubjectCount: 0,
      skippedSubjectCount: 2,
      skippedByReason: {mapping_missing: 2},
      failureCategory: "gateway_unavailable",
      accepted: false,
      idempotent: false,
      retryable: true,
      attempts: 2,
      durationMs: 321,
      retention: {
        windowSeconds: 2592000,
        expiresAt: "2026-07-15T13:00:00Z",
        cleanupEligible: false,
        cleanupReason: "within_retention_window",
      },
      receiptQueryHint: {
        available: true,
        organizationId: "org-alpha",
        projectionBatchId: "batch-synthetic",
        orgVersion: 202606151300,
        sourceVersion: "orgv-run-1",
      },
      metadata: {
        readinessPublishable: "1",
      },
    },
  });
  PlatformApiMappingBackend.getOrganizationMasterDataQualityReadiness.mockResolvedValue({
    status: "ok",
    data: {
      status: "warning",
      reasonAliases: ["mapping_missing"],
      counts: {
        sourceConnectionCount: 1,
        departmentCount: 2,
        userCount: 1,
        membershipCount: 1,
        publishableSubjectCount: 1,
        unmappedSubjectCount: 0,
        untrustedMappingCount: 0,
      },
      sourceConnectionSummary: {
        hasStaleFreshness: false,
        hasUnavailableFreshness: false,
      },
      syncBatch: {
        hasUsableLineage: true,
      },
      qualityChecks: [{
        alias: "mapping_missing",
        status: "warning",
        count: 1,
        summary: "存在未映射主体",
      }],
    },
  });
  PlatformApiMappingBackend.getGatewayProjectionIngestionStatus.mockResolvedValue({
    status: "ok",
    data: {
      success: true,
      status: "applied",
      statusAlias: "applied",
      reasonCode: "projection_applied",
      subjectCounts: {
        total: 3,
        active: 2,
        tombstone: 1,
        unmapped: 0,
        invalid: 0,
      },
      lineage: {
        sourceVersion: "orgv-ingestion-1",
        orgVersion: 202606151200,
        projectionBatchId: "batch-ingestion-1",
      },
      receivedAt: "2026-06-15T12:00:00Z",
      appliedAt: "2026-06-15T12:00:02Z",
      durationMs: 2000,
      query: {
        latest: true,
      },
    },
  });
  PlatformApiMappingBackend.updatePlatformApiOrganizationMapping.mockResolvedValue({status: "ok"});
  PlatformApiMappingBackend.updatePlatformApiUserMapping.mockResolvedValue({status: "ok"});
  PlatformApiMappingBackend.publishGatewayProjectionManually.mockResolvedValue({
    status: "ok",
    data: {
      status: "ok",
      accepted: true,
      idempotent: false,
      retryable: false,
      projectionBatchId: "batch-synthetic",
      subjectCount: 1,
      skippedSubjectCount: 0,
    },
  });
});

afterEach(() => {
  Setting.showMessage.mockRestore();
  jest.clearAllMocks();
});

test("renders operator-friendly mapping labels while saving enum values", async() => {
  render(<PlatformApiMappingPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("AICodex API 组织与账号映射")).toBeInTheDocument();
  expect(screen.getAllByText("映射状态").length).toBeGreaterThan(0);
  expect(screen.getAllByText("映射来源").length).toBeGreaterThan(0);
  expect(screen.queryByText("血缘信息")).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue("{}")).not.toBeInTheDocument();
  expect(screen.queryByText("映射状态（mappingStatus）")).not.toBeInTheDocument();
  expect(screen.queryByText("映射来源（mappingSource）")).not.toBeInTheDocument();

  expect(screen.getAllByText("待复核").length).toBeGreaterThan(0);
  expect(screen.getByText("手工维护")).toBeInTheDocument();
  expect(screen.queryByText("PENDING_REVIEW")).not.toBeInTheDocument();
  expect(screen.queryByText("MANUAL")).not.toBeInTheDocument();

  fireEvent.click(screen.getAllByText(/保存|Save/i)[0]);

  await wait(() => expect(PlatformApiMappingBackend.updatePlatformApiOrganizationMapping).toHaveBeenCalled());
  expect(PlatformApiMappingBackend.updatePlatformApiOrganizationMapping).toHaveBeenCalledWith(expect.objectContaining({
    mappingStatus: "PENDING_REVIEW",
    mappingSource: "MANUAL",
  }));
});

test("separates organization and user mapping tabs and loads user mappings on demand", async() => {
  render(<PlatformApiMappingPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect((await screen.findAllByText("平台组织映射")).length).toBeGreaterThan(0);
  expect(PlatformApiMappingBackend.getPlatformApiOrganizationMappings).toHaveBeenCalledWith("org-alpha");
  expect(PlatformApiMappingBackend.getPlatformApiUserMappings).not.toHaveBeenCalled();

  fireEvent.click(screen.getByText("用户映射"));

  await wait(() => expect(PlatformApiMappingBackend.getPlatformApiUserMappings).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    current: 1,
    pageSize: 10,
    keyword: "",
  })));
  await wait(() => expect(PlatformApiMappingBackend.getPlatformApiUserMappingReadiness).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    keyword: "",
    readinessCategory: "",
    mappingStatus: "",
  })));
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionRunReadiness).toHaveBeenCalledWith("org-alpha", expect.any(Object)));
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttempts).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    source: "",
    status: "",
    limit: 20,
  })));
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttemptRetentionReadiness).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    source: "",
    status: "",
    limit: 100,
  })));
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupDryRun).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    source: "",
    status: "",
    limit: 100,
  })));
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupExecuteReadiness).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    source: "",
    status: "",
    limit: 100,
  })));
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupApprovalPolicyReadiness).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    source: "",
    status: "",
    approvalEvidence: "dry_run_export_reviewed,candidate_count_reviewed,receipt_hint_coverage_reviewed,no_blocked_attempts_confirmed",
    limit: 100,
  })));
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupApprovalDecisionDraftReadiness).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    source: "",
    status: "",
    approvalEvidence: "dry_run_export_reviewed,candidate_count_reviewed,receipt_hint_coverage_reviewed,no_blocked_attempts_confirmed",
    limit: 100,
  })));
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupExecutionGateOwnerBoundaryPreflight).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    source: "",
    status: "",
    approvalEvidence: "dry_run_export_reviewed,candidate_count_reviewed,receipt_hint_coverage_reviewed,no_blocked_attempts_confirmed",
    limit: 100,
  })));
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupApprovalAuditTrail).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    limit: 20,
  })));
  await wait(() => expect(PlatformApiMappingBackend.getOrganizationMasterDataQualityReadiness).toHaveBeenCalledWith("org-alpha"));
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionIngestionStatus).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    latest: true,
  })));
  expect(await screen.findByDisplayValue("org-alpha/user-one")).toBeInTheDocument();
  expect(screen.getByText("组织主数据质量 readiness")).toBeInTheDocument();
  expect(screen.getByText("质量状态：")).toBeInTheDocument();
  expect(screen.getAllByText("mapping_missing").length).toBeGreaterThan(0);
  expect(screen.getByText("可发布主体 readiness")).toBeInTheDocument();
  expect(screen.getByText("网关身份同步就绪")).toBeInTheDocument();
  expect(screen.getByText(/同步动作: 可安全重试/)).toBeInTheDocument();
  expect(screen.getByText("lastFailure: gateway_unavailable")).toBeInTheDocument();
  expect(screen.getByText("contract: not_declared_by_gateway_contract")).toBeInTheDocument();
  expect(screen.getByText("网关接入回执状态")).toBeInTheDocument();
  expect(screen.getByText(/网关回执状态: 已应用/)).toBeInTheDocument();
  expect(screen.getByText("reason: projection_applied")).toBeInTheDocument();
  expect(screen.getByText("sourceVersion: orgv-ingestion-1")).toBeInTheDocument();
  expect(screen.getByText("网关身份手动同步")).toBeInTheDocument();
  expect(screen.getByText("网关身份发布记录")).toBeInTheDocument();
  expect(screen.getByText("发布记录只记录 Admin producer 脱敏诊断，不是 gateway authorization facts。")).toBeInTheDocument();
  expect(screen.getByText("Publish attempt retention readiness")).toBeInTheDocument();
  expect(screen.getByText("只读展示 cleanup readiness，不执行删除。")).toBeInTheDocument();
  expect(screen.getByText("cleanupEligible: 0")).toBeInTheDocument();
  expect(screen.getByText("Cleanup dry-run guardrails")).toBeInTheDocument();
  expect(screen.getByText(/Dry-run: cleanup_candidates_ready_for_future_execute_gate/)).toBeInTheDocument();
  expect(screen.getAllByText("candidate: 1").length).toBeGreaterThan(0);
  expect(screen.getByText("Cleanup execute readiness")).toBeInTheDocument();
  expect(screen.getByText(/Execute readiness: approval_required/)).toBeInTheDocument();
  expect(screen.getByText(/safeNextAction: collect_approval_package/)).toBeInTheDocument();
  expect(screen.getAllByText("dryRunId: dryrun-synthetic").length).toBeGreaterThan(0);
  expect(screen.getByText("dryRunHash: dryrun-hash-synthetic")).toBeInTheDocument();
  expect(screen.getByText("approvalStatus: missing")).toBeInTheDocument();
  expect(screen.getAllByText("executeEnabled: false").length).toBeGreaterThan(0);
  expect(screen.getAllByText("dryRunOnly: true").length).toBeGreaterThan(0);
  expect(screen.getByText("Cleanup approval policy readiness")).toBeInTheDocument();
  expect(screen.getByText(/Approval policy: manual_review_ready/)).toBeInTheDocument();
  expect(screen.getByText("manualReview: ready")).toBeInTheDocument();
  expect(screen.getByText("storage: derived_policy_readiness_not_persisted")).toBeInTheDocument();
  expect(screen.getByText("Cleanup approval decision draft")).toBeInTheDocument();
  expect(screen.getByText(/Decision draft: draft_ready/)).toBeInTheDocument();
  expect(screen.getByText("decisionState: manual_review_ready_no_execution")).toBeInTheDocument();
  expect(screen.getAllByText("cleanupExecutionAllowed: false").length).toBeGreaterThan(1);
  expect(screen.getByText("operatorNextAction: review_decision_draft_with_master_control")).toBeInTheDocument();
  expect(screen.getAllByText("redaction: redacted").length).toBeGreaterThan(1);
  expect(screen.getByText("Cleanup execution gate owner-boundary preflight")).toBeInTheDocument();
  expect(screen.getByText(/Execution gate preflight: owner_boundary_ready/)).toBeInTheDocument();
  expect(screen.getByText("gateState: owner_boundary_ready_no_execution")).toBeInTheDocument();
  expect(screen.getByText("adminAuthorityOnly: true")).toBeInTheDocument();
  expect(screen.getByText("noFallback: true")).toBeInTheDocument();
  expect(screen.getByText("operatorNextAction: request_master_control_owner_boundary_review")).toBeInTheDocument();
  expect(screen.getByText("Cleanup approval audit trail")).toBeInTheDocument();
  expect(screen.getByText(/Approval audit storage: admin_cleanup_approval_audit_trail.v1/)).toBeInTheDocument();
  expect(screen.getByText("candidateTotal: 1")).toBeInTheDocument();
  expect(screen.getByText("disabledReasonAliases: 2")).toBeInTheDocument();
  expect(screen.getByText("approved_preview")).toBeInTheDocument();
  expect(screen.getByText("记录 refresh")).toBeInTheDocument();
  fireEvent.click(screen.getByText("记录 approve 预览"));
  await wait(() => expect(PlatformApiMappingBackend.recordGatewayProjectionPublishAttemptCleanupApprovalAuditTrail).toHaveBeenCalledWith(expect.objectContaining({
    organizationId: "org-alpha",
    action: "approve",
    readinessHash: "dryrun-hash-synthetic",
    dryRunId: "dryrun-synthetic",
    retentionPolicyVersion: "gateway_projection_publish_attempt_retention.v1",
    candidateCount: 1,
    blockedCount: 0,
    safeNextAction: "collect_approval_package",
  })));
  expect(screen.getAllByText("保留期内").length).toBeGreaterThan(0);
  expect(screen.getByText("gateway_unavailable")).toBeInTheDocument();
  expect(screen.getByText("321 ms")).toBeInTheDocument();
  expect(screen.getAllByText(/mapping_missing/).length).toBeGreaterThan(0);
  expect(screen.getByText("迁移导入")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("搜索平台主体或 API 用户 ID")).toBeInTheDocument();
});

test("uses attempt receipt query hint to refresh gateway ingestion status", () => {
  const page = new PlatformApiMappingPage({account: {owner: "org-alpha", isAdmin: true}});
  page.state = {organization: "org-alpha"};
  page.refreshGatewayProjectionIngestionStatus = jest.fn();
  page.setState = jest.fn();

  page.queryGatewayReceiptFromAttempt({
    receiptQueryHint: {
      available: true,
      organizationId: "org-alpha",
      latest: false,
      projectionBatchId: "batch-synthetic",
      orgVersion: 202606151300,
      sourceVersion: "orgv-run-1",
    },
  });

  expect(page.refreshGatewayProjectionIngestionStatus).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    latest: false,
    projectionBatchId: "batch-synthetic",
    orgVersion: 202606151300,
    sourceVersion: "orgv-run-1",
  }));
  expect(page.setState).toHaveBeenCalledWith({attemptDetailVisible: false});
});

test("allows operator to trigger manual gateway projection publish when readiness is available", async() => {
  render(<PlatformApiMappingPage account={{owner: "org-alpha", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("用户映射"));
  const button = await screen.findByText("手动同步");
  fireEvent.click(button);

  await wait(() => expect(PlatformApiMappingBackend.publishGatewayProjectionManually).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    reason: "operator-manual-publish",
  })));
  expect(await screen.findByText("accepted: true")).toBeInTheDocument();
  expect(screen.getByText("batch-synthetic")).toBeInTheDocument();
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionRunReadiness).toHaveBeenCalled());
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionIngestionStatus).toHaveBeenCalled());
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttempts).toHaveBeenCalled());
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttemptRetentionReadiness).toHaveBeenCalled());
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupDryRun).toHaveBeenCalled());
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupExecuteReadiness).toHaveBeenCalled());
  expect(screen.queryByText(/projection-secret|gateway.example.invalid|rawGatewayResponse/)).not.toBeInTheDocument();
});

test("copies redacted cleanup execute readiness export", async() => {
  const writeText = jest.fn();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {writeText},
  });

  render(<PlatformApiMappingPage account={{owner: "org-alpha", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("用户映射"));
  fireEvent.click(await screen.findByText("复制脱敏 JSON"));

  await wait(() => expect(writeText).toHaveBeenCalled());
  const copied = writeText.mock.calls[0][0];
  expect(copied).toContain("approval_required");
  expect(copied).toContain("dryrun-hash-synthetic");
  expect(copied).not.toMatch(/rawGatewayResponse|projection-secret|gateway\.example\.invalid/);
});

test("copies redacted cleanup approval decision draft export", async() => {
  const writeText = jest.fn();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {writeText},
  });

  render(<PlatformApiMappingPage account={{owner: "org-alpha", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("用户映射"));
  fireEvent.click(await screen.findByText("复制草案 JSON"));

  await wait(() => expect(writeText).toHaveBeenCalled());
  const copied = writeText.mock.calls[0][0];
  expect(copied).toContain("decision-draft-synthetic");
  expect(copied).toContain("manual_review_only");
  expect(copied).toContain("cleanupExecutionAllowed");
  expect(copied).not.toMatch(/rawGatewayResponse|projection-secret|gateway\.example\.invalid|Authorization|Cookie/);
  await wait(() => expect(PlatformApiMappingBackend.recordGatewayProjectionPublishAttemptCleanupApprovalAuditTrail).toHaveBeenCalledWith(expect.objectContaining({
    organizationId: "org-alpha",
    action: "export",
    readinessHash: "dryrun-hash-synthetic",
  })));
});

test("copies redacted cleanup execution gate preflight export", async() => {
  const writeText = jest.fn();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {writeText},
  });

  render(<PlatformApiMappingPage account={{owner: "org-alpha", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("用户映射"));
  fireEvent.click(await screen.findByText("复制预检 JSON"));

  await wait(() => expect(writeText).toHaveBeenCalled());
  const copied = writeText.mock.calls[0][0];
  expect(copied).toContain("execution-gate-preflight-synthetic");
  expect(copied).toContain("owner_boundary_ready");
  expect(copied).toContain("manual_review_only");
  expect(copied).not.toMatch(/rawGatewayResponse|projection-secret|gateway\.example\.invalid|Authorization|Cookie/);
  await wait(() => expect(PlatformApiMappingBackend.recordGatewayProjectionPublishAttemptCleanupApprovalAuditTrail).toHaveBeenCalledWith(expect.objectContaining({
    organizationId: "org-alpha",
    action: "export",
    readinessHash: "dryrun-hash-synthetic",
  })));
});

test("keeps cleanup approval decision draft panel disabled on error", async() => {
  PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupApprovalDecisionDraftReadiness.mockResolvedValue({
    status: "error",
    msg: "decision draft unavailable",
  });

  render(<PlatformApiMappingPage account={{owner: "org-alpha", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("用户映射"));

  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "decision draft unavailable"));
  expect(screen.getByText(/Decision draft: 未加载/)).toBeInTheDocument();
  expect(screen.getByText("复制草案 JSON").closest("button")).toBeDisabled();
});

test("keeps cleanup execution gate preflight panel disabled on error", async() => {
  PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupExecutionGateOwnerBoundaryPreflight.mockResolvedValue({
    status: "error",
    msg: "execution gate preflight unavailable",
  });

  render(<PlatformApiMappingPage account={{owner: "org-alpha", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("用户映射"));

  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "execution gate preflight unavailable"));
  expect(screen.getByText(/Execution gate preflight: 未加载/)).toBeInTheDocument();
  expect(screen.getByText("复制预检 JSON").closest("button")).toBeDisabled();
});

test("renders read-only remediation guidance for readiness categories", async() => {
  render(<PlatformApiMappingPage account={{owner: "org-alpha", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("用户映射"));

  expect(await screen.findByText("缺少一等 API user mapping")).toBeInTheDocument();
  expect(screen.getByText("补齐同一 organizationId + adminSubject 的 PlatformApiUserMapping.ApiUserId")).toBeInTheDocument();
  expect(screen.getByText(/confirmed PlatformApiUserMapping.ApiUserId/)).toBeInTheDocument();
  expect(screen.getByText(/display\/phone\/email\/legacy lineage/)).toBeInTheDocument();
  expect(screen.queryByText("自动修复")).not.toBeInTheDocument();
});
