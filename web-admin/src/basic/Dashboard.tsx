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

import {ArrowUpOutlined} from "@ant-design/icons";
import {Card, Col, Row, Spin, Statistic, Tour} from "antd";
import * as echarts from "echarts";
import i18next from "i18next";
import React from "react";
import * as DashboardBackend from "../backend/DashboardBackend";
import * as Setting from "../Setting";
import * as TourConfig from "../TourConfig";

interface DashboardProps {
  owner?: string;
  account: {
    owner?: string;
    isAdmin?: boolean;
    tag?: string;
    [key: string]: unknown;
  };
  history: {
    push: (path: string) => void;
  };
}

interface DashboardData {
  organizationCounts: number[];
  userCounts: number[];
  providerCounts: number[];
  applicationCounts: number[];
  subscriptionCounts: number[];
  roleCounts: number[];
  groupCounts: number[];
  resourceCounts: number[];
  certCounts: number[];
  permissionCounts: number[];
  transactionCounts: number[];
  modelCounts: number[];
  adapterCounts: number[];
  enforcerCounts: number[];
}

interface DashboardBackendResponse {
  status?: string;
  msg?: string;
  data?: DashboardData;
}

const t = (key: string): string => String(i18next.t(key));

const Dashboard = (props: DashboardProps) => {
  const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null);
  const [isTourVisible, setIsTourVisible] = React.useState(TourConfig.getTourVisible());
  const nextPathName = TourConfig.getNextUrl("home");

  React.useEffect(() => {
    window.addEventListener("storageTourChanged", handleTourChange);
    return () => window.removeEventListener("storageTourChanged", handleTourChange);
  }, []);

  React.useEffect(() => {
    window.addEventListener("storageOrganizationChanged", handleOrganizationChange);
    return () => window.removeEventListener("storageOrganizationChanged", handleOrganizationChange);
  }, [props.owner]);

  React.useEffect(() => {
    if (!Setting.isLocalAdminUser(props.account)) {
      props.history.push("/apps");
    }
  }, [props.account]);

  const getOrganizationName = (): string => {
    let organization = localStorage.getItem("organization") === "All" ? "" : localStorage.getItem("organization");
    if (!Setting.isAdminUser(props.account) && Setting.isLocalAdminUser(props.account)) {
      organization = props.account.owner || "";
    }
    return organization || "";
  };

  React.useEffect(() => {
    if (!Setting.isLocalAdminUser(props.account)) {
      return;
    }

    const organization = getOrganizationName();
    DashboardBackend.getDashboard(organization).then((res: DashboardBackendResponse) => {
      if (res.status === "ok") {
        setDashboardData(res.data || null);
      } else {
        Setting.showMessage("error", res.msg);
      }
    });
  }, [props.owner]);

  const handleTourChange = () => {
    setIsTourVisible(TourConfig.getTourVisible());
  };

  const handleOrganizationChange = () => {
    if (!Setting.isLocalAdminUser(props.account)) {
      return;
    }

    setDashboardData(null);

    const organization = getOrganizationName();
    DashboardBackend.getDashboard(organization).then((res: DashboardBackendResponse) => {
      if (res.status === "ok") {
        setDashboardData(res.data || null);
      } else {
        Setting.showMessage("error", res.msg);
      }
    });
  };

  const setIsTourToLocal = () => {
    TourConfig.setIsTourVisible(false);
    setIsTourVisible(false);
  };

  const handleTourComplete = () => {
    if (nextPathName !== "") {
      props.history.push("/" + nextPathName);
      TourConfig.setIsTourVisible(true);
    }
  };

  const getSteps = () => {
    const steps = TourConfig.TourObj["home"];
    steps.map((item, index) => {
      item.target = (() => item.id ? document.getElementById(item.id) : null) as () => HTMLElement;
      if (index === steps.length - 1) {
        item.nextButtonProps = {
          children: TourConfig.getNextButtonChild(nextPathName),
        };
      }
    });
    return steps;
  };

  const renderEChart = () => {
    const chartDom = document.getElementById("echarts-chart");

    if (dashboardData === null) {
      if (chartDom) {
        const instance = echarts.getInstanceByDom(chartDom);
        if (instance) {
          instance.dispose();
        }
      }
      return (
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
          <Spin size="large" tip={t("login:Loading")} style={{paddingTop: "10%"}} />
        </div>
      );
    }

    if (!chartDom) {
      return null;
    }
    const myChart = echarts.init(chartDom);
    const currentDate = new Date();
    const dateArray = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const formattedDate = `${month}-${day}`;
      dateArray.push(formattedDate);
    }
    const option = {
      title: {text: t("home:Past 30 Days")},
      tooltip: {trigger: "axis"},
      legend: {data: [
        t("general:Users"),
        t("application:Providers"),
        t("general:Applications"),
        t("general:Organizations"),
        t("general:Subscriptions"),
        t("general:Roles"),
        t("general:Groups"),
        t("general:Resources"),
        t("general:Certs"),
        t("general:Permissions"),
        t("general:Transactions"),
        t("general:Models"),
        t("general:Adapters"),
        t("general:Enforcers"),
      ], top: "10%"},
      grid: {left: "3%", right: "4%", bottom: "0", top: "30%", containLabel: true},
      xAxis: {type: "category", boundaryGap: false, data: dateArray},
      yAxis: {type: "value"},
      series: [
        {name: t("general:Organizations"), type: "line", data: dashboardData.organizationCounts},
        {name: t("general:Users"), type: "line", data: dashboardData.userCounts},
        {name: t("application:Providers"), type: "line", data: dashboardData.providerCounts},
        {name: t("general:Applications"), type: "line", data: dashboardData.applicationCounts},
        {name: t("general:Subscriptions"), type: "line", data: dashboardData.subscriptionCounts},
        {name: t("general:Roles"), type: "line", data: dashboardData.roleCounts},
        {name: t("general:Groups"), type: "line", data: dashboardData.groupCounts},
        {name: t("general:Resources"), type: "line", data: dashboardData.resourceCounts},
        {name: t("general:Certs"), type: "line", data: dashboardData.certCounts},
        {name: t("general:Permissions"), type: "line", data: dashboardData.permissionCounts},
        {name: t("general:Transactions"), type: "line", data: dashboardData.transactionCounts},
        {name: t("general:Models"), type: "line", data: dashboardData.modelCounts},
        {name: t("general:Adapters"), type: "line", data: dashboardData.adapterCounts},
        {name: t("general:Enforcers"), type: "line", data: dashboardData.enforcerCounts},
      ],
    };
    myChart.setOption(option);

    const cardStyles = {
      body: {
        width: Setting.isMobile() ? "340px" : "100%",
        height: Setting.isMobile() ? "100px" : "150px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    };

    return (
      <Row id="statistic" gutter={80} justify={"center"}>
        <Col span={50} style={{marginBottom: "10px"}}>
          <Card variant="borderless" styles={cardStyles}>
            <Statistic title={t("home:Total users")} value={dashboardData.userCounts[30]} valueStyle={{fontSize: "30px"}} style={{width: "200px", paddingLeft: "10px"}} />
          </Card>
        </Col>
        <Col span={50} style={{marginBottom: "10px"}}>
          <Card variant="borderless" styles={cardStyles}>
            <Statistic title={t("home:New users today")} value={dashboardData.userCounts[30] - dashboardData.userCounts[30 - 1]} valueStyle={{fontSize: "30px"}} prefix={<ArrowUpOutlined />} style={{width: "200px", paddingLeft: "10px"}} />
          </Card>
        </Col>
        <Col span={50} style={{marginBottom: "10px"}}>
          <Card variant="borderless" styles={cardStyles}>
            <Statistic title={t("home:New users past 7 days")} value={dashboardData.userCounts[30] - dashboardData.userCounts[30 - 7]} valueStyle={{fontSize: "30px"}} prefix={<ArrowUpOutlined />} style={{width: "200px", paddingLeft: "10px"}} />
          </Card>
        </Col>
        <Col span={50} style={{marginBottom: "10px"}}>
          <Card variant="borderless" styles={cardStyles}>
            <Statistic title={t("home:New users past 30 days")} value={dashboardData.userCounts[30] - dashboardData.userCounts[30 - 30]} valueStyle={{fontSize: "30px"}} prefix={<ArrowUpOutlined />} style={{width: "200px", paddingLeft: "10px"}} />
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div style={{display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "center"}}>
      {renderEChart()}
      <div id="echarts-chart" style={{width: "80%", height: "400px", textAlign: "center", marginTop: "20px"}} />
      <Tour
        open={Setting.isMobile() ? false : isTourVisible}
        onClose={setIsTourToLocal}
        steps={getSteps()}
        indicatorsRender={(current, total) => (
          <span>
            {current + 1} / {total}
          </span>
        )}
        onFinish={handleTourComplete}
      />
    </div>
  );
};

export default Dashboard;
