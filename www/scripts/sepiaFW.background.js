//BACKGROUND SERVICES (currently: Android notifications, potentially: serviceWorker background actions etc.)
function sepiaFW_build_background(){
	var Notifications = {};
	var Background = {
		notifications: Notifications
	};
	
	var cordovaLocalNotifications = ('cordova' in window) && cordova.plugins 
		&& cordova.plugins.notification && cordova.plugins.notification.local;
	
	Notifications.areSupported = !!cordovaLocalNotifications;
	
	if (!Notifications.areSupported){
		SepiaFW.debug.log("NOTE: Background notifications are not supported on this platform! (yet)");
	}

	//Notifications permission checks
	//TBD
	//TODO: use 'cordova.plugins.notification.local.isIgnoringBatteryOptimizations' / 'requestIgnoreBatteryOptimizations'
	//TODO: maybe check 'hasDoNotDisturbPermissions'

	//...
	
	return Background;
}