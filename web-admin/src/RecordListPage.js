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
import {Link} from "react-router-dom";
import {Button, Collapse, Descriptions, Drawer, Space, Table, Tag} from "antd";
import * as Setting from "./Setting";
import * as RecordBackend from "./backend/RecordBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import Editor from "./common/Editor";
import AuditOperationsCenter from "./AuditOperationsCenter";
import {buildAuditRecordPresentation, sanitizeAuditDetailValue} from "./recordAuditPresentation";

function tRecord(key, defaultValue = key) {
  const namespacedKey = `record:${key}`;
  const translated = i18next.t(namespacedKey);
  return translated === namespacedKey || translated === key ? defaultValue : translated;
}

const resultColorMap = {
  Succeeded: "success",
  "Needs review": "warning",
  Failed: "error",
};

const riskColorMap = {
  Low: "green",
  Medium: "gold",
  High: "red",
};

class RecordListPage extends BaseListPage {
  UNSAFE_componentWillMount() {
    this.state.pagination.pageSize = 20;
  }

  componentDidMount() {
    super.componentDidMount();
    const {pagination} = this.state;
    this.fetch({pagination});
    this.getForm();
  }

  renderTable(records) {
    let columns = [
      {
        title: tRecord("Event type", "Event type"),
        dataIndex: "action",
        key: "eventType",
        width: 170,
        sorter: true,
        ...this.getColumnSearchProps("action"),
        render: (_, record) => tRecord(buildAuditRecordPresentation(record).eventType),
      },
      {
        title: tRecord("Audit object", "Audit object"),
        dataIndex: "object",
        key: "auditObject",
        width: 220,
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
        ...this.getColumnSearchProps("object"),
        render: (_, record) => buildAuditRecordPresentation(record).objectSummary,
      },
      {
        title: tRecord("Result", "Result"),
        dataIndex: "statusCode",
        key: "result",
        width: 130,
        sorter: true,
        ...this.getColumnSearchProps("statusCode"),
        render: (_, record) => {
          const presentation = buildAuditRecordPresentation(record);
          return <Tag color={resultColorMap[presentation.result] || "default"}>{tRecord(presentation.result)}</Tag>;
        },
      },
      {
        title: tRecord("Risk level", "Risk level"),
        key: "riskLevel",
        width: 120,
        render: (_, record) => {
          const presentation = buildAuditRecordPresentation(record);
          return <Tag color={riskColorMap[presentation.riskLevel] || "default"}>{tRecord(presentation.riskLevel)}</Tag>;
        },
      },
      {
        title: tRecord("Evidence status", "Evidence status"),
        key: "evidenceStatus",
        width: 150,
        render: (_, record) => tRecord(buildAuditRecordPresentation(record).evidenceStatus),
      },
      {
        title: tRecord("Operator", "Operator"),
        dataIndex: "user",
        key: "operator",
        width: 150,
        sorter: true,
        ...this.getColumnSearchProps("user"),
        render: (_, record) => buildAuditRecordPresentation(record).operator,
      },
      {
        title: tRecord("Time", "Time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: 170,
        sorter: true,
        render: text => Setting.getFormattedDate(text),
      },
      {
        title: tRecord("Action", "Action"),
        key: "op",
        width: 100,
        fixed: Setting.isMobile() ? false : "right",
        render: (text, record, index) => (
          <Button type="link" onClick={() => {
            this.setState({
              detailRecord: record,
              detailShow: true,
            });
          }}>
            {i18next.t("general:Detail")}
          </Button>
        ),
      },
    ];

    if (Setting.isLocalAdminUser(this.props.account)) {
      columns = columns.filter(column => column.key !== "name");
    }

    const paginationProps = this.getTablePaginationProps();

    return (
      <div>
        <AuditOperationsCenter
          activeKey="records"
          loading={this.state.loading}
          records={records}
          totals={{records: this.state.pagination.total}}
        />
        <div className="audit-operations-table-section">
          <Table scroll={{x: "max-content"}} columns={columns} dataSource={records} rowKey="id" size="middle" bordered pagination={paginationProps}
            title={() => (
              <div>
                {i18next.t("general:Records")}&nbsp;&nbsp;&nbsp;&nbsp;
              </div>
            )}
            loading={this.state.loading}
            onChange={this.handleTableChange}
          />
        </div>
        {/* TODO: Should be packaged as a component after confirm it run correctly.*/}
        <Drawer
          title={i18next.t("general:Detail")}
          width={Setting.isMobile() ? "100%" : 640}
          placement="right"
          destroyOnClose
          onClose={() => this.setState({detailShow: false})}
          open={this.state.detailShow}
        >
          {this.renderDetailContent()}
        </Drawer>
      </div>
    );
  }

  renderDetailContent() {
    const record = this.state.detailRecord || {};
    const presentation = buildAuditRecordPresentation(record);
    return (
      <Space direction="vertical" size={12} style={{width: "100%", padding: 12}}>
        <Descriptions title={tRecord("Audit event summary", "Audit event summary")} bordered size="small" column={1} layout={Setting.isMobile() ? "vertical" : "horizontal"}>
          <Descriptions.Item label={tRecord("Event type", "Event type")}>{tRecord(presentation.eventType)}</Descriptions.Item>
          <Descriptions.Item label={tRecord("Audit object", "Audit object")}>{presentation.objectSummary}</Descriptions.Item>
          <Descriptions.Item label={tRecord("Result", "Result")}><Tag color={resultColorMap[presentation.result] || "default"}>{tRecord(presentation.result)}</Tag></Descriptions.Item>
          <Descriptions.Item label={tRecord("Risk level", "Risk level")}><Tag color={riskColorMap[presentation.riskLevel] || "default"}>{tRecord(presentation.riskLevel)}</Tag></Descriptions.Item>
          <Descriptions.Item label={tRecord("Evidence status", "Evidence status")}>{tRecord(presentation.evidenceStatus)}</Descriptions.Item>
          <Descriptions.Item label={tRecord("Operator", "Operator")}>
            {record.organization && record.user ? (
              <Link to={`/users/${record.organization}/${record.user}`}>{presentation.operator}</Link>
            ) : presentation.operator}
          </Descriptions.Item>
          <Descriptions.Item label={tRecord("Time", "Time")}>{Setting.getFormattedDate(record.createdTime)}</Descriptions.Item>
        </Descriptions>
        <Collapse
          className="audit-record-detail-collapse"
          items={[
            {
              key: "request",
              label: tRecord("Technical request details", "Technical request details"),
              children: (
                <Descriptions bordered size="small" column={1} layout={Setting.isMobile() ? "vertical" : "horizontal"}>
                  <Descriptions.Item label={i18next.t("general:ID")}>{this.getDetailField("id")}</Descriptions.Item>
                  <Descriptions.Item label={i18next.t("general:Organization")}>
                    <Link to={`/organizations/${this.getDetailField("organization")}`}>
                      {this.getDetailField("organization")}
                    </Link>
                  </Descriptions.Item>
                  <Descriptions.Item label={i18next.t("general:Client IP")}>{sanitizeAuditDetailValue(this.getDetailField("clientIp"))}</Descriptions.Item>
                  <Descriptions.Item label={i18next.t("general:Method")}>{this.getDetailField("method")}</Descriptions.Item>
                  <Descriptions.Item label={i18next.t("general:Request URI")}>{sanitizeAuditDetailValue(this.getDetailField("requestUri"))}</Descriptions.Item>
                  <Descriptions.Item label={i18next.t("user:Language")}>{this.getDetailField("language")}</Descriptions.Item>
                  <Descriptions.Item label={tRecord("Action", "Action")}>{sanitizeAuditDetailValue(this.getDetailField("action"))}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: "response",
              label: tRecord("Redacted response", "Redacted response"),
              children: (
                <Editor
                  value={sanitizeAuditDetailValue(this.getDetailField("response"))}
                  fillHeight
                  fillWidth
                  maxWidth={this.getEditorMaxWidth()}
                  dark
                  readOnly
                />
              ),
            },
            {
              key: "object",
              label: tRecord("Redacted object payload", "Redacted object payload"),
              children: (
                <Editor
                  value={sanitizeAuditDetailValue(this.getDetailField("object"))}
                  lang="json"
                  fillHeight
                  fillWidth
                  maxWidth={this.getEditorMaxWidth()}
                  dark
                  readOnly
                />
              ),
            },
          ]}
        />
      </Space>
    );
  }

  getEditorMaxWidth = () => {
    return Setting.isMobile() ? window.innerWidth - 60 : 475;
  };

  getDetailField = dataIndex => {
    return this.state.detailRecord ? this.state.detailRecord?.[dataIndex] ?? "" : "";
  };

  fetch = (params = {}) => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.method !== undefined && params.method !== null) {
      field = "method";
      value = params.method;
    }
    this.setState({loading: true});
    RecordBackend.getRecords(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data,
            pagination: {
              ...params.pagination,
              total: res.data2,
            },
            searchText: params.searchText,
            searchedColumn: params.searchedColumn,
            detailShow: false,
            detailRecord: null,
          });
        } else {
          if (res.data.includes("Please login first")) {
            this.setState({
              loading: false,
              isAuthorized: false,
            });
          }
        }
      });
  };
}

export default RecordListPage;
