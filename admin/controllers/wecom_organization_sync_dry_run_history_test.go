// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package controllers

import (
	"net/http/httptest"
	"testing"
	"time"

	webcontext "github.com/beego/beego/v2/server/web/context"
)

func TestParseWecomDryRunHistoryTime(t *testing.T) {
	got, err := parseWecomDryRunHistoryTime("2026-06-18T10:00:00.123Z")
	if err != nil {
		t.Fatalf("parseWecomDryRunHistoryTime() error = %v", err)
	}
	want := time.Date(2026, 6, 18, 10, 0, 0, 123000000, time.UTC)
	if !got.Equal(want) {
		t.Fatalf("time = %s, want %s", got, want)
	}
	if _, err := parseWecomDryRunHistoryTime("bad-time"); err == nil {
		t.Fatalf("parseWecomDryRunHistoryTime(invalid) expected error")
	}
}

func TestGetWecomOrganizationSyncDryRunHistoryFilterParsesQuery(t *testing.T) {
	controller := newWecomOrganizationSyncDryRunHistoryTestController("/api/wecom-org-sync/dry-run-history?sourceConnectionIdHash=source-a&status=failed&diagnosticAlias=contact_permission_missing&createdFrom=2026-06-18T00:00:00Z&createdTo=2026-06-18T23:59:59Z&p=3&pageSize=10&sortField=createdAt&sortOrder=ascend")
	filter, err := controller.getWecomOrganizationSyncDryRunHistoryFilter("engineering")
	if err != nil {
		t.Fatalf("get filter error = %v", err)
	}
	if filter.Organization != "engineering" || filter.SourceConnectionIdHash != "source-a" || filter.Status != "failed" || filter.DiagnosticAlias != "contact_permission_missing" {
		t.Fatalf("filter identity fields = %+v", filter)
	}
	if filter.Offset != 20 || filter.Limit != 10 || filter.SortField != "createdAt" || filter.SortOrder != "ascend" {
		t.Fatalf("filter paging fields = %+v", filter)
	}
	if filter.CreatedFrom.IsZero() || filter.CreatedTo.IsZero() {
		t.Fatalf("filter time range = %+v", filter)
	}
}

func TestGetWecomOrganizationSyncDryRunHistoryFilterUsesLimitAndRejectsBadTime(t *testing.T) {
	controller := newWecomOrganizationSyncDryRunHistoryTestController("/api/wecom-org-sync/dry-run-history?limit=7&topN=3&createdFrom=bad-time")
	if _, err := controller.getWecomOrganizationSyncDryRunHistoryFilter("engineering"); err == nil {
		t.Fatalf("get filter with bad time expected error")
	}
	controller = newWecomOrganizationSyncDryRunHistoryTestController("/api/wecom-org-sync/dry-run-history?limit=7&topN=3")
	filter, err := controller.getWecomOrganizationSyncDryRunHistoryFilter("engineering")
	if err != nil {
		t.Fatalf("get filter error = %v", err)
	}
	if filter.Limit != 7 || filter.TopN != 3 || filter.Offset != 0 {
		t.Fatalf("filter = %+v, want limit/topN without offset", filter)
	}
}

func TestGetWecomOrganizationSyncRequestMarkerReadsSafeHeaders(t *testing.T) {
	controller := newWecomOrganizationSyncDryRunHistoryTestController("/api/wecom-org-sync/dry-run-history")
	controller.Ctx.Request.Header.Set("X-Request-Id", "req-1")
	if got := controller.getWecomOrganizationSyncRequestMarker(); got != "req-1" {
		t.Fatalf("request marker = %q, want req-1", got)
	}
	controller = newWecomOrganizationSyncDryRunHistoryTestController("/api/wecom-org-sync/dry-run-history")
	controller.Ctx.Request.Header.Set("X-Codex-Request-Id", "req-2")
	if got := controller.getWecomOrganizationSyncRequestMarker(); got != "req-2" {
		t.Fatalf("request marker = %q, want req-2", got)
	}
	controller = newWecomOrganizationSyncDryRunHistoryTestController("/api/wecom-org-sync/dry-run-history")
	controller.Ctx.Request.Header.Set("X-Trace-Id", "req-3")
	if got := controller.getWecomOrganizationSyncRequestMarker(); got != "req-3" {
		t.Fatalf("request marker = %q, want req-3", got)
	}
}

func newWecomOrganizationSyncDryRunHistoryTestController(target string) *ApiController {
	request := httptest.NewRequest("GET", target, nil)
	recorder := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(recorder, request)
	controller := &ApiController{}
	controller.Init(ctx, "ApiController", "GetWecomOrganizationSyncDryRunHistories", controller)
	return controller
}
