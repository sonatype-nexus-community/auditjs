/*
 * Copyright (c) 2020-present Erlend Oftedal, Steve Springett, Sonatype, Inc.
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
import { Options } from "./Options";
import uuidv4 from 'uuid/v4';
import builder from 'xmlbuilder';
import readInstalled from 'read-installed';
import PackageURL from "packageurl-js";
import parsePackageJsonName from 'parse-packagejson-name';
import * as ssri from 'ssri';
import * as fs from 'fs';
import { LicenseContent } from "./Types/LicenseContent";
import { Component, GenericDescription } from "./Types/Component";
import { ExternalReference } from "./Types/ExternalReference";
import { Hash } from "./Types/Hash";

export class CycloneDXSbomCreator {
  readonly SBOMSCHEMA: string = 'http://cyclonedx.org/schema/bom/1.1';

  constructor(
    readonly path: string,
    readonly options?: Options,
    ) {}

  public async createBom() {
    let bom = builder.create('bom', { encoding: 'utf-8', separateArrayItems: true })
      .att('xmlns', this.SBOMSCHEMA);

    if (this.options && this.options.includeBomSerialNumber) {
        bom.att('serialNumber', 'urn:uuid:' + uuidv4());
    }

    bom.att('version', 1);

    let componentsNode = bom.ele('components');
    let pkgInfo = await this.getPackageInfoFromReadInstalled();
    let components = this.listComponents(pkgInfo);

    if (components.length > 0) {
      componentsNode.ele(components);
    }

    let bomString = bom.end({
      width: 0,
      allowEmpty: false,
      spaceBeforeSlash: ''
    });

    return bomString;
  }

  private getPackageInfoFromReadInstalled() {
    return new Promise((resolve, reject) => {
      readInstalled(
        this.path, { 
          dev: (this.options && this.options.devDependencies) ? this.options.devDependencies : false 
        }, 
        async (err: any, data: any) => {
        if (err) {
          reject(err);
        }
  
        resolve(data);
      });
    });
  }

  private listComponents(pkg: any) {
    let list: any = {};
    const isRootPkg: boolean = true;
    this.addComponent(pkg, list, isRootPkg);
    return Object.keys(list).map(k => ({ component: list[k] }));
  }

  private addComponent(pkg: any, list: any, isRootPkg: boolean = false) {
    //read-installed with default options marks devDependencies as extraneous
    //if a package is marked as extraneous, do not include it as a component
    if(pkg.extraneous) { return };
    if(!isRootPkg) {
      let pkgIdentifier = parsePackageJsonName(pkg.name);
      let group: string = pkgIdentifier.scope as string;
      let name: string = pkgIdentifier.fullName as string;
      let version: string = pkg.version as string;
      let purl: string = new PackageURL('npm', group, name, version, null, null).toString();
      let description: GenericDescription = { '#cdata': pkg.description };

      let component: Component = {
        '@type': this.determinePackageType(pkg),
        '@bom-ref': purl,
        group: group,
        name: name,
        version: version,
        description: description,
        purl: purl,
        externalReferences : this.addExternalReferences(pkg)
      };

      if (this.options && this.options.includeLicenseData) {
        component.licenses = this.getLicenses(pkg);
      }

      if (component.externalReferences === undefined || component.externalReferences.length === 0) {
          delete component.externalReferences;
      }

      this.processHashes(pkg, component);

      if (list[component.purl]) return; //remove cycles
      list[component.purl] = component;
    }
    if (pkg.dependencies) {
      Object.keys(pkg.dependencies)
        .map(x => pkg.dependencies[x])
        .filter(x => typeof(x) !== 'string') //remove cycles
        .map(x => this.addComponent(x, list));
    }
  }

  /**
   * If the author has described the module as a 'framework', the take their
   * word for it, otherwise, identify the module as a 'library'.
   */
  private determinePackageType(pkg: any) {
    if (pkg.hasOwnProperty('keywords')) {
      for (let keyword of pkg.keywords) {
        if (keyword.toLowerCase() === 'framework') {
          return 'framework';
        }
      }
    }
    return 'library';
  }

  /**
   * Uses the SHA1 shasum (if present) otherwise utilizes Subresource Integrity
   * of the package with support for multiple hashing algorithms.
   */
  private processHashes(pkg: any, component: Component) {
    component.hashes = new Array<Hash>();
    if (pkg._shasum) {
      component.hashes.push({hash: { '@alg':'SHA-1', '#text': pkg._shasum} });
    } else if (pkg._integrity) {
      let integrity = ssri.parse(pkg._integrity);
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
    let hash = Buffer.from(digest, 'base64').toString('hex');
    return {hash: {'@alg': alg, '#text': hash}};
  }

  /**
   * Adds external references supported by the package format.
   */
  private addExternalReferences(pkg: any): Array<ExternalReference> {
    let externalReferences = [];
    if (pkg.homepage) {
      externalReferences.push({'reference': {'@type': 'website', url: pkg.homepage}});
    }
    if (pkg.bugs && pkg.bugs.url) {
      externalReferences.push({'reference': {'@type': 'issue-tracker', url: pkg.bugs.url}});
    }
    if (pkg.repository && pkg.repository.url) {
      externalReferences.push({'reference': {'@type': 'vcs', url: pkg.repository.url}});
    }
    return externalReferences;
  }

  /**
   * Performs a lookup + validation of the license specified in the
   * package. If the license is a valid SPDX license ID, set the 'id'
   * of the license object, otherwise, set the 'name' of the license
   * object.
   */
  private getLicenses(pkg: any) {
    const spdxLicenses = require('../../spdx-licenses.json');
    let license = pkg.license && (pkg.license.type || pkg.license);
    if (license) {
      if (!Array.isArray(license)) {
        license = [license];
      }
      return license.map((l: string) => {
        let licenseContent: LicenseContent = {};

        if (spdxLicenses.some((v: any) => { return l === v; })) {
          licenseContent.id = l;
        } else {
          licenseContent.name = l;
        }
        if(this.options && this.options.includeLicenseText) {
          this.addLicenseText(pkg, l, licenseContent);
        }
        return licenseContent;
      }).map((l: any) => ({license: l}));
    }
    return undefined;
  }

  /**
  * Tries to find a file containing the license text based on commonly
  * used naming and content types. If a candidate file is found, add
  * the text to the license text object and stop.
  */
  private addLicenseText(pkg: any, l: string, licenseContent: LicenseContent) {
    let licenseFilenames: Array<string> = [ 'LICENSE', 'License', 'license', 'LICENCE', 'Licence', 'licence', 'NOTICE', 'Notice', 'notice' ];
    let licenseContentTypes = { 'text/plain': '', 'text/txt': '.txt', 'text/markdown': '.md', 'text/xml': '.xml' };
    /* Loops over different name combinations starting from the license specified
      naming (e.g., 'LICENSE.Apache-2.0') and proceeding towards more generic names. */
    for (const licenseName of [`.${l}`, '']) {
      for (const licenseFilename of licenseFilenames) {
        for (const [licenseContentType, fileExtension] of Object.entries(licenseContentTypes)) {
          let licenseFilepath = `${pkg.realPath}/${licenseFilename}${licenseName}${fileExtension}`;
          if (fs.existsSync(licenseFilepath)) {
            licenseContent.text = this.readLicenseText(licenseFilepath, licenseContentType);
            return;
          }
        }
      }
    }
  }

  /**
  * Read the file from the given path to the license text object and includes
  * content-type attribute, if not default. Returns the license text object.
  */
  private readLicenseText(licenseFilepath: string, licenseContentType: string): GenericDescription | undefined {
    let licenseText = fs.readFileSync(licenseFilepath, 'utf8');
    if (licenseText) {
      let licenseContentText: GenericDescription = { '#cdata' : licenseText };
      if (licenseContentType !== 'text/plain') {
        licenseContentText['@content-type'] = licenseContentType;
      }
      return licenseContentText;
    }
    return undefined;
  }
}
