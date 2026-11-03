// ==========================================
// DATA KONTEN BELAJAR SORSINGGIH
// Catatan: isi bahasa Bali di sini sebaiknya diperiksa
// oleh penutur asli / dosen sebelum dipublikasikan.
// ==========================================

const URUTAN_LEVEL = ['pemula', 'menengah', 'mahir'];

const DATA_LEVEL = {
    pemula:   { unit: 'Unit 1', judul: 'Perkenalan Diri',        sub: 'Pengenalan Dasar',      tugas: 'Pengenalan Dasar' },
    menengah: { unit: 'Unit 2', judul: 'Percakapan Sehari-hari', sub: 'Sapaan dan Tata Krama', tugas: 'Percakapan Dasar' },
    mahir:    { unit: 'Unit 3', judul: 'Basa Alus Lanjutan',     sub: 'Sor Singgih Mendalam',  tugas: 'Upacara dan Adat' }
};

const NAMA_LEVEL = { pemula: 'Pemula', menengah: 'Menengah', mahir: 'Mahir' };
const NAMA_NODE = { kosakata: 'Kosakata', terjemahan: 'Terjemahan', berbicara: 'Berbicara' };

const TARGET_TERJEMAHAN = 2; // jumlah terjemahan untuk menyelesaikan tugas
const TARGET_BICARA = 3;     // jumlah kalimat lulus untuk tugas berbicara
const AMBANG_BICARA = 0.6;   // minimal kemiripan (0-1) agar dianggap lulus

const KOSAKATA = [
    // ---- Pemula: Perkenalan Diri ----
    { id: 'p01', level: 'pemula', indo: 'Salam pembuka', bali: 'Om Swastyastu', tingkat: 'Umum', catatan: 'Salam pembuka yang dipakai umat Hindu Bali.' },
    { id: 'p02', level: 'pemula', indo: 'Selamat pagi', bali: 'Rahajeng semeng', tingkat: 'Alus', catatan: 'Semeng = pagi.' },
    { id: 'p03', level: 'pemula', indo: 'Selamat sore', bali: 'Rahajeng sanja', tingkat: 'Alus', catatan: 'Sanja = sore.' },
    { id: 'p04', level: 'pemula', indo: 'Selamat malam', bali: 'Rahajeng wengi', tingkat: 'Alus', catatan: 'Wengi = malam.' },
    { id: 'p05', level: 'pemula', indo: 'Terima kasih', bali: 'Matur suksma', tingkat: 'Alus', catatan: 'Bentuk singkatnya: Suksma.' },
    { id: 'p06', level: 'pemula', indo: 'Ya', bali: 'Inggih', tingkat: 'Alus', catatan: 'Bentuk singkatnya: Nggih.' },
    { id: 'p07', level: 'pemula', indo: 'Tidak', bali: 'Nenten', tingkat: 'Alus', catatan: 'Bentuk biasa: Tusing.' },
    { id: 'p08', level: 'pemula', indo: 'Saya', bali: 'Titiang', tingkat: 'Alus', catatan: 'Bentuk biasa: Tiang. Dengan teman sebaya: Icang.' },
    { id: 'p09', level: 'pemula', indo: 'Nama saya ...', bali: 'Adan titiange ...', tingkat: 'Alus', catatan: 'Adan = nama.' },
    { id: 'p10', level: 'pemula', indo: 'Siapa namamu?', bali: 'Sira adan ragane?', tingkat: 'Alus', catatan: 'Sira = siapa, ragane = Anda.' },
    { id: 'p11', level: 'pemula', indo: 'Apa kabar?', bali: 'Sapunapi gatrane?', tingkat: 'Alus', catatan: 'Bentuk biasa: Kenken kabare?' },
    { id: 'p12', level: 'pemula', indo: 'Baik-baik saja', bali: 'Becik-becik kemanten', tingkat: 'Alus', catatan: 'Kemanten = saja. Bentuk biasa: Becik-becik gen.' },
    { id: 'p13', level: 'pemula', indo: 'Saya mohon maaf', bali: 'Titiang nunas ampura', tingkat: 'Alus', catatan: 'Bentuk singkat: Ampura.' },

    // ---- Menengah: Percakapan Sehari-hari ----
    { id: 'm01', level: 'menengah', indo: 'Datang', bali: 'Rauh', tingkat: 'Alus', catatan: 'Bentuk biasa: Teka.' },
    { id: 'm02', level: 'menengah', indo: 'Makan', bali: 'Ngajeng', tingkat: 'Alus', catatan: 'Bentuk biasa: Madaar. Bentuk kasar: Ngamah.' },
    { id: 'm03', level: 'menengah', indo: 'Sudah', bali: 'Sampun', tingkat: 'Alus', catatan: 'Bentuk biasa: Suba.' },
    { id: 'm04', level: 'menengah', indo: 'Belum', bali: 'Dereng', tingkat: 'Alus', catatan: 'Bentuk biasa: Durung.' },
    { id: 'm05', level: 'menengah', indo: 'Pergi', bali: 'Lunga', tingkat: 'Alus', catatan: 'Dipakai untuk orang yang dihormati.' },
    { id: 'm06', level: 'menengah', indo: 'Pulang', bali: 'Mantuk', tingkat: 'Alus', catatan: 'Bentuk biasa: Mulih.' },
    { id: 'm07', level: 'menengah', indo: 'Anda / kamu', bali: 'Ragane', tingkat: 'Alus', catatan: 'Dengan teman akrab: Cai (laki-laki) atau Nyai (perempuan).' },
    { id: 'm08', level: 'menengah', indo: 'Silakan', bali: 'Durusang', tingkat: 'Alus', catatan: 'Contoh: Durusang linggih (silakan duduk).' },
    { id: 'm09', level: 'menengah', indo: 'Duduk', bali: 'Linggih', tingkat: 'Alus', catatan: 'Dipakai untuk menghormati lawan bicara.' },
    { id: 'm10', level: 'menengah', indo: 'Di (tempat)', bali: 'Ring', tingkat: 'Alus', catatan: 'Contoh: Ring griya (di rumah).' },
    { id: 'm11', level: 'menengah', indo: 'Meminta / memohon', bali: 'Nunas', tingkat: 'Alus', catatan: 'Bentuk biasa: Ngidih.' },
    { id: 'm12', level: 'menengah', indo: 'Ada', bali: 'Wenten', tingkat: 'Alus', catatan: 'Bentuk biasa: Ade.' },
    { id: 'm13', level: 'menengah', indo: 'Masih', bali: 'Kantun', tingkat: 'Alus', catatan: 'Bentuk biasa: Enu.' },
    { id: 'm14', level: 'menengah', indo: 'Berkata (kepada yang dihormati)', bali: 'Matur', tingkat: 'Alus', catatan: 'Merendahkan diri sendiri di depan lawan bicara.' },

    // ---- Mahir: Basa Alus Lanjutan ----
    { id: 'a01', level: 'mahir', indo: 'Beliau', bali: 'Ida', tingkat: 'Singgih', catatan: 'Untuk orang suci atau yang sangat dihormati.' },
    { id: 'a02', level: 'mahir', indo: 'Anda (sangat hormat)', bali: 'Ida dane', tingkat: 'Singgih', catatan: 'Dipakai saat menyapa orang yang dihormati.' },
    { id: 'a03', level: 'mahir', indo: 'Pendeta (Brahmana)', bali: 'Ida Pedanda', tingkat: 'Singgih', catatan: 'Gelar untuk pendeta dari kalangan Brahmana.' },
    { id: 'a04', level: 'mahir', indo: 'Mempersembahkan / memberikan', bali: 'Ngaturang', tingkat: 'Alus', catatan: 'Merendahkan diri saat memberi kepada yang dihormati.' },
    { id: 'a05', level: 'mahir', indo: 'Menyampaikan terima kasih (hormat)', bali: 'Ngaturang suksma', tingkat: 'Alus', catatan: 'Lebih hormat daripada Matur suksma.' },
    { id: 'a06', level: 'mahir', indo: 'Berjalan / pergi (beliau)', bali: 'Mamargi', tingkat: 'Singgih', catatan: 'Untuk orang yang sangat dihormati.' },
    { id: 'a07', level: 'mahir', indo: 'Makan (beliau)', bali: 'Ngrayunang', tingkat: 'Singgih', catatan: 'Bandingkan dengan Ngajeng (alus) dan Madaar (biasa).' },
    { id: 'a08', level: 'mahir', indo: 'Tahu', bali: 'Uning', tingkat: 'Alus', catatan: 'Bentuk biasa: Nawang.' }
];

const BICARA = [
    // ---- Pemula ----
    { id: 'bp1', level: 'pemula', indo: 'Salam pembuka', bali: 'Om Swastyastu' },
    { id: 'bp2', level: 'pemula', indo: 'Selamat pagi', bali: 'Rahajeng semeng' },
    { id: 'bp3', level: 'pemula', indo: 'Terima kasih', bali: 'Matur suksma' },
    { id: 'bp4', level: 'pemula', indo: 'Nama saya Made', bali: 'Adan titiange Made' },
    { id: 'bp5', level: 'pemula', indo: 'Apa kabar?', bali: 'Sapunapi gatrane' },
    { id: 'bp6', level: 'pemula', indo: 'Saya mohon maaf', bali: 'Titiang nunas ampura' },
    // ---- Menengah ----
    { id: 'bm1', level: 'menengah', indo: 'Silakan duduk', bali: 'Durusang linggih' },
    { id: 'bm2', level: 'menengah', indo: 'Sudah makan?', bali: 'Sampun ngajeng' },
    { id: 'bm3', level: 'menengah', indo: 'Saya belum makan', bali: 'Titiang dereng ngajeng' },
    { id: 'bm4', level: 'menengah', indo: 'Saya pulang dulu', bali: 'Titiang mantuk dumun' },
    { id: 'bm5', level: 'menengah', indo: 'Kamu pergi ke mana?', bali: 'Ragane lunga kija' },
    // ---- Mahir ----
    { id: 'ba1', level: 'mahir', indo: 'Salam kepada pendeta', bali: 'Om Swastyastu Ida Pedanda' },
    { id: 'ba2', level: 'mahir', indo: 'Saya menyampaikan terima kasih', bali: 'Titiang ngaturang suksma' },
    { id: 'ba3', level: 'mahir', indo: 'Saya tidak tahu', bali: 'Titiang nenten uning' },
    { id: 'ba4', level: 'mahir', indo: 'Beliau sudah makan?', bali: 'Ida sampun ngrayunang' }
];

const BACAAN = [
    {
        id: 'r1', level: 'pemula', judul: 'Bertemu Guru',
        baris: [
            { siapa: 'Murid', bali: 'Om Swastyastu, Bapak. Sapunapi gatrane?', indo: 'Om Swastyastu, Pak. Apa kabar?' },
            { siapa: 'Guru',  bali: 'Om Swastyastu. Becik-becik gen. Kenken kabare?', indo: 'Om Swastyastu. Baik-baik saja. Bagaimana kabarmu?' },
            { siapa: 'Murid', bali: 'Titiang becik-becik kemanten. Matur suksma.', indo: 'Saya baik-baik saja. Terima kasih.' }
        ]
    },
    {
        id: 'r2', level: 'pemula', judul: 'Berkenalan dengan Teman',
        baris: [
            { siapa: 'Made',  bali: 'Om Swastyastu! Sira adan cai?', indo: 'Om Swastyastu! Siapa namamu?' },
            { siapa: 'Kadek', bali: 'Adan icang Kadek. Cai?', indo: 'Namaku Kadek. Kamu?' },
            { siapa: 'Made',  bali: 'Adan icang Made. Suksma.', indo: 'Namaku Made. Terima kasih.' }
        ]
    },
    {
        id: 'r3', level: 'menengah', judul: 'Menanyakan Makan',
        baris: [
            { siapa: 'Anak', bali: 'Bapa, sampun ngajeng?', indo: 'Ayah, sudah makan?' },
            { siapa: 'Bapa', bali: 'Suba. Cai suba madaar?', indo: 'Sudah. Kamu sudah makan?' },
            { siapa: 'Anak', bali: 'Dereng, Bapa.', indo: 'Belum, Ayah.' },
            { siapa: 'Bapa', bali: 'Nah, madaar malu.', indo: 'Ya, makanlah dulu.' }
        ]
    },
    {
        id: 'r4', level: 'menengah', judul: 'Bertamu',
        baris: [
            { siapa: 'Tamu',        bali: 'Om Swastyastu. Titiang rauh.', indo: 'Om Swastyastu. Saya datang.' },
            { siapa: 'Tuan rumah',  bali: 'Om Swastyastu. Inggih, durusang linggih.', indo: 'Om Swastyastu. Ya, silakan duduk.' },
            { siapa: 'Tamu',        bali: 'Matur suksma.', indo: 'Terima kasih.' }
        ]
    },
    {
        id: 'r5', level: 'mahir', judul: 'Menghadap Ida Pedanda',
        baris: [
            { siapa: 'Titiang',       bali: 'Om Swastyastu, Ida Pedanda. Titiang nunas ampura, titiang sampun rauh.', indo: 'Om Swastyastu, Ida Pedanda. Mohon maaf, saya sudah datang.' },
            { siapa: 'Ida Pedanda',   bali: 'Om Swastyastu. Inggih, durusang linggih.', indo: 'Om Swastyastu. Ya, silakan duduk.' },
            { siapa: 'Titiang',       bali: 'Matur suksma. Titiang ngaturang suksma.', indo: 'Terima kasih. Saya menyampaikan terima kasih.' }
        ]
    }
];