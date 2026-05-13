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

import { expect, describe, it } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { CycloneDXSbomCreator } from './CycloneDXSbomCreator';

// Test fixture: circular dependency, scoped package, nested dependency, invalid repo URL
const object = {
  name: 'testproject',
  version: '1.0.0',
  description: 'Test Description',
  dependencies: {
    testdependency: {
      name: 'testdependency',
      version: '1.0.1',
      bugs: {
        url: 'git+ssh://git@github.com/slackhq/csp-html-webpack-plugin.git',
      },
      dependencies: {
        testdependency: {
          name: 'testdependency',
          version: '1.0.1',
        },
      },
    },
    testdependency2: {
      name: 'testdependency2',
      version: '1.0.2',
      repository: {
        url: 'git@slack-github.com:anuj/csp-html-webpack-plugin.git',
      },
      dependencies: {
        testdependency: {
          name: 'testdependency',
          version: '1.0.0',
        },
      },
    },
    '@scope/testdependency3': {
      name: '@scope/testdependency3',
      version: '1.0.2',
    },
  },
};

function findByPurl(components: HTMLCollectionOf<Element>, purl: string): Element | undefined {
  for (let i = 0; i < components.length; i++) {
    const purls = components[i].getElementsByTagName('purl');
    if (purls.length > 0 && purls[0].textContent === purl) return components[i];
  }
  return undefined;
}

function getText(el: Element, tag: string): string | null {
  const nodes = el.getElementsByTagName(tag);
  return nodes.length > 0 ? nodes[0].textContent : null;
}

describe('CycloneDXSbomCreator', async () => {
  it('should create a CycloneDX 1.6 BOM with 4 components', async () => {
    const creator = new CycloneDXSbomCreator(process.cwd());
    const xml = await creator.createBom(object);

    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const components = doc.getElementsByTagName('component');

    expect(components.length).toBe(4);

    // Root bom element uses CycloneDX 1.6 namespace
    const bom = doc.getElementsByTagName('bom')[0];
    expect(bom.getAttribute('xmlns')).toBe('http://cyclonedx.org/schema/bom/1.6');

    // testdependency@1.0.1 — has bugs.url (valid URL → issue-tracker externalRef)
    const dep1 = findByPurl(components, 'pkg:npm/testdependency@1.0.1');
    expect(dep1).toBeDefined();
    expect(dep1!.getAttribute('type')).toBe('library');
    // bom-ref is auto-generated and is NOT the purl
    const bomRef1 = dep1!.getAttribute('bom-ref');
    expect(bomRef1).toBeTruthy();
    expect(bomRef1).not.toBe('pkg:npm/testdependency@1.0.1');
    expect(getText(dep1!, 'name')).toBe('testdependency');
    expect(getText(dep1!, 'version')).toBe('1.0.1');
    // Has issue-tracker external reference from bugs.url
    const refs1 = dep1!.getElementsByTagName('reference');
    const issueTracker = Array.from({ length: refs1.length }, (_, i) => refs1[i]).find(
      (r) => r.getAttribute('type') === 'issue-tracker',
    );
    expect(issueTracker).toBeDefined();

    // testdependency2@1.0.2
    const dep2 = findByPurl(components, 'pkg:npm/testdependency2@1.0.2');
    expect(dep2).toBeDefined();
    expect(getText(dep2!, 'name')).toBe('testdependency2');
    expect(getText(dep2!, 'version')).toBe('1.0.2');

    // testdependency@1.0.0 — nested dep from testdependency2 subtree
    const dep3 = findByPurl(components, 'pkg:npm/testdependency@1.0.0');
    expect(dep3).toBeDefined();

    // @scope/testdependency3 — scoped package: group and name split correctly
    const dep4 = findByPurl(components, 'pkg:npm/%40scope/testdependency3@1.0.2');
    expect(dep4).toBeDefined();
    expect(getText(dep4!, 'group')).toBe('@scope');
    expect(getText(dep4!, 'name')).toBe('testdependency3');
    expect(getText(dep4!, 'version')).toBe('1.0.2');
  });

  it('should create a spartan BOM with no hashes', async () => {
    const creator = new CycloneDXSbomCreator(process.cwd(), { spartan: true });
    const xml = await creator.createBom(object);

    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const components = doc.getElementsByTagName('component');

    expect(components.length).toBe(4);

    // No hash elements in spartan mode
    expect(doc.getElementsByTagName('hash').length).toBe(0);

    // Each component still has a bom-ref and purl
    for (let i = 0; i < components.length; i++) {
      expect(components[i].getAttribute('bom-ref')).toBeTruthy();
      const purl = getText(components[i], 'purl');
      expect(purl).toBeTruthy();
      expect(purl).toMatch(/^pkg:npm\//);
    }
  });
});
