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
	"strings"
	"testing"
	"time"
)

func TestWecomProfileConsentIntentServiceNewIntentHashesSecretsAndStoresLoginContext(t *testing.T) {
	now := time.Date(2026, 6, 4, 9, 30, 0, 0, time.UTC)
	service := &WecomProfileConsentIntentService{
		Now:          func() time.Time { return now },
		GenerateName: func() string { return "intent-fixed" },
		GenerateSecret: func() string {
			return "secret-fixed"
		},
	}

	intent, issued, err := service.NewIntent(&WecomProfileConsentIntentCreateRequest{
		Owner:         "built-in",
		Organization:  "built-in",
		Application:   "app-built-in",
		ProviderOwner: "admin",
		ProviderName:  "wecom-internal",
		IntentType:    WecomProfileConsentIntentTypeLogin,
		ReturnURL:     "/portal",
		ClientKey:     "browser-key",
		ClientIP:      "10.10.10.10",
		LoginContext: &WecomProfileConsentLoginContext{
			Type:            "code",
			SigninMethod:    "wecom",
			Method:          "signup",
			ClientID:        "client-web",
			ResponseType:    "code",
			RedirectURI:     "https://app.example.com/callback",
			Scope:           "openid profile",
			State:           "oauth-state",
			Nonce:           "nonce-1",
			CodeChallenge:   "pkce-challenge",
			ChallengeMethod: "S256",
			Resource:        "https://resource.example.com",
		},
	})
	if err != nil {
		t.Fatalf("NewIntent() error = %v", err)
	}

	if intent.Name != "intent-fixed" {
		t.Fatalf("intent name = %q, want intent-fixed", intent.Name)
	}
	if intent.StateNonceHash == "" || intent.StateNonceHash == issued.State {
		t.Fatalf("state hash should be stored instead of raw state: intent = %#v issued = %#v", intent, issued)
	}
	if intent.PollTokenHash == "" || intent.PollTokenHash == issued.PollToken {
		t.Fatalf("poll token hash should be stored instead of raw token: intent = %#v issued = %#v", intent, issued)
	}
	if intent.ClientKeyHash == "" || intent.ClientKeyHash == "browser-key" {
		t.Fatalf("client key should be hashed, got %#v", intent)
	}
	if intent.ClientIPHash == "" || intent.ClientIPHash == "10.10.10.10" {
		t.Fatalf("client ip should be hashed, got %#v", intent)
	}
	if !intent.MatchesState(issued.State) {
		t.Fatalf("MatchesState() = false, want true")
	}
	if !intent.MatchesPollToken(issued.PollToken) {
		t.Fatalf("MatchesPollToken() = false, want true")
	}

	loginContext, err := intent.GetLoginContext()
	if err != nil {
		t.Fatalf("GetLoginContext() error = %v", err)
	}
	if loginContext == nil || loginContext.ClientID != "client-web" || loginContext.RedirectURI != "https://app.example.com/callback" {
		t.Fatalf("login context = %#v", loginContext)
	}
}

func TestBuildWecomProfileConsentAuthURLUsesSensitiveScopeAndCallback(t *testing.T) {
	provider := &Provider{
		Type:         "WeCom",
		SubType:      "Internal",
		Method:       "Normal",
		ClientId:     "ww123",
		ClientSecret: "secret",
		AppId:        "1000002",
	}

	authURL, err := BuildWecomProfileConsentOAuth2AuthURL(provider, "https://door.example.com/api/wecom-profile-consent/callback", "state-fixed")
	if err != nil {
		t.Fatalf("BuildWecomProfileConsentOAuth2AuthURL() error = %v", err)
	}

	if !strings.Contains(authURL, "connect/oauth2/authorize") {
		t.Fatalf("authURL = %q, want oauth2 authorize endpoint", authURL)
	}
	if !strings.Contains(authURL, "scope=snsapi_privateinfo") {
		t.Fatalf("authURL = %q, want snsapi_privateinfo", authURL)
	}
	if !strings.Contains(authURL, "agentid=1000002") || !strings.Contains(authURL, "appid=ww123") {
		t.Fatalf("authURL = %q, want appid and agentid", authURL)
	}
	if !strings.Contains(authURL, "state=state-fixed") {
		t.Fatalf("authURL = %q, want state", authURL)
	}
	if !strings.HasSuffix(authURL, "#wechat_redirect") {
		t.Fatalf("authURL = %q, want wechat redirect suffix", authURL)
	}
}

func TestBuildWecomProfileConsentAuthorizeURLUsesShortAbsoluteURL(t *testing.T) {
	shortURL := BuildWecomProfileConsentAuthorizeURL("door.example.com", "intent/with slash", "state+with+plus")

	if !strings.HasPrefix(shortURL, "https://door.example.com/api/wecom-profile-consent/intents/intent%2Fwith%20slash/authorize?") {
		t.Fatalf("shortURL = %q, want absolute short authorize URL", shortURL)
	}
	if !strings.Contains(shortURL, "state=state%2Bwith%2Bplus") {
		t.Fatalf("shortURL = %q, want escaped state", shortURL)
	}
}

func TestParseWecomProfileConsentStateRoundTrip(t *testing.T) {
	rawState := BuildWecomProfileConsentState("intent-1", "nonce-1")

	intentName, nonce, err := ParseWecomProfileConsentState(rawState)
	if err != nil {
		t.Fatalf("ParseWecomProfileConsentState() error = %v", err)
	}
	if intentName != "intent-1" || nonce != "nonce-1" {
		t.Fatalf("parsed state = (%q, %q), want (intent-1, nonce-1)", intentName, nonce)
	}
}

func TestValidateWecomProfileConsentProviderRejectsUnsupportedOrIncompleteProvider(t *testing.T) {
	if err := ValidateWecomProfileConsentProvider(&Provider{
		Type:    "WeCom",
		SubType: "Third-party",
		Method:  "Normal",
	}); err == nil || !strings.Contains(err.Error(), "Internal + Normal") {
		t.Fatalf("third-party provider error = %v", err)
	}

	if err := ValidateWecomProfileConsentProvider(&Provider{
		Type:         "WeCom",
		SubType:      "Internal",
		Method:       "Normal",
		ClientId:     "ww123",
		ClientSecret: "",
		AppId:        "1000002",
	}); err == nil || !strings.Contains(err.Error(), "incomplete") {
		t.Fatalf("incomplete provider error = %v", err)
	}
}

type fakeWecomProfileConsentIntentStore struct {
	createErr error
	countErr  error

	createdIntents []*WecomProfileConsentIntent

	deleteExpiredCalled bool
	deletePendingCalled bool
	countCalled         bool

	lastDeleteExpiredClientKeyHash string
	lastDeletePendingClientKeyHash string
	lastCountClientKeyHash         string
	lastCountClientIPHash          string

	recentCount int64
}

func (s *fakeWecomProfileConsentIntentStore) CreateWecomProfileConsentIntent(intent *WecomProfileConsentIntent) error {
	if intent != nil {
		s.createdIntents = append(s.createdIntents, intent)
	}
	return s.createErr
}

func (s *fakeWecomProfileConsentIntentStore) DeleteExpiredPendingWecomProfileConsentIntents(intentType WecomProfileConsentIntentType, organization string, application string, providerName string, clientKeyHash string, now time.Time) (int64, error) {
	s.deleteExpiredCalled = true
	s.lastDeleteExpiredClientKeyHash = clientKeyHash
	return 1, nil
}

func (s *fakeWecomProfileConsentIntentStore) DeletePendingWecomProfileConsentIntents(intentType WecomProfileConsentIntentType, organization string, application string, providerName string, clientKeyHash string) (int64, error) {
	s.deletePendingCalled = true
	s.lastDeletePendingClientKeyHash = clientKeyHash
	return 1, nil
}

func (s *fakeWecomProfileConsentIntentStore) CountRecentWecomProfileConsentIntents(intentType WecomProfileConsentIntentType, organization string, application string, providerName string, clientKeyHash string, clientIPHash string, since time.Time) (int64, error) {
	s.countCalled = true
	s.lastCountClientKeyHash = clientKeyHash
	s.lastCountClientIPHash = clientIPHash
	if s.countErr != nil {
		return 0, s.countErr
	}
	return s.recentCount, nil
}

func TestWecomProfileConsentIntentIssuerCreatesIntentAndReplacesPendingIntent(t *testing.T) {
	now := time.Date(2026, 6, 4, 10, 0, 0, 0, time.UTC)
	store := &fakeWecomProfileConsentIntentStore{}
	issuer := &WecomProfileConsentIntentIssuer{
		Store: store,
		IntentService: &WecomProfileConsentIntentService{
			Now:          func() time.Time { return now },
			GenerateName: func() string { return "intent-login-1" },
			GenerateSecret: func() string {
				return "fixed-secret"
			},
		},
		Now: func() time.Time { return now },
	}

	result, err := issuer.IssueLoginIntent(&WecomProfileConsentLoginIntentIssueRequest{
		Host:          "door.example.com",
		Owner:         "built-in",
		Organization:  "built-in",
		Application:   "app-built-in",
		ProviderOwner: "admin",
		ProviderName:  "wecom-internal",
		CorpId:        "ww123",
		AgentId:       "1000002",
		ReturnURL:     "/portal",
		ClientKey:     "browser-key",
		ClientIP:      "10.10.10.10",
		LoginContext: &WecomProfileConsentLoginContext{
			Type:         "login",
			Method:       "signup",
			SigninMethod: "wecom",
		},
	}, &Provider{
		Type:         "WeCom",
		SubType:      "Internal",
		Method:       "Normal",
		ClientId:     "ww123",
		ClientSecret: "secret",
		AppId:        "1000002",
	})
	if err != nil {
		t.Fatalf("IssueLoginIntent() error = %v", err)
	}

	if !store.deleteExpiredCalled || !store.deletePendingCalled || !store.countCalled {
		t.Fatalf("store calls = expired:%v pending:%v count:%v", store.deleteExpiredCalled, store.deletePendingCalled, store.countCalled)
	}
	if store.lastDeleteExpiredClientKeyHash == "" || store.lastDeleteExpiredClientKeyHash == "browser-key" {
		t.Fatalf("deleteExpired client key hash = %q, want hashed value", store.lastDeleteExpiredClientKeyHash)
	}
	if store.lastCountClientIPHash == "" || store.lastCountClientIPHash == "10.10.10.10" {
		t.Fatalf("count client ip hash = %q, want hashed value", store.lastCountClientIPHash)
	}
	if len(store.createdIntents) != 1 {
		t.Fatalf("created intents = %d, want 1", len(store.createdIntents))
	}
	if result.Intent == nil || result.Intent.Name != "intent-login-1" {
		t.Fatalf("result intent = %#v", result.Intent)
	}
	if !strings.Contains(result.AuthURL, "redirect_uri=https%3A%2F%2Fdoor.example.com%2Fapi%2Fwecom-profile-consent%2Fcallback") {
		t.Fatalf("authURL = %q, want encoded callback redirect_uri", result.AuthURL)
	}
	if !strings.Contains(result.AuthURL, "scope=snsapi_privateinfo") {
		t.Fatalf("authURL = %q, want sensitive scope", result.AuthURL)
	}
}

func TestWecomProfileConsentIntentIssuerCreatesProfileSyncIntentWithSubject(t *testing.T) {
	now := time.Date(2026, 6, 4, 10, 10, 0, 0, time.UTC)
	store := &fakeWecomProfileConsentIntentStore{}
	issuer := &WecomProfileConsentIntentIssuer{
		Store: store,
		IntentService: &WecomProfileConsentIntentService{
			Now:          func() time.Time { return now },
			GenerateName: func() string { return "intent-profile-sync-1" },
			GenerateSecret: func() string {
				return "fixed-profile-sync-secret"
			},
		},
		Now: func() time.Time { return now },
	}

	result, err := issuer.IssueProfileSyncIntent(&WecomProfileConsentProfileSyncIntentIssueRequest{
		Host:                "door.example.com",
		Owner:               "built-in",
		Organization:        "built-in",
		Application:         "app-built-in",
		ProviderOwner:       "admin",
		ProviderName:        "wecom-internal",
		CorpId:              "ww123",
		AgentId:             "1000002",
		ClientKey:           "browser-key",
		ClientIP:            "10.10.10.10",
		SubjectOwner:        "built-in",
		SubjectName:         "alice",
		ExpectedWecomUserId: "zhangsan",
	}, &Provider{
		Type:         "WeCom",
		SubType:      "Internal",
		Method:       "Normal",
		ClientId:     "ww123",
		ClientSecret: "secret",
		AppId:        "1000002",
	})
	if err != nil {
		t.Fatalf("IssueProfileSyncIntent() error = %v", err)
	}

	if len(store.createdIntents) != 1 {
		t.Fatalf("created intents = %d, want 1", len(store.createdIntents))
	}
	intent := store.createdIntents[0]
	if intent.IntentType != WecomProfileConsentIntentTypeProfileSync {
		t.Fatalf("intent type = %q, want profile_sync", intent.IntentType)
	}
	if intent.SubjectOwner != "built-in" || intent.SubjectName != "alice" || intent.ExpectedWecomUserId != "zhangsan" {
		t.Fatalf("intent subject = %#v", intent)
	}
	if result.Intent == nil || result.Intent.Name != "intent-profile-sync-1" || result.Secrets.PollToken == "" {
		t.Fatalf("result = %#v", result)
	}
	if !strings.Contains(result.AuthURL, "scope=snsapi_privateinfo") {
		t.Fatalf("authURL = %q, want sensitive scope", result.AuthURL)
	}
}

func TestWecomProfileConsentIntentIssuerRejectsFrequentCreates(t *testing.T) {
	now := time.Date(2026, 6, 4, 10, 5, 0, 0, time.UTC)
	store := &fakeWecomProfileConsentIntentStore{recentCount: 5}
	issuer := &WecomProfileConsentIntentIssuer{
		Store: store,
		Now:   func() time.Time { return now },
	}

	_, err := issuer.IssueLoginIntent(&WecomProfileConsentLoginIntentIssueRequest{
		Host:         "door.example.com",
		Organization: "built-in",
		Application:  "app-built-in",
		ProviderName: "wecom-internal",
		ClientKey:    "browser-key",
		ClientIP:     "10.10.10.10",
	}, &Provider{
		Type:         "WeCom",
		SubType:      "Internal",
		Method:       "Normal",
		ClientId:     "ww123",
		ClientSecret: "secret",
		AppId:        "1000002",
	})
	if err == nil || !strings.Contains(err.Error(), "too frequent") {
		t.Fatalf("IssueLoginIntent() error = %v, want too frequent", err)
	}
	if len(store.createdIntents) != 0 {
		t.Fatalf("created intents = %d, want 0", len(store.createdIntents))
	}
}

func TestWecomProfileConsentIntentSchemaUsesStableClientIPHashColumn(t *testing.T) {
	setupWecomProfileConsentIntentTestDB(t)

	rows, err := ormer.Engine.QueryString("PRAGMA table_info(wecom_profile_consent_intent)")
	if err != nil {
		t.Fatalf("query intent table schema error = %v", err)
	}

	columns := map[string]bool{}
	for _, row := range rows {
		columns[row["name"]] = true
	}
	if !columns["client_ip_hash"] {
		t.Fatalf("client_ip_hash column is missing, columns = %v", columns)
	}
	if columns["client_i_p_hash"] {
		t.Fatalf("unexpected Xorm acronym-split column client_i_p_hash, columns = %v", columns)
	}
}

func TestGetWecomProfileConsentIntentByNameReturnsStoredIntent(t *testing.T) {
	setupWecomProfileConsentIntentTestDB(t)
	now := time.Date(2026, 6, 4, 11, 0, 0, 0, time.UTC)
	intent := &WecomProfileConsentIntent{
		Owner:        "built-in",
		Name:         "intent-state-query",
		CreatedAt:    now,
		UpdatedAt:    now,
		ExpiresAt:    now.Add(time.Minute),
		IntentType:   WecomProfileConsentIntentTypeLogin,
		Status:       WecomProfileConsentIntentStatusPending,
		Organization: "built-in",
		Application:  "app-built-in",
		ProviderName: "wecom-internal",
	}
	if _, err := ormer.Engine.Insert(intent); err != nil {
		t.Fatalf("insert intent error = %v", err)
	}

	stored, err := GetWecomProfileConsentIntentByName("intent-state-query")
	if err != nil {
		t.Fatalf("GetWecomProfileConsentIntentByName() error = %v", err)
	}
	if stored == nil || stored.Owner != "built-in" || stored.Status != WecomProfileConsentIntentStatusPending {
		t.Fatalf("stored intent = %#v", stored)
	}
}

func TestExpireWecomProfileConsentIntentIfNeededOnlyUpdatesExpiredActiveIntent(t *testing.T) {
	setupWecomProfileConsentIntentTestDB(t)
	now := time.Date(2026, 6, 4, 11, 10, 0, 0, time.UTC)
	insertWecomProfileConsentIntentForTest(t, &WecomProfileConsentIntent{
		Owner:      "built-in",
		Name:       "intent-state-active",
		ExpiresAt:  now.Add(time.Minute),
		IntentType: WecomProfileConsentIntentTypeLogin,
		Status:     WecomProfileConsentIntentStatusPending,
	})
	insertWecomProfileConsentIntentForTest(t, &WecomProfileConsentIntent{
		Owner:      "built-in",
		Name:       "intent-state-expired",
		ExpiresAt:  now.Add(-time.Second),
		IntentType: WecomProfileConsentIntentTypeLogin,
		Status:     WecomProfileConsentIntentStatusAuthorized,
	})
	insertWecomProfileConsentIntentForTest(t, &WecomProfileConsentIntent{
		Owner:      "built-in",
		Name:       "intent-state-completed",
		ExpiresAt:  now.Add(-time.Second),
		IntentType: WecomProfileConsentIntentTypeLogin,
		Status:     WecomProfileConsentIntentStatusCompleted,
	})

	active, changed, err := ExpireWecomProfileConsentIntentIfNeeded("intent-state-active", now)
	if err != nil {
		t.Fatalf("Expire active intent error = %v", err)
	}
	if changed {
		t.Fatalf("active intent changed = true, want false")
	}
	if active == nil || active.Status != WecomProfileConsentIntentStatusPending {
		t.Fatalf("active intent = %#v", active)
	}

	expired, changed, err := ExpireWecomProfileConsentIntentIfNeeded("intent-state-expired", now)
	if err != nil {
		t.Fatalf("Expire expired intent error = %v", err)
	}
	if !changed {
		t.Fatalf("expired intent changed = false, want true")
	}
	if expired == nil || expired.Status != WecomProfileConsentIntentStatusExpired || expired.ErrorCode != "intent_expired" {
		t.Fatalf("expired intent = %#v", expired)
	}

	completed, changed, err := ExpireWecomProfileConsentIntentIfNeeded("intent-state-completed", now)
	if err != nil {
		t.Fatalf("Expire completed intent error = %v", err)
	}
	if changed {
		t.Fatalf("completed intent changed = true, want false")
	}
	if completed == nil || completed.Status != WecomProfileConsentIntentStatusCompleted {
		t.Fatalf("completed intent = %#v", completed)
	}
}

func setupWecomProfileConsentIntentTestDB(t *testing.T) {
	t.Helper()

	oldOrmer := ormer
	engine := newSQLiteTestEngine(t, new(WecomProfileConsentIntent))
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		ormer = oldOrmer
	})
}

func insertWecomProfileConsentIntentForTest(t *testing.T, intent *WecomProfileConsentIntent) {
	t.Helper()

	now := time.Date(2026, 6, 4, 11, 0, 0, 0, time.UTC)
	if intent.CreatedAt.IsZero() {
		intent.CreatedAt = now
	}
	if intent.UpdatedAt.IsZero() {
		intent.UpdatedAt = now
	}
	if intent.Owner == "" {
		intent.Owner = "built-in"
	}
	if intent.IntentType == "" {
		intent.IntentType = WecomProfileConsentIntentTypeLogin
	}
	if _, err := ormer.Engine.Insert(intent); err != nil {
		t.Fatalf("insert intent %q error = %v", intent.Name, err)
	}
}
