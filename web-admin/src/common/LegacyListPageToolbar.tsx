import React from "react";
import {Input} from "antd";
import type {TablePaginationConfig} from "antd";
import EnterpriseListQueryToolbar from "./EnterpriseListQueryToolbar";
import type {EnterpriseListQueryField} from "./EnterpriseListQueryToolbar";

type LegacySearchValue = string | number | undefined;

interface LegacyListPageQueryState {
  pagination: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: LegacySearchValue;
}

interface LegacyListPageQueryHost {
  state: LegacyListPageQueryState;
  setState: (state: Partial<LegacyListPageQueryState>, callback?: () => void) => void;
  fetch: (params: {
    pagination: TablePaginationConfig;
    searchedColumn?: string;
    searchText?: LegacySearchValue;
  }) => void;
}

interface LegacyListPageToolbarProps {
  host: unknown;
  title: React.ReactNode;
  total?: number;
  fields: EnterpriseListQueryField[];
  defaultField: string;
  actions?: React.ReactNode;
}

function normalizeKeyword(value: LegacySearchValue): string {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function getSearchPagination(pagination: TablePaginationConfig): TablePaginationConfig {
  return {
    ...pagination,
    current: 1,
  };
}

// 旧 BaseListPage 仍以 searchedColumn/searchText 驱动后端查询；这里只统一 UI 壳，不改变 fetch 参数契约。
export default function LegacyListPageToolbar(props: LegacyListPageToolbarProps): JSX.Element {
  const [advancedKeywords, setAdvancedKeywords] = React.useState<Record<string, string>>({});
  const host = props.host as LegacyListPageQueryHost;
  const selectedField = host.state.searchedColumn || props.defaultField;
  const keyword = normalizeKeyword(host.state.searchText);
  const advancedCondition = props.fields
    .map(field => ({field: field.value, value: (advancedKeywords[field.value] || "").trim()}))
    .find(condition => condition.value !== "");
  const searchField = advancedCondition?.field ?? selectedField;
  const searchText = advancedCondition?.value ?? keyword;

  const updateAdvancedKeyword = (field: string, value: string): void => {
    // Legacy 列表后端仍是单字段搜索；输入一个扩展字段时清空其它字段，避免制造多条件查询的误导。
    setAdvancedKeywords(value.trim() === "" ? {} : {[field]: value});
    host.setState({searchedColumn: field, searchText: value});
  };

  return (
    <EnterpriseListQueryToolbar
      title={props.title}
      total={props.total}
      showTotal={false}
      fields={props.fields}
      selectedField={selectedField}
      keyword={keyword}
      actions={props.actions}
      actionsPlacement="topRight"
      advancedFilters={(
        <div className="enterprise-list-advanced-filters organization-advanced-filters">
          {
            props.fields.map(field => (
              <label className="enterprise-list-filter-item organization-advanced-filter-item" key={field.value}>
                <span className="enterprise-list-filter-label organization-advanced-filter-label">{field.label}:</span>
                <Input
                  className="enterprise-list-filter-control organization-advanced-filter-input"
                  value={advancedKeywords[field.value] || ""}
                  allowClear
                  onChange={event => updateAdvancedKeyword(field.value, event.target.value)}
                />
              </label>
            ))
          }
        </div>
      )}
      onFieldChange={(field) => {
        setAdvancedKeywords({});
        host.setState({searchedColumn: field, searchText: ""});
      }}
      onKeywordChange={(value) => {
        setAdvancedKeywords({});
        host.setState({searchText: value});
      }}
      onSearch={() => host.fetch({
        pagination: getSearchPagination(host.state.pagination),
        searchedColumn: searchField,
        searchText,
      })}
      onReset={() => {
        setAdvancedKeywords({});
        host.setState({searchedColumn: props.defaultField, searchText: ""}, () => host.fetch({
          pagination: getSearchPagination(host.state.pagination),
        }));
      }}
    />
  );
}

export type {LegacyListPageQueryHost};
