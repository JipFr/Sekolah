const CACHE_NAME = 'app';
const urlsToCache= [
	'/'
];

self.addEventListener('install', e => {
	e.waitUntil(
		caches.open(CACHE_NAME).then(cache => {
			return cache.addAll(urlsToCache);
		})
	);
});

self.addEventListener('fetch', e => {
	e.respondWith(
		caches.match(e.request)
		.then(response => {
			if(response) {
				return response;
			}
			return fetch(e.request);
		})
	)
});