// Copyright 2024 The Casdoor Authors. All Rights Reserved.
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
import {Avatar, Button, Card, Col, Divider, Input, List, Row, Select, Space, Tag} from "antd";
import {SendOutlined, UserOutlined} from "@ant-design/icons";
import * as TicketBackend from "./backend/TicketBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import moment from "moment";

const {Option} = Select;
const {TextArea} = Input;

type AdminRouteProps = import("./types/legacyPage").AdminRouteProps;
type LegacyAny = import("./types/legacyPage").LegacyAny;

interface TicketEditProps extends AdminRouteProps {
  organizationName?: string;
  match: {
    params: {
      organizationName: string;
      ticketName: string;
    };
    [key: string]: LegacyAny;
  };
  location?: {
    mode?: string;
    [key: string]: LegacyAny;
  };
}

interface TicketMessage {
  author: string;
  text: string;
  timestamp: string;
  isAdmin: boolean;
  [key: string]: LegacyAny;
}

interface TicketRecord {
  owner: string;
  name: string;
  createdTime: string;
  updatedTime: string;
  displayName: string;
  user: string;
  title: string;
  content: string;
  state: string;
  messages: TicketMessage[];
  [key: string]: LegacyAny;
}

interface TicketEditState {
  classes: TicketEditProps;
  organizationName: string;
  ticketName: string;
  ticket: TicketRecord | null;
  mode: string;
  messageText: string;
  sending: boolean;
}

function t(key: string, options?: LegacyAny): string {
  return String(i18next.t(key, options));
}

class TicketEditPage extends React.Component<TicketEditProps, TicketEditState> {
  constructor(props: TicketEditProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      ticketName: props.match.params.ticketName,
      ticket: null,
      mode: props.location?.mode !== undefined ? props.location.mode : "edit",
      messageText: "",
      sending: false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getTicket();
  }

  getTicket() {
    TicketBackend.getTicket(this.state.organizationName, this.state.ticketName)
      .then((res: LegacyAny) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.data.messages === null) {
          res.data.messages = [];
        }

        this.setState({
          ticket: res.data,
        });
      });
  }

  parseTicketField(key: string, value: LegacyAny) {
    if ([""].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateTicketField(key: string, value: LegacyAny) {
    value = this.parseTicketField(key, value);

    const ticket = this.state.ticket;
    if (ticket === null) {
      return;
    }
    ticket[key] = value;
    this.setState({
      ticket: ticket,
    });
  }

  submitTicketEdit(willExist: boolean) {
    if (this.state.ticket === null) {
      return;
    }
    const currentTicket = this.state.ticket;
    const ticket = Setting.deepCopy(currentTicket);
    TicketBackend.updateTicket(this.state.organizationName, this.state.ticketName, ticket)
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            ticketName: currentTicket.name,
          });
          if (willExist) {
            this.props.history.push("/tickets");
          } else {
            this.props.history.push(`/tickets/${currentTicket.owner}/${currentTicket.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          this.updateTicketField("name", this.state.ticketName);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  sendMessage() {
    if (this.state.ticket === null) {
      return;
    }

    if (!this.state.messageText.trim()) {
      Setting.showMessage("error", t("ticket:Please enter a message"));
      return;
    }

    this.setState({sending: true});

    const message = {
      author: this.props.account.name,
      text: this.state.messageText,
      timestamp: moment().format(),
      isAdmin: Setting.isAdminUser(this.props.account),
    };

    TicketBackend.addTicketMessage(this.state.organizationName, this.state.ticketName, message)
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully sent"));
          this.setState({
            messageText: "",
            sending: false,
          });
          this.getTicket();
        } else {
          Setting.showMessage("error", `${t("general:Failed to send")}: ${res.msg}`);
          this.setState({sending: false});
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
        this.setState({sending: false});
      });
  }

  renderTicket() {
    const ticket = this.state.ticket as TicketRecord;
    const isAdmin = Setting.isAdminUser(this.props.account);
    const isOwner = this.props.account.name === ticket.user;

    return (
      <Card size="small" title={
        <div>
          {this.state.mode === "add" ? t("ticket:New Ticket") : t("ticket:Edit Ticket")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitTicketEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitTicketEdit(true)}>{t("general:Save & Exit")}</Button>
        </div>
      } style={{marginLeft: "5px"}} type="inner">
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Organization")}:
          </Col>
          <Col span={22} >
            <Input value={ticket.owner} disabled={true} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Name")}:
          </Col>
          <Col span={22} >
            <Input value={ticket.name} disabled={!isAdmin} onChange={e => {
              this.updateTicketField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Display name")}:
          </Col>
          <Col span={22} >
            <Input value={ticket.displayName} onChange={e => {
              this.updateTicketField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Created time")}:
          </Col>
          <Col span={22} >
            <Input value={ticket.createdTime} disabled={true} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Updated time")}:
          </Col>
          <Col span={22} >
            <Input value={ticket.updatedTime} disabled={true} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Title")}:
          </Col>
          <Col span={22} >
            <Input value={ticket.title} disabled={!isAdmin && !isOwner} onChange={e => {
              this.updateTicketField("title", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("provider:Content")}:
          </Col>
          <Col span={22} >
            <TextArea autoSize={{minRows: 3, maxRows: 10}} value={ticket.content} disabled={!isAdmin && !isOwner} onChange={e => {
              this.updateTicketField("content", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:User")}:
          </Col>
          <Col span={22} >
            <Input value={ticket.user} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:State")}:
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={ticket.state}
              disabled={!isAdmin && ticket.state === "Closed"}
              onChange={(value => {
                this.updateTicketField("state", value);
              })}>
              <Option value="Open">{t("ticket:Open")}</Option>
              <Option value="In Progress">{t("ticket:In Progress")}</Option>
              <Option value="Resolved">{t("ticket:Resolved")}</Option>
              <Option value="Closed">{t("ticket:Closed")}</Option>
            </Select>
          </Col>
        </Row>
      </Card>
    );
  }

  renderMessages() {
    const ticket = this.state.ticket as TicketRecord;

    return (
      <Card size="small" title={t("ticket:Messages")} style={{marginTop: "20px", marginLeft: "5px"}} type="inner">
        <List<TicketMessage>
          itemLayout="horizontal"
          dataSource={ticket.messages || []}
          renderItem={(message: TicketMessage, index: number) => (
            <List.Item key={index}>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} style={{backgroundColor: message.isAdmin ? "#1890ff" : "#87d068"}} />}
                title={
                  <Space>
                    <span>{message.author}</span>
                    {message.isAdmin && <Tag color="blue">{t("general:Admin")}</Tag>}
                    <span style={{fontSize: "12px", color: "#999"}}>{Setting.getFormattedDate(message.timestamp)}</span>
                  </Space>
                }
                description={
                  <div style={{whiteSpace: "pre-wrap", wordBreak: "break-word"}}>
                    {message.text}
                  </div>
                }
              />
            </List.Item>
          )}
        />
        <Divider />
        <Row gutter={16}>
          <Col span={20}>
            <TextArea
              rows={3}
              value={this.state.messageText}
              onChange={e => this.setState({messageText: e.target.value})}
              placeholder={t("ticket:Type your message here...")}
              onPressEnter={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  this.sendMessage();
                }
              }}
            />
          </Col>
          <Col span={4}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={this.state.sending}
              onClick={() => this.sendMessage()}
              style={{width: "100%", height: "100%"}}
            >
              {t("general:Send")}
            </Button>
          </Col>
        </Row>
        <div style={{marginTop: "8px", color: "#999", fontSize: "12px"}}>
          {t("ticket:Press Ctrl+Enter to send")}
        </div>
      </Card>
    );
  }

  render() {
    return (
      <div>
        {
          this.state.ticket !== null ? this.renderTicket() : null
        }
        <br />
        {
          this.state.ticket !== null ? this.renderMessages() : null
        }
      </div>
    );
  }
}

export default TicketEditPage;
