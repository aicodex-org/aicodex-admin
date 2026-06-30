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

import {expect, jest} from "@jest/globals";
import * as ResourceBackend from "./ResourceBackend";

let fetchMock: ReturnType<typeof jest.fn>;

beforeEach(() => {
  fetchMock = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

test("uploads resources with explicit application context", async() => {
  const file = new Blob(["avatar"], {type: "image/png"});

  await ResourceBackend.uploadResource("wecom-org", "wecom-user-a", "avatar", "CropperDivModal", "avatar/wecom-org/wecom-user-a.png", file, "app-wecom-org");

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url] = fetchMock.mock.calls[0];
  expect(url).toContain("application=app-wecom-org");
  expect(url).toContain("provider=");
});
