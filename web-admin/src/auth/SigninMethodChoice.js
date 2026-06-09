// Copyright 2026 The Casdoor Authors. All Rights Reserved.
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

const SigninMethodChoiceMap = new Map([
  ["Password-All", {labelKey: "general:Password", key: "password"}],
  ["Password-Non-LDAP", {labelKey: "general:Password", key: "password"}],
  ["Verification code-All", {labelKey: "login:Verification code", key: "verificationCode"}],
  ["Verification code-Email only", {labelKey: "login:Verification code", key: "verificationCodeEmail"}],
  ["Verification code-Phone only", {labelKey: "login:Verification code", key: "verificationCodePhone"}],
  ["WebAuthn-None", {labelKey: "login:WebAuthn", key: "webAuthn"}],
  ["LDAP-None", {labelKey: "login:LDAP", key: "ldap"}],
  ["Face ID-None", {labelKey: "login:Face ID", key: "faceId"}],
  ["WeChat-Tab", {labelKey: "login:WeChat", key: "wechat"}],
  ["WeChat-None", {labelKey: "login:WeChat", key: "wechat"}],
  ["WeCom-Tab", {labelKey: "login:WeCom", key: "wecom"}],
  ["WeCom-None", {labelKey: "login:WeCom", key: "wecom"}],
]);

function getChoiceMapKey(name, rule) {
  return `${name}-${rule}`;
}

export function getSigninMethodChoiceItems(signinMethods, translate) {
  const t = typeof translate === "function" ? translate : key => key;
  const methods = Array.isArray(signinMethods) ? signinMethods : [];
  const seenKeys = new Set();

  return methods.reduce((items, signinMethod) => {
    if (signinMethod?.rule === "Hide password") {
      return items;
    }

    const choice = SigninMethodChoiceMap.get(getChoiceMapKey(signinMethod?.name, signinMethod?.rule));
    if (!choice || seenKeys.has(choice.key)) {
      return items;
    }

    seenKeys.add(choice.key);
    const defaultLabel = t(choice.labelKey);
    const hasCustomLabel = signinMethod.displayName && signinMethod.name !== signinMethod.displayName;
    let label = hasCustomLabel ? signinMethod.displayName : defaultLabel;
    if (methods.length >= 4 && label === "Verification code") {
      label = "Code";
    }

    items.push({label, key: choice.key});
    return items;
  }, []);
}
