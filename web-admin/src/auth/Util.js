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
import {Alert, Button, Modal, QRCode, Result} from "antd";
import i18next from "i18next";
import {getWechatMessageEvent} from "./AuthBackend";
import * as Setting from "../Setting";
import * as Provider from "./Provider";
import * as AuthBackend from "./AuthBackend";

const ShortOAuthStatePrefix = "casdoorOauth";
const ShortOAuthStateStoragePrefix = "casdoor.oauth.shortState.";
const ShortOAuthStateTtl = 10 * 60 * 1000;

function getBrowserStorage(name) {
  try {
    return window?.[name] ?? null;
  } catch {
    return null;
  }
}

function generateShortOAuthState() {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const values = new Uint8Array(24);
  const cryptoObject = window?.crypto;

  if (cryptoObject?.getRandomValues) {
    cryptoObject.getRandomValues(values);
  } else {
    for (let i = 0; i < values.length; i += 1) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }

  let token = ShortOAuthStatePrefix;
  values.forEach(value => {
    token += alphabet[value % alphabet.length];
  });
  return token;
}

function isGeneratedShortOAuthState(state) {
  return typeof state === "string" && state.startsWith(ShortOAuthStatePrefix);
}

function storeShortOAuthState(state, query) {
  const session = getBrowserStorage("sessionStorage");
  const local = getBrowserStorage("localStorage");

  try {
    session?.setItem(state, query);
  } catch {
    // Ignore storage failures; the base64 state fallback remains available for non-short states.
  }

  try {
    local?.setItem(`${ShortOAuthStateStoragePrefix}${state}`, JSON.stringify({
      query: query,
      expiresAt: Date.now() + ShortOAuthStateTtl,
    }));
  } catch {
    // localStorage is a cross-tab fallback only.
  }
}

function getStoredShortOAuthState(state) {
  const session = getBrowserStorage("sessionStorage");
  const local = getBrowserStorage("localStorage");

  try {
    const query = session?.getItem(state);
    if (query !== null && query !== undefined) {
      return query;
    }
  } catch {
    // Continue with localStorage fallback.
  }

  try {
    const key = `${ShortOAuthStateStoragePrefix}${state}`;
    const raw = local?.getItem(key);
    if (raw === null || raw === undefined) {
      return null;
    }
    const payload = JSON.parse(raw);
    if (payload?.expiresAt < Date.now()) {
      local?.removeItem(key);
      return null;
    }
    return payload?.query ?? null;
  } catch {
    return null;
  }
}

export function renderMessage(msg) {
  if (msg !== null) {
    return (
      <div style={{display: "inline"}}>
        <Alert
          message={i18next.t("application:Failed to sign in")}
          showIcon
          description={msg}
          type="error"
          action={
            <Button size="small" type="primary" danger>
              {i18next.t("general:Detail")}
            </Button>
          }
        />
      </div>
    );
  } else {
    return null;
  }
}

export function renderMessageLarge(ths, msg) {
  if (msg !== null) {
    return (
      <Result
        style={{margin: "0px auto"}}
        status="error"
        title={i18next.t("general:There was a problem signing you in..")}
        subTitle={msg}
        extra={[
          <Button type="primary" key="back" onClick={() => {
            window.history.go(-2);
          }}>
            {i18next.t("general:Back")}
          </Button>,
        ]}
      >
      </Result>
    );
  } else {
    return null;
  }
}

function getRefinedValue(value) {
  return value ?? "";
}

export function getCasParameters(params) {
  const queries = (params !== undefined) ? params : new URLSearchParams(window.location.search);
  const service = getRefinedValue(queries.get("service"));
  const renew = getRefinedValue(queries.get("renew"));
  const gateway = getRefinedValue(queries.get("gateway"));
  return {
    service: service,
    renew: renew,
    gateway: gateway,
  };
}

function getRawGetParameter(key) {
  const fullUrl = window.location.href;
  const token = fullUrl.split(`${key}=`)[1];
  if (!token) {
    return "";
  }

  let res = token.split("&")[0];
  if (!res) {
    return "";
  }

  res = decodeURIComponent(res);
  return res;
}

export function getCasLoginParameters(owner, name) {
  const queries = new URLSearchParams(window.location.search);
  // CAS service
  let service = getRawGetParameter("service");
  if (service === "") {
    service = getRefinedValue(queries.get("service"));
  }
  return {
    id: `${owner}/${encodeURIComponent(name)}`, // application ID,
    service: service,
    type: "cas",
  };
}

export function getOAuthGetParameters(params) {
  const queries = (params !== undefined) ? params : new URLSearchParams(window.location.search);
  const lowercaseQueries = {};
  queries.forEach((val, key) => {lowercaseQueries[key.toLowerCase()] = val;});

  const clientId = getRefinedValue(queries.get("client_id"));
  const responseType = getRefinedValue(queries.get("response_type"));

  let redirectUri = getRawGetParameter("redirect_uri");
  if (redirectUri === "") {
    redirectUri = getRefinedValue(queries.get("redirect_uri"));
  }

  let scope = getRefinedValue(queries.get("scope"));
  if (redirectUri.includes("#") && scope === "") {
    scope = getRawGetParameter("scope");
  }

  let state = getRefinedValue(queries.get("state"));
  if (redirectUri.includes("#") && state === "") {
    state = getRawGetParameter("state");
  }

  const nonce = getRefinedValue(queries.get("nonce"));
  const challengeMethod = getRefinedValue(queries.get("code_challenge_method"));
  const codeChallenge = getRefinedValue(queries.get("code_challenge"));
  const responseMode = getRefinedValue(queries.get("response_mode"));
  const samlRequest = getRefinedValue(lowercaseQueries["samlRequest".toLowerCase()]);
  const relayState = getRefinedValue(lowercaseQueries["RelayState".toLowerCase()]);
  const noRedirect = getRefinedValue(lowercaseQueries["noRedirect".toLowerCase()]);
  const resource = getRefinedValue(queries.get("resource"));

  if (clientId === "" && samlRequest === "") {
    // login
    return null;
  } else {
    // code
    return {
      clientId: clientId,
      responseType: responseType,
      redirectUri: redirectUri,
      scope: scope,
      state: state,
      nonce: nonce,
      challengeMethod: challengeMethod,
      codeChallenge: codeChallenge,
      responseMode: responseMode,
      samlRequest: samlRequest,
      relayState: relayState,
      noRedirect: noRedirect,
      resource: resource,
      type: "code",
    };
  }
}

export function getStateFromQueryParams(applicationName, providerName, method, isShortState) {
  let query = window.location.search;
  query = `${query}&application=${encodeURIComponent(applicationName)}&provider=${encodeURIComponent(providerName)}&method=${method}`;
  if (method === "link") {
    query = `${query}&from=${window.location.pathname}`;
  }

  if (!isShortState) {
    return btoa(query);
  } else {
    const state = generateShortOAuthState();
    storeShortOAuthState(state, query);
    return state;
  }
}

export function getQueryParamsFromState(state) {
  const query = getStoredShortOAuthState(state);
  if (query !== null) {
    return query;
  }

  if (isGeneratedShortOAuthState(state)) {
    return "";
  }

  return atob(state);
}

export function getEvent(application, provider, ticket, method) {
  getWechatMessageEvent(ticket)
    .then(res => {
      if (res.data === "SCAN" || res.data === "subscribe") {
        const code = res?.data2;
        Setting.goToLink(Provider.getAuthUrl(application, provider, method ?? "signup", code));
      }
    });
}

export async function WechatOfficialAccountModal(application, provider, method) {
  AuthBackend.getWechatQRCode(`${provider.owner}/${provider.name}`).then(
    async res => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res?.msg);
        return;
      }

      const t1 = setInterval(await getEvent, 1000, application, provider, res.data2, method);
      {
        Modal.info({
          title: i18next.t("provider:Please use WeChat to scan the QR code and follow the official account for sign in"),
          content: (
            <div style={{marginRight: "34px"}}>
              <QRCode style={{padding: "20px", margin: "auto"}} bordered={false} value={res.data} size={230} />
            </div>
          ),
          onOk() {
            window.clearInterval(t1);
          },
        });
      }
    }
  );
}
