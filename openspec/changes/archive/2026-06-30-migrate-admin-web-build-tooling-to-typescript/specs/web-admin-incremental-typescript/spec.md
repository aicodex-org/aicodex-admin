## ADDED Requirements

### Requirement: Web Admin build tooling typed maintenance
`web-admin` SHALL support TypeScript-backed static validation for build tooling runtime scripts while preserving the existing JavaScript entry points consumed by CRACO and postbuild.

#### Scenario: Build tooling runtime entries remain compatible
- **WHEN** build tooling scripts are migrated for typed maintenance
- **THEN** `web-admin/craco.config.js` and `web-admin/mv.js` SHALL remain loadable by the existing `craco` and `node mv.js` commands
- **AND** the migration SHALL NOT require `ts-node` or any new production dependency at runtime
- **AND** `yarn start` and `yarn build` SHALL keep using the existing CRACO and postbuild entry paths

#### Scenario: CRACO behavior remains unchanged
- **WHEN** `craco.config.js` receives TypeScript-backed static validation
- **THEN** the dev proxy target fallback order, proxy route list, Less plugin options, webpack `build-temp` output path, source-map warning ignore predicate, and webpack fallback polyfill map SHALL remain behavior-compatible

#### Scenario: Postbuild behavior remains unchanged
- **WHEN** `mv.js` receives TypeScript-backed static validation
- **THEN** postbuild SHALL still fail with a non-zero exit when `build-temp` is absent
- **AND** postbuild SHALL still remove an existing `build` directory before moving `build-temp` to `build`
- **AND** postbuild SHALL still leave the observable result as `build-temp -> build`

#### Scenario: Build tooling typing is validated
- **WHEN** build tooling typed maintenance is prepared for review
- **THEN** a dedicated TypeScript static validation command SHALL cover `craco.config.js` and `mv.js`
- **AND** `openspec validate`, `git diff --check`, `yarn typecheck`, the incremental TypeScript gate, `yarn build`, and a postbuild rename smoke SHALL pass for the touched build tooling paths
