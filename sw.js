/* Caderninho: funciona sem internet e sempre busca a versão mais nova quando há sinal.
   Rede primeiro: cada publicação chega sozinha, sem trocar número de versão aqui.
   A cópia guardada só é usada quando a internet falha. */
const CACHE = 'caderninho-v1';
const CASA = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const EXTERNOS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CASA)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin){
    /* Do próprio app: rede primeiro, cópia guardada se estiver sem internet */
    e.respondWith(fetch(r).then(res => {
      if (res.ok){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r, {ignoreSearch: true}).then(m => m || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
  } else if (EXTERNOS.includes(u.hostname)){
    /* Fontes e biblioteca do QR Code: usa a cópia e atualiza em segundo plano */
    e.respondWith(caches.open(CACHE).then(c => c.match(r).then(m => {
      const rede = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => m || Response.error());
      return m || rede;
    })));
  }
});
