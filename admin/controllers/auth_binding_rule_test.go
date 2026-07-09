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
	"errors"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/idp"
	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

type bindingRuleFieldLookupCall struct {
	organization string
	field        string
	value        string
}

func withBindingRuleLookupStubs(t *testing.T, fieldLookup func(string, string, string) (*object.User, error), fieldsLookup func(string, string) (*object.User, error)) {
	t.Helper()

	oldFieldLookup := getUserByBindingRuleField
	oldFieldsLookup := getUserByBindingRuleFields
	t.Cleanup(func() {
		getUserByBindingRuleField = oldFieldLookup
		getUserByBindingRuleFields = oldFieldsLookup
	})

	getUserByBindingRuleField = fieldLookup
	getUserByBindingRuleFields = fieldsLookup
}

func TestGetExistUserByBindingRuleDefaultsToEmailOnly(t *testing.T) {
	emailUser := &object.User{Owner: "feishu-org", Name: "email-user"}
	calls := []bindingRuleFieldLookupCall{}

	withBindingRuleLookupStubs(t,
		func(organizationName string, field string, value string) (*object.User, error) {
			calls = append(calls, bindingRuleFieldLookupCall{organization: organizationName, field: field, value: value})
			if organizationName == "feishu-org" && field == "email" && value == "alice@example.com" {
				return emailUser, nil
			}
			return nil, nil
		},
		func(organizationName string, field string) (*object.User, error) {
			t.Fatalf("username lookup should not run for unconfigured bindingRule: organization=%q field=%q", organizationName, field)
			return nil, nil
		},
	)

	providerItem := &object.ProviderItem{}
	user, err := getExistUserByBindingRule(providerItem, "feishu-org", &idp.UserInfo{
		Email:    "alice@example.com",
		Phone:    "13800138000",
		Username: "alice",
	})

	if err != nil {
		t.Fatalf("getExistUserByBindingRule() error = %v", err)
	}
	if user != emailUser {
		t.Fatalf("user = %#v, want email user", user)
	}
	if providerItem.BindingRule != nil {
		t.Fatalf("BindingRule was mutated to %#v, want nil", *providerItem.BindingRule)
	}
	if len(calls) != 1 || calls[0].field != "email" || calls[0].value != "alice@example.com" {
		t.Fatalf("lookup calls = %#v, want only email lookup", calls)
	}
}

func TestGetExistUserByBindingRuleDoesNotDefaultToPhoneOrName(t *testing.T) {
	phoneUser := &object.User{Owner: "feishu-org", Name: "phone-user"}
	nameUser := &object.User{Owner: "feishu-org", Name: "name-user"}
	calls := []bindingRuleFieldLookupCall{}

	withBindingRuleLookupStubs(t,
		func(organizationName string, field string, value string) (*object.User, error) {
			calls = append(calls, bindingRuleFieldLookupCall{organization: organizationName, field: field, value: value})
			if field == "phone" && value == "13800138000" {
				return phoneUser, nil
			}
			return nil, nil
		},
		func(organizationName string, field string) (*object.User, error) {
			if field == "alice" {
				return nameUser, nil
			}
			return nil, nil
		},
	)

	user, err := getExistUserByBindingRule(&object.ProviderItem{}, "feishu-org", &idp.UserInfo{
		Email:    "other@example.com",
		Phone:    "13800138000",
		Username: "alice",
	})

	if err != nil {
		t.Fatalf("getExistUserByBindingRule() error = %v", err)
	}
	if user != nil {
		t.Fatalf("user = %#v, want nil because default rule must not use phone or name", user)
	}
	if len(calls) != 1 || calls[0].field != "email" || calls[0].value != "other@example.com" {
		t.Fatalf("lookup calls = %#v, want only email lookup", calls)
	}
}

func TestGetExistUserByBindingRuleSkipsBlankValuesAndKeepsExplicitRules(t *testing.T) {
	phoneUser := &object.User{Owner: "feishu-org", Name: "phone-user"}
	rules := []string{"Phone", "Name"}

	withBindingRuleLookupStubs(t,
		func(organizationName string, field string, value string) (*object.User, error) {
			if strings.TrimSpace(value) == "" {
				t.Fatalf("blank %s lookup should be skipped", field)
			}
			if organizationName == "feishu-org" && field == "phone" && value == "13800138000" {
				return phoneUser, nil
			}
			return nil, nil
		},
		func(organizationName string, field string) (*object.User, error) {
			if strings.TrimSpace(field) == "" {
				t.Fatalf("blank username lookup should be skipped")
			}
			return nil, nil
		},
	)

	user, err := getExistUserByBindingRule(&object.ProviderItem{BindingRule: &rules}, "feishu-org", &idp.UserInfo{
		Email:    " ",
		Phone:    " 13800138000 ",
		Username: " ",
	})

	if err != nil {
		t.Fatalf("getExistUserByBindingRule() error = %v", err)
	}
	if user != phoneUser {
		t.Fatalf("user = %#v, want explicit phone user", user)
	}
}

func TestGetExistUserByBindingRuleSkipsBlankDefaultEmail(t *testing.T) {
	withBindingRuleLookupStubs(t,
		func(organizationName string, field string, value string) (*object.User, error) {
			t.Fatalf("blank default email lookup should be skipped: organization=%q field=%q value=%q", organizationName, field, value)
			return nil, nil
		},
		func(organizationName string, field string) (*object.User, error) {
			t.Fatalf("username lookup should not run for unconfigured bindingRule")
			return nil, nil
		},
	)

	user, err := getExistUserByBindingRule(&object.ProviderItem{}, "feishu-org", &idp.UserInfo{
		Email:    " ",
		Phone:    "13800138000",
		Username: "alice",
	})

	if err != nil {
		t.Fatalf("getExistUserByBindingRule() error = %v", err)
	}
	if user != nil {
		t.Fatalf("user = %#v, want nil for blank default email", user)
	}
}

func TestGetExistUserByBindingRuleSkipsNilUserInfoAndEmptyExplicitRules(t *testing.T) {
	withBindingRuleLookupStubs(t,
		func(organizationName string, field string, value string) (*object.User, error) {
			t.Fatalf("lookup should not run: organization=%q field=%q value=%q", organizationName, field, value)
			return nil, nil
		},
		func(organizationName string, field string) (*object.User, error) {
			t.Fatalf("username lookup should not run: organization=%q field=%q", organizationName, field)
			return nil, nil
		},
	)

	user, err := getExistUserByBindingRule(&object.ProviderItem{}, "feishu-org", nil)
	if err != nil {
		t.Fatalf("getExistUserByBindingRule(nil userInfo) error = %v", err)
	}
	if user != nil {
		t.Fatalf("user = %#v, want nil for nil userInfo", user)
	}

	rules := []string{}
	user, err = getExistUserByBindingRule(&object.ProviderItem{BindingRule: &rules}, "feishu-org", &idp.UserInfo{
		Email: "alice@example.com",
	})
	if err != nil {
		t.Fatalf("getExistUserByBindingRule(empty rules) error = %v", err)
	}
	if user != nil {
		t.Fatalf("user = %#v, want nil for explicit empty rules", user)
	}
}

func TestGetExistUserByBindingRulePropagatesLookupError(t *testing.T) {
	lookupErr := errors.New("lookup failed")
	rules := []string{"Email"}

	withBindingRuleLookupStubs(t,
		func(organizationName string, field string, value string) (*object.User, error) {
			return nil, lookupErr
		},
		func(organizationName string, field string) (*object.User, error) {
			t.Fatalf("username lookup should not run when email lookup fails")
			return nil, nil
		},
	)

	user, err := getExistUserByBindingRule(&object.ProviderItem{BindingRule: &rules}, "feishu-org", &idp.UserInfo{
		Email: "alice@example.com",
	})
	if !errors.Is(err, lookupErr) {
		t.Fatalf("err = %v, want lookupErr", err)
	}
	if user != nil {
		t.Fatalf("user = %#v, want nil on lookup error", user)
	}
}

func TestGetExistUserByBindingRuleFallsThroughToExplicitName(t *testing.T) {
	nameUser := &object.User{Owner: "feishu-org", Name: "alice"}
	rules := []string{"Email", "Phone", "Name"}
	calls := []bindingRuleFieldLookupCall{}

	withBindingRuleLookupStubs(t,
		func(organizationName string, field string, value string) (*object.User, error) {
			calls = append(calls, bindingRuleFieldLookupCall{organization: organizationName, field: field, value: value})
			return nil, nil
		},
		func(organizationName string, field string) (*object.User, error) {
			if organizationName == "feishu-org" && field == "alice" {
				return nameUser, nil
			}
			return nil, nil
		},
	)

	user, err := getExistUserByBindingRule(&object.ProviderItem{BindingRule: &rules}, "feishu-org", &idp.UserInfo{
		Email:    "alice@example.com",
		Phone:    "13800138000",
		Username: "alice",
	})
	if err != nil {
		t.Fatalf("getExistUserByBindingRule() error = %v", err)
	}
	if user != nameUser {
		t.Fatalf("user = %#v, want explicit name user", user)
	}
	if len(calls) != 2 || calls[0].field != "email" || calls[1].field != "phone" {
		t.Fatalf("field lookup calls = %#v, want email then phone before name fallback", calls)
	}
}

func TestGetOAuthLinkIdentifierUsesDingTalkSyncedUserId(t *testing.T) {
	userInfo := &idp.UserInfo{
		Id:      "open-id",
		UnionId: "union-id",
		Extra: map[string]string{
			"user_id":  "ding-user",
			"open_id":  "open-id",
			"union_id": "union-id",
		},
	}

	if identifier := getOAuthLinkIdentifier("DingTalk", userInfo); identifier != "ding-user" {
		t.Fatalf("DingTalk link identifier = %s, want ding-user", identifier)
	}
	if identifier := getOAuthLinkIdentifier("GitHub", userInfo); identifier != "open-id" {
		t.Fatalf("GitHub link identifier = %s, want open-id", identifier)
	}
}
