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
import {Button, Popconfirm, Tooltip} from "antd";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as Provider from "./auth/Provider";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import AuthSourceCenter from "./AuthSourceCenter";
import ListPageTable from "./common/ListPageTable";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";
import ListPageIdentityCell from "./common/ListPageIdentityCell";
import ListPageRowActions from "./common/ListPageRowActions";

function getProviderQueryFields() {
  return [
    {label: i18next.t("general:Name"), value: "name"},
    {label: i18next.t("general:Display name"), value: "displayName"},
    {label: i18next.t("general:Organization"), value: "owner"},
    {label: i18next.t("general:Category"), value: "category"},
    {label: i18next.t("general:Type"), value: "type"},
    {label: i18next.t("provider:Client ID"), value: "clientId"},
    {label: i18next.t("provider:Provider URL"), value: "providerUrl"},
  ];
}

function renderProviderIdentity(record) {
  const displayName = record.displayName || record.name || "";
  const technicalName = record.name || "";

  return (
    <ListPageIdentityCell
      classPrefix="provider-table"
      title={displayName}
      titleTo={`/providers/${record.owner}/${technicalName}`}
      secondary={technicalName}
      copyValue=""
      copyLabel={`${i18next.t("general:Copy")} ${i18next.t("general:Name")}`}
      iconSrc={Setting.getProviderLogoURL(record)}
      iconAlt={displayName || technicalName}
      onCopiedMessage={i18next.t("general:Copied to clipboard successfully")}
    />
  );
}

function getProviderTableScroll() {
  if (Setting.isMobile()) {
    return {x: 920};
  }
  return {y: "calc(100vh - 580px)"};
}

class ProviderListPage extends BaseListPage {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      pagination: {
        ...this.state.pagination,
        pageSize: 20,
      },
      queryField: "name",
      queryKeyword: "",
    };
  }

  componentDidMount() {
    super.componentDidMount();
    this.setState({
      owner: Setting.isAdminUser(this.props.account) ? "admin" : this.props.account.owner,
    });
  }

  newProvider() {
    const randomName = Setting.getRandomName();
    const owner = Setting.isDefaultOrganizationSelected(this.props.account) ? this.state.owner : Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
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

  addProvider() {
    const newProvider = this.newProvider();
    ProviderBackend.addProvider(newProvider)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/providers/${newProvider.owner}/${newProvider.name}`, mode: "add"});
          Setting.showMessage("success", i18next.t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteProvider(i) {
    ProviderBackend.deleteProvider(this.state.data[i])
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully deleted"));
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: this.state.pagination.current > 1 && this.state.data.length === 1 ? this.state.pagination.current - 1 : this.state.pagination.current,
            },
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  handleToolbarSearch = () => {
    const pagination = {...this.state.pagination, current: 1};
    const keyword = String(this.state.queryKeyword || "").trim();
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

  handleToolbarReset = () => {
    const pagination = {...this.state.pagination, current: 1};
    this.setState({
      queryField: "name",
      queryKeyword: "",
      searchText: undefined,
      searchedColumn: undefined,
    }, () => this.fetch({pagination}));
  };

  handleProviderTableChange = (pagination, filters, sorter) => {
    const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const params = {
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

  renderListToolbar() {
    return (
      <div className="enterprise-list-toolbar-shell">
        <EnterpriseListQueryToolbar
          title={i18next.t("application:Providers")}
          total={this.state.pagination.total}
          showTotal={false}
          fields={getProviderQueryFields()}
          selectedField={this.state.queryField}
          keyword={this.state.queryKeyword}
          onFieldChange={(value) => this.setState({queryField: value})}
          onKeywordChange={(value) => this.setState({queryKeyword: value})}
          onSearch={this.handleToolbarSearch}
          onReset={this.handleToolbarReset}
          actions={(
            <Button id="add-button" type="primary" size="small" onClick={this.addProvider.bind(this)}>
              {i18next.t("general:Add")}
            </Button>
          )}
        />
      </div>
    );
  }

  renderTable(providers) {
    const columns = [
      {
        title: i18next.t("general:Identity source"),
        dataIndex: "name",
        key: "name",
        width: "18%",
        sorter: true,
        render: (text, record, index) => {
          return renderProviderIdentity(record);
        },
      },
      {
        title: i18next.t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "10%",
        sorter: true,
        render: (text, record, index) => {
          const ownerText = (text !== "admin") ? text : i18next.t("provider:admin (Shared)");
          return (
            <Tooltip title={ownerText || undefined}>
              <span className="provider-table-owner">{ownerText}</span>
            </Tooltip>
          );
        },
      },
      {
        title: i18next.t("general:Category"),
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
        render: (text, record, index) => {
          return <span className="provider-table-category">{Setting.getTag("default", text || "-")}</span>;
        },
      },
      {
        title: i18next.t("general:Type"),
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
        render: (text, record, index) => {
          return (
            <span className="provider-table-type">
              {Provider.getProviderLogoWidget(record, {disableLink: true})}
              <span>{text || "-"}</span>
            </span>
          );
        },
      },
      {
        title: i18next.t("provider:Client ID"),
        dataIndex: "clientId",
        key: "clientId",
        width: "13%",
        sorter: true,
        render: (text, record, index) => {
          return <span className="provider-table-client-id" title={text}>{Setting.getShortText(text)}</span>;
        },
      },
      {
        title: i18next.t("provider:Provider URL"),
        dataIndex: "providerUrl",
        key: "providerUrl",
        width: "16%",
        sorter: true,
        render: (text, record, index) => {
          if (!text) {
            return <span className="enterprise-list-secondary-text provider-table-empty-text">{i18next.t("general:empty")}</span>;
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
        title: i18next.t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "13%",
        sorter: true,
        render: (text, record, index) => {
          return <span className="provider-table-date">{Setting.getFormattedDate(text)}</span>;
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "13%",
        render: (text, record, index) => {
          const canModify = Setting.isAdminUser(this.props.account) || record.owner === this.props.account.owner;
          return (
            <ListPageRowActions className="provider-row-actions">
              <Button className="provider-row-primary-action" disabled={!canModify} size="small" type="link" icon={<EditOutlined />} onClick={() => this.props.history.push(`/providers/${record.owner}/${record.name}`)}>{i18next.t("general:Edit")}</Button>
              <Popconfirm
                title={i18next.t("general:Sure to delete") + `: ${record.name} ?`}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
                okButtonProps={{danger: true}}
                onConfirm={() => this.deleteProvider(index)}
                disabled={!canModify}
              >
                <Button className="provider-row-action-delete" disabled={!canModify} size="small" type="text" danger icon={<DeleteOutlined />}>{i18next.t("general:Delete")}</Button>
              </Popconfirm>
            </ListPageRowActions>
          );
        },
      },
    ];

    const filteredColumns = Setting.filterTableColumns(columns, this.props.formItems ?? this.state.formItems, "op", {
      preserveColumnWidth: true,
      preserveColumnTitle: true,
    });
    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="provider-list-page">
        <AuthSourceCenter providers={providers} loading={this.state.loading} />
        <div className="provider-list-page-table-shell">
          <ListPageTable scroll={getProviderTableScroll()} className="provider-list-table" columns={filteredColumns} dataSource={providers} rowKey={(record) => `${record.owner}/${record.name}`} pagination={paginationProps}
            title={() => this.renderListToolbar()}
            loading={this.state.loading}
            onChange={this.handleProviderTableChange}
          />
        </div>
      </div>
    );
  }

  fetch = (params = {}) => {
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
    (Setting.isDefaultOrganizationSelected(this.props.account) ? ProviderBackend.getGlobalProviders(params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      : ProviderBackend.getProviders(Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder))
      .then((res) => {
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

export default ProviderListPage;
