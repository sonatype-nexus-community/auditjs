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
import { NpmList } from "./NpmList";
import { Coordinates } from "../Types/Coordinates";
import path from 'path';
import fs from 'fs';
import * as lockfile from '@yarnpkg/lockfile';

export class YarnLock extends NpmList implements Muncher {
  public isValid(): boolean {
    let tempPath = path.join(process.cwd(), "yarn.lock");
    return fs.existsSync(tempPath);
  }

  public async getDepList(): Promise<Coordinates[]> {
    return await this.getInstalledDeps();
  }

  public async getInstalledDeps(): Promise<any> {
    let file = fs.readFileSync('yarn.lock', 'utf8');
    let obj = lockfile.parse(file);

    let res = await this.parseYarnJson(obj.object);

    res = res.filter((val, index, self) => {
      return index === self.findIndex((t) => {
        return t.toPurl() === val.toPurl()
      })
    });

    return res;
  }

  private async parseYarnJson(obj: Array<any>): Promise<Array<Coordinates>> {
    let results: Array<Coordinates> = new Array();
    Object.entries(obj).map((x: Array<any>, v: any) => {
      results.push(this.createNewCoordinate(x[0], x[1].version));
    });
    return results;
  }

  private createNewCoordinate(dep: any, version: string): Coordinates {
    let strArr = dep.split("/");
    if (strArr.length > 1) {
      let name = strArr[1].split("@");
      return new Coordinates(name[0], version, strArr[0]);
    } else {
      let name = strArr[0].split("@");
      return new Coordinates(name[0], version, "");
    }
  }
}
