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
import * as PlatformApiMappingBackend from "./backend/PlatformApiMappingBackend";
import OrganizationDirectoryQualityPage from "./OrganizationDirectoryQualityPage";

jest.mock("./backend/PlatformApiMappingBackend", () => ({
  getOrganizationDirectoryQuality: jest.fn(),
  getOrganizationDirectoryRemediationPlan: jest.fn(),
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

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  PlatformApiMappingBackend.getOrganizationDirectoryQuality.mockResolvedValue({
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
  PlatformApiMappingBackend.getOrganizationDirectoryRemediationPlan.mockResolvedValue({
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
  global.Blob = jest.fn((parts, options) => ({parts, options}));
  global.URL.createObjectURL = jest.fn(() => "blob:remediation-plan");
  global.URL.revokeObjectURL = jest.fn();
  HTMLAnchorElement.prototype.click = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

test("renders organization directory quality list and details without leaking source ids", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("组织目录质量")).toBeInTheDocument();
  expect((await screen.findAllByText("修复计划")).length).toBeGreaterThan(0);
  expect((await screen.findAllByText("mapping_review")).length).toBeGreaterThan(0);
  expect(screen.getByText("用户到 API 主体的一等映射缺失或不可信，需要 mapping owner 确认。")).toBeInTheDocument();
  expect(screen.getByText("Alice")).toBeInTheDocument();
  expect(screen.getAllByText("mapping_missing").length).toBeGreaterThan(0);
  expect(screen.queryByText("external-subject-synthetic")).not.toBeInTheDocument();
  expect(screen.queryByText("org-alpha/alice")).toBeInTheDocument();
  expect(PlatformApiMappingBackend.getOrganizationDirectoryQuality).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    entityType: "user",
    current: 1,
    pageSize: 10,
  }));
  expect(PlatformApiMappingBackend.getOrganizationDirectoryRemediationPlan).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    entityType: "user",
    topN: 20,
  }));

  fireEvent.click(screen.getByText("详情"));
  expect(await screen.findByText("补齐 confirmed PlatformApiUserMapping。")).toBeInTheDocument();
  expect(screen.getByText("sha256:external")).toBeInTheDocument();
});

test("refreshes directory quality with selected filters", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findByText("Alice");
  fireEvent.change(screen.getByTestId("organization-select"), {target: {value: "org-alpha"}});
  fireEvent.click(screen.getByText("刷新"));

  await wait(() => expect(PlatformApiMappingBackend.getOrganizationDirectoryQuality).toHaveBeenCalledTimes(2));
  await wait(() => expect(PlatformApiMappingBackend.getOrganizationDirectoryRemediationPlan).toHaveBeenCalledTimes(2));
});

test("exports sanitized remediation plan summary on the client", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  await screen.findAllByText("mapping_review");
  fireEvent.click(screen.getByText("导出计划"));

  expect(global.URL.createObjectURL).toHaveBeenCalled();
  const exportedBlob = global.URL.createObjectURL.mock.calls[0][0];
  expect(exportedBlob.parts.join("")).toContain("user:sha256:sample");
  expect(exportedBlob.parts.join("")).not.toContain("external-subject-synthetic");
});
