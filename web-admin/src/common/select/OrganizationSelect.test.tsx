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
import * as TestingLibrary from "@testing-library/react";
import OrganizationSelect from "./OrganizationSelect";
type LegacyAny = import("../../types/legacyPage").LegacyAny;

declare const jest: LegacyAny;
declare const expect: LegacyAny;

const {fireEvent, render, screen, wait} = TestingLibrary as LegacyAny;
const mockGetOrganizationNames = jest.fn();

jest.mock("../../backend/OrganizationBackend", () => ({
  getOrganizationNames: (...args: LegacyAny[]) => mockGetOrganizationNames(...args),
}));

const mockMatchMedia = (query: string): LegacyAny => ({
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
  mockGetOrganizationNames.mockResolvedValue({
    status: "ok",
    data: [
      {name: "built-in", displayName: "Built-in Organization"},
      {name: "wecom-ww123", displayName: "WeCom ww123"},
    ],
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

function OrganizationSelectHarness() {
  const [organization, setOrganization] = React.useState("built-in");

  return (
    <>
      <OrganizationSelect initValue={organization} />
      <button onClick={() => setOrganization("wecom-ww123")}>切换组织</button>
    </>
  );
}

test("updates displayed organization when initValue changes", async() => {
  render(<OrganizationSelectHarness />);

  expect(await screen.findByText("Built-in Organization")).toBeInTheDocument();

  fireEvent.click(screen.getByText("切换组织"));

  expect(await screen.findByText("WeCom ww123")).toBeInTheDocument();
});

test("excludes organizations from selectable options", async() => {
  const handleChange = jest.fn();

  render(<OrganizationSelect initValue="built-in" excludedOrganizations={["built-in"]} onChange={handleChange} />);

  expect(await screen.findByText("WeCom ww123")).toBeInTheDocument();
  expect(screen.queryByText("Built-in Organization")).not.toBeInTheDocument();
  expect(handleChange).toHaveBeenCalledWith("wecom-ww123");
});

test("does not emit blank organization when all options are excluded", async() => {
  mockGetOrganizationNames.mockResolvedValueOnce({
    status: "ok",
    data: [
      {name: "built-in", displayName: "Built-in Organization"},
    ],
  });
  const handleChange = jest.fn();

  render(<OrganizationSelect initValue="built-in" excludedOrganizations={["built-in"]} onChange={handleChange} />);

  await wait(() => expect(mockGetOrganizationNames).toHaveBeenCalled());
  expect(handleChange).not.toHaveBeenCalled();
});
