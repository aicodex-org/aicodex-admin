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
import {Card, Col, Tag} from "antd";
import * as Setting from "../Setting";
import * as ReactRouterDom from "react-router-dom";

const {Meta} = Card;

interface BasicCardTag {
  name: string;
  color: string;
}

interface SingleCardProps {
  logo?: string;
  link?: string;
  title?: string;
  desc?: string;
  time?: string;
  tags?: BasicCardTag[];
  isSingle?: boolean;
}

const withRouter = (ReactRouterDom as unknown as {
  withRouter: <P extends object>(component: React.ComponentType<P>) => React.ComponentType<P>;
}).withRouter;

class SingleCard extends React.Component<SingleCardProps> {
  constructor(props: SingleCardProps) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  wrappedAsSilentSigninLink(link: string = ""): string {
    if (link.startsWith("http")) {
      link += link.includes("?") ? "&silentSignin=1" : "?silentSignin=1";
    }
    return link;
  }

  renderCardMobile(logo?: string, link?: string, title?: string, desc?: string, _time?: string, tags?: BasicCardTag[], _isSingle?: boolean): React.ReactNode {
    const gridStyle: React.CSSProperties = {
      width: "100vw",
      textAlign: "center",
      cursor: "pointer",
    };
    const silentSigninLink = this.wrappedAsSilentSigninLink(link);

    return (
      <Card.Grid style={gridStyle} onClick={() => Setting.goToLinkSoft(this, silentSigninLink)}>
        <img src={logo} alt="logo" width={"100%"} style={{marginBottom: "20px"}} />
        <Meta
          title={title}
          description={desc}
          style={{justifyContent: "center"}}
        />
        {this.renderTags(tags)}
      </Card.Grid>
    );
  }

  renderTags(tags?: BasicCardTag[]): React.ReactNode {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return null;
    }

    return (
      <div style={{marginTop: "8px"}}>
        {tags.map(tag => (
          <Tag key={tag.name} color={tag.color} style={{marginRight: "4px"}}>
            {tag.name}
          </Tag>
        ))}
      </div>
    );
  }

  renderCard(logo?: string, link?: string, title?: string, desc?: string, time?: string, tags?: BasicCardTag[], isSingle?: boolean): React.ReactNode {
    const silentSigninLink = this.wrappedAsSilentSigninLink(link);

    return (
      <Col style={{paddingLeft: "20px", paddingRight: "20px", paddingBottom: "20px", marginBottom: "20px"}} span={6}>
        <Card
          hoverable
          cover={
            <img alt="logo" src={logo} style={{width: "100%", height: "200px", padding: "20px", objectFit: "scale-down"}} />
          }
          onClick={() => Setting.goToLinkSoft(this, silentSigninLink)}
          style={isSingle ? {width: "320px", height: "100%"} : {width: "100%", height: "100%"}}
        >
          <Meta title={title} description={desc} />
          {this.renderTags(tags)}
          <br />
          <Meta title={""} description={Setting.getFormattedDateShort(time)} />
        </Card>
      </Col>
    );
  }

  render() {
    if (Setting.isMobile()) {
      return this.renderCardMobile(this.props.logo, this.props.link, this.props.title, this.props.desc, this.props.time, this.props.tags, this.props.isSingle);
    } else {
      return this.renderCard(this.props.logo, this.props.link, this.props.title, this.props.desc, this.props.time, this.props.tags, this.props.isSingle);
    }
  }
}

export default withRouter(SingleCard);
