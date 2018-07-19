/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    onDeviceReady: function() {
		//universal links
		universalLinks.subscribe('universalLinkTest', app.onUniversalLink);
		
		//local notification
		cordova.plugins.notification.local.on("click", app.onLocalNotification, this);
		
		//cordova info
		document.getElementById('sepiaFW-cordova-starter').innerHTML += ("<p>" + device.platform + "</p>");

		//load data from nativeStorage to localStorage?
		if (window.NativeStorage && window.localStorage){
			NativeStorage.getItem("sepiaFW-data", function(data){
				if(data)	localStorage.setItem("sepiaFW-data", JSON.stringify(data));
				NativeStorage.getItem("sepiaFW-data-permanent", function(data){
					if(data)	localStorage.setItem("sepiaFW-data-permanent", JSON.stringify(data));
					redirect();
				}, function(err){
					redirect();
				});
			}, function(err){
				redirect();
			});
		}else{
			redirect();
		}
    },
	// openNewsListPage Event Handler
	onUniversalLink: function(eventData) {
		//handle universal link
		//alert('Universal link test successful! :-) (start)');
		//TODO: use localstorage for intent transfer
	},
	//openLocalNotification
	onLocalNotification: function(notification, state) {
		//handle local notification
		//alert('Local notification test successful! :-) (start)');
		//TODO: use localstorage for intent transfer
	}
};

//redirect to main page
function redirect(){
	//start 'real' app - TODO: transfer other URL parameters?
	cordova.InAppBrowser.open("index.html?cordova=true", "_self");
}

//GO
app.initialize();