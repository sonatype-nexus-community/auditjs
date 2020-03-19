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
import { OssIndexServerResult } from '../Types/OssIndexServerResult';
import { Formatter, getNumberOfVulnerablePackagesFromResults } from './Formatters/Formatter';
import { JsonFormatter } from './Formatters/JsonFormatter';
import { TextFormatter } from './Formatters/TextFormatter';
import { XmlFormatter } from './Formatters/XmlFormatter';
import { Coordinates } from '../Types/Coordinates';

export class AuditOSSIndex {
  private formatter: Formatter;

  constructor(readonly quiet: boolean = false, readonly json: boolean = false, readonly xml: boolean = false) {
    if (json) {
      this.formatter = new JsonFormatter();
    } else if (xml) {
      this.formatter = new XmlFormatter();
    } else {
      this.formatter = new TextFormatter(quiet);
    }
  }

  public auditResults(results: Array<OssIndexServerResult>, supplemental: Array<Coordinates>): boolean {
    if (this.quiet) {
      results = results.filter((x) => {
        return x.vulnerabilities && x.vulnerabilities?.length > 0;
      });
    }
    for (let i = 0; i < supplemental.length; i++) {
      let index = results.findIndex((res) => res.coordinates == supplemental[i].toPurl());
      results[index].requiredBy = Array.from(supplemental[i].requestedBy).join(', ');
      results[index].realPath = supplemental[i].pathOnDisk;
    }

    this.formatter.printAuditResults(results);

    return getNumberOfVulnerablePackagesFromResults(results) > 0;
  }
}
