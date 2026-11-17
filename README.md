# Coffyman

Kahve siparişi, WhatsApp sipariş özeti, kişi hesapları, tahsilatlar, personel rehberi ve tarayıcıya bağlı kişisel bağlantılar.

## Yayın (Netlify)

Canlı site Netlify üzerinde çalışır. Depo Netlify'a bağlıysa GitHub'a push yapmak siteyi otomatik yayınlar (`npm run build`, ardından `netlify/functions/app.mjs` fonksiyonu tüm yolları karşılar).

- Veritabanı: Netlify Database (Postgres). Şema `netlify/database/migrations/` altındaki migration dosyalarından deploy sırasında otomatik uygulanır.
- Yönetim şifresi: Netlify > Project configuration > Environment variables bölümünde `ADMIN_KEY` adıyla (Functions kapsamı, secret) tanımlanır. Tanımlı değilse yönetim uçları 401 döner.

## Yerel çalıştırma

Node.js 22 veya üzerini kurun:

```
npm install
npm run build
npm run dev
```

Tarayıcıda http://localhost:4173 adresini açın. Yerel deneme bellek içi SQLite kullanır (`drizzle/`), sunucu kapanınca kayıtlar silinir ve canlı veriye bağlanmaz.

Yerel yönetim şifresi varsayılan olarak: preview-only. Değiştirmek için proje klasöründe `.env` dosyasına `ADMIN_KEY=yeni-sifreniz` yazın (git'e gönderilmez).

Testler: `npm run build && npm run check` (SQLite) ve `npm run check:pg` (yerel Postgres uyumlu motor, `@netlify/database-dev`).

## Dosyalar

- index.html: müşteri ekranı ve yönetim paneli
- worker/index.js: API, sunucu doğrulaması ve sipariş işlemleri
- assets/: kahve fotoğrafları
- drizzle/: yerel deneme (SQLite) şeması
- netlify/database/migrations/: canlı (Postgres) şema migration'ları. Uygulanmış migration düzenlenmez; yalnızca yeni numaralı ekleme yapan dosyalar eklenir
- netlify/functions/app.mjs: Netlify fonksiyon girişi (yazma işlemlerinden sonra en fazla saatte bir `hourly/latest.json` yedeği alır)
- netlify/functions/daily-backup.mjs: her gece (UTC 00:00 = TR 03:00) tam yedek alan zamanlanmış fonksiyon
- server/backups.mjs: otomatik yedek yardımcıları (Netlify Blobs / bellek içi sahte store)
- server/pg-d1.mjs: D1 benzeri arayüzü Postgres üzerinde sağlayan adaptör
- scripts/build.mjs: Worker paketini üretir
- scripts/dev.mjs: Windows/Linux üzerinde yerel deneme sunucusu
- scripts/check.mjs: işlev kontrolleri (node scripts/check.mjs)

Canlı kayıtlar Netlify Database'de saklanır. Bu ZIP kaynak kod ve görsellerin kopyasıdır; canlı veri yedeği değildir. Kaynakları indirmek canlı yayını değiştirmez.

## Güncelleme yaparken verileri koruma

- Siparişler, borçlar, tahsilatlar, personel ve ayarlar kod paketinde değil, canlı veritabanında (Netlify Database) durur. Kodu yeniden yayınlamak bu verileri silmez veya sıfırlamaz.
- Her yayından önce Yönetim paneli > Ayarlar > "Yedek indir" ile tam yedek alın (coffyman-yedek-YYYY-MM-DD.json). "Yedek yükle" yalnızca eksik kayıtları ekler; mevcut kayıtları silmez veya ezmez.
- Şema değişiklikleri (hem netlify/database/migrations/ hem de yerel test için drizzle/ altına, aynı içerikle) yalnızca yeni numaralı, ekleme yapan (additive) migration olmalıdır (örn. netlify/database/migrations/<rakamlar>_ad.sql: CREATE TABLE IF NOT EXISTS, ALTER TABLE ... ADD COLUMN). Mevcut migration dosyalarını değiştirmeyin; DROP, DELETE, TRUNCATE veya tabloyu yeniden oluşturma kullanmayın. scripts/check.mjs bunları otomatik reddeder.
- Müşteri borcu siparişlerin (ürün adı ve fiyat anlık kopya olarak saklanır) ve tahsilatların toplamından hesaplanır; /api/admin/data yanıtındaki `balances` aynı hesabı sunucuda yapar. Menüden ürün silmek veya fiyat değiştirmek eski borçları etkilemez.
- Bir kişiyi yeniden adlandırırsanız sipariş ve tahsilat kayıtları da yeni isme taşınır (tek işlemde); borç aynı kalır.

## Otomatik yedek ve kahve kartları

- Her gece UTC 00:00'da (Türkiye saatiyle 03:00) `netlify/functions/daily-backup.mjs` tam bir JSON dökümü alır ve Netlify Blobs'taki `backups` deposuna `daily/YYYY-MM-DD.json` (ve `latest.json`) olarak yazar; 30 günden eski günlük yedekler silinir. Ayrıca sipariş, ödeme, ayar, personel ve kahve kartı gibi yazma işlemlerinden sonra en fazla saatte bir `hourly/latest.json` yedeği arka planda alınır.
- Yönetim paneli > Ayarlar > "Yedek ve veri güvenliği" altında "Otomatik yedekler" listelenir; "Geri yükle (eksikleri ekle)" yalnızca eksik kayıtları ekler, mevcut hiçbir kaydı silmez veya ezmez. Elle "Yedek indir / yükle" de durur. Yerelde (`npm run dev`) yedekler bellek içindedir.
- Yönetim paneli > "Kahve kartları": kişinin kahvesi, şeker ve laktozsuz tercihi ile notu. Elle girilen bilgi, sipariş geçmişinden hesaplanan bilgiden önceliklidir; müşteri ekranındaki "Her zamanki" ve sipariş ön doldurma da bunu kullanır. Veriler `person_prefs` tablosunda durur ve yedeğe dahildir.
