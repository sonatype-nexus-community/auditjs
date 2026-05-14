<!--

    Copyright 2019-Present Sonatype Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

-->

# Migrating to AuditJS v5

This guide covers the changes needed to upgrade from AuditJS v4.x to v5.0.0.

## Summary of breaking changes

| Area | Change |
|---|---|
| New command | `guide` replaces `ossi` as the primary scanner |
| `ossi` deprecated | Retained in v5 with a runtime warning; **will be removed in v6** |
| New command alias | `lifecycle` is the canonical name for the `iq` command |
| `iq` deprecated | Retained in v5 with a runtime warning; **will be removed in v6** |
| Node.js engine | Minimum raised from `>=16.13.0` to `>=20.0.0` |
| Package manager | Yarn replaced by npm (`npm install` / `npm test`) |

---

## 1. OSS Index users: migrate `ossi` → `guide`

`auditjs ossi` has been deprecated in favour of `auditjs guide`, which scans against
[Sonatype Guide](https://guide.sonatype.com) — the successor to OSS Index.

### Get a Sonatype Guide API token

1. Create a free account at <https://guide.sonatype.com>
2. Go to **Settings > API Tokens** and generate a token

### Update your commands

```bash
# Before (v4)
auditjs ossi

# After (v5+)
auditjs guide --token <your-token>
```

You can also store your token in the config file by running `auditjs config` and
selecting **Sonatype Guide**.

### `--whitelist` → `--allowlist`

The `guide` command uses `--allowlist` as the canonical flag name. The `--whitelist`
flag is accepted on `guide` but will emit a deprecation warning.

```bash
# Before (v4)
auditjs ossi --whitelist auditjs.json

# After (v5+)
auditjs guide --token <your-token> --allowlist auditjs.json
```

The allowlist file format is unchanged:

```json
{
  "ignore": [{ "id": "78a61524-80c5-4371-b6d1-6b32af349043", "reason": "Insert reason here" }]
}
```

### Config files

The `guide` command stores credentials in `~/.sonatype-guide/`. Your existing
`~/.ossindex/` config is still used by the deprecated `ossi` command and does not
need to be deleted or migrated.

---

## 2. Nexus IQ Server users: migrate `iq` → `lifecycle`

`auditjs iq` has been deprecated in favour of `auditjs lifecycle`, reflecting the
product rename from Nexus IQ Server to Sonatype Lifecycle.

The command options and behaviour are **identical**. Only the command name changes.

```bash
# Before (v4)
auditjs iq --application my-app --stage build

# After (v5+)
auditjs lifecycle --application my-app --stage build
```

Update any scripts, CI pipelines, or npm run-scripts that reference `auditjs iq`.

### Config files

No changes needed. The existing `~/.iqserver/` configuration file continues to work
with `auditjs lifecycle`.

---

## 3. Node.js version

AuditJS v5 requires **Node.js 20 or later** (LTS).

```bash
# Check your current version
node --version

# Install Node 20 via nvm if needed
nvm install 20
nvm use 20
```

---

## 4. npm replaces yarn (developers and contributors)

If you develop or build AuditJS itself, note that the project has migrated from Yarn
to npm. `yarn.lock` has been removed; `package-lock.json` is now the lock file.

| Yarn command | npm equivalent |
|---|---|
| `yarn install` | `npm install` |
| `yarn test` | `npm test` |
| `yarn run build` | `npm run build` |
| `yarn run lint` | `npm run lint` |
| `yarn global add auditjs` | `npm install -g auditjs` |

End-users installing `auditjs` via `npm install -g auditjs` or `npx auditjs@latest`
are unaffected by this change.
