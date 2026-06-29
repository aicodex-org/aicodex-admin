// Copyright 2021 The Casdoor Authors. All Rights Reserved.
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

import React from "react";
import {Button, Tag, Typography} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as RuleBackend from "./backend/RuleBackend";
import i18nextLib from "i18next";
import BaseListPage from "./BaseListPage";
import ListPageRowActions, {ListPageRowDeleteAction, ListPageRowEditAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";

const i18next = {t: (key: string) => i18nextLib.t(key) as string};
const {Text} = Typography;

interface RuleListPageProps {
  account: {owner: string; tag?: string; [key: string]: unknown};
  history: {push: (path: string) => void};
  match?: {path?: string; params?: Record<string, string>};
}

interface RuleExpressionRecord {
  operator: string;
  value: string;
  [key: string]: unknown;
}

interface RuleRecord {
  owner: string;
  name: string;
  createdTime: string;
  updatedTime?: string;
  type: string;
  expressions: RuleExpressionRecord[];
  action: string;
  statusCode?: string;
  reason: string;
  [key: string]: unknown;
}

interface RuleListPageState {
  data: RuleRecord[];
  pagination: TablePaginationConfig;
  loading: boolean;
}

type LegacyBaseListPageCompat = React.Component<RuleListPageProps, RuleListPageState> & {
  handleTableChange: NonNullable<TableProps<RuleRecord>["onChange"]>;
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
};

// BaseListPage 仍是 legacy JS；这里只声明 RuleListPage 使用到的最小成员。
const TypedBaseListPage = BaseListPage as unknown as {
  new(props: RuleListPageProps): LegacyBaseListPageCompat;
};

interface BackendResponse<T> {
  status?: string;
  data?: T;
  data2?: number;
  msg?: string;
  [key: string]: unknown;
}

interface FetchParams {
  pagination?: TablePaginationConfig;
  sortField?: string;
  sortOrder?: string;
}

type RuleBackendCompat = {
  getRules: (
    owner: string,
    page?: string | number,
    pageSize?: string | number,
    sortField?: string,
    sortOrder?: string
  ) => Promise<BackendResponse<RuleRecord[]>>;
  addRule: (rule: RuleRecord) => Promise<BackendResponse<unknown>>;
  deleteRule: (rule: RuleRecord) => Promise<BackendResponse<unknown>>;
};

const ruleBackend = RuleBackend as unknown as RuleBackendCompat;

type RuleListColumns = TableProps<RuleRecord>["columns"];

function formatResultCount(total?: number): string {
  if (typeof total !== "number") {
    return i18next.t("general:Current view");
  }
  return i18nextLib.t("general:Result count", {count: total}) as string;
}

function renderRuleListTitle(total: number | undefined, onAdd: () => void): JSX.Element {
  return (
    <div className="enterprise-list-query-toolbar">
      <div className="enterprise-list-query-toolbar-header">
        <div className="enterprise-list-query-toolbar-title">
          <Text strong className="enterprise-list-query-toolbar-title-text">{i18next.t("general:Rules")}</Text>
          <Text type="secondary" className="enterprise-list-query-toolbar-result-count">{formatResultCount(total)}</Text>
        </div>
        <div className="enterprise-list-query-toolbar-header-meta enterprise-list-query-toolbar-header-meta-top-right">
          <Button type="primary" onClick={onAdd}>{i18next.t("general:Add")}</Button>
        </div>
      </div>
    </div>
  );
}

class RuleListPage extends TypedBaseListPage {
  UNSAFE_componentWillMount() {
    this.setState({
      pagination: {
        ...this.state.pagination,
        current: 1,
        pageSize: 10,
      },
    });
    this.fetch({pagination: this.state.pagination});
  }

  fetch = (params: FetchParams = {}) => {
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (!params.pagination) {
      params.pagination = {current: 1, pageSize: 10};
    }
    this.setState({
      loading: true,
    });
    ruleBackend.getRules(this.props.account.owner, params.pagination.current, params.pagination.pageSize, sortField, sortOrder).then((res) => {
      this.setState({
        loading: false,
      });
      if (res.status === "ok") {
        this.setState({
          data: res.data as RuleRecord[],
          pagination: {
            ...params.pagination,
            total: res.data2,
          },
        });
      } else {
        this.setState({loading: false});
      }
    });
  };

  addRule(): void {
    const newRule = this.newRule();
    ruleBackend.addRule(newRule).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", `Failed to add: ${res.msg}`);
      } else {
        Setting.showMessage("success", "Rule added successfully");
        this.setState({
          data: Setting.prependRow(this.state.data, newRule),
        });
        this.fetch();
      }
    });
  }

  deleteRule(i: number): void {
    ruleBackend.deleteRule(this.state.data[i] as RuleRecord).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", `Failed to delete: ${res.msg}`);
      } else {
        Setting.showMessage("success", "Deleted successfully");
        this.fetch({
          pagination: {
            ...this.state.pagination,
            current: (this.state.pagination.current as number) > 1 && this.state.data.length === 1 ? (this.state.pagination.current as number) - 1 : this.state.pagination.current,
          },
        });
      }
    });
  }

  newRule(): RuleRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `rule_${randomName}`,
      createdTime: moment().format(),
      type: "User-Agent",
      expressions: [],
      action: "Block",
      reason: "Your request is blocked.",
    };
  }

  renderTable(data: RuleRecord[]): React.ReactNode {
    const columns: RuleListColumns = [
      {
        title: i18next.t("general:Owner"),
        dataIndex: "owner",
        key: "owner",
        width: "150px",
        sorter: (a, b) => a.owner.localeCompare(b.owner),
      },
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "200px",
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (text, rule, index) => {
          return <a href={`/rules/${rule.owner}/${String(text)}`}>{text}</a>;
        },
      },
      {
        title: i18next.t("general:Create time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "200px",
        sorter: (a, b) => a.createdTime.localeCompare(b.createdTime),
        render: (text, rule, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: i18next.t("general:Update time"),
        dataIndex: "updatedTime",
        key: "updatedTime",
        width: "200px",
        sorter: (a, b) => (a.updatedTime as string).localeCompare(b.updatedTime as string),
        render: (text, rule, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: i18next.t("rule:Type"),
        dataIndex: "type",
        key: "type",
        width: "100px",
        sorter: (a, b) => a.type.localeCompare(b.type),
        render: (text, rule, index) => {
          return (
            <Tag color="blue">
              {i18next.t(`rule:${text}`)}
            </Tag>
          );
        },
      },
      {
        title: i18next.t("rule:Expressions"),
        dataIndex: "expressions",
        key: "expressions",
        sorter: (a, b) => (a.expressions as unknown as string).localeCompare(b.expressions as unknown as string),
        render: (text, rule, index) => {
          return rule.expressions.map((expression, i) => {
            return (
              <Tag key={expression as unknown as React.Key} color={"success"}>
                {expression.operator + " " + expression.value.slice(0, 20)}
              </Tag>
            );
          });
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "100px",
        sorter: (a, b) => a.action.localeCompare(b.action),
      },
      {
        title: i18next.t("rule:Status code"),
        dataIndex: "statusCode",
        key: "statusCode",
        width: "120px",
        sorter: (a, b) => (a.statusCode as string).localeCompare(b.statusCode as string),
      },
      {
        title: i18next.t("rule:Reason"),
        dataIndex: "reason",
        key: "reason",
        width: "300px",
        sorter: (a, b) => a.reason.localeCompare(b.reason),
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "136px",
        render: (text, rule, index) => {
          return (
            <ListPageRowActions className="rule-row-actions">
              <ListPageRowEditAction onClick={() => this.props.history.push(`/rules/${rule.owner}/${rule.name}`)} />
              <ListPageRowDeleteAction
                title={`Sure to delete rule: ${rule.name} ?`}
                onConfirm={() => this.deleteRule(index)}
              />
            </ListPageRowActions>
          );
        },
      },
    ];

    return (
      <div className="enterprise-list-page-table-shell rule-list-page-table-shell">
        <ListPageTable<RuleRecord>
          dataSource={data}
          columns={columns}
          rowKey={(record) => `${record.owner}/${record.name}`}
          pagination={this.getTablePaginationProps()}
          loading={this.state.loading}
          onChange={this.handleTableChange}
          title={() => (
            renderRuleListTitle(this.state.pagination.total, () => this.addRule())
          )}
        />
      </div>
    );
  }
}

export default RuleListPage;
