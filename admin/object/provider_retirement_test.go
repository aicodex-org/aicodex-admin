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

package object

import (
	"errors"
	"testing"
)

func setupProviderRetirementTestOrmer(t *testing.T) {
	t.Helper()
	oldOrmer := ormer
	ormer = &Ormer{Engine: newSQLiteTestEngine(t, new(Provider))}
	t.Cleanup(func() { ormer = oldOrmer })
}

func insertProviderRetirementFixture(t *testing.T, provider *Provider) {
	t.Helper()
	if _, err := ormer.Engine.Insert(provider); err != nil {
		t.Fatalf("insert provider fixture: %v", err)
	}
}

func TestIsRetiredWeb3WalletProvider(t *testing.T) {
	tests := []struct {
		name     string
		provider *Provider
		want     bool
	}{
		{name: "nil provider", provider: nil, want: false},
		{name: "category exact", provider: &Provider{Category: "Web3", Type: "Custom"}, want: true},
		{name: "category normalized", provider: &Provider{Category: "  wEb3  ", Type: "Custom"}, want: true},
		{name: "metamask type with OAuth category", provider: &Provider{Category: "OAuth", Type: " MetaMask "}, want: true},
		{name: "web3 onboard type with mismatched category", provider: &Provider{Category: "SAML", Type: "web3onboard"}, want: true},
		{name: "ordinary OAuth provider", provider: &Provider{Category: "OAuth", Type: "GitHub"}, want: false},
		{name: "similar values do not match", provider: &Provider{Category: "Web30", Type: "MetaMask2"}, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsRetiredWeb3WalletProvider(tt.provider); got != tt.want {
				t.Fatalf("IsRetiredWeb3WalletProvider(%#v) = %v, want %v", tt.provider, got, tt.want)
			}
		})
	}
}

func TestWeb3WalletRetirementErrorCodeIsStable(t *testing.T) {
	if Web3WalletAuthRetiredErrorCode != "PROVIDER_WEB3_WALLET_AUTH_RETIRED" {
		t.Fatalf("Web3WalletAuthRetiredErrorCode = %q", Web3WalletAuthRetiredErrorCode)
	}
	if ErrWeb3WalletAuthRetired.Error() != Web3WalletAuthRetiredErrorCode {
		t.Fatalf("ErrWeb3WalletAuthRetired = %q, want %q", ErrWeb3WalletAuthRetired, Web3WalletAuthRetiredErrorCode)
	}
}

func TestAddProviderRejectsRetiredWeb3WalletAuthentication(t *testing.T) {
	tests := []struct {
		name     string
		category string
		typeName string
	}{
		{name: "category", category: "Web3", typeName: "Custom"},
		{name: "metamask type", category: "OAuth", typeName: "MetaMask"},
		{name: "web3 onboard type", category: "SAML", typeName: "Web3Onboard"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setupProviderRetirementTestOrmer(t)
			provider := &Provider{Owner: "admin", Name: "retired-" + tt.name, Category: tt.category, Type: tt.typeName}

			ok, err := AddProvider(provider)

			if ok || !errors.Is(err, ErrWeb3WalletAuthRetired) {
				t.Fatalf("AddProvider() = (%v, %v), want (false, %v)", ok, err, ErrWeb3WalletAuthRetired)
			}
			count, countErr := ormer.Engine.Count(new(Provider))
			if countErr != nil || count != 0 {
				t.Fatalf("provider count = %d, err = %v, want 0", count, countErr)
			}
		})
	}
}

func TestUpdateProviderRejectsConversionToRetiredWeb3WalletAuthentication(t *testing.T) {
	setupProviderRetirementTestOrmer(t)
	insertProviderRetirementFixture(t, &Provider{Owner: "admin", Name: "ordinary", DisplayName: "Ordinary", Category: "OAuth", Type: "GitHub"})

	ok, err := UpdateProvider("admin/ordinary", &Provider{Owner: "admin", Name: "ordinary", DisplayName: "Converted", Category: "OAuth", Type: "MetaMask"})

	if ok || !errors.Is(err, ErrWeb3WalletAuthRetired) {
		t.Fatalf("UpdateProvider() = (%v, %v), want (false, %v)", ok, err, ErrWeb3WalletAuthRetired)
	}
	provider, getErr := GetProvider("admin/ordinary")
	if getErr != nil || provider == nil {
		t.Fatalf("GetProvider() = (%#v, %v)", provider, getErr)
	}
	if provider.Type != "GitHub" || provider.DisplayName != "Ordinary" {
		t.Fatalf("provider was modified after rejected conversion: %#v", provider)
	}
}

func TestUpdateProviderRejectsEditingHistoricalRetiredProvider(t *testing.T) {
	setupProviderRetirementTestOrmer(t)
	insertProviderRetirementFixture(t, &Provider{Owner: "admin", Name: "historical", DisplayName: "Historical", Category: "Web3", Type: "MetaMask"})

	ok, err := UpdateProvider("admin/historical", &Provider{Owner: "admin", Name: "historical", DisplayName: "Changed", Category: "Web3", Type: "MetaMask"})

	if ok || !errors.Is(err, ErrWeb3WalletAuthRetired) {
		t.Fatalf("UpdateProvider() = (%v, %v), want (false, %v)", ok, err, ErrWeb3WalletAuthRetired)
	}
	provider, getErr := GetProvider("admin/historical")
	if getErr != nil || provider == nil || provider.DisplayName != "Historical" {
		t.Fatalf("historical provider was modified: provider = %#v, err = %v", provider, getErr)
	}
}

func TestProviderRetirementKeepsOrdinaryWritesAndHistoricalCleanup(t *testing.T) {
	setupProviderRetirementTestOrmer(t)
	ordinary := &Provider{Owner: "admin", Name: "ordinary", Category: "OAuth", Type: "GitHub", ClientSecret: "sensitive"}
	if ok, err := AddProvider(ordinary); !ok || err != nil {
		t.Fatalf("AddProvider(ordinary) = (%v, %v)", ok, err)
	}
	historical := &Provider{Owner: "admin", Name: "historical", Category: "Web3", Type: "MetaMask", ClientSecret: "historical-secret"}
	insertProviderRetirementFixture(t, historical)

	loaded, err := GetProvider("admin/historical")
	if err != nil || loaded == nil {
		t.Fatalf("GetProvider(historical) = (%#v, %v)", loaded, err)
	}
	if masked := GetMaskedProvider(loaded, true); masked.ClientSecret != "***" {
		t.Fatalf("masked historical secret = %q", masked.ClientSecret)
	}
	if ok, err := DeleteProvider(historical); !ok || err != nil {
		t.Fatalf("DeleteProvider(historical) = (%v, %v)", ok, err)
	}
	if loaded, err = GetProvider("admin/historical"); err != nil || loaded != nil {
		t.Fatalf("historical provider after delete = (%#v, %v)", loaded, err)
	}
}
