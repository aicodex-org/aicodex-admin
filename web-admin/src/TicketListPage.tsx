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

import React from "react";
import {Link} from "react-router-dom";
import {Button, Table} from "antd";
import {CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SyncOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as TicketBackend from "./backend/TicketBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import PopconfirmModal from "./common/modal/PopconfirmModal";
import {legacyColumns} from "./types/legacyPage";

type AdminRouteProps = import("./types/legacyPage").AdminRouteProps;
type LegacyAny = import("./types/legacyPage").LegacyAny;
type LegacyColumn<TRecord = LegacyAny> = import("./types/legacyPage").LegacyColumn<TRecord>;
type LegacyFetchParams = import("./types/legacyPage").LegacyFetchParams;
type LegacyListState<TRecord = LegacyAny> = import("./types/legacyPage").LegacyListState<TRecord>;

interface TicketRecord {
  owner: string;
  name: string;
  createdTime: string;
  updatedTime: string;
  displayName: string;
  user: string;
  title: string;
  content: string;
  state: string;
  messages: LegacyAny[];
  [key: string]: LegacyAny;
}

function t(key: string, options?: LegacyAny): string {
  return String(i18next.t(key, options));
}

const TicketBackendLegacy = TicketBackend as LegacyAny;
const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, LegacyListState<TicketRecord>> & LegacyAny;

class TicketListPage extends LegacyBaseListPage {
  newTicket(): TicketRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `ticket_${randomName}`,
      createdTime: moment().format(),
      updatedTime: moment().format(),
      displayName: `New Ticket - ${randomName}`,
      user: this.props.account.name,
      title: "",
      content: "",
      state: "Open",
      messages: [],
    };
  }

  addTicket() {
    const newTicket = this.newTicket();
    TicketBackend.addTicket(newTicket)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/tickets/${newTicket.owner}/${newTicket.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteTicket(i: number) {
    TicketBackend.deleteTicket(this.state.data[i])
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

  renderTable(tickets: TicketRecord[]) {
    const columns: LegacyColumn<TicketRecord>[] = legacyColumns<TicketRecord>([
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "140px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text: string, record: TicketRecord, index: number) => {
          return (
            <Link to={`/tickets/${record.owner}/${text}`}>
              {text}
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
        render: (text: string, record: TicketRecord, index: number) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:Updated time"),
        dataIndex: "updatedTime",
        key: "updatedTime",
        width: "180px",
        sorter: true,
        render: (text: string, record: TicketRecord, index: number) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "250px",
        sorter: true,
        ...this.getColumnSearchProps("displayName"),
      },
      {
        title: t("general:Title"),
        dataIndex: "title",
        key: "title",
        // width: "200px",
        sorter: true,
        ...this.getColumnSearchProps("title"),
      },
      {
        title: t("general:User"),
        dataIndex: "user",
        key: "user",
        width: "140px",
        sorter: true,
        ...this.getColumnSearchProps("user"),
        render: (text: string, record: TicketRecord, index: number) => {
          return (
            <Link to={`/users/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "140px",
        sorter: true,
        ...this.getColumnSearchProps("state"),
        render: (text: string, record: TicketRecord, index: number) => {
          switch (text) {
          case "Open":
            return Setting.getTag("processing", t("ticket:Open"), <ClockCircleOutlined />);
          case "In Progress":
            return Setting.getTag("warning", t("ticket:In Progress"), <SyncOutlined spin />);
          case "Resolved":
            return Setting.getTag("success", t("ticket:Resolved"), <CheckCircleOutlined />);
          case "Closed":
            return Setting.getTag("default", t("ticket:Closed"), <CloseCircleOutlined />);
          default:
            return null;
          }
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "180px",
        fixed: (Setting.isMobile()) ? "false" : "right",
        render: (text: LegacyAny, record: TicketRecord, index: number) => {
          return (
            <div>
              <Button type="primary" style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} onClick={() => this.props.history.push(`/tickets/${record.owner}/${record.name}`)}>{t("general:Edit")}</Button>
              {Setting.isAdminUser(this.props.account) ? (
                <PopconfirmModal
                  title={t("general:Sure to delete") + `: ${record.name} ?`}
                  onConfirm={() => this.deleteTicket(index)}
                >
                </PopconfirmModal>
              ) : null}
            </div>
          );
        },
      },
    ]);

    const paginationProps = this.getTablePaginationProps();

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={tickets} rowKey={(record) => `${record.owner}/${record.name}`} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {t("general:Tickets")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={this.addTicket.bind(this)}>{t("general:Add")}</Button>
            </div>
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params: LegacyFetchParams = {} as LegacyFetchParams) => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    TicketBackendLegacy.getTickets(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: LegacyAny) => {
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

export default TicketListPage;
