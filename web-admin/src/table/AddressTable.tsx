// Copyright 2026 The Casdoor Authors. All Rights Reserved.
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
import {AutoComplete, Button, Col, Input, Row, Table, Tooltip} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
import RegionSelect from "../common/select/RegionSelect";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

const TAG_OPTIONS = [
  {value: "Home", label: "Home"},
  {value: "Work", label: "Work"},
  {value: "Other", label: "Other"},
];

class AddressTable extends React.Component<LegacyAny, LegacyAny> {
  constructor(props: LegacyAny) {
    super(props);
    this.state = {
      classes: props,
      addresses: this.props.table !== null ? this.props.table.map((item: LegacyAny, index: number) => {
        item.key = index;
        return item;
      }) : [],
    };
  }

  count = this.props.table?.length ?? 0;

  updateTable(table: LegacyAny) {
    this.setState({
      addresses: table,
    });

    this.props.onUpdateTable([...table].map((item) => {
      const newItem = Setting.deepCopy(item);
      delete newItem.key;
      return newItem;
    }));
  }

  updateField(table: LegacyAny, index: number, key: string, value: LegacyAny) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table: LegacyAny) {
    const row = {key: this.count, tag: "", line1: "", line2: "", city: "", state: "", zipCode: "", region: ""};
    if (table === undefined || table === null) {
      table = [];
    }

    this.count += 1;
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
        title: t("user:Tag"),
        dataIndex: "tag",
        key: "tag",
        width: "100px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          const tagOptions = TAG_OPTIONS.map(opt => ({...opt, label: opt.value === "Home" ? t("general:Home") : opt.value === "Work" ? t("user:Work") : t("user:Other")}));
          return (
            <AutoComplete
              size="small"
              style={{width: "100%"}}
              value={text || ""}
              options={tagOptions}
              onChange={(value: LegacyAny) => {
                this.updateField(table, index, "tag", value);
              }}
              onSelect={(value: LegacyAny) => {
                this.updateField(table, index, "tag", value);
              }}
            />
          );
        },
      },
      {
        title: t("user:Line 1"),
        dataIndex: "line1",
        key: "line1",
        width: "150px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Input size="small" value={text} onChange={e => {
              this.updateField(table, index, "line1", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("user:Line 2"),
        dataIndex: "line2",
        key: "line2",
        width: "150px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Input size="small" value={text} onChange={e => {
              this.updateField(table, index, "line2", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("user:City"),
        dataIndex: "city",
        key: "city",
        width: "120px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Input size="small" value={text} onChange={e => {
              this.updateField(table, index, "city", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "100px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Input size="small" value={text} onChange={e => {
              this.updateField(table, index, "state", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("user:Zip code"),
        dataIndex: "zipCode",
        key: "zipCode",
        width: "100px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <Input size="small" value={text} onChange={e => {
              this.updateField(table, index, "zipCode", e.target.value);
            }} />
          );
        },
      },
      {
        title: t("provider:Region"),
        dataIndex: "region",
        key: "region",
        width: "150px",
        render: (text: LegacyAny, record: LegacyAny, index: number) => {
          return (
            <RegionSelect
              size="small"
              value={text}
              onChange={(value: LegacyAny) => {
                this.updateField(table, index, "region", value);
              }}
            />
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
      <Table scroll={{x: "max-content"}} rowKey="key" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={() => (
          <div>
            {this.props.title}&nbsp;&nbsp;&nbsp;&nbsp;
            <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{t("general:Add")}</Button>
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
              this.renderTable(this.state.addresses)
            }
          </Col>
        </Row>
      </div>
    );
  }
}

export default AddressTable;
