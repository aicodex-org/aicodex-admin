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
	"io"
	"net/http"
	"time"

	"github.com/beego/beego/v2/core/logs"
	"golang.org/x/oauth2"
)

// WeComInternalIdProvider
// This idp is using wecom internal application api as idp
type WeComInternalIdProvider struct {
	Client *http.Client
	Config *oauth2.Config

	UseIdAsName bool
}

func NewWeComInternalIdProvider(clientId string, clientSecret string, redirectUrl string, useIdAsName bool) *WeComInternalIdProvider {
	idp := &WeComInternalIdProvider{}

	config := idp.getConfig(clientId, clientSecret, redirectUrl)
	idp.Config = config
	idp.UseIdAsName = useIdAsName

	return idp
}

func (idp *WeComInternalIdProvider) SetHttpClient(client *http.Client) {
	idp.Client = client
}

func (idp *WeComInternalIdProvider) getConfig(clientId string, clientSecret string, redirectUrl string) *oauth2.Config {
	config := &oauth2.Config{
		ClientID:     clientId,
		ClientSecret: clientSecret,
		RedirectURL:  redirectUrl,
	}

	return config
}

type WecomInterToken struct {
	Errcode     int    `json:"errcode"`
	Errmsg      string `json:"errmsg"`
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// GetToken use code get access_token (*operation of getting code ought to be done in front)
// get more detail via: https://developer.work.weixin.qq.com/document/path/91039
func (idp *WeComInternalIdProvider) GetToken(code string) (*oauth2.Token, error) {
	pTokenParams := &struct {
		CorpId     string `json:"corpid"`
		Corpsecret string `json:"corpsecret"`
	}{idp.Config.ClientID, idp.Config.ClientSecret}
	resp, err := idp.Client.Get(fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=%s&corpsecret=%s", pTokenParams.CorpId, pTokenParams.Corpsecret))
	if err != nil {
		return nil, err
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	pToken := &WecomInterToken{}
	err = json.Unmarshal(data, pToken)
	if err != nil {
		return nil, err
	}
	if pToken.Errcode != 0 {
		return nil, fmt.Errorf("pToken.Errcode = %d, pToken.Errmsg = %s", pToken.Errcode, pToken.Errmsg)
	}

	token := &oauth2.Token{
		AccessToken: pToken.AccessToken,
		Expiry:      time.Unix(time.Now().Unix()+int64(pToken.ExpiresIn), 0),
	}

	raw := make(map[string]interface{})
	raw["code"] = code
	token = token.WithExtra(raw)

	return token, nil
}

type WecomInternalUserResp struct {
	Errcode    int    `json:"errcode"`
	Errmsg     string `json:"errmsg"`
	UserId     string `json:"UserId"`
	OpenId     string `json:"OpenId"`
	Userid     string `json:"userid"`
	Openid     string `json:"openid"`
	UserTicket string `json:"user_ticket"`
}

type WecomInternalUserInfo struct {
	Errcode int    `json:"errcode"`
	Errmsg  string `json:"errmsg"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	BizMail string `json:"biz_mail"`
	Mobile  string `json:"mobile"`
	Avatar  string `json:"avatar"`
	OpenId  string `json:"open_userid"`
	UserId  string `json:"userid"`
}

type WecomInternalUserDetailRequest struct {
	UserTicket string `json:"user_ticket"`
}

func (idp *WeComInternalIdProvider) GetUserInfo(token *oauth2.Token) (*UserInfo, error) {
	accessToken := token.AccessToken
	code := token.Extra("code").(string)
	resp, err := idp.Client.Get(fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=%s&code=%s", accessToken, code))
	if err != nil {
		return nil, err
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	userResp := &WecomInternalUserResp{}
	err = json.Unmarshal(data, userResp)
	if err != nil {
		return nil, err
	}
	if userResp.Errcode != 0 {
		return nil, fmt.Errorf("userIdResp.Errcode = %d, userIdResp.Errmsg = %s", userResp.Errcode, userResp.Errmsg)
	}
	openID := firstNonEmpty(userResp.OpenId, userResp.Openid)
	userID := firstNonEmpty(userResp.UserId, userResp.Userid)
	if openID != "" {
		return nil, fmt.Errorf("not an internal user")
	}

	infoResp := &WecomInternalUserInfo{}

	if userResp.UserTicket != "" {
		requestBody, err := json.Marshal(&WecomInternalUserDetailRequest{UserTicket: userResp.UserTicket})
		if err != nil {
			return nil, err
		}
		resp, err = idp.Client.Post(
			fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/auth/getuserdetail?access_token=%s", accessToken),
			"application/json;charset=UTF-8",
			bytes.NewReader(requestBody),
		)
		if err != nil {
			return nil, err
		}

		data, err = io.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		err = json.Unmarshal(data, infoResp)
		if err != nil {
			return nil, err
		}
	}

	if infoResp.Errcode != 0 {
		return nil, fmt.Errorf("userInfoResp.errcode = %d, userInfoResp.errmsg = %s", infoResp.Errcode, infoResp.Errmsg)
	}

	if userID != "" && shouldFetchWeComContactUserInfo(infoResp) {
		contactResp, err := idp.getContactUserInfo(accessToken, userID)
		if err != nil {
			logs.Warning("wecom internal contact supplement failed: userid=%s error=%s", userID, err.Error())
			if infoResp.UserId == "" {
				return nil, err
			}
		} else if contactResp.Errcode != 0 {
			logs.Warning("wecom internal contact supplement failed: userid=%s errcode=%d errmsg=%s", userID, contactResp.Errcode, contactResp.Errmsg)
			if infoResp.UserId == "" {
				return nil, fmt.Errorf("contactUserInfoResp.errcode = %d, contactUserInfoResp.errmsg = %s", contactResp.Errcode, contactResp.Errmsg)
			}
		} else {
			// 敏感授权接口可能只返回 userid，不返回手机号/邮箱；通讯录详情可作为同源应用的非空补充。
			mergeWeComInternalUserInfo(infoResp, contactResp)
		}
	}

	resolvedUserID := firstNonEmpty(infoResp.UserId, userID)
	userInfo := UserInfo{
		Id:          resolvedUserID,
		Username:    infoResp.Name,
		DisplayName: infoResp.Name,
		// 企业微信可能只返回企业邮箱 biz_mail，这里作为登录邮箱兜底。
		Email:     firstNonEmpty(infoResp.Email, infoResp.BizMail),
		Phone:     infoResp.Mobile,
		AvatarUrl: infoResp.Avatar,
	}

	if userInfo.Id == "" {
		userInfo.Id = userInfo.Username
	}

	if idp.UseIdAsName {
		userInfo.Username = userInfo.Id
	}

	return &userInfo, nil
}

func (idp *WeComInternalIdProvider) getContactUserInfo(accessToken string, userID string) (*WecomInternalUserInfo, error) {
	resp, err := idp.Client.Get(fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=%s&userid=%s", accessToken, userID))
	if err != nil {
		return nil, err
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	infoResp := &WecomInternalUserInfo{}
	err = json.Unmarshal(data, infoResp)
	if err != nil {
		return nil, err
	}
	return infoResp, nil
}

// 企业微信授权详情可能只返回 userid；缺少展示名、联系方式或头像时再尝试通讯录详情补齐。
func shouldFetchWeComContactUserInfo(infoResp *WecomInternalUserInfo) bool {
	if infoResp == nil || infoResp.UserId == "" {
		return true
	}
	return infoResp.Name == "" || infoResp.Mobile == "" || firstNonEmpty(infoResp.Email, infoResp.BizMail) == "" || infoResp.Avatar == ""
}

// 只用通讯录详情中的非空字段补充登录详情，避免空值覆盖已拿到的授权字段。
func mergeWeComInternalUserInfo(target *WecomInternalUserInfo, supplement *WecomInternalUserInfo) {
	if target == nil || supplement == nil {
		return
	}
	target.UserId = firstNonEmpty(target.UserId, supplement.UserId)
	target.Name = firstNonEmpty(target.Name, supplement.Name)
	target.Email = firstNonEmpty(target.Email, supplement.Email)
	target.BizMail = firstNonEmpty(target.BizMail, supplement.BizMail)
	target.Mobile = firstNonEmpty(target.Mobile, supplement.Mobile)
	target.Avatar = firstNonEmpty(target.Avatar, supplement.Avatar)
	target.OpenId = firstNonEmpty(target.OpenId, supplement.OpenId)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}

	return ""
}
