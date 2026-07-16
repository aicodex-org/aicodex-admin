// Copyright 2021 The Casdoor Authors. All Rights Reserved.
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
import {afterEach, beforeAll, beforeEach, expect, jest, test} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import fs from "fs";
import path from "path";
import i18next from "i18next";
import App, {getAdminDocumentTitle} from "./App";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";
import {type ConsoleCallSpy, getReactActWarnings} from "./testUtils/reactAsyncWarnings";

let consoleErrorSpy: ConsoleCallSpy;

jest.mock("./ManagementPage", () => () => <main data-testid="management-page" />);

beforeAll(async() => {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: "zh",
      fallbackLng: "en",
      ns: ["general"],
      defaultNS: "general",
      resources: {},
      keySeparator: false,
      interpolation: {escapeValue: false},
    });
  }
  i18next.addResourceBundle("en", "general", en.general, true, true);
  i18next.addResourceBundle("zh", "general", zh.general, true, true);
  await i18next.changeLanguage("zh");
});

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error") as unknown as ConsoleCallSpy;
});

afterEach(() => {
  cleanup();
  const actWarnings = getReactActWarnings(consoleErrorSpy.mock.calls);
  consoleErrorSpy.mockRestore();
  expect(actWarnings).toEqual([]);
});

test("renders the admin root shell", async() => {
  const testGlobal = globalThis as typeof globalThis & {fetch?: typeof fetch};
  const originalFetch = testGlobal.fetch;
  // 根壳测试不验证后端回包，使用 suite-local fetch 避免重新依赖全局 CRA polyfill。
  testGlobal.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as typeof fetch;

  let container: HTMLElement;
  try {
    const view = render(
      <MemoryRouter>
        <React.Suspense fallback={null}>
          <App />
        </React.Suspense>
      </MemoryRouter>
    );
    await view.findByTestId("management-page");
    container = view.container;
  } finally {
    if (originalFetch === undefined) {
      Reflect.deleteProperty(testGlobal, "fetch");
    } else {
      testGlobal.fetch = originalFetch;
    }
  }

  expect(container).toBeTruthy();
});

test("uses the Admin product title for the browser tab after login", () => {
  expect(getAdminDocumentTitle({organization: {displayName: "Built-in Organization"}})).toBe("AICodex Admin · 认证中心");
});

test("recognizes DingTalk organization sync as an admin route for flattened menu selection", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "App.tsx"), "utf8");

  expect(appSource).toContain("\"/dingtalk-org-sync\"");
  expect(appSource).toMatch(/uri\.includes\("\/dingtalk-org-sync"\)[\s\S]*return "\/dingtalk-org-sync"/);
});
