# AuditJS Modernisation Plan — v5.0.0

> **Status:** Draft for review — not to be committed to Git.
> **Target release:** v5.0.0 (semantic-release, breaking changes)
> **Date drafted:** 2026-05-13

---

## Executive Summary

This document captures the full modernisation scope for AuditJS targeting a v5.0.0 release. The driving goals are:

1. Replace OSS Index with Sonatype Guide (deprecate `ossi`, introduce `guide`)
2. Reflect the Nexus IQ Server → Sonatype Lifecycle rebrand (`iq` kept, `lifecycle` added as canonical)
3. Remediate applicable security findings from issue #287
4. Update all stale/vulnerable dependencies
5. Migrate test framework to Vitest
6. Migrate from Yarn to npm
7. Enforce TypeScript strict syntax throughout
8. Update all documentation (README, CONTRIBUTING, inline docs, CI examples)
9. Produce a dedicated v4 to v5 migration guide (MIGRATION.md)
10. Align with Sonatype Community Standards
11. Achieve zero Sonatype Lifecycle policy violations

---

## 1. Breaking Changes Summary (v5.0.0)

| Area | Change | Migration path |
|---|---|---|
| New command | `guide` replaces `ossi` as the primary public-facing scanner | Use `auditjs guide` instead of `auditjs ossi` |
| Deprecated command | `ossi` retained but prints a deprecation warning | Will be removed in v6 |
| New command alias | `lifecycle` added as canonical alias for `iq` | Use `auditjs lifecycle` going forward |
| Deprecated alias | `iq` retained, prints a deprecation warning | Will be removed in v6 |
| Node.js engine | Minimum bumped from `>=16.13.0` to `>=20.0.0` | Upgrade Node runtime |
| `node-fetch` removed | All HTTP now uses Node native `fetch` | No user-facing change |

---


## 3. Security Remediation (Issue #287)

> **Note on item 1 of issue #287 (hardcoded credentials):** This is **not** a valid security finding. The `admin`/`admin123` values referenced in the issue are the publicly-documented default credentials for an out-of-the-box Sonatype Lifecycle installation — they are not present in auditjs source code. The current `src/index.ts` sets no default values for `--user` or `--password`. A comment will be posted on issue #287 to clarify this and confirm no code change will be made.

### 3.1 `--insecure` flag — restrict and warn

The `--insecure` flag is a **required feature**, not a vulnerability. Some users operate Sonatype Lifecycle behind corporate infrastructure with self-signed or internal CA certificates.

Two changes are required:

1. **Add a runtime warning** when the flag is used:

```typescript
public static getAgent(insecure = false): Agent | undefined {
  if (insecure) {
    console.warn(
      'WARNING: --insecure disables TLS certificate validation. ' +
      'Do not use in production environments.'
    );
    return new HttpsAgent({ rejectUnauthorized: false });
  }
  return this.getHttpAgent();
}
```

2. **Restrict to Sonatype Lifecycle only.** Do not expose `--insecure` on the `guide` command. Sonatype Guide is a cloud service with a valid publicly-trusted TLS certificate; there is no legitimate use case for bypassing certificate validation against it.

### 3.2 Config file permissions

**File:** `src/Config/Config.ts:49` — `saveFile()` method

After writing the config file, apply restrictive permissions:

```typescript
import { chmodSync } from 'fs';
// ...
writeFileSync(this.getConfigLocation(), dump(objectToSave, { skipInvalid: true }));
chmodSync(this.getConfigLocation(), 0o600);
```

### 3.3 Allowlist path validation

**File:** `src/Whitelist/VulnerabilityExcluder.ts`

Validate that the user-supplied allowlist/whitelist path resolves to a regular file using `path.resolve()` and `fs.statSync()`. Keep it simple.

### 3.4 `js-yaml` deprecated API (`safeDump`)

**File:** `src/Config/Config.ts:7` — `safeDump` is removed in js-yaml v4.

```typescript
// Replace:
import { safeDump } from 'js-yaml';
// With (after upgrading js-yaml to ^4.x):
import { dump } from 'js-yaml';
```

---

## 4. OSS Index → Sonatype Guide Migration

### 4.1 New `guide` command

Add a new top-level command `guide [options]` to `src/index.ts` that mirrors the current `ossi` option surface but targets the Sonatype Guide API.

**CLI interface:**

```
auditjs guide [options]

Audit this application using Sonatype Guide

Options:
  --token, -t      Specify Sonatype Guide API token           [string]
  --server, -h     Specify Sonatype Guide server url          [string]
  --quiet, -q      Only print out vulnerable dependencies    [boolean]
  --json, -j       Set output to JSON                        [boolean]
  --xml, -x        Set output to JUnit XML format            [boolean]
  --allowlist, -w  Set path to allowlist file                 [string]
  --whitelist      Deprecated alias for --allowlist           [string]
  --bower          Force explicit scan for Bower             [boolean]
  --dev, -d        Include Development Dependencies          [boolean]
```

`--allowlist` is the canonical flag. `--whitelist` is accepted as a deprecated alias and emits a warning directing users to `--allowlist`. The deprecated `ossi` command retains `--whitelist` unchanged.

### 4.2 New files to create

Thanks to the `OSSIndexCompatibilityApi` discovery (see §13, Q2), the new surface is much smaller than originally anticipated. The existing formatters and result types are reused unchanged.

| File | Purpose |
|---|---|
| `src/Services/GuideRequestService.ts` | Thin wrapper over `OSSIndexCompatibilityApi`; handles chunking + 24hr cache via `node-persist` |
| `src/Config/GuideServerConfig.ts` | Config persistence for Guide credentials at `~/.sonatype-guide/` (same structure as `OssIndexServerConfig`) |
| `src/Services/GuideRequestService.spec.ts` | Vitest tests |
| `src/Config/GuideServerConfig.spec.ts` | Vitest tests |

**No new Audit class or result types needed** — `AuditOSSIndex`, `OssIndexServerResult`, and `Vulnerability` are reused directly by the `guide` command path. The Guide API response shape is identical.

### 4.3 Dependency to add

```json
"@sonatype/sonatype-guide-api-client": "^0.1.0"
```

Auth: HTTP Basic (`username` + `apiToken`) via `Configuration({ username, password })`. Default base: `https://api.guide.sonatype.com`. The `--server` flag overrides `basePath`.

### 4.4 Deprecation of `ossi`

In `src/index.ts`, wrap the existing `ossi` command handler to emit a deprecation warning at runtime before delegating:

```typescript
console.warn(
  'DEPRECATION: `auditjs ossi` is deprecated and will be removed in v6. ' +
  'Please migrate to `auditjs guide`.'
);
```

The `ossi` command must still function correctly in v5. Its underlying implementation (`OssIndexRequestService`, `AuditOSSIndex`, etc.) is **not** removed in this release.

### 4.5 `config` command update

The `auditjs config` interactive setup must present the following options:

1. **Sonatype Lifecycle** — host URL, username, token/password
2. **Sonatype Guide (Bearer Token)** — server URL, long-lived user token (created via Settings > API Tokens in the Guide UI); stored as `accessToken` in `GuideServerConfig`
3. **Sonatype Guide (OSS Index Compatibility — Username and Token)** — server URL, username, API token; stored as `username`/`password` and passed as HTTP Basic auth to `OSSIndexCompatibilityApi`

The deprecated OSS Index config option is retained but prints a deprecation notice directing users to option 3 above.

---

## 5. Sonatype Lifecycle / Nexus IQ Rebrand

### 5.1 Add `lifecycle` as canonical command alias

In `src/index.ts`, register `lifecycle` as a yargs command that internally delegates to the same handler as `iq`. The `iq` command emits a deprecation warning:

```typescript
// iq handler — add at top:
console.warn(
  'DEPRECATION: `auditjs iq` is deprecated and will be removed in v6. ' +
  'Please migrate to `auditjs lifecycle`.'
);
```

The `lifecycle` command should have an updated description:
```
Audit this application using Sonatype Lifecycle
```

### 5.2 Documentation updates

Update all occurrences of "Nexus IQ Server" throughout:
- `README.md` — command documentation sections, requirements section, config section
- `src/index.ts` — command descriptions
- `src/Application/Application.ts` — log messages and spinner text
- Any inline comments in `src/Services/IqRequestService.ts`

---

## 6. Dependency Updates

### 6.1 Production dependencies

| Package | Current | Action | Notes |
|---|---|---|---|
| `@sonatype/sonatype-guide-api-client` | — | **ADD** `^0.1.0` | New Guide API client |
| `@xmldom/xmldom` | `^0.8.5` | Update to `^0.9.x` | Check latest |
| `chalk` | `^3.0.0` | Update to `^4.1.2` | v5+ is ESM-only; v4 is the last CJS-compatible major |
| `colors` | `1.4.0` | **REMOVE** | Protestware incident; `chalk` already covers colour needs |
| `figlet` | `^1.2.4` | Update to latest | |
| `https-proxy-agent` | `^7.0.6` | Keep/update | Already reasonably current |
| `js-yaml` | `3.14.2` | Update to `^4.x` | `safeDump` → `dump`; breaking API change, see §3.5 |
| `log4js` | `^6.4.0` | Update to latest | |
| `node-fetch` | `^2.6.8` | **REMOVE** | Replace with Node 20 native `fetch` throughout |
| `node-persist` | `^3.1.0` | Evaluate | Cache mechanism; check if still maintained |
| `ora` | `^4.0.3` | Update to `^5.4.1` | v6+ is ESM-only; v5 is the last CJS-compatible major |
| `read-installed` | `~4.0.3` | Evaluate | Potentially unmaintained; assess alternatives (e.g. `@npmcli/arborist`) |
| `spdx-license-ids` | `^3.0.5` | Update to latest | |
| `ssri` | `^10.0.6` | Keep/update | |
| `uuid` | `^9.0.1` | Update to latest | |
| `xmlbuilder` | `^13.0.2` | Replace with `@cyclonedx/cyclonedx-library` | See §8 |
| `yargs` | `^16.1.0` | Update to `^17.x` | |

> **Note on `chalk` / `ora` ESM:** Both `chalk@5+` and `ora@6+` are ESM-only. auditjs compiles to CommonJS, so the correct targets are `chalk@^4.1.2` and `ora@^5.4.1` — the last CJS-compatible majors (confirmed by inspecting their `package.json` `"type"` fields). A future ESM build migration would unlock the latest majors.

> **Note on `read-installed`:** This is a core dependency for the `NpmList` muncher. It reads the installed package tree from `node_modules`. Before removing, validate that a drop-in replacement exists. `@npmcli/arborist` is the official npm successor. This evaluation should happen early in the implementation phase.

### 6.2 Dev dependencies

| Package | Current | Action | Notes |
|---|---|---|---|
| `@types/chai` | `4.2.0` | **REMOVE** | Replaced by Vitest |
| `@types/chai-as-promised` | `7.1.1` | **REMOVE** | Replaced by Vitest |
| `@types/mocha` | `5.2.7` | **REMOVE** | Replaced by Vitest |
| `@types/mock-fs` | `^4.10.0` | Keep or update | Evaluate with Vitest |
| `@types/node` | `^18.0.0` | Update to `^20.0.0` | Match engine requirement |
| `@types/node-fetch` | `^2.5.4` | **REMOVE** | `node-fetch` removed |
| `@types/sinon` | `^7.5.1` | **REMOVE** | Replaced by Vitest mocks |
| `@types/ssri` | `^7.1.5` | Update to match `ssri` version |  |
| `@typescript-eslint/eslint-plugin` | `^6.13.2` | Update to `^8.x` | Matches ESLint v9 |
| `@typescript-eslint/parser` | `^6.13.2` | Update to `^8.x` | |
| `chai` | `4.2.0` | **REMOVE** | Replaced by Vitest |
| `chai-as-promised` | `7.1.1` | **REMOVE** | Replaced by Vitest |
| `eslint` | `^7.1.0` | Update to `^9.x` | Flat config format (`eslint.config.js`) |
| `eslint-config-prettier` | `^6.10.0` | Update to `^10.x` | |
| `eslint-plugin-prettier` | `^3.1.2` | Update to `^5.x` | |
| `mocha` | `^8.3.1` | **REMOVE** | Replaced by Vitest |
| `mocha-junit-reporter` | `^1.23.3` | **REMOVE** | Replaced by Vitest JUnit reporter |
| `nock` | `11.7.0` | **REMOVE** | Replaced by `msw` or Vitest `vi.spyOn(globalThis, 'fetch')` |
| `nyc` | `^15.0.0` | **REMOVE** | Replaced by `@vitest/coverage-v8` |
| `prettier` | `^1.19.1` | Update to `^3.x` | |
| `rimraf` | `^4.0.0` | Update to `^6.x` or use `node --rm` | |
| `sinon` | `^8.0.2` | **REMOVE** | Replaced by Vitest |
| `ts-node` | `^8.5.4` | **REMOVE** | No longer needed with Vitest |
| `typescript` | `^5.3.3` | Update to `^5.4+` | |
| **`vitest`** | — | **ADD** `^2.x` | Test runner |
| **`@vitest/coverage-v8`** | — | **ADD** | Coverage |
| **`msw`** | — | **ADD** `^2.x` | HTTP mocking for Vitest (replaces nock) |

### 6.3 Package.json engine and scripts

```json
"engines": {
  "node": ">=20.0.0"
},
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test-ci": "vitest run --reporter=junit --outputFile=reports/test-results.xml",
  "coverage": "vitest run --coverage",
  "build": "tsc -p tsconfig.json",
  "lint": "eslint src/**/*.ts",
  "start": "node ./bin/index.js",
  "prepare": "yarn build",
  "prepublishOnly": "yarn test"
}
```

Remove the `iq-scan` npm script (references `npx auditjs@latest iq`).

---

## 7. Test Framework Migration — Mocha → Vitest

### 7.1 Rationale

Vitest is TypeScript-native (no `ts-node` shim required), has a Jest-compatible API, uses native ES modules, provides built-in coverage via V8, and supports concurrent test execution. It eliminates the `mocha` + `sinon` + `nock` + `ts-node` + `nyc` stack with a single dependency.

### 7.2 tsconfig changes

Vitest requires `"module": "esnext"` or `"moduleResolution": "bundler"` in the tsconfig used for tests. Create a `tsconfig.test.json` that extends the main config:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}
```

The production `tsconfig.json` keeps `"module": "commonjs"` for the CLI output.

Update `tsconfig.json` compiler target while here:

```json
"target": "es2020",
"lib": ["es2020"]
```

### 7.3 `vitest.config.ts` (new file)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 70,
        functions: 70,
      },
    },
  },
});
```

### 7.4 Test file rewrites

Each `*.spec.ts` file needs migration. The changes are mechanical:

| Before | After |
|---|---|
| `import { expect } from 'chai'` | `import { expect, vi, describe, it, beforeEach } from 'vitest'` |
| `import sinon from 'sinon'` | Use `vi.fn()`, `vi.spyOn()` |
| `import nock from 'nock'` | Use `msw` handlers or `vi.spyOn(globalThis, 'fetch')` |
| `import mock from 'mock-fs'` | Evaluate — `mock-fs` may still work under Vitest |
| `chai-as-promised` async assertions | Vitest native async support (`await expect(promise).rejects.toThrow()`) |
| `sinon.stub(obj, 'method')` | `vi.spyOn(obj, 'method')` |
| `stub.returns(val)` | `.mockReturnValue(val)` |
| `stub.resolves(val)` | `.mockResolvedValue(val)` |

Affected spec files:
- `src/Application/Application.spec.ts`
- `src/Audit/AuditIQServer.spec.ts`
- `src/Audit/AuditOSSIndex.spec.ts`
- `src/Config/IqServerConfig.spec.ts`
- `src/Config/OssIndexServerConfig.spec.ts`
- `src/CycloneDX/CycloneDXSbomCreator.spec.ts`
- `src/Services/IqRequestService.spec.ts`
- `src/Services/OssIndexRequestService.spec.ts`
- `src/Services/RequestHelpers.spec.ts`
- `src/Whitelist/VulnerabilityExcluder.spec.ts`

Plus new spec files for Guide components (§4.2).

### 7.5 Coverage in CI

Replace the coverage upload steps in CI workflows:

```yaml
- name: Run tests with coverage
  run: yarn coverage

- name: Upload coverage
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: coverage
    path: coverage/lcov.info
```

Issue #273 (fix coverage targets in CI) is resolved by this migration.

---

## 8. CycloneDX — Why It Exists and What to Change (Issue #263)

### 8.1 Why auditjs contains SBOM generation

There are two distinct reasons SBOM generation exists in auditjs, and they serve different purposes:

**1. Sonatype Lifecycle (`iq`/`lifecycle`) integration — internal, required**
The Third-Party Scan REST API that Sonatype Lifecycle exposes expects a **CycloneDX XML payload**. Submitting a SBOM is not optional — it is the entire wire protocol for the `iq` command. `CycloneDXSbomCreator` generates this payload internally via `NpmList.getSbomFromCommand()`, which `Application.populateCoordinatesForIQ()` calls before POSTing to IQ Server. Without this, Lifecycle integration does not work.

**2. `auditjs sbom` subcommand — user-facing, convenience**
The `sbom` sub-command (nested under `ossi` in the CLI) pipes the same CycloneDX SBOM to stdout. This lets users export their dependency bill of materials for use in other tools (e.g., uploading to a different SCA scanner, archiving for compliance). It is entirely optional but a useful standalone feature.

**The OSS Index / Guide path does not use SBOM at all** — it extracts PURLs directly from `node_modules` and POSTs them to the batch component-report endpoint.

### 8.2 Current state problems

- The hand-rolled implementation targets **CycloneDX BOM spec 1.1** (released ~2019). The current spec is **1.6**. The SBOM submitted to Lifecycle is therefore outdated.
- `xmlbuilder` is used for XML serialisation — a dev tool not designed for spec-compliant SBOM generation.
- `read-installed` is used to traverse `node_modules` — same unmaintained dependency noted in §6.1.
- The `NpmShrinkwrap` muncher class (`src/Munchers/NpmShrinkwrap.ts`) is a stub — all methods throw `'Method not implemented.'`. It should either be implemented or removed.

### 8.3 Resolution — adopt `@cyclonedx/cyclonedx-library` (Issue #263)

Replace `src/CycloneDX/CycloneDXSbomCreator.ts` with a wrapper over `@cyclonedx/cyclonedx-library`. This library is the official, actively-maintained CycloneDX TypeScript implementation that tracks the current spec, handles both XML and JSON serialisation, and is already used by the official `@cyclonedx/cyclonedx-npm` CLI.

**Changes:**
- Add `@cyclonedx/cyclonedx-library` as a production dependency
- Refactor `CycloneDXSbomCreator` to use the library's model + serialiser
- Remove `xmlbuilder` from production dependencies
- Remove `src/Munchers/NpmShrinkwrap.ts` (dead stub) — or implement it properly as a follow-up (#289 scope)
- Update SBOM schema version in Lifecycle submission from 1.1 to the library's current default
- The `auditjs sbom` subcommand output improves automatically as a side-effect

---

## 9. Sonatype Community Standards — Gaps and Fixes

Reference: https://contribute.sonatype.com/docs/

> **Note on `SECURITY.md` and `CODE_OF_CONDUCT.md`:** Neither file is required at the individual repository level. Both are provided at the organisation level via `sonatype-nexus-community/.github`, which GitHub surfaces automatically for all repos in the org that do not override them. Creating copies here would shadow the org defaults. The published Sonatype Community Standards documentation should be updated to make this org-level inheritance explicit.

### 9.1 Documentation scope

All documentation files receive updates in this modernisation — no documentation is treated as out of scope. This includes `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, all inline comments affected by renamed commands or deprecated APIs, and CI workflow comments.

### 9.2 `MIGRATION.md` — new file

Create `MIGRATION.md` at the repo root documenting the upgrade path from v4 to v5:

- Summary of breaking changes
- `auditjs ossi` to `auditjs guide` (credentials, config file location)
- `auditjs iq` to `auditjs lifecycle` (command rename only, no config change)
- `--whitelist` to `--allowlist` on the `guide` command
- Node.js version requirement change (>=16 to >=20)
- npm replacing yarn for development workflow

Add a "Upgrading from v4" section to `README.md` that links to `MIGRATION.md`.

### 9.3 `CONTRIBUTING.md` — stale references

- **Remove Gitter references** — Gitter is defunct. Replace with the Sonatype Community Forum link (`community.sonatype.com`) or GitHub Discussions if enabled.
- **Remove CircleCI references** — CI is now GitHub Actions. Update PR instructions accordingly.
- **Remove the CLA URL** — The CLA is handled by an interactive GitHub bot; no URL is needed in CONTRIBUTING.md
- **Update lint instruction** — Replace the manual "Spaces (not tabs)" note with `npm run lint` (enforced by Prettier + ESLint)

### 9.4 `README.md` — required updates

- Remove all references to "Nexus IQ Server"; replace with "Sonatype Lifecycle"
- Add `auditjs guide` command to the primary usage section; mark `auditjs ossi` as deprecated
- Remove hardcoded default credential references in the IQ usage section (see §3.1)
- Update Node.js requirement from "8.x forward" to ">=20"
- **Add SonarCloud quality badge** — once the SonarCloud project is configured, add: `[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=<KEY>&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=<KEY>)`. Do **not** add a SECURITY.md badge.
- Replace all `yarn` command examples with `npm run` equivalents
- Update CI section: remove Travis CI / CircleCI references; replace with GitHub Actions examples
- Add "Upgrading from v4" section linking to `MIGRATION.md`

### 9.5 `.releaserc` — verify semantic-release config

Confirm the release workflow matches the current `semantic-release` version installed globally (`@23`). Pin the version in the release step rather than relying on a global install:

```yaml
- name: Install publishing packages
  run: npm install -g semantic-release@23 @semantic-release/changelog@6 @semantic-release/git@10 @semantic-release/npm@10
- name: Attempt publish
  run: npx semantic-release
```

---

## 10. Yarn → npm Migration

auditjs currently uses Yarn as its package manager (`yarn.lock`, `yarn` in all scripts and CI). There is no yarn-specific functionality in the source code — it is used purely for dependency management. Migrating to standard npm removes a toolchain dependency and aligns with the broader npm ecosystem.

### 10.1 Package manager changes

| Item | Current | After |
|---|---|---|
| Lock file | `yarn.lock` | `package-lock.json` |
| Install command | `yarn install` | `npm ci` (CI) / `npm install` (dev) |
| Run script | `yarn <script>` | `npm run <script>` |
| Global install | `yarn global add` | `npm install -g` |
| Dependency resolutions | `"resolutions": {}` (yarn-only) | `"overrides": {}` (npm >=8.3) |
| Prod-only install | `yarn install --prod` | `npm ci --omit=dev` |

### 10.2 `package.json` changes

- Replace the `"resolutions"` block with an `"overrides"` block (same key-value pairs; npm syntax is identical for most entries)
- Remove `@yarnpkg/lockfile` and `@types/yarnpkg__lockfile` from `devDependencies` — these are Yarn internals with no usage in the source code
- Update the `iq-scan` script reference from `npx auditjs@latest` to keep as-is (no yarn dependency)

### 10.3 CI workflow changes (all three files)

```yaml
# setup-node cache:
cache: 'npm'         # was 'yarn'

# install:
run: npm ci          # was 'yarn install'

# scripts:
run: npm run lint    # was 'yarn lint'
run: npm run build   # was 'yarn build'
run: npm run test-ci # was 'yarn test-ci'

# release workflow only:
run: npm install -g semantic-release@23 ...  # was 'yarn global add'
run: npx semantic-release                    # was 'yarn exec semantic-release'

# Lifecycle scan (prod-only install):
run: npm ci --omit=dev  # was 'yarn install --prod'
```

### 10.4 README and CONTRIBUTING changes

Replace all `yarn` command examples with `npm run` equivalents. The README already documents `npm install -g auditjs` for installation — only the developer workflow examples need updating.

### 10.5 Migration procedure

1. Delete `yarn.lock`
2. Run `npm install` to generate `package-lock.json`
3. Commit `package-lock.json`, remove `yarn.lock`
4. Update `.gitignore` if it explicitly excludes `package-lock.json`

---

## 11. TypeScript Strict Syntax

### 11.1 Current state

`tsconfig.json` has `"strict": true`, which enables the full strict family of checks. However, one setting explicitly relaxes it:

```json
"useUnknownInCatchVariables": false
```

This suppresses the TypeScript 4.4+ behaviour where `catch (e)` variables have type `unknown` rather than `any`. The codebase bypasses this by accessing `e.message` and `e.stack` directly without type narrowing throughout `Application.ts`.

Additionally, while `strict: true` is declared, the source contains widespread `: any` usage that the compiler tolerates but which undermines the intent.

### 11.2 Required changes

**Enable `useUnknownInCatchVariables`:**

Remove the explicit `false` override in `tsconfig.json`. This is the default under `strict: true` and is the correct behaviour. All catch blocks that access `e.message` / `e.stack` must be updated:

```typescript
// Pattern to replace throughout Application.ts and others:
} catch (e) {
  logMessage('...', ERROR, { title: e.message, stack: e.stack });
}

// Replace with:
} catch (e) {
  const err = e instanceof Error ? e : new Error(String(e));
  logMessage('...', ERROR, { title: err.message, stack: err.stack });
}
```

**Eliminate `: any` in non-boundary code:**

The `any` usages fall into three categories:

1. **Legitimate boundary code** (external data from `read-installed`, yargs argv, JSON responses) — use typed interfaces or `unknown` with a type guard/assertion at the boundary. Key files: `CycloneDXSbomCreator.ts`, `NpmList.ts`, `IqServerResult.ts`, `OssIndexServerResult.ts`.

2. **`args: any` in `Application.ts`** — replace with the yargs inferred `Arguments` type or a typed interface representing the parsed CLI arguments.

3. **`NpmShrinkwrap.ts` stub** — the `Promise<any>` return types are a consequence of it being unimplemented. Remove the file (see §8.3) or implement it properly.

**Add `noImplicitOverride`** to `tsconfig.json`:

```json
"noImplicitOverride": true
```

Any method in a subclass that overrides a base class method must use the `override` keyword. This catches accidental overrides early and improves class hierarchy clarity.

### 11.3 Linting enforcement

Update `.eslintrc.js` (migrating to `eslint.config.js` flat format for ESLint v9) to add:

```js
'@typescript-eslint/no-explicit-any': 'warn',
'@typescript-eslint/no-unsafe-member-access': 'warn',
'@typescript-eslint/no-unsafe-call': 'warn',
```

These rules will surface remaining `any` drift during development rather than requiring a one-time audit.

---

## 12. Additional Bug Fixes In Scope

### 12.1 Issue #228 — Read credentials from environment variables

Currently only CLI flags and the config file are supported. Add environment variable fallbacks:

| Env var | Used for |
|---|---|
| `AUDITJS_GUIDE_TOKEN` | Sonatype Guide API token |
| `AUDITJS_LIFECYCLE_URL` | Sonatype Lifecycle host |
| `AUDITJS_LIFECYCLE_USER` | Sonatype Lifecycle username |
| `AUDITJS_LIFECYCLE_TOKEN` | Sonatype Lifecycle token |

Priority: CLI flag > env var > config file.

---

## 13. Out of Scope for v5 (Tracked for v5.x / v6)

| Issue | Reason deferred |
|---|---|
| #289 — `package-lock.json` scanning | Requires evaluating `@npmcli/arborist`; significant muncher rewrite |
| #202 — Rename `--whitelist` → `--allowlist` on `ossi` | `ossi` is deprecated; the new `guide` command already uses `--allowlist` |
| #269 / #215 — Monorepo / workspace support | Large scope; separate feature work |
| #263 — CycloneDX library (full) | Partially in scope (§8); complete rework deferred |
| #279 — `/platform` in IQ report URL | Needs further investigation before implementation |
| #258 — Time-limited whitelist entries | Deferred |
| #255 — JSONC whitelist support | Deferred |
| #261 — Filter vulnerabilities by score | Deferred |

---

## 14. Implementation Order

The following sequence minimises risk by fixing CI first, then doing isolated changes before the large feature work.

### Phase 1 — Yarn → npm
> CI workflow action versions were fixed manually prior to this sequence. Begin here.

1. Delete `yarn.lock`; run `npm install` to generate `package-lock.json`
2. Replace `"resolutions"` with `"overrides"` in `package.json`
3. Remove `@yarnpkg/lockfile` and `@types/yarnpkg__lockfile` from devDependencies
4. Update all CI workflow scripts (`yarn` → `npm run`, cache, prod install)
5. Update README and CONTRIBUTING dev workflow examples

### Phase 2 — Security & Quick Wins
6. Remediate issue #287 items (§3): `--insecure` warning + Lifecycle-only restriction, config file chmod, allowlist path validation
7. Post comment on issue #287 clarifying item 1 (hardcoded credentials) is not a valid security finding
8. Fix `js-yaml` `safeDump` → `dump` (required before updating js-yaml to v4)
9. Remove `colors` package; replace uses with `chalk`
10. Remove `node-fetch`; replace with native `fetch` (requires Node >=20 engine bump)
11. Bump `engines.node` to `>=20.0.0`

### Phase 3 — Test Framework Migration
12. Add `vitest`, `@vitest/coverage-v8`, `msw`; create `vitest.config.ts` and `tsconfig.test.json`
13. Rewrite all existing `*.spec.ts` files for Vitest
14. Remove `mocha`, `sinon`, `nock`, `nyc`, `ts-node`, `chai`, `chai-as-promised` and their `@types`
15. Update CI test and coverage steps
16. Verify coverage gates pass (resolves issue #273)

### Phase 4 — Dependency Updates
17. Update remaining production deps (js-yaml v4, chalk v4, ora v5, yargs v17, log4js, etc.)
18. Update remaining dev deps (typescript latest, eslint v9 flat config, prettier v3, @types/node v20)
19. Remove `NpmShrinkwrap.ts` stub; remove `xmlbuilder`; add `@cyclonedx/cyclonedx-library`
20. Refactor `CycloneDXSbomCreator` to use `@cyclonedx/cyclonedx-library` (resolves #263)
21. Update `package.json` `overrides` as needed post-install audit

### Phase 5 — TypeScript Strict Enforcement
22. Remove `"useUnknownInCatchVariables": false` from `tsconfig.json`; add `"noImplicitOverride": true`
23. Fix all catch blocks to type-narrow `unknown` error variables
24. Replace `: any` with typed interfaces or `unknown` + type guards at data boundaries
25. Type `args` in `Application.ts` using yargs `Arguments` type
26. Update to `eslint.config.js` (ESLint v9 flat config) with `no-explicit-any` warnings
27. Run full lint + build; resolve all new errors

### Phase 6 — Sonatype Guide Feature
28. Implement `GuideRequestService`, `GuideServerConfig`; add Vitest specs
29. Add `guide` command to `src/index.ts`; add deprecation warning to `ossi`
30. Update `config` command to include all three options (§4.5)
31. Update CI dogfood scan to use `auditjs guide`

### Phase 7 — Lifecycle Rebrand
32. Add `lifecycle` command alias; add deprecation warning to `iq`
33. Rename "Nexus IQ" → "Sonatype Lifecycle" in all log messages, spinner text, comments

### Phase 8 — Documentation & Community Standards
34. Create `MIGRATION.md` (v4 to v5 guide; link from README)
35. Update `CONTRIBUTING.md` (remove Gitter, CircleCI, CLA URL; update lint to `npm run lint`)
36. Full `README.md` update (commands, deprecations, npm, Node version, SonarCloud badge, link to MIGRATION.md)
37. Update `CHANGELOG.md` header for v5.0.0

### Phase 9 — Bug Fixes
38. Issue #228 — Environment variable credential support

### Phase 10 — Release
39. Run full test suite; verify zero failures
40. Run Sonatype Lifecycle scan; verify zero policy violations
41. Create release PR; pass CI; trigger `workflow_dispatch` release workflow

---

## 15. Resolved Research Questions

All five open questions from the initial draft have been answered by inspecting the published `@sonatype/sonatype-guide-api-client@0.1.0` package and the OpenAPI spec at `sonatype-nexus-community/sonatype-guide-api-client`.

---

### Q1: Sonatype Guide API authentication model — RESOLVED

**Answer:** HTTP Basic Authentication using `username:apiToken` (base64-encoded), identical to OSS Index. The `Configuration` object accepts `username` and `password` fields. There is also a Bearer token (`user-token`) security scheme for UI-issued long-lived tokens.

**Impact on design:** `GuideServerConfig` should store `Username` and `Token` fields (same shape as `OssIndexServerConfig`). CLI flags remain `--user` / `--password`. Prefer the term "API Token" in help text to distinguish from a login password.

---

### Q2: Critical Discovery — `OSSIndexCompatibilityApi`

**The Sonatype Guide API client ships an `OSSIndexCompatibilityApi`** that mirrors the OSS Index batch endpoint exactly:

| Aspect | OSS Index (`OssIndexRequestService`) | Guide `OSSIndexCompatibilityApi` |
|---|---|---|
| Batch endpoint | `POST /api/v3/component-report` | `POST /api/v3/authorized/component-report` |
| Request body | `{ coordinates: string[] }` | `PurlRequestPost { coordinates: string[] }` |
| Max batch size | 128 | 128 |
| Response shape | `{ coordinates, description, reference, vulnerabilities[] }` | `ComponentReportPost` (identical fields) |
| Vulnerability shape | `{ id, title, description, cvssScore, cvssVector, cve, reference }` | `OssiVulnerabilityPost` (identical fields, adds `displayName`, `cwe`, `externalReferences`) |
| Base URL | `https://ossindex.sonatype.org/` | `https://api.guide.sonatype.com` |
| Auth | Basic (user + token) | Basic (user + apiToken) |

**Impact on design:** `GuideRequestService` is not a large new service — it is a thin wrapper over `OSSIndexCompatibilityApi`. The existing `AuditOSSIndex` formatter, `OssIndexServerResult` type, and `Vulnerability` type can be reused **with no changes** (or minor extension for the new `displayName`/`cwe`/`externalReferences` fields). The OSS Index → Guide migration is primarily a configuration and URL swap, not a full rewrite.

The `ossi` deprecation path therefore becomes: `ossi` continues using `OssIndexRequestService` → `ossindex.sonatype.org`; `guide` uses `GuideRequestService` (wrapping `OSSIndexCompatibilityApi`) → `api.guide.sonatype.com`. Both share the same formatters and result types.

---

### Q3: `read-installed` — RESOLVED

**Answer:** `read-installed@4.0.3` was last published over a year ago and is considered unmaintained. `@npmcli/arborist@9.5.0` is the official npm successor (222 versions, actively maintained by the npm team).

**Impact on plan:** The `read-installed` → `@npmcli/arborist` migration is a non-trivial rewrite of `NpmList.ts` (the primary muncher). Since lock-file scanning (#289) is also deferred to v5.x, this replacement is **deferred to v5.1** to avoid scope creep. For v5.0, `read-installed` stays as-is. Add a tracking note in the README known limitations.

---

### Q4: `chalk` and `ora` CJS compatibility — RESOLVED

**Answer:** Both `chalk@5.x` and `ora@9.x` (latest) carry `"type": "module"` and are ESM-only. Since auditjs compiles to CommonJS (`"module":"commonjs"` in tsconfig), the last CJS-compatible majors must be used:

- `chalk`: use `^4.1.2` (latest v4, full feature parity, no ESM requirement)
- `ora`: use `^5.4.1` (latest v5, last CJS release)

A future ESM build target migration would unlock v5/v9 respectively, but that is out of scope for v5.0.

---

### Q5: Sonatype Guide rate limits and caching — RESOLVED

**Answer:** Sonatype Guide uses a **credit-based** model (not time-windowed rate limits). Credits are consumed per component *found*. Same-day requests for the same component are not re-charged.

**Impact on design:** The existing `node-persist` 12-hour cache in `OssIndexRequestService` is still valuable and should be replicated in `GuideRequestService` to avoid unnecessary credit consumption. Consider a 24-hour TTL (aligns better with the same-day credit policy). Cache location: `~/.sonatype-guide/auditjs` (distinct from the OSS Index cache at `~/.ossindex/auditjs`).

---

### Q6: `--server` override for Guide — RESOLVED

**Answer:** Yes. The `Configuration` constructor accepts `basePath`, which overrides the default `https://api.guide.sonatype.com`. The `--server` flag maps directly to `basePath` in `GuideRequestService`. Include it in the `guide` command options as `--server / -h` (same pattern as `ossi`).
