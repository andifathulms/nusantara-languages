/**
 * Indonesian first, English second — the audience is Indonesian and the copy reads as
 * Indonesian rather than as a translation of English.
 *
 * Family names stay in their standard scholarly form in both locales: "Austronesia" is
 * not translated to something friendlier, because the whole point is that the reader can
 * take the name away and look it up.
 */

export const LOCALES = ['id', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'id'

export function isLocale(value: string): value is Locale {
  return LOCALES.some((locale) => locale === value)
}

export type Dictionary = {
  readonly localeName: string
  readonly siteTitle: string
  readonly siteTagline: string
  readonly siteDescription: string
  readonly nav: {
    readonly plate: string
    readonly guided: string
    readonly method: string
    readonly home: string
  }
  readonly home: {
    readonly lead: string
    readonly openPlate: string
    readonly whatThisIs: string
    readonly whatThisIsNot: string
    readonly personalProject: string
  }
  readonly plate: {
    readonly title: string
    readonly period: (fromYear: number, toYear: number) => string
    readonly periodCaveat: string
    readonly legend: string
    readonly families: string
    readonly coverage: (withPolygon: number, total: number, percent: number) => string
    readonly pointNote: string
    readonly gradientNote: string
    readonly sea: string
    readonly hint: string
    readonly clearSelection: string
    readonly selectedFamily: string
    readonly languagesInFamily: (count: number) => string
    readonly index: string
    readonly attribution: string
  }
  readonly tree: {
    readonly title: string
    readonly subtitle: string
    readonly expand: string
    readonly collapse: string
    readonly isolate: string
    readonly languages: (count: number) => string
    readonly showAncestry: string
  }
  readonly panel: {
    readonly glottocode: string
    readonly isoCode: string
    readonly family: string
    readonly classification: string
    readonly endangerment: string
    readonly coordinates: string
    readonly geometry: string
    readonly hasPolygon: (source: string) => string
    readonly pointOnly: string
    readonly altNames: string
    readonly noAltNames: string
    readonly noSpeakerCount: string
    readonly sources: string
    readonly openLanguage: string
    readonly close: string
  }
  readonly aes: Readonly<Record<string, string>>
  readonly method: {
    readonly title: string
    readonly lead: string
    readonly sources: string
    readonly refused: string
    readonly coverage: string
    readonly excluded: string
    readonly notClaimed: string
    readonly claims: readonly string[]
    readonly licence: string
    readonly bundled: string
    readonly period: string
    readonly nameProviders: string
  }
  readonly guided: {
    readonly title: string
    readonly lead: string
    readonly seam: { readonly title: string; readonly body: string }
    readonly isolates: { readonly title: string; readonly body: string }
    readonly endangered: { readonly title: string; readonly body: string }
    readonly open: string
  }
  readonly search: {
    readonly label: string
    readonly placeholder: string
    readonly noResults: string
    readonly resultCount: (count: number) => string
  }
  readonly export: {
    readonly png: string
    readonly copyLink: string
    readonly copied: string
  }
}

const id: Dictionary = {
  localeName: 'Bahasa Indonesia',
  siteTitle: 'Bahasa-Bahasa Nusantara',
  siteTagline: 'Peta rumpun bahasa Indonesia, bertaut dengan pohon kekerabatannya',
  siteDescription:
    'Peta wilayah bahasa di Indonesia, diwarnai menurut rumpun, dengan pohon klasifikasi genealogis di sampingnya dan keduanya saling bertaut. Data Glottolog dan Glottography.',
  nav: {
    plate: 'Peta',
    guided: 'Panduan',
    method: 'Metode',
    home: 'Depan',
  },
  home: {
    lead: 'Sorot satu cabang pada pohon kekerabatan, dan seluruh wilayah rumpun itu menyala di peta. Klik satu wilayah, dan pohon bergulir ke bahasa itu lalu membuka garis keturunannya dari rumpun induk ke bawah.',
    openPlate: 'Buka peta',
    whatThisIs:
      'Indonesia adalah salah satu wilayah dengan kepadatan bahasa tertinggi di dunia. Peta ini menunjukkan struktur itu: warna membawa rumpun, sehingga batas antara rumpun Austronesia dan rumpun-rumpun Papua terlihat begitu peta terbuka.',
    whatThisIsNot:
      'Peta ini bukan sensus penutur hari ini, bukan produk resmi pemerintah, dan tidak memakai data Ethnologue dalam bentuk apa pun.',
    personalProject:
      'Proyek pribadi, sumber terbuka, untuk keperluan pendidikan. Bukan “Peta Bahasa” milik Badan Bahasa dan tidak berafiliasi dengan lembaga mana pun.',
  },
  plate: {
    title: 'Peta rumpun bahasa',
    period: (fromYear, toYear) =>
      `Sebaran wilayah menurut sumber atlas ${fromYear}–${toYear}`,
    periodCaveat:
      'Peta ini menunjukkan sebaran menurut sumber atlas tersebut, bukan sensus penutur hari ini.',
    legend: 'Keterangan',
    families: 'Rumpun',
    coverage: (withPolygon, total, percent) =>
      `${withPolygon} dari ${total} bahasa memiliki wilayah (${percent}%); sisanya hanya titik.`,
    pointNote:
      'Titik adalah titik. Koordinat Glottolog sering merupakan titik tengah populasi yang tersebar, jadi bahasa tanpa poligon digambarkan sebagai tanda titik dan tidak pernah dimekarkan menjadi wilayah.',
    gradientNote:
      'Batas antarbahasa pada kenyataannya berupa gradien, bukan garis. Garis batas digambar setipis mungkin untuk mengingatkan hal itu.',
    sea: 'Laut',
    hint: 'Sorot rumpun pada pohon di sebelah kanan, atau klik wilayah pada peta.',
    clearSelection: 'Hapus pilihan',
    selectedFamily: 'Rumpun terpilih',
    languagesInFamily: (count) => `${count} bahasa`,
    index: 'Indeks',
    attribution: 'Sumber: Glottolog 5.3 (CC-BY-4.0) dan Glottography (CC-BY-4.0).',
  },
  tree: {
    title: 'Pohon kekerabatan',
    subtitle: 'Klasifikasi Glottolog, tingkat bahasa',
    expand: 'Buka',
    collapse: 'Tutup',
    isolate: 'bahasa isolat',
    languages: (count) => `${count} bahasa`,
    showAncestry: 'Tampilkan garis keturunan',
  },
  panel: {
    glottocode: 'Glottocode',
    isoCode: 'Kode ISO 639-3',
    family: 'Rumpun',
    classification: 'Klasifikasi',
    endangerment: 'Status kebertahanan',
    coordinates: 'Koordinat',
    geometry: 'Wilayah',
    hasPolygon: (source) => `Ada poligon wilayah, dari ${source}`,
    pointOnly: 'Tidak ada poligon — digambarkan sebagai titik',
    altNames: 'Nama lain',
    noAltNames: 'Tidak ada nama lain pada sumber yang dipakai',
    noSpeakerCount:
      'Jumlah penutur tidak dicantumkan. Glottolog tidak memuat angka yang tepercaya, dan sumber berbayar tidak dipakai. Angka yang tidak bersumber lebih buruk daripada angka yang tidak ada.',
    sources: 'Sumber',
    openLanguage: 'Buka halaman bahasa',
    close: 'Tutup',
  },
  aes: {
    'not endangered': 'tidak terancam',
    threatened: 'terancam',
    shifting: 'mulai ditinggalkan',
    moribund: 'hampir punah',
    'nearly extinct': 'nyaris punah',
    extinct: 'punah',
    unknown: 'tidak diketahui',
  },
  method: {
    title: 'Metode, sumber, dan yang tidak diklaim peta ini',
    lead: 'Setiap angka pada halaman ini dihasilkan oleh pipeline dari kumpulan data yang dikirim, bukan ditulis tangan.',
    sources: 'Sumber yang dipakai',
    refused: 'Sumber yang ditolak',
    coverage: 'Cakupan',
    excluded: 'Yang dikeluarkan dari kumpulan data',
    notClaimed: 'Yang tidak diklaim peta ini',
    claims: [
      'Peta ini bukan sensus. Sumber poligon menggambarkan di mana bahasa didokumentasikan, bukan siapa yang berbicara apa hari ini.',
      'Titik adalah titik tengah, bukan lokasi. Bahasa tanpa poligon tidak pernah dimekarkan menjadi wilayah, tanpa convex hull dan tanpa Voronoi.',
      'Batas antarbahasa berupa gradien. Rangkaian dialek adalah hal yang biasa, bukan pengecualian, dan tepi poligon yang tegas melebih-lebihkan ketegasan itu.',
      'Jumlah penutur tidak dicantumkan sama sekali. Ethnologue tidak dipakai dalam bidang apa pun, dan hal itu diuji secara otomatis.',
      'Hanya tingkat bahasa. Dialek Glottolog tidak dipetakan pada versi ini.',
    ],
    licence: 'Lisensi',
    bundled: 'Disertakan',
    period: 'Periode',
    nameProviders: 'Penyedia nama lain',
  },
  guided: {
    title: 'Panduan',
    lead: 'Beberapa jalan masuk singkat ke dalam data.',
    seam: {
      title: 'Jahitan Austronesia–Papua',
      body: 'Rumpun Austronesia menyapu kepulauan dari barat ke timur; rumpun-rumpun Papua duduk di timur. Jahitan di antara keduanya melintasi Halmahera dan terlihat langsung pada peta.',
    },
    isolates: {
      title: 'Bahasa isolat',
      body: 'Bahasa yang tidak diketahui berkerabat dengan bahasa mana pun. Jarang, dan menarik justru karena tidak punya kerabat.',
    },
    endangered: {
      title: 'Paling terancam',
      body: 'Disaring ke kategori yang paling dekat dengan kepunahan menurut status AES Glottolog.',
    },
    open: 'Buka tampilan ini',
  },
  search: {
    label: 'Cari bahasa',
    placeholder: 'Nama, nama lain, glottocode, atau kode ISO',
    noResults: 'Tidak ada yang cocok.',
    resultCount: (count) => `${count} hasil`,
  },
  export: {
    png: 'Unduh PNG',
    copyLink: 'Salin tautan tampilan ini',
    copied: 'Tautan disalin',
  },
}

const en: Dictionary = {
  localeName: 'English',
  siteTitle: 'Nusantara Languages',
  siteTagline: 'A family-coloured language map of Indonesia, bound to its genealogical tree',
  siteDescription:
    'Speaker areas of Indonesia coloured by language family, with the Glottolog classification rendered beside the map and bound to it. Data from Glottolog and Glottography.',
  nav: {
    plate: 'Map',
    guided: 'Guided views',
    method: 'Method',
    home: 'Home',
  },
  home: {
    lead: 'Hover a branch of the family tree and every territory in that subgroup lights up. Click a territory and the tree scrolls to that language and opens its ancestry from the root family down.',
    openPlate: 'Open the map',
    whatThisIs:
      'Indonesia is one of the most linguistically dense territories on earth. This map shows that structure: colour carries family, so the boundary between Austronesian and the Papuan families is visible the moment the map opens.',
    whatThisIsNot:
      'This is not a census of speakers today, not an official government product, and it uses no Ethnologue data in any field.',
    personalProject:
      'A personal, open-source, educational project. Not Badan Bahasa’s “Peta Bahasa”, and not affiliated with any institution.',
  },
  plate: {
    title: 'Language families',
    period: (fromYear, toYear) => `Distribution as described by atlas sources, ${fromYear}–${toYear}`,
    periodCaveat:
      'This map shows the distribution described by those atlas sources, not a census of who speaks what today.',
    legend: 'Legend',
    families: 'Families',
    coverage: (withPolygon, total, percent) =>
      `${withPolygon} of ${total} languages have a territory (${percent}%); the rest are points only.`,
    pointNote:
      'A point stays a point. Glottolog’s coordinate is frequently the midpoint of a dispersed population, so a language without a polygon is drawn as a mark and is never inflated into a territory.',
    gradientNote:
      'Language boundaries are gradients rather than lines. Boundaries are drawn as hairlines to keep that in view.',
    sea: 'Sea',
    hint: 'Hover a family in the tree at right, or click a territory on the map.',
    clearSelection: 'Clear selection',
    selectedFamily: 'Selected family',
    languagesInFamily: (count) => `${count} languages`,
    index: 'Index',
    attribution: 'Sources: Glottolog 5.3 (CC-BY-4.0) and Glottography (CC-BY-4.0).',
  },
  tree: {
    title: 'Genealogical tree',
    subtitle: 'Glottolog classification, language level',
    expand: 'Expand',
    collapse: 'Collapse',
    isolate: 'isolate',
    languages: (count) => `${count} languages`,
    showAncestry: 'Show ancestry',
  },
  panel: {
    glottocode: 'Glottocode',
    isoCode: 'ISO 639-3',
    family: 'Family',
    classification: 'Classification',
    endangerment: 'Endangerment status',
    coordinates: 'Coordinates',
    geometry: 'Territory',
    hasPolygon: (source) => `Polygon present, from ${source}`,
    pointOnly: 'No polygon — drawn as a point',
    altNames: 'Alternate names',
    noAltNames: 'No alternate names in the sources used',
    noSpeakerCount:
      'No speaker count is given. Glottolog carries no reliable figures and proprietary sources are not used. An unsourced number is worse than an absent one.',
    sources: 'Sources',
    openLanguage: 'Open the language page',
    close: 'Close',
  },
  aes: {
    'not endangered': 'not endangered',
    threatened: 'threatened',
    shifting: 'shifting',
    moribund: 'moribund',
    'nearly extinct': 'nearly extinct',
    extinct: 'extinct',
    unknown: 'unknown',
  },
  method: {
    title: 'Method, sources, and what this map does not claim',
    lead: 'Every figure on this page is generated by the pipeline from the bundle that ships, not written by hand.',
    sources: 'Sources used',
    refused: 'Sources refused',
    coverage: 'Coverage',
    excluded: 'Excluded from the bundle',
    notClaimed: 'What this map does not claim',
    claims: [
      'It is not a census. The polygon sources describe where languages were documented, not who speaks what today.',
      'Points are midpoints, not locations. A language without a polygon is never inflated into a territory — no convex hulls, no Voronoi.',
      'Language boundaries are gradients. Dialect continua are the norm, and a crisp polygon edge overstates the sharpness.',
      'No speaker counts at all. Ethnologue is not used in any field, and a test asserts it.',
      'Language level only. Glottolog dialects are not mapped in this version.',
    ],
    licence: 'Licence',
    bundled: 'Bundled',
    period: 'Period',
    nameProviders: 'Alternate-name providers',
  },
  guided: {
    title: 'Guided views',
    lead: 'A few short ways into the data.',
    seam: {
      title: 'The Austronesian–Papuan seam',
      body: 'Austronesian sweeps west to east across the archipelago; the Papuan families sit in the east. The seam between them runs through Halmahera and is visible on the map.',
    },
    isolates: {
      title: 'Isolates',
      body: 'Languages with no known relatives. Rare, and interesting precisely because they have none.',
    },
    endangered: {
      title: 'Most endangered',
      body: 'Filtered to the categories nearest extinction according to Glottolog’s AES.',
    },
    open: 'Open this view',
  },
  search: {
    label: 'Search languages',
    placeholder: 'Name, alternate name, glottocode, or ISO code',
    noResults: 'Nothing matches.',
    resultCount: (count) => `${count} results`,
  },
  export: {
    png: 'Download PNG',
    copyLink: 'Copy a link to this view',
    copied: 'Link copied',
  },
}

const DICTIONARIES: Readonly<Record<Locale, Dictionary>> = { id, en }

export function dictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

/** Locale-prefixed href, with the deployment's basePath left to Next to add. */
export function localePath(locale: Locale, path = ''): string {
  const trimmed = path.replace(/^\/+/, '')
  return trimmed === '' ? `/${locale}` : `/${locale}/${trimmed}`
}
