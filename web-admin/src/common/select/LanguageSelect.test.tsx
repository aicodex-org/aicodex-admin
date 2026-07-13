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
import LanguageSelect from "./LanguageSelect";
type LegacyAny = import("../../types/legacyPage").LegacyAny;

declare const jest: LegacyAny;
declare const expect: LegacyAny;

const {render} = TestingLibrary as LegacyAny;

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
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("does not preload all flag icons during initial render", () => {
  const imageConstructor = jest.fn(() => ({src: ""}));
  jest.spyOn(window, "Image").mockImplementation(imageConstructor);

  render(<LanguageSelect />);

  expect(imageConstructor).not.toHaveBeenCalled();
});
