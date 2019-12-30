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
import path from 'path';
import { existsSync, readFileSync } from "fs";
import { Whitelist } from "../Types/Whitelist";

const whitelistFilePathPwd = path.join(process.cwd(), 'auditjs.json');

export class AuditOSSIndex {

  constructor(
    readonly quiet: boolean = false, 
    readonly json: boolean = false,
    readonly whitelistFilePath: string = whitelistFilePathPwd) 
  {}
  
  public auditResults(results: Array<OssIndexServerResult>): boolean {
    if (this.json) {
      return this.printJson(this.filterVulnerabilities(results));
    }
    results = this.filterVulnerabilities(results);
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

  private filterVulnerabilities(results: Array<OssIndexServerResult>): Array<OssIndexServerResult> {
    if (existsSync(this.whitelistFilePath)) {
      let json = readFileSync(this.whitelistFilePath);

      let whitelist = JSON.parse(json.toString());

      let whitelistArray = new Array<Whitelist>();
      whitelist.ignore.forEach((id: any) => {
        whitelistArray.push(Object.assign(Whitelist, id));
      });

      let newResults = new Array<OssIndexServerResult>();
      results.map((result) => {
        if (result.vulnerabilities && result.vulnerabilities.length > 0) {
          let vulns = new Array<Vulnerability>();
          vulns = result.vulnerabilities.filter((vuln) => {
            return !whitelistArray.some((val) => {
              return val.id === vuln.id;
            });
          });

          let newResult: any = {};
          newResult.coordinates = result.coordinates;
          newResult.reference = result.reference;
          newResult.description = result.description;
          newResult.vulnerabilities = vulns;

          newResults.push(new OssIndexServerResult(newResult));
        } else {
          newResults.push(result);
        }
      });

      return newResults;
    }
    return results;
  }

  private printLine(line: any) {
    if (!this.quiet) {
      console.log(line);
    }
  }
}
