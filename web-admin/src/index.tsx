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

import "./common/resizeObserverLoopErrorPreflight";
import "core-js/es";
import React from "react";
import {createRoot} from "react-dom/client";
import "./index.css";
import "./App.less";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import {BrowserRouter} from "react-router-dom";
import "./backend/FetchFilter";
import {installResizeObserverLoopErrorGuard} from "./common/resizeObserverLoopErrorGuard";
import {runtimeEnv} from "./config/runtimeEnv";
import type {LegacyAny} from "./types/legacyPage";

installResizeObserverLoopErrorGuard();

if (!String.prototype.replaceAll) {
  (String.prototype as LegacyAny).replaceAll = function(search: string, replace: string) {
    return this.split(search).join(replace);
  };
}

const container = document.getElementById("root");
if (container === null) {
  throw new Error("Root container #root was not found");
}

const app = createRoot(container);

app.render(<BrowserRouter basename={runtimeEnv.routerBasename}>
  <App />
</BrowserRouter>);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
