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
import {Button, Input, Popconfirm, Tooltip} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as Provider from "./auth/Provider";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import ListPageTable from "./common/ListPageTable";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";
import ListPageIdentityCell from "./common/ListPageIdentityCell";
import ListPageRowActions from "./common/ListPageRowActions";
import {legacyColumns} from "./types/legacyPage";

type AdminRouteProps = import("./types/legacyPage").AdminRouteProps;
type LegacyAny = import("./types/legacyPage").LegacyAny;
type LegacyBackendResponse<TData = LegacyAny> = import("./types/legacyPage").LegacyBackendResponse<TData>;
type LegacyColumn<TRecord = LegacyAny> = import("./types/legacyPage").LegacyColumn<TRecord>;
type LegacyFetchParams = import("./types/legacyPage").LegacyFetchParams;
type LegacyListState<TRecord = LegacyAny> = import("./types/legacyPage").LegacyListState<TRecord>;

interface ProviderRecord {
  owner: string;
  name: string;
  createdTime?: string;
  displayName?: string;
  category?: string;
  type?: string;
  method?: string;
  clientId?: string;
  clientSecret?: string;
  providerUrl?: string;
  enableSignUp?: boolean;
  host?: string;
  port?: number;
  [key: string]: LegacyAny;
}

interface ProviderListState extends LegacyListState<ProviderRecord> {
  owner: string;
  queryField: string;
  queryKeyword: string;
  advancedQueryKeywords: Record<string, string>;
  advancedFiltersOpen: boolean;
}

type ProviderListFetchParams = Partial<LegacyFetchParams> & {
  pagination?: TablePaginationConfig;
};

type ProviderFilterCondition = {
  field: string;
  value: string;
};

type LegacyBaseListPageCompat = React.Component<AdminRouteProps, ProviderListState> & {
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<ProviderRecord>["onChange"]>;
};

const TypedBaseListPage = BaseListPage as unknown as {
  new(props: AdminRouteProps): LegacyBaseListPageCompat;
};

function t(key: string, defaultValue = key, options: Record<string, unknown> = {}): string {
  const translated = i18next.t(key, {defaultValue, ...options}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

function getProviderQueryFields(): {label: string; value: string}[] {
  return [
    {label: t("general:Name"), value: "name"},
    {label: t("general:Display name"), value: "displayName"},
    {label: t("general:Organization"), value: "owner"},
    {label: t("general:Category"), value: "category"},
    {label: t("general:Type"), value: "type"},
    {label: t("provider:Client ID"), value: "clientId"},
    {label: t("provider:Provider URL"), value: "providerUrl"},
  ];
}

function getProviderAdvancedQueryFields(): {label: string; value: string}[] {
  const queryFields = getProviderQueryFields();
  // Provider 后端仍是单字段查询契约，顺序决定多个扩展字段同时填写时的优先匹配字段。
  return ["category", "type", "owner", "clientId", "providerUrl"]
    .map(value => queryFields.find(field => field.value === value))
    .filter((field): field is {label: string; value: string} => field !== undefined);
}

function createEmptyAdvancedQueryKeywords(): Record<string, string> {
  return getProviderAdvancedQueryFields().reduce((keywords, field) => ({
    ...keywords,
    [field.value]: "",
  }), {} as Record<string, string>);
}

function renderProviderIdentity(record: ProviderRecord): React.ReactNode {
  const displayName = record.displayName || record.name || "";
  const technicalName = record.name || "";

  return (
    <ListPageIdentityCell
      classPrefix="provider-table"
      title={displayName}
      titleTo={`/providers/${record.owner}/${technicalName}`}
      secondary={technicalName}
      copyValue=""
      copyLabel={`${t("general:Copy")} ${t("general:Name")}`}
      iconSrc={Setting.getProviderLogoURL(record)}
      iconAlt={displayName || technicalName}
      onCopiedMessage={t("general:Copied to clipboard successfully")}
    />
  );
}

function isNarrowProviderViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

function getProviderTableScroll(advancedFiltersOpen: boolean): TableProps<ProviderRecord>["scroll"] | undefined {
  if (Setting.isMobile() || isNarrowProviderViewport()) {
    // 窄屏保留关键字段和操作列，但只让表格内部横向滚动，避免页面级横向溢出。
    return {x: 1040};
  }
  return {y: advancedFiltersOpen ? "calc(100vh - 414px)" : "calc(100vh - 360px)"};
}

class ProviderListPage extends TypedBaseListPage {
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
      advancedQueryKeywords: createEmptyAdvancedQueryKeywords(),
      advancedFiltersOpen: false,
    };
  }

  componentDidMount(): void {
    super.componentDidMount?.();
    this.setState({
      owner: Setting.isAdminUser(this.props.account) ? "admin" : this.props.account.owner || "",
    });
  }

  newProvider(): ProviderRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.isDefaultOrganizationSelected(this.props.account) ? this.state.owner : Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner || "",
      name: `provider_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Provider - ${randomName}`,
      category: "OAuth",
      type: "GitHub",
      method: "Normal",
      clientId: "",
      clientSecret: "",
      enableSignUp: true,
      host: "",
      port: 0,
      providerUrl: "https://github.com/organizations/xxx/settings/applications/1234567",
    };
  }

  addProvider(): void {
    const newProvider = this.newProvider();
    ProviderBackend.addProvider(newProvider)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/providers/${newProvider.owner}/${newProvider.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteProvider(i: number): void {
    ProviderBackend.deleteProvider(this.state.data[i])
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
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  getAdvancedQueryConditions(): ProviderFilterCondition[] {
    return Object.entries(this.state.advancedQueryKeywords || {})
      .map(([field, value]) => ({field, value: String(value || "").trim()}))
      .filter(condition => condition.value !== "");
  }

  getPrimaryAdvancedQueryCondition(): ProviderFilterCondition | undefined {
    return this.getAdvancedQueryConditions()[0];
  }

  getToolbarQueryCondition(): ProviderFilterCondition | undefined {
    const keyword = String(this.state.queryKeyword || "").trim();
    if (keyword !== "") {
      return {
        field: this.state.queryField,
        value: keyword,
      };
    }

    return this.getPrimaryAdvancedQueryCondition();
  }

  handleAdvancedFilterChange = (field: string, value: string): void => {
    this.setState((prevState: ProviderListState) => ({
      advancedQueryKeywords: {
        ...prevState.advancedQueryKeywords,
        [field]: value,
      },
    }));
  };

  handleToolbarSearch = (): void => {
    const pagination = {...this.state.pagination, current: 1};
    const queryCondition = this.getToolbarQueryCondition();
    if (queryCondition !== undefined) {
      this.fetch({
        pagination,
        searchedColumn: queryCondition.field,
        searchText: queryCondition.value,
      });
      return;
    }

    this.fetch({pagination});
  };

  handleToolbarReset = () => {
    const pagination = {...this.state.pagination, current: 1};
    this.setState({
      queryField: "name",
      queryKeyword: "",
      advancedQueryKeywords: createEmptyAdvancedQueryKeywords(),
      searchText: undefined,
      searchedColumn: undefined,
    }, () => this.fetch({pagination}));
  };

  handleProviderTableChange = (pagination: TablePaginationConfig, filters: LegacyAny, sorter: LegacyAny): void => {
    const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const params: ProviderListFetchParams = {
      pagination,
      sortField: typeof normalizedSorter?.field === "string" ? normalizedSorter.field : undefined,
      sortOrder: normalizedSorter?.order ?? undefined,
      searchText: this.state.searchText,
      searchedColumn: this.state.searchedColumn,
    };

    if (filters?.category?.[0]) {
      params.category = filters.category[0];
    }
    if (filters?.type?.[0]) {
      params.type = filters.type[0];
    }

    this.fetch(params);
  };

  renderAdvancedFilters(): React.ReactNode {
    const advancedQueryKeywords = this.state.advancedQueryKeywords || createEmptyAdvancedQueryKeywords();
    return (
      <div className="organization-advanced-filters provider-advanced-filters">
        {
          getProviderAdvancedQueryFields().map(field => (
            <label className="organization-advanced-filter-item provider-advanced-filter-item" key={field.value}>
              <span className="organization-advanced-filter-label">{field.label}:</span>
              <Input
                className="organization-advanced-filter-input provider-advanced-filter-input"
                value={advancedQueryKeywords[field.value] ?? ""}
                aria-label={`${t("general:More filters")} ${field.label}`}
                placeholder={t("general:Please input your search")}
                allowClear
                onChange={event => this.handleAdvancedFilterChange(field.value, event.target.value)}
              />
            </label>
          ))
        }
      </div>
    );
  }

  renderListToolbar(): React.ReactNode {
    return (
      <div className="enterprise-list-toolbar-shell">
        <EnterpriseListQueryToolbar
          title={t("application:Providers")}
          total={this.state.pagination.total}
          showTotal={false}
          fields={getProviderQueryFields()}
          selectedField={this.state.queryField}
          keyword={this.state.queryKeyword}
          onFieldChange={(value) => this.setState({queryField: value})}
          onKeywordChange={(value) => this.setState({queryKeyword: value})}
          onSearch={this.handleToolbarSearch}
          onReset={this.handleToolbarReset}
          onAdvancedOpenChange={(advancedFiltersOpen) => this.setState({advancedFiltersOpen})}
          advancedFilters={this.renderAdvancedFilters()}
          actions={(
            <Button id="add-button" type="primary" size="small" onClick={this.addProvider.bind(this)}>
              {t("general:Add")}
            </Button>
          )}
        />
      </div>
    );
  }

  renderTable(providers: ProviderRecord[]): React.ReactNode {
    const columns: LegacyColumn<ProviderRecord>[] = legacyColumns<ProviderRecord>([
      {
        title: t("general:Identity source"),
        dataIndex: "name",
        key: "name",
        width: "17%",
        sorter: true,
        render: (_text: string, record: ProviderRecord) => {
          return renderProviderIdentity(record);
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "9%",
        sorter: true,
        render: (text: string) => {
          const ownerText = (text !== "admin") ? text : t("provider:admin (Shared)");
          return (
            <Tooltip title={ownerText || undefined}>
              <span className="provider-table-owner">{ownerText}</span>
            </Tooltip>
          );
        },
      },
      {
        title: t("general:Category"),
        dataIndex: "category",
        key: "category",
        filterMultiple: false,
        filters: [
          {text: "Captcha", value: "Captcha"},
          {text: "Email", value: "Email"},
          {text: "Notification", value: "Notification"},
          {text: "OAuth", value: "OAuth"},
          {text: "Payment", value: "Payment"},
          {text: "SAML", value: "SAML"},
          {text: "SMS", value: "SMS"},
          {text: "Storage", value: "Storage"},
          {text: "Web3", value: "Web3"},
        ],
        width: "8%",
        sorter: true,
        render: (text: string | undefined) => {
          return <span className="provider-table-category">{Setting.getTag("default", text || "-")}</span>;
        },
      },
      {
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "9%",
        filterMultiple: false,
        filters: [
          {text: "Captcha", value: "Captcha", children: Setting.getProviderTypeOptions("Captcha").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Email", value: "Email", children: Setting.getProviderTypeOptions("Email").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Notification", value: "Notification", children: Setting.getProviderTypeOptions("Notification").map((o) => {return {text: o.id, value: o.name};})},
          {text: "OAuth", value: "OAuth", children: Setting.getProviderTypeOptions("OAuth").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Payment", value: "Payment", children: Setting.getProviderTypeOptions("Payment").map((o) => {return {text: o.id, value: o.name};})},
          {text: "SAML", value: "SAML", children: Setting.getProviderTypeOptions("SAML").map((o) => {return {text: o.id, value: o.name};})},
          {text: "SMS", value: "SMS", children: Setting.getProviderTypeOptions("SMS").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Storage", value: "Storage", children: Setting.getProviderTypeOptions("Storage").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Web3", value: "Web3", children: Setting.getProviderTypeOptions("Web3").map((o) => {return {text: o.id, value: o.name};})},
        ],
        sorter: true,
        render: (text: string | undefined, record: ProviderRecord) => {
          return (
            <span className="provider-table-type">
              {Provider.getProviderLogoWidget(record, {disableLink: true})}
              <span>{text || "-"}</span>
            </span>
          );
        },
      },
      {
        title: t("provider:Client ID"),
        dataIndex: "clientId",
        key: "clientId",
        width: "13%",
        sorter: true,
        render: (text: string | undefined) => {
          return <span className="provider-table-client-id" title={text}>{Setting.getShortText(text)}</span>;
        },
      },
      {
        title: t("provider:Provider URL"),
        dataIndex: "providerUrl",
        key: "providerUrl",
        width: "15%",
        sorter: true,
        render: (text: string | undefined) => {
          if (!text) {
            return <span className="enterprise-list-secondary-text provider-table-empty-text">{t("general:empty")}</span>;
          }
          return (
            <a className="enterprise-list-inline-link provider-table-url" target="_blank" rel="noreferrer" href={text} title={text}>
              {
                Setting.getShortText(text)
              }
            </a>
          );
        },
      },
      {
        title: t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "13%",
        sorter: true,
        render: (text: string | undefined) => {
          return <span className="provider-table-date">{Setting.getFormattedDate(text)}</span>;
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "16%",
        render: (_text: string, record: ProviderRecord, index: number) => {
          const canModify = Setting.isAdminUser(this.props.account) || record.owner === this.props.account.owner;
          return (
            <ListPageRowActions className="provider-row-actions">
              <Button className="provider-row-primary-action" disabled={!canModify} size="small" type="link" icon={<EditOutlined />} onClick={() => this.props.history.push(`/providers/${record.owner}/${record.name}`)}>{t("general:Edit")}</Button>
              <Popconfirm
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                okText={t("general:OK")}
                cancelText={t("general:Cancel")}
                okButtonProps={{danger: true}}
                onConfirm={() => this.deleteProvider(index)}
                disabled={!canModify}
              >
                <Button className="provider-row-action-delete" disabled={!canModify} size="small" type="text" danger icon={<DeleteOutlined />}>{t("general:Delete")}</Button>
              </Popconfirm>
            </ListPageRowActions>
          );
        },
      },
    ]);

    const filteredColumns = Setting.filterTableColumns(columns, this.props.formItems ?? this.state.formItems, "op", {
      preserveColumnWidth: true,
      preserveColumnTitle: true,
    });
    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="provider-list-page">
        <div className="provider-list-page-table-shell">
          <ListPageTable<ProviderRecord> scroll={getProviderTableScroll(this.state.advancedFiltersOpen)} className="provider-list-table" columns={filteredColumns} dataSource={providers} rowKey={(record) => `${record.owner}/${record.name}`} pagination={paginationProps}
            title={() => this.renderListToolbar()}
            loading={this.state.loading}
            onChange={this.handleProviderTableChange}
          />
        </div>
      </div>
    );
  }

  fetch = (params: ProviderListFetchParams = {pagination: this.state.pagination}) => {
    const pagination = params.pagination || this.state.pagination;
    const current = String(pagination.current ?? "");
    const pageSize = String(pagination.pageSize ?? "");
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.category !== undefined && params.category !== null) {
      field = "category";
      value = params.category;
    } else if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    (Setting.isDefaultOrganizationSelected(this.props.account) ? ProviderBackend.getGlobalProviders(current, pageSize, field, value, sortField, sortOrder)
      : ProviderBackend.getProviders(Setting.getRequestOrganization(this.props.account), current, pageSize, field, value, sortField, sortOrder))
      .then((res: LegacyBackendResponse<ProviderRecord[]>) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data || [],
            pagination: {
              ...pagination,
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

export default ProviderListPage;
