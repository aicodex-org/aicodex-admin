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
import {ReloadOutlined} from "@ant-design/icons";
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
  const [data, setData] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

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

  useEffect(() => {
    loadDirectoryQuality({current: 1, pageSize: pagination.pageSize});
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

  const tableLocale = {
    emptyText: loading ? "加载中" : <Empty description="暂无匹配的目录质量记录" />,
  };

  return (
    <div style={{padding: 24}}>
      <Space direction="vertical" size={16} style={{width: "100%"}}>
        <Space align="center" wrap>
          <Title level={3} style={{margin: 0}}>组织目录质量</Title>
          <OrganizationSelect initValue={organization} onChange={(value) => setOrganization(value)} />
          <Button icon={<ReloadOutlined />} onClick={() => loadDirectoryQuality({current: 1, pageSize: pagination.pageSize})}>刷新</Button>
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
          <Input.Search style={{width: 220}} placeholder="关键字" value={keyword} onChange={event => setKeyword(event.target.value)} onSearch={() => loadDirectoryQuality({current: 1, pageSize: pagination.pageSize})} />
        </Space>

        <Space wrap>
          <Tag color="red">blocked {data?.summary?.blocked || 0}</Tag>
          <Tag color="gold">warning {data?.summary?.warning || 0}</Tag>
          <Tag color="green">ready {data?.summary?.ready || 0}</Tag>
          <Text type="secondary">{data?.boundary || "Admin producer diagnostics only."}</Text>
        </Space>

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
    </div>
  );
}
