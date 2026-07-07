// Copyright 2022 The Casdoor Authors. All Rights Reserved.
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
import {Button, Input, Table, Tooltip} from "antd";
import i18nextLib from "i18next";
import {DeleteOutlined} from "@ant-design/icons";
import * as Setting from "../Setting";

type LegacyAny = any;
type LegacyColumn = import("../types/legacyPage").LegacyColumn;

const i18next = {t: (key: string, options?: LegacyAny): string => String(options === undefined ? i18nextLib.t(key) : i18nextLib.t(key, options))};

interface PropertyRow {
  key: number;
  name: string;
  value: LegacyAny;
}

interface PropertyTableProps {
  properties?: Record<string, LegacyAny> | null;
  title?: React.ReactNode;
  onUpdateTable: (properties: Record<string, LegacyAny>) => void;
}

interface PropertyTableState {
  properties: PropertyRow[];
}

class PropertyTable extends React.Component<PropertyTableProps, PropertyTableState> {
  constructor(props: PropertyTableProps) {
    super(props);
    this.state = {
      properties: props.properties !== null && props.properties !== undefined
        ? Object.entries(props.properties).map((item, index) => ({key: index, name: item[0], value: item[1]}))
        : [],
    };
  }

  page = 1;
  pageSize = 10;
  count = this.props.properties !== null && this.props.properties !== undefined ? Object.entries(this.props.properties).length : 0;

  updateTable(table: PropertyRow[]) {
    this.setState({properties: table});
    const properties: Record<string, LegacyAny> = {};
    table.map((item: PropertyRow) => {
      properties[item.name] = item.value;
    });
    this.props.onUpdateTable(properties);
  }

  addRow(table?: PropertyRow[]) {
    const row = {key: this.count, name: "", value: ""};
    if (table === undefined) {
      table = [];
    }
    table = Setting.addRow(table, row);
    this.count = this.count + 1;
    this.updateTable(table);
  }

  deleteRow(table: PropertyRow[], index: number) {
    table = Setting.deleteRow(table, this.getIndex(index));
    this.updateTable(table);
  }

  getIndex(index: number) {
    // Need to be used in all place when modify table. Parameter is the row index in table, need to calculate the index in dataSource.
    return index + (this.page - 1) * this.pageSize;
  }

  updateField(table: PropertyRow[], index: number, key: "name" | "value", value: LegacyAny) {
    table[this.getIndex(index)][key] = value;
    this.updateTable(table);
  }

  renderTable(table: PropertyRow[]) {
    const columns: LegacyColumn[] = [
      {
        title: i18next.t("user:Keys"),
        dataIndex: "name",
        width: "200px",
        render: (text, record, index) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "name", e.target.value);
            }} />
          );
        },
      },
      {
        title: i18next.t("user:Values"),
        dataIndex: "value",
        width: "200px",
        render: (text, record, index) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "value", e.target.value);
            }} />
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "operation",
        width: 56,
        render: (text, record, index) => {
          return (
            <Tooltip placement="topLeft" title={i18next.t("general:Delete")}>
              <Button aria-label={i18next.t("general:Delete")} icon={<DeleteOutlined />} size="small" onClick={() => this.deleteRow(table, index)} />
            </Tooltip>
          );
        },
      },
    ];

    return (
      <Table className="user-edit-embedded-table user-edit-property-table" tableLayout="fixed" title={() => (
        <div className="user-edit-table-toolbar">
          {this.props.title === undefined ? null : <span className="user-edit-table-title">{this.props.title}</span>}
          <div className="user-edit-table-toolbar-actions">
            <Button className="organization-config-table-add-trigger" type="primary" size="small" onClick={() => this.addRow(table)}>{i18next.t("general:Add")}</Button>
          </div>
        </div>
      )}
      pagination={{
        defaultPageSize: this.pageSize,
        onChange: page => {this.page = page;},
      }}
      columns={columns} dataSource={table} rowKey="key" size="middle" bordered
      />
    );
  }

  render() {
    return (
      <React.Fragment>
        {
          this.renderTable(this.state.properties)
        }
      </React.Fragment>
    );
  }
}

export default PropertyTable;
