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
import {Button, Input, Modal, Popconfirm, Space, Table, Tag, Tooltip, Upload} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import {CopyOutlined, DeleteOutlined, EditOutlined, UploadOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as GroupBackend from "./backend/GroupBackend";
import type {GroupQueryValue, GroupRecord} from "./backend/GroupBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import ListPageTable from "./common/ListPageTable";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";
import * as XLSX from "xlsx";
import copy from "copy-to-clipboard";

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
  advancedQueryKeywords: Record<string, string>;
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

type GroupFilterCondition = {
  field: string;
  value: string;
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

function t(key: string, defaultValue = key, options: Record<string, unknown> = {}): string {
  const translated = i18next.t(key, {defaultValue, ...options}) as unknown;
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
    {label: t("general:Display name"), value: "displayName"},
    {label: t("group:Parent group"), value: "parentId"},
  ];
}

function createEmptyAdvancedQueryKeywords(): Record<string, string> {
  return getGroupQueryFields().reduce((keywords, field) => ({
    ...keywords,
    [field.value]: "",
  }), {} as Record<string, string>);
}

function normalizeGroupFilterValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(" ");
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function matchesGroupConditions(group: GroupRecord, conditions: GroupFilterCondition[]): boolean {
  return conditions.every(condition => {
    const actualValue = normalizeGroupFilterValue(group[condition.field]).toLowerCase();
    return actualValue.includes(condition.value.toLowerCase());
  });
}

function renderCompactLink(text: string | undefined, to: string, className = "group-table-id-link"): React.ReactNode {
  const value = text || "";
  return (
    <Tooltip title={value || undefined}>
      <Link className={className} to={to} title={value}>
        {value}
      </Link>
    </Tooltip>
  );
}

function renderGroupIdentity(record: GroupRecord): React.ReactNode {
  const groupName = record.name || "";
  const displayName = record.displayName || groupName;

  return (
    <div className="group-table-group-cell">
      <Link className="group-table-group-name" to={`/groups/${record.owner}/${groupName}`} title={displayName}>
        {displayName}
      </Link>
      <div className="group-table-group-meta">
        <Tooltip title={groupName || undefined}>
          <span className="group-table-group-id" title={groupName}>{groupName}</span>
        </Tooltip>
        {
          groupName ? (
            <Button
              aria-label={`${t("general:Copy")} ${t("general:Name")}`}
              className="group-table-copy-id"
              icon={<CopyOutlined />}
              size="small"
              type="text"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                copy(groupName);
                Setting.showMessage("success", t("general:Copied to clipboard successfully"));
              }}
            />
          ) : null
        }
      </div>
    </div>
  );
}

function renderUserCount(users?: string[]): React.ReactNode {
  const values = Array.isArray(users) ? users.filter(Boolean) : [];
  if (values.length === 0) {
    return <Tag className="group-table-user-count group-table-user-count-empty">{t("general:No users")}</Tag>;
  }

  return (
    <Tooltip title={values.join(", ")}>
      <Tag className="group-table-user-count">{t("general:User count", "{{count}} users", {count: values.length})}</Tag>
    </Tooltip>
  );
}

function getGroupTableScroll(): TableProps<GroupRecord>["scroll"] | undefined {
  if (Setting.isMobile()) {
    return {x: 760};
  }
  return {y: "calc(100vh - 360px)"};
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
      pagination: {
        ...this.state.pagination,
        pageSize: 20,
      },
      queryField: "name",
      queryKeyword: "",
      queryType: undefined,
      advancedQueryKeywords: createEmptyAdvancedQueryKeywords(),
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
    if (this.hasAdvancedQueryKeywords()) {
      this.fetchAdvancedFilteredGroups({
        pagination,
        type: this.state.queryType,
      });
      return;
    }

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

  handleTableChange: NonNullable<TableProps<GroupRecord>["onChange"]> = (pagination, filters, sorter) => {
    const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortField = typeof normalizedSorter?.field === "string" ? normalizedSorter.field : undefined;
    const sortOrder = normalizedSorter?.order ?? undefined;
    const params: GroupListFetchParams = {
      pagination,
      sortField,
      sortOrder,
    };

    if (this.hasAdvancedQueryKeywords()) {
      this.fetchAdvancedFilteredGroups(params);
      return;
    }

    this.fetch({
      ...params,
      searchText: this.state.searchText,
      searchedColumn: this.state.searchedColumn,
    });
  };

  getAdvancedQueryConditions(): GroupFilterCondition[] {
    return Object.entries(this.state.advancedQueryKeywords || {})
      .map(([field, value]) => ({field, value: value.trim()}))
      .filter(condition => condition.value !== "");
  }

  getActiveQueryConditions(): GroupFilterCondition[] {
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

  getFilteredPageData(groups: GroupRecord[], pagination: TablePaginationConfig): GroupRecord[] {
    const current = typeof pagination.current === "number" && pagination.current > 0 ? pagination.current : 1;
    const pageSize = typeof pagination.pageSize === "number" && pagination.pageSize > 0 ? pagination.pageSize : groups.length || 10;
    const start = (current - 1) * pageSize;
    return groups.slice(start, start + pageSize);
  }

  renderAdvancedFilters(): React.ReactNode {
    return (
      <div className="organization-advanced-filters">
        {
          getGroupQueryFields().map(field => {
            const labelText = field.label;
            return (
              <label className="organization-advanced-filter-item" key={field.value}>
                <span className="organization-advanced-filter-label">{field.label}:</span>
                <Input
                  className="organization-advanced-filter-input"
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

  renderListToolbar(): React.ReactNode {
    return (
      <div className="enterprise-list-toolbar-shell">
        <EnterpriseListQueryToolbar
          title={t("general:Groups")}
          total={this.state.pagination.total}
          showTotal={false}
          fields={getGroupQueryFields()}
          selectedField={this.state.queryField}
          keyword={this.state.queryKeyword}
          onFieldChange={(value) => this.setState({queryField: value})}
          onKeywordChange={(value) => this.setState({queryKeyword: value})}
          onSearch={this.handleToolbarSearch}
          onReset={this.handleToolbarReset}
          advancedFilters={this.renderAdvancedFilters()}
          actions={(
            <>
              <Button type="primary" size="small" onClick={this.addGroup.bind(this)}>{t("general:Add")}</Button>
              <Button size="small" onClick={this.generateDownloadTemplate}>{t("general:Download template")} </Button>
              {this.renderUpload()}
            </>
          )}
        />
      </div>
    );
  }

  renderTable(data: GroupRecord[]): React.ReactNode {
    const columns: GroupListColumns = [
      {
        title: t("general:Groups"),
        dataIndex: "displayName",
        key: "group",
        width: "40%",
        sorter: true,
        render: (_text: unknown, record: GroupRecord) => {
          return renderGroupIdentity(record);
        },
      },
      {
        title: t("group:Parent group"),
        dataIndex: "parentId",
        key: "parentId",
        width: "20%",
        sorter: true,
        render: (_text: unknown, record: GroupRecord) => {
          if (record.isTopGroup) {
            return renderCompactLink(record.parentId, `/organizations/${record.parentId}`, "group-table-parent-link");
          }
          return renderCompactLink(record.parentName || record.parentId, `/groups/${record.owner}/${record.parentId}`, "group-table-parent-link");
        },
      },
      {
        title: t("general:Users"),
        dataIndex: "users",
        key: "users",
        width: "10%",
        render: (text: string[] | undefined) => {
          return renderUserCount(text);
        },
      },
      {
        title: t("general:Updated time"),
        dataIndex: "updatedTime",
        key: "updatedTime",
        width: "17%",
        sorter: true,
        render: (text: string) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "13%",
        render: (_text: unknown, record: GroupRecord, index: number) => {
          const deleteButton = (
            <Button
              className="group-row-action-delete"
              type="text"
              size="small"
              danger
              disabled={record.haveChildren}
              icon={<DeleteOutlined />}
            >
              {t("general:Delete")}
            </Button>
          );

          return (
            <Space className="group-row-actions" size={4} wrap={false}>
              <Button
                className="group-row-action-edit"
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => this.props.history.push(`/groups/${record.owner}/${record.name}`)}
              >
                {t("general:Edit")}
              </Button>
              {
                record.haveChildren ? <Tooltip placement="topLeft" title={t("group:You need to delete all subgroups first. You can view the subgroups in the left group tree of the [Organizations] -> [Groups] page")}>
                  <span className="group-row-disabled-action">
                    {deleteButton}
                  </span>
                </Tooltip> :
                  <Popconfirm
                    title={t("general:Sure to delete") + `: ${record.name} ?`}
                    onConfirm={() => this.deleteGroup(index)}
                    okText={t("general:OK")}
                    cancelText={t("general:Cancel")}
                    okButtonProps={{danger: true}}
                  >
                    {deleteButton}
                  </Popconfirm>
              }
            </Space>
          );
        },
      },
    ];

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="group-list-page-table-shell">
        <ListPageTable<GroupRecord>
          className="group-list-table"
          scroll={getGroupTableScroll()}
          columns={columns}
          dataSource={data}
          rowKey={(record) => `${record.owner}/${record.name}`}
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
    GroupBackend.getGroups(this.getRequestOrganization(), false, pagination.current, pagination.pageSize, field, value, sortField, sortOrder)
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

  fetchAdvancedFilteredGroups = (params: GroupListFetchParams = {}): void => {
    const pagination = params.pagination || this.state.pagination;
    const typeConditions = params.type === undefined || params.type === null ? [] : [{
      field: "type",
      value: normalizeGroupFilterValue(params.type).trim(),
    }];
    const conditions = [
      ...this.getActiveQueryConditions(),
      ...typeConditions,
    ].filter(condition => condition.value !== "");
    this.setState({loading: true});
    // 群组后端仍是单字段 field + value 查询；高级筛选先取当前组织范围列表，再在前端按所有非空条件 AND 过滤。
    GroupBackend.getGroups(this.getRequestOrganization(), false, "", "", undefined, undefined, params.sortField, params.sortOrder)
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          const filteredGroups = (res.data || []).filter(group => matchesGroupConditions(group, conditions));
          this.setState({
            data: this.getFilteredPageData(filteredGroups, pagination),
            pagination: {
              ...pagination,
              total: filteredGroups.length,
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
