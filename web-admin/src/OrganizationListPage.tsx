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
import {Button, Input, Select, Switch, Table} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import type {OrganizationQueryValue, OrganizationRecord} from "./backend/OrganizationBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import PopconfirmModal from "./common/modal/PopconfirmModal";
import OrganizationIdentityCenter from "./OrganizationIdentityCenter";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";

type FormItem = {
  name: string;
  label?: string;
  visible?: boolean;
  width?: string | number;
};

interface OrganizationListPageProps {
  account: {
    owner: string;
    tag?: string;
    [key: string]: unknown;
  };
  history: {
    push: (location: string | {pathname: string; mode?: string}) => void;
  };
  match?: {
    path?: string;
    params?: Record<string, string | undefined>;
  };
  formItems?: FormItem[];
}

interface OrganizationListPageState {
  data: OrganizationRecord[];
  pagination: TablePaginationConfig;
  loading: boolean;
  searchText?: OrganizationQueryValue;
  searchedColumn?: string;
  isAuthorized?: boolean;
  formItems?: FormItem[];
  queryField: string;
  queryKeyword: string;
  advancedQueryKeywords: Record<string, string>;
}

type OrganizationListColumns = TableProps<OrganizationRecord>["columns"];

type OrganizationListFetchParams = {
  pagination?: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: OrganizationQueryValue;
  sortField?: string;
  sortOrder?: string | null;
};

type OrganizationFilterCondition = {
  field: string;
  value: string;
};

// BaseListPage 仍是 legacy JS；本 change 只声明组织列表页实际使用的继承边界。
type LegacyBaseListPageCompat = React.Component<OrganizationListPageProps, OrganizationListPageState> & {
  getColumnSearchProps: (dataIndex: string, customRender?: unknown) => Record<string, unknown>;
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<OrganizationRecord>["onChange"]>;
};

const TypedBaseListPage = BaseListPage as unknown as {
  new(props: OrganizationListPageProps): LegacyBaseListPageCompat;
};

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

function getCountryKeys(): string[] {
  return (Setting.Countries as Array<{key: string}>).map(item => item.key);
}

function getOrganizationQueryFields() {
  return [
    {label: t("general:Name"), value: "name"},
    {label: t("general:Display name"), value: "displayName"},
    {label: t("organization:Website URL"), value: "websiteUrl"},
    {label: t("general:Password type"), value: "passwordType"},
    {label: t("general:Password salt"), value: "passwordSalt"},
  ];
}

function getOrganizationPasswordTypeOptions() {
  return [
    "plain",
    "salt",
    "sha512-salt",
    "md5-salt",
    "bcrypt",
    "pbkdf2-salt",
    "argon2id",
    "pbkdf2-django",
  ]
    .map(item => ({label: item, value: item}));
}

function createEmptyAdvancedQueryKeywords(): Record<string, string> {
  return getOrganizationQueryFields().reduce((keywords, field) => ({
    ...keywords,
    [field.value]: "",
  }), {} as Record<string, string>);
}

function normalizeOrganizationFilterValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(" ");
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function matchesOrganizationConditions(organization: OrganizationRecord, conditions: OrganizationFilterCondition[]): boolean {
  return conditions.every(condition => {
    const actualValue = normalizeOrganizationFilterValue(organization[condition.field]).toLowerCase();
    return actualValue.includes(condition.value.toLowerCase());
  });
}

function shouldUseFixedOrganizationTableColumns(): boolean {
  if (Setting.isMobile()) {
    return false;
  }
  // 窄屏壳层里 AntD 固定列可能脱离表格横向滚动容器，因此按实际视口禁用固定列。
  return typeof window === "undefined" || window.innerWidth > 768;
}

class OrganizationListPage extends TypedBaseListPage {
  constructor(props: OrganizationListPageProps) {
    super(props);
    this.state = {
      ...this.state,
      queryField: "name",
      queryKeyword: "",
      advancedQueryKeywords: createEmptyAdvancedQueryKeywords(),
    };
  }

  newOrganization(): OrganizationRecord {
    const randomName = Setting.getRandomName();
    const DefaultMfaRememberInHours = 12;
    return {
      owner: "admin",
      name: `organization_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Organization - ${randomName}`,
      websiteUrl: "https://git.leagsoft.com/aicodex/aicodex-admin",
      favicon: Conf.BrandFavicon,
      passwordType: "bcrypt",
      PasswordSalt: "",
      passwordOptions: ["AtLeast6"],
      passwordObfuscatorType: "Plain",
      passwordObfuscatorKey: "",
      passwordExpireDays: 0,
      countryCodes: ["US"],
      defaultAvatar: Conf.BrandIcon,
      defaultApplication: "",
      tags: [],
      languages: getCountryKeys(),
      masterPassword: "",
      defaultPassword: "",
      enableSoftDeletion: false,
      isProfilePublic: true,
      enableTour: true,
      disableSignin: false,
      mfaRememberInHours: DefaultMfaRememberInHours,
      balanceCurrency: "USD",
      accountItems: [
        {name: "Organization", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "ID", visible: true, viewRule: "Public", modifyRule: "Immutable"},
        {name: "Name", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Display name", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "First name", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Last name", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Avatar", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "User type", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Password", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Phone", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Country code", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Country/Region", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Location", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Address", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Addresses", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Affiliation", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Title", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "ID card type", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "ID card", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "ID card info", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Real name", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "ID verification", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "Homepage", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Bio", visible: true, viewRule: "Public", modifyRule: "Self"},
        {name: "Tag", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Language", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Gender", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Birthday", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Education", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Score", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Karma", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Ranking", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Balance", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Balance credit", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Balance currency", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Cart", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "Transactions", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "Signup application", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Register type", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Register source", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Groups", visible: true, viewRule: "Public", modifyRule: "Admin"},
        {name: "Roles", visible: true, viewRule: "Public", modifyRule: "Immutable"},
        {name: "Permissions", visible: true, viewRule: "Public", modifyRule: "Immutable"},
        {name: "Consents", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "3rd-party logins", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "Properties", visible: false, viewRule: "Admin", modifyRule: "Admin"},
        {name: "Is online", visible: true, viewRule: "Admin", modifyRule: "Admin"},
        {name: "Is admin", visible: true, viewRule: "Admin", modifyRule: "Admin"},
        {name: "Is forbidden", visible: true, viewRule: "Admin", modifyRule: "Admin"},
        {name: "Is deleted", visible: true, viewRule: "Admin", modifyRule: "Admin"},
        {name: "Multi-factor authentication", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "MFA items", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "WebAuthn credentials", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "Last change password time", visible: true, viewRule: "Admin", modifyRule: "Admin"},
        {name: "Managed accounts", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "Face ID", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "MFA accounts", visible: true, viewRule: "Self", modifyRule: "Self"},
        {name: "Need update password", visible: true, viewRule: "Admin", modifyRule: "Admin"},
        {name: "IP whitelist", visible: true, viewRule: "Admin", modifyRule: "Admin"},
      ],
    };
  }

  addOrganization(): void {
    const newOrganization = this.newOrganization();
    OrganizationBackend.addOrganization(newOrganization)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/organizations/${newOrganization.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
          window.dispatchEvent(new Event("storageOrganizationsChanged"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteOrganization(i: number): void {
    OrganizationBackend.deleteOrganization(this.state.data[i])
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
          window.dispatchEvent(new Event("storageOrganizationsChanged"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderTable(organizations: OrganizationRecord[]): React.ReactNode {
    const useFixedColumns = shouldUseFixedOrganizationTableColumns();
    const columns: OrganizationListColumns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "120px",
        fixed: useFixedColumns ? "left" : false,
        sorter: true,
        render: (text: string) => {
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
        render: (text: string) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        sorter: true,
      },
      {
        title: t("general:Favicon"),
        dataIndex: "favicon",
        key: "favicon",
        width: "50px",
        render: (text: string) => {
          return (
            <a target="_blank" rel="noreferrer" href={text}>
              <img src={text} alt={text} width={40} />
            </a>
          );
        },
      },
      {
        title: t("organization:Website URL"),
        dataIndex: "websiteUrl",
        key: "websiteUrl",
        width: "200px",
        sorter: true,
        render: (text: string) => {
          return (
            <a target="_blank" rel="noreferrer" href={text}>
              {text}
            </a>
          );
        },
      },
      {
        title: t("general:Password type"),
        dataIndex: "passwordType",
        key: "passwordType",
        width: "150px",
        sorter: true,
      },
      {
        title: t("general:Password salt"),
        dataIndex: "passwordSalt",
        key: "passwordSalt",
        width: "150px",
        sorter: true,
      },
      {
        title: t("general:Default avatar"),
        dataIndex: "defaultAvatar",
        key: "defaultAvatar",
        width: "120px",
        render: (text: string) => {
          return (
            <a target="_blank" rel="noreferrer" href={text}>
              <img src={text} alt={text} width={40} />
            </a>
          );
        },
      },
      {
        title: t("organization:Org balance"),
        dataIndex: "orgBalance",
        key: "orgBalance",
        width: "120px",
        sorter: true,
        render: (text: number | null | undefined) => {
          return text ?? 0;
        },
      },
      {
        title: t("organization:User balance"),
        dataIndex: "userBalance",
        key: "userBalance",
        width: "120px",
        sorter: true,
        render: (text: number | null | undefined) => {
          return text ?? 0;
        },
      },
      {
        title: t("organization:Balance credit"),
        dataIndex: "balanceCredit",
        key: "balanceCredit",
        width: "120px",
        sorter: true,
        render: (text: number | null | undefined) => {
          return text ?? 0;
        },
      },
      {
        title: t("organization:Balance currency"),
        dataIndex: "balanceCurrency",
        key: "balanceCurrency",
        width: "140px",
        sorter: true,
        render: (text: string | null | undefined) => {
          return text || "USD";
        },
      },
      {
        title: t("organization:Soft deletion"),
        dataIndex: "enableSoftDeletion",
        key: "enableSoftDeletion",
        width: "140px",
        sorter: true,
        render: (text: boolean) => {
          return (
            <Switch disabled checkedChildren={t("general:ON")} unCheckedChildren={t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "350px",
        fixed: useFixedColumns ? "right" : false,
        render: (_text: unknown, record: OrganizationRecord, index: number) => {
          return (
            <div>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.props.history.push(`/trees/${record.name}`)}>{t("general:Groups")}</Button>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.props.history.push(`/organizations/${record.name}/users`)}>{t("general:Users")}</Button>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} onClick={() => this.props.history.push(`/organizations/${record.name}`)}>{t("general:Edit")}</Button>
              <PopconfirmModal
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteOrganization(index)}
                disabled={record.name === "built-in"}
              >
              </PopconfirmModal>
            </div>
          );
        },
      },
    ];

    const filteredColumns = (Setting.filterTableColumns as (columns: OrganizationListColumns, formItems?: FormItem[]) => OrganizationListColumns)(columns, this.props.formItems ?? this.state.formItems);
    const paginationProps = this.getTablePaginationProps();

    return (
      <OrganizationIdentityCenter
        page="organizations"
        currentOrganization={Setting.isDefaultOrganizationSelected(this.props.account) ? t("general:All") : Setting.getRequestOrganization(this.props.account)}
        total={this.state.pagination.total}
        loadedCount={organizations.length}
        listAction={this.renderAddOrganizationAction()}
      >
        <Table
          scroll={{x: "max-content"}}
          columns={filteredColumns}
          dataSource={organizations}
          rowKey="name"
          size="middle"
          bordered
          pagination={paginationProps}
          title={() => this.renderListToolbar()}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </OrganizationIdentityCenter>
    );
  }

  handleToolbarSearch = (): void => {
    const pagination = {...this.state.pagination, current: 1};
    if (this.hasAdvancedQueryKeywords()) {
      this.fetchAdvancedFilteredOrganizations({pagination});
      return;
    }
    this.fetch({
      pagination,
      searchedColumn: this.state.queryField,
      searchText: this.state.queryKeyword.trim(),
    });
  };

  handleToolbarReset = (): void => {
    const pagination = {...this.state.pagination, current: 1};
    this.setState({
      queryField: "name",
      queryKeyword: "",
      advancedQueryKeywords: createEmptyAdvancedQueryKeywords(),
      searchText: undefined,
      searchedColumn: undefined,
    }, () => this.fetch({pagination}));
  };

  handleAdvancedFilterChange = (field: string, value: string): void => {
    this.setState(prevState => ({
      advancedQueryKeywords: {
        ...prevState.advancedQueryKeywords,
        [field]: value,
      },
    }));
  };

  handleToolbarFieldChange = (value: string): void => {
    this.setState({
      queryField: value,
      queryKeyword: "",
    });
  };

  handleTableChange: NonNullable<TableProps<OrganizationRecord>["onChange"]> = (pagination, _filters, sorter) => {
    const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortField = typeof normalizedSorter?.field === "string" ? normalizedSorter.field : undefined;
    const sortOrder = normalizedSorter?.order ?? undefined;
    const params: OrganizationListFetchParams = {
      pagination,
      sortField,
      sortOrder,
    };

    if (this.hasAdvancedQueryKeywords()) {
      this.fetchAdvancedFilteredOrganizations(params);
      return;
    }

    this.fetch({
      ...params,
      searchText: this.state.searchText,
      searchedColumn: this.state.searchedColumn,
    });
  };

  getAdvancedQueryConditions(): OrganizationFilterCondition[] {
    return Object.entries(this.state.advancedQueryKeywords || {})
      .map(([field, value]) => ({field, value: value.trim()}))
      .filter(condition => condition.value !== "");
  }

  getActiveQueryConditions(): OrganizationFilterCondition[] {
    const keyword = this.state.queryKeyword.trim();
    const baseCondition = keyword === "" ? [] : [{field: this.state.queryField, value: keyword}];
    return [
      ...baseCondition,
      ...this.getAdvancedQueryConditions(),
    ];
  }

  hasAdvancedQueryKeywords(): boolean {
    return this.getAdvancedQueryConditions().length > 0;
  }

  getRequestOrganization(): string {
    return Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account);
  }

  getFilteredPageData(organizations: OrganizationRecord[], pagination: TablePaginationConfig): OrganizationRecord[] {
    const current = typeof pagination.current === "number" && pagination.current > 0 ? pagination.current : 1;
    const pageSize = typeof pagination.pageSize === "number" && pagination.pageSize > 0 ? pagination.pageSize : organizations.length || 10;
    const start = (current - 1) * pageSize;
    return organizations.slice(start, start + pageSize);
  }

  renderAdvancedFilters(): React.ReactNode {
    const passwordTypeOptions = getOrganizationPasswordTypeOptions();
    return (
      <div className="organization-advanced-filters">
        {
          getOrganizationQueryFields().map(field => {
            const labelText = field.label;
            return (
              <label className="organization-advanced-filter-item" key={field.value}>
                <span className="organization-advanced-filter-label">{field.label}:</span>
                {
                  field.value === "passwordType" ? (
                    <Select
                      className="organization-advanced-filter-select"
                      value={this.state.advancedQueryKeywords[field.value] || undefined}
                      aria-label={`${t("general:Advanced filters", "Advanced filters")} ${labelText}`}
                      placeholder={t("general:Please select", "Please select")}
                      allowClear
                      showSearch
                      options={passwordTypeOptions}
                      onChange={(value?: string) => this.handleAdvancedFilterChange(field.value, value ?? "")}
                    />
                  ) : (
                    <Input
                      className="organization-advanced-filter-input"
                      value={this.state.advancedQueryKeywords[field.value] ?? ""}
                      aria-label={`${t("general:Advanced filters", "Advanced filters")} ${labelText}`}
                      placeholder={t("general:Please input your search")}
                      allowClear
                      onChange={event => this.handleAdvancedFilterChange(field.value, event.target.value)}
                    />
                  )
                }
              </label>
            );
          })
        }
      </div>
    );
  }

  renderAddOrganizationAction(): React.ReactNode {
    return (
      <Button type="primary" size="small" disabled={!Setting.isAdminUser(this.props.account)} onClick={this.addOrganization.bind(this)}>{t("general:Add")}</Button>
    );
  }

  // 这里只展示组织列表的只读辅助上下文，真实目录诊断和刷新动作仍由目录质量页承载。
  renderDirectoryHealthContext(): React.ReactNode {
    const boundary = Setting.isDefaultOrganizationSelected(this.props.account) ? t("general:All") : Setting.getRequestOrganization(this.props.account);
    const attentionText = i18next.t("general:Attention item count", {count: 3, defaultValue: "{{count}} items need attention"}) as string;

    return (
      <span className="organization-list-directory-context">
        <span className="organization-list-directory-context-text">
          <strong>{t("general:Directory health")}:</strong>
          {" "}
          <span className="organization-list-directory-context-warning">{attentionText}</span>
          {" · "}
          {t("general:Sync sources")}
          {": "}
          {t("general:WeCom / Feishu")}
          {" · "}
          {t("general:Boundary")}
          {": "}
          {boundary}
        </span>
        <Link className="organization-list-directory-context-link" to="/organization-directory-quality">{t("general:Directory quality")}</Link>
      </span>
    );
  }

  renderListToolbar(): React.ReactNode {
    const keywordControl = this.state.queryField === "passwordType" ? (
      <Select
        className="enterprise-list-query-toolbar-keyword organization-password-type-query-select"
        value={this.state.queryKeyword || undefined}
        placeholder={t("general:Please select", "Please select")}
        allowClear
        showSearch
        options={getOrganizationPasswordTypeOptions()}
        onChange={(value?: string) => this.setState({queryKeyword: value ?? ""})}
      />
    ) : undefined;

    return (
      <EnterpriseListQueryToolbar
        title={t("general:Organizations")}
        total={this.state.pagination.total}
        fields={getOrganizationQueryFields()}
        selectedField={this.state.queryField}
        keyword={this.state.queryKeyword}
        onFieldChange={this.handleToolbarFieldChange}
        onKeywordChange={(value) => this.setState({queryKeyword: value})}
        onSearch={this.handleToolbarSearch}
        onReset={this.handleToolbarReset}
        keywordControl={keywordControl}
        advancedFilters={this.renderAdvancedFilters()}
        context={this.renderDirectoryHealthContext()}
        showHeader={false}
      />
    );
  }

  fetch = (params: OrganizationListFetchParams = {}): void => {
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    this.setState({loading: true});
    const pagination = params.pagination as TablePaginationConfig;
    OrganizationBackend.getOrganizations("admin", Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), pagination.current, pagination.pageSize, field, value, sortField, sortOrder)
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data as OrganizationRecord[],
            pagination: {
              ...pagination,
              total: res.data2 as number,
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

  fetchAdvancedFilteredOrganizations = (params: OrganizationListFetchParams = {}): void => {
    const pagination = params.pagination as TablePaginationConfig;
    const conditions = [
      ...this.getActiveQueryConditions(),
    ].filter(condition => condition.value !== "");
    this.setState({loading: true});
    // 后端组织列表仍是单字段 field + value 查询；高级筛选先获取当前组织范围列表，再在前端按所有非空条件 AND 过滤。
    OrganizationBackend.getOrganizations("admin", this.getRequestOrganization(), "", "", undefined, undefined, params.sortField, params.sortOrder)
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          const filteredOrganizations = (res.data as OrganizationRecord[]).filter(organization => matchesOrganizationConditions(organization, conditions));
          this.setState({
            data: this.getFilteredPageData(filteredOrganizations, pagination),
            pagination: {
              ...pagination,
              total: filteredOrganizations.length,
            },
            searchText: this.state.queryKeyword.trim() || undefined,
            searchedColumn: this.state.queryKeyword.trim() ? this.state.queryField : undefined,
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

export default OrganizationListPage;
