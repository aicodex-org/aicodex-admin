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
	"strings"
	"testing"
)

func TestGetIdProviderDoesNotConstructRetiredWeb3WalletAdapters(t *testing.T) {
	for _, providerType := range []string{"MetaMask", "Web3Onboard"} {
		t.Run(providerType, func(t *testing.T) {
			provider, err := GetIdProvider(&ProviderInfo{Type: providerType}, "http://127.0.0.1/callback")

			if provider != nil || err == nil || !strings.Contains(err.Error(), "not supported") {
				t.Fatalf("GetIdProvider(%q) = (%T, %v), want unsupported", providerType, provider, err)
			}
		})
	}
}

func TestGetIdProviderStillConstructsOrdinaryOAuthAdapter(t *testing.T) {
	provider, err := GetIdProvider(&ProviderInfo{Type: "GitHub"}, "http://127.0.0.1/callback")
	if provider == nil || err != nil {
		t.Fatalf("GetIdProvider(GitHub) = (%T, %v)", provider, err)
	}
}
