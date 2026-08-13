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
    /** The no-script fallback on the root redirect page. */
    readonly enter: string
    readonly whatThisIs: string
    readonly whatThisIsNot: string
    readonly personalProject: string
  }
  readonly plate: {
    readonly title: string
    /** Template. Placeholders: {fromYear}, {toYear}. */
    readonly period: string
    /**
     * The same two facts as `period` + `periodCaveat`, in one line, for the plate header where
     * the map has to be reachable without scrolling. Invariant 6 is discharged by this.
     * Template. Placeholders: {fromYear}, {toYear}.
     */
    readonly periodShort: string
    readonly periodCaveat: string
    readonly legend: string
    readonly families: string
    /** Template. Placeholders: {withPolygon}, {total}, {percent}. */
    readonly coverage: string
    readonly pointNote: string
    readonly gradientNote: string
    readonly clearSelection: string
    readonly selectedFamily: string
    /** Empty state for the selection line, which is a live region and must say something. */
    readonly noSelection: string
    /**
     * How far apart the two furthest recorded points in the selected branch are. The one figure
     * that makes "family" comparable — Austronesian spans 5,010 km here, Timor-Alor-Pantar 350.
     * Template. Placeholder: {km}.
     */
    readonly extent: string
    readonly extentNote: string
    readonly index: string
    readonly attribution: string
    /** Legend for the tree column's per-language mark. */
    readonly geometryArea: string
    readonly geometryPoint: string
    readonly hatchingToggle: string
    /** Template. Placeholder: {total}. */
    readonly hatchingNote: string
    readonly colourBy: string
    readonly colourByFamily: string
    readonly colourBySubgroup: string
    readonly subgroupNote: string
    /** Template. Placeholder: {family}. */
    readonly subgroupOf: string
    readonly zoomIn: string
    readonly zoomOut: string
    readonly zoomReset: string
    readonly fullscreen: string
    readonly fullscreenExit: string
    readonly panHint: string
  }
  /**
   * The layer that makes the map legible to someone who has never heard of a language family.
   * Every string here is written for that reader, not for a linguist.
   */
  readonly guide: {
    /** Template. Placeholder: {total}. */
    readonly leadPlain: string
    readonly linkage: string
    readonly title: string
    readonly colour: string
    readonly colourNote: string
    readonly point: string
    readonly pointNote: string
    readonly hatch: string
    readonly hatchNote: string
    readonly land: string
    readonly landNote: string
    readonly tryThis: string
    readonly tryAustronesian: string
    readonly trySeam: string
    readonly tryIsolates: string
    readonly tabMap: string
    readonly tabTree: string
    readonly whatIsFamily: string
    readonly whatIsFamilyBody: string
  }
  readonly tree: {
    readonly title: string
    readonly subtitle: string
    readonly expand: string
    readonly collapse: string
    readonly isolate: string
    /** Template. Placeholder: {count}. */
    readonly languages: string
  }
  readonly panel: {
    readonly glottocode: string
    readonly isoCode: string
    readonly family: string
    readonly classification: string
    readonly endangerment: string
    readonly coordinates: string
    readonly geometry: string
    /** Template. Placeholder: {source}. */
    readonly hasPolygon: string
    readonly pointOnly: string
    readonly altNames: string
    readonly noAltNames: string
    readonly noSpeakerCount: string
    readonly sources: string
    readonly openLanguage: string
    readonly close: string
  }
  /**
   * The nearest-relative readout. Every string here carries a limit as well as a fact, because
   * the answer is only true within the frame: among the languages mapped here, between recorded
   * points, and unranked because the classification carries no branch lengths.
   */
  readonly relatives: {
    readonly title: string
    readonly sharedAncestor: string
    /** Template. Placeholder: {count}. */
    readonly count: string
    readonly unranked: string
    readonly closest: string
    /** Template. Placeholder: {km}. */
    readonly distance: string
    readonly distanceCaveat: string
    /** Template. Placeholder: {total}. */
    readonly scopeCaveat: string
    readonly isolate: string
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
    readonly backToViews: string
    /** Template. Placeholder: {count}. */
    readonly emphasised: string
    readonly stillClickable: string
    /**
     * The seam, enumerated. Every string carries the limit with the fact: a threshold the
     * reader can see, and the reminder that only languages with a polygon can appear.
     */
    readonly seamContacts: {
      readonly title: string
      /** Template. Placeholders: {count}, {languages}, {families}. */
      readonly lead: string
      /** Template. Placeholder: {km}. */
      readonly threshold: string
      /** Template. Placeholder: {pointOnly}. */
      readonly floor: string
      readonly touching: string
      /** Template. Placeholder: {km}. */
      readonly within: string
      readonly columnFamily: string
      readonly columnAustronesian: string
      readonly columnDistance: string
    }
  }
  readonly search: {
    readonly label: string
    readonly placeholder: string
    readonly noResults: string
    /** Template. Placeholder: {count}. */
    readonly resultCount: string
  }
  readonly export: {
    readonly png: string
    readonly copyLink: string
    readonly copied: string
    readonly failed: string
  }
  readonly a11y: {
    readonly skipToContent: string
    /** Names what the control does. Not the current language — that is its value, not its job. */
    readonly chooseLanguage: string
    readonly siteNav: string
    /** Template. Placeholders: {name}, {count}. */
    readonly announceBranch: string
    /** Template. Placeholder: {name}. */
    readonly announceLanguage: string
    readonly announceCleared: string
  }
}

const id: Dictionary = {
  localeName: 'Bahasa Indonesia',
  siteTitle: 'Nusantara Languages',
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
    enter: 'Masuk ke situs',
    whatThisIs:
      'Indonesia adalah salah satu wilayah dengan kepadatan bahasa tertinggi di dunia. Peta ini menunjukkan struktur itu: warna membawa rumpun, sehingga batas antara rumpun Austronesia dan rumpun-rumpun Papua terlihat begitu peta terbuka.',
    whatThisIsNot:
      'Peta ini bukan sensus penutur hari ini, bukan produk resmi pemerintah, dan tidak memakai data Ethnologue dalam bentuk apa pun.',
    personalProject:
      'Proyek pribadi, sumber terbuka, untuk keperluan pendidikan. Bukan “Peta Bahasa” milik Badan Bahasa dan tidak berafiliasi dengan lembaga mana pun.',
  },
  plate: {
    title: 'Peta rumpun bahasa',
    period: 'Sebaran wilayah menurut sumber atlas {fromYear}–{toYear}',
    periodShort:
      'Sebaran menurut sumber atlas {fromYear}–{toYear}, bukan sensus penutur hari ini.',
    periodCaveat:
      'Peta ini menunjukkan sebaran menurut sumber atlas tersebut, bukan sensus penutur hari ini.',
    legend: 'Keterangan',
    families: 'Rumpun',
    coverage:
      '{withPolygon} dari {total} bahasa memiliki wilayah ({percent}%); sisanya hanya titik.',
    pointNote:
      'Titik adalah titik. Koordinat Glottolog sering merupakan titik tengah populasi yang tersebar, jadi bahasa tanpa poligon digambarkan sebagai tanda titik dan tidak pernah dimekarkan menjadi wilayah.',
    gradientNote:
      'Batas antarbahasa pada kenyataannya berupa gradien, bukan garis. Garis batas digambar setipis mungkin untuk mengingatkan hal itu.',
    clearSelection: 'Hapus pilihan',
    selectedFamily: 'Rumpun terpilih',
    noSelection: 'Belum ada rumpun terpilih.',
    extent: 'membentang {km} km',
    extentNote:
      'Membentang = jarak antara dua titik tercatat yang paling berjauhan dalam cabang ini. Diukur antara titik tengah, sehingga angkanya batas bawah, bukan rentang wilayah sebenarnya.',
    index: 'Indeks',
    attribution:
      'Sumber: Glottolog 5.3 (CC-BY-4.0), Glottography (CC-BY-4.0), Natural Earth (domain publik).',
    geometryArea: 'punya wilayah',
    geometryPoint: 'hanya titik',
    colourBy: 'Warna menurut',
    colourByFamily: 'Rumpun',
    colourBySubgroup: 'Subrumpun',
    subgroupNote:
      'Dua pertiga bahasa di peta ini termasuk rumpun Austronesia, sehingga pada tampilan rumpun sebagian besar wilayah barat hanya satu warna. Tampilan subrumpun memecahnya pada percabangan nyata pertama. Di sini warna dipakai untuk membedakan tetangga, bukan untuk menamai kelompok — warna yang sama bisa muncul lagi di ujung lain kepulauan. Nama kelompok ada pada keterangan dan muncul saat disorot.',
    subgroupOf: 'dalam {family}',
    zoomIn: 'Perbesar',
    zoomOut: 'Perkecil',
    zoomReset: 'Kembali ke tampilan penuh',
    fullscreen: 'Layar penuh',
    fullscreenExit: 'Keluar dari layar penuh',
    panHint: 'Seret untuk menggeser · gulir sambil menekan Ctrl untuk memperbesar',
    hatchingToggle: 'tampilkan arsir',
    hatchingNote:
      'Kebertahanan digambarkan sebagai kerapatan arsir di atas warna rumpun, bukan sebagai warna tersendiri: warna sudah dipakai untuk rumpun, sehingga kedua lapisan dapat dibaca bersamaan. Status mengikuti AES Glottolog untuk {total} bahasa.',
  },
  guide: {
    leadPlain:
      '{total} bahasa daerah di Indonesia, diwarnai menurut rumpun keluarganya — bahasa-bahasa yang berasal dari satu nenek moyang yang sama.',
    linkage:
      'Arahkan kursor ke satu cabang pada pohon kekerabatan: seluruh wilayah rumpun itu menyala di peta. Klik satu wilayah, dan pohon membuka garis keturunan bahasa tersebut.',
    title: 'Cara membaca peta ini',
    colour: 'Warna menandai rumpun',
    colourNote:
      'Satu warna, satu rumpun. Warna tetap redup sampai Anda memilih satu rumpun — yang terpilih menjadi satu-satunya warna pekat di peta.',
    point: 'Lingkaran berarti titik, bukan wilayah',
    pointNote:
      'Untuk bahasa yang tidak punya data wilayah, yang digambar hanyalah satu titik perkiraan. Titik tidak pernah dimekarkan menjadi wilayah.',
    hatch: 'Arsir menandai kebertahanan',
    hatchNote:
      'Semakin rapat arsirnya, semakin dekat bahasa itu pada kepunahan. Arsir dipakai agar warna tetap bisa membawa rumpun.',
    land: 'Kelabu berarti belum ada data',
    landNote:
      'Daratan yang tidak tertutup warna adalah wilayah yang tidak tercakup sumber poligon yang dipakai. Garis pantainya diketahui, sebaran bahasanya tidak tercatat — jadi bagian itu kelabu dan tidak dapat diklik.',
    tryThis: 'Coba',
    tryAustronesian: 'Rumpun Austronesia',
    trySeam: 'Jahitan Austronesia–Papua',
    tryIsolates: 'Bahasa isolat',
    tabMap: 'Peta',
    tabTree: 'Pohon',
    whatIsFamily: 'Apa itu rumpun bahasa?',
    whatIsFamilyBody:
      'Rumpun bahasa adalah sekelompok bahasa yang terbukti berkembang dari satu bahasa purba yang sama — seperti keluarga yang punya nenek moyang bersama. Bahasa Jawa, Bali, Tagalog, dan Maori, misalnya, semuanya termasuk rumpun Austronesia. Pohon di halaman ini adalah silsilah itu.',
  },
  tree: {
    title: 'Pohon kekerabatan',
    subtitle: 'Klasifikasi Glottolog, tingkat bahasa',
    expand: 'Buka',
    collapse: 'Tutup',
    isolate: 'bahasa isolat',
    languages: '{count} bahasa',
  },
  panel: {
    glottocode: 'Glottocode',
    isoCode: 'Kode ISO 639-3',
    family: 'Rumpun',
    classification: 'Klasifikasi',
    endangerment: 'Status kebertahanan',
    coordinates: 'Koordinat',
    geometry: 'Wilayah',
    hasPolygon: 'Ada poligon wilayah, dari {source}',
    pointOnly: 'Tidak ada poligon — digambarkan sebagai titik',
    altNames: 'Nama lain',
    noAltNames: 'Tidak ada nama lain pada sumber yang dipakai',
    noSpeakerCount:
      'Jumlah penutur tidak dicantumkan. Glottolog tidak memuat angka yang tepercaya, dan sumber berbayar tidak dipakai. Angka yang tidak bersumber lebih buruk daripada angka yang tidak ada.',
    sources: 'Sumber',
    openLanguage: 'Buka halaman bahasa',
    close: 'Tutup',
  },
  relatives: {
    title: 'Kerabat terdekat',
    sharedAncestor: 'Leluhur bersama terdekat',
    count: '{count} bahasa lain di peta ini',
    unranked:
      'Semuanya sama dekatnya. Klasifikasi Glottolog berupa susunan bersarang tanpa panjang cabang, jadi daftar ini tidak dapat diurutkan menurut kedekatan kekerabatan.',
    closest: 'Titik tercatat paling dekat',
    distance: '{km} km',
    distanceCaveat:
      'Jarak diukur antara titik yang tercatat, bukan antara wilayah tutur. Koordinat Glottolog sering merupakan titik tengah populasi yang tersebar, jadi angka ini adalah perkiraan besaran, bukan hasil ukur.',
    scopeCaveat:
      'Dihitung hanya di antara {total} bahasa yang dipetakan di sini. Bahasa yang rumpunnya sebagian besar berada di luar Indonesia dapat memiliki kerabat yang lebih dekat di luar peta ini.',
    isolate:
      'Isolat: tidak ada kerabat yang diketahui di antara bahasa yang dipetakan di sini.',
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
    backToViews: 'Semua panduan',
    emphasised: '{count} bahasa disorot pada tampilan ini',
    stillClickable:
      'Tampilan ini hanya menentukan apa yang menyala lebih dahulu. Semua bahasa tetap digambar dan tetap dapat diklik — menyembunyikan sisanya berarti mengklaim sesuatu tentang apa yang ada di sana.',
    seamContacts: {
      title: 'Jahitan ini bukan sebuah garis',
      lead: 'Ada {count} pasang wilayah yang benar-benar bersentuhan di sini: {languages} bahasa dari {families} rumpun berbeda. Warna membuat batas itu tampak seperti satu garis panjang; daftar ini menunjukkan bahwa di Halmahera dan sekitar Kepala Burung keduanya justru saling bersisipan.',
      threshold: 'Dua wilayah dihitung bersentuhan bila jaraknya kurang dari {km} km pada geometri yang sudah disederhanakan (toleransi 0,01°, kira-kira 1,1 km).',
      floor: 'Angka ini batas bawah, bukan sensus. Hanya bahasa yang punya wilayah terekam yang dapat muncul di sini, sedangkan {pointOnly} bahasa di peta ini hanya berupa titik — sebuah bahasa bisa saja duduk tepat di jahitan dan tidak pernah masuk daftar.',
      touching: 'bersentuhan',
      within: '{km} km',
      columnFamily: 'Rumpun Papua',
      columnAustronesian: 'Bersentuhan dengan',
      columnDistance: 'Jarak',
    },
  },
  search: {
    label: 'Cari bahasa',
    placeholder: 'Nama, nama lain, glottocode, atau kode ISO',
    noResults: 'Tidak ada yang cocok.',
    resultCount: '{count} hasil',
  },
  export: {
    png: 'Unduh PNG',
    copyLink: 'Salin tautan tampilan ini',
    copied: 'Tautan disalin',
    failed: 'Gagal. Coba lagi atau gunakan tangkapan layar.',
  },
  a11y: {
    skipToContent: 'Lewati ke konten utama',
    chooseLanguage: 'Pilih bahasa tampilan',
    siteNav: 'Navigasi utama',
    announceBranch: '{name} dipilih, {count} bahasa disorot',
    announceLanguage: '{name} dipilih',
    announceCleared: 'Pilihan dihapus',
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
    enter: 'Enter the site',
    whatThisIs:
      'Indonesia is one of the most linguistically dense territories on earth. This map shows that structure: colour carries family, so the boundary between Austronesian and the Papuan families is visible the moment the map opens.',
    whatThisIsNot:
      'This is not a census of speakers today, not an official government product, and it uses no Ethnologue data in any field.',
    personalProject:
      'A personal, open-source, educational project. Not Badan Bahasa’s “Peta Bahasa”, and not affiliated with any institution.',
  },
  plate: {
    title: 'Language families',
    period: 'Distribution as described by atlas sources, {fromYear}–{toYear}',
    periodShort:
      'Distribution per atlas sources, {fromYear}–{toYear} — not a census of speakers today.',
    periodCaveat:
      'This map shows the distribution described by those atlas sources, not a census of who speaks what today.',
    legend: 'Legend',
    families: 'Families',
    coverage:
      '{withPolygon} of {total} languages have a territory ({percent}%); the rest are points only.',
    pointNote:
      'A point stays a point. Glottolog’s coordinate is frequently the midpoint of a dispersed population, so a language without a polygon is drawn as a mark and is never inflated into a territory.',
    gradientNote:
      'Language boundaries are gradients rather than lines. Boundaries are drawn as hairlines to keep that in view.',
    clearSelection: 'Clear selection',
    selectedFamily: 'Selected family',
    noSelection: 'No family selected yet.',
    extent: 'spans {km} km',
    extentNote:
      'Span is the distance between the two furthest-apart recorded points in this branch. Measured between midpoints, so it is a floor rather than the true reach of the territory.',
    index: 'Index',
    attribution:
      'Sources: Glottolog 5.3 (CC-BY-4.0), Glottography (CC-BY-4.0), Natural Earth (public domain).',
    geometryArea: 'has a territory',
    geometryPoint: 'point only',
    colourBy: 'Colour by',
    colourByFamily: 'Family',
    colourBySubgroup: 'Subgroup',
    subgroupNote:
      'Two-thirds of the languages here are Austronesian, so at family level most of the west is a single tint. The subgroup view cuts each family at its first real branching. Colour distinguishes neighbours rather than naming groups — the same tint reappears elsewhere in the archipelago — and the legend and hover give the names.',
    subgroupOf: 'in {family}',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Reset to the whole map',
    fullscreen: 'Full screen',
    fullscreenExit: 'Exit full screen',
    panHint: 'Drag to pan · Ctrl-scroll to zoom',
    hatchingToggle: 'show hatching',
    hatchingNote:
      'Endangerment is drawn as hatch density over the family colour rather than as a colour of its own: hue already carries family, so the two layers stay readable at once. Status follows Glottolog AES for all {total} languages.',
  },
  guide: {
    leadPlain:
      '{total} regional languages of Indonesia, coloured by the family they belong to — languages that descend from a single common ancestor.',
    linkage:
      'Hover a branch of the genealogical tree and every territory in that family lights up on the map. Click a territory and the tree opens that language’s line of descent.',
    title: 'How to read this map',
    colour: 'Colour marks the family',
    colourNote:
      'One colour, one family. Colours stay muted until you choose a family — the one you choose becomes the only saturated thing on the map.',
    point: 'A ring means a point, not a territory',
    pointNote:
      'Where no territory data exists, all that is drawn is one approximate point. A point is never inflated into an area.',
    hatch: 'Hatching marks endangerment',
    hatchNote:
      'The denser the hatching, the closer the language is to extinction. Hatching is used so that colour can keep carrying family.',
    land: 'Grey means no data yet',
    landNote:
      'Land not covered by a colour is territory the polygon sources do not reach. The coastline is known; the language distribution there is unrecorded — so it stays grey and is not clickable.',
    tryThis: 'Try',
    tryAustronesian: 'The Austronesian family',
    trySeam: 'The Austronesian–Papuan seam',
    tryIsolates: 'Isolates',
    tabMap: 'Map',
    tabTree: 'Tree',
    whatIsFamily: 'What is a language family?',
    whatIsFamilyBody:
      'A language family is a group of languages shown to descend from one common ancestor language — a family in the genealogical sense. Javanese, Balinese, Tagalog and Māori all belong to Austronesian, for instance. The tree on this page is that genealogy.',
  },
  tree: {
    title: 'Genealogical tree',
    subtitle: 'Glottolog classification, language level',
    expand: 'Expand',
    collapse: 'Collapse',
    isolate: 'isolate',
    languages: '{count} languages',
  },
  panel: {
    glottocode: 'Glottocode',
    isoCode: 'ISO 639-3',
    family: 'Family',
    classification: 'Classification',
    endangerment: 'Endangerment status',
    coordinates: 'Coordinates',
    geometry: 'Territory',
    hasPolygon: 'Polygon present, from {source}',
    pointOnly: 'No polygon — drawn as a point',
    altNames: 'Alternate names',
    noAltNames: 'No alternate names in the sources used',
    noSpeakerCount:
      'No speaker count is given. Glottolog carries no reliable figures and proprietary sources are not used. An unsourced number is worse than an absent one.',
    sources: 'Sources',
    openLanguage: 'Open the language page',
    close: 'Close',
  },
  relatives: {
    title: 'Nearest relatives',
    sharedAncestor: 'Deepest shared ancestor',
    count: '{count} other languages on this map',
    unranked:
      'All equally close. Glottolog’s classification is a nesting without branch lengths, so this list cannot be ordered by how closely related its members are.',
    closest: 'Closest recorded point',
    distance: '{km} km',
    distanceCaveat:
      'Measured between recorded points, not between speaker areas. Glottolog’s coordinate is frequently the midpoint of a dispersed population, so this is an order of magnitude rather than a survey.',
    scopeCaveat:
      'Computed only among the {total} languages mapped here. A language whose family mostly lives outside Indonesia may have a nearer relative off this map.',
    isolate: 'An isolate: no known relatives among the languages mapped here.',
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
    backToViews: 'All guided views',
    emphasised: '{count} languages are emphasised in this view',
    stillClickable:
      'A view only decides what starts lit. Every language is still drawn and still clickable — hiding the rest would be making a claim about what is there.',
    seamContacts: {
      title: 'The seam is not a line',
      lead: '{count} pairs of recorded areas actually touch along it: {languages} languages from {families} different families. Colour makes the boundary look like one long line; this list shows that on Halmahera and around the Bird’s Head the two are interleaved instead.',
      threshold: 'Two areas count as touching when they come within {km} km of each other in the simplified geometry (0.01° tolerance, roughly 1.1 km).',
      floor: 'This is a floor, not a census. Only languages with a recorded area can appear, and {pointOnly} languages on this map are points only — a language can sit squarely on the seam and never be listed.',
      touching: 'touching',
      within: '{km} km',
      columnFamily: 'Papuan family',
      columnAustronesian: 'In contact with',
      columnDistance: 'Distance',
    },
  },
  search: {
    label: 'Search languages',
    placeholder: 'Name, alternate name, glottocode, or ISO code',
    noResults: 'Nothing matches.',
    resultCount: '{count} results',
  },
  export: {
    png: 'Download PNG',
    copyLink: 'Copy a link to this view',
    copied: 'Link copied',
    failed: 'That did not work. Try again, or take a screenshot.',
  },
  a11y: {
    skipToContent: 'Skip to main content',
    chooseLanguage: 'Choose interface language',
    siteNav: 'Main navigation',
    announceBranch: '{name} selected, {count} languages highlighted',
    announceLanguage: '{name} selected',
    announceCleared: 'Selection cleared',
  },
}

const DICTIONARIES: Readonly<Record<Locale, Dictionary>> = { id, en }

/**
 * Fills `{placeholder}` templates. Templates rather than functions because a dictionary
 * crosses the server/client boundary — functions cannot be serialised into a client
 * component, and finding that out at build time is exactly what a static export is for.
 *
 * Numbers are substituted plainly, with no locale grouping. This was the other way around
 * and it printed the atlas period as "atlas 1.990–2.020" on the plate itself: Indonesian
 * groups thousands with a period, and a template cannot know whether its number is a count
 * or a year. So grouping is the caller's decision — `toLocaleString` at the call site, or a
 * pre-formatted string — and a year stays a year.
 *
 * An unknown placeholder is left in place rather than blanked, so a missing value shows up
 * as `{count}` in the UI instead of vanishing silently.
 */
export function format(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = values[key]
    if (value === undefined) return whole
    return String(value)
  })
}

export function dictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

/** Locale-prefixed href, with the deployment's basePath left to Next to add. */
export function localePath(locale: Locale, path = ''): string {
  const trimmed = path.replace(/^\/+/, '')
  return trimmed === '' ? `/${locale}` : `/${locale}/${trimmed}`
}
