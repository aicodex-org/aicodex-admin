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
	"encoding/json"
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

func TestStandardClaimsIncludesWecomCanonicalIdForInternalUser(t *testing.T) {
	claims := getStandardClaims(Claims{
		User: &User{
			Owner: "org-alpha",
			Name:  "alice",
			Properties: map[string]string{
				WecomUserPropertyCorpId: "corp-alpha",
				WecomUserPropertyUserId: "alice",
			},
		},
		SigninMethod: "wecom",
		Provider:     "WeCom",
		Organization: "org-alpha",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: "org-alpha/alice",
		},
	})

	if claims.Subject != "org-alpha/alice" {
		t.Fatalf("sub = %q, want stable admin subject", claims.Subject)
	}
	if claims.Organization != "org-alpha" {
		t.Fatalf("organization = %q, want org-alpha", claims.Organization)
	}
	if claims.WecomCanonicalId != "wecom:corp-alpha:alice" {
		t.Fatalf("wecom_canonical_id = %q, want wecom:corp-alpha:alice", claims.WecomCanonicalId)
	}
}

func TestStandardClaimsOmitsWecomCanonicalIdWhenIdentityIncomplete(t *testing.T) {
	tests := []struct {
		name       string
		properties map[string]string
	}{
		{
			name: "missing corp id",
			properties: map[string]string{
				WecomUserPropertyUserId: "alice",
			},
		},
		{
			name: "missing user id",
			properties: map[string]string{
				WecomUserPropertyCorpId: "corp-alpha",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims := getStandardClaims(Claims{
				User: &User{
					Owner:       "org-alpha",
					Name:        "alice",
					Email:       "alice@example.invalid",
					Phone:       "+15555550100",
					DisplayName: "Alice",
					Properties:  tt.properties,
				},
				SigninMethod: "wecom",
				Provider:     "WeCom",
				Organization: "org-alpha",
				RegisteredClaims: jwt.RegisteredClaims{
					Subject: "org-alpha/alice",
				},
			})

			assertNoWecomCanonicalId(t, claims)
			if claims.Subject != "org-alpha/alice" || claims.Organization != "org-alpha" {
				t.Fatalf("stable claims changed unexpectedly: sub=%q organization=%q", claims.Subject, claims.Organization)
			}
		})
	}
}

func TestStandardClaimsOmitsWecomCanonicalIdForNonWecomLogin(t *testing.T) {
	tests := []struct {
		name         string
		signinMethod string
		provider     string
	}{
		{
			name:         "password login",
			signinMethod: "password",
			provider:     "Password",
		},
		{
			name:         "explicit password login cannot spoof provider",
			signinMethod: "Password",
			provider:     "WeCom",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims := getStandardClaims(Claims{
				User: &User{
					Owner: "org-alpha",
					Name:  "alice",
					Email: "alice@example.invalid",
					Phone: "+15555550100",
					Properties: map[string]string{
						WecomUserPropertyCorpId: "corp-alpha",
						WecomUserPropertyUserId: "alice",
					},
				},
				SigninMethod: tt.signinMethod,
				Provider:     tt.provider,
				Organization: "org-alpha",
				RegisteredClaims: jwt.RegisteredClaims{
					Subject: "org-alpha/alice",
				},
			})

			assertNoWecomCanonicalId(t, claims)
		})
	}
}

func TestStandardClaimsIncludesWecomCanonicalIdForLegacyProviderContext(t *testing.T) {
	claims := getStandardClaims(Claims{
		User: &User{
			Owner: "org-alpha",
			Name:  "alice",
			Properties: map[string]string{
				WecomUserPropertyCorpId: "corp-alpha",
				WecomUserPropertyUserId: "alice",
			},
		},
		Provider:     "WeCom",
		Organization: "org-alpha",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: "org-alpha/alice",
		},
	})

	if claims.WecomCanonicalId != "wecom:corp-alpha:alice" {
		t.Fatalf("wecom_canonical_id = %q, want wecom:corp-alpha:alice", claims.WecomCanonicalId)
	}
}

func TestOidcDiscoveryClaimsSupportedIncludesWecomCanonicalId(t *testing.T) {
	discovery := GetOidcDiscovery("admin.example.invalid", "")

	if !containsString(discovery.ClaimsSupported, "wecom_canonical_id") {
		t.Fatalf("claims_supported = %#v, want wecom_canonical_id", discovery.ClaimsSupported)
	}
}

func assertNoWecomCanonicalId(t *testing.T, claims ClaimsStandard) {
	t.Helper()

	if claims.WecomCanonicalId != "" {
		t.Fatalf("wecom_canonical_id = %q, want omitted", claims.WecomCanonicalId)
	}

	payload, err := json.Marshal(claims)
	if err != nil {
		t.Fatalf("marshal standard claims error = %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("unmarshal standard claims error = %v", err)
	}
	if _, ok := decoded["wecom_canonical_id"]; ok {
		t.Fatalf("wecom_canonical_id should be omitted from JSON payload: %s", payload)
	}
}

func containsString(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
