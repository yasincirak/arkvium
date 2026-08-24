import { prisma } from "./prisma";
import { coz, sifrele } from "./acil-durum-sifreleme";
import {
  AcilDurumHatasi,
  gecerliKanGrubu,
  kanGrubuDogrula,
  ONAY_METNI_SURUMU,
  SINIRLAR,
  serbestMetin,
  telefonNormalize,
  bool,
  type KanGrubuDegeri,
} from "./acil-durum-dogrulama";

export {
  AcilDurumHatasi,
  KAN_GRUBU_ETIKETLERI,
  KAN_GRUPLARI,
  ONAY_METNI_SURUMU,
  SINIRLAR,
  telefonNormalize,
  type KanGrubuDegeri,
} from "./acil-durum-dogrulama";

/**
 * Acil Durum Profili servis katmanı.
 *
 * GÜVENLİK: Bu dosyadaki hiçbir fonksiyon oturum AÇMAZ ve yetki VARSAYMAZ;
 * sahiplik her yazma işleminde `userId` ile veritabanı sorgusunda zorlanır.
 * Çağıran katman (route handler) oturumu ve hız sınırını ayrıca uygular.
 *
 * Hassas metin alanları `acil-durum-sifreleme.ts` ile şifrelenir. Hata
 * mesajları hiçbir zaman sağlık verisi veya telefon numarası içermez.
 */

export type YakinGirdisi = {
  name: unknown;
  relationship?: unknown;
  phone: unknown;
};

export type ProfilGirdisi = {
  displayName?: unknown;
  bloodType?: unknown;
  allergies?: unknown;
  medications?: unknown;
  medicalConditions?: unknown;
  emergencyNote?: unknown;
  displayNameGorunur?: unknown;
  bloodTypeGorunur?: unknown;
  allergiesGorunur?: unknown;
  medicationsGorunur?: unknown;
  medicalConditionsGorunur?: unknown;
  emergencyNoteGorunur?: unknown;
  contactsGorunur?: unknown;
  kisiler?: unknown;
};

/**
 * Kaydın gerçekten bu kullanıcıya ait olduğunu veritabanında doğrular.
 * Başkasının kaydı ile var olmayan kayıt AYNI hatayı alır (numaralandırma yok).
 */
async function kaydiDogrula(itemRecordId: string, userId: string) {
  const kayit = await prisma.itemRecord.findFirst({
    where: { id: itemRecordId, userId },
    select: { id: true },
  });

  if (!kayit) {
    throw new AcilDurumHatasi("Kayıt bulunamadı.");
  }

  return kayit;
}

/** Yakın listesini doğrular ve en fazla 2 kayda indirger. */
function yakinlariDogrula(ham: unknown): {
  name: string;
  relationship: string | null;
  phone: string;
  priority: number;
}[] {
  if (ham === undefined || ham === null) {
    return [];
  }

  if (!Array.isArray(ham)) {
    throw new AcilDurumHatasi("Acil durum kişileri listesi geçersiz.");
  }

  if (ham.length > SINIRLAR.enFazlaKisi) {
    throw new AcilDurumHatasi(
      `En fazla ${SINIRLAR.enFazlaKisi} acil durum kişisi ekleyebilirsiniz.`
    );
  }

  return ham.map((girdi, sira) => {
    const kisi = (girdi ?? {}) as YakinGirdisi;
    const ad = serbestMetin(kisi.name, "Kişi adı", SINIRLAR.contactName);

    if (!ad) {
      throw new AcilDurumHatasi("Acil durum kişisinin adı zorunludur.");
    }

    return {
      name: ad,
      relationship: serbestMetin(
        kisi.relationship,
        "Yakınlık",
        SINIRLAR.contactRelationship
      ),
      phone: telefonNormalize(kisi.phone),
      priority: sira + 1,
    };
  });
}

/**
 * Profili oluşturur veya günceller.
 *
 * ÖNEMLİ: Bu işlem profili ETKİNLEŞTİRMEZ. Etkinleştirme ayrı ve açık rıza
 * gerektiren bir adımdır (`profiliEtkinlestir`). İçerik değişince mevcut rıza
 * korunur; görünürlük seçimleri kullanıcının kendi tercihidir.
 */
export async function profiliKaydet(girdi: {
  itemRecordId: string;
  userId: string;
  veri: ProfilGirdisi;
}) {
  await kaydiDogrula(girdi.itemRecordId, girdi.userId);

  const v = girdi.veri ?? {};

  const alanlar = {
    displayName: sifrele(serbestMetin(v.displayName, "Ad", SINIRLAR.displayName)),
    // Kan grubu da sağlık verisidir: önce geçerli koda doğrulanır, sonra
    // diğer alanlarla aynı şekilde ŞİFRELENEREK yazılır.
    bloodType: sifrele(kanGrubuDogrula(v.bloodType)),
    allergies: sifrele(serbestMetin(v.allergies, "Alerjiler", SINIRLAR.allergies)),
    medications: sifrele(
      serbestMetin(v.medications, "Kullanılan ilaçlar", SINIRLAR.medications)
    ),
    medicalConditions: sifrele(
      serbestMetin(
        v.medicalConditions,
        "Önemli sağlık durumları",
        SINIRLAR.medicalConditions
      )
    ),
    emergencyNote: sifrele(
      serbestMetin(v.emergencyNote, "Acil durum notu", SINIRLAR.emergencyNote)
    ),
    displayNameGorunur: bool(v.displayNameGorunur),
    bloodTypeGorunur: bool(v.bloodTypeGorunur),
    allergiesGorunur: bool(v.allergiesGorunur),
    medicationsGorunur: bool(v.medicationsGorunur),
    medicalConditionsGorunur: bool(v.medicalConditionsGorunur),
    emergencyNoteGorunur: bool(v.emergencyNoteGorunur),
    contactsGorunur: bool(v.contactsGorunur),
  };

  const yakinlar = yakinlariDogrula(v.kisiler);

  /**
   * MADDE 3 — İçerik değişince ESKİ RIZA otomatik geçerli sayılmaz.
   *
   * Yayındaki bir profile yeni sağlık veya iletişim verisi eklendiğinde,
   * kullanıcının daha önce verdiği rıza o yeni veriyi kapsamaz. Bu yüzden
   * her içerik kaydı profili GÜVENLİ biçimde yayından kaldırır ve onay
   * alanlarını temizler. Yeniden yayına almak için `profiliEtkinlestir`
   * üzerinden YENİ açık rıza gerekir.
   *
   * `consentWithdrawnAt` burada YAZILMAZ: bu bir rıza geri çekme değil,
   * kapsam değişikliği nedeniyle yeniden onay beklenmesidir.
   */
  const yayindanKaldir = {
    enabled: false,
    disabledAt: new Date(),
    explicitConsentAt: null,
    explicitConsentVersion: null,
    disclaimerAcceptedAt: null,
    emergencyContactDeclarationAcceptedAt: null,
  };

  return prisma.$transaction(async (islem) => {
    const oncekiDurum = await islem.emergencyProfile.findUnique({
      where: { itemRecordId: girdi.itemRecordId },
      select: { enabled: true },
    });

    const profil = await islem.emergencyProfile.upsert({
      where: { itemRecordId: girdi.itemRecordId },
      create: {
        itemRecordId: girdi.itemRecordId,
        userId: girdi.userId,
        ...alanlar,
      },
      update: { ...alanlar, ...yayindanKaldir },
      select: { id: true },
    });

    // Yakınlar tam olarak yeniden yazılır: eskiler kalmaz.
    await islem.emergencyContact.deleteMany({
      where: { emergencyProfileId: profil.id },
    });

    for (const yakin of yakinlar) {
      await islem.emergencyContact.create({
        data: {
          emergencyProfileId: profil.id,
          name: sifrele(yakin.name)!,
          relationship: yakin.relationship,
          phone: sifrele(yakin.phone)!,
          priority: yakin.priority,
        },
      });
    }

    return { id: profil.id, yayindanKaldirildi: oncekiDurum?.enabled === true };
  });
}

/**
 * Profili etkinleştirir.
 *
 * İKİ AYRI AÇIK BEYAN zorunludur; ikisi de işaretlenmeden etkinleştirilmez.
 * Onay anı ve metin SÜRÜMÜ kaydedilir. Daha önce geri çekilmiş bir rıza
 * yeniden kullanılmaz: her etkinleştirmede yeni onay yazılır.
 */
export async function profiliEtkinlestir(girdi: {
  itemRecordId: string;
  userId: string;
  saglikVerisiOnayi: boolean;
  yakinBeyani: boolean;
}) {
  await kaydiDogrula(girdi.itemRecordId, girdi.userId);

  if (!girdi.saglikVerisiOnayi || !girdi.yakinBeyani) {
    throw new AcilDurumHatasi(
      "Profili etkinleştirmek için iki onayı da işaretlemeniz gerekir."
    );
  }

  const simdi = new Date();

  const sonuc = await prisma.emergencyProfile.updateMany({
    where: { itemRecordId: girdi.itemRecordId, userId: girdi.userId },
    data: {
      enabled: true,
      explicitConsentAt: simdi,
      explicitConsentVersion: ONAY_METNI_SURUMU,
      disclaimerAcceptedAt: simdi,
      emergencyContactDeclarationAcceptedAt: simdi,
      // Yeni onay verildi: eski geri çekme kaydı temizlenir.
      consentWithdrawnAt: null,
      disabledAt: null,
    },
  });

  if (sonuc.count !== 1) {
    throw new AcilDurumHatasi("Önce acil durum profilini oluşturun.");
  }
}

/**
 * Profili kapatır ve rızayı geri çeker.
 *
 * Public sayfa `enabled` kontrolü yaptığı için bilgiler ANINDA kapanır.
 * Onay alanları temizlenir; yeniden etkinleştirmede YENİ açık rıza gerekir.
 */
export async function rizayiGeriCek(girdi: {
  itemRecordId: string;
  userId: string;
}) {
  await kaydiDogrula(girdi.itemRecordId, girdi.userId);

  const simdi = new Date();

  await prisma.emergencyProfile.updateMany({
    where: { itemRecordId: girdi.itemRecordId, userId: girdi.userId },
    data: {
      enabled: false,
      disabledAt: simdi,
      consentWithdrawnAt: simdi,
      explicitConsentAt: null,
      explicitConsentVersion: null,
      disclaimerAcceptedAt: null,
      emergencyContactDeclarationAcceptedAt: null,
    },
  });
}

/** Profili ve bağlı yakınları tamamen siler (Cascade). */
export async function profiliSil(girdi: {
  itemRecordId: string;
  userId: string;
}) {
  await kaydiDogrula(girdi.itemRecordId, girdi.userId);

  await prisma.emergencyProfile.deleteMany({
    where: { itemRecordId: girdi.itemRecordId, userId: girdi.userId },
  });
}

/** Sahibinin yönetim ekranı için profil (çözülmüş metinlerle). */
export async function sahibiIcinProfil(girdi: {
  itemRecordId: string;
  userId: string;
}) {
  const profil = await prisma.emergencyProfile.findFirst({
    where: { itemRecordId: girdi.itemRecordId, userId: girdi.userId },
    include: { contacts: { orderBy: { priority: "asc" } } },
  });

  if (!profil) {
    return null;
  }

  return {
    enabled: profil.enabled,
    displayName: coz(profil.displayName),
    bloodType: gecerliKanGrubu(coz(profil.bloodType)),
    allergies: coz(profil.allergies),
    medications: coz(profil.medications),
    medicalConditions: coz(profil.medicalConditions),
    emergencyNote: coz(profil.emergencyNote),
    displayNameGorunur: profil.displayNameGorunur,
    bloodTypeGorunur: profil.bloodTypeGorunur,
    allergiesGorunur: profil.allergiesGorunur,
    medicationsGorunur: profil.medicationsGorunur,
    medicalConditionsGorunur: profil.medicalConditionsGorunur,
    emergencyNoteGorunur: profil.emergencyNoteGorunur,
    contactsGorunur: profil.contactsGorunur,
    explicitConsentAt: profil.explicitConsentAt,
    explicitConsentVersion: profil.explicitConsentVersion,
    kisiler: profil.contacts.map((k) => ({
      name: coz(k.name),
      relationship: k.relationship,
      phone: coz(k.phone),
      priority: k.priority,
    })),
  };
}

/** Public sayfada gösterilecek, tamamen çözülmüş ve filtrelenmiş görünüm. */
export type AcilDurumGorunumu = {
  displayName: string | null;
  bloodType: KanGrubuDegeri | null;
  allergies: string | null;
  medications: string | null;
  medicalConditions: string | null;
  emergencyNote: string | null;
  kisiler: { name: string; relationship: string | null; phone: string }[];
};

/**
 * QR okutan kişiye gösterilecek acil durum bilgisi.
 *
 * GİZLİLİK SÖZLEŞMESİ — bu fonksiyon ASLA şunları döndürmez:
 * sahibin e-postası, açık adresi, hesap kimliği, veritabanı ID'leri,
 * görünür yapılmamış alanlar, onay/rıza kayıtları, şifreli ham veri.
 *
 * Bir alan yalnızca ŞU KOŞULLAR BİRLİKTE sağlanırsa döner:
 *   1. Profil etkin (`enabled`),
 *   2. Rıza geri çekilmemiş (`consentWithdrawnAt` boş),
 *   3. Kayıtlı rıza sürümü yürürlükteki `ONAY_METNI_SURUMU` ile TAM EŞİT,
 *   4. Etiket AKTİF durumda (pasif, iptal veya etkinleştirilmemiş değil),
 *   5. Profil, kaydın GÜNCEL sahibine ait,
 *   6. O alan için görünürlük açık.
 *
 * 4 ve 5 numaralı koşullar çağıran sayfada da kontrol ediliyor olsa bile
 * BURADA TEKRAR doğrulanır: bu fonksiyon ileride başka bir yerden çağrılırsa
 * güvenlik çağıranın dikkatine bağlı kalmamalıdır.
 *
 * Şifre çözülemezse (anahtar yok/yanlış) alan sessizce gizlenir — güvenli
 * varsayılan gösterilmemektir.
 *
 * Gösterilecek hiçbir bilgi kalmazsa `null` döner; sayfa bölümü hiç çizilmez.
 */
export async function acilDurumGorunumu(
  itemRecordId: string
): Promise<AcilDurumGorunumu | null> {
  const profil = await prisma.emergencyProfile.findFirst({
    where: {
      itemRecordId,
      enabled: true,
      consentWithdrawnAt: null,
      // MADDE 1: eski veya eksik sürümlü rıza public alanda geçersizdir.
      explicitConsentVersion: ONAY_METNI_SURUMU,
      // MADDE 4: etiket aktif değilse bilgi gösterilmez.
      itemRecord: { tag: { is: { status: "active" } } },
    },
    select: {
      // Sahiplik tutarlılığı kontrolü için okunur; ASLA döndürülmez.
      userId: true,
      itemRecord: { select: { userId: true } },
      displayName: true,
      bloodType: true,
      allergies: true,
      medications: true,
      medicalConditions: true,
      emergencyNote: true,
      displayNameGorunur: true,
      bloodTypeGorunur: true,
      allergiesGorunur: true,
      medicationsGorunur: true,
      medicalConditionsGorunur: true,
      emergencyNoteGorunur: true,
      contactsGorunur: true,
      contacts: {
        where: { enabled: true },
        orderBy: { priority: "asc" },
        take: SINIRLAR.enFazlaKisi,
        select: { name: true, relationship: true, phone: true },
      },
    },
  });

  if (!profil) {
    return null;
  }

  // MADDE 4: profil kaydın GÜNCEL sahibine ait olmalı. Sahiplik devri
  // profili zaten temizler; bu kontrol o akış bozulsa bile eski sahibin
  // verisinin yeni sahibin etiketinde görünmesini engeller.
  if (!profil.itemRecord || profil.userId !== profil.itemRecord.userId) {
    return null;
  }

  const gorunur = (acik: boolean, deger: string | null) =>
    acik ? coz(deger) : null;

  const kisiler = profil.contactsGorunur
    ? profil.contacts
        .map((k) => ({
          name: coz(k.name),
          relationship: k.relationship,
          phone: coz(k.phone),
        }))
        .filter(
          (k): k is { name: string; relationship: string | null; phone: string } =>
            Boolean(k.name && k.phone)
        )
    : [];

  const gorunum: AcilDurumGorunumu = {
    displayName: gorunur(profil.displayNameGorunur, profil.displayName),
    // Kan grubu da şifreli saklanır; çözülemezse veya geçersizse gösterilmez.
    bloodType: profil.bloodTypeGorunur
      ? gecerliKanGrubu(coz(profil.bloodType))
      : null,
    allergies: gorunur(profil.allergiesGorunur, profil.allergies),
    medications: gorunur(profil.medicationsGorunur, profil.medications),
    medicalConditions: gorunur(
      profil.medicalConditionsGorunur,
      profil.medicalConditions
    ),
    emergencyNote: gorunur(profil.emergencyNoteGorunur, profil.emergencyNote),
    kisiler,
  };

  const bilgiVar =
    Boolean(
      gorunum.displayName ||
        gorunum.bloodType ||
        gorunum.allergies ||
        gorunum.medications ||
        gorunum.medicalConditions ||
        gorunum.emergencyNote
    ) || gorunum.kisiler.length > 0;

  return bilgiVar ? gorunum : null;
}
