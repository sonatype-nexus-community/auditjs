/*
 * Copyright (c) 2020-present Sonatype, Inc.
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
import elementtree from 'elementtree';
import { HashCoordinate } from '../Types/HashCoordinate';

export class Merger {

  constructor(readonly algorithm: string = 'SHA-1') {}

  public async mergeHashesIntoSbom(hashes: HashCoordinate[], xml: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let tree = elementtree.parse(xml);
      let components = tree.find('./components');
      if (!components) {
        reject();
      }
      hashes.map((val) => {
        if (components) {
          let component = elementtree.SubElement(components, 'component')
          let name = elementtree.SubElement(component, 'name');
          name.text = val.path;
          let version = elementtree.SubElement(component, 'version');
          let hash = elementtree.SubElement(component, 'hash', {'alg': this.algorithm});
          hash.text = val.hash;
        } 
      });
      resolve(tree.write());
    });
  }
}
