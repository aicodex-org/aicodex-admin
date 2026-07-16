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

package idp

import (
	"net/http"
	"testing"
	"time"
)

func TestAdfsSetHTTPClientPreservesInjectedIdentity(t *testing.T) {
	transport := &idpSentinelTransport{}
	client := &http.Client{Transport: transport, Timeout: 7 * time.Second}
	provider := NewAdfsIdProvider("client", "secret", "https://admin.example.test/callback", "https://adfs.example.test")

	provider.SetHttpClient(client)

	if provider.Client != client {
		t.Fatal("SetHttpClient replaced the injected client")
	}
	if provider.Client.Transport != transport {
		t.Fatalf("Transport = %T, want injected sentinel", provider.Client.Transport)
	}
	if provider.Client.Timeout != 7*time.Second {
		t.Fatalf("Timeout = %s, want injected timeout", provider.Client.Timeout)
	}
}

func TestAdfsUsesBoundedFallbackWithoutInjection(t *testing.T) {
	provider := NewAdfsIdProvider("client", "secret", "https://admin.example.test/callback", "https://adfs.example.test")
	if provider.Client == nil || provider.Client == http.DefaultClient {
		t.Fatal("constructor did not create an independent fallback client")
	}
	if provider.Client.Timeout != 30*time.Second {
		t.Fatalf("fallback Timeout = %s, want 30s", provider.Client.Timeout)
	}

	provider.SetHttpClient(nil)
	if provider.Client == nil || provider.Client == http.DefaultClient || provider.Client.Timeout != 30*time.Second {
		t.Fatalf("nil injection fallback = %+v", provider.Client)
	}
}
