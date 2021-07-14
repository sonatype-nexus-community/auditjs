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

import { Muncher } from './Muncher';
import path from 'path';
import fs from 'fs';
import { Coordinates } from '../Types/Coordinates';
import { DepGraph } from 'dependency-graph';
import { PackageURL } from 'packageurl-js';
import { ILogger, CycloneDXSBOMCreator, CycloneDXComponent, Bom } from '@sonatype/js-sona-types';

export class NpmList implements Muncher {
  private graph?: DepGraph<CycloneDXComponent>;

  constructor(readonly devDependencies: boolean = false, private logger: ILogger) {}

  public async getDepList(): Promise<any> {
    return await this.getInstalledDeps();
  }

  public isValid(): boolean {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    return fs.existsSync(nodeModulesPath);
  }

  public getGraph(): DepGraph<CycloneDXComponent> | undefined {
    return this.graph;
  }

  public async getSbomFromCommand(): Promise<string> {
    const sbomCreator = new CycloneDXSBOMCreator(process.cwd(), {
      devDependencies: this.devDependencies,
      includeLicenseData: false,
      includeBomSerialNumber: true,
      spartan: true,
      logger: this.logger,
    });

    const pkgInfo = await sbomCreator.getPackageInfoFromReadInstalled();

    const bom: Bom = await sbomCreator.getBom(pkgInfo);

    const sbomString = sbomCreator.toXml(bom, false);

    this.graph = sbomCreator.inverseGraph;

    return sbomString;
  }

  // turns object tree from read-installed into an array of coordinates represented node-managed deps
  public async getInstalledDeps(): Promise<Array<Coordinates>> {
    const bom: Bom = await this.getBom();
    const coordinates: Array<Coordinates> = new Array();

    bom.components.map((comp: CycloneDXComponent) => {
      const coordinate = new Coordinates(comp.name, comp.version, comp.group);
      coordinates.push(coordinate);
    });

    return coordinates;
  }

  public async getInstalledDepsAsPurls(): Promise<Array<PackageURL>> {
    const bom: Bom = await this.getBom();

    const purls: Array<PackageURL> = new Array();

    bom.components.map((comp: CycloneDXComponent) => {
      const purl = PackageURL.fromString(comp.purl);
      purls.push(purl);
    });

    return purls;
  }

  private async getBom(): Promise<Bom> {
    const sbomCreator = new CycloneDXSBOMCreator(process.cwd(), {
      devDependencies: this.devDependencies,
      includeLicenseData: false,
      includeBomSerialNumber: true,
      spartan: false,
      logger: this.logger,
    });

    const data = await sbomCreator.getPackageInfoFromReadInstalled();

    const bom: Bom = await sbomCreator.getBom(data);

    this.graph = sbomCreator.inverseGraph;

    return bom;
  }

  // recursive unit that traverses tree and terminates when object has no dependencies
  private recurseObjectTree(objectTree: any, list: Array<Coordinates>, isRootPkg = false): any {
    if (objectTree.extraneous && !this.devDependencies) {
      return;
    }
    if (!isRootPkg) {
      if (this.maybePushNewCoordinate(objectTree, list)) {
        // NO OP
      } else {
        return;
      }
    }
    if (objectTree.dependencies) {
      Object.keys(objectTree.dependencies)
        .map((x) => objectTree.dependencies[x])
        .filter((x) => typeof x !== 'string')
        .map((dep) => {
          if (
            this.toPurlObjTree(dep) == '' ||
            list.find((x) => {
              return x.toPurl() == this.toPurlObjTree(dep);
            })
          ) {
            return;
          }
          this.recurseObjectTree(dep, list, false);
        });
    }
    return;
  }

  private maybePushNewCoordinate(pkg: any, list: Array<Coordinates>): boolean {
    if (pkg.name && pkg.name.includes('/')) {
      const name = pkg.name.split('/');
      if (
        list.find((x) => {
          return x.name == name[1] && x.version == pkg.version && x.group == name[0];
        })
      ) {
        return false;
      }
      list.push(new Coordinates(name[1], pkg.version, name[0]));
      return true;
    } else if (pkg.name) {
      if (
        list.find((x) => {
          return x.name == pkg.name && x.version == pkg.version && x.group == '';
        })
      ) {
        return false;
      }
      list.push(new Coordinates(pkg.name, pkg.version, ''));
      return true;
    }
    return false;
  }

  private toPurlObjTree(objectTree: any): string {
    if (objectTree.name && objectTree.name.includes('/')) {
      const name = objectTree.name.split('/');
      return this.toPurl(name[1], objectTree.version, name[0]);
    } else if (objectTree.name) {
      return this.toPurl(objectTree.name, objectTree.version);
    } else {
      return '';
    }
  }

  private toPurl(name: string, version: string, group = ''): string {
    if (group != '') {
      return `${group}/${name}/${version}`;
    }
    return `${name}/${version}`;
  }
}
