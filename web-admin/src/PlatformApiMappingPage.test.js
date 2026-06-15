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

jest.mock("./backend/PlatformApiMappingBackend", () => ({
  getPlatformApiOrganizationMappings: jest.fn(),
  getPlatformApiUserMappingReadiness: jest.fn(),
  getGatewayProjectionRunReadiness: jest.fn(),
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
  expect(await screen.findByDisplayValue("org-alpha/user-one")).toBeInTheDocument();
  expect(screen.getByText("可发布主体 readiness")).toBeInTheDocument();
  expect(screen.getByText("Gateway projection run readiness")).toBeInTheDocument();
  expect(screen.getByText(/Retry action: 可安全重试/)).toBeInTheDocument();
  expect(screen.getByText("lastFailure: gateway_unavailable")).toBeInTheDocument();
  expect(screen.getByText("contract: not_declared_by_gateway_contract")).toBeInTheDocument();
  expect(screen.getByText("Gateway projection 手动发布")).toBeInTheDocument();
  expect(screen.getAllByText(/mapping_missing/).length).toBeGreaterThan(0);
  expect(screen.getByText("迁移导入")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("搜索平台主体或 API 用户 ID")).toBeInTheDocument();
});

test("allows operator to trigger manual gateway projection publish when readiness is available", async() => {
  render(<PlatformApiMappingPage account={{owner: "org-alpha", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("用户映射"));
  const button = await screen.findByText("手动发布");
  fireEvent.click(button);

  await wait(() => expect(PlatformApiMappingBackend.publishGatewayProjectionManually).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    reason: "operator-manual-publish",
  })));
  expect(await screen.findByText("accepted: true")).toBeInTheDocument();
  expect(screen.getByText("batch-synthetic")).toBeInTheDocument();
  await wait(() => expect(PlatformApiMappingBackend.getGatewayProjectionRunReadiness).toHaveBeenCalled());
  expect(screen.queryByText(/projection-secret|gateway.example.invalid/)).not.toBeInTheDocument();
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
