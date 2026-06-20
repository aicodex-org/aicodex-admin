// Copyright 2023 The casbin Authors. All Rights Reserved.
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
import {Button, Col, Row, Select, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18nextLib from "i18next";

const {Option} = Select;
const i18next = {t: (key: string) => i18nextLib.t(key) as string};

/** 规则下拉来源只依赖 owner/name，避免把治理规则完整模型纳入站点范围迁移。 */
export interface RuleTableSource {
  owner: string;
  name: string;
  [key: string]: unknown;
}

/** 站点已选规则在表格内的行模型，保存时会转换回既有 owner/name 字符串。 */
export interface RuleTableRow {
  owner: string;
  name: string;
}

/** RuleTable 保持 legacy props contract，通过 onUpdateRules 回写 string[]。 */
export interface RuleTableProps {
  title: string;
  account: {owner: string; [key: string]: unknown};
  sources: RuleTableSource[];
  rules: string[] | null;
  onUpdateRules: (rules: string[]) => void;
}

interface RuleTableState {
  classes: RuleTableProps;
}

type RuleTableColumn = {
  title?: React.ReactNode;
  dataIndex?: string;
  key: string;
  width?: string;
  render?: (text: unknown, record: RuleTableRow, index: number) => React.ReactNode;
};

class RuleTable extends React.Component<RuleTableProps, RuleTableState> {
  constructor(props: RuleTableProps) {
    super(props);
    this.state = {
      classes: props,
    };
    if (this.props.rules === null) {
      // rerender
      this.props.onUpdateRules([]);
    }
  }

  updateTable(table: RuleTableRow[]) {
    const rules = [];
    for (let i = 0; i < table.length; i++) {
      rules.push(table[i].owner + "/" + table[i].name);
    }
    this.props.onUpdateRules(rules);
  }

  updateField(table: RuleTableRow[], index: number, key: keyof RuleTableRow, value: string) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: RuleTableRow[] | undefined) {
    const row = {owner: this.props.account.owner, name: ""};
    if (table === undefined) {
      table = [];
    }

    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(table: RuleTableRow[], i: number) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
  }

  upRow(table: RuleTableRow[], i: number) {
    table = Setting.swapRow(table, i - 1, i);
    this.updateTable(table);
  }

  downRow(table: RuleTableRow[], i: number) {
    table = Setting.swapRow(table, i, i + 1);
    this.updateTable(table);
  }

  renderTable(table: RuleTableRow[]) {
    const columns: RuleTableColumn[] = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "180px",
        render: (text, record, index) => (
          <Select value={text} virtual={false} style={{width: "100%"}} onChange={value => {
            this.updateField(table, index, "name", String(value));
          }}>
            {
              Setting.getDeduplicatedArray(this.props.sources, table, "name").map((record: RuleTableSource) => {
                return <Option key={record.name} value={record.name}>{record.name}</Option>;
              })
            }
          </Select>
        ),
      },
      {
        title: "Action",
        key: "action",
        width: "100px",
        render: (text, record, index) => (
          <div>
            <Tooltip placement="bottomLeft" title={"Up"}>
              <Button style={{marginRight: "5px"}} disabled={index === 0} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, index)} />
            </Tooltip>
            <Tooltip placement="topLeft" title={"Down"}>
              <Button style={{marginRight: "5px"}} disabled={index === table.length - 1} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
            </Tooltip>
            <Tooltip placement="topLeft" title={"Delete"}>
              <Button icon={<DeleteOutlined />} size="small" onClick={() => this.deleteRow(table, index)} />
            </Tooltip>
          </div>
        ),
      },
    ];
    return (
      <Table rowKey="index" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={() => (
          <div>
            {this.props.title}&nbsp;&nbsp;&nbsp;&nbsp;
            <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{i18next.t("general:Add")}</Button>
          </div>
        )}
      />
    );
  }

  render() {
    return (
      <div>
        <Row style={{marginTop: "20px"}} >
          <Col span={24}>
            {
              this.props.rules === null ? null : this.renderTable(this.props.rules.map((item: string) => {
                const values = item.split("/");
                return {owner: values[0], name: values[1]};
              }))
            }
          </Col>
        </Row>
      </div>
    );
  }
}

export default RuleTable;
