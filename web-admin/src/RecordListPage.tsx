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
import {Button, Collapse, Descriptions, Drawer, Space, Tag, Tooltip} from "antd";
import {CheckOutlined, CopyOutlined, FileSearchOutlined} from "@ant-design/icons";
import copy from "copy-to-clipboard";
import * as Setting from "./Setting";
import * as RecordBackend from "./backend/RecordBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import Editor from "./common/Editor";
import {buildAuditRecordPresentation, sanitizeAuditDetailValue} from "./recordAuditPresentation";
import LegacyListPageToolbar from "./common/LegacyListPageToolbar";
import ListPageRowActions, {ListPageRowActionButton} from "./common/ListPageRowActions";
import ListPageTable from "./common/ListPageTable";
import {getAuditOperationsTableScroll} from "./auditOperationsListTable";
import type {AdminRouteProps, LegacyAny, LegacyBackendResponse, LegacyFetchParams, LegacyListState} from "./types/legacyPage";
import {legacyColumns, textValue} from "./types/legacyPage";

type AuditCopyFeedback = {
  label: string;
  status: "success" | "error";
};

type AuditRecord = {
  id?: string | number;
  action?: string;
  object?: string;
  statusCode?: number | string;
  user?: string;
  organization?: string;
  createdTime?: string;
  response?: string;
  clientIp?: string;
  method?: string;
  requestUri?: string;
  language?: string;
  [key: string]: LegacyAny;
};

interface RecordListPageState extends LegacyListState<AuditRecord> {
  advancedFiltersOpen?: boolean;
  detailShow?: boolean;
  detailRecord?: AuditRecord | null;
  auditDetailCopyFeedback?: AuditCopyFeedback | null;
}

type RecordListResponse = LegacyBackendResponse<AuditRecord[]> & {
  data: AuditRecord[];
  data2: number;
};

type RecordBackendApi = {
  getRecords: (
    owner: string,
    page?: number,
    pageSize?: number,
    field?: string,
    value?: LegacyAny,
    sortField?: string,
    sortOrder?: string
  ) => Promise<RecordListResponse>;
};

const recordBackend = RecordBackend as unknown as RecordBackendApi;
const LegacyBaseListPage = BaseListPage as unknown as React.ComponentClass<AdminRouteProps, RecordListPageState> & LegacyAny;

function t(key: string): string {
  return i18next.t(key) as string;
}

function tRecord(key: string, defaultValue = key): string {
  const namespacedKey = `record:${key}`;
  const translated = t(namespacedKey);
  return translated === namespacedKey || translated === key ? defaultValue : translated;
}

const resultColorMap: Record<string, string> = {
  Succeeded: "success",
  "Needs review": "warning",
  Failed: "error",
};

const riskColorMap: Record<string, string> = {
  Low: "green",
  Medium: "gold",
  High: "red",
};

function getRecordQueryFields() {
  return [
    {label: tRecord("Event type", "Event type"), value: "action"},
    {label: tRecord("Audit object", "Audit object"), value: "object"},
    {label: tRecord("Result", "Result"), value: "statusCode"},
    {label: tRecord("Operator", "Operator"), value: "user"},
    {label: t("general:Method"), value: "method"},
  ];
}

class RecordListPage extends LegacyBaseListPage {
  auditDetailCopyFeedbackTimer?: ReturnType<typeof setTimeout>;

  UNSAFE_componentWillMount() {
    this.state.pagination.pageSize = 20;
  }

  componentDidMount() {
    super.componentDidMount();
    const {pagination} = this.state;
    this.fetch({pagination});
    this.getForm();
  }

  componentWillUnmount() {
    if (this.auditDetailCopyFeedbackTimer) {
      clearTimeout(this.auditDetailCopyFeedbackTimer);
    }
    super.componentWillUnmount();
  }

  renderTable(records: AuditRecord[]): React.ReactElement {
    let columns = legacyColumns<AuditRecord>([
      {
        title: tRecord("Event type", "Event type"),
        dataIndex: "action",
        key: "eventType",
        width: 150,
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
        render: (_: unknown, record: AuditRecord) => tRecord(buildAuditRecordPresentation(record).eventType),
      },
      {
        title: tRecord("Audit object", "Audit object"),
        dataIndex: "object",
        key: "auditObject",
        width: 200,
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
        render: (_: unknown, record: AuditRecord) => buildAuditRecordPresentation(record).objectSummary,
      },
      {
        title: tRecord("Result", "Result"),
        dataIndex: "statusCode",
        key: "result",
        width: 100,
        sorter: true,
        render: (_: unknown, record: AuditRecord) => {
          const presentation = buildAuditRecordPresentation(record);
          return <Tag color={resultColorMap[presentation.result] || "default"}>{tRecord(presentation.result)}</Tag>;
        },
      },
      {
        title: tRecord("Risk level", "Risk level"),
        key: "riskLevel",
        width: 100,
        render: (_: unknown, record: AuditRecord) => {
          const presentation = buildAuditRecordPresentation(record);
          return <Tag color={riskColorMap[presentation.riskLevel] || "default"}>{tRecord(presentation.riskLevel)}</Tag>;
        },
      },
      {
        title: tRecord("Evidence status", "Evidence status"),
        key: "evidenceStatus",
        width: 120,
        ellipsis: {
          showTitle: false,
        },
        render: (_: unknown, record: AuditRecord) => tRecord(buildAuditRecordPresentation(record).evidenceStatus),
      },
      {
        title: tRecord("Operator", "Operator"),
        dataIndex: "user",
        key: "operator",
        width: 130,
        sorter: true,
        ellipsis: {
          showTitle: false,
        },
        render: (_: unknown, record: AuditRecord) => buildAuditRecordPresentation(record).operator,
      },
      {
        title: tRecord("Time", "Time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: 150,
        sorter: true,
        render: (text: unknown) => Setting.getFormattedDate(textValue(text)),
      },
      {
        title: tRecord("Action", "Action"),
        key: "op",
        width: 88,
        render: (_text: unknown, record: AuditRecord) => (
          <ListPageRowActions className="record-row-actions">
            <ListPageRowActionButton icon={<FileSearchOutlined />} onClick={() => {
              this.setState({
                detailRecord: record,
                detailShow: true,
              });
            }}>
              {t("general:Detail")}
            </ListPageRowActionButton>
          </ListPageRowActions>
        ),
      },
    ]);

    if (Setting.isLocalAdminUser(this.props.account)) {
      columns = columns.filter(column => column.key !== "name");
    }

    const paginationProps = this.getTablePaginationProps();

    return (
      <div className="audit-operations-list-route-body">
        <div className="enterprise-list-page-table-shell audit-operations-list-page-table-shell record-list-page-table-shell">
          <ListPageTable className="audit-operations-list-table record-list-table" scroll={getAuditOperationsTableScroll(this.state.advancedFiltersOpen)} columns={columns} dataSource={records} rowKey="id" pagination={paginationProps}
            title={() => (
              <LegacyListPageToolbar
                host={this}
                title={t("general:Audit Records")}
                total={this.state.pagination.total}
                fields={getRecordQueryFields()}
                defaultField="action"
                onAdvancedOpenChange={(advancedFiltersOpen) => this.setState({advancedFiltersOpen})}
              />
            )}
            loading={this.state.loading}
            onChange={this.handleTableChange}
          />
        </div>
        {/* TODO: Should be packaged as a component after confirm it run correctly.*/}
        <Drawer
          className="audit-record-detail-drawer"
          title={t("general:Detail")}
          width={Setting.isMobile() ? "100%" : 720}
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
    const responseValue = sanitizeAuditDetailValue(this.getDetailField("response"));
    const objectValue = sanitizeAuditDetailValue(this.getDetailField("object"));
    return (
      <div className="audit-record-detail-content" style={{height: "calc(100vh - 56px)", overflowY: "auto"}}>
        <section className="audit-record-detail-summary">
          <div className="audit-record-detail-summary-header">
            <div>
              <div className="audit-record-detail-summary-title">{tRecord("Audit event summary", "Audit event summary")}</div>
              <div className="audit-record-detail-summary-object">{presentation.objectSummary}</div>
            </div>
            <Space size={6} wrap>
              <Tag color={resultColorMap[presentation.result] || "default"}>{tRecord(presentation.result)}</Tag>
              <Tag color={riskColorMap[presentation.riskLevel] || "default"}>{tRecord(presentation.riskLevel)}</Tag>
            </Space>
          </div>
          <div className="audit-record-detail-meta-grid">
            <div className="audit-record-detail-meta-item">
              <span>{tRecord("Event type", "Event type")}</span>
              <strong>{tRecord(presentation.eventType)}</strong>
            </div>
            <div className="audit-record-detail-meta-item">
              <span>{tRecord("Operator", "Operator")}</span>
              <strong>
                {record.organization && record.user ? (
                  <Link to={`/users/${record.organization}/${record.user}`}>{presentation.operator}</Link>
                ) : presentation.operator}
              </strong>
            </div>
            <div className="audit-record-detail-meta-item">
              <span>{tRecord("Time", "Time")}</span>
              <strong>{Setting.getFormattedDate(record.createdTime)}</strong>
            </div>
            <div className="audit-record-detail-meta-item">
              <span>{tRecord("Evidence status", "Evidence status")}</span>
              <strong>{tRecord(presentation.evidenceStatus)}</strong>
            </div>
          </div>
        </section>
        <Collapse
          className="audit-record-detail-collapse"
          bordered={false}
          defaultActiveKey={["request", "response", "object"]}
          items={[
            {
              key: "request",
              label: tRecord("Technical request details", "Technical request details"),
              children: (
                <Descriptions bordered size="small" column={1} layout={Setting.isMobile() ? "vertical" : "horizontal"}>
                  <Descriptions.Item label={t("general:ID")}>{this.getDetailField("id")}</Descriptions.Item>
                  <Descriptions.Item label={t("general:Organization")}>
                    <Link to={`/organizations/${this.getDetailField("organization")}`}>
                      {this.getDetailField("organization")}
                    </Link>
                  </Descriptions.Item>
                  <Descriptions.Item label={t("general:Client IP")}>{sanitizeAuditDetailValue(this.getDetailField("clientIp"))}</Descriptions.Item>
                  <Descriptions.Item label={t("general:Method")}>{this.getDetailField("method")}</Descriptions.Item>
                  <Descriptions.Item label={t("general:Request URI")}>{sanitizeAuditDetailValue(this.getDetailField("requestUri"))}</Descriptions.Item>
                  <Descriptions.Item label={t("user:Language")}>{this.getDetailField("language")}</Descriptions.Item>
                  <Descriptions.Item label={tRecord("Action", "Action")}>{sanitizeAuditDetailValue(this.getDetailField("action"))}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: "response",
              label: tRecord("Redacted response", "Redacted response"),
              extra: this.renderCodeCopyAction(tRecord("Redacted response", "Redacted response"), responseValue),
              children: (
                <div className="audit-record-detail-code-panel">
                  <Editor
                    value={responseValue}
                    height="180px"
                    fillWidth
                    maxWidth={this.getEditorMaxWidth()}
                    dark
                    readOnly
                  />
                </div>
              ),
            },
            {
              key: "object",
              label: tRecord("Redacted object payload", "Redacted object payload"),
              extra: this.renderCodeCopyAction(tRecord("Redacted object payload", "Redacted object payload"), objectValue),
              children: (
                <div className="audit-record-detail-code-panel">
                  <Editor
                    value={objectValue}
                    lang="json"
                    fillWidth
                    maxWidth={this.getEditorMaxWidth()}
                    dark
                    readOnly
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  }

  renderCodeCopyAction = (label: string, value: string): React.ReactElement => {
    const feedback = this.state.auditDetailCopyFeedback;
    const isCurrentFeedback = feedback?.label === label;
    const isCopied = isCurrentFeedback && feedback.status === "success";
    const isFailed = isCurrentFeedback && feedback.status === "error";
    const tooltipTitle = isCopied
      ? t("general:Copied to clipboard successfully")
      : isFailed
        ? t("general:Failed to copy")
        : t("general:Copy");
    return (
      <Tooltip title={tooltipTitle}>
        <Button
          aria-label={`${t("general:Copy")} ${label}`}
          className={[
            "audit-record-detail-copy-button",
            isCopied ? "audit-record-detail-copy-button-copied" : "",
            isFailed ? "audit-record-detail-copy-button-failed" : "",
          ].filter(Boolean).join(" ")}
          disabled={!value}
          icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
          size="small"
          type="text"
          onClick={(event) => this.copyAuditDetailValue(label, value, event)}
        />
      </Tooltip>
    );
  };

  copyAuditDetailValue = (label: string, value: string, event?: React.MouseEvent<HTMLElement>): void => {
    event?.stopPropagation();
    const copied = copy(value || "");
    if (this.auditDetailCopyFeedbackTimer) {
      clearTimeout(this.auditDetailCopyFeedbackTimer);
    }
    this.setState({
      auditDetailCopyFeedback: {
        label,
        status: copied ? "success" : "error",
      },
    });
    this.auditDetailCopyFeedbackTimer = setTimeout(() => {
      this.setState({auditDetailCopyFeedback: null});
    }, 2400);
  };

  getEditorMaxWidth = (): number | string => {
    return Setting.isMobile() ? window.innerWidth - 48 : "100%";
  };

  getDetailField = (dataIndex: keyof AuditRecord): string => {
    return this.state.detailRecord ? this.state.detailRecord?.[dataIndex] ?? "" : "";
  };

  fetch = (params = {} as LegacyFetchParams): void => {
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.method !== undefined && params.method !== null) {
      field = "method";
      value = params.method;
    }
    this.setState({loading: true});
    recordBackend.getRecords(Setting.isDefaultOrganizationSelected(this.props.account) ? "" : Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res: RecordListResponse) => {
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
          if (String(res.data).includes("Please login first")) {
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
