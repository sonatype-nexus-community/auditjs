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
import expect from '../Tests/TestHelper';
import { Coordinates } from "../Types/Coordinates";
import nock from "nock";
import { IqRequestService } from "./IqRequestService";

describe("IQRequestService", () => {
  it("should have it's third party API request rejected when the IQ Server is down", async () => {
    let internalId = "123456"
    let stage = "build"
    const scope = nock("http://testlocation:8070")
      .post(`/api/v2/scan/applications/${internalId}/sources/auditjs?stageId=${stage}`)
      .replyWithError("you messed up!");
    const requestService = new IqRequestService("admin", "admin123", "http://testlocation:8070", "testapp", stage, 300);
    const coords = [new Coordinates("commander", "2.12.2", "@types")];

    return expect(requestService.submitToThirdPartyAPI(coords, internalId)).to.eventually.be
      .rejected;
  });

  it("should have it's internal ID API request rejected when the IQ Server is down", async () => {
    let stage = "build"
    const scope = nock("http://testlocation:8070")
      .get(`/api/v2/applications?publicId=testapp`)
      .replyWithError("you messed up!");
    const requestService = new IqRequestService("admin", "admin123", "http://testlocation:8070", "testapp", stage, 300);

    return expect(requestService.getApplicationInternalId()).to.eventually.be
      .rejected;
  });

  it("should have it's internal ID API request accepted when the IQ Server is not down", async () => {

    let response = {
      statusCode: 200,
      body: {
        "applications": [
          {
            "id": "4bb67dcfc86344e3a483832f8c496419",
            "publicId": "testapp",
            "name": "TestApp",
            "organizationId": "bb41817bd3e2403a8a52fe8bcd8fe25a",
            "contactUserName": "NewAppContact",
            "applicationTags": [
              {
                "id": "9beee80c6fc148dfa51e8b0359ee4d4e",
                "tagId": "cfea8fa79df64283bd64e5b6b624ba48",
                "applicationId": "4bb67dcfc86344e3a483832f8c496419"
              }
            ]
          }
        ]
      }
    }

    let stage = "build"
    const scope = nock("http://testlocation:8070")
      .get(`/api/v2/applications?publicId=testapp`)
      .reply(response.statusCode, response.body);

    const requestService = new IqRequestService("admin", "admin123", "http://testlocation:8070", "testapp", stage, 300);

    return expect(requestService.getApplicationInternalId()).to.eventually.equal("4bb67dcfc86344e3a483832f8c496419");
  });
});
