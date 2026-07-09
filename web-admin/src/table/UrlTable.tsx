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
import {DeleteOutlined, DownOutlined, LinkOutlined, UpOutlined} from "@ant-design/icons";
import {Button, Input, Popconfirm, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

class UrlTable extends React.Component<LegacyAny, LegacyAny> {
  constructor(props: LegacyAny) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  updateTable(table: LegacyAny) {
    this.props.onUpdateTable(table);
  }

  updateField(table: LegacyAny, index: number, value: LegacyAny) {
    table[index] = value;
    this.updateTable(table);
  }

  addRow(table: LegacyAny) {
    const row = "";
    if (table === undefined) {
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
    if (table === null) {
      return null;
    }

    const columns = [
      {
        title: this.props.columnTitle ?? t("application:Redirect URL"),
        dataIndex: "id",
        key: "id",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Input prefix={<LinkOutlined />} value={text} onChange={e => {
              this.updateField(table, index, e.target.value);
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
                <Button aria-label={t("general:Up")} style={{marginRight: "5px"}} disabled={index === 0} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={t("general:Down")}>
                <Button aria-label={t("general:Down")} style={{marginRight: "5px"}} disabled={index === table.length - 1} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={t("general:Delete")}>
                <Popconfirm
                  title={`${t("general:Sure to delete")} ?`}
                  okText={t("general:OK")}
                  cancelText={t("general:Cancel")}
                  onConfirm={() => this.deleteRow(table, index)}
                >
                  <Button aria-label={t("general:Delete")} icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
              </Tooltip>
            </div>
          );
        },
      },
    ];

    return (
      <Table rowKey="index" columns={columns} dataSource={table.map((row: LegacyAny, i: number) => ({id: row, index: i}))} size="middle" bordered pagination={false}
        title={() => (
          <div className="organization-config-table-toolbar">
            <span className="organization-config-table-title">{this.props.title}</span>
            <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{t("general:Add")}</Button>
          </div>
        )}
      />
    );
  }

  render() {
    return (
      <div>
        {this.renderTable(this.props.table)}
      </div>
    );
  }
}

export default UrlTable;
