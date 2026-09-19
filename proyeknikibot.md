# NIKISTORE Bot — Dokumentasi Proyek

## Struktur Folder

```
NIKISTORE/
├── index.js
├── config.js
├── package.json
├── lib/
│   ├── database.js
│   ├── functions.js
│   ├── wrapper.js
│   ├── digiflazz.js      # Digiflazz API wrapper
│   └── qris.js           # QRIS via NikiPay Gateway (create + cek status)
├── plugins/
│   ├── main/
│   │   ├── menu.js
│   │   ├── ping.js
│   │   ├── info.js
│   │   └── device.js
│   ├── topup/
│   │   ├── mobilelegend.js
│   │   ├── freefire.js
│   │   ├── pulsa.js
│   │   ├── kuota.js
│   │   └── token.js
│   ├── payment/
│   │   ├── deposit.js
│   │   ├── saldo.js
│   │   └── riwayat.js
│   ├── group/
│   │   ├── welcome.js
│   │   ├── left.js
│   │   ├── antilink.js
│   │   ├── antispam.js
│   │   ├── antikasar.js
│   │   ├── addkata.js
│   │   ├── delkata.js
│   │   └── listkata.js
│   └── owner/
│       ├── eval.js
│       ├── exec.js
│       ├── bc.js
│       ├── addproduk.js
│       ├── editproduk.js
│       ├── hapusproduk.js
│       └── ceksaldo.js
├── database/
│   ├── database.json
│   ├── datadigiflaz.json
│   └── nominal/
└── temp/
```

---

## Konfigurasi (config.js)

| Key | Keterangan |
|-----|-----------|
| `botName` | Nama bot |
| `prefix` | Prefix command (default: `.`) |
| `ownerNumber` | Array nomor owner |
| `pairingNumber` | Nomor untuk pairing code |
| `digiuser` | Username Digiflazz |
| `digiapi` | API Key Digiflazz |
| `nikipayUrl` | URL NikiPay Gateway (https://apipay.halogamingzone.com) |
| `nikipayKey` | API key NikiPay (buat di dashboard /app) |
| `hargaAdmin` | Biaya admin per transaksi (default: 400) |

---

## Flow Topup

### Via Saldo
1. User ketik `.mobilelegend <id>`
2. Bot stalk ID via duniagames API
3. Bot tampilkan daftar produk (button/teks sesuai device)
4. User pilih produk
5. Bot cek saldo user
6. Jika cukup → langsung proses ke Digiflazz/OkeConnect
7. Kirim receipt + SN ke user

### Via QRIS
1. User pilih produk tapi saldo kurang
2. Bot buat QRIS dinamis via NikiPay (`POST /api/v1/qris`)
3. User bayar via QRIS (5 menit)
4. Bot polling `GET /api/v1/qris/:id/status` setiap 5 detik
5. Jika lunas → proses topup otomatis
6. Kirim receipt + SN ke user

---

## Flow Deposit
1. User ketik `.deposit <nominal>`
2. Bot buat QRIS dinamis via NikiPay dengan nominal unik (+21-497)
3. User bayar via QRIS (5 menit)
4. Bot polling status NikiPay setiap 5 detik
5. Jika lunas → tambah saldo user
6. Notif ke user + owner

---

## Profit Calculation
- ≤ Rp 1.000 → 15%
- ≥ Rp 100.000 → 3%
- Di antara → linear interpolation
- + biaya admin Rp 400

---

## API Endpoints

| Tujuan | Method | URL |
|--------|--------|-----|
| Digiflazz Price List | POST | `https://api.digiflazz.com/v1/price-list` |
| Digiflazz Transaction | POST | `https://api.digiflazz.com/v1/transaction` |
| Digiflazz Cek Saldo | POST | `https://api.digiflazz.com/v1/cek-saldo` |
| NikiPay Buat QRIS | POST | `https://apipay.halogamingzone.com/api/v1/qris` (header `x-api-key`) |
| NikiPay Cek Status | GET | `https://apipay.halogamingzone.com/api/v1/qris/:id/status` |
| NikiPay Gambar QR | GET | `https://apipay.halogamingzone.com/qr/:id?download=1` |
| Stalk ID Game | POST | `https://api.duniagames.co.id/api/transaction/v1/top-up/inquiry/store` |

---

*Dibuat: 2026-05-30 · Update 2026-09-12: pembayaran QRIS pindah dari OkePay ke NikiPay Gateway*
