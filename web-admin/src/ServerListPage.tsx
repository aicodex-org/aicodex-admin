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
import * as ServerBackend from "./backend/ServerBackend";
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

type ServerQueryValue = string | number | boolean | string[] | null | undefined;

interface AccountRecord {
  owner: string;
  tag?: string;
  [key: string]: unknown;
}

interface ToolRecord {
  name?: string;
  description?: string;
  isAllowed?: boolean;
  [key: string]: unknown;
}

interface ServerRecord {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  url: string;
  application: string;
  token?: string;
  tools?: ToolRecord[];
  [key: string]: unknown;
}

interface ServerListPageProps {
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

interface ServerListPageState {
  data: ServerRecord[];
  pagination: TablePaginationConfig;
  loading: boolean;
  searchText?: ServerQueryValue;
  searchedColumn?: string;
  formItems?: FormItem[];
}

type ServerListColumns = TableProps<ServerRecord>["columns"];

type ServerListFetchParams = {
  pagination?: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: ServerQueryValue;
  sortField?: string;
  sortOrder?: string | null;
};

interface BackendResponse<T> {
  status?: string;
  data?: T;
  data2?: number;
  msg?: string;
}

type ServerBackendCompat = {
  getServers: (
    owner: string,
    page?: string | number,
    pageSize?: string | number,
    field?: string,
    value?: ServerQueryValue,
    sortField?: string,
    sortOrder?: string | null
  ) => Promise<BackendResponse<ServerRecord[]>>;
  addServer: (server: ServerRecord) => Promise<BackendResponse<unknown>>;
  deleteServer: (server: ServerRecord) => Promise<BackendResponse<unknown>>;
};

const serverBackend = ServerBackend as unknown as ServerBackendCompat;

// BaseListPage 仍是 legacy JS；这里仅声明 MCP Server 列表页实际依赖的继承面。
type LegacyBaseListPageCompat = React.Component<ServerListPageProps, ServerListPageState> & {
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<ServerRecord>["onChange"]>;
};

const TypedBaseListPage = BaseListPage as unknown as {
  new(props: ServerListPageProps): LegacyBaseListPageCompat;
};

function t(key: string): string {
  return String(i18next.t(key));
}

const queryFields = [
  {label: t("general:Name"), value: "name"},
  {label: t("general:Organization"), value: "owner"},
  {label: t("general:Display name"), value: "displayName"},
  {label: t("general:URL"), value: "url"},
  {label: t("general:Application"), value: "application"},
];

class ServerListPage extends TypedBaseListPage {
  newServer(): ServerRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `server_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Server - ${randomName}`,
      url: "",
      application: "",
    };
  }

  addServer(): void {
    const newServer = this.newServer();
    serverBackend.addServer(newServer)
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/servers/${newServer.owner}/${newServer.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteServer(i: number): void {
    serverBackend.deleteServer(this.state.data[i])
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

  fetch = (params: ServerListFetchParams = {}): void => {
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    const pagination = params.pagination ?? {current: 1, pageSize: 10};

    this.setState({loading: true});
    serverBackend.getServers(Setting.getRequestOrganization(this.props.account), pagination.current, pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: BackendResponse<ServerRecord[]>) => {
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

  renderTable(servers: ServerRecord[]): React.ReactNode {
    const columns: ServerListColumns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "160px",
        sorter: true,
        render: (text: string, record: ServerRecord) => {
          return (
            <Link to={`/servers/${record.owner}/${text}`}>
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
        title: t("general:URL"),
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
        render: (_text: unknown, record: ServerRecord, index: number) => {
          return (
            <ListPageRowActions className="server-row-actions">
              <ListPageRowEditAction onClick={() => this.props.history.push(`/servers/${record.owner}/${record.name}`)} />
              <ListPageRowDeleteAction
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteServer(index)}
              />
            </ListPageRowActions>
          );
        },
      },
    ];

    const filteredColumns = (Setting.filterTableColumns as (columns: ServerListColumns, formItems?: FormItem[]) => ServerListColumns)(columns, this.props.formItems ?? this.state.formItems);
    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="enterprise-list-page-table-shell server-list-page-table-shell">
        <ListPageTable<ServerRecord>
          dataSource={servers}
          columns={filteredColumns}
          rowKey={record => `${record.owner}/${record.name}`}
          pagination={paginationProps}
          loading={this.state.loading}
          onChange={this.handleTableChange}
          title={() => (
            <LegacyListPageToolbar
              host={this}
              title={t("general:MCP Servers")}
              total={this.state.pagination.total}
              fields={queryFields}
              defaultField="name"
              actions={(
                <>
                  <Button type="primary" onClick={() => this.addServer()}>{t("general:Add")}</Button>
                  <Button onClick={() => this.props.history.push("/server-store")}>{t("general:MCP Store")}</Button>
                </>
              )}
            />
          )}
        />
      </div>
    );
  }
}

export default ServerListPage;
