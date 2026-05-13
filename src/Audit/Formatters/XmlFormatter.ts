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

import { Formatter, getNumberOfVulnerablePackagesFromResults } from './Formatter';
import { OssIndexServerResult, Vulnerability } from '../../Types/OssIndexServerResult';

export class XmlFormatter implements Formatter {
  public printAuditResults(list: Array<OssIndexServerResult>) {
    const failures = getNumberOfVulnerablePackagesFromResults(list);
    const timestamp = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<testsuite tests="${list.length}" timestamp="${timestamp}" failures="${failures}">\n`;

    for (const result of list) {
      const name = this.escapeXml(result.coordinates);
      const vulns = result.vulnerabilities;

      if (vulns && vulns.length > 0) {
        xml += `  <testcase classname="${name}" name="${name}">\n`;
        xml += `    <failure type="Vulnerability detected">`;
        for (const vuln of vulns) {
          xml += this.getVulnerabilityForXmlBlock(vuln);
        }
        xml += `\n    </failure>\n`;
        xml += `  </testcase>\n`;
      } else {
        xml += `  <testcase classname="${name}" name="${name}"/>\n`;
      }
    }

    xml += `</testsuite>`;
    console.log(xml);
  }

  private getVulnerabilityForXmlBlock(vuln: Vulnerability): string {
    let vulnBlock = '\n';
    vulnBlock += `Vulnerability Title: ${vuln.title}\n`;
    vulnBlock += `ID: ${vuln.id}\n`;
    vulnBlock += `Description: ${vuln.description}\n`;
    vulnBlock += `CVSS Score: ${vuln.cvssScore}\n`;
    vulnBlock += `CVSS Vector: ${vuln.cvssVector}\n`;
    vulnBlock += `CVE: ${vuln.cve}\n`;
    vulnBlock += `Reference: ${vuln.reference}\n`;

    return vulnBlock;
  }

  private escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
