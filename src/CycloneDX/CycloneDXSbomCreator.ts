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
/// <reference types="./typings/spdx-license-ids" />

import { Options } from './Options';
import uuidv4 from 'uuid/v4';
import {create} from 'xmlbuilder2';
import readInstalled from 'read-installed';
import * as ssri from 'ssri';
import * as fs from 'fs';
import { LicenseContent } from './Types/LicenseContent';
import { Component, GenericDescription } from './Types/Component';
import { ExternalReference } from './Types/ExternalReference';
import { Hash } from './Types/Hash';
import spdxLicensesNonDeprecated = require('spdx-license-ids');
import spdxLicensesDeprecated = require('spdx-license-ids/deprecated');
import { toPurl } from './Helpers/Helpers';
import { logMessage, DEBUG } from '../Application/Logger/Logger';
import { DepGraph } from 'dependency-graph';
import { Dependency } from './Types/Dependency';
import { Metadata } from './Types/Metadata';
import { Bom } from './Types/Bom';

export class CycloneDXSbomCreator {
  public graph: DepGraph<Component>;
  public inverseGraph: DepGraph<Component>;

  readonly licenseFilenames: Array<string> = [
    'LICENSE',
    'License',
    'license',
    'LICENCE',
    'Licence',
    'licence',
    'NOTICE',
    'Notice',
    'notice',
  ];

  readonly licenseContentTypes = [
    { licenseContentType: 'text/plain', fileExtension: '' },
    { licenseContentType: 'text/txt', fileExtension: '.txt' },
    { licenseContentType: 'text/markdown', fileExtension: '.md' },
    { licenseContentType: 'text/xml', fileExtension: '.xml' },
  ];

  readonly SBOMSCHEMA: string = 'http://cyclonedx.org/schema/bom/1.3';

  constructor(readonly path: string, readonly options?: Options) {
    this.graph = new DepGraph();
    this.inverseGraph = new DepGraph();
  }

  public async getBom(pkgInfo: any): Promise<Bom> {
    const components = Array.from(this.listComponents(pkgInfo).values());

    const dependencies: Array<Dependency> = new Array();

    this.listDependencies(this.getPurlFromPkgInfo(pkgInfo), dependencies);

    const bom: Bom = {
      '@serial-number': 'urn:uuid:' + uuidv4(),
      '@version': 1,
      '@xmlns': this.SBOMSCHEMA,
      metadata: this.getMetadata(pkgInfo),
      components: components,
      dependencies: dependencies,
    } 

    return bom;
  }

  public toXml(bom: Bom): string {
    const sbom = create().ele('bom', { encoding: 'utf-8', separateArrayItems: true });

    sbom.att('serialNumber', bom['@serial-number']);
    sbom.att('version', bom['@version'].toString());
    sbom.ele('metadata', bom.metadata);

    const componentsNode = sbom.ele('components');
    bom.components.forEach((comp) => {
      const component = { component: comp };
      componentsNode.ele(component);
    });

    const dependenciesNode = sbom.ele('dependencies');

    bom.dependencies.map((dep) => {
      const depNode = dependenciesNode.ele('dependency', { ref: dep['@ref'] });
      dep.dependencies?.map((subDep) => {
        depNode.ele('dependency', { ref: subDep['@ref'] });
      });
    });

    const bomString = sbom.end({
      prettyPrint: true
    });

    return bomString;
  }

  public getPackageInfoFromReadInstalled(path: string = this.path): Promise<any> {
    return new Promise((resolve, reject) => {
      readInstalled(
        path,
        {
          dev: this.options && this.options.devDependencies ? this.options.devDependencies : false,
        },
        async (err: any, data: any) => {
          if (err) {
            reject(err);
          }

          resolve(data);
        },
      );
    });
  }

  private getMetadata(pkg: any): Metadata {
    return {
      timestamp: Date.now().toString(),
      component: this.getComponent(pkg),
    };
  }

  private listDependencies(rootPkg: string, depArray: Array<Dependency>) {
    const dependencies = this.graph.directDependenciesOf(rootPkg);

    const intermediateDepArray: Array<Dependency> = dependencies.map((dep) => {
      const dependency: Dependency = {
        '@ref': dep,
      };
      return dependency;
    });

    const dependency: Dependency = {
      '@ref': rootPkg,
      dependencies: intermediateDepArray,
    };

    depArray.push(dependency);

    if (dependencies.length > 0) {
      dependencies.map((dep) => {
        this.listDependencies(dep, depArray);
      });
    }
  }

  private getPurlFromPkgInfo(pkgInfo: any): string {
    const pkgIdentifier = this.parsePackageJsonName(pkgInfo.name);
    const group: string = pkgIdentifier.scope == undefined ? '' : `@${pkgIdentifier.scope}`;
    const name: string = pkgIdentifier.fullName as string;
    const version: string = pkgInfo.version as string;

    return toPurl(name, version, group);
  }

  private getComponent(pkg: any): Component {
    const pkgIdentifier = this.parsePackageJsonName(pkg.name);
    const group: string = pkgIdentifier.scope == undefined ? '' : `@${pkgIdentifier.scope}`;
    const name: string = pkgIdentifier.fullName as string;
    const version: string = pkg.version as string;

    const component: Component = {
      '@type': this.determinePackageType(pkg),
      '@bom-ref': this.getPurlFromPkgInfo(pkg),
      group: group,
      name: name,
      version: version,
      purl: this.getPurlFromPkgInfo(pkg),
    };

    return component;
  }

  private listComponents(pkg: any): Map<string, Component> {
    let map = new Map<string, Component>();
    const isRootPkg = true;
    this.addComponent(pkg, map, isRootPkg);
    return map;
  }

  private addComponent(pkg: any, map: Map<string, Component>, isRootPkg = false, parent?: Component): void {
    const spartan = this.options?.spartan ? this.options.spartan : false;
    //read-installed with default options marks devDependencies as extraneous
    //if a package is marked as extraneous, do not include it as a component
    if (pkg.extraneous) {
      return;
    }

    const component = this.getComponent(pkg);

    this.graph.addNode(component.purl, component);
    this.inverseGraph.addNode(component.purl, component);

    if (parent) {
      this.graph.addDependency(parent.purl, component.purl);
      this.inverseGraph.addDependency(component.purl, parent.purl);
    }

    if (!isRootPkg) {
      if (component.group === '') {
        delete component.group;
      }

      if (!spartan) {
        const description: GenericDescription = { '#cdata': pkg.description };

        component.description = description;
        component.hashes = [];
        component.licenses = [];
        component.externalReferences = this.addExternalReferences(pkg);

        if (this.options && this.options.includeLicenseData) {
          component.licenses = this.getLicenses(pkg);
        } else {
          delete component.licenses;
        }

        if (component.externalReferences === undefined || component.externalReferences.length === 0) {
          delete component.externalReferences;
        }

        this.processHashes(pkg, component);
      }

      if (map.get(component.purl)) return; //remove cycles
      map.set(component.purl, component);
    }
    if (pkg.dependencies) {
      Object.keys(pkg.dependencies)
        .map((x) => pkg.dependencies[x])
        .filter((x) => typeof x !== 'string') //remove cycles
        .map((x) => this.addComponent(x, map, false, component));
    }
  }

  /**
   * If the author has described the module as a 'framework', the take their
   * word for it, otherwise, identify the module as a 'library'.
   */
  private determinePackageType(pkg: any): string {
    if (pkg.hasOwnProperty('keywords')) {
      for (const keyword of pkg.keywords) {
        if (keyword.toLowerCase() === 'framework') {
          return 'framework';
        }
      }
    }
    return 'library';
  }

  /**
   * Uses the SHA1 shasum (if Present) otherwise utilizes Subresource Integrity
   * of the package with support for multiple hashing algorithms.
   */
  private processHashes(pkg: any, component: Component): void {
    component.hashes = new Array<Hash>();
    if (pkg._shasum) {
      component.hashes.push({ hash: { '@alg': 'SHA-1', '#text': pkg._shasum } });
    } else if (pkg._integrity) {
      const integrity = ssri.parse(pkg._integrity);
      // Components may have multiple hashes with various lengths. Check each one
      // that is supported by the CycloneDX specification.
      if (integrity.hasOwnProperty('sha512')) {
        component.hashes.push(this.addComponentHash('SHA-512', integrity.sha512[0].digest));
      }
      if (integrity.hasOwnProperty('sha384')) {
        component.hashes.push(this.addComponentHash('SHA-384', integrity.sha384[0].digest));
      }
      if (integrity.hasOwnProperty('sha256')) {
        component.hashes.push(this.addComponentHash('SHA-256', integrity.sha256[0].digest));
      }
      if (integrity.hasOwnProperty('sha1')) {
        component.hashes.push(this.addComponentHash('SHA-1', integrity.sha1[0].digest));
      }
    }
    if (component.hashes.length === 0) {
      delete component.hashes; // If no hashes exist, delete the hashes node (it's optional)
    }
  }

  /**
   * Adds a hash to component.
   */
  private addComponentHash(alg: string, digest: string): Hash {
    const hash = Buffer.from(digest, 'base64').toString('hex');
    return { hash: { '@alg': alg, '#text': hash } };
  }

  /**
   * Adds external references supported by the package format.
   */
  private addExternalReferences(pkg: any): Array<ExternalReference> {
    const externalReferences: Array<ExternalReference> = [];
    if (pkg.homepage) {
      this.pushURLToExternalReferences('website', pkg.homepage, externalReferences);
    }
    if (pkg.bugs && pkg.bugs.url) {
      this.pushURLToExternalReferences('issue-tracker', pkg.bugs.url, externalReferences);
    }
    if (pkg.repository && pkg.repository.url) {
      this.pushURLToExternalReferences('vcs', pkg.repository.url, externalReferences);
    }
    return externalReferences;
  }

  private pushURLToExternalReferences(
    typeOfURL: string,
    url: string,
    externalReferences: Array<ExternalReference>,
  ): void {
    try {
      const uri = new URL(url);
      externalReferences.push({ reference: { '@type': typeOfURL, url: uri.toString() } });
    } catch (e) {
      logMessage('Encountered an invalid URL', DEBUG, { title: e.message, stack: e.stack });
    }
  }

  /**
   * Performs a lookup + validation of the license specified in the
   * package. If the license is a valid SPDX license ID, set the 'id'
   * of the license object, otherwise, set the 'name' of the license
   * object.
   */
  private getLicenses(pkg: any): any {
    const spdxLicenses = [...spdxLicensesNonDeprecated, ...spdxLicensesDeprecated];
    let license = pkg.license && (pkg.license.type || pkg.license);
    if (license) {
      if (!Array.isArray(license)) {
        license = [license];
      }
      return license
        .map((l: string) => {
          const licenseContent: LicenseContent = {};

          if (
            spdxLicenses.some((v: string) => {
              return l === v;
            })
          ) {
            licenseContent.id = l;
          } else {
            licenseContent.name = l;
          }
          if (this.options && this.options.includeLicenseText) {
            licenseContent.text = this.addLicenseText(pkg, l);
          }
          return licenseContent;
        })
        .map((l: any) => ({ license: l }));
    }
    return undefined;
  }

  /**
   * Tries to find a file containing the license text based on commonly
   * used naming and content types. If a candidate file is found, add
   * the text to the license text object and stop.
   */
  private addLicenseText(pkg: any, licenseName: string): GenericDescription | undefined {
    for (const licenseFilename of this.licenseFilenames) {
      for (const { licenseContentType, fileExtension } of this.licenseContentTypes) {
        let licenseFilepath = `${pkg.realPath}/${licenseFilename}${licenseName}${fileExtension}`;
        if (fs.existsSync(licenseFilepath)) {
          return this.readLicenseText(licenseFilepath, licenseContentType);
        }

        licenseFilepath = `${pkg.realPath}/${licenseFilename}${fileExtension}`;
        if (fs.existsSync(licenseFilepath)) {
          return this.readLicenseText(licenseFilepath, licenseContentType);
        }
      }
    }
  }

  /**
   * Read the file from the given path to the license text object and includes
   * content-type attribute, if not default. Returns the license text object.
   */
  private readLicenseText(licenseFilepath: string, licenseContentType: string): GenericDescription | undefined {
    const licenseText = fs.readFileSync(licenseFilepath, 'utf8');
    if (licenseText) {
      const licenseContentText: GenericDescription = { '#cdata': licenseText };
      if (licenseContentType !== 'text/plain') {
        licenseContentText['@content-type'] = licenseContentType;
      }
      return licenseContentText;
    }
    return undefined;
  }

  private parsePackageJsonName(name: string): Result {
    const result: Result = {
      scope: undefined,
      fullName: '',
      projectName: '',
      moduleName: '',
    };

    const regexp = new RegExp(/^(?:@([^/]+)\/)?(([^\.]+)(?:\.(.*))?)$/);

    const matches = name.match(regexp);
    if (matches) {
      result.scope = matches[1] || undefined;
      result.fullName = matches[2] || matches[0];
      result.projectName = matches[3] === matches[2] ? undefined : matches[3];
      result.moduleName = matches[4] || matches[2] || undefined;
    }
    return result;
  }
}

interface Result {
  scope?: string;
  fullName: string;
  projectName?: string;
  moduleName?: string;
}
