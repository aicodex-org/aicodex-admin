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
});

afterEach(() => {
  jest.clearAllMocks();
});

test("renders organization directory quality list and details without leaking source ids", async() => {
  render(<OrganizationDirectoryQualityPage account={{owner: "org-alpha", isAdmin: true}} />);

  expect(await screen.findByText("组织目录质量")).toBeInTheDocument();
  expect(screen.getByText("Alice")).toBeInTheDocument();
  expect(screen.getByText("mapping_missing")).toBeInTheDocument();
  expect(screen.queryByText("external-subject-synthetic")).not.toBeInTheDocument();
  expect(PlatformApiMappingBackend.getOrganizationDirectoryQuality).toHaveBeenCalledWith("org-alpha", expect.objectContaining({
    entityType: "user",
    current: 1,
    pageSize: 10,
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
});
