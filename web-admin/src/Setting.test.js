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

import {StaticBaseUrl, getApiPaths, getProviderLogoURL, isProviderVisibleForSignIn, isProviderVisibleForSignUp} from "./Setting";

test("includes module-based WeCom organization API paths", () => {
  const paths = getApiPaths();

  expect(paths).toContain("wecom-org-sync/config");
  expect(paths).toContain("wecom-org-sync/config/test");
  expect(paths).toContain("wecom-org-sync/runs");
  expect(paths).toContain("feishu-org-sync/config");
  expect(paths).toContain("feishu-org-sync/config/test");
  expect(paths).toContain("feishu-org-sync/runs");
  expect(paths).toContain("org-management-scope/current");
  expect(paths).toContain("organization-master-data-quality/directory");
  expect(paths).toContain("organization-master-data-quality/remediation-plan");
  expect(paths).toContain("organization-master-data-quality/remediation-action-drafts");
  expect(paths).toContain("organization-master-data-quality/remediation-preflight");
  expect(paths).toContain("gateway-projection/observability");
  expect(paths).toContain("gateway-projection/manual-publish");
  expect(paths).toContain("gateway-projection/publish-attempts");
  expect(paths).toContain("gateway-projection/publish-attempt-retention-readiness");
  expect(paths).toContain("gateway-projection/publish-attempt-retention-cleanup-dry-run");
  expect(paths).toContain("gateway-projection/publish-attempt-retention-cleanup-execute-readiness");
  expect(paths).toContain("get-organization-master-data-quality-readiness");
  expect(paths).toContain("get-platform-api-organization-mappings");
  expect(paths).toContain("update-platform-api-organization-mapping");
  expect(paths).toContain("get-platform-api-user-mappings");
  expect(paths).toContain("get-platform-api-user-mapping-readiness");
  expect(paths).toContain("update-platform-api-user-mapping");
});

test("uses shared Lark/Feishu logo for domestic Lark OAuth provider", () => {
  expect(getProviderLogoURL({category: "OAuth", type: "Lark", disableSsl: false})).toBe(`${StaticBaseUrl}/img/social_lark.png`);
});

test("uses Lark logo for global Lark OAuth provider", () => {
  expect(getProviderLogoURL({category: "OAuth", type: "Lark", disableSsl: true})).toBe(`${StaticBaseUrl}/img/social_lark.png`);
});

test("keeps hidden Lark provider out of sign-in and sign-up provider entries", () => {
  const hiddenLarkProviderItem = {
    canSignIn: false,
    canSignUp: false,
    provider: {category: "OAuth", type: "Lark"},
  };

  expect(isProviderVisibleForSignIn(hiddenLarkProviderItem)).toBe(false);
  expect(isProviderVisibleForSignUp(hiddenLarkProviderItem)).toBe(false);
});

test("keeps existing OAuth and WeCom provider visibility rules unchanged", () => {
  expect(isProviderVisibleForSignIn({
    canSignIn: true,
    provider: {category: "OAuth", type: "GitHub"},
  })).toBe(true);
  expect(isProviderVisibleForSignIn({
    canSignIn: true,
    provider: {category: "OAuth", type: "WeCom"},
  })).toBe(true);
});
