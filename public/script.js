// SorSinggih - script.js (UI baru). Fitur aktif: terjemahan (Indo<->Bali), input suara, kamera AI scan, chat dengan Hanoman.
const $ = (id) => document.getElementById(id);
const FALLBACK_IMG = 'img/hanoman-head.png'; // dipakai bila aset maskot belum ada

// ---------- Gambar cadangan
document.addEventListener('error', (e) => {
    const im = e.target;
    if (im.tagName !== 'IMG') return;
    if (im.dataset.fb === 'remove') return im.remove();
    if (im.dataset.fb !== '1') { im.dataset.fb = '1'; im.src = FALLBACK_IMG; }
}, true);

// ---------- Toast
let tTimer;
function toast(pesan) {
    const el = $('toast');
    el.textContent = pesan; el.classList.add('show');
    clearTimeout(tTimer);
    tTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ---------- Animasi perpindahan halaman
function ulang(el, kelas) { el.classList.remove(kelas); void el.offsetWidth; el.classList.add(kelas); }
let lagiPindah = false;
// arah: 'maju' (halaman baru masuk dari kanan) atau 'mundur' (dari kiri)
function pindah(dari, ke, arah) {
    if (lagiPindah) return;
    lagiPindah = true;
    dari.classList.add('out-' + arah);
    setTimeout(() => {
        dari.classList.add('hidden'); dari.classList.remove('out-' + arah);
        ke.classList.remove('hidden');
        ke.classList.add('in-' + arah);
        window.scrollTo(0, 0);
        setTimeout(() => { ke.classList.remove('in-' + arah); lagiPindah = false; }, 260);
    }, 120);
}

// ---------- Welcome
const LANGKAH = [
    { t: 'Om Swastiastu! Selamat datang di SorSinggih. Yuk, belajar bahasa Bali bersama!', img: 'wave', btn: null },
    { t: 'Udah siap belum? buat belajar', img: 'wave', btn: 'Ayoo mulai' },
    { t: 'yukkk gasss keuuuuunnnn......', img: 'cheer', btn: 'Langsung masuk' }
];
let wi = 0, wTimer;
let wTok = 0;
const caret = Object.assign(document.createElement('span'), { className: 'caret' });
function tampilWelcome(i) {
    wi = i; clearTimeout(wTimer);
    const tok = ++wTok, s = LANGKAH[i];
    const teks = $('w-text'), mas = $('w-mascot'), btn = $('w-btn');
    // Hanoman masuk dari bawah; bila gambarnya berganti, yang lama keluar dulu
    const masuk = () => { mas.classList.remove('sink'); mas.dataset.fb = ''; mas.src = 'img/hanoman-' + s.img + '.png'; mas.dataset.cur = s.img; ulang(mas, 'rise'); };
    if (mas.dataset.cur && mas.dataset.cur !== s.img) { ulang(mas, 'sink'); setTimeout(() => { if (tok === wTok) masuk(); }, 160); }
    else if (!mas.dataset.cur) masuk();
    btn.classList.add('invis');
    document.querySelectorAll('.w-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    teks.textContent = ''; ulang(teks, 'pop');

    const selesai = () => {
        if (tok !== wTok) return;
        caret.remove();
        if (s.btn) { btn.textContent = s.btn; btn.classList.remove('invis'); ulang(btn, 'pop'); }
        else wTimer = setTimeout(() => tampilWelcome(i + 1), 500); // layar 1 lanjut sendiri
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { teks.textContent = s.t; return selesai(); }

    // Teks diketik huruf demi huruf
    let n = 0;
    const ketik = () => {
        if (tok !== wTok) return;
        n++; teks.textContent = s.t.slice(0, n); teks.appendChild(caret);
        if (n >= s.t.length) return selesai();
        // Jeda panjang hanya setelah tanda baca tunggal; titik berderet ("......") diketik cepat
        const tanda = /[.,!?]/;
        wTimer = setTimeout(ketik, tanda.test(s.t[n - 1]) && !tanda.test(s.t[n]) ? 600 : 25);
    };
    wTimer = setTimeout(() => {
        if (tok !== wTok) return;
        ketik();
    }, 400);
}
$('w-btn').addEventListener('click', () => {
    if (wi < LANGKAH.length - 1) tampilWelcome(wi + 1);
    else pindah($('welcome'), $('app'), 'maju');
});
// Layar 1 lanjut sendiri ke layar 2 (tanpa klik). Tombol hanya ada di layar 2 dan 3.
tampilWelcome(0);

// ---------- Pilihan lawan bicara (nilai harus sama dengan kunci PANDUAN_TINGKAT di server.js)
const ROLES = [
    { v: 'Guru/Dosen', ik: 'cap' }, { v: 'Orang Tua', ik: 'users' },
    { v: 'Pemuka Agama', ik: 'hands' }, { v: 'Teman Sebaya', ik: 'group' }
];
let lawan = 'Guru/Dosen';
['roles-main', 'roles-sess'].forEach((id) => {
    $(id).innerHTML = ROLES.map((r) =>
        '<button type="button" class="role" data-v="' + r.v + '" aria-pressed="false"><svg class="ic"><use href="#i-' + r.ik + '"/></svg>' +
        '<span>' + r.v + '</span><svg class="ic tick"><use href="#i-check"/></svg></button>').join('');
});
function setLawan(v) {
    lawan = v;
    document.querySelectorAll('.role').forEach((b) => {
        const on = b.dataset.v === v;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    });
}
document.addEventListener('click', (e) => { const b = e.target.closest('.role'); if (b) setLawan(b.dataset.v); });
setLawan(lawan);

// ---------- Mode panel: text | voice | camera
const panel = $('panel');
function setMode(m) {
    panel.dataset.mode = m;
    if (m !== 'voice' && rekam) rekam.abort();
    if (m === 'camera') bukaKamera(); else tutupKamera();
}
$('c-back').addEventListener('click', () => setMode('text'));
$('c-cam').addEventListener('click', () => setMode('camera'));

// ---------- Kamera (getUserMedia) + scan
let camStream = null, camBuka = false;
async function bukaKamera() {
    if (camStream || camBuka) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setMode('text'); return toast('Browser ini belum mendukung kamera.'); }
    camBuka = true;
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
        if (panel.dataset.mode !== 'camera') { s.getTracks().forEach((t) => t.stop()); return; } // keluar mode sebelum izin selesai
        camStream = s; $('cam-video').srcObject = s;
    } catch (err) {
        setMode('text'); toast('Kamera tidak bisa dibuka. Pastikan izin kamera aktif.');
    } finally { camBuka = false; }
}
function tutupKamera() {
    if (camStream) camStream.getTracks().forEach((t) => t.stop());
    camStream = null; $('cam-video').srcObject = null;
}
$('btn-shutter').addEventListener('click', () => {
    const v = $('cam-video');
    if (!camStream || !v.videoWidth) return toast('Kamera belum siap.');
    // Perkecil ke maks 1024px dan JPEG 0.7 supaya kiriman kecil dan hemat token
    const skala = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * skala); c.height = Math.round(v.videoHeight * skala);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const gambar = c.toDataURL('image/jpeg', 0.7).split(',')[1];
    setMode('text');                                   // menutup kamera
    panggil('scan', { gambar, lawanBicara: lawan });
});

// ---------- Terjemahan
const ARAH = {
    ubah: { api: '/api/ubah', ph: 'Type This way when you wanna translate to bahasa bali', badge: 'Hasil Terjemahan', kosong: 'Ketik atau ucapkan kalimat dulu ya!' },
    pahami: { api: '/api/pahami', ph: 'Tulis kalimat bahasa Bali yang ingin kamu pahami', badge: 'Arti dalam Indonesia', kosong: 'Tulis kalimat bahasa Bali dulu ya!' },
    scan: { api: '/api/scan', badge: 'Hasil Scan' }
};
const roles = $('roles-main');
function setArah() {
    const a = ARAH[$('arah').value];
    $('kalimat').placeholder = a.ph;
    $('hasil').classList.add('hidden');
    roles.classList.toggle('off', $('arah').value === 'pahami'); // Bali->Indo tidak butuh lawan bicara
}
$('arah').addEventListener('change', setArah);

function baris(utama, tag, sub) {
    const d = document.createElement('div'); d.className = 'r-item';
    const s = document.createElement('strong'); s.textContent = utama; d.appendChild(s);
    if (tag) { const t = document.createElement('span'); t.textContent = tag; d.appendChild(t); }
    if (sub) { const p = document.createElement('small'); p.textContent = sub; d.appendChild(p); }
    return d;
}
function tampilHasil(mode, d) {
    $('r-badge').textContent = ARAH[mode].badge;
    $('r-teks').textContent = d.hasil;
    $('r-jelas').textContent = mode === 'ubah'
        ? 'Alasan: ' + (d.penjelasan || '-')
        : mode === 'scan'
        ? 'Teks terbaca: ' + (d.teksAsli || '-') + '. ' + (d.penjelasan || '')
        : (d.tingkatTerdeteksi ? 'Tingkat tutur: ' + d.tingkatTerdeteksi + '. ' : '') + (d.penjelasan || '');
    const list = $('r-list'); list.replaceChildren();
    (Array.isArray(d.pilihanKata) ? d.pilihanKata : []).slice(0, 5).forEach((k) => {
        const [a, b] = mode === 'ubah' ? [k.bali, k.indo] : [k.bali, k.indo];
        list.appendChild(baris(String(a), String(k.tingkat || ''), String(b || '')));
    });
    $('hasil').classList.remove('hidden');
    $('hasil').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

let sibuk = false;
function kirim() {
    const mode = $('arah').value, kalimat = $('kalimat').value.trim();
    if (!kalimat) return toast(ARAH[mode].kosong);
    return panggil(mode, { kalimat, lawanBicara: lawan });
}
// Pemanggil bersama untuk terjemahan (ubah/pahami) dan scan kamera
async function panggil(mode, body) {
    if (sibuk) return;
    sibuk = true; $('btn-kirim').disabled = true;
    // Animasi memuat ditampilkan di kartu hasil (bukan di tombol kirim)
    const kartu = $('hasil'); let tampil = false;
    kartu.classList.add('memuat'); kartu.classList.remove('hidden');
    kartu.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try {
        const r = await fetch(ARAH[mode].api, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const j = await r.json();
        if (j.success) { if (mode === 'scan' || mode === $('arah').value) { tampilHasil(mode, j.data); tampil = true; } }
        else toast(j.error || 'Terjadi kesalahan.');
    } catch (err) {
        console.error(err); toast('Gagal terhubung ke server. Cek koneksi internetmu.');
    } finally {
        sibuk = false; $('btn-kirim').disabled = false;
        kartu.classList.remove('memuat');
        if (!tampil) kartu.classList.add('hidden');   // gagal / pindah mode: sembunyikan kartu
    }
}
$('btn-kirim').addEventListener('click', kirim);
$('kalimat').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) kirim(); });
$('btn-salin').addEventListener('click', () => {
    const t = $('r-teks').textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Hasil disalin.'), () => toast('Gagal menyalin.'));
});

// ---------- Input suara (Web Speech API, bahasa Indonesia)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rekam = null;
$('c-mic').addEventListener('click', () => {
    if (!SR) return toast('Browser ini belum mendukung input suara.');
    if (rekam) { rekam.stop(); return; }
    setMode('voice');
    const r = new SR(); rekam = r;
    r.lang = 'id-ID'; r.interimResults = false;
    let dapat = false;
    r.onresult = (ev) => { dapat = true; $('kalimat').value = ev.results[0][0].transcript; };
    r.onerror = (ev) => { if (ev.error !== 'aborted') toast('Gagal merekam. Pastikan izin mikrofon aktif.'); };
    r.onend = () => {
        if (rekam === r) rekam = null;
        if (panel.dataset.mode === 'voice') setMode('text');
        if (dapat) kirim();
    };
    r.start();
});

// ---------- Kosa Kata (data contoh; tim Riset perlu memvalidasi dan menambah)
const KATA = [
    { indo: 'Makan Nasi', bali: 'Medar/Naar' },
    { indo: 'Berjalan', bali: 'Mejalan/Mamargi' }
];
let ki = 0;
function tampilKata() { $('k-indo').textContent = KATA[ki].indo; $('k-bali').textContent = KATA[ki].bali; }
// Animasi membalik halaman dengan lekukan. Lembar lama (salinan isi kartu) dikelupas dari pojok kiri atas ke arah kanan (selalu sama).
// Kertas yang terangkat membentuk gulungan silinder di garis lipat (.k-roll) lalu menjadi sisi belakang hitam yang
// menutupi lembar lama (.k-flap). Kata baru sudah terpasang di bawahnya. Semua dihitung per frame dalam piksel.
let kSibuk = false;
// Memotong poligon dengan setengah bidang f(p) >= 0 (Sutherland-Hodgman)
function potong(poly, f) {
    const out = [];
    poly.forEach((a, i) => {
        const b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
        if (fa >= 0) out.push(a);
        if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    });
    return out;
}
// Menambah titik di sepanjang sisi poligon supaya pemetaan yang tidak linear menghasilkan tepi yang melengkung
function rapat(poly, k) {
    const out = [];
    poly.forEach((a, i) => {
        const b = poly[(i + 1) % poly.length];
        for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
    });
    return out;
}
// Bentuk pada kemajuan t (0..1). Pojok kanan atas "dipegang" lalu ditarik ke kiri-bawah ke titik M; garis lipat adalah garis
// tengah tegak lurus antara pojok asal C dan M, sehingga sudutnya berputar. Jarak d = kedalaman dari garis lipat ke sisi yang terkelupas.
// Kertas dimodelkan menggulung pada silinder berjari-jari R_GULUNG:
//   d < pi*R/2          -> gulungan (roll), posisi geser = d - R*sin(d/R)
//   d >= pi*R           -> sisi belakang datar (flap), posisi geser = 2d - pi*R
function bentukKupas(W, H, t) {
    const kotak = [[0, 0], [W, 0], [W, H], [0, H]], R_GULUNG = 22;
    if (t <= 0.0001) return { K: kotak, G: [], F: [] };
    const C = [W, 0], M = [W - t * 2.3 * W, t * 0.5 * H];
    const dx = M[0] - C[0], dy = M[1] - C[1], len = Math.hypot(dx, dy), n = [dx / len, dy / len];
    const mid = [(C[0] + M[0]) / 2, (C[1] + M[1]) / 2];
    const u = (p) => (p[0] - mid[0]) * n[0] + (p[1] - mid[1]) * n[1];   // >= 0: sisi yang tetap
    const d = (p) => -u(p);
    const K = potong(kotak, u);
    const terkelupas = potong(kotak, d);
    const geser = (p, g) => [p[0] + g * n[0], p[1] + g * n[1]];
    const G = rapat(potong(terkelupas, (p) => Math.PI * R_GULUNG / 2 - d(p)), 10)
        .map((p) => geser(p, d(p) - R_GULUNG * Math.sin(Math.max(0, d(p)) / R_GULUNG)));
    const F = potong(terkelupas, (p) => d(p) - Math.PI * R_GULUNG + 3).map((p) => geser(p, 2 * d(p) - Math.PI * R_GULUNG));
    return { K, G, F, mid, n, D: len / 2, R: R_GULUNG };
}
const klip = (poly, W, kiri) => poly.length < 3 ? 'polygon(0 0,0 0,0 0)'
    : 'polygon(' + poly.map(([x, y]) => (kiri ? W - x : x).toFixed(1) + 'px ' + y.toFixed(1) + 'px').join(',') + ')';
$('k-next').addEventListener('click', () => {
    if (kSibuk) return;                       // abaikan klik beruntun selama animasi berjalan
    kSibuk = true;
    const kartu = document.querySelector('.kosa'), tombol = $('k-next');
    ulang(tombol, 'spin');
    const ganti = () => { ki = (ki + 1) % KATA.length; tampilKata(); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { ganti(); kSibuk = false; return; }

    // 1) potret halaman lama + lapisan flap
    const kiri = true;   // selalu dikupas dari pojok kiri atas, ditarik ke kanan
    const wadah = document.createElement('div'), lembar = document.createElement('div'), gulung = document.createElement('div'), flap = document.createElement('div');
    wadah.className = 'k-peel' + (kiri ? ' kiri' : ''); wadah.setAttribute('aria-hidden', 'true');
    lembar.className = 'k-sheet'; gulung.className = 'k-roll'; flap.className = 'k-flap';
    [...kartu.children].forEach((c) => {
        if (c === tombol) return;
        const salin = c.cloneNode(true); salin.removeAttribute('id'); lembar.appendChild(salin);
    });
    wadah.append(lembar, gulung, flap); kartu.appendChild(wadah);
    // 2) halaman baru dipasang di bawah lembar lama
    ganti();
    // 3) kupas lembar lama per frame
    const W = kartu.clientWidth, H = kartu.clientHeight, DUR = 620;
    const ease = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const gambar = (t) => {
        const { K, G, F, mid, n, D, R } = bentukKupas(W, H, t);
        lembar.style.clipPath = klip(K, W, kiri);
        gulung.style.visibility = G.length < 3 ? 'hidden' : 'visible';
        gulung.style.clipPath = klip(G, W, kiri);
        flap.style.visibility = F.length < 3 ? 'hidden' : 'visible';
        flap.style.clipPath = klip(F, W, kiri);
        if (G.length < 3 && F.length < 3) return;
        // Satu gradasi putih untuk gulungan dan flap, searah tegak lurus garis lipat (P = posisi garis lipat):
        // tepi gulungan agak redup, sorotan putih di punggung silinder, lalu bayangan lembut di lipatan dan terang di sisi belakang
        const m = kiri ? [W - mid[0], mid[1]] : mid, nn = kiri ? [-n[0], n[1]] : n;
        const ox = nn[0] > 0 ? 0 : W, oy = nn[1] > 0 ? 0 : H;
        const P = (m[0] - ox) * nn[0] + (m[1] - oy) * nn[1], sudut = Math.atan2(nn[0], -nn[1]) * 180 / Math.PI;
        const px = (v) => (P + v).toFixed(1) + 'px';
        const bg = 'linear-gradient(' + sudut.toFixed(2) + 'deg,#dcdcdc ' + px(-R) + ',#ffffff ' + px(-R * .55) + ',#f2f2f2 ' + px(-R * .1) +
            ',#e6e6e6 ' + px(R * .2) + ',#fafafa ' + px(D * .45) + ',#f5f5f5 ' + px(D) + ')';
        gulung.style.background = bg; flap.style.background = bg;
    };
    gambar(0);
    const t0 = performance.now();
    const frame = (now) => {
        const t = Math.min(1, (now - t0) / DUR);
        gambar(ease(t));
        if (t < 1) requestAnimationFrame(frame); else { wadah.remove(); kSibuk = false; }
    };
    requestAnimationFrame(frame);
});
tampilKata();

// ---------- Pindah halaman utama <-> sesi chat
function bukaSesi(buka) {
    if (buka && panel.dataset.mode !== 'text') setMode('text');   // tutup kamera/suara di halaman utama
    if (!buka && rekamChat) rekamChat.abort();
    pindah($(buka ? 'view-main' : 'view-session'), $(buka ? 'view-session' : 'view-main'), buka ? 'maju' : 'mundur');
}
$('btn-sesi').addEventListener('click', () => bukaSesi(true));
// Seluruh kartu bisa diklik, bukan hanya tombol (pindah() sudah menolak panggilan ganda)
document.querySelector('.cta').addEventListener('click', () => bukaSesi(true));
$('s-back').addEventListener('click', () => bukaSesi(false));

// ---------- Chat dengan Hanoman
const riwayat = [];            // [{ peran: 'user' | 'hanoman', teks }], server hanya memakai 10 terakhir
let chatSibuk = false, rekamChat = null;
function gelembung(kelas, utama, arti) {
    const p = document.createElement('p'); p.className = 'msg ' + kelas;
    const s = document.createElement('span'); s.textContent = utama; p.appendChild(s);
    if (arti) { const a = document.createElement('small'); a.textContent = arti; p.appendChild(a); }
    const w = document.querySelector('.msgs'); w.appendChild(p); w.scrollTop = w.scrollHeight;
    return p;
}
async function kirimChat(teks) {
    teks = teks.trim().slice(0, 500);
    if (!teks || chatSibuk) return;
    chatSibuk = true; $('s-kirim').disabled = true; $('s-input').value = '';
    gelembung('user', teks);
    const tunggu = gelembung('ai', '...');
    riwayat.push({ peran: 'user', teks });
    try {
        const r = await fetch('/api/chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pesan: riwayat.slice(-10), lawanBicara: lawan })
        });
        const j = await r.json();
        if (!j.success) throw new Error(j.error || 'Terjadi kesalahan.');
        tunggu.remove();
        gelembung('ai', j.data.balasan, j.data.arti);
        riwayat.push({ peran: 'hanoman', teks: String(j.data.balasan) });
    } catch (err) {
        tunggu.remove(); riwayat.pop();   // pesan gagal tidak ikut masuk riwayat
        toast(err instanceof TypeError ? 'Gagal terhubung ke server. Cek koneksi internetmu.' : err.message);
    } finally {
        if (riwayat.length > 10) riwayat.splice(0, riwayat.length - 10);
        chatSibuk = false; $('s-kirim').disabled = false; $('s-input').focus();
    }
}
$('s-kirim').addEventListener('click', () => kirimChat($('s-input').value));
$('s-input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) kirimChat($('s-input').value); });
$('s-mic').addEventListener('click', () => {
    if (!SR) return toast('Browser ini belum mendukung input suara.');
    if (rekamChat) { rekamChat.stop(); return; }
    const r = new SR(); rekamChat = r;
    r.lang = 'id-ID'; r.interimResults = false;
    let dapat = '';
    $('s-mic').classList.add('rec');
    r.onresult = (ev) => { dapat = ev.results[0][0].transcript; };
    r.onerror = (ev) => { if (ev.error !== 'aborted') toast('Gagal merekam. Pastikan izin mikrofon aktif.'); };
    r.onend = () => {
        if (rekamChat === r) rekamChat = null;
        $('s-mic').classList.remove('rec');
        if (dapat) kirimChat(dapat);
    };
    r.start();
});

// ---------- Slideshow ekspresi Hanoman: SATU gambar, ekspresinya berganti bergantian
// (gaya ditulis di sini supaya tidak bergantung pada style.css)
(function () {
    const urut = ['hanoman-head.png', 'hanoman-wajah-senang.png', 'hanoman-wajah-kedip.png',
                  'hanoman-wajah-bingung.png', 'hanoman-hallo.png', 'hanoman-samping.png'];
    const DURASI = 1000, FADE = 120;  // ganti ekspresi tiap 1 detik
    const wadah = $('slides');
    const ukuran = 'clamp(96px,14vw,132px)';
    wadah.style.cssText = 'width:' + ukuran + ';height:' + ukuran + ';flex-shrink:0;position:relative';

    // Muat dulu; file yang belum ada dilewati supaya tidak muncul gambar rusak
    Promise.all(urut.map((f) => new Promise((ok) => {
        const p = new Image(); p.onload = () => ok('img/' + f); p.onerror = () => ok(null); p.src = 'img/' + f;
    }))).then((daftar) => {
        daftar = daftar.filter(Boolean);
        if (!daftar.length) return;
        const im = document.createElement('img');
        im.alt = ''; im.src = daftar[0];
        im.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;object-position:center bottom;' +
            'transition:opacity ' + FADE + 'ms ease,transform ' + FADE + 'ms ease';
        wadah.replaceChildren(im);
        if (daftar.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let i = 0, t;
        const ganti = () => {
            im.style.opacity = 0; im.style.transform = 'scale(.9)';
            setTimeout(() => {
                i = (i + 1) % daftar.length; im.src = daftar[i];
                im.style.opacity = 1; im.style.transform = 'none';
            }, FADE);
        };
        const jalan = () => { t = setInterval(ganti, DURASI); };
        document.addEventListener('visibilitychange', () => { clearInterval(t); if (!document.hidden) jalan(); });
        jalan();
    });
})();