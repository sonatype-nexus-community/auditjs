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
import { OssIndexCoordinates } from '../Types/OssIndexCoordinates';
import { Coordinates } from '../Types/Coordinates';
import fetch from 'node-fetch';
import { Response } from 'node-fetch';
import NodePersist from 'node-persist';
import path from 'path';
import { OssIndexServerResult } from '../Types/OssIndexServerResult';
import { homedir } from 'os';
import { RequestHelpers } from './RequestHelpers';

const OSS_INDEX_BASE_URL = 'https://ossindex.sonatype.org/';

const COMPONENT_REPORT_ENDPOINT = 'api/v3/component-report';

const MAX_COORDINATES = 128;

const PATH = path.join(homedir(), '.ossindex', 'auditjs');

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export class OssIndexRequestService {
  constructor(
    readonly user?: string,
    readonly password?: string,
    private baseURL: string = OSS_INDEX_BASE_URL,
    private cacheLocation: string = PATH,
  ) {}

  private checkStatus(res: Response): Response {
    if (res.ok) {
      return res;
    }
    throw new Error(`${res.statusText}`);
  }

  private getHeaders(): string[][] {
    if (this.user && this.password) {
      return [['Content-Type', 'application/json'], this.getBasicAuth(), RequestHelpers.getUserAgent()];
    }
    return [['Content-Type', 'application/json'], RequestHelpers.getUserAgent()];
  }

  private getResultsFromOSSIndex(data: OssIndexCoordinates): Promise<object> {
    const response = fetch(`${this.baseURL}${COMPONENT_REPORT_ENDPOINT}`, {
      method: 'post',
      body: JSON.stringify(data.toConsumeableRequestObject()),
      headers: this.getHeaders(),
    })
      .then(this.checkStatus)
      .then((res) => res.json())
      .catch((err) => {
        throw new Error(`There was an error making the request: ${err}`);
      });
    return response;
  }

  private chunkData(data: Coordinates[]): Array<Array<Coordinates>> {
    const chunks = [];
    while (data.length > 0) {
      chunks.push(data.splice(0, MAX_COORDINATES));
    }
    return chunks;
  }

  private combineResponseChunks(data: [][]): Array<OssIndexServerResult> {
    return [].concat.apply([], data);
  }

  private combineCacheAndResponses(
    combinedChunks: Array<OssIndexServerResult>,
    dataInCache: Array<OssIndexServerResult>,
  ): Array<OssIndexServerResult> {
    return combinedChunks.concat(dataInCache);
  }

  private async insertResponsesIntoCache(response: Array<OssIndexServerResult>) {
    // console.debug(`Preparing to cache ${response.length} coordinate responses`);

    for (let i = 0; i < response.length; i++) {
      await NodePersist.setItem(response[i].coordinates, response[i]);
    }

    // console.debug(`Done caching`);
    return response;
  }

  private async checkIfResultsAreInCache(data: Coordinates[], format = 'npm'): Promise<PurlContainer> {
    const inCache = new Array<OssIndexServerResult>();
    const notInCache = new Array<Coordinates>();

    for (let i = 0; i < data.length; i++) {
      const coord = data[i];
      const dataInCache = await NodePersist.getItem(coord.toPurl(format));
      if (dataInCache) {
        inCache.push(dataInCache);
      } else {
        notInCache.push(coord);
      }
    }

    return new PurlContainer(inCache, notInCache);
  }

  /**
   * Posts to OSS Index {@link COMPONENT_REPORT_ENDPOINT}, returns Promise of json object of response
   * @param data - {@link Coordinates} Array
   * @returns a {@link Promise} of all Responses
   */
  public async callOSSIndexOrGetFromCache(data: Coordinates[], format = 'npm'): Promise<any> {
    await NodePersist.init({ dir: this.cacheLocation, ttl: TWELVE_HOURS });
    const responses = new Array();
    // console.debug(`Purls received, total purls before chunk: ${data.length}`);
    const results = await this.checkIfResultsAreInCache(data, format);
    const chunkedPurls = this.chunkData(results.notInCache);

    for (const chunk of chunkedPurls) {
      try {
        const res = this.getResultsFromOSSIndex(new OssIndexCoordinates(chunk.map((x) => x.toPurl(format))));
        responses.push(res);
      } catch (e) {
        throw new Error(e);
      }
    }

    return Promise.all(responses)
      .then((resolvedResponses) => this.combineResponseChunks(resolvedResponses))
      .then((combinedResponses) => this.insertResponsesIntoCache(combinedResponses))
      .then((combinedResponses) => this.combineCacheAndResponses(combinedResponses, results.inCache))
      .catch((err) => {
        throw err;
      });
  }

  private getBasicAuth(): string[] {
    return ['Authorization', 'Basic ' + Buffer.from(this.user + ':' + this.password).toString('base64')];
  }
}

class PurlContainer {
  constructor(readonly inCache: OssIndexServerResult[], readonly notInCache: Coordinates[]) {}
}
