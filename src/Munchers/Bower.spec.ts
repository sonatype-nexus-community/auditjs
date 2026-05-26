/*
 * Copyright 2019-Present Sonatype Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import { Bower } from './Bower';

describe('Bower', () => {
  afterEach(() => {
    mockFs.restore();
    vi.restoreAllMocks();
  });

  describe('getInstalledDeps()', () => {
    // ------------------------------------------------------------------
    // Bug-confirmation tests: these PASS with the current (unfixed) code.
    // They document the defective behaviour that causes HTTP 400 from the
    // Sonatype Guide / OSS Index API when Bower deps use GitHub refs.
    // ------------------------------------------------------------------

    it('[BUG] returns raw GitHub ref as version, only stripping the leading ~', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/fake');
      mockFs({
        '/fake/bower.json': JSON.stringify({
          dependencies: {
            'iron-elements': 'PolymerElements/iron-elements#~1.0.4',
            catiline: 'calvinmetcalf/catiline#2.9.3',
          },
        }),
      });

      const deps = await new Bower().getInstalledDeps();

      // Only the first ~ is stripped; the rest of the GitHub ref remains.
      // This produces invalid PURLs that cause the API to reject the entire batch.
      const ironElements = deps.find((d) => d.name === 'iron-elements');
      expect(ironElements?.version).toBe('PolymerElements/iron-elements#1.0.4');

      const catiline = deps.find((d) => d.name === 'catiline');
      expect(catiline?.version).toBe('calvinmetcalf/catiline#2.9.3');
    });

    it('[BUG] passes caret-range specifier verbatim as version (^ is not stripped)', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/fake');
      mockFs({
        '/fake/bower.json': JSON.stringify({
          dependencies: { lodash: '^4.17.11' },
        }),
      });

      const deps = await new Bower().getInstalledDeps();

      // ^ prefix is not handled at all — results in an invalid semver PURL
      expect(deps[0].version).toBe('^4.17.11');
    });

    // ------------------------------------------------------------------
    // Fix-behavior tests: these FAIL with the current code and should
    // PASS once Bower.getInstalledDeps() reads resolved versions from
    // bower_components/<name>/.bower.json instead of bower.json specifiers.
    // ------------------------------------------------------------------

    it('resolves GitHub ref to exact semver from bower_components/.bower.json', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/fake');
      mockFs({
        '/fake/bower.json': JSON.stringify({
          dependencies: { 'iron-elements': 'PolymerElements/iron-elements#~1.0.4' },
        }),
        '/fake/bower_components/iron-elements/.bower.json': JSON.stringify({
          version: '1.0.4',
        }),
      });

      const deps = await new Bower().getInstalledDeps();

      expect(deps).toHaveLength(1);
      expect(deps[0].name).toBe('iron-elements');
      expect(deps[0].version).toBe('1.0.4');
    });

    it('skips package gracefully when bower_components entry is absent', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/fake');
      mockFs({
        '/fake/bower.json': JSON.stringify({
          dependencies: { 'private-pkg': 'git+https://github.com/acme/private.git' },
        }),
        // No bower_components directory — simulates a dep that was never installed locally
      });

      const deps = await new Bower().getInstalledDeps();

      // Should be silently skipped rather than forwarded as an invalid PURL that
      // causes HTTP 400 and drops every other package in the same API batch.
      expect(deps).toHaveLength(0);
    });

    it('resolves tilde semver range to exact installed version from .bower.json', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/fake');
      mockFs({
        '/fake/bower.json': JSON.stringify({
          dependencies: { polymer: '~1.9.0' },
        }),
        '/fake/bower_components/polymer/.bower.json': JSON.stringify({
          version: '1.9.8',
        }),
      });

      const deps = await new Bower().getInstalledDeps();

      expect(deps[0].version).toBe('1.9.8');
    });

    // ------------------------------------------------------------------
    // Regression: devDependencies flag must still work after the fix.
    // ------------------------------------------------------------------

    it('includes devDependencies when the devDependencies flag is true', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/fake');
      mockFs({
        '/fake/bower.json': JSON.stringify({
          dependencies: { polymer: '~1.9.0' },
          devDependencies: { 'web-component-tester': '~6.9.2' },
        }),
        '/fake/bower_components/polymer/.bower.json': JSON.stringify({ version: '1.9.8' }),
        '/fake/bower_components/web-component-tester/.bower.json': JSON.stringify({ version: '6.9.2' }),
      });

      const deps = await new Bower(true).getInstalledDeps();

      expect(deps).toHaveLength(2);
      expect(deps.map((d) => d.name)).toContain('web-component-tester');
    });
  });
});
