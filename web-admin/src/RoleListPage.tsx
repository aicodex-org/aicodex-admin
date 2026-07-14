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
import {Button, Modal, Switch, Table, Upload} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as RoleBackend from "./backend/RoleBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowDeleteAction, ListPageRowEditAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";
import {UploadOutlined} from "@ant-design/icons";
import * as XLSX from "xlsx";
import OrganizationIdentityCenter from "./OrganizationIdentityCenter";

type RoleRecord = {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  users: string[];
  groups: string[];
  roles: string[];
  domains: string[];
  isEnabled: boolean;
};

type RoleListPageProps = {
  account: {
    owner?: string;
    name?: string;
    isAdmin?: boolean;
    [key: string]: unknown;
  };
  history: {
    push: (location: string | {pathname: string; mode?: string}) => void;
  };
  match?: {
    path?: string;
    params?: Record<string, string | undefined>;
  };
};

type UploadPreviewRow = Record<string, unknown>;

type RoleListPageState = {
  data: RoleRecord[];
  pagination: TablePaginationConfig;
  loading: boolean;
  searchText?: string;
  searchedColumn?: string;
  isAuthorized?: boolean;
  uploadJsonData: UploadPreviewRow[];
  uploadColumns: TableProps<UploadPreviewRow>["columns"];
  showUploadModal?: boolean;
  file?: Blob;
  [key: string]: unknown;
};

type RoleListFetchParams = {
  pagination: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: string;
  sortField?: string;
  sortOrder?: string | null;
  type?: string;
};

type RoleListResponse = {
  status: string;
  msg?: string;
  data?: RoleRecord[];
  data2?: number | string;
};

type MutationResponse = {
  status: string;
  msg?: string;
};

type RoleBackendApi = {
  getRoles: (
    owner: string,
    page?: number,
    pageSize?: number,
    field?: string,
    value?: string,
    sortField?: string,
    sortOrder?: string | null
  ) => Promise<RoleListResponse>;
  addRole: (role: RoleRecord) => Promise<MutationResponse>;
  deleteRole: (role: RoleRecord) => Promise<MutationResponse>;
};

type RoleListColumns = TableProps<RoleRecord>["columns"];

// BaseListPage 仍是 legacy JS；这里仅声明角色列表页实际依赖的继承边界。
type LegacyBaseListPageCompat = React.Component<RoleListPageProps, RoleListPageState> & {
  getColumnSearchProps: (dataIndex: string, customRender?: unknown) => Record<string, unknown>;
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<RoleRecord>["onChange"]>;
};

const TypedBaseListPage = BaseListPage as unknown as {
  new(props: RoleListPageProps): LegacyBaseListPageCompat;
};

const roleBackend = RoleBackend as unknown as RoleBackendApi;
const getTags = Setting.getTags as (tags?: string[], urlPrefix?: string | null) => React.ReactNode;

const queryFields = [
  {label: t("general:Name"), value: "name"},
  {label: t("general:Organization"), value: "owner"},
  {label: t("general:Display name"), value: "displayName"},
  {label: t("role:Sub users"), value: "users"},
  {label: t("role:Sub groups"), value: "groups"},
  {label: t("role:Sub roles"), value: "roles"},
  {label: t("role:Sub domains"), value: "domains"},
];

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

function getRoleColumnNames(): string[] {
  return Setting.getRoleColumns() as string[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as {message?: unknown}).message;
    return message === undefined ? String(error) : String(message);
  }
  return String(error);
}

class RoleListPage extends TypedBaseListPage {
  constructor(props: RoleListPageProps) {
    super(props);
    this.state = {
      ...this.state,
      uploadJsonData: [],
      uploadColumns: [],
    };
  }

  newRole(): RoleRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `role_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Role - ${randomName}`,
      users: [],
      groups: [],
      roles: [],
      domains: [],
      isEnabled: true,
    };
  }

  addRole(): void {
    const newRole = this.newRole();
    this.props.history.push({pathname: `/roles/${newRole.owner}/${newRole.name}`, state: {mode: "add", role: newRole}} as never);
  }

  deleteRole(i: number): void {
    roleBackend.deleteRole(this.state.data[i])
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully deleted"));
          const current = this.state.pagination.current;
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: current !== undefined && current > 1 && this.state.data.length === 1 ? current - 1 : current,
            },
          });
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch((_error: unknown) => {

      });
  }

  uploadRoleFile(info: MutationResponse): void {
    const {status, msg} = info;
    if (status === "ok") {
      Setting.showMessage("success", "Roles uploaded successfully, refreshing the page");
      const {pagination} = this.state;
      this.fetch({pagination});
    } else if (status === "error") {
      Setting.showMessage("error", `${t("general:Failed to upload")}: ${msg}`);
    }
    this.setState({uploadJsonData: [], uploadColumns: [], showUploadModal: false});
  }

  generateDownloadTemplate(): void {
    const roleObj: Record<string, null> = {};
    const items = getRoleColumnNames();
    items.forEach((item) => {
      roleObj[item] = null;
    });
    const worksheet = XLSX.utils.json_to_sheet([roleObj]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "import-role.xlsx", {compression: true});
  }

  renderRoleUpload(): React.ReactNode {
    const uploadThis = this;
    const props: React.ComponentProps<typeof Upload> = {
      name: "file",
      accept: ".xlsx",
      showUploadList: false,
      beforeUpload: (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const binary = e.target?.result;

          try {
            const workbook = XLSX.read(binary, {type: "array"});
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
              Setting.showMessage("error", t("general:No sheets found in file"));
              return;
            }

            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<UploadPreviewRow>(worksheet);
            this.setState({uploadJsonData: jsonData, file: file as Blob});

            const columns = getRoleColumnNames().map(el => {
              return {title: el.split("#")[0], dataIndex: el, key: el};
            });
            this.setState({uploadColumns: columns}, () => {this.setState({showUploadModal: true});});
          } catch (err) {
            Setting.showMessage("error", `${t("general:Failed to upload")}: ${getErrorMessage(err)}`);
          }
        };

        reader.onerror = (error) => {
          Setting.showMessage("error", `${t("general:Failed to upload")}: ${getErrorMessage(error)}`);
        };

        reader.readAsArrayBuffer(file);
        return false;
      },
    };

    return (
      <>
        <Upload {...props}>
          <Button icon={<UploadOutlined />} size="small">
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
            fetch(`${Setting.ServerUrl}/api/upload-roles`, {
              method: "post",
              body: formData,
              credentials: "include",
              headers: {
                "Accept-Language": Setting.getAcceptLanguage(),
              },
            })
              .then((res) => res.json())
              .then((res) => {uploadThis.uploadRoleFile(res);})
              .catch((error) => {
                Setting.showMessage("error", `${t("general:Failed to upload")}: ${getErrorMessage(error)}`);
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
  renderTable(roles: RoleRecord[]): React.ReactNode {
    const columns: RoleListColumns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "150px",
        sorter: true,
        render: (text: string, record: RoleRecord) => {
          return (
            <Link to={`/roles/${record.owner}/${encodeURIComponent(record.name)}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "120px",
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
        width: "200px",
        sorter: true,
      },
      {
        title: t("role:Sub users"),
        dataIndex: "users",
        key: "users",
        // width: '100px',
        sorter: true,
        render: (text: string[]) => {
          return getTags(text, "users");
        },
      },
      {
        title: t("role:Sub groups"),
        dataIndex: "groups",
        key: "groups",
        // width: '100px',
        sorter: true,
        render: (text: string[]) => {
          return getTags(text, "groups");
        },
      },
      {
        title: t("role:Sub roles"),
        dataIndex: "roles",
        key: "roles",
        // width: '100px',
        sorter: true,
        render: (text: string[]) => {
          return getTags(text, "roles");
        },
      },
      {
        title: t("role:Sub domains"),
        dataIndex: "domains",
        key: "domains",
        sorter: true,
        render: (text: string[]) => {
          return Setting.getTags(text);
        },
      },
      {
        title: t("general:Is enabled"),
        dataIndex: "isEnabled",
        key: "isEnabled",
        width: "120px",
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
        width: "170px",
        render: (_text: unknown, record: RoleRecord, index: number) => {
          return (
            <ListPageRowActions className="role-row-actions">
              <ListPageRowEditAction onClick={() => this.props.history.push(`/roles/${record.owner}/${encodeURIComponent(record.name)}`)} />
              <ListPageRowDeleteAction
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteRole(index)}
              />
            </ListPageRowActions>
          );
        },
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <OrganizationIdentityCenter
        page="roles"
        currentOrganization={Setting.isDefaultOrganizationSelected(this.props.account) ? t("general:All") : Setting.getRequestOrganization(this.props.account)}
        total={this.state.pagination.total}
        loadedCount={roles.length}
      >
        <div className="enterprise-list-page-table-shell role-list-page-table-shell">
          <ListPageTable<RoleRecord> columns={columns} dataSource={roles} rowKey={(record) => `${record.owner}/${record.name}`} pagination={paginationProps}
            title={() => (
              <LegacyListPageToolbar
                host={this}
                title={t("general:Roles")}
                total={this.state.pagination.total}
                fields={queryFields}
                defaultField="name"
                actions={(
                  <>
                    <Button type="primary" onClick={this.addRole.bind(this)}>{t("general:Add")}</Button>
                    <Button onClick={this.generateDownloadTemplate}>{t("general:Download template")} </Button>
                    {this.renderRoleUpload()}
                  </>
                )}
              />
            )}
            loading={this.state.loading}
            onChange={this.handleTableChange}
          />
        </div>
      </OrganizationIdentityCenter>
    );
  }

  fetch = (params = {} as RoleListFetchParams): void => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    roleBackend.getRoles(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: RoleListResponse) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data || [],
            pagination: {
              ...params.pagination,
              total: typeof res.data2 === "number" ? res.data2 : typeof res.data2 === "string" ? Number(res.data2) : params.pagination.total,
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

export default RoleListPage;
