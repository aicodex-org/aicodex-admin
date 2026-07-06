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
import {Button, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18nextLib from "i18next";
import * as LdapBackend from "../backend/LdapBackend";
import {Link} from "react-router-dom";
import PopconfirmModal from "../common/modal/PopconfirmModal";
import {InfoCircleOutlined} from "@ant-design/icons";

type LegacyAny = any;
type LegacyColumn = import("../types/legacyPage").LegacyColumn & {
  sorter?: (a: LegacyAny, b: LegacyAny) => number;
};

const i18next = {t: (key: string, options?: LegacyAny): string => String(options === undefined ? i18nextLib.t(key) : i18nextLib.t(key, options))};

interface LdapTableProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  table?: LegacyAny[] | null;
  organizationName: string;
  onUpdateTable: (table: LegacyAny[]) => void;
}

interface LdapTableState {
  classes: LdapTableProps;
  addingLdap: boolean;
  deletingLdapIds: Record<string, boolean>;
}

class LdapTable extends React.Component<LdapTableProps, LdapTableState> {
  constructor(props: LdapTableProps) {
    super(props);
    this.state = {
      classes: props,
      addingLdap: false,
      deletingLdapIds: {},
    };
  }

  updateTable(table: LegacyAny[]) {
    this.props.onUpdateTable(table);
  }

  updateField(table: LegacyAny[], index: number, key: string, value: LegacyAny) {
    table[index][key] = value;
    this.updateTable(table);
  }

  newLdap() {
    return {
      id: "",
      owner: this.props.organizationName,
      createdTime: "",
      serverName: "Example LDAP Server",
      host: "example.com",
      port: 389,
      username: "cn=admin,dc=example,dc=com",
      password: "123",
      baseDn: "ou=People,dc=example,dc=com",
      autosync: 0,
      lastSync: "",
    };
  }

  getLdapOperationKey(record: LegacyAny, index: number) {
    return `${record?.id ?? index}`;
  }

  addRow(table: LegacyAny[] = []) {
    if (this.state.addingLdap) {
      return Promise.resolve();
    }

    this.setState({addingLdap: true});
    const newLdap = this.newLdap();
    return LdapBackend.addLdap(newLdap)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          table = Setting.addRow(table, res.data2);
          this.updateTable(table);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      }
      )
      .catch((error: LegacyAny) => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      })
      .finally(() => {
        this.setState({addingLdap: false});
      });
  }

  deleteRow(table: LegacyAny[], i: number) {
    const ldap = table[i];
    const operationKey = this.getLdapOperationKey(ldap, i);
    if (this.state.deletingLdapIds[operationKey]) {
      return Promise.resolve();
    }

    this.setState((prevState) => ({
      deletingLdapIds: {...prevState.deletingLdapIds, [operationKey]: true},
    }));

    return LdapBackend.deleteLdap(ldap)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully deleted"));
          table = Setting.deleteRow(table, i);
          this.updateTable(table);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch((error: LegacyAny) => {
        Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${error}`);
      })
      .finally(() => {
        this.setState((prevState) => {
          const deletingLdapIds = {...prevState.deletingLdapIds};
          delete deletingLdapIds[operationKey];
          return {deletingLdapIds};
        });
      });
  }

  renderTable(table: LegacyAny[] = []) {
    const columns: LegacyColumn[] = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "serverName",
        key: "serverName",
        width: "160px",
        sorter: (a, b) => a.serverName.localeCompare(b.serverName),
        render: (text, record, index) => {
          return (
            <Link to={`/ldap/${record.owner}/${record.id}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("ldap:Server"),
        dataIndex: "host",
        key: "host",
        ellipsis: true,
        sorter: (a, b) => a.host.localeCompare(b.host),
        render: (text, record, index) => {
          return `${text}:${record.port}`;
        },
      },
      {
        title: i18next.t("ldap:Base DN"),
        dataIndex: "baseDn",
        key: "baseDn",
        ellipsis: true,
        sorter: (a, b) => a.baseDn.localeCompare(b.baseDn),
      },
      {
        title: i18next.t("ldap:Auto Sync"),
        dataIndex: "autoSync",
        key: "autoSync",
        width: "120px",
        sorter: (a, b) => a.autoSync.localeCompare(b.autoSync),
        render: (text, record, index) => {
          return text === 0 ? (<span style={{color: "#faad14"}}>{i18next.t("ldap:Disabled")}</span>) : (
            <span style={{color: "#52c41a"}}>{i18next.t("ldap:Every N minutes", {minutes: text})}</span>);
        },
      },
      {
        title: i18next.t("ldap:Last Sync"),
        dataIndex: "lastSync",
        key: "lastSync",
        ellipsis: true,
        sorter: (a, b) => a.lastSync.localeCompare(b.lastSync),
        render: (text, record, index) => {
          return `${text ?? ""}`.trim() === "" ? "-" : text;
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "180px",
        className: "ldap-table-action-column",
        render: (text, record, index) => {
          const isDeleting = Boolean(this.state.deletingLdapIds[this.getLdapOperationKey(record, index)]);
          return (
            <div className="ldap-table-row-actions">
              <Tooltip title={i18next.t("ldap:Open LDAP user sync page")}>
                <Button size="small"
                  onClick={() => Setting.goToLink(`/ldap/sync/${record.owner}/${record.id}`)}>
                  {i18next.t("ldap:Sync users")}
                </Button>
              </Tooltip>
              <Button size="small"
                onClick={() => Setting.goToLink(`/ldap/${record.owner}/${record.id}`)}>
                {i18next.t("general:Edit")}
              </Button>
              <PopconfirmModal
                size="small"
                type="default"
                disabled={isDeleting}
                loading={isDeleting}
                title={i18next.t("ldap:Delete LDAP server confirmation", {name: record.serverName})}
                onConfirm={() => this.deleteRow(table, index)}
              >
              </PopconfirmModal>
            </div>
          );
        },
      },
    ];

    return (
      <Table scroll={{x: "max-content"}} rowKey="id" columns={columns} dataSource={table} size="middle" bordered pagination={false} showSorterTooltip={false}
        title={() => (
          <div className="ldap-table-title-content">
            <div className="ldap-table-toolbar">
              {this.props.title === undefined || this.props.title === null ? null : <span className="ldap-table-title">{this.props.title}</span>}
              <Button type="primary" size="small" loading={this.state.addingLdap} disabled={this.state.addingLdap} onClick={() => this.addRow(table)}>{i18next.t("general:Add")}</Button>
            </div>
            {this.props.description === undefined || this.props.description === null ? null : (
              <div className="ldap-table-description">
                <InfoCircleOutlined />
                <span>{this.props.description}</span>
              </div>
            )}
          </div>
        )}
      />
    );
  }

  render() {
    const table = this.props.table ?? [];
    return (
      <div className="ldap-table-section">
        {this.renderTable(table)}
      </div>
    );
  }
}

export default LdapTable;
