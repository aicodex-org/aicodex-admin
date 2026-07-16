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

func setupApplicationProviderRetirementTestOrmer(t *testing.T) {
	t.Helper()
	oldOrmer := ormer
	ormer = &Ormer{Engine: newSQLiteTestEngine(t, new(Provider), new(Application), new(Organization))}
	t.Cleanup(func() { ormer = oldOrmer })
}

func insertApplicationProviderRetirementFixture(t *testing.T, value interface{}) {
	t.Helper()
	if _, err := ormer.Engine.Insert(value); err != nil {
		t.Fatalf("insert application retirement fixture: %v", err)
	}
}

func newApplicationRetirementFixture(name string, providerItem *ProviderItem) *Application {
	providers := []*ProviderItem{}
	if providerItem != nil {
		providers = append(providers, providerItem)
	}
	return &Application{
		Owner:        "admin",
		Name:         name,
		DisplayName:  name,
		Organization: "built-in",
		ClientId:     "client-" + name,
		Providers:    providers,
	}
}

func TestAddApplicationRejectsRetiredProviderFromServerOwnedData(t *testing.T) {
	setupApplicationProviderRetirementTestOrmer(t)
	insertApplicationProviderRetirementFixture(t, &Provider{Owner: "admin", Name: "wallet", Category: "Web3", Type: "MetaMask"})
	application := newApplicationRetirementFixture("new-wallet-app", &ProviderItem{
		Name:      "wallet",
		CanSignIn: false,
		Provider:  &Provider{Category: "OAuth", Type: "GitHub"},
	})

	ok, err := AddApplication(application)

	if ok || !errors.Is(err, ErrWeb3WalletAuthRetired) {
		t.Fatalf("AddApplication() = (%v, %v), want (false, %v)", ok, err, ErrWeb3WalletAuthRetired)
	}
	count, countErr := ormer.Engine.Count(new(Application))
	if countErr != nil || count != 0 {
		t.Fatalf("application count = %d, err = %v, want 0", count, countErr)
	}
}

func TestAddApplicationTrustsServerProviderInsteadOfNestedRequestData(t *testing.T) {
	setupApplicationProviderRetirementTestOrmer(t)
	insertApplicationProviderRetirementFixture(t, &Provider{Owner: "admin", Name: "github", Category: "OAuth", Type: "GitHub"})
	application := newApplicationRetirementFixture("ordinary-app", &ProviderItem{
		Name:      "github",
		CanSignIn: true,
		Provider:  &Provider{Category: "Web3", Type: "MetaMask"},
	})

	ok, err := AddApplication(application)

	if !ok || err != nil {
		t.Fatalf("AddApplication() = (%v, %v), want success for server-owned ordinary provider", ok, err)
	}
}

func TestUpdateApplicationRejectsRetiredProviderActivationStates(t *testing.T) {
	tests := []struct {
		name string
		old  *ProviderItem
		new  *ProviderItem
	}{
		{
			name: "active binding remains active",
			old:  &ProviderItem{Name: "wallet", CanSignIn: true},
			new:  &ProviderItem{Name: "wallet", CanSignIn: true},
		},
		{
			name: "disabled binding enables signup",
			old:  &ProviderItem{Name: "wallet"},
			new:  &ProviderItem{Name: "wallet", CanSignUp: true},
		},
		{
			name: "disabled binding enables prompt",
			old:  &ProviderItem{Name: "wallet"},
			new:  &ProviderItem{Name: "wallet", Prompted: true},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setupApplicationProviderRetirementTestOrmer(t)
			insertApplicationProviderRetirementFixture(t, &Provider{Owner: "admin", Name: "wallet", Category: "Web3", Type: "Web3Onboard"})
			oldApplication := newApplicationRetirementFixture("historical-app", tt.old)
			insertApplicationProviderRetirementFixture(t, oldApplication)
			newApplication := newApplicationRetirementFixture("historical-app", tt.new)

			ok, err := UpdateApplication("admin/historical-app", newApplication, true, "en")

			if ok || !errors.Is(err, ErrWeb3WalletAuthRetired) {
				t.Fatalf("UpdateApplication() = (%v, %v), want (false, %v)", ok, err, ErrWeb3WalletAuthRetired)
			}
			stored, getErr := GetApplication("admin/historical-app")
			if getErr != nil || stored == nil || len(stored.Providers) != 1 {
				t.Fatalf("stored application = %#v, err = %v", stored, getErr)
			}
			if stored.Providers[0].CanSignIn != tt.old.CanSignIn || stored.Providers[0].CanSignUp != tt.old.CanSignUp || stored.Providers[0].Prompted != tt.old.Prompted {
				t.Fatalf("stored binding changed after rejection: %#v", stored.Providers[0])
			}
		})
	}
}

func TestUpdateApplicationRejectsNewRetiredProviderBinding(t *testing.T) {
	setupApplicationProviderRetirementTestOrmer(t)
	insertApplicationProviderRetirementFixture(t, &Provider{Owner: "admin", Name: "wallet", Category: "OAuth", Type: "MetaMask"})
	insertApplicationProviderRetirementFixture(t, newApplicationRetirementFixture("ordinary-app", nil))
	newBinding := &ProviderItem{
		Name:      "wallet",
		CanSignIn: false,
		Provider:  &Provider{Category: "OAuth", Type: "GitHub"},
	}

	ok, err := UpdateApplication("admin/ordinary-app", newApplicationRetirementFixture("ordinary-app", newBinding), true, "en")

	if ok || !errors.Is(err, ErrWeb3WalletAuthRetired) {
		t.Fatalf("UpdateApplication() = (%v, %v), want new binding rejection", ok, err)
	}
}

func TestUpdateApplicationTrustsServerProviderInsteadOfNestedRequestData(t *testing.T) {
	setupApplicationProviderRetirementTestOrmer(t)
	insertApplicationProviderRetirementFixture(t, &Provider{Owner: "admin", Name: "github", Category: "OAuth", Type: "GitHub"})
	insertApplicationProviderRetirementFixture(t, newApplicationRetirementFixture("ordinary-app", nil))
	newBinding := &ProviderItem{
		Name:      "github",
		CanSignIn: true,
		Provider:  &Provider{Category: "Web3", Type: "MetaMask"},
	}

	ok, err := UpdateApplication("admin/ordinary-app", newApplicationRetirementFixture("ordinary-app", newBinding), true, "en")

	if !ok || err != nil {
		t.Fatalf("UpdateApplication() = (%v, %v), want success for server-owned ordinary provider", ok, err)
	}
}

func TestUpdateApplicationAllowsRetiredProviderToBecomeOrRemainDisabled(t *testing.T) {
	tests := []struct {
		name string
		old  *ProviderItem
		new  *ProviderItem
	}{
		{
			name: "active to disabled",
			old:  &ProviderItem{Name: "wallet", CanSignIn: true, CanSignUp: true, Prompted: true, CanUnlink: true},
			new:  &ProviderItem{Name: "wallet", CanUnlink: true},
		},
		{
			name: "disabled remains disabled",
			old:  &ProviderItem{Name: "wallet", CanUnlink: true},
			new:  &ProviderItem{Name: "wallet", CanUnlink: true, TargetOrganization: "retained-metadata"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setupApplicationProviderRetirementTestOrmer(t)
			insertApplicationProviderRetirementFixture(t, &Provider{Owner: "admin", Name: "wallet", Category: "Web3", Type: "MetaMask"})
			insertApplicationProviderRetirementFixture(t, newApplicationRetirementFixture("historical-app", tt.old))

			ok, err := UpdateApplication("admin/historical-app", newApplicationRetirementFixture("historical-app", tt.new), true, "en")

			if !ok || err != nil {
				t.Fatalf("UpdateApplication() = (%v, %v), want disabled save success", ok, err)
			}
			stored, getErr := GetApplication("admin/historical-app")
			if getErr != nil || stored == nil || len(stored.Providers) != 1 {
				t.Fatalf("stored application = %#v, err = %v", stored, getErr)
			}
			item := stored.Providers[0]
			if item.CanSignIn || item.CanSignUp || item.Prompted || !item.CanUnlink {
				t.Fatalf("stored binding is not safely disabled with unlink preserved: %#v", item)
			}
		})
	}
}

func TestUpdateApplicationAllowsRemovingRetiredProviderBinding(t *testing.T) {
	setupApplicationProviderRetirementTestOrmer(t)
	insertApplicationProviderRetirementFixture(t, &Provider{Owner: "admin", Name: "wallet", Category: "Web3", Type: "MetaMask"})
	insertApplicationProviderRetirementFixture(t, newApplicationRetirementFixture("historical-app", &ProviderItem{Name: "wallet", CanSignIn: true}))

	ok, err := UpdateApplication("admin/historical-app", newApplicationRetirementFixture("historical-app", nil), true, "en")

	if !ok || err != nil {
		t.Fatalf("UpdateApplication() = (%v, %v), want removal success", ok, err)
	}
	stored, getErr := GetApplication("admin/historical-app")
	if getErr != nil || stored == nil || len(stored.Providers) != 0 {
		t.Fatalf("stored providers after removal = %#v, err = %v", stored, getErr)
	}
}
