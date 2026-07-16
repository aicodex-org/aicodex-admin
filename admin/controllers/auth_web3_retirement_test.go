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
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	webcontext "github.com/beego/beego/v2/server/web/context"
)

func newAuthWeb3RetirementTestController() (*ApiController, *httptest.ResponseRecorder) {
	request := httptest.NewRequest("POST", "/api/login", nil)
	recorder := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(recorder, request)
	controller := &ApiController{}
	controller.Init(ctx, "ApiController", "Login", controller)
	return controller, recorder
}

func TestRejectRetiredWeb3WalletLoginReturnsStableAliasWithoutBindingResolution(t *testing.T) {
	tests := []struct {
		name     string
		provider *object.Provider
	}{
		{name: "category", provider: &object.Provider{Category: "Web3", Type: "Custom", ClientSecret: "must-not-leak"}},
		{name: "metamask type", provider: &object.Provider{Category: "OAuth", Type: "MetaMask", Endpoint: "must-not-leak"}},
		{name: "web3 onboard type", provider: &object.Provider{Category: "SAML", Type: "Web3Onboard", Metadata: "must-not-leak"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			controller, recorder := newAuthWeb3RetirementTestController()

			if rejected := controller.rejectRetiredWeb3WalletLogin(tt.provider); !rejected {
				t.Fatal("rejectRetiredWeb3WalletLogin() = false, want true")
			}
			var response Response
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("decode response %q: %v", recorder.Body.String(), err)
			}
			if response.Status != "error" || response.Msg != object.Web3WalletAuthRetiredErrorCode {
				t.Fatalf("response = %#v", response)
			}
			if strings.Contains(recorder.Body.String(), "must-not-leak") {
				t.Fatalf("response leaked provider material: %s", recorder.Body.String())
			}
		})
	}
}

func TestRejectRetiredWeb3WalletLoginAllowsOrdinaryProvider(t *testing.T) {
	controller, recorder := newAuthWeb3RetirementTestController()

	if rejected := controller.rejectRetiredWeb3WalletLogin(&object.Provider{Category: "OAuth", Type: "GitHub"}); rejected {
		t.Fatal("rejectRetiredWeb3WalletLogin() = true, want false")
	}
	if recorder.Body.Len() != 0 {
		t.Fatalf("ordinary provider wrote response: %q", recorder.Body.String())
	}
}
