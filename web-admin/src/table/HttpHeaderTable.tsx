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
import {Button, Input, Table} from "antd";
import i18next from "i18next";
import {DeleteOutlined} from "@ant-design/icons";
import * as Setting from "../Setting";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

class HttpHeaderTable extends React.Component<LegacyAny, LegacyAny> {
  constructor(props: LegacyAny) {
    super(props);
    this.state = {
      httpHeaders: [],
    };

    // transfer the Object to object[]
    if (this.props.httpHeaders !== null) {
      Object.entries(this.props.httpHeaders).map((item: LegacyAny, index: number) => {
        this.state.httpHeaders.push({key: index, name: item[0], value: item[1]});
      });
    }
  }

  page = 1;
  pageSize = 10;
  count = this.props.httpHeaders !== null ? Object.entries(this.props.httpHeaders).length : 0;

  updateTable(table: LegacyAny) {
    this.setState({httpHeaders: table});
    const httpHeaders: Record<string, LegacyAny> = {};
    table.map((item: LegacyAny) => {
      httpHeaders[item.name] = item.value;
    });
    this.props.onUpdateTable(httpHeaders);
  }

  addRow(table: LegacyAny) {
    const row = {key: this.count, name: "", value: ""};
    if (table === undefined) {
      table = [];
    }
    table = Setting.addRow(table, row);
    this.count = this.count + 1;
    this.updateTable(table);
  }

  deleteRow(table: LegacyAny, index: number) {
    table = Setting.deleteRow(table, this.getIndex(index));
    this.updateTable(table);
  }

  getIndex(index: number): number {
    // Need to be used in all place when modify table. Parameter is the row index in table, need to calculate the index in dataSource.
    return index + (this.page - 1) * this.pageSize;
  }

  updateField(table: LegacyAny, index: number, key: string, value: LegacyAny) {
    table[this.getIndex(index)][key] = value;
    this.updateTable(table);
  }

  renderTable(table: LegacyAny) {
    const columns = [
      {
        title: t("user:Keys"),
        dataIndex: "name",
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
        title: t("user:Values"),
        dataIndex: "value",
        width: "200px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "value", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("general:Action"),
        dataIndex: "operation",
        width: "20px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Button icon={<DeleteOutlined />} size="small" onClick={() => this.deleteRow(table, index)} />
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
          this.renderTable(this.state.httpHeaders)
        }
      </React.Fragment>
    );
  }
}

export default HttpHeaderTable;
