//GEOCODER
function sepiaFW_build_geocoder(){
	var Geocoder = {};
	
	Geocoder.isSupported = (navigator.geolocation)? true : false;
	Geocoder.region = "en";
	Geocoder.language = "en";
	Geocoder.setLanguage = function(lang){
		lastLanguage = Geocoder.language;
		Geocoder.region = lang;
		Geocoder.language = lang;
	}
	var lastLanguage = "";
	var geocoder_url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=";
	
	//states
	var minRefreshWait = 5000; 			//wait at least this time before refresh
	var distanceThreshold = 0.0025;		//(~250m) GPS coordinates must change at least this much to justify geocoder request
	var isActive = false;
	Geocoder.isActive = function(){
		return isActive;
	}
	var lastCheck = 0;
	
	Geocoder.autoGPS = false;					//check GPS automatically?
	Geocoder.autoRefreshInterval = 30*60*1000;	//triggered e.g. on visibility change 
	
	var lastLatitude = 0;
	var lastLongitude = 0;
	var lastAddressResult;
	
	//Result
	
	//GPS
	var latitude = "";
	var longitude = "";
	//Address
	var addressResult;
	/*
	var country = "";		
	var city = "";			
	var area_state = "";	
	var code = "";		//postal code
	var street = "";
	var s_nbr = "";		//street number
	*/
	
	//------- broadcasting -------
	
	function broadcastGpsIsLocating(){
		//EXAMPLE:
		var statusIndicator = document.getElementById("sepiaFW-menue-status-text");
		if (SepiaFW.ui && statusIndicator){ statusIndicator.innerHTML = 'locating ...'; }
	}
	function broadcastGpsFinished(){
		//UPDATE
		if (SepiaFW.assistant && addressResult){
			SepiaFW.assistant.setUserLocation(addressResult);
		}
		if (SepiaFW.ui){
			var statusIndicator = document.getElementById("sepiaFW-menue-status-text");
			if (statusIndicator && longitude && latitude){
				statusIndicator.innerHTML = "latitude: " + SepiaFW.tools.round3(latitude) + ", longitude: " + SepiaFW.tools.round3(longitude);
			}
		}
	}
	function broadcastGpsFailed(msg){
		//EXAMPLE:
		var statusIndicator = document.getElementById("sepiaFW-menue-status-text");
		if (SepiaFW.ui && statusIndicator){ statusIndicator.innerHTML = ((msg)? msg : "GPS failed!"); }
	}
	function broadcastGpsBusy(){
		//EXAMPLE:
		var statusIndicator = document.getElementById("sepiaFW-menue-status-text");
		if (SepiaFW.ui && statusIndicator){ statusIndicator.innerHTML = 'GPS is busy, try again in a few seconds.'; }
	}
	function broadcastAddressIsLocating(){
		//EXAMPLE:
		var statusIndicator = document.getElementById("sepiaFW-menue-status-text");
		if (SepiaFW.ui && statusIndicator){ statusIndicator.innerHTML += ' - fetching address ...'; }
	}
	function broadcastAddressIsNew(addressResult){
		//Got new GPS coordinates (according to distance threshold) and with that a new address
		SepiaFW.ui.updateMyView();
	}
	function broadcastAddressFinished(){
		//UPDATE
		if (SepiaFW.assistant && addressResult){
			SepiaFW.assistant.setUserLocation(addressResult);
		}
		if (SepiaFW.ui){
			var statusIndicator = document.getElementById("sepiaFW-menue-status-text");
			if (statusIndicator && addressResult.summary){
				statusIndicator.innerHTML = "GPS: " + addressResult.summary;
			}else if (statusIndicator && addressResult.longitude){
				statusIndicator.innerHTML = "latitude: " + SepiaFW.tools.round3(addressResult.latitude) + ", longitude: " + SepiaFW.tools.round3(addressResult.longitude);
			}
		}
	}
	function broadcastLocationIsApproximation(){
		//UPDATE
		var statusIndicator = document.getElementById("sepiaFW-menue-status-text");
		if (statusIndicator && addressResult.summary){
			statusIndicator.innerHTML = "IP: " + addressResult.summary;
		}
	}
	function broadcastAddressFailed(){
		//EXAMPLE:
		var statusIndicator = document.getElementById("sepiaFW-menue-status-text");
		if (SepiaFW.ui && statusIndicator){ statusIndicator.innerHTML = 'Address failed!'; }
	}
	
	//----------------------------
	
	//try to reset the location search, but its not guaranteed to abort the async call.
	Geocoder.reset = function(){
		if (Geocoder.isSupported){
			//TODO: actually abort navigator.geolocation.getCurrentPosition
		}
		isActive = false;
		lastLatitude = 0;
		lastLongitude = 0;
		lastAddressResult = '';
		lastCheck = 0;
	}
	
	//default way of getting location
	Geocoder.lastBestLocationUpdate = 0;
	Geocoder.getBestLocation = function(successCallback, errorCallback){
		Geocoder.getGpsAndAddress(function(){
			//success
			Geocoder.lastBestLocationUpdate = new Date().getTime();
			if (successCallback) successCallback();
		},function(error){
			if (error && error.code && error.code == -1){
				//busy
				//ignore?
			}else{
				//error - try IP then
				SepiaFW.geocoder.getLocationViaIP(successCallback, errorCallback);
			}
		});
	}
	
	//get GPS first then address
	Geocoder.getGpsAndAddress = function(successCallback, errorCallback){
		Geocoder.getGPS(function(latitude, longitude){
			Geocoder.getAddress(successCallback, errorCallback, latitude, longitude);
		}, errorCallback);
	}
	
	//get and store GPS coordinates
	Geocoder.getGPS = function(successCallback, errorCallback){
		if (Geocoder.isSupported && !isActive && ((new Date().getTime() - lastCheck) > minRefreshWait)){
			var options = {
				enableHighAccuracy: true,
				timeout: 15000,
				maximumAge: 0
			};
			isActive = true;
			broadcastGpsIsLocating();
			navigator.geolocation.getCurrentPosition(function(position){
				lastLatitude = latitude;
				lastLongitude = longitude;
				latitude = position.coords.latitude;
				longitude = position.coords.longitude;
				lastCheck = new Date().getTime();
				isActive = false;
				broadcastGpsFinished();
				SepiaFW.debug.info("Geocoder new coordinates: '" + latitude + ", " + longitude + "'");
				if (successCallback) successCallback(latitude, longitude);
				
			}, function(error){
				lastCheck = new Date().getTime();
				isActive = false;
				SepiaFW.debug.info('Geocoder: GPS failed! - error: ' + translateError(error));
				broadcastGpsFailed('GPS failed! - ' + translateError(error));
				if (errorCallback) errorCallback(error);
				
			}, options);
			
		}else if (Geocoder.isSupported){
			isActive = false;
			broadcastGpsBusy();
			SepiaFW.debug.info('Geocoder: GPS was busy, try again!');
			var error = {};
			error.message = 'navigator.geolocation was busy, try again!';
			error.code = -1;
			if (errorCallback) errorCallback(error);
			
		}else{
			isActive = false;
			SepiaFW.debug.info('Geocoder: GPS NOT supported!');
			broadcastGpsFailed('GPS NOT supported!');
			var error = {};
			error.message = 'navigator.geolocation is NOT supported!';
			if (errorCallback) errorCallback(error);
		}
	}
	
	//get approximate GPS distance
	function getDistance(latitude, longitude, lastLatitude, lastLongitude){
		var distance = 100000; 		//~infinite
		if (latitude && longitude && lastLatitude && lastLongitude){
			distance = Math.sqrt(Math.pow(latitude-lastLatitude,2) + Math.pow(longitude-lastLongitude,2));
		}
		return distance;
	}
	//need address refresh?
	function needNewAddress(distance){
		if (lastAddressResult && (distance < distanceThreshold) && (lastLanguage === Geocoder.language)){
			SepiaFW.debug.info('Geocoder distance to old GPS: ' + distance + ' - No geocoder request necessary.');
			return false;
		}else{
			SepiaFW.debug.info('Geocoder distance to old GPS: ' + distance);
			return true;
		}
	}

	//get Address
	Geocoder.getAddress = function(successCallback, errorCallback, latitude, longitude){
		broadcastAddressIsLocating();
		isActive = true;
		
		var lat = latitude;
		var lng = longitude;
		
		if (!lat || !lng){
			isActive = false;
			SepiaFW.debug.info('Geocoder getAddress: got NO GPS coordinates!');
			broadcastAddressFailed();
			var error = {};
			error.message = 'got NO GPS coordinates!';
			if (errorCallback) errorCallback(error);
		}
		if (!needNewAddress(getDistance(latitude, longitude, lastLatitude, lastLongitude))){
			isActive = false;
			broadcastAddressFinished();
			SepiaFW.debug.info('Geocoder getAddress: no update required, using old result');
			if (successCallback) successCallback(lastAddressResult);
		}
		
		//build url
		var this_url = geocoder_url + encodeURIComponent(lat) + "," + encodeURIComponent(lng) + "&region=" 
									+ encodeURIComponent(Geocoder.region) + "&language=" + encodeURIComponent(Geocoder.language);
		//console.info('GEO - checking ' + lat + ", " + lng + " for address.");
		
		//call service
		$.ajax({
			url: this_url,
			timeout: 5000,
			dataType: "json",
			success: function(data) {
				//console.info(JSON.stringify(res));
				if (data.results && data.results[0] && data.results[0].address_components){
					var components = data.results[0].address_components;
					lastAddressResult = (addressResult)? JSON.parse(JSON.stringify(addressResult)) : '';
					addressResult = new Object();
					addressResult.latitude = SepiaFW.tools.round5(lat);
					addressResult.longitude = SepiaFW.tools.round5(lng);
					var sum = '';
					
					for(var i=0;i<components.length;i++){
						var type = components[i]['types'];
						var name = components[i]['long_name'];
						//console.info(type + "=" + name);
						//check type
						if (type.indexOf('street_number') > -1){
							addressResult.s_nbr = name;
						}else if (type.indexOf('route') > -1){
							addressResult.street = name;
						}else if (type.indexOf('locality') > -1){
							addressResult.city = name;
						}else if (type.indexOf('sublocality') > -1){
							if (!addressResult.city){
								addressResult.city = name;
							}
						}else if (type.indexOf('administrative_area_level_1') > -1){
							addressResult.area_state = name;
						}else if (type.indexOf('country') > -1){
							addressResult.country = name;
						}else if (type.indexOf('postal_code') > -1){
							addressResult.code = name;
						}
						/*
						for(var key in obj){
							var attrName = key;
							var attrValue = obj[key];
							console.info(attrName + "=" + attrValue);
						}
						*/
					}
					sum = (addressResult.country)? (addressResult.country + ", ") : '';
						sum += (addressResult.area_state)? (addressResult.area_state + ", ") : '';
						sum += (addressResult.city)? (addressResult.city + ", ") : '';
						sum += (addressResult.street)? (addressResult.street + " ") : '';
						sum += (addressResult.s_nbr)? (addressResult.s_nbr + " ") : '';
					sum = sum.trim().replace(/,$/,"");
					if (sum){
						addressResult.summary = sum;
					}
					
					if (addressResult){
						lastLanguage = Geocoder.language;
						isActive = false;
						broadcastAddressFinished();
						broadcastAddressIsNew(addressResult);
						SepiaFW.debug.info("Geocoder new address: '" + addressResult.summary + "'");
						if (successCallback) successCallback(addressResult);
						
					}else{
						isActive = false;
						//ERROR
						broadcastAddressFailed();
						SepiaFW.debug.info('Geocoder: Address search had NO result!');
						var error = {};
						error.message = 'Address had NO result!';
						if (errorCallback) errorCallback(error);
					}
				
				}else{
					isActive = false;
					//ERROR
					broadcastAddressFailed();
					SepiaFW.debug.info('Geocoder: Address search had NO result!');
					var error = {};
					error.message = 'Address had NO result!';
					if (errorCallback) errorCallback(error);
				}
			},
			error: function(data) {
				isActive = false;
				//ERROR
				broadcastAddressFailed();
				SepiaFW.debug.err('Geocoder: could NOT connect to service! - ' + JSON.stringify(data));
				if (errorCallback) errorCallback(data);
			}
		});
	}
	
	//get location via IP address
	Geocoder.ipServiceUrl = "https://extreme-ip-lookup.com/json"; //"https://freegeoip.net/json/" (deprecated, now: https://ipstack.com), "http://ip-api.com/json"
	Geocoder.getLocationViaIP = function(successCallback, errorCallback){
		//call service
		$.ajax({
			url: Geocoder.ipServiceUrl,
			timeout: 5000,
			dataType: "json",
			success: function(apiData) {
				//wrap data from different APIs
				var data = {};
				if (apiData){
					data.latitude = apiData.latitude || apiData.lat;
					data.longitude = apiData.longitude || apiData.lon;
					data.country_name = apiData.country_name || apiData.country;
					data.city = apiData.city;
				}
				//console.info(JSON.stringify(res));
				if (data.latitude && data.longitude){
					lastAddressResult = (addressResult)? JSON.parse(JSON.stringify(addressResult)) : '';
					addressResult = new Object();
					addressResult.latitude = SepiaFW.tools.round5(data.latitude);
					addressResult.longitude = SepiaFW.tools.round5(data.longitude);
					
					if (data.country_name)	addressResult.country = data.country_name;
					if (data.city)	addressResult.city = data.city;
					var sum = (addressResult.country)? (addressResult.country + ", ") : '';
						sum += (addressResult.city)? (addressResult.city + ", ") : '';
					sum = sum.trim().replace(/,$/,"");
					if (sum){
						addressResult.summary = sum;
					}
					if (addressResult){
						lastLanguage = Geocoder.language;
						isActive = false;
						broadcastAddressFinished();
						broadcastLocationIsApproximation();
						SepiaFW.debug.info("Geocoder new approximate address: '" + addressResult.summary + "'");
						if (successCallback) successCallback(addressResult);
						
					}else{
						isActive = false;
						//ERROR
						broadcastAddressFailed();
						SepiaFW.debug.info('Geocoder: Address search had NO result!');
						var error = {};
						error.message = 'Address had NO result!';
						if (errorCallback) errorCallback(error);
					}
				
				}else{
					isActive = false;
					//ERROR
					broadcastAddressFailed();
					SepiaFW.debug.info('Geocoder: Address search had NO result!');
					var error = {};
					error.message = 'Address had NO result!';
					if (errorCallback) errorCallback(error);
				}
			},
			error: function(data) {
				isActive = false;
				//ERROR
				broadcastAddressFailed();
				SepiaFW.debug.err('Geocoder: could NOT connect to service! - ' + JSON.stringify(data));
				if (errorCallback) errorCallback(data);
			}
		});
	}
	
	//------ ERROR HANDLING ------
	function translateError(error){
		if (!error.code){
			return "???";
		}
		switch(error.code) {
			case error.PERMISSION_DENIED:
				return "PERMISSION_DENIED";
			case error.POSITION_UNAVAILABLE:
				return "POSITION_UNAVAILABLE";
			case error.TIMEOUT:
				return "TIMEOUT";
			case error.UNKNOWN_ERROR:
				return "UNKNOWN_ERROR";
			default:
				return "???";
		}
	}
	
	return Geocoder;
}