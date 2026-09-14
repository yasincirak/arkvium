/*
  ARKVIUM yönetici bildirimleri — service worker.

  KAPSAM: Bu dosya YALNIZCA web push bildirimi gösterir ve bildirime
  tıklandığında ilgili sipariş sayfasını açar. Sayfa önbelleklemez,
  istekleri yakalamaz (`fetch` olayı dinlenmez) ve çevrimdışı davranış
  eklemez; böylece mevcut sayfaların davranışı hiç değişmez.

  Yalnızca yönetici tarayıcısında kayıt edilir (bkz.
  src/components/admin/SatisBildirimAyari.tsx). Müşteri tarafında hiçbir
  yerde kaydedilmez.
*/

self.addEventListener("push", (event) => {
  let veri = {};

  try {
    veri = event.data ? event.data.json() : {};
  } catch (hata) {
    veri = {};
  }

  const baslik = veri.baslik || "ARKVIUM";
  const metin = veri.metin || "Yeni bildirim";
  const yol = typeof veri.yol === "string" && veri.yol.startsWith("/")
    ? veri.yol
    : "/admin/orders";

  event.waitUntil(
    self.registration.showNotification(baslik, {
      body: metin,
      icon: "/icon.png",
      badge: "/icon.png",
      // Aynı sipariş için ikinci bir bildirim gelirse cihazda üst üste
      // yığılmaz, mevcut bildirim güncellenir.
      tag: veri.etiket || "arkvium",
      data: { yol },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const yol = (event.notification.data && event.notification.data.yol) || "/admin/orders";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((pencereler) => {
        // Panel zaten açıksa yeni sekme açılmaz, mevcut sekme kullanılır.
        for (const pencere of pencereler) {
          if ("focus" in pencere && "navigate" in pencere) {
            return pencere.focus().then((odaklanan) =>
              odaklanan.navigate(yol)
            );
          }
        }

        return self.clients.openWindow(yol);
      })
      .catch(() => self.clients.openWindow(yol))
  );
});
