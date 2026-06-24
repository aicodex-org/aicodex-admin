import React from "react";
import {Input, Select} from "antd";
import i18next from "i18next";
import type {EnterpriseListQueryField} from "./EnterpriseListQueryToolbar";

export interface ApplicationAccessQueryField extends EnterpriseListQueryField {
  options?: Array<{label: React.ReactNode; value: string}>;
}

export interface ApplicationAccessQueryCondition {
  field: string;
  value: string;
}

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

function normalizeQueryValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function getQueryField(fields: ApplicationAccessQueryField[], value: string): ApplicationAccessQueryField | undefined {
  return fields.find(field => field.value === value);
}

export function createEmptyApplicationAccessQueryKeywords(fields: ApplicationAccessQueryField[]): Record<string, string> {
  return fields.reduce((keywords, field) => ({
    ...keywords,
    [field.value]: "",
  }), {} as Record<string, string>);
}

// 保持后端单字段查询契约：更多筛选按字段顺序优先命中，否则退回主搜索。
export function getActiveApplicationAccessQueryCondition(
  fields: ApplicationAccessQueryField[],
  selectedField: string,
  keyword: unknown,
  advancedKeywords: Record<string, unknown> = {}
): ApplicationAccessQueryCondition | null {
  const advancedCondition = fields
    .map(field => ({field: field.value, value: normalizeQueryValue(advancedKeywords[field.value])}))
    .find(condition => condition.value !== "");
  if (advancedCondition) {
    return advancedCondition;
  }

  const keywordValue = normalizeQueryValue(keyword);
  if (keywordValue === "") {
    return null;
  }

  return {
    field: selectedField,
    value: keywordValue,
  };
}

// 枚举字段使用 Select，普通字段使用 Input，避免每个应用接入列表重复实现查询控件。
export function renderApplicationAccessKeywordControl(
  fields: ApplicationAccessQueryField[],
  selectedField: string,
  keyword: string,
  onChange: (value: string) => void,
  onSearch: () => void
): React.ReactNode {
  const field = getQueryField(fields, selectedField);
  if (field?.options) {
    return (
      <Select
        className="enterprise-list-query-toolbar-keyword"
        value={keyword || undefined}
        placeholder={t("general:Please select")}
        allowClear
        options={field.options}
        onChange={(value) => onChange(value ?? "")}
      />
    );
  }

  return (
    <Input
      className="enterprise-list-query-toolbar-keyword"
      value={keyword}
      placeholder={t("general:Please input your search")}
      allowClear
      onChange={event => onChange(event.target.value)}
      onPressEnter={onSearch}
    />
  );
}

// 更多筛选复用同一字段定义，label 统一带英文冒号并把变更回传给页面状态。
export function renderApplicationAccessAdvancedFilters(
  fields: ApplicationAccessQueryField[],
  keywords: Record<string, string>,
  onChange: (field: string, value: string) => void
): React.ReactNode {
  return (
    <div className="enterprise-list-advanced-filters organization-advanced-filters">
      {
        fields.map(field => (
          <label className="enterprise-list-filter-item organization-advanced-filter-item" key={field.value}>
            <span className="enterprise-list-filter-label organization-advanced-filter-label">{field.label}:</span>
            {
              field.options ? (
                <Select
                  className="enterprise-list-filter-control organization-advanced-filter-select"
                  value={keywords[field.value] || undefined}
                  aria-label={`${t("general:Advanced filters", "Advanced filters")} ${field.label}`}
                  placeholder={t("general:Please select")}
                  allowClear
                  options={field.options}
                  onChange={(value) => onChange(field.value, value ?? "")}
                />
              ) : (
                <Input
                  className="enterprise-list-filter-control organization-advanced-filter-input"
                  value={keywords[field.value] ?? ""}
                  aria-label={`${t("general:Advanced filters", "Advanced filters")} ${field.label}`}
                  placeholder={t("general:Please input your search")}
                  allowClear
                  onChange={event => onChange(field.value, event.target.value)}
                />
              )
            }
          </label>
        ))
      }
    </div>
  );
}
