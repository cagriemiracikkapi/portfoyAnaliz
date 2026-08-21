# Kusursuz Portföy Hesaplayıcı

Yapay zeka destekli, TEFAS verileriyle entegre çalışan kişisel portföy yönetimi ve kusursuz dağılım hesaplama web uygulaması.

## Özellikler
- **Gerçek Zamanlı Portföy Dağılımı:** Portföyünüzdeki fonları kategorilerine göre yönetin.
- **Kusursuz Rebalancing:** Yeni ekleyeceğiniz nakit tutarı (Cash Pool) ile hedef yüzdelerinize ulaşmak için hangi fondan ne kadar almanız gerektiğini milisaniyeler içinde hesaplar.
- **Risk Analizi:** TEFAS risk puanlarını baz alarak portföyünüzün ağırlıklı risk skorunu (1-7) ve yatırımcı profilinizi anlık gösterir.
- **Büyüme Projeksiyonu:** Geçmiş getiri verilerini kullanarak 1 Ay, 1 Yıl, 3 Yıl ve 5 Yıllık tahmini portföy büyüklüğünü hesaplar.
- **Veri Kalıcılığı:** Yaptığınız tüm değişiklikler (portföy, hedefler, bakiyeler) tarayıcınızın Local Storage hafızasında güvenle tutulur. Hesaptan çıkmadığınız sürece verileriniz kaybolmaz.
- **PWA Desteği:** Sitenizi mobil cihazınıza "Ana Ekrana Ekle" diyerek yerel bir uygulama gibi indirebilirsiniz.

## GitHub Pages ile Yayına Alma (Deployment)

Bu uygulama tamamen "Statik" (sadece HTML, CSS, JS ve yerel veriler) olduğu için GitHub Pages üzerinden ücretsiz olarak yayına alınabilir. Aşağıdaki adımları takip ederek uygulamanızı canlıya alabilirsiniz:

1. **GitHub'da Repo Oluşturun:**
   - GitHub hesabınıza giriş yapın.
   - Sağ üstten `+` butonuna tıklayıp **New repository** seçin.
   - Reponuza bir isim verin (Örn: `portfoy-hesaplayici`).
   - "Public" (veya dilerseniz "Private") olarak ayarlayıp repoyu oluşturun.

2. **Dosyaları Yükleyin:**
   - `web_app` klasörünün içindeki tüm dosyaları (`index.html`, `style.css`, `app.js`, `manifest.json` ve `data` klasörü) doğrudan reponuza yükleyin (Sürükle bırak ile veya Git komutlarıyla).
   - Dosyaları `Commit` edin (kaydedin).

3. **GitHub Pages'i Aktif Edin:**
   - Reponuzun üst menüsünden **Settings** (Ayarlar) sekmesine gidin.
   - Sol taraftaki menüden **Pages** seçeneğine tıklayın.
   - "Build and deployment" altındaki **Source** kısmını `Deploy from a branch` olarak bırakın.
   - **Branch** kısmında `main` (veya `master`) dalını seçin ve sağındaki klasör ikonunu `/ (root)` olarak bırakıp **Save** (Kaydet) butonuna tıklayın.

4. **Uygulamanız Yayında! 🚀**
   - Kaydettikten sonra ortalama 1-2 dakika içinde sayfanın üst kısmında sitenizin canlı linki (Örn: `https://kullaniciadiniz.github.io/portfoy-hesaplayici/`) belirecektir.
   - Bu linke tıklayarak uygulamanızı kullanmaya başlayabilirsiniz.
   - PWA altyapısı sayesinde bu linke telefondan girdiğinizde tarayıcı menüsünden "Ana Ekrana Ekle" diyerek telefonunuza indirebilirsiniz. Sizin tarayıcınızda girdiğiniz veriler (Local Storage) sadece **sizin cihazınızda** saklı kalır. Başka kimse portföyünüzü göremez.

## Teknolojiler
- HTML5, CSS3 (Glassmorphism Tasarım Sistemi)
- Vanilla JavaScript (ES6+)
- Local Storage (Veri Kalıcılığı için)
- PWA (Progressive Web App) Manifest

*Kişisel kullanım için optimize edilmiştir.*
