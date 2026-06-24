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
import {Avatar, Button, Input, Modal, Popconfirm, Space, Table, Tag, Tooltip, Upload} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import {DeleteOutlined, EditOutlined, LoginOutlined, UploadOutlined, UserDeleteOutlined} from "@ant-design/icons";
import moment from "moment";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import * as UserBackend from "./backend/UserBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import * as XLSX from "xlsx";
import OrganizationIdentityCenter from "./OrganizationIdentityCenter";
import ListPageIdentityCell from "./common/ListPageIdentityCell";
import ListPageRowActions from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";

type QueryValue = string | number | boolean | readonly (string | number | boolean)[] | null | undefined;

type FormItem = {
  name: string;
  label?: string;
  visible?: boolean;
  width?: string | number;
};

type UserRecord = {
  owner: string;
  name: string;
  createdTime?: string;
  updatedTime?: string;
  type?: string;
  password?: string;
  passwordSalt?: string;
  displayName?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  address?: unknown[];
  groups?: string[];
  affiliation?: string;
  tag?: string;
  region?: string;
  realName?: string;
  isVerified?: boolean;
  isAdmin?: boolean;
  IsForbidden?: boolean;
  isForbidden?: boolean;
  score?: number;
  isDeleted?: boolean;
  properties?: Record<string, unknown>;
  signupApplication?: string;
  registerType?: string;
  registerSource?: string;
  balance?: number;
  balanceCredit?: number;
  balanceCurrency?: string;
  [key: string]: unknown;
};

type OrganizationRecord = {
  name?: string;
  defaultAvatar?: string;
  countryCodes?: string[];
  initScore?: number;
  defaultApplication?: string;
  balanceCurrency?: string;
  tags?: string[];
  [key: string]: unknown;
};

type BackendResponse<T = unknown> = {
  status: string;
  msg?: string;
  data?: T;
  data2?: number;
};

interface UserListPageProps {
  account: {
    owner: string;
    name?: string;
    tag?: string;
    [key: string]: unknown;
  };
  history: {
    push: (location: string | {pathname: string; mode?: string}) => void;
  };
  match: {
    path?: string;
    params?: Record<string, string | undefined>;
  };
  organizationName?: string;
  groupName?: string;
  formItems?: FormItem[];
}

interface UserListPageState {
  data: UserRecord[];
  pagination: TablePaginationConfig;
  loading: boolean;
  searchText?: QueryValue;
  searchedColumn?: string;
  isAuthorized?: boolean;
  formItems?: FormItem[];
  organizationName: string;
  organization: OrganizationRecord | null;
  uploadJsonData: Record<string, unknown>[];
  uploadColumns: TableProps<Record<string, unknown>>["columns"];
  showUploadModal: boolean;
  file?: File;
  queryField: string;
  queryKeyword: string;
  advancedQueryKeywords: Record<string, string>;
  advancedFiltersOpen: boolean;
  [key: string]: unknown;
}

type UserListColumns = TableProps<UserRecord>["columns"];

type UserListFetchParams = {
  pagination?: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: QueryValue;
  sortField?: string;
  sortOrder?: string | null;
};

type UserBackendCompat = {
  getGlobalUsers: (page: QueryValue, pageSize: QueryValue, field?: QueryValue, value?: QueryValue, sortField?: QueryValue, sortOrder?: QueryValue) => Promise<BackendResponse<UserRecord[]>>;
  getUsers: (owner: string | undefined, page?: QueryValue, pageSize?: QueryValue, field?: QueryValue, value?: QueryValue, sortField?: QueryValue, sortOrder?: QueryValue, groupName?: string) => Promise<BackendResponse<UserRecord[]>>;
  addUser: (user: UserRecord) => Promise<BackendResponse>;
  deleteUser: (user: UserRecord) => Promise<BackendResponse>;
  removeUserFromGroup: (payload: {groupName?: string; owner: string; name: string}) => Promise<BackendResponse>;
  impersonateUser: (username: string) => Promise<BackendResponse>;
};

type OrganizationBackendCompat = {
  getOrganization: (owner: string, name: string) => Promise<BackendResponse<OrganizationRecord>>;
};

/* istanbul ignore next -- 仅用于声明 legacy BaseListPage.js 的继承边界，运行时由真实 BaseListPage 实现。 */
class LegacyBaseListPageCompat extends React.Component<UserListPageProps, UserListPageState> {
  getColumnSearchProps(_dataIndex: string, _customRender?: unknown): Record<string, unknown> {
    return {};
  }

  getTablePaginationProps(_overrides?: Record<string, unknown>): TablePaginationConfig {
    return {};
  }

  handleTableChange: NonNullable<TableProps<UserRecord>["onChange"]> = () => undefined;

  UNSAFE_componentWillMount(): void {
    return undefined;
  }

  fetch(_params: UserListFetchParams): void {
    return undefined;
  }
}

const TypedBaseListPage = BaseListPage as unknown as typeof LegacyBaseListPageCompat;
const TypedUserBackend = UserBackend as unknown as UserBackendCompat;
const TypedOrganizationBackend = OrganizationBackend as unknown as OrganizationBackendCompat;

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

function getUserQueryFields() {
  return [
    {label: t("general:Name"), value: "name"},
    {label: t("general:Display name"), value: "displayName"},
    {label: t("general:Email"), value: "email"},
    {label: t("general:Phone"), value: "phone"},
    {label: t("general:Organization"), value: "owner"},
    {label: t("general:Application"), value: "signupApplication"},
  ];
}

function createEmptyAdvancedQueryKeywords(): Record<string, string> {
  return getUserQueryFields().reduce((keywords, field) => ({
    ...keywords,
    [field.value]: "",
  }), {} as Record<string, string>);
}

function createSingleAdvancedQueryKeyword(field: string, value: string): Record<string, string> {
  return {
    ...createEmptyAdvancedQueryKeywords(),
    [field]: value,
  };
}

function getTextValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function getUserDisplayName(record: UserRecord): string {
  return record.displayName || record.realName || record.name || "";
}

function getUserAvatarInitial(record: UserRecord): string {
  const displayName = getUserDisplayName(record).trim();
  if (displayName === "") {
    return "?";
  }
  return displayName.slice(0, 1).toUpperCase();
}

function getUserTableScroll(advancedFiltersOpen: boolean): TableProps<UserRecord>["scroll"] | undefined {
  if (Setting.isMobile()) {
    return {x: 780};
  }
  return {y: advancedFiltersOpen ? "calc(100vh - 414px)" : "calc(100vh - 360px)"};
}

function UserTableAvatar({record}: {record: UserRecord}): JSX.Element {
  const [avatarFailed, setAvatarFailed] = React.useState(false);
  const avatar = getTextValue(record.avatar).trim();
  const hasAvatar = avatar !== "" && !avatarFailed;

  return (
    <Avatar
      className="user-table-avatar"
      size={34}
      src={hasAvatar ? avatar : undefined}
      onError={() => {
        setAvatarFailed(true);
        return false;
      }}
    >
      {getUserAvatarInitial(record)}
    </Avatar>
  );
}

function renderUserIdentity(record: UserRecord): React.ReactNode {
  const name = record.name || "";
  const displayName = getUserDisplayName(record) || name;

  return (
    <ListPageIdentityCell
      classPrefix="user-table-user"
      title={displayName}
      titleTo={`/users/${record.owner}/${name}`}
      secondary={name}
      copyValue={name}
      copyLabel={`${t("general:Copy")} ${t("general:Name")}`}
      copyClassName="user-table-copy-id"
      icon={<UserTableAvatar record={record} />}
      onCopiedMessage={t("general:Copied to clipboard successfully")}
    />
  );
}

function renderUserContact(record: UserRecord): React.ReactNode {
  const email = getTextValue(record.email).trim();
  const phone = getTextValue(record.phone).trim();

  if (email === "" && phone === "") {
    return <span className="enterprise-list-secondary-text user-table-empty-text">{t("user:No contact", "No contact")}</span>;
  }

  return (
    <div className="user-table-contact-cell">
      {email !== "" ? <a className="enterprise-list-inline-link user-table-contact-link" href={`mailto:${email}`} title={email}>{email}</a> : null}
      {phone !== "" ? <span className="enterprise-list-secondary-text user-table-contact-phone" title={phone}>{phone}</span> : null}
    </div>
  );
}

function renderUserSource(record: UserRecord): React.ReactNode {
  const owner = getTextValue(record.owner).trim();
  const application = getTextValue(record.signupApplication).trim();

  return (
    <div className="user-table-source-cell">
      {owner !== "" ? (
        <Tooltip title={owner}>
          <Link className="enterprise-list-inline-link user-table-source-link" to={`/organizations/${owner}`} title={owner}>{owner}</Link>
        </Tooltip>
      ) : <span className="enterprise-list-secondary-text user-table-empty-text">{t("general:Unknown", "Unknown")}</span>}
      {application !== "" ? (
        <Tooltip title={application}>
          <Link className="enterprise-list-secondary-text user-table-source-subtle" to={`/applications/${owner}/${application}`} title={application}>{application}</Link>
        </Tooltip>
      ) : null}
    </div>
  );
}

function renderUserStatus(record: UserRecord): React.ReactNode {
  const isForbidden = Boolean(record.isForbidden ?? record.IsForbidden);
  const isDeleted = Boolean(record.isDeleted);

  return (
    <Space className="user-table-status-tags" size={[4, 4]} wrap>
      <Tag className={record.isVerified ? "enterprise-list-status-tag user-table-status-verified" : "enterprise-list-status-tag user-table-status-unverified"}>
        {record.isVerified ? t("user:Verified") : t("user:Unverified", "Unverified")}
      </Tag>
      {isForbidden ? <Tag className="enterprise-list-status-tag" color="warning">{t("user:Is forbidden")}</Tag> : null}
      {isDeleted ? <Tag className="enterprise-list-status-tag" color="default">{t("user:Is deleted")}</Tag> : null}
    </Space>
  );
}

class UserListPage extends TypedBaseListPage {
  constructor(props: UserListPageProps) {
    super(props);
    this.state = {
      ...this.state,
      organization: null,
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

  UNSAFE_componentWillMount(): void {
    super.UNSAFE_componentWillMount();
    this.getOrganization(this.state.organizationName);
  }

  componentDidUpdate(prevProps: UserListPageProps, prevState: UserListPageState): void {
    if (this.props.match.path !== prevProps.match.path || this.props.organizationName !== prevProps.organizationName) {
      this.setState({
        organizationName: this.props.organizationName ?? this.props.match.params?.organizationName ?? "",
      });
    }

    if (this.state.organizationName !== prevState.organizationName) {
      this.getOrganization(this.state.organizationName);
    }

    if (prevProps.groupName !== this.props.groupName || this.state.organizationName !== prevState.organizationName) {
      this.fetch({
        pagination: this.state.pagination,
        searchText: this.state.searchText,
        searchedColumn: this.state.searchedColumn,
      });
    }
  }

  newUser(): UserRecord {
    const randomName = Setting.getRandomName();
    const owner = (Setting.isDefaultOrganizationSelected(this.props.account) || this.props.groupName) ? this.state.organizationName : Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `user_${randomName}`,
      createdTime: moment().format(),
      type: "normal-user",
      password: "123",
      passwordSalt: "",
      displayName: `New User - ${randomName}`,
      avatar: this.state.organization!.defaultAvatar ?? Conf.BrandIcon,
      email: `${randomName}@example.com`,
      phone: Setting.getRandomNumber(),
      countryCode: (this.state.organization!.countryCodes?.length || 0) > 0 ? this.state.organization!.countryCodes![0] : "",
      address: [],
      groups: this.props.groupName ? [`${owner}/${this.props.groupName}`] : [],
      affiliation: "Example Inc.",
      tag: "staff",
      region: "",
      realName: "",
      isVerified: false,
      isAdmin: (owner === "built-in"),
      IsForbidden: false,
      score: this.state.organization!.initScore,
      isDeleted: false,
      properties: {},
      signupApplication: this.state.organization!.defaultApplication,
      registerType: "Add User",
      registerSource: `${this.props.account.owner}/${this.props.account.name}`,
      balanceCurrency: this.state.organization!.balanceCurrency || "USD",
    };
  }

  addUser(): void {
    const newUser = this.newUser();
    TypedUserBackend.addUser(newUser)
      .then((res) => {
        if (res.status === "ok") {
          sessionStorage.setItem("userListUrl", window.location.pathname);
          this.props.history.push({pathname: `/users/${newUser.owner}/${newUser.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteUser(i: number): void {
    TypedUserBackend.deleteUser(this.state.data[i])
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully deleted"));
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: (this.state.pagination.current || 1) > 1 && this.state.data.length === 1 ? (this.state.pagination.current || 1) - 1 : this.state.pagination.current,
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

  removeUserFromGroup(i: number): void {
    const user = this.state.data[i];
    const group = this.props.groupName;
    TypedUserBackend.removeUserFromGroup({groupName: group, owner: user.owner, name: user.name})
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully removed"));
          this.setState({
            data: Setting.deleteRow(this.state.data, i),
            pagination: {total: (this.state.pagination.total as number) - 1},
          });
        } else {
          Setting.showMessage("error", `${t("general:Failed to remove")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  uploadFile(info: BackendResponse): void {
    const {status, msg} = info;
    if (status === "ok") {
      Setting.showMessage("success", "Users uploaded successfully, refreshing the page");
      const {pagination} = this.state;
      this.fetch({pagination});
    } else if (status === "error") {
      Setting.showMessage("error", `${t("general:Failed to upload")}: ${msg}`);
    }
    this.setState({uploadJsonData: [], uploadColumns: [], showUploadModal: false});
  }

  generateDownloadTemplate = (): void => {
    const userObj: Record<string, null> = {};
    const items = Setting.getUserColumns();
    items.forEach((item) => {
      userObj[item] = null;
    });
    const worksheet = XLSX.utils.json_to_sheet([userObj]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "import-user.xlsx", {compression: true});
  };

  getOrganization(organizationName: string): void {
    TypedOrganizationBackend.getOrganization("admin", organizationName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            organization: res.data as OrganizationRecord,
          });
        } else {
          Setting.showMessage("error", `${t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  impersonateUser(user: string): void {
    TypedUserBackend.impersonateUser(user).then((res) => {
      if (res.status === "ok") {
        Setting.showMessage("success", t("general:Successfully executed"));
        Setting.goToLinkSoft(this, "/");
        window.location.reload();
      } else {
        Setting.showMessage("error", res.msg);
      }
    });
  }

  renderUpload(): React.ReactNode {
    const uploadThis = this;
    const props = {
      name: "file",
      accept: ".xlsx",
      showUploadList: false,
      beforeUpload: (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const binary = e.target?.result;

          try {
            const workbook = XLSX.read(binary as ArrayBuffer, {type: "array"});
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
              Setting.showMessage("error", t("general:No sheets found in file"));
              return;
            }

            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
            this.setState({uploadJsonData: jsonData, file: file});

            const columns = Setting.getUserColumns().map(el => {
              return {title: el.split("#")[0], dataIndex: el, key: el};
            });
            this.setState({uploadColumns: columns}, () => {this.setState({showUploadModal: true});});
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            Setting.showMessage("error", `${t("general:Failed to upload")}: ${message}`);
          }
        };

        reader.onerror = (error) => {
          const message = (error as ProgressEvent<FileReader> & {message?: string})?.message || error;
          Setting.showMessage("error", `${t("general:Failed to upload")}: ${message}`);
        };

        reader.readAsArrayBuffer(file);
        return false;
      },
    };

    return (
      <>
        <Upload {...props}>
          <Button icon={<UploadOutlined />} id="upload-button" size="small">
            {t("general:Upload (.xlsx)")}
          </Button>
        </Upload>
        <Modal title={t("general:Upload (.xlsx)")}
          width={"100%"}
          closable={true}
          open={this.state.showUploadModal}
          okText={t("general:Click to Upload")}
          onOk = {() => {
            const formData = new FormData();
            formData.append("file", this.state.file as Blob);
            fetch(`${Setting.ServerUrl}/api/upload-users`, {
              method: "post",
              body: formData,
              credentials: "include",
              headers: {
                "Accept-Language": Setting.getAcceptLanguage(),
              },
            })
              .then((res) => res.json())
              .then((res) => {uploadThis.uploadFile(res);})
              .catch((error) => {
                Setting.showMessage("error", `${t("general:Failed to upload")}: ${error.message}`);
              });
          }}
          cancelText={t("general:Cancel")}
          onCancel={() => {this.setState({showUploadModal: false, uploadJsonData: [], uploadColumns: []});}}
        >
          <div style={{marginRight: "34px"}}>
            <Table scroll={{x: "max-content"}} dataSource={this.state.uploadJsonData} columns={this.state.uploadColumns} />
          </div>
        </Modal>
      </>
    );
  }

  handleToolbarSearch = (): void => {
    const pagination = {...this.state.pagination, current: 1};
    const advancedCondition = this.getActiveAdvancedQueryCondition();
    const queryField = advancedCondition?.field ?? this.state.queryField;
    const keyword = advancedCondition?.value ?? this.state.queryKeyword.trim();

    this.fetch({
      pagination,
      searchedColumn: keyword === "" ? undefined : queryField,
      searchText: keyword === "" ? undefined : keyword,
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

  handleToolbarFieldChange = (value: string): void => {
    this.setState(prevState => ({
      queryField: value,
      advancedQueryKeywords: createSingleAdvancedQueryKeyword(value, prevState.queryKeyword),
    }));
  };

  handleToolbarKeywordChange = (value: string): void => {
    this.setState(prevState => ({
      queryKeyword: value,
      advancedQueryKeywords: createSingleAdvancedQueryKeyword(prevState.queryField, value),
    }));
  };

  handleAdvancedFilterChange = (field: string, value: string): void => {
    this.setState({
      queryField: field,
      queryKeyword: value,
      advancedQueryKeywords: createSingleAdvancedQueryKeyword(field, value),
    });
  };

  getActiveAdvancedQueryCondition(): {field: string; value: string} | undefined {
    const activeCondition = Object.entries(this.state.advancedQueryKeywords || {})
      .map(([field, value]) => ({field, value: value.trim()}))
      .find(condition => condition.value !== "");
    return activeCondition;
  }

  handleTableChange: NonNullable<TableProps<UserRecord>["onChange"]> = (pagination, filters, sorter) => {
    const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortField = typeof normalizedSorter?.field === "string" ? normalizedSorter.field : typeof normalizedSorter?.columnKey === "string" ? normalizedSorter.columnKey : undefined;
    const sortOrder = normalizedSorter?.order ?? undefined;

    this.fetch({
      pagination,
      sortField,
      sortOrder,
      searchText: this.state.searchText,
      searchedColumn: this.state.searchedColumn,
    });
  };

  renderListActions(): React.ReactNode {
    return (
      <>
        <Button type="primary" size="small" onClick={this.addUser.bind(this)}>{t("general:Add")}</Button>
        <Button size="small" onClick={this.generateDownloadTemplate}>{t("general:Download template")} </Button>
        {this.renderUpload()}
      </>
    );
  }

  renderListToolbar(): React.ReactNode {
    return (
      <div className="enterprise-list-toolbar-shell">
        <EnterpriseListQueryToolbar
          title={t("general:Users")}
          total={this.state.pagination.total}
          showHeader={false}
          showTotal={false}
          fields={getUserQueryFields()}
          selectedField={this.state.queryField}
          keyword={this.state.queryKeyword}
          onFieldChange={this.handleToolbarFieldChange}
          onKeywordChange={this.handleToolbarKeywordChange}
          onSearch={this.handleToolbarSearch}
          onReset={this.handleToolbarReset}
          onAdvancedOpenChange={(advancedFiltersOpen) => this.setState({advancedFiltersOpen})}
          advancedFilters={this.renderAdvancedFilters()}
        />
      </div>
    );
  }

  renderAdvancedFilters(): React.ReactNode {
    return (
      <div className="enterprise-list-advanced-filters organization-advanced-filters">
        {
          getUserQueryFields().map(field => {
            const labelText = field.label;
            return (
              <label className="enterprise-list-filter-item organization-advanced-filter-item" key={field.value}>
                <span className="enterprise-list-filter-label organization-advanced-filter-label">{field.label}:</span>
                <Input
                  className="enterprise-list-filter-control organization-advanced-filter-input"
                  value={this.state.advancedQueryKeywords[field.value] ?? ""}
                  aria-label={`${t("general:Advanced filters", "Advanced filters")} ${labelText}`}
                  placeholder={t("general:Please input your search")}
                  allowClear
                  onChange={event => this.handleAdvancedFilterChange(field.value, event.target.value)}
                />
              </label>
            );
          })
        }
      </div>
    );
  }

  renderTable(users: UserRecord[]): React.ReactNode {
    const columns: UserListColumns = [
      {
        title: t("user:User identity", "User identity"),
        dataIndex: "name",
        key: "name",
        width: "28%",
        sorter: true,
        render: (_text, record) => renderUserIdentity(record),
      },
      {
        title: t("user:Contact", "Contact"),
        dataIndex: "email",
        key: "email",
        width: "20%",
        sorter: true,
        render: (_text, record) => renderUserContact(record),
      },
      {
        title: t("general:Source"),
        dataIndex: "owner",
        key: "owner",
        width: "16%",
        sorter: true,
        render: (_text, record) => renderUserSource(record),
      },
      {
        title: t("user:Is verified"),
        dataIndex: "isVerified",
        key: "isVerified",
        width: "12%",
        sorter: true,
        render: (_text, record) => renderUserStatus(record),
      },
      {
        title: t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "10%",
        sorter: true,
        render: (text) => Setting.getFormattedDate(text),
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "14%",
        render: (_text, record, index) => {
          const isTreePage = this.props.groupName !== undefined;
          const disabled = (record.owner === this.props.account.owner && record.name === this.props.account.name) || (record.owner === "built-in" && record.name === "admin");
          const deleteButton = (
            <Button
              className="user-row-action-delete"
              type="text"
              size="small"
              danger
              disabled={disabled}
              icon={<DeleteOutlined />}
            >
              {t("general:Delete")}
            </Button>
          );
          const removeButton = (
            <Button
              className="user-row-action-remove"
              type="text"
              size="small"
              danger
              disabled={disabled}
              icon={<UserDeleteOutlined />}
            >
              {t("general:remove")}
            </Button>
          );

          return (
            <ListPageRowActions className="user-row-actions">
              <Tooltip title={t("general:Impersonation")}>
                <Button
                  aria-label={t("general:Impersonation")}
                  className="user-row-action-impersonate"
                  size="small"
                  type="text"
                  icon={<LoginOutlined />}
                  onClick={() => {
                    this.impersonateUser(`${record.owner}/${record.name}`);
                  }}
                />
              </Tooltip>
              <Button size="small" type="link" icon={<EditOutlined />} onClick={() => {
                sessionStorage.setItem("userListUrl", window.location.pathname);
                this.props.history.push(`/users/${record.owner}/${record.name}`);
              }}>{t("general:Edit")}
              </Button>
              {isTreePage ?
                <Popconfirm
                  title={t("general:Sure to remove") + `: ${record.name} ?`}
                  onConfirm={() => this.removeUserFromGroup(index)}
                  okText={t("general:OK")}
                  cancelText={t("general:Cancel")}
                  okButtonProps={{danger: true}}
                >
                  {removeButton}
                </Popconfirm> : null}
              <Popconfirm
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteUser(index)}
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
    ];

    const filteredColumns = (Setting.filterTableColumns as (columns: UserListColumns, formItems?: FormItem[]) => UserListColumns)(columns, this.props.formItems ?? this.state.formItems);
    const paginationProps = this.getTablePaginationProps();

    return (
      <OrganizationIdentityCenter
        page="users"
        currentOrganization={this.state.organizationName || (Setting.isDefaultOrganizationSelected(this.props.account) ? t("general:All") : Setting.getRequestOrganization(this.props.account))}
        total={this.state.pagination.total}
        loadedCount={users.length}
        listAction={this.renderListActions()}
      >
        <div className="user-list-page-table-shell">
          <ListPageTable<UserRecord>
            className="user-list-table"
            scroll={getUserTableScroll(this.state.advancedFiltersOpen)}
            columns={filteredColumns}
            dataSource={users}
            rowKey={(record) => `${record.owner}/${record.name}`}
            pagination={paginationProps}
            title={() => this.renderListToolbar()}
            loading={this.state.loading}
            onChange={this.handleTableChange}
          />
        </div>
      </OrganizationIdentityCenter>
    );
  }

  fetch = (params: UserListFetchParams = {}): void => {
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    this.setState({loading: true});
    const pagination = params.pagination as TablePaginationConfig;
    if (this.props.match?.path === "/users") {
      (Setting.isDefaultOrganizationSelected(this.props.account) ? TypedUserBackend.getGlobalUsers(pagination.current, pagination.pageSize, field, value, sortField, sortOrder) : TypedUserBackend.getUsers(Setting.getRequestOrganization(this.props.account), pagination.current, pagination.pageSize, field, value, sortField, sortOrder))
        .then((res) => {
          this.setState({
            loading: false,
          });
          if (res.status === "ok") {
            this.setState({
              data: res.data as UserRecord[],
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
    } else {
      (this.props.groupName ?
        TypedUserBackend.getUsers(this.state.organizationName, pagination.current, pagination.pageSize, field, value, sortField, sortOrder, this.props.groupName) :
        TypedUserBackend.getUsers(this.state.organizationName, pagination.current, pagination.pageSize, field, value, sortField, sortOrder))
        .then((res) => {
          this.setState({
            loading: false,
          });
          if (res.status === "ok") {
            this.setState({
              data: res.data as UserRecord[],
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
    }
  };
}

export default UserListPage;
