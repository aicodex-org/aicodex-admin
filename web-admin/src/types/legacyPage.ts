import type React from "react";

// 这些类型只用于历史 JS 页面迁移期：BaseListPage、backend client 和部分 AntD helper 仍是未类型化 JS。
// 页面迁移为 TSX 时先用窄业务 record + 明确的 legacy 边界保留运行时行为，避免为了类型化而重写旧基类。
export type LegacyAny = any;

export interface AdminAccount {
  owner?: string;
  name?: string;
  isAdmin?: boolean;
  organization?: {
    name?: string;
    navItems?: string[];
    userNavItems?: string[];
    [key: string]: LegacyAny;
  };
  [key: string]: LegacyAny;
}

export interface AdminHistory {
  push: (location: string | {pathname: string; mode?: string}) => void;
  [key: string]: LegacyAny;
}

export interface AdminRouteProps {
  account: AdminAccount;
  history: AdminHistory;
  match?: LegacyAny;
  formItems?: LegacyAny[];
  [key: string]: LegacyAny;
}

export interface LegacyPagination {
  current?: number;
  pageSize?: number;
  total?: number;
  [key: string]: LegacyAny;
}

export interface LegacyFetchParams {
  pagination: LegacyPagination;
  searchedColumn?: string;
  searchText?: string;
  sortField?: string;
  sortOrder?: string;
  category?: string;
  type?: string;
  contentType?: string;
  [key: string]: LegacyAny;
}

export interface LegacyListState<TRecord = LegacyAny> {
  data: TRecord[];
  pagination: LegacyPagination;
  loading: boolean;
  searchText?: string;
  searchedColumn?: string;
  formItems?: LegacyAny[];
  isAuthorized?: boolean;
  [key: string]: LegacyAny;
}

export interface LegacyBackendResponse<TData = LegacyAny> {
  status?: string;
  msg?: string;
  data?: TData;
  data2?: LegacyAny;
  [key: string]: LegacyAny;
}

export type LegacyTableRender<TValue = LegacyAny, TRecord = LegacyAny> = (
  text: TValue,
  record: TRecord,
  index: number
) => React.ReactNode;

export interface LegacyColumn<TRecord = LegacyAny> {
  render?: LegacyTableRender<LegacyAny, TRecord>;
  [key: string]: LegacyAny;
}

export function legacyColumns<TRecord = LegacyAny>(columns: LegacyColumn<TRecord>[]): LegacyColumn<TRecord>[] {
  return columns;
}

export function textValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}
