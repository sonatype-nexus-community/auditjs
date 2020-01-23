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
import { OssIndexServerResult, Vulnerability } from "../Types/OssIndexServerResult";
import chalk from 'chalk';
import * as builder from 'xmlbuilder';

export class AuditOSSIndex {

  constructor(
    readonly quiet: boolean = false, 
    readonly json: boolean = false,
    readonly xml: boolean = false) 
  {}
  
  public auditResults(results: Array<OssIndexServerResult>): boolean {
    if (this.json) {
      return this.printJson(results);
    }
    if (this.xml) {
      return this.printJUnitXML(results);
    }

    let total = results.length;
    results = results.sort((a, b) => {
      return (a.coordinates < b.coordinates ? -1 : 1);
    });

    this.printLine('Sonabot here, beep boop beep boop, here are your Sonatype OSS Index results:');
    this.printLine(`Total dependencies audited: ${total}`);

    this.printLine('-'.repeat(process.stdout.columns));
    
    let isVulnerable: boolean = false;

    results.forEach((x: OssIndexServerResult, i: number) => {
      if (x.vulnerabilities && x.vulnerabilities.length > 0) {
        isVulnerable = true;
        this.printVulnerability(i, total, x);
      } else {
        this.printLine(chalk.keyword('lightblue')(`[${i + 1}/${total}] - ${x.toAuditLog()}`));
      }
    });

    this.printLine('-'.repeat(process.stdout.columns));

    return isVulnerable;
  }

  private printJson(results: Array<OssIndexServerResult>): boolean {
    console.log(JSON.stringify(results, null, 2));

    if (results.filter((x) => { return (x.vulnerabilities && x.vulnerabilities?.length > 0) }).length > 0) {
      return true;
    }
    return false;
  }

  private printJUnitXML(results: Array<OssIndexServerResult>): boolean {
    let testsuite = builder.create('testsuite');
    testsuite.att('tests', results.length);

    for(let i: number = 0; i < results.length; i++) {
      let testcase = testsuite.ele("testcase", {"classname": results[i].coordinates, "name": results[i].coordinates});
      let vulns = results[i].vulnerabilities;

      if (vulns) {
        if (vulns.length > 0) {
          for (let j: number = 0; j < vulns.length; j++) {
            let failure = testcase.ele("failure", { "type": vulns[j].title }, vulns[j].description);
          }
        }
      }
    }

    let xml = testsuite.end({ pretty: true });
    
    console.log(xml);

    if (results.filter((x) => { return (x.vulnerabilities && x.vulnerabilities?.length > 0) }).length > 0) {
      return true;
    }
    return false;
  }

  private getColorFromMaxScore(maxScore: number, defaultColor: string = 'darkblue'): string {
    if (maxScore > 8) {
      defaultColor = 'red';
    }
    else if (maxScore > 6) {
      defaultColor = 'orange';
    }
    else if (maxScore > 4) {
      defaultColor = 'yellow';
    }
    return defaultColor;
  }

  private printVulnerability(i: number, total: number, result: OssIndexServerResult) {
    let maxScore: number = Math.max(...result.vulnerabilities!.map((x: Vulnerability) => { return +x.cvssScore; }));
    let printVuln = (x: Array<Vulnerability>) => {
      x.forEach((y: Vulnerability) => {
        console.group();
        console.log(`Vulnerability Title: ${y.title}`);
        console.log(`ID: ${y.id}`);
        console.log(`Description: ${y.description}`);
        console.log(`CVSS Score: ${y.cvssScore}`);
        console.log(`CVSS Vector: ${y.cvssVector}`);
        console.log(`CVE: ${y.cve}`);
        console.log(`Reference: ${y.reference}`);
        console.groupEnd();
      });
    }

    console.log(chalk.keyword(this.getColorFromMaxScore(maxScore))(`[${i + 1}/${total}] - ${result.toAuditLog()}`));
    result.vulnerabilities && printVuln(result.vulnerabilities);
  }

  private printLine(line: any) {
    if (!this.quiet) {
      console.log(line);
    }
  }
}
