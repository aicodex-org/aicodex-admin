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
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

// GetGatewayProjectionObservability
// @Title GetGatewayProjectionObservability
// @Tag Gateway Projection Observability API
// @Description 获取 admin-to-gateway projection producer 的脱敏运行态诊断；该响应不作为 gateway 授权事实来源。
// @Success 200 {object} object.GatewayProjectionObservabilitySnapshot "projection producer 运行态诊断"
// @router /gateway-projection/observability [get]
func (c *ApiController) GetGatewayProjectionObservability() {
	c.ResponseOk(object.GetGatewayProjectionObservabilitySnapshot(time.Now().UTC()))
}
