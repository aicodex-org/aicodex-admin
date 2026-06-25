// Copyright 2026 The Casdoor Authors. All Rights Reserved.
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
import {Button, Popconfirm} from "antd";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as KeyBackend from "./backend/KeyBackend";
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

interface KeyRecord {
  owner: string;
  name: string;
  [key: string]: LegacyAny;
}

function t(key: string, options?: LegacyAny): string {
  return String(i18next.t(key, options));
}

function getKeyQueryFields() {
  return [
    {label: t("general:Name"), value: "name"},
    {label: t("general:Display name"), value: "displayName"},
    {label: t("general:Organization"), value: "owner"},
    {
      label: t("general:Type"),
      value: "type",
      options: [
        {label: t("general:Organization"), value: "Organization"},
        {label: t("general:Application"), value: "Application"},
        {label: t("general:User"), value: "User"},
        {label: t("general:General"), value: "General"},
      ],
    },
    {label: t("key:Access key"), value: "accessKey"},
    {label: t("general:State"), value: "state", options: [{label: "Active", value: "Active"}, {label: "Inactive", value: "Inactive"}]},
  ];
}

function getKeyTableScroll(advancedFiltersOpen: boolean): {x?: number; y?: string} | undefined {
  if (Setting.isMobile()) {
    return {x: 900};
  }
  return {y: advancedFiltersOpen ? "calc(100vh - 414px)" : "calc(100vh - 360px)"};
}

const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, LegacyAny> & LegacyAny;

class KeyListPage extends LegacyBaseListPage {
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
      advancedQueryKeywords: createEmptyApplicationAccessQueryKeywords(getKeyQueryFields()),
      advancedFiltersOpen: false,
    };
  }

  newKey() {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `key_${randomName}`,
      createdTime: moment().format(),
      updatedTime: moment().format(),
      displayName: `New Key - ${randomName}`,
      type: "Organization",
      organization: owner,
      application: "",
      user: "",
      accessKey: "",
      accessSecret: "",
      expireTime: "",
      state: "Active",
    };
  }

  addKey() {
    const newKey = this.newKey();
    KeyBackend.addKey(newKey)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/keys/${newKey.owner}/${newKey.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteKey(i: number) {
    KeyBackend.deleteKey(this.state.data[i])
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
      getKeyQueryFields(),
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
      advancedQueryKeywords: createEmptyApplicationAccessQueryKeywords(getKeyQueryFields()),
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
      getKeyQueryFields(),
      this.state.advancedQueryKeywords || {},
      this.handleAdvancedFilterChange
    );
  }

  renderListToolbar(): React.ReactNode {
    return (
      <EnterpriseListQueryToolbar
        title={t("general:Keys")}
        total={this.state.pagination.total}
        showTotal={false}
        fields={getKeyQueryFields()}
        selectedField={this.state.queryField}
        keyword={this.state.queryKeyword}
        onFieldChange={(value) => this.setState({queryField: value, queryKeyword: ""})}
        onKeywordChange={(value) => this.setState({queryKeyword: value})}
        onSearch={this.handleToolbarSearch}
        onReset={this.handleToolbarReset}
        onAdvancedOpenChange={(advancedFiltersOpen) => this.setState({advancedFiltersOpen})}
        keywordControl={renderApplicationAccessKeywordControl(getKeyQueryFields(), this.state.queryField, this.state.queryKeyword, (value) => this.setState({queryKeyword: value}), this.handleToolbarSearch)}
        advancedFilters={this.renderAdvancedFilters()}
        actionsPlacement="topRight"
        actions={<Button type="primary" size="small" onClick={this.addKey.bind(this)}>{t("general:Add")}</Button>}
      />
    );
  }

  renderTable(keys: KeyRecord[]) {
    const columns: LegacyColumn<KeyRecord>[] = legacyColumns<KeyRecord>([
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "16%",
        sorter: true,
        ellipsis: true,
        render: (text, record, index) => {
          return (
            <Link className="enterprise-list-inline-link" to={`/keys/${record.owner}/${text}`} title={text}>
              {text}
            </Link>
          );
        },
      },
      {
        title: t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
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
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "17%",
        sorter: true,
        ellipsis: true,
      },
      {
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "10%",
        sorter: true,
        ellipsis: true,
      },
      {
        title: t("key:Access key"),
        dataIndex: "accessKey",
        key: "accessKey",
        width: "20%",
        sorter: true,
        ellipsis: true,
      },
      {
        title: t("general:Updated time"),
        dataIndex: "updatedTime",
        key: "updatedTime",
        width: "13%",
        sorter: true,
        render: (text, record, index) => {
          return <span className="enterprise-list-secondary-text">{Setting.getFormattedDate(text)}</span>;
        },
      },
      {
        title: t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "10%",
        sorter: true,
        ellipsis: true,
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "12%",
        render: (text, record, index) => {
          const deleteButton = (
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
              {t("general:Delete")}
            </Button>
          );
          return (
            <ListPageRowActions className="key-row-actions">
              <Button size="small" type="link" icon={<EditOutlined />} onClick={() => this.props.history.push(`/keys/${record.owner}/${record.name}`)}>{t("general:Edit")}</Button>
              <Popconfirm
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteKey(index)}
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
      <div className="enterprise-list-page-table-shell key-list-page-table-shell">
        <ListPageTable<KeyRecord> scroll={getKeyTableScroll(this.state.advancedFiltersOpen)} className="key-list-table" columns={columns} dataSource={keys} rowKey={(record: KeyRecord) => `${record.owner}/${record.name}`} pagination={paginationProps}
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
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    (Setting.isDefaultOrganizationSelected(this.props.account) ? (KeyBackend.getGlobalKeys as LegacyAny)(params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      : (KeyBackend.getKeys as LegacyAny)(Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder))
      .then((res: LegacyBackendResponse<KeyRecord[]>) => {
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

export default KeyListPage as unknown as React.ComponentType<AdminRouteProps>;
