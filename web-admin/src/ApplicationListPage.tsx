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
import {Button, Input, Popconfirm, Space, Tooltip, Typography} from "antd";
import type {TablePaginationConfig} from "antd";
import {CopyOutlined, DeleteOutlined, EditOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import {SignupTableDefaultCssMap} from "./table/SignupTable";
import {legacyColumns} from "./types/legacyPage";
import ListPageTable from "./common/ListPageTable";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";
import ListPageIdentityCell from "./common/ListPageIdentityCell";
import ListPageRowActions from "./common/ListPageRowActions";

type AdminRouteProps = import("./types/legacyPage").AdminRouteProps;
type LegacyAny = import("./types/legacyPage").LegacyAny;
type LegacyBackendResponse<TData = LegacyAny> = import("./types/legacyPage").LegacyBackendResponse<TData>;
type LegacyColumn<TRecord = LegacyAny> = import("./types/legacyPage").LegacyColumn<TRecord>;
type LegacyFetchParams = import("./types/legacyPage").LegacyFetchParams;
type ApplicationListFetchParams = Partial<LegacyFetchParams>;
type ApplicationFilterCondition = {field: string; value: string};

const {Text} = Typography;

interface ApplicationProvider {
  name: string;
  [key: string]: LegacyAny;
}

interface ApplicationRecord {
  owner: string;
  organization: string;
  name: string;
  displayName?: string;
  category?: string;
  type?: string;
  logo?: string;
  providers?: ApplicationProvider[];
  [key: string]: LegacyAny;
}

function t(key: string, options?: LegacyAny): string {
  return String(i18next.t(key, options));
}

function getApplicationQueryFields() {
  return [
    {label: t("general:Name"), value: "name"},
    {label: t("general:Display name"), value: "displayName"},
    {label: t("general:Organization"), value: "organization"},
    {label: t("general:Category"), value: "category"},
    {label: t("general:Type"), value: "type"},
  ];
}

function createEmptyAdvancedQueryKeywords(): Record<string, string> {
  return getApplicationQueryFields().reduce((keywords, field) => ({
    ...keywords,
    [field.value]: "",
  }), {} as Record<string, string>);
}

function normalizeApplicationFilterValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(" ");
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function matchesApplicationConditions(application: ApplicationRecord, conditions: ApplicationFilterCondition[]): boolean {
  return conditions.every(condition => {
    const actualValue = normalizeApplicationFilterValue(application[condition.field]).toLowerCase();
    return actualValue.includes(condition.value.toLowerCase());
  });
}

function renderApplicationIdentity(record: ApplicationRecord): React.ReactNode {
  const displayName = record.displayName || record.name || "";
  const technicalName = record.name || "";

  return (
    <ListPageIdentityCell
      classPrefix="application-table"
      title={displayName}
      titleTo={`/applications/${record.organization}/${technicalName}`}
      secondary={technicalName}
      copyValue=""
      copyLabel={`${t("general:Copy")} ${t("general:Name")}`}
      iconSrc={record.logo || Conf.BrandIcon}
      iconAlt={displayName || technicalName}
      onCopiedMessage={t("general:Copied to clipboard successfully")}
    />
  );
}

function renderApplicationConfig(record: ApplicationRecord): React.ReactNode {
  const providers = Array.isArray(record.providers) ? record.providers.filter(provider => provider?.name) : [];

  return (
    <div className="application-table-config">
      <div className="application-table-providers">
        {providers.length === 0 ? (
          <Text type="secondary">{`(${t("general:empty")})`}</Text>
        ) : (
          <Space size={[6, 2]} wrap>
            {providers.slice(0, 3).map(provider => (
              <Link className="application-table-provider-link" to={`/providers/${record.organization}/${provider.name}`} title={provider.name} key={provider.name}>
                {provider.name}
              </Link>
            ))}
            {providers.length > 3 ? <Text type="secondary">+{providers.length - 3}</Text> : null}
          </Space>
        )}
      </div>
    </div>
  );
}

function getApplicationTableScroll(advancedFiltersOpen: boolean): {x?: number; y?: string} | undefined {
  if (Setting.isMobile()) {
    return {x: 880};
  }
  return {y: advancedFiltersOpen ? "calc(100vh - 414px)" : "calc(100vh - 360px)"};
}

const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, LegacyAny> & LegacyAny;

class ApplicationListPage extends LegacyBaseListPage {
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

  newApplication(): ApplicationRecord {
    const randomName = Setting.getRandomName();
    const organizationName = Setting.getRequestOrganization(this.props.account);
    return {
      owner: "admin", // this.props.account.applicationName,
      name: `application_${randomName}`,
      organization: organizationName,
      createdTime: moment().format(),
      displayName: `New Application - ${randomName}`,
      category: "Default",
      type: "All",
      scopes: [],
      logo: Conf.BrandIcon,
      enablePassword: true,
      enableSignUp: true,
      disableSignin: false,
      enableSigninSession: false,
      enableCodeSignin: false,
      enableSamlCompress: false,
      disableSamlAttributes: false,
      providers: [
        {name: "provider_captcha_default", canSignUp: false, canSignIn: false, canUnlink: false, prompted: false, signupGroup: "", rule: ""},
      ],
      SigninMethods: [
        {name: "Password", displayName: "Password", rule: "All"},
        {name: "Verification code", displayName: "Verification code", rule: "All"},
        {name: "WebAuthn", displayName: "WebAuthn", rule: "None"},
        {name: "Face ID", displayName: "Face ID", rule: "None"},
      ],
      signupItems: [
        {name: "ID", visible: false, required: true, rule: "Random"},
        {name: "Username", visible: true, required: true, rule: "None"},
        {name: "Display name", visible: true, required: true, rule: "None"},
        {name: "Password", visible: true, required: true, rule: "None"},
        {name: "Confirm password", visible: true, required: true, rule: "None"},
        {name: "Email", visible: true, required: true, rule: "Normal"},
        {name: "Phone", visible: true, required: true, rule: "None"},
        {name: "Agreement", visible: true, required: true, rule: "None"},
        {name: "Signup button", visible: true, required: true, rule: "None"},
        {name: "Providers", visible: true, required: true, rule: "None", customCss: SignupTableDefaultCssMap["Providers"]},
      ],
      grantTypes: ["authorization_code", "password", "client_credentials", "token", "id_token", "refresh_token"],
      cert: "cert-built-in",
      redirectUris: ["http://localhost:9000/callback"],
      tokenFormat: "JWT",
      tokenFields: [],
      expireInHours: 24 * 7,
      refreshExpireInHours: 24 * 7,
      cookieExpireInHours: 24 * 30,
      formOffset: 2,
    };
  }

  addApplication() {
    const newApplication = this.newApplication();
    ApplicationBackend.addApplication(newApplication)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/applications/${newApplication.organization}/${newApplication.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteApplication(i: number) {
    ApplicationBackend.deleteApplication(this.state.data[i])
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
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  copyApplication(i: number) {
    const original = this.state.data[i];
    const randomSuffix = Setting.getRandomName();
    const newName = `${original.name}_${randomSuffix}`;

    const copiedApplication = {
      ...original,
      name: newName,
      createdTime: moment().format(),
      displayName: "Copy Application - " + newName,
      clientId: "",
      clientSecret: "",
    };

    ApplicationBackend.addApplication(copiedApplication)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/applications/${copiedApplication.organization}/${newName}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully copied"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to copy")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  handleToolbarSearch = (): void => {
    const pagination = {...this.state.pagination, current: 1};
    const keyword = String(this.state.queryKeyword || "").trim();
    if (this.hasAdvancedQueryKeywords()) {
      this.fetchAdvancedFilteredApplications({pagination});
      return;
    }

    if (keyword !== "") {
      this.fetch({
        pagination,
        searchedColumn: this.state.queryField,
        searchText: keyword,
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
      advancedQueryKeywords: createEmptyAdvancedQueryKeywords(),
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

  handleApplicationTableChange = (pagination: TablePaginationConfig, _filters: LegacyAny, sorter: LegacyAny): void => {
    const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortField = typeof normalizedSorter?.field === "string" ? normalizedSorter.field : undefined;
    const sortOrder = normalizedSorter?.order ?? undefined;
    const params: ApplicationListFetchParams = {
      pagination,
      sortField,
      sortOrder,
    };

    if (this.hasAdvancedQueryKeywords()) {
      this.fetchAdvancedFilteredApplications(params);
      return;
    }

    this.fetch({
      ...params,
      searchText: this.state.searchText,
      searchedColumn: this.state.searchedColumn,
    } as LegacyFetchParams);
  };

  getAdvancedQueryConditions(): ApplicationFilterCondition[] {
    return Object.entries(this.state.advancedQueryKeywords || {})
      .map(([field, value]) => ({field, value: String(value || "").trim()}))
      .filter(condition => condition.value !== "");
  }

  getActiveQueryConditions(): ApplicationFilterCondition[] {
    const keyword = String(this.state.queryKeyword || "").trim();
    const baseCondition = keyword === "" ? [] : [{field: this.state.queryField, value: keyword}];
    return [
      ...baseCondition,
      ...this.getAdvancedQueryConditions(),
    ];
  }

  hasAdvancedQueryKeywords(): boolean {
    return this.getAdvancedQueryConditions().length > 0;
  }

  getFilteredPageData(applications: ApplicationRecord[], pagination: TablePaginationConfig): ApplicationRecord[] {
    const current = typeof pagination.current === "number" && pagination.current > 0 ? pagination.current : 1;
    const pageSize = typeof pagination.pageSize === "number" && pagination.pageSize > 0 ? pagination.pageSize : applications.length || 10;
    const start = (current - 1) * pageSize;
    return applications.slice(start, start + pageSize);
  }

  renderAdvancedFilters(): React.ReactNode {
    return (
      <div className="organization-advanced-filters">
        {
          getApplicationQueryFields().map(field => (
            <label className="organization-advanced-filter-item" key={field.value}>
              <span className="organization-advanced-filter-label">{field.label}:</span>
              <Input
                className="organization-advanced-filter-input"
                value={this.state.advancedQueryKeywords[field.value] ?? ""}
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
          title={t("general:Applications")}
          total={this.state.pagination.total}
          showTotal={false}
          fields={getApplicationQueryFields()}
          selectedField={this.state.queryField}
          keyword={this.state.queryKeyword}
          onFieldChange={(value) => this.setState({queryField: value})}
          onKeywordChange={(value) => this.setState({queryKeyword: value})}
          onSearch={this.handleToolbarSearch}
          onReset={this.handleToolbarReset}
          onAdvancedOpenChange={(advancedFiltersOpen) => this.setState({advancedFiltersOpen})}
          advancedFilters={this.renderAdvancedFilters()}
          actions={(
            <>
              <Button type="primary" size="small" onClick={this.addApplication.bind(this)}>{t("general:Add")}</Button>
              <Link to="/providers"><Button size="small">{t("identityEvidenceChain:Identity source")}</Button></Link>
              <Link to="/platform-api-mappings"><Button size="small">{t("identityAssetRelationship:API gateway mapping")}</Button></Link>
              <Link to="/records"><Button size="small">{t("identityAssetRelationship:Audit records")}</Button></Link>
            </>
          )}
        />
      </div>
    );
  }

  renderTable(applications: ApplicationRecord[]) {
    const columns: LegacyColumn<ApplicationRecord>[] = legacyColumns<ApplicationRecord>([
      {
        title: t("general:Application"),
        dataIndex: "name",
        key: "name",
        width: "18%",
        sorter: true,
        render: (_text: string, record: ApplicationRecord) => {
          return renderApplicationIdentity(record);
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "organization",
        key: "organization",
        width: "9%",
        sorter: true,
        render: (text: string) => {
          return (
            <Tooltip title={text || undefined}>
              <Link className="application-table-organization-link" to={`/organizations/${text}`}>
                {text}
              </Link>
            </Tooltip>
          );
        },
      },
      {
        title: t("general:Category"),
        dataIndex: "category",
        key: "category",
        width: "7%",
        sorter: true,
        render: (text: string | undefined) => {
          const category = text || "Default";
          return <span className="application-table-category">{Setting.getTag(category === "Agent" ? "success" : "default", category)}</span>;
        },
      },
      {
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "6%",
        sorter: true,
        render: (text: string | undefined) => {
          return <span className="application-table-type">{Setting.getTag("default", text || "All")}</span>;
        },
      },
      {
        title: t("general:Access configuration"),
        dataIndex: "providers",
        key: "providers",
        width: "25%",
        render: (_text: ApplicationProvider[] | null, record: ApplicationRecord) => {
          return renderApplicationConfig(record);
        },
      },
      {
        title: t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "14%",
        sorter: true,
        render: (text: string) => {
          return <span className="application-table-date">{Setting.getFormattedDate(text)}</span>;
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "21%",
        render: (text: string, record: ApplicationRecord, index: number) => {
          const deleteButton = (
            <Button
              className="application-row-action-delete"
              size="small"
              type="text"
              danger
              disabled={record.name === "app-built-in"}
              icon={<DeleteOutlined />}
            >
              {t("general:Delete")}
            </Button>
          );
          return (
            <ListPageRowActions className="application-row-actions">
              <Button className="application-row-primary-action" size="small" type="link" icon={<EditOutlined />} onClick={() => this.props.history.push(`/applications/${record.organization}/${record.name}`)}>{t("general:Edit")}</Button>
              <Button className="application-row-action-copy" size="small" type="text" icon={<CopyOutlined />} onClick={() => this.copyApplication(index)}>{t("general:Copy")}</Button>
              {
                record.name === "app-built-in" ? deleteButton : (
                  <Popconfirm
                    title={t("general:Sure to delete") + `: ${record.name} ?`}
                    okText={t("general:OK")}
                    cancelText={t("general:Cancel")}
                    okButtonProps={{danger: true}}
                    onConfirm={() => this.deleteApplication(index)}
                  >
                    {deleteButton}
                  </Popconfirm>
                )
              }
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
      <div className="application-list-page-table-shell">
        <ListPageTable<ApplicationRecord> scroll={getApplicationTableScroll(this.state.advancedFiltersOpen)} className="application-list-table" columns={filteredColumns} dataSource={applications} rowKey={(record) => `${record.owner}/${record.name}`} pagination={paginationProps}
          title={() => this.renderListToolbar()}
          loading={this.state.loading}
          onChange={this.handleApplicationTableChange}
        />
      </div>
    );
  }

  fetchAdvancedFilteredApplications = (params: ApplicationListFetchParams = {}): void => {
    const pagination = (params.pagination || this.state.pagination) as TablePaginationConfig;
    const conditions = this.getActiveQueryConditions();
    this.setState({loading: true});
    const request = Setting.isDefaultOrganizationSelected(this.props.account) ?
      (ApplicationBackend.getApplications as LegacyAny)("admin", "", "", "", "", params.sortField, params.sortOrder) :
      (ApplicationBackend.getApplicationsByOrganization as LegacyAny)("admin", Setting.getRequestOrganization(this.props.account), "", "", "", "", params.sortField, params.sortOrder);

    request
      .then((res: LegacyBackendResponse<ApplicationRecord[]>) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          const filteredApplications = (res.data || []).filter(application => matchesApplicationConditions(application, conditions));
          const keyword = String(this.state.queryKeyword || "").trim();
          this.setState({
            data: this.getFilteredPageData(filteredApplications, pagination),
            pagination: {
              ...pagination,
              total: filteredApplications.length,
            },
            searchText: keyword || undefined,
            searchedColumn: keyword ? this.state.queryField : undefined,
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
      })
      .catch((error: unknown) => {
        this.setState({
          loading: false,
        });
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  };

  fetch = (params: LegacyFetchParams = {pagination: this.state.pagination}) => {
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    this.setState({loading: true});
    (Setting.isDefaultOrganizationSelected(this.props.account) ? (ApplicationBackend.getApplications as LegacyAny)("admin", params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder) :
      (ApplicationBackend.getApplicationsByOrganization as LegacyAny)("admin", Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder))
      .then((res: LegacyBackendResponse<ApplicationRecord[]>) => {
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

export default ApplicationListPage as unknown as React.ComponentType<AdminRouteProps>;
