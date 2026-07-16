// Copyright 2021 The Casdoor Authors. All Rights Reserved.
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

package idp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/nyaruka/phonenumbers"
	"golang.org/x/oauth2"
)

type LarkIdProvider struct {
	Client     *http.Client
	Config     *oauth2.Config
	LarkDomain string
}

func NewLarkIdProvider(clientId string, clientSecret string, redirectUrl string, useGlobalEndpoint bool) *LarkIdProvider {
	idp := &LarkIdProvider{}

	if useGlobalEndpoint {
		idp.LarkDomain = "https://open.larksuite.com"
	} else {
		idp.LarkDomain = "https://open.feishu.cn"
	}

	config := idp.getConfig(clientId, clientSecret, redirectUrl)
	idp.Config = config
	return idp
}

func (idp *LarkIdProvider) SetHttpClient(client *http.Client) {
	idp.Client = client
}

// getConfig return a point of Config, which describes a typical 3-legged OAuth2 flow
func (idp *LarkIdProvider) getConfig(clientId string, clientSecret string, redirectUrl string) *oauth2.Config {
	endpoint := oauth2.Endpoint{
		TokenURL: idp.LarkDomain + "/open-apis/authen/v2/oauth/token",
	}

	config := &oauth2.Config{
		Scopes:       []string{},
		Endpoint:     endpoint,
		ClientID:     clientId,
		ClientSecret: clientSecret,
		RedirectURL:  redirectUrl,
	}

	return config
}

type LarkAccessToken struct {
	Code                  interface{} `json:"code"`
	Msg                   string      `json:"msg"`
	Error                 string      `json:"error"`
	ErrorDescription      string      `json:"error_description"`
	AccessToken           string      `json:"access_token"`
	TokenType             string      `json:"token_type"`
	ExpiresIn             int         `json:"expires_in"`
	RefreshToken          string      `json:"refresh_token"`
	RefreshTokenExpiresIn int         `json:"refresh_token_expires_in"`
	Scope                 string      `json:"scope"`
}

func (idp *LarkIdProvider) GetToken(code string) (*oauth2.Token, error) {
	params := &struct {
		GrantType    string `json:"grant_type"`
		ClientID     string `json:"client_id"`
		ClientSecret string `json:"client_secret"`
		Code         string `json:"code"`
		RedirectURI  string `json:"redirect_uri,omitempty"`
	}{"authorization_code", idp.Config.ClientID, idp.Config.ClientSecret, code, idp.Config.RedirectURL}

	data, err := idp.postWithBody(params, idp.Config.Endpoint.TokenURL)
	if err != nil {
		return nil, err
	}

	appToken := &LarkAccessToken{}
	err = json.Unmarshal(data, appToken)
	if err != nil {
		return nil, err
	}

	if !isLarkTokenCodeSuccess(appToken.Code) {
		return nil, fmt.Errorf("Lark token exchange: provider error code %s", formatLarkTokenCode(appToken.Code))
	}
	if appToken.AccessToken == "" {
		return nil, fmt.Errorf("Lark token exchange: invalid token response")
	}

	t := &oauth2.Token{
		AccessToken:  appToken.AccessToken,
		TokenType:    appToken.TokenType,
		RefreshToken: appToken.RefreshToken,
	}
	if t.TokenType == "" {
		t.TokenType = "Bearer"
	}
	if appToken.ExpiresIn > 0 {
		t.Expiry = time.Unix(time.Now().Unix()+int64(appToken.ExpiresIn), 0)
	}

	raw := make(map[string]interface{})
	raw["code"] = code
	raw["scope"] = appToken.Scope
	raw["refresh_token_expires_in"] = appToken.RefreshTokenExpiresIn
	t = t.WithExtra(raw)
	return t, nil
}

func isLarkTokenCodeSuccess(code interface{}) bool {
	switch value := code.(type) {
	case nil:
		return true
	case float64:
		return value == 0
	case string:
		return value == "" || value == "0"
	default:
		return false
	}
}

// formatLarkTokenCode 只保留可诊断的数值code，避免把第三方任意字符串字段带入普通错误。
func formatLarkTokenCode(code interface{}) string {
	switch value := code.(type) {
	case nil:
		return ""
	case float64:
		return fmt.Sprintf("%.0f", value)
	case string:
		if _, err := strconv.ParseInt(value, 10, 64); err != nil {
			return "unknown"
		}
		return value
	default:
		return "unknown"
	}
}

/*
{
    "code": 0,
    "msg": "success",
    "data": {
        "access_token": "u-6U1SbDiM6XIH2DcTCPyeub",
        "token_type": "Bearer",
        "expires_in": 7140,
        "name": "zhangsan",
        "en_name": "Three Zhang",
        "avatar_url": "www.feishu.cn/avatar/icon",
        "avatar_thumb": "www.feishu.cn/avatar/icon_thumb",
        "avatar_middle": "www.feishu.cn/avatar/icon_middle",
        "avatar_big": "www.feishu.cn/avatar/icon_big",
        "open_id": "ou-caecc734c2e3328a62489fe0648c4b98779515d3",
        "union_id": "on-d89jhsdhjsajkda7828enjdj328ydhhw3u43yjhdj",
        "email": "zhangsan@feishu.cn",
        "enterprise_email": "zhangsan@company.com",
        "user_id": "5d9bdxxx",
        "mobile": "+86130002883xx",
        "tenant_key": "736588c92lxf175d",
        "refresh_expires_in": 2591940,
        "refresh_token": "ur-t9HHgRCjMqGqIU9v05Zhos"
    }
}
*/

type LarkUserInfo struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		AccessToken      string `json:"access_token"`
		TokenType        string `json:"token_type"`
		ExpiresIn        int    `json:"expires_in"`
		Name             string `json:"name"`
		EnName           string `json:"en_name"`
		AvatarUrl        string `json:"avatar_url"`
		AvatarThumb      string `json:"avatar_thumb"`
		AvatarMiddle     string `json:"avatar_middle"`
		AvatarBig        string `json:"avatar_big"`
		OpenId           string `json:"open_id"`
		UnionId          string `json:"union_id"`
		Email            string `json:"email"`
		EnterpriseEmail  string `json:"enterprise_email"`
		UserId           string `json:"user_id"`
		Mobile           string `json:"mobile"`
		TenantKey        string `json:"tenant_key"`
		RefreshExpiresIn int    `json:"refresh_expires_in"`
		RefreshToken     string `json:"refresh_token"`
	} `json:"data"`
}

func (idp *LarkIdProvider) GetUserInfo(token *oauth2.Token) (*UserInfo, error) {
	req, err := http.NewRequest("GET", idp.LarkDomain+"/open-apis/authen/v1/user_info", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	data, err := executeIdPRequest(idp.Client, "Lark", "load profile", req)
	if err != nil {
		return nil, err
	}

	var larkUserInfo LarkUserInfo
	err = json.Unmarshal(data, &larkUserInfo)
	if err != nil {
		return nil, err
	}
	if larkUserInfo.Code != 0 {
		return nil, fmt.Errorf("Lark load profile: provider error code %d", larkUserInfo.Code)
	}

	// Use enterprise_email as fallback when email is empty
	email := larkUserInfo.Data.Email
	if email == "" {
		email = larkUserInfo.Data.EnterpriseEmail
	}

	// Use fallback mechanism for username: UserId -> UnionId -> OpenId
	username := larkUserInfo.Data.UserId
	if username == "" {
		username = larkUserInfo.Data.UnionId
	}
	if username == "" {
		username = larkUserInfo.Data.OpenId
	}

	var phoneNumber string
	var countryCode string
	if len(larkUserInfo.Data.Mobile) != 0 {
		phoneNumberParsed, err := phonenumbers.Parse(larkUserInfo.Data.Mobile, "")
		if err != nil {
			return nil, err
		}
		countryCode = phonenumbers.GetRegionCodeForNumber(phoneNumberParsed)
		phoneNumber = fmt.Sprintf("%d", phoneNumberParsed.GetNationalNumber())
	}

	userInfo := UserInfo{
		Id:          username,
		DisplayName: larkUserInfo.Data.Name,
		Username:    username,
		UnionId:     larkUserInfo.Data.UnionId,
		Email:       email,
		AvatarUrl:   larkUserInfo.Data.AvatarUrl,
		Phone:       phoneNumber,
		CountryCode: countryCode,
		Extra: map[string]string{
			"user_id":    larkUserInfo.Data.UserId,
			"open_id":    larkUserInfo.Data.OpenId,
			"union_id":   larkUserInfo.Data.UnionId,
			"tenant_key": larkUserInfo.Data.TenantKey,
		},
	}
	return &userInfo, nil
}

func (idp *LarkIdProvider) postWithBody(body interface{}, url string) ([]byte, error) {
	bs, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("Lark token exchange: encode request failed")
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(bs))
	if err != nil {
		return nil, fmt.Errorf("Lark token exchange: create request failed")
	}
	req.Header.Set("Content-Type", "application/json;charset=UTF-8")
	return executeIdPRequest(idp.Client, "Lark", "token exchange", req)
}

func (idp *LarkIdProvider) getHttpClient() *http.Client {
	return resolveIdPHTTPClient(idp.Client)
}
