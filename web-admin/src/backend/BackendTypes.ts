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

export type BackendQueryValue = string | number | boolean;

// backend wrapper 当前只透传后端动态 payload，不在前端重塑字段结构。
export type BackendRecord = Record<string, any>;

// 迁移期的动态边界类型，避免把 legacy API 的不确定字段伪装成精确 schema。
export type BackendValue = any;

// 通用后端响应只约束现有页面实际消费的公共字段，其它字段保持透传兼容。
export interface BackendResponse<TData = BackendValue> {
  status: string;
  msg?: string;
  data?: TData;
  data2?: BackendValue;
  [key: string]: BackendValue;
}

export type BackendRequestInit = RequestInit & {
  dataType?: string;
};
