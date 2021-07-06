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

import { create }from 'xmlbuilder2';

import { Formatter, getNumberOfVulnerablePackagesFromResults } from './Formatter';
import { OssIndexServerResult, Vulnerability } from '../../Types/OssIndexServerResult';

export class XmlFormatter implements Formatter {
  public printAuditResults(list: Array<OssIndexServerResult>) {
    const testsuite = create().ele('testsuite');
    testsuite.att('tests', list.length.toString());
    testsuite.att('timestamp', new Date().toISOString());
    testsuite.att('failures', getNumberOfVulnerablePackagesFromResults(list).toString());

    for (let i = 0; i < list.length; i++) {
      const testcase = testsuite.ele('testcase', { classname: list[i].coordinates, name: list[i].coordinates });
      const vulns = list[i].vulnerabilities;

      if (vulns) {
        if (vulns.length > 0) {
          const failure = testcase.ele('failure');
          let failureText = '';
          for (let j = 0; j < vulns.length; j++) {
            failureText += this.getVulnerabilityForXmlBlock(vulns[j]) + '\n';
          }
          failure.txt(failureText);
          failure.att('type', 'Vulnerability detected');
        }
      }
    }

    const xml = testsuite.end({ prettyPrint: true });

    console.log(xml);
  }

  private getVulnerabilityForXmlBlock(vuln: Vulnerability): string {
    let vulnBlock = '';
    vulnBlock += `Vulnerability Title: ${vuln.title}\n`;
    vulnBlock += `ID: ${vuln.id}\n`;
    vulnBlock += `Description: ${vuln.description}\n`;
    vulnBlock += `CVSS Score: ${vuln.cvssScore}\n`;
    vulnBlock += `CVSS Vector: ${vuln.cvssVector}\n`;
    vulnBlock += `CVE: ${vuln.cve}\n`;
    vulnBlock += `Reference: ${vuln.reference}\n`;

    return vulnBlock;
  }
}
