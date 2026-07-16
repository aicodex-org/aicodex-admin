import React from "react";
import {Alert, Col, Row, Select} from "antd";
import i18next from "i18next";
import * as Setting from "../Setting";
import {
  getEnterpriseTlsPolicyErrorKey,
  isExplicitEnterpriseTlsPolicy,
  validateEnterpriseTlsPolicy
} from "./enterpriseTlsPolicy";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {EnterpriseTlsCertOption, EnterpriseTlsPolicy, ExplicitEnterpriseTlsPolicy} from "./enterpriseTlsPolicy";

const t = i18next.t.bind(i18next) as (key: string) => string;

interface EnterpriseTlsPolicyFieldsProps {
  policy: unknown;
  cert: unknown;
  certOptions: readonly EnterpriseTlsCertOption[];
  onPolicyChange: (policy: ExplicitEnterpriseTlsPolicy) => void;
  onCertChange: (cert: string) => void;
}

// EnterpriseTlsPolicyFields 只接收SSL Cert名称投影，并把存量空值与显式legacy状态分开展示。
export default function EnterpriseTlsPolicyFields({
  policy,
  cert,
  certOptions,
  onPolicyChange,
  onCertChange,
}: EnterpriseTlsPolicyFieldsProps): React.ReactElement {
  const isLegacyUnmigrated = policy === undefined || policy === "";
  const explicitPolicy = isExplicitEnterpriseTlsPolicy(policy) ? policy : undefined;
  const selectedPolicy = isLegacyUnmigrated ? "" : explicitPolicy;
  const validationError = validateEnterpriseTlsPolicy({tlsPolicy: policy, cert}, true, certOptions);
  const safeCert = typeof cert === "string" && certOptions.some(option => option.name === cert) ? cert : undefined;
  const policyOptions = [
    ...(isLegacyUnmigrated ? [{value: "", label: t("provider:Pending migration"), disabled: true}] : []),
    {value: "system", label: t("provider:System trust")},
    {value: "custom-ca", label: t("provider:Custom CA")},
    {value: "legacy-insecure", label: t("provider:Legacy insecure")},
  ];

  return (
    <React.Fragment>
      <Row style={{marginTop: "20px"}}>
        <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 2}>
          {Setting.getLabel(t("provider:TLS policy"), t("provider:TLS policy - Tooltip"))} :
        </Col>
        <Col span={22}>
          <Select<EnterpriseTlsPolicy>
            aria-label={t("provider:TLS policy")}
            virtual={false}
            style={{width: "100%"}}
            status={!isLegacyUnmigrated && explicitPolicy === undefined ? "error" : undefined}
            value={selectedPolicy}
            placeholder={t("provider:Select a TLS policy")}
            options={policyOptions}
            onChange={(value: EnterpriseTlsPolicy) => {
              if (isExplicitEnterpriseTlsPolicy(value)) {
                onPolicyChange(value);
              }
            }}
          />
        </Col>
      </Row>

      {isLegacyUnmigrated ? (
        <Row className="enterprise-tls-policy-feedback-row" style={{marginTop: "12px"}}>
          <Col aria-hidden span={Setting.isMobile() ? 0 : 2} />
          <Col span={22}>
            <Alert
              showIcon
              type="warning"
              message={t("provider:TLS policy pending migration")}
              description={t("provider:TLS policy pending migration description")}
            />
          </Col>
        </Row>
      ) : null}

      {explicitPolicy === "legacy-insecure" ? (
        <Row className="enterprise-tls-policy-feedback-row" style={{marginTop: "12px"}}>
          <Col aria-hidden span={Setting.isMobile() ? 0 : 2} />
          <Col span={22}>
            <Alert
              showIcon
              type="warning"
              message={t("provider:Legacy insecure")}
              description={t("provider:Legacy insecure - Warning")}
            />
          </Col>
        </Row>
      ) : null}

      {explicitPolicy === "custom-ca" ? (
        <React.Fragment>
          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 2}>
              {Setting.getLabel(t("provider:Custom CA certificate"), t("provider:Custom CA certificate - Tooltip"))} :
            </Col>
            <Col span={22}>
              <Select
                aria-label={t("provider:Custom CA certificate")}
                virtual={false}
                showSearch
                optionFilterProp="label"
                style={{width: "100%"}}
                status={validationError === "ca-required" || validationError === "ca-unavailable" ? "error" : undefined}
                value={safeCert}
                placeholder={t("provider:Select an SSL certificate")}
                notFoundContent={t("provider:No SSL certificates available")}
                options={certOptions.map(option => ({value: option.name, label: option.name}))}
                onChange={(value: string) => onCertChange(value)}
              />
            </Col>
          </Row>
          {certOptions.length === 0 ? (
            <Row className="enterprise-tls-policy-feedback-row" style={{marginTop: "12px"}}>
              <Col aria-hidden span={Setting.isMobile() ? 0 : 2} />
              <Col span={22}>
                <Alert showIcon type="warning" message={t("provider:No SSL certificates available")} />
              </Col>
            </Row>
          ) : null}
        </React.Fragment>
      ) : null}

      {validationError !== null ? (
        <Row className="enterprise-tls-policy-feedback-row" style={{marginTop: "12px"}}>
          <Col aria-hidden span={Setting.isMobile() ? 0 : 2} />
          <Col span={22}>
            <Alert showIcon type="error" message={t(getEnterpriseTlsPolicyErrorKey(validationError))} />
          </Col>
        </Row>
      ) : null}
    </React.Fragment>
  );
}
