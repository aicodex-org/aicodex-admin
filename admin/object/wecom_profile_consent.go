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
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/form"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
)

type WecomProfileConsentIntentType string

const (
	WecomProfileConsentIntentTypeLogin       WecomProfileConsentIntentType = "login"
	WecomProfileConsentIntentTypeProfileSync WecomProfileConsentIntentType = "profile_sync"
)

type WecomProfileConsentIntentStatus string

const (
	WecomProfileConsentIntentStatusPending    WecomProfileConsentIntentStatus = "pending"
	WecomProfileConsentIntentStatusAuthorized WecomProfileConsentIntentStatus = "authorized"
	WecomProfileConsentIntentStatusMfaPending WecomProfileConsentIntentStatus = "mfa_pending"
	WecomProfileConsentIntentStatusCompleted  WecomProfileConsentIntentStatus = "completed"
	WecomProfileConsentIntentStatusExpired    WecomProfileConsentIntentStatus = "expired"
	WecomProfileConsentIntentStatusFailed     WecomProfileConsentIntentStatus = "failed"
)

const WecomProfileConsentIntentDefaultTTL = 5 * time.Minute

// WecomProfileConsentLoginContext 保存企业微信扫码前的本地登录上下文，用于在 complete 阶段恢复既有响应语义。
type WecomProfileConsentLoginContext struct {
	Type            string `json:"type,omitempty"`
	Method          string `json:"method,omitempty"`
	SigninMethod    string `json:"signinMethod,omitempty"`
	ClientID        string `json:"clientId,omitempty"`
	Organization    string `json:"organization,omitempty"`
	ResponseType    string `json:"responseType,omitempty"`
	RedirectURI     string `json:"redirectUri,omitempty"`
	Scope           string `json:"scope,omitempty"`
	State           string `json:"state,omitempty"`
	Nonce           string `json:"nonce,omitempty"`
	CodeChallenge   string `json:"codeChallenge,omitempty"`
	ChallengeMethod string `json:"challengeMethod,omitempty"`
	Resource        string `json:"resource,omitempty"`
	Service         string `json:"service,omitempty"`
	Language        string `json:"language,omitempty"`
}

// ToAuthForm 把登录上下文恢复为 complete 阶段可复用的 AuthForm 基础结构。
func (c *WecomProfileConsentLoginContext) ToAuthForm(intent *WecomProfileConsentIntent) *form.AuthForm {
	if c == nil {
		return &form.AuthForm{}
	}

	authForm := &form.AuthForm{
		Type:         strings.TrimSpace(c.Type),
		SigninMethod: strings.TrimSpace(c.SigninMethod),
		Organization: firstNonEmpty(intent.Organization, intent.Owner),
		Application:  strings.TrimSpace(intent.Application),
		Provider:     strings.TrimSpace(intent.ProviderName),
		ClientId:     strings.TrimSpace(c.ClientID),
		State:        strings.TrimSpace(c.State),
		RedirectUri:  strings.TrimSpace(c.RedirectURI),
		Method:       strings.TrimSpace(c.Method),
		Language:     strings.TrimSpace(c.Language),
	}

	if authForm.Type == "" {
		authForm.Type = "login"
	}
	if authForm.SigninMethod == "" {
		authForm.SigninMethod = "wecom"
	}
	if authForm.Method == "" {
		authForm.Method = "signup"
	}
	return authForm
}

// WecomProfileConsentIntent 保存 PC 页面和手机企业微信 OAuth2 回调之间的一次性授权桥。
type WecomProfileConsentIntent struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk unique" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created index" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	ExpiresAt   time.Time `xorm:"timestampz index" json:"expiresAt"`
	CompletedAt time.Time `xorm:"timestampz" json:"completedAt"`

	IntentType WecomProfileConsentIntentType   `xorm:"varchar(50) index" json:"intentType"`
	Status     WecomProfileConsentIntentStatus `xorm:"varchar(50) index" json:"status"`

	Organization string `xorm:"varchar(100) index" json:"organization"`
	Application  string `xorm:"varchar(100) index" json:"application"`

	ProviderOwner string `xorm:"varchar(100) index" json:"providerOwner"`
	ProviderName  string `xorm:"varchar(100) index" json:"providerName"`
	CorpId        string `xorm:"varchar(100) index" json:"corpId"`
	AgentId       string `xorm:"varchar(100) index" json:"agentId"`

	LoginContextJSON string `xorm:"text" json:"-"`

	StateNonceHash string `xorm:"varchar(100) index" json:"-"`
	PollTokenHash  string `xorm:"varchar(100) index" json:"-"`
	ClientKeyHash  string `xorm:"varchar(100) index" json:"-"`
	ClientIPHash   string `xorm:"'client_ip_hash' varchar(100) index" json:"-"`

	FailedAttemptCount int `xorm:"int" json:"failedAttemptCount"`

	SubjectOwner        string `xorm:"varchar(100) index" json:"subjectOwner"`
	SubjectName         string `xorm:"varchar(255) index" json:"subjectName"`
	ExpectedWecomUserId string `xorm:"varchar(255) index" json:"expectedWecomUserId"`
	ResolvedUserOwner   string `xorm:"varchar(100) index" json:"resolvedUserOwner"`
	ResolvedUserName    string `xorm:"varchar(255) index" json:"resolvedUserName"`
	WecomUserId         string `xorm:"varchar(255) index" json:"wecomUserId"`
	ReturnURL           string `xorm:"varchar(1000)" json:"returnUrl"`
	ErrorCode           string `xorm:"varchar(100)" json:"errorCode"`
	ErrorText           string `xorm:"text" json:"errorText"`
}

type WecomProfileConsentIntentCreateRequest struct {
	Owner               string
	Organization        string
	Application         string
	ProviderOwner       string
	ProviderName        string
	CorpId              string
	AgentId             string
	IntentType          WecomProfileConsentIntentType
	ReturnURL           string
	ClientKey           string
	ClientIP            string
	SubjectOwner        string
	SubjectName         string
	ExpectedWecomUserId string
	LoginContext        *WecomProfileConsentLoginContext
}

type WecomProfileConsentIssuedSecrets struct {
	State     string `json:"state"`
	PollToken string `json:"pollToken"`
}

type WecomProfileConsentIntentService struct {
	Now            func() time.Time
	GenerateName   func() string
	GenerateSecret func() string
	IntentTTL      time.Duration
}

func (s *WecomProfileConsentIntentService) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s *WecomProfileConsentIntentService) generateName() string {
	if s != nil && s.GenerateName != nil {
		return strings.TrimSpace(s.GenerateName())
	}
	return util.GenerateId()
}

func (s *WecomProfileConsentIntentService) generateSecret() string {
	if s != nil && s.GenerateSecret != nil {
		return strings.TrimSpace(s.GenerateSecret())
	}
	return util.GenerateId()
}

func (s *WecomProfileConsentIntentService) intentTTL() time.Duration {
	if s != nil && s.IntentTTL > 0 {
		return s.IntentTTL
	}
	return WecomProfileConsentIntentDefaultTTL
}

func (s *WecomProfileConsentIntentService) NewIntent(request *WecomProfileConsentIntentCreateRequest) (*WecomProfileConsentIntent, *WecomProfileConsentIssuedSecrets, error) {
	if request == nil {
		return nil, nil, fmt.Errorf("wecom profile consent request is required")
	}

	intentName := strings.TrimSpace(s.generateName())
	nonce := strings.TrimSpace(s.generateSecret())
	pollToken := strings.TrimSpace(s.generateSecret())
	if intentName == "" || nonce == "" || pollToken == "" {
		return nil, nil, fmt.Errorf("wecom profile consent generated secret is empty")
	}

	intentType := request.IntentType
	if intentType == "" {
		intentType = WecomProfileConsentIntentTypeLogin
	}
	if intentType != WecomProfileConsentIntentTypeLogin && intentType != WecomProfileConsentIntentTypeProfileSync {
		return nil, nil, fmt.Errorf("wecom profile consent intent_type: %s is not supported", intentType)
	}

	now := s.now()
	intent := &WecomProfileConsentIntent{
		Owner:               strings.TrimSpace(request.Owner),
		Name:                intentName,
		ExpiresAt:           now.Add(s.intentTTL()),
		IntentType:          intentType,
		Status:              WecomProfileConsentIntentStatusPending,
		Organization:        strings.TrimSpace(request.Organization),
		Application:         strings.TrimSpace(request.Application),
		ProviderOwner:       strings.TrimSpace(request.ProviderOwner),
		ProviderName:        strings.TrimSpace(request.ProviderName),
		CorpId:              strings.TrimSpace(request.CorpId),
		AgentId:             strings.TrimSpace(request.AgentId),
		StateNonceHash:      sha256Hex(nonce),
		PollTokenHash:       sha256Hex(pollToken),
		ClientKeyHash:       hashIfNotEmpty(request.ClientKey),
		ClientIPHash:        hashIfNotEmpty(request.ClientIP),
		SubjectOwner:        strings.TrimSpace(request.SubjectOwner),
		SubjectName:         strings.TrimSpace(request.SubjectName),
		ExpectedWecomUserId: strings.TrimSpace(request.ExpectedWecomUserId),
		ReturnURL:           normalizeWecomProfileConsentReturnURL(request.ReturnURL),
	}

	if intent.Owner == "" {
		intent.Owner = firstNonEmpty(intent.Organization, "built-in")
	}
	if err := intent.SetLoginContext(request.LoginContext); err != nil {
		return nil, nil, err
	}

	return intent, &WecomProfileConsentIssuedSecrets{
		State:     BuildWecomProfileConsentState(intentName, nonce),
		PollToken: pollToken,
	}, nil
}

func (intent *WecomProfileConsentIntent) SetLoginContext(loginContext *WecomProfileConsentLoginContext) error {
	if intent == nil {
		return nil
	}
	if loginContext == nil {
		intent.LoginContextJSON = ""
		return nil
	}

	payload, err := json.Marshal(loginContext)
	if err != nil {
		return err
	}
	intent.LoginContextJSON = string(payload)
	return nil
}

func (intent *WecomProfileConsentIntent) GetLoginContext() (*WecomProfileConsentLoginContext, error) {
	if intent == nil || strings.TrimSpace(intent.LoginContextJSON) == "" {
		return nil, nil
	}

	loginContext := &WecomProfileConsentLoginContext{}
	if err := json.Unmarshal([]byte(intent.LoginContextJSON), loginContext); err != nil {
		return nil, err
	}
	return loginContext, nil
}

func (intent *WecomProfileConsentIntent) MatchesState(rawState string) bool {
	if intent == nil || strings.TrimSpace(intent.StateNonceHash) == "" {
		return false
	}

	intentName, nonce, err := ParseWecomProfileConsentState(rawState)
	if err != nil {
		return false
	}
	return intentName == intent.Name && sha256Hex(nonce) == intent.StateNonceHash
}

func (intent *WecomProfileConsentIntent) MatchesPollToken(pollToken string) bool {
	if intent == nil || strings.TrimSpace(intent.PollTokenHash) == "" {
		return false
	}
	return sha256Hex(strings.TrimSpace(pollToken)) == intent.PollTokenHash
}

func (intent *WecomProfileConsentIntent) IsExpired(now time.Time) bool {
	if intent == nil || intent.ExpiresAt.IsZero() {
		return false
	}
	return !intent.ExpiresAt.After(now.UTC())
}

func BuildWecomProfileConsentState(intentName string, nonce string) string {
	payload := fmt.Sprintf("%s.%s", strings.TrimSpace(intentName), strings.TrimSpace(nonce))
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte(payload))
}

func ParseWecomProfileConsentState(rawState string) (string, string, error) {
	decoded, err := base64.URLEncoding.WithPadding(base64.NoPadding).DecodeString(strings.TrimSpace(rawState))
	if err != nil {
		return "", "", err
	}

	intentName, nonce, ok := strings.Cut(string(decoded), ".")
	if !ok || strings.TrimSpace(intentName) == "" || strings.TrimSpace(nonce) == "" {
		return "", "", fmt.Errorf("wecom profile consent state is invalid")
	}
	return intentName, nonce, nil
}

func ValidateWecomProfileConsentProvider(provider *Provider) error {
	if provider == nil {
		return fmt.Errorf("wecom profile consent provider is required")
	}
	if provider.Type != "WeCom" || provider.SubType != "Internal" || provider.Method != "Normal" {
		return fmt.Errorf("wecom profile consent currently supports Internal + Normal mode only")
	}
	if strings.TrimSpace(provider.ClientId) == "" || strings.TrimSpace(provider.ClientSecret) == "" || strings.TrimSpace(provider.AppId) == "" {
		return fmt.Errorf("wecom profile consent provider configuration is incomplete")
	}
	return nil
}

func BuildWecomProfileConsentOAuth2AuthURL(provider *Provider, callbackURL string, state string) (string, error) {
	if err := ValidateWecomProfileConsentProvider(provider); err != nil {
		return "", err
	}
	callbackURL = strings.TrimSpace(callbackURL)
	if callbackURL == "" {
		return "", fmt.Errorf("wecom profile consent callback url is required")
	}

	query := url.Values{}
	query.Set("appid", provider.ClientId)
	query.Set("redirect_uri", callbackURL)
	query.Set("response_type", "code")
	query.Set("scope", "snsapi_privateinfo")
	query.Set("state", strings.TrimSpace(state))
	query.Set("agentid", provider.AppId)
	return "https://open.weixin.qq.com/connect/oauth2/authorize?" + query.Encode() + "#wechat_redirect", nil
}

func ValidateWecomProfileConsentLoginContext(application *Application, loginContext *WecomProfileConsentLoginContext, lang string) error {
	if loginContext == nil {
		return nil
	}

	contextType := strings.TrimSpace(loginContext.Type)
	switch contextType {
	case "", "login":
		return nil
	case "code", "token", "id_token":
		responseType := firstNonEmpty(strings.TrimSpace(loginContext.ResponseType), contextType)
		msg := ValidateOAuthClientRequestForApplication(
			application,
			strings.TrimSpace(loginContext.ClientID),
			responseType,
			strings.TrimSpace(loginContext.RedirectURI),
			strings.TrimSpace(loginContext.Scope),
			strings.TrimSpace(loginContext.State),
			lang,
		)
		if msg != "" {
			return errors.New(msg)
		}
		if err := ResolveApplicationLoginOrganization(application, strings.TrimSpace(loginContext.Organization)); err != nil {
			return err
		}
		return nil
	case "cas":
		if application == nil {
			return fmt.Errorf("wecom profile consent application is required")
		}
		if strings.TrimSpace(loginContext.Service) == "" {
			return fmt.Errorf("wecom profile consent cas service is required")
		}
		if len(application.RedirectUris) > 0 && !application.IsRedirectUriValid(loginContext.Service) {
			return fmt.Errorf("wecom profile consent cas service redirect uri is invalid")
		}
		return nil
	default:
		return fmt.Errorf("wecom profile consent login context type: %s is not supported", contextType)
	}
}

func ValidateWecomProfileConsentReturnURL(application *Application, returnURL string) error {
	returnURL = strings.TrimSpace(returnURL)
	if returnURL == "" {
		return nil
	}
	if strings.HasPrefix(returnURL, "/") && !strings.HasPrefix(returnURL, "//") {
		return nil
	}
	if application != nil && application.IsRedirectUriValid(returnURL) {
		return nil
	}
	return fmt.Errorf("wecom profile consent return_url is invalid")
}

func normalizeWecomProfileConsentReturnURL(returnURL string) string {
	returnURL = strings.TrimSpace(returnURL)
	if returnURL == "" {
		return "/"
	}
	return returnURL
}

func hashIfNotEmpty(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	return sha256Hex(value)
}
