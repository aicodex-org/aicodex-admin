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
  updatePlatformApiOrganizationMapping: jest.fn(),
  getPlatformApiUserMappings: jest.fn(),
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
  PlatformApiMappingBackend.updatePlatformApiOrganizationMapping.mockResolvedValue({status: "ok"});
  PlatformApiMappingBackend.updatePlatformApiUserMapping.mockResolvedValue({status: "ok"});
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
  expect(await screen.findByDisplayValue("org-alpha/user-one")).toBeInTheDocument();
  expect(screen.getByText("迁移导入")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("搜索平台主体或 API 用户 ID")).toBeInTheDocument();
});
