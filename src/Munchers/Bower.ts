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
import { Coordinates } from "../Types/Coordinates";
import path from 'path';
import fs from 'fs';
import _ from "lodash";

export class Bower implements Muncher {

  getSbomFromCommand(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public isValid(): boolean {
    let tempPath = path.join(process.cwd(), "bower.json");
    return fs.existsSync(tempPath);
  }

  public async getDepList(): Promise<Coordinates[]> {
    return await this.getInstalledDeps();
  }

  public async getInstalledDeps(): Promise<Coordinates[]> {
    let depsArray: Array<Coordinates> = new Array();
    let file = fs.readFileSync(path.join(process.cwd(), 'bower.json'));
    let json = JSON.parse(file.toString());
    Object.keys(json.dependencies).map((x: any) => {
      let version: string = json.dependencies[x];
      depsArray.push(new Coordinates(x, version.replace("~", ""), ""));
    });

    return depsArray;
  }
}
