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

import { OSSIndexCompatibilityApi, Configuration } from '@sonatype/sonatype-guide-api-client';
import NodePersist from 'node-persist';
import path from 'path';
import { homedir } from 'os';
import { Coordinates } from '../Types/Coordinates';
import { OssIndexServerResult } from '../Types/OssIndexServerResult';

const GUIDE_BASE_URL = 'https://api.guide.sonatype.com';

const MAX_COORDINATES = 128;

const CACHE_PATH = path.join(homedir(), '.sonatype-guide', 'auditjs');

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export class GuideRequestService {
  private api: OSSIndexCompatibilityApi;

  constructor(
    readonly username?: string,
    readonly token?: string,
    readonly cacheLocation: string = CACHE_PATH,
    readonly server: string = GUIDE_BASE_URL,
  ) {
    const config = new Configuration({
      username: username,
      password: token,
      basePath: server,
    });
    this.api = new OSSIndexCompatibilityApi(config);
  }

  private chunkData(data: Coordinates[]): Array<Array<Coordinates>> {
    const chunks = [];
    const copy = [...data];
    while (copy.length > 0) {
      chunks.push(copy.splice(0, MAX_COORDINATES));
    }
    return chunks;
  }

  private combineResponseChunks(data: [][]): Array<OssIndexServerResult> {
    return ([] as any[]).concat(...data);
  }

  private combineCacheAndResponses(
    combinedChunks: Array<OssIndexServerResult>,
    dataInCache: Array<OssIndexServerResult>,
  ): Array<OssIndexServerResult> {
    return combinedChunks.concat(dataInCache);
  }

  private async insertResponsesIntoCache(response: Array<OssIndexServerResult>): Promise<Array<OssIndexServerResult>> {
    for (let i = 0; i < response.length; i++) {
      await NodePersist.setItem(response[i].coordinates, response[i]);
    }
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

  private async getResultsFromGuide(purls: string[]): Promise<object> {
    try {
      const response = await this.api.getComponentReports({ purlRequestPost: { coordinates: purls } });
      return response;
    } catch (err) {
      const status = (err as any)?.response?.status;
      const detail = status ? ` (HTTP ${status})` : '';
      throw new Error(`There was an error making the request to Sonatype Guide: ${err}${detail}`);
    }
  }

  /**
   * Posts to Sonatype Guide OSS Index Compatibility API, returns Promise of json object of response.
   * Results are cached for 24 hours.
   * @param data - {@link Coordinates} Array
   * @param format - purl format string (e.g. 'npm')
   * @returns a {@link Promise} of all Responses
   */
  public async callGuideOrGetFromCache(data: Coordinates[], format = 'npm'): Promise<any> {
    await NodePersist.init({ dir: this.cacheLocation, ttl: TWENTY_FOUR_HOURS });
    const responses = new Array();

    const results = await this.checkIfResultsAreInCache(data, format);
    const chunkedPurls = this.chunkData(results.notInCache);

    for (const chunk of chunkedPurls) {
      try {
        const purls = chunk.map((x) => x.toPurl(format));
        const res = this.getResultsFromGuide(purls);
        responses.push(res);
      } catch (e) {
        throw new Error(String(e));
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
}

class PurlContainer {
  constructor(
    readonly inCache: OssIndexServerResult[],
    readonly notInCache: Coordinates[],
  ) {}
}
