import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDa-LaeUGH1LN2YhwkNrlagJtxywIKln-E",
  authDomain: "pkl-cbt.firebaseapp.com",
  projectId: "pkl-cbt",
  storageBucket: "pkl-cbt.firebasestorage.app",
  messagingSenderId: "1012566290145",
  appId: "1:1012566290145:web:a6c60d5a6f9109e6fcd1a0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let editId = null;
let statusUjianAktif = true;

// Helper Loading
const showLoading = (title = "Mohon tunggu...") => {
  Swal.fire({
    title: title,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

// --- PROTEKSI HALAMAN (SATURASI NOC) ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Jika tidak ada user login, tendang balik ke login.html
    window.location.href = "login.html";
  } else {
    // Jika login valid, tampilkan body
    document.body.style.display = "block";
    console.log("Admin Terverifikasi:", user.email);
  }
});

window.logout = async () => {
  const res = await Swal.fire({
    title: "Logout?",
    text: "Sesi admin akan berakhir.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Keluar",
  });
  if (res.isConfirmed) {
    await signOut(auth);
  }
};

// ==========================================
// --- KELOLA SOAL ---
// ==========================================

window.loadSoalAdmin = async () => {
  const container = document.getElementById("list-soal-admin");
  if (!container) return;
  container.innerHTML = '<p class="text-slate-400">Memuat daftar soal...</p>';

  try {
    const q = query(collection(db, "soal_ujian"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML =
        '<p class="text-slate-400 italic text-center py-4">Belum ada soal terdaftar.</p>';
      return;
    }

    let nomor = 1;
    snapshot.forEach((docSnap) => {
      const s = docSnap.data();
      const id = docSnap.id;
      const cleanOpt = s.pilihan.map((p) => p.replace(/^[A-D]\.\s/, ""));

      container.innerHTML += `
        <div class="p-4 bg-white border border-slate-200 rounded-2xl relative shadow-sm mb-4">
            <div class="absolute top-4 right-4 flex gap-2">
                <button onclick="prepareEditSoal('${id}', \`${s.pertanyaan}\`, \`${cleanOpt[0]}\`, \`${cleanOpt[1]}\`, \`${cleanOpt[2]}\`, \`${cleanOpt[3]}\`, '${s.kunci}')" 
                    class="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onclick="hapusSoal('${id}')" class="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
            <div class="flex gap-3">
                <span class="flex-none flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-500 font-bold rounded-lg text-sm">${nomor++}</span>
                <div class="flex-1">
                    <p class="font-bold text-slate-800 pr-20 pt-1">${s.pertanyaan}</p>
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        ${s.pilihan
                          .map(
                            (p) => `
                            <div class="text-sm p-2 border rounded-lg ${p.startsWith(s.kunci) ? "bg-green-50 border-green-200 text-green-700 font-bold" : "bg-slate-50 border-slate-100 text-slate-600"}">
                                ${p}
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        </div>`;
    });
  } catch (e) {
    container.innerHTML = "Gagal memuat: " + e.message;
  }
};

window.prepareEditSoal = (id, pert, pA, pB, pC, pD, kunci) => {
  document.getElementById("input-pertanyaan").value = pert;
  document.getElementById("opt1").value = pA;
  document.getElementById("opt2").value = pB;
  document.getElementById("opt3").value = pC;
  document.getElementById("opt4").value = pD;
  document.getElementById("input-kunci").value = kunci;
  editId = id;
  const btn = document.getElementById("btn-simpan-soal");
  btn.innerText = "Update Soal Sekarang";
  btn.classList.replace("bg-green-600", "bg-orange-500");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

document.getElementById("btn-simpan-soal").onclick = async () => {
  const pert = document.getElementById("input-pertanyaan").value.trim();
  const p1 = document.getElementById("opt1").value.trim();
  const p2 = document.getElementById("opt2").value.trim();
  const p3 = document.getElementById("opt3").value.trim();
  const p4 = document.getElementById("opt4").value.trim();
  const kunci = document.getElementById("input-kunci").value;

  if (!pert || !p1 || !p2 || !p3 || !p4 || !kunci)
    return Swal.fire("Gagal", "Harap lengkapi semua data soal!", "error");

  showLoading("Menyimpan soal...");

  try {
    const dataSoal = {
      pertanyaan: pert,
      pilihan: [`A. ${p1}`, `B. ${p2}`, `C. ${p3}`, `D. ${p4}`],
      kunci: kunci,
      updatedAt: serverTimestamp(),
    };

    if (editId) {
      await updateDoc(doc(db, "soal_ujian", editId), dataSoal);
      Swal.fire("Berhasil", "Soal telah diperbarui", "success").then(() =>
        location.reload(),
      );
    } else {
      dataSoal.createdAt = serverTimestamp();
      await addDoc(collection(db, "soal_ujian"), dataSoal);
      Swal.fire("Berhasil", "Soal baru telah ditambahkan", "success").then(() =>
        location.reload(),
      );
    }
  } catch (e) {
    Swal.fire("Error", e.message, "error");
  }
};

window.hapusSoal = async (id) => {
  const res = await Swal.fire({
    title: "Hapus Soal?",
    text: "Soal akan dihapus secara permanen!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Ya, Hapus!",
  });

  if (res.isConfirmed) {
    showLoading("Menghapus soal...");
    await deleteDoc(doc(db, "soal_ujian", id));
    Swal.fire("Terhapus", "Soal berhasil dihapus", "success");
    window.loadSoalAdmin();
  }
};

// ==========================================
// --- KELOLA SEKOLAH ---
// ==========================================

window.loadSekolahAdmin = async () => {
  const list = document.getElementById("list-sekolah-admin");
  if (!list) return;
  const snapshot = await getDocs(collection(db, "daftar_sekolah"));
  list.innerHTML = "";
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;
    list.innerHTML += `
      <li class="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white transition-all">
        <span class="font-medium text-slate-700">${data.nama}</span>
        <div class="flex gap-2">
          <button onclick="editSekolah('${id}', '${data.nama}')" class="text-blue-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
          <button onclick="hapusSekolah('${id}')" class="text-red-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
      </li>`;
  });
};

window.editSekolah = async (id, namaLama) => {
  const { value: namaBaru } = await Swal.fire({
    title: "Ubah Nama Sekolah",
    input: "text",
    inputValue: namaLama,
    showCancelButton: true,
    inputValidator: (value) => {
      if (!value) return "Nama tidak boleh kosong!";
    },
  });
  if (namaBaru) {
    showLoading("Memperbarui nama sekolah...");
    await updateDoc(doc(db, "daftar_sekolah", id), { nama: namaBaru.trim() });
    Swal.close();
    window.loadSekolahAdmin();
  }
};

window.hapusSekolah = async (id) => {
  const res = await Swal.fire({
    title: "Hapus Sekolah?",
    icon: "warning",
    showCancelButton: true,
  });
  if (res.isConfirmed) {
    await deleteDoc(doc(db, "daftar_sekolah", id));
    window.loadSekolahAdmin();
    Swal.fire("Berhasil", "Sekolah dihapus", "success");
  }
};

document.getElementById("btn-simpan-sekolah").onclick = async () => {
  const nama = document.getElementById("input-sekolah").value.trim();
  if (!nama) return Swal.fire("Peringatan", "Isi nama sekolah!", "warning");
  showLoading("Menambahkan sekolah...");
  await addDoc(collection(db, "daftar_sekolah"), { nama });
  Swal.fire({
    icon: "success",
    title: "Berhasil",
    timer: 1500,
    showConfirmButton: false,
  });
  document.getElementById("input-sekolah").value = "";
  window.loadSekolahAdmin();
};

// ==========================================
// --- KELOLA SISWA ---
// ==========================================

window.loadSiswaAdmin = async () => {
  const listSiswa = document.getElementById("list-siswa-admin");
  const selectSekolah = document.getElementById("select-sekolah-siswa");
  if (!listSiswa) return;
  listSiswa.innerHTML =
    "<tr><td colspan='3' class='text-center py-4'>Memuat data...</td></tr>";

  try {
    const snapSekolah = await getDocs(collection(db, "daftar_sekolah"));
    selectSekolah.innerHTML = '<option value="">-- Pilih Sekolah --</option>';
    snapSekolah.forEach(
      (d) =>
        (selectSekolah.innerHTML += `<option value="${d.data().nama}">${d.data().nama}</option>`),
    );

    const q = query(collection(db, "daftar_siswa"), orderBy("nama", "asc"));
    const snapSiswa = await getDocs(q);
    listSiswa.innerHTML = "";

    if (snapSiswa.empty) {
      listSiswa.innerHTML =
        "<tr><td colspan='3' class='text-center py-4 text-slate-400'>Belum ada data siswa.</td></tr>";
      return;
    }

    snapSiswa.forEach((docSnap) => {
      const s = docSnap.data();
      const id = docSnap.id;
      listSiswa.innerHTML += `
        <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
          <td class="py-3 px-4 font-medium text-slate-700">${s.nama}</td>
          <td class="py-3 px-4 text-slate-500 text-sm">${s.sekolah}</td>
          <td class="py-3 px-4 text-center flex justify-center gap-2">
            <button onclick="prepareEditSiswa('${id}', '${s.nama}', '${s.sekolah}')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onclick="hapusSiswa('${id}')" class="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </td>
        </tr>`;
    });
  } catch (e) {
    console.error(e);
  }
};

window.prepareEditSiswa = (id, nama, sekolah) => {
  document.getElementById("edit-id-siswa").value = id;
  document.getElementById("input-nama-siswa").value = nama;
  document.getElementById("select-sekolah-siswa").value = sekolah;
  const btn = document.getElementById("btn-simpan-siswa");
  btn.innerText = "Update Siswa";
  btn.className =
    "bg-orange-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

document.getElementById("btn-simpan-siswa").onclick = async () => {
  const idSiswa = document.getElementById("edit-id-siswa").value;
  const nama = document.getElementById("input-nama-siswa").value.trim();
  const sekolah = document.getElementById("select-sekolah-siswa").value;
  if (!nama || !sekolah) return Swal.fire("Gagal", "Lengkapi data!", "warning");
  showLoading("Menyimpan...");
  try {
    if (idSiswa) {
      await updateDoc(doc(db, "daftar_siswa", idSiswa), { nama, sekolah });
    } else {
      await addDoc(collection(db, "daftar_siswa"), {
        nama,
        sekolah,
        createdAt: serverTimestamp(),
      });
    }
    Swal.fire({
      icon: "success",
      title: "Berhasil",
      timer: 1500,
      showConfirmButton: false,
    });
    document.getElementById("edit-id-siswa").value = "";
    document.getElementById("input-nama-siswa").value = "";
    document.getElementById("btn-simpan-siswa").innerText = "Tambah";
    document.getElementById("btn-simpan-siswa").className =
      "bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition-all";
    window.loadSiswaAdmin();
  } catch (e) {
    Swal.fire("Error", e.message, "error");
  }
};

window.hapusSiswa = async (id) => {
  const res = await Swal.fire({
    title: "Hapus Siswa?",
    icon: "warning",
    showCancelButton: true,
  });
  if (res.isConfirmed) {
    await deleteDoc(doc(db, "daftar_siswa", id));
    window.loadSiswaAdmin();
  }
};

// ==========================================
// --- HASIL UJIAN (DEBUG & SYNC) ---
// ==========================================

// --- HASIL UJIAN (UPDATE DENGAN INDIKATOR LENGKAP) ---
window.loadHasilUjian = async () => {
  const container = document.getElementById("list-hasil");
  if (!container) return;

  container.innerHTML =
    '<div class="col-span-full py-10 text-center text-blue-500 font-bold animate-pulse">Sync Data Hasil...</div>';

  try {
    const q = query(
      collection(db, "hasil_ujian"),
      orderBy("waktu_selesai", "desc"),
    );
    const snapshot = await getDocs(q);
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML =
        '<div class="col-span-full text-center py-10 bg-white rounded-3xl border-2 border-dashed border-slate-200">Belum ada data masuk.</div>';
      return;
    }

    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      const id = docSnap.id;
      const statusSeleksi = d.status_seleksi || "PENDING";

      let tgl = "-";
      if (d.waktu_selesai && d.waktu_selesai.toDate)
        tgl = d.waktu_selesai.toDate().toLocaleString("id-ID");

      const benar = d.benar || 0;
      const total = d.jumlah_soal || 0;
      const terjawab = d.terjawab || 0; // Mengambil data jumlah yang dijawab
      const isCurang = d.status === "DISKUALIFIKASI (CURANG)";

      const badgeColor =
        statusSeleksi === "DITERIMA"
          ? "bg-green-500"
          : statusSeleksi === "DITOLAK"
            ? "bg-red-500"
            : "bg-slate-400";

      container.innerHTML += `
        <div class="p-5 rounded-2xl shadow-sm border-2 transition-all bg-white border-slate-200 relative overflow-hidden">
            <div class="absolute top-0 right-0 px-3 py-1 ${badgeColor} text-white text-[10px] font-bold rounded-bl-xl uppercase">
                ${statusSeleksi}
            </div>

            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-bold text-slate-800">${d.nama || "User"}</h4>
                    <p class="text-xs text-blue-600 font-semibold">${d.asal_sekolah || "-"}</p>
                </div>
                <div class="flex gap-1">
                    <button onclick="updateStatusSeleksi('${id}', 'DITERIMA')" class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Terima Siswa">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button onclick="updateStatusSeleksi('${id}', 'DITOLAK')" class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Tolak Siswa">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <button onclick="hapusHasil('${id}')" class="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Hapus Data">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>

            ${
              isCurang
                ? '<div class="bg-red-600 text-white text-center py-2 rounded-xl font-bold text-xs mb-3">DISKUALIFIKASI</div>'
                : `<div class="grid grid-cols-2 gap-2 mb-3">
                <div class="bg-blue-50 p-2 rounded-xl text-center border border-blue-100">
                    <p class="text-[10px] font-bold text-blue-600 uppercase italic">Skor Akhir</p>
                    <p class="text-xl font-black text-slate-800">${total > 0 ? Math.round((benar / total) * 100) : 0}</p>
                </div>
                <div class="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                    <p class="text-[10px] font-bold text-slate-500 uppercase italic">Total Soal</p>
                    <p class="text-xl font-black text-slate-800">${total}</p>
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-2 text-center text-[10px] mb-3">
                <div class="bg-green-50 p-2 rounded-xl font-bold text-green-600">Benar<p class="text-slate-800 text-sm">${benar}</p></div>
                <div class="bg-red-50 p-2 rounded-xl font-bold text-red-600">Salah<p class="text-slate-800 text-sm">${total - benar}</p></div>
                <div class="bg-indigo-50 p-2 rounded-xl font-bold text-indigo-600">Terjawab<p class="text-slate-800 text-sm">${terjawab}</p></div>
            </div>`
            }

            <div class="pt-3 border-t text-[10px] text-slate-400 flex justify-between">
                <span>Waktu Selesai:</span>
                <span class="font-medium text-slate-500">${tgl}</span>
            </div>
        </div>`;
    });
  } catch (e) {
    console.error(e);
  }
};

// Fungsi Update Status Seleksi
window.updateStatusSeleksi = async (id, status) => {
  const confirm = await Swal.fire({
    title: `Konfirmasi ${status}?`,
    text: `Siswa akan melihat status ini saat mengecek di halaman depan.`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: status === "DITERIMA" ? "#10b981" : "#ef4444",
    confirmButtonText: `Ya, ${status}!`,
  });

  if (confirm.isConfirmed) {
    try {
      await updateDoc(doc(db, "hasil_ujian", id), {
        status_seleksi: status,
      });
      Swal.fire(
        "Berhasil",
        `Status siswa telah diperbarui menjadi ${status}`,
        "success",
      );
      window.loadHasilUjian();
    } catch (e) {
      Swal.fire("Error", "Gagal memperbarui status", "error");
    }
  }
};

window.hapusHasil = async (id) => {
  const res = await Swal.fire({
    title: "Hapus Hasil?",
    icon: "warning",
    showCancelButton: true,
  });
  if (res.isConfirmed) {
    await deleteDoc(doc(db, "hasil_ujian", id));
    window.loadHasilUjian();
  }
};

// ==========================================
// --- PENGATURAN ---
// ==========================================

window.loadSetting = async () => {
  const snap = await getDoc(doc(db, "pengaturan", "config_utama"));
  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("set-mulai").value = data.waktu_mulai;
    document.getElementById("set-durasi").value = data.durasi_menit;
    statusUjianAktif = data.is_active !== undefined ? data.is_active : true;
    updateUIKontrol();
  }
};

document.getElementById("btn-simpan-setting").onclick = async () => {
  const mulai = document.getElementById("set-mulai").value;
  const durasi = document.getElementById("set-durasi").value;
  if (!mulai || !durasi) return Swal.fire("Gagal", "Lengkapi data!", "warning");
  showLoading("Memperbarui...");
  await updateDoc(doc(db, "pengaturan", "config_utama"), {
    waktu_mulai: mulai,
    durasi_menit: parseInt(durasi),
  });
  Swal.fire("Berhasil", "Pengaturan disimpan", "success");
};

function updateUIKontrol() {
  const label = document.getElementById("label-status-ujian");
  const btn = document.getElementById("btn-toggle-ujian");
  const container = document.getElementById("status-kontrol-container");
  if (!label || !btn) return;
  label.innerText = statusUjianAktif
    ? "Status: UJIAN DIBUKA"
    : "Status: UJIAN DITUTUP";
  container.className = statusUjianAktif
    ? "p-5 rounded-2xl border-2 border-green-100 bg-green-50 flex items-center justify-between gap-4"
    : "p-5 rounded-2xl border-2 border-red-100 bg-red-50 flex items-center justify-between gap-4";
  btn.innerText = statusUjianAktif ? "Tutup Ujian" : "Buka Ujian";
  btn.className = `px-8 py-3 rounded-xl font-bold text-white transition-all ${statusUjianAktif ? "bg-red-600" : "bg-green-600"}`;
}

document.getElementById("btn-toggle-ujian").onclick = async () => {
  const res = await Swal.fire({
    title: statusUjianAktif ? "Tutup?" : "Buka?",
    icon: "question",
    showCancelButton: true,
  });
  if (res.isConfirmed) {
    await updateDoc(doc(db, "pengaturan", "config_utama"), {
      is_active: !statusUjianAktif,
    });
    statusUjianAktif = !statusUjianAktif;
    updateUIKontrol();
  }
};

// ==========================================
// --- REGISTER GLOBAL & INIT ---
// ==========================================
window.loadSoalAdmin = loadSoalAdmin;
window.loadSekolahAdmin = loadSekolahAdmin;
window.loadSiswaAdmin = loadSiswaAdmin;
window.loadHasilUjian = loadHasilUjian;
window.loadSetting = loadSetting;

document.addEventListener("DOMContentLoaded", () => {
  window.loadSoalAdmin(); // Memuat tab pertama otomatis
});
