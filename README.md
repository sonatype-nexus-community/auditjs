AuditJS
=======

Audits an NPM package.json file to identify known vulnerabilities.

```
------------------------------------------------------------
<font style="color: red">**jquery ^1.6.0 [VULNERABLE]**</font>

<font style="color: yellow">CVE-2011-4969 [http://ossindex.net/resource/cve/348528]</font>
Cross-site scripting (XSS) vulnerability in jQuery before 1.6.3, when using loca
tion.hash to select elements, allows remote attackers to inject arbitrary web sc
ript or HTML via a crafted tag.

**Affected versions**: 1.6, 1.6.1, 1.6.2


<font style="color: yellow">CVE-2007-2379 [http://ossindex.net/resource/cve/323345]</font>
The jQuery framework exchanges data using JavaScript Object Notation (JSON) with
out an associated protection scheme, which allows remote attackers to obtain the
 data via a web page that retrieves the data through a URL in the SRC attribute
of a SCRIPT element and captures the data using other JavaScript code, aka "Java
Script Hijacking."

**Affected versions**: unspecified

------------------------------------------------------------
**step 0.0.6**
No known vulnerabilities

------------------------------------------------------------
**node-rest-client ^1.5.1**
<font style="color: cyan">Queued request for vulnerability search</font>
```

Installation
------------
```
npm install auditjs
```

Usage
-----
```
Usage: node audit.js <dir>

  dir: Directory containing package.json file

Audit the dependencies defined in a specified package.json file to identify
known vulnerabilities as specified in the National Vulnerability Database
(NVD) found here: https://nvd.nist.gov/

AuditJS home: ...

A result for a package that returns 'Queued request for vulnerability search'
indicates that the package has been submitted at OSS Index for manual
cross referencing with the NVD. Once a package is cross references it
remains so, which means that over time we should approach complete coverage.
The manual cross referencing will be done as quickly as possible. If you get
'queued' results we suggest you check again the following day -- you should
have complete results by that time.

Limitations

As this program depends on the OSS Index database, network access is
required. Connection problems with OSS Index will result in an exception.

The current version of AuditJS only reports on top level dependencies.
If feedback indicates people are interested we will extend auditing to run
against the full dependency tree

The NVD does not always indicate all (or any) of the affected versions
it is best to read the vulnerability text itself to determine whether
any particular version is known to be vulnerable.
```