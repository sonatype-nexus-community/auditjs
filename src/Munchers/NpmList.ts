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
import { Muncher } from "./Muncher";
import path from 'path';
import fs from 'fs';
import { Coordinates } from "../Types/Coordinates";
import cyclonedx__bom from '@cyclonedx/bom';
import readInstalled from 'read-installed'

export class NpmList implements Muncher {
  private depsArray: Array<Coordinates> = new Array();

  constructor(readonly devDependencies: boolean = false) {}

  public async getDepList(): Promise<any> {
    return await this.getInstalledDeps();
  }

  public isValid(): boolean {
    let nodeModulesPath = path.join(process.cwd(), "node_modules");
    return fs.existsSync(nodeModulesPath);
  }

  // TODO: There is a 1 component discrepency in what gets identified by our installed deps implementation
  // and what gets identified by the iq server being passed the sbom, gotta figure out what that is and why...

  // get cyclonedx formatted xml sbom that is submitted to the IQ Third Party API 
  public async getSbomFromCommand(): Promise<any> {
    return new Promise((resolve, reject) => {
      // create bom from node-managed dependencies, cyclonedx uses read-installed on the backend
      cyclonedx__bom.createbom("1.1", true, process.cwd(), { dev: this.devDependencies }, (err: any, out: any) => {
        if (err) {
          reject(err);
        }
        resolve(out);
      });
    });
  }

  // turns object tree from read-installed into an array of coordinates represented node-managed deps
  public async getInstalledDeps() {
    let data = await this.getReadInstalledResults();

    this.recurseObjectTree(data, this.depsArray, true);

    return this.depsArray;
  }

  private getReadInstalledResults() {
    // Calls read-installed module, passes returned object tree to data, passes in current directory
    return new Promise((resolve, reject) => {
      readInstalled(process.cwd(), { dev: this.devDependencies }, async (err: any, data: any) => {
        if (err) {
          reject(err);
        }
  
        resolve(data);
      });
    });
  }

  // recursive unit that traverses tree and terminates when object has no dependencies
  private recurseObjectTree(objectTree: any, list: Array<Coordinates>, isRootPkg: boolean = false) {
    if (objectTree.extraneous) {
      return;
    }
    if (!isRootPkg) {
      if (this.maybePushNewCoordinate(objectTree, list)) {
        // NO OP
      }
      else {
        return;
      }
    }
    if (objectTree.dependencies) {
      Object.keys(objectTree.dependencies)
        .map((x) => objectTree.dependencies[x])
        .filter((x) => typeof(x) !== 'string')
        .map((dep) => {
          if (
            this.toPurlObjTree(objectTree) == '' || 
            list.find((x) => { 
              return x.toPurl() == this.toPurlObjTree(objectTree) 
              })
            ) {
            return; 
          } else {
            this.recurseObjectTree(dep, list, false);
          }
      });
    }
    return;
  }

  private maybePushNewCoordinate(pkg: any, list: Array<Coordinates>): boolean {
    if (pkg.name && pkg.name.includes('/')) {
      let name = pkg.name.split('/');
      if (list.find((x) => { 
        return (x.name == name[1] && x.version == pkg.version && x.group == name[0])
        })
      ) { 
        return false 
      }
      list.push(new Coordinates(name[1], pkg.version, name[0]));
      return true;
    }
    else if (pkg.name) {
      if (list.find((x) => { 
        return (x.name == pkg.name && x.version == pkg.version)
        })
      ) { 
        return false 
      }
      list.push(new Coordinates(pkg.name, pkg.version, ''))
      return true;
    }
    return false;
  }

  private toPurlObjTree(objectTree: any): string {
    if (objectTree.name && objectTree.name.includes('/')) {
      let name = objectTree.name.split('/');

      return this.toPurl(name[1], objectTree.version, name[0]);
    }
    else if (objectTree.name) {
      return this.toPurl(objectTree.name, objectTree.version);
    } else {
      return '';
    }
  }

  private toPurl(name: string, version: string, group: string = ''): string {
    if (group != '') {
      return `${group}/${name}/${version}`;
    }
    return `${name}/${version}`;
  }
}
