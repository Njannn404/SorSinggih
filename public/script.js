// ==========================================
// BLOK 1: ELEMEN, PENYIMPANAN & ALAT BANTU
// ==========================================
const $ = (id) => document.getElementById(id);
const app = $('app');
const toastEl = $('toast');

const tombolUbah = $('btn-ubah');
const inputKalimat = $('input-kalimat');
const inputLawanBicara = $('input-lawan-bicara');
const pillLawan = $('pill-lawan');
const areaHasil = $('area-hasil');
const teksHasil = $('teks-hasil');
const teksPenjelasan = $('teks-penjelasan');

const btnMic = $('btn-mic');
const statusMic = $('status-mic');
const btnVolume = $('btn-volume');
const btnSpeed = $('btn-speed');
const btnKeyboard = $('btn-keyboard');

const KUNCI = {
    pengguna: 'sorsinggih:pengguna',
    sesi: 'sorsinggih:sesi',
    setelan: 'sorsinggih:setelan',
    progres: (u) => 'sorsinggih:progres:' + u
};

function baca(kunci, bawaan) {
    try {
        const v = localStorage.getItem(kunci);
        return v ? JSON.parse(v) : bawaan;
    } catch (e) {
        return bawaan;
    }
}
function simpan(kunci, nilai) {
    try { localStorage.setItem(kunci, JSON.stringify(nilai)); } catch (e) { console.error(e); }
}
function hapus(kunci) {
    try { localStorage.removeItem(kunci); } catch (e) { console.error(e); }
}

function esc(teks) {
    return String(teks).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function ikon(nama, kelas) {
    return '<svg class="icon' + (kelas ? ' ' + kelas : '') + '"><use href="#i-' + nama + '"/></svg>';
}
function acak(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ---------- Toast (antre, supaya pesan beruntun tidak saling timpa)
const antreanToast = [];
let toastJalan = false;
function toast(pesan) {
    if (antreanToast[antreanToast.length - 1] === pesan) return;
    antreanToast.push(pesan);
    if (!toastJalan) jalankanToast();
}
function jalankanToast() {
    const pesan = antreanToast.shift();
    if (!pesan) { toastJalan = false; return; }
    toastJalan = true;
    toastEl.textContent = pesan;
    toastEl.classList.add('show');
    setTimeout(() => {
        toastEl.classList.remove('show');
        setTimeout(jalankanToast, 350);
    }, 2200);
}

// ---------- Suara
const kecepatan = [0.75, 1, 1.25];
let setelan = Object.assign({ kecepatan: 1, lawanDefault: 'Guru/Dosen' }, baca(KUNCI.setelan, {}));

function bacakan(teks) {
    if (!teks) return;
    if (!('speechSynthesis' in window)) { toast('Browser tidak mendukung suara.'); return; }
    window.speechSynthesis.cancel();
    const ucapan = new SpeechSynthesisUtterance(teks);
    ucapan.lang = 'id-ID';
    ucapan.rate = setelan.kecepatan;
    window.speechSynthesis.speak(ucapan);
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
function buatPengenal() {
    const r = new SpeechRecognition();
    r.lang = 'id-ID';
    r.interimResults = false;
    r.maxAlternatives = 3;
    return r;
}

// ---------- Kemiripan teks (untuk Latihan Bicara)
function normal(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function jarak(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let sebelum = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        const kini = [i];
        for (let j = 1; j <= n; j++) {
            kini[j] = Math.min(sebelum[j] + 1, kini[j - 1] + 1, sebelum[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        sebelum = kini;
    }
    return sebelum[n];
}
function kemiripan(a, b) {
    a = normal(a); b = normal(b);
    const maks = Math.max(a.length, b.length);
    return maks ? 1 - jarak(a, b) / maks : 0;
}

// ==========================================
// BLOK 2: AKUN (MASUK / DAFTAR) & KEMAJUAN
// Catatan: akun disimpan di localStorage browser (cocok untuk
// prototipe). Untuk produksi, pindahkan ke server.
// ==========================================
let pengguna = null;   // { kunci, nama }
let progres = null;    // kemajuan belajar milik pengguna yang masuk

function progresAwal() {
    const kosong = () => ({ kosakata: false, terjemahan: false, berbicara: false });
    return {
        koin: 0, xp: 0, streak: 0,
        terakhirAktif: null, terakhirKlaim: null,
        hafal: [], bicaraLulus: [], bacaanSelesai: [], lencana: [],
        terjemahan: { pemula: 0, menengah: 0, mahir: 0 },
        selesai: { pemula: kosong(), menengah: kosong(), mahir: kosong() }
    };
}
function muatProgres(kunci) {
    const dasar = progresAwal();
    const t = baca(KUNCI.progres(kunci), {});
    const gabung = Object.assign({}, dasar, t);
    gabung.terjemahan = Object.assign({}, dasar.terjemahan, t.terjemahan);
    URUTAN_LEVEL.forEach((lv) => {
        gabung.selesai[lv] = Object.assign({}, dasar.selesai[lv], (t.selesai || {})[lv]);
    });
    return gabung;
}
function simpanProgres() {
    if (pengguna && progres) simpan(KUNCI.progres(pengguna.kunci), progres);
}

async function hashSandi(sandi, garam) {
    const teks = garam + ':' + sandi;
    if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; // cadangan sederhana bila crypto.subtle tidak tersedia
    for (const c of teks) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
    return 'x' + h.toString(16);
}

function mulaiSesi(kunci, nama) {
    pengguna = { kunci, nama };
    progres = muatProgres(kunci);
    simpan(KUNCI.sesi, kunci);
    catatAktif();
    simpanProgres();
}

async function daftarAkun(nama, sandi, ulang) {
    nama = nama.trim();
    const kunci = nama.toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(kunci)) throw new Error('Nama pengguna 3-20 karakter: huruf, angka, atau garis bawah (_).');
    if (sandi.length < 6) throw new Error('Kata sandi minimal 6 karakter.');
    if (sandi !== ulang) throw new Error('Kata sandi dan pengulangannya belum sama.');
    const semua = baca(KUNCI.pengguna, {});
    if (semua[kunci]) throw new Error('Nama pengguna sudah dipakai.');
    const garam = Math.random().toString(36).slice(2) + Date.now().toString(36);
    semua[kunci] = { nama, garam, hash: await hashSandi(sandi, garam), dibuat: Date.now() };
    simpan(KUNCI.pengguna, semua);
    mulaiSesi(kunci, nama);
}

async function masukAkun(nama, sandi) {
    const kunci = nama.trim().toLowerCase();
    const semua = baca(KUNCI.pengguna, {});
    const u = semua[kunci];
    if (!u || u.hash !== await hashSandi(sandi, u.garam)) throw new Error('Nama pengguna atau kata sandi salah.');
    mulaiSesi(kunci, u.nama);
}

function keluarAkun() {
    hapus(KUNCI.sesi);
    pengguna = null;
    progres = null;
    modeTugas = null;
    segarkanSemua();
    showScreen('home', { reset: true });
    toast('Kamu sudah keluar.');
}

// ---------- Hari beruntun (streak)
function hariIni() { return new Date().toLocaleDateString('en-CA'); }
function selisihHari(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}
function catatAktif() {
    if (!progres) return;
    const h = hariIni();
    if (progres.terakhirAktif === h) return;
    progres.streak = (progres.terakhirAktif && selisihHari(progres.terakhirAktif, h) === 1) ? progres.streak + 1 : 1;
    progres.terakhirAktif = h;
}

// ---------- Aturan level, tugas, dan lencana
function tambah({ xp = 0, koin = 0 }) { progres.xp += xp; progres.koin += koin; }

function semuaSelesai(level) {
    return Object.values(progres.selesai[level]).every(Boolean);
}
function levelTerbuka(level) {
    if (!progres) return false;
    const i = URUTAN_LEVEL.indexOf(level);
    return i === 0 || semuaSelesai(URUTAN_LEVEL[i - 1]);
}
function totalTugas() {
    return URUTAN_LEVEL.reduce((n, lv) => n + Object.values(progres.selesai[lv]).filter(Boolean).length, 0);
}
function hafalDiLevel(level) {
    return KOSAKATA.filter((k) => k.level === level && progres.hafal.includes(k.id)).length;
}
function lulusDiLevel(level) {
    return BICARA.filter((b) => b.level === level && progres.bicaraLulus.includes(b.id)).length;
}

function tandaiSelesai(level, node) {
    if (progres.selesai[level][node]) return;
    progres.selesai[level][node] = true;
    tambah({ xp: 30, koin: 10 });
    toast('Tugas selesai: ' + NAMA_NODE[node] + ' (' + DATA_LEVEL[level].unit + ')');
    const berikut = URUTAN_LEVEL[URUTAN_LEVEL.indexOf(level) + 1];
    if (berikut && semuaSelesai(level)) toast(DATA_LEVEL[berikut].unit + ' terbuka!');
}
function cekTugas(level) {
    if (KOSAKATA.filter((k) => k.level === level).every((k) => progres.hafal.includes(k.id))) tandaiSelesai(level, 'kosakata');
    if (progres.terjemahan[level] >= TARGET_TERJEMAHAN) tandaiSelesai(level, 'terjemahan');
    if (lulusDiLevel(level) >= TARGET_BICARA) tandaiSelesai(level, 'berbicara');
}

const LENCANA = [
    { id: 'langkah',  ikon: 'check', nama: 'Langkah Pertama',  desk: 'Selesaikan 1 tugas',          ok: () => totalTugas() >= 1 },
    { id: 'kamus',    ikon: 'book',  nama: 'Kamus Hidup',      desk: 'Hafalkan 10 kata',            ok: () => progres.hafal.length >= 10 },
    { id: 'pembaca',  ikon: 'file',  nama: 'Pembaca Setia',    desk: 'Selesaikan 3 bacaan',         ok: () => progres.bacaanSelesai.length >= 3 },
    { id: 'penutur',  ikon: 'mic',   nama: 'Penutur Berani',   desk: 'Lulus 5 latihan bicara',      ok: () => progres.bicaraLulus.length >= 5 },
    { id: 'konsisten',ikon: 'flame', nama: 'Konsisten',        desk: 'Belajar 3 hari beruntun',     ok: () => progres.streak >= 3 },
    { id: 'tuntas',   ikon: 'award', nama: 'Pemula Tuntas',    desk: 'Selesaikan semua tugas Unit 1', ok: () => semuaSelesai('pemula') }
];
function cekLencana() {
    LENCANA.forEach((l) => {
        if (!progres.lencana.includes(l.id) && l.ok()) {
            progres.lencana.push(l.id);
            tambah({ koin: 10 });
            toast('Lencana baru: ' + l.nama);
        }
    });
}

// Dipanggil setiap selesai aksi belajar
function setelahAksi() {
    cekLencana();
    simpanProgres();
    segarkanSemua();
}

// ==========================================
// BLOK 3: NAVIGASI ANTAR LAYAR
// ==========================================
// Layar yang langsung dialihkan ke halaman login bila belum masuk.
// Jalur Belajar, Hadiah, dan Profil tidak termasuk: tamu melihat tampilan pratinjau sendiri.
const PERLU_LOGIN = ['kosakata', 'bicara', 'bacaan'];
const NAMA_FITUR = {
    path: 'Jalur Belajar', kosakata: 'latihan Kosakata', bicara: 'latihan Berbicara', bacaan: 'Bacaan',
    translate: 'tugas Terjemahan', hadiah: 'hadiah dan lencanamu', profil: 'profilmu'
};
const NAV_UNTUK = { kosakata: 'path', bicara: 'path', bacaan: 'path' };
let layarAktif = 'home';
let riwayat = [];
let tujuanLogin = null;
let modeTugas = null; // level tugas terjemahan yang sedang dikerjakan

// ---------- Animasi perpindahan halaman
// Urutan menu dipakai untuk menentukan arah geser (kanan = maju, kiri = mundur)
const URUTAN_MENU = ['home', 'hadiah', 'path', 'profil', 'setelan', 'tentang'];
let timerKeluar = null;
let navSekarang = 'home';   // menu navbar yang sedang disorot

// Mulai ulang animasi masuk pada layar yang sama (dipakai saat menu berganti tapi layarnya tetap)
function ulangiAnimasi(el) {
    if (!el) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.classList.remove('active');
    void el.offsetWidth; // paksa browser menghitung ulang agar animasi mulai dari awal
    el.classList.add('active');
}

function tentukanArah(dari, ke, paksa) {
    if (paksa) return paksa;
    const a = URUTAN_MENU.indexOf(dari);
    const b = URUTAN_MENU.indexOf(ke);
    return (a >= 0 && b >= 0 && b < a) ? 'mundur' : 'maju';
}

// Bersihkan sisa animasi keluar dari layar lama
function bersihkanKeluar() {
    document.querySelectorAll('.screen.keluar').forEach((s) => {
        s.classList.remove('keluar');
        if (s.id !== 'screen-' + layarAktif) s.classList.remove('active');
        s.style.removeProperty('padding-left');
        s.style.removeProperty('padding-right');
        s.style.removeProperty('padding-bottom');
    });
}

// Siapkan animasi: layar lama dibiarkan tampil sebentar sambil memudar keluar
function siapkanAnimasi(lama, arah) {
    clearTimeout(timerKeluar);
    bersihkanKeluar();
    app.dataset.arah = arah;
    if (!lama) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Kunci ukuran padding agar isinya tidak bergeser saat layar dilepas dari alur halaman
    const gaya = getComputedStyle(lama);
    lama.style.paddingLeft = gaya.paddingLeft;
    lama.style.paddingRight = gaya.paddingRight;
    lama.style.paddingBottom = gaya.paddingBottom;
    lama.classList.add('keluar');
    timerKeluar = setTimeout(bersihkanKeluar, 200);
}

function showScreen(nama, opsi = {}) {
    // Menu navbar yang disorot: sesuai tujuan awal (walau nanti dialihkan ke layar login).
    // Kalau layar login dibuka langsung, menu yang sedang aktif dibiarkan.
    const tujuanNav = nama === 'auth' ? (layarAktif === 'auth' ? navSekarang : layarAktif) : nama;
    if (PERLU_LOGIN.includes(nama) && !pengguna) {
        tujuanLogin = { nama, opsi: Object.assign({}, opsi, { reset: false }) };
        nama = 'auth';
    }
    if (opsi.reset) riwayat = [];
    else if (!opsi.tanpaRiwayat && nama !== layarAktif) riwayat.push(layarAktif);

    const navBaru = NAV_UNTUK[tujuanNav] || tujuanNav;
    const navLama = navSekarang;
    const lama = nama !== layarAktif ? $('screen-' + layarAktif) : null;
    const arah = tentukanArah(navLama, navBaru, opsi.arah);
    const layarSama = nama === layarAktif;
    layarAktif = nama;
    navSekarang = navBaru;
    siapkanAnimasi(lama, arah);
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + nama));
    if (lama && lama.classList.contains('keluar')) lama.classList.add('active'); // tetap tampil sampai animasi selesai
    app.dataset.screen = nama;
    const navNama = navBaru;
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.go === navNama));

    if (nama === 'translate') { modeTugas = opsi.tugas || null; segarkanBanner(); }
    if (nama === 'path') { if (opsi.level) levelAktif = opsi.level; renderPath(); }
    if (nama === 'kosakata') mulaiKosakata(opsi.level || levelKos);
    if (nama === 'bicara') mulaiBicara(opsi.level || levelBic);
    if (nama === 'bacaan') { bacaanDibuka = null; renderBacaan(); }
    if (nama === 'auth') siapkanAuth();
    if (['home', 'hadiah', 'profil', 'setelan'].includes(nama)) renderLayar(nama);

    const aktif = $('screen-' + nama);
    if (aktif) aktif.scrollTop = 0;
    // Menu berganti tetapi layarnya sama (mis. Belajar -> Profil saat belum login: keduanya ke layar masuk)
    if (layarSama && navBaru !== navLama) ulangiAnimasi(aktif);
}

function kembali() {
    const tujuan = riwayat.pop() || 'home';
    showScreen(tujuan, { tanpaRiwayat: true, arah: 'mundur' });
}

document.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) { kembali(); return; }
    const go = e.target.closest('[data-go]');
    if (go) showScreen(go.dataset.go, { reset: go.hasAttribute('data-root') });
});

// ---------- Menyegarkan tampilan yang bergantung pada akun
function renderLayar(nama) {
    const peta = { home: renderHome, path: renderPath, hadiah: renderHadiah, profil: renderProfil, setelan: renderSetelan };
    if (peta[nama]) peta[nama]();
}
function segarkanSemua() {
    app.dataset.auth = pengguna ? 'user' : 'guest';
    $('home-initial').textContent = pengguna ? pengguna.nama.charAt(0).toUpperCase() : '';
    $('stat-streak').textContent = progres ? progres.streak : 0;
    $('stat-koin').textContent = progres ? progres.koin : 0;
    renderLayar(layarAktif);
    if (layarAktif === 'kosakata') renderKosakata();
    if (layarAktif === 'bicara') renderBicara();
    if (layarAktif === 'bacaan') renderBacaan();
    segarkanBanner();
}

// ==========================================
// BLOK 4: LAYAR MASUK / DAFTAR
// ==========================================
let modeAuth = 'masuk';
const formAuth = $('form-auth');

function setModeAuth(mode) {
    modeAuth = mode;
    document.querySelectorAll('#tabs-auth .tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
    $('grup-ulang').classList.toggle('hidden', mode !== 'daftar');
    $('btn-auth').textContent = mode === 'daftar' ? 'Buat Akun' : 'Masuk';
    $('auth-sandi').autocomplete = mode === 'daftar' ? 'new-password' : 'current-password';
    $('auth-error').classList.add('hidden');
}
function siapkanAuth() {
    formAuth.reset();
    setModeAuth('masuk');
    $('auth-info').textContent = tujuanLogin
        ? 'Masuk dulu untuk membuka ' + (NAMA_FITUR[tujuanLogin.nama] || 'fitur ini') + '. Chat dengan AI tetap bisa dipakai tanpa akun.'
        : 'Akun dipakai untuk menyimpan kemajuan belajar di Jalur Belajar.';
}

// Minta tamu masuk dulu; setelah berhasil, ia diarahkan ke tujuan yang dimaksud
function mintaLogin(nama, opsi = {}, mode = 'masuk') {
    tujuanLogin = { nama, opsi };
    showScreen('auth');
    if (mode === 'daftar') setModeAuth('daftar');
}
// Tombol ajakan masuk di halaman pratinjau tamu: <button data-login="tujuan" data-mode="daftar">
document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-login]');
    if (b) mintaLogin(b.dataset.login, {}, b.dataset.mode);
});
$('tabs-auth').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) setModeAuth(tab.dataset.mode);
});
formAuth.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tombol = $('btn-auth');
    const galat = $('auth-error');
    galat.classList.add('hidden');
    tombol.disabled = true;
    try {
        const nama = $('auth-nama').value, sandi = $('auth-sandi').value;
        if (modeAuth === 'daftar') await daftarAkun(nama, sandi, $('auth-ulang').value);
        else await masukAkun(nama, sandi);

        toast('Selamat datang, ' + pengguna.nama + '!');
        const tujuan = tujuanLogin;
        tujuanLogin = null;
        segarkanSemua();
        if (tujuan) showScreen(tujuan.nama, Object.assign({}, tujuan.opsi, { reset: true }));
        else showScreen('home', { reset: true });
    } catch (err) {
        galat.textContent = err.message;
        galat.classList.remove('hidden');
    } finally {
        tombol.disabled = false;
    }
});

// ==========================================
// BLOK 5: BERANDA, PROFIL, HADIAH, SETELAN
// ==========================================
function renderHome() {
    const sapa = $('home-greet');
    sapa.classList.toggle('hidden', !pengguna);
    if (pengguna) sapa.textContent = 'Halo, ' + pengguna.nama + '!';
}

function renderProfil() {
    if (!pengguna) return;
    $('pf-initial').textContent = pengguna.nama.charAt(0).toUpperCase();
    $('pf-nama').textContent = pengguna.nama;
    const level = Math.floor(progres.xp / 100) + 1;
    $('pf-level').textContent = 'Level ' + level;
    const sisa = progres.xp % 100;
    $('pf-xp-teks').textContent = sisa + ' / 100 XP';
    $('pf-xp-bar').style.width = sisa + '%';
    $('pf-streak').textContent = progres.streak;
    $('pf-koin').textContent = progres.koin;
    $('pf-kata').textContent = progres.hafal.length;
    $('pf-tugas').textContent = totalTugas();
}
$('btn-keluar').addEventListener('click', keluarAkun);

function renderHadiah() {
    const p = progres || progresAwal();   // tamu: tampilkan semua lencana dalam keadaan terkunci
    $('hd-streak').textContent = p.streak;
    $('hd-koin').textContent = p.koin;
    $('hd-koin-kecil').textContent = p.koin;
    if (progres) {
        const sudah = progres.terakhirKlaim === hariIni();
        const tombol = $('btn-klaim');
        tombol.disabled = sudah;
        tombol.textContent = sudah ? 'Hadiah hari ini sudah diklaim' : 'Klaim hadiah harian (+' + (5 + Math.min(progres.streak, 7)) + ' koin)';
    }
    $('hd-lencana').innerHTML = LENCANA.map((l) => {
        const dapat = p.lencana.includes(l.id);
        return '<div class="badge-item' + (dapat ? ' got' : '') + '">' +
            '<span class="badge-ico">' + ikon(dapat ? l.ikon : 'lock') + '</span>' +
            '<strong>' + esc(l.nama) + '</strong><small>' + esc(l.desk) + '</small></div>';
    }).join('');
}
$('btn-klaim').addEventListener('click', () => {
    if (!progres || progres.terakhirKlaim === hariIni()) return;
    const hadiah = 5 + Math.min(progres.streak, 7);
    progres.terakhirKlaim = hariIni();
    tambah({ koin: hadiah });
    toast('Kamu mendapat ' + hadiah + ' koin!');
    setelahAksi();
});

function terapkanSetelan() {
    $('btn-speed').textContent = setelan.kecepatan + 'x';
    setLawan(setelan.lawanDefault);
}
function renderSetelan() {
    document.querySelectorAll('#set-kecepatan .tab').forEach((t) =>
        t.classList.toggle('active', Number(t.dataset.kec) === setelan.kecepatan));
    document.querySelectorAll('#set-lawan .chip').forEach((c) =>
        c.classList.toggle('active', c.dataset.value === setelan.lawanDefault));

    const akun = $('set-akun');
    if (pengguna) {
        akun.innerHTML =
            '<div class="form-group"><label>Akun</label><p class="muted-text" id="set-nama"></p></div>' +
            '<button class="btn-soft full" id="btn-reset">' + ikon('repeat') + 'Reset kemajuan belajar</button>';
        $('set-nama').textContent = 'Masuk sebagai ' + pengguna.nama;
    } else {
        akun.innerHTML =
            '<div class="form-group"><label>Akun</label><p class="muted-text">Kamu memakai SorSinggih sebagai tamu. Chat dengan AI tetap bisa dipakai. Masuk untuk belajar lewat Jalur Belajar dan menyimpan kemajuan.</p></div>' +
            '<button class="btn-primary" data-go="auth">Masuk / Daftar</button>';
    }
}
$('set-kecepatan').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    setelan.kecepatan = Number(tab.dataset.kec);
    simpan(KUNCI.setelan, setelan);
    terapkanSetelan();
    renderSetelan();
});
$('set-lawan').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    setelan.lawanDefault = chip.dataset.value;
    simpan(KUNCI.setelan, setelan);
    terapkanSetelan();
    renderSetelan();
});
$('set-akun').addEventListener('click', (e) => {
    if (!e.target.closest('#btn-reset')) return;
    if (!confirm('Hapus semua kemajuan belajar akun ini? Tindakan ini tidak bisa dibatalkan.')) return;
    progres = progresAwal();
    catatAktif();
    simpanProgres();
    segarkanSemua();
    toast('Kemajuan belajar direset.');
});

// ==========================================
// BLOK 6: PENERJEMAH AI (BEBAS DIPAKAI TAMU)
// ==========================================
function setLawan(nilai) {
    document.querySelectorAll('#chips-lawan .chip').forEach((c) => c.classList.toggle('active', c.dataset.value === nilai));
    inputLawanBicara.value = nilai;
    pillLawan.textContent = nilai;
}
$('chips-lawan').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) setLawan(chip.dataset.value);
});

btnKeyboard.addEventListener('click', () => {
    inputKalimat.scrollIntoView({ behavior: 'smooth', block: 'center' });
    inputKalimat.focus();
});

// Tiga mode chat AI:
//   terjemah = Indonesia -> Bali, pahami = Bali -> Indonesia, koreksi = kalimat Bali buatan sendiri
const PESAN_UTAMA = 'Om Swastyastu! Saya siap berlatih Bahasa Bali denganmu.';
const MIC_BIASA = 'Gunakan mikrofon untuk bicara';
const MODE_CHAT = {
    terjemah: { api: '/api/ubah', label: 'Kalimat Indonesia', placeholder: 'Ketik atau ucapkan kalimat di sini...',
                tombol: 'Ubah ke Bahasa Bali', badge: 'Hasil Terjemahan', kosong: 'Tolong ketik atau ucapkan kalimat dulu ya!',
                pesan: PESAN_UTAMA, pesanKecil: 'Pilih lawan bicara, lalu ceritakan kalimatmu.', mic: MIC_BIASA },
    pahami:   { api: '/api/pahami', label: 'Kalimat Bahasa Bali', placeholder: 'Ketik kalimat Bahasa Bali yang ingin kamu pahami...',
                tombol: 'Artikan ke Indonesia', badge: 'Arti dalam Indonesia', kosong: 'Tulis kalimat Bahasa Bali dulu ya!',
                pesan: 'Om Swastyastu! Bingung dengan ucapan orang Bali?', pesanKecil: 'Tulis kalimat Balinya, nanti saya artikan ke Bahasa Indonesia.',
                mic: 'Suara Bali belum didukung penuh, hasil bisa kurang tepat. Periksa teksnya dulu.' },
    koreksi:  { api: '/api/koreksi', label: 'Kalimat Bahasa Bali-mu', placeholder: 'Tulis kalimat Bahasa Bali buatanmu di sini...',
                tombol: 'Koreksi Kalimatku', badge: 'Hasil Koreksi', kosong: 'Tulis kalimat Bahasa Bali-mu dulu ya!',
                pesan: PESAN_UTAMA, pesanKecil: 'Pilih lawan bicara, lalu tulis kalimat Balimu.', mic: MIC_BIASA }
};
let modeChat = 'terjemah';
const daftarDetail = $('daftar-detail');

const isiNormal = () => MODE_CHAT[modeChat].tombol + ' ' + ikon('sparkle');
const ISI_LOADING = '<span class="spinner"></span> AI Sedang Berpikir...';

function setModeChat(mode) {
    modeChat = mode;
    const m = MODE_CHAT[mode];
    document.querySelectorAll('#tabs-mode .tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
    $('label-kalimat').textContent = m.label;
    inputKalimat.placeholder = m.placeholder;
    $('badge-hasil').textContent = m.badge;
    tombolUbah.innerHTML = isiNormal();
    areaHasil.classList.add('hidden');

    // Teks sapaan berganti sesuai mode
    $('tr-pesan').textContent = m.pesan;
    $('tr-pesan-kecil').textContent = m.pesanKecil;
    // Mode Bali -> Indonesia tidak butuh pilihan lawan bicara
    $('grup-lawan').classList.toggle('hidden', mode === 'pahami');
    pillLawan.classList.toggle('hidden', mode === 'pahami');
    // Catatan di bawah kotak teks (jangan ditimpa saat sedang merekam)
    if (SpeechRecognition && !btnMic.classList.contains('merekam')) statusMic.innerText = m.mic;
    segarkanBanner();
}
$('tabs-mode').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab && tab.dataset.mode !== modeChat) setModeChat(tab.dataset.mode);
});

function segarkanBanner() {
    const banner = $('task-banner');
    const aktif = !!(pengguna && modeTugas && modeChat === 'terjemah');
    banner.classList.toggle('hidden', !aktif);
    if (!aktif) return;
    const n = Math.min(progres.terjemahan[modeTugas], TARGET_TERJEMAHAN);
    $('task-banner-text').textContent = n >= TARGET_TERJEMAHAN
        ? 'Tugas terjemahan selesai! Kamu boleh lanjut berlatih.'
        : 'Tugas ' + DATA_LEVEL[modeTugas].unit + ': terjemahkan ' + TARGET_TERJEMAHAN + ' kalimat (' + n + '/' + TARGET_TERJEMAHAN + ')';
}

// Membuat satu baris rincian (pakai textContent, aman dari isi HTML liar)
function barisDetail({ utama, tag, sub, salah }) {
    const item = document.createElement('div');
    item.className = 'detail-item' + (salah ? ' salah' : '');
    const atas = document.createElement('div');
    atas.className = 'detail-main';
    const kuat = document.createElement('strong');
    kuat.textContent = utama;
    atas.appendChild(kuat);
    if (tag) {
        const t = document.createElement('span');
        t.className = 'detail-tag';
        t.textContent = tag;
        atas.appendChild(t);
    }
    item.appendChild(atas);
    if (sub) {
        const s = document.createElement('div');
        s.className = 'detail-sub';
        s.textContent = sub;
        item.appendChild(s);
    }
    return item;
}

function tampilkanHasil(d) {
    daftarDetail.replaceChildren();
    if (modeChat === 'terjemah' || modeChat === 'pahami') {
        teksHasil.innerText = d.hasil;
        if (modeChat === 'terjemah') {
            teksPenjelasan.innerText = 'Alasan: ' + (d.penjelasan || '-');
        } else {
            teksPenjelasan.innerText = (d.tingkatTerdeteksi ? 'Tingkat tutur: ' + d.tingkatTerdeteksi + '. ' : '') + (d.penjelasan || '');
        }
        (Array.isArray(d.pilihanKata) ? d.pilihanKata : []).slice(0, 5).forEach((k) => {
            daftarDetail.appendChild(barisDetail({ utama: String(k.bali), tag: String(k.tingkat || ''), sub: String(k.indo || '') }));
        });
    } else {
        teksHasil.innerText = d.koreksi;
        const status = d.sudahPantas ? 'Kalimatmu sudah pantas! ' : 'Ada yang bisa diperbaiki. ';
        teksPenjelasan.innerText = status + (d.tingkatTerdeteksi ? 'Tingkat terbaca: ' + d.tingkatTerdeteksi + '. ' : '') + (d.penjelasan || '');
        (Array.isArray(d.catatan) ? d.catatan : []).slice(0, 6).forEach((k) => {
            daftarDetail.appendChild(barisDetail({ utama: String(k.salah) + '  →  ' + String(k.benar), sub: String(k.alasan || ''), salah: true }));
        });
    }
    daftarDetail.classList.toggle('hidden', !daftarDetail.childElementCount);
    areaHasil.classList.remove('hidden');
    areaHasil.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

tombolUbah.addEventListener('click', async function () {
    const kalimat = inputKalimat.value.trim();
    const lawanBicara = inputLawanBicara.value;
    const mode = modeChat;

    if (!kalimat) {
        toast(MODE_CHAT[mode].kosong);
        return;
    }

    tombolUbah.innerHTML = ISI_LOADING;
    tombolUbah.disabled = true;
    areaHasil.classList.add('hidden');

    try {
        const respons = await fetch(MODE_CHAT[mode].api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kalimat: kalimat, lawanBicara: lawanBicara })
        });

        const data = await respons.json();

        if (data.success) {
            if (mode !== modeChat) return; // pengguna pindah mode saat menunggu
            tampilkanHasil(data.data);

            // Hanya pengguna yang masuk dan sedang mengerjakan tugas yang mendapat kemajuan
            if (mode === 'terjemah' && pengguna && modeTugas && progres.terjemahan[modeTugas] < TARGET_TERJEMAHAN) {
                progres.terjemahan[modeTugas] += 1;
                tambah({ xp: 10 });
                cekTugas(modeTugas);
                setelahAksi();
            }
        } else {
            toast(data.error || 'Terjadi kesalahan.');
        }
    } catch (error) {
        toast('Gagal terhubung ke server. Cek koneksi internetmu.');
        console.error(error);
    } finally {
        tombolUbah.innerHTML = isiNormal();
        tombolUbah.disabled = false;
    }
});

// ---------- Bacakan hasil
btnSpeed.addEventListener('click', () => {
    const idx = (kecepatan.indexOf(setelan.kecepatan) + 1) % kecepatan.length;
    setelan.kecepatan = kecepatan[idx];
    simpan(KUNCI.setelan, setelan);
    terapkanSetelan();
});
btnVolume.addEventListener('click', () => {
    const teks = teksHasil.innerText.trim();
    if (!teks) { toast('Belum ada hasil untuk dibacakan.'); return; }
    bacakan(teks);
});

// ---------- Input suara
if (SpeechRecognition) {
    const recognition = buatPengenal();

    btnMic.addEventListener('click', () => {
        if (btnMic.classList.contains('merekam')) recognition.stop();
        else recognition.start();
    });
    recognition.onstart = () => {
        btnMic.classList.add('merekam');
        statusMic.innerText = 'Mendengarkan... Silakan bicara.';
    };
    recognition.onresult = (event) => {
        inputKalimat.value = event.results[0][0].transcript;
        statusMic.innerText = 'Suara berhasil diubah ke teks!';
    };
    recognition.onend = () => {
        btnMic.classList.remove('merekam');
        setTimeout(() => {
            if (statusMic.innerText === 'Suara berhasil diubah ke teks!') {
                statusMic.innerText = MODE_CHAT[modeChat].mic;
            }
        }, 3000);
    };
    recognition.onerror = (event) => {
        btnMic.classList.remove('merekam');
        statusMic.innerText = 'Gagal merekam. Pastikan izin mikrofon aktif.';
        console.error('Error Mic:', event.error);
    };
} else {
    btnMic.style.display = 'none';
    statusMic.innerText = 'Browser tidak mendukung fitur suara.';
}

// ==========================================
// BLOK 7: JALUR BELAJAR (TAB LEVEL & NODE)
// ==========================================
let levelAktif = 'pemula';

function bindTab(idKontainer, aksi) {
    $(idKontainer).addEventListener('click', (e) => {
        const tab = e.target.closest('.tab');
        if (tab) aksi(tab.dataset.level);
    });
}
function sinkronTab(idKontainer, level) {
    document.querySelectorAll('#' + idKontainer + ' .tab').forEach((t) => {
        t.classList.toggle('active', t.dataset.level === level);
        t.classList.toggle('terkunci', !levelTerbuka(t.dataset.level));
    });
}
const terkunciHTML = (level) =>
    '<div class="empty-card">' + ikon('lock') + '<strong>' + NAMA_LEVEL[level] + ' masih terkunci</strong>' +
    '<small>Selesaikan semua tugas ' + DATA_LEVEL[URUTAN_LEVEL[URUTAN_LEVEL.indexOf(level) - 1]].unit + ' di Jalur Belajar dulu ya.</small></div>';

// Pratinjau Jalur Belajar untuk tamu: semua level bisa dilihat, tugasnya meminta masuk
function renderPathTamu() {
    const d = DATA_LEVEL[levelAktif];
    document.querySelectorAll('#tabs-level .tab').forEach((t) => {
        t.classList.toggle('active', t.dataset.level === levelAktif);
        t.classList.remove('terkunci');
    });
    $('unit-no').textContent = d.unit;
    $('unit-title').textContent = d.judul;
    $('unit-sub').textContent = d.sub;
    $('task-title').textContent = d.tugas;
    $('unit-lock-text').textContent = 'Pratinjau';
    document.querySelectorAll('.node').forEach((node) => {
        node.classList.remove('locked', 'done');
        node.querySelector('.node-status').textContent = 'Masuk dulu';
    });
}

function renderPath() {
    if (!progres) { renderPathTamu(); return; }
    const d = DATA_LEVEL[levelAktif];
    const terbuka = levelTerbuka(levelAktif);
    sinkronTab('tabs-level', levelAktif);
    $('unit-no').textContent = d.unit;
    $('unit-title').textContent = d.judul;
    $('unit-sub').textContent = d.sub;
    $('task-title').textContent = d.tugas;
    $('unit-lock-text').textContent = terbuka ? 'Terbuka' : 'Terkunci';

    const total = KOSAKATA.filter((k) => k.level === levelAktif).length;
    const info = {
        kosakata: hafalDiLevel(levelAktif) + '/' + total,
        terjemahan: Math.min(progres.terjemahan[levelAktif], TARGET_TERJEMAHAN) + '/' + TARGET_TERJEMAHAN,
        berbicara: Math.min(lulusDiLevel(levelAktif), TARGET_BICARA) + '/' + TARGET_BICARA
    };
    document.querySelectorAll('.node').forEach((node) => {
        const nama = node.dataset.node;
        const selesai = progres.selesai[levelAktif][nama];
        node.classList.toggle('locked', !terbuka);
        node.classList.toggle('done', terbuka && selesai);
        node.querySelector('.node-status').textContent = !terbuka ? 'Terkunci' : (selesai ? 'Selesai' : info[nama]);
    });
}
bindTab('tabs-level', (level) => { levelAktif = level; renderPath(); });

document.querySelectorAll('.node').forEach((node) => {
    node.addEventListener('click', () => {
        if (!pengguna) {   // tamu: minta masuk, lalu lanjut ke tugas yang dipilih
            const n = node.dataset.node;
            if (n === 'kosakata') mintaLogin('kosakata', { level: levelAktif });
            else if (n === 'terjemahan') mintaLogin('translate', { tugas: levelAktif });
            else mintaLogin('bicara', { level: levelAktif });
            return;
        }
        if (!levelTerbuka(levelAktif)) {
            toast('Level ini masih terkunci. Selesaikan level sebelumnya dulu ya!');
            return;
        }
        const nama = node.dataset.node;
        if (nama === 'kosakata') showScreen('kosakata', { level: levelAktif });
        else if (nama === 'terjemahan') showScreen('translate', { tugas: levelAktif });
        else showScreen('bicara', { level: levelAktif });
    });
});

// ==========================================
// BLOK 8: KOSAKATA (KARTU HAFALAN)
// ==========================================
let levelKos = 'pemula';
let antrianKos = [];
let modeUlangKos = false;

function mulaiKosakata(level) {
    levelKos = level;
    modeUlangKos = false;
    bangunAntrianKos();
    renderKosakata();
}
function bangunAntrianKos() {
    const semua = KOSAKATA.filter((k) => k.level === levelKos);
    antrianKos = modeUlangKos ? acak(semua) : semua.filter((k) => !progres.hafal.includes(k.id));
}
function renderKosakata() {
    if (!progres) return;
    sinkronTab('tabs-kosakata', levelKos);
    const total = KOSAKATA.filter((k) => k.level === levelKos).length;
    $('kos-hitung').textContent = hafalDiLevel(levelKos) + '/' + total;
    const area = $('kos-area');

    if (!levelTerbuka(levelKos)) { area.innerHTML = terkunciHTML(levelKos); return; }
    if (!antrianKos.length) {
        area.innerHTML = '<div class="empty-card ok">' + ikon('check') + '<strong>Semua kata level ini sudah kamu hafal</strong>' +
            '<small>Mau menyegarkan ingatan? Latih ulang semua kata.</small>' +
            '<button class="btn-primary" data-aksi="ulang-semua">Latih ulang</button></div>';
        return;
    }
    const k = antrianKos[0];
    area.innerHTML =
        '<p class="hint-center">Ketuk kartu untuk melihat jawabannya · sisa ' + antrianKos.length + ' kata</p>' +
        '<div class="flashcard" data-aksi="balik"><div class="flash-inner">' +
            '<div class="flash-face"><span class="flash-label">Bahasa Indonesia</span><div class="flash-word">' + esc(k.indo) + '</div></div>' +
            '<div class="flash-face flash-back"><span class="flash-label">Bahasa Bali</span><div class="flash-word">' + esc(k.bali) + '</div>' +
                '<span class="tingkat">' + esc(k.tingkat) + '</span><p class="flash-note">' + esc(k.catatan) + '</p></div>' +
        '</div></div>' +
        '<div class="action-row">' +
            '<button class="round-btn" data-aksi="dengar" aria-label="Dengarkan">' + ikon('volume') + '</button>' +
            '<button class="btn-soft" data-aksi="ulangi">Ulangi</button>' +
            '<button class="btn-primary" data-aksi="hafal">Hafal</button>' +
        '</div>';
}
bindTab('tabs-kosakata', (level) => mulaiKosakata(level));
$('kos-area').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aksi]');
    if (!btn) return;
    const aksi = btn.dataset.aksi;
    const k = antrianKos[0];
    if (aksi === 'balik') { btn.classList.toggle('flip'); return; }
    if (aksi === 'ulang-semua') { modeUlangKos = true; bangunAntrianKos(); renderKosakata(); return; }
    if (!k) return;
    if (aksi === 'dengar') bacakan(k.bali);
    if (aksi === 'ulangi') { antrianKos.push(antrianKos.shift()); renderKosakata(); }
    if (aksi === 'hafal') {
        if (!progres.hafal.includes(k.id)) {
            progres.hafal.push(k.id);
            tambah({ xp: 5, koin: 1 });
            cekTugas(k.level);
        }
        antrianKos.shift();
        setelahAksi();
        renderKosakata();
    }
});

// ==========================================
// BLOK 9: LATIHAN BICARA
// ==========================================
let levelBic = 'pemula';
let daftarBic = [];
let idxBic = 0;
let hasilBic = null;
let pengenalBic = null;

function mulaiBicara(level) {
    levelBic = level;
    daftarBic = BICARA.filter((b) => b.level === level);
    const belum = daftarBic.findIndex((b) => !progres.bicaraLulus.includes(b.id));
    idxBic = belum === -1 ? 0 : belum;
    hasilBic = null;
    renderBicara();
}
function renderBicara() {
    if (!progres) return;
    sinkronTab('tabs-bicara', levelBic);
    $('bic-hitung').textContent = lulusDiLevel(levelBic) + '/' + daftarBic.length;
    const area = $('bic-area');
    if (!levelTerbuka(levelBic)) { area.innerHTML = terkunciHTML(levelBic); return; }

    const item = daftarBic[idxBic];
    const titik = daftarBic.map((b, i) =>
        '<i class="' + (progres.bicaraLulus.includes(b.id) ? 'pass' : '') + (i === idxBic ? ' on' : '') + '"></i>').join('');

    let umpanBalik = '';
    if (hasilBic) {
        const pct = Math.round(hasilBic.skor * 100);
        umpanBalik = '<div class="feedback ' + (hasilBic.lulus ? 'ok' : 'no') + '">' +
            '<strong>' + (hasilBic.lulus ? 'Bagus! Kalimatmu lulus.' : 'Belum cocok, coba ucapkan lebih pelan.') + '</strong>' +
            (hasilBic.manual ? '' : '<small>Kemiripan ' + pct + '%' + (hasilBic.teks ? ' · terdengar: “' + esc(hasilBic.teks) + '”' : '') + '</small>') +
            '</div>';
    }

    const kontrol = SpeechRecognition
        ? '<button class="btn-mic" id="bic-mic" data-aksi="rekam" aria-label="Ucapkan">' + ikon('mic', 'icon-lg') + '</button>'
        : '<button class="btn-soft" data-aksi="manual">Saya sudah mengucapkan</button>';

    area.innerHTML =
        '<div class="dots">' + titik + '</div>' +
        '<div class="chat-card say-card">' +
            '<small class="say-label">Ucapkan dalam Bahasa Bali</small>' +
            '<div class="say-bali">' + esc(item.bali) + '</div>' +
            '<div class="say-indo">' + esc(item.indo) + '</div>' +
            '<div class="say-controls">' +
                '<button class="round-btn" data-aksi="dengar" aria-label="Dengarkan">' + ikon('volume') + '</button>' +
                kontrol +
                '<button class="round-btn" data-aksi="lanjut" aria-label="Berikutnya">' + ikon('next') + '</button>' +
            '</div>' +
            '<small class="text-mic center" id="bic-status">' + (SpeechRecognition ? 'Ketuk mikrofon lalu ucapkan kalimatnya' : 'Browser ini belum mendukung pengenalan suara') + '</small>' +
            umpanBalik +
        '</div>' +
        '<p class="foot-note">Pengenalan suara memakai model Bahasa Indonesia, jadi kata Bali bisa terdengar kurang tepat. Anggap ini sebagai latihan, bukan penilaian mutlak.</p>';
}
bindTab('tabs-bicara', (level) => mulaiBicara(level));

function nilaiBicara(alternatif) {
    const item = daftarBic[idxBic];
    let terbaik = 0, teks = '';
    alternatif.forEach((t) => {
        const s = kemiripan(t, item.bali);
        if (s >= terbaik) { terbaik = s; teks = t; }
    });
    hasilBic = { skor: terbaik, teks, lulus: terbaik >= AMBANG_BICARA };
    luluskan(item);
}
function luluskan(item) {
    if (hasilBic.lulus && !progres.bicaraLulus.includes(item.id)) {
        progres.bicaraLulus.push(item.id);
        tambah({ xp: 10, koin: 2 });
        cekTugas(item.level);
        setelahAksi();
    }
    renderBicara();
}
function rekamBicara() {
    if (!SpeechRecognition) return;
    if (pengenalBic) { pengenalBic.stop(); return; }
    const r = buatPengenal();
    pengenalBic = r;
    r.onstart = () => {
        const mic = $('bic-mic'); if (mic) mic.classList.add('merekam');
        const st = $('bic-status'); if (st) st.textContent = 'Mendengarkan... Silakan bicara.';
    };
    r.onresult = (event) => {
        const alt = Array.from(event.results[0]).map((a) => a.transcript);
        nilaiBicara(alt);
    };
    r.onend = () => {
        pengenalBic = null;
        const mic = $('bic-mic'); if (mic) mic.classList.remove('merekam');
    };
    r.onerror = (event) => {
        pengenalBic = null;
        const mic = $('bic-mic'); if (mic) mic.classList.remove('merekam');
        const st = $('bic-status'); if (st) st.textContent = 'Gagal merekam. Pastikan izin mikrofon aktif.';
        console.error('Error Mic:', event.error);
    };
    r.start();
}
$('bic-area').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aksi]');
    if (!btn) return;
    const item = daftarBic[idxBic];
    const aksi = btn.dataset.aksi;
    if (aksi === 'dengar') bacakan(item.bali);
    if (aksi === 'rekam') rekamBicara();
    if (aksi === 'manual') { hasilBic = { skor: 1, teks: '', lulus: true, manual: true }; luluskan(item); }
    if (aksi === 'lanjut') {
        if (pengenalBic) pengenalBic.stop();
        idxBic = (idxBic + 1) % daftarBic.length;
        hasilBic = null;
        renderBicara();
    }
});

// ==========================================
// BLOK 10: BACAAN
// ==========================================
let bacaanDibuka = null;
let tampilIndo = true;

function renderBacaan() {
    if (!progres) return;
    $('bac-hitung').textContent = progres.bacaanSelesai.length + '/' + BACAAN.length;
    const area = $('bac-area');

    if (!bacaanDibuka) {
        area.innerHTML = '<div class="menu-list">' + BACAAN.map((b) => {
            const buka = levelTerbuka(b.level);
            const selesai = progres.bacaanSelesai.includes(b.id);
            return '<button class="menu-row' + (buka ? '' : ' terkunci') + '" data-aksi="buka" data-id="' + b.id + '">' +
                '<span class="menu-ico">' + ikon(selesai ? 'check' : 'file') + '</span>' +
                '<span class="menu-text"><strong>' + esc(b.judul) + '</strong><small>' + NAMA_LEVEL[b.level] + ' · ' + b.baris.length + ' baris</small></span>' +
                (buka ? '' : ikon('lock', 'row-lock')) + '</button>';
        }).join('') + '</div>';
        return;
    }

    const b = BACAAN.find((x) => x.id === bacaanDibuka);
    const selesai = progres.bacaanSelesai.includes(b.id);
    area.innerHTML =
        '<div class="reader-head"><button class="btn-soft" data-aksi="tutup">' + ikon('back') + 'Daftar</button>' +
        '<button class="btn-soft" data-aksi="indo">' + (tampilIndo ? 'Sembunyikan terjemahan' : 'Tampilkan terjemahan') + '</button></div>' +
        '<div class="chat-card' + (tampilIndo ? '' : ' hide-indo') + '"><h3 class="reader-title">' + esc(b.judul) + '</h3>' +
        b.baris.map((l, i) =>
            '<div class="line"><div class="line-top"><span class="line-who">' + esc(l.siapa) + '</span>' +
            '<button class="mini-btn" data-aksi="dengar" data-i="' + i + '" aria-label="Dengarkan">' + ikon('volume') + '</button></div>' +
            '<div class="line-bali">' + esc(l.bali) + '</div><div class="line-indo">' + esc(l.indo) + '</div></div>').join('') +
        '</div>' +
        '<button class="btn-primary" data-aksi="selesai"' + (selesai ? ' disabled' : '') + '>' + (selesai ? 'Sudah selesai dibaca' : 'Tandai selesai') + '</button>';
}
$('bac-area').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aksi]');
    if (!btn) return;
    const aksi = btn.dataset.aksi;
    if (aksi === 'buka') {
        const b = BACAAN.find((x) => x.id === btn.dataset.id);
        if (!levelTerbuka(b.level)) { toast('Bacaan ini terbuka setelah level sebelumnya selesai.'); return; }
        bacaanDibuka = b.id;
        renderBacaan();
        $('screen-bacaan').scrollTop = 0;
    }
    if (aksi === 'tutup') { bacaanDibuka = null; renderBacaan(); }
    if (aksi === 'indo') { tampilIndo = !tampilIndo; renderBacaan(); }
    if (aksi === 'dengar') {
        const b = BACAAN.find((x) => x.id === bacaanDibuka);
        bacakan(b.baris[Number(btn.dataset.i)].bali);
    }
    if (aksi === 'selesai' && !progres.bacaanSelesai.includes(bacaanDibuka)) {
        progres.bacaanSelesai.push(bacaanDibuka);
        tambah({ xp: 15, koin: 3 });
        toast('Bacaan selesai! +15 XP');
        setelahAksi();
    }
});

// ==========================================
// BLOK 11: MULAI APLIKASI
// ==========================================
(function mulai() {
    const kunciSesi = baca(KUNCI.sesi, null);
    const semua = baca(KUNCI.pengguna, {});
    if (kunciSesi && semua[kunciSesi]) mulaiSesi(kunciSesi, semua[kunciSesi].nama);
    terapkanSetelan();
    segarkanSemua();
})();