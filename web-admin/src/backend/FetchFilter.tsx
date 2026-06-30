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

import {Modal} from "antd";
import {ExclamationCircleFilled} from "@ant-design/icons";
import i18next from "i18next";
import * as Conf from "../Conf";
import * as Setting from "../Setting";

const {confirm} = Modal;
const {fetch: originalFetch} = window;

type RequestFilter = (url: RequestInfo | URL, option: RequestInit) => void;
type ResponseFilter = (res: Response) => void;

const t = (key: string): string => String(i18next.t(key));

const demoModeCallback: ResponseFilter = (res: Response) => {
  res.json().then((data: unknown) => {
    if (Setting.isResponseDenied(data)) {
      confirm({
        title: t("general:This is a read-only demo site!"),
        icon: <ExclamationCircleFilled />,
        content: t("general:Go to writable demo site?"),
        okText: t("general:OK"),
        cancelText: t("general:Cancel"),
        onOk() {
          Setting.openLink(`${location.origin}${location.pathname}${location.search}?username=built-in/admin&password=123`);
        },
        onCancel() {},
      });
    }
  });
};

const requestFilters: RequestFilter[] = [];
const responseFilters: ResponseFilter[] = [];

if (Conf.IsDemoMode) {
  responseFilters.push(demoModeCallback);
}

window.fetch = async(url: RequestInfo | URL, option: RequestInit = {}) => {
  requestFilters.forEach(filter => filter(url, option));

  const urlText = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
  return new Promise<Response>((resolve, reject) => {
    originalFetch(url, option)
      .then(res => {
        if (!urlText.startsWith("/api/get-organizations")) {
          responseFilters.forEach(filter => filter(res.clone()));
        }
        resolve(res);
      })
      .catch(error => {
        reject(error);
      });
  });
};
