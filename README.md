# Mola Kahve

Kahve siparişi, WhatsApp sipariş özeti, kişi hesapları, tahsilatlar, personel rehberi ve tarayıcıya bağlı kişisel bağlantılar.

Canlı site: https://mola-kahve-ofis-161126.lucentcarat2.chatgpt.site

## Windows'a yerleştirme

ZIP içeriğini şu klasöre çıkarın:

C:\Users\claud\Desktop\Codex\mola kahve

ZIP'in kökünde index.html, package.json, worker, scripts, assets, drizzle ve .openai bulunur.

## Yerel çalıştırma

Node.js 24 veya üzerini kurun. PowerShell'de:

```powershell
Set-Location -LiteralPath 'C:\Users\claud\Desktop\Codex\mola kahve'
npm run build
npm run dev
```

Tarayıcıda http://localhost:4173 adresini açın. Harici npm bağımlılığı yoktur; npm install gerekmez.

Yerel deneme yönetim şifresi: preview-only

Yerel sunucu deneme amaçlıdır; veritabanı bellektedir ve sunucu kapanınca deneme kayıtları silinir. Canlı sitedeki sipariş, personel, telefon, borç ve ödeme kayıtlarına bağlanmaz. Canlı yönetim şifresi bu pakette bulunmaz.

## Dosyalar

- index.html: müşteri ekranı ve yönetim paneli
- worker/index.js: API, sunucu doğrulaması ve sipariş işlemleri
- assets/: kahve fotoğrafları
- drizzle/: canlı ve deneme veritabanı şemaları
- scripts/build.mjs: Worker paketini üretir
- scripts/dev.mjs: Windows/Linux üzerinde yerel deneme sunucusu
- scripts/check.mjs: işlev kontrolleri (node scripts/check.mjs)
- .openai/hosting.json: mevcut Sites yayın kimliği ve veritabanı bağlaması

Canlı kayıtlar Sites üzerinde ayrı bir veritabanında saklanır. Bu ZIP kaynak kod ve görsellerin kopyasıdır; canlı veri yedeği değildir. Kaynakları indirmek canlı yayını değiştirmez.

## Güncelleme yaparken verileri koruma

- Siparişler, borçlar, tahsilatlar, personel ve ayarlar kod paketinde değil, canlı veritabanında (D1) durur. Kodu yeniden yayınlamak bu verileri silmez veya sıfırlamaz.
- Her yayından önce Yönetim paneli > Ayarlar > "Yedek indir" ile tam yedek alın (mola-yedek-YYYY-MM-DD.json). "Yedek yükle" yalnızca eksik kayıtları ekler; mevcut kayıtları silmez veya ezmez.
- Şema değişiklikleri yalnızca yeni numaralı, ekleme yapan (additive) migration olmalıdır (örn. drizzle/0004_ad.sql: CREATE TABLE IF NOT EXISTS, ALTER TABLE ... ADD COLUMN). Mevcut drizzle dosyalarını değiştirmeyin; DROP, DELETE, TRUNCATE veya tabloyu yeniden oluşturma kullanmayın. scripts/check.mjs bunları otomatik reddeder.
- Müşteri borcu siparişlerin (ürün adı ve fiyat anlık kopya olarak saklanır) ve tahsilatların toplamından hesaplanır; /api/admin/data yanıtındaki `balances` aynı hesabı sunucuda yapar. Menüden ürün silmek veya fiyat değiştirmek eski borçları etkilemez.
- Bir kişiyi yeniden adlandırırsanız sipariş ve tahsilat kayıtları da yeni isme taşınır (tek işlemde); borç aynı kalır.
