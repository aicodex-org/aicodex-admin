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
import type {TableProps} from "antd";
import {getRules} from "../backend/RuleBackend";
import * as Setting from "../Setting";
import i18next from "i18next";

const {Option} = Select;
const t = (key: string): string => String(i18next.t(key));

// RuleEditPage keeps backend expressions as open objects; CompoundRule only edits these shared fields.
interface RuleExpressionRow {
  [key: string]: unknown;
  name?: string;
  operator?: string;
  value?: string;
}

interface RuleRecord {
  owner: string;
  name: string;
}

interface RuleListResponse {
  data?: RuleRecord[];
}

interface CompoundRuleProps {
  title: React.ReactNode;
  table: RuleExpressionRow[];
  owner: string;
  ruleName: string;
  onUpdateTable: (table: RuleExpressionRow[]) => void;
}

interface CompoundRuleState {
  classes: CompoundRuleProps;
  rules: string[];
  defaultRules: RuleExpressionRow[];
}

type RuleExpressionField = "name" | "operator" | "value";
type RuleTableColumns = NonNullable<TableProps<RuleExpressionRow>["columns"]>;

function getRuleExpressionText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

class CompoundRule extends React.Component<CompoundRuleProps, CompoundRuleState> {
  constructor(props: CompoundRuleProps) {
    super(props);
    this.state = {
      classes: props,
      rules: [],
      defaultRules: [
        {
          name: "Start",
          operator: "begin",
          value: "rule1",
        },
        {
          name: "And",
          operator: "and",
          value: "rule2",
        },
      ],
    };
    if (this.props.table.length === 0) {
      this.restore();
    }
  }

  UNSAFE_componentWillMount() {
    this.getRules();
  }

  getRules() {
    return getRules(this.props.owner).then((res: RuleListResponse) => {
      const rules: string[] = [];
      const records = res.data ?? [];
      for (let i = 0; i < records.length; i++) {
        if (Setting.getItemId(records[i]) === this.props.owner + "/" + this.props.ruleName) {
          continue;
        }
        rules.push(Setting.getItemId(records[i]));
      }
      this.setState({
        rules: rules,
      });
    });
  }

  updateTable(table: RuleExpressionRow[]) {
    this.props.onUpdateTable(table);
  }

  updateField(table: RuleExpressionRow[], index: number, key: RuleExpressionField, value: string) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: RuleExpressionRow[]) {
    const row = {name: `New Item - ${table.length}`, operator: "and", value: ""};
    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(table: RuleExpressionRow[], i: number) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
  }

  upRow(table: RuleExpressionRow[], i: number) {
    table = Setting.swapRow(table, i - 1, i);
    this.updateTable(table);
  }

  downRow(table: RuleExpressionRow[], i: number) {
    table = Setting.swapRow(table, i, i + 1);
    this.updateTable(table);
  }

  restore() {
    this.updateTable(this.state.defaultRules);
  }

  renderTable(table: RuleExpressionRow[]) {
    const columns: RuleTableColumns = [
      {
        title: t("rule:Logic"),
        dataIndex: "operator",
        key: "operator",
        width: "180px",
        render: (text: unknown, _record: RuleExpressionRow, index: number) => {
          const options = [];
          if (index !== 0) {
            options.push({value: "and", text: t("rule:and")});
            options.push({value: "or", text: t("rule:or")});
          } else {
            options.push({value: "begin", text: t("rule:begin")});
          }
          return (
            <Select value={getRuleExpressionText(text)} virtual={false} style={{width: "100%"}} onChange={(value: string) => {
              this.updateField(table, index, "operator", value);
            }}>
              {
                options.map((item, index) => <Option key={index} value={item.value}>{item.text}</Option>)
              }
            </Select>
          );
        },
      },
      {
        title: t("rule:Rule"),
        dataIndex: "value",
        key: "value",
        render: (text: unknown, _record: RuleExpressionRow, index: number) => (
          <Select value={getRuleExpressionText(text)} virtual={false} style={{width: "100%"}} onChange={(value: string) => {
            this.updateField(table, index, "value", value);
          }}>
            {
              this.state.rules.map((item, index) => <Option key={index} value={item}>{item}</Option>)
            }
          </Select>
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

export default CompoundRule;
