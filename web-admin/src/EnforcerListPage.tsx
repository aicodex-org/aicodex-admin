// Copyright 2023 The Casdoor Authors. All Rights Reserved.
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
import {Button, Table} from "antd";
import type {TableProps} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as EnforcerBackend from "./backend/EnforcerBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import PopconfirmModal from "./common/modal/PopconfirmModal";

type Account = {
  owner: string;
  tag?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
};

type HistoryLike = {
  push: (location: string | {pathname: string; mode?: string}) => void;
};

type EnforcerListPageProps = {
  account: Account;
  history: HistoryLike;
  match?: {
    path?: string;
    params?: {
      organizationName?: string;
    };
  };
};

type EnforcerRecord = {
  owner: string;
  name: string;
  createdTime?: string;
  displayName?: string;
  model?: string;
  adapter?: string;
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

type EnforcerListResponse = {
  status: string;
  msg?: string;
  data: EnforcerRecord[];
  data2: number;
};

type MutationResponse = {
  status: string;
  msg?: string;
};

type EnforcerBackendApi = {
  getEnforcers: (
    owner: string,
    page: number,
    pageSize: number,
    field?: string,
    value?: string,
    sortField?: string,
    sortOrder?: string
  ) => Promise<EnforcerListResponse>;
  addEnforcer: (enforcer: EnforcerRecord) => Promise<MutationResponse>;
  deleteEnforcer: (enforcer: EnforcerRecord) => Promise<MutationResponse>;
};

type LegacyTableColumn = {
  title: React.ReactNode;
  dataIndex?: string;
  key?: string;
  width?: string;
  fixed?: "left" | "right" | boolean | string;
  sorter?: boolean;
  render?: (text: unknown, record: EnforcerRecord, index: number) => React.ReactNode;
  [key: string]: unknown;
};

const enforcerBackend = EnforcerBackend as unknown as EnforcerBackendApi;
const t = (key: string): string => i18next.t(key) as string;

class EnforcerListPage extends BaseListPage {
  newEnforcer(): EnforcerRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `enforcer_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Enforcer - ${randomName}`,
    };
  }

  addEnforcer(): void {
    const newEnforcer = this.newEnforcer();
    enforcerBackend.addEnforcer(newEnforcer)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/enforcers/${newEnforcer.owner}/${newEnforcer.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteEnforcer(i: number): void {
    enforcerBackend.deleteEnforcer(this.state.data[i] as EnforcerRecord)
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

  renderTable(enforcers: EnforcerRecord[]): React.ReactElement {
    const columns: LegacyTableColumn[] = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "200px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text: unknown, record: EnforcerRecord) => {
          const enforcerName = String(text);
          return (
            <Link to={`/enforcers/${record.owner}/${enforcerName}`}>
              {enforcerName}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("owner"),
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
        width: "160px",
        sorter: true,
        render: (text: unknown) => {
          return Setting.getFormattedDate(String(text));
        },
      },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        // width: "200px",
        sorter: true,
        ...this.getColumnSearchProps("displayName"),
      },
      {
        title: t("general:Model"),
        dataIndex: "model",
        key: "model",
        width: "250px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text: unknown) => {
          const model = String(text);
          return (
            <Link to={`/models/${model}`}>
              {model}
            </Link>
          );
        },
      },
      {
        title: t("general:Adapter"),
        dataIndex: "adapter",
        key: "adapter",
        width: "250px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text: unknown) => {
          const adapter = String(text);
          return (
            <Link to={`/adapters/${adapter}`}>
              {adapter}
            </Link>
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "180px",
        fixed: (Setting.isMobile()) ? "false" : "right",
        render: (_text: unknown, record: EnforcerRecord, index: number) => {
          return (
            <div>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary"
                onClick={() => this.props.history.push(`/enforcers/${record.owner}/${record.name}`)}>{t("general:Edit")}</Button>
              <PopconfirmModal
                disabled={Setting.builtInObject(record)}
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteEnforcer(index)}
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
        <Table<EnforcerRecord> scroll={{x: "max-content"}} columns={columns as TableProps<EnforcerRecord>["columns"]} dataSource={enforcers} rowKey={(record) => `${record.owner}/${record.name}`} size="middle" bordered
          pagination={paginationProps}
          title={() => (
            <div>
              {t("general:Enforcers")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small"
                onClick={this.addEnforcer.bind(this)}>{t("general:Add")}</Button>
            </div>
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
    enforcerBackend.getEnforcers(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: EnforcerListResponse) => {
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

export default EnforcerListPage;
