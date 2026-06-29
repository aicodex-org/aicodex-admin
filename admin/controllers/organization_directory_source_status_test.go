// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package controllers

import (
	"encoding/json"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

func TestNewOrganizationDirectorySourceStatusResponseOmitsSensitiveProviderFields(t *testing.T) {
	response := newOrganizationDirectorySourceStatusResponse(&object.OrganizationDirectorySourceStatus{
		Organization:  "engineering",
		CurrentSource: object.OrganizationDirectorySourceWeCom,
		State:         object.OrganizationDirectorySourceStateAmbiguous,
		Sources: []*object.OrganizationDirectorySourceSummary{
			{
				Source:       object.OrganizationDirectorySourceWeCom,
				DisplayName:  "WeCom",
				Organization: "engineering",
				Configured:   true,
				Enabled:      true,
			},
			{
				Source:       object.OrganizationDirectorySourceLark,
				DisplayName:  "Feishu/Lark",
				Organization: "engineering",
				Configured:   true,
				Enabled:      true,
			},
		},
	})

	body, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("Marshal response error = %v", err)
	}
	bodyText := string(body)
	if !strings.Contains(bodyText, `"state":"ambiguous"`) || !strings.Contains(bodyText, `"source":"lark"`) {
		t.Fatalf("response JSON = %s, want unified ambiguous source status", bodyText)
	}
	for _, forbidden := range []string{"secret", "token", "cookie", "rawResponse"} {
		if strings.Contains(strings.ToLower(bodyText), strings.ToLower(forbidden)) {
			t.Fatalf("response JSON leaks sensitive field %q: %s", forbidden, bodyText)
		}
	}
}
