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

import {getDefaultTablePagination, getTablePaginationProps} from "./TablePagination";

test("provides the shared default table pagination state", () => {
  expect(getDefaultTablePagination()).toEqual(expect.objectContaining({
    current: 1,
    pageSize: 10,
    showQuickJumper: true,
    showSizeChanger: true,
  }));
});

test("builds shared table pagination props with total text", () => {
  const pagination = getTablePaginationProps({current: 2, pageSize: 20, total: 42});

  expect(pagination).toEqual(expect.objectContaining({
    current: 2,
    pageSize: 20,
    total: 42,
    showQuickJumper: true,
    showSizeChanger: true,
  }));
  expect(pagination.showTotal(42)).toContain("42");
});
