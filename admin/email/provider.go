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

import "git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"

type EmailProvider interface {
	Send(fromAddress string, fromName string, toAddress []string, subject string, content string) error
}

// IsSMTPProviderType 区分需要 gomail dialer 的类型与已知 HTTP API 邮件类型。
func IsSMTPProviderType(typ string) bool {
	switch typ {
	case "Azure ACS", "Custom HTTP Email", "SendGrid", "Resend":
		return false
	default:
		return true
	}
}

// GetEmailProvider 按邮件类型构造实现；SMTP 类型必须携带已解析的连接级 TLS policy。
func GetEmailProvider(typ string, clientId string, clientSecret string, host string, port int, sslMode string, endpoint string, method string, httpHeaders map[string]string, bodyMapping map[string]string, contentType string, resolution *tlspolicy.Resolution, enableProxy bool) (EmailProvider, error) {
	switch typ {
	case "Azure ACS":
		return NewAzureACSEmailProvider(clientSecret, host), nil
	case "Custom HTTP Email":
		return NewHttpEmailProvider(endpoint, method, httpHeaders, bodyMapping, contentType), nil
	case "SendGrid":
		return NewSendgridEmailProvider(clientSecret, host, endpoint), nil
	case "Resend":
		return NewResendEmailProvider(clientSecret), nil
	default:
		return NewSmtpEmailProvider(clientId, clientSecret, host, port, typ, sslMode, resolution, enableProxy)
	}
}
