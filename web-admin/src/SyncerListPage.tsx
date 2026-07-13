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
import {Link} from "react-router-dom";
import {Button, Switch} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import {SyncOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as SyncerBackend from "./backend/SyncerBackend";
import type {SyncerRecord} from "./backend/SyncerBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowActionButton, ListPageRowDeleteAction, ListPageRowEditAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";

interface SyncerListPageProps {
  account?: Record<string, unknown>;
  history: {
    push: (location: string | {pathname: string; mode?: string; syncer?: SyncerRecord}) => void;
  };
  match?: {
    path?: string;
    params?: {
      organizationName?: string;
    };
  };
}

interface SyncerListPageState {
  data: SyncerRecord[];
  pagination: TablePaginationConfig;
  loading: boolean;
  searchText?: string | number;
  searchedColumn?: string;
  isAuthorized?: boolean;
}

type SyncerListColumns = TableProps<SyncerRecord>["columns"];

type SyncerListFetchParams = {
  pagination?: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: string | number;
  sortField?: string;
  sortOrder?: string | null;
  type?: string | string[] | null;
};

// BaseListPage 仍是 legacy JS；本 change 只声明当前列表页实际使用到的继承边界。
type LegacyBaseListPageCompat = React.Component<SyncerListPageProps, SyncerListPageState> & {
  isUnmounted: boolean;
  getColumnSearchProps: (dataIndex: string, customRender?: unknown) => Record<string, unknown>;
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<SyncerRecord>["onChange"]>;
};

const TypedBaseListPage = BaseListPage as unknown as {
  new(props: SyncerListPageProps): LegacyBaseListPageCompat;
};

const queryFields = [
  {label: t("general:Name"), value: "name"},
  {label: t("general:Organization"), value: "organization"},
  {label: t("general:Type"), value: "type"},
  {label: t("provider:Host"), value: "host"},
  {label: t("provider:Port"), value: "port"},
  {label: t("general:User"), value: "user"},
  {label: t("syncer:Sync interval"), value: "syncInterval"},
];

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

function normalizeTypeFilter(typeFilter?: string | string[] | null): string | undefined {
  if (Array.isArray(typeFilter)) {
    return typeFilter.join(",");
  }
  return typeFilter || undefined;
}

class SyncerListPage extends TypedBaseListPage {
  newSyncer(): SyncerRecord {
    const randomName = Setting.getRandomName();
    const organizationName = Setting.getRequestOrganization(this.props.account);
    return {
      owner: "admin",
      name: `syncer_${randomName}`,
      createdTime: moment().format(),
      organization: organizationName,
      type: "Database",
      host: "localhost",
      port: 3306,
      user: "root",
      password: "123456",
      databaseType: "mysql",
      database: "dbName",
      table: "table_name",
      tableColumns: [],
      affiliationTable: "",
      avatarBaseUrl: "",
      syncInterval: 10,
      isReadOnly: false,
      isEnabled: false,
    };
  }

  addSyncer(): void {
    const newSyncer = this.newSyncer();
    this.props.history.push({pathname: `/syncers/${newSyncer.name}`, mode: "add", syncer: newSyncer});
  }

  deleteSyncer(i: number): void {
    SyncerBackend.deleteSyncer(this.state.data[i])
      .then((res) => {
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

  runSyncer(i: number): void {
    this.setState({loading: true});
    SyncerBackend.runSyncer("admin", this.state.data[i].name || "")
      .then((res) => {
        if (res.status === "ok") {
          this.setState({loading: false});
          Setting.showMessage("success", t("general:Successfully synced"));
        } else {
          this.setState({loading: false});
          Setting.showMessage("error", `${t("general:Failed to sync")}: ${res.msg}`);
        }
      }
      )
      .catch(error => {
        this.setState({loading: false});
        Setting.showMessage("error", `${t("general:Failed to sync")}: ${error}`);
      });
  }

  renderTable(syncers: SyncerRecord[]): React.ReactNode {
    const columns: SyncerListColumns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "120px",
        fixed: "left",
        sorter: true,
        render: (text: string) => {
          return (
            <Link to={`/syncers/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "organization",
        key: "organization",
        width: "100px",
        sorter: true,
        render: (text: string) => {
          return (
            <Link to={`/organizations/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "120px",
        sorter: true,
        render: (text: string) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "80px",
        sorter: true,
      },
      {
        title: t("syncer:Database type"),
        dataIndex: "databaseType",
        key: "databaseType",
        width: "110px",
        sorter: (a, b) => String(a.databaseType || "").localeCompare(String(b.databaseType || "")),
      },
      {
        title: t("syncer:Table"),
        dataIndex: "table",
        key: "table",
        width: "90px",
        sorter: true,
      },
      {
        title: t("syncer:Sync interval"),
        dataIndex: "syncInterval",
        key: "syncInterval",
        width: "100px",
        sorter: true,
      },
      {
        title: t("general:Is enabled"),
        dataIndex: "isEnabled",
        key: "isEnabled",
        width: "90px",
        sorter: true,
        render: (text: boolean) => {
          return (
            <Switch disabled checkedChildren={t("general:ON")} unCheckedChildren={t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "150px",
        fixed: Setting.isMobile() ? false : "right",
        render: (_text: unknown, record: SyncerRecord, index: number) => {
          return (
            <ListPageRowActions className="syncer-row-actions" wrap>
              <ListPageRowActionButton icon={<SyncOutlined />} onClick={() => this.runSyncer(index)}>{t("general:Sync")}</ListPageRowActionButton>
              <ListPageRowEditAction onClick={() => this.props.history.push(`/syncers/${record.name || ""}`)} />
              <ListPageRowDeleteAction
                title={t("general:Sure to delete") + `: ${record.name || ""} ?`}
                onConfirm={() => this.deleteSyncer(index)}
              />
            </ListPageRowActions>
          );
        },
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="enterprise-list-page-table-shell syncer-list-page-table-shell">
        <ListPageTable<SyncerRecord> columns={columns} dataSource={syncers} rowKey={(record) => `${record.owner}/${record.name}`} pagination={paginationProps}
          title={() => (
            <LegacyListPageToolbar
              host={this}
              title={t("general:Syncers")}
              total={this.state.pagination.total}
              fields={queryFields}
              defaultField="name"
              actions={<Button type="primary" onClick={this.addSyncer.bind(this)}>{t("general:Add")}</Button>}
            />
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params: SyncerListFetchParams = {}): void => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = normalizeTypeFilter(params.type);
    }
    this.setState({loading: true});
    const pagination = params.pagination || this.state.pagination;
    SyncerBackend.getSyncers("admin", Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), pagination.current, pagination.pageSize, field, value, sortField, sortOrder)
      .then((res) => {
        if (this.isUnmounted) {
          return;
        }

        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data || [],
            pagination: {
              ...pagination,
              total: typeof res.data2 === "number" ? res.data2 : typeof res.data2 === "string" ? Number(res.data2) : pagination.total,
            },
            searchText: params.searchText,
            searchedColumn: params.searchedColumn,
          });
        } else {
          if (Setting.isResponseDenied(res)) {
            this.setState({
              isAuthorized: false,
            });
          } else {
            Setting.showMessage("error", res.msg);
          }
        }
      });
  };
}

export default SyncerListPage;
