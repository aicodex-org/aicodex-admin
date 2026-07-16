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

// modified from https://github.com/casbin/casnode/blob/master/service/mail.go

package object

import (
	"fmt"

	"git.leagsoft.com/aicodex/aicodex-admin/email"
)

// TestSmtpServer Test the SMTP server
func TestSmtpServer(provider *Provider) error {
	emailProvider, err := getEmailProvider(provider)
	if err != nil {
		return err
	}
	smtpEmailProvider, ok := emailProvider.(*email.SmtpEmailProvider)
	if !ok {
		return fmt.Errorf("email provider is not SMTP")
	}
	sender, err := smtpEmailProvider.Dialer.Dial()
	if err != nil {
		return err
	}
	defer sender.Close()

	return nil
}

func SendEmail(provider *Provider, title string, content string, dest []string, sender string) error {
	emailProvider, err := getEmailProvider(provider)
	if err != nil {
		return err
	}

	fromAddress := provider.ClientId2
	if fromAddress == "" {
		fromAddress = provider.ClientId
	}

	fromName := provider.ClientSecret2
	if fromName == "" {
		fromName = sender
	}

	return emailProvider.Send(fromAddress, fromName, dest, title, content)
}

// getEmailProvider 只为dialer-backed SMTP解析企业TLS policy，HTTP邮件Provider保持原路径。
func getEmailProvider(provider *Provider) (email.EmailProvider, error) {
	sslMode := getSslMode(provider)
	if email.IsSMTPProviderType(provider.Type) {
		resolution, err := ResolveSMTPProviderTLSPolicy(provider)
		if err != nil {
			return nil, err
		}
		return email.NewSmtpEmailProvider(provider.ClientId, provider.ClientSecret, provider.Host, provider.Port, provider.Type, sslMode, resolution, provider.EnableProxy)
	}
	return email.GetEmailProvider(provider.Type, provider.ClientId, provider.ClientSecret, provider.Host, provider.Port, sslMode, provider.Endpoint, provider.Method, provider.HttpHeaders, provider.UserMapping, provider.IssuerUrl, nil, provider.EnableProxy)
}

// getSslMode returns the SSL mode for the provider, with backward compatibility for DisableSsl
func getSslMode(provider *Provider) string {
	// If SslMode is set, use it
	if provider.SslMode != "" {
		return provider.SslMode
	}

	// Backward compatibility: convert DisableSsl to SslMode
	if provider.DisableSsl {
		return "Disable"
	}

	// Default to "Auto" for new configurations or when DisableSsl is false
	return "Auto"
}
