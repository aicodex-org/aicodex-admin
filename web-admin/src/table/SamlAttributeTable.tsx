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
import {AutoComplete, Button, Col, Input, Row, Select, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

const {Option} = Select;

class SamlAttributeTable extends React.Component<LegacyAny, LegacyAny> {
  samlVariables: LegacyAny[];

  constructor(props: LegacyAny) {
    super(props);
    this.state = {
      classes: props,
    };
    this.samlVariables = [
      "$user.owner", "$user.name", "$user.email", "$user.id",
      "$user.phone", "$user.roles", "$user.permissions", "$user.groups",
    ].map((v: string) => ({value: v}));
  }

  updateTable(table: LegacyAny) {
    this.props.onUpdateTable(table);
  }

  updateField(table: LegacyAny, index: number, key: string, value: LegacyAny) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: LegacyAny) {
    const row = {Name: "", nameFormat: "", value: ""};
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
        title: t("general:Name format"),
        dataIndex: "nameFormat",
        key: "nameFormat",
        width: "200px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Select virtual={false} style={{width: "100%"}}
              value={text}
              defaultValue="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified"
              onChange={(value: LegacyAny) => {
                this.updateField(table, index, "nameFormat", value);
              }} >
              <Option key="Unspecified" value="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified">Unspecified</Option>
              <Option key="Basic" value="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">Basic</Option>
              <Option key="UriReference" value="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">UriReference</Option>
              <Option key="x500AttributeName" value="urn:oasis:names:tc:SAML:2.0:attrname-format:X500">x500AttributeName</Option>
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
          return (
            <AutoComplete
              style={{width: "100%"}}
              options={this.samlVariables}
              value={text}
              onChange={(value: LegacyAny) => {
                this.updateField(table, index, "value", value);
              }}
              filterOption={(inputValue: string, option: LegacyAny) =>
                String(option?.value ?? "").toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            />
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

export default SamlAttributeTable;
