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
import {Button, Table} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as KeyBackend from "./backend/KeyBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import PopconfirmModal from "./common/modal/PopconfirmModal";
import {legacyColumns} from "./types/legacyPage";

type AdminRouteProps = import("./types/legacyPage").AdminRouteProps;
type LegacyAny = import("./types/legacyPage").LegacyAny;
type LegacyBackendResponse<TData = LegacyAny> = import("./types/legacyPage").LegacyBackendResponse<TData>;
type LegacyColumn<TRecord = LegacyAny> = import("./types/legacyPage").LegacyColumn<TRecord>;
type LegacyFetchParams = import("./types/legacyPage").LegacyFetchParams;

interface KeyRecord {
  owner: string;
  name: string;
  [key: string]: LegacyAny;
}

function t(key: string, options?: LegacyAny): string {
  return String(i18next.t(key, options));
}

const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, LegacyAny> & LegacyAny;

class KeyListPage extends LegacyBaseListPage {
  newKey() {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `key_${randomName}`,
      createdTime: moment().format(),
      updatedTime: moment().format(),
      displayName: `New Key - ${randomName}`,
      type: "Organization",
      organization: owner,
      application: "",
      user: "",
      accessKey: "",
      accessSecret: "",
      expireTime: "",
      state: "Active",
    };
  }

  addKey() {
    const newKey = this.newKey();
    KeyBackend.addKey(newKey)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/keys/${newKey.owner}/${newKey.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteKey(i: number) {
    KeyBackend.deleteKey(this.state.data[i])
      .then((res) => {
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
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderTable(keys: KeyRecord[]) {
    const columns: LegacyColumn<KeyRecord>[] = legacyColumns<KeyRecord>([
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "140px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/keys/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("owner"),
        render: (text, record, index) => {
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
        render: (text, record, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "170px",
        sorter: true,
        ...this.getColumnSearchProps("displayName"),
      },
      {
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "140px",
        sorter: true,
        filterMultiple: false,
        filters: [
          {text: t("general:Organization"), value: "Organization"},
          {text: t("general:Application"), value: "Application"},
          {text: t("general:User"), value: "User"},
          {text: t("general:General"), value: "General"},
        ],
      },
      {
        title: t("key:Access key"),
        dataIndex: "accessKey",
        key: "accessKey",
        width: "300px",
        sorter: true,
        ...this.getColumnSearchProps("accessKey"),
      },
      {
        title: t("general:Expire time"),
        dataIndex: "expireTime",
        key: "expireTime",
        width: "160px",
        sorter: true,
        render: (text, record, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("state"),
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "180px",
        fixed: (Setting.isMobile()) ? false : "right",
        render: (text, record, index) => {
          return (
            <div>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.props.history.push(`/keys/${record.owner}/${record.name}`)}>{t("general:Edit")}</Button>
              <PopconfirmModal
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteKey(index)}
              >
              </PopconfirmModal>
            </div>
          );
        },
      },
    ]);

    const paginationProps = this.getTablePaginationProps();

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={keys} rowKey={(record: KeyRecord) => `${record.owner}/${record.name}`} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {t("general:Keys")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={this.addKey.bind(this)}>{t("general:Add")}</Button>
            </div>
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params: LegacyFetchParams = {pagination: this.state.pagination}) => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    (Setting.isDefaultOrganizationSelected(this.props.account) ? (KeyBackend.getGlobalKeys as LegacyAny)(params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      : (KeyBackend.getKeys as LegacyAny)(Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder))
      .then((res: LegacyBackendResponse<KeyRecord[]>) => {
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

export default KeyListPage as unknown as React.ComponentType<AdminRouteProps>;
