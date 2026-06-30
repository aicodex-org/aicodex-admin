// Copyright 2022 The Casdoor Authors. All Rights Reserved.
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

import React, {useEffect} from "react";

type LegacyAny = import("../types/legacyPage").LegacyAny;

export const CaptchaWidget = (props: LegacyAny) => {
  const {captchaType, subType, siteKey, clientSecret, clientId2, clientSecret2, onChange} = props;
  const win = window as LegacyAny;

  const loadScript = (src: string) => {
    const tag = document.createElement("script");
    tag.async = false;
    tag.src = src;
    const body = document.getElementsByTagName("body")[0];
    body.appendChild(tag);
  };

  useEffect(() => {
    switch (captchaType) {
    case "reCAPTCHA" :
    case "reCAPTCHA v2": {
      const reTimer = setInterval(() => {
        if (!win.grecaptcha) {
          loadScript("https://recaptcha.net/recaptcha/api.js");
        }
        if (win.grecaptcha && win.grecaptcha.render) {
          win.grecaptcha.render("captcha", {
            sitekey: siteKey,
            callback: onChange,
          });
          clearInterval(reTimer);
        }
      }, 300);
      break;
    }
    case "reCAPTCHA v3": {
      const reTimer = setInterval(() => {
        if (!win.grecaptcha) {
          loadScript(`https://recaptcha.net/recaptcha/api.js?render=${siteKey}`);
        }
        if (win.grecaptcha && win.grecaptcha.render) {
          const clientId = win.grecaptcha.render("captcha", {
            "sitekey": siteKey,
            "badge": "inline",
            "size": "invisible",
            "callback": onChange,
            "error-callback": function() {
              const logoWidth = `${document.getElementById("captcha")!.offsetWidth + 40}px`;
              (document.getElementsByClassName("grecaptcha-logo")[0].firstChild as LegacyAny).style.width = logoWidth;
              (document.getElementsByClassName("grecaptcha-badge")[0] as LegacyAny).style.width = logoWidth;
            },
          });

          win.grecaptcha.ready(function() {
            win.grecaptcha.execute(clientId, {action: "submit"});
          });
          clearInterval(reTimer);
        }
      }, 300);
      break;
    }
    case "hCaptcha": {
      const hTimer = setInterval(() => {
        if (!win.hcaptcha) {
          loadScript("https://js.hcaptcha.com/1/api.js");
        }
        if (win.hcaptcha && win.hcaptcha.render) {
          win.hcaptcha.render("captcha", {
            sitekey: siteKey,
            callback: onChange,
          });
          clearInterval(hTimer);
        }
      }, 300);
      break;
    }
    case "Aliyun Captcha": {
      win.AliyunCaptchaConfig = {
        region: "cn",
        prefix: clientSecret2,
      };

      const AWSCTimer = setInterval(() => {
        if (!win.initAliyunCaptcha) {
          loadScript("https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js");
        }

        if (win.initAliyunCaptcha) {
          if (clientSecret2 && clientSecret2 !== "***") {
            win.initAliyunCaptcha({
              SceneId: clientId2,
              mode: "embed",
              element: "#captcha",
              captchaVerifyCallback: (data: LegacyAny) => {
                onChange(data.toString());
              },
              slideStyle: {
                width: 320,
                height: 40,
              },
              language: "cn",
              immediate: true,
            });
          }
          clearInterval(AWSCTimer);
        }
      }, 300);
      break;
    }
    case "GEETEST": {
      let getLock = false;
      const gTimer = setInterval(() => {
        if (!win.initGeetest4) {
          loadScript("https://static.geetest.com/v4/gt4.js");
        }
        if (win.initGeetest4 && siteKey && !getLock) {
          const captchaId = String(siteKey);
          win.initGeetest4({
            captchaId,
            product: "float",
          }, function(captchaObj: LegacyAny) {
            if (!getLock) {
              captchaObj.appendTo("#captcha");
              getLock = true;
            }
            captchaObj.onSuccess(function() {
              const result = captchaObj.getValidate();
              onChange(`lot_number=${result.lot_number}&captcha_output=${result.captcha_output}&pass_token=${result.pass_token}&gen_time=${result.gen_time}&captcha_id=${siteKey}`);
            });
          });
          clearInterval(gTimer);
        }
      }, 500);
      break;
    }
    case "Cloudflare Turnstile": {
      const tTimer = setInterval(() => {
        if (!win.turnstile) {
          loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js");
        }
        if (win.turnstile && win.turnstile.render) {
          win.turnstile.render("#captcha", {
            sitekey: siteKey,
            callback: onChange,
          });
          clearInterval(tTimer);
        }
      }, 300);
      break;
    }
    default:
      break;
    }
  }, [captchaType, subType, siteKey, clientSecret, clientId2, clientSecret2]);

  return <div id="captcha" />;
};
