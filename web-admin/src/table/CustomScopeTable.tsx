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
import {DeleteOutlined, DownOutlined, UpOutlined} from "@ant-design/icons";
import {AutoComplete, Button, Col, Input, Row, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

const DefaultScopes = [
  {scope: "openid", displayName: "OpenID", description: "Authenticate the user and obtain an ID token"},
  {scope: "profile", displayName: "Profile", description: "Read all user profile data"},
  {scope: "email", displayName: "Email", description: "Access user email addresses (read-only)"},
  {scope: "address", displayName: "Address", description: "Access the user's address information"},
  {scope: "phone", displayName: "Phone", description: "Access the user's phone number information"},
  {scope: "offline_access", displayName: "Offline Access", description: "Obtain refresh tokens for offline access"},
];

class CustomScopeTable extends React.Component<LegacyAny, LegacyAny> {
  constructor(props: LegacyAny) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  normalizeScope(scope: LegacyAny): string {
    return (scope || "").trim().toLowerCase();
  }

  getAvailableDefaultScopes(table: LegacyAny): LegacyAny[] {
    const existingScopes = new Set((table || []).map((item: LegacyAny) => this.normalizeScope(item?.scope)).filter(Boolean));
    return DefaultScopes.filter((item: LegacyAny) => !existingScopes.has(this.normalizeScope(item.scope)));
  }

  updateTable(table: LegacyAny) {
    this.props.onUpdateTable(table);
  }

  updateField(table: LegacyAny, index: number, key: string, value: LegacyAny) {
    table[index][key] = value;
    this.updateTable(table);
  }

  isScopeMissing(row: LegacyAny): boolean {
    if (!row) {
      return true;
    }
    const scope = (row.scope || "").trim();
    return scope === "";
  }

  addRow(table: LegacyAny) {
    const row = {scope: "", displayName: "", description: ""};
    if (table === undefined || table === null) {
      table = [];
    }
    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(table: LegacyAny, i: number) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
  }

  upRow(table: LegacyAny, i: number) {
    table = Setting.swapRow(table, i - 1, i);
    this.updateTable(table);
  }

  downRow(table: LegacyAny, i: number) {
    table = Setting.swapRow(table, i, i + 1);
    this.updateTable(table);
  }

  renderTable(table: LegacyAny) {
    table = table || [];

    const columns = [
      {
        title: (
          <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
            <span className="ant-form-item-required">{t("general:Name")}</span>
            <div style={{color: "red"}}>*</div>
          </div>
        ),
        dataIndex: "scope",
        key: "scope",
        width: "260px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          const availableDefaultScopes = this.getAvailableDefaultScopes(table);
          const autoCompleteOptions = availableDefaultScopes.map((item: LegacyAny) => ({
            label: `${item.scope}`,
            value: item.scope,
          }));

          return (
            <AutoComplete
              status={this.isScopeMissing(record) ? "error" : ""}
              value={text}
              options={autoCompleteOptions}
              placeholder="Select or input scope"
              onSelect={(value: LegacyAny) => {
                this.updateField(table, index, "scope", value);
                const selectedScope = availableDefaultScopes.find((item: LegacyAny) => item.scope === value);
                if (selectedScope) {
                  this.updateField(table, index, "displayName", selectedScope.displayName);
                  this.updateField(table, index, "description", selectedScope.description);
                }
              }}
              onChange={(value: LegacyAny) => {
                this.updateField(table, index, "scope", value);
              }}
            >
              <Input />
            </AutoComplete>
          );
        },
      },
      {
        title: t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "200px",
        render: (text: LegacyAny, _: LegacyAny, index: number) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "displayName", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("general:Description"),
        dataIndex: "description",
        key: "description",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "description", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "110px",
        // eslint-disable-next-line
        render: (_: LegacyAny, __: LegacyAny, index: number) => {
          return (
            <div>
              <Tooltip placement="bottomLeft" title={t("general:Up")}>
                <Button style={{marginRight: "5px"}} disabled={index === 0} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={t("general:Down")}>
                <Button style={{marginRight: "5px"}} disabled={index === table.length - 1} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={t("general:Delete")}>
                <Button icon={<DeleteOutlined />} size="small" onClick={() => this.deleteRow(table, index)} />
              </Tooltip>
            </div>
          );
        },
      },
    ];

    return (
      <Table title={() => (
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <div style={{marginTop: "5px"}}>{this.props.title}</div>
          <Button type="primary" size="small" onClick={() => this.addRow(table)}>{t("general:Add")}</Button>
        </div>
      )}
      columns={columns} dataSource={table} rowKey={(record: LegacyAny, index?: number) => record.scope?.trim() || `temp_${index ?? 0}`} size="middle" bordered pagination={false}
      />
    );
  }

  render() {
    return (
      <div>
        <Row style={{marginTop: "20px"}} >
          <Col span={24}>
            {
              this.renderTable(this.props.table)
            }
          </Col>
        </Row>
      </div>
    );
  }
}

export default CustomScopeTable;
