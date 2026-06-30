// Copyright 2023 The Casdoor Authors. All Rights Reserved.
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
import {Table} from "antd";
import i18nextLib from "i18next";

type LegacyAny = any;

const i18next = {t: (key: string, options?: LegacyAny): string => String(options === undefined ? i18nextLib.t(key) : i18nextLib.t(key, options))};

interface PrometheusInfoRow {
  name?: string;
  path?: string;
  method?: string;
  count?: number | string;
  latency?: number | string;
  throughput?: number | string;
  [key: string]: LegacyAny;
}

interface PrometheusInfoTableProps {
  table?: "latency" | "throughput" | string;
  prometheusInfo?: {
    apiLatency?: PrometheusInfoRow[];
    apiThroughput?: PrometheusInfoRow[];
    totalThroughput?: React.ReactNode;
    [key: string]: LegacyAny;
  };
}

interface PrometheusInfoTableState {
  table?: PrometheusInfoTableProps["table"];
}

class PrometheusInfoTable extends React.Component<PrometheusInfoTableProps, PrometheusInfoTableState> {
  constructor(props: PrometheusInfoTableProps) {
    super(props);
    this.state = {
      table: props.table,
    };
  }
  render() {
    const getRowKey = (record: PrometheusInfoRow) => {
      const key = [
        record.name,
        record.path,
        record.method,
        record.count,
        record.latency,
        record.throughput,
      ].filter(value => value !== undefined && value !== null && value !== "").join(":");
      return key || JSON.stringify(record);
    };
    const latencyColumns: LegacyAny[] = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
      },
      {
        title: i18next.t("general:Method"),
        dataIndex: "method",
        key: "method",
      },
      {
        title: i18next.t("system:Count"),
        dataIndex: "count",
        key: "count",
      },
      {
        title: i18next.t("system:Latency") + "(ms)",
        dataIndex: "latency",
        key: "latency",
      },
    ];
    const throughputColumns: LegacyAny[] = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
      },
      {
        title: i18next.t("general:Method"),
        dataIndex: "method",
        key: "method",
      },
      {
        title: i18next.t("system:Throughput"),
        dataIndex: "throughput",
        key: "throughput",
      },
    ];
    if (this.state.table === "latency") {
      return (
        <div className="prometheus-info-table-shell">
          <Table className="prometheus-info-table" rowKey={getRowKey} columns={latencyColumns} dataSource={this.props.prometheusInfo?.apiLatency} pagination={false} />
        </div>
      );
    } else if (this.state.table === "throughput") {
      return (
        <div className="prometheus-info-table-shell">
          <div className="prometheus-info-table-summary">{i18next.t("system:Total Throughput")}: {this.props.prometheusInfo?.totalThroughput}</div>
          <Table className="prometheus-info-table" rowKey={getRowKey} columns={throughputColumns} dataSource={this.props.prometheusInfo?.apiThroughput} pagination={false} />
        </div>
      );
    }
    return null;
  }
}

export default PrometheusInfoTable;
