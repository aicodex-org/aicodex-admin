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
import {Button, Modal, Space, Switch, Table, Upload} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import {UploadOutlined} from "@ant-design/icons";
import moment from "moment";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import * as UserBackend from "./backend/UserBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import PopconfirmModal from "./common/modal/PopconfirmModal";
import AccountAvatar from "./account/AccountAvatar";
import * as XLSX from "xlsx";
import OrganizationIdentityCenter from "./OrganizationIdentityCenter";

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

class UserListPage extends TypedBaseListPage {
  constructor(props: UserListPageProps) {
    super(props);
    this.state = {
      ...this.state,
      organization: null,
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

  renderTable(users: UserRecord[]): React.ReactNode {
    const columns: UserListColumns = [
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: (Setting.isMobile()) ? "100px" : "120px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("owner"),
        render: (text, record, index) => {
          return (
            <Link to={`/organizations/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Application"),
        dataIndex: "signupApplication",
        key: "signupApplication",
        width: (Setting.isMobile()) ? "100px" : "120px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("signupApplication"),
        render: (text, record, index) => {
          return (
            <Link to={`/applications/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: (Setting.isMobile()) ? "80px" : "110px",
        fixed: "left",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/users/${record.owner}/${text}`}>
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
        render: (text, record, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        // width: '100px',
        sorter: true,
        ...this.getColumnSearchProps("displayName"),
      },
      {
        title: t("general:Avatar"),
        dataIndex: "avatar",
        key: "avatar",
        width: "80px",
        render: (text, record, index) => {
          return (
            <a target="_blank" rel="noreferrer" href={text}>
              <AccountAvatar referrerPolicy="no-referrer" src={text} alt={text} size={50} />
            </a>
          );
        },
      },
      {
        title: t("general:Email"),
        dataIndex: "email",
        key: "email",
        width: "160px",
        sorter: true,
        ...this.getColumnSearchProps("email"),
        render: (text, record, index) => {
          return (
            <a href={`mailto:${text}`}>
              {text}
            </a>
          );
        },
      },
      {
        title: t("general:Phone"),
        dataIndex: "phone",
        key: "phone",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("phone"),
      },
      {
        title: t("user:Affiliation"),
        dataIndex: "affiliation",
        key: "affiliation",
        width: "140px",
        sorter: true,
        ...this.getColumnSearchProps("affiliation"),
      },
      {
        title: t("application:Real name"),
        dataIndex: "realName",
        key: "realName",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("realName"),
      },
      {
        title: t("user:Is verified"),
        dataIndex: "isVerified",
        key: "isVerified",
        width: "120px",
        sorter: true,
        render: (text, record, index) => {
          return (
            <Switch checked={text} disabled={true} />
          );
        },
      },
      {
        title: t("user:Country/Region"),
        dataIndex: "region",
        key: "region",
        width: "140px",
        sorter: true,
        ...this.getColumnSearchProps("region"),
        render: (text, record, index) => {
          return Setting.initCountries().getName(record.region || "", Setting.getLanguage(), {select: "official"});
        },
      },
      {
        title: t("general:User type"),
        dataIndex: "type",
        key: "type",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("type"),
      },
      {
        title: t("user:Tag"),
        dataIndex: "tag",
        key: "tag",
        width: "110px",
        sorter: true,
        ...this.getColumnSearchProps("tag"),
        render: (text, record, index) => {
          if (this.state.organization?.tags?.length === 0) {
            return text;
          }

          const tagMap: Record<string, string> = {};
          this.state.organization?.tags?.map((tag, index) => {
            const tokens = tag.split("|");
            const displayValue = Setting.getLanguage() !== "zh" ? tokens[0] : tokens[1];
            tagMap[tokens[0]] = displayValue;
          });
          return tagMap[String(text)];
        },
      },
      {
        title: t("user:Register type"),
        dataIndex: "registerType",
        key: "registerType",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("registerType"),
      },
      {
        title: t("user:Register source"),
        dataIndex: "registerSource",
        key: "registerSource",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("registerSource"),
      },
      {
        title: t("user:Balance"),
        dataIndex: "balance",
        key: "balance",
        width: "120px",
        sorter: true,
        render: (text, record, index) => {
          return text ?? 0;
        },
      },
      {
        title: t("organization:Balance credit"),
        dataIndex: "balanceCredit",
        key: "balanceCredit",
        width: "120px",
        sorter: true,
        render: (text, record, index) => {
          return text ?? 0;
        },
      },
      {
        title: t("organization:Balance currency"),
        dataIndex: "balanceCurrency",
        key: "balanceCurrency",
        width: "140px",
        sorter: true,
        render: (text, record, index) => {
          return text || "USD";
        },
      },
      {
        title: t("user:Is admin"),
        dataIndex: "isAdmin",
        key: "isAdmin",
        width: "120px",
        sorter: true,
        render: (text, record, index) => {
          return (
            <Switch disabled checkedChildren={t("general:ON")} unCheckedChildren={t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: t("user:Is forbidden"),
        dataIndex: "isForbidden",
        key: "isForbidden",
        width: "110px",
        sorter: true,
        render: (text, record, index) => {
          return (
            <Switch disabled checkedChildren={t("general:ON")} unCheckedChildren={t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: t("user:Is deleted"),
        dataIndex: "isDeleted",
        key: "isDeleted",
        width: "110px",
        sorter: true,
        render: (text, record, index) => {
          return (
            <Switch disabled checkedChildren={t("general:ON")} unCheckedChildren={t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "190px",
        fixed: Setting.isMobile() ? false : "right",
        render: (text, record, index) => {
          const isTreePage = this.props.groupName !== undefined;
          const disabled = (record.owner === this.props.account.owner && record.name === this.props.account.name) || (record.owner === "built-in" && record.name === "admin");
          return (
            <Space>
              <Button size={isTreePage ? "small" : "middle"} type="primary" onClick={() => {
                this.impersonateUser(`${record.owner}/${record.name}`);
              }}>{t("general:Impersonation")}
              </Button>
              <Button size={isTreePage ? "small" : "middle"} type="primary" onClick={() => {
                sessionStorage.setItem("userListUrl", window.location.pathname);
                this.props.history.push(`/users/${record.owner}/${record.name}`);
              }}>{t("general:Edit")}
              </Button>
              {isTreePage ?
                <PopconfirmModal
                  text={t("general:remove")}
                  title={t("general:Sure to remove") + `: ${record.name} ?`}
                  onConfirm={() => this.removeUserFromGroup(index)}
                  disabled={disabled}
                  size="small"
                /> : null}
              <PopconfirmModal
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteUser(index)}
                disabled={disabled}
                size={isTreePage ? "small" : "default"}
              />
            </Space>
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
      >
        <Table scroll={{x: "max-content"}} columns={filteredColumns} dataSource={users} rowKey={(record) => `${record.owner}/${record.name}`} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {t("general:Users")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button style={{marginRight: "15px"}} type="primary" size="small" onClick={this.addUser.bind(this)}>{t("general:Add")} </Button>
              <Button style={{marginRight: "15px"}} type="primary" size="small" onClick={this.generateDownloadTemplate}>{t("general:Download template")} </Button>
              {
                this.renderUpload()
              }
            </div>
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
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
