// Copyright 2023 The casbin Authors. All Rights Reserved.
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
import {Button, Popconfirm, Table, Tag, Tooltip} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as SiteBackend from "./backend/SiteBackend";
import i18nextLib from "i18next";
import BaseListPage from "./BaseListPage";

const i18next = {t: (key: string) => i18nextLib.t(key) as string};

interface SiteListPageProps {
  account: {owner: string; tag?: string; [key: string]: unknown};
  history: {push: (path: string) => void};
  match?: {path?: string; params?: Record<string, string>};
}

interface SiteNodeRecord {
  name: string;
  version: string;
  message: string;
  provider: string;
}

interface SiteRecord {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  domain: string;
  tag?: string;
  otherDomains: string[];
  needRedirect: boolean;
  disableVerbose: boolean;
  rules: string[];
  enableAlert: boolean;
  alertInterval: number;
  alertTryTimes: number;
  alertProviders: string[];
  challenges: string[];
  host: string;
  port: number;
  hosts: string[];
  sslMode: string;
  sslCert: string;
  publicIp: string;
  node: string;
  isSelf: boolean;
  nodes: SiteNodeRecord[];
  casdoorApplication: string;
  organizations: string[];
  status?: string;
  [key: string]: unknown;
}

interface SiteListPageState {
  data: SiteRecord[];
  pagination: TablePaginationConfig;
  loading: boolean;
  searchText?: string;
  searchedColumn?: string;
  formItems?: unknown[];
}

type LegacyBaseListPageCompat = React.Component<SiteListPageProps, SiteListPageState> & {
  getColumnSearchProps: (dataIndex: string, customRender?: unknown) => Record<string, unknown>;
  getTablePaginationProps: (overrides?: Record<string, unknown>) => TablePaginationConfig;
  handleTableChange: NonNullable<TableProps<SiteRecord>["onChange"]>;
};

// BaseListPage 仍是 legacy JS class，本页只声明当前迁移需要调用的成员，避免扩大到共享基类迁移。
const TypedBaseListPage = BaseListPage as unknown as {
  new(props: SiteListPageProps): LegacyBaseListPageCompat;
};

interface BackendResponse<T> {
  status?: string;
  data?: T;
  data2?: number;
  msg?: string;
  [key: string]: unknown;
}

interface FetchParams {
  pagination?: TablePaginationConfig;
  searchedColumn?: string;
  searchText?: string;
  sortField?: string;
  sortOrder?: string;
}

type SiteBackendCompat = {
  getGlobalSites: () => Promise<BackendResponse<SiteRecord[]>>;
  getSites: (
    owner: string,
    page?: string | number,
    pageSize?: string | number,
    field?: string,
    value?: string,
    sortField?: string,
    sortOrder?: string
  ) => Promise<BackendResponse<SiteRecord[]>>;
  addSite: (site: SiteRecord) => Promise<BackendResponse<unknown>>;
  deleteSite: (site: SiteRecord) => Promise<BackendResponse<unknown>>;
};

const siteBackend = SiteBackend as unknown as SiteBackendCompat;

type SiteListColumns = TableProps<SiteRecord>["columns"];

class SiteListPage extends TypedBaseListPage {

  constructor(props: SiteListPageProps) {
    super(props);
  }

  UNSAFE_componentWillMount() {
    this.setState({
      pagination: {
        ...this.state.pagination,
        current: 1,
        pageSize: 1000,
      },
    });
    this.fetch({pagination: this.state.pagination});
  }

  newSite(): SiteRecord {
    const randomName = Setting.getRandomName();
    const owner = Setting.getRequestOrganization(this.props.account);
    return {
      owner: owner,
      name: `site_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Site - ${randomName}`,
      domain: "aicodex-admin.local",
      otherDomains: [],
      needRedirect: false,
      disableVerbose: false,
      rules: [],
      enableAlert: false,
      alertInterval: 60,
      alertTryTimes: 3,
      alertProviders: [],
      challenges: [],
      host: "",
      port: 8000,
      hosts: [],
      sslMode: "HTTPS Only",
      sslCert: "",
      publicIp: "8.131.81.162",
      node: "",
      isSelf: false,
      nodes: [],
      casdoorApplication: "",
      organizations: [],
    };
  }

  addSite(): void {
    const newSite = this.newSite();
    siteBackend.addSite(newSite)
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "error") {
          Setting.showMessage("error", `Failed to add: ${res.msg}`);
        } else {
          Setting.showMessage("success", "Site added successfully");
          this.setState({
            data: Setting.prependRow(this.state.data, newSite),
          });
          this.fetch();
        }
      }
      )
      .catch(error => {
        Setting.showMessage("error", `Site failed to add: ${error}`);
      });
  }

  deleteSite(i: number): void {
    siteBackend.deleteSite(this.state.data[i])
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "error") {
          Setting.showMessage("error", `Failed to delete: ${res.msg}`);
        } else {
          Setting.showMessage("success", "Site deleted successfully");
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: (this.state.pagination.current ?? 1) > 1 && this.state.data.length === 1 ? (this.state.pagination.current ?? 1) - 1 : this.state.pagination.current,
            },
          });
        }
      }
      )
      .catch(error => {
        Setting.showMessage("error", `Site failed to delete: ${error}`);
      });
  }

  renderTable(data: SiteRecord[]): React.ReactNode {
    // const renderExternalLink = () => {
    //   return (
    //     <svg style={{marginLeft: "5px"}} width="13.5" height="13.5" aria-hidden="true" viewBox="0 0 24 24" className="iconExternalLink_nPIU">
    //       <path fill="currentColor" d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"></path>
    //     </svg>
    //   );
    // };

    const columns: SiteListColumns = [
      {
        title: i18next.t("general:Owner"),
        dataIndex: "owner",
        key: "owner",
        width: "90px",
        sorter: (a, b) => a.owner.localeCompare(b.owner),
      },
      {
        title: i18next.t("general:Tag"),
        dataIndex: "tag",
        key: "tag",
        width: "140px",
        sorter: (a, b) => (a.tag ?? "").localeCompare(b.tag ?? ""),
        render: (text, record, index) => {
          if (text === "") {
            return null;
          }
          return (
            <Link to={`/nodes/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "120px",
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (text, record, index) => {
          return (
            <Link to={`/sites/${record.owner}/${record.name}`}>
              {text}
            </Link>
          );
        },
      },
      // {
      //   title: i18next.t("general:Create time"),
      //   dataIndex: "createdTime",
      //   key: "createdTime",
      //   width: "180px",
      //   sorter: (a, b) => a.createdTime.localeCompare(b.createdTime),
      //   render: (text, record, index) => {
      //     return Setting.getFormattedDate(text);
      //   },
      // },
      {
        title: i18next.t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        // width: "200px",
        sorter: (a, b) => a.displayName.localeCompare(b.displayName),
      },
      {
        title: i18next.t("site:Domain"),
        dataIndex: "domain",
        key: "domain",
        width: "150px",
        sorter: (a, b) => a.domain.localeCompare(b.domain),
        render: (text, record, index) => {
          if (record.publicIp === "") {
            return text;
          }

          return (
            <a target="_blank" rel="noreferrer" href={`https://${text}`}>
              {text}
            </a>
          );
        },
      },
      {
        title: i18next.t("site:Other domains"),
        dataIndex: "otherDomains",
        key: "otherDomains",
        width: "120px",
        sorter: (a, b) => String(a.otherDomains).localeCompare(String(b.otherDomains)),
        render: (text, record, index) => {
          return record.otherDomains.map(domain => {
            return (
              <a key={domain} target="_blank" rel="noreferrer" href={`https://${domain}`}>
                <Tag color={record.needRedirect ? "default" : "processing"}>
                  {domain}
                </Tag>
              </a>
            );
          });
        },
      },
      {
        title: i18next.t("general:Rules"),
        dataIndex: "rules",
        key: "rules",
        width: "120px",
        sorter: (a, b) => String(a.rules).localeCompare(String(b.rules)),
        render: (text, record, index) => {
          if (!record.rules) {
            return null;
          }

          return record.rules.map(rule => {
            return (
              <a key={rule} target="_blank" rel="noreferrer" href={`/rules/${rule}`}>
                <Tag color={"processing"}>
                  {rule}
                </Tag>
              </a>
            );
          });
        },
      },
      {
        title: i18next.t("site:Host"),
        dataIndex: "host",
        key: "host",
        width: "80px",
        sorter: (a, b) => a.host.localeCompare(b.host),
        render: (text, record, index) => {
          let host: string | number = record.port;
          if (record.host !== "") {
            host = `${record.host}:${record.port}`;
          }

          if (record.status === "Active") {
            return host;
          }

          return (
            <Tag color={"warning"}>
              {host}
            </Tag>
          );
        },
      },
      {
        title: i18next.t("site:Hosts"),
        dataIndex: "hosts",
        key: "hosts",
        width: "200px",
        sorter: (a, b) => a.hosts.length - b.hosts.length,
        render: (hosts) => {
          if (!Array.isArray(hosts)) {
            return null;
          }
          return hosts.map((host, index) => (
            <Tag color="blue" key={index}>
              {host}
            </Tag>
          ));
        },
      },
      {
        title: i18next.t("site:Nodes"),
        dataIndex: "nodes",
        key: "nodes",
        width: "180px",
        sorter: (a, b) => a.nodes.length - b.nodes.length,
        render: (text, record, index) => {
          return record.nodes.map(node => {
            const versionInfo = Setting.getVersionInfo(node.version, record.name);
            let color = node.message === "" ? "processing" : "error";
            if (color === "processing" && node.provider !== "") {
              if (node.version === "") {
                color = "warning";
              } else if (node.provider !== "") {
                color = "success";
              }
            }

            const getTag = () => {
              if (versionInfo === null) {
                return (
                  <Tag key={node.name} color={color}>
                    {node.name}
                  </Tag>
                );
              } else {
                return (
                  <a key={node.name} target="_blank" rel="noreferrer" href={versionInfo.link}>
                    <Tag color={color}>
                      {`${node.name} (${versionInfo.text})`}
                    </Tag>
                  </a>
                );
              }
            };

            if (node.message === "") {
              return getTag();
            } else {
              return (
                <Tooltip key={node.name} title={node.message}>
                  {getTag()}
                </Tooltip>
              );
            }
          });
        },
      },
      // {
      //   title: i18next.t("site:Public IP"),
      //   dataIndex: "publicIp",
      //   key: "publicIp",
      //   width: "120px",
      //   sorter: (a, b) => a.publicIp.localeCompare(b.publicIp),
      // },
      // {
      //   title: i18next.t("site:Node"),
      //   dataIndex: "node",
      //   key: "node",
      //   width: "180px",
      //   sorter: (a, b) => a.node.localeCompare(b.node),
      //   render: (text, record, index) => {
      //     return (
      //       <div>
      //         {text}
      //         {
      //           !record.isSelf ? null : (
      //             <Tag style={{marginLeft: "10px"}} icon={<CheckCircleOutlined />} color="success">
      //               {i18next.t("general:Self")}
      //             </Tag>
      //           )
      //         }
      //       </div>
      //     );
      //   },
      // },
      // {
      //   title: i18next.t("site:Mode"),
      //   dataIndex: "sslMode",
      //   key: "sslMode",
      //   width: "100px",
      //   sorter: (a, b) => a.sslMode.localeCompare(b.sslMode),
      // },
      {
        title: i18next.t("site:SSL cert"),
        dataIndex: "sslCert",
        key: "sslCert",
        width: "130px",
        sorter: (a, b) => a.sslCert.localeCompare(b.sslCert),
        render: (text, record, index) => {
          return (
            <Link to={`/certs/admin/${text}`}>
              {text}
            </Link>
          );
        },
      },
      // {
      //   title: i18next.t("site:aicodex-admin app"),
      //   dataIndex: "casdoorApplication",
      //   key: "casdoorApplication",
      //   width: "140px",
      //   sorter: (a, b) => a.casdoorApplication.localeCompare(b.casdoorApplication),
      //   render: (text, record, index) => {
      //     if (text === "") {
      //       return null;
      //     }
      //
      //     return (
      //       <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.state.account).replace("/account", `/applications/${this.props.account.owner}/${text}`)}>
      //         {text}
      //         {renderExternalLink()}
      //       </a>
      //     );
      //   },
      // },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "180px",
        render: (text, record, index) => {
          return (
            <div>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.props.history.push(`/sites/${record.owner}/${record.name}`)}>{i18next.t("general:Edit")}</Button>
              <Popconfirm
                title={`Sure to delete site: ${record.name} ?`}
                onConfirm={() => this.deleteSite(index)}
                okText="OK"
                cancelText="Cancel"
              >
                <Button style={{marginBottom: "10px"}} danger>{i18next.t("general:Delete")}</Button>
              </Popconfirm>
            </div>
          );
        },
      },
    ];

    return (
      <div>
        <Table columns={columns} dataSource={data} rowKey="name" size="middle" bordered pagination={this.state.pagination}
          title={() => (
            <div>
              {i18next.t("general:Sites")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={this.addSite.bind(this)}>{i18next.t("general:Add")}</Button>
            </div>
          )}
          loading={data === null}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params: FetchParams = {}) => {
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (!params.pagination) {
      params.pagination = {current: 1, pageSize: 10};
    }
    this.setState({loading: true});
    // SiteBackend.getSites(this.props.account.name, params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
    (Setting.isDefaultOrganizationSelected(this.props.account) ? siteBackend.getGlobalSites() : siteBackend.getSites(Setting.getRequestOrganization(this.props.account), "", "", field, value, sortField, sortOrder))
      .then((res: BackendResponse<SiteRecord[]>) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data ?? [],
            pagination: {
              ...params.pagination,
              total: res.data2,
            },
          });
        } else {
          Setting.showMessage("error", `Failed to get sites: ${res.msg}`);
        }
      });
  };
}

export default SiteListPage;
