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

import { readFileSync } from 'fs';
import path from 'path';

import { OssIndexServerResult } from '../Types/OssIndexServerResult';

const licenseExcludeFilePathPwd = path.join(process.cwd(), 'auditjs.json');

export const filterLicenses = async (
  results: Array<OssIndexServerResult>,
  licenseExcludeFilePath: string = licenseExcludeFilePathPwd,
): Promise<Array<OssIndexServerResult>> => {
  let json: Buffer;
  try {
    json = readFileSync(licenseExcludeFilePath, { flag: 'r+' });
  } catch (e) {
    return results;
  }

  try {
    const licenseList = JSON.parse(json.toString());

    const licenseBannedSet = new Set(licenseList.acceptedLicenses.map((license: any) => license));

    const newResults = results.map((result) => {
      if (result.license) {
        result.license.banned = !licenseBannedSet.has(result.license.id || result.license.name);

        return new OssIndexServerResult({
          ...result
        }, result.license);
      }

      return result;
    });

    return newResults;
  } catch (e) {
    throw new Error(
      `There was an issue checking licenses likely based on your license exclusion list, please check ${licenseExcludeFilePath}, to ensure it is valid JSON, and review stack trace for more information, stack trace: ${e.stack}`,
    );
  }
};