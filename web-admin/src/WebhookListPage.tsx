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
import {Button, Popconfirm, Switch, Tag, Tooltip} from "antd";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as WebhookBackend from "./backend/WebhookBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import {legacyColumns} from "./types/legacyPage";
import ListPageTable from "./common/ListPageTable";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";
import ListPageRowActions from "./common/ListPageRowActions";
import {
  createEmptyApplicationAccessQueryKeywords,
  getActiveApplicationAccessQueryCondition,
  renderApplicationAccessAdvancedFilters,
  renderApplicationAccessKeywordControl
} from "./common/ApplicationAccessListControls";

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

function getWebhookQueryFields() {
  return [
    {label: t("general:Name"), value: "name"},
    {label: t("general:Organization"), value: "organization"},
    {label: t("general:URL"), value: "url"},
    {label: t("general:Method"), value: "method", options: [{label: "POST", value: "POST"}, {label: "GET", value: "GET"}, {label: "PUT", value: "PUT"}]},
    {
      label: t("webhook:Content type"),
      value: "contentType",
      options: [
        {label: "application/json", value: "application/json"},
        {label: "application/x-www-form-urlencoded", value: "application/x-www-form-urlencoded"},
      ],
    },
    {label: t("webhook:Events"), value: "events"},
  ];
}

function getWebhookTableScroll(advancedFiltersOpen: boolean): {x?: number; y?: string} | undefined {
  if (Setting.isMobile()) {
    return {x: 920};
  }
  return {y: advancedFiltersOpen ? "calc(100vh - 414px)" : "calc(100vh - 360px)"};
}

function renderWebhookEventTags(events?: string[]): React.ReactElement[] {
  // 业务值保证重排 identity，同值出现序号只用于区分真实重复项。
  const occurrences = new Map<string, number>();
  return (events || []).map(event => {
    const occurrence = occurrences.get(event) || 0;
    occurrences.set(event, occurrence + 1);
    return (
      <Tag key={JSON.stringify(["webhook-events", event, occurrence])} color={Setting.getTagColor(event)}>
        {event}
      </Tag>
    );
  });
}

const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, LegacyAny> & LegacyAny;

class WebhookListPage extends LegacyBaseListPage {
  constructor(props: AdminRouteProps) {
    super(props);
    this.state = {
      ...this.state,
      pagination: {
        ...this.state.pagination,
        pageSize: 20,
      },
      queryField: "name",
      queryKeyword: "",
      advancedQueryKeywords: createEmptyApplicationAccessQueryKeywords(getWebhookQueryFields()),
      advancedFiltersOpen: false,
    };
  }

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

  handleToolbarSearch = (): void => {
    const pagination = {...this.state.pagination, current: 1};
    const condition = getActiveApplicationAccessQueryCondition(
      getWebhookQueryFields(),
      this.state.queryField,
      this.state.queryKeyword,
      this.state.advancedQueryKeywords
    );
    if (condition) {
      this.fetch({
        pagination,
        searchedColumn: condition.field,
        searchText: condition.value,
      });
      return;
    }

    this.fetch({pagination});
  };

  handleToolbarReset = (): void => {
    const pagination = {...this.state.pagination, current: 1};
    this.setState({
      queryField: "name",
      queryKeyword: "",
      advancedQueryKeywords: createEmptyApplicationAccessQueryKeywords(getWebhookQueryFields()),
      searchText: undefined,
      searchedColumn: undefined,
    }, () => this.fetch({pagination}));
  };

  handleAdvancedFilterChange = (field: string, value: string): void => {
    this.setState((prevState: LegacyAny) => ({
      advancedQueryKeywords: {
        ...prevState.advancedQueryKeywords,
        [field]: value,
      },
    }));
  };

  renderAdvancedFilters(): React.ReactNode {
    return renderApplicationAccessAdvancedFilters(
      getWebhookQueryFields(),
      this.state.advancedQueryKeywords || {},
      this.handleAdvancedFilterChange
    );
  }

  renderListToolbar(): React.ReactNode {
    return (
      <EnterpriseListQueryToolbar
        title={t("general:Webhooks")}
        total={this.state.pagination.total}
        showTotal={false}
        fields={getWebhookQueryFields()}
        selectedField={this.state.queryField}
        keyword={this.state.queryKeyword}
        onFieldChange={(value) => this.setState({queryField: value, queryKeyword: ""})}
        onKeywordChange={(value) => this.setState({queryKeyword: value})}
        onSearch={this.handleToolbarSearch}
        onReset={this.handleToolbarReset}
        onAdvancedOpenChange={(advancedFiltersOpen) => this.setState({advancedFiltersOpen})}
        keywordControl={renderApplicationAccessKeywordControl(getWebhookQueryFields(), this.state.queryField, this.state.queryKeyword, (value) => this.setState({queryKeyword: value}), this.handleToolbarSearch)}
        advancedFilters={this.renderAdvancedFilters()}
        actionsPlacement="topRight"
        actions={<Button type="primary" size="small" onClick={this.addWebhook.bind(this)}>{t("general:Add")}</Button>}
      />
    );
  }

  renderTable(webhooks: WebhookRecord[]) {
    const columns: LegacyColumn<WebhookRecord>[] = legacyColumns<WebhookRecord>([
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "15%",
        sorter: true,
        ellipsis: true,
        render: (text, record, index) => {
          return (
            <Link className="enterprise-list-inline-link" to={`/webhooks/${text}`} title={text}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "organization",
        key: "organization",
        width: "12%",
        sorter: true,
        ellipsis: true,
        render: (text, record, index) => {
          return (
            <Link className="enterprise-list-inline-link" to={`/organizations/${text}`} title={text}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:URL"),
        dataIndex: "url",
        key: "url",
        width: "18%",
        sorter: true,
        ellipsis: true,
        render: (text, record, index) => {
          return (
            <Tooltip title={text}>
              <a className="enterprise-list-inline-link" target="_blank" rel="noreferrer" href={text}>
                {Setting.getShortText(text)}
              </a>
            </Tooltip>
          );
        },
      },
      {
        title: t("general:Method"),
        dataIndex: "method",
        key: "method",
        width: "8%",
        sorter: true,
        ellipsis: true,
      },
      {
        title: t("webhook:Content type"),
        dataIndex: "contentType",
        key: "contentType",
        width: "12%",
        sorter: true,
        ellipsis: true,
      },
      {
        title: t("webhook:Events"),
        dataIndex: "events",
        key: "events",
        width: "16%",
        sorter: true,
        render: (text, record, index) => {
          return renderWebhookEventTags(text);
        },
      },
      {
        title: t("general:Is enabled"),
        dataIndex: "isEnabled",
        key: "isEnabled",
        width: "9%",
        sorter: true,
        render: (text, record, index) => {
          return (
            <Switch disabled checkedChildren={t("general:ON")} unCheckedChildren={t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "12%",
        sorter: true,
        render: (text, record, index) => {
          return <span className="enterprise-list-secondary-text">{Setting.getFormattedDate(text)}</span>;
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "10%",
        render: (text, record, index) => {
          const deleteButton = (
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
              {t("general:Delete")}
            </Button>
          );
          return (
            <ListPageRowActions className="webhook-row-actions">
              <Button size="small" type="link" icon={<EditOutlined />} onClick={() => this.props.history.push(`/webhooks/${record.name}`)}>{t("general:Edit")}</Button>
              <Popconfirm
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteWebhook(index)}
                okText={t("general:OK")}
                cancelText={t("general:Cancel")}
                okButtonProps={{danger: true}}
              >
                {deleteButton}
              </Popconfirm>
            </ListPageRowActions>
          );
        },
      },
    ]);

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="enterprise-list-page-table-shell webhook-list-page-table-shell">
        <ListPageTable<WebhookRecord> scroll={getWebhookTableScroll(this.state.advancedFiltersOpen)} className="webhook-list-table" columns={columns} dataSource={webhooks} rowKey={(record: WebhookRecord) => `${record.owner}/${record.name}`} pagination={paginationProps}
          title={() => this.renderListToolbar()}
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
