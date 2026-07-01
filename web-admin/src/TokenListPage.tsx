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
import {Button} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import * as TokenBackend from "./backend/TokenBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowDeleteAction, ListPageRowEditAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";
import {getAuditOperationsTableScroll} from "./auditOperationsListTable";
import type {AdminRouteProps, LegacyAny, LegacyBackendResponse, LegacyFetchParams, LegacyListState} from "./types/legacyPage";
import {legacyColumns, textValue} from "./types/legacyPage";

type TokenRecord = {
  owner: string;
  name: string;
  createdTime?: string;
  application?: string;
  organization?: string;
  user?: string;
  accessToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
  [key: string]: LegacyAny;
};

type TokenListPageState = LegacyListState<TokenRecord> & {
  advancedFiltersOpen?: boolean;
};

type TokenListResponse = LegacyBackendResponse<TokenRecord[]> & {
  data: TokenRecord[];
  data2: number;
};

type TokenBackendApi = {
  getTokens: (
    owner: string,
    organization: string,
    page?: number,
    pageSize?: number,
    field?: string,
    value?: LegacyAny,
    sortField?: string,
    sortOrder?: string
  ) => Promise<TokenListResponse>;
  addToken: (token: TokenRecord) => Promise<LegacyBackendResponse>;
  deleteToken: (token: TokenRecord) => Promise<LegacyBackendResponse>;
};

const tokenBackend = TokenBackend as unknown as TokenBackendApi;
const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, TokenListPageState> & LegacyAny;
const t = (key: string): string => i18next.t(key) as string;

function getTokenQueryFields() {
  return [
    {label: t("general:Name"), value: "name"},
    {label: t("general:Application"), value: "application"},
    {label: t("general:Organization"), value: "organization"},
    {label: t("general:User"), value: "user"},
    {label: t("token:Authorization code"), value: "code"},
    {label: t("token:Access token"), value: "accessToken"},
    {label: t("token:Expires in"), value: "expiresIn"},
    {label: t("provider:Scope"), value: "scope"},
  ];
}

class TokenListPage extends LegacyBaseListPage {
  newToken(): TokenRecord {
    const randomName = Setting.getRandomName();
    const organizationName = Setting.getRequestOrganization(this.props.account);
    return {
      owner: "admin", // this.props.account.tokenname,
      name: `token_${randomName}`,
      createdTime: moment().format(),
      application: Conf.DefaultApplication,
      organization: organizationName,
      user: "admin",
      accessToken: "",
      expiresIn: 7200,
      scope: "read",
      tokenType: "Bearer",
    };
  }

  addToken() {
    const newToken = this.newToken();
    tokenBackend.addToken(newToken)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/tokens/${newToken.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteToken(i: number): void {
    tokenBackend.deleteToken(this.state.data[i])
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

  renderTable(tokens: TokenRecord[]): React.ReactElement {
    const columns = legacyColumns<TokenRecord>([
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: (Setting.isMobile()) ? "100px" : "180px",
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
        render: (text: unknown) => {
          const name = textValue(text);
          return (
            <Link to={`/tokens/${name}`}>
              {name}
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
        render: (text: unknown) => {
          return Setting.getFormattedDate(textValue(text));
        },
      },
      {
        title: t("general:Application"),
        dataIndex: "application",
        key: "application",
        width: "130px",
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
        render: (text: unknown, record: TokenRecord) => {
          const application = textValue(text);
          return (
            <Link to={`/applications/${record.organization}/${application}`}>
              {application}
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
        ellipsis: {
          showTitle: false,
        },
        render: (text: unknown) => {
          const organization = textValue(text);
          return (
            <Link to={`/organizations/${organization}`}>
              {organization}
            </Link>
          );
        },
      },
      {
        title: t("general:User"),
        dataIndex: "user",
        key: "user",
        width: "120px",
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
        render: (text: unknown, record: TokenRecord) => {
          const user = textValue(text);
          return (
            <Link to={`/users/${record.organization}/${user}`}>
              {user}
            </Link>
          );
        },
      },
      {
        title: t("token:Expires in"),
        dataIndex: "expiresIn",
        key: "expiresIn",
        width: "100px",
        sorter: true,
      },
      {
        title: t("provider:Scope"),
        dataIndex: "scope",
        key: "scope",
        width: "130px",
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
      },
      // {
      //   title: t("token:Token type"),
      //   dataIndex: 'tokenType',
      //   key: 'tokenType',
      //   width: '130px',
      //   sorter: (a, b) => a.tokenType.localeCompare(b.tokenType),
      // },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "112px",
        render: (_text: unknown, record: TokenRecord, index: number) => {
          return (
            <ListPageRowActions className="token-row-actions">
              <ListPageRowEditAction onClick={() => this.props.history.push(`/tokens/${record.name}`)} />
              <ListPageRowDeleteAction
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteToken(index)}
              />
            </ListPageRowActions>
          );
        },
      },
    ]);

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="audit-operations-list-route-body">
        <div className="enterprise-list-page-table-shell audit-operations-list-page-table-shell token-list-page-table-shell">
          <ListPageTable className="audit-operations-list-table token-list-table" scroll={getAuditOperationsTableScroll(this.state.advancedFiltersOpen)} columns={columns} dataSource={tokens} rowKey={(record) => `${record.owner}/${record.name}`} pagination={paginationProps}
            title={() => (
              <LegacyListPageToolbar
                host={this}
                title={t("general:Token Review")}
                total={this.state.pagination.total}
                fields={getTokenQueryFields()}
                defaultField="name"
                onAdvancedOpenChange={(advancedFiltersOpen) => this.setState({advancedFiltersOpen})}
                actions={<Button type="primary" onClick={this.addToken.bind(this)}>{t("general:Add")}</Button>}
              />
            )}
            loading={this.state.loading}
            onChange={this.handleTableChange}
          />
        </div>
      </div>
    );
  }

  fetch = (params = {} as LegacyFetchParams): void => {
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    this.setState({loading: true});
    tokenBackend.getTokens("admin", Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: TokenListResponse) => {
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

export default TokenListPage;
