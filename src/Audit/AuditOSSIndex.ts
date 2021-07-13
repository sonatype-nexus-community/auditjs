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

import { ComponentDetails } from '@sonatype/js-sona-types';
import { AuditGraph } from './AuditGraph';
import { Formatter, getNumberOfVulnerablePackagesFromResults } from './Formatters/Formatter';
import { JsonFormatter } from './Formatters/JsonFormatter';
import { TextFormatter } from './Formatters/TextFormatter';
import { XmlFormatter } from './Formatters/XmlFormatter';

export class AuditOSSIndex {
  private formatter: Formatter;

  constructor(
    readonly quiet: boolean = false,
    readonly json: boolean = false,
    readonly xml: boolean = false,
    private graph?: AuditGraph,
  ) {
    if (json) {
      this.formatter = new JsonFormatter();
    } else if (xml) {
      this.formatter = new XmlFormatter();
    } else {
      this.formatter = new TextFormatter(quiet, graph);
    }
  }

  public auditResults(results: ComponentDetails): boolean {
    if (this.quiet) {
      results.componentDetails = results.componentDetails.filter((x) => {
        return x.securityData && x.securityData.securityIssues && x.securityData.securityIssues.length > 0;
      });
    }

    this.formatter.printAuditResults(results);

    return getNumberOfVulnerablePackagesFromResults(results) > 0;
  }
}
