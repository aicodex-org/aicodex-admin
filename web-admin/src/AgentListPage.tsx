// Copyright 2026 The Casdoor Authors. All Rights Reserved.
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
import {Link} from "react-router-dom";
import {Button} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as AgentBackend from "./backend/AgentBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowDeleteAction, ListPageRowEditAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";

type FormItem = {
  name: string;
  label?: string;
  visible?: boolean;
  width?: string | number;
};

type AgentQueryValue = string | number | boolean | string[] | null | undefined;

interface AccountRecord {
  owner: string;
  tag?: string;
  [key: string]: unknown;
}

interface AgentRecord {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  url: string;
  token: string;
  application: string;
  [key: string]: unknown;
}

interface AgentListPageProps {
  account: AccountRecord;
  history: {
    push: (location: string | {pathname: string; mode?: string}) => void;
  };
  match?: {
    path?: string;
    params?: Record<string, string | undefined>;
  };
  formItems?: FormItem[];
}

interface AgentListPageState {
  data: AgentRecord[];
  pagination: TablePaginationConfig;
  loading: boolean;
  searchText?: AgentQueryValue;
  searchedColumn?: string;
  formItems?: FormItem[];
}

type AgentListColumns = TableProps<AgentRecord>["columns"];

type AgentListFetchParams = {
  pagination?: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: AgentQueryValue;
  sortField?: string;
  sortOrder?: string | null;
};

interface BackendResponse<T> {
  status?: string;
  data?: T;
  data2?: number;
  msg?: string;
}

type AgentBackendCompat = {
  getAgents: (
    owner: string,
    page?: string | number,
    pageSize?: string | number,
    field?: string,
    value?: AgentQueryValue,
    sortField?: string,
    sortOrder?: string | null
  ) => Promise<BackendResponse<AgentRecord[]>>;
  addAgent: (agent: AgentRecord) => Promise<BackendResponse<unknown>>;
  deleteAgent: (agent: AgentRecord) => Promise<BackendResponse<unknown>>;
};

const agentBackend = AgentBackend as unknown as AgentBackendCompat;

// BaseListPage 仍是 legacy JS；这里仅声明 Agent 列表页实际依赖的继承面。
type LegacyBaseListPageCompat = React.Component<AgentListPageProps, AgentListPageState> & {
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<AgentRecord>["onChange"]>;
};

const TypedBaseListPage = BaseListPage as unknown as {
  new(props: AgentListPageProps): LegacyBaseListPageCompat;
};

function t(key: string): string {
  return String(i18next.t(key));
}

const queryFields = [
  {label: t("general:Name"), value: "name"},
  {label: t("general:Organization"), value: "owner"},
  {label: t("general:Display name"), value: "displayName"},
  {label: t("general:Listening URL"), value: "url"},
  {label: t("general:Application"), value: "application"},
];

class AgentListPage extends TypedBaseListPage {
  newAgent(): AgentRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `agent_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Agent - ${randomName}`,
      url: "",
      token: "",
      application: "",
    };
  }

  addAgent(): void {
    const newAgent = this.newAgent();
    agentBackend.addAgent(newAgent)
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/agents/${newAgent.owner}/${newAgent.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteAgent(i: number): void {
    agentBackend.deleteAgent(this.state.data[i])
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully deleted"));
          const current = this.state.pagination.current || 1;
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: current > 1 && this.state.data.length === 1 ? current - 1 : current,
            },
          });
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  fetch = (params: AgentListFetchParams = {}): void => {
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    const pagination = params.pagination ?? {current: 1, pageSize: 10};

    this.setState({loading: true});
    agentBackend.getAgents(Setting.getRequestOrganization(this.props.account), pagination.current, pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: BackendResponse<AgentRecord[]>) => {
        this.setState({loading: false});
        if (res.status === "ok") {
          this.setState({
            data: res.data ?? [],
            pagination: {
              ...pagination,
              total: res.data2,
            },
            searchText: params.searchText,
            searchedColumn: params.searchedColumn,
          });
        } else {
          Setting.showMessage("error", `${t("general:Failed to get")}: ${res.msg}`);
        }
      });
  };

  renderTable(agents: AgentRecord[]): React.ReactNode {
    const columns: AgentListColumns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "160px",
        sorter: true,
        render: (text: string, record: AgentRecord) => {
          return (
            <Link to={`/agents/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "130px",
        sorter: true,
      },
      {
        title: t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "180px",
        sorter: true,
        render: (text: string) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        sorter: true,
      },
      {
        title: t("general:Listening URL"),
        dataIndex: "url",
        key: "url",
        sorter: true,
        render: (text: string) => {
          if (!text) {
            return null;
          }

          return (
            <a target="_blank" rel="noreferrer" href={text}>
              {Setting.getShortText(text, 40)}
            </a>
          );
        },
      },
      {
        title: t("general:Application"),
        dataIndex: "application",
        key: "application",
        width: "140px",
        sorter: true,
      },
      {
        title: t("general:Action"),
        dataIndex: "op",
        key: "op",
        width: "136px",
        render: (_text: unknown, record: AgentRecord, index: number) => {
          return (
            <ListPageRowActions className="agent-row-actions">
              <ListPageRowEditAction onClick={() => this.props.history.push(`/agents/${record.owner}/${record.name}`)} />
              <ListPageRowDeleteAction
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteAgent(index)}
              />
            </ListPageRowActions>
          );
        },
      },
    ];

    const filteredColumns = (Setting.filterTableColumns as (columns: AgentListColumns, formItems?: FormItem[]) => AgentListColumns)(columns, this.props.formItems ?? this.state.formItems);
    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="enterprise-list-page-table-shell agent-list-page-table-shell">
        <ListPageTable<AgentRecord>
          dataSource={agents}
          columns={filteredColumns}
          rowKey={record => `${record.owner}/${record.name}`}
          pagination={paginationProps}
          loading={this.state.loading}
          onChange={this.handleTableChange}
          title={() => (
            <LegacyListPageToolbar
              host={this}
              title={t("general:Agents")}
              total={this.state.pagination.total}
              fields={queryFields}
              defaultField="name"
              actions={<Button type="primary" onClick={() => this.addAgent()}>{t("general:Add")}</Button>}
            />
          )}
        />
      </div>
    );
  }
}

export default AgentListPage;
