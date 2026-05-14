## Contributing to AuditJS

Thank you for your interest in contributing! Please read this guide before opening a pull request.

### Before you start

- Check the [open issues](https://github.com/sonatype-nexus-community/auditjs/issues) to see if your idea or bug is already being tracked. If not, open a new issue so we can discuss scope before you invest time coding.
- Sign the [Sonatype CLA](https://sonatypecla.herokuapp.com/sign-cla) if you haven't already — we can't merge without it.

### Development setup

**Requirements:** Node.js 20 or later, npm 10 or later.

```bash
git clone https://github.com/sonatype-nexus-community/auditjs.git
cd auditjs
npm install
npm run build     # compile TypeScript → bin/
npm test          # run the test suite (vitest)
npm run lint      # ESLint + Prettier check
```

To run the compiled CLI directly:

```bash
node bin/index.js guide --help
```

### Pull request checklist

- [ ] One focused change per PR — smaller diffs are easier to review and merge
- [ ] All tests pass: `npm test`
- [ ] No lint errors: `npm run lint`
- [ ] TypeScript compiles cleanly: `npx tsc --noEmit`
- [ ] New behaviour is covered by tests where practical
- [ ] The linked issue is referenced in the PR description

### Commit message format

We use [Conventional Commits](https://www.conventionalcommits.org/) because releases are generated automatically by [semantic-release](https://github.com/semantic-release/semantic-release). Please format your commit messages accordingly:

```
<type>(<scope>): <short summary>

[optional body]
```

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`.

Examples:
```
feat(guide): add --recommend flag for AI-powered upgrade suggestions
fix(config): fall back to env var when config file is absent
docs: update README with environment variable table
```

A `feat` commit triggers a minor release; a `fix` commit triggers a patch release. Breaking changes must include `BREAKING CHANGE:` in the commit footer.

### Code style

The project uses Prettier for formatting and ESLint for linting. Run `npm run lint` before pushing — CI will reject formatting errors. TypeScript strict mode is enabled; avoid `any` where possible.

### Getting help

Open a [GitHub issue](https://github.com/sonatype-nexus-community/auditjs/issues) or start a [GitHub Discussion](https://github.com/sonatype-nexus-community/auditjs/discussions) if you have questions.
