/*
 * Copyright (c) 2019-Present Sonatype, Inc.
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

import fetch from 'node-fetch';
import { RequestHelpers } from './RequestHelpers';
import { logMessage, DEBUG } from '../Application/Logger/Logger';
import { URL } from 'url';

const APPLICATION_INTERNAL_ID_ENDPOINT = '/api/v2/applications?publicId=';

export class IqRequestService {
  private internalId = '';
  private isInitialized = false;

  constructor(
    readonly user: string,
    readonly password: string,
    readonly host: string,
    readonly application: string,
    readonly stage: string,
    readonly timeout: number,
  ) {}

  private async init(): Promise<void> {
    try {
      this.internalId = await this.getApplicationInternalId();
      this.isInitialized = true;
    } catch (e) {
      throw new Error(e);
    }
  }

  private timeoutAttempts = 0;

  private async getApplicationInternalId(): Promise<string> {
    const response = await fetch(`${this.host}${APPLICATION_INTERNAL_ID_ENDPOINT}${this.application}`, {
      method: 'get',
      headers: [this.getBasicAuth(), RequestHelpers.getUserAgent()],
    });
    if (response.ok) {
      const res = await response.json();
      try {
        return res.applications[0].id;
      } catch (e) {
        throw new Error(
          `No valid ID on response from Nexus IQ, potentially check the public application ID you are using`,
        );
      }
    } else {
      throw new Error(
        'Unable to connect to IQ Server with http status ' +
          response.status +
          '. Check your credentials and network connectivity by hitting Nexus IQ at ' +
          this.host +
          ' in your browser.',
      );
    }
  }

  public async submitToThirdPartyAPI(data: any): Promise<string> {
    if (!this.isInitialized) {
      await this.init();
    }
    logMessage('Internal ID', DEBUG, { internalId: this.internalId });

    const response = await fetch(
      `${this.host}/api/v2/scan/applications/${this.internalId}/sources/auditjs?stageId=${this.stage}`,
      {
        method: 'post',
        headers: [this.getBasicAuth(), RequestHelpers.getUserAgent(), ['Content-Type', 'application/xml']],
        body: data,
      },
    );
    if (response.ok) {
      const json = await response.json();
      return json.statusUrl as string;
    } else {
      const body = await response.text();
      logMessage('Response from third party API', DEBUG, { response: body });
      throw new Error(`Unable to submit to Third Party API`);
    }
  }

  public async asyncPollForResults(
    url: string,
    errorHandler: (error: any) => any,
    pollingFinished: (body: any) => any,
  ): Promise<void> {
    logMessage(url, DEBUG);
    let mergeUrl: URL;
    try {
      mergeUrl = this.getURLOrMerge(url);

      // https://www.youtube.com/watch?v=Pubd-spHN-0
      const response = await fetch(mergeUrl.href, {
        method: 'get',
        headers: [this.getBasicAuth(), RequestHelpers.getUserAgent()],
      });

      const body = response.ok;
      // TODO: right now I think we cover 500s and 400s the same and we'd continue polling as a result. We should likely switch
      // to checking explicitly for a 404 and if we get a 500/401 or other throw an error
      if (!body) {
        this.timeoutAttempts += 1;
        if (this.timeoutAttempts > this.timeout) {
          errorHandler({
            message:
              'Polling attempts exceeded, please either provide a higher limit via the command line using the timeout flag, or re-examine your project and logs to see if another error happened',
          });
        }
        setTimeout(() => this.asyncPollForResults(url, errorHandler, pollingFinished), 1000);
      } else {
        const json = await response.json();
        pollingFinished(json);
      }
    } catch (e) {
      errorHandler({ title: e.message });
    }
  }

  private getURLOrMerge(url: string): URL {
    try {
      return new URL(url);
    } catch (e) {
      logMessage(e.title, DEBUG, { message: e.message });
      if (this.host.endsWith('/')) {
        return new URL(this.host.concat(url));
      }
      return new URL(this.host.concat('/' + url));
    }
  }

  private getBasicAuth(): string[] {
    return ['Authorization', 'Basic ' + Buffer.from(this.user + ':' + this.password).toString('base64')];
  }
}
