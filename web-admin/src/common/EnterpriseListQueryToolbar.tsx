import React, {useState} from "react";
import {Button, Input, Select, Space, Typography} from "antd";
import {DownOutlined, ReloadOutlined, SearchOutlined, UpOutlined} from "@ant-design/icons";
import i18next from "i18next";

const {Text} = Typography;

// 查询字段选项使用稳定 value 传回页面，由页面决定如何映射到现有 API 参数。
export interface EnterpriseListQueryField {
  label: React.ReactNode;
  value: string;
}

// 企业列表查询工具栏只封装展示与交互分组，不改变具体页面的后端查询契约。
interface EnterpriseListQueryToolbarProps {
  title: React.ReactNode;
  total?: number;
  showTotal?: boolean;
  fields: EnterpriseListQueryField[];
  selectedField: string;
  keyword: string;
  onFieldChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  primaryFilters?: React.ReactNode;
  keywordControl?: React.ReactNode;
  advancedFilters?: React.ReactNode;
  actions?: React.ReactNode;
  context?: React.ReactNode;
  contextPlacement?: "below" | "side";
  searchPlaceholder?: string;
  showHeader?: boolean;
  onAdvancedOpenChange?: (open: boolean) => void;
}

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

function formatResultCount(total?: number): string {
  if (typeof total !== "number") {
    return t("general:Current view", "Current view");
  }
  const translated = i18next.t("general:Result count", {
    defaultValue: "{{count}} results",
    count: total,
  }) as unknown;
  return typeof translated === "string" ? translated : `${total} results`;
}

function hasRenderableNode(node: React.ReactNode): boolean {
  if (node === undefined || node === null || node === false) {
    return false;
  }
  if (typeof node === "string") {
    return node.trim() !== "";
  }
  if (typeof node === "number") {
    return true;
  }
  if (Array.isArray(node)) {
    return node.some(hasRenderableNode);
  }
  if (React.isValidElement(node) && node.type === React.Fragment) {
    return hasRenderableNode((node.props as {children?: React.ReactNode}).children);
  }
  return React.Children.count(node) > 0;
}

export default function EnterpriseListQueryToolbar(props: EnterpriseListQueryToolbarProps): JSX.Element {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const hasAdvancedFilters = hasRenderableNode(props.advancedFilters);
  const hasContext = hasRenderableNode(props.context);
  const contextPlacement = props.contextPlacement ?? "below";
  const showHeader = props.showHeader !== false;
  const showTotal = props.showTotal !== false;
  const updateAdvancedOpen = (open: boolean): void => {
    setAdvancedOpen(open);
    props.onAdvancedOpenChange?.(open);
  };

  return (
    <div className="enterprise-list-query-toolbar">
      {
        showHeader ? (
          <div className="enterprise-list-query-toolbar-header">
            <Space size={8} wrap>
              <Text strong>{props.title}</Text>
              {showTotal ? <Text type="secondary">{formatResultCount(props.total)}</Text> : null}
            </Space>
            {
              props.actions ? (
                <Space wrap className="enterprise-list-query-toolbar-actions">
                  {props.actions}
                </Space>
              ) : null
            }
          </div>
        ) : null
      }
      <div className="enterprise-list-query-toolbar-controls">
        <Space wrap size={8} className="enterprise-list-query-toolbar-filter-group">
          <Select
            className="enterprise-list-query-toolbar-field"
            size="middle"
            value={props.selectedField}
            options={props.fields}
            onChange={props.onFieldChange}
          />
          {props.keywordControl ?? (
            <Input
              className="enterprise-list-query-toolbar-keyword"
              value={props.keyword}
              placeholder={props.searchPlaceholder ?? t("general:Please input your search")}
              allowClear
              onChange={event => props.onKeywordChange(event.target.value)}
              onPressEnter={props.onSearch}
            />
          )}
          {props.primaryFilters}
          <Button type="primary" icon={<SearchOutlined />} onClick={props.onSearch}>
            {t("general:Query", "Search")}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={props.onReset}>
            {t("general:Reset", "Reset")}
          </Button>
          {
            hasAdvancedFilters ? (
              <Button
                aria-expanded={advancedOpen}
                icon={advancedOpen ? <UpOutlined /> : <DownOutlined />}
                onClick={() => updateAdvancedOpen(!advancedOpen)}
              >
                {advancedOpen ? t("general:Hide filters", "Hide filters") : t("general:More filters", "More filters")}
              </Button>
            ) : null
          }
        </Space>
        {
          hasContext && contextPlacement === "side" ? (
            <div className="enterprise-list-query-toolbar-side-context">
              {props.context}
            </div>
          ) : null
        }
      </div>
      {hasContext && contextPlacement === "below" ? <div className="enterprise-list-query-toolbar-context">{props.context}</div> : null}
      {
        advancedOpen && hasAdvancedFilters ? (
          <div className="enterprise-list-query-toolbar-advanced">
            {props.advancedFilters}
          </div>
        ) : null
      }
    </div>
  );
}
