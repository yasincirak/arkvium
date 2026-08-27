/**
 * Türkçe sözlük — KAYNAK DİL.
 *
 * Bu dosya sözlüğün ŞEKLİNİ tanımlar: İngilizce sözlük buradan türetilen bir
 * tipe uyar ve eksik bıraktığı her alan Türkçesiyle doldurulur. Yani buraya
 * eklenen her anahtar İngilizcede eksik olsa bile uygulama çalışmaya devam
 * eder.
 *
 * KURALLAR
 * - Kullanıcının yazdığı veriler (ad, mesaj, adres, eşya adı, sağlık
 *   bilgileri, acil durum notları) BURAYA GİRMEZ; onlar kullanıcının
 *   kaydettiği biçimde gösterilir.
 * - API anahtarı, kişisel veri veya gizli bilgi bulundurulmaz.
 * - Metinler düz yazıdır; HTML işaretlemesi içermez.
 * - Fiyat, tutar ve para birimi burada tanımlanmaz; tek kaynak
 *   `src/lib/siparis.ts` içindedir.
 */

export const TR = {
  marka: {
    ad: "ARKVIUM",
    slogan: "Dijital Sahiplik Platformu",
  },

  ortak: {
    yukleniyor: "Yükleniyor…",
    gonder: "Gönder",
    gonderiliyor: "Gönderiliyor…",
    kaydet: "Kaydet",
    kaydediliyor: "Kaydediliyor…",
    iptal: "İptal",
    kapat: "Kapat",
    geri: "Geri",
    devam: "Devam",
    sil: "Sil",
    duzenle: "Düzenle",
    zorunlu: "(zorunlu)",
    hataBasligi: "Bir sorun oluştu",
    genelHata: "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
    baglantiHatasi: "Bağlantı kurulamadı. Lütfen tekrar deneyin.",
  },

  dil: {
    secici: "Dil seçimi",
    turkce: "Türkçe",
    ingilizce: "İngilizce",
    turkceKisa: "TR",
    ingilizceKisa: "EN",
    aktif: "Seçili dil",
  },

  header: {
    bolumler: "Bölümler",
    menuAc: "Menüyü aç",
    menuKapat: "Menüyü kapat",
    girisYap: "Giriş Yap",
    hemenBasla: "Hemen Başla",
    nasilCalisir: "Nasıl Çalışır",
    urunler: "Ürünler",
    kullanim: "Kullanım",
    acilDurum: "Acil Durum",
    gizlilik: "Gizlilik",
    sss: "SSS",
  },

  hero: {
    oncekiSlayt: "Önceki slayt",
    sonrakiSlayt: "Sonraki slayt",
    slaydiGoster: "slaydını göster",
    marka: { etiket: "ARKVIUM" },
    acilDurum: {
      etiket: "Acil Durum Profili",
      baslik: "Acil durumda saniyeler önemlidir",
      metin:
        "Sağlık personeli veya yardım eden kişi QR'ı okutarak kullanıcının paylaşmayı seçtiği sağlık bilgilerini görebilir ve acil durumda aranacak yakınlarına tek dokunuşla ulaşabilir.",
      bilgiler: {
        kanGrubu: "Kan grubu",
        alerjiler: "Alerjiler",
        ilaclar: "Kullanılan ilaçlar",
        kisiler: "Acil durum kişileri",
      },
      dugmeBirincil: "Acil Durum Profilini İncele",
      dugmeIkincil: "Nasıl Çalışır?",
      beyan:
        "Gösterilen bilgiler kullanıcının kendi beyanıdır; doğrulanmış tıbbi kayıt değildir.",
    },
    kayipEsya: {
      etiket: "Kayıp eşya",
      baslik: "Eşyaların kaybolsa bile sana geri dönsün",
      metin:
        "ARKVIUM etiketini eşyanla eşleştir. Bulan kişi QR'ı okutarak uygulama indirmeden sana güvenli şekilde ulaşsın.",
      dugme: "QR Etiketleri İncele",
    },
    evcilHayvan: {
      etiket: "Evcil hayvan",
      baslik: "Kaybolduğunda ona ulaşmanın bir yolu olsun",
      metin:
        "Künyedeki QR kod okutulduğunda bulan kişi, paylaşmayı seçtiğin bilgiler üzerinden sana ulaşabilsin.",
      dugme: "Evcil Hayvan Künyesini İncele",
    },
    valiz: {
      etiket: "Valiz ve seyahat",
      baslik: "Valizin kaybolduğunda iletişim bilgilerin açıkta kalmasın",
      metin:
        "QR valiz etiketi sayesinde valizi bulan kişi, telefon numaranı doğrudan görmeden sana ulaşabilsin.",
      dugme: "Valiz Etiketini İncele",
    },
    arac: {
      etiket: "Araç ve motosiklet",
      baslik: "Aracın için güvenli iletişim ve acil durum bağlantısı",
      metin:
        "QR etiketi; gerektiğinde araç sahibiyle gizli iletişim kurulmasını ve izin verilen acil durum bilgilerinin görüntülenmesini sağlar.",
      dugme: "Araç Etiketini İncele",
    },
  },

  akis: {
    etiket: "Nasıl çalışır",
    baslik: "Üç adım, sonra unut",
    giris:
      "Etiketi bir kez kurarsın. Gerisi, eşyan kaybolduğu gün kendiliğinden çalışır.",
    adim1: {
      baslik: "Etiketi eşyana uygula",
      metin:
        "Yapıştır ya da tak, işlem bu kadar. Kurulum, uygulama indirme veya pil gerekmez.",
    },
    adim2: {
      baslik: "Hesabına bağla",
      metin:
        "Etiketin üzerindeki aktivasyon kodunu ARKVIUM hesabına girersin ve etiketi eşyanla eşleştirirsin. Bir kez yapılır.",
    },
    adim3: {
      baslik: "QR okutulduğunda güvenli mesaj al",
      metin:
        "Eşyanı bulan kişi QR'ı telefonuyla okutur ve sana mesaj bırakır. Bildirim sana ARKVIUM üzerinden ulaşır.",
    },
    faydalar: {
      kurulum: {
        baslik: "Kurulum gerektirmez",
        metin: "QR tarayıcıda açılır; karşı taraf uygulama yüklemez.",
      },
      numara: {
        baslik: "Numaran açıkta durmaz",
        metin: "Etikette telefon numaran yazmaz.",
      },
      tasima: {
        baslik: "Etiketi taşıyabilirsin",
        metin: "Eşyan değişirse etiketi başka bir kayda bağlarsın.",
      },
      panel: {
        baslik: "Tek panelden yönetirsin",
        metin: "Eşyalar, kayıp durumu ve bildirimler aynı yerde.",
      },
    },
  },

  urunler: {
    etiket: "Ürün ailesi",
    baslik: "Etiketini seç",
    giris:
      "Hepsi aynı sistemde çalışır. Farkları nereye takıldıkları, neye dayandıkları ve kaç QR etiketi içerdikleridir.",
    neZamanIseYarar: "Ne zaman işe yarar?",
    satinAl: "Satın Al",
    qrAdediTekil: "1 adet QR etiketi içerir",
    qrAdediCogul: "adet QR etiketi içerir",
    kategori: {
      gunlukEsya: "Günlük eşya",
      arac: "Araç",
      anahtar: "Anahtar",
      evcilHayvan: "Evcil hayvan",
      seyahat: "Seyahat",
    },
    senaryo: {
      stickerSeti:
        "Laptop çantanı kafede unuttuğunda, bulan kişi kapaktaki QR'ı okutup sana haber verebilir.",
      aracStickeri:
        "Aracın yanlış yerde kaldığında ya da çıkışı kapattığında, sürücü camdaki QR'dan sana ulaşır.",
      metalAnahtarlik:
        "Ev ve araç anahtarlarını düşürdüğünde, bulan kişi anahtarlıktaki QR'ı okutarak seni bulur.",
      evcilHayvanKunyesi:
        "Köpeğin tasmasından kurtulup kaybolduğunda, onu bulan kişi künyeyi okutup seninle iletişime geçer.",
      valizEtiketi:
        "Valizin bagaj bandında karıştığında, yanlış valizi alan yolcu etiketteki QR'dan sana yazar.",
    },
    /** Ürün adları ve açıklamaları — `src/lib/siparis.ts` ile aynı anlamda. */
    ad: {
      stickerSeti: "3'lü QR Sticker Seti",
      aracStickeri: "Araç İletişim QR Sticker'ı",
      metalAnahtarlik: "Metal QR Anahtarlık",
      evcilHayvanKunyesi: "Evcil Hayvan QR Künyesi",
      valizEtiketi: "QR Valiz Etiketi",
    },
    aciklama: {
      stickerSeti:
        "Değer verdiğiniz eşyaları ARKVIUM'un güvenli iletişim sistemine bağlayın.",
      aracStickeri:
        "Aracınızın camına yapıştırın. Uygunsuz park, açık kalan far veya araçla ilgili başka bir durumda telefon numaranız görünmeden güvenli bildirim alın.",
      metalAnahtarlik:
        "Anahtarlarınızı ARKVIUM'un güvenli buluntu iletişim sistemine bağlayan dayanıklı metal etiket.",
      evcilHayvanKunyesi:
        "Evcil dostunuzu bulan kişi, kişisel iletişim bilgileriniz açıkça gösterilmeden size mesaj gönderebilsin.",
      valizEtiketi:
        "Valiziniz kaybolduğunda bulan kişinin güvenli biçimde size ulaşmasını sağlayın.",
    },
  },

  kullanim: {
    etiket: "Kullanım",
    baslik: "Değer verdiğin her şeye takılır",
    giris:
      "Aynı sistem farklı eşyalarda çalışır: QR okutulur, sana ARKVIUM üzerinden mesaj gelir.",
    arac: {
      baslik: "Araç",
      metin:
        "Hatalı park, açık unutulan far veya araçla ilgili bir durumda sürücüler sana ulaşsın — camında numaran yazmadan.",
      baglanti: "Araç ürününü incele",
    },
    anahtar: {
      baslik: "Anahtar",
      metin: "Düşen ev ve araç anahtarların sana dönsün.",
    },
    evcilHayvan: {
      baslik: "Evcil hayvan",
      metin: "Künyeyi okutan kişi seninle güvenle iletişime geçsin.",
    },
    valiz: {
      baslik: "Valiz",
      metin: "Bagaj bandında karışan valizin sahibini bulsun.",
    },
    kayipEsya: {
      baslik: "Kayıp eşya",
      metin: "Eşyanı kayıp işaretle; QR'ı okutan kişi bu uyarıyı görsün.",
    },
  },

  konuKaydirici: {
    etiket: "ARKVIUM ne yapar?",
    baslik: "Tek etiket, dört ayrı işe yarar",
    onceki: "Önceki konu",
    sonraki: "Sonraki konu",
    basliklar: "Konu başlıkları",
    konuyuGoster: "konusunu göster",
    acilDurum: {
      etiket: "Acil Durum Profili",
      baslik: "Araç ve motosiklette, kaza anında bilinmesi gerekenler",
      metin:
        "Etiketine, sana yardım etmeye çalışan kişinin görmesini istediğin bilgileri ekleyebilirsin. Her alan ayrı ayrı açılır; kapalı bıraktığın hiçbir bilgi QR sayfasında görünmez.",
      m1: "Kan grubu, alerjiler, kullanılan ilaçlar",
      m2: "Önemli sağlık durumları ve acil durum notu",
      m3: "Acil durumda aranacak kişiler",
      beyan:
        "Bu bilgiler senin beyanındır; doğrulanmış tıbbi kayıt değildir. Özellik tamamen isteğe bağlıdır ve varsayılan olarak kapalıdır.",
    },
    kayipEsya: {
      etiket: "Kayıp eşya",
      baslik: "Eşyan kaybolduğunda bulan kişi sana ulaşsın",
      metin:
        "Çanta, anahtar, valiz veya günlük eşyalarını etiketlersin. Bulan kişi QR'ı okutur ve sana mesaj bırakır.",
      m1: "QR'ı okutan kişi uygulama indirmez",
      m2: "Eşyanı kayıp işaretleyebilirsin",
      m3: "Etiketi başka eşyaya taşıyabilirsin",
    },
    evcilHayvan: {
      etiket: "Evcil hayvan",
      baslik: "Künyeyi okutan kişi seninle güvenle iletişime geçsin",
      metin:
        "Tasmaya takılan QR künye, dostunu bulan kişinin sana ulaşmasını sağlar.",
      m1: "Künyede telefon numaran yazmaz",
      m2: "Bildirim sana ARKVIUM üzerinden gelir",
      m3: "Bilgileri istediğin an güncellersin",
    },
    guvenliIletisim: {
      etiket: "Güvenli iletişim",
      baslik: "Numaran görünmeden mesaj al",
      metin:
        "Sana ulaşmak isteyen kişi mesajını ARKVIUM üzerinden gönderir; iletişim bilgilerin ona gösterilmez.",
      m1: "Telefon numaran QR kodda yer almaz",
      m2: "Kişisel iletişim bilgilerin doğrudan gösterilmez",
      m3: "Mesaj ARKVIUM üzerinden iletilir",
    },
  },

  gizlilik: {
    etiket: "Gizlilik",
    baslik: "Bulunabilirlik, mahremiyet pahasına olmaz",
    giris:
      "Eşyanı bulan kişinin sana ulaşabilmesi için kişisel bilgilerinin ortada durması gerekmiyor.",
    madde1: "Telefon numaran QR kodda yer almaz.",
    madde2: "Kişisel iletişim bilgilerin doğrudan gösterilmez.",
    madde3: "Mesaj ARKVIUM üzerinden iletilir.",
  },

  sss: {
    etiket: "SSS",
    baslik: "Sık sorulan sorular",
    s1: {
      soru: "QR kodu okutan kişinin uygulama yüklemesi gerekir mi?",
      cevap:
        "Hayır. QR kod tarayıcıda bir sayfa açar ve mesaj formu doğrudan orada doldurulur; uygulama kurulumu veya hesap açma gerekmez.",
    },
    s2: {
      soru: "Telefon numaram görünür mü?",
      cevap:
        "QR kodun açtığı sayfada telefon numaran ve e-posta adresin gösterilmez. Mesajı gönderen kişi kendi iletişim bilgisini bırakır.",
    },
    s3: {
      soru: "Etiketi nasıl etkinleştiririm?",
      cevap:
        "ARKVIUM hesabına giriş yapıp etiketin üzerindeki aktivasyon kodunu girersin. Etkinleştirme için giriş yapman gerekir.",
    },
    s4: {
      soru: "Bana mesaj nasıl ulaşır?",
      cevap:
        "Gönderilen bildirim hesabındaki e-posta adresine iletilir ve hesabında da görüntülenir.",
    },
    s5: {
      soru: "Eşyamı değiştirirsem etiket ne olur?",
      cevap:
        "Etiketi hesabındaki başka bir kayda taşıyabilirsin; etiket iptal olmadan yeni kaydına bağlanır.",
    },
    s6: {
      soru: "Eşyamı kayıp olarak işaretleyebilir miyim?",
      cevap:
        "Evet. Kayıp işaretlediğinde QR kodu okutan kişi bu uyarıyı sayfada görür.",
    },
  },

  sonCagri: {
    baslik: "Eşyana dijital kimlik ver",
    metin: "Etiketini seç, hesabına bağla ve numaran görünmeden bildirim al.",
    urunleriIncele: "Ürünleri İncele",
    etiketiEtkinlestir: "Etiketimi Etkinleştir",
  },

  footer: {
    aciklama:
      "Dijital Sahiplik Platformu. Eşyalarına QR kodlu dijital kimlik ver; kişisel bilgilerin görünmeden sana ulaşılsın.",
    urunler: "Ürünler",
    tumUrunler: "Tüm ürünler",
    kullanimAlanlari: "Kullanım alanları",
    nasilCalisir: "Nasıl çalışır",
    ucAdimdaKullanim: "Üç adımda kullanım",
    gizlilik: "Gizlilik",
    sss: "Sık sorulan sorular",
    hesap: "Hesap",
    girisYap: "Giriş yap",
    hesapOlustur: "Hesap oluştur",
    etiketimiEtkinlestir: "Etiketimi etkinleştir",
    telifHakki: "© 2026 ARKVIUM. Tüm hakları saklıdır.",
  },

  /** QR okutulduğunda açılan herkese açık sayfalar. */
  qr: {
    baslik: "Bulunan Eşya",
    altYazi: "Bu eşya ARKVIUM dijital sahiplik sistemine kayıtlıdır.",
    markaAlt: "ARKVIUM — Dijital Sahiplik Platformu",
    kategori: "Kategori",
    durum: "Durum",
    aciklama: "Açıklama",
    iptalEdilmis: {
      baslik: "Bu etiket iptal edilmiş",
      metin:
        "Bu etiket artık kullanılmıyor. Bir eşya bulduysanız lütfen etiketin üzerindeki başka bir iletişim yolunu kullanın.",
    },
    etkinlestirilmemis: {
      baslik: "Bu etiket henüz etkinleştirilmemiş",
      metin:
        "Bu etiket bir ürüne bağlanmamış. Etiket sizin elinizdeyse ARKVIUM hesabınızdan etkinleştirebilirsiniz.",
      dugme: "Bu etiketi etkinleştir",
    },
    pasif: {
      baslik: "Bu etiket şu anda pasif",
      metin:
        "Etiket sahibi bu etiketi geçici olarak devre dışı bırakmış. Şu anda bildirim gönderilemiyor.",
    },
    urunYok: {
      baslik: "Bu etikete bağlı ürün bulunamadı",
      metin:
        "Etiket etkin ancak herhangi bir ürüne bağlı değil. Şu anda bildirim gönderilemiyor.",
    },
    kayipUyarisi: {
      baslik: "Bu eşya kayıp olarak bildirildi",
      metin:
        "Sahibi bu eşyayı arıyor. Bulduysanız aşağıdaki formu doldurup haber verebilirsiniz — iletişim bilgileriniz yalnızca eşyanın sahibine iletilir.",
    },
    buEsyayiBuldum: "Bu eşyayı buldum",
    whatsappIleIletisim: "WhatsApp ile iletişime geç",
    whatsappMesaji:
      "Merhaba, ARKVIUM sistemine kayıtlı bir eşyayı buldum.\n\nKayıt No: {kayitNo}\n\nEşya hakkında bilgi vermek istiyorum.",
    durumlar: {
      active: "Aktif",
      lost: "Kayıp",
      found: "Bulundu",
      inactive: "Pasif",
    },
  },

  /** Eşyayı bulan kişinin doldurduğu form. */
  bulanKisi: {
    baslik: "Bulan Kişi Formu",
    aciklama: "Eşya sahibine güvenli şekilde ulaşmak için bilgilerinizi bırakın.",
    buldumDugmesi: "Bu eşyayı buldum",
    adSoyad: "Ad Soyad",
    telefon: "Telefon",
    konum: "Konum",
    not: "Eşya hakkında kısa bir not bırakabilirsiniz",
    onay: "İletişim bilgilerimin eşya sahibine iletilmesini kabul ediyorum.",
    gonder: "Gönder",
    gonderiliyor: "Gönderiliyor...",
    eksikAlan: "Lütfen ad soyad, telefon ve konum alanlarını doldurun.",
    onayGerekli:
      "Devam etmek için iletişim bilgilerinizin eşya sahibine iletilmesini kabul etmelisiniz.",
    gonderimHatasi: "Bildirim gönderilirken bir hata oluştu. Lütfen tekrar deneyin.",
    basariBaslik: "Bilgileriniz alındı",
    basariMetin: "Bildiriminiz güvenli şekilde eşya sahibine iletilecektir.",
    basariNot:
      "Teşekkür ederiz. Bir eşyanın sahibine geri dönmesine yardımcı oldunuz.",
  },

  /** Acil durum bilgilerini gösteren public bölüm. */
  acilDurumGorunum: {
    baslik: "Acil Durum Bilgisi",
    beyan:
      "Bu bilgiler eşya sahibinin kendi beyanıdır ve sahibi tarafından paylaşılmak üzere yayınlanmıştır. Tıbbi kayıt değildir, doğrulanmamıştır.",
    ad: "Ad",
    kanGrubu: "Beyan edilen kan grubu",
    alerjiler: "Alerjiler",
    ilaclar: "Kullanılan ilaçlar",
    saglikDurumlari: "Önemli sağlık durumları",
    not: "Not",
    kisiler: "Acil durumda aranacak kişiler",
    ara: "Ara",
    kanGruplari: {
      A_RH_POZITIF: "A Rh+",
      A_RH_NEGATIF: "A Rh−",
      B_RH_POZITIF: "B Rh+",
      B_RH_NEGATIF: "B Rh−",
      AB_RH_POZITIF: "AB Rh+",
      AB_RH_NEGATIF: "AB Rh−",
      SIFIR_RH_POZITIF: "0 Rh+",
      SIFIR_RH_NEGATIF: "0 Rh−",
      BILINMIYOR: "Bilinmiyor",
    },
    acilCagri:
      "Hayati tehlike varsa önce 112 Acil Çağrı Merkezi'ni arayın.",
  },

  kimlik: {
    girisBaslik: "Giriş Yap",
    girisAltyazi: "Hesabına giriş yap ve ürünlerini yönet.",
    girisDugme: "Giriş Yap",
    girisYapiliyor: "Giriş yapılıyor...",
    girisHatasi: "Giriş yapılamadı.",
    eposta: "E-posta",
    epostaOrnek: "ornek@email.com",
    sifre: "Şifre",
    sifreniz: "Şifreniz",
    sifremiUnuttum: "Şifremi unuttum",
    hesabinYokMu: "Hesabın yok mu?",
    hesapOlustur: "Hesap oluştur",

    kayitBaslik: "Hesap Oluştur",
    kayitAltyazi: "Ürünlerini ve dijital sahiplik kayıtlarını yönet.",
    kayitDugme: "Hesap Oluştur",
    kayitYapiliyor: "Hesap oluşturuluyor...",
    kayitHatasi: "Kayıt oluşturulamadı.",
    kayitBasarili: "Hesabınız oluşturuldu.",
    adSoyad: "Ad Soyad",
    adSoyadOrnek: "Adınız ve soyadınız",
    telefon: "Telefon",
    telefonOrnek: "05xxxxxxxxx",
    sifreEnAz: "En az 8 karakter",
    zatenHesapVar: "Zaten hesabın var mı?",
    girisYap: "Giriş yap",

    unuttumBaslik: "Şifremi Unuttum",
    unuttumAltyazi:
      "Hesabının e-posta adresini gir, sana sıfırlama bağlantısı gönderelim.",
    unuttumDugme: "Sıfırlama Bağlantısı Gönder",
    girisEkraninaDon: "Giriş ekranına dön",

    yeniSifre: "Yeni Şifre",
    yeniSifreTekrar: "Yeni Şifre (Tekrar)",
    sifreTekrarOrnek: "Şifrenizi tekrar girin",
    sifreGuncelle: "Şifremi Güncelle",
    sifrelerEslesmiyor: "Şifreler eşleşmiyor.",
    baglantiGecersiz: "Bu bağlantı geçersiz görünüyor.",
    yeniBaglantiIste: "Yeni sıfırlama bağlantısı iste",

    dogrulaniyor: "E-posta adresiniz doğrulanıyor...",
    dogrulamaGecersiz: "Bu doğrulama bağlantısı geçersiz görünüyor.",
    dogrulamaHatasi: "Doğrulama tamamlanamadı.",
    sayfaEpostaDogrulama: "E-posta Doğrulama",
    sayfaYeniSifre: "Yeni Şifre Belirle",
    hesabimaGit: "Hesabıma git",
  },

  hesap: {
    baslik: "Hesabım",
    bilgiler: "Hesap Bilgileri",
    adSoyad: "Ad Soyad",
    eposta: "E-posta",
    telefon: "Telefon",
    urunlerim: "Ürünlerim",
    etiketinVarMi: "Elinde bir etiket mi var?",
    olusturulmaTarihi: "Oluşturulma Tarihi",
    aciklama: "Açıklama",
    etiket: "Etiket",
    urunuDuzenle: "Ürünü Düzenle",

    durum: {
      kayipBaslik: "Bu eşya kayıp olarak işaretli",
      kayipMetin:
        "QR kodunu okutan kişi, eşyanın arandığını belirten bir uyarı görüyor. Eşyaya kavuştuğunda bu işareti kaldır.",
      normalMetin:
        "Eşyanı kaybettiysen burada işaretle. QR kodunu okutan kişi eşyanın arandığını görür ve sana daha kolay ulaşır.",
      buldum: "Eşyamı buldum",
      kaybettim: "Bu eşyayı kaybettim",
      hata: "Durum değiştirilemedi. Lütfen tekrar deneyin.",
    },

    bildirim: {
      konum: "Konum:",
      eposta: "E-posta:",
      mesajYok: "Mesaj bırakılmadı.",
    },

    epostaDogrulama: {
      gonder: "Doğrulama e-postası gönder",
      hata: "E-posta gönderilemedi.",
    },

    oturum: {
      tumCihazlardanCik: "Tüm cihazlardan çık",
      kapatiliyor: "Kapatılıyor...",
      onayla: "Evet, tümünü kapat",
    },

    devir: {
      baslik: "Sahiplik Devri",
      davetEdilen: "Davet edilen",
      sonGecerlilik: "Son geçerlilik",
      davetIptal: "Daveti İptal Et",
      davetGonder: "Devir Daveti Gönder",
    },

    etiketPaneli: {
      baslik: "Etiket",
      qrAdresi: "QR kodun açtığı adres",
      etiketDurumlari: {
        unused: "Kullanılmamış",
        active: "Aktif",
        inactive: "Pasif",
        revoked: "İptal edilmiş",
      },
      kullanilmamis: "Kullanılmamış",
      iptalEdilmis: "İptal edilmiş",
      tasiniyor: "Taşınıyor...",
      geriAlinamaz: "geri alınamaz",
      iptalOnayi: "Evet, kalıcı olarak iptal et",
    },

    sifre: {
      degistir: "Şifremi Değiştir",
      guncelle: "Şifremi Güncelle",
      vazgec: "Vazgeç",
      eslesmiyor: "Yeni şifreler eşleşmiyor.",
      hata: "Şifre değiştirilemedi.",
    },

    kayitDuzenle: {
      kaydet: "Değişiklikleri Kaydet",
      hata: "Kayıt güncellenemedi.",
      genelHata: "Kayıt güncellenirken bir hata oluştu.",
    },

    aktivasyon: {
      baslik: "Etiket Etkinleştir",
      etiketKodu: "ARK-XXXX-XXXX",
      aktivasyonKodu: "XXXX-XXXX-XXXX",
      mevcutUrune: "Mevcut bir ürünüme",
      urunSecin: "Ürün seçin",
      yeniUrune: "Yeni bir ürüne",
      yeniUrunAdi: "Yeni ürün adı",
      yeniUrunOrnek: "Örn. Laptop çantası",
      etkinlestir: "Etiketi Etkinleştir",
      etkinlestiriliyor: "Etkinleştiriliyor...",
      hata: "Etiket etkinleştirilemedi.",
    },
  },

  siparis: {
    teslimatBilgileri: "Teslimat Bilgileri",
    toplam: "Toplam",
    odemeyeGec: "Ödemeye Geç",
    hazirlaniyor: "Siparişiniz hazırlanıyor...",
    olusturulamadi: "Sipariş oluşturulamadı.",
    yonlendiriliyor: "Ödeme sayfasına yönlendiriliyorsunuz...",
    odemeBaslatilamadi: "Ödeme başlatılamadı.",
    baglantiHatasi: "İşlem tamamlanamadı. Bağlantınızı kontrol edin.",
  },

  odeme: {
    basariBaslik: "Ödemeniz alındı",
    basariMetin:
      "Siparişiniz oluşturuldu ve hazırlanmaya alınacak. Onay e-postasını gelen kutunuzda bulabilirsiniz.",
    hataBaslik: "Ödeme tamamlanamadı",
    hataMetin:
      "Kartınızdan tutar çekilmediyse endişelenmenize gerek yok. Dilerseniz siparişi yeniden oluşturabilirsiniz.",
    bekliyorBaslik: "Ödemeniz kontrol ediliyor",
    bekliyorMetin:
      "Bankanızdan onay bekleniyor. Bu sayfayı birkaç dakika sonra yenileyerek güncel durumu görebilirsiniz.",
    ozet: "Sipariş Özeti",
    numara: "Sipariş numarası",
    tarih: "Sipariş tarihi",
    toplamKargoDahil: "Toplam (kargo dâhil)",
    siradakiAdim: "Sıradaki adım",
  },

  devirDaveti: {
    baslik: "Sahiplik Devri",
    aciklama:
      "Bu ürünün sahipliği size devredilmek isteniyor. Kabul ederseniz ürün hesabınıza bağlanır.",
    baglantiEksik: "Davet bağlantısı eksik.",
    girisYapanHesap: "Şu anda giriş yapan hesap",
    kabulEt: "Sahipliği Kabul Et",
    tamamlaniyor: "Devir tamamlanıyor...",
  },

  aracSayfasi: {
    baslik: "Araç İletişim QR Sticker'ı",
    altyazi:
      "Telefon numaranızı aracınızda açıkça göstermeden, aracınızla ilgili durumlarda size ARKVIUM üzerinden güvenli mesaj gönderilmesini sağlayın.",
    metaBaslik: "Araç İletişim QR Sticker'ı | ARKVIUM",
    metaAciklama:
      "Telefon numaranız görünmeden aracınızla ilgili güvenli bildirim alın.",

    neSaglar: "Ne sağlar?",
    nasilCalisir: "Nasıl çalışır?",
    hangiDurumlarda: "Hangi durumlarda işe yarar?",
    gizlilikNasil: "Gizlilik nasıl korunur?",
    sikSorulan: "Sık sorulan sorular",
    telifHakki: "© 2026 ARKVIUM. Tüm hakları saklıdır.",

    fayda1Baslik: "Numaranız açıkta durmaz",
    fayda1Metin:
      "Araç camında telefon numarası yazmaz. QR kodu okutan kişi size ARKVIUM üzerinden mesaj gönderir.",
    fayda2Baslik: "Telefon kamerasıyla okunur",
    fayda2Metin:
      "QR kod, telefonun kendi kamerasıyla okutulur ve tarayıcıda açılır.",
    fayda3Baslik: "Uygulama kurulumu gerekmez",
    fayda3Metin:
      "Mesaj gönderen kişinin uygulama yüklemesine veya hesap açmasına gerek yoktur.",
    fayda4Baslik: "Etiket hesabınıza bağlıdır",
    fayda4Metin:
      "Etiketi ARKVIUM hesabınızda etkinleştirirsiniz; bağ yalnızca sizin hesabınızla kurulur.",
    fayda5Baslik: "Mesaj ARKVIUM üzerinden gelir",
    fayda5Metin:
      "Bildirim size ARKVIUM üzerinden iletilir; iletişim doğrudan kurulmaz.",

    adim1Baslik: "Ürünü satın al",
    adim1Metin: "Sticker'ı sipariş edersin.",
    adim2Baslik: "Hesabında etkinleştir",
    adim2Metin:
      "Etiket eline ulaştığında hesabına giriş yapıp etiketi bağlarsın.",
    adim3Baslik: "Aracına uygula",
    adim3Metin:
      "Sticker'ı aracında dışarıdan okunabilecek bir yere yapıştırırsın.",
    adim4Baslik: "Güvenli mesaj al",
    adim4Metin:
      "QR kod okutulduğunda gönderilen mesaj sana ARKVIUM üzerinden ulaşır.",

    senaryo1: "Hatalı ya da yolu kapatan park",
    senaryo2: "Açık unutulan far veya cam",
    senaryo3: "Araçta fark edilen hasar",
    senaryo4: "Aracın çekilme riski veya yerinin değişmesi",

    sss1Soru: "QR kodu okutan kişinin uygulama yüklemesi gerekir mi?",
    sss1Cevap:
      "Hayır. QR kod tarayıcıda bir sayfa açar; mesaj formu doğrudan orada doldurulur. Uygulama kurulumu veya hesap açma gerekmez.",
    sss2Soru: "Telefon numaram görünür mü?",
    sss2Cevap:
      "QR kodun açtığı sayfada telefon numaranız ve e-posta adresiniz gösterilmez. Mesaj gönderen kişi kendi iletişim bilgisini bırakır.",
    sss3Soru: "Etiketi nasıl etkinleştiririm?",
    sss3Cevap:
      "ARKVIUM hesabınıza giriş yapıp etiketin üzerindeki aktivasyon kodunu girersiniz. Etkinleştirme için giriş yapmanız gerekir.",
    sss4Soru: "Mesaj bana nasıl ulaşır?",
    sss4Cevap:
      "Gönderilen bildirim ARKVIUM tarafından hesabınızdaki e-posta adresine iletilir ve hesabınızda görüntülenir.",
    sss5Soru: "Aracımı değiştirirsem ne olur?",
    sss5Cevap:
      "Etiketi hesabınızdaki başka bir kayda taşıyabilirsiniz; etiket iptal olmadan yeni kaydınıza bağlanır.",
  },

  /**
   * Sunucudan gelen doğrulama ve hata mesajları.
   *
   * Bu mesajlar `src/lib` içindeki iş mantığında üretilir. İş mantığına
   * DOKUNULMAZ: mesaj Türkçe üretilir, gösterim katmanında `mesajCevir()`
   * ile çevrilir. Eşleşme bulunamazsa metin olduğu gibi gösterilir.
   */
  mesajlar: {
    "Bu işlem için giriş yapmanız gerekiyor.":
      "Bu işlem için giriş yapmanız gerekiyor.",
    "Bu kayıt üzerinde işlem yapma yetkiniz yok.":
      "Bu kayıt üzerinde işlem yapma yetkiniz yok.",
    "Kayıt oluşturmak için giriş yapmanız gerekiyor.":
      "Kayıt oluşturmak için giriş yapmanız gerekiyor.",
    "Girilen bilgiler izin verilen uzunluğu aşıyor.":
      "Girilen bilgiler izin verilen uzunluğu aşıyor.",
    "Geçerli bir telefon numarası giriniz.":
      "Geçerli bir telefon numarası giriniz.",
    "Kayıt bulunamadı.": "Kayıt bulunamadı.",
    "Geçersiz kan grubu seçimi.": "Geçersiz kan grubu seçimi.",
    "Acil durum kişileri listesi geçersiz.":
      "Acil durum kişileri listesi geçersiz.",
    "Acil durum kişisinin adı zorunludur.":
      "Acil durum kişisinin adı zorunludur.",
    "Profili etkinleştirmek için iki onayı da işaretlemeniz gerekir.":
      "Profili etkinleştirmek için iki onayı da işaretlemeniz gerekir.",
    "Önce acil durum profilini oluşturun.":
      "Önce acil durum profilini oluşturun.",
    "Ad soyad, e-posta, telefon, adres, ilçe ve il alanları zorunludur.":
      "Ad soyad, e-posta, telefon, adres, ilçe ve il alanları zorunludur.",
    "Sipariş numarası üretilemedi. Lütfen tekrar deneyin.":
      "Sipariş numarası üretilemedi. Lütfen tekrar deneyin.",
    "Sipariş bulunamadı.": "Sipariş bulunamadı.",
    "Bu sipariş için ödeme başlatılamıyor.":
      "Bu sipariş için ödeme başlatılamıyor.",
    "Ödeme doğrulanamadı. Lütfen sipariş durumunu kontrol edin.":
      "Ödeme doğrulanamadı. Lütfen sipariş durumunu kontrol edin.",
    "İşlem tamamlanamadı.": "İşlem tamamlanamadı.",
    "Etiket bulunamadı.": "Etiket bulunamadı.",
  },

  eposta: {
    imza: "ARKVIUM\nDijital Sahiplik Platformu",
    merhaba: "Merhaba",

    sifreSifirlama: {
      konu: "ARKVIUM şifre sıfırlama talebi",
      giris: "ARKVIUM hesabınız için şifre sıfırlama talebi aldık.",
      yonerge: "Yeni şifrenizi belirlemek için aşağıdaki bağlantıyı kullanın:",
      gecerlilik:
        "Bu bağlantı {sure} dakika boyunca geçerlidir ve yalnızca bir kez kullanılabilir.",
      uyari:
        "Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.",
    },

    dogrulama: {
      konu: "ARKVIUM e-posta adresinizi doğrulayın",
      giris: "ARKVIUM hesabınızı oluşturduğunuz için teşekkür ederiz.",
      yonerge: "E-posta adresinizi doğrulamak için aşağıdaki bağlantıyı kullanın:",
      gecerlilik:
        "Bu bağlantı {sure} saat boyunca geçerlidir ve yalnızca bir kez kullanılabilir.",
      uyari: "Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz.",
    },

    tarama: {
      konu: "ARKVIUM: \"{urun}\" etiketiniz okutuldu",
      giris:
        "Kayıp olarak işaretlediğiniz \"{urun}\" adlı eşyanızın QR etiketi az önce okutuldu.",
      zaman: "Okutulma zamanı: {zaman}",
      aciklama:
        "Eşyayı bulan kişi iletişim formunu doldurursa bilgileri ayrı bir e-posta ile size ulaşacaktır.\nBu bildirim yalnızca etiketin okutulduğunu gösterir; eşyanın kesin konumunu içermez.",
      siklik: "Aynı eşya için bu bildirim saatte en fazla bir kez gönderilir.",
    },

    devir: {
      konu: "ARKVIUM ürün sahipliği devri daveti",
      birKullanici: "Bir ARKVIUM kullanıcısı",
      giris: "{gonderen} \"{urun}\" adlı ürünün sahipliğini size devretmek istiyor.",
      yonerge: "Daveti incelemek ve onaylamak için aşağıdaki bağlantıyı kullanın:",
      gecerlilik:
        "Bu bağlantı {sure} saat boyunca geçerlidir ve yalnızca bir kez kullanılabilir.\nÜrün, siz onaylamadan hesabınıza geçmez.",
      uyari: "Bu daveti beklemiyorsanız bu e-postayı yok sayabilirsiniz.",
    },

    siparisOnay: {
      konu: "ARKVIUM siparişiniz alındı ({numara})",
      giris: "Ödemeniz alındı ve siparişiniz oluşturuldu.",
      numara: "Sipariş numarası: {numara}",
      tutar: "Toplam tutar: {tutar}",
      kargo: "Siparişiniz hazırlanıp kargoya verildiğinde bilgilendirileceksiniz.",
      takip: "Sipariş durumunuzu buradan izleyebilirsiniz:",
      hatirlatma:
        "Ürününüz elinize ulaştığında QR etiketini ARKVIUM hesabınızdan\netkinleştirmeyi unutmayın.",
    },
  },

  acilDurumPaneli: {
    baslik: "Acil Durum Profili",
    yayinda: "Yayında",
    yayindaDegil: "Yayında değil",
    aciklama1:
      "Tamamen isteğe bağlıdır. Doldurduğun bilgilerden yalnızca",
    herkeseGoster: "herkese göster",
    aciklama2:
      "olarak işaretlediklerin, profili yayına aldığında QR kodu okutan kişiye görünür. Sağlık bilgisi özel nitelikli kişisel veridir; istediğin an rızanı geri çekebilir veya profili silebilirsin.",
    kapsamUyarisi:
      "Önemli: Bilgileri her güncellediğinde profil güvenlik gereği yayından kaldırılır. Yeni bilgilerin paylaşılması için onayları tekrar vermen gerekir.",
    taslakUyarisi: "TASLAK — HUKUKÇU İNCELEMESİ GEREKTİRİR.",
    taslakMetin:
      "Aşağıdaki onay metinleri henüz kesinleşmemiştir ve yalnızca test amaçlıdır.",
    kullanimaKapali:
      "Bu özellik şu anda kullanıma kapalı. Lütfen daha sonra tekrar deneyin.",

    gorunurlukEtiketi: "QR sayfasında herkese göster",
    gosterilecekAd: "Gösterilecek ad",
    gosterilecekAdOrnek: "Örn. A. Yılmaz",
    kanGrubu: "Beyan ettiğin kan grubu",
    belirtmekIstemiyorum: "Belirtmek istemiyorum",
    alerjiler: "Alerjiler",
    ilaclar: "Kullandığın ilaçlar",
    saglikDurumlari: "Önemli sağlık durumları",
    acilNot: "Acil durum notu",
    kisiler: "Acil durumda aranacak kişiler (en fazla 2)",
    kisiAdi: "kişi adı",
    yakinlik: "Yakınlık",
    telefon: "Telefon",

    kaydet: "Bilgileri Kaydet",
    kaydediliyor: "Kaydediliyor…",
    onaylarBaslik: "Yayına alma onayları",
    onay1:
      "İşaretlediğim sağlık bilgilerimin, QR kodumu okutan herkese açık biçimde gösterilmesine açık rıza veriyorum. Bu bilgilerin kendi beyanım olduğunu, doğrulanmış tıbbi kayıt olmadığını ve rızamı istediğim an geri çekebileceğimi biliyorum.",
    onay2:
      "Eklediğim acil durum kişilerini bilgilendirdiğimi ve iletişim bilgilerinin paylaşılması için onaylarını aldığımı beyan ederim.",
    yayinaAl: "Profili Yayına Al",
    yayindaMetin:
      "Profil yayında. Rızanı geri çektiğinde bilgiler QR sayfasında anında görünmez olur; yeniden yayına almak için onayları tekrar vermen gerekir.",
    rizayiGeriCek: "Rızayı Geri Çek ve Yayından Kaldır",
    kaliciSil: "Profili Kalıcı Olarak Sil",
    silmeOnayi:
      "Acil durum profili ve içindeki tüm bilgiler kalıcı olarak silinecek. Devam edilsin mi?",
    islemTamamlandi: "İşlem tamamlandı.",
  },

  kalanlar: {
    siparisQrNotu:
      "Bu üründe {n} adet benzersiz QR etiketi bulunur. Ödeme kuruluşu iyzico üzerinden alınır; kart bilgileriniz ARKVIUM sunucusuna hiç gelmez.",
    kargoNotuTam: "Kargo ücreti ödeme adımında gösterilir.",
    urunlereGeri: "← Ürünler",
    urunlereDon: "← Ürünlere Dön",
    sifreEnAzKarakter: "Şifreniz en az {n} karakter olmalıdır.",
    sahip: "Sahip",
    durum: "Durum",
    kargo: "Kargo",
    aracOzet:
      "Numaranız görünmeden, aracınızla ilgili bildirimleri ARKVIUM üzerinden alın.",
    mesajArkviumIletilir: "Mesaj ARKVIUM üzerinden iletilir.",
    ilce: "İlçe",
    il: "İl",
    qrNumaraYok: "QR kodun içinde telefon numaranız bulunmaz.",
    qrIletisimGizli:
      "QR kodun açtığı sayfada kişisel iletişim bilginiz doğrudan gösterilmez.",
    qrMesajArkvium: "Mesaj size ARKVIUM üzerinden iletilir.",
    vazgec: "Vazgeç",
    sifre: "Şifre",
    kategori: "Kategori",
    aciklama: "Açıklama",
    adres: "Adres",
    esyaAdi: "Eşya Adı",
    sahipAdi: "Sahip Adı",
    onemli: "Önemli:",
    kargoNotu: "Kargo ücreti ödeme adımında eklenir.",
    etiketiEtkinlestirDugme: "Etiket Etkinleştir",
    etiketBagliDegil:
      "ARKVIUM etiketini hesabına bağla ve bir ürünle eşleştir.",
    urunYok: "Henüz hesabına bağlı ürün bulunmuyor.",
    urunDetayiniAc: "Ürün Detayını Aç",
    urunSayfasiniAc: "Ürün Sayfasını Aç",
    urunEtiketiYok:
      "Bu ürüne henüz bir etiket bağlı değil. Elindeki ARKVIUM etiketini hesabına bağlayarak bu ürünle eşleştirebilirsin.",
    urunBilgileriniGuncelle: "Ürün bilgilerini güncelleyebilirsin.",
    aktivasyonAltyazi:
      "Elindeki ARKVIUM etiketini hesabına bağla ve bir ürünle eşleştir.",
    aktivasyonBasarili:
      "Etiket artık ürününe bağlı. QR kodu okutulduğunda bulan kişi güvenli iletişim sayfasına ulaşacak.",
    urunuAc: "Ürünü Aç",
    hesabimaDon: "Hesabıma Dön",
    etiketKodu: "Etiket Kodu",
    etiketKoduYardim:
      "Etiketin üzerinde yazan koddur. Büyük/küçük harf ve tire farkı önemli değildir.",
    aktivasyonKodu: "Aktivasyon Kodu",
    aktivasyonKoduYardim:
      "Etiketin arkasındaki kazınarak açılan gizli koddur. Bu kodu kimseyle paylaşmayın.",
    hangiUruneBaglansin: "Etiket hangi ürüne bağlansın?",

    qrAdresi: "QR kodun açtığı adres",
    etiketIptalEdildi:
      "Bu etiket kalıcı olarak iptal edildi ve tekrar kullanılamaz. Yeni bir etiket edinip ürününe bağlayabilirsin.",
    pasifeAl: "Pasife Al",
    yenidenEtkinlestir: "Yeniden Etkinleştir",
    baskaUruneTasi: "Başka Ürüne Taşı",
    etiketiIptalEt: "Etiketi İptal Et",
    hangiUruneTasinsin: "Etiket hangi ürüne taşınsın?",
    tasimaYardim:
      "Yalnızca henüz etiketi olmayan ürünlerin listelenir. Taşıma işlemi etiket geçmişine kaydedilir.",
    etiketiIptalEtmek: "Etiketi iptal etmek",

    devirBekleyen:
      "Bu ürün için bekleyen bir devir daveti var. Ürün, karşı taraf onaylayana kadar sizde kalır.",
    devirAciklama:
      "Ürünün sahipliğini başka bir kullanıcıya devredebilirsiniz. Davet e-posta ile gönderilir ve ürün, karşı taraf onaylayana kadar sizde kalır.",
    aliciEpostasi: "Alıcının e-posta adresi",

    sifreDegistirUyari:
      "Şifreni değiştirdiğinde diğer cihazlardaki oturumlar kapanır.",
    mevcutSifre: "Mevcut Şifre",
    yeniSifre: "Yeni Şifre",
    yeniSifreTekrar: "Yeni Şifre (Tekrar)",

    oturumAciklama:
      "Hesabına başka bir cihazdan izinsiz erişildiğini düşünüyorsan tüm oturumları kapat. Bu cihazdan da çıkış yapılır.",
    tumOturumlariKapat: "Tüm Oturumları Kapat",
    oturumOnayi:
      "Tüm cihazlardaki oturumlar kapatılacak ve yeniden giriş yapman gerekecek. Devam edilsin mi?",

    bildirimYok:
      "Bu ürün için henüz bildirim yok. Eşyanı bulan biri QR kodunu okutup mesaj bıraktığında burada görünecek.",
    epostaDogrulanmadi: "E-posta adresin doğrulanmadı",
    epostaDogrulamaAciklama:
      "Eşyan bulunduğunda bildirimlerin sana ulaşabilmesi için e-posta adresini doğrulaman gerekiyor.",

    adSoyad: "Ad soyad",
    telefon: "Telefon",
    eposta: "E-posta",
    postaKodu: "Posta kodu (isteğe bağlı)",
    kimlikNumarasi: "T.C. kimlik numarası",
    kimlikAciklama:
      "Ödeme kuruluşu zorunlu tutar. Saklanmaz; yalnızca ödeme isteğinde iletilir.",

    farkliHesapGiris: "Farklı hesapla giriş yap",
    davetGecersiz:
      "Davet geçersiz veya süresi dolmuş. Lütfen size gönderilen e-postadaki bağlantıyı kullanın.",
    hesabimaGit: "Hesabıma Git",
    devirTamamlandi: "Devir tamamlandı. Ürün artık hesabınıza bağlı.",
    devirHataNeden:
      "En sık nedeni: davetin gönderildiği hesaptan farklı bir hesapla giriş yapılmış olmasıdır. Yukarıdaki hesabı kontrol edin.",
    davetFarkliEposta:
      "Davet başka bir e-posta adresine gönderildiyse bu hesapla kabul edilemez.",

    siparisSonrasi:
      "Ürününüz elinize ulaştığında QR etiketini ARKVIUM hesabınızdan etkinleştirin. Hesabınız yoksa önce ücretsiz hesap oluşturun.",
    etiketiniEtkinlestir: "Etiketini Etkinleştir",

    yeniSifreBelirle: "Yeni Şifre Belirle",
    yeniSifreAltyazi: "Hesabın için yeni bir şifre oluştur.",
    tumUrunler: "Tüm Ürünler",
  },

  whatsapp: {
    mesaj:
      "Merhaba, ARKVIUM ürünleri ve QR aktivasyonu hakkında destek almak istiyorum.",
    erisilebilirAd: "WhatsApp üzerinden ARKVIUM desteğine ulaş",
  },

  seo: {
    anaBaslik: "ARKVIUM — Dijital Sahiplik Platformu",
    anaAciklama:
      "Eşyaların kaybolsa bile sana geri dönsün. QR kodlu dijital sahiplik ve güvenli iletişim.",
  },

  gorsel: {
    temsili: "Temsili görsel",
  },
} as const;

export type Sozluk = typeof TR;
