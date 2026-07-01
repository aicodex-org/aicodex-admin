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

import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import i18next from "i18next";
import {Link} from "react-router-dom";
import {Button, Drawer, Popconfirm, Space, Tag} from "antd";
import React from "react";
import * as SessionBackend from "./backend/SessionBackend";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowDeleteAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";
import {getAuditOperationsTableScroll} from "./auditOperationsListTable";
import type {AdminRouteProps, LegacyAny, LegacyBackendResponse, LegacyFetchParams, LegacyListState} from "./types/legacyPage";
import {legacyColumns, textValue} from "./types/legacyPage";

const visibleSessionIdCount = 2;

type SessionRecord = {
  owner: string;
  name: string;
  application?: string;
  createdTime?: string;
  sessionId?: string[];
  [key: string]: LegacyAny;
};

type SessionScope = "list" | "drawer";

interface SessionListPageState extends LegacyListState<SessionRecord> {
  advancedFiltersOpen?: boolean;
  confirmTagKey?: string | null;
  sessionDrawerOpen?: boolean;
  sessionDrawerRecord?: SessionRecord | null;
  sessionDrawerRecordKey?: string;
  sessionDrawerRowIndex?: number | null;
}

type SessionListResponse = LegacyBackendResponse<SessionRecord[]> & {
  data: SessionRecord[];
  data2: number;
};

type SessionBackendApi = {
  getSessions: (
    owner: string,
    page?: number,
    pageSize?: number,
    field?: string,
    value?: LegacyAny,
    sortField?: string,
    sortOrder?: string
  ) => Promise<SessionListResponse>;
  deleteSession: (session: SessionRecord, sessionId?: string) => Promise<LegacyBackendResponse>;
};

const sessionBackend = SessionBackend as unknown as SessionBackendApi;
const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, SessionListPageState> & LegacyAny;
const t = (key: string): string => i18next.t(key) as string;

function getSessionQueryFields() {
  return [
    {label: t("general:User"), value: "name"},
    {label: t("general:Organization"), value: "owner"},
    {label: t("general:Application"), value: "application"},
    {label: t("general:Session ID"), value: "sessionId"},
  ];
}

class SessionListPage extends LegacyBaseListPage {
  UNSAFE_componentWillMount() {
    // BaseListPage 会在 UNSAFE_componentWillMount 中发起异步请求；本页改到挂载后请求，避免快速切页时出现未挂载 setState 警告。
  }

  componentDidMount() {
    super.componentDidMount();
    const {pagination} = this.state;
    this.fetch({pagination});
    this.getForm();
  }

  getSessionRecordKey = (record: SessionRecord): string => `${record.owner}/${record.name}/${record.application || ""}`;

  handleTagClose = (rowIndex: number, sessionId: string, scope: SessionScope, e: React.MouseEvent<HTMLElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    this.setState({
      confirmTagKey: `${scope}-${rowIndex}-${sessionId}`,
    });
  };

  deleteSession(i: number, sessionId = ""): void {
    // Pass the optional sessionId to the backend. If sessionId is empty, the backend will delete the whole session record.
    sessionBackend.deleteSession(this.state.data[i], sessionId)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully deleted"));
          this.setState({
            confirmTagKey: null,
            sessionDrawerOpen: false,
            sessionDrawerRecord: null,
            sessionDrawerRecordKey: "",
            sessionDrawerRowIndex: null,
          });
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

  openSessionDrawer = (record: SessionRecord, rowIndex: number): void => {
    this.setState({
      sessionDrawerOpen: true,
      sessionDrawerRecord: record,
      sessionDrawerRecordKey: this.getSessionRecordKey(record),
      sessionDrawerRowIndex: rowIndex,
    });
  };

  closeSessionDrawer = (): void => {
    this.setState({
      sessionDrawerOpen: false,
      sessionDrawerRecord: null,
      sessionDrawerRecordKey: "",
      sessionDrawerRowIndex: null,
      confirmTagKey: null,
    });
  };

  getActiveSessionDrawerRecord = (): SessionRecord | null | undefined => {
    const recordKey = this.state.sessionDrawerRecordKey;
    if (recordKey) {
      return this.state.data.find((record: SessionRecord) => this.getSessionRecordKey(record) === recordKey) || this.state.sessionDrawerRecord;
    }
    return this.state.sessionDrawerRecord;
  };

  renderSessionIdTag = (sessionId: string, rowIndex: number, scope: SessionScope): React.ReactElement => {
    const tagKey = `${scope}-${rowIndex}-${sessionId}`;
    const isActive = this.state.confirmTagKey === tagKey;
    return (
      <Popconfirm
        key={tagKey}
        title={t("general:Kick this session")}
        description={`${t("general:Session ID")}: ${sessionId}`}
        open={isActive}
        placement={scope === "drawer" ? "left" : "top"}
        classNames={{root: "session-id-delete-popconfirm"}}
        onConfirm={() => {this.deleteSession(rowIndex, sessionId); this.setState({confirmTagKey: null});}}
        onCancel={() => this.setState({confirmTagKey: null})}
        onOpenChange={(visible) => {if (!visible && isActive) {this.setState({confirmTagKey: null});}}}
        okText={t("general:OK")}
        cancelText={t("general:Cancel")}
      >
        <Tag className="session-id-tag" closable onClose={(e) => this.handleTagClose(rowIndex, sessionId, scope, e)}>
          <span className="session-id-tag-text">{sessionId}</span>
        </Tag>
      </Popconfirm>
    );
  };

  renderSessionIds = (sessionIds: unknown, record: SessionRecord, rowIndex: number): React.ReactNode => {
    const ids = Array.isArray(sessionIds) ? sessionIds : [];
    if (ids.length === 0) {
      return "-";
    }
    const visibleIds = ids.slice(0, visibleSessionIdCount);
    const hiddenCount = ids.length - visibleIds.length;
    return (
      <Space className="session-id-list" size={[4, 4]} wrap>
        {visibleIds.map(sessionId => this.renderSessionIdTag(sessionId, rowIndex, "list"))}
        {hiddenCount > 0 ? (
          <Button
            className="session-id-more-button"
            size="small"
            type="link"
            onClick={() => this.openSessionDrawer(record, rowIndex)}
          >
            {`+${hiddenCount} ${t("general:More")}`}
          </Button>
        ) : null}
      </Space>
    );
  };

  renderSessionDrawer = (): React.ReactElement => {
    const record = this.getActiveSessionDrawerRecord();
    const sessionIds = Array.isArray(record?.sessionId) ? record.sessionId : [];
    const rowIndex = this.state.sessionDrawerRowIndex;
    return (
      <Drawer
        className="session-id-drawer"
        title={t("general:All session IDs")}
        width={Setting.isMobile() ? "100%" : 560}
        placement="right"
        destroyOnClose
        onClose={this.closeSessionDrawer}
        open={this.state.sessionDrawerOpen}
      >
        {record ? (
          <div className="session-id-drawer-content">
            <div className="session-id-drawer-summary">
              <div><span>{t("general:User")}</span><strong>{record.name}</strong></div>
              <div><span>{t("general:Organization")}</span><strong>{record.owner}</strong></div>
              <div><span>{t("general:Application")}</span><strong>{record.application || "-"}</strong></div>
              <div><span>{t("general:Session ID count")}</span><strong>{sessionIds.length}</strong></div>
            </div>
            <Space className="session-id-drawer-list" size={[4, 6]} wrap>
              {sessionIds.map(sessionId => this.renderSessionIdTag(sessionId, rowIndex, "drawer"))}
            </Space>
          </div>
        ) : null}
      </Drawer>
    );
  };

  renderTable(sessions: SessionRecord[]): React.ReactElement {
    const columns = legacyColumns<SessionRecord>([
      {
        title: t("general:User"),
        dataIndex: "name",
        key: "name",
        width: "150px",
        sorter: true,
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "110px",
        sorter: true,
        render: (text: unknown) => {
          const owner = textValue(text);
          return (
            <Link to={`/organizations/${owner}`}>
              {owner}
            </Link>
          );
        },
      },
      {
        title: t("general:Application"),
        dataIndex: "application",
        key: "application",
        width: "160px",
        sorter: true,
      },
      {
        title: t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "180px",
        sorter: true,
        render: (text: unknown) => {
          return Setting.getFormattedDate(textValue(text));
        },
      },
      {
        title: t("general:Session ID"),
        dataIndex: "sessionId",
        key: "sessionId",
        width: "260px",
        sorter: true,
        render: (text: unknown, record: SessionRecord, index: number) => {
          return this.renderSessionIds(text, record, index);
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "116px",
        render: (_text: unknown, record: SessionRecord, index: number) => {
          return (
            <ListPageRowActions className="session-row-actions">
              <ListPageRowDeleteAction
                title={t("general:Delete all sessions for this application")}
                description={`${record.name} / ${record.application || "-"} ?`}
                onConfirm={() => this.deleteSession(index)}
                popconfirmProps={{
                  placement: "left",
                  classNames: {root: "session-bulk-delete-popconfirm"},
                }}
              >
                {t("general:Delete all")}
              </ListPageRowDeleteAction>
            </ListPageRowActions>
          );
        },
      },
    ]);

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="audit-operations-list-route-body">
        <div className="enterprise-list-page-table-shell audit-operations-list-page-table-shell session-list-page-table-shell">
          <ListPageTable className="audit-operations-list-table session-list-table" scroll={getAuditOperationsTableScroll(this.state.advancedFiltersOpen)} columns={columns} dataSource={sessions} rowKey={(record) => `${record.owner}/${record.name}/${record.application || ""}`} pagination={paginationProps}
            title={() => (
              <LegacyListPageToolbar
                host={this}
                title={t("general:Login Sessions")}
                total={this.state.pagination.total}
                fields={getSessionQueryFields()}
                defaultField="name"
                onAdvancedOpenChange={(advancedFiltersOpen) => this.setState({advancedFiltersOpen})}
              />
            )}
            loading={this.state.loading}
            onChange={this.handleTableChange}
          />
        </div>
        {this.renderSessionDrawer()}
      </div>
    );
  }

  fetch = (params = {} as LegacyFetchParams): void => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.contentType !== undefined && params.contentType !== null) {
      field = "contentType";
      value = params.contentType;
    }
    this.setState({loading: true});
    sessionBackend.getSessions(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: SessionListResponse) => {
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

export default SessionListPage;
