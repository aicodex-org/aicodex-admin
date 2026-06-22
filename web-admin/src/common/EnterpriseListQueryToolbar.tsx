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
  fields: EnterpriseListQueryField[];
  selectedField: string;
  keyword: string;
  onFieldChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  primaryFilters?: React.ReactNode;
  advancedFilters?: React.ReactNode;
  actions?: React.ReactNode;
  searchPlaceholder?: string;
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

export default function EnterpriseListQueryToolbar(props: EnterpriseListQueryToolbarProps): JSX.Element {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="enterprise-list-query-toolbar">
      <div className="enterprise-list-query-toolbar-header">
        <Space size={8} wrap>
          <Text strong>{props.title}</Text>
          <Text type="secondary">{formatResultCount(props.total)}</Text>
        </Space>
        {
          props.actions ? (
            <Space wrap className="enterprise-list-query-toolbar-actions">
              {props.actions}
            </Space>
          ) : null
        }
      </div>
      <div className="enterprise-list-query-toolbar-controls">
        <Space wrap size={8}>
          <Select
            className="enterprise-list-query-toolbar-field"
            size="middle"
            value={props.selectedField}
            options={props.fields}
            onChange={props.onFieldChange}
          />
          <Input
            className="enterprise-list-query-toolbar-keyword"
            value={props.keyword}
            placeholder={props.searchPlaceholder ?? t("general:Please input your search")}
            allowClear
            onChange={event => props.onKeywordChange(event.target.value)}
            onPressEnter={props.onSearch}
          />
          {props.primaryFilters}
          <Button type="primary" icon={<SearchOutlined />} onClick={props.onSearch}>
            {t("general:Query", "Search")}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={props.onReset}>
            {t("general:Reset", "Reset")}
          </Button>
          <Button
            icon={advancedOpen ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setAdvancedOpen(!advancedOpen)}
          >
            {advancedOpen ? t("general:Hide filters", "Hide filters") : t("general:More filters", "More filters")}
          </Button>
        </Space>
      </div>
      {
        advancedOpen && props.advancedFilters ? (
          <div className="enterprise-list-query-toolbar-advanced">
            {props.advancedFilters}
          </div>
        ) : null
      }
    </div>
  );
}
