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
import {DeleteOutlined, DownOutlined, UpOutlined} from "@ant-design/icons";
import {Button, Input, Select, Switch, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";

const {Option} = Select;
type SyncerTableColumns = import("antd").TableProps<SyncerTableColumnRecord>["columns"];

function tr(key: string): string {
  return i18next.t(key) as string;
}

// 同步器表格字段允许后端透传历史扩展字段，当前组件只编辑下面这些核心列属性。
export interface SyncerTableColumnRecord {
  name?: string;
  type?: string;
  casdoorName?: string;
  isKey?: boolean;
  isHashed?: boolean;
  values?: unknown[];
  [key: string]: unknown;
}

interface SyncerTableColumnTableProps {
  table?: SyncerTableColumnRecord[];
  onUpdateTable: (table: SyncerTableColumnRecord[]) => void;
}

interface SyncerTableColumnTableState {
  classes: SyncerTableColumnTableProps;
}

class SyncerTableColumnTable extends React.Component<SyncerTableColumnTableProps, SyncerTableColumnTableState> {
  constructor(props: SyncerTableColumnTableProps) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  updateTable(table: SyncerTableColumnRecord[]) {
    this.props.onUpdateTable(table);
  }

  updateField(table: SyncerTableColumnRecord[], index: number, key: keyof SyncerTableColumnRecord, value: unknown) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: SyncerTableColumnRecord[] = []) {
    const row: SyncerTableColumnRecord = {name: `column${table.length}`, type: "string", values: [], isKey: table.filter(row => row.isKey).length === 0};
    if (table === undefined) {
      table = [];
    }
    table = Setting.addRow(table, row) as SyncerTableColumnRecord[];
    this.updateTable(table);
  }

  deleteRow(table: SyncerTableColumnRecord[], i: number) {
    table = Setting.deleteRow(table, i) as SyncerTableColumnRecord[];
    this.updateTable(table);
  }

  upRow(table: SyncerTableColumnRecord[], i: number) {
    table = Setting.swapRow(table, i - 1, i) as SyncerTableColumnRecord[];
    this.updateTable(table);
  }

  downRow(table: SyncerTableColumnRecord[], i: number) {
    table = Setting.swapRow(table, i, i + 1) as SyncerTableColumnRecord[];
    this.updateTable(table);
  }

  renderTable(table: SyncerTableColumnRecord[] = []) {
    const tableData = table.map((row, index) => ({
      ...row,
      syncerTableColumnKey: `${row.name || "column"}-${index}`,
    }));

    const columns: SyncerTableColumns = [
      {
        title: tr("syncer:Column name"),
        dataIndex: "name",
        key: "name",
        render: (text, record, index) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "name", e.target.value);
            }} />
          );
        },
      },
      {
        title: tr("syncer:Column type"),
        dataIndex: "type",
        key: "type",
        render: (text, record, index) => {
          return (
            <Select virtual={false} style={{width: "100%"}} value={text} onChange={(value => {this.updateField(table, index, "type", value);})}>
              {
                ["string", "integer", "boolean"]
                  .map((item, index) => <Option key={index} value={item}>{item}</Option>)
              }
            </Select>
          );
        },
      },
      {
        title: tr("syncer:aicodex-admin column"),
        dataIndex: "casdoorName",
        key: "casdoorName",
        render: (text, record, index) => {
          return (
            <Select virtual={false} showSearch style={{width: "100%"}} value={text} onChange={(value => {this.updateField(table, index, "casdoorName", value);})}>
              {
                Setting.getUserCommonFields().map((item, index) => <Option key={index} value={item}>{item}</Option>)
              }
            </Select>
          );
        },
      },
      {
        title: tr("syncer:Is key"),
        dataIndex: "isKey",
        key: "isKey",
        render: (text, record, index) => {
          return (
            <Switch checked={Boolean(text)} onChange={checked => {
              if (!record.isKey && checked) {
                table.forEach((row, i) => {
                  this.updateField(table, i, "isKey", false);
                });
              } else if (record.isKey && !checked) {
                return;
              }

              this.updateField(table, index, "isKey", checked);
            }} />
          );
        },
      },
      {
        title: tr("syncer:Is hashed"),
        dataIndex: "isHashed",
        key: "isHashed",
        render: (text, record, index) => {
          return (
            <Switch checked={Boolean(text)} onChange={checked => {
              this.updateField(table, index, "isHashed", checked);
            }} />
          );
        },
      },
      {
        title: tr("general:Action"),
        key: "action",
        width: "100px",
        render: (text, record, index) => {
          return (
            <div>
              <Tooltip placement="bottomLeft" title={tr("general:Up")}>
                <Button aria-label={tr("general:Up")} style={{marginRight: "5px"}} disabled={index === 0} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={tr("general:Down")}>
                <Button aria-label={tr("general:Down")} style={{marginRight: "5px"}} disabled={index === table.length - 1} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={tr("general:Delete")}>
                <Button aria-label={tr("general:Delete")} icon={<DeleteOutlined />} disabled={record.isKey && table.length > 1} size="small" onClick={() => this.deleteRow(table, index)} />
              </Tooltip>
            </div>
          );
        },
      },
    ];

    return (
      <Table rowKey="syncerTableColumnKey" columns={columns} dataSource={tableData} size="middle" bordered pagination={false}
        title={() => (
          <div className="syncer-table-column-toolbar">
            <Button aria-label={tr("general:Add")} type="primary" size="small" onClick={() => this.addRow(table)}>{tr("general:Add")}</Button>
          </div>
        )}
      />
    );
  }

  render() {
    return (
      <div className="syncer-table-column-table">
        {this.renderTable(this.props.table)}
      </div>
    );
  }
}

export default SyncerTableColumnTable;
