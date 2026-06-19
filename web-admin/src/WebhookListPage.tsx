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
import moment from "moment";
import * as Setting from "./Setting";
import * as WebhookBackend from "./backend/WebhookBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import PopconfirmModal from "./common/modal/PopconfirmModal";
import {legacyColumns} from "./types/legacyPage";

type AdminRouteProps = import("./types/legacyPage").AdminRouteProps;
type LegacyAny = import("./types/legacyPage").LegacyAny;
type LegacyBackendResponse<TData = LegacyAny> = import("./types/legacyPage").LegacyBackendResponse<TData>;
type LegacyColumn<TRecord = LegacyAny> = import("./types/legacyPage").LegacyColumn<TRecord>;
type LegacyFetchParams = import("./types/legacyPage").LegacyFetchParams;

interface WebhookRecord {
  owner: string;
  name: string;
  organization?: string;
  [key: string]: LegacyAny;
}

function t(key: string, options?: LegacyAny): string {
  return String(i18next.t(key, options));
}

const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, LegacyAny> & LegacyAny;

class WebhookListPage extends LegacyBaseListPage {
  newWebhook() {
    const randomName = Setting.getRandomName();
    const organizationName = Setting.getRequestOrganization(this.props.account);
    return {
      owner: "admin", // this.props.account.webhookname,
      name: `webhook_${randomName}`,
      createdTime: moment().format(),
      organization: organizationName,
      url: "https://example.com/callback",
      method: "POST",
      contentType: "application/json",
      headers: [],
      events: ["signup", "login", "logout", "update-user"],
      isEnabled: true,
    };
  }

  addWebhook() {
    const newWebhook = this.newWebhook();
    WebhookBackend.addWebhook(newWebhook)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/webhooks/${newWebhook.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteWebhook(i: number) {
    WebhookBackend.deleteWebhook(this.state.data[i])
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

  renderTable(webhooks: WebhookRecord[]) {
    const columns: LegacyColumn<WebhookRecord>[] = legacyColumns<WebhookRecord>([
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "150px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/webhooks/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "organization",
        key: "organization",
        width: "110px",
        sorter: true,
        ...this.getColumnSearchProps("organization"),
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
        width: "150px",
        sorter: true,
        render: (text, record, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:URL"),
        dataIndex: "url",
        key: "url",
        width: "200px",
        sorter: true,
        ...this.getColumnSearchProps("url"),
        render: (text, record, index) => {
          return (
            <a target="_blank" rel="noreferrer" href={text}>
              {
                Setting.getShortText(text)
              }
            </a>
          );
        },
      },
      {
        title: t("general:Method"),
        dataIndex: "method",
        key: "method",
        width: "100px",
        sorter: true,
        ...this.getColumnSearchProps("method"),
      },
      {
        title: t("webhook:Content type"),
        dataIndex: "contentType",
        key: "contentType",
        width: "140px",
        sorter: true,
        filterMultiple: false,
        filters: [
          {text: "application/json", value: "application/json"},
          {text: "application/x-www-form-urlencoded", value: "application/x-www-form-urlencoded"},
        ],
      },
      {
        title: t("webhook:Events"),
        dataIndex: "events",
        key: "events",
        // width: '100px',
        sorter: true,
        ...this.getColumnSearchProps("events"),
        render: (text, record, index) => {
          return Setting.getTags(text);
        },
      },
      {
        title: t("webhook:Is user extended"),
        dataIndex: "isUserExtended",
        key: "isUserExtended",
        width: "140px",
        sorter: true,
        render: (text, record, index) => {
          return (
            <Switch disabled checkedChildren={t("general:ON")} unCheckedChildren={t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: t("webhook:Single org only"),
        dataIndex: "singleOrgOnly",
        key: "singleOrgOnly",
        width: "140px",
        sorter: true,
        render: (text, record, index) => {
          return (
            <Switch disabled checkedChildren={t("general:ON")} unCheckedChildren={t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: t("general:Is enabled"),
        dataIndex: "isEnabled",
        key: "isEnabled",
        width: "120px",
        sorter: true,
        fixed: (Setting.isMobile()) ? false : "right",
        render: (text, record, index) => {
          return (
            <Switch disabled checkedChildren={t("general:ON")} unCheckedChildren={t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "170px",
        fixed: (Setting.isMobile()) ? false : "right",
        render: (text, record, index) => {
          return (
            <div>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.props.history.push(`/webhooks/${record.name}`)}>{t("general:Edit")}</Button>
              <PopconfirmModal
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteWebhook(index)}
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
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={webhooks} rowKey={(record: WebhookRecord) => `${record.owner}/${record.name}`} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {t("general:Webhooks")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={this.addWebhook.bind(this)}>{t("general:Add")}</Button>
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
    if (params.contentType !== undefined && params.contentType !== null) {
      field = "contentType";
      value = params.contentType;
    }
    this.setState({loading: true});
    (WebhookBackend.getWebhooks as LegacyAny)("admin", Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: LegacyBackendResponse<WebhookRecord[]>) => {
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

export default WebhookListPage as unknown as React.ComponentType<AdminRouteProps>;
