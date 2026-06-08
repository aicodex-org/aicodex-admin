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

import i18next from "i18next";

export function getDefaultTablePagination(overrides = {}) {
  return {
    current: 1,
    pageSize: 10,
    showQuickJumper: true,
    showSizeChanger: true,
    ...overrides,
  };
}

export function getTablePaginationProps(pagination = {}, overrides = {}) {
  const nextPagination = getDefaultTablePagination(pagination);
  return {
    ...nextPagination,
    showTotal: total => (i18next.t("general:{total} in total") || "{total} in total").replace("{total}", total),
    ...overrides,
  };
}
