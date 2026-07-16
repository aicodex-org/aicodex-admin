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
import {Button, Form, Input, Popover, Radio, Result, Row, Select, Space, message} from "antd";
import * as Setting from "../Setting";
import * as AuthBackend from "./AuthBackend";
import * as ProviderButton from "./ProviderButton";
import i18next from "i18next";
import * as Util from "./Util";
import {authConfig} from "./Auth";
import * as ApplicationBackend from "../backend/ApplicationBackend";
import * as AgreementModal from "../common/modal/AgreementModal";
import {SendCodeInput} from "../common/SendCodeInput";
import RegionSelect from "../common/select/RegionSelect";
import CustomGithubCorner from "../common/CustomGithubCorner";
import LanguageSelect from "../common/select/LanguageSelect";
import {withRouter} from "react-router-dom";
import {CountryCodeSelect} from "../common/select/CountryCodeSelect";
import * as PasswordChecker from "../common/PasswordChecker";
import * as InvitationBackend from "../backend/InvitationBackend";
import "./SignupPage.less";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {LegacyAny, LegacyRecord} from "./AuthCoreTypes";

const t = (key: string): string => i18next.t(key) as string;
const LegacySendCodeInput = SendCodeInput as React.ComponentType<LegacyAny>;

const formItemLayout = {
  labelCol: {
    xs: {
      span: 24,
    },
    sm: {
      span: 8,
    },
  },
  wrapperCol: {
    xs: {
      span: 24,
    },
    sm: {
      span: 16,
    },
  },
};

const renderFormItem = (signupItem: LegacyAny) => {
  const commonRules: LegacyAny[] = [
    {
      required: signupItem.required,
      message: t("signup:Please input your {label}!").replace("{label}", signupItem.label || signupItem.name),
    },
  ];

  if (!signupItem.type || signupItem.type === "Input") {
    const inputRules: LegacyAny[] = [...commonRules];
    if (signupItem.regex) {
      inputRules.push({
        pattern: new RegExp(signupItem.regex),
        message: t("signup:The input doesn't match the signup item regex!"),
      });
    }

    return (
      <Form.Item
        name={signupItem.name.toLowerCase()}
        label={signupItem.label || signupItem.name}
        rules={inputRules}
      >
        <Input placeholder={signupItem.placeholder} />
      </Form.Item>
    );
  } else if (signupItem.type === "Single Choice" || signupItem.type === "Multiple Choices") {
    return (
      <Form.Item
        name={signupItem.name.toLowerCase()}
        label={signupItem.label || signupItem.name}
        rules={commonRules}
      >
        <Select
          mode={signupItem.type === "Multiple Choices" ? "multiple" : undefined}
          placeholder={signupItem.placeholder}
          showSearch={false}
          options={signupItem.options.map((option: string) => ({label: option, value: option}))}
        />
      </Form.Item>
    );
  }
};

export const tailFormItemLayout = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0,
    },
    sm: {
      span: 16,
      offset: 8,
    },
  },
};

class SignupPage extends React.Component<LegacyAny, LegacyAny> {
  form: React.RefObject<LegacyAny>;

  constructor(props: LegacyAny) {
    super(props);
    this.state = {
      classes: props,
      applicationName: (props.applicationName ?? props.match?.params?.applicationName) ?? null,
      email: "",
      phone: "",
      emailOrPhoneMode: "",
      countryCode: "",
      emailCode: "",
      phoneCode: "",
      validEmail: false,
      validPhone: false,
      region: "",
      isTermsOfUseVisible: false,
      termsOfUseContent: "",
    };

    this.form = React.createRef();
  }

  componentDidMount() {
    const oAuthParams = Util.getOAuthGetParameters();
    if (oAuthParams !== null) {
      const signinUrl = window.location.pathname.replace("/signup/oauth/authorize", "/login/oauth/authorize");
      sessionStorage.setItem("signinUrl", signinUrl + window.location.search);
    }

    if (this.getApplicationObj() === undefined) {
      if (this.state.applicationName !== null) {
        this.getApplication(this.state.applicationName);
        this.setInvitationCode();
      } else if (oAuthParams !== null) {
        this.getApplicationLogin(oAuthParams);
      } else {
        Setting.showMessage("error", `${t("general:Unknown application name")}: ${this.state.applicationName}`);
        this.onUpdateApplication(null);
      }
    }
  }

  setInvitationCode(application: LegacyAny = null) {
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("invitationCode")) {
      const invitationCode = sp.get("invitationCode") ?? "";
      this.setState({invitationCode: invitationCode});
      if (invitationCode !== "") {
        let appName = this.state.applicationName;
        if (application) {
          appName = application.name;
        }
        this.getInvitationCodeInfo(invitationCode, "admin/" + appName);
      }
    }
  }

  getApplication(applicationName: LegacyAny) {
    if (applicationName === undefined) {
      return;
    }

    ApplicationBackend.getApplication("admin", applicationName)
      .then((res) => {
        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.onUpdateApplication(res.data);
      });
  }

  getApplicationLogin(oAuthParams: LegacyAny) {
    AuthBackend.getApplicationLogin(oAuthParams)
      .then((res) => {
        if (res.status === "ok") {
          const application = res.data;
          this.onUpdateApplication(application);
          this.setInvitationCode(application);
        } else {
          this.onUpdateApplication(null);
          this.setState({
            msg: res.msg,
          });
        }
      });
  }

  getInvitationCodeInfo(invitationCode: string, application: string) {
    InvitationBackend.getInvitationCodeInfo(invitationCode, application)
      .then((res) => {
        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }
        const data = res.data as LegacyAny;
        this.setState({invitation: data});
        if (data.email) {
          this.setState({validEmail: true, email: data.email});
        }
        if (data.phone) {
          this.setState({validPhone: true, phone: data.phone});
        }
      });
  }

  getResultPath(application: LegacyAny, signupParams: LegacyRecord) {
    if (signupParams?.plan && signupParams?.pricing) {
      // the prompt page needs the user to be signed in, so for paid-user sign up, just go to buy-plan page
      return `/buy-plan/${application.organization}/${signupParams?.pricing}?user=${signupParams.username}&plan=${signupParams.plan}`;
    }
    if (authConfig.appName === application.name) {
      return "/result";
    } else {
      const oAuthParams = Util.getOAuthGetParameters();
      if (Setting.hasPromptPage(application)) {
        return `/prompt/${application.name}?oauth=${oAuthParams !== null}`;
      } else {
        return `/result/${application.name}`;
      }
    }
  }

  getApplicationObj() {
    return this.props.application;
  }

  onUpdateAccount(account: LegacyAny) {
    this.props.onUpdateAccount?.(account);
  }

  onUpdateApplication(application: LegacyAny) {
    this.props.onUpdateApplication?.(application);
  }

  parseOffset(offset: LegacyAny) {
    if (offset === 2 || offset === 4 || Setting.inIframe() || Setting.isMobile()) {
      return "0 auto";
    }
    if (offset === 1) {
      return "0 10%";
    }
    if (offset === 3) {
      return "0 60%";
    }
  }

  getLanguageSelectorMode(application: LegacyAny) {
    const languagesItem = application.signinItems?.find((item: LegacyAny) => item.name === "Languages");
    return languagesItem?.rule;
  }

  onFinish(values: LegacyRecord) {
    const application = this.getApplicationObj();

    if (Array.isArray(values.gender)) {
      values.gender = values.gender.join(", ");
    }

    if (Array.isArray(values.bio)) {
      values.bio = values.bio.join(", ");
    }

    if (Array.isArray(values.tag)) {
      values.tag = values.tag.join(", ");
    }

    if (Array.isArray(values.education)) {
      values.education = values.education.join(", ");
    }

    if (this.state.invitationCode && !values.invitationCode) {
      values.invitationCode = this.state.invitationCode;
    }

    const params = new URLSearchParams(window.location.search);
    values.plan = params.get("plan");
    values.pricing = params.get("pricing");

    // Get OAuth parameters if present
    const oAuthParams = Util.getOAuthGetParameters() as LegacyAny;

    AuthBackend.signup(values, oAuthParams)
      .then((res) => {
        if (res.status === "ok") {
          // Check if this is OAuth flow with code response
          // When OAuth parameters are present and code is returned, it won't contain '/'
          if (oAuthParams && res.data && typeof res.data === "string" && !res.data.includes("/")) {
            // OAuth code returned, redirect to redirect_uri with code
            const code = res.data;
            const redirectUrl = `${oAuthParams.redirectUri}${oAuthParams.redirectUri.includes("?") ? "&" : "?"}code=${code}&state=${oAuthParams.state}`;
            Setting.goToLink(redirectUrl);
            return;
          }

          // Check if consent is required
          if (oAuthParams && res.data && typeof res.data === "object" && res.data.required === true) {
            // Consent required, redirect to consent page
            Setting.goToLink(`/consent/${application.name}?${window.location.search.substring(1)}`);
            return;
          }

          // the user's id will be returned by `signup()`, if user signup by phone, the `username` in `values` is undefined.
          if (typeof res.data === "string") {
            values.username = res.data.split("/")[1];
          }
          if (Setting.hasPromptPage(application) && (!values.plan || !values.pricing)) {
            AuthBackend.getAccount("")
              .then((res) => {
                let account = null;
                if (res.status === "ok") {
                  account = res.data;
                  account.organization = res.data2;

                  this.onUpdateAccount(account);
                  Setting.goToLinkSoft(this, this.getResultPath(application, values));
                } else {
                  Setting.showMessage("error", `${t("application:Failed to sign in")}: ${res.msg}`);
                }
              });
          } else {
            Setting.goToLinkSoft(this, this.getResultPath(application, values));
          }
        } else {
          Setting.showMessage("error", res.msg);
        }
      });
  }

  onFinishFailed(values: LegacyAny, errorFields: LegacyAny, outOfDate: LegacyAny) {
    this.form.current.scrollToField(errorFields[0].name);
  }

  isProviderVisible(providerItem: LegacyAny) {
    return Setting.isProviderVisibleForSignUp(providerItem);
  }

  renderFormItem(application: LegacyAny, signupItem: LegacyAny) {
    const validItems = ["Gender", "Bio", "Tag", "Education"];
    if (!signupItem.visible) {
      return null;
    }

    const required = signupItem.required;

    if (signupItem.name === "Username") {
      const usernameRules: LegacyAny[] = [
        {
          required: required,
          message: t("forget:Please input your username!"),
          whitespace: true,
        },
      ];
      if (signupItem.regex) {
        usernameRules.push({
          pattern: new RegExp(signupItem.regex),
          message: t("signup:The input doesn't match the signup item regex!"),
        });
      }
      return (
        <Form.Item
          name="username"
          className="signup-username"
          label={signupItem.label ? signupItem.label : t("signup:Username")}
          rules={usernameRules}
        >
          <Input className="signup-username-input" placeholder={signupItem.placeholder}
            disabled={this.state.invitation !== undefined && this.state.invitation.username !== ""} />
        </Form.Item>
      );
    } else if (signupItem.name === "Display name") {
      if (signupItem.rule === "First, last" && Setting.getLanguage() !== "zh") {
        const firstNameRules: LegacyAny[] = [
          {
            required: required,
            message: t("signup:Please input your first name!"),
            whitespace: true,
          },
        ];
        const lastNameRules: LegacyAny[] = [
          {
            required: required,
            message: t("signup:Please input your last name!"),
            whitespace: true,
          },
        ];
        if (signupItem.regex) {
          const regexRule = {
            pattern: new RegExp(signupItem.regex),
            message: t("signup:The input doesn't match the signup item regex!"),
          };
          firstNameRules.push(regexRule);
          lastNameRules.push(regexRule);
        }
        return (
          <React.Fragment>
            <Form.Item
              name="firstName"
              className="signup-first-name"
              label={signupItem.label ? signupItem.label : t("general:First name")}
              rules={firstNameRules}
            >
              <Input className="signup-first-name-input" placeholder={signupItem.placeholder} />
            </Form.Item>
            <Form.Item
              name="lastName"
              className="signup-last-name"
              label={signupItem.label ? signupItem.label : t("general:Last name")}
              rules={lastNameRules}
            >
              <Input className="signup-last-name-input" placeholder={signupItem.placeholder} />
            </Form.Item>
          </React.Fragment>
        );
      }

      const displayNameRules: LegacyAny[] = [
        {
          required: required,
          message: (signupItem.rule === "Real name" || signupItem.rule === "First, last") ? t("signup:Please input your real name!") : t("signup:Please input your display name!"),
          whitespace: true,
        },
      ];
      if (signupItem.regex) {
        displayNameRules.push({
          pattern: new RegExp(signupItem.regex),
          message: t("signup:The input doesn't match the signup item regex!"),
        });
      }

      return (
        <Form.Item
          name="name"
          className="signup-name"
          label={(signupItem.label ? signupItem.label : (signupItem.rule === "Real name" || signupItem.rule === "First, last") ? t("application:Real name") : t("general:Display name"))}
          rules={displayNameRules}
        >
          <Input className="signup-name-input" placeholder={signupItem.placeholder} />
        </Form.Item>
      );
    } else if (signupItem.name === "First name" && this.state?.displayNameRule !== "First, last") {
      const firstNameRules: LegacyAny[] = [
        {
          required: required,
          message: t("signup:Please input your first name!"),
          whitespace: true,
        },
      ];
      if (signupItem.regex) {
        firstNameRules.push({
          pattern: new RegExp(signupItem.regex),
          message: t("signup:The input doesn't match the signup item regex!"),
        });
      }
      return (
        <Form.Item
          name="firstName"
          className="signup-first-name"
          label={signupItem.label ? signupItem.label : t("general:First name")}
          rules={firstNameRules}
        >
          <Input className="signup-first-name-input" placeholder={signupItem.placeholder} />
        </Form.Item>
      );
    } else if (signupItem.name === "Last name" && this.state?.displayNameRule !== "First, last") {
      const lastNameRules: LegacyAny[] = [
        {
          required: required,
          message: t("signup:Please input your last name!"),
          whitespace: true,
        },
      ];
      if (signupItem.regex) {
        lastNameRules.push({
          pattern: new RegExp(signupItem.regex),
          message: t("signup:The input doesn't match the signup item regex!"),
        });
      }
      return (
        <Form.Item
          name="lastName"
          className="signup-last-name"
          label={signupItem.label ? signupItem.label : t("general:Last name")}
          rules={lastNameRules}
        >
          <Input className="signup-last-name-input" placeholder={signupItem.placeholder} />
        </Form.Item>
      );
    } else if (signupItem.name === "Affiliation") {
      const affiliationRules: LegacyAny[] = [
        {
          required: required,
          message: t("signup:Please input your affiliation!"),
          whitespace: true,
        },
      ];
      if (signupItem.regex) {
        affiliationRules.push({
          pattern: new RegExp(signupItem.regex),
          message: t("signup:The input doesn't match the signup item regex!"),
        });
      }
      return (
        <Form.Item
          name="affiliation"
          className="signup-affiliation"
          label={signupItem.label ? signupItem.label : t("user:Affiliation")}
          rules={affiliationRules}
        >
          <Input className="signup-affiliation-input" placeholder={signupItem.placeholder} />
        </Form.Item>
      );
    } else if (signupItem.name === "ID card") {
      return (
        <Form.Item
          name="idCard"
          className="signup-idcard"
          label={signupItem.label ? signupItem.label : t("user:ID card")}
          rules={[
            {
              required: required,
              message: t("signup:Please input your ID card number!"),
              whitespace: true,
            },
            {
              required: required,
              pattern: new RegExp(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9X]$/, "g"),
              message: t("signup:Please input the correct ID card number!"),
            },
          ]}
        >
          <Input className="signup-idcard-input" placeholder={signupItem.placeholder} />
        </Form.Item>
      );
    } else if (signupItem.name === "Country/Region") {
      return (
        <Form.Item
          name="country_region"
          className="signup-country-region"
          label={signupItem.label ? signupItem.label : t("user:Country/Region")}
          rules={[
            {
              required: required,
              message: t("signup:Please select your country/region!"),
            },
          ]}
        >
          <RegionSelect className="signup-region-select" onChange={(value: LegacyAny) => {
            this.setState({region: value});
          }} />
        </Form.Item>
      );
    } else if (signupItem.name === "Email" || signupItem.name === "Phone" || signupItem.name === "Email or Phone" || signupItem.name === "Phone or Email") {
      const renderEmailItem = () => {
        return (
          <React.Fragment>
            <Form.Item
              name="email"
              className="signup-email"
              label={signupItem.label ? signupItem.label : t("general:Email")}
              rules={[
                {
                  required: required,
                  message: t("login:Please input your Email!"),
                },
                {
                  validator: (_, value) => {
                    if (this.state.email !== "" && !Setting.isValidEmail(this.state.email)) {
                      this.setState({validEmail: false});
                      return Promise.reject(t("login:The input is not valid Email!"));
                    }

                    if (signupItem.regex) {
                      const reg = new RegExp(signupItem.regex);
                      if (!reg.test(this.state.email)) {
                        this.setState({validEmail: false});
                        return Promise.reject(t("signup:The input Email doesn't match the signup item regex!"));
                      }
                    }

                    this.setState({validEmail: true});
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input className="signup-email-input" placeholder={signupItem.placeholder} disabled={this.state.invitation !== undefined && this.state.invitation.email !== ""} onChange={e => this.setState({email: e.target.value})} />
            </Form.Item>
            {
              signupItem.rule !== "No verification" &&
              <Form.Item
                name="emailCode"
                className="signup-email-code"
                label={signupItem.label ? signupItem.label : t("code:Email code")}
                rules={[{
                  required: required,
                  message: t("code:Please input your verification code!"),
                }]}
              >
                <LegacySendCodeInput
                  className="signup-email-code-input"
                  disabled={!this.state.validEmail}
                  method={"signup"}
                  onButtonClickArgs={[this.state.email, "email", Setting.getApplicationName(application)]}
                  application={application}
                />
              </Form.Item>
            }
          </React.Fragment>
        );
      };

      const renderPhoneItem = () => {
        return (
          <React.Fragment>
            <Form.Item className="signup-phone" label={signupItem.label ? signupItem.label : t("general:Phone")} required={required}>
              <Space.Compact block>
                <Form.Item
                  name="countryCode"
                  noStyle
                  rules={[
                    {
                      required: required,
                      message: t("signup:Please select your country code!"),
                    },
                  ]}
                >
                  <CountryCodeSelect
                    style={{width: "35%"}}
                    countryCodes={this.getApplicationObj().organizationObj.countryCodes}
                  />
                </Form.Item>
                <Form.Item
                  name="phone"
                  dependencies={["countryCode"]}
                  noStyle
                  rules={[
                    {
                      required: required,
                      message: t("signup:Please input your phone number!"),
                    },
                    ({getFieldValue}) => ({
                      validator: (_, value) => {
                        if (!required && !value) {
                          return Promise.resolve();
                        }

                        if (value && !Setting.isValidPhone(value, getFieldValue("countryCode"))) {
                          this.setState({validPhone: false});
                          return Promise.reject(t("signup:The input is not valid Phone!"));
                        }

                        this.setState({validPhone: true});
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <Input
                    className="signup-phone-input"
                    placeholder={signupItem.placeholder}
                    style={{width: "65%"}}
                    disabled={this.state.invitation !== undefined && this.state.invitation.phone !== ""}
                    onChange={e => this.setState({phone: e.target.value})}
                  />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
            {
              signupItem.rule !== "No verification" &&
              <Form.Item
                name="phoneCode"
                className="phone-code"
                label={signupItem.label ? signupItem.label : t("code:Phone code")}
                rules={[
                  {
                    required: required,
                    message: t("code:Please input your phone verification code!"),
                  },
                ]}
              >
                <LegacySendCodeInput
                  className="signup-phone-code-input"
                  disabled={!this.state.validPhone}
                  method={"signup"}
                  onButtonClickArgs={[this.state.phone, "phone", Setting.getApplicationName(application)]}
                  application={application}
                  countryCode={this.form.current?.getFieldValue("countryCode")}
                />
              </Form.Item>
            }
          </React.Fragment>
        );
      };

      if (signupItem.name === "Email") {
        return renderEmailItem();
      } else if (signupItem.name === "Phone") {
        return renderPhoneItem();
      } else if (signupItem.name === "Email or Phone" || signupItem.name === "Phone or Email") {
        let emailOrPhoneMode = this.state.emailOrPhoneMode;
        if (emailOrPhoneMode === "") {
          emailOrPhoneMode = signupItem.name === "Email or Phone" ? "Email" : "Phone";
        }

        return (
          <React.Fragment>
            <Row style={{marginTop: "30px", marginBottom: "20px"}} >
              <Radio.Group className="signup-mode-selector" buttonStyle="solid" onChange={e => {
                this.setState({
                  emailOrPhoneMode: e.target.value,
                });
              }} value={emailOrPhoneMode}>
                {
                  signupItem.name === "Email or Phone" ? (
                    <React.Fragment>
                      <Radio.Button value={"Email"}>{t("general:Email")}</Radio.Button>
                      <Radio.Button value={"Phone"}>{t("general:Phone")}</Radio.Button>
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <Radio.Button value={"Phone"}>{t("general:Phone")}</Radio.Button>
                      <Radio.Button value={"Email"}>{t("general:Email")}</Radio.Button>
                    </React.Fragment>
                  )
                }
              </Radio.Group>
            </Row>
            {
              emailOrPhoneMode === "Email" ? renderEmailItem() : renderPhoneItem()
            }
          </React.Fragment>
        );
      } else {
        return null;
      }
    } else if (signupItem.name === "Password") {
      return (
        <Popover placement={"top"} content={this.state.passwordPopover} open={this.state.passwordPopoverOpen}>
          <Form.Item
            name="password"
            className="signup-password"
            label={signupItem.label ? signupItem.label : t("general:Password")}
            rules={[
              {
                required: required,
                validateTrigger: "onChange",
                validator: (rule, value) => {
                  const errorMsg = PasswordChecker.checkPasswordComplexity(value, application.organizationObj.passwordOptions);
                  if (errorMsg === "") {
                    return Promise.resolve();
                  } else {
                    return Promise.reject(errorMsg);
                  }
                },
              },
            ]}
            hasFeedback
          >
            <Input.Password className="signup-password-input" placeholder={signupItem.placeholder} onChange={(e) => {
              this.setState({
                passwordPopover: PasswordChecker.renderPasswordPopover(application.organizationObj.passwordOptions, e.target.value),
              });
            }}
            onFocus={() => {
              this.setState({
                passwordPopoverOpen: application.organizationObj.passwordOptions?.length > 0,
                passwordPopover: PasswordChecker.renderPasswordPopover(application.organizationObj.passwordOptions, this.form.current?.getFieldValue("password") ?? ""),
              });
            }}
            onBlur={() => {
              this.setState({
                passwordPopoverOpen: false,
              });
            }} />
          </Form.Item>
        </Popover>
      );
    } else if (signupItem.name === "Confirm password") {
      return (
        <Form.Item
          name="confirm"
          className="signup-confirm"
          label={signupItem.label ? signupItem.label : t("general:Confirm")}
          dependencies={["password"]}
          hasFeedback
          rules={[
            {
              required: required,
              message: t("signup:Please confirm your password!"),
            },
            ({getFieldValue}) => ({
              validator(rule, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }

                return Promise.reject(t("signup:Your confirmed password is inconsistent with the password!"));
              },
            }),
          ]}
        >
          <Input.Password placeholder={signupItem.placeholder} />
        </Form.Item>
      );
    } else if (signupItem.name === "Invitation code") {
      return (
        <Form.Item
          name="invitationCode"
          className="signup-invitation-code"
          label={signupItem.label ? signupItem.label : t("application:Invitation code")}
          rules={[
            {
              required: required,
              message: t("signup:Please input your invitation code!"),
            },
          ]}
        >
          <Input className="signup-invitation-code-input" placeholder={signupItem.placeholder} disabled={this.state.invitation !== undefined && this.state.invitation !== ""} />
        </Form.Item>
      );
    } else if (signupItem.name === "Agreement") {
      return AgreementModal.renderAgreementFormItem(application, required, tailFormItemLayout, this);
    } else if (signupItem.name.startsWith("Text ")) {
      return (
        <div dangerouslySetInnerHTML={{__html: signupItem.label}} />
      );
    } else if (signupItem.name === "Signup button") {
      return (
        <Form.Item {...tailFormItemLayout} className="signup-actions">
          <Space className="signup-action-content" wrap>
            <Button type="primary" htmlType="submit" className="signup-button">
              {t("account:Sign Up")}
            </Button>
            <span className="signup-action-text">
              {t("signup:Have account?")} {" "}
              <a className="signup-link" href={sessionStorage.getItem("signinUrl") || Setting.getLoginLink(application)} onClick={(event) => {
                event.preventDefault();
                const linkInStorage = sessionStorage.getItem("signinUrl");
                if (linkInStorage !== null && linkInStorage !== "") {
                  Setting.goToLinkSoft(this, linkInStorage);
                } else {
                  Setting.redirectToLoginPage(application, this.props.history);
                }
              }}>
                {t("signup:sign in now")}
              </a>
            </span>
          </Space>
        </Form.Item>
      );
    } else if (signupItem.name === "Providers") {
      const showForm = Setting.isPasswordEnabled(application) || Setting.isCodeSigninEnabled(application) || Setting.isWebAuthnEnabled(application) || Setting.isLdapEnabled(application);
      if (signupItem.rule === "None" || signupItem.rule === "") {
        signupItem.rule = showForm ? "small" : "big";
      }
      return (

        application.providers.filter((providerItem: LegacyAny) => this.isProviderVisible(providerItem)).map((providerItem: LegacyAny, id: LegacyAny) => {
          return (
            <span key={id} onClick={(e) => {
              const agreementChecked = this.form.current.getFieldValue("agreement");

              if (agreementChecked !== undefined && typeof agreementChecked === "boolean" && !agreementChecked) {
                e.preventDefault();
                message.error(t("signup:Please accept the agreement!"));
              }
            }}>
              {
                ProviderButton.renderProviderLogo(providerItem.provider, application, null, null, signupItem.rule, this.props.location)
              }
            </span>
          );
        })
      );
    } else if (validItems.includes(signupItem.name)) {
      return renderFormItem(signupItem);
    }
  }

  renderForm(application: LegacyAny) {
    if (!application.enableSignUp) {
      return (
        <Result
          status="error"
          title={t("application:Sign Up Error")}
          subTitle={t("application:The application does not allow to sign up new account")}
          extra={[
            <Button type="primary" key="signin" onClick={() => Setting.redirectToLoginPage(application, this.props.history)}>
              {
                t("login:Sign In")
              }
            </Button>,
          ]}
        >
        </Result>
      );
    }
    if (this.state.invitation !== undefined) {
      if (this.state.invitation.username !== "") {
        this.form.current?.setFieldValue("username", this.state.invitation.username);
      }
      if (this.state.invitation.email !== "") {
        this.form.current?.setFieldValue("email", this.state.invitation.email);
      }
      if (this.state.invitation.phone !== "") {
        this.form.current?.setFieldValue("phone", this.state.invitation.phone);
      }
      if (this.state.invitationCode !== "") {
        this.form.current?.setFieldValue("invitationCode", this.state.invitationCode);
      }
    }

    const displayNameItem = application.signupItems?.find((item: LegacyAny) => item.name === "Display name");
    if (displayNameItem && !this.state.displayNameRule) {
      this.setState({displayNameRule: displayNameItem.rule});
    }

    return (
      <Form
        {...formItemLayout}
        className="signup-form"
        ref={this.form}
        name="signup"
        onFinish={(values) => this.onFinish(values)}
        onFinishFailed={(errorInfo) => this.onFinishFailed(errorInfo.values, errorInfo.errorFields, errorInfo.outOfDate)}
        initialValues={{
          application: application.name,
          organization: application.organization,
          countryCode: application.organizationObj.countryCodes?.[0],
        }}
        size="large"
        labelWrap
        layout={Setting.isMobile() ? "vertical" : "horizontal"}
      >
        <Form.Item
          name="application"
          hidden={true}
          rules={[
            {
              required: true,
              message: "Please input your application!",
            },
          ]}
        >
        </Form.Item>
        <Form.Item
          name="organization"
          hidden={true}
          rules={[
            {
              required: true,
              message: "Please input your organization!",
            },
          ]}
        >
        </Form.Item>
        {
          application.signupItems?.map((signupItem: LegacyAny, idx: LegacyAny) => {
            return (
              <div key={idx}>
                <div dangerouslySetInnerHTML={{__html: ("<style>" + signupItem.customCss + "</style>")}} />
                {this.renderFormItem(application, signupItem)}
              </div>
            );
          })
        }
      </Form>
    );
  }

  render() {
    const application = this.getApplicationObj();
    if (application === undefined || application === null) {
      return null;
    }

    let existSignupButton = false;
    application.signupItems?.map((item: LegacyAny) => {
      item.name === "Signup button" ? existSignupButton = true : null;
    });
    if (!existSignupButton) {
      application.signupItems?.push({
        customCss: "",
        label: "",
        name: "Signup button",
        placeholder: "",
        visible: true,
      });
    }

    if (application.signupHtml !== "") {
      return (
        <div dangerouslySetInnerHTML={{__html: application.signupHtml}} />
      );
    }

    return (
      <React.Fragment>
        <CustomGithubCorner />
        <div className="login-content" style={{margin: this.props.preview ?? this.parseOffset(application.formOffset)}}>
          {Setting.inIframe() || Setting.isMobile() ? null : <div dangerouslySetInnerHTML={{__html: application.formCss}} />}
          {Setting.inIframe() || !Setting.isMobile() ? null : <div dangerouslySetInnerHTML={{__html: application.formCssMobile}} />}
          <div className={Setting.isDarkTheme(this.props.themeAlgorithm) ? "login-panel-dark" : "login-panel"}>
            <div className="side-image" style={{display: application.formOffset !== 4 ? "none" : undefined}}>
              <div dangerouslySetInnerHTML={{__html: application.formSideHtml}} />
            </div>
            <div className="login-form signup-login-form">
              {
                Setting.renderHelmet(application)
              }
              {
                Setting.renderLogo(application)
              }
              <LanguageSelect
                languages={application.organizationObj.languages}
                mode={this.getLanguageSelectorMode(application)}
                style={{top: "55px", right: "5px", position: "absolute"}}
              />
              {
                this.renderForm(application)
              }
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

const SignupPageWithRouter = withRouter(SignupPage as LegacyAny) as LegacyAny;
export default SignupPageWithRouter;
