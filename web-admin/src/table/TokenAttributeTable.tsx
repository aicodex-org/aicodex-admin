// Copyright 2025 The Casdoor Authors. All Rights Reserved.
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
import {Button, Col, Input, Row, Select, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

class TokenAttributeTable extends React.Component<LegacyAny, LegacyAny> {
  userFields: string[];

  constructor(props: LegacyAny) {
    super(props);
    this.state = {
      classes: props,
    };
    // List of available user fields for "Existing Field" category
    this.userFields = ["Owner", "Name", "Id", "DisplayName", "Email", "Phone", "Tag", "Roles", "Permissions", "permissionNames", "Groups"];
  }

  updateTable(table: LegacyAny) {
    this.props.onUpdateTable(table);
  }

  updateField(table: LegacyAny, index: number, key: string, value: LegacyAny) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: LegacyAny) {
    // Note: Field names use lowercase to match JSON serialization from backend (json:"name", json:"value", json:"type", json:"category")
    const row = {name: "", value: "", type: "Array", category: "Static Value"};
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
    const columns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "200px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "name", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("general:Category"),
        dataIndex: "category",
        key: "category",
        width: "150px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Select virtual={false} style={{width: "100%"}}
              value={text ?? "Static Value"}
              options={[
                {value: "Static Value", label: t("application:Static Value")},
                {value: "Existing Field", label: t("application:Existing Field")},
              ].map((item: LegacyAny) =>
                Setting.getOption(item.label, item.value))
              }
              onChange={(value: LegacyAny) => {
                this.updateField(table, index, "category", value);
              }} >
            </Select>
          );
        },
      },
      {
        title: t("webhook:Value"),
        dataIndex: "value",
        key: "value",
        width: "200px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          const category = record.category ?? "Static Value";
          if (category === "Existing Field") {
            // Show dropdown for existing fields
            return (
              <Select virtual={false} style={{width: "100%"}}
                value={text}
                options={this.userFields.map((field: string) =>
                  Setting.getOption(field, field))
                }
                onChange={(value: LegacyAny) => {
                  this.updateField(table, index, "value", value);
                }} >
              </Select>
            );
          } else {
            // Show text input for static values
            return (
              <Input value={text} onChange={e => {
                this.updateField(table, index, "value", e.target.value);
              }} />
            );
          }
        },
      },
      {
        title: t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "150px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Select virtual={false} style={{width: "100%"}}
              value={text ?? "Array"}
              options={[
                {value: "Array", label: t("application:Array")},
                {value: "String", label: t("application:String")},
              ].map((item: LegacyAny) =>
                Setting.getOption(item.label, item.value))
              }
              onChange={(value: LegacyAny) => {
                this.updateField(table, index, "type", value);
              }} >
            </Select>
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "20px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
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
        <div>
          <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{t("general:Add")}</Button>
        </div>
      )}
      columns={columns} dataSource={table} rowKey="key" size="middle" bordered
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

export default TokenAttributeTable;
