var cacheName = 'SEPIA_PWA_v0.2X.X_b005'; 		//Note: remember to clear old caches when the versioned SW cache is active
var ENABLE_DYNAMIC_CACHING = false;

self.addEventListener('install', function(event){
	event.waitUntil(
		caches.open(cacheName).then(function(cache){
			//Nothing to install yet
			return cache.addAll(['offline.html']);
		})
	);
});

//Clear old caches
self.addEventListener('activate', function(e){
	var cacheKeeplist = [cacheName];
	e.waitUntil(
		caches.keys().then(function(keyList){
			return Promise.all(keyList.map(function(key){
				if (cacheKeeplist.indexOf(key) === -1){
					console.log('[Service Worker] Deleting replaced cache');
					return caches.delete(key);
				}
			}));
		})
	);
});

//Network-Only Mode - see: https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook#network-only
self.addEventListener('fetch', function(e){
	//ignore some ...
	if (e.request.method !== 'GET') { return; }
	//if (e.request.url.indexOf("...") !== -1) { return; }
	
	//... handle rest
	e.respondWith(async function(){
		var cachedResponse = await caches.match(e.request);
		if (cachedResponse !== undefined){
			console.log('[Service Worker] from cache: ' + e.request.url);
			return cachedResponse;
		}else{
			try {
				//console.log('[Service Worker] Fetching resource: ' + e.request.url);
				var response = await fetch(e.request);
				if (ENABLE_DYNAMIC_CACHING && response.ok){
					//console.log("response OK?", response.ok, response.status);
					console.log('[Service Worker] Caching new resource: ' + e.request.url);
					var cache = await caches.open(cacheName);
					await cache.put(e.request, response.clone());
				}
				return response;

			}catch (err){
				if (e.request.mode === 'navigate') {
					return caches.match('offline.html');
					/*return new Response("<h1>You are offline</h1>", {
						headers: {'Content-Type': 'text/html'}
					});*/
				}else{
					//console.error("error 2", err);
					return new Response(JSON.stringify({
						message: "Network error/Timeout"
					}),{
						headers: {'Content-Type': 'application/json'},
						ok: false,
						status: 408,
						statusText: "Network error/Timeout"
					});
				}
			}
		}
	}());
});

//Notification listener
self.addEventListener('notificationclick', function(event){
	//NOTE: see sepiaFW.ui.notify for data description
	//console.error('On notification click:', event.notification.tag, 'Data:', event.notification.data);	//DEBUG
	var data = event.notification.data;
	var action = event.action || "";
	var actionDismiss = (action == "dismiss");
	var noteData = data.noteData;
	var onClickData = actionDismiss? undefined : data.onClickData;	//dismiss click is equal to "just" close
	//close note?
	if (actionDismiss || (onClickData && onClickData.closeNote)){
		event.notification.close();
		if (onClickData) delete onClickData.closeNote;
	}
	//just close?
	if (actionDismiss){
		handleNotificationClose(event, data.onCloseData, noteData);
	}else{
		handleNotificationClick(event, action, onClickData, noteData);
	}
});
self.addEventListener('notificationclose', function(event){
	//console.error('On notification close:', event.notification.tag, 'Data:', event.notification.data);	//DEBUG
	var data = event.notification.data;
	var noteData = data.noteData;
	var onCloseData = data.onCloseData;
	handleNotificationClose(event, onCloseData, noteData);
});
function handleNotificationClick(event, action, onClickData, noteData){
	getPrimaryClient(event, function(windowClient){
		//focus window?
		if (onClickData && onClickData.focusApp){
			//if (windowClient.visibilityState === 'hidden')
			windowClient.focus();
			delete onClickData.focusApp;
		}
		windowClient.postMessage({
			action: action,
			onClickData: onClickData,
			noteData: noteData
		});
	});
}
function handleNotificationClose(event, onCloseData, noteData){
	getPrimaryClient(event, function(windowClient){
		//focus window?
		if (onCloseData && onCloseData.focusApp){
			//if (windowClient.visibilityState === 'hidden')
			//if (windowClient.url == ...)
			windowClient.focus();
			delete onCloseData.focusApp;
		}
		windowClient.postMessage({
			onCloseData: onCloseData,
			noteData: noteData
		});
	});
}
function getPrimaryClient(event, successCallback){
	event.waitUntil(clients.matchAll({
		type: "window"
	}).then(function(clientList){
		if (clientList && clientList.length){
			successCallback(clientList[0]);
		}
	}));
}
