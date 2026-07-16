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
import {Button, Modal, Table, Tag, Upload} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import * as PermissionBackend from "./backend/PermissionBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowDeleteAction, ListPageRowEditAction} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";
import {UploadOutlined} from "@ant-design/icons";
import * as XLSX from "xlsx";
import OrganizationIdentityCenter from "./OrganizationIdentityCenter";

type PermissionRecord = {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  users: string[];
  groups: string[];
  roles: string[];
  domains: string[];
  model?: string;
  resourceType: string;
  resources: string[];
  actions: string[];
  effect: string;
  isEnabled: boolean;
  submitter: string;
  approver: string;
  approveTime: string;
  state: string;
};

type PermissionListPageProps = {
  account: {
    owner: string;
    name: string;
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

type PermissionListPageState = {
  data: PermissionRecord[];
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

type PermissionListFetchParams = {
  pagination: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: string;
  sortField?: string;
  sortOrder?: string | null;
  type?: string;
};

type PermissionListResponse = {
  status: string;
  msg?: string;
  data?: PermissionRecord[];
  data2?: number | string;
};

type MutationResponse = {
  status: string;
  msg?: string;
};

type GetPermissions = (
  owner: string,
  page?: number,
  pageSize?: number,
  field?: string,
  value?: string,
  sortField?: string,
  sortOrder?: string | null
) => Promise<PermissionListResponse>;

type PermissionBackendApi = {
  getPermissions: GetPermissions;
  getPermissionsBySubmitter: GetPermissions;
  addPermission: (permission: PermissionRecord) => Promise<MutationResponse>;
  deletePermission: (permission: PermissionRecord) => Promise<MutationResponse>;
};

type PermissionListColumns = TableProps<PermissionRecord>["columns"];

// BaseListPage 仍是 legacy JS；这里仅声明权限列表页实际依赖的继承边界。
type LegacyBaseListPageCompat = React.Component<PermissionListPageProps, PermissionListPageState> & {
  getColumnSearchProps: (dataIndex: string, customRender?: unknown) => Record<string, unknown>;
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<PermissionRecord>["onChange"]>;
};

const TypedBaseListPage = BaseListPage as unknown as {
  new(props: PermissionListPageProps): LegacyBaseListPageCompat;
};

const permissionBackend = PermissionBackend as unknown as PermissionBackendApi;
const queryFields = [
  {label: t("general:Name"), value: "name"},
  {label: t("general:Organization"), value: "owner"},
  {label: t("general:Display name"), value: "displayName"},
  {label: t("general:Model"), value: "model"},
  {label: t("role:Sub users"), value: "users"},
  {label: t("role:Sub groups"), value: "groups"},
  {label: t("role:Sub roles"), value: "roles"},
  {label: t("general:Resources"), value: "resources"},
  {label: t("permission:Actions"), value: "actions"},
  {label: t("general:State"), value: "state"},
];

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

function getPermissionColumnNames(): string[] {
  return Setting.getPermissionColumns() as string[];
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

function renderPermissionTags(tags: string[] | undefined, scope: string, getLabel: (tag: string) => string = tag => tag): React.ReactElement[] {
  // key 使用未翻译业务值，避免语言切换改变 React identity；label 只负责可见文案与颜色。
  const occurrences = new Map<string, number>();
  return (tags || []).map(tag => {
    const occurrence = occurrences.get(tag) || 0;
    occurrences.set(tag, occurrence + 1);
    const label = getLabel(tag);
    return (
      <Tag key={JSON.stringify([scope, tag, occurrence])} color={Setting.getTagColor(label)}>
        {label}
      </Tag>
    );
  });
}

class PermissionListPage extends TypedBaseListPage {
  constructor(props: PermissionListPageProps) {
    super(props);
    this.state = {
      ...this.state,
      uploadJsonData: [],
      uploadColumns: [],
    };
  }

  newPermission(): PermissionRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `permission_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Permission - ${randomName}`,
      users: [`${this.props.account.owner}/${this.props.account.name}`],
      groups: [],
      roles: [],
      domains: [],
      model: "",
      resourceType: "Application",
      resources: [Conf.DefaultApplication],
      actions: ["Read"],
      effect: "Allow",
      isEnabled: true,
      submitter: this.props.account.name,
      approver: "",
      approveTime: "",
      state: Setting.isLocalAdminUser(this.props.account) ? "Approved" : "Pending",
    };
  }

  addPermission(): void {
    const newPermission = this.newPermission();
    this.props.history.push({pathname: `/permissions/${newPermission.owner}/${newPermission.name}`, state: {mode: "add", permission: newPermission}} as never);
  }

  deletePermission(i: number): void {
    permissionBackend.deletePermission(this.state.data[i])
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
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  uploadPermissionFile(info: MutationResponse): void {
    const {status, msg} = info;
    if (status === "ok") {
      Setting.showMessage("success", "Permissions uploaded successfully, refreshing the page");
      const {pagination} = this.state;
      this.fetch({pagination});
    } else if (status === "error") {
      Setting.showMessage("error", `${t("general:Failed to upload")}: ${msg}`);
    }
    this.setState({uploadJsonData: [], uploadColumns: [], showUploadModal: false});
  }

  generateDownloadTemplate(): void {
    const permissionObj: Record<string, null> = {};
    const items = getPermissionColumnNames();
    items.forEach((item) => {
      permissionObj[item] = null;
    });
    const worksheet = XLSX.utils.json_to_sheet([permissionObj]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "import-permission.xlsx", {compression: true});
  }

  renderPermissionUpload(): React.ReactNode {
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

            const columns = getPermissionColumnNames().map(el => {
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
            fetch(`${Setting.ServerUrl}/api/upload-permissions`, {
              method: "post",
              body: formData,
              credentials: "include",
              headers: {
                "Accept-Language": Setting.getAcceptLanguage(),
              },
            })
              .then((res) => res.json())
              .then((res) => {uploadThis.uploadPermissionFile(res);})
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

  renderTable(permissions: PermissionRecord[]): React.ReactNode {
    const columns: PermissionListColumns = [
      // https://github.com/ant-design/ant-design/issues/22184
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "120px",
        sorter: true,
        render: (text: string, record: PermissionRecord) => {
          return (
            <Link to={`/permissions/${record.owner}/${encodeURIComponent(text)}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "100px",
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
        title: t("general:Model"),
        dataIndex: "model",
        key: "model",
        width: "140px",
        sorter: true,
        render: (text: string) => {
          return (
            <Link to={`/models/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Resources"),
        dataIndex: "resources",
        key: "resources",
        width: "120px",
        sorter: true,
        render: (text: string[]) => {
          return renderPermissionTags(text, "permission-resources");
        },
      },
      {
        title: t("permission:Actions"),
        dataIndex: "actions",
        key: "actions",
        width: "100px",
        sorter: true,
        render: (text: string[]) => {
          return renderPermissionTags(text, "permission-actions", tag => {
            switch (tag) {
            case "Read":
              return t("permission:Read");
            case "Write":
              return t("permission:Write");
            case "Admin":
              return t("general:Admin");
            default:
              return tag;
            }
          });
        },
      },
      {
        title: t("permission:Effect"),
        dataIndex: "effect",
        key: "effect",
        width: "80px",
        sorter: true,
        render: (text: string) => {
          switch (text) {
          case "Allow":
            return Setting.getTag("success", t("permission:Allow"));
          case "Deny":
            return Setting.getTag("error", t("permission:Deny"));
          default:
            return null;
          }
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
          case "Approved":
            return Setting.getTag("success", t("permission:Approved"));
          case "Pending":
            return Setting.getTag("error", t("permission:Pending"));
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
        render: (_text: unknown, record: PermissionRecord, index: number) => {
          return (
            <ListPageRowActions className="permission-row-actions">
              <ListPageRowEditAction onClick={() => this.props.history.push(`/permissions/${record.owner}/${encodeURIComponent(record.name)}`)} />
              <ListPageRowDeleteAction
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deletePermission(index)}
              />
            </ListPageRowActions>
          );
        },
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <OrganizationIdentityCenter
        page="permissions"
        currentOrganization={Setting.isDefaultOrganizationSelected(this.props.account) ? t("general:All") : Setting.getRequestOrganization(this.props.account)}
        total={this.state.pagination.total}
        loadedCount={permissions.length}
      >
        <div className="enterprise-list-page-table-shell permission-list-page-table-shell">
          <ListPageTable<PermissionRecord> columns={columns} dataSource={permissions} rowKey={(record) => `${record.owner}/${record.name}`} pagination={paginationProps}
            title={() => (
              <LegacyListPageToolbar
                host={this}
                title={t("general:Permissions")}
                total={this.state.pagination.total}
                fields={queryFields}
                defaultField="name"
                actions={(
                  <>
                    <Button id="add-button" type="primary" onClick={this.addPermission.bind(this)}>{t("general:Add")}</Button>
                    <Button onClick={this.generateDownloadTemplate}>{t("general:Download template")} </Button>
                    {this.renderPermissionUpload()}
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

  fetch = (params = {} as PermissionListFetchParams): void => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});

    const getPermissions = Setting.isLocalAdminUser(this.props.account) ? permissionBackend.getPermissions : permissionBackend.getPermissionsBySubmitter;
    getPermissions(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: PermissionListResponse) => {
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

export default PermissionListPage;
