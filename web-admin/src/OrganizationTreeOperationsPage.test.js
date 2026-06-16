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
import * as OrganizationTreeOperationsBackend from "./backend/OrganizationTreeOperationsBackend";
import OrganizationTreeOperationsPage from "./OrganizationTreeOperationsPage";

jest.mock("./backend/OrganizationTreeOperationsBackend", () => ({
  getOrganizationTreeOperationsDiagnostics: jest.fn(),
  getOrganizationTreeOperationsMembers: jest.fn(),
  refreshOrganizationTreeOperations: jest.fn(),
}));

jest.mock("./common/select/OrganizationSelect", () => (props) => (
  <select data-testid="organization-select" value={props.initValue} onChange={event => props.onChange(event.target.value)}>
    <option value="org-alpha">测试组织</option>
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

function buildDiagnostics(overrides = {}) {
  return {
    organization: "org-alpha",
    status: "ok",
    summary: {
      totalPlatformDepartmentCount: 2,
      visibleNodeCount: 1,
      filteredNodeCount: 1,
      diagnosticItemCount: 1,
      orgVersion: "orgv-1",
      scopeVersion: "scopev-1",
      freshness: "current",
      generatedAt: "2026-06-11T00:00:00Z",
      readModelSource: "platform_department",
      mappingStatus: "CONFIRMED",
      lifecycleStatus: "active",
    },
    nodes: [{
      departmentId: "dept-root",
      departmentName: "根部门",
      departmentPath: "/根部门",
      lifecycleStatus: "active",
      sourceType: "wecom",
      sourceConnectionId: "source-1",
      sourceConnectionStatus: "ACTIVE",
      sourceConnectionFreshness: "current",
      visibilitySource: "scope",
      readModelSource: "platform_department",
      lineage: {
        batchId: "batch-1",
        sourceOrgVersion: "orgv-1",
      },
      memberSummary: {
        memberCount: 2,
        activeMemberCount: 1,
        disabledMemberCount: 1,
        conflictedMemberCount: 0,
        mappingIssueCount: 1,
        staleMemberCount: 0,
      },
    }],
    diagnostics: [{
      subjectType: "department",
      subjectId: "dept-disabled",
      displayName: "停用部门",
      reason: "lifecycle_not_active",
      lifecycleStatus: "disabled",
      sourceType: "wecom",
      freshness: "current",
      readModelSource: "platform_department",
    }],
    sourceConnections: [{
      sourceConnectionId: "source-1",
      sourceType: "wecom",
      status: "ACTIVE",
      freshness: "current",
      lastSeenBatchId: "batch-1",
      configured: true,
    }],
    latestSyncBatch: {
      batchId: "batch-1",
      status: "SUCCEEDED",
      orgVersion: "orgv-1",
      freshness: "current",
    },
    lineage: {
      readModelSource: "platform_department",
      sourceOrgVersion: "orgv-1",
      sourceConnectionId: "source-1",
      batchId: "batch-1",
    },
    ...overrides,
  };
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
  OrganizationTreeOperationsBackend.getOrganizationTreeOperationsDiagnostics.mockResolvedValue({
    status: "ok",
    data: buildDiagnostics(),
  });
  OrganizationTreeOperationsBackend.getOrganizationTreeOperationsMembers.mockResolvedValue({
    status: "ok",
    data: {
      organization: "org-alpha",
      departmentId: "dept-root",
      page: 1,
      pageSize: 10,
      total: 2,
      members: [
        {
          stableSubjectId: "subj-active",
          displayName: "Active Member",
          departmentId: "dept-root",
          lifecycleStatus: "ACTIVE",
          mappingStatus: "OK",
          sourceType: "wecom",
          sourceConnectionId: "source-1",
          readModelSource: "platform_department",
          freshness: "FRESH",
          reason: "ok",
          isMain: true,
          lineage: {
            sourceConnectionId: "source-1",
            sourceOrgVersion: "orgv-1",
            lastSeenBatchId: "batch-1",
            digest: "sha256:active",
          },
        },
        {
          stableSubjectId: "subj-disabled",
          displayName: "Disabled Member",
          departmentId: "dept-root",
          lifecycleStatus: "DISABLED",
          mappingStatus: "MISSING",
          sourceType: "wecom",
          sourceConnectionId: "source-1",
          readModelSource: "platform_department",
          freshness: "FRESH",
          reason: "mapping_missing",
          lineage: {
            sourceConnectionId: "source-1",
            sourceOrgVersion: "orgv-1",
            lastSeenBatchId: "batch-1",
            digest: "sha256:disabled",
          },
        },
      ],
    },
  });
  OrganizationTreeOperationsBackend.refreshOrganizationTreeOperations.mockResolvedValue({
    status: "ok",
    data: {
      status: "ok",
      diagnostics: buildDiagnostics({summary: {...buildDiagnostics().summary, visibleNodeCount: 2}}),
    },
  });
});

afterEach(() => {
  Setting.showMessage.mockRestore();
  jest.clearAllMocks();
});

test("renders organization tree operations diagnostics without treating display data as authority", async() => {
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("组织树节点")).toBeInTheDocument();
  expect(screen.getByText("可见节点")).toBeInTheDocument();
  expect(screen.getAllByText("orgv-1").length).toBeGreaterThan(0);
  expect(screen.getByText("根部门")).toBeInTheDocument();
  expect(screen.getByText("停用部门")).toBeInTheDocument();
  expect(screen.getByText("仅诊断和受控刷新，不编辑源事实")).toBeInTheDocument();
});

test("compacts long versions in summary cards while keeping copyable diagnostics", async() => {
  const longOrgVersion = "orgv-ed073c4ab7a34c05d79fdb539df3f0a31714bfdb8ccca2c59027370474815437";
  const longScopeVersion = "scopev-03ceeba02044c23b02a5602c77d00403446f76edb3100cc37f214ce4168692c4";
  OrganizationTreeOperationsBackend.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
    status: "ok",
    data: buildDiagnostics({
      summary: {
        ...buildDiagnostics().summary,
        orgVersion: longOrgVersion,
        scopeVersion: longScopeVersion,
      },
      latestSyncBatch: {
        batchId: "wecom-sync-run-1781001798227089130",
        status: "SUCCEEDED",
        orgVersion: longOrgVersion,
        freshness: "current",
      },
    }),
  });

  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("orgv-ed073c4ab...74815437")).toBeInTheDocument();
  expect(screen.getByText("scopev-03cee...168692c4")).toBeInTheDocument();
  expect(screen.queryByRole("heading", {name: longOrgVersion})).not.toBeInTheDocument();
});

test("defaults to collapsible tree view and keeps list view available", async() => {
  OrganizationTreeOperationsBackend.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
    status: "ok",
    data: buildDiagnostics({
      nodes: [
        ...buildDiagnostics().nodes,
        {
          departmentId: "dept-child",
          parentDepartmentId: "dept-root",
          departmentName: "子部门",
          departmentPath: "/根部门/子部门",
          lifecycleStatus: "active",
          sourceType: "wecom",
          sourceConnectionId: "source-1",
          sourceConnectionStatus: "ACTIVE",
          sourceConnectionFreshness: "current",
          visibilitySource: "scope",
          readModelSource: "platform_department",
        },
      ],
    }),
  });

  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("树视图")).toBeInTheDocument();
  expect(screen.getByText("子部门")).toBeInTheDocument();
  expect(screen.queryByText("部门")).not.toBeInTheDocument();

  fireEvent.click(screen.getByText("列表视图"));

  expect(await screen.findByText("部门")).toBeInTheDocument();
  expect(screen.getByText("子部门")).toBeInTheDocument();
});

test("lazy loads paged members only after selecting a department in member view", async() => {
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("树视图")).toBeInTheDocument();
  expect(OrganizationTreeOperationsBackend.getOrganizationTreeOperationsMembers).not.toHaveBeenCalled();

  fireEvent.click(screen.getByText("成员视图"));

  expect(await screen.findByText("选择部门查看成员诊断")).toBeInTheDocument();
  expect(OrganizationTreeOperationsBackend.getOrganizationTreeOperationsMembers).not.toHaveBeenCalled();

  fireEvent.click(screen.getAllByText("根部门")[0]);

  await wait(() => expect(OrganizationTreeOperationsBackend.getOrganizationTreeOperationsMembers).toHaveBeenCalledWith("org-alpha", "dept-root", 1, 10));
  expect(await screen.findByText("Active Member")).toBeInTheDocument();
  expect(screen.getByText("Disabled Member")).toBeInTheDocument();
  expect(screen.getAllByText("新鲜").length).toBeGreaterThan(0);
  expect(screen.getByText("成员 2")).toBeInTheDocument();
  expect(screen.getByText("异常 1")).toBeInTheDocument();
});

test("opens member detail drawer with diagnostics metadata", async() => {
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("树视图");
  fireEvent.click(screen.getByText("成员视图"));
  fireEvent.click(screen.getAllByText("根部门")[0]);
  fireEvent.click(await screen.findByText("Active Member"));

  expect(await screen.findByText("成员详情")).toBeInTheDocument();
  expect(screen.getByText("subj-active")).toBeInTheDocument();
  expect(screen.getByText("mappingStatus")).toBeInTheDocument();
  expect(screen.getByText("lineageDigest")).toBeInTheDocument();
});

test("passes stable search and filters to diagnostics endpoint", async() => {
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("根部门");
  fireEvent.change(screen.getByPlaceholderText("搜索稳定部门 ID、名称或路径"), {target: {value: "dept-root"}});
  fireEvent.click(screen.getByText("查询"));

  await wait(() => expect(OrganizationTreeOperationsBackend.getOrganizationTreeOperationsDiagnostics).toHaveBeenLastCalledWith("org-alpha", expect.objectContaining({
    query: "dept-root",
  })));
});

test("shows fail-closed empty tree class and supports controlled refresh", async() => {
  OrganizationTreeOperationsBackend.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
    status: "ok",
    data: buildDiagnostics({
      status: "untrusted",
      emptyTreeClass: "untrusted_read_model",
      reason: "source connection stale",
      nodes: [],
      summary: {...buildDiagnostics().summary, visibleNodeCount: 0, diagnosticItemCount: 1, freshness: "stale"},
    }),
  });

  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  await wait(() => expect(screen.getAllByText("不可信数据").length).toBeGreaterThan(0));
  expect(screen.getByText("组织树当前未通过可信校验")).toBeInTheDocument();

  fireEvent.click(screen.getByText("刷新诊断"));

  await wait(() => expect(OrganizationTreeOperationsBackend.refreshOrganizationTreeOperations).toHaveBeenCalledWith("org-alpha", "refresh_status"));
});

test("shows stable error state when diagnostics endpoint is unauthorized", async() => {
  OrganizationTreeOperationsBackend.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
    status: "error",
    msg: "Unauthorized operation",
  });

  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("组织树运营数据加载失败")).toBeInTheDocument();
  expect(screen.getByText("Unauthorized operation")).toBeInTheDocument();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Unauthorized operation");
});
