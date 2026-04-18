import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
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

let daftarSoal = [];
let jawabanSiswa = {};
let sisaWaktu = 0;
let isSelesai = false;
let sedangPeringatan = false;
const user_nama = localStorage.getItem("user_nama") || "guest";
const cheatKey = `cheat_count_${user_nama.replace(/\s+/g, "_")}`;

async function initUjian() {
  const namaSiswa = localStorage.getItem("user_nama");
  if (!namaSiswa) return (window.location.href = "index.html");

  const displayNama = document.getElementById("display-nama");
  if (displayNama) displayNama.innerText = namaSiswa;

  const durasiMenit = parseInt(localStorage.getItem("exam_duration")) || 30;
  const sekarang = new Date().getTime();
  const storageKey = `exam_deadline_${namaSiswa.replace(/\s+/g, "_")}`;
  let deadline = localStorage.getItem(storageKey);

  if (!deadline) {
    deadline = sekarang + durasiMenit * 60 * 1000;
    localStorage.setItem(storageKey, deadline);
  }

  sisaWaktu = Math.floor((deadline - sekarang) / 1000);

  if (sisaWaktu <= 0) {
    // GANTI alert ke Swal
    await Swal.fire({
      icon: "warning",
      title: "Waktu Habis",
      text: "Waktu ujian Anda telah berakhir.",
      confirmButtonColor: "#3b82f6",
    });
    return kirimHasil();
  }

  try {
    const q = query(collection(db, "soal_ujian"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);

    // Reset daftar soal agar tidak duplikat jika init terpanggil lagi
    daftarSoal = [];
    snap.forEach((d) => daftarSoal.push({ id: d.id, ...d.data() }));

    if (daftarSoal.length > 0) {
      renderSoal();
      mulaiTimer();
      initAntiCheat();
      initAntiBack();
    } else {
      document.getElementById("quiz-container").innerHTML = "Belum ada soal.";
    }
  } catch (err) {
    console.error("Gagal ambil soal:", err);
  }
}

function initAntiCheat() {
  const modal = document.getElementById("anti-cheat-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalMsg = document.getElementById("modal-msg");
  const modalBtn = document.getElementById("modal-btn");

  // Ambil data pelanggaran dari localStorage (agar tetap ada setelah refresh)
  let hitung = parseInt(localStorage.getItem(cheatKey)) || 0;

  // Reset penanda refresh setiap kali halaman dimuat ulang
  sessionStorage.setItem("is_refreshing", "false");

  const jalankanDiskualifikasi = () => {
    isSelesai = true;
    modalTitle.innerText = "🚫 ANDA TERDISKUALIFIKASI";
    modalMsg.innerText =
      "Anda melanggar aturan sebanyak 2 kali. Anda otomatis didiskualifikasi.";
    modalBtn.innerText = "KELUAR & KIRIM LAPORAN";
    modalBtn.className =
      "w-full py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg";
    modal.classList.remove("hidden");

    modalBtn.onclick = async () => {
      modalBtn.disabled = true;
      modalBtn.innerText = "Memproses...";
      await kirimHasil(true);
    };
  };

  const deteksiCurang = () => {
    // CEK: Jika sedang refresh, abaikan deteksi curang
    const sedangRefresh = sessionStorage.getItem("is_refreshing");
    if (isSelesai || sedangPeringatan || sedangRefresh === "true") return;

    hitung++;
    localStorage.setItem(cheatKey, hitung);

    if (hitung === 1) {
      sedangPeringatan = true;
      modalTitle.innerText = "⚠️ PERINGATAN PERTAMA";
      modalMsg.innerText =
        "Jangan tinggalkan halaman ujian! Satu kali lagi, Anda akan didiskualifikasi.";
      modalBtn.innerText = "SAYA MENGERTI";
      modal.classList.remove("hidden");

      modalBtn.onclick = () => {
        modal.classList.add("hidden");
        sedangPeringatan = false;
      };
    } else if (hitung >= 2) {
      jalankanDiskualifikasi();
    }
  };

  // Penanda saat user menekan refresh (F5 / Tombol Reload)
  window.addEventListener("beforeunload", () => {
    sessionStorage.setItem("is_refreshing", "true");
  });

  // Listener Pindah Tab
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      deteksiCurang();
    }
  });

  // Cek saat refresh: jika sudah 2 kali melanggar, langsung kunci
  if (hitung >= 2) {
    setTimeout(() => {
      jalankanDiskualifikasi();
    }, 500);
  }
}

function initAntiBack() {
  // Masukkan state palsu ke history segera (Double push untuk stabilitas)
  window.history.pushState(null, null, window.location.href);
  window.history.pushState(null, null, window.location.href);

  window.onpopstate = function () {
    // Jika mencoba kembali, dorong lagi ke state saat ini
    window.history.pushState(null, null, window.location.href);

    Swal.fire({
      icon: "warning",
      title: "Akses Dibatasi!",
      text: "Tombol kembali dinonaktifkan. Selesaikan ujian Anda terlebih dahulu.",
      confirmButtonColor: "#3b82f6",
    });
  };

  // Tambahan: Peringatan Browser saat mencoba tutup tab/refresh
  window.addEventListener("beforeunload", (e) => {
    if (!isSelesai) {
      // Menandai sedang refresh agar anticheat tidak bertambah (digunakan di initAntiCheat)
      sessionStorage.setItem("is_refreshing", "true");

      // Standar browser untuk memunculkan dialog konfirmasi
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

function renderSoal() {
  const container = document.getElementById("quiz-container");
  container.innerHTML = "";
  daftarSoal.forEach((soal, index) => {
    const soalDiv = document.createElement("div");
    soalDiv.className =
      "mb-8 p-6 bg-white rounded-xl border border-slate-200 shadow-sm";
    let pilihanHtml = "";
    soal.pilihan.forEach((opt) => {
      pilihanHtml += `
        <label class="flex items-center p-4 border-2 border-slate-50 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 group mb-2">
          <input type="radio" name="soal_${soal.id}" value="${opt}" class="w-5 h-5 text-blue-600" onchange="pilihJawaban('${soal.id}', '${opt}')">
          <span class="ml-4 text-slate-700 group-has-[:checked]:text-blue-900">${opt}</span>
        </label>
      `;
    });
    soalDiv.innerHTML = `<h3 class="text-lg font-bold text-slate-800 mb-5">${index + 1}. ${soal.pertanyaan}</h3><div class="grid grid-cols-1 gap-2">${pilihanHtml}</div>`;
    container.appendChild(soalDiv);
  });
  document.getElementById("loading-spinner")?.classList.add("hidden");
  container.classList.remove("hidden");
  document.getElementById("footer-action")?.classList.remove("hidden");
}

window.pilihJawaban = (idSoal, pilihan) => {
  jawabanSiswa[idSoal] = pilihan;
};

function mulaiTimer() {
  const timerElement = document.getElementById("timer");
  const t = setInterval(async () => {
    if (sisaWaktu <= 0) {
      clearInterval(t);
      timerElement.innerText = "00:00";
      if (!isSelesai) {
        // GANTI alert ke Swal
        await Swal.fire({
          icon: "error",
          title: "Waktu Habis!",
          text: "Jawaban Anda akan dikirim otomatis.",
          timer: 3000,
          showConfirmButton: false,
        });
        kirimHasil();
      }
      return;
    }
    let m = Math.floor(sisaWaktu / 60);
    let d = sisaWaktu % 60;
    timerElement.innerText = `${m.toString().padStart(2, "0")}:${d.toString().padStart(2, "0")}`;
    sisaWaktu--;
  }, 1000);
}

async function kirimHasil(isCurang = false) {
  isSelesai = true;
  const btn = document.getElementById("submit-btn");
  const namaSiswa = localStorage.getItem("user_nama");
  const storageKey = `exam_deadline_${namaSiswa ? namaSiswa.replace(/\s+/g, "_") : "guest"}`;

  // Tampilkan Loading SweetAlert
  Swal.fire({
    title: isCurang ? "Diskualifikasi Terdeteksi" : "Mengirim Jawaban...",
    text: "Mohon tunggu sebentar, data sedang disimpan ke server.",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  if (btn) {
    btn.disabled = true;
    btn.innerText = isCurang ? "Diskualifikasi..." : "Mengirim...";
  }

  let benar = 0;
  let salah = 0;

  if (!isCurang) {
    daftarSoal.forEach((soal) => {
      const jawabanSiswaTertulis = jawabanSiswa[soal.id];
      if (jawabanSiswaTertulis && jawabanSiswaTertulis.startsWith(soal.kunci)) {
        benar++;
      } else {
        salah++;
      }
    });
  }

  try {
    await addDoc(collection(db, "hasil_ujian"), {
      nama: namaSiswa,
      asal_sekolah: localStorage.getItem("user_sekolah"),
      jawaban: jawabanSiswa,
      jumlah_soal: daftarSoal.length,
      terjawab: Object.keys(jawabanSiswa).length,
      benar: benar,
      salah: salah,
      status: isCurang ? "DISKUALIFIKASI (CURANG)" : "NORMAL",
      waktu_selesai: serverTimestamp(),
    });

    // Tutup Loading
    Swal.close();

    if (!isCurang) {
      await Swal.fire({
        icon: "success",
        title: "Ujian Selesai!",
        text: `Jawaban berhasil dikirim.`,
        confirmButtonColor: "#3b82f6",
      });
    }

    // Bersihkan Sesi
    localStorage.removeItem(storageKey);
    localStorage.removeItem("user_nama");
    localStorage.removeItem("user_sekolah");
    localStorage.removeItem("exam_duration");
    sessionStorage.removeItem("p_count");
    localStorage.removeItem(cheatKey);

    window.location.href = "index.html";
  } catch (e) {
    console.error("Gagal simpan:", e);
    Swal.fire({
      icon: "error",
      title: "Gagal Mengirim",
      text: "Terjadi kesalahan pada koneksi. Pastikan internet Anda stabil.",
    });
    if (isCurang) window.location.href = "index.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnSubmit = document.getElementById("submit-btn");
  if (btnSubmit) {
    btnSubmit.onclick = () => {
      // GANTI confirm ke Swal.fire dengan konfirmasi
      Swal.fire({
        title: "Selesai Ujian?",
        text: "Pastikan semua jawaban sudah terisi dengan benar.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3b82f6",
        cancelButtonColor: "#94a3b8",
        confirmButtonText: "Ya, Kirim Sekarang",
        cancelButtonText: "Batal",
      }).then((result) => {
        if (result.isConfirmed) {
          kirimHasil();
        }
      });
    };
  }
  initUjian();
});
