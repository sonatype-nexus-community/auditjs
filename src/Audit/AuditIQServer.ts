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

export class AuditIQServer {
  public auditThirdPartyResults(results: ReportStatus): boolean {
    if (results.isError) {
      console.error(results.errorMessage);
      return true;
    }
    if (results.policyAction === 'Failure') {
      console.error("Sonabot here, you have some build-breaking policy violations to clean up!");
      console.error(`Report URL: ${results.reportHtmlUrl}`);
      return true;
    }
    console.log("Wonderbar! No build-breaking violations for this stage. You may still have non-breaking policy violations in the report.");
    console.log(`Report URL: ${results.reportHtmlUrl}`);
    return false;
  }

  public auditResults(results: Array<IqServerResult>): boolean {
    let total = results.length;
    results = results.sort((a, b) => {
      return (a.component.packageUrl < b.component.packageUrl ? -1 : 1);
    });

    console.log('Sonabot here, beep boop beep boop, here are your Nexus IQ Server results:');
    console.log(`Total dependencies audited: ${total}`);

    console.log('-'.repeat(process.stdout.columns));
    
    results.forEach((x: IqServerResult, i: number) => {
      console.log(`[${i + 1}/${total}] - ${x.toAuditLog()}`);
    });

    console.log('-'.repeat(process.stdout.columns));

    // TODO: Temporary failure on purpose
    return false;
  }
}
