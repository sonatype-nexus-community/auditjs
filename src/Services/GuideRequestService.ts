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

import { OSSIndexCompatibilityApi, RecommendationsApi, Configuration } from '@sonatype/sonatype-guide-api-client';
import type { RecommendationResponse } from '@sonatype/sonatype-guide-api-client';
import NodePersist from 'node-persist';
import path from 'path';
import { homedir } from 'os';
import { Coordinates } from '../Types/Coordinates';
import { OssIndexServerResultJSON } from '../Types/OssIndexServerResult';

const GUIDE_BASE_URL = 'https://api.guide.sonatype.com';

const MAX_COORDINATES = 128;

const CACHE_PATH = path.join(homedir(), '.sonatype-guide', 'auditjs');

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export class GuideRequestService {
  private api: OSSIndexCompatibilityApi;
  private recommendationsApi: RecommendationsApi;

  constructor(
    readonly username?: string,
    readonly token?: string,
    readonly cacheLocation: string = CACHE_PATH,
    readonly server: string = GUIDE_BASE_URL,
    readonly accessToken?: string,
  ) {
    const config =
      accessToken && !username
        ? new Configuration({ accessToken, basePath: server })
        : new Configuration({ username, password: token, basePath: server });
    this.api = new OSSIndexCompatibilityApi(config);
    this.recommendationsApi = new RecommendationsApi(config);
  }

  public async getRecommendations(purls: string[]): Promise<Map<string, RecommendationResponse>> {
    const results = new Map<string, RecommendationResponse>();
    await Promise.allSettled(
      purls.map(async (purl) => {
        try {
          const response = await this.recommendationsApi.getRecommendations({ recommendationRequest: { purl } });
          results.set(purl, response);
        } catch {
          // skip components where recommendations are unavailable
        }
      }),
    );
    return results;
  }

  private chunkData(data: Coordinates[]): Array<Array<Coordinates>> {
    const chunks = [];
    const copy = [...data];
    while (copy.length > 0) {
      chunks.push(copy.splice(0, MAX_COORDINATES));
    }
    return chunks;
  }

  private combineResponseChunks(data: OssIndexServerResultJSON[][]): Array<OssIndexServerResultJSON> {
    return ([] as OssIndexServerResultJSON[]).concat(...data);
  }

  private combineCacheAndResponses(
    combinedChunks: Array<OssIndexServerResultJSON>,
    dataInCache: Array<OssIndexServerResultJSON>,
  ): Array<OssIndexServerResultJSON> {
    return combinedChunks.concat(dataInCache);
  }

  private async insertResponsesIntoCache(
    response: Array<OssIndexServerResultJSON>,
  ): Promise<Array<OssIndexServerResultJSON>> {
    for (let i = 0; i < response.length; i++) {
      await NodePersist.setItem(response[i].coordinates, response[i]);
    }
    return response;
  }

  private async checkIfResultsAreInCache(data: Coordinates[], format = 'npm'): Promise<PurlContainer> {
    const inCache = new Array<OssIndexServerResultJSON>();
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

  private async getResultsFromGuide(purls: string[]): Promise<OssIndexServerResultJSON[]> {
    try {
      const response = await this.api.getComponentReports({ purlRequestPost: { coordinates: purls } });
      return response as unknown as OssIndexServerResultJSON[];
    } catch (err) {
      const status =
        (err instanceof Object && 'response' in err && (err as { response?: { status?: number } }).response?.status) ||
        undefined;
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
  public async callGuideOrGetFromCache(data: Coordinates[], format = 'npm'): Promise<Array<OssIndexServerResultJSON>> {
    await NodePersist.init({ dir: this.cacheLocation, ttl: TWENTY_FOUR_HOURS });
    const responses: Array<Promise<OssIndexServerResultJSON[]>> = [];

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
      .catch((err: unknown) => {
        throw err;
      });
  }
}

class PurlContainer {
  constructor(
    readonly inCache: OssIndexServerResultJSON[],
    readonly notInCache: Coordinates[],
  ) {}
}
