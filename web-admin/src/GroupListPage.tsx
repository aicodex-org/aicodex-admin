// Copyright 2023 The Casdoor Authors. All Rights Reserved.
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
import {Button, Modal, Select, Table, Tooltip, Upload} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import {UploadOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as GroupBackend from "./backend/GroupBackend";
import type {GroupQueryValue, GroupRecord} from "./backend/GroupBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import PopconfirmModal from "./common/modal/PopconfirmModal";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";
import * as XLSX from "xlsx";

interface GroupListPageProps {
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
}

type UploadPreviewRow = Record<string, unknown>;

interface GroupListPageState {
  owner: string;
  groups: GroupRecord[];
  data: GroupRecord[];
  pagination: TablePaginationConfig;
  loading: boolean;
  searchText?: GroupQueryValue;
  searchedColumn?: string;
  isAuthorized?: boolean;
  uploadJsonData: UploadPreviewRow[];
  uploadColumns: TableProps<UploadPreviewRow>["columns"];
  showUploadModal?: boolean;
  file?: Blob;
  queryField: string;
  queryKeyword: string;
  queryType?: string;
}

type GroupListColumns = TableProps<GroupRecord>["columns"];

type GroupListFetchParams = {
  pagination?: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: GroupQueryValue;
  sortField?: string;
  sortOrder?: string | null;
  category?: GroupQueryValue;
  type?: GroupQueryValue;
};

// BaseListPage 仍是 legacy JS；本 change 只声明群组列表页实际使用的继承边界。
type LegacyBaseListPageCompat = React.Component<GroupListPageProps, GroupListPageState> & {
  getColumnSearchProps: (dataIndex: string, customRender?: unknown) => Record<string, unknown>;
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<GroupRecord>["onChange"]>;
};

const TypedBaseListPage = BaseListPage as unknown as {
  new(props: GroupListPageProps): LegacyBaseListPageCompat;
};

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

function getGroupColumnNames(): string[] {
  return Setting.getGroupColumns() as string[];
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

function getGroupQueryFields() {
  return [
    {label: t("general:Name"), value: "name"},
    {label: t("general:Organization"), value: "owner"},
    {label: t("general:Display name"), value: "displayName"},
    {label: t("group:Parent group"), value: "parentId"},
    {label: t("general:Users"), value: "users"},
  ];
}

class GroupListPage extends TypedBaseListPage {
  constructor(props: GroupListPageProps) {
    super(props);
    this.state = {
      ...this.state,
      owner: Setting.isAdminUser(this.props.account) ? "" : this.props.account.owner,
      groups: [],
      uploadJsonData: [],
      uploadColumns: [],
      queryField: "name",
      queryKeyword: "",
      queryType: undefined,
    };
  }

  UNSAFE_componentWillMount(): void {
    super.UNSAFE_componentWillMount?.();
  }

  newGroup(): GroupRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `group_${randomName}`,
      createdTime: moment().format(),
      updatedTime: moment().format(),
      displayName: `New Group - ${randomName}`,
      type: "Virtual",
      parentId: this.props.account.owner,
      isTopGroup: true,
      isEnabled: true,
    };
  }

  addGroup(): void {
    const newGroup = this.newGroup();
    GroupBackend.addGroup(newGroup)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/groups/${newGroup.owner}/${newGroup.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteGroup(i: number): void {
    GroupBackend.deleteGroup(this.state.data[i])
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
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  uploadFile(info: {status?: string; msg?: string}): void {
    const {status, msg} = info;
    if (status === "ok") {
      Setting.showMessage("success", t("general:Successfully saved"));
      const {pagination} = this.state;
      this.fetch({pagination});
    } else if (status === "error") {
      Setting.showMessage("error", `${t("general:Failed to upload")}: ${msg}`);
    }
    this.setState({uploadJsonData: [], uploadColumns: [], showUploadModal: false});
  }

  generateDownloadTemplate(): void {
    const groupObj: Record<string, null> = {};
    const items = getGroupColumnNames();
    items.forEach((item) => {
      groupObj[item] = null;
    });
    const worksheet = XLSX.utils.json_to_sheet([groupObj]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "import-group.xlsx", {compression: true});
  }

  renderUpload(): React.ReactNode {
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

            const columns = getGroupColumnNames().map(el => {
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
            fetch(`${Setting.ServerUrl}/api/upload-groups`, {
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

  handleToolbarSearch = (): void => {
    const pagination = {...this.state.pagination, current: 1};
    const keyword = this.state.queryKeyword.trim();
    // 群组后端仍是单字段过滤；关键词查询优先沿用 searchedColumn/searchText，空关键词时才使用类型筛选。
    if (keyword !== "") {
      this.fetch({
        pagination,
        searchedColumn: this.state.queryField,
        searchText: keyword,
      });
      return;
    }

    this.fetch({
      pagination,
      type: this.state.queryType,
    });
  };

  handleToolbarReset = (): void => {
    const pagination = {...this.state.pagination, current: 1};
    this.setState({
      queryField: "name",
      queryKeyword: "",
      queryType: undefined,
      searchText: undefined,
      searchedColumn: undefined,
    }, () => this.fetch({pagination}));
  };

  renderListToolbar(): React.ReactNode {
    return (
      <EnterpriseListQueryToolbar
        title={t("general:Groups")}
        total={this.state.pagination.total}
        fields={getGroupQueryFields()}
        selectedField={this.state.queryField}
        keyword={this.state.queryKeyword}
        onFieldChange={(value) => this.setState({queryField: value})}
        onKeywordChange={(value) => this.setState({queryKeyword: value})}
        onSearch={this.handleToolbarSearch}
        onReset={this.handleToolbarReset}
        primaryFilters={(
          <Select
            allowClear
            className="enterprise-list-query-toolbar-filter"
            placeholder={t("general:Type")}
            value={this.state.queryType}
            onChange={(value) => this.setState({queryType: value})}
            options={[
              {label: t("group:Virtual"), value: "Virtual"},
              {label: t("group:Physical"), value: "Physical"},
            ]}
          />
        )}
        advancedFilters={<span>{t("general:Advanced filters", "Advanced filters")}</span>}
        actions={(
          <>
            <Button type="primary" size="small" onClick={this.addGroup.bind(this)}>{t("general:Add")}</Button>
            <Button size="small" onClick={this.generateDownloadTemplate}>{t("general:Download template")} </Button>
            {this.renderUpload()}
          </>
        )}
      />
    );
  }

  renderTable(data: GroupRecord[]): React.ReactNode {
    const columns: GroupListColumns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "150px",
        fixed: "left",
        sorter: true,
        render: (text: string, record: GroupRecord) => {
          return (
            <Link to={`/groups/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "140px",
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
        width: "180px",
        sorter: true,
        render: (text: string) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:Updated time"),
        dataIndex: "updatedTime",
        key: "updatedTime",
        width: "180px",
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
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "140px",
        sorter: true,
        filterMultiple: false,
        filters: [
          {text: t("group:Virtual"), value: "Virtual"},
          {text: t("group:Physical"), value: "Physical"},
        ],
        render: (text: string) => {
          return t("group:" + text);
        },
      },
      {
        title: t("group:Parent group"),
        dataIndex: "parentId",
        key: "parentId",
        width: "220px",
        sorter: true,
        render: (_text: unknown, record: GroupRecord) => {
          if (record.isTopGroup) {
            return <Link to={`/organizations/${record.parentId}`}>
              {record.parentId}
            </Link>;
          }
          return <Link to={`/groups/${record.owner}/${record.parentId}`}>
            {record?.parentName}
          </Link>;
        },
      },
      {
        title: t("general:Users"),
        dataIndex: "users",
        key: "users",
        sorter: true,
        render: (text: string[]) => {
          return (Setting.getTags as (tags?: string[], urlPrefix?: string | null) => React.ReactNode)(text, "users");
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "180px",
        fixed: Setting.isMobile() ? false : "right",
        render: (_text: unknown, record: GroupRecord, index: number) => {
          return (
            <div>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.props.history.push(`/groups/${record.owner}/${record.name}`)}>{t("general:Edit")}</Button>
              {
                record.haveChildren ? <Tooltip placement="topLeft" title={t("group:You need to delete all subgroups first. You can view the subgroups in the left group tree of the [Organizations] -> [Groups] page")}>
                  <Button disabled type="primary" danger>{t("general:Delete")}</Button>
                </Tooltip> :
                  <PopconfirmModal
                    title={t("general:Sure to delete") + `: ${record.name} ?`}
                    onConfirm={() => this.deleteGroup(index)}
                  >
                  </PopconfirmModal>
              }
            </div>
          );
        },
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <div>
        <Table
          scroll={{x: "max-content"}}
          columns={columns}
          dataSource={data}
          rowKey={(record) => `${record.owner}/${record.name}`}
          size="middle"
          bordered
          pagination={paginationProps}
          title={() => this.renderListToolbar()}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params: GroupListFetchParams = {}): void => {
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
    const pagination = params.pagination || this.state.pagination;
    GroupBackend.getGroups(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), false, pagination.current, pagination.pageSize, field, value, sortField, sortOrder)
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data || [],
            pagination: {
              ...pagination,
              total: typeof res.data2 === "number" ? res.data2 : typeof res.data2 === "string" ? Number(res.data2) : pagination.total,
            },
            searchText: params.searchText,
            searchedColumn: params.searchedColumn,
          });
        } else {
          if (Setting.isResponseDenied(res)) {
            this.setState({
              isAuthorized: false,
            });
          }
        }
      })
      .catch(error => {
        this.setState({
          loading: false,
        });
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  };
}

export default GroupListPage;
