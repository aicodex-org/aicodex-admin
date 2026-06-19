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
import {Button, Switch, Table} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as SyncerBackend from "./backend/SyncerBackend";
import type {SyncerRecord} from "./backend/SyncerBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import PopconfirmModal from "./common/modal/PopconfirmModal";

interface SyncerListPageProps {
  account?: Record<string, unknown>;
  history: {
    push: (location: string | {pathname: string; mode?: string}) => void;
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
  getColumnSearchProps: (dataIndex: string, customRender?: unknown) => Record<string, unknown>;
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<SyncerRecord>["onChange"]>;
};

const TypedBaseListPage = BaseListPage as unknown as {
  new(props: SyncerListPageProps): LegacyBaseListPageCompat;
};

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
    SyncerBackend.addSyncer(newSyncer)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/syncers/${newSyncer.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
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
        width: "150px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("name"),
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
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("organization"),
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
        width: "160px",
        sorter: true,
        render: (text: string) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "100px",
        sorter: true,
        filterMultiple: false,
        filters: [
          {text: "Database", value: "Database"},
          {text: "LDAP", value: "LDAP"},
        ],
      },
      {
        title: t("syncer:Database type"),
        dataIndex: "databaseType",
        key: "databaseType",
        width: "130px",
        sorter: (a, b) => String(a.databaseType || "").localeCompare(String(b.databaseType || "")),
      },
      {
        title: t("provider:Host"),
        dataIndex: "host",
        key: "host",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("host"),
      },
      {
        title: t("provider:Port"),
        dataIndex: "port",
        key: "port",
        width: "100px",
        sorter: true,
        ...this.getColumnSearchProps("port"),
      },
      {
        title: t("general:User"),
        dataIndex: "user",
        key: "user",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("user"),
      },
      {
        title: t("general:Password"),
        dataIndex: "password",
        key: "password",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("password"),
      },
      {
        title: t("syncer:Database"),
        dataIndex: "database",
        key: "database",
        width: "120px",
        sorter: true,
      },
      {
        title: t("syncer:Table"),
        dataIndex: "table",
        key: "table",
        width: "120px",
        sorter: true,
      },
      {
        title: t("syncer:Sync interval"),
        dataIndex: "syncInterval",
        key: "syncInterval",
        width: "140px",
        sorter: true,
        ...this.getColumnSearchProps("syncInterval"),
      },
      {
        title: t("general:Is enabled"),
        dataIndex: "isEnabled",
        key: "isEnabled",
        width: "120px",
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
        width: "240px",
        fixed: Setting.isMobile() ? false : "right",
        render: (_text: unknown, record: SyncerRecord, index: number) => {
          return (
            <div>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.runSyncer(index)}>{t("general:Sync")}</Button>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} onClick={() => this.props.history.push(`/syncers/${record.name || ""}`)}>{t("general:Edit")}</Button>
              <PopconfirmModal
                title={t("general:Sure to delete") + `: ${record.name || ""} ?`}
                onConfirm={() => this.deleteSyncer(index)}
              >
              </PopconfirmModal>
            </div>
          );
        },
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={syncers} rowKey={(record) => `${record.owner}/${record.name}`} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {t("general:Syncers")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={this.addSyncer.bind(this)}>{t("general:Add")}</Button>
            </div>
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
