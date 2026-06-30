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
import {Button, Col, Input, Row, Select, Switch, Table, Tooltip} from "antd";
import {DeleteOutlined, DownOutlined, UpOutlined} from "@ant-design/icons";
import * as Setting from "../Setting";
import i18next from "i18next";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

class FormItemTable extends React.Component<LegacyAny, LegacyAny> {
  constructor(props: LegacyAny) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  updateTable(table: LegacyAny) {
    this.props.onUpdateTable(table);
  }

  updateField(table: LegacyAny, index: number, key: string, value: LegacyAny) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: LegacyAny) {
    const row = {name: "", label: "", visible: false};
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

  defaultTable() {
    let rows = this.getItems();
    if (!Array.isArray(rows)) {
      rows = [rows];
    }
    this.updateTable(rows);
  }

  getItems() {
    const formType = this.props.formType;
    return Setting.getFormTypeItems(formType);
  }

  renderTable(table: LegacyAny) {
    const columns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "200px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          const items = this.getItems();
          const options = Setting.getDeduplicatedArray(items, table, "name").map((item: LegacyAny) => ({label: t(item.label), value: item.name}));
          const selectedLabel = items.find(item => item.name === text)?.label || text;
          return (
            <Select
              virtual={false}
              style={{width: "100%"}}
              options={options}
              value={t(selectedLabel)}
              onChange={(value: LegacyAny) => {
                this.updateField(table, index, "name", value);
              }}
              optionLabelProp="label"
            />
          );
        },
      },
      {
        title: t("signup:Label"),
        dataIndex: "label",
        key: "label",
        width: "200px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          const items = this.getItems();
          const selectedItem = items.find(item => item.name === text);
          const currentLabel = selectedItem?.label || text;
          return (
            <Input
              value={t(currentLabel)}
              onChange={e => {
                const newLabel = e.target.value;
                this.updateField(this.props.table, index, "label", newLabel);
                if (selectedItem) {
                  selectedItem.label = newLabel;
                }
              }}
            />
          );
        },
      },
      {
        title: t("organization:Visible"),
        dataIndex: "visible",
        key: "visible",
        width: "200px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Switch checked={text} onChange={(checked: boolean) => {
              this.updateField(table, index, "visible", checked);
            }} />
          );
        },
      },
      {
        title: t("form:Width"),
        dataIndex: "width",
        key: "width",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "width", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("general:Action"),
        key: "action",
        width: "100px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <div>
              <Tooltip placement="bottomLeft" title={t("general:Up")}>
                <Button style={{marginRight: "5px"}} disabled={index === 0} icon={<UpOutlined />}
                  size="small" onClick={() => this.upRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={t("general:Down")}>
                <Button style={{marginRight: "5px"}} disabled={index === table.length - 1}
                  icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
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
      <Table scroll={{x: "max-content"}} rowKey="name" columns={columns} dataSource={table} size="middle" bordered
        pagination={false}
        title={() => (
          <div>
            {this.props.title}&nbsp;&nbsp;&nbsp;&nbsp;
            <Button style={{marginRight: "10px"}} size="small" onClick={() => this.defaultTable()}>{t("general:Reset to Default")}</Button>
            <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{t("general:Add")}</Button>
          </div>
        )}
      />
    );
  }

  render() {
    return (
      <div>
        <Row style={{marginTop: "20px"}}>
          <Col span={24}>{this.renderTable(this.props.table)}</Col>
        </Row>
      </div>
    );
  }
}

export default FormItemTable;
