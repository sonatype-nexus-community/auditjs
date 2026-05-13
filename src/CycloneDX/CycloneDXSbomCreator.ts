/*
 * Copyright (c) 2020-Present Erlend Oftedal, Steve Springett, Sonatype, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/// <reference types="./typings/read-installed" />

import { Options } from './Options';
import CDX = require('@cyclonedx/cyclonedx-library');
import spdxExpressionParse = require('spdx-expression-parse');
import readInstalled from 'read-installed';
import * as ssri from 'ssri';
import { toPurl } from './Helpers/Helpers';
import { logMessage, DEBUG } from '../Application/Logger/Logger';

const SPEC = CDX.Spec.Spec1dot6;

const licenseFactory = new CDX.Contrib.License.Factories.LicenseFactory(spdxExpressionParse);
const extRefFactory = new CDX.Contrib.FromNodePackageJson.Factories.ExternalReferenceFactory();
const componentBuilder = new CDX.Contrib.FromNodePackageJson.Builders.ComponentBuilder(extRefFactory, licenseFactory);

export class CycloneDXSbomCreator {
  constructor(
    readonly path: string,
    readonly options?: Options,
  ) {}

  public async createBom(pkgInfo: any): Promise<string> {
    const bom = new CDX.Models.Bom();

    if (this.options?.includeBomSerialNumber) {
      bom.serialNumber = CDX.Contrib.Bom.Utils.randomSerialNumber();
    }

    const seen = new Set<string>();
    this.addComponents(pkgInfo, bom.components, seen, true);

    return new CDX.Serialize.XmlSerializer(new CDX.Serialize.XML.Normalize.Factory(SPEC)).serialize(bom, {
      sortLists: false,
    });
  }

  public getPackageInfoFromReadInstalled(path: string = this.path): Promise<any> {
    return new Promise((resolve, reject) => {
      readInstalled(path, { dev: this.options?.devDependencies ?? false }, (err: any, data: any) => {
        if (err) reject(err);
        resolve(data);
      });
    });
  }

  private addComponents(pkg: any, repo: CDX.Models.ComponentRepository, seen: Set<string>, isRoot = false): void {
    if (pkg.extraneous) return;

    if (!isRoot) {
      const pkgId = this.parsePackageJsonName(pkg.name);
      const group = pkgId.scope != null ? `@${pkgId.scope}` : '';
      const name = pkgId.fullName;
      const version: string = pkg.version ?? '';
      const purl = toPurl(name, version, group);

      if (seen.has(purl)) return;
      seen.add(purl);

      const componentType =
        this.determinePackageType(pkg) === 'framework'
          ? CDX.Enums.ComponentType.Framework
          : CDX.Enums.ComponentType.Library;

      const comp = componentBuilder.makeComponent(pkg, componentType);
      if (!comp) return;

      comp.name = name;
      comp.group = group !== '' ? group : undefined;
      comp.version = version;
      comp.purl = purl;

      if (this.options?.spartan) {
        comp.hashes.clear();
        comp.licenses.clear();
      } else {
        if (!this.options?.includeLicenseData) {
          comp.licenses.clear();
        }
        this.processHashes(pkg, comp);
      }

      repo.add(comp);
    }

    if (pkg.dependencies) {
      Object.keys(pkg.dependencies)
        .map((x) => pkg.dependencies[x])
        .filter((x) => typeof x !== 'string')
        .forEach((x) => this.addComponents(x, repo, seen, false));
    }
  }

  private processHashes(pkg: any, comp: CDX.Models.Component): void {
    if (pkg._shasum) {
      comp.hashes.set(CDX.Enums.HashAlgorithm['SHA-1'], pkg._shasum);
    } else if (pkg._integrity) {
      try {
        const [alg, hex] = CDX.Contrib.FromNodePackageJson.Utils.parsePackageIntegrity(pkg._integrity);
        comp.hashes.set(alg, hex);
      } catch {
        // ssri fallback for multi-algorithm integrity strings
        const integrity = ssri.parse(pkg._integrity);
        const algMap: Array<[string, CDX.Enums.HashAlgorithm]> = [
          ['sha512', CDX.Enums.HashAlgorithm['SHA-512']],
          ['sha384', CDX.Enums.HashAlgorithm['SHA-384']],
          ['sha256', CDX.Enums.HashAlgorithm['SHA-256']],
          ['sha1', CDX.Enums.HashAlgorithm['SHA-1']],
        ];
        for (const [algo, cdxAlg] of algMap) {
          if (integrity[algo]) {
            comp.hashes.set(cdxAlg, Buffer.from(integrity[algo][0].digest, 'base64').toString('hex'));
            break;
          }
        }
        logMessage('Parsed integrity via ssri fallback', DEBUG, { integrity: pkg._integrity });
      }
    }
  }

  private determinePackageType(pkg: any): string {
    if (pkg.keywords) {
      for (const kw of pkg.keywords) {
        if (kw.toLowerCase() === 'framework') return 'framework';
      }
    }
    return 'library';
  }

  private parsePackageJsonName(name: string): { scope?: string; fullName: string } {
    const match = name.match(/^(?:@([^/]+)\/)?(([^.]+)(?:\.(.*))?)$/);
    if (match) {
      return { scope: match[1] ?? undefined, fullName: match[2] ?? match[0] };
    }
    return { scope: undefined, fullName: name };
  }
}
