var cacheName = 'SEPIA_PWA_v0.23.0_b001'; 		//TODO: remember to clear old caches when the versioned SW cache is active
self.addEventListener('install', function(event){
	event.waitUntil(
		caches.open(cacheName).then(function(cache){
			//Nothing to install yet
			return cache.addAll([]);
		})
	);
});

//Network-Only Mode - see: https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook#network-only
self.addEventListener('fetch', function(event){
	event.respondWith(caches.match(event.request).then(function(response){
		//is in SW cache?
		if (response !== undefined){
			return response;
		//get it the usual way (this includes default browser HTTP-cache I guess)
		}else{
			return fetch(event.request);
			/*
			//put copy in cache
			return fetch(event.request).then(function(response){
				return caches.open(cacheName).then(function(cache){
					console.log('[Service Worker] Caching new resource: ' + event.request.url);
					cache.put(event.request, response.clone());
					return response;
				});
			});
			*/
		}
	}));
});
