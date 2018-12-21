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
    //Bind any events that are required on startup. Common events are:
    //'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    //deviceready Event Handler
    onDeviceReady: function() {
		//universal links
		universalLinks.subscribe('universalLinkTest', app.onUniversalLink);
		
		//local notification
		cordova.plugins.notification.local.on("click", app.onLocalNotification, this);
		
		//load setup function from index.html
		appSetup();
		
		//document.getElementById('sepiaFW-login-box').innerHTML += 'login box ready<br>'; 		//DEBUG
		/* moved to login box action:
		if ("splashscreen" in navigator){
			navigator.splashscreen.hide();
		}
		*/
    },
	//openUniversalLinks Event Handler
	onUniversalLink: function(eventData) {
		//handle universal link
		//alert('Universal link test successful! :-) (index)');
	},
	//openLocalNotification
	onLocalNotification: function(notification, state) {
		//handle local notification
		//alert('Local notification test successful! :-) (index)');
		//console.log('Local notification test successful! :-) (index)');
		
		//TODO: add to start.js as well!
		if (SepiaFW.events && notification && notification.data){
		    //console.log(JSON.stringify(notification));
			SepiaFW.events.handleLocalNotificationClick(JSON.parse(notification.data));
		}
		SepiaFW.ui.updateMyView(true, true, 'notification'); 		//TODO: think about this here!
	}
};

app.initialize();