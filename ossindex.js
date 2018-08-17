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

// Provides simplified REST API access
var client = require('request');

// We get proxy configuration fron npmConf
const npmConf = require('npm-conf');
const conf = npmConf();
var proxy = conf.get('https_proxy');
if (!proxy) {
	proxy = conf.get('proxy');
}
if (proxy) {
	client = client.defaults({'proxy': proxy});
}

//RELEASE HOST
var ossindex = "https://ossindex.sonatype.org";

//DEBUG HOST
//var ossindex = "http://localhost:8080";

var username = undefined;
var token = undefined;


module.exports = {

  /** Override the data host.
	 */
	 setHost: function (scheme, host, port) {
 		ossindex = scheme + "://" + host + ":" + port
 	},

	setUser: function (myUsername, myToken) {
		username = myUsername;
		token = myToken;
	},

	getPackageData: function (pkgs, callback) {

		var data = {};
		data.coordinates = [];

		for(var i = 0; i < pkgs.length; i++) {
			if (pkgs[i].scope) {
				data.coordinates.push(pkgs[i].pm + ":" + pkgs[i].scope + "/" + pkgs[i].name + "@" + pkgs[i].version);
			} else {
				data.coordinates.push(pkgs[i].pm + ":" + pkgs[i].name + "@" + pkgs[i].version);
			}
		}

		var args = {
			body: data,
			json: true
		};

		if (username) {
			args.auth = {};
			args.auth.user = username;
			args.auth.pass = token;
		}

		var query = ossindex + "/api/v3/component-report";
		client.post(query, args, function(error, response, json){
			if (error) {
				console.error(error);
			}
			// Handle the error response
			if(response.statusCode < 200 || response.statusCode > 299) {
				try {
					if(json != undefined && json.error != undefined){
						callback(json);
						return;
					}
				}
				catch(err) {}

				callback({error: "Server error", code: response.statusCode});
				return;
			}

			// Otherwise the data is considered good
			if(json != undefined) {
				callback(undefined, json);
			}
			else {
				callback(undefined, []);
			}
		});
	}
};
