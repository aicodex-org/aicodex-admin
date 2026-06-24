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
import {Button, Popconfirm} from "antd";
import {DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as CertBackend from "./backend/CertBackend";
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

interface CertRecord {
  owner: string;
  name: string;
  type?: string;
  [key: string]: LegacyAny;
}

function t(key: string, options?: LegacyAny): string {
  return String(i18next.t(key, options));
}

function getCertQueryFields() {
  return [
    {label: t("general:Name"), value: "name"},
    {label: t("general:Display name"), value: "displayName"},
    {label: t("general:Organization"), value: "owner"},
    {label: t("provider:Scope"), value: "scope", options: [{label: "JWT", value: "JWT"}]},
    {label: t("general:Type"), value: "type", options: [{label: "x509", value: "x509"}, {label: "Payment", value: "Payment"}, {label: "SSL", value: "SSL"}]},
    {label: t("cert:Crypto algorithm"), value: "cryptoAlgorithm", options: [{label: "RS256", value: "RS256"}]},
  ];
}

function getCertTableScroll(advancedFiltersOpen: boolean): {x?: number; y?: string} | undefined {
  if (Setting.isMobile()) {
    return {x: 900};
  }
  return {y: advancedFiltersOpen ? "calc(100vh - 414px)" : "calc(100vh - 360px)"};
}

const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, LegacyAny> & LegacyAny;

class CertListPage extends LegacyBaseListPage {
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
      advancedQueryKeywords: createEmptyApplicationAccessQueryKeywords(getCertQueryFields()),
      advancedFiltersOpen: false,
    };
  }

  componentDidMount() {
    super.componentDidMount();
    this.setState({
      owner: Setting.isAdminUser(this.props.account) ? "admin" : this.props.account.owner,
    });
  }

  newCert() {
    const randomName = Setting.getRandomName();
    const owner = Setting.isDefaultOrganizationSelected(this.props.account) ? this.state.owner : Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `cert_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Cert - ${randomName}`,
      scope: "JWT",
      type: "x509",
      cryptoAlgorithm: "RS256",
      bitSize: 4096,
      expireInYears: 20,
      certificate: "",
      privateKey: "",
    };
  }

  addCert() {
    const newCert = this.newCert();
    CertBackend.addCert(newCert)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/certs/${newCert.owner}/${newCert.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteCert(i: number) {
    CertBackend.deleteCert(this.state.data[i])
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

  refreshCert(i: number) {
    const cert = this.state.data[i];
    CertBackend.refreshDomainExpire(cert.owner, cert.name)
      .then((res) => {
        if (res.status === "error") {
          Setting.showMessage("error", `Failed to refresh domain expire: ${res.msg}`);
        } else {
          Setting.showMessage("success", "Domain expire refreshed successfully");
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: this.state.pagination.current > 1 && this.state.data.length === 1 ? this.state.pagination.current - 1 : this.state.pagination.current,
            },
          });
        }
      }
      )
      .catch(error => {
        Setting.showMessage("error", `Domain expire failed to refresh: ${error}`);
      });
  }

  handleToolbarSearch = (): void => {
    const pagination = {...this.state.pagination, current: 1};
    const condition = getActiveApplicationAccessQueryCondition(
      getCertQueryFields(),
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
      advancedQueryKeywords: createEmptyApplicationAccessQueryKeywords(getCertQueryFields()),
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
      getCertQueryFields(),
      this.state.advancedQueryKeywords || {},
      this.handleAdvancedFilterChange
    );
  }

  renderListToolbar(): React.ReactNode {
    return (
      <EnterpriseListQueryToolbar
        title={t("general:Certs")}
        total={this.state.pagination.total}
        showTotal={false}
        fields={getCertQueryFields()}
        selectedField={this.state.queryField}
        keyword={this.state.queryKeyword}
        onFieldChange={(value) => this.setState({queryField: value, queryKeyword: ""})}
        onKeywordChange={(value) => this.setState({queryKeyword: value})}
        onSearch={this.handleToolbarSearch}
        onReset={this.handleToolbarReset}
        onAdvancedOpenChange={(advancedFiltersOpen) => this.setState({advancedFiltersOpen})}
        keywordControl={renderApplicationAccessKeywordControl(getCertQueryFields(), this.state.queryField, this.state.queryKeyword, (value) => this.setState({queryKeyword: value}), this.handleToolbarSearch)}
        advancedFilters={this.renderAdvancedFilters()}
        actions={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={this.addCert.bind(this)}>{t("general:Add")}</Button>}
      />
    );
  }

  renderTable(certs: CertRecord[]) {
    const columns: LegacyColumn<CertRecord>[] = legacyColumns<CertRecord>([
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "16%",
        sorter: true,
        ellipsis: true,
        render: (text, record, index) => {
          return (
            <Link className="enterprise-list-inline-link" to={`/certs/${record.owner}/${text}`} title={text}>
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
          return (text !== "admin") ? text : t("provider:admin (Shared)");
        },
      },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "18%",
        sorter: true,
        ellipsis: true,
      },
      {
        title: t("provider:Scope"),
        dataIndex: "scope",
        key: "scope",
        width: "9%",
        sorter: true,
        ellipsis: true,
      },
      {
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "9%",
        sorter: true,
        ellipsis: true,
      },
      {
        title: t("cert:Crypto algorithm"),
        dataIndex: "cryptoAlgorithm",
        key: "cryptoAlgorithm",
        width: "13%",
        sorter: true,
        ellipsis: true,
      },
      {
        title: t("cert:Bit size"),
        dataIndex: "bitSize",
        key: "bitSize",
        width: "8%",
        sorter: true,
      },
      {
        title: t("cert:Expire in years"),
        dataIndex: "expireInYears",
        key: "expireInYears",
        width: "10%",
        sorter: true,
      },
      {
        title: t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "13%",
        sorter: true,
        render: (text, record, index) => {
          return <span className="enterprise-list-secondary-text">{Setting.getFormattedDate(text)}</span>;
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "12%",
        render: (text, record, index) => {
          const disabled = !Setting.isAdminUser(this.props.account) && (record.owner !== this.props.account.owner);
          const deleteButton = (
            <Button disabled={disabled} type="text" size="small" danger icon={<DeleteOutlined />}>
              {t("general:Delete")}
            </Button>
          );
          return (
            <ListPageRowActions className="cert-row-actions" wrap>
              {
                record.type === "SSL" ? (
                  <Button disabled={disabled} size="small" type="text" icon={<ReloadOutlined />} onClick={() => this.refreshCert(index)}>{t("general:Refresh")}
                  </Button>
                ) : null
              }
              <Button disabled={disabled} size="small" type="link" icon={<EditOutlined />} onClick={() => this.props.history.push(`/certs/${record.owner}/${record.name}`)}>{t("general:Edit")}</Button>
              <Popconfirm
                disabled={disabled}
                title={t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteCert(index)}
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
      <div className="cert-list-page-table-shell">
        <ListPageTable<CertRecord> scroll={getCertTableScroll(this.state.advancedFiltersOpen)} className="cert-list-table" columns={columns} dataSource={certs} rowKey={(record: CertRecord) => `${record.owner}/${record.name}`} pagination={paginationProps}
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
    if (params.category !== undefined && params.category !== null) {
      field = "category";
      value = params.category;
    } else if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    (Setting.isDefaultOrganizationSelected(this.props.account) ? (CertBackend.getGlobalCerts as LegacyAny)(params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      : (CertBackend.getCerts as LegacyAny)(Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder))
      .then((res: LegacyBackendResponse<CertRecord[]>) => {
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

export default CertListPage as unknown as React.ComponentType<AdminRouteProps>;
