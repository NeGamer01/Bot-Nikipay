const { toRupiah } = require('../../lib/digiflazz')
const txLogger = require('../../lib/transactionLogger')

module.exports = {
  command: ['transfer', 'tf', 'kirim'],
  category: 'payment',
  desc: 'Transfer saldo ke user lain',

  async run({ conn, msg, args, text, db, config, prefix }) {
    const sender = msg.sender
    let penerimaLid = null

    // Cek apakah sudah ada pending transfer
    const user = db.getUser(sender)
    if (user.pendingTransfer) {
      // User sedang dalam proses transfer, cek response
      const pending = user.pendingTransfer
      const response = text.toLowerCase().trim()

      if (response === 'ya' || response === 'yes') {
        // Konfirmasi transfer
        const penerima = db.getUser(pending.tujuan)
        if (!penerima) {
          db.setUser(sender, { pendingTransfer: null })
          return conn.sendMessage(msg.from, {
            text: '❌ User tujuan tidak ditemukan!'
          }, { quoted: msg.original })
        }

        const senderSaldo = user.saldo || 0
        if (senderSaldo < pending.jumlah) {
          db.setUser(sender, { pendingTransfer: null })
          return conn.sendMessage(msg.from, {
            text: `❌ Saldo tidak cukup! Saldo kamu: Rp ${toRupiah(senderSaldo)}`
          }, { quoted: msg.original })
        }

        // Proses transfer
        const saldoBaruSender = senderSaldo - pending.jumlah
        const saldoBaruPenerima = (penerima.saldo || 0) + pending.jumlah

        // Saldo pengirim & penerima ditulis ke record asli (LID kalau ada)
        const penerimaKey = pending.penerimaLid || pending.tujuan
        db.setUser(sender, {
          saldo: saldoBaruSender,
          pendingTransfer: null
        })

        db.setUser(penerimaKey, {
          saldo: saldoBaruPenerima
        })

        // Catat transaksi
        const transaksi = {
          type: 'transfer_keluar',
          jumlah: pending.jumlah,
          tujuan: pending.tujuan,
          waktu: Date.now(),
          keterangan: `Transfer ke ${pending.tujuan.split('@')[0]}`
        }
        const riwayatSender = user.riwayat || []
        riwayatSender.unshift(transaksi)
        db.setUser(sender, { riwayat: riwayatSender.slice(0, 50) })

        const riwayatPenerima = penerima.riwayat || []
        riwayatPenerima.unshift({
          type: 'transfer_masuk',
          jumlah: pending.jumlah,
          dari: sender,
          waktu: Date.now(),
          keterangan: `Transfer dari ${sender.split('@')[0]}`
        })
        db.setUser(pending.tujuan, { riwayat: riwayatPenerima.slice(0, 50) })

        // Log transaksi transfer
        txLogger.log({
          type: 'transfer_keluar',
          status: 'sukses',
          user: sender,
          tujuan: pending.tujuan,
          jumlah: pending.jumlah
        })
        txLogger.log({
          type: 'transfer_masuk',
          status: 'sukses',
          user: pending.tujuan,
          dari: sender,
          jumlah: pending.jumlah
        })

        // Notifikasi ke pengirim
        await conn.sendMessage(msg.from, {
          text: `✅ *Transfer Berhasil!*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Jumlah:* Rp ${toRupiah(pending.jumlah)}\n*Ke:* @${pending.tujuan.split('@')[0]}\n*Saldo kamu sekarang:* Rp ${toRupiah(saldoBaruSender)}\n\n_${config.botName}_`,
          mentions: [pending.tujuan]
        }, { quoted: msg.original })

        // Notifikasi ke penerima (kirim ke LID kalau ada, biar sampai)
        const notifJid = pending.penerimaLid || pending.tujuan
        try {
          await conn.sendMessage(notifJid, {
            text: `💰 *Transfer Masuk!*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Jumlah:* Rp ${toRupiah(pending.jumlah)}\n*Dari:* @${sender.split('@')[0]}\n*Saldo kamu sekarang:* Rp ${toRupiah(saldoBaruPenerima)}\n\n_${config.botName}_`,
            mentions: [sender]
          })
        } catch (e) {
          console.log('[Transfer] Gagal kirim notifikasi ke penerima:', e.message)
        }

      } else if (response === 'batal' || response === 'no') {
        // Batal transfer
        db.setUser(sender, { pendingTransfer: null })
        await conn.sendMessage(msg.from, {
          text: '❌ Transfer dibatalkan.'
        }, { quoted: msg.original })

      } else {
        // Response tidak valid
        await conn.sendMessage(msg.from, {
          text: `Ketik *ya* untuk konfirmasi atau *batal* untuk membatalkan.`
        }, { quoted: msg.original })
      }
      return
    }

    // Parse argumen: .transfer <nomor> <jumlah>
    // Nomor diterima: 08xxx, 628xxx, atau +628xxx
    if (args.length < 2) {
      return conn.sendMessage(msg.from, {
        text: `❌ Format salah!\n\n*Contoh:*\n${prefix}transfer 081234567890 50000\n${prefix}tf 6281234567890 25000\n\n*Catatan:*\n- Nomor bisa dengan atau tanpa kode negara (62 / +62 / 08)\n- Minimal transfer Rp 5.000`
      }, { quoted: msg.original })
    }

    const nomorTujuan = args[0].replace(/[^0-9]/g, '')
    const jumlah = parseInt(args[1])

    // Validasi nomor
    if (!nomorTujuan || nomorTujuan.length < 9) {
      return conn.sendMessage(msg.from, {
        text: '❌ Nomor tidak valid!'
      }, { quoted: msg.original })
    }

    // Normalisasi nomor ke format WhatsApp
    // 08xxx / 8xxx -> 62xxx, 0xxx -> 62xxx
    let nomorNormal = nomorTujuan
    if (nomorTujuan.startsWith('0')) {
      nomorNormal = '62' + nomorTujuan.substring(1)
    } else if (!nomorTujuan.startsWith('62')) {
      // asumsi format tanpa negara (8xxx atau 21xxx)
      nomorNormal = '62' + nomorTujuan
    }

    const tujuanJid = nomorNormal + '@s.whatsapp.net'

    // Cek apakah transfer ke diri sendiri
    const senderJid = sender.endsWith('@s.whatsapp.net') ? sender : (global.lidToNumber.get(sender) ? global.lidToNumber.get(sender) + '@s.whatsapp.net' : sender)
    const senderNum = senderJid.replace('@s.whatsapp.net', '')

    if (senderNum === nomorNormal) {
      return conn.sendMessage(msg.from, {
        text: '❌ Tidak bisa transfer ke diri sendiri!'
      }, { quoted: msg.original })
    }

    // Validasi jumlah
    if (!jumlah || jumlah < 5000) {
      return conn.sendMessage(msg.from, {
        text: '❌ Minimal transfer Rp 5.000!'
      }, { quoted: msg.original })
    }

    // Cek saldo pengirim
    const saldo = user.saldo || 0
    if (saldo < jumlah) {
      return conn.sendMessage(msg.from, {
        text: `❌ Saldo tidak cukup!\nSaldo kamu: Rp ${toRupiah(saldo)}\nJumlah transfer: Rp ${toRupiah(jumlah)}`
      }, { quoted: msg.original })
    }

    // Cek apakah penerima sudah dikenal bot.
    // WA modern: user pertama kali chat bot tersimpan di bawah key LID
    // (90719087755510@lid), bukan nomor. resolveByPhone nemu record itu.
    let penerima = db.getUser(tujuanJid)
    let penerimaAktif = penerima && (
      penerima.registered === true ||
      !!penerima.device ||
      !!(penerima.riwayat && penerima.riwayat.length) ||
      !!(penerima.saldo && penerima.saldo > 0)
    )

    // Kalau lewat nomor WA nggak nemu record yg aktif, coba lewat mapping LID
    if (!penerimaAktif) {
      const viaLid = db.resolveByPhone(tujuanJid)
      if (viaLid) {
        penerima = viaLid
        penerimaAktif = viaLid.registered === true ||
          !!viaLid.device ||
          !!(viaLid.riwayat && viaLid.riwayat.length) ||
          !!(viaLid.saldo && viaLid.saldo > 0)
        const rev = db.lidReverseMap().get(tujuanJid.replace('@s.whatsapp.net', ''))
        if (rev) penerimaLid = rev.endsWith('@lid') ? rev : rev + '@lid'
      }
    }

    if (!penerimaAktif) {
      return conn.sendMessage(msg.from, {
        text: `⚠️ Nomor *${nomorTujuan}* belum terdaftar di ${config.botName}.\n\nMinta orang tersebut chat bot & ketik:\n*${prefix}daftar ${nomorNormal}*\n\nSetelah itu dia bisa menerima transfer.`
      }, { quoted: msg.original })
    }

    // Simpan pending transfer
    db.setUser(sender, {
      pendingTransfer: {
        tujuan: tujuanJid,
        penerimaLid: penerimaLid,
        jumlah: jumlah,
        waktu: Date.now()
      }
    })

    // Kirim konfirmasi
    await conn.sendMessage(msg.from, {
      text: `📤 *Konfirmasi Transfer*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Jumlah:* Rp ${toRupiah(jumlah)}\n*Ke:* @${tujuanJid.split('@')[0]}\n*Saldo kamu:* Rp ${toRupiah(saldo)}\n\nKetik *ya* untuk konfirmasi atau *batal* untuk membatalkan.`,
      mentions: [tujuanJid]
    }, { quoted: msg.original })
  }
}
