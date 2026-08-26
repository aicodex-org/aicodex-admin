package object

import (
	"fmt"
	"regexp"
	"strings"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/xorm-io/core"
)

const (
	AICodexDesktopApplicationOwner       = "admin"
	AICodexDesktopApplicationName        = "app-aicodex-desktop"
	AICodexDesktopApplicationClientID    = "aicodex-desktop"
	AICodexDesktopApplicationRedirectURI = "aicodex://auth/aicodex/callback"
	AICodexGatewayRuntimeScope           = "aicodex.gateway"
	publicClientPkceRequiredMessage      = "PKCE S256 code challenge is required for this public client"
	publicClientPkceVerifierMessage      = "PKCE code verifier is invalid for this public client"
)

var (
	publicClientPkceChallengePattern = regexp.MustCompile(`^[A-Za-z0-9_-]{43}$`)
	publicClientPkceVerifierPattern  = regexp.MustCompile(`^[A-Za-z0-9._~-]{43,128}$`)
)

var aicodexDesktopIdentityScopes = []string{
	"openid",
	"profile",
	"email",
	"offline_access",
	AICodexGatewayRuntimeScope,
}

var aicodexDesktopGrantTypes = []string{
	"authorization_code",
	"refresh_token",
}

func newAICodexDesktopApplication() *Application {
	return &Application{
		Owner:          AICodexDesktopApplicationOwner,
		Name:           AICodexDesktopApplicationName,
		CreatedTime:    util.GetCurrentTime(),
		DisplayName:    "AICodex Desktop",
		Category:       "Default",
		Type:           "All",
		Logo:           "/branding/icon-only.svg",
		HomepageUrl:    "https://git.leagsoft.com/aicodex/aicodex-app",
		Description:    "Fixed public OIDC client for AICodex desktop login",
		Organization:   "built-in",
		Cert:           "cert-built-in",
		EnablePassword: true,
		EnableSignUp:   true,
		Providers: []*ProviderItem{
			{Name: "provider_captcha_default", CanSignUp: false, CanSignIn: false, CanUnlink: false, Prompted: false, SignupGroup: "", Rule: "None", Provider: nil},
		},
		SigninMethods: []*SigninMethod{
			{Name: "Password", DisplayName: "Password", Rule: "All"},
			{Name: "Verification code", DisplayName: "Verification code", Rule: "All"},
			{Name: "WebAuthn", DisplayName: "WebAuthn", Rule: "None"},
			{Name: "Face ID", DisplayName: "Face ID", Rule: "None"},
		},
		SignupItems: []*SignupItem{
			{Name: "ID", Visible: false, Required: true, Prompted: false, Rule: "Random"},
			{Name: "Username", Visible: true, Required: true, Prompted: false, Rule: "None"},
			{Name: "Display name", Visible: true, Required: true, Prompted: false, Rule: "None"},
			{Name: "Password", Visible: true, Required: true, Prompted: false, Rule: "None"},
			{Name: "Confirm password", Visible: true, Required: true, Prompted: false, Rule: "None"},
			{Name: "Email", Visible: true, Required: true, Prompted: false, Rule: "Normal"},
			{Name: "Phone", Visible: true, Required: false, Prompted: false, Rule: "None"},
			{Name: "Agreement", Visible: true, Required: true, Prompted: false, Rule: "None"},
		},
		Scopes:               scopeItemsForAICodexDesktop(),
		GrantTypes:           append([]string{}, aicodexDesktopGrantTypes...),
		Tags:                 []string{"aicodex", "desktop", "oidc"},
		ClientId:             AICodexDesktopApplicationClientID,
		PublicClient:         true,
		PkceRequired:         true,
		RedirectUris:         []string{AICodexDesktopApplicationRedirectURI},
		TokenFormat:          "JWT-Standard",
		TokenSigningMethod:   "RS256",
		TokenFields:          []string{},
		ExpireInHours:        1,
		RefreshExpireInHours: 720,
		FormOffset:           2,
		CookieExpireInHours:  720,
	}
}

func initAICodexDesktopApplication() {
	application, err := getApplication(AICodexDesktopApplicationOwner, AICodexDesktopApplicationName)
	if err != nil {
		panic(err)
	}
	applicationId := ""
	if application == nil {
		application, err = GetApplicationByClientId(AICodexDesktopApplicationClientID)
		if err != nil {
			panic(err)
		}
		if application != nil {
			applicationId = application.GetId()
		}
	}
	if application == nil {
		application = newAICodexDesktopApplication()
		affected, err := AddApplication(application)
		if err != nil {
			panic(err)
		}
		if !affected {
			panic("failed to add AICodex desktop application: clientId already exists")
		}
		return
	}

	if ensureAICodexDesktopApplicationContract(application) {
		if applicationId != "" && applicationId != application.GetId() {
			if err := replaceFixedOIDCApplication(applicationId, application); err != nil {
				panic(err)
			}
			return
		}

		if applicationId == "" {
			applicationId = application.GetId()
		}
		affected, err := UpdateApplication(applicationId, application, true, "en")
		if err != nil {
			panic(err)
		}
		if !affected {
			panic("failed to update AICodex desktop application")
		}
	}
}

func replaceFixedOIDCApplication(oldApplicationId string, application *Application) error {
	oldOwner, oldName, err := util.GetOwnerAndNameFromIdWithError(oldApplicationId)
	if err != nil {
		return err
	}

	session := ormer.Engine.NewSession()
	defer session.Close()

	if err := session.Begin(); err != nil {
		return err
	}
	rollback := true
	defer func() {
		if rollback {
			_ = session.Rollback()
		}
	}()

	if oldName != application.Name {
		if err := applicationChangeTriggerWithSession(session, oldName, application.Name); err != nil {
			return err
		}
	}
	for _, providerItem := range application.Providers {
		providerItem.Provider = nil
	}

	affected, err := session.ID(core.PK{oldOwner, oldName}).Delete(&Application{})
	if err != nil {
		return err
	}
	if affected == 0 {
		return fmt.Errorf("legacy AICodex desktop application %s does not exist", oldApplicationId)
	}

	affected, err = session.Insert(application)
	if err != nil {
		return err
	}
	if affected == 0 {
		return fmt.Errorf("failed to insert fixed AICodex desktop application")
	}

	if err := session.Commit(); err != nil {
		return err
	}
	rollback = false
	return nil
}

func ensureAICodexDesktopApplicationContract(application *Application) bool {
	if application == nil {
		return false
	}

	changed := false
	if application.Owner != AICodexDesktopApplicationOwner {
		application.Owner = AICodexDesktopApplicationOwner
		changed = true
	}
	if application.Name != AICodexDesktopApplicationName {
		application.Name = AICodexDesktopApplicationName
		changed = true
	}
	if application.DisplayName == "" {
		application.DisplayName = "AICodex Desktop"
		changed = true
	}
	if application.Category == "" {
		application.Category = "Default"
		changed = true
	}
	if application.Type == "" {
		application.Type = "All"
		changed = true
	}
	if application.Organization == "" {
		application.Organization = "built-in"
		changed = true
	}
	if application.Cert == "" {
		application.Cert = "cert-built-in"
		changed = true
	}
	if application.ClientId != AICodexDesktopApplicationClientID {
		application.ClientId = AICodexDesktopApplicationClientID
		changed = true
	}
	if !application.PublicClient {
		application.PublicClient = true
		changed = true
	}
	if !application.PkceRequired {
		application.PkceRequired = true
		changed = true
	}
	if application.ClientSecret != "" {
		application.ClientSecret = ""
		changed = true
	}
	if !aicodexDesktopStringSliceContains(application.RedirectUris, AICodexDesktopApplicationRedirectURI) {
		application.RedirectUris = append(application.RedirectUris, AICodexDesktopApplicationRedirectURI)
		changed = true
	}
	for _, grantType := range aicodexDesktopGrantTypes {
		if !aicodexDesktopStringSliceContains(application.GrantTypes, grantType) {
			application.GrantTypes = append(application.GrantTypes, grantType)
			changed = true
		}
	}
	for _, scope := range scopeItemsForAICodexDesktop() {
		if !scopeItemsContain(application.Scopes, scope.Name) {
			application.Scopes = append(application.Scopes, scope)
			changed = true
		}
	}
	if application.TokenFormat != "JWT-Standard" {
		application.TokenFormat = "JWT-Standard"
		changed = true
	}
	if application.TokenSigningMethod != "RS256" {
		application.TokenSigningMethod = "RS256"
		changed = true
	}
	if application.ExpireInHours <= 0 {
		application.ExpireInHours = 1
		changed = true
	}
	if application.RefreshExpireInHours < application.ExpireInHours {
		application.RefreshExpireInHours = 720
		changed = true
	}
	if application.CookieExpireInHours == 0 {
		application.CookieExpireInHours = 720
		changed = true
	}
	if application.Tags == nil {
		application.Tags = []string{}
		changed = true
	}
	return changed
}

func scopeItemsForAICodexDesktop() []*ScopeItem {
	return []*ScopeItem{
		{Name: "openid", DisplayName: "OpenID", Description: "OpenID Connect identity scope"},
		{Name: "profile", DisplayName: "Profile", Description: "Basic user profile"},
		{Name: "email", DisplayName: "Email", Description: "User email"},
		{Name: "offline_access", DisplayName: "Offline access", Description: "Refresh-token access for long-lived desktop sessions"},
		{Name: AICodexGatewayRuntimeScope, DisplayName: "AICodex Gateway", Description: "Runtime access to AICodex Gateway"},
	}
}

func scopeItemsContain(items []*ScopeItem, name string) bool {
	for _, item := range items {
		if item != nil && item.Name == name {
			return true
		}
	}
	return false
}

func aicodexDesktopStringSliceContains(items []string, value string) bool {
	for _, item := range items {
		if item == value {
			return true
		}
	}
	return false
}

func isAICodexDesktopApplication(application *Application) bool {
	return application != nil && application.ClientId == AICodexDesktopApplicationClientID
}

func isPublicClientPkceRequired(application *Application) bool {
	return application != nil && application.PublicClient && application.PkceRequired
}

func isPublicClientPkceChallengeMissing(application *Application, challenge string) bool {
	return isPublicClientPkceRequired(application) && strings.TrimSpace(challenge) == ""
}

func validatePublicClientPkceRequest(application *Application, challengeMethod string, challenge string) string {
	if !isPublicClientPkceRequired(application) {
		return ""
	}
	if strings.TrimSpace(challengeMethod) != "S256" {
		return publicClientPkceRequiredMessage
	}
	if !publicClientPkceChallengePattern.MatchString(strings.TrimSpace(challenge)) {
		return publicClientPkceRequiredMessage
	}
	return ""
}

func validatePublicClientPkceVerifier(application *Application, verifier string) string {
	if !isPublicClientPkceRequired(application) {
		return ""
	}
	if !publicClientPkceVerifierPattern.MatchString(strings.TrimSpace(verifier)) {
		return publicClientPkceVerifierMessage
	}
	return ""
}
