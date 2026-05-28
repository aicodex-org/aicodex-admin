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

import {getApiPaths} from "./Setting";

test("includes module-based WeCom organization API paths", () => {
  const paths = getApiPaths();

  expect(paths).toContain("wecom-org-sync/config");
  expect(paths).toContain("wecom-org-sync/config/test");
  expect(paths).toContain("wecom-org-sync/runs");
  expect(paths).toContain("org-management-scope/current");
});
