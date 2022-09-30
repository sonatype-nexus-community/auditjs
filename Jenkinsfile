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
@Library(['private-pipeline-library', 'jenkins-shared']) _

dockerizedBuildPipeline(
  buildImageId: "${sonatypeDockerRegistryId()}/cdi/node-12:1",
  deployBranch: 'main',
  prepare: {
    githubStatusUpdate('pending')
  },
  buildAndTest: {
    sh '''
    yarn
    yarn build
    yarn test-ci
    # prep for scan of only production dependencies
    rm -rf node_modules
    yarn install --production --frozen-lockfile
    '''
  },
  vulnerabilityScan: {
    withDockerImage(env.DOCKER_IMAGE_ID, {
      withCredentials([usernamePassword(credentialsId: 'jenkins-iq',
        usernameVariable: 'IQ_USERNAME', passwordVariable: 'IQ_PASSWORD')]) {
        sh 'npx auditjs@latest iq -x -a auditjs -s release -u $IQ_USERNAME -p $IQ_PASSWORD -h https://iq.sonatype.dev'
      }
    })
  },
  testResults: [ 'reports/test-results.xml' ],
  onSuccess: {
    githubStatusUpdate('success')
  },
  onFailure: {
    githubStatusUpdate('failure')
    notifyChat(currentBuild: currentBuild, env: env, room: 'community-oss-fun')
    sendEmailNotification(currentBuild, env, [], 'community-group@sonatype.com')
  }
)
