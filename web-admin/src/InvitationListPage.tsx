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
import {Button} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import {MinusCircleOutlined, SyncOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as InvitationBackend from "./backend/InvitationBackend";
import type {InvitationRecord} from "./backend/InvitationBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowDeleteAction, ListPageRowEditAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";

interface InvitationListPageProps {
  account?: Record<string, unknown>;
  history: {
    push: (location: string | {pathname: string; mode?: string}) => void;
  };
  match?: {
    path?: string;
    params?: Record<string, string | undefined>;
  };
}

interface InvitationListPageState {
  data: InvitationRecord[];
  pagination: TablePaginationConfig;
  loading: boolean;
  searchText?: string | number;
  searchedColumn?: string;
  isAuthorized?: boolean;
}

type InvitationListColumns = TableProps<InvitationRecord>["columns"];

type InvitationListFetchParams = {
  pagination?: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: string | number;
  sortField?: string;
  sortOrder?: string | null;
  type?: string | null;
};

// BaseListPage 仍是 legacy JS；本 change 只声明邀请码列表页实际使用的继承边界。
type LegacyBaseListPageCompat = React.Component<InvitationListPageProps, InvitationListPageState> & {
  getColumnSearchProps: (dataIndex: string, customRender?: unknown) => Record<string, unknown>;
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<InvitationRecord>["onChange"]>;
};

const TypedBaseListPage = BaseListPage as unknown as {
  new(props: InvitationListPageProps): LegacyBaseListPageCompat;
};

const queryFields = [
  {label: t("general:Name"), value: "name"},
  {label: t("general:Organization"), value: "owner"},
  {label: t("general:Display name"), value: "displayName"},
  {label: t("invitation:Code"), value: "code"},
  {label: t("general:Application"), value: "application"},
  {label: t("general:Email"), value: "email"},
  {label: t("general:Phone"), value: "phone"},
  {label: t("general:State"), value: "state"},
];

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

class InvitationListPage extends TypedBaseListPage {
  newInvitation(): InvitationRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    const code = Math.random().toString(36).slice(-10);
    return {
      owner: owner,
      name: `invitation_${randomName}`,
      createdTime: moment().format(),
      updatedTime: moment().format(),
      displayName: `New Invitation - ${randomName}`,
      code: code,
      defaultCode: code,
      quota: 1,
      usedCount: 0,
      application: "All",
      username: "",
      email: "",
      phone: "",
      signupGroup: "",
      state: "Active",
    };
  }

  addInvitation(): void {
    const newInvitation = this.newInvitation();
    InvitationBackend.addInvitation(newInvitation)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/invitations/${newInvitation.owner}/${newInvitation.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteInvitation(i: number): void {
    InvitationBackend.deleteInvitation(this.state.data[i])
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

  renderTable(invitations: InvitationRecord[]): React.ReactNode {
    const columns: InvitationListColumns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "110px",
        fixed: "left",
        sorter: true,
        render: (text: string, record: InvitationRecord) => {
          return (
            <Link to={`/invitations/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "90px",
        sorter: true,
        render: (text: string) => {
          return (
            <Link to={`/organizations/${text}`}>
              {text}
            </Link>
          );
        },
      },
      // {
      //   title: t("general:Created time"),
      //   dataIndex: "createdTime",
      //   key: "createdTime",
      //   width: "160px",
      //   sorter: true,
      //   render: (text, record, index) => {
      //     return Setting.getFormattedDate(text);
      //   },
      // },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "110px",
        sorter: true,
      },
      {
        title: t("invitation:Code"),
        dataIndex: "code",
        key: "code",
        width: "110px",
        sorter: true,
      },
      {
        title: t("invitation:Quota"),
        dataIndex: "quota",
        key: "quota",
        width: "70px",
        sorter: true,
      },
      {
        title: t("invitation:Used count"),
        dataIndex: "usedCount",
        key: "usedCount",
        width: "80px",
        sorter: true,
      },
      {
        title: t("general:Application"),
        dataIndex: "application",
        key: "application",
        width: "120px",
        sorter: true,
        render: (text: string, record: InvitationRecord) => {
          return (
            <Link to={`/applications/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "80px",
        sorter: true,
        render: (text: string) => {
          switch (text) {
          case "Active":
            return Setting.getTag("success", t("subscription:Active"), <SyncOutlined spin />);
          case "Suspended":
            return Setting.getTag("default", t("subscription:Suspended"), <MinusCircleOutlined />);
          default:
            return null;
          }
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "120px",
        fixed: Setting.isMobile() ? false : "right",
        render: (_text: unknown, record: InvitationRecord, index: number) => {
          return (
            <ListPageRowActions className="invitation-row-actions">
              <ListPageRowEditAction onClick={() => this.props.history.push(`/invitations/${record.owner}/${record.name}`)} />
              <ListPageRowDeleteAction
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteInvitation(index)}
              />
            </ListPageRowActions>
          );
        },
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="enterprise-list-page-table-shell invitation-list-page-table-shell">
        <ListPageTable<InvitationRecord>
          columns={columns}
          dataSource={invitations}
          rowKey={(record) => `${record.owner}/${record.name}`}
          pagination={paginationProps}
          title={() => (
            <LegacyListPageToolbar
              host={this}
              title={t("general:Invitations")}
              total={this.state.pagination.total}
              fields={queryFields}
              defaultField="name"
              actions={<Button type="primary" onClick={this.addInvitation.bind(this)}>{t("general:Add")}</Button>}
            />
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params: InvitationListFetchParams = {}): void => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    const pagination = params.pagination || this.state.pagination;
    InvitationBackend.getInvitations(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), pagination.current, pagination.pageSize, field, value, sortField, sortOrder)
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

export default InvitationListPage;
