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

import {DeleteOutlined, EditOutlined, HolderOutlined, PlusOutlined, UsergroupAddOutlined} from "@ant-design/icons";
import {Button, Col, Empty, Row, Space, Tree} from "antd";
import i18next from "i18next";
import moment from "moment";
import React from "react";
import * as GroupBackend from "./backend/GroupBackend";
import * as Setting from "./Setting";
import OrganizationSelect from "./common/select/OrganizationSelect";
import UserListPage from "./UserListPage";

type Account = {
  owner: string;
  isAdmin?: boolean;
  [key: string]: unknown;
};

type RouteParams = {
  organizationName: string;
  groupName?: string;
};

type HistoryLike = {
  push: (location: string | {pathname: string; state?: {mode: "add"; group: GroupDraft}}) => void;
};

type GroupTreePageProps = {
  account: Account;
  history: HistoryLike;
  match: {
    params: RouteParams;
  };
  organizationName?: string;
  [key: string]: unknown;
};

type GroupTreeNode = {
  key: string;
  title: string;
  owner: string;
  type?: string;
  children?: GroupTreeNode[];
};

type RenderedTreeNode = {
  key: string;
  title: React.ReactNode;
  children: RenderedTreeNode[];
};

type GroupDraft = {
  owner: string;
  name: string;
  createdTime: string;
  updatedTime: string;
  displayName: string;
  type: string;
  parentId?: string;
  isTopGroup: boolean;
  isEnabled: boolean;
};

type ApiResponse<T = unknown> = {
  status: string;
  msg?: string;
  data?: T;
};

type GroupTreePageState = {
  classes: GroupTreePageProps;
  owner: string;
  organizationName: string;
  groupName?: string;
  treeData: GroupTreeNode[];
  selectedKeys: React.Key[];
  expandedKeys?: React.Key[];
};

class GroupTreePage extends React.Component<GroupTreePageProps, GroupTreePageState> {
  constructor(props: GroupTreePageProps) {
    super(props);
    const groupName = props.match?.params.groupName;
    this.state = {
      classes: props,
      owner: Setting.isAdminUser(this.props.account) ? "" : this.props.account.owner,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      groupName,
      treeData: [],
      selectedKeys: groupName === undefined ? [] : [groupName],
    };
  }

  UNSAFE_componentWillMount(): void {
    this.getTreeData();
  }

  componentDidUpdate(prevProps: GroupTreePageProps, prevState: GroupTreePageState): void {
    if (this.state.organizationName !== prevState.organizationName) {
      this.getTreeData();
    }

    if (prevState.treeData !== this.state.treeData) {
      this.setTreeExpandedKeys();
    }
  }

  getTreeData(): void {
    GroupBackend.getGroups(this.state.organizationName, true).then((res: ApiResponse<GroupTreeNode[]>) => {
      if (res.status === "ok") {
        this.setState({
          treeData: res.data ?? [],
        });
      } else {
        Setting.showMessage("error", res.msg);
      }
    });
  }

  setTreeTitle(treeData: GroupTreeNode): RenderedTreeNode {
    const haveChildren = Array.isArray(treeData.children) && treeData.children.length > 0;
    const isSelected = this.state.groupName === treeData.key;
    return {
      key: treeData.key,
      title: <Space>
        {treeData.type === "Physical" ? <UsergroupAddOutlined /> : <HolderOutlined />}
        <span>{treeData.title}</span>
        {isSelected && (
          <React.Fragment>
            <PlusOutlined
              style={{
                visibility: "visible",
                color: "inherit",
                transition: "color 0.3s",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "rgba(89,54,213,0.6)";
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "inherit";
              }}
              onMouseDown={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "rgba(89,54,213,0.4)";
              }}
              onMouseUp={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "rgba(89,54,213,0.6)";
              }}
              onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.stopPropagation();
                this.addGroup();
              }}
            />
            <EditOutlined
              style={{
                visibility: "visible",
                color: "inherit",
                transition: "color 0.3s",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "rgba(89,54,213,0.6)";
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "inherit";
              }}
              onMouseDown={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "rgba(89,54,213,0.4)";
              }}
              onMouseUp={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "rgba(89,54,213,0.6)";
              }}
              onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.stopPropagation();
                sessionStorage.setItem("groupTreeUrl", window.location.pathname);
                this.props.history.push(`/groups/${this.state.organizationName}/${treeData.key}`);
              }}
            />
            {!haveChildren &&
            <DeleteOutlined
              style={{
                visibility: "visible",
                color: "inherit",
                transition: "color 0.3s",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "rgba(89,54,213,0.6)";
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "inherit";
              }}
              onMouseDown={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "rgba(89,54,213,0.4)";
              }}
              onMouseUp={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.currentTarget.style.color = "rgba(89,54,213,0.6)";
              }}
              onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.stopPropagation();
                GroupBackend.deleteGroup({owner: treeData.owner, name: treeData.key})
                  .then((res: ApiResponse) => {
                    if (res.status === "ok") {
                      Setting.showMessage("success", i18next.t("general:Successfully deleted"));
                      this.getTreeData();
                    } else {
                      Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
                    }
                  })
                  .catch((error: unknown) => {
                    Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
                  });
              }}
            />
            }
          </React.Fragment>
        )}
      </Space>,
      children: haveChildren ? treeData.children!.map(i => this.setTreeTitle(i)) : [],
    };
  }

  setTreeExpandedKeys = (): void => {
    const expandedKeys: React.Key[] = [];
    const setExpandedKeys = (nodes: GroupTreeNode[]): void => {
      for (const node of nodes) {
        expandedKeys.push(node.key);
        if (node.children) {
          setExpandedKeys(node.children);
        }
      }
    };
    setExpandedKeys(this.state.treeData);
    this.setState({
      expandedKeys: expandedKeys,
    });
  };

  renderTree(): React.ReactNode {
    const onSelect = (selectedKeys: React.Key[], info: {node: {key: React.Key}}) => {
      const groupName = String(info.node.key);
      this.setState({
        selectedKeys: selectedKeys,
        groupName,
      });
      this.props.history.push(`/trees/${this.state.organizationName}/${groupName}`);
    };
    const onExpand = (expandedKeysValue: React.Key[]) => {
      this.setState({
        expandedKeys: expandedKeysValue,
      });
    };

    if (this.state.treeData.length === 0) {
      return <Empty />;
    }

    const treeData = this.state.treeData.map(i => this.setTreeTitle(i));
    return (
      <Tree
        blockNode={true}
        defaultSelectedKeys={this.state.groupName === undefined ? [] : [this.state.groupName]}
        defaultExpandAll={true}
        selectedKeys={this.state.selectedKeys}
        expandedKeys={this.state.expandedKeys}
        onSelect={onSelect}
        onExpand={onExpand}
        showIcon={true}
        treeData={treeData}
      />
    );
  }

  renderOrganizationSelect(): React.ReactNode {
    if (Setting.isAdminUser(this.props.account)) {
      return (
        <OrganizationSelect
          initValue={this.state.organizationName}
          style={{width: "100%"}}
          onChange={(value: string) => {
            this.setState({
              organizationName: value,
              groupName: "",
            });
            this.props.history.push(`/trees/${value}`);
          }}
        />
      );
    }
    return null;
  }

  newGroup(isRoot: boolean): GroupDraft {
    const randomName = Setting.getRandomName();
    return {
      owner: this.state.organizationName,
      name: `group_${randomName}`,
      createdTime: moment().format(),
      updatedTime: moment().format(),
      displayName: `New Group - ${randomName}`,
      type: "Virtual",
      parentId: isRoot ? this.state.organizationName : this.state.groupName,
      isTopGroup: isRoot,
      isEnabled: true,
    };
  }

  addGroup(isRoot = false): void {
    const newGroup = this.newGroup(isRoot);
    sessionStorage.setItem("groupTreeUrl", window.location.pathname);
    this.props.history.push({
      pathname: `/groups/${newGroup.owner}/${newGroup.name}`,
      state: {mode: "add", group: newGroup},
    });
  }

  render(): React.ReactNode {
    return (
      <div style={{
        flex: 1,
        backgroundColor: "white",
        padding: "5px 5px 2px 5px",
      }}>
        <Row>
          <Col span={5}>
            <Row>
              <Col span={24} style={{textAlign: "center"}}>
                {this.renderOrganizationSelect()}
              </Col>
            </Row>
            <Row>
              <Col span={24} style={{marginTop: "10px"}}>
                <Button size={"small"}
                  onClick={() => {
                    this.setState({
                      selectedKeys: [],
                      groupName: undefined,
                    });
                    this.props.history.push(`/trees/${this.state.organizationName}`);
                  }}
                >
                  {String(i18next.t("group:Show all"))}
                </Button>
                <Button size={"small"} type={"primary"} style={{marginLeft: "10px"}} onClick={() => this.addGroup(true)}>
                  {String(i18next.t("general:Add"))}
                </Button>
              </Col>
            </Row>
            <Row style={{marginTop: 10}}>
              <Col span={24} style={{textAlign: "left"}}>
                {this.renderTree()}
              </Col>
            </Row>
          </Col>
          <Col span={19}>
            <UserListPage
              organizationName={this.state.organizationName}
              groupName={this.state.groupName}
              {...this.props}
            />
          </Col>
        </Row>
      </div>
    );
  }
}

export default GroupTreePage;
