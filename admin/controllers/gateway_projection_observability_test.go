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
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

func TestGatewayProjectionIngestionStatusErrorMessageIsSanitized(t *testing.T) {
	message := gatewayProjectionIngestionStatusErrorMessage(object.GatewayProjectionIngestionStatusResult{
		Status:          object.GatewayProjectionIngestionStatusProviderUnavailable,
		FailureCategory: object.GatewayProjectionIngestionStatusProviderUnavailable,
	})
	if !strings.Contains(message, object.GatewayProjectionIngestionStatusProviderUnavailable) {
		t.Fatalf("message = %q, want stable failure category", message)
	}
	for _, forbidden := range []string{"https://gateway.internal.invalid", "projection-secret", "Authorization", "Cookie"} {
		if strings.Contains(message, forbidden) {
			t.Fatalf("message leaked %q: %s", forbidden, message)
		}
	}
}
