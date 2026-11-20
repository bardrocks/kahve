# Coffyman · Fabe Kahvesi

Ofis için kahve sipariş, borç/tahsilat, harcama ve stok takip uygulaması.

Canlı site: https://coffyman.bardrock.workers.dev
(Eski https://coffyman.netlify.app adresi buraya yönlendirilir.)

## Özellikler

### Müşteri ekranı
- Fiyat listesi tarzında, kategorili menü (Sütlü / Sade kahveler), yuvarlak logo.
- Kahve başına ayrı "kim içecek / kim ödeyecek / şeker / süt" seçimi; laktozsuz süt seçeneği.
- Kullanıcı hafızası: "Her zamanki" kartı (en çok içilen kahve, şeker adedi, süt tercihi).
- "Siparişlerim" kartı ve "Kahven hazır" bildirimi.
- Kişiye özel fiyatı olan kişi menüde "Sana özel" fiyatı görür.
- Ana ekrana eklenebilir uygulama (PWA).
- Sipariş WhatsApp mesajı olarak da gönderilir.

### Yönetim paneli
- **Siparişler:** mobilde kart görünümü, 10'lu sayfalama, arama ve tarih filtresi.
  - **"+ Sipariş ekle":** WhatsApp, telefon veya yüz yüze gelen siparişler için. Kaydedilen sipariş ödeyenin borcuna yazılır; **"Kaydet ve ödendi"** ile ödeme de aynı anda kaydedilir.
  - Ödendi/Ödenmedi rozeti, sonradan "Ödendi" işaretleme, "WhatsApp'tan haber ver".
- **Kahve kartları:** kişinin kahvesi, şekeri, laktozsuz tercihi, notu ve özel fiyatları.
- **Kişi hesapları:**
  - Kalan borç, hesap hareketleri ve yürüyen bakiye.
  - **Ödeme al:** kısmi ödeme; borçtan az alınırsa "kalan kısmı indirim yap, hesabı kapat" seçeneği. Düzenleme ekranında da var.
  - Hesap özetini kopyalama / WhatsApp'ta gönderme, haftalık borç hatırlatması (cuma şeridi).
- **Tahsilatlar:** dönem filtresi; indirimler tahsilat toplamına girmez, ayrı gösterilir.
- **Satış raporu:** kahve bazında adet/ciro, grafik, en çok içenler, saat dağılımı, fincan başı maliyet ve tahmini brüt kâr.
- **Harcamalar:**
  - Nakit / Kredi kartı / Banka kartı / IBAN; kategori ve satıcı dağılımı.
  - **Kasa / Net** (tahsilat − harcama, nakit kasa).
  - Harcama stoğa bağlanabilir.
- **Stok:**
  - Reçeteye göre onaylı siparişte otomatik düşüm, iptalde geri ekleme, kritik seviye uyarısı.
  - Günlük tüketim, tahmini bitiş, her alımın kaç günde bittiği, birim maliyet.
- **Ayarlar:** menü (kahve ekle/düzenle/sil, reçete, laktozsuz ekstra ücret), özel fiyatlar, yedekler.
- **Diğer:**
  - Tüm tutarların yanında güncel kurla dolar karşılığı (TCMB, yedek kaynak open.er-api.com).
  - Raporlarda Excel uyumlu CSV dışa aktarma.

## Barındırma (Cloudflare Workers + D1)

- **Worker girişi:** `cloudflare/worker.mjs`. Aynı `worker/index.js` kodunu D1 veritabanı ve KV yedek deposuyla çalıştırır. Ayarlar `wrangler.toml` dosyasında.
- **Veritabanı:** Cloudflare D1 (`coffyman`). Şema `drizzle/` altındaki migration'lardır. D1, son 30 günün herhangi bir anına geri dönmeyi (Time Travel) destekler.
- **Otomatik yayın:** Cloudflare Workers Builds `bardrocks/kahve` deposunun `main` dalına bağlıdır. Deploy komutu `npm run deploy`: önce D1 migration'larını uygular, sonra yayınlar. `main`'e her birleştirmede site kendiliğinden güncellenir.
- **Elle yayın** (Cloudflare API anahtarı tanımlıyken):
  ```
  npx wrangler d1 migrations apply coffyman --remote
  npx wrangler deploy
  ```
- **Yönetim şifreleri:** Worker secret'ları `ADMIN_KEY` (ana) ve `ADMIN_KEY_2` (ek şifre). Değiştirmek için Cloudflare paneli > Workers > coffyman > Settings > Variables and Secrets, ya da `npx wrangler secret put ADMIN_KEY_2`. Şifreler repoda tutulmaz.
- **Otomatik yedek:** her gece UTC 00:00'da (TR 03:00) cron ile alınır, ayrıca yazma işlemlerinden sonra en fazla saatte bir. Yedekler KV deposuna (`BACKUPS_KV`) yazılır, günlük yedekler 30 gün saklanır. Yönetim paneli > Ayarlar > "Yedek ve veri güvenliği" altında liste, "Şimdi yedek al" ve "Geri yükle (eksikleri ekle)" bulunur.
- **Netlify:** artık yalnızca yönlendirme yapar (`netlify.toml`, `netlify-redirect/_redirects`). `netlify/` altındaki fonksiyon ve Postgres dosyaları eski kurulumun kaydıdır; Postgres uyumluluk testleri (`npm run check:pg`) için durur.

## Yerel çalıştırma

Node.js 22 veya üzeri gerekir:

```
npm install
npm run build
npm run dev
```

Tarayıcıda http://localhost:4173 adresini açın. Yerel deneme bellek içi SQLite kullanır (`drizzle/`). Sunucu kapanınca kayıtlar silinir; canlı veriye bağlanmaz.

Yerel yönetim şifresi varsayılan olarak `preview-only`. Değiştirmek için proje klasöründe `.env` dosyasına `ADMIN_KEY=yeni-sifreniz` yazın (git'e gönderilmez).

Testler:
- `npm run build && npm run check` (SQLite)
- `npm run check:pg` (yerel Postgres uyumlu motor)

## Dosyalar

- `index.html`: müşteri ekranı ve yönetim paneli
- `worker/index.js`: API, doğrulama, sipariş, borç, stok, harcama ve yedek işlemleri
- `cloudflare/worker.mjs`: Cloudflare girişi (D1, KV yedek, cron, ek yönetim şifresi)
- `wrangler.toml`: Cloudflare ayarları
- `drizzle/`: veritabanı şeması (canlı D1 ve yerel SQLite)
- `assets/`: kahve fotoğrafları ve uygulama ikonları
- `logos/`, `gorseller/`: logo çalışmaları, fiyat listesi görseli, ekran görüntüleri
- `server/backups.mjs`: otomatik yedek yardımcıları
- `server/pg-d1.mjs`: Postgres testleri için D1 benzeri adaptör
- `scripts/build.mjs`: Worker paketini üretir (HTML ve görselleri gömer)
- `scripts/dev.mjs`: yerel deneme sunucusu
- `scripts/check.mjs`: uçtan uca testler
- `netlify/`, `netlify.toml`, `netlify-redirect/`: eski Netlify kurulumu ve yönlendirme

## Güncelleme yaparken verileri koruma

- Siparişler, borçlar, tahsilatlar, harcamalar, stok ve ayarlar kodda değil, canlı veritabanında (Cloudflare D1) durur. Kodu yeniden yayınlamak bu verileri silmez.
- **Şema değişiklikleri:** yalnızca yeni numaralı ve ekleme yapan (additive) migration olarak yapılır (`drizzle/00XX_ad.sql`: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN`). Postgres testleri için aynısı `netlify/database/migrations/` altına da eklenir. Mevcut migration dosyaları değiştirilmez; `DROP`, `DELETE`, `TRUNCATE` ve `RENAME` kullanılmaz. `scripts/check.mjs` bunları otomatik reddeder.
- **Fiyatlar:** siparişte ürün adı ve fiyat (özel fiyat dahil) anlık kopya olarak saklanır. Menü fiyatını veya özel fiyatı değiştirmek, ürünü silmek eski borçları etkilemez.
- **Yeniden adlandırma:** bir kişiyi yeniden adlandırmak sipariş, tahsilat, kahve kartı ve özel fiyat kayıtlarını da yeni isme taşır; borç aynı kalır.
- **Yedek yükleme:** "Yedek yükle" ve "Geri yükle" yalnızca eksik kayıtları ekler; mevcut kayıtları silmez veya değiştirmez.
