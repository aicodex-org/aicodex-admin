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
import {Switch, Table} from "antd";
import i18next from "i18next";

export interface ToolRecord {
  name?: string;
  description?: string;
  isAllowed?: boolean;
  [key: string]: unknown;
}

interface ToolTableProps {
  tools?: ToolRecord[];
  onUpdateTable: (table: ToolRecord[]) => void;
}

class ToolTable extends React.Component<ToolTableProps> {
  updateTable(table: ToolRecord[]): void {
    this.props.onUpdateTable(table);
  }

  updateToolEnable(table: ToolRecord[], index: number, value: boolean): void {
    const newTable = [...(table || [])];
    newTable[index] = {
      ...newTable[index],
      isAllowed: value,
    };
    this.updateTable(newTable);
  }

  renderTable(table: ToolRecord[]): React.ReactNode {
    const columns: import("antd/es/table").ColumnsType<ToolRecord> = [
      {
        title: String(i18next.t("general:Name")),
        dataIndex: "name",
        key: "name",
        width: "260px",
      },
      {
        title: String(i18next.t("general:Description")),
        dataIndex: "description",
        key: "description",
      },
      {
        title: String(i18next.t("general:Is allowed")),
        dataIndex: "isAllowed",
        key: "isAllowed",
        width: "120px",
        render: (_text: boolean, record: ToolRecord, index: number) => {
          return (
            <Switch checked={record.isAllowed} onChange={(checked) => {
              this.updateToolEnable(table, index, checked);
            }} />
          );
        },
      },
    ];

    return (
      <Table
        rowKey={(record, index) => record.name || `tool-${index}`}
        columns={columns}
        dataSource={table || []}
        size="middle"
        bordered
        pagination={false}
      />
    );
  }

  render() {
    return this.renderTable(this.props.tools || []);
  }
}

export default ToolTable;
