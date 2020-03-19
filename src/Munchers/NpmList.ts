/*
 * Copyright (c) 2019-present Sonatype, Inc.
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
import { Muncher } from './Muncher';
import path from 'path';
import fs from 'fs';
import { Coordinates } from '../Types/Coordinates';
import { CycloneDXSbomCreator } from '../CycloneDX/CycloneDXSbomCreator';

export class NpmList implements Muncher {
  private depsArray: Array<Coordinates> = [];

  constructor(readonly devDependencies: boolean = false) {}

  public async getDepList(): Promise<any> {
    return await this.getInstalledDeps();
  }

  public isValid(): boolean {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    return fs.existsSync(nodeModulesPath);
  }

  // TODO: There is a 1 component discrepency in what gets identified by our installed deps implementation
  // and what gets identified by the iq server being passed the sbom, gotta figure out what that is and why...
  public async getSbomFromCommand(): Promise<string> {
    const sbomCreator = new CycloneDXSbomCreator(process.cwd(), {
      devDependencies: this.devDependencies,
      includeLicenseData: false,
      includeBomSerialNumber: true,
    });

    const pkgInfo = await sbomCreator.getPackageInfoFromReadInstalled();

    const result = await sbomCreator.createBom(pkgInfo);

    return result;
  }

  // turns object tree from read-installed into an array of coordinates represented node-managed deps
  public async getInstalledDeps(): Promise<Array<Coordinates>> {
    const sbomCreator = new CycloneDXSbomCreator(process.cwd(), {
      devDependencies: this.devDependencies,
    });

    const data = await sbomCreator.getPackageInfoFromReadInstalled();

    this.recurseObjectTree(data, this.depsArray, true);

    return this.depsArray;
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
        const foundIndex = list.findIndex((x) => x.name == name[1] && x.version == pkg.version && x.group == name[0]);
        pkg._requiredBy.forEach((item: string) => {
          list[foundIndex].requestedBy.add(item);
        });

        return false;
      }
      let set = new Set<string>();
      pkg._requiredBy.forEach((item: string) => {
        set.add(item);
      });
      list.push(
        new Coordinates(name[1], pkg.version, name[0], set, this.stripPwdAndNodeModulesFromRealPath(pkg.realPath)),
      );
      return true;
    } else if (pkg.name) {
      if (
        list.find((x) => {
          return x.name == pkg.name && x.version == pkg.version && x.group == '';
        })
      ) {
        const foundIndex = list.findIndex((x) => x.name == pkg.name && x.version == pkg.version && x.group == '');
        pkg._requiredBy.forEach((item: string) => {
          list[foundIndex].requestedBy.add(item);
        });

        return false;
      }
      let set = new Set<string>();
      pkg._requiredBy.forEach((item: string) => {
        set.add(item);
      });
      list.push(new Coordinates(pkg.name, pkg.version, '', set, this.stripPwdAndNodeModulesFromRealPath(pkg.realPath)));
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

  private stripPwdAndNodeModulesFromRealPath(realPath: string): string {
    const cwd = process.cwd();

    return realPath.substr(cwd.length);
  }
}
