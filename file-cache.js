/**
 *	Copyright (c) 2015-2017 Vör Security Inc.
 *  Copyright (c) 2018-present Sonatype, Inc. All rights reserved.
 *	All rights reserved.
 *
 *	Redistribution and use in source and binary forms, with or without
 *	modification, are permitted provided that the following conditions are met:
 *	    * Redistributions of source code must retain the above copyright
 *	      notice, this list of conditions and the following disclaimer.
 *	    * Redistributions in binary form must reproduce the above copyright
 *	      notice, this list of conditions and the following disclaimer in the
 *	      documentation and/or other materials provided with the distribution.
 *	    * Neither the name of the <organization> nor the
 *	      names of its contributors may be used to endorse or promote products
 *	      derived from this software without specific prior written permission.
 *
 *	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *	ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *	WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *	DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 *	DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 *	(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 *	LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 *	ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 *	(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *	SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
const fs = require('fs');

var CACHE_DURATION_HOURS = 24;

var duration = 1000 * 3600 * CACHE_DURATION_HOURS;

var path = require('os').homedir() + "/.auditjs/cache/auditjs3x";

var DEBUG_AUDITJS_CACHE = true;

module.exports = {

 setBase(newPath) {
   if (newPath) {
     path = newPath + "/cache/auditjs3x";
   }
 },

 setDuration(newDuration) {
   if (newDuration) {
     duration = newDuration;
   }
 },

 /** FIXME: Temporary method to clear out old cache data. Remove this code
  *         once enough time has passed and user's cache are expected to be clean.
  *
  * This runs asynchronously. That's fine because we are removing deprecated
  * files.
  */
 cleanCache() {
 },

 get(purl) {
   var fpath = path + "/" + purl + ".json";
   if (DEBUG_AUDITJS_CACHE) console.error("GET: " + purl + " FILE '" + fpath + "'");
   if (fs.existsSync(fpath)) {
     let rawdata = fs.readFileSync(fpath);
     let json = JSON.parse(rawdata);
     var ts = json.cacheUntil;
     var now = (new Date).getTime();
     var diff = ts - now;
     if (diff > 0 && json.data) {
       if (DEBUG_AUDITJS_CACHE) console.error("  ZOUNDS: " + diff + " < " + duration);
       return json.data;
     } else {
       fs.unlinkSync(fpath)
     }
   }
   return undefined;
 },

 put(purl, pkg) {
   var fpath = path + "/" + purl + ".json";
   if (DEBUG_AUDITJS_CACHE) console.error("PUT: " + purl + " DIR " + fpath);
   var now = (new Date).getTime();
   var then = now + duration;
   json = {
     cacheUntil: then,
     data: pkg
   };
   fs.writeFileSync(fpath, JSON.stringify(json));
 }

};
