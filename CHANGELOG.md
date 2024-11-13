## [4.0.46](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.45...v4.0.46) (2024-11-13)


### Bug Fixes

* latest mock-fs fixes failing unit tests after other updates, resolve CVE-2024-21538 in cross-spawn 7.0.3 ([7a66cbb](https://github.com/sonatype-nexus-community/auditjs/commit/7a66cbb5f7bd88e2ee6ccff70cb5ca2c88ee4846))
* resolve CVE-2024-21538 in cross-spawn : 7.0.3 ([4ade2a7](https://github.com/sonatype-nexus-community/auditjs/commit/4ade2a7fd575bb7adf33191e14ab9ee7ef2786a9))
* resolve CVE-2024-21538 in cross-spawn : 7.0.3 (update CI node version) ([d3378f5](https://github.com/sonatype-nexus-community/auditjs/commit/d3378f5b0c82f201558a74dc1496540f2306c90a))
* resolve CVE-2024-4068 in braces : 3.0.2 ([d065149](https://github.com/sonatype-nexus-community/auditjs/commit/d06514982d97f9f5258b98e1a6f5731e899b79c4))
* update CI 'release' target to use latest semantic-release, now that we use newer node version ([e2ac821](https://github.com/sonatype-nexus-community/auditjs/commit/e2ac821e5934a40a8d9f71666d7ca77f77a9984f))

## [4.0.45](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.44...v4.0.45) (2024-01-17)


### Bug Fixes

* use semantic-release version that works with node 18 (newer node causes  build errors). ([a122b0e](https://github.com/sonatype-nexus-community/auditjs/commit/a122b0e828066d13c9f39e300ee5fe7df8023bc6))

## [4.0.44](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.43...v4.0.44) (2024-01-10)


### Bug Fixes

* minor change to trigger release of PR# 276 ([f676f91](https://github.com/sonatype-nexus-community/auditjs/commit/f676f91a4a96b44f95d2e050acbe0f7e0fdd6943))

## [4.0.43](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.42...v4.0.43) (2023-12-13)


### Bug Fixes

* minor change to trigger release of fix for sonatype-2023-4801 ([032b20a](https://github.com/sonatype-nexus-community/auditjs/commit/032b20a36882fc77ed65134b3b79e1c1d428d42e))

## [4.0.42](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.41...v4.0.42) (2023-12-13)


### Bug Fixes

* error TS2688: Cannot find type definition file for 'node'. ([#274](https://github.com/sonatype-nexus-community/auditjs/issues/274)) ([2d79b85](https://github.com/sonatype-nexus-community/auditjs/commit/2d79b850bbee6f231518f562b3d506794d206672))

## [4.0.41](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.40...v4.0.41) (2023-07-12)


### Bug Fixes

* sonatype-2022-3677 in node-fetch 2.6.7 ([d1b15ab](https://github.com/sonatype-nexus-community/auditjs/commit/d1b15abaec2a4626bec5a6b73207cc2e47837a6e))

## [4.0.40](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.39...v4.0.40) (2023-06-22)


### Bug Fixes

* CVE-2022-25883 in semver : 5.7.1 ([51d1dd0](https://github.com/sonatype-nexus-community/auditjs/commit/51d1dd00b04702f5de258ba6031001cbc4639cc4))

## [4.0.39](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.38...v4.0.39) (2022-10-31)


### Bug Fixes

* CVE-2022-39353 in @xmldom/xmldom : 0.8.3 ([73b65bd](https://github.com/sonatype-nexus-community/auditjs/commit/73b65bd186e08091840114124694f1f456c27714))

## [4.0.38](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.37...v4.0.38) (2022-10-13)


### Bug Fixes

* CVE-2022-37616 in @xmldom/xmldom : 0.7.2 ([5269bef](https://github.com/sonatype-nexus-community/auditjs/commit/5269bef10e5bebb7b0e8d342c7156bc47674a4ab))

## [4.0.37](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.36...v4.0.37) (2022-04-20)


### Bug Fixes

* security(npm): lock colors library to 1.4.0 ([#251](https://github.com/sonatype-nexus-community/auditjs/issues/251)) ([36ae07f](https://github.com/sonatype-nexus-community/auditjs/commit/36ae07fa0588bb77436c06f6d3fa9cc627062628)), closes [#250](https://github.com/sonatype-nexus-community/auditjs/issues/250)

## [4.0.36](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.35...v4.0.36) (2022-02-08)


### Bug Fixes

* sonatype-2021-4879 in minimatch : 3.0.4 ([384a99f](https://github.com/sonatype-nexus-community/auditjs/commit/384a99f4ec56dd1f4ad811d1342f06ea57149911))

## [4.0.35](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.34...v4.0.35) (2022-01-20)


### Bug Fixes

* CVE-2022-21704 in log4js : 6.3.0 ([b7f1548](https://github.com/sonatype-nexus-community/auditjs/commit/b7f1548527d4866a5dad7cdb252230f4975bd37b))

## [4.0.34](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.33...v4.0.34) (2022-01-20)


### Bug Fixes

* CVE-2022-0235 in node-fetch : 2.6.1 ([cde4677](https://github.com/sonatype-nexus-community/auditjs/commit/cde4677621066f1087b1111f8bdc233c3ecdfb7d))

## [4.0.33](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.32...v4.0.33) (2021-10-25)


### Bug Fixes

* Error message formatting ([#248](https://github.com/sonatype-nexus-community/auditjs/issues/248)) ([c8acb04](https://github.com/sonatype-nexus-community/auditjs/commit/c8acb04de235a79686e66d97231c72fb7a961563)), closes [#206](https://github.com/sonatype-nexus-community/auditjs/issues/206)

## [4.0.32](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.31...v4.0.32) (2021-09-16)


### Bug Fixes

* revert fix for SONATYPE-2021-1169, breaks eslint. needs more work ([a7428e2](https://github.com/sonatype-nexus-community/auditjs/commit/a7428e22d29a62dfdb50dd812fd472f16b598260))
* SONATYPE-2021-1169 ([74abe3c](https://github.com/sonatype-nexus-community/auditjs/commit/74abe3cba69ab75deb756e595ccb6394e2d6a405))

## [4.0.31](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.30...v4.0.31) (2021-09-07)


### Bug Fixes

* Make caching class return undefined if property does not exist ([#247](https://github.com/sonatype-nexus-community/auditjs/issues/247)) ([8e3b3ad](https://github.com/sonatype-nexus-community/auditjs/commit/8e3b3ad2daaf6eee5a5caf7bcd63cd9fe555d07e))
* use newer node version in CI release process, required to run semantic-release. ([589e0ce](https://github.com/sonatype-nexus-community/auditjs/commit/589e0cee02a260bde777edef3acd504221896f4f))
* use newly published @xmldom/xmldom package. fixes [#243](https://github.com/sonatype-nexus-community/auditjs/issues/243) ([9f8b646](https://github.com/sonatype-nexus-community/auditjs/commit/9f8b64689d5cc16591a37065c79c6a82b764040b))

## [4.0.30](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.29...v4.0.30) (2021-08-09)


### Bug Fixes

* CVE-2021-32796, will change when xmldom@0.7.0 is published on npm ([#242](https://github.com/sonatype-nexus-community/auditjs/issues/242)) ([a6c8e32](https://github.com/sonatype-nexus-community/auditjs/commit/a6c8e327015025b65f681f25b3d31c7d695733a1))

## [4.0.29](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.28...v4.0.29) (2021-08-05)


### Bug Fixes

* Initial move to yarn ([#241](https://github.com/sonatype-nexus-community/auditjs/issues/241)) ([88b063f](https://github.com/sonatype-nexus-community/auditjs/commit/88b063f66a3998d175e144ef162b550fb892ce6c))

## [4.0.28](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.27...v4.0.28) (2021-08-03)


### Bug Fixes

* workaround to fix issue [#239](https://github.com/sonatype-nexus-community/auditjs/issues/239). may convert to yarn later ([2056567](https://github.com/sonatype-nexus-community/auditjs/commit/2056567345da061b6823e4b715dfbdc8e4f03eca))

## [4.0.27](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.26...v4.0.27) (2021-07-30)


### Bug Fixes

* switch to force-resolutions to avoid error when running on a project without a package-lock.json ([a07ae78](https://github.com/sonatype-nexus-community/auditjs/commit/a07ae78f1c0bdcbe606754aa2288dd06150c855d))

## [4.0.26](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.25...v4.0.26) (2021-07-29)


### Bug Fixes

* avoid ab-end in Application.spec.ts test by using process.exitCode instead of process.exit(). @TNeer rules! ([1e63108](https://github.com/sonatype-nexus-community/auditjs/commit/1e631088da66d45e72aa4c4c90c3ace1560439f1))
* CWE-20: Improper Input Validation in y18n version 5.0.5 ([1b6a7cb](https://github.com/sonatype-nexus-community/auditjs/commit/1b6a7cbd191433df4bfb6dd992bb6773b16f5604))
* the releases must flow. remove semantic-release dry-run flag ([9bb8efb](https://github.com/sonatype-nexus-community/auditjs/commit/9bb8efb8308dbae863a63066af61bbd767cec829))

## [4.0.25](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.24...v4.0.25) (2021-03-12)


### Bug Fixes

* CVE-2021-21366 in commit 4d727dcd ([7875242](https://github.com/sonatype-nexus-community/auditjs/commit/787524261bc23312c01f76172fc84fd5ae29bed8))

## [4.0.24](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.23...v4.0.24) (2021-02-12)


### Bug Fixes

* Handle relative URLs ([#224](https://github.com/sonatype-nexus-community/auditjs/issues/224)) ([c2e192c](https://github.com/sonatype-nexus-community/auditjs/commit/c2e192c87a3acd00aaf030b216f72aac49217f76))

## [4.0.23](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.22...v4.0.23) (2021-01-11)


### Bug Fixes

* take whitelist path parameter into account ([#219](https://github.com/sonatype-nexus-community/auditjs/issues/219)) ([f2f14ac](https://github.com/sonatype-nexus-community/auditjs/commit/f2f14aca311ab9a9a1edd9b770e656e912c26dc7))

## [4.0.22](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.21...v4.0.22) (2020-12-18)


### Bug Fixes

* document release process, test release credentials ([3e5b2ba](https://github.com/sonatype-nexus-community/auditjs/commit/3e5b2ba5ad3df3518ba46ccc7820740e2dd18c51))

## [4.0.21](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.20...v4.0.21) (2020-12-17)


### Bug Fixes

* Adds insecure flag, implements ([#213](https://github.com/sonatype-nexus-community/auditjs/issues/213)) ([88e7d87](https://github.com/sonatype-nexus-community/auditjs/commit/88e7d873754c96755ee50229115bcee1ecbead2d))

## [4.0.20](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.19...v4.0.20) (2020-11-17)


### Bug Fixes

* Vulnerability field ([#216](https://github.com/sonatype-nexus-community/auditjs/issues/216)) ([0b91917](https://github.com/sonatype-nexus-community/auditjs/commit/0b91917f0a8ae3dce3c18695b074ea3852219387))

## [4.0.19](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.18...v4.0.19) (2020-11-06)


### Bug Fixes

* YARGS TO THE FUTURE ([#214](https://github.com/sonatype-nexus-community/auditjs/issues/214)) ([254ea3d](https://github.com/sonatype-nexus-community/auditjs/commit/254ea3dcbe5e4bc0a345b3846ba6fb6ae28cd961))

## [4.0.18](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.17...v4.0.18) (2020-06-04)


### Bug Fixes

* Bump node-persist version ([#201](https://github.com/sonatype-nexus-community/auditjs/issues/201)) ([144e370](https://github.com/sonatype-nexus-community/auditjs/commit/144e37080c5674865d28e2f9d4116e6f3de08a3e))

## [4.0.17](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.16...v4.0.17) (2020-06-02)


### Bug Fixes

* Add support of proxy environment variable ([#191](https://github.com/sonatype-nexus-community/auditjs/issues/191)) ([#199](https://github.com/sonatype-nexus-community/auditjs/issues/199)) ([276974d](https://github.com/sonatype-nexus-community/auditjs/commit/276974da21a5bc4fa2996d03586154dabb7052be))

## [4.0.16](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.15...v4.0.16) (2020-05-20)


### Bug Fixes

* Mention support on README ([e09edfd](https://github.com/sonatype-nexus-community/auditjs/commit/e09edfdc2810035685084e7006438127568593cc))

## [4.0.15](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.14...v4.0.15) (2020-05-08)


### Bug Fixes

* Pipe cyclonedx sbom to std_out ([#194](https://github.com/sonatype-nexus-community/auditjs/issues/194)) ([9bf2ae0](https://github.com/sonatype-nexus-community/auditjs/commit/9bf2ae0df50290698d5a84d4b43ebc6ae198a1cb)), closes [#195](https://github.com/sonatype-nexus-community/auditjs/issues/195)

## [4.0.14](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.13...v4.0.14) (2020-03-27)


### Bug Fixes

* Bump yargs due to https://github.com/yargs/yargs-parser/pull/258 ([#190](https://github.com/sonatype-nexus-community/auditjs/issues/190)) ([69598e5](https://github.com/sonatype-nexus-community/auditjs/commit/69598e584834b9ae52b43320d9c7da25ac067765))

## [4.0.13](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.12...v4.0.13) (2020-03-24)


### Bug Fixes

* Allow someone to force a Bower scan, if they so wish ([#182](https://github.com/sonatype-nexus-community/auditjs/issues/182)) ([840e81c](https://github.com/sonatype-nexus-community/auditjs/commit/840e81c9e39b60a03ecce54134a51b5cd5eba7df))

## [4.0.12](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.11...v4.0.12) (2020-03-12)


### Bug Fixes

* pkg.homepage, not pkg.repository.url ([213e52d](https://github.com/sonatype-nexus-community/auditjs/commit/213e52da1eac425f319693a074819d76308ce5a7))

## [4.0.11](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.10...v4.0.11) (2020-03-12)


### Bug Fixes

* (bug) Fixed NPE in logger if meta is not passed in ([#183](https://github.com/sonatype-nexus-community/auditjs/issues/183)) ([c113741](https://github.com/sonatype-nexus-community/auditjs/commit/c113741de9dbbcb87a8a509a24a047bb85c34e51))

## [4.0.10](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.9...v4.0.10) (2020-03-04)


### Bug Fixes

* -d flag *in*cludes dev dependencies, not *ex*cludes ([#181](https://github.com/sonatype-nexus-community/auditjs/issues/181)) ([188b9be](https://github.com/sonatype-nexus-community/auditjs/commit/188b9be1a7755dcc147a3b9ce3a61ecf80805143))

## [4.0.9](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.8...v4.0.9) (2020-03-03)


### Bug Fixes

* move to formatters ([#180](https://github.com/sonatype-nexus-community/auditjs/issues/180)) ([fa59842](https://github.com/sonatype-nexus-community/auditjs/commit/fa59842d8f57f2371900ca5cc00e21add0dcff81))

## [4.0.8](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.7...v4.0.8) (2020-02-28)


### Bug Fixes

* add some info on AuditJS and IQ CLI Scanner, and differences ([ca3c119](https://github.com/sonatype-nexus-community/auditjs/commit/ca3c119d62712fce5155bc83cb7ee9b757e9e064))
* add verbiage to identify some potential differences with using AuditJS vs using the Sonatype Nexus IQ CLI Scanner ([1d5a2d7](https://github.com/sonatype-nexus-community/auditjs/commit/1d5a2d762f9fcdd017103d48b26a94035132880c))

## [4.0.7](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.6...v4.0.7) (2020-02-26)


### Bug Fixes

* memorialize Allen, through AllenJS ([592fb93](https://github.com/sonatype-nexus-community/auditjs/commit/592fb93e88b4d4837388ea10bea60223c956cca6))

## [4.0.6](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.5...v4.0.6) (2020-02-24)


### Bug Fixes

* Added Istanbul (not Constantinople) as a code coverage checker ([#173](https://github.com/sonatype-nexus-community/auditjs/issues/173)) ([c7d3536](https://github.com/sonatype-nexus-community/auditjs/commit/c7d353690afcdf6b539f02f837e1671226ecdaf0))

## [4.0.5](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.4...v4.0.5) (2020-02-21)


### Bug Fixes

* Moving from Winston to Log4JS ([#166](https://github.com/sonatype-nexus-community/auditjs/issues/166)) ([b22a9e0](https://github.com/sonatype-nexus-community/auditjs/commit/b22a9e05751f6b87f26c961ba0e793f783735b8a))

## [4.0.4](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.3...v4.0.4) (2020-02-21)


### Bug Fixes

* Suggest to run with dev flag if 0 dependencies are found ([#171](https://github.com/sonatype-nexus-community/auditjs/issues/171)) ([39b7d73](https://github.com/sonatype-nexus-community/auditjs/commit/39b7d733c077b2b8f0a5e5bcd2992476f0335e44))

## [4.0.3](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.2...v4.0.3) (2020-02-21)


### Bug Fixes

* Make sure CycloneDXSbomCreator handles URIs if it runs into a bad one ([#170](https://github.com/sonatype-nexus-community/auditjs/issues/170)) ([d6d24ba](https://github.com/sonatype-nexus-community/auditjs/commit/d6d24ba03ee4e77380bfbf4b277d6041d217e7d4))

## [4.0.2](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.1...v4.0.2) (2020-02-19)


### Bug Fixes

* Remove some deps ([#165](https://github.com/sonatype-nexus-community/auditjs/issues/165)) ([36d3bde](https://github.com/sonatype-nexus-community/auditjs/commit/36d3bde248a4f36af3ffbf75c189a18f4f036009))

## [4.0.1](https://github.com/sonatype-nexus-community/auditjs/compare/v4.0.0...v4.0.1) (2020-02-18)


### Bug Fixes

* turn off Dry Run, publish to npm, hang on to your butts ([5a96d2a](https://github.com/sonatype-nexus-community/auditjs/commit/5a96d2aa53ae1d9afad05f8859a88a0f686adea6))
