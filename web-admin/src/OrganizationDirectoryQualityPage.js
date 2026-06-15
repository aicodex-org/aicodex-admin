// Copyright 2026 The AICodex Authors. All Rights Reserved.
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

import React, {useEffect, useMemo, useState} from "react";
import {Button, Descriptions, Drawer, Empty, Input, Select, Space, Table, Tag, Typography} from "antd";
import {DownloadOutlined, ReloadOutlined} from "@ant-design/icons";
import OrganizationSelect from "./common/select/OrganizationSelect";
import * as Setting from "./Setting";
import * as PlatformApiMappingBackend from "./backend/PlatformApiMappingBackend";

const {Text, Title} = Typography;

const entityOptions = [
  {label: "用户", value: "user"},
  {label: "部门", value: "department"},
  {label: "成员关系", value: "membership"},
];

const qualityOptions = [
  {label: "全部状态", value: ""},
  {label: "Blocked", value: "blocked"},
  {label: "Warning", value: "warning"},
  {label: "Ready", value: "ready"},
];

function qualityTag(status) {
  const color = status === "blocked" ? "red" : status === "warning" ? "gold" : "green";
  return <Tag color={color}>{status || "ready"}</Tag>;
}

function priorityTag(priority) {
  const color = priority === "P0" ? "red" : priority === "P1" ? "orange" : priority === "P2" ? "gold" : "blue";
  return <Tag color={color}>{priority || "P3"}</Tag>;
}

function compactText(value) {
  if (!value) {
    return "-";
  }
  if (String(value).length <= 36) {
    return value;
  }
  return `${String(value).slice(0, 18)}...${String(value).slice(-10)}`;
}

function renderTags(values, color) {
  if (!values || values.length === 0) {
    return <Text type="secondary">-</Text>;
  }
  return values.map(value => <Tag color={color} key={value}>{value}</Tag>);
}

export default function OrganizationDirectoryQualityPage(props) {
  const [organization, setOrganization] = useState(props.account?.owner || "built-in");
  const [entityType, setEntityType] = useState("user");
  const [qualityStatus, setQualityStatus] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceConnectionIdHash, setSourceConnectionIdHash] = useState("");
  const [keyword, setKeyword] = useState("");
  const [pagination, setPagination] = useState({current: 1, pageSize: 10});
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [data, setData] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [preflightData, setPreflightData] = useState(null);

  const currentPlanOptions = () => ({
    entityType,
    qualityStatus,
    reasonCode,
    lifecycleStatus,
    sourceType,
    sourceConnectionIdHash,
    keyword,
    limit: 100,
    topN: 20,
  });

  const loadDirectoryQuality = (nextPagination = pagination) => {
    setLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryQuality(organization, {
      entityType,
      qualityStatus,
      reasonCode,
      lifecycleStatus,
      sourceType,
      sourceConnectionIdHash,
      keyword,
      current: nextPagination.current,
      pageSize: nextPagination.pageSize,
    }).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载组织目录质量失败");
        setData(null);
        return;
      }
      setData(res.data);
      setPagination({
        current: res.data?.page || nextPagination.current,
        pageSize: res.data?.pageSize || nextPagination.pageSize,
      });
    }).finally(() => setLoading(false));
  };

  const loadRemediationPlan = () => {
    setPlanLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryRemediationPlan(organization, currentPlanOptions()).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载组织目录修复计划失败");
        setPlanData(null);
        return;
      }
      setPlanData(res.data);
    }).finally(() => setPlanLoading(false));
  };

  const loadActionDrafts = (plan) => {
    setSelectedPlan(plan);
    setDraftData(null);
    setPreflightData(null);
    setDraftLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryRemediationActionDrafts(organization, {
      ...currentPlanOptions(),
      actionAlias: plan.actionAlias,
      reasonCode: (plan.reasonCodes || [])[0] || reasonCode,
      limit: 100,
      topN: 20,
    }).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载组织目录修复草案失败");
        setDraftData(null);
        return;
      }
      setDraftData(res.data);
    }).finally(() => setDraftLoading(false));
  };

  const loadPreflight = (draft) => {
    setPreflightData(null);
    setPreflightLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryRemediationPreflight(organization, {
      ...currentPlanOptions(),
      draftId: draft.draftId,
      actionAlias: draft.actionAlias || selectedPlan?.actionAlias,
      entityType: draft.entityType || entityType,
      reasonCode: (selectedPlan?.reasonCodes || [])[0] || reasonCode,
      limit: 100,
      topN: 20,
    }).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载组织目录修复预检失败");
        setPreflightData(null);
        return;
      }
      setPreflightData(res.data);
    }).finally(() => setPreflightLoading(false));
  };

  const loadAll = (nextPagination = pagination) => Promise.all([
    loadDirectoryQuality(nextPagination),
    loadRemediationPlan(),
  ]);

  useEffect(() => {
    loadAll({current: 1, pageSize: pagination.pageSize});
  }, []);

  const reasonOptions = useMemo(() => {
    const aliases = data?.reasonAliases || [];
    return [{label: "全部原因", value: ""}, ...aliases.map(alias => ({label: alias, value: alias}))];
  }, [data]);

  const columns = [
    {
      title: "质量",
      dataIndex: "qualityStatus",
      width: 110,
      render: qualityTag,
    },
    {
      title: "对象",
      dataIndex: "displayName",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.displayName || record.entityId}</Text>
          <Text type="secondary">{record.entityId}</Text>
        </Space>
      ),
    },
    {
      title: "来源",
      dataIndex: "sourceType",
      width: 130,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.sourceType || "-"}</Text>
          <Text type="secondary">{compactText(record.sourceConnectionIdHash)}</Text>
        </Space>
      ),
    },
    {
      title: "版本/批次",
      dataIndex: "orgVersion",
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{compactText(record.orgVersion)}</Text>
          <Text type="secondary">{compactText(record.syncBatchId)}</Text>
        </Space>
      ),
    },
    {
      title: "原因",
      dataIndex: "reasonCodes",
      render: values => renderTags(values, "volcano"),
    },
    {
      title: "操作",
      width: 90,
      render: (_, record) => <Button type="link" onClick={() => setSelectedItem(record)}>详情</Button>,
    },
  ];

  const planColumns = [
    {
      title: "优先级",
      dataIndex: "priority",
      width: 90,
      render: priorityTag,
    },
    {
      title: "修复计划",
      dataIndex: "actionAlias",
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.actionAlias}</Text>
          <Text type="secondary">影响 {record.affectedCounts?.total || 0}</Text>
        </Space>
      ),
    },
    {
      title: "原因",
      dataIndex: "reasonCodes",
      render: values => renderTags(values, "volcano"),
    },
    {
      title: "样例",
      dataIndex: "sampleEntityIds",
      width: 220,
      render: values => (
        <Space direction="vertical" size={0}>
          {(values || []).slice(0, 3).map(value => <Text key={value} type="secondary">{compactText(value)}</Text>)}
          {(!values || values.length === 0) && <Text type="secondary">-</Text>}
        </Space>
      ),
    },
    {
      title: "摘要",
      dataIndex: "safeSummary",
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text>{record.safeSummary || "-"}</Text>
          <div>{renderTags(record.operatorActions, "blue")}</div>
          {record.blockedReason && <Text type="danger">{record.blockedReason}</Text>}
        </Space>
      ),
    },
    {
      title: "操作",
      width: 90,
      render: (_, record) => <Button type="link" onClick={() => loadActionDrafts(record)}>草案</Button>,
    },
  ];

  const tableLocale = {
    emptyText: loading ? "加载中" : <Empty description="暂无匹配的目录质量记录" />,
  };

  const planTableLocale = {
    emptyText: planLoading ? "加载中" : <Empty description="暂无待处理修复计划" />,
  };

  const exportRemediationPlan = () => {
    if (!planData?.exportSummary) {
      Setting.showMessage("warning", "暂无可导出的修复计划");
      return;
    }
    const blob = new Blob([JSON.stringify(planData.exportSummary, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-plan-${organization || "empty"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const draftExportPayload = draftData?.exportSummary || {
    organizationId: draftData?.organizationId,
    boundary: draftData?.boundary,
    drafts: draftData?.drafts || [],
  };

  const copyActionDraft = () => {
    const content = JSON.stringify(draftExportPayload, null, 2);
    if (!navigator.clipboard?.writeText) {
      Setting.showMessage("error", "当前浏览器不支持复制草案");
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      Setting.showMessage("success", "已复制脱敏草案");
    }).catch(() => {
      Setting.showMessage("error", "复制脱敏草案失败");
    });
  };

  const exportActionDraft = () => {
    if (!draftData?.drafts || draftData.drafts.length === 0) {
      Setting.showMessage("warning", "暂无可导出的修复草案");
      return;
    }
    const blob = new Blob([JSON.stringify(draftExportPayload, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-action-drafts-${organization || "empty"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const preflightExportPayload = preflightData?.exportSummary || {
    organizationId: preflightData?.organizationId,
    boundary: preflightData?.boundary,
    preflights: preflightData?.preflights || [],
  };

  const exportPreflight = () => {
    if (!preflightData?.preflights || preflightData.preflights.length === 0) {
      Setting.showMessage("warning", "暂无可导出的预检");
      return;
    }
    const blob = new Blob([JSON.stringify(preflightExportPayload, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-preflight-${organization || "empty"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedPreflight = preflightData?.preflights?.[0];

  return (
    <div style={{padding: 24}}>
      <Space direction="vertical" size={16} style={{width: "100%"}}>
        <Space align="center" wrap>
          <Title level={3} style={{margin: 0}}>组织目录质量</Title>
          <OrganizationSelect initValue={organization} onChange={(value) => setOrganization(value)} />
          <Button icon={<ReloadOutlined />} onClick={() => loadAll({current: 1, pageSize: pagination.pageSize})}>刷新</Button>
        </Space>

        <Space wrap>
          <Select style={{width: 130}} value={entityType} options={entityOptions} onChange={(value) => {
            setEntityType(value);
            setPagination({...pagination, current: 1});
          }} />
          <Select style={{width: 130}} value={qualityStatus} options={qualityOptions} onChange={value => setQualityStatus(value)} />
          <Select style={{width: 220}} value={reasonCode} options={reasonOptions} onChange={value => setReasonCode(value)} />
          <Input style={{width: 150}} placeholder="生命周期" value={lifecycleStatus} onChange={event => setLifecycleStatus(event.target.value)} />
          <Input style={{width: 140}} placeholder="来源类型" value={sourceType} onChange={event => setSourceType(event.target.value)} />
          <Input style={{width: 210}} placeholder="来源连接 Hash" value={sourceConnectionIdHash} onChange={event => setSourceConnectionIdHash(event.target.value)} />
          <Input.Search style={{width: 220}} placeholder="关键字" value={keyword} onChange={event => setKeyword(event.target.value)} onSearch={() => loadAll({current: 1, pageSize: pagination.pageSize})} />
        </Space>

        <Space wrap>
          <Tag color="red">blocked {data?.summary?.blocked || 0}</Tag>
          <Tag color="gold">warning {data?.summary?.warning || 0}</Tag>
          <Tag color="green">ready {data?.summary?.ready || 0}</Tag>
          <Text type="secondary">{data?.boundary || "Admin producer diagnostics only."}</Text>
        </Space>

        <div style={{border: "1px solid #f0f0f0", borderRadius: 6, padding: 16}}>
          <Space direction="vertical" size={12} style={{width: "100%"}}>
            <Space align="center" wrap style={{justifyContent: "space-between", width: "100%"}}>
              <Space align="center" wrap>
                <Title level={4} style={{margin: 0}}>修复计划</Title>
                <Tag color="purple">plans {planData?.totalPlanCount || 0}</Tag>
                <Text type="secondary">{planData?.boundary || "Read-only Admin diagnostics."}</Text>
              </Space>
              <Button icon={<DownloadOutlined />} onClick={exportRemediationPlan}>导出计划</Button>
            </Space>
            <Table
              rowKey={(record) => record.planId || record.planKey}
              size="small"
              loading={planLoading}
              columns={planColumns}
              dataSource={planData?.plans || []}
              locale={planTableLocale}
              pagination={false}
            />
          </Space>
        </div>

        <Table
          rowKey={(record) => `${record.entityType}:${record.entityId}`}
          loading={loading}
          columns={columns}
          dataSource={data?.items || []}
          locale={tableLocale}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
          }}
          onChange={(next) => {
            const nextPagination = {current: next.current, pageSize: next.pageSize};
            setPagination(nextPagination);
            loadDirectoryQuality(nextPagination);
          }}
        />
      </Space>

      <Drawer
        title={selectedItem ? `${selectedItem.displayName || selectedItem.entityId} 详情` : "详情"}
        open={!!selectedItem}
        width={560}
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <Space direction="vertical" size={16} style={{width: "100%"}}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="质量">{qualityTag(selectedItem.qualityStatus)}</Descriptions.Item>
              <Descriptions.Item label="对象 ID">{selectedItem.entityId}</Descriptions.Item>
              <Descriptions.Item label="生命周期">{selectedItem.lifecycleStatus || "-"}</Descriptions.Item>
              <Descriptions.Item label="来源类型">{selectedItem.sourceType || "-"}</Descriptions.Item>
              <Descriptions.Item label="来源连接 Hash">{selectedItem.sourceConnectionIdHash || "-"}</Descriptions.Item>
              <Descriptions.Item label="外部 ID Hash">{selectedItem.externalIdHash || "-"}</Descriptions.Item>
              <Descriptions.Item label="同步批次">{selectedItem.syncBatchId || "-"}</Descriptions.Item>
              <Descriptions.Item label="组织版本">{selectedItem.orgVersion || "-"}</Descriptions.Item>
            </Descriptions>
            <div>
              <Text strong>Reason codes</Text>
              <div style={{marginTop: 8}}>{renderTags(selectedItem.reasonCodes, "volcano")}</div>
            </div>
            <div>
              <Text strong>修复提示</Text>
              <div style={{marginTop: 8}}>{renderTags(selectedItem.remediationHints, "blue")}</div>
            </div>
          </Space>
        )}
      </Drawer>
      <Drawer
        title={selectedPlan ? `${selectedPlan.actionAlias} 草案` : "修复草案"}
        open={!!selectedPlan}
        width={720}
        onClose={() => {
          setSelectedPlan(null);
          setDraftData(null);
          setPreflightData(null);
        }}
      >
        <Space direction="vertical" size={16} style={{width: "100%"}}>
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={exportActionDraft} disabled={!draftData?.drafts?.length}>导出草案</Button>
            <Button onClick={copyActionDraft} disabled={!draftData?.drafts?.length}>复制草案</Button>
          </Space>
          <Text type="secondary">{draftData?.boundary || "Admin producer manual review only."}</Text>
          <Table
            rowKey={(record) => record.draftId}
            size="small"
            loading={draftLoading}
            dataSource={draftData?.drafts || []}
            pagination={false}
            locale={{emptyText: draftLoading ? "加载中" : <Empty description="暂无可生成的修复草案" />}}
            columns={[
              {
                title: "草案",
                dataIndex: "actionAlias",
                width: 170,
                render: (_, record) => (
                  <Space direction="vertical" size={0}>
                    <Text strong>{record.actionAlias}</Text>
                    {priorityTag(record.priority)}
                    <Tag color="blue">{record.executionMode}</Tag>
                  </Space>
                ),
              },
              {
                title: "范围",
                width: 140,
                render: (_, record) => (
                  <Space direction="vertical" size={0}>
                    <Text>{record.entityType}</Text>
                    <Text type="secondary">影响 {record.affectedCount || 0}</Text>
                  </Space>
                ),
              },
              {
                title: "执行前置",
                dataIndex: "preconditions",
                render: values => (
                  <Space direction="vertical" size={0}>
                    {(values || []).map(value => <Text key={value}>{value}</Text>)}
                  </Space>
                ),
              },
              {
                title: "操作步骤",
                dataIndex: "operatorSteps",
                render: values => (
                  <Space direction="vertical" size={0}>
                    {(values || []).map(value => <Text key={value}>{value}</Text>)}
                  </Space>
                ),
              },
              {
                title: "脱敏样例",
                dataIndex: "samples",
                render: values => (
                  <Space direction="vertical" size={0}>
                    {preflightData && <Text type="secondary">查看下方预检样例</Text>}
                    {!preflightData && (
                      <>
                        {(values || []).slice(0, 5).map(sample => (
                          <Text key={sample.entityHash} type="secondary">
                            {sample.displaySafeLabel || sample.entityHash} / {sample.sourceType || "-"} / {sample.qualityStatus || "-"}
                          </Text>
                        ))}
                        {(!values || values.length === 0) && <Text type="secondary">-</Text>}
                      </>
                    )}
                  </Space>
                ),
              },
              {
                title: "阻塞",
                dataIndex: "blockedReason",
                render: value => value ? <Text type="danger">{value}</Text> : <Text type="secondary">-</Text>,
              },
              {
                title: "操作",
                width: 90,
                render: (_, record) => <Button type="link" onClick={() => loadPreflight(record)}>预检</Button>,
              },
            ]}
          />
          {(preflightLoading || preflightData) && (
            <div style={{border: "1px solid #f0f0f0", borderRadius: 6, padding: 12}}>
              <Space direction="vertical" size={12} style={{width: "100%"}}>
                <Space align="center" wrap style={{justifyContent: "space-between", width: "100%"}}>
                  <Space align="center" wrap>
                    <Title level={5} style={{margin: 0}}>预检</Title>
                    {selectedPreflight && <Tag color="blue">{selectedPreflight.executionMode}</Tag>}
                    <Text type="secondary">{preflightData?.boundary || "Admin producer preflight only."}</Text>
                  </Space>
                  <Button icon={<DownloadOutlined />} onClick={exportPreflight} disabled={!preflightData?.preflights?.length}>导出预检</Button>
                </Space>
                {preflightLoading && <Text type="secondary">加载预检中</Text>}
                {selectedPreflight && (
                  <Space direction="vertical" size={8} style={{width: "100%"}}>
                    <Space wrap>
                      <Text>readyForManualReview: {String(selectedPreflight.readyForManualReview)}</Text>
                      <Text>autoExecutionAllowed: {String(selectedPreflight.autoExecutionAllowed)}</Text>
                    </Space>
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="阻塞原因">{renderTags(selectedPreflight.blockedReasons, "red")}</Descriptions.Item>
                      <Descriptions.Item label="前置条件">{renderTags(selectedPreflight.preconditions, "blue")}</Descriptions.Item>
                      <Descriptions.Item label="安全清单">{renderTags(selectedPreflight.safetyChecklist, "purple")}</Descriptions.Item>
                      <Descriptions.Item label="影响范围">
                        <Space wrap>
                          {Object.entries(selectedPreflight.affectedCounts || {}).map(([key, value]) => <Tag key={key}>{key}: {value}</Tag>)}
                          {Object.keys(selectedPreflight.affectedCounts || {}).length === 0 && <Text type="secondary">-</Text>}
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="下一步">{renderTags(selectedPreflight.operatorNextSteps, "geekblue")}</Descriptions.Item>
                    </Descriptions>
                    <Table
                      rowKey={(record) => record.entityHash || record.displaySafeLabel}
                      size="small"
                      pagination={false}
                      dataSource={selectedPreflight.sampleDigests || []}
                      locale={{emptyText: <Empty description="暂无脱敏样例" />}}
                      columns={[
                        {
                          title: "脱敏样例",
                          render: (_, sample) => (
                            <Space direction="vertical" size={0}>
                              <Text>{sample.displaySafeLabel || sample.entityHash}</Text>
                              <Text type="secondary">{sample.sourceType || "-"} / {sample.qualityStatus || "-"} / {sample.lifecycleStatus || "-"}</Text>
                            </Space>
                          ),
                        },
                        {
                          title: "原因",
                          dataIndex: "reasonCodes",
                          render: values => renderTags(values, "volcano"),
                        },
                        {
                          title: "版本",
                          render: (_, sample) => <Text type="secondary">{compactText(sample.orgVersion)} / {compactText(sample.sourceVersion)}</Text>,
                        },
                      ]}
                    />
                  </Space>
                )}
              </Space>
            </div>
          )}
        </Space>
      </Drawer>
    </div>
  );
}
