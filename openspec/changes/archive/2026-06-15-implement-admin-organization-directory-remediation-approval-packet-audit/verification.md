## Verification

- `openspec validate implement-admin-organization-directory-remediation-approval-packet-audit --strict` passed.
- `openspec validate --changes --strict` passed.
- `openspec validate --specs --strict` passed before archive.
- `git diff --check` passed.
- `yarn test OrganizationDirectoryQualityPage.test.js PlatformApiMappingBackend.test.js Setting.test.js --watchAll=false --runInBand` passed: 3 suites, 23 tests.
- `yarn build` passed and produced `web-admin/build`; build output is ignored and not part of this change.

## Go Test Note

Focused Go test commands were attempted from `admin/`:

- `go test ./object -run 'TestOrganizationDirectoryRemediationApprovalPacketAudit|TestOrganizationDirectoryRemediationApprovalPreview' -cover`
- `go test ./routers -run 'TestGetOrganizationDirectoryRemediationApprovalPacketAuditObjectUsesOrganizationQuery'`
- `go test ./controllers -run 'TestNewOrganizationDirectoryRemediationApprovalPacketAuditQuery'`
- `go build -p 1 -gcflags=all=-c=1 ./object`

On this workstation, Go compiled the large `object` package until the compiler invocation and then exited with code 1 without stdout/stderr. `go test -x -p 1` showed the failure occurred during compilation of the large `object` package, not during the new test assertions. The implementation was still covered by gofmt, static review, OpenSpec strict validation, controller/router/query tests added in source, and frontend focused Jest/build.
