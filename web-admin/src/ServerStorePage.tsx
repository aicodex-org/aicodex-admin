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
import {Button, Card, Col, Empty, Input, Row, Select, Spin, Tag, Typography} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as ServerBackend from "./backend/ServerBackend";
import i18next from "i18next";
import PageScrollShell from "./common/PageScrollShell";

const {Text, Title} = Typography;

interface AccountRecord {
  owner: string;
  tag?: string;
  [key: string]: unknown;
}

interface ServerStorePageProps {
  account: AccountRecord;
  history: {
    push: (location: string | {pathname: string; mode?: string}) => void;
  };
}

interface OnlineServerRaw {
  id?: string;
  name?: string;
  description?: string;
  tags?: string[];
  endpoints?: {
    production?: string;
  };
  authentication?: {
    type?: string;
  };
  maintainer?: {
    website?: string;
  };
}

interface OnlineServerRecord {
  id: string;
  name: string;
  nameText: string;
  tagsRaw: string[];
  tagsLower: string[];
  production: string;
  description: string;
  authentication?: string;
  website?: string;
}

interface ServerRecord {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  url: string;
  application: string;
}

interface ServerStorePageState {
  onlineListLoading: boolean;
  onlineServerList: OnlineServerRecord[];
  creatingOnlineServerId: string;
  onlineNameFilter: string;
  onlineTagFilter: string[];
}

interface BackendResponse<T> {
  status?: string;
  data?: T;
  msg?: string;
}

type OnlineServersResponseData = {
  servers?: OnlineServerRaw[];
  data?: OnlineServerRaw[];
};

type ServerBackendCompat = {
  getOnlineServers: () => Promise<BackendResponse<OnlineServersResponseData | OnlineServerRaw[]>>;
  addServer: (server: ServerRecord) => Promise<BackendResponse<unknown>>;
};

const serverBackend = ServerBackend as unknown as ServerBackendCompat;

function t(key: string): string {
  return String(i18next.t(key));
}

class ServerStorePage extends React.Component<ServerStorePageProps, ServerStorePageState> {
  constructor(props: ServerStorePageProps) {
    super(props);
    this.state = {
      onlineListLoading: false,
      onlineServerList: [],
      creatingOnlineServerId: "",
      onlineNameFilter: "",
      onlineTagFilter: [],
    };
  }

  componentDidMount(): void {
    this.fetchOnlineServers();
  }

  fetchOnlineServers = (): void => {
    this.setState({
      onlineListLoading: true,
      onlineNameFilter: "",
      onlineTagFilter: [],
    });

    serverBackend.getOnlineServers()
      .then((res) => {
        if (res.status === "ok") {
          const onlineServerList = this.normalizeOnlineServers(this.getOnlineServersFromResponse(res.data));
          this.setState({
            onlineServerList: onlineServerList,
            onlineListLoading: false,
          });
        } else {
          this.setState({onlineListLoading: false});
          Setting.showMessage("error", `${t("general:Failed to get")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({onlineListLoading: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  };

  getOnlineServerName = (onlineServer: Partial<OnlineServerRecord>): string => {
    const source = onlineServer.id || onlineServer.name || `server_${Setting.getRandomName()}`;
    const normalized = String(source).toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    return normalized || `server_${Setting.getRandomName()}`;
  };

  createServerFromOnline = (onlineServer: Partial<OnlineServerRecord>): void => {
    const owner = Setting.getRequestOrganization(this.props.account);
    const serverName = this.getOnlineServerName(onlineServer);
    const serverUrl = onlineServer.production;

    if (!serverUrl) {
      Setting.showMessage("error", t("server:Production endpoint is empty"));
      return;
    }

    const newServer = {
      owner: owner,
      name: serverName,
      createdTime: moment().format(),
      displayName: onlineServer.name || serverName,
      url: serverUrl,
      application: "",
    };

    this.setState({creatingOnlineServerId: onlineServer.id || ""});
    serverBackend.addServer(newServer)
      .then((res) => {
        this.setState({creatingOnlineServerId: ""});
        if (res.status === "ok") {
          this.props.history.push({pathname: `/servers/${newServer.owner}/${newServer.name}`, mode: "add"});
          Setting.showMessage("success", t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({creatingOnlineServerId: ""});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  };

  normalizeOnlineServers = (onlineServers: OnlineServerRaw[]): OnlineServerRecord[] => {
    // MCP Store 只展示可直接作为本地 Server URL 导入的 production endpoint。
    return onlineServers.map((server, index) => {
      const rawTags = Array.isArray(server?.tags) ? server.tags : [];

      return {
        id: server.id ?? `${server.name ?? "server"}-${index}`,
        name: server.name ?? "",
        nameText: (server.name ?? "").toLowerCase(),
        tagsRaw: rawTags,
        tagsLower: rawTags.map((tag) => tag.toLowerCase()),
        production: server.endpoints?.production ?? "",
        description: server.description ?? "",
        authentication: server?.authentication?.type,
        website: server?.maintainer?.website,
      };
    }).filter(server => server.production.startsWith("http"));
  };

  getOnlineServersFromResponse = (data: OnlineServersResponseData | OnlineServerRaw[] | undefined): OnlineServerRaw[] => {
    // 线上目录历史上存在多种 envelope，这里保持迁移前的兼容读取顺序。
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.servers)) {
      return data.servers;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    return [];
  };

  getOnlineTagOptions = (): Array<{label: string; value: string}> => {
    const tags = this.state.onlineServerList.flatMap((server) => server.tagsRaw || []);
    return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b)).map((tag) => ({label: tag, value: tag.toLowerCase()}));
  };

  getFilteredOnlineServers = (): OnlineServerRecord[] => {
    const nameFilter = this.state.onlineNameFilter.trim().toLowerCase();
    const tagFilter = this.state.onlineTagFilter;

    return this.state.onlineServerList.filter((server) => {
      const nameMatched = !nameFilter || server.nameText.includes(nameFilter);
      const tagMatched = tagFilter.length === 0 || tagFilter.some((tag) => server.tagsLower.includes(tag));
      return nameMatched && tagMatched;
    });
  };

  renderServerCard = (server: OnlineServerRecord): React.ReactNode => {
    return (
      <Col xs={24} sm={12} md={8} lg={6} key={server.id} style={{marginBottom: "16px"}}>
        <Card
          title={server.name || "-"}
          hoverable
          style={{height: "100%"}}
          extra={
            <Button
              type="primary"
              size="small"
              loading={this.state.creatingOnlineServerId === server.id}
              onClick={(e) => {
                e.stopPropagation();
                this.createServerFromOnline(server);
              }}
            >
              {t("general:Add")}
            </Button>
          }
        >
          <div style={{minHeight: "48px", marginBottom: "8px"}}>
            <Text type="secondary">{server.description || "-"}</Text>
          </div>
          <div style={{marginBottom: "8px"}}>
            <Text strong>{t("application:Authentication")}: </Text>
            <Text>{server.authentication || "-"}</Text>
          </div>
          <div style={{marginBottom: "8px"}}>
            <Text strong>{t("general:Website")}: </Text>
            {server.website ? (
              <a target="_blank" rel="noreferrer" href={`https://${server.website}`}>{server.website}</a>
            ) : (
              <Text>-</Text>
            )}
          </div>
          <div>
            {(server.tagsRaw || []).map((tag) => <Tag key={`${server.id}-${tag}`}>{tag}</Tag>)}
          </div>
        </Card>
      </Col>
    );
  };

  render(): React.ReactNode {
    const filteredServers = this.getFilteredOnlineServers();
    const header = (
      <div className="server-store-page-header">
        <div className="server-store-page-title-block">
          <Title level={4} className="server-store-page-title">{t("general:MCP Store")}</Title>
        </div>
        <div className="server-store-page-toolbar">
          <Input
            allowClear
            placeholder={t("general:Name")}
            value={this.state.onlineNameFilter}
            onChange={(e) => this.setState({onlineNameFilter: e.target.value})}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder={t("general:Tag")}
            value={this.state.onlineTagFilter}
            onChange={(values) => this.setState({onlineTagFilter: values as string[]})}
            options={this.getOnlineTagOptions()}
            className="server-store-page-tag-select"
          />
          <Button onClick={() => this.setState({onlineNameFilter: "", onlineTagFilter: []})}>
            {t("general:Clear")}
          </Button>
          <Button onClick={this.fetchOnlineServers}>
            {t("general:Refresh")}
          </Button>
        </div>
      </div>
    );

    return (
      <PageScrollShell
        className="server-store-page"
        headerClassName="server-store-page-header-shell"
        bodyClassName="server-store-page-body"
        header={header}
      >
        {this.state.onlineListLoading ? (
          <div className="server-store-page-loading">
            <Spin />
          </div>
        ) : filteredServers.length === 0 ? (
          <Empty description={t("general:No data")} />
        ) : (
          <Row gutter={16} className="server-store-page-grid">
            {filteredServers.map((server) => this.renderServerCard(server))}
          </Row>
        )}
      </PageScrollShell>
    );
  }
}

export default ServerStorePage;
