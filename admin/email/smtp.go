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

package email

import (
	"git.leagsoft.com/aicodex/aicodex-admin/conf"
	"git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"
	"github.com/casdoor/gomail/v2"
)

type SmtpEmailProvider struct {
	Dialer *gomail.Dialer
	// TLSDiagnostic 仅暴露脱敏后的连接策略状态，不包含目标或证书材料。
	TLSDiagnostic tlspolicy.Diagnostic
}

// NewSmtpEmailProvider 把已解析的连接级 TLS policy 应用到独立 gomail dialer。
func NewSmtpEmailProvider(userName string, password string, host string, port int, typ string, sslMode string, resolution *tlspolicy.Resolution, enableProxy bool) (*SmtpEmailProvider, error) {
	if resolution == nil || resolution.TLSConfig == nil {
		return nil, &tlspolicy.Error{Code: tlspolicy.ErrorCodeInvalidPolicy}
	}
	dialer := gomail.NewDialer(host, port, userName, password)
	tlsConfig := resolution.TLSConfig.Clone()
	// gomail 只会在 TLSConfig 为空时补 ServerName；自定义 config 必须显式保留主机名校验。
	tlsConfig.ServerName = host
	dialer.TLSConfig = tlsConfig

	// Handle SSL mode: "Auto" (or empty) means don't override gomail's default behavior
	// "Enable" means force SSL on, "Disable" means force SSL off
	if sslMode == "Enable" {
		dialer.SSL = true
	} else if sslMode == "Disable" {
		dialer.SSL = false
	}
	// If sslMode is "Auto" or empty, don't set dialer.SSL - let gomail decide based on port

	if enableProxy {
		socks5Proxy := conf.GetConfigString("socks5Proxy")
		if socks5Proxy != "" {
			dialer.SetSocks5Proxy(socks5Proxy)
		}
	}

	return &SmtpEmailProvider{Dialer: dialer, TLSDiagnostic: resolution.Diagnostic}, nil
}

func (s *SmtpEmailProvider) Send(fromAddress string, fromName string, toAddresses []string, subject string, content string) error {
	message := gomail.NewMessage()

	message.SetAddressHeader("From", fromAddress, fromName)
	var addresses []string
	for _, address := range toAddresses {
		addresses = append(addresses, message.FormatAddress(address, ""))
	}
	message.SetHeader("To", addresses...)
	message.SetHeader("Subject", subject)
	message.SetBody("text/html", content)

	message.SkipUsernameCheck = true
	return s.Dialer.DialAndSend(message)
}
