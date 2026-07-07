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
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/form"
	"git.leagsoft.com/aicodex/aicodex-admin/idp"
	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
)

const (
	wecomProfileConsentPollTokenHeader                  = "X-WeCom-Profile-Consent-Poll-Token"
	wecomProfileConsentEmailPermissionRequiredCode      = "wecom_profile_email_permission_required"
	wecomProfileConsentEmailPermissionRequiredErrorText = "企业微信未返回邮箱。请在企业微信「个人敏感信息管理」中允许邮箱权限后，重新扫码登录。"
)

var errWecomProfileConsentEmailPermissionRequired = errors.New(wecomProfileConsentEmailPermissionRequiredCode)

type wecomProfileConsentLoginIntentIssuer interface {
	IssueLoginIntent(request *object.WecomProfileConsentLoginIntentIssueRequest, provider *object.Provider) (*object.WecomProfileConsentLoginIntentIssueResult, error)
	IssueProfileSyncIntent(request *object.WecomProfileConsentProfileSyncIntentIssueRequest, provider *object.Provider) (*object.WecomProfileConsentLoginIntentIssueResult, error)
}

type wecomProfileConsentIntentCompleter interface {
	CompleteLoginIntent(c *ApiController, intentId string, pollToken string, request *wecomProfileConsentCompleteRequest) (*Response, error)
}

type wecomProfileConsentCallbackAuthorizer interface {
	AuthorizeLoginIntent(c *ApiController, intent *object.WecomProfileConsentIntent, code string) (*wecomProfileConsentCallbackAuthorizeResult, error)
	AuthorizeProfileSyncIntent(c *ApiController, intent *object.WecomProfileConsentIntent, code string) (*wecomProfileConsentProfileSyncAuthorizeResult, error)
}

var (
	getWecomProfileConsentApplication       = object.GetApplication
	getWecomProfileConsentProvider          = object.GetProvider
	getWecomProfileConsentOrganization      = object.GetOrganization
	getWecomProfileConsentUser              = object.GetUser
	getWecomProfileConsentUserByField       = object.GetUserByField
	findWecomProfileConsentLarkUser         = object.FindLarkUserByIdentifiers
	getWecomProfileConsentUserCount         = object.GetUserCount
	addWecomProfileConsentUser              = object.AddUser
	getWecomProfileConsentWecomUserMapping  = object.GetWecomUserMapping
	getWecomProfileConsentIntentByName      = object.GetWecomProfileConsentIntentByName
	expireWecomProfileConsentIntentIfNeeded = object.ExpireWecomProfileConsentIntentIfNeeded
	transitionWecomProfileConsentIntent     = object.TransitionWecomProfileConsentIntent
	getWecomProfileConsentIdProvider        = idp.GetIdProvider
	checkWecomProfileConsentMasterCode      = func(c *ApiController, user *object.User, code string) (bool, error) {
		return c.checkOrgMasterVerificationCode(user, code)
	}
	checkWecomProfileConsentMfaEnable       = checkMfaEnable
	verifyWecomProfileConsentMfaForComplete = verifyWecomProfileConsentMfa
	setWecomProfileConsentUserOAuthProfile  = object.SetUserOAuthProperties
	linkWecomProfileConsentUserAccount      = object.LinkUserAccount
	newWecomProfileConsentIntentIssuer      = func() wecomProfileConsentLoginIntentIssuer {
		return &object.WecomProfileConsentIntentIssuer{}
	}
	newWecomProfileConsentIntentCompleter = func() wecomProfileConsentIntentCompleter {
		return &defaultWecomProfileConsentIntentCompleter{}
	}
	newWecomProfileConsentCallbackAuthorizer = func() wecomProfileConsentCallbackAuthorizer {
		return &defaultWecomProfileConsentCallbackAuthorizer{}
	}
)

type wecomProfileConsentLoginIntentRequest struct {
	Application  string                                  `json:"application"`
	Provider     string                                  `json:"provider"`
	Method       string                                  `json:"method"`
	ReturnURL    string                                  `json:"returnUrl"`
	LoginContext *object.WecomProfileConsentLoginContext `json:"loginContext"`
}

type wecomProfileConsentProfileSyncIntentRequest struct {
	Application string `json:"application"`
	Provider    string `json:"provider"`
}

type wecomProfileConsentLoginIntentResponse struct {
	IntentId     string `json:"intentId"`
	AuthURL      string `json:"authUrl"`
	ShortAuthURL string `json:"shortAuthUrl,omitempty"`
	ExpiresAt    string `json:"expiresAt"`
	PollToken    string `json:"pollToken"`
}

type wecomProfileConsentIntentStatusResponse struct {
	Status    string `json:"status"`
	ExpiresAt string `json:"expiresAt"`
	ErrorCode string `json:"errorCode,omitempty"`
	ErrorText string `json:"errorText,omitempty"`
}

type wecomProfileConsentCompleteRequest struct {
	PollToken         string `json:"pollToken"`
	MfaType           string `json:"mfaType"`
	Passcode          string `json:"passcode"`
	RecoveryCode      string `json:"recoveryCode"`
	EnableMfaRemember bool   `json:"enableMfaRemember"`
}

type wecomProfileConsentCallbackAuthorizeResult struct {
	User        *object.User
	WecomUserId string
}

type wecomProfileConsentProfileSyncAuthorizeResult struct {
	User        *object.User
	CorpId      string
	WecomUserId string
}

type defaultWecomProfileConsentIntentCompleter struct{}

type defaultWecomProfileConsentCallbackAuthorizer struct{}

// CreateWecomProfileConsentLoginIntent ...
// @Title CreateWecomProfileConsentLoginIntent
// @Tag Login API
// @Description create a one-time WeCom OAuth2 private profile consent login intent
// @Param   form   body   controllers.wecomProfileConsentLoginIntentRequest  true  "WeCom profile consent login intent"
// @Success 200 {object} controllers.Response The Response object
// @router /wecom-profile-consent/login-intents [post]
func (c *ApiController) CreateWecomProfileConsentLoginIntent() {
	var request wecomProfileConsentLoginIntentRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}

	request.Application = strings.TrimSpace(request.Application)
	request.Provider = strings.TrimSpace(request.Provider)
	request.Method = strings.TrimSpace(request.Method)
	if request.Application == "" {
		c.ResponseError(c.T("general:Missing parameter") + ": application")
		return
	}
	if request.Provider == "" {
		c.ResponseError(c.T("general:Missing parameter") + ": provider")
		return
	}

	application, err := getWecomProfileConsentApplication(util.GetId("admin", request.Application))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if application == nil {
		c.ResponseError(fmt.Sprintf(c.T("auth:The application: %s does not exist"), request.Application))
		return
	}
	if !application.IsProviderVisibleForLogin(request.Provider) {
		c.ResponseError(fmt.Sprintf(c.T("auth:The provider: %s is not enabled for the application"), request.Provider))
		return
	}

	providerItem := application.GetProviderItem(request.Provider)
	if providerItem == nil {
		c.ResponseError(fmt.Sprintf(c.T("auth:The provider: %s is not enabled for the application"), request.Provider))
		return
	}

	providerOwner := strings.TrimSpace(providerItem.Owner)
	if providerOwner == "" {
		providerOwner = "admin"
	}
	provider, err := getWecomProfileConsentProvider(util.GetId(providerOwner, providerItem.Name))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if provider == nil {
		c.ResponseError(fmt.Sprintf(c.T("auth:The provider: %s does not exist"), request.Provider))
		return
	}
	if err := object.ValidateWecomProfileConsentProvider(provider); err != nil {
		c.ResponseError(err.Error())
		return
	}

	if request.LoginContext == nil {
		request.LoginContext = &object.WecomProfileConsentLoginContext{}
	}
	if request.LoginContext.Method == "" {
		request.LoginContext.Method = request.Method
		if request.LoginContext.Method == "" {
			request.LoginContext.Method = "signup"
		}
	}
	if request.LoginContext.SigninMethod == "" {
		request.LoginContext.SigninMethod = "wecom"
	}
	if request.LoginContext.Type == "" {
		request.LoginContext.Type = ResponseTypeLogin
	}
	if request.LoginContext.Language == "" {
		request.LoginContext.Language = c.GetAcceptLanguage()
	}

	if err := object.ValidateWecomProfileConsentLoginContext(application, request.LoginContext, c.GetAcceptLanguage()); err != nil {
		c.ResponseError(err.Error())
		return
	}
	if err := object.ValidateWecomProfileConsentReturnURL(application, request.ReturnURL); err != nil {
		c.ResponseError(err.Error())
		return
	}

	clientKey := c.resolveWecomProfileConsentClientKey()
	clientIP := util.GetClientIpFromRequest(c.Ctx.Request)
	result, err := newWecomProfileConsentIntentIssuer().IssueLoginIntent(&object.WecomProfileConsentLoginIntentIssueRequest{
		Host:          c.Ctx.Request.Host,
		Owner:         resolveWecomProfileConsentOwner(application),
		Organization:  application.Organization,
		Application:   application.Name,
		ProviderOwner: provider.Owner,
		ProviderName:  provider.Name,
		CorpId:        provider.ClientId,
		AgentId:       provider.AppId,
		ReturnURL:     request.ReturnURL,
		ClientKey:     clientKey,
		ClientIP:      clientIP,
		LoginContext:  request.LoginContext,
	}, provider)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(wecomProfileConsentLoginIntentResponse{
		IntentId:     result.Intent.Name,
		AuthURL:      result.AuthURL,
		ShortAuthURL: object.BuildWecomProfileConsentAuthorizeURL(c.Ctx.Request.Host, result.Intent.Name, result.Secrets.State),
		ExpiresAt:    result.Intent.ExpiresAt.UTC().Format(time.RFC3339),
		PollToken:    result.Secrets.PollToken,
	})
}

// AuthorizeWecomProfileConsentIntent 处理企业微信敏感授权二维码短链接跳转。
// @Title AuthorizeWecomProfileConsentIntent
// @Tag Login API
// @Description 校验短链接中的登录意图和 state 后，重定向到完整企业微信 OAuth2 授权 URL
// @Success 302 {string} string "企业微信 OAuth2 跳转"
// @router /wecom-profile-consent/intents/:intentId/authorize [get]
func (c *ApiController) AuthorizeWecomProfileConsentIntent() {
	intentId := strings.TrimSpace(c.Ctx.Input.Param(":intentId"))
	rawState := strings.TrimSpace(c.Ctx.Input.Query("state"))
	if intentId == "" || rawState == "" {
		c.ResponseError("wecom profile consent intent is invalid")
		return
	}

	stateIntentName, _, err := object.ParseWecomProfileConsentState(rawState)
	if err != nil || stateIntentName != intentId {
		c.ResponseError("wecom profile consent intent is invalid")
		return
	}
	intent, err := getWecomProfileConsentIntentByName(intentId)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if intent == nil || !intent.MatchesState(rawState) {
		c.ResponseError("wecom profile consent intent is invalid")
		return
	}
	if refreshed, _, err := expireWecomProfileConsentIntentIfNeeded(intent.Name, time.Now().UTC()); err != nil {
		c.ResponseError(err.Error())
		return
	} else if refreshed != nil {
		intent = refreshed
	}
	if intent.Status != object.WecomProfileConsentIntentStatusPending || intent.IntentType != object.WecomProfileConsentIntentTypeLogin {
		c.ResponseError("wecom profile consent intent is invalid")
		return
	}

	providerOwner := firstNonEmptyWecomProfileConsentValue(intent.ProviderOwner, "admin")
	provider, err := getWecomProfileConsentProvider(util.GetId(providerOwner, intent.ProviderName))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if provider == nil {
		c.ResponseError("wecom profile consent provider is invalid")
		return
	}
	if intent.CorpId != "" && intent.CorpId != provider.ClientId {
		c.ResponseError("wecom profile consent corp boundary mismatch")
		return
	}
	if intent.AgentId != "" && intent.AgentId != provider.AppId {
		c.ResponseError("wecom profile consent agent boundary mismatch")
		return
	}
	authURL, err := object.BuildWecomProfileConsentOAuth2AuthURL(provider, object.BuildWecomProfileConsentCallbackURL(c.Ctx.Request.Host), rawState)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.Redirect(authURL, http.StatusFound)
}

// CreateWecomProfileConsentProfileSyncIntent ...
// @Title CreateWecomProfileConsentProfileSyncIntent
// @Tag Account API
// @Description create a one-time WeCom OAuth2 private profile consent sync intent for the current user
// @Param   form   body   controllers.wecomProfileConsentProfileSyncIntentRequest  true  "WeCom profile consent sync intent"
// @Success 200 {object} controllers.Response The Response object
// @router /wecom-profile-consent/profile-sync-intents [post]
func (c *ApiController) CreateWecomProfileConsentProfileSyncIntent() {
	currentUserId := c.GetSessionUsername()
	if currentUserId == "" {
		c.ResponseError(c.T("general:Please login first"))
		return
	}

	var request wecomProfileConsentProfileSyncIntentRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}

	request.Application = strings.TrimSpace(request.Application)
	request.Provider = strings.TrimSpace(request.Provider)
	if request.Application == "" {
		c.ResponseError(c.T("general:Missing parameter") + ": application")
		return
	}
	if request.Provider == "" {
		c.ResponseError(c.T("general:Missing parameter") + ": provider")
		return
	}

	currentUser, err := getWecomProfileConsentUser(currentUserId)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if currentUser == nil {
		c.ResponseError(c.T("general:Please login first"))
		return
	}

	application, provider, err := resolveWecomProfileConsentApplicationProvider(request.Application, request.Provider)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if application.Organization != "" && application.Organization != currentUser.Owner {
		c.ResponseError("wecom profile consent application does not belong to current user organization")
		return
	}

	corpId, wecomUserId, err := resolveWecomProfileConsentCurrentUserIdentity(currentUser, provider)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	clientKey := c.resolveWecomProfileConsentClientKey()
	clientIP := util.GetClientIpFromRequest(c.Ctx.Request)
	result, err := newWecomProfileConsentIntentIssuer().IssueProfileSyncIntent(&object.WecomProfileConsentProfileSyncIntentIssueRequest{
		Host:                c.Ctx.Request.Host,
		Owner:               resolveWecomProfileConsentOwner(application),
		Organization:        application.Organization,
		Application:         application.Name,
		ProviderOwner:       provider.Owner,
		ProviderName:        provider.Name,
		CorpId:              corpId,
		AgentId:             provider.AppId,
		ClientKey:           clientKey,
		ClientIP:            clientIP,
		SubjectOwner:        currentUser.Owner,
		SubjectName:         currentUser.Name,
		ExpectedWecomUserId: wecomUserId,
	}, provider)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(wecomProfileConsentLoginIntentResponse{
		IntentId:  result.Intent.Name,
		AuthURL:   result.AuthURL,
		ExpiresAt: result.Intent.ExpiresAt.UTC().Format(time.RFC3339),
		PollToken: result.Secrets.PollToken,
	})
}

func resolveWecomProfileConsentApplicationProvider(applicationName string, providerName string) (*object.Application, *object.Provider, error) {
	applicationName = strings.TrimSpace(applicationName)
	providerName = strings.TrimSpace(providerName)
	application, err := getWecomProfileConsentApplication(util.GetId("admin", applicationName))
	if err != nil {
		return nil, nil, err
	}
	if application == nil {
		return nil, nil, fmt.Errorf("wecom profile consent application is invalid")
	}
	if !application.IsProviderVisibleForLogin(providerName) {
		return nil, nil, fmt.Errorf("wecom profile consent provider is not enabled for the application")
	}

	providerItem := application.GetProviderItem(providerName)
	if providerItem == nil {
		return nil, nil, fmt.Errorf("wecom profile consent provider is not enabled for the application")
	}
	providerOwner := strings.TrimSpace(providerItem.Owner)
	if providerOwner == "" {
		providerOwner = "admin"
	}
	provider, err := getWecomProfileConsentProvider(util.GetId(providerOwner, providerItem.Name))
	if err != nil {
		return nil, nil, err
	}
	if provider == nil {
		return nil, nil, fmt.Errorf("wecom profile consent provider is invalid")
	}
	if err := object.ValidateWecomProfileConsentProvider(provider); err != nil {
		return nil, nil, err
	}
	return application, provider, nil
}

func resolveWecomProfileConsentCurrentUserIdentity(user *object.User, provider *object.Provider) (string, string, error) {
	if user == nil {
		return "", "", fmt.Errorf("wecom profile consent user is invalid")
	}
	if provider == nil {
		return "", "", fmt.Errorf("wecom profile consent provider is invalid")
	}

	providerCorpId := strings.TrimSpace(provider.ClientId)
	type identityCandidate struct {
		corpId      string
		wecomUserId string
	}
	candidates := []identityCandidate{}
	addCandidate := func(corpId string, wecomUserId string) {
		corpId = firstNonEmptyWecomProfileConsentValue(corpId, providerCorpId)
		wecomUserId = strings.TrimSpace(wecomUserId)
		if corpId == "" || wecomUserId == "" {
			return
		}
		candidates = append(candidates, identityCandidate{corpId: corpId, wecomUserId: wecomUserId})
	}

	addCandidate(providerCorpId, user.Wecom)
	if user.Properties != nil {
		addCandidate(user.Properties[object.WecomUserPropertyCorpId], user.Properties[object.WecomUserPropertyUserId])
		addCandidate(providerCorpId, user.Properties["oauth_WeCom_id"])
	}
	if len(candidates) == 0 {
		return "", "", fmt.Errorf("wecom profile consent user has no linked WeCom identity")
	}

	corpId := candidates[0].corpId
	wecomUserId := candidates[0].wecomUserId
	for _, candidate := range candidates[1:] {
		if candidate.corpId != corpId || candidate.wecomUserId != wecomUserId {
			return "", "", fmt.Errorf("wecom profile consent user WeCom identity conflict")
		}
	}
	if providerCorpId != "" && corpId != providerCorpId {
		return "", "", fmt.Errorf("wecom profile consent user WeCom identity conflict")
	}

	if mapping, err := getWecomProfileConsentWecomUserMapping(user.Owner, corpId, wecomUserId); err != nil {
		return "", "", err
	} else if mapping != nil && mapping.IsEnabled && (mapping.UserOwner != user.Owner || mapping.UserName != user.Name) {
		return "", "", fmt.Errorf("wecom profile consent user WeCom identity conflict")
	}

	return corpId, wecomUserId, nil
}

// GetWecomProfileConsentIntentStatus ...
// @Title GetWecomProfileConsentIntentStatus
// @Tag Login API
// @Description get WeCom profile consent intent status
// @Success 200 {object} controllers.Response The Response object
// @router /wecom-profile-consent/intents/:intentId [get]
func (c *ApiController) GetWecomProfileConsentIntentStatus() {
	intentId := strings.TrimSpace(c.Ctx.Input.Param(":intentId"))
	pollToken := c.getWecomProfileConsentPollToken(nil)
	if intentId == "" {
		c.ResponseError(c.T("general:Missing parameter") + ": intentId")
		return
	}
	if pollToken == "" {
		c.ResponseError(c.T("general:Missing parameter") + ": pollToken")
		return
	}

	intent, err := getWecomProfileConsentIntentByName(intentId)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if intent == nil || !intent.MatchesPollToken(pollToken) {
		c.ResponseError("wecom profile consent intent is invalid")
		return
	}

	if refreshed, _, err := expireWecomProfileConsentIntentIfNeeded(intent.Name, time.Now().UTC()); err != nil {
		c.ResponseError(err.Error())
		return
	} else if refreshed != nil {
		intent = refreshed
	}

	c.ResponseOk(newWecomProfileConsentIntentStatusResponse(intent))
}

// CompleteWecomProfileConsentLoginIntent ...
// @Title CompleteWecomProfileConsentLoginIntent
// @Tag Login API
// @Description complete a one-time WeCom OAuth2 private profile consent login intent
// @Param   form   body   controllers.wecomProfileConsentCompleteRequest  true  "WeCom profile consent complete request"
// @Success 200 {object} controllers.Response The Response object
// @router /wecom-profile-consent/intents/:intentId/complete [post]
func (c *ApiController) CompleteWecomProfileConsentLoginIntent() {
	intentId := strings.TrimSpace(c.Ctx.Input.Param(":intentId"))
	if intentId == "" {
		c.ResponseError(c.T("general:Missing parameter") + ": intentId")
		return
	}

	var request wecomProfileConsentCompleteRequest
	if len(c.Ctx.Input.RequestBody) > 0 {
		if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
			c.ResponseError(err.Error())
			return
		}
	}

	pollToken := c.getWecomProfileConsentPollToken(&request)
	if pollToken == "" {
		c.ResponseError(c.T("general:Missing parameter") + ": pollToken")
		return
	}

	resp, err := newWecomProfileConsentIntentCompleter().CompleteLoginIntent(c, intentId, pollToken, &request)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if resp == nil {
		return
	}

	c.Data["json"] = resp
	c.ServeJSON()
}

// HandleWecomProfileConsentCallback ...
// @Title HandleWecomProfileConsentCallback
// @Tag Login API
// @Description handle WeCom OAuth2 private profile consent callback
// @Success 200 {string} string "HTML callback page"
// @router /wecom-profile-consent/callback [get]
func (c *ApiController) HandleWecomProfileConsentCallback() {
	code := strings.TrimSpace(c.Ctx.Input.Query("code"))
	rawState := strings.TrimSpace(c.Ctx.Input.Query("state"))
	if code == "" || rawState == "" {
		c.renderWecomProfileConsentCallbackPage(false)
		return
	}

	intentName, _, err := object.ParseWecomProfileConsentState(rawState)
	if err != nil {
		c.renderWecomProfileConsentCallbackPage(false)
		return
	}
	intent, err := getWecomProfileConsentIntentByName(intentName)
	if err != nil || intent == nil || !intent.MatchesState(rawState) {
		c.renderWecomProfileConsentCallbackPage(false)
		return
	}
	if refreshed, _, err := expireWecomProfileConsentIntentIfNeeded(intent.Name, time.Now().UTC()); err != nil {
		c.renderWecomProfileConsentCallbackPage(false)
		return
	} else if refreshed != nil {
		intent = refreshed
	}
	if intent.Status != object.WecomProfileConsentIntentStatusPending {
		// 企业微信 callback 可能因页面刷新或平台重试重复到达；已成功推进的意图必须保持幂等，不能被重复回调打回 failed。
		switch intent.Status {
		case object.WecomProfileConsentIntentStatusAuthorized,
			object.WecomProfileConsentIntentStatusMfaPending,
			object.WecomProfileConsentIntentStatusCompleted:
			c.renderWecomProfileConsentCallbackPage(true)
		default:
			c.renderWecomProfileConsentCallbackPage(false)
		}
		return
	}

	switch intent.IntentType {
	case object.WecomProfileConsentIntentTypeLogin:
		c.handleWecomProfileConsentLoginCallback(intent, rawState, code)
	case object.WecomProfileConsentIntentTypeProfileSync:
		c.handleWecomProfileConsentProfileSyncCallback(intent, rawState, code)
	default:
		c.markWecomProfileConsentIntentFailed(intent.Name, "invalid_intent")
		c.renderWecomProfileConsentCallbackPage(false)
	}
}

func (c *ApiController) handleWecomProfileConsentLoginCallback(intent *object.WecomProfileConsentIntent, rawState string, code string) {
	result, err := newWecomProfileConsentCallbackAuthorizer().AuthorizeLoginIntent(c, intent, code)
	if err != nil || result == nil || result.User == nil {
		errorCode := "authorization_failed"
		errorText := ""
		if errors.Is(err, errWecomProfileConsentEmailPermissionRequired) {
			errorCode = wecomProfileConsentEmailPermissionRequiredCode
			errorText = wecomProfileConsentEmailPermissionRequiredErrorText
		}
		c.markWecomProfileConsentIntentFailed(intent.Name, errorCode, errorText)
		c.renderWecomProfileConsentCallbackPage(false)
		return
	}

	_, changed, err := transitionWecomProfileConsentIntent(intent.Name, []object.WecomProfileConsentIntentStatus{object.WecomProfileConsentIntentStatusPending}, func(locked *object.WecomProfileConsentIntent) (bool, error) {
		if !locked.MatchesState(rawState) {
			return false, fmt.Errorf("wecom profile consent intent is invalid")
		}
		locked.Status = object.WecomProfileConsentIntentStatusAuthorized
		locked.ResolvedUserOwner = result.User.Owner
		locked.ResolvedUserName = result.User.Name
		locked.WecomUserId = strings.TrimSpace(result.WecomUserId)
		locked.ErrorCode = ""
		locked.ErrorText = ""
		return true, nil
	})
	if err != nil || !changed {
		c.markWecomProfileConsentIntentFailed(intent.Name, "authorization_failed")
		c.renderWecomProfileConsentCallbackPage(false)
		return
	}

	c.renderWecomProfileConsentCallbackPage(true)
}

func (c *ApiController) handleWecomProfileConsentProfileSyncCallback(intent *object.WecomProfileConsentIntent, rawState string, code string) {
	result, err := newWecomProfileConsentCallbackAuthorizer().AuthorizeProfileSyncIntent(c, intent, code)
	if err != nil || result == nil || result.User == nil {
		c.markWecomProfileConsentIntentFailed(intent.Name, "authorization_failed")
		c.renderWecomProfileConsentCallbackPage(false)
		return
	}

	_, changed, err := transitionWecomProfileConsentIntent(intent.Name, []object.WecomProfileConsentIntentStatus{object.WecomProfileConsentIntentStatusPending}, func(locked *object.WecomProfileConsentIntent) (bool, error) {
		if !locked.MatchesState(rawState) {
			return false, fmt.Errorf("wecom profile consent intent is invalid")
		}
		if strings.TrimSpace(result.CorpId) != strings.TrimSpace(locked.CorpId) || strings.TrimSpace(result.WecomUserId) != strings.TrimSpace(locked.ExpectedWecomUserId) {
			return false, fmt.Errorf("wecom profile consent profile sync user mismatch")
		}
		if result.User.Owner != locked.SubjectOwner || result.User.Name != locked.SubjectName {
			return false, fmt.Errorf("wecom profile consent profile sync subject mismatch")
		}
		locked.Status = object.WecomProfileConsentIntentStatusCompleted
		locked.CompletedAt = time.Now().UTC()
		locked.ResolvedUserOwner = result.User.Owner
		locked.ResolvedUserName = result.User.Name
		locked.WecomUserId = strings.TrimSpace(result.WecomUserId)
		locked.ErrorCode = ""
		locked.ErrorText = ""
		return true, nil
	})
	if err != nil || !changed {
		c.markWecomProfileConsentIntentFailed(intent.Name, "authorization_failed")
		c.renderWecomProfileConsentCallbackPage(false)
		return
	}

	c.renderWecomProfileConsentCallbackPage(true)
}

func (c *ApiController) renderWecomProfileConsentCallbackPage(success bool) {
	c.Ctx.ResponseWriter.Header().Set("Content-Type", "text/html; charset=utf-8")
	title := "授权失败"
	message := "授权失败，请回到 PC 页面刷新二维码后重试。"
	if success {
		title = "授权完成"
		message = "授权完成，请回到 PC 页面继续。"
	}
	_, _ = c.Ctx.ResponseWriter.Write([]byte(fmt.Sprintf(`<!doctype html><html><head><meta charset="utf-8"><title>%s</title></head><body><main><h1>%s</h1><p>%s</p></main></body></html>`, title, title, message)))
}

func (c *ApiController) markWecomProfileConsentIntentFailed(intentName string, errorCode string, errorText ...string) {
	resolvedErrorText := "wecom profile consent authorization failed"
	if len(errorText) > 0 && strings.TrimSpace(errorText[0]) != "" {
		resolvedErrorText = strings.TrimSpace(errorText[0])
	}
	_, _, _ = transitionWecomProfileConsentIntent(intentName, []object.WecomProfileConsentIntentStatus{
		object.WecomProfileConsentIntentStatusPending,
	}, func(intent *object.WecomProfileConsentIntent) (bool, error) {
		intent.Status = object.WecomProfileConsentIntentStatusFailed
		intent.ErrorCode = strings.TrimSpace(errorCode)
		intent.ErrorText = resolvedErrorText
		return true, nil
	})
}

func (c *ApiController) getWecomProfileConsentPollToken(request *wecomProfileConsentCompleteRequest) string {
	if request != nil && strings.TrimSpace(request.PollToken) != "" {
		return strings.TrimSpace(request.PollToken)
	}
	return strings.TrimSpace(c.Ctx.Request.Header.Get(wecomProfileConsentPollTokenHeader))
}

func (s *defaultWecomProfileConsentIntentCompleter) CompleteLoginIntent(c *ApiController, intentId string, pollToken string, request *wecomProfileConsentCompleteRequest) (*Response, error) {
	intent, err := getWecomProfileConsentIntentByName(intentId)
	if err != nil {
		return nil, err
	}
	if intent == nil || !intent.MatchesPollToken(pollToken) {
		return nil, fmt.Errorf("wecom profile consent intent is invalid")
	}
	if refreshed, _, err := expireWecomProfileConsentIntentIfNeeded(intent.Name, time.Now().UTC()); err != nil {
		return nil, err
	} else if refreshed != nil {
		intent = refreshed
	}
	if intent.IntentType != object.WecomProfileConsentIntentTypeLogin {
		return nil, fmt.Errorf("wecom profile consent intent type is invalid")
	}

	application, user, organization, authForm, err := resolveWecomProfileConsentLoginCompletion(c, intent, request)
	if err != nil {
		return nil, err
	}

	switch intent.Status {
	case object.WecomProfileConsentIntentStatusAuthorized:
		return s.completeAuthorizedLoginIntent(c, intent, pollToken, application, user, organization, authForm)
	case object.WecomProfileConsentIntentStatusMfaPending:
		return s.completeMfaPendingLoginIntent(c, intent, pollToken, application, user, organization, authForm)
	default:
		return nil, fmt.Errorf("wecom profile consent intent cannot be completed from status: %s", intent.Status)
	}
}

func (s *defaultWecomProfileConsentCallbackAuthorizer) AuthorizeLoginIntent(c *ApiController, intent *object.WecomProfileConsentIntent, code string) (*wecomProfileConsentCallbackAuthorizeResult, error) {
	application, err := getWecomProfileConsentApplication(util.GetId("admin", intent.Application))
	if err != nil {
		return nil, err
	}
	if application == nil {
		return nil, fmt.Errorf("wecom profile consent application is invalid")
	}
	providerItem := application.GetProviderItem(intent.ProviderName)
	if providerItem == nil {
		return nil, fmt.Errorf("wecom profile consent provider is not enabled for the application")
	}
	var organization *object.Organization
	_, err = application.ResolveProviderLoginOrganization(intent.ProviderName, func(name string) (bool, error) {
		resolved, err := getWecomProfileConsentOrganization(util.GetId("admin", name))
		if err != nil {
			return false, err
		}
		organization = resolved
		return resolved != nil, nil
	})
	if err != nil {
		return nil, err
	}
	if organization == nil {
		return nil, fmt.Errorf("wecom profile consent organization is invalid")
	}

	providerOwner := firstNonEmptyWecomProfileConsentValue(intent.ProviderOwner, providerItem.Owner, "admin")
	provider, err := getWecomProfileConsentProvider(util.GetId(providerOwner, intent.ProviderName))
	if err != nil {
		return nil, err
	}
	if provider == nil {
		return nil, fmt.Errorf("wecom profile consent provider is invalid")
	}
	if err := object.ValidateWecomProfileConsentProvider(provider); err != nil {
		return nil, err
	}
	if intent.CorpId != "" && intent.CorpId != provider.ClientId {
		return nil, fmt.Errorf("wecom profile consent corp boundary mismatch")
	}
	if intent.AgentId != "" && intent.AgentId != provider.AppId {
		return nil, fmt.Errorf("wecom profile consent agent boundary mismatch")
	}

	idpInfo, err := object.FromProviderToIdpInfo(c.Ctx, provider)
	if err != nil {
		return nil, err
	}
	idProvider, err := getWecomProfileConsentIdProvider(idpInfo, object.BuildWecomProfileConsentCallbackURL(c.Ctx.Request.Host))
	if err != nil {
		return nil, err
	}
	if idProvider == nil {
		return nil, fmt.Errorf("wecom profile consent provider is unsupported")
	}
	setHttpClient(idProvider, provider.Type)

	token, err := idProvider.GetToken(code)
	if err != nil {
		return nil, err
	}
	if !token.Valid() {
		return nil, fmt.Errorf("wecom profile consent token is invalid")
	}
	userInfo, err := idProvider.GetUserInfo(token)
	if err != nil {
		return nil, err
	}
	if userInfo == nil {
		return nil, fmt.Errorf("wecom profile consent user info is invalid")
	}
	if err := requireWecomProfileConsentUserTicket(userInfo); err != nil {
		return nil, err
	}

	wecomUserId := firstNonEmptyWecomProfileConsentValue(userInfo.Extra["userid"], userInfo.Id)
	if wecomUserId == "" {
		return nil, fmt.Errorf("wecom profile consent wecom user is invalid")
	}
	if corpId := strings.TrimSpace(userInfo.Extra["corp_id"]); corpId != "" && corpId != provider.ClientId {
		return nil, fmt.Errorf("wecom profile consent corp boundary mismatch")
	}
	if requiresEmailClaimForWecomProfileConsent(intent) && strings.TrimSpace(userInfo.Email) == "" {
		return nil, errWecomProfileConsentEmailPermissionRequired
	}

	user, err := resolveWecomProfileConsentLoginUser(c, application, organization, providerItem, provider, userInfo, wecomUserId)
	if err != nil {
		return nil, err
	}
	return &wecomProfileConsentCallbackAuthorizeResult{
		User:        user,
		WecomUserId: wecomUserId,
	}, nil
}

func (s *defaultWecomProfileConsentCallbackAuthorizer) AuthorizeProfileSyncIntent(c *ApiController, intent *object.WecomProfileConsentIntent, code string) (*wecomProfileConsentProfileSyncAuthorizeResult, error) {
	application, provider, err := resolveWecomProfileConsentApplicationProvider(intent.Application, intent.ProviderName)
	if err != nil {
		return nil, err
	}
	organization, err := getWecomProfileConsentOrganization(util.GetId("admin", application.Organization))
	if err != nil {
		return nil, err
	}
	if organization == nil {
		return nil, fmt.Errorf("wecom profile consent organization is invalid")
	}
	if intent.CorpId != "" && intent.CorpId != provider.ClientId {
		return nil, fmt.Errorf("wecom profile consent corp boundary mismatch")
	}
	if intent.AgentId != "" && intent.AgentId != provider.AppId {
		return nil, fmt.Errorf("wecom profile consent agent boundary mismatch")
	}

	user, err := getWecomProfileConsentUser(util.GetId(intent.SubjectOwner, intent.SubjectName))
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("wecom profile consent profile sync subject is invalid")
	}
	currentCorpId, currentWecomUserId, err := resolveWecomProfileConsentCurrentUserIdentity(user, provider)
	if err != nil {
		return nil, err
	}

	idpInfo, err := object.FromProviderToIdpInfo(c.Ctx, provider)
	if err != nil {
		return nil, err
	}
	idProvider, err := idp.GetIdProvider(idpInfo, object.BuildWecomProfileConsentCallbackURL(c.Ctx.Request.Host))
	if err != nil {
		return nil, err
	}
	if idProvider == nil {
		return nil, fmt.Errorf("wecom profile consent provider is unsupported")
	}
	setHttpClient(idProvider, provider.Type)

	token, err := idProvider.GetToken(code)
	if err != nil {
		return nil, err
	}
	if !token.Valid() {
		return nil, fmt.Errorf("wecom profile consent token is invalid")
	}
	userInfo, err := idProvider.GetUserInfo(token)
	if err != nil {
		return nil, err
	}
	if userInfo == nil {
		return nil, fmt.Errorf("wecom profile consent user info is invalid")
	}
	if err := requireWecomProfileConsentUserTicket(userInfo); err != nil {
		return nil, err
	}

	wecomUserId := firstNonEmptyWecomProfileConsentValue(userInfo.Extra["userid"], userInfo.Id)
	corpId := firstNonEmptyWecomProfileConsentValue(userInfo.Extra["corp_id"], provider.ClientId)
	if corpId == "" || wecomUserId == "" {
		return nil, fmt.Errorf("wecom profile consent wecom user is invalid")
	}
	if corpId != currentCorpId || wecomUserId != currentWecomUserId || wecomUserId != strings.TrimSpace(intent.ExpectedWecomUserId) {
		return nil, fmt.Errorf("wecom profile consent profile sync user mismatch")
	}

	if err := saveWecomProfileConsentOAuthProfile(organization, user, provider, userInfo, wecomUserId); err != nil {
		return nil, err
	}

	return &wecomProfileConsentProfileSyncAuthorizeResult{
		User:        user,
		CorpId:      corpId,
		WecomUserId: wecomUserId,
	}, nil
}

func requireWecomProfileConsentUserTicket(userInfo *idp.UserInfo) error {
	if !idp.HasWeComInternalUserTicket(userInfo) {
		return fmt.Errorf("wecom profile consent user ticket is missing")
	}
	return nil
}

// requiresEmailClaimForWecomProfileConsent 判断当前扫码意图是否承接了要求 email claim 的 OIDC 登录请求。
func requiresEmailClaimForWecomProfileConsent(intent *object.WecomProfileConsentIntent) bool {
	loginContext, err := intent.GetLoginContext()
	if err != nil || loginContext == nil {
		return false
	}
	return wecomProfileConsentScopeIncludes(loginContext.Scope, "email")
}

// wecomProfileConsentScopeIncludes 按 OAuth/OIDC scope token 精确匹配，避免把 login:email 等非 email claim scope 误判为邮箱要求。
func wecomProfileConsentScopeIncludes(scope string, expected string) bool {
	normalized := strings.ToLower(strings.TrimSpace(scope))
	normalized = strings.NewReplacer(
		"+", " ",
		",", " ",
		"%20", " ",
		"%2c", " ",
		"%2C", " ",
	).Replace(normalized)
	for _, token := range strings.Fields(normalized) {
		if token == expected {
			return true
		}
	}
	return false
}

func resolveWecomProfileConsentLoginUser(c *ApiController, application *object.Application, organization *object.Organization, providerItem *object.ProviderItem, provider *object.Provider, userInfo *idp.UserInfo, wecomUserId string) (*object.User, error) {
	var user *object.User
	var err error
	organizationName := strings.TrimSpace(organization.Name)
	if provider.Type == "Lark" {
		user, _, err = findWecomProfileConsentLarkUser(organizationName, userInfo)
	} else {
		user, err = getWecomProfileConsentUserByField(organizationName, provider.Type, userInfo.Id)
	}
	if err != nil {
		return nil, err
	}

	if user == nil {
		user, err = getExistUserByBindingRule(providerItem, organizationName, userInfo)
		if err != nil {
			return nil, err
		}
	}
	if user == nil {
		user, err = createWecomProfileConsentLoginUser(c, application, organization, providerItem, userInfo)
		if err != nil {
			return nil, err
		}
	}

	if err := saveWecomProfileConsentOAuthProfile(organization, user, provider, userInfo, wecomUserId); err != nil {
		return nil, err
	}
	return user, nil
}

func saveWecomProfileConsentOAuthProfile(organization *object.Organization, user *object.User, provider *object.Provider, userInfo *idp.UserInfo, wecomUserId string) error {
	if provider == nil {
		return fmt.Errorf("wecom profile consent provider is invalid")
	}

	// 敏感授权 code、access_token 和 user_ticket 只在 callback 请求内使用；落库仅保存用户资料属性和账号关联。
	if _, err := setWecomProfileConsentUserOAuthProfile(organization, user, provider.Type, userInfo, nil, provider.UserMapping); err != nil {
		return err
	}
	if _, err := linkWecomProfileConsentUserAccount(user, provider.Type, strings.TrimSpace(wecomUserId)); err != nil {
		return err
	}
	return nil
}

func createWecomProfileConsentLoginUser(c *ApiController, application *object.Application, organization *object.Organization, providerItem *object.ProviderItem, userInfo *idp.UserInfo) (*object.User, error) {
	if !application.EnableSignUp {
		return nil, fmt.Errorf("wecom profile consent user does not exist and sign up is disabled")
	}
	if providerItem == nil || !providerItem.CanSignUp {
		return nil, fmt.Errorf("wecom profile consent user does not exist and provider sign up is disabled")
	}

	username := firstNonEmptyWecomProfileConsentValue(userInfo.Username, userInfo.Id)
	if organization.UseEmailAsUsername && userInfo.Email != "" {
		username = userInfo.Email
	}
	if username == "" {
		username = util.GenerateId()
	}
	organizationName := strings.TrimSpace(organization.Name)
	if existing, err := getWecomProfileConsentUser(util.GetId(organizationName, username)); err != nil {
		return nil, err
	} else if existing != nil {
		username = fmt.Sprintf("%s_%s", username, util.GenerateId())
	}

	count, err := getWecomProfileConsentUserCount(organizationName, "", "", "")
	if err != nil {
		return nil, err
	}
	initScore, err := organization.GetInitScore()
	if err != nil {
		return nil, err
	}

	user := &object.User{
		Owner:             organizationName,
		Name:              username,
		CreatedTime:       util.GetCurrentTime(),
		Id:                firstNonEmptyWecomProfileConsentValue(userInfo.Id, util.GenerateId()),
		Type:              "normal-user",
		DisplayName:       firstNonEmptyWecomProfileConsentValue(userInfo.DisplayName, username),
		Avatar:            userInfo.AvatarUrl,
		Address:           []string{},
		Email:             userInfo.Email,
		Phone:             userInfo.Phone,
		CountryCode:       userInfo.CountryCode,
		Region:            userInfo.CountryCode,
		Score:             initScore,
		IsAdmin:           false,
		IsForbidden:       false,
		IsDeleted:         false,
		SignupApplication: application.Name,
		Properties: map[string]string{
			"no": strconv.Itoa(int(count + 2)),
		},
		RegisterType:   "Application Signup",
		RegisterSource: fmt.Sprintf("%s/%s", organizationName, application.Name),
	}

	if providerItem.SignupGroup != "" {
		user.Groups = []string{providerItem.SignupGroup}
	} else if application.DefaultGroup != "" {
		user.Groups = []string{application.DefaultGroup}
	}

	affected, err := addWecomProfileConsentUser(user, c.GetAcceptLanguage())
	if err != nil {
		return nil, err
	}
	if !affected {
		return nil, fmt.Errorf("wecom profile consent failed to create user")
	}
	return user, nil
}

func (s *defaultWecomProfileConsentIntentCompleter) completeAuthorizedLoginIntent(c *ApiController, intent *object.WecomProfileConsentIntent, pollToken string, application *object.Application, user *object.User, organization *object.Organization, authForm *form.AuthForm) (*Response, error) {
	mfaStatus := getWecomProfileConsentMfaStatus(user, organization, "")
	nextStatus := object.WecomProfileConsentIntentStatusCompleted
	if mfaStatus == object.NextMfa {
		nextStatus = object.WecomProfileConsentIntentStatusMfaPending
	}

	_, changed, err := transitionWecomProfileConsentIntent(intent.Name, []object.WecomProfileConsentIntentStatus{object.WecomProfileConsentIntentStatusAuthorized}, func(locked *object.WecomProfileConsentIntent) (bool, error) {
		if !locked.MatchesPollToken(pollToken) {
			return false, fmt.Errorf("wecom profile consent intent is invalid")
		}
		locked.Status = nextStatus
		if nextStatus == object.WecomProfileConsentIntentStatusCompleted {
			locked.CompletedAt = time.Now().UTC()
		}
		return true, nil
	})
	if err != nil {
		return nil, err
	}
	if !changed {
		return nil, fmt.Errorf("wecom profile consent intent has already been consumed")
	}

	if mfaStatus != "" {
		if checkWecomProfileConsentMfaEnable(c, user, organization, "") {
			return nil, nil
		}
	}

	resp := c.HandleLoggedIn(application, user, authForm)
	if resp == nil {
		return nil, nil
	}
	c.Ctx.Input.SetParam("recordUserId", user.GetId())
	return resp, nil
}

func (s *defaultWecomProfileConsentIntentCompleter) completeMfaPendingLoginIntent(c *ApiController, intent *object.WecomProfileConsentIntent, pollToken string, application *object.Application, user *object.User, organization *object.Organization, authForm *form.AuthForm) (*Response, error) {
	if err := verifyWecomProfileConsentMfaForComplete(c, user, organization, authForm); err != nil {
		return nil, err
	}

	_, changed, err := transitionWecomProfileConsentIntent(intent.Name, []object.WecomProfileConsentIntentStatus{object.WecomProfileConsentIntentStatusMfaPending}, func(locked *object.WecomProfileConsentIntent) (bool, error) {
		if !locked.MatchesPollToken(pollToken) {
			return false, fmt.Errorf("wecom profile consent intent is invalid")
		}
		locked.Status = object.WecomProfileConsentIntentStatusCompleted
		locked.CompletedAt = time.Now().UTC()
		return true, nil
	})
	if err != nil {
		return nil, err
	}
	if !changed {
		return nil, fmt.Errorf("wecom profile consent intent has already been consumed")
	}

	resp := c.HandleLoggedIn(application, user, authForm)
	if resp == nil {
		return nil, nil
	}
	c.setMfaUserSession("")
	c.Ctx.Input.SetParam("recordUserId", user.GetId())
	return resp, nil
}

func resolveWecomProfileConsentLoginCompletion(c *ApiController, intent *object.WecomProfileConsentIntent, request *wecomProfileConsentCompleteRequest) (*object.Application, *object.User, *object.Organization, *form.AuthForm, error) {
	application, err := getWecomProfileConsentApplication(util.GetId("admin", intent.Application))
	if err != nil {
		return nil, nil, nil, nil, err
	}
	if application == nil {
		return nil, nil, nil, nil, fmt.Errorf("wecom profile consent application is invalid")
	}

	organization, err := getWecomProfileConsentOrganization(util.GetId("admin", application.Organization))
	if err != nil {
		return nil, nil, nil, nil, err
	}
	if organization == nil {
		return nil, nil, nil, nil, fmt.Errorf("wecom profile consent organization is invalid")
	}

	if strings.TrimSpace(intent.ResolvedUserOwner) == "" || strings.TrimSpace(intent.ResolvedUserName) == "" {
		return nil, nil, nil, nil, fmt.Errorf("wecom profile consent user is unresolved")
	}
	user, err := getWecomProfileConsentUser(util.GetId(intent.ResolvedUserOwner, intent.ResolvedUserName))
	if err != nil {
		return nil, nil, nil, nil, err
	}
	if user == nil {
		return nil, nil, nil, nil, fmt.Errorf("wecom profile consent user is invalid")
	}

	loginContext, err := intent.GetLoginContext()
	if err != nil {
		return nil, nil, nil, nil, err
	}
	authForm := loginContext.ToAuthForm(intent)
	authForm.MfaType = strings.TrimSpace(request.MfaType)
	authForm.Passcode = strings.TrimSpace(request.Passcode)
	authForm.RecoveryCode = strings.TrimSpace(request.RecoveryCode)
	authForm.EnableMfaRemember = request.EnableMfaRemember
	restoreWecomProfileConsentLoginContextQuery(c, loginContext)
	return application, user, organization, authForm, nil
}

func restoreWecomProfileConsentLoginContextQuery(c *ApiController, loginContext *object.WecomProfileConsentLoginContext) {
	if c == nil || loginContext == nil {
		return
	}

	values := map[string]string{
		"clientId":              loginContext.ClientID,
		"responseType":          firstNonEmptyWecomProfileConsentValue(loginContext.ResponseType, loginContext.Type),
		"redirectUri":           loginContext.RedirectURI,
		"scope":                 loginContext.Scope,
		"state":                 loginContext.State,
		"nonce":                 loginContext.Nonce,
		"code_challenge_method": loginContext.ChallengeMethod,
		"code_challenge":        loginContext.CodeChallenge,
		"resource":              loginContext.Resource,
		"service":               loginContext.Service,
	}
	for key, value := range values {
		if strings.TrimSpace(value) != "" {
			c.Ctx.Input.SetParam(key, value)
		}
	}
}

func firstNonEmptyWecomProfileConsentValue(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func getWecomProfileConsentMfaStatus(user *object.User, organization *object.Organization, verificationType string) string {
	if object.IsNeedPromptMfa(organization, user) {
		return object.RequiredMfa
	}
	if user == nil || organization == nil || !user.IsMfaEnabled() {
		return ""
	}
	currentTime := util.String2Time(util.GetCurrentTime())
	mfaRememberDeadline := util.String2Time(user.MfaRememberDeadline)
	if user.MfaRememberDeadline != "" && mfaRememberDeadline.After(currentTime) {
		return ""
	}
	for _, prop := range object.GetAllMfaProps(user, true) {
		if prop.MfaType == verificationType || !prop.Enabled {
			continue
		}
		return object.NextMfa
	}
	return ""
}

func verifyWecomProfileConsentMfa(c *ApiController, user *object.User, organization *object.Organization, authForm *form.AuthForm) error {
	if user == nil || organization == nil || authForm == nil {
		return fmt.Errorf("wecom profile consent mfa context is invalid")
	}
	c.setMfaUserSession(user.GetId())
	if authForm.Passcode != "" {
		if authForm.MfaType == c.GetSession("verificationCodeType") {
			return fmt.Errorf("invalid multi-factor authentication type")
		}
		user.CountryCode = user.GetCountryCode(user.CountryCode)
		mfaUtil := object.GetMfaUtil(authForm.MfaType, user.GetMfaProps(authForm.MfaType, false))
		if mfaUtil == nil {
			return fmt.Errorf("invalid multi-factor authentication type")
		}
		passed, err := checkWecomProfileConsentMasterCode(c, user, authForm.Passcode)
		if err != nil {
			return err
		}
		if !passed {
			if err := mfaUtil.Verify(authForm.Passcode); err != nil {
				return err
			}
		}
		if authForm.EnableMfaRemember {
			mfaRememberInSeconds := organization.MfaRememberInHours * 3600
			currentTime := util.String2Time(util.GetCurrentTime())
			duration := time.Duration(mfaRememberInSeconds) * time.Second
			user.MfaRememberDeadline = util.Time2String(currentTime.Add(duration))
			if _, err := object.UpdateUser(user.GetId(), user, []string{"mfa_remember_deadline"}, user.IsAdmin); err != nil {
				return err
			}
		}
		c.SetSession("verificationCodeType", "")
		return nil
	}
	if authForm.RecoveryCode != "" {
		return object.MfaRecover(user, authForm.RecoveryCode)
	}
	return fmt.Errorf("missing passcode or recovery code")
}

func newWecomProfileConsentIntentStatusResponse(intent *object.WecomProfileConsentIntent) wecomProfileConsentIntentStatusResponse {
	if intent == nil {
		return wecomProfileConsentIntentStatusResponse{}
	}
	return wecomProfileConsentIntentStatusResponse{
		Status:    string(intent.Status),
		ExpiresAt: intent.ExpiresAt.UTC().Format(time.RFC3339),
		ErrorCode: intent.ErrorCode,
		ErrorText: intent.ErrorText,
	}
}

func (c *ApiController) resolveWecomProfileConsentClientKey() string {
	clientKey := strings.TrimSpace(c.Ctx.GetCookie(object.WecomProfileConsentClientCookieName))
	if clientKey != "" {
		return clientKey
	}

	clientKey = util.GenerateId()
	c.Ctx.SetCookie(object.WecomProfileConsentClientCookieName, clientKey, int(object.WecomProfileConsentIntentDefaultTTL.Seconds()), "/")
	return clientKey
}

func resolveWecomProfileConsentOwner(application *object.Application) string {
	if application == nil {
		return "built-in"
	}
	if strings.TrimSpace(application.Organization) != "" {
		return strings.TrimSpace(application.Organization)
	}
	if strings.TrimSpace(application.Owner) != "" {
		return strings.TrimSpace(application.Owner)
	}
	return "built-in"
}
