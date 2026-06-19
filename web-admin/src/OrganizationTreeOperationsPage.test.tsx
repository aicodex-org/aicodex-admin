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
import {act, render} from "@testing-library/react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import * as Setting from "./Setting";
import * as OrganizationTreeOperationsBackend from "./backend/OrganizationTreeOperationsBackend";
import OrganizationTreeOperationsPage from "./OrganizationTreeOperationsPage";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};
type OrganizationTreeOperationsBackendMock = Record<
  "getOrganizationTreeOperationsDiagnostics" | "getOrganizationTreeOperationsMembers" | "refreshOrganizationTreeOperations",
  LooseMock
>;
type OrganizationSelectMockProps = {
  initValue?: string;
  onChange: (value: string) => void;
};

const expect = jestExpect;
const {fireEvent, screen, wait} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: unknown) => boolean;
  };
  screen: {
    findByText: (text: string | RegExp) => Promise<HTMLElement>;
    getByText: (text: string | RegExp) => HTMLElement;
    getAllByText: (text: string | RegExp) => HTMLElement[];
    queryByText: (text: string | RegExp) => HTMLElement | null;
    getByPlaceholderText: (text: string | RegExp) => HTMLElement;
    getByTestId: (id: string) => HTMLElement;
    getAllByTestId: (id: string) => HTMLElement[];
  };
  wait: (callback: () => unknown) => Promise<unknown>;
};
const treeBackendMock = OrganizationTreeOperationsBackend as unknown as OrganizationTreeOperationsBackendMock;

jest.mock("./backend/OrganizationTreeOperationsBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: Pick<typeof jestValue, "fn">};
  return {
    getOrganizationTreeOperationsDiagnostics: factoryJest.fn(),
    getOrganizationTreeOperationsMembers: factoryJest.fn(),
    refreshOrganizationTreeOperations: factoryJest.fn(),
  };
});

jest.mock("./common/select/OrganizationSelect", () => (props: OrganizationSelectMockProps) => (
  <select data-testid="organization-select" value={props.initValue} onChange={event => props.onChange(event.target.value)}>
    <option value="org-alpha">测试组织</option>
    <option value="org-beta">备用组织</option>
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

function buildDiagnostics(overrides: Record<string, unknown> = {}) {
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
  treeBackendMock.getOrganizationTreeOperationsDiagnostics.mockResolvedValue({
    status: "ok",
    data: buildDiagnostics(),
  });
  treeBackendMock.getOrganizationTreeOperationsMembers.mockResolvedValue({
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
  treeBackendMock.refreshOrganizationTreeOperations.mockResolvedValue({
    status: "ok",
    data: {
      status: "ok",
      diagnostics: buildDiagnostics({summary: {...buildDiagnostics().summary, visibleNodeCount: 2}}),
    },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test("renders organization tree operations diagnostics without treating display data as authority", async() => {
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("组织树节点")).toBeTruthy();
  expect(document.querySelector(".organization-tree-operations-page")).not.toBeNull();
  expect(screen.getByText("可见节点")).toBeTruthy();
  expect(screen.queryByText("orgv-1")).toBeFalsy();
  expect(screen.queryByText("readModelSource")).toBeFalsy();
  expect(screen.getByText("根部门")).toBeTruthy();
  expect(screen.getByText("停用部门")).toBeTruthy();
  expect(screen.getByText("仅诊断和受控刷新，不编辑源事实")).toBeTruthy();
  expect(screen.queryByText("重建 read model")).toBeFalsy();
  expect(screen.getByText("重建目录视图")).toBeTruthy();
  fireEvent.click(screen.getByText("技术详情"));
  expect(screen.getAllByText("orgv-1").length).toBeGreaterThan(0);
  expect(screen.getByText("readModelSource")).toBeTruthy();
});

test("compacts long versions in summary cards while keeping copyable diagnostics", async() => {
  const longOrgVersion = "orgv-ed073c4ab7a34c05d79fdb539df3f0a31714bfdb8ccca2c59027370474815437";
  const longScopeVersion = "scopev-03ceeba02044c23b02a5602c77d00403446f76edb3100cc37f214ce4168692c4";
  const compactDiagnosticIdentifier = (value: string) => `${value.slice(0, 28)}...${value.slice(-12)}`;
  treeBackendMock.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
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

  expect(await screen.findByText("组织树节点")).toBeTruthy();
  expect(screen.queryByText(compactDiagnosticIdentifier(longOrgVersion))).toBeFalsy();
  fireEvent.click(screen.getByText("技术详情"));
  expect(screen.getByText(compactDiagnosticIdentifier(longOrgVersion))).toBeTruthy();
  expect(screen.getByText(compactDiagnosticIdentifier(longScopeVersion))).toBeTruthy();
  expect(document.body.textContent).not.toContain(longOrgVersion);
});

test("defaults to collapsible tree view and keeps list view available", async() => {
  treeBackendMock.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
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

  expect(await screen.findByText("树视图")).toBeTruthy();
  expect(screen.getByText("子部门")).toBeTruthy();
  expect(screen.queryByText("部门")).toBeFalsy();

  fireEvent.click(screen.getByText("列表视图"));

  expect(await screen.findByText("部门")).toBeTruthy();
  expect(screen.getByText("子部门")).toBeTruthy();
});

test("lazy loads paged members only after selecting a department in member view", async() => {
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("树视图")).toBeTruthy();
  expect(treeBackendMock.getOrganizationTreeOperationsMembers).not.toHaveBeenCalled();

  fireEvent.click(screen.getByText("成员视图"));

  expect(await screen.findByText("选择部门查看成员诊断")).toBeTruthy();
  expect(treeBackendMock.getOrganizationTreeOperationsMembers).not.toHaveBeenCalled();

  fireEvent.click(screen.getAllByText("根部门")[0]);

  await wait(() => expect(treeBackendMock.getOrganizationTreeOperationsMembers).toHaveBeenCalledWith("org-alpha", "dept-root", 1, 10));
  expect(await screen.findByText("Active Member")).toBeTruthy();
  expect(screen.getByText("Disabled Member")).toBeTruthy();
  expect(screen.getAllByText("新鲜").length).toBeGreaterThan(0);
  expect(screen.getByText("成员 2")).toBeTruthy();
  expect(screen.getByText("异常 1")).toBeTruthy();
});

test("opens member detail drawer with diagnostics metadata", async() => {
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("树视图");
  fireEvent.click(screen.getByText("成员视图"));
  fireEvent.click(screen.getAllByText("根部门")[0]);
  fireEvent.click(await screen.findByText("Active Member"));

  expect(await screen.findByText("成员详情")).toBeTruthy();
  expect(screen.getByText("subj-active")).toBeTruthy();
  expect(screen.getByText("mappingStatus")).toBeTruthy();
  expect(screen.getByText("lineageDigest")).toBeTruthy();
});

test("passes stable search and filters to diagnostics endpoint", async() => {
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("根部门");
  fireEvent.change(screen.getByPlaceholderText("搜索稳定部门 ID、名称或路径"), {target: {value: "dept-root"}});
  fireEvent.click(screen.getByText("查询"));

  await wait(() => expect(treeBackendMock.getOrganizationTreeOperationsDiagnostics).toHaveBeenLastCalledWith("org-alpha", expect.objectContaining({
    query: "dept-root",
  })));
});

test("keeps visible filter labels separate from stable diagnostics request values", async() => {
  const pageRef = React.createRef<OrganizationTreeOperationsPage>();
  render(<OrganizationTreeOperationsPage ref={pageRef} account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("根部门");
  act(() => {
    pageRef.current?.setState({
      filters: {
        query: "",
        lifecycleStatus: "disabled",
        sourceConnectionStatus: "STALE",
        freshness: "expired",
        readModelSource: "",
      },
    });
  });
  fireEvent.click(screen.getByText("查询"));

  await wait(() => expect(treeBackendMock.getOrganizationTreeOperationsDiagnostics).toHaveBeenLastCalledWith("org-alpha", expect.objectContaining({
    lifecycleStatus: "disabled",
    sourceConnectionStatus: "STALE",
    freshness: "expired",
  })));
  expect(screen.queryByText("lifecycle_not_active")).toBeFalsy();
});

test("changes organization with reset filters and stable request payload", async() => {
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("根部门");
  fireEvent.change(screen.getByTestId("organization-select"), {target: {value: "org-beta"}});

  await wait(() => expect(treeBackendMock.getOrganizationTreeOperationsDiagnostics).toHaveBeenLastCalledWith("org-beta", {
    query: "",
    lifecycleStatus: "",
    sourceConnectionStatus: "",
    freshness: "",
    readModelSource: "",
  }));
});

test("shows fail-closed empty tree class and supports controlled refresh", async() => {
  treeBackendMock.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
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
  expect(screen.getByText("组织树当前未通过可信校验")).toBeTruthy();

  fireEvent.click(screen.getByText("刷新诊断"));

  await wait(() => expect(treeBackendMock.refreshOrganizationTreeOperations).toHaveBeenCalledWith("org-alpha", "refresh_status"));
});

test("refresh read model falls back to readonly diagnostics when no payload diagnostics are returned", async() => {
  treeBackendMock.refreshOrganizationTreeOperations.mockResolvedValueOnce({
    status: "ok",
    data: {
      status: "queued",
    },
  });
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("根部门");
  fireEvent.click(screen.getByText("重建目录视图"));

  await wait(() => expect(treeBackendMock.refreshOrganizationTreeOperations).toHaveBeenCalledWith("org-alpha", "refresh_read_model"));
  await wait(() => expect(treeBackendMock.getOrganizationTreeOperationsDiagnostics).toHaveBeenCalledTimes(2));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "刷新状态：queued");
});

test("shows business copy for no manageable department empty state without raw aliases", async() => {
  treeBackendMock.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
    status: "ok",
    data: buildDiagnostics({
      emptyTreeClass: "business_empty",
      reason: "scope_has_no_manageable_departments",
      nodes: [],
      diagnostics: [{
        subjectType: "department",
        subjectId: "scope",
        displayName: "当前范围",
        reason: "scope_has_no_manageable_departments",
        lifecycleStatus: "active",
        sourceType: "wecom",
        freshness: "current",
      }],
      summary: {
        ...buildDiagnostics().summary,
        visibleNodeCount: 0,
        diagnosticItemCount: 1,
      },
    }),
  });

  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  await wait(() => expect(treeBackendMock.getOrganizationTreeOperationsDiagnostics).toHaveBeenCalled());
  await wait(() => expect(screen.getAllByText("当前组织暂无可管理部门").length).toBeGreaterThan(0));
  expect(screen.getByText("请检查组织管理范围、来源连接或管理员权限；本页仅做只读诊断，不会自动扩大可见范围。")).toBeTruthy();
  expect(screen.queryByText("scope_has_no_manageable_departments")).toBeFalsy();
  expect(screen.getAllByTestId("organization-tree-summary-card").length).toBeGreaterThan(0);
  expect(screen.getAllByTestId("organization-tree-summary-card")[0].style.minHeight).toBe("72px");
});

test("renders readable fallback labels for unknown aliases without leaking raw snake case", async() => {
  treeBackendMock.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
    status: "ok",
    data: buildDiagnostics({
      status: "blocked",
      reason: "source_connection_permission_missing",
      nodes: [],
      diagnostics: [{
        subjectType: "department",
        subjectId: "scope",
        displayName: "当前范围",
        reason: "source_connection_permission_missing",
        lifecycleStatus: "active",
        sourceType: "wecom",
        freshness: "current",
      }],
      summary: {
        ...buildDiagnostics().summary,
        visibleNodeCount: 0,
        diagnosticItemCount: 1,
      },
    }),
  });

  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("组织树当前未通过可信校验")).toBeTruthy();
  await wait(() => expect(screen.getAllByText("Source Connection Permission Missing").length).toBeGreaterThan(0));
  expect(screen.queryByText("source_connection_permission_missing")).toBeFalsy();
});

test("keeps custom empty tree class readable with readonly next-step fallback", async() => {
  treeBackendMock.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
    status: "ok",
    data: buildDiagnostics({
      emptyTreeClass: "custom_business_empty",
      reason: "",
      nodes: [],
      diagnostics: [{
        subjectType: "department",
        subjectId: "empty-reason",
        displayName: "空范围",
        reason: "",
        lifecycleStatus: "active",
        sourceType: "wecom",
        freshness: "current",
      }],
      summary: {
        ...buildDiagnostics().summary,
        visibleNodeCount: 0,
        diagnosticItemCount: 1,
      },
    }),
  });

  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  await wait(() => expect(screen.getAllByText("Custom Business Empty").length).toBeGreaterThan(0));
  expect(screen.getByText("空范围")).toBeTruthy();
  expect(screen.getByText("空树仅表示当前可管理范围为空，不代表组织树能力通过。")).toBeTruthy();
  expect(screen.queryByText("custom_business_empty")).toBeFalsy();
});

test("shows compact summary fallbacks when source connection and sync batch are absent", async() => {
  treeBackendMock.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
    status: "ok",
    data: buildDiagnostics({
      sourceConnections: [],
      latestSyncBatch: null,
      summary: {
        ...buildDiagnostics().summary,
        visibleNodeCount: 0,
        diagnosticItemCount: 0,
      },
    }),
  });

  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("无来源连接")).toBeTruthy();
  expect(screen.getByText("无最近批次")).toBeTruthy();
  expect(screen.getAllByTestId("organization-tree-summary-card")[0].closest(".ant-col")?.className).toContain("ant-col-xs-12");
  fireEvent.click(screen.getByText("技术详情"));
  expect(screen.getByText("batchStatus")).toBeTruthy();
  expect(screen.getAllByText("-").length).toBeGreaterThan(0);
});

test("opens node detail drawer from readonly tree view", async() => {
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("树视图");
  fireEvent.click(screen.getByText("根部门"));

  expect(await screen.findByText("节点详情")).toBeTruthy();
  expect(screen.getByText("batchId")).toBeTruthy();
  expect(screen.getByText("sourceOrgVersion")).toBeTruthy();
});

test("shows stable error state when diagnostics endpoint is unauthorized", async() => {
  treeBackendMock.getOrganizationTreeOperationsDiagnostics.mockResolvedValueOnce({
    status: "error",
    msg: "Unauthorized operation",
  });

  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("组织树运营数据加载失败")).toBeTruthy();
  expect(screen.getByText("Unauthorized operation")).toBeTruthy();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Unauthorized operation");
});

test("shows fail-closed server connection error when diagnostics request rejects", async() => {
  treeBackendMock.getOrganizationTreeOperationsDiagnostics.mockRejectedValueOnce(new Error("network unavailable"));

  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("组织树运营数据加载失败")).toBeTruthy();
  expect(screen.getByText("Error: network unavailable")).toBeTruthy();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "连接服务器失败: Error: network unavailable");
});

test("clears refresh loading and keeps diagnostics visible when refresh request rejects", async() => {
  render(<OrganizationTreeOperationsPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("根部门");
  treeBackendMock.refreshOrganizationTreeOperations.mockRejectedValueOnce(new Error("refresh timeout"));
  fireEvent.click(screen.getByText("刷新诊断"));

  expect(await screen.findByText("组织树运营数据加载失败")).toBeTruthy();
  expect(screen.getByText("Error: refresh timeout")).toBeTruthy();
  expect(screen.getByText("根部门")).toBeTruthy();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "连接服务器失败: Error: refresh timeout");
});
