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

  public async getDepList(): Promise<Coordinates[]> {
    return await this.getInstalledDeps();
  }

  public isValid(): boolean {
    let tempPath = path.join(process.cwd(), "package-lock.json");
    return fs.existsSync(tempPath);
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
  public async getInstalledDeps(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Calls read-installed module, passes returned object tree to data, passes in current directory
      readInstalled(process.cwd(), { dev: this.devDependencies }, async (err: any, data: any) => {
        if (err) {
          reject(err);
        }
        // parses object tree into coordinates array and puts into results
        let results = this.parseObjectTree(data);
        
        results = results.filter((val, index, self) => {
          return index === self.findIndex((t) => {
            return t.toPurl() === val.toPurl()
          })
        });

        resolve(results);
      });
    }); 
  }

  // initializes dep array and enters the object tree recursion
  private parseObjectTree(objectTree: any): Array<Coordinates> {
    this.recurseObjectTree(objectTree, true);
    return this.depsArray;
  }

  // recursive unit that traverses tree and terminates when object has no dependencies
  private recurseObjectTree(objectTree: any, isRootPkg: boolean = false, i: number = 0) {
    if (objectTree.dependencies) {
      // maps the object we're at into an array looping through dependencies
      // dep[1] is the object that has the info for the purl and is passed into the next recursive step
      Object.keys(objectTree.dependencies)
        .map((x) => objectTree.dependencies[x])
        .map((dep) => {
        if (this.depsArray.find((x) => { return (x.name == dep.name && x.version == dep.version)})) {
          return;
        }
        
        if (dep.extraneous) {
          return;
        }
        
        // the name will either have the group/name or it won't, the mapped array also has version
        if (dep.name && dep.name.includes('/')) {
          let name = dep.name.split('/');
          this.depsArray.push(new Coordinates(name[1], dep.version, name[0]));
        }
        else if (dep.name) {
          this.depsArray.push(new Coordinates(dep.name, dep.version, ""));
        }
        else {
          return;
        }
        this.recurseObjectTree(dep, false, i++);
      });
    }
  }
}
