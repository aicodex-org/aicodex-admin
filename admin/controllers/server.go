// Copyright 2026 The Casdoor Authors. All Rights Reserved.
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
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"git.leagsoft.com/aicodex/aicodex-admin/proxy"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/beego/beego/v2/server/web/pagination"
)

const mcpRegistryServersURL = "https://registry.modelcontextprotocol.io/v0/servers"

type mcpRegistryResponse struct {
	Servers []mcpRegistryServerItem `json:"servers"`
}

type mcpRegistryServerItem struct {
	Server mcpRegistryServer `json:"server"`
	Meta   struct {
		Official struct {
			Status   string `json:"status"`
			IsLatest bool   `json:"isLatest"`
		} `json:"io.modelcontextprotocol.registry/official"`
	} `json:"_meta"`
}

type mcpRegistryServer struct {
	Name        string               `json:"name"`
	Title       string               `json:"title"`
	Description string               `json:"description"`
	Version     string               `json:"version"`
	WebsiteURL  string               `json:"websiteUrl"`
	Repository  mcpRegistryURLHolder `json:"repository"`
	Remotes     []mcpRegistryRemote  `json:"remotes"`
}

type mcpRegistryURLHolder struct {
	URL string `json:"url"`
}

type mcpRegistryRemote struct {
	Type    string                   `json:"type"`
	URL     string                   `json:"url"`
	Headers []map[string]interface{} `json:"headers"`
}

type onlineServerResponse struct {
	Servers []*onlineServer `json:"servers"`
}

type onlineServer struct {
	ID             string                  `json:"id"`
	Name           string                  `json:"name"`
	Description    string                  `json:"description"`
	Tags           []string                `json:"tags"`
	Endpoints      map[string]string       `json:"endpoints"`
	Authentication *onlineServerAuth       `json:"authentication,omitempty"`
	Maintainer     *onlineServerMaintainer `json:"maintainer,omitempty"`
}

type onlineServerAuth struct {
	Type string `json:"type"`
}

type onlineServerMaintainer struct {
	Website string `json:"website"`
}

// GetServers
// @Title GetServers
// @Tag Server API
// @Description get servers
// @Param   owner     query    string  true        "The owner of servers"
// @Success 200 {array} object.Server The Response object
// @router /get-servers [get]
func (c *ApiController) GetServers() {
	owner := c.Ctx.Input.Query("owner")
	if owner == "admin" {
		owner = ""
	}

	limit := c.Ctx.Input.Query("pageSize")
	page := c.Ctx.Input.Query("p")
	field := c.Ctx.Input.Query("field")
	value := c.Ctx.Input.Query("value")
	sortField := c.Ctx.Input.Query("sortField")
	sortOrder := c.Ctx.Input.Query("sortOrder")

	if limit == "" || page == "" {
		servers, err := object.GetServers(owner)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		c.ResponseOk(servers)
		return
	}

	limitInt := util.ParseInt(limit)
	count, err := object.GetServerCount(owner, field, value)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	paginator := pagination.SetPaginator(c.Ctx, limitInt, count)
	servers, err := object.GetPaginationServers(owner, paginator.Offset(), limitInt, field, value, sortField, sortOrder)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(servers, paginator.Nums())
}

// GetOnlineServers
// @Title GetOnlineServers
// @Tag Server API
// @Description get online servers from the MCP registry
// @Success 200 {object} onlineServerResponse The Response object
// @router /get-online-servers [get]
func (c *ApiController) GetOnlineServers() {
	ctx, cancel := context.WithTimeout(c.Ctx.Request.Context(), 15*time.Second)
	defer cancel()

	servers, err := getOnlineServers(ctx)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(&onlineServerResponse{Servers: servers})
}

func getOnlineServers(ctx context.Context) ([]*onlineServer, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mcpRegistryServersURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	client := proxy.GetHttpClient(mcpRegistryServersURL)
	if client == nil {
		client = http.DefaultClient
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("failed to get MCP registry servers: %s", resp.Status)
	}

	var registryResponse mcpRegistryResponse
	if err = json.NewDecoder(resp.Body).Decode(&registryResponse); err != nil {
		return nil, err
	}

	servers := []*onlineServer{}
	for _, item := range registryResponse.Servers {
		if !item.Meta.Official.IsLatest {
			continue
		}

		server := normalizeOnlineServer(item)
		if server != nil {
			servers = append(servers, server)
		}
	}

	return servers, nil
}

func normalizeOnlineServer(item mcpRegistryServerItem) *onlineServer {
	remote := getProductionRemote(item.Server.Remotes)
	if remote.URL == "" {
		return nil
	}

	name := item.Server.Title
	if name == "" {
		name = item.Server.Name
	}

	tags := []string{}
	if remote.Type != "" {
		tags = append(tags, remote.Type)
	}
	if item.Meta.Official.Status != "" {
		tags = append(tags, item.Meta.Official.Status)
	}
	if item.Server.Version != "" {
		tags = append(tags, item.Server.Version)
	}

	website := item.Server.WebsiteURL
	if website == "" {
		website = item.Server.Repository.URL
	}

	authenticationType := "none"
	if len(remote.Headers) != 0 {
		authenticationType = "header"
	}

	return &onlineServer{
		ID:          item.Server.Name,
		Name:        name,
		Description: item.Server.Description,
		Tags:        tags,
		Endpoints: map[string]string{
			"production": remote.URL,
		},
		Authentication: &onlineServerAuth{Type: authenticationType},
		Maintainer:     &onlineServerMaintainer{Website: normalizeWebsiteHost(website)},
	}
}

func getProductionRemote(remotes []mcpRegistryRemote) mcpRegistryRemote {
	for _, remote := range remotes {
		if strings.HasPrefix(remote.URL, "http://") || strings.HasPrefix(remote.URL, "https://") {
			return remote
		}
	}

	return mcpRegistryRemote{}
}

func normalizeWebsiteHost(rawURL string) string {
	if rawURL == "" {
		return ""
	}

	parsedURL, err := url.Parse(rawURL)
	if err != nil || parsedURL.Host == "" {
		return rawURL
	}

	return parsedURL.Host
}

// GetServer
// @Title GetServer
// @Tag Server API
// @Description get server
// @Param   id     query    string  true        "The id ( owner/name ) of the server"
// @Success 200 {object} object.Server The Response object
// @router /get-server [get]
func (c *ApiController) GetServer() {
	id := c.Ctx.Input.Query("id")

	server, err := object.GetServer(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(server)
}

// UpdateServer
// @Title UpdateServer
// @Tag Server API
// @Description update server
// @Param   id     query    string  true        "The id ( owner/name ) of the server"
// @Param   body    body   object.Server  true        "The details of the server"
// @Success 200 {object} controllers.Response The Response object
// @router /update-server [post]
func (c *ApiController) UpdateServer() {
	id := c.Ctx.Input.Query("id")

	var server object.Server
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &server)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.Data["json"] = wrapActionResponse(object.UpdateServer(id, &server))
	c.ServeJSON()
}

// AddServer
// @Title AddServer
// @Tag Server API
// @Description add server
// @Param   body    body   object.Server  true        "The details of the server"
// @Success 200 {object} controllers.Response The Response object
// @router /add-server [post]
func (c *ApiController) AddServer() {
	var server object.Server
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &server)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.Data["json"] = wrapActionResponse(object.AddServer(&server))
	c.ServeJSON()
}

// DeleteServer
// @Title DeleteServer
// @Tag Server API
// @Description delete server
// @Param   body    body   object.Server  true        "The details of the server"
// @Success 200 {object} controllers.Response The Response object
// @router /delete-server [post]
func (c *ApiController) DeleteServer() {
	var server object.Server
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &server)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.Data["json"] = wrapActionResponse(object.DeleteServer(&server))
	c.ServeJSON()
}
