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
import {Button, Popover} from "antd";
import type {TableProps} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as ModelBackend from "./backend/ModelBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowDeleteAction, ListPageRowEditAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";
import Editor from "./common/Editor";

const rbacModel = `[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act`;

type Account = {
  owner: string;
  tag: string;
  isAdmin?: boolean;
};

export type ModelRecord = {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  description?: string;
  modelText: string;
};

type HistoryLike = {
  push: (location: string | {pathname: string; mode?: string}) => void;
};

type ModelListPageProps = {
  account: Account;
  history: HistoryLike;
  match?: {
    path?: string;
    params?: {
      organizationName?: string;
    };
  };
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

type ModelListPageState = {
  data: ModelRecord[];
  pagination: TablePagination;
  loading: boolean;
  searchText: string;
  searchedColumn: string;
  isAuthorized: boolean;
  [key: string]: unknown;
};

type ModelListResponse = {
  status: string;
  msg?: string;
  data: ModelRecord[];
  data2: number;
};

type MutationResponse = {
  status: string;
  msg?: string;
};

type ModelBackendApi = {
  getModels: (
    owner: string,
    page: number,
    pageSize: number,
    field?: string,
    value?: string,
    sortField?: string,
    sortOrder?: string
  ) => Promise<ModelListResponse>;
  addModel: (model: ModelRecord) => Promise<MutationResponse>;
  deleteModel: (model: ModelRecord) => Promise<MutationResponse>;
};

type LegacyTableColumn = {
  title: React.ReactNode;
  dataIndex?: string;
  key?: string;
  width?: string;
  sorter?: boolean;
  render?: (text: unknown, record: ModelRecord, index: number) => React.ReactNode;
  [key: string]: unknown;
};

const modelBackend = ModelBackend as unknown as ModelBackendApi;
const t = (key: string): string => i18next.t(key) as string;

const queryFields = [
  {label: t("general:Name"), value: "name"},
  {label: t("general:Organization"), value: "owner"},
  {label: t("general:Display name"), value: "displayName"},
  {label: t("model:Model text"), value: "modelText"},
];

class ModelListPage extends BaseListPage {
  newModel(): ModelRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `model_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Model - ${randomName}`,
      modelText: rbacModel,
    };
  }

  addModel(): void {
    const newModel = this.newModel();
    modelBackend.addModel(newModel)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/models/${newModel.owner}/${newModel.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteModel(i: number): void {
    modelBackend.deleteModel(this.state.data[i])
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

  renderTable(models: ModelRecord[]): React.ReactElement {
    const columns: LegacyTableColumn[] = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "180px",
        sorter: true,
        render: (text: unknown, record: ModelRecord) => {
          const modelName = String(text);
          return (
            <Link to={`/models/${record.owner}/${modelName}`}>
              {modelName}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "180px",
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
        width: "180px",
        sorter: true,
        render: (text: unknown) => {
          return Setting.getFormattedDate(String(text));
        },
      },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "200px",
        sorter: true,
      },
      {
        title: t("model:Model text"),
        dataIndex: "modelText",
        key: "modelText",
        // width: "180px",
        sorter: true,
        render: (text: unknown) => {
          const modelText = String(text);
          return (
            <Popover placement="topRight" content={() => {
              return (
                <Editor value={modelText} />
              );
            }} title="" trigger="hover">
              {
                Setting.getShortText(modelText, 100)
              }
            </Popover>
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "180px",
        render: (_text: unknown, record: ModelRecord, index: number) => {
          return (
            <ListPageRowActions className="model-row-actions">
              <ListPageRowEditAction onClick={() => this.props.history.push(`/models/${record.owner}/${record.name}`)} />
              <ListPageRowDeleteAction
                disabled={Setting.builtInObject(record)}
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteModel(index)}
              />
            </ListPageRowActions>
          );
        },
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="enterprise-list-page-table-shell model-list-page-table-shell">
        <ListPageTable<ModelRecord> columns={columns as TableProps<ModelRecord>["columns"]} dataSource={models} rowKey={(record) => `${record.owner}/${record.name}`}
          pagination={paginationProps}
          title={() => (
            <LegacyListPageToolbar
              host={this}
              title={t("general:Models")}
              total={(this.state.pagination as TablePagination).total}
              fields={queryFields}
              defaultField="name"
              actions={<Button type="primary" onClick={this.addModel.bind(this)}>{t("general:Add")}</Button>}
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
    modelBackend.getModels(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: ModelListResponse) => {
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

export default ModelListPage;
