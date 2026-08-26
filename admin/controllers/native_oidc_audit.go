package controllers

import (
	"fmt"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"github.com/beego/beego/v2/core/logs"
)

// nativeOIDCAuditEvent deliberately contains only low-cardinality aliases,
// boolean presence checks, stable results/error codes, and latency. Raw
// authorization codes, tokens, claims, user identifiers, and organization
// payloads have no field through which they can enter this log contract.
type nativeOIDCAuditEvent struct {
	Name                string
	Check               string
	Result              string
	ErrorCode           string
	CodePresent         bool
	AccessTokenPresent  bool
	IDTokenPresent      bool
	RefreshTokenPresent bool
	LatencyMS           int64
}

func recordNativeOIDCAudit(startedAt time.Time, event nativeOIDCAuditEvent) {
	event.LatencyMS = time.Since(startedAt).Milliseconds()
	logs.Info("%s", formatNativeOIDCAuditEvent(event))
}

func formatNativeOIDCAuditEvent(event nativeOIDCAuditEvent) string {
	return fmt.Sprintf(
		"event=%s client_alias=aicodex-ios check=%s result=%s error_code=%s code_present=%t access_token_present=%t id_token_present=%t refresh_token_present=%t latency_ms=%d",
		event.Name,
		event.Check,
		event.Result,
		event.ErrorCode,
		event.CodePresent,
		event.AccessTokenPresent,
		event.IDTokenPresent,
		event.RefreshTokenPresent,
		event.LatencyMS,
	)
}

func nativeOIDCTokenResult(value interface{}) nativeOIDCAuditEvent {
	event := nativeOIDCAuditEvent{Result: "failed", ErrorCode: object.EndpointError}
	switch token := value.(type) {
	case *object.TokenWrapper:
		event.Result = "success"
		event.ErrorCode = ""
		event.AccessTokenPresent = token.AccessToken != ""
		event.IDTokenPresent = token.IdToken != ""
		event.RefreshTokenPresent = token.RefreshToken != ""
	case *object.TokenError:
		event.Result = "rejected"
		event.ErrorCode = token.Error
	}
	return event
}
