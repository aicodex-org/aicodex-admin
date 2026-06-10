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
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/xorm-io/core"
	"github.com/xorm-io/xorm"
)

const (
	WecomProfileConsentCallbackPath              = "/api/wecom-profile-consent/callback"
	WecomProfileConsentClientCookieName          = "wecom_profile_consent_client"
	WecomProfileConsentCreateRateLimitDefaultMax = 5
)

const WecomProfileConsentCreateRateLimitDefaultWindow = time.Minute

// WecomProfileConsentIntentStore 封装授权意图的持久化和创建前防滥用策略。
type WecomProfileConsentIntentStore interface {
	CreateWecomProfileConsentIntent(intent *WecomProfileConsentIntent) error
	DeleteExpiredPendingWecomProfileConsentIntents(intentType WecomProfileConsentIntentType, organization string, application string, providerName string, clientKeyHash string, now time.Time) (int64, error)
	DeletePendingWecomProfileConsentIntents(intentType WecomProfileConsentIntentType, organization string, application string, providerName string, clientKeyHash string) (int64, error)
	CountRecentWecomProfileConsentIntents(intentType WecomProfileConsentIntentType, organization string, application string, providerName string, clientKeyHash string, clientIPHash string, since time.Time) (int64, error)
}

type defaultWecomProfileConsentIntentStore struct{}

type WecomProfileConsentLoginIntentIssueRequest struct {
	Host          string
	Owner         string
	Organization  string
	Application   string
	ProviderOwner string
	ProviderName  string
	CorpId        string
	AgentId       string
	ReturnURL     string
	ClientKey     string
	ClientIP      string
	LoginContext  *WecomProfileConsentLoginContext
}

type WecomProfileConsentProfileSyncIntentIssueRequest struct {
	Host                string
	Owner               string
	Organization        string
	Application         string
	ProviderOwner       string
	ProviderName        string
	CorpId              string
	AgentId             string
	ClientKey           string
	ClientIP            string
	SubjectOwner        string
	SubjectName         string
	ExpectedWecomUserId string
}

type WecomProfileConsentLoginIntentIssueResult struct {
	Intent  *WecomProfileConsentIntent
	Secrets *WecomProfileConsentIssuedSecrets
	AuthURL string
}

// WecomProfileConsentIntentIssuer 负责登录意图创建前的限流、替换和授权 URL 签发。
type WecomProfileConsentIntentIssuer struct {
	Store                 WecomProfileConsentIntentStore
	IntentService         *WecomProfileConsentIntentService
	Now                   func() time.Time
	CreateRateLimitWindow time.Duration
	CreateRateLimitMax    int
}

func GetWecomProfileConsentIntent(owner string, name string) (*WecomProfileConsentIntent, error) {
	owner = strings.TrimSpace(owner)
	name = strings.TrimSpace(name)
	if owner == "" || name == "" {
		return nil, nil
	}

	intent := &WecomProfileConsentIntent{Owner: owner, Name: name}
	existed, err := ormer.Engine.Get(intent)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return intent, nil
}

func UpdateWecomProfileConsentIntent(intent *WecomProfileConsentIntent) error {
	if intent == nil {
		return nil
	}
	_, err := ormer.Engine.ID(core.PK{intent.Owner, intent.Name}).AllCols().Update(intent)
	return err
}

func BuildWecomProfileConsentCallbackURL(host string) string {
	_, originBackend := getOriginFromHost(strings.TrimSpace(host))
	return strings.TrimRight(originBackend, "/") + WecomProfileConsentCallbackPath
}

// BuildWecomProfileConsentAuthorizeURL 构造写入桌面二维码的本地短授权链接。
// 短授权入口会先校验登录意图和 state，再跳转到完整企业微信 OAuth2 授权 URL。
func BuildWecomProfileConsentAuthorizeURL(host string, intentName string, state string) string {
	_, originBackend := getOriginFromHost(strings.TrimSpace(host))
	path := "/api/wecom-profile-consent/intents/" + url.PathEscape(strings.TrimSpace(intentName)) + "/authorize"
	query := url.Values{}
	query.Set("state", strings.TrimSpace(state))
	return strings.TrimRight(originBackend, "/") + path + "?" + query.Encode()
}

func (s *WecomProfileConsentIntentIssuer) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s *WecomProfileConsentIntentIssuer) intentService() *WecomProfileConsentIntentService {
	if s != nil && s.IntentService != nil {
		return s.IntentService
	}
	return &WecomProfileConsentIntentService{}
}

func (s *WecomProfileConsentIntentIssuer) store() WecomProfileConsentIntentStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultWecomProfileConsentIntentStore{}
}

func (s *WecomProfileConsentIntentIssuer) createRateLimitWindow() time.Duration {
	if s != nil && s.CreateRateLimitWindow > 0 {
		return s.CreateRateLimitWindow
	}
	return WecomProfileConsentCreateRateLimitDefaultWindow
}

func (s *WecomProfileConsentIntentIssuer) createRateLimitMax() int {
	if s != nil && s.CreateRateLimitMax > 0 {
		return s.CreateRateLimitMax
	}
	return WecomProfileConsentCreateRateLimitDefaultMax
}

func (s *WecomProfileConsentIntentIssuer) IssueLoginIntent(request *WecomProfileConsentLoginIntentIssueRequest, provider *Provider) (*WecomProfileConsentLoginIntentIssueResult, error) {
	if request == nil {
		return nil, fmt.Errorf("wecom profile consent request is required")
	}
	if provider == nil {
		return nil, fmt.Errorf("wecom profile consent provider is required")
	}

	organization := strings.TrimSpace(request.Organization)
	application := strings.TrimSpace(request.Application)
	providerName := strings.TrimSpace(request.ProviderName)
	if application == "" {
		return nil, fmt.Errorf("wecom profile consent application is required")
	}
	if providerName == "" {
		return nil, fmt.Errorf("wecom profile consent provider is required")
	}

	now := s.now()
	store := s.store()
	clientKeyHash := hashIfNotEmpty(request.ClientKey)
	clientIPHash := hashIfNotEmpty(request.ClientIP)
	intentType := WecomProfileConsentIntentTypeLogin

	if clientKeyHash != "" {
		if _, err := store.DeleteExpiredPendingWecomProfileConsentIntents(intentType, organization, application, providerName, clientKeyHash, now); err != nil {
			return nil, err
		}
	}

	count, err := store.CountRecentWecomProfileConsentIntents(intentType, organization, application, providerName, clientKeyHash, clientIPHash, now.Add(-s.createRateLimitWindow()))
	if err != nil {
		return nil, err
	}
	if count >= int64(s.createRateLimitMax()) {
		return nil, fmt.Errorf("wecom profile consent login intent creation is too frequent")
	}

	if clientKeyHash != "" {
		if _, err := store.DeletePendingWecomProfileConsentIntents(intentType, organization, application, providerName, clientKeyHash); err != nil {
			return nil, err
		}
	}

	intent, issuedSecrets, err := s.intentService().NewIntent(&WecomProfileConsentIntentCreateRequest{
		Owner:         strings.TrimSpace(request.Owner),
		Organization:  organization,
		Application:   application,
		ProviderOwner: strings.TrimSpace(request.ProviderOwner),
		ProviderName:  providerName,
		CorpId:        strings.TrimSpace(request.CorpId),
		AgentId:       strings.TrimSpace(request.AgentId),
		IntentType:    intentType,
		ReturnURL:     request.ReturnURL,
		ClientKey:     request.ClientKey,
		ClientIP:      request.ClientIP,
		LoginContext:  request.LoginContext,
	})
	if err != nil {
		return nil, err
	}

	authURL, err := BuildWecomProfileConsentOAuth2AuthURL(provider, BuildWecomProfileConsentCallbackURL(request.Host), issuedSecrets.State)
	if err != nil {
		return nil, err
	}
	if err := store.CreateWecomProfileConsentIntent(intent); err != nil {
		return nil, err
	}

	return &WecomProfileConsentLoginIntentIssueResult{
		Intent:  intent,
		Secrets: issuedSecrets,
		AuthURL: authURL,
	}, nil
}

func (s *WecomProfileConsentIntentIssuer) IssueProfileSyncIntent(request *WecomProfileConsentProfileSyncIntentIssueRequest, provider *Provider) (*WecomProfileConsentLoginIntentIssueResult, error) {
	if request == nil {
		return nil, fmt.Errorf("wecom profile consent request is required")
	}
	if provider == nil {
		return nil, fmt.Errorf("wecom profile consent provider is required")
	}

	organization := strings.TrimSpace(request.Organization)
	application := strings.TrimSpace(request.Application)
	providerName := strings.TrimSpace(request.ProviderName)
	subjectOwner := strings.TrimSpace(request.SubjectOwner)
	subjectName := strings.TrimSpace(request.SubjectName)
	expectedWecomUserId := strings.TrimSpace(request.ExpectedWecomUserId)
	if application == "" {
		return nil, fmt.Errorf("wecom profile consent application is required")
	}
	if providerName == "" {
		return nil, fmt.Errorf("wecom profile consent provider is required")
	}
	if subjectOwner == "" || subjectName == "" {
		return nil, fmt.Errorf("wecom profile consent profile sync subject is required")
	}
	if expectedWecomUserId == "" {
		return nil, fmt.Errorf("wecom profile consent profile sync WeCom user is required")
	}

	now := s.now()
	store := s.store()
	clientKeyHash := hashIfNotEmpty(request.ClientKey)
	clientIPHash := hashIfNotEmpty(request.ClientIP)
	intentType := WecomProfileConsentIntentTypeProfileSync

	if clientKeyHash != "" {
		if _, err := store.DeleteExpiredPendingWecomProfileConsentIntents(intentType, organization, application, providerName, clientKeyHash, now); err != nil {
			return nil, err
		}
	}

	count, err := store.CountRecentWecomProfileConsentIntents(intentType, organization, application, providerName, clientKeyHash, clientIPHash, now.Add(-s.createRateLimitWindow()))
	if err != nil {
		return nil, err
	}
	if count >= int64(s.createRateLimitMax()) {
		return nil, fmt.Errorf("wecom profile consent profile sync intent creation is too frequent")
	}

	if clientKeyHash != "" {
		if _, err := store.DeletePendingWecomProfileConsentIntents(intentType, organization, application, providerName, clientKeyHash); err != nil {
			return nil, err
		}
	}

	intent, issuedSecrets, err := s.intentService().NewIntent(&WecomProfileConsentIntentCreateRequest{
		Owner:               strings.TrimSpace(request.Owner),
		Organization:        organization,
		Application:         application,
		ProviderOwner:       strings.TrimSpace(request.ProviderOwner),
		ProviderName:        providerName,
		CorpId:              strings.TrimSpace(request.CorpId),
		AgentId:             strings.TrimSpace(request.AgentId),
		IntentType:          intentType,
		ClientKey:           request.ClientKey,
		ClientIP:            request.ClientIP,
		SubjectOwner:        subjectOwner,
		SubjectName:         subjectName,
		ExpectedWecomUserId: expectedWecomUserId,
	})
	if err != nil {
		return nil, err
	}

	authURL, err := BuildWecomProfileConsentOAuth2AuthURL(provider, BuildWecomProfileConsentCallbackURL(request.Host), issuedSecrets.State)
	if err != nil {
		return nil, err
	}
	if err := store.CreateWecomProfileConsentIntent(intent); err != nil {
		return nil, err
	}

	return &WecomProfileConsentLoginIntentIssueResult{
		Intent:  intent,
		Secrets: issuedSecrets,
		AuthURL: authURL,
	}, nil
}

func (s defaultWecomProfileConsentIntentStore) CreateWecomProfileConsentIntent(intent *WecomProfileConsentIntent) error {
	if intent == nil {
		return nil
	}
	_, err := ormer.Engine.Insert(intent)
	return err
}

func (s defaultWecomProfileConsentIntentStore) DeleteExpiredPendingWecomProfileConsentIntents(intentType WecomProfileConsentIntentType, organization string, application string, providerName string, clientKeyHash string, now time.Time) (int64, error) {
	session := getWecomProfileConsentPendingIntentSession(intentType, organization, application, providerName)
	session = session.And("expires_at <= ?", now.UTC())
	if clientKeyHash != "" {
		session = session.And("client_key_hash = ?", clientKeyHash)
	}
	return session.Delete(&WecomProfileConsentIntent{})
}

func (s defaultWecomProfileConsentIntentStore) DeletePendingWecomProfileConsentIntents(intentType WecomProfileConsentIntentType, organization string, application string, providerName string, clientKeyHash string) (int64, error) {
	if strings.TrimSpace(clientKeyHash) == "" {
		return 0, nil
	}

	session := getWecomProfileConsentPendingIntentSession(intentType, organization, application, providerName).
		And("client_key_hash = ?", clientKeyHash)
	return session.Delete(&WecomProfileConsentIntent{})
}

func (s defaultWecomProfileConsentIntentStore) CountRecentWecomProfileConsentIntents(intentType WecomProfileConsentIntentType, organization string, application string, providerName string, clientKeyHash string, clientIPHash string, since time.Time) (int64, error) {
	session := ormer.Engine.Where("intent_type = ?", intentType)
	if organization != "" {
		session = session.And("organization = ?", organization)
	}
	if application != "" {
		session = session.And("application = ?", application)
	}
	if providerName != "" {
		session = session.And("provider_name = ?", providerName)
	}
	session = session.And("created_at >= ?", since.UTC())

	clientKeyHash = strings.TrimSpace(clientKeyHash)
	clientIPHash = strings.TrimSpace(clientIPHash)
	switch {
	case clientKeyHash != "" && clientIPHash != "":
		session = session.And("(client_key_hash = ? or client_ip_hash = ?)", clientKeyHash, clientIPHash)
	case clientKeyHash != "":
		session = session.And("client_key_hash = ?", clientKeyHash)
	case clientIPHash != "":
		session = session.And("client_ip_hash = ?", clientIPHash)
	}

	return session.Count(&WecomProfileConsentIntent{})
}

func getWecomProfileConsentPendingIntentSession(intentType WecomProfileConsentIntentType, organization string, application string, providerName string) *xorm.Session {
	session := ormer.Engine.Where("intent_type = ?", intentType).
		And("status = ?", WecomProfileConsentIntentStatusPending)
	if organization != "" {
		session = session.And("organization = ?", organization)
	}
	if application != "" {
		session = session.And("application = ?", application)
	}
	if providerName != "" {
		session = session.And("provider_name = ?", providerName)
	}
	return session
}
