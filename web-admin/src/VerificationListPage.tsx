// Copyright 2024 The Casdoor Authors. All Rights Reserved.
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

import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import moment from "moment/moment";
import * as VerificationBackend from "./backend/VerificationBackend";
import i18next from "i18next";
import {Link} from "react-router-dom";
import React from "react";
import {Switch} from "antd";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageTable from "./common/ListPageTable";
import {getAuditOperationsTableScroll} from "./auditOperationsListTable";
import type {AdminRouteProps, LegacyAny, LegacyBackendResponse, LegacyFetchParams, LegacyListState} from "./types/legacyPage";
import {legacyColumns, textValue} from "./types/legacyPage";

type VerificationRecord = {
  owner: string;
  name: string;
  createdTime?: string;
  type?: string;
  user?: string;
  provider?: string;
  remoteAddr?: string;
  receiver?: string;
  code?: string;
  isUsed?: boolean;
  [key: string]: LegacyAny;
};

type VerificationListPageState = LegacyListState<VerificationRecord> & {
  advancedFiltersOpen?: boolean;
};

type VerificationListResponse = LegacyBackendResponse<VerificationRecord[]> & {
  data: VerificationRecord[];
  data2: number;
};

type VerificationBackendApi = {
  getVerifications: (
    owner: string,
    organization: string,
    page?: number,
    pageSize?: number,
    field?: string,
    value?: LegacyAny,
    sortField?: string,
    sortOrder?: string
  ) => Promise<VerificationListResponse>;
};

const verificationBackend = VerificationBackend as unknown as VerificationBackendApi;
const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, VerificationListPageState> & LegacyAny;
const t = (key: string): string => i18next.t(key) as string;

function getVerificationQueryFields() {
  return [
    {label: t("general:Name"), value: "name"},
    {label: t("general:Organization"), value: "owner"},
    {label: t("general:Type"), value: "type"},
    {label: t("general:User"), value: "user"},
    {label: t("general:Provider"), value: "provider"},
    {label: t("general:Client IP"), value: "remoteAddr"},
    {label: t("verification:Receiver"), value: "receiver"},
    {label: t("login:Verification code"), value: "code"},
  ];
}

class VerificationListPage extends LegacyBaseListPage {
  newVerification(): Pick<VerificationRecord, "owner" | "name" | "createdTime"> {
    const randomName = Setting.getRandomName();

    return {
      owner: "admin",
      name: `Verification_${randomName}`,
      createdTime: moment().format(),
    };
  }

  renderTable(verifications: VerificationRecord[]): React.ReactElement {
    const columns = legacyColumns<VerificationRecord>([
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "110px",
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
        render: (text: unknown) => {
          const owner = textValue(text);
          if (owner === "admin") {
            return `(${t("general:empty")})`;
          }

          return (
            <Link to={`/organizations/${owner}`}>
              {owner}
            </Link>
          );
        },
      },
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "170px",
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
      },
      {
        title: t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "145px",
        sorter: true,
        render: (text: unknown) => {
          return Setting.getFormattedDate(textValue(text));
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
        title: t("general:User"),
        dataIndex: "user",
        key: "user",
        width: "120px",
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
        render: (text: unknown) => {
          const user = textValue(text);
          return (
            <Link to={`/users/${user}`}>
              {user}
            </Link>
          );
        },
      },
      {
        title: t("general:Provider"),
        dataIndex: "provider",
        key: "provider",
        width: "120px",
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
        render: (text: unknown, record: VerificationRecord) => {
          const provider = textValue(text);
          return (
            <Link to={`/providers/${record.owner}/${provider}`}>
              {provider}
            </Link>
          );
        },
      },
      {
        title: t("general:Client IP"),
        dataIndex: "remoteAddr",
        key: "remoteAddr",
        width: "110px",
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
        render: (text: unknown) => {
          let clientIp = textValue(text);
          if (clientIp.endsWith(": ")) {
            clientIp = clientIp.slice(0, -2);
          }

          return (
            <a target="_blank" rel="noreferrer" href={`https://db-ip.com/${clientIp}`}>
              {clientIp}
            </a>
          );
        },
      },
      {
        title: t("verification:Receiver"),
        dataIndex: "receiver",
        key: "receiver",
        width: "145px",
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
      },
      {
        title: t("verification:Is used"),
        dataIndex: "isUsed",
        key: "isUsed",
        width: "90px",
        sorter: true,
        render: (text: unknown) => {
          return (
            <Switch disabled checkedChildren={t("general:ON")} unCheckedChildren={t("general:OFF")} checked={Boolean(text)} />
          );
        },
      },
    ]);

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="audit-operations-list-route-body">
        <div className="enterprise-list-page-table-shell audit-operations-list-page-table-shell verification-list-page-table-shell">
          <ListPageTable className="audit-operations-list-table verification-list-table" scroll={getAuditOperationsTableScroll(this.state.advancedFiltersOpen)} columns={columns} dataSource={verifications} rowKey={(record) => `${record.owner}/${record.name}`} pagination={paginationProps}
            title={() => (
              <LegacyListPageToolbar
                host={this}
                title={t("general:Verification Review")}
                total={this.state.pagination.total}
                fields={getVerificationQueryFields()}
                defaultField="name"
                onAdvancedOpenChange={(advancedFiltersOpen) => this.setState({advancedFiltersOpen})}
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
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    verificationBackend.getVerifications("", Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: VerificationListResponse) => {
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

export default VerificationListPage;
