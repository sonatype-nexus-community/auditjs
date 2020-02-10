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
import { IqServerResult } from "../Types/IqServerResult";
import { ReportStatus } from "../Types/ReportStatus";
import chalk = require("chalk");

export class AuditIQServer {
  public auditThirdPartyResults(results: ReportStatus): boolean {
    if (results.isError) {
      console.log();
      console.group();
      console.error(results.errorMessage);
      console.groupEnd();
      console.log();
      return true;
    }
    if (results.policyAction === 'Failure') {
      console.log();
      console.group();
      console.error("Sonabot here, you have some build-breaking policy violations to clean up!");
      console.error(chalk.keyword('orange').bold(`Report URL: ${results.reportHtmlUrl}`));
      console.groupEnd();
      console.log();
      return true;
    }
    console.log();
    console.group();
    console.log("Wonderbar! No build-breaking violations for this stage. You may still have non-breaking policy violations in the report.");
    console.log(chalk.keyword('green').bold(`Report URL: ${results.reportHtmlUrl}`));
    console.groupEnd();
    console.log();
    return false;
  }

  public auditResults(results: Array<IqServerResult>): boolean {
    let total = results.length;
    results = results.sort((a, b) => {
      return (a.component.packageUrl < b.component.packageUrl ? -1 : 1);
    });

    console.log();
    console.group();
    console.log('Sonabot here, beep boop beep boop, here are your Nexus IQ Server results:');
    console.log(`Total dependencies audited: ${total}`);
    console.groupEnd();
    console.log();

    console.log('-'.repeat(process.stdout.columns));
    
    results.forEach((x: IqServerResult, i: number) => {
      console.log(`[${i + 1}/${total}] - ${x.toAuditLog()}`);
    });

    console.log('-'.repeat(process.stdout.columns));

    // TODO: Temporary failure on purpose
    return false;
  }
}
