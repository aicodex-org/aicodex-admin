// Copyright 2026 The AICodex Authors. All Rights Reserved.
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

package controllers

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"net/http"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/idp"
	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"git.leagsoft.com/aicodex/aicodex-admin/proxy"
	"git.leagsoft.com/aicodex/aicodex-admin/tlspolicy"
	"golang.org/x/oauth2"
)

type capturingEnterpriseTLSIdProvider struct {
	client *http.Client
}

func (p *capturingEnterpriseTLSIdProvider) SetHttpClient(client *http.Client) {
	p.client = client
}

func (*capturingEnterpriseTLSIdProvider) GetToken(string) (*oauth2.Token, error) {
	return nil, nil
}

func (*capturingEnterpriseTLSIdProvider) GetUserInfo(*oauth2.Token) (*idp.UserInfo, error) {
	return nil, nil
}

type enterpriseTLSSentinelTransport struct{}

func (*enterpriseTLSSentinelTransport) RoundTrip(*http.Request) (*http.Response, error) {
	return nil, errors.New("sentinel")
}

func TestSetProviderHTTPClientBuildsProviderScopedADFSTransport(t *testing.T) {
	baseTransport := &http.Transport{}
	baseTransport.TLSClientConfig = &tls.Config{
		MinVersion:   tls.VersionTLS12,
		NextProtos:   []string{"h2"},
		Certificates: []tls.Certificate{{}},
	}
	originalTLSConfig := baseTransport.TLSClientConfig.Clone()
	baseClient := &http.Client{Transport: baseTransport, Timeout: 11 * time.Second}
	replaceEnterpriseTLSHTTPClients(t, baseClient, &http.Client{Transport: http.DefaultTransport.(*http.Transport).Clone()})

	resolution := &tlspolicy.Resolution{
		TLSConfig:  &tls.Config{InsecureSkipVerify: true},
		Diagnostic: tlspolicy.Diagnostic{Mode: tlspolicy.ModeLegacyInsecure, Source: tlspolicy.SourceExplicit},
	}
	replaceProviderTLSPolicyResolver(t, func(*object.Provider) (*tlspolicy.Resolution, error) {
		return resolution, nil
	})

	capturing := &capturingEnterpriseTLSIdProvider{}
	provider := &object.Provider{Type: "ADFS", TlsPolicy: tlspolicy.ModeLegacyInsecure}
	if err := setProviderHttpClient(capturing, provider); err != nil {
		t.Fatalf("setProviderHttpClient() error = %v", err)
	}
	if capturing.client == nil || capturing.client == baseClient {
		t.Fatal("ADFS did not receive a provider-scoped client")
	}
	if capturing.client.Timeout != baseClient.Timeout {
		t.Fatalf("Timeout = %s, want %s", capturing.client.Timeout, baseClient.Timeout)
	}
	transport, ok := capturing.client.Transport.(*http.Transport)
	if !ok || transport == baseTransport {
		t.Fatalf("Transport = %T, want independent *http.Transport", capturing.client.Transport)
	}
	if transport.TLSClientConfig == nil || !transport.TLSClientConfig.InsecureSkipVerify {
		t.Fatalf("provider TLS config = %+v", transport.TLSClientConfig)
	}
	if transport.TLSClientConfig.MinVersion != originalTLSConfig.MinVersion || len(transport.TLSClientConfig.NextProtos) != 1 || transport.TLSClientConfig.NextProtos[0] != "h2" || len(transport.TLSClientConfig.Certificates) != 1 {
		t.Fatalf("provider TLS config lost base transport settings: %+v", transport.TLSClientConfig)
	}
	if baseTransport.TLSClientConfig.InsecureSkipVerify != originalTLSConfig.InsecureSkipVerify || baseTransport.TLSClientConfig.MinVersion != originalTLSConfig.MinVersion {
		t.Fatal("global default transport TLS config was modified")
	}
	if transport.TLSClientConfig == resolution.TLSConfig {
		t.Fatal("controller reused mutable resolver TLS config")
	}
}

func TestCloneHTTPClientWithTLSPolicyPreservesBaseTLSSettingsForAllModes(t *testing.T) {
	customRoots := x509.NewCertPool()
	tests := []struct {
		name      string
		policyTLS *tls.Config
		wantSkip  bool
		wantRoots bool
	}{
		{name: "system", policyTLS: &tls.Config{}},
		{name: "custom CA", policyTLS: &tls.Config{RootCAs: customRoots}, wantRoots: true},
		{name: "legacy insecure", policyTLS: &tls.Config{InsecureSkipVerify: true}, wantSkip: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			baseTLS := &tls.Config{
				ServerName:       "provider.example",
				MinVersion:       tls.VersionTLS12,
				MaxVersion:       tls.VersionTLS13,
				NextProtos:       []string{"h2"},
				Certificates:     []tls.Certificate{{}},
				VerifyConnection: func(tls.ConnectionState) error { return nil },
			}
			baseTransport := &http.Transport{TLSClientConfig: baseTLS}
			baseClient := &http.Client{Transport: baseTransport, Timeout: 17 * time.Second}

			got, err := cloneHTTPClientWithTLSPolicy(baseClient, &tlspolicy.Resolution{TLSConfig: test.policyTLS})
			if err != nil {
				t.Fatalf("cloneHTTPClientWithTLSPolicy() error = %v", err)
			}
			gotTransport, ok := got.Transport.(*http.Transport)
			if !ok || gotTransport == baseTransport {
				t.Fatalf("Transport = %T, want independent *http.Transport", got.Transport)
			}
			gotTLS := gotTransport.TLSClientConfig
			if gotTLS == nil || gotTLS == baseTLS || gotTLS == test.policyTLS {
				t.Fatalf("TLSClientConfig = %p, want independent config", gotTLS)
			}
			if gotTLS.ServerName != baseTLS.ServerName || gotTLS.MinVersion != baseTLS.MinVersion || gotTLS.MaxVersion != baseTLS.MaxVersion || len(gotTLS.NextProtos) != 1 || gotTLS.NextProtos[0] != "h2" || len(gotTLS.Certificates) != 1 || gotTLS.VerifyConnection == nil {
				t.Fatalf("provider TLS config lost base settings: %+v", gotTLS)
			}
			if gotTLS.InsecureSkipVerify != test.wantSkip {
				t.Fatalf("InsecureSkipVerify = %t, want %t", gotTLS.InsecureSkipVerify, test.wantSkip)
			}
			if (gotTLS.RootCAs != nil) != test.wantRoots {
				t.Fatalf("RootCAs present = %t, want %t", gotTLS.RootCAs != nil, test.wantRoots)
			}
			if gotTLS.RootCAs != nil && gotTLS.RootCAs == test.policyTLS.RootCAs {
				t.Fatal("controller reused mutable resolver root pool")
			}
			if baseTransport.TLSClientConfig != baseTLS || baseTLS.InsecureSkipVerify || baseTLS.RootCAs != nil {
				t.Fatal("base transport TLS config was modified")
			}
		})
	}
}

func TestSetProviderHTTPClientKeepsOrdinaryProviderSelection(t *testing.T) {
	defaultClient := &http.Client{Transport: &enterpriseTLSSentinelTransport{}}
	proxyClient := &http.Client{Transport: &enterpriseTLSSentinelTransport{}}
	replaceEnterpriseTLSHTTPClients(t, defaultClient, proxyClient)
	resolverCalls := 0
	replaceProviderTLSPolicyResolver(t, func(*object.Provider) (*tlspolicy.Resolution, error) {
		resolverCalls++
		return nil, errors.New("ordinary provider must not resolve enterprise TLS policy")
	})

	linkedIn := &capturingEnterpriseTLSIdProvider{}
	if err := setProviderHttpClient(linkedIn, &object.Provider{Type: "LinkedIn"}); err != nil {
		t.Fatalf("setProviderHttpClient(LinkedIn) error = %v", err)
	}
	if linkedIn.client != proxyClient {
		t.Fatal("LinkedIn no longer receives the existing proxy client")
	}

	github := &capturingEnterpriseTLSIdProvider{}
	if err := setProviderHttpClient(github, &object.Provider{Type: "GitLab"}); err != nil {
		t.Fatalf("setProviderHttpClient(GitLab) error = %v", err)
	}
	if github.client != defaultClient {
		t.Fatal("GitLab no longer receives the existing default client")
	}
	if resolverCalls != 0 {
		t.Fatalf("ordinary providers triggered %d TLS resolver calls", resolverCalls)
	}
}

func TestSetHTTPClientKeepsLegacyProviderSelection(t *testing.T) {
	defaultClient := &http.Client{Transport: &enterpriseTLSSentinelTransport{}}
	proxyClient := &http.Client{Transport: &enterpriseTLSSentinelTransport{}}
	replaceEnterpriseTLSHTTPClients(t, defaultClient, proxyClient)

	linkedIn := &capturingEnterpriseTLSIdProvider{}
	setHttpClient(linkedIn, "LinkedIn")
	if linkedIn.client != proxyClient {
		t.Fatal("legacy LinkedIn caller no longer receives the existing proxy client")
	}

	gitlab := &capturingEnterpriseTLSIdProvider{}
	setHttpClient(gitlab, "GitLab")
	if gitlab.client != defaultClient {
		t.Fatal("legacy GitLab caller no longer receives the existing default client")
	}
}

func TestSetProviderHTTPClientFailsClosedBeforeADFSInjection(t *testing.T) {
	tests := []struct {
		name       string
		baseClient *http.Client
		resolve    func(*object.Provider) (*tlspolicy.Resolution, error)
		wantCode   string
	}{
		{
			name:       "policy error",
			baseClient: &http.Client{Transport: http.DefaultTransport.(*http.Transport).Clone()},
			resolve: func(*object.Provider) (*tlspolicy.Resolution, error) {
				return nil, &tlspolicy.Error{Code: tlspolicy.ErrorCodeCAInvalid}
			},
			wantCode: tlspolicy.ErrorCodeCAInvalid,
		},
		{
			name:       "unsupported transport",
			baseClient: &http.Client{Transport: &enterpriseTLSSentinelTransport{}},
			resolve: func(*object.Provider) (*tlspolicy.Resolution, error) {
				return &tlspolicy.Resolution{TLSConfig: &tls.Config{}}, nil
			},
			wantCode: tlspolicy.ErrorCodeTransportUnsupported,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			replaceEnterpriseTLSHTTPClients(t, test.baseClient, test.baseClient)
			replaceProviderTLSPolicyResolver(t, test.resolve)
			capturing := &capturingEnterpriseTLSIdProvider{}
			err := setProviderHttpClient(capturing, &object.Provider{Type: "ADFS"})
			policyErr, ok := err.(*tlspolicy.Error)
			if !ok || policyErr.Code != test.wantCode {
				t.Fatalf("error = %T %v, want %q", err, err, test.wantCode)
			}
			if capturing.client != nil {
				t.Fatal("ADFS client was injected after policy failure")
			}
		})
	}
}

func replaceEnterpriseTLSHTTPClients(t *testing.T, defaultClient *http.Client, proxyClient *http.Client) {
	t.Helper()
	previousDefault := proxy.DefaultHttpClient
	previousProxy := proxy.ProxyHttpClient
	proxy.DefaultHttpClient = defaultClient
	proxy.ProxyHttpClient = proxyClient
	t.Cleanup(func() {
		proxy.DefaultHttpClient = previousDefault
		proxy.ProxyHttpClient = previousProxy
	})
}

func replaceProviderTLSPolicyResolver(t *testing.T, resolver func(*object.Provider) (*tlspolicy.Resolution, error)) {
	t.Helper()
	previous := resolveProviderTLSPolicy
	resolveProviderTLSPolicy = resolver
	t.Cleanup(func() { resolveProviderTLSPolicy = previous })
}
