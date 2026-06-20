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
import {Button, Col, Input, Row, Select, Table, Tooltip} from "antd";
import type {TableProps} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
import type {RuleExpressionRow, RuleExpressionTablePassthroughProps} from "./ruleExpressionRow";
import {getRuleExpressionText} from "./ruleExpressionRow";

const {Option} = Select;
const t = (key: string): string => String(i18next.t(key));

interface SelectOption {
  value: string;
  label: string;
}

interface IpRuleTableProps extends RuleExpressionTablePassthroughProps {
  title: React.ReactNode;
  table: RuleExpressionRow[];
  onUpdateTable: (table: RuleExpressionRow[]) => void;
}

interface IpRuleTableState {
  classes: IpRuleTableProps;
  options: SelectOption[][];
  defaultRules: RuleExpressionRow[];
}

type RuleTableColumns = NonNullable<TableProps<RuleExpressionRow>["columns"]>;
type RuleExpressionField = keyof Pick<RuleExpressionRow, "name" | "operator" | "value">;

class IpRuleTable extends React.Component<IpRuleTableProps, IpRuleTableState> {
  constructor(props: IpRuleTableProps) {
    super(props);
    this.state = {
      classes: props,
      options: [],
      defaultRules: [
        {
          name: "loopback",
          operator: "is in",
          value: "127.0.0.1",
        },
        {
          name: "lan cidr",
          operator: "is in",
          value: "10.0.0.0/8,192.168.0.0/16",
        },
      ],
    };
    if (this.props.table.length === 0) {
      this.restore();
    }
    for (let i = 0; i < this.props.table.length; i++) {
      const values = getRuleExpressionText(this.props.table[i].value).split(",");
      const options: SelectOption[] = [];
      for (let j = 0; j < values.length; j++) {
        options[j] = {value: values[j], label: values[j]};
      }
      this.state.options.push(options);
    }
  }

  updateTable(table: RuleExpressionRow[]) {
    this.props.onUpdateTable(table);
  }

  updateField(table: RuleExpressionRow[], index: number, key: RuleExpressionField, value: string | string[]) {
    if (key === "value") {
      const tags = Array.isArray(value) ? value : Array.from(value);
      table[index][key] = tags.map(item => item.trim()).join(",");
    } else {
      table[index][key] = String(value);
    }
    this.updateTable(table);
  }

  addRow(table: RuleExpressionRow[] | undefined) {
    const row = {name: `New IP Rule - ${table!.length}`, operator: "is in", value: "127.0.0.1"};
    if (table === undefined) {
      table = [];
    }

    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(table: RuleExpressionRow[], i: number) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
  }

  upRow(table: RuleExpressionRow[], i: number) {
    table = Setting.swapRow(table, i - 1, i);
    Setting.swapRow(this.state.options, i - 1, i);
    this.updateTable(table);
  }

  downRow(table: RuleExpressionRow[], i: number) {
    table = Setting.swapRow(table, i, i + 1);
    Setting.swapRow(this.state.options, i, i + 1);
    this.updateTable(table);
  }

  restore() {
    this.updateTable(this.state.defaultRules);
  }

  renderTable(table: RuleExpressionRow[]) {
    const columns: RuleTableColumns = [
      {
        title: t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "180px",
        render: (text: unknown, _record: RuleExpressionRow, index: number) => (
          <Input value={getRuleExpressionText(text)} onChange={e => {
            this.updateField(table, index, "name", e.target.value);
          }} />
        ),
      },
      {
        title: t("rule:Operator"),
        dataIndex: "operator",
        key: "operator",
        width: "180px",
        render: (text: unknown, _record: RuleExpressionRow, index: number) => (
          <Select value={getRuleExpressionText(text)} virtual={false} style={{width: "100%"}} onChange={(value: string) => {
            this.updateField(table, index, "operator", value);
          }}>
            {
              [
                {value: "is in", text: t("rule:is in")},
                {value: "is not in", text: t("rule:is not in")},
              ].map((item, index) => <Option key={index} value={item.value}>{item.text}</Option>)
            }
          </Select>
        ),
      },
      {
        title: t("rule:IP List"),
        dataIndex: "value",
        key: "value",
        render: (_text: unknown, record: RuleExpressionRow, index: number) => (
          <Select
            mode="tags"
            style={{width: "100%"}}
            placeholder="Input IP Addresses"
            value={getRuleExpressionText(record.value) ? getRuleExpressionText(record.value).split(",") : []}
            onChange={(value: string[]) => this.updateField(table, index, "value", value)}
            options={this.state.options[index]}
          />
        ),
      },
      {
        title: t("general:Action"),
        key: "action",
        width: "100px",
        render: (_text: unknown, _record: RuleExpressionRow, index: number) => (
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
            <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{t("general:Add")}</Button>
            <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.restore()}>{t("general:Restore")}</Button>
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
              this.renderTable(this.props.table)
            }
          </Col>
        </Row>
      </div>
    );
  }
}

export default IpRuleTable;
