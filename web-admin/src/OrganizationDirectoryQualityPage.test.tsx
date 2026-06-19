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
import {render} from "@testing-library/react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import * as PlatformApiMappingBackend from "./backend/PlatformApiMappingBackend";
import OrganizationDirectoryQualityPage from "./OrganizationDirectoryQualityPage";
import * as Setting from "./Setting";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mock: {
    calls: unknown[][];
  };
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type PlatformApiMappingBackendMock = Record<
  "getOrganizationDirectoryQuality" |
  "getOrganizationDirectoryRemediationPlan" |
  "getOrganizationDirectoryRemediationActionDrafts" |
  "getOrganizationDirectoryRemediationPreflight" |
  "getOrganizationDirectoryRemediationApprovalPreview" |
  "getOrganizationDirectoryRemediationApprovalPacketAudit" |
  "getOrganizationDirectoryRemediationApprovalPacketOperatorNotes" |
  "getOrganizationDirectoryRemediationOperatorNotePersistenceReadiness" |
  "getOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch",
  LooseMock
>;

type OrganizationSelectMockProps = {
  initValue?: string;
  onChange: (value: string) => void;
};

type BlobMockValue = {
  parts: string[];
  options?: unknown;
};

type CreateObjectURLMock = LooseMock & {
  mock: {
    calls: [BlobMockValue][];
  };
};

const backendMock = PlatformApiMappingBackend as unknown as PlatformApiMappingBackendMock;
const expect = jestExpect;
const {fireEvent, screen, wait} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: unknown) => boolean;
  };
  screen: {
    findByText: (text: string | RegExp) => Promise<HTMLElement>;
    findAllByText: (text: string | RegExp) => Promise<HTMLElement[]>;
    getByText: (text: string | RegExp) => HTMLElement;
    getAllByText: (text: string | RegExp) => HTMLElement[];
    queryByText: (text: string | RegExp) => HTMLElement | null;
    getByTestId: (id: string) => HTMLElement;
  };
  wait: (callback: () => unknown) => Promise<unknown>;
};

jest.mock("./backend/PlatformApiMappingBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: Pick<typeof jestValue, "fn">};
  return {
    getOrganizationDirectoryQuality: factoryJest.fn(),
    getOrganizationDirectoryRemediationPlan: factoryJest.fn(),
    getOrganizationDirectoryRemediationActionDrafts: factoryJest.fn(),
    getOrganizationDirectoryRemediationPreflight: factoryJest.fn(),
    getOrganizationDirectoryRemediationApprovalPreview: factoryJest.fn(),
    getOrganizationDirectoryRemediationApprovalPacketAudit: factoryJest.fn(),
    getOrganizationDirectoryRemediationApprovalPacketOperatorNotes: factoryJest.fn(),
    getOrganizationDirectoryRemediationOperatorNotePersistenceReadiness: factoryJest.fn(),
    getOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch: factoryJest.fn(),
  };
});

jest.mock("./common/select/OrganizationSelect", () => (props: OrganizationSelectMockProps) => (
  <select data-testid="organization-select" value={props.initValue} onChange={event => props.onChange(event.target.value)}>
    <option value="org-alpha">测试组织</option>
  </select>
));

const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

function exportedBlobAt(index: number): BlobMockValue {
  return (global.URL.createObjectURL as unknown as CreateObjectURLMock).mock.calls[index][0];
}

function expectButtonDisabled(text: string) {
  const button = screen.getByText(text).closest("button") as HTMLButtonElement | null;
  expect(button?.disabled).toBe(true);
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  backendMock.getOrganizationDirectoryQuality.mockResolvedValue({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      entityType: "user",
      page: 1,
      pageSize: 10,
      total: 1,
      summary: {ready: 0, warning: 0, blocked: 1, total: 1},
      reasonAliases: ["mapping_missing"],
      boundary: "Admin producer diagnostics only.",
      items: [{
        entityType: "user",
        entityId: "org-alpha/alice",
        displayName: "Alice",
        organizationId: "org-alpha",
        sourceType: "wecom",
        sourceConnectionIdHash: "sha256:source",
        externalIdHash: "sha256:external",
        syncBatchId: "batch-1",
        orgVersion: "orgv-1",
        sourceVersion: "orgv-1",
        lifecycleStatus: "ACTIVE",
        qualityStatus: "blocked",
        reasonCodes: ["mapping_missing"],
        remediationHints: ["补齐 confirmed PlatformApiUserMapping。"],
        detail: {membershipCount: 2, mappingStatus: "CONFIRMED"},
      }],
    },
  });
  backendMock.getOrganizationDirectoryRemediationPlan.mockResolvedValue({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalPlanCount: 1,
      boundary: "organization directory remediation plan 是 Admin producer 只读诊断。",
      plans: [{
        planId: "sha256:plan",
        planKey: "mapping_review",
        priority: "P1",
        actionAlias: "mapping_review",
        reasonCodes: ["mapping_missing"],
        affectedCounts: {department: 0, user: 1, membership: 0, total: 1},
        sampleEntityIds: ["user:sha256:sample"],
        sampleEntityHashes: ["sha256:sample"],
        sourceVersions: ["orgv-1"],
        orgVersions: ["orgv-1"],
        safeSummary: "用户到 API 主体的一等映射缺失或不可信，需要 mapping owner 确认。",
        operatorActions: ["补齐 confirmed PlatformApiUserMapping"],
      }],
      exportSummary: {
        plans: [{
          planKey: "mapping_review",
          priority: "P1",
          actionAlias: "mapping_review",
          affectedCounts: {total: 1},
          sampleEntityIds: ["user:sha256:sample"],
          sampleEntityHashes: ["sha256:sample"],
        }],
      },
    },
  });
  backendMock.getOrganizationDirectoryRemediationActionDrafts.mockResolvedValue({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalDraftCount: 1,
      boundary: "organization directory remediation action drafts are Admin producer manual review only.",
      drafts: [{
        draftId: "sha256:draft",
        actionAlias: "mapping_review",
        priority: "P1",
        entityType: "user",
        affectedCount: 1,
        safeSummary: "人工核对 API user mapping owner 后补齐 confirmed mapping。",
        blockedReason: "需要 mapping owner 人工确认",
        executionMode: "manual_review_only",
        preconditions: ["确认目标 API user 映射来源可信"],
        operatorSteps: ["导出脱敏样例给 mapping owner 复核", "在修复系统人工提交 mapping 变更"],
        samples: [{
          entityHash: "sha256:sample",
          displaySafeLabel: "user:6f2c9d8e1a0b",
          entityType: "user",
          sourceType: "wecom",
          qualityStatus: "blocked",
          reasonCodes: ["mapping_missing"],
          lifecycleStatus: "ACTIVE",
          sourceConnectionIdHash: "sha256:source",
          orgVersion: "orgv-1",
          sourceVersion: "orgv-1",
        }],
      }],
      exportSummary: {
        drafts: [{
          draftId: "sha256:draft",
          actionAlias: "mapping_review",
          executionMode: "manual_review_only",
          samples: [{entityHash: "sha256:sample", displaySafeLabel: "user:6f2c9d8e1a0b"}],
        }],
      },
    },
  });
  backendMock.getOrganizationDirectoryRemediationPreflight.mockResolvedValue({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalPreflightCount: 1,
      boundary: "organization directory remediation preflight 是 Admin producer 只读诊断。",
      preflights: [{
        preflightId: "sha256:preflight",
        draftId: "sha256:draft",
        actionAlias: "mapping_review",
        entityType: "user",
        executionMode: "manual_review_only",
        readyForManualReview: true,
        autoExecutionAllowed: false,
        blockedReasons: [],
        preconditions: ["确认目标 API user 映射来源可信"],
        safetyChecklist: ["确认当前草案仅用于 manual review，不允许自动执行"],
        affectedCounts: {user: 1, total: 1},
        operatorNextSteps: ["导出 preflight JSON 供修复 owner 人工复核"],
        sampleDigests: [{
          entityHash: "sha256:sample",
          displaySafeLabel: "user:6f2c9d8e1a0b",
          entityType: "user",
          sourceType: "wecom",
          qualityStatus: "blocked",
          reasonCodes: ["mapping_missing"],
          lifecycleStatus: "ACTIVE",
          sourceConnectionIdHash: "sha256:source",
          orgVersion: "orgv-1",
          sourceVersion: "orgv-1",
        }],
      }],
      exportSummary: {
        preflights: [{
          preflightId: "sha256:preflight",
          executionMode: "manual_review_only",
          autoExecutionAllowed: false,
          sampleDigests: [{entityHash: "sha256:sample", displaySafeLabel: "user:6f2c9d8e1a0b"}],
        }],
      },
    },
  });
  backendMock.getOrganizationDirectoryRemediationApprovalPreview.mockResolvedValue({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalApprovalPreviewCount: 1,
      boundary: "organization directory remediation approval preview 是 Admin producer 只读诊断。",
      approvalPreviews: [{
        approvalPreviewId: "approval-preview:sample",
        approvalPreviewHash: "sha256:approval-preview",
        draftId: "sha256:draft",
        actionAlias: "mapping_review",
        entityType: "user",
        executionMode: "manual_review_only",
        autoExecutionAllowed: false,
        readyForApproval: true,
        affectedCount: 1,
        riskLevel: "medium",
        preconditions: ["确认目标 API user 映射来源可信"],
        blockedReasons: [],
        requiredApprovals: ["organization_directory_owner", "api_mapping_owner"],
        operatorChecklist: ["确认审批预览仅用于 manual review，P0 不允许自动执行"],
        safeSummary: "mapping_review/user approval preview covers 1 Admin-owned records; manual review only, no remediation execution.",
        sampleStableHashes: ["sha256:sample"],
        exportSummary: {
          approvalPreviewHash: "sha256:approval-preview",
          executionMode: "manual_review_only",
          autoExecutionAllowed: false,
          sampleStableHashes: ["sha256:sample"],
        },
      }],
      exportSummary: {
        approvalPreviews: [{
          approvalPreviewHash: "sha256:approval-preview",
          actionAlias: "mapping_review",
          executionMode: "manual_review_only",
          autoExecutionAllowed: false,
          readyForApproval: true,
          riskLevel: "medium",
          sampleStableHashes: ["sha256:sample"],
        }],
      },
    },
  });
  backendMock.getOrganizationDirectoryRemediationApprovalPacketAudit.mockResolvedValue({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalPacketAuditCount: 1,
      boundary: "organization directory remediation approval packet audit 是 Admin producer 只读诊断。",
      packetAudits: [{
        packetAuditId: "approval-packet-audit:sample",
        packetHash: "sha256:packet-audit",
        approvalPreviewId: "approval-preview:sample",
        approvalPreviewHash: "sha256:approval-preview",
        draftId: "sha256:draft",
        actionAlias: "mapping_review",
        entityType: "user",
        executionMode: "manual_review_only",
        autoExecutionAllowed: false,
        eventTypes: ["generated_preview", "available_for_copy", "available_for_export"],
        packetStatus: "ready_for_approval",
        riskLevel: "medium",
        affectedCount: 1,
        blockedReasons: [],
        requiredApprovals: ["organization_directory_owner", "api_mapping_owner"],
        operatorChecklistDigest: ["sha256:checklist"],
        sampleStableHashes: ["sha256:sample"],
        safeSummary: "mapping_review/user approval packet audit covers 1 Admin-owned records.",
        storageScope: "derived_non_persistent",
        retentionPolicy: "not_persisted",
        exportSummary: {
          packetHash: "sha256:packet-audit",
          approvalPreviewHash: "sha256:approval-preview",
          executionMode: "manual_review_only",
          autoExecutionAllowed: false,
          storageScope: "derived_non_persistent",
          retentionPolicy: "not_persisted",
        },
      }],
      exportSummary: {
        storageScope: "derived_non_persistent",
        retentionPolicy: "not_persisted",
        packetAudits: [{
          packetHash: "sha256:packet-audit",
          approvalPreviewHash: "sha256:approval-preview",
          executionMode: "manual_review_only",
          autoExecutionAllowed: false,
          eventTypes: ["generated_preview", "available_for_copy", "available_for_export"],
          packetStatus: "ready_for_approval",
          riskLevel: "medium",
          sampleStableHashes: ["sha256:sample"],
        }],
      },
    },
  });
  backendMock.getOrganizationDirectoryRemediationApprovalPacketOperatorNotes.mockResolvedValue({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalNoteCount: 1,
      boundary: "organization directory remediation approval packet operator notes 是 Admin producer 只读诊断。",
      notes: [{
        noteId: "operator-note:sample",
        noteHash: "sha256:operator-note",
        packetHash: "sha256:packet-audit",
        approvalPreviewHash: "sha256:approval-preview",
        draftId: "sha256:draft",
        actionAlias: "mapping_review",
        entityType: "user",
        executionMode: "manual_review_only",
        autoExecutionAllowed: false,
        noteScope: "derived_note_draft",
        retentionPolicy: "not_persisted",
        noteFormat: "markdown",
        handoffSummary: "Handoff draft for mapping_review/user affecting 1 sanitized subject.",
        riskSummary: "risk=medium; requiredApprovals=organization_directory_owner,api_mapping_owner; blockedReasons=.",
        statusSummary: "packetStatus=ready_for_approval; retentionPolicy=not_persisted; executionMode=manual_review_only; autoExecutionAllowed=false.",
        checklistSummary: ["sha256:checklist"],
        cannotInfer: ["real_person_identity", "contact_identifier", "source_content", "auto_execution_allowed"],
        operatorNextSteps: ["将这份脱敏交接备注草稿交给人工 reviewer。"],
        sampleStableHashes: ["sha256:sample"],
        markdownSummary: "# Remediation Approval Packet Handoff Note\n- executionMode: `manual_review_only`\n## cannotInfer\n- real_person_identity",
        exportSummary: {
          noteHash: "sha256:operator-note",
          packetHash: "sha256:packet-audit",
          executionMode: "manual_review_only",
          autoExecutionAllowed: false,
          noteScope: "derived_note_draft",
          retentionPolicy: "not_persisted",
          markdownSummary: "# Remediation Approval Packet Handoff Note\n- executionMode: `manual_review_only`\n## cannotInfer\n- real_person_identity",
        },
      }],
      exportSummary: {
        noteScope: "derived_note_draft",
        retentionPolicy: "not_persisted",
        notes: [{
          noteHash: "sha256:operator-note",
          packetHash: "sha256:packet-audit",
          executionMode: "manual_review_only",
          autoExecutionAllowed: false,
          noteScope: "derived_note_draft",
          retentionPolicy: "not_persisted",
          markdownSummary: "# Remediation Approval Packet Handoff Note\n- executionMode: `manual_review_only`\n## cannotInfer\n- real_person_identity",
        }],
      },
    },
  });
  backendMock.getOrganizationDirectoryRemediationOperatorNotePersistenceReadiness.mockResolvedValue({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalReadinessCount: 1,
      boundary: "organization directory remediation operator note persistence readiness 是 Admin producer 只读准入。",
      readiness: [{
        readinessId: "operator-note-persistence-readiness:sample",
        readinessHash: "sha256:persistence-readiness",
        noteHash: "sha256:operator-note",
        packetHash: "sha256:packet-audit",
        approvalPreviewHash: "sha256:approval-preview",
        draftId: "sha256:draft",
        actionAlias: "mapping_review",
        entityType: "user",
        executionMode: "manual_review_only",
        autoExecutionAllowed: false,
        storageScope: "readiness_only",
        persistenceAllowed: false,
        storeDecisionRequired: true,
        readinessStatus: "ready_for_design_review",
        readyForPersistenceDesignReview: true,
        idempotencyKey: "operator-note-persistence:sample",
        idempotencyComponents: ["organizationId", "noteHash", "packetHash", "approvalPreviewHash"],
        permissionChecklist: ["organization_scoped_operator_permission", "write_permission_not_granted_in_p0"],
        retentionChecklist: ["retention_policy_required_before_store", "p0_notes_remain_not_persisted"],
        auditSemanticsChecklist: ["derived_note_is_not_audit_fact", "copy_export_events_not_persisted_in_p0"],
        redactionChecklist: ["stable_hash_only", "contact_identifier_not_exported", "source_content_not_exported"],
        manualReviewGate: ["manual_review_only_required", "auto_execution_must_remain_false", "persistence_requires_separate_store_decision"],
        cannotInfer: ["real_person_identity", "contact_identifier", "source_content", "persistent_audit_evidence"],
        blockedReasons: [],
        safeSummary: "Operator note persistence readiness for user/mapping_review uses readiness-only storage.",
      }],
      exportSummary: {
        storageScope: "readiness_only",
        persistenceAllowed: false,
        storeDecisionRequired: true,
        readiness: [{
          readinessHash: "sha256:persistence-readiness",
          noteHash: "sha256:operator-note",
          storageScope: "readiness_only",
          persistenceAllowed: false,
          storeDecisionRequired: true,
          readinessStatus: "ready_for_design_review",
          idempotencyKey: "operator-note-persistence:sample",
          redactionChecklist: ["stable_hash_only", "contact_identifier_not_exported"],
        }],
      },
    },
  });
  backendMock.getOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch.mockResolvedValue({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      searchId: "operator-note-readonly-audit-search:sample",
      totalItemCount: 1,
      searchScope: "current_derived_non_persistent",
      persistenceRequiredForHistoricalSearch: true,
      boundary: "organization directory remediation operator note readonly audit search 是 Admin producer 只读诊断。",
      cannotInfer: ["historical_search_completeness", "saved_operator_comments", "persistent_audit_evidence"],
      items: [{
        auditSearchItemId: "operator-note-readonly-audit-search-item:sample",
        noteHash: "sha256:operator-note",
        readinessHash: "sha256:persistence-readiness",
        packetHash: "sha256:packet-audit",
        approvalPreviewHash: "sha256:approval-preview",
        draftId: "sha256:draft",
        actionAlias: "mapping_review",
        entityType: "user",
        riskLevel: "medium",
        packetStatus: "ready_for_approval",
        readinessStatus: "ready_for_design_review",
        checklistAliases: ["manual_review_only_required", "auto_execution_must_remain_false"],
        reasonAliases: ["mapping_missing"],
        displaySafeLabel: "user/mapping_review operator note readonly audit",
        executionMode: "manual_review_only",
        autoExecutionAllowed: false,
        noteScope: "derived_note_draft",
        retentionPolicy: "not_persisted",
        storageScope: "readiness_only",
        manualReviewOnly: true,
        redactedFields: ["source_content_redacted", "contact_identifier", "full_organization_tree"],
        sourceVersionSummary: "sourceVersion=current_derived_metadata_only",
        orgVersionSummary: "orgVersion=current_admin_read_model_only",
        cannotInfer: ["historical_search_completeness", "saved_operator_comments", "persistent_audit_evidence"],
        blockedReasons: [],
        safeSummary: "Readonly handoff audit search for user/mapping_review remains manual-review-only.",
        markdownSummary: "# Operator Note Readonly Audit Search\n- executionMode: `manual_review_only`\n- persistenceRequiredForHistoricalSearch: `true`\n## cannotInfer\n- historical_search_completeness",
      }],
      exportSummary: {
        searchScope: "current_derived_non_persistent",
        persistenceRequiredForHistoricalSearch: true,
        cannotInfer: ["historical_search_completeness", "saved_operator_comments", "persistent_audit_evidence"],
        items: [{
          noteHash: "sha256:operator-note",
          readinessHash: "sha256:persistence-readiness",
          packetHash: "sha256:packet-audit",
          executionMode: "manual_review_only",
          autoExecutionAllowed: false,
          noteScope: "derived_note_draft",
          retentionPolicy: "not_persisted",
          storageScope: "readiness_only",
          manualReviewOnly: true,
          markdownSummary: "# Operator Note Readonly Audit Search\n- executionMode: `manual_review_only`\n- persistenceRequiredForHistoricalSearch: `true`",
        }],
      },
    },
  });
  global.Blob = jest.fn((parts: string[], options?: unknown) => ({parts, options})) as unknown as typeof Blob;
  global.URL.createObjectURL = jest.fn(() => "blob:remediation-plan") as unknown as typeof URL.createObjectURL;
  global.URL.revokeObjectURL = jest.fn() as unknown as typeof URL.revokeObjectURL;
  HTMLAnchorElement.prototype.click = jest.fn() as unknown as typeof HTMLAnchorElement.prototype.click;
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn(() => Promise.resolve()),
    },
  });
  jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

test("renders organization directory quality list and details without leaking source ids", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("组织目录质量")).not.toBeNull();
  expect(document.querySelector(".organization-directory-quality-page")).not.toBeNull();
  expect((await screen.findAllByText("修复计划")).length).toBeGreaterThan(0);
  expect((await screen.findAllByText("API 映射核对")).length).toBeGreaterThan(0);
  expect(screen.getByText("用户到 API 主体的一等映射缺失或不可信，需要 mapping owner 确认。")).not.toBeNull();
  expect(screen.getByText("Alice")).not.toBeNull();
  expect(screen.getAllByText("API 主体映射缺失").length).toBeGreaterThan(0);
  expect(screen.queryByText("external-subject-synthetic")).toBeNull();
  expect(screen.queryByText("org-alpha/alice")).not.toBeNull();
  expect(backendMock.getOrganizationDirectoryQuality).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    entityType: "user",
    current: 1,
    pageSize: 10,
  }));
  expect(backendMock.getOrganizationDirectoryRemediationPlan).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    entityType: "user",
    topN: 20,
  }));

  fireEvent.click(screen.getByText("详情"));
  expect(await screen.findByText("补齐 confirmed PlatformApiUserMapping。")).not.toBeNull();
  expect(screen.getByText("sha256:external")).not.toBeNull();
});

test("opens sanitized manual-review action draft drawer from remediation plan", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));

  expect(await screen.findByText("manual_review_only")).not.toBeNull();
  expect(screen.getByText("确认目标 API user 映射来源可信")).not.toBeNull();
  expect(screen.getByText("导出脱敏样例给 mapping owner 复核")).not.toBeNull();
  expect(screen.getByText(/user:6f2c9d8e1a0b/)).not.toBeNull();
  expect(backendMock.getOrganizationDirectoryRemediationActionDrafts).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    actionAlias: "mapping_review",
    entityType: "user",
    reasonCode: "mapping_missing",
    topN: 20,
  }));

  fireEvent.click(screen.getByText("复制草案"));
  await wait(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("manual_review_only")));

  fireEvent.click(screen.getByText("导出草案"));
  const exportedBlob = exportedBlobAt(0);
  expect(exportedBlob.parts.join("")).toContain("user:6f2c9d8e1a0b");
  expect(exportedBlob.parts.join("")).not.toContain("org-alpha/alice");
});

test("runs sanitized read-only preflight from action draft drawer", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  expect(await screen.findByText("manual_review_only")).not.toBeNull();
  fireEvent.click(screen.getByText("预检"));

  expect(await screen.findByText("readyForManualReview: true")).not.toBeNull();
  expect(screen.getByText("autoExecutionAllowed: false")).not.toBeNull();
  expect(screen.getByText("确认当前草案仅用于 manual review，不允许自动执行")).not.toBeNull();
  expect(screen.getByText("导出 preflight JSON 供修复 owner 人工复核")).not.toBeNull();
  expect(screen.getByText(/user:6f2c9d8e1a0b/)).not.toBeNull();
  expect(backendMock.getOrganizationDirectoryRemediationPreflight).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    draftId: "sha256:draft",
    actionAlias: "mapping_review",
    entityType: "user",
    topN: 20,
  }));

  fireEvent.click(screen.getByText("导出预检"));
  const exportedBlob = exportedBlobAt(0);
  expect(exportedBlob.parts.join("")).toContain("manual_review_only");
  expect(exportedBlob.parts.join("")).toContain("user:6f2c9d8e1a0b");
  expect(exportedBlob.parts.join("")).not.toContain("org-alpha/alice");
});

test("opens sanitized approval preview from preflight without repair actions", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  expect(await screen.findByText("manual_review_only")).not.toBeNull();
  fireEvent.click(screen.getByText("预检"));
  expect(await screen.findByText("readyForManualReview: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批预览"));

  expect(await screen.findByText("readyForApproval: true")).not.toBeNull();
  expect(screen.getByText("riskLevel: medium")).not.toBeNull();
  expect(screen.getByText("organization_directory_owner")).not.toBeNull();
  expect(screen.getByText("api_mapping_owner")).not.toBeNull();
  expect(screen.getByText("确认审批预览仅用于 manual review，P0 不允许自动执行")).not.toBeNull();
  expect(screen.getByText("sha256:sample")).not.toBeNull();
  expect(screen.queryByText("执行修复")).toBeNull();
  expect(backendMock.getOrganizationDirectoryRemediationApprovalPreview).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    draftId: "sha256:draft",
    actionAlias: "mapping_review",
    entityType: "user",
    topN: 20,
  }));

  fireEvent.click(screen.getByText("复制审批预览"));
  await wait(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("approval-preview")));

  fireEvent.click(screen.getByText("导出审批预览"));
  const exportedBlob = exportedBlobAt(0);
  expect(exportedBlob.parts.join("")).toContain("manual_review_only");
  expect(exportedBlob.parts.join("")).toContain("sha256:sample");
  expect(exportedBlob.parts.join("")).not.toContain("org-alpha/alice");
});

test("opens sanitized approval packet audit from approval preview without repair actions", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  expect(await screen.findByText("manual_review_only")).not.toBeNull();
  fireEvent.click(screen.getByText("预检"));
  expect(await screen.findByText("readyForManualReview: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批预览"));
  expect(await screen.findByText("readyForApproval: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批包审计"));

  expect((await screen.findAllByText("审批包审计")).length).toBeGreaterThan(0);
  expect(screen.getByText("ready_for_approval")).not.toBeNull();
  expect(screen.getByText("derived_non_persistent / not_persisted")).not.toBeNull();
  expect(screen.getByText("generated_preview")).not.toBeNull();
  expect(screen.getByText("available_for_copy")).not.toBeNull();
  expect(screen.getByText("sha256:checklist")).not.toBeNull();
  expect(screen.queryByText("执行修复")).toBeNull();
  expect(backendMock.getOrganizationDirectoryRemediationApprovalPacketAudit).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    approvalPreviewHash: "sha256:approval-preview",
    draftId: "sha256:draft",
    packetStatus: "ready_for_approval",
    riskLevel: "medium",
    topN: 20,
  }));

  fireEvent.click(screen.getByText("复制审批包审计"));
  await wait(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("derived_non_persistent")));

  fireEvent.click(screen.getByText("导出审批包审计"));
  const exportedBlob = exportedBlobAt(0);
  expect(exportedBlob.parts.join("")).toContain("sha256:packet-audit");
  expect(exportedBlob.parts.join("")).toContain("not_persisted");
  expect(exportedBlob.parts.join("")).not.toContain("org-alpha/alice");

  fireEvent.click(screen.getByText("交接备注"));
  expect((await screen.findAllByText("交接备注")).length).toBeGreaterThan(0);
  expect(screen.getByText("derived_note_draft")).not.toBeNull();
  expect(screen.getByText("derived_note_draft / not_persisted")).not.toBeNull();
  expect(screen.getByText("real_person_identity")).not.toBeNull();
  expect(screen.getByText("sha256:operator-note")).not.toBeNull();
  expect(screen.queryByText("执行修复")).toBeNull();
  expect(backendMock.getOrganizationDirectoryRemediationApprovalPacketOperatorNotes).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    packetHash: "sha256:packet-audit",
    approvalPreviewHash: "sha256:approval-preview",
    draftId: "sha256:draft",
    packetStatus: "ready_for_approval",
    riskLevel: "medium",
    topN: 20,
  }));

  fireEvent.click(screen.getByText("复制交接备注JSON"));
  await wait(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("derived_note_draft")));
  fireEvent.click(screen.getByText("复制交接备注Markdown"));
  await wait(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("cannotInfer")));

  fireEvent.click(screen.getByText("导出交接备注JSON"));
  const exportedNotesJson = exportedBlobAt(1);
  expect(exportedNotesJson.parts.join("")).toContain("sha256:operator-note");
  expect(exportedNotesJson.parts.join("")).not.toContain("org-alpha/alice");

  fireEvent.click(screen.getByText("导出交接备注Markdown"));
  const exportedNotesMarkdown = exportedBlobAt(2);
  expect(exportedNotesMarkdown.parts.join("")).toContain("manual_review_only");
  expect(exportedNotesMarkdown.parts.join("")).not.toContain("org-alpha/alice");

  fireEvent.click(screen.getByText("持久化准入"));
  expect((await screen.findAllByText("持久化准入")).length).toBeGreaterThan(0);
  expect(screen.getByText("ready_for_design_review")).not.toBeNull();
  expect(screen.getByText("readiness_only / persistenceAllowed=false / storeDecisionRequired=true")).not.toBeNull();
  expect(screen.getByText("operator-note-persistence:sample")).not.toBeNull();
  expect(screen.getByText("auto_execution_must_remain_false")).not.toBeNull();
  expect(screen.getByText("persistent_audit_evidence")).not.toBeNull();
  expect(screen.queryByText("保存备注")).toBeNull();
  expect(backendMock.getOrganizationDirectoryRemediationOperatorNotePersistenceReadiness).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    noteHash: "sha256:operator-note",
    packetHash: "sha256:packet-audit",
    approvalPreviewHash: "sha256:approval-preview",
    draftId: "sha256:draft",
    packetStatus: "ready_for_approval",
    riskLevel: "medium",
    topN: 20,
  }));

  fireEvent.click(screen.getByText("复制持久化准入JSON"));
  await wait(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("readiness_only")));

  fireEvent.click(screen.getByText("导出持久化准入JSON"));
  const exportedReadinessJson = exportedBlobAt(3);
  expect(exportedReadinessJson.parts.join("")).toContain("sha256:persistence-readiness");
  expect(exportedReadinessJson.parts.join("")).toContain("storeDecisionRequired");
  expect(exportedReadinessJson.parts.join("")).not.toContain("org-alpha/alice");

  fireEvent.click(screen.getByText("备注审计检索"));
  expect((await screen.findAllByText("备注审计检索")).length).toBeGreaterThan(0);
  expect(screen.getByText("current_derived_non_persistent")).not.toBeNull();
  expect(screen.getByText("persistenceRequiredForHistoricalSearch: true")).not.toBeNull();
  expect(screen.getAllByText("historical_search_completeness").length).toBeGreaterThan(0);
  expect(screen.getAllByText("saved_operator_comments").length).toBeGreaterThan(0);
  expect(screen.getByText("source_content_redacted")).not.toBeNull();
  expect(screen.getByText("readiness_only / derived_note_draft / not_persisted")).not.toBeNull();
  expect(screen.queryByText("保存备注")).toBeNull();
  expect(screen.queryByText("执行修复")).toBeNull();
  expect(backendMock.getOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    noteHash: "sha256:operator-note",
    readinessHash: "sha256:persistence-readiness",
    packetHash: "sha256:packet-audit",
    approvalPreviewHash: "sha256:approval-preview",
    draftId: "sha256:draft",
    packetStatus: "ready_for_approval",
    readinessStatus: "ready_for_design_review",
    includeHistorical: true,
    historyMode: "persistent",
    topN: 20,
  }));

  fireEvent.click(screen.getByText("复制备注审计检索JSON"));
  await wait(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("current_derived_non_persistent")));
  fireEvent.click(screen.getByText("复制备注审计检索Markdown"));
  await wait(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("persistenceRequiredForHistoricalSearch")));

  fireEvent.click(screen.getByText("导出备注审计检索JSON"));
  const exportedSearchJson = exportedBlobAt(4);
  expect(exportedSearchJson.parts.join("")).toContain("sha256:persistence-readiness");
  expect(exportedSearchJson.parts.join("")).toContain("manual_review_only");
  expect(exportedSearchJson.parts.join("")).not.toContain("org-alpha/alice");

  (navigator.clipboard.writeText as unknown as LooseMock).mockRejectedValueOnce(new Error("copy failed"));
  fireEvent.click(screen.getByText("复制备注审计检索JSON"));
  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "复制脱敏备注审计检索JSON失败"));

  (navigator.clipboard.writeText as unknown as LooseMock).mockRejectedValueOnce(new Error("copy failed"));
  fireEvent.click(screen.getByText("复制备注审计检索Markdown"));
  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "复制脱敏备注审计检索Markdown失败"));
});

test("shows blocked approval preview and fails closed on approval preview errors", async() => {
  backendMock.getOrganizationDirectoryRemediationApprovalPreview.mockResolvedValueOnce({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalApprovalPreviewCount: 1,
      approvalPreviews: [{
        approvalPreviewId: "approval-preview:blocked",
        approvalPreviewHash: "sha256:blocked",
        draftId: "sha256:draft",
        actionAlias: "mapping_review",
        executionMode: "manual_review_only",
        autoExecutionAllowed: false,
        readyForApproval: false,
        affectedCount: 0,
        riskLevel: "blocked",
        blockedReasons: ["missing_preflight_samples"],
        requiredApprovals: ["organization_directory_owner"],
        operatorChecklist: ["确认 autoExecutionAllowed=false 且没有执行/修复入口"],
        safeSummary: "blocked",
        sampleStableHashes: [],
      }],
      exportSummary: {approvalPreviews: []},
    },
  }).mockResolvedValueOnce({status: "error", msg: "approval failed"});

  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  expect(await screen.findByText("manual_review_only")).not.toBeNull();
  fireEvent.click(screen.getByText("预检"));
  expect(await screen.findByText("readyForManualReview: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批预览"));
  expect(await screen.findByText("readyForApproval: false")).not.toBeNull();
  expect(screen.getByText("riskLevel: blocked")).not.toBeNull();
  expect(screen.getByText("missing_preflight_samples")).not.toBeNull();
  expect(screen.queryByText("执行修复")).toBeNull();

  fireEvent.click(screen.getByText("审批预览"));
  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "approval failed"));
});

test("fails closed on approval packet audit errors", async() => {
  backendMock.getOrganizationDirectoryRemediationApprovalPacketAudit.mockResolvedValueOnce({status: "error", msg: "audit failed"});
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  expect(await screen.findByText("manual_review_only")).not.toBeNull();
  fireEvent.click(screen.getByText("预检"));
  expect(await screen.findByText("readyForManualReview: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批预览"));
  expect(await screen.findByText("readyForApproval: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批包审计"));

  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "audit failed"));
  expect(screen.queryByText("执行修复")).toBeNull();
});

test("fails closed on approval packet operator notes errors", async() => {
  backendMock.getOrganizationDirectoryRemediationApprovalPacketOperatorNotes.mockResolvedValueOnce({status: "error", msg: "notes failed"});
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  fireEvent.click(await screen.findByText("预检"));
  fireEvent.click(await screen.findByText("审批预览"));
  expect(await screen.findByText("readyForApproval: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批包审计"));
  expect(await screen.findByText("ready_for_approval")).not.toBeNull();
  fireEvent.click(screen.getByText("交接备注"));

  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "notes failed"));
  expect(screen.queryByText("执行修复")).toBeNull();
});

test("fails closed on operator note persistence readiness errors", async() => {
  backendMock.getOrganizationDirectoryRemediationOperatorNotePersistenceReadiness.mockResolvedValueOnce({status: "error", msg: "readiness failed"});
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  fireEvent.click(await screen.findByText("预检"));
  fireEvent.click(await screen.findByText("审批预览"));
  expect(await screen.findByText("readyForApproval: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批包审计"));
  expect(await screen.findByText("ready_for_approval")).not.toBeNull();
  fireEvent.click(screen.getByText("交接备注"));
  expect(await screen.findByText("derived_note_draft")).not.toBeNull();
  fireEvent.click(screen.getByText("持久化准入"));

  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "readiness failed"));
  expect(screen.queryByText("保存备注")).toBeNull();
});

test("fails closed on operator note readonly audit search errors", async() => {
  backendMock.getOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch.mockResolvedValueOnce({status: "error", msg: "search failed"});
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  fireEvent.click(await screen.findByText("预检"));
  fireEvent.click(await screen.findByText("审批预览"));
  expect(await screen.findByText("readyForApproval: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批包审计"));
  expect(await screen.findByText("ready_for_approval")).not.toBeNull();
  fireEvent.click(screen.getByText("交接备注"));
  expect(await screen.findByText("derived_note_draft")).not.toBeNull();
  fireEvent.click(screen.getByText("持久化准入"));
  expect(await screen.findByText("ready_for_design_review")).not.toBeNull();
  fireEvent.click(screen.getByText("备注审计检索"));

  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "search failed"));
  expect(screen.queryByText("保存备注")).toBeNull();
  expect(screen.queryByText("执行修复")).toBeNull();
});

test("shows empty operator note persistence readiness without writes", async() => {
  backendMock.getOrganizationDirectoryRemediationOperatorNotePersistenceReadiness.mockResolvedValueOnce({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalReadinessCount: 0,
      boundary: "organization directory remediation operator note persistence readiness 是 Admin producer 只读准入。",
      readiness: [],
      exportSummary: {storageScope: "readiness_only", persistenceAllowed: false, storeDecisionRequired: true, readiness: []},
    },
  });
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  fireEvent.click(await screen.findByText("预检"));
  fireEvent.click(await screen.findByText("审批预览"));
  expect(await screen.findByText("readyForApproval: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批包审计"));
  expect(await screen.findByText("ready_for_approval")).not.toBeNull();
  fireEvent.click(screen.getByText("交接备注"));
  expect(await screen.findByText("derived_note_draft")).not.toBeNull();
  fireEvent.click(screen.getByText("持久化准入"));

  expect(await screen.findByText("暂无持久化准入")).not.toBeNull();
  expectButtonDisabled("复制持久化准入JSON");
  expectButtonDisabled("导出持久化准入JSON");
  expect(screen.queryByText("保存备注")).toBeNull();
});

test("shows empty operator note readonly audit search without writes", async() => {
  backendMock.getOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch.mockResolvedValueOnce({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      searchId: "operator-note-readonly-audit-search:empty",
      totalItemCount: 0,
      searchScope: "current_derived_non_persistent",
      persistenceRequiredForHistoricalSearch: true,
      cannotInfer: ["historical_search_completeness"],
      boundary: "organization directory remediation operator note readonly audit search 是 Admin producer 只读诊断。",
      items: [],
      exportSummary: {searchScope: "current_derived_non_persistent", persistenceRequiredForHistoricalSearch: true, items: []},
    },
  });
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  fireEvent.click(await screen.findByText("预检"));
  fireEvent.click(await screen.findByText("审批预览"));
  expect(await screen.findByText("readyForApproval: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批包审计"));
  expect(await screen.findByText("ready_for_approval")).not.toBeNull();
  fireEvent.click(screen.getByText("交接备注"));
  expect(await screen.findByText("derived_note_draft")).not.toBeNull();
  fireEvent.click(screen.getByText("持久化准入"));
  expect(await screen.findByText("ready_for_design_review")).not.toBeNull();
  fireEvent.click(screen.getByText("备注审计检索"));

  expect(await screen.findByText("暂无备注审计检索")).not.toBeNull();
  expectButtonDisabled("复制备注审计检索JSON");
  expectButtonDisabled("导出备注审计检索JSON");
  expect(screen.queryByText("保存备注")).toBeNull();
  expect(screen.queryByText("执行修复")).toBeNull();
});

test("shows empty approval packet operator notes without writes", async() => {
  backendMock.getOrganizationDirectoryRemediationApprovalPacketOperatorNotes.mockResolvedValueOnce({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalNoteCount: 0,
      boundary: "organization directory remediation approval packet operator notes 是 Admin producer 只读诊断。",
      notes: [],
      exportSummary: {noteScope: "derived_note_draft", retentionPolicy: "not_persisted", notes: []},
    },
  });
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  fireEvent.click(await screen.findByText("预检"));
  fireEvent.click(await screen.findByText("审批预览"));
  expect(await screen.findByText("readyForApproval: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批包审计"));
  expect(await screen.findByText("ready_for_approval")).not.toBeNull();
  fireEvent.click(screen.getByText("交接备注"));

  expect(await screen.findByText("暂无交接备注")).not.toBeNull();
  expectButtonDisabled("复制交接备注JSON");
  expectButtonDisabled("导出交接备注JSON");
  expect(screen.queryByText("执行修复")).toBeNull();
});

test("shows empty approval packet audit history without writes", async() => {
  backendMock.getOrganizationDirectoryRemediationApprovalPacketAudit.mockResolvedValueOnce({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalPacketAuditCount: 0,
      boundary: "organization directory remediation approval packet audit 是 Admin producer 只读诊断。",
      packetAudits: [],
      exportSummary: {storageScope: "derived_non_persistent", retentionPolicy: "not_persisted", packetAudits: []},
    },
  });
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  fireEvent.click(await screen.findByText("预检"));
  expect(await screen.findByText("readyForManualReview: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批预览"));
  expect(await screen.findByText("readyForApproval: true")).not.toBeNull();
  fireEvent.click(screen.getByText("审批包审计"));

  expect(await screen.findByText("暂无审批包审计")).not.toBeNull();
  expectButtonDisabled("复制审批包审计");
  expectButtonDisabled("导出审批包审计");
});

test("shows blocked preflight errors without repair actions", async() => {
  backendMock.getOrganizationDirectoryRemediationPreflight.mockResolvedValueOnce({status: "error", msg: "preflight failed"});
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  expect(await screen.findByText("manual_review_only")).not.toBeNull();
  fireEvent.click(screen.getByText("预检"));

  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "preflight failed"));
  expect(screen.queryByText("执行修复")).toBeNull();
});

test("refreshes directory quality with selected filters", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("Alice");
  fireEvent.change(screen.getByTestId("organization-select"), {target: {value: "org-alpha"}});
  fireEvent.click(screen.getByText("刷新"));

  await wait(() => expect(backendMock.getOrganizationDirectoryQuality).toHaveBeenCalledTimes(2));
  await wait(() => expect(backendMock.getOrganizationDirectoryRemediationPlan).toHaveBeenCalledTimes(2));
});

test("shows business labels for no manageable department directory quality aliases while preserving export values", async() => {
  backendMock.getOrganizationDirectoryQuality.mockResolvedValueOnce({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      entityType: "department",
      page: 1,
      pageSize: 10,
      total: 1,
      summary: {ready: 0, warning: 0, blocked: 1, total: 1},
      reasonAliases: ["scope_has_no_manageable_departments"],
      boundary: "Admin producer diagnostics only.",
      items: [{
        entityType: "department",
        entityId: "scope",
        displayName: "当前范围",
        organizationId: "org-alpha",
        sourceType: "wecom",
        sourceConnectionIdHash: "sha256:source",
        lifecycleStatus: "ACTIVE",
        qualityStatus: "blocked",
        reasonCodes: ["scope_has_no_manageable_departments"],
        remediationHints: ["检查组织管理范围、来源连接或管理员权限。"],
      }],
    },
  });
  backendMock.getOrganizationDirectoryRemediationPlan.mockResolvedValueOnce({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalPlanCount: 1,
      boundary: "organization directory remediation plan 是 Admin producer 只读诊断。",
      plans: [{
        planId: "sha256:scope",
        planKey: "scope_review",
        priority: "P0",
        actionAlias: "scope_has_no_manageable_departments",
        reasonCodes: ["scope_has_no_manageable_departments"],
        affectedCounts: {department: 0, user: 0, membership: 0, total: 0},
        sampleEntityIds: [],
        safeSummary: "scope_has_no_manageable_departments",
        operatorActions: ["scope_has_no_manageable_departments"],
        blockedReason: "scope_has_no_manageable_departments",
      }],
      exportSummary: {
        plans: [{
          actionAlias: "scope_has_no_manageable_departments",
          reasonCodes: ["scope_has_no_manageable_departments"],
        }],
      },
    },
  });

  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect((await screen.findAllByText("当前组织暂无可管理部门")).length).toBeGreaterThan(1);
  expect(screen.getAllByText("检查组织管理范围、来源连接或管理员权限。").length).toBeGreaterThan(0);
  expect(screen.queryByText("scope_has_no_manageable_departments")).toBeNull();

  fireEvent.click(screen.getByText("导出计划"));

  const exportedBlob = exportedBlobAt(0);
  expect(exportedBlob.parts.join("")).toContain("scope_has_no_manageable_departments");
});

test("keeps version and batch evidence out of the primary quality table", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("Alice");
  expect(screen.queryByText("版本/批次")).toBeNull();
  expect(screen.queryByText("orgv-1")).toBeNull();
  fireEvent.click(screen.getByText("详情"));
  expect(await screen.findByText("技术详情")).not.toBeNull();
  expect(screen.getAllByText("orgv-1").length).toBeGreaterThan(0);
  expect(screen.getAllByText("batch-1").length).toBeGreaterThan(0);
});

test("fails closed when directory quality or remediation plan loading fails", async() => {
  backendMock.getOrganizationDirectoryQuality.mockResolvedValueOnce({status: "error", msg: "quality failed"});
  backendMock.getOrganizationDirectoryRemediationPlan.mockResolvedValueOnce({status: "error", msg: "plan failed"});

  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "quality failed"));
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "plan failed");
  expect(screen.getByText("暂无待处理修复计划")).not.toBeNull();
});

test("handles empty plan export and action draft load failure without writes", async() => {
  backendMock.getOrganizationDirectoryRemediationPlan.mockResolvedValueOnce({
    status: "ok",
    data: {
      organizationId: "org-alpha",
      totalPlanCount: 1,
      boundary: "organization directory remediation plan 是 Admin producer 只读诊断。",
      plans: [{
        planId: "sha256:plan",
        planKey: "mapping_review",
        priority: "P1",
        actionAlias: "mapping_review",
        reasonCodes: ["mapping_missing"],
        affectedCounts: {total: 1},
        safeSummary: "用户到 API 主体的一等映射缺失或不可信，需要 mapping owner 确认。",
      }],
      exportSummary: null,
    },
  });
  backendMock.getOrganizationDirectoryRemediationActionDrafts.mockResolvedValueOnce({status: "error", msg: "draft failed"});

  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("导出计划"));
  expect(Setting.showMessage).toHaveBeenCalledWith("warning", "暂无可导出的修复计划");

  fireEvent.click(screen.getByText("草案"));
  await wait(() => expect(Setting.showMessage).toHaveBeenCalledWith("error", "draft failed"));
});

test("keeps copy action fail-closed when clipboard is unavailable", async() => {
  Object.defineProperty(navigator, "clipboard", {value: {}, configurable: true});
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("草案"));
  expect(await screen.findByText("manual_review_only")).not.toBeNull();
  fireEvent.click(screen.getByText("复制草案"));

  expect(Setting.showMessage).toHaveBeenCalledWith("error", "当前浏览器不支持复制草案");
});

test("exports sanitized remediation plan summary on the client", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("API 映射核对");
  fireEvent.click(screen.getByText("导出计划"));

  expect(global.URL.createObjectURL).toHaveBeenCalled();
  const exportedBlob = exportedBlobAt(0);
  expect(exportedBlob.parts.join("")).toContain("user:sha256:sample");
  expect(exportedBlob.parts.join("")).not.toContain("external-subject-synthetic");
});
