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
import {beforeAll, expect, jest, test} from "@jest/globals";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import fs from "fs";
import path from "path";
import i18next from "i18next";
import App, {getAdminDocumentTitle} from "./App";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

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

test("renders the admin root shell", () => {
  const {container} = render(
    <MemoryRouter>
      <React.Suspense fallback={null}>
        <App />
      </React.Suspense>
    </MemoryRouter>
  );

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
