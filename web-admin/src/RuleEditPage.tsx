// Copyright 2023 The casbin Authors. All Rights Reserved.
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
import {Button, Card, Col, Input, InputNumber, Row, Select, Switch} from "antd";
import * as Setting from "./Setting";
import * as RuleBackend from "./backend/RuleBackend";
import i18next from "i18next";
import WafRuleTable from "./table/WafRuleTable";
import IpRuleTable from "./table/IpRuleTable";
import UaRuleTable from "./table/UaRuleTable";
import IpRateRuleTable from "./table/IpRateRuleTable";
import CompoundRule from "./common/CompoundRule";
import * as OrganizationBackend from "./backend/OrganizationBackend";

const {Option} = Select;

interface RouteParams {
  organizationName: string;
  ruleName: string;
}

interface RuleEditPageProps {
  account: Record<string, unknown>;
  history: {
    push: (path: string) => void;
  };
  match: {
    params: RouteParams;
  };
}

interface RuleExpression {
  [key: string]: unknown;
}

interface RuleRecord {
  owner: string;
  name: string;
  type: string;
  expressions: RuleExpression[];
  action: string;
  statusCode: number | string | null;
  reason: string;
  isVerbose: boolean;
  [key: string]: unknown;
}

interface OrganizationRecord {
  name: string;
  [key: string]: unknown;
}

interface BackendResponse<T> {
  status?: string;
  msg?: string;
  data?: T;
}

interface RuleEditPageState {
  classes: RuleEditPageProps;
  owner: string;
  ruleName: string;
  rule: RuleRecord | null;
  organizations: OrganizationRecord[];
}

function t(key: string): string {
  return String(i18next.t(key));
}

class RuleEditPage extends React.Component<RuleEditPageProps, RuleEditPageState> {
  constructor(props: RuleEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      owner: props.match.params.organizationName,
      ruleName: props.match.params.ruleName,
      rule: null,
      organizations: [],
    };
  }

  UNSAFE_componentWillMount(): void {
    this.getRule();
    this.getOrganizations();
  }

  getRule(): void {
    RuleBackend.getRule(this.state.owner, this.state.ruleName).then((res: BackendResponse<RuleRecord>) => {
      this.setState({
        rule: res.data ?? null,
      });
    });
  }

  updateRuleField(key: string, value: unknown): void {
    const rule = Setting.deepCopy(this.state.rule) as RuleRecord;
    rule[key] = value;
    if (key === "type") {
      rule.expressions = [];
    }
    this.setState({
      rule: rule,
    });
  }

  updateRuleFieldInExpressions(index: number, key: string, value: unknown): void {
    const rule = Setting.deepCopy(this.state.rule) as RuleRecord;
    rule.expressions[index][key] = value;
    this.updateRuleField("expressions", rule.expressions);
    this.setState({
      rule: rule,
    });
  }

  getOrganizations(): void {
    if (Setting.isAdminUser(this.props.account)) {
      OrganizationBackend.getOrganizations("admin")
        .then((res: BackendResponse<OrganizationRecord[]>) => {
          this.setState({
            organizations: res.data || [],
          });
        });
    }
  }

  renderRule(): React.ReactNode {
    const rule = this.state.rule as RuleRecord;

    return (
      <Card size="small" title={
        <div>
          {t("rule:Edit Rule")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button type="primary" onClick={this.submitRuleEdit.bind(this)}>{t("general:Save")}</Button>
        </div>
      } style={{marginTop: 10}} type="inner">
        <Row style={{marginTop: "20px"}}>
          <Col span={2} style={{marginTop: "5px"}}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account)} value={rule.owner} onChange={(value: string) => {
              this.updateRuleField("owner", value);
            }}>
              {
                this.state.organizations.map((organization, index) => <Option key={index} value={organization.name}>{organization.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col span={2} style={{marginTop: "5px"}}>
            {t("general:Name")}:
          </Col>
          <Col span={22}>
            <Input value={rule.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              this.updateRuleField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col span={2} style={{marginTop: "5px"}}>
            {t("rule:Type")}:
          </Col>
          <Col span={22}>
            <Select virtual={false} value={rule.type} style={{width: "100%"}} onChange={(value: string) => {
              this.updateRuleField("type", value);
            }}>
              {
                [
                  {value: "WAF", text: "WAF"},
                  {value: "IP", text: "IP"},
                  {value: "User-Agent", text: "User-Agent"},
                  {value: "IP Rate Limiting", text: t("rule:IP Rate Limiting")},
                  {value: "Compound", text: t("rule:Compound")},
                ].map((item, index) => <Option key={index} value={item.value}>{item.text}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={2}>
            {t("rule:Expressions")}:
          </Col>
          <Col span={22} >
            {
              rule.type === "WAF" ? (
                <WafRuleTable
                  title={"Seclang"}
                  table={rule.expressions}
                  ruleName={rule.name}
                  account={this.props.account}
                  onUpdateTable={(value: RuleExpression[]) => {this.updateRuleField("expressions", value);}}
                />
              ) : null
            }
            {
              rule.type === "IP" ? (
                <IpRuleTable
                  title={"IPs"}
                  table={rule.expressions}
                  ruleName={rule.name}
                  account={this.props.account}
                  onUpdateTable={(value: RuleExpression[]) => {this.updateRuleField("expressions", value);}}
                />
              ) : null
            }
            {
              rule.type === "User-Agent" ? (
                <UaRuleTable
                  title={"User-Agents"}
                  table={rule.expressions}
                  ruleName={rule.name}
                  account={this.props.account}
                  onUpdateTable={(value: RuleExpression[]) => {this.updateRuleField("expressions", value);}}
                />
              ) : null
            }
            {
              rule.type === "IP Rate Limiting" ? (
                <IpRateRuleTable
                  title={t("rule:IP Rate Limiting")}
                  table={rule.expressions}
                  ruleName={rule.name}
                  account={this.props.account}
                  onUpdateTable={(value: RuleExpression[]) => {this.updateRuleField("expressions", value);}}
                />
              ) : null
            }
            {
              rule.type === "Compound" ? (
                <CompoundRule
                  title={t("rule:Compound")}
                  table={rule.expressions}
                  ruleName={rule.name}
                  owner={this.state.owner}
                  onUpdateTable={(value: RuleExpression[]) => {this.updateRuleField("expressions", value);}} />
              ) : null
            }
          </Col>
        </Row>
        {
          rule.type !== "WAF" && (
            <Row style={{marginTop: "20px"}}>
              <Col span={2} style={{marginTop: "5px"}}>
                {t("general:Action")}:
              </Col>
              <Col span={22}>
                <Select virtual={false} value={rule.action} defaultValue={"Block"} style={{width: "100%"}} onChange={(value: string) => {
                  this.updateRuleField("action", value);
                }}>
                  {
                    [
                      {value: "Allow", text: t("rule:Allow")},
                      {value: "Block", text: t("rule:Block")},
                    ].map((item, index) => <Option key={index} value={item.value}>{item.text}</Option>)
                  }
                </Select>
              </Col>
            </Row>
          )
        }
        {
          rule.type !== "WAF" && (rule.action === "Allow" || rule.action === "Block") && (
            <Row style={{marginTop: "20px"}}>
              <Col span={2} style={{marginTop: "5px"}}>
                {t("rule:Status code")}:
              </Col>
              <Col span={22}>
                <InputNumber value={rule.statusCode} min={100} max={599} onChange={(value: number | string | null) => {
                  this.updateRuleField("statusCode", value);
                }} />
              </Col>
            </Row>
          )
        }
        {
          <Row style={{marginTop: "20px"}}>
            <Col span={2} style={{marginTop: "5px"}}>
              {t("rule:Reason")}:
            </Col>
            <Col span={22}>
              <Input value={rule.reason}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  this.updateRuleField("reason", e.target.value);
                }} />
            </Col>
          </Row>
        }
        {
          <Row style={{marginTop: "20px"}}>
            <Col span={2} style={{marginTop: "5px"}}>
              {t("rule:Verbose mode")}:
            </Col>
            <Col span={22}>
              <Switch checked={rule.isVerbose}
                onChange={(checked: boolean) => {
                  this.updateRuleField("isVerbose", checked);
                }} />
            </Col>
          </Row>
        }
      </Card>
    );
  }

  render(): React.ReactNode {
    return (
      <div>
        <Row style={{width: "100%"}}>
          <Col span={1}>
          </Col>
          <Col span={22}>
            {
              this.state.rule !== null ? this.renderRule() : null
            }
          </Col>
          <Col span={1}>
          </Col>
        </Row>
        <Row style={{margin: 10}}>
          <Col span={2}>
          </Col>
          <Col span={18}>
            <Button type="primary" size="large" onClick={this.submitRuleEdit.bind(this)}>{t("general:Save")}</Button>
          </Col>
        </Row>
      </div>
    );
  }

  submitRuleEdit(): void {
    const rule = Setting.deepCopy(this.state.rule) as RuleRecord;
    RuleBackend.updateRule(this.state.owner, this.state.ruleName, rule)
      .then((res: BackendResponse<unknown>) => {
        if (res.status !== "error") {
          Setting.showMessage("success", "Rule updated successfully");
          this.setState({
            rule: rule,
          });
        } else {
          Setting.showMessage("error", `Rule failed to update: ${res.msg}`);
          this.setState({
            ruleName: (this.state.rule as RuleRecord).name,
          });
          this.props.history.push(`/rules/${(this.state.rule as RuleRecord).owner}/${(this.state.rule as RuleRecord).name}`);
          this.getRule();
        }
      });
  }
}

export default RuleEditPage;
