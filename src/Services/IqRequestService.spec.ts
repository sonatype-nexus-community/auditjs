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

import { expect, vi, describe, it, afterEach, beforeEach } from 'vitest';
import { applicationInternalIdResponse } from '../Tests/TestHelper';
import { Coordinates } from '../Types/Coordinates';
import { IqRequestService } from './IqRequestService';

// Mock node-fetch since source files still use it
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

import nodeFetch from 'node-fetch';
const mockFetch = nodeFetch as unknown as ReturnType<typeof vi.fn>;

function makeResponse(statusCode: number, body: any, ok?: boolean): any {
  const isOk = ok !== undefined ? ok : statusCode >= 200 && statusCode < 300;
  return {
    ok: isOk,
    status: statusCode,
    statusText: statusCode === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  };
}

describe('IQRequestService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should have it's third party API request rejected when the IQ Server is down", async () => {
    // First call: GET applications (returns error as per nock order)
    mockFetch.mockRejectedValueOnce(new Error('you messed up!'));

    const requestService = new IqRequestService(
      'admin',
      'admin123',
      'http://testlocation:8070',
      'testapp',
      'build',
      300,
      false,
    );
    const coords = [new Coordinates('commander', '2.12.2', '@types')];

    await expect(requestService.submitToThirdPartyAPI(coords)).rejects.toThrow();
  });

  it('should respond with an error if the response for an ID is bad', async () => {
    const stage = 'build';

    // GET applications returns a response without the expected structure
    mockFetch.mockResolvedValueOnce(
      makeResponse(applicationInternalIdResponse.statusCode, { thereisnoid: 'none' }),
    );

    const requestService = new IqRequestService(
      'admin',
      'admin123',
      'http://testlocation:8070',
      'testapp',
      stage,
      300,
      false,
    );
    const coords = [new Coordinates('commander', '2.12.2', '@types')];

    await expect(requestService.submitToThirdPartyAPI(coords)).rejects.toThrow(
      'No valid ID on response from Nexus IQ, potentially check the public application ID you are using',
    );
  });

  it("should have it's third party API request accepted when the IQ Server is up", async () => {
    const internalId = '4bb67dcfc86344e3a483832f8c496419';
    const stage = 'build';
    const statusUrl =
      'api/v2/scan/applications/a20bc16e83944595a94c2e36c1cd228e/status/9cee2b6366fc4d328edc318eae46b2cb';

    // First call: GET applications
    mockFetch.mockResolvedValueOnce(
      makeResponse(applicationInternalIdResponse.statusCode, applicationInternalIdResponse.body),
    );
    // Second call: POST scan
    mockFetch.mockResolvedValueOnce(makeResponse(202, { statusUrl }));

    const requestService = new IqRequestService(
      'admin',
      'admin123',
      'http://testlocation:8070',
      'testapp',
      stage,
      300,
      false,
    );
    const coords = [new Coordinates('commander', '2.12.2', '@types')];

    const result = await requestService.submitToThirdPartyAPI(coords);
    expect(result).toEqual(statusUrl);
  });

  it("should have it's third party API request rejected when IQ Server is up but API gives bad response", async () => {
    const stage = 'build';

    // First call: GET applications
    mockFetch.mockResolvedValueOnce(
      makeResponse(applicationInternalIdResponse.statusCode, applicationInternalIdResponse.body),
    );
    // Second call: POST scan - returns 404
    mockFetch.mockResolvedValueOnce(makeResponse(404, {}, false));

    const requestService = new IqRequestService(
      'admin',
      'admin123',
      'http://testlocation:8070',
      'testapp',
      stage,
      300,
      false,
    );
    const coords = [new Coordinates('commander', '2.12.2', '@types')];

    await expect(requestService.submitToThirdPartyAPI(coords)).rejects.toThrow(
      'Unable to submit to Third Party API',
    );
  });

  it('should have return a proper result when polling IQ Server and the request is eventually valid', async () => {
    const responseBody = {
      policyAction: 'None',
      reportHtmlUrl: 'http://localhost:8070/ui/links/application/test-app/report/95c4c14e',
      isError: false,
    };

    const stage = 'build';

    // Call for polling the status URL
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseBody));

    const requestService = new IqRequestService(
      'admin',
      'admin123',
      'http://testlocation:8070',
      'testapp',
      stage,
      300,
      false,
    );

    await new Promise<void>((resolve, reject) => {
      requestService.asyncPollForResults(
        'http://testlocation:8070/api/v2/scan/applications/a20bc16e83944595a94c2e36c1cd228e/status/9cee2b6366fc4d328edc318eae46b2cb',
        (error: any) => {
          reject(new Error(error.message || 'polling error'));
        },
        (x: any) => {
          expect(x.reportHtmlUrl).toEqual(
            'http://localhost:8070/ui/links/application/test-app/report/95c4c14e',
          );
          resolve();
        },
      );
    });
  });
});
