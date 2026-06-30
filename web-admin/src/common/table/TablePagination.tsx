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
type LegacyAny = import("../../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => {
  const translated = i18next.t(key, options);
  return typeof translated === "string" ? translated : "";
};

export function getDefaultTablePagination(overrides: LegacyAny = {}): LegacyAny {
  return {
    current: 1,
    pageSize: 10,
    showQuickJumper: true,
    showSizeChanger: true,
    ...overrides,
  };
}

export function getTablePaginationProps(pagination: LegacyAny = {}, overrides: LegacyAny = {}): LegacyAny {
  const nextPagination = getDefaultTablePagination(pagination);
  return {
    ...nextPagination,
    showTotal: (total: number) => (t("general:{total} in total") || "{total} in total").replace("{total}", String(total)),
    ...overrides,
  };
}
