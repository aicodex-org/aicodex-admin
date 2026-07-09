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
import {DeleteOutlined, DownOutlined, UpOutlined} from "@ant-design/icons";
import {Button, Input, Select, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18nextLib from "i18next";

const {Option} = Select;

type LegacyAny = any;
type LegacyColumn = import("../types/legacyPage").LegacyColumn;

const i18next = {t: (key: string, options?: LegacyAny): string => String(options === undefined ? i18nextLib.t(key) : i18nextLib.t(key, options))};

interface SigninMethodTableProps {
  title?: React.ReactNode;
  table?: LegacyAny[];
  onUpdateTable: (table: LegacyAny[]) => void;
}

interface SigninMethodTableState {
  classes: SigninMethodTableProps;
}

class SigninMethodTable extends React.Component<SigninMethodTableProps, SigninMethodTableState> {
  constructor(props: SigninMethodTableProps) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  updateTable(table: LegacyAny[]) {
    this.props.onUpdateTable(table);
  }

  updateField(table: LegacyAny[], index: number, key: string, value: LegacyAny) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: LegacyAny[] = []) {
    const row = {
      name: Setting.getNewRowNameForTable(table, "Please select a signin method"),
      displayName: "",
      rule: "None",
    };
    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(items: LegacyAny[], table: LegacyAny[], i: number) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
  }

  upRow(table: LegacyAny[], i: number) {
    table = Setting.swapRow(table, i - 1, i);
    this.updateTable(table);
  }

  downRow(table: LegacyAny[], i: number) {
    table = Setting.swapRow(table, i, i + 1);
    this.updateTable(table);
  }

  renderTable(table: LegacyAny[] = []) {
    const items = [
      {name: "Password", displayName: i18next.t("general:Password")},
      {name: "Verification code", displayName: i18next.t("login:Verification code")},
      {name: "WebAuthn", displayName: i18next.t("login:WebAuthn")},
      {name: "LDAP", displayName: i18next.t("login:LDAP")},
      {name: "Face ID", displayName: i18next.t("login:Face ID")},
      {name: "WeChat", displayName: i18next.t("login:WeChat")},
      {name: "WeCom", displayName: i18next.t("login:WeCom")},
    ];
    const columns: LegacyColumn[] = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: 300,
        render: (text, record, index) => {
          const getItemDisplayName = (text: string) => {
            const item = items.filter(item => item.name === text);
            if (item.length === 0) {
              return "";
            }
            return item[0].displayName;
          };

          return (
            <Select virtual={false} style={{width: "100%"}}
              value={getItemDisplayName(text)}
              onChange={value => {
                this.updateField(table, index, "name", value);
                this.updateField(table, index, "displayName", value);
                if (value === "Verification code" || value === "Password") {
                  this.updateField(table, index, "rule", "All");
                } else if (value === "WeChat" || value === "WeCom") {
                  this.updateField(table, index, "rule", "Tab");
                } else {
                  this.updateField(table, index, "rule", "None");
                }
              }} >
              {
                Setting.getDeduplicatedArray(items, table, "name").map((item: LegacyAny, index: number) => <Option key={index} value={item.name}>{item.displayName}</Option>)
              }
            </Select>
          );
        },
      },
      {
        title: i18next.t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: 300,
        render: (text, record, index) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "displayName", e.target.value);
            }} />
          );
        },
      },
      {
        title: i18next.t("application:Rule"),
        dataIndex: "rule",
        key: "rule",
        width: 160,
        render: (text, record, index) => {
          let options: LegacyAny[] = [];
          if (record.name === "Verification code") {
            options = [
              {id: "All", name: i18next.t("general:All")},
              {id: "Email only", name: i18next.t("general:Email only")},
              {id: "Phone only", name: i18next.t("general:Phone only")},
            ];
          } else if (record.name === "Password") {
            options = [
              {id: "All", name: i18next.t("general:All")},
              {id: "Non-LDAP", name: i18next.t("general:Non-LDAP")},
              {id: "Hide password", name: i18next.t("general:Hide password")},
            ];
          } else if (record.name === "WeChat" || record.name === "WeCom") {
            options = [
              {id: "Tab", name: i18next.t("general:Tab")},
              {id: "Login page", name: i18next.t("general:Login page")},
            ];
          }

          if (options.length === 0) {
            return null;
          }

          return (
            <Select virtual={false} style={{width: "100%"}} value={text} onChange={(value => {
              this.updateField(table, index, "rule", value);
            })} options={options.map(item => Setting.getOption(item.name, item.id))} />
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        key: "action",
        width: 112,
        render: (text, record, index) => {
          return (
            <div>
              <Tooltip placement="bottomLeft" title={i18next.t("general:Up")}>
                <Button style={{marginRight: "5px"}} disabled={index === 0} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={i18next.t("general:Down")}>
                <Button style={{marginRight: "5px"}} disabled={index === table.length - 1} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={i18next.t("general:Delete")}>
                <Button disabled={table.length <= 1} icon={<DeleteOutlined />} size="small" onClick={() => this.deleteRow(items, table, index)} />
              </Tooltip>
            </div>
          );
        },
      },
    ];

    return (
      <Table className="application-edit-ui-table application-edit-ui-table-control application-edit-ui-table-signin-method" scroll={{x: 900}} tableLayout="fixed" rowKey="name" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={() => (
          <div className="organization-config-table-toolbar">
            <span className="organization-config-table-title">{this.props.title}</span>
            <Button style={{marginRight: "5px"}} type="primary" size="small" disabled={Setting.getDeduplicatedArray(items, table, "name").length === 0} onClick={() => this.addRow(table)}>{i18next.t("general:Add")}</Button>
          </div>
        )}
      />
    );
  }

  render() {
    return (
      <div>
        {this.renderTable(this.props.table ?? [])}
      </div>
    );
  }
}

export default SigninMethodTable;
