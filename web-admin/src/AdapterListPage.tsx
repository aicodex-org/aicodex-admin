// Copyright 2022 The Casdoor Authors. All Rights Reserved.
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
import type {TableProps} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as AdapterBackend from "./backend/AdapterBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowDeleteAction, ListPageRowEditAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";

type Account = {
  owner: string;
  tag: string;
  isAdmin?: boolean;
};

type HistoryLike = {
  push: (location: string | {pathname: string; mode?: string}) => void;
};

type AdapterListPageProps = {
  account: Account;
  history: HistoryLike;
  match?: {
    path?: string;
    params?: {
      organizationName?: string;
    };
  };
};

type AdapterRecord = {
  owner: string;
  name: string;
  createdTime?: string;
  table: string;
  useSameDb: boolean;
  type?: string;
  databaseType?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  [key: string]: unknown;
};

type TablePagination = {
  current: number;
  pageSize: number;
  total?: number;
};

type FetchParams = {
  pagination: TablePagination;
  searchedColumn?: string;
  searchText?: string;
  sortField?: string;
  sortOrder?: string;
  type?: string;
};

type AdapterListResponse = {
  status: string;
  msg?: string;
  data: AdapterRecord[];
  data2: number;
};

type MutationResponse = {
  status: string;
  msg?: string;
};

type AdapterBackendApi = {
  getAdapters: (
    owner: string,
    page: number,
    pageSize: number,
    field?: string,
    value?: string,
    sortField?: string,
    sortOrder?: string
  ) => Promise<AdapterListResponse>;
  addAdapter: (adapter: AdapterRecord) => Promise<MutationResponse>;
  deleteAdapter: (adapter: AdapterRecord) => Promise<MutationResponse>;
};

type LegacyTableColumn = {
  title: React.ReactNode;
  dataIndex?: string;
  key?: string;
  width?: string;
  sorter?: boolean | ((a: AdapterRecord, b: AdapterRecord) => number);
  render?: (text: unknown, record: AdapterRecord, index: number) => React.ReactNode;
  [key: string]: unknown;
};

const adapterBackend = AdapterBackend as unknown as AdapterBackendApi;
const t = (key: string): string => i18next.t(key) as string;

const queryFields = [
  {label: t("general:Name"), value: "name"},
  {label: t("general:Organization"), value: "owner"},
  {label: t("syncer:Table"), value: "table"},
  {label: t("general:Type"), value: "type"},
  {label: t("syncer:Database type"), value: "databaseType"},
  {label: t("provider:Host"), value: "host"},
  {label: t("provider:Port"), value: "port"},
  {label: t("general:User"), value: "user"},
];

class AdapterListPage extends BaseListPage {
  newAdapter(): AdapterRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `adapter_${randomName}`,
      createdTime: moment().format(),
      table: "table_name",
      useSameDb: true,
    };
  }

  addAdapter(): void {
    const newAdapter = this.newAdapter();
    adapterBackend.addAdapter(newAdapter)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/adapters/${newAdapter.owner}/${newAdapter.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteAdapter(i: number): void {
    adapterBackend.deleteAdapter(this.state.data[i] as AdapterRecord)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully deleted"));
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: this.state.pagination.current > 1 && this.state.data.length === 1 ? this.state.pagination.current - 1 : this.state.pagination.current,
            },
          });
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderTable(adapters: AdapterRecord[]): React.ReactElement {
    const columns: LegacyTableColumn[] = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "120px",
        sorter: true,
        render: (text: unknown, record: AdapterRecord) => {
          const adapterName = String(text);
          return (
            <Link to={`/adapters/${record.owner}/${adapterName}`}>
              {adapterName}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "100px",
        sorter: true,
        render: (text: unknown) => {
          const owner = String(text);
          return (
            <Link to={`/organizations/${owner}`}>
              {owner}
            </Link>
          );
        },
      },
      {
        title: t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "130px",
        sorter: true,
        render: (text: unknown) => {
          return Setting.getFormattedDate(String(text));
        },
      },
      {
        title: t("syncer:Table"),
        dataIndex: "table",
        key: "table",
        width: "100px",
        sorter: true,
      },
      {
        title: t("adapter:Use same DB"),
        dataIndex: "useSameDb",
        key: "useSameDb",
        width: "100px",
        sorter: true,
        render: (text: unknown) => {
          return (
            <Switch disabled checkedChildren={t("general:ON")} unCheckedChildren={t("general:OFF")} checked={Boolean(text)} />
          );
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
        width: "100px",
        sorter: (a: AdapterRecord, b: AdapterRecord) => String(a.databaseType || "").localeCompare(String(b.databaseType || "")),
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "136px",
        render: (_text: unknown, record: AdapterRecord, index: number) => {
          return (
            <ListPageRowActions className="adapter-row-actions">
              <ListPageRowEditAction onClick={() => this.props.history.push(`/adapters/${record.owner}/${record.name}`)} />
              <ListPageRowDeleteAction
                disabled={Setting.builtInObject(record)}
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteAdapter(index)}
              />
            </ListPageRowActions>
          );
        },
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="enterprise-list-page-table-shell adapter-list-page-table-shell">
        <ListPageTable<AdapterRecord> columns={columns as TableProps<AdapterRecord>["columns"]} dataSource={adapters} rowKey={(record) => `${record.owner}/${record.name}`} pagination={paginationProps}
          title={() => (
            <LegacyListPageToolbar
              host={this}
              title={t("general:Adapters")}
              total={(this.state.pagination as TablePagination).total}
              fields={queryFields}
              defaultField="name"
              actions={<Button type="primary" onClick={this.addAdapter.bind(this)}>{t("general:Add")}</Button>}
            />
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params = {} as FetchParams): void => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    adapterBackend.getAdapters(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: AdapterListResponse) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data,
            pagination: {
              ...params.pagination,
              total: res.data2,
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

export default AdapterListPage;
