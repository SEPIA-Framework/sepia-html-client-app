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
		//clean up some old stuff just to be sure
		if ("localStorage" in window){
			localStorage.removeItem("sepia-deeplink-intent");
			localStorage.removeItem("sepia-android-intent");
			localStorage.removeItem("sepia-local-note");
		}

		//universal links
		universalLinks.subscribe('universalLinks', app.onUniversalLink);

		//android intents
		if ('plugins' in window && window.plugins.intentShim){
		    window.plugins.intentShim.getIntent(
		        app.onAndroidIntent,
		        function(){
					console.log('window.plugins.intentShim.getIntent - Failed to get Android launch intent.');
				}
            );
		}
		
		//local notification
		cordova.plugins.notification.local.on("click", app.onLocalNotification, this);
		cordova.plugins.notification.local.setDefaults({
			group: "sepia-open-assistant",
			wakeup: false
		});
		
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
	//universal link events
	onUniversalLink: function(eventData){
		//store deep-link and handle in index.html appSetup()
		if ("localStorage" in window){
			localStorage.setItem("sepia-deeplink-intent", JSON.stringify(eventData));
			localStorage.setItem("sepia-deeplink-intent-ts", new Date().getTime());
		}
	},
	//Android intent events
	onAndroidIntent: function(intent) {
		//store intent and handle in index.html appSetup()
		if ("localStorage" in window){
			localStorage.setItem("sepia-android-intent", JSON.stringify(intent));
			localStorage.setItem("sepia-android-intent-ts", new Date().getTime());
		}
	},
	//local notification events
	onLocalNotification: function(notification, state) {
		//store notification and handle in index.html appSetup()
		if ("localStorage" in window){
			localStorage.setItem("sepia-local-note", JSON.stringify(notification));
			localStorage.setItem("sepia-local-note-ts", new Date().getTime());
		}
	}
};

//redirect to main page
function redirect(){
	//start 'real' app - TODO: transfer other URL parameters?
	cordova.InAppBrowser.open("index.html?cordova=true", "_self");
}

//GO
app.initialize();