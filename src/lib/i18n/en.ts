import type { DerinKismi } from "./birlestir";
import type { Sozluk } from "./tr";

/**
 * English dictionary.
 *
 * Typed as a DEEP PARTIAL of the Turkish source: any key left out here falls
 * back to Turkish at runtime, so a missing translation can never crash the
 * app or show an empty string.
 *
 * Style rules followed here:
 * - Natural, short, professional English — not word-for-word translation.
 * - "ARKVIUM" is never translated.
 * - No new claims about safety, health, privacy or durability; the meaning
 *   stays within what the Turkish text already says.
 * - No prices, amounts or currency — those come from `src/lib/siparis.ts`.
 */
export const EN: DerinKismi<Sozluk> = {
  marka: {
    slogan: "Digital Ownership Platform",
  },

  ortak: {
    yukleniyor: "Loading…",
    gonder: "Send",
    gonderiliyor: "Sending…",
    kaydet: "Save",
    kaydediliyor: "Saving…",
    iptal: "Cancel",
    kapat: "Close",
    geri: "Back",
    devam: "Continue",
    sil: "Delete",
    duzenle: "Edit",
    zorunlu: "(required)",
    hataBasligi: "Something went wrong",
    genelHata: "We couldn't complete that. Please try again.",
    baglantiHatasi: "Couldn't connect. Please try again.",
  },

  dil: {
    secici: "Language",
    turkce: "Turkish",
    ingilizce: "English",
    aktif: "Selected language",
  },

  header: {
    bolumler: "Sections",
    menuAc: "Open menu",
    menuKapat: "Close menu",
    girisYap: "Log In",
    hemenBasla: "Get Started",
    nasilCalisir: "How It Works",
    urunler: "Products",
    kullanim: "Uses",
    acilDurum: "Emergency",
    gizlilik: "Privacy",
    sss: "FAQ",
  },

  hero: {
    oncekiSlayt: "Previous slide",
    sonrakiSlayt: "Next slide",
    slaydiGoster: "slide",
    acilDurum: {
      etiket: "Emergency Profile",
      baslik: "In an emergency, seconds matter",
      metin:
        "Paramedics or anyone helping can scan the QR code to see the health details the owner chose to share, and reach their emergency contacts with one tap.",
      bilgiler: {
        kanGrubu: "Blood type",
        alerjiler: "Allergies",
        ilaclar: "Medications",
        kisiler: "Emergency contacts",
      },
      dugmeBirincil: "See the Emergency Profile",
      dugmeIkincil: "How It Works",
      beyan:
        "This information is provided by the user and is not a verified medical record.",
    },
    kayipEsya: {
      etiket: "Lost items",
      baslik: "Get your things back when they go missing",
      metin:
        "Pair an ARKVIUM tag with your belongings. Whoever finds them scans the QR code and reaches you safely — no app needed.",
      dugme: "Browse QR Tags",
    },
    evcilHayvan: {
      etiket: "Pets",
      baslik: "Give them a way home",
      metin:
        "When the QR tag on the collar is scanned, the finder can reach you through the details you chose to share.",
      dugme: "See the Pet Tag",
    },
    valiz: {
      etiket: "Luggage & travel",
      baslik: "Be reachable without putting your number on your bag",
      metin:
        "With a QR luggage tag, whoever finds your suitcase can contact you without seeing your phone number.",
      dugme: "See the Luggage Tag",
    },
    arac: {
      etiket: "Cars & motorcycles",
      baslik: "Private contact and an emergency link for your vehicle",
      metin:
        "The QR tag lets drivers reach the owner privately when needed, and shows the emergency details the owner has allowed.",
      dugme: "See the Vehicle Tag",
    },
  },

  akis: {
    etiket: "How it works",
    baslik: "Three steps, then forget about it",
    giris:
      "You set the tag up once. The rest happens on its own the day something goes missing.",
    adim1: {
      baslik: "Attach the tag",
      metin:
        "Stick it on or clip it on — that's it. No setup, no app download, no battery.",
    },
    adim2: {
      baslik: "Link it to your account",
      metin:
        "Enter the activation code printed on the tag in your ARKVIUM account and pair it with your item. You only do this once.",
    },
    adim3: {
      baslik: "Get a private message when it's scanned",
      metin:
        "Whoever finds your item scans the QR code and leaves you a message. The notification reaches you through ARKVIUM.",
    },
    faydalar: {
      kurulum: {
        baslik: "No setup needed",
        metin: "The QR opens in a browser; the finder installs nothing.",
      },
      numara: {
        baslik: "Your number stays private",
        metin: "Your phone number is never printed on the tag.",
      },
      tasima: {
        baslik: "Move the tag anytime",
        metin: "If your item changes, link the tag to another record.",
      },
      panel: {
        baslik: "One place to manage it all",
        metin: "Items, lost status and notifications in a single view.",
      },
    },
  },

  urunler: {
    etiket: "Product family",
    baslik: "Pick your tag",
    giris:
      "They all run on the same system. What differs is where they attach, what they're made of, and how many QR tags you get.",
    neZamanIseYarar: "When does it help?",
    satinAl: "Buy",
    qrAdediTekil: "Includes 1 QR tag",
    qrAdediCogul: "QR tags included",
    kategori: {
      gunlukEsya: "Everyday items",
      arac: "Vehicle",
      anahtar: "Keys",
      evcilHayvan: "Pets",
      seyahat: "Travel",
    },
    senaryo: {
      stickerSeti:
        "Leave your laptop bag at a café and whoever finds it can scan the sticker on the cover and let you know.",
      aracStickeri:
        "If your car is parked badly or blocking someone in, the driver can reach you through the QR on the windscreen.",
      metalAnahtarlik:
        "Drop your house or car keys and the finder scans the QR on the keyring to find you.",
      evcilHayvanKunyesi:
        "If your dog slips their collar and gets lost, whoever finds them scans the tag and contacts you.",
      valizEtiketi:
        "When your suitcase gets mixed up at baggage claim, the passenger who took it can message you via the tag.",
    },
    ad: {
      stickerSeti: "QR Sticker Set of 3",
      aracStickeri: "Vehicle Contact QR Sticker",
      metalAnahtarlik: "Metal QR Keyring",
      evcilHayvanKunyesi: "Pet QR Tag",
      valizEtiketi: "QR Luggage Tag",
    },
    aciklama: {
      stickerSeti:
        "Connect the things you care about to ARKVIUM's private messaging system.",
      aracStickeri:
        "Stick it on your windscreen. Get a private notification about bad parking, lights left on or anything else — without showing your phone number.",
      metalAnahtarlik:
        "A durable metal tag that links your keys to ARKVIUM's private finder messaging.",
      evcilHayvanKunyesi:
        "Let whoever finds your pet message you without your contact details being shown.",
      valizEtiketi:
        "Make sure whoever finds your suitcase can reach you safely.",
    },
  },

  kullanim: {
    etiket: "Uses",
    baslik: "Attaches to everything you care about",
    giris:
      "The same system works across different items: the QR is scanned, and the message reaches you through ARKVIUM.",
    arac: {
      baslik: "Vehicle",
      metin:
        "Let drivers reach you about bad parking, lights left on or anything else — without your number on the windscreen.",
      baglanti: "See the vehicle tag",
    },
    anahtar: {
      baslik: "Keys",
      metin: "Get your house and car keys back when you drop them.",
    },
    evcilHayvan: {
      baslik: "Pets",
      metin: "Let whoever scans the tag reach you safely.",
    },
    valiz: {
      baslik: "Luggage",
      metin: "Help a mixed-up suitcase find its owner.",
    },
    kayipEsya: {
      baslik: "Lost items",
      metin: "Mark an item as lost so anyone scanning the QR sees the notice.",
    },
  },

  konuKaydirici: {
    etiket: "What ARKVIUM does",
    baslik: "One tag, four different jobs",
    onceki: "Previous topic",
    sonraki: "Next topic",
    basliklar: "Topics",
    konuyuGoster: "topic",
    acilDurum: {
      etiket: "Emergency Profile",
      baslik: "For cars and motorcycles: what matters after a crash",
      metin:
        "You can add the details you want anyone helping you to see. Each field is turned on separately; anything you leave off never appears on the QR page.",
      m1: "Blood type, allergies, medications",
      m2: "Key medical conditions and an emergency note",
      m3: "Who to call in an emergency",
      beyan:
        "This information is provided by the user and is not a verified medical record. The feature is entirely optional and off by default.",
    },
    kayipEsya: {
      etiket: "Lost items",
      baslik: "Let the finder reach you",
      metin:
        "Tag your bag, keys, suitcase or everyday items. The finder scans the QR and leaves you a message.",
      m1: "The finder doesn't install an app",
      m2: "You can mark an item as lost",
      m3: "You can move the tag to another item",
    },
    evcilHayvan: {
      etiket: "Pets",
      baslik: "Let whoever scans the tag reach you safely",
      metin:
        "A QR tag on the collar gives whoever finds your pet a way to contact you.",
      m1: "Your phone number isn't printed on the tag",
      m2: "The notification reaches you through ARKVIUM",
      m3: "You can update the details anytime",
    },
    guvenliIletisim: {
      etiket: "Private messaging",
      baslik: "Get messages without showing your number",
      metin:
        "Anyone who needs to reach you sends the message through ARKVIUM; your contact details are never shown to them.",
      m1: "Your phone number is not in the QR code",
      m2: "Your contact details are not shown directly",
      m3: "Messages are delivered through ARKVIUM",
    },
  },

  gizlilik: {
    etiket: "Privacy",
    baslik: "Being findable shouldn't cost you your privacy",
    giris:
      "Your personal details don't need to be out in the open for someone to reach you.",
    madde1: "Your phone number is not in the QR code.",
    madde2: "Your contact details are not shown directly.",
    madde3: "Messages are delivered through ARKVIUM.",
  },

  sss: {
    etiket: "FAQ",
    baslik: "Frequently asked questions",
    s1: {
      soru: "Does the person scanning the QR code need an app?",
      cevap:
        "No. The QR code opens a web page and the message form is right there — no app install, no account needed.",
    },
    s2: {
      soru: "Is my phone number visible?",
      cevap:
        "Your phone number and email address are not shown on the page the QR code opens. The person messaging you leaves their own contact details instead.",
    },
    s3: {
      soru: "How do I activate a tag?",
      cevap:
        "Log in to your ARKVIUM account and enter the activation code printed on the tag. You need to be logged in to activate.",
    },
    s4: {
      soru: "How do messages reach me?",
      cevap:
        "The notification is sent to the email address on your account and also appears in your account.",
    },
    s5: {
      soru: "What happens to the tag if I change the item?",
      cevap:
        "You can move the tag to another record in your account; it stays active and links to the new item.",
    },
    s6: {
      soru: "Can I mark an item as lost?",
      cevap:
        "Yes. Once marked, anyone scanning the QR code sees the notice on the page.",
    },
  },

  sonCagri: {
    baslik: "Give your belongings a digital identity",
    metin:
      "Pick a tag, link it to your account, and get notified without showing your number.",
    urunleriIncele: "Browse Products",
    etiketiEtkinlestir: "Activate My Tag",
  },

  footer: {
    aciklama:
      "Digital Ownership Platform. Give your belongings a QR-based digital identity and be reachable without your details being shown.",
    urunler: "Products",
    tumUrunler: "All products",
    kullanimAlanlari: "Use cases",
    nasilCalisir: "How it works",
    ucAdimdaKullanim: "Three steps to get started",
    gizlilik: "Privacy",
    sss: "Frequently asked questions",
    hesap: "Account",
    girisYap: "Log in",
    hesapOlustur: "Create account",
    etiketimiEtkinlestir: "Activate my tag",
    telifHakki: "© 2026 ARKVIUM. All rights reserved.",
  },

  qr: {
    baslik: "Found Item",
    altYazi: "This item is registered with ARKVIUM.",
    markaAlt: "ARKVIUM — Digital Ownership Platform",
    kategori: "Category",
    durum: "Status",
    aciklama: "Description",
    iptalEdilmis: {
      baslik: "This tag has been cancelled",
      metin:
        "This tag is no longer in use. If you found an item, please use another contact method shown on the tag.",
    },
    etkinlestirilmemis: {
      baslik: "This tag hasn't been activated yet",
      metin:
        "This tag isn't linked to an item. If the tag belongs to you, you can activate it from your ARKVIUM account.",
      dugme: "Activate this tag",
    },
    pasif: {
      baslik: "This tag is currently paused",
      metin:
        "The owner has temporarily disabled this tag, so messages can't be sent right now.",
    },
    urunYok: {
      baslik: "No item is linked to this tag",
      metin:
        "The tag is active but isn't linked to an item, so messages can't be sent right now.",
    },
    kayipUyarisi: {
      baslik: "This item has been reported lost",
      metin:
        "The owner is looking for this item. If you found it, fill in the form below to let them know — your contact details go only to the owner.",
    },
    buEsyayiBuldum: "I found this item",
    whatsappIleIletisim: "Message on WhatsApp",
    whatsappMesaji:
      "Hello, I found an item registered with ARKVIUM.\n\nRecord No: {kayitNo}\n\nI'd like to share some information about it.",
    durumlar: {
      active: "Active",
      lost: "Lost",
      found: "Found",
      inactive: "Inactive",
    },
  },

  bulanKisi: {
    baslik: "Finder Form",
    aciklama: "Leave your details so the owner can reach you safely.",
    buldumDugmesi: "I found this item",
    adSoyad: "Full name",
    telefon: "Phone",
    konum: "Location",
    not: "You can leave a short note about the item",
    onay: "I agree to share my contact details with the owner.",
    gonder: "Send",
    gonderiliyor: "Sending...",
    eksikAlan: "Please fill in your name, phone and location.",
    onayGerekli:
      "To continue, you need to agree to share your contact details with the owner.",
    gonderimHatasi: "We couldn't send your report. Please try again.",
    basariBaslik: "We've got your details",
    basariMetin: "Your report will be delivered securely to the owner.",
    basariNot: "Thank you. You've helped an item find its way home.",
  },

  acilDurumGorunum: {
    baslik: "Emergency Information",
    beyan:
      "This information is provided by the owner and published by them to be shared. It is not a verified medical record.",
    ad: "Name",
    kanGrubu: "Stated blood type",
    alerjiler: "Allergies",
    ilaclar: "Medications",
    saglikDurumlari: "Key medical conditions",
    not: "Note",
    kisiler: "Emergency contacts",
    ara: "Call",
    kanGruplari: {
      A_RH_POZITIF: "A Rh+",
      A_RH_NEGATIF: "A Rh−",
      B_RH_POZITIF: "B Rh+",
      B_RH_NEGATIF: "B Rh−",
      AB_RH_POZITIF: "AB Rh+",
      AB_RH_NEGATIF: "AB Rh−",
      SIFIR_RH_POZITIF: "0 Rh+",
      SIFIR_RH_NEGATIF: "0 Rh−",
      BILINMIYOR: "Unknown",
    },
    acilCagri:
      "If there is a risk to life, call 112 (emergency services) first.",
  },

  kimlik: {
    girisBaslik: "Log In",
    girisAltyazi: "Log in to manage your products.",
    girisDugme: "Log In",
    girisYapiliyor: "Logging in...",
    girisHatasi: "Couldn't log you in.",
    eposta: "Email",
    epostaOrnek: "you@example.com",
    sifre: "Password",
    sifreniz: "Your password",
    sifremiUnuttum: "Forgot password",
    hesabinYokMu: "Don't have an account?",
    hesapOlustur: "Create account",

    kayitBaslik: "Create Account",
    kayitAltyazi: "Manage your products and digital ownership records.",
    kayitDugme: "Create Account",
    kayitYapiliyor: "Creating account...",
    kayitHatasi: "Couldn't create your account.",
    kayitBasarili: "Your account has been created.",
    adSoyad: "Full Name",
    adSoyadOrnek: "Your first and last name",
    telefon: "Phone",
    telefonOrnek: "05xxxxxxxxx",
    sifreEnAz: "At least 8 characters",
    zatenHesapVar: "Already have an account?",
    girisYap: "Log in",

    unuttumBaslik: "Forgot Password",
    unuttumAltyazi:
      "Enter your account email and we'll send you a reset link.",
    unuttumDugme: "Send Reset Link",
    girisEkraninaDon: "Back to login",

    yeniSifre: "New Password",
    yeniSifreTekrar: "New Password (Repeat)",
    sifreTekrarOrnek: "Repeat your password",
    sifreGuncelle: "Update Password",
    sifrelerEslesmiyor: "Passwords don't match.",
    baglantiGecersiz: "This link looks invalid.",
    yeniBaglantiIste: "Request a new reset link",

    dogrulaniyor: "Verifying your email address...",
    dogrulamaGecersiz: "This verification link looks invalid.",
    dogrulamaHatasi: "Verification couldn't be completed.",
    sayfaEpostaDogrulama: "Email Verification",
    sayfaYeniSifre: "Set a New Password",
    hesabimaGit: "Go to my account",
  },

  hesap: {
    baslik: "My Account",
    bilgiler: "Account Details",
    adSoyad: "Full Name",
    eposta: "Email",
    telefon: "Phone",
    urunlerim: "My Items",
    etiketinVarMi: "Got a tag in hand?",
    olusturulmaTarihi: "Created",
    aciklama: "Description",
    etiket: "Tag",
    urunuDuzenle: "Edit Item",

    durum: {
      kayipBaslik: "This item is marked as lost",
      kayipMetin:
        "Anyone scanning the QR code sees a notice that the item is being looked for. Remove the mark once you have it back.",
      normalMetin:
        "Mark it here if you've lost the item. Anyone scanning the QR code will see it's being looked for and can reach you more easily.",
      buldum: "I found my item",
      kaybettim: "I lost this item",
      hata: "Couldn't change the status. Please try again.",
    },

    bildirim: {
      konum: "Location:",
      eposta: "Email:",
      mesajYok: "No message left.",
    },

    epostaDogrulama: {
      gonder: "Send verification email",
      hata: "Couldn't send the email.",
    },

    oturum: {
      tumCihazlardanCik: "Log out of all devices",
      kapatiliyor: "Logging out...",
      onayla: "Yes, log out everywhere",
    },

    devir: {
      baslik: "Ownership Transfer",
      davetEdilen: "Invited",
      sonGecerlilik: "Expires",
      davetIptal: "Cancel Invitation",
      davetGonder: "Send Transfer Invitation",
    },

    etiketPaneli: {
      baslik: "Tag",
      qrAdresi: "Address the QR code opens",
      etiketDurumlari: {
        unused: "Unused",
        active: "Active",
        inactive: "Paused",
        revoked: "Cancelled",
      },
      kullanilmamis: "Unused",
      iptalEdilmis: "Cancelled",
      tasiniyor: "Moving...",
      geriAlinamaz: "cannot be undone",
      iptalOnayi: "Yes, cancel permanently",
    },

    sifre: {
      degistir: "Change Password",
      guncelle: "Update Password",
      vazgec: "Cancel",
      eslesmiyor: "New passwords don't match.",
      hata: "Couldn't change the password.",
    },

    kayitDuzenle: {
      kaydet: "Save Changes",
      hata: "Couldn't update the record.",
      genelHata: "Something went wrong while updating the record.",
    },

    aktivasyon: {
      baslik: "Activate Tag",
      etiketKodu: "ARK-XXXX-XXXX",
      aktivasyonKodu: "XXXX-XXXX-XXXX",
      mevcutUrune: "To an existing item",
      urunSecin: "Select item",
      yeniUrune: "To a new item",
      yeniUrunAdi: "New item name",
      yeniUrunOrnek: "e.g. Laptop bag",
      etkinlestir: "Activate Tag",
      etkinlestiriliyor: "Activating...",
      hata: "Couldn't activate the tag.",
    },
  },

  siparis: {
    teslimatBilgileri: "Delivery Details",
    toplam: "Total",
    odemeyeGec: "Continue to Payment",
    hazirlaniyor: "Preparing your order...",
    olusturulamadi: "Couldn't create the order.",
    yonlendiriliyor: "Taking you to the payment page...",
    odemeBaslatilamadi: "Couldn't start the payment.",
    baglantiHatasi: "We couldn't complete that. Check your connection.",
  },

  odeme: {
    basariBaslik: "Payment received",
    basariMetin:
      "Your order has been created and will be prepared. You'll find the confirmation email in your inbox.",
    hataBaslik: "Payment couldn't be completed",
    hataMetin:
      "If no amount was charged to your card, there's nothing to worry about. You can create the order again.",
    bekliyorBaslik: "Checking your payment",
    bekliyorMetin:
      "We're waiting for confirmation from your bank. Refresh this page in a few minutes to see the current status.",
    ozet: "Order Summary",
    numara: "Order number",
    tarih: "Order date",
    toplamKargoDahil: "Total (shipping included)",
    siradakiAdim: "What's next",
  },

  devirDaveti: {
    baslik: "Ownership Transfer",
    aciklama:
      "Someone wants to transfer ownership of this item to you. If you accept, it will be linked to your account.",
    baglantiEksik: "The invitation link is missing.",
    girisYapanHesap: "Currently logged in as",
    kabulEt: "Accept Ownership",
    tamamlaniyor: "Completing transfer...",
  },

  aracSayfasi: {
    baslik: "Vehicle Contact QR Sticker",
    altyazi:
      "Let people message you about your vehicle through ARKVIUM — without your phone number on display.",
    metaBaslik: "Vehicle Contact QR Sticker | ARKVIUM",
    metaAciklama:
      "Get private notifications about your vehicle without showing your phone number.",

    neSaglar: "What it gives you",
    nasilCalisir: "How it works",
    hangiDurumlarda: "When it helps",
    gizlilikNasil: "How privacy is protected",
    sikSorulan: "Frequently asked questions",
    telifHakki: "© 2026 ARKVIUM. All rights reserved.",

    fayda1Baslik: "Your number stays private",
    fayda1Metin:
      "No phone number on the windscreen. Whoever scans the QR code messages you through ARKVIUM.",
    fayda2Baslik: "Scanned with a phone camera",
    fayda2Metin:
      "The QR code is scanned with the phone's own camera and opens in a browser.",
    fayda3Baslik: "No app install needed",
    fayda3Metin:
      "The person messaging you doesn't need to install an app or create an account.",
    fayda4Baslik: "The tag is linked to your account",
    fayda4Metin:
      "You activate the tag in your ARKVIUM account; the link is made only with your account.",
    fayda5Baslik: "Messages come through ARKVIUM",
    fayda5Metin:
      "The notification reaches you through ARKVIUM; no direct contact is made.",

    adim1Baslik: "Buy the product",
    adim1Metin: "Order the sticker.",
    adim2Baslik: "Activate it in your account",
    adim2Metin:
      "When the tag arrives, log in to your account and link it.",
    adim3Baslik: "Apply it to your vehicle",
    adim3Metin:
      "Stick it somewhere on your vehicle where it can be scanned from outside.",
    adim4Baslik: "Get private messages",
    adim4Metin:
      "When the QR code is scanned, the message reaches you through ARKVIUM.",

    senaryo1: "Bad parking or blocking the way",
    senaryo2: "Lights or a window left open",
    senaryo3: "Damage spotted on the vehicle",
    senaryo4: "Risk of being towed or moved",

    sss1Soru: "Does the person scanning the QR code need an app?",
    sss1Cevap:
      "No. The QR code opens a web page and the message form is right there. No app install or account needed.",
    sss2Soru: "Is my phone number visible?",
    sss2Cevap:
      "Your phone number and email address are not shown on the page the QR code opens. The person messaging you leaves their own contact details.",
    sss3Soru: "How do I activate the tag?",
    sss3Cevap:
      "Log in to your ARKVIUM account and enter the activation code printed on the tag. You need to be logged in to activate.",
    sss4Soru: "How does a message reach me?",
    sss4Cevap:
      "ARKVIUM sends the notification to the email address on your account, and it also appears in your account.",
    sss5Soru: "What if I change my vehicle?",
    sss5Cevap:
      "You can move the tag to another record in your account; it stays active and links to the new record.",
  },

  mesajlar: {
    "Bu işlem için giriş yapmanız gerekiyor.":
      "You need to log in to do that.",
    "Bu kayıt üzerinde işlem yapma yetkiniz yok.":
      "You don't have permission to change this record.",
    "Kayıt oluşturmak için giriş yapmanız gerekiyor.":
      "You need to log in to create a record.",
    "Girilen bilgiler izin verilen uzunluğu aşıyor.":
      "The details you entered are too long.",
    "Geçerli bir telefon numarası giriniz.":
      "Please enter a valid phone number.",
    "Kayıt bulunamadı.": "Record not found.",
    "Geçersiz kan grubu seçimi.": "Invalid blood type selection.",
    "Acil durum kişileri listesi geçersiz.":
      "The emergency contacts list is invalid.",
    "Acil durum kişisinin adı zorunludur.":
      "The emergency contact's name is required.",
    "Profili etkinleştirmek için iki onayı da işaretlemeniz gerekir.":
      "You need to tick both consents to publish the profile.",
    "Önce acil durum profilini oluşturun.":
      "Create the emergency profile first.",
    "Ad soyad, e-posta, telefon, adres, ilçe ve il alanları zorunludur.":
      "Name, email, phone, address, district and city are required.",
    "Sipariş numarası üretilemedi. Lütfen tekrar deneyin.":
      "We couldn't generate an order number. Please try again.",
    "Sipariş bulunamadı.": "Order not found.",
    "Bu sipariş için ödeme başlatılamıyor.":
      "Payment can't be started for this order.",
    "Ödeme doğrulanamadı. Lütfen sipariş durumunu kontrol edin.":
      "The payment couldn't be verified. Please check your order status.",
    "İşlem tamamlanamadı.": "We couldn't complete that.",
    "Etiket bulunamadı.": "Tag not found.",
  },

  eposta: {
    imza: "ARKVIUM\nDigital Ownership Platform",
    merhaba: "Hello",

    sifreSifirlama: {
      konu: "ARKVIUM password reset request",
      giris: "We received a password reset request for your ARKVIUM account.",
      yonerge: "Use the link below to set a new password:",
      gecerlilik:
        "This link is valid for {sure} minutes and can only be used once.",
      uyari:
        "If you didn't request this, you can ignore this email; your password won't change.",
    },

    dogrulama: {
      konu: "Verify your ARKVIUM email address",
      giris: "Thank you for creating your ARKVIUM account.",
      yonerge: "Use the link below to verify your email address:",
      gecerlilik:
        "This link is valid for {sure} hours and can only be used once.",
      uyari: "If you didn't create this account, you can ignore this email.",
    },

    tarama: {
      konu: "ARKVIUM: your \"{urun}\" tag was scanned",
      giris:
        "The QR tag on \"{urun}\", which you marked as lost, was just scanned.",
      zaman: "Scanned at: {zaman}",
      aciklama:
        "If the finder fills in the contact form, their details will reach you in a separate email.\nThis notification only means the tag was scanned; it does not include the item's exact location.",
      siklik: "This notification is sent at most once per hour for the same item.",
    },

    devir: {
      konu: "ARKVIUM ownership transfer invitation",
      birKullanici: "An ARKVIUM user",
      giris: "{gonderen} wants to transfer ownership of \"{urun}\" to you.",
      yonerge: "Use the link below to review and accept the invitation:",
      gecerlilik:
        "This link is valid for {sure} hours and can only be used once.\nThe item won't move to your account until you accept.",
      uyari: "If you weren't expecting this invitation, you can ignore this email.",
    },

    siparisOnay: {
      konu: "Your ARKVIUM order is confirmed ({numara})",
      giris: "We've received your payment and created your order.",
      numara: "Order number: {numara}",
      tutar: "Total: {tutar}",
      kargo: "We'll let you know once your order is prepared and shipped.",
      takip: "You can track your order status here:",
      hatirlatma:
        "When your product arrives, remember to activate the QR tag\nfrom your ARKVIUM account.",
    },
  },

  acilDurumPaneli: {
    baslik: "Emergency Profile",
    yayinda: "Published",
    yayindaDegil: "Not published",
    aciklama1: "Entirely optional. Only the fields you mark as",
    herkeseGoster: "show publicly",
    aciklama2:
      "appear to whoever scans your QR code once the profile is published. Health data is sensitive personal data; you can withdraw your consent or delete the profile at any time.",
    kapsamUyarisi:
      "Important: Every time you update the details, the profile is unpublished for safety. To share the new information you need to give the consents again.",
    taslakUyarisi: "DRAFT — REQUIRES LEGAL REVIEW.",
    taslakMetin:
      "The consent texts below are not final and are for testing only.",
    kullanimaKapali:
      "This feature is currently unavailable. Please try again later.",

    gorunurlukEtiketi: "Show publicly on the QR page",
    gosterilecekAd: "Display name",
    gosterilecekAdOrnek: "e.g. A. Smith",
    kanGrubu: "Your stated blood type",
    belirtmekIstemiyorum: "Prefer not to say",
    alerjiler: "Allergies",
    ilaclar: "Medications you take",
    saglikDurumlari: "Key medical conditions",
    acilNot: "Emergency note",
    kisiler: "Emergency contacts (up to 2)",
    kisiAdi: "contact name",
    yakinlik: "Relationship",
    telefon: "Phone",

    kaydet: "Save Details",
    kaydediliyor: "Saving…",
    onaylarBaslik: "Consents to publish",
    onay1:
      "I give my explicit consent for the health details I marked to be shown publicly to anyone who scans my QR code. I understand this is my own statement, not a verified medical record, and that I can withdraw my consent at any time.",
    onay2:
      "I confirm that I have informed the emergency contacts I added and have their permission to share their contact details.",
    yayinaAl: "Publish Profile",
    yayindaMetin:
      "The profile is published. When you withdraw consent, the details disappear from the QR page immediately; to publish again you need to give the consents once more.",
    rizayiGeriCek: "Withdraw Consent and Unpublish",
    kaliciSil: "Delete Profile Permanently",
    silmeOnayi:
      "The emergency profile and everything in it will be permanently deleted. Continue?",
    islemTamamlandi: "Done.",
  },

  kalanlar: {
    siparisQrNotu:
      "This product includes {n} unique QR tag(s). Payment is handled by iyzico; your card details never reach ARKVIUM's servers.",
    kargoNotuTam: "Shipping is calculated at the payment step.",
    urunlereGeri: "← Products",
    urunlereDon: "← Back to Products",
    sifreEnAzKarakter: "Your password must be at least {n} characters.",
    sahip: "Owner",
    durum: "Status",
    kargo: "Shipping",
    aracOzet:
      "Get notifications about your vehicle through ARKVIUM, without showing your number.",
    mesajArkviumIletilir: "Messages are delivered through ARKVIUM.",
    ilce: "District",
    il: "City",
    qrNumaraYok: "Your phone number is not in the QR code.",
    qrIletisimGizli:
      "Your personal contact details are not shown directly on the page the QR code opens.",
    qrMesajArkvium: "Messages are delivered to you through ARKVIUM.",
    vazgec: "Cancel",
    sifre: "Password",
    kategori: "Category",
    aciklama: "Description",
    adres: "Address",
    esyaAdi: "Item Name",
    sahipAdi: "Owner Name",
    onemli: "Important:",
    kargoNotu: "Shipping is added at the payment step.",
    etiketiEtkinlestirDugme: "Activate Tag",
    etiketBagliDegil: "Link an ARKVIUM tag to your account and pair it with an item.",
    urunYok: "You don't have any items linked yet.",
    urunDetayiniAc: "Open Item Details",
    urunSayfasiniAc: "Open Item Page",
    urunEtiketiYok:
      "No tag is linked to this item yet. Link the ARKVIUM tag you have to your account and pair it with this item.",
    urunBilgileriniGuncelle: "You can update the item details.",
    aktivasyonAltyazi:
      "Link the ARKVIUM tag you have to your account and pair it with an item.",
    aktivasyonBasarili:
      "The tag is now linked to your item. When the QR code is scanned, the finder reaches the private contact page.",
    urunuAc: "Open Item",
    hesabimaDon: "Back to My Account",
    etiketKodu: "Tag Code",
    etiketKoduYardim:
      "The code printed on the tag. Case and dashes don't matter.",
    aktivasyonKodu: "Activation Code",
    aktivasyonKoduYardim:
      "The hidden code you scratch off on the back of the tag. Don't share it with anyone.",
    hangiUruneBaglansin: "Which item should the tag be linked to?",

    qrAdresi: "Address the QR code opens",
    etiketIptalEdildi:
      "This tag has been permanently cancelled and can't be used again. You can get a new tag and link it to your item.",
    pasifeAl: "Pause",
    yenidenEtkinlestir: "Reactivate",
    baskaUruneTasi: "Move to Another Item",
    etiketiIptalEt: "Cancel Tag",
    hangiUruneTasinsin: "Which item should the tag move to?",
    tasimaYardim:
      "Only your items without a tag are listed. The move is recorded in the tag history.",
    etiketiIptalEtmek: "Cancelling the tag",

    devirBekleyen:
      "There's a pending transfer invitation for this item. It stays with you until the other person accepts.",
    devirAciklama:
      "You can transfer ownership of this item to another user. The invitation is sent by email and the item stays with you until they accept.",
    aliciEpostasi: "Recipient's email address",

    sifreDegistirUyari:
      "Changing your password logs you out on other devices.",
    mevcutSifre: "Current Password",
    yeniSifre: "New Password",
    yeniSifreTekrar: "New Password (Repeat)",

    oturumAciklama:
      "If you think someone accessed your account from another device, log out everywhere. You'll be logged out on this device too.",
    tumOturumlariKapat: "Log Out Everywhere",
    oturumOnayi:
      "You'll be logged out on all devices and will need to log in again. Continue?",

    bildirimYok:
      "No notifications for this item yet. When someone scans the QR code and leaves a message, it'll show up here.",
    epostaDogrulanmadi: "Your email isn't verified",
    epostaDogrulamaAciklama:
      "Verify your email address so notifications can reach you when your item is found.",

    adSoyad: "Full name",
    telefon: "Phone",
    eposta: "Email",
    postaKodu: "Postal code (optional)",
    kimlikNumarasi: "National ID number",
    kimlikAciklama:
      "Required by the payment provider. It isn't stored; it's only sent with the payment request.",

    farkliHesapGiris: "Log in with a different account",
    davetGecersiz:
      "The invitation is invalid or has expired. Please use the link in the email you were sent.",
    hesabimaGit: "Go to My Account",
    devirTamamlandi: "Transfer complete. The item is now linked to your account.",
    devirHataNeden:
      "The most common reason is being logged in with a different account than the one the invitation was sent to. Check the account shown above.",
    davetFarkliEposta:
      "If the invitation was sent to a different email address, it can't be accepted with this account.",

    siparisSonrasi:
      "When your product arrives, activate the QR tag from your ARKVIUM account. If you don't have an account, create one for free first.",
    etiketiniEtkinlestir: "Activate Your Tag",

    yeniSifreBelirle: "Set a New Password",
    yeniSifreAltyazi: "Create a new password for your account.",
    tumUrunler: "All Products",
  },

  whatsapp: {
    mesaj:
      "Hello, I would like support regarding ARKVIUM products and QR activation.",
    erisilebilirAd: "Contact ARKVIUM support via WhatsApp",
  },

  seo: {
    anaBaslik: "ARKVIUM — Digital Ownership Platform",
    anaAciklama:
      "Get your belongings back when they go missing. QR-based digital ownership and private messaging.",
  },

  gorsel: {
    temsili: "Illustrative image",
  },
};
