// Helper bersama untuk .addsaldo / .minsaldo
const { toRupiah } = require('./digiflazz')

// Tentukan target: @mention, nomor, atau diri sendiri kalau hanya nominal
function parseTarget({ msg, args }) {
  const mentioned = msg.original?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  let target = null, nominalRaw = null
  if (mentioned) {
    target = mentioned
    nominalRaw = args.find(a => /^\d+$/.test(a.replace(/[.,]/g, '')) && !a.startsWith('@'))
  } else if (args.length >= 2) {
    target = args[0].replace(/[^0-9]/g, '')
    if (target.length < 8) return {}
    target += '@s.whatsapp.net'
    nominalRaw = args[1]
  } else if (args.length === 1) {
    target = msg.sender // owner tambah/kurangi saldo sendiri
    nominalRaw = args[0]
  }
  const nominal = parseInt(String(nominalRaw || '').replace(/[.,]/g, ''))
  if (!target || !nominal || nominal <= 0) return {}
  return { target, nominal }
}

async function ubahSaldo({ conn, msg, args, db, config, mode }) {
  const { target, nominal } = parseTarget({ msg, args })
  const cmd = mode === 'add' ? 'addsaldo' : 'minsaldo'
  if (!target) {
    return conn.sendMessage(msg.from, {
      text: `❌ Format salah!\nContoh:\n• *${config.prefix}${cmd} @user 50000*\n• *${config.prefix}${cmd} 628xxx 50000*\n• *${config.prefix}${cmd} 50000* (saldo sendiri)`
    }, { quoted: msg.original })
  }

  const user = db.getUser(target)
  const saldoLama = user.saldo || 0
  let saldoBaru = mode === 'add' ? saldoLama + nominal : saldoLama - nominal
  let catatan = ''
  if (saldoBaru < 0) { catatan = `\n⚠️ Saldo hanya Rp ${toRupiah(saldoLama)}, dikurangi sampai Rp 0.`; saldoBaru = 0 }
  db.setUser(target, { saldo: saldoBaru })

  const riwayat = db.getUser(target).riwayat || []
  riwayat.unshift({ type: mode === 'add' ? 'addsaldo' : 'minsaldo', status: 'sukses', nominal, waktu: Date.now() })
  db.setUser(target, { riwayat: riwayat.slice(0, 50) })

  const num = target.split('@')[0]
  const verb = mode === 'add' ? 'ditambah' : 'dikurangi'
  await conn.sendMessage(msg.from, {
    text: `✅ Saldo @${num} ${verb} *Rp ${toRupiah(nominal)}*\nSaldo lama: Rp ${toRupiah(saldoLama)}\nSaldo baru: *Rp ${toRupiah(saldoBaru)}*${catatan}`,
    mentions: [target]
  }, { quoted: msg.original })

  // Notif ke user (kalau bukan diri sendiri)
  const targetUser = db.getUser(target)
  const notifJid = targetUser.chatJid || target
  if (notifJid !== msg.from && msg.sender !== target) {
    try {
      await conn.sendMessage(notifJid, {
        text: `💰 Saldo kamu ${verb} *Rp ${toRupiah(nominal)}* oleh owner.\nSaldo sekarang: *Rp ${toRupiah(saldoBaru)}*\n\n_${config.botName}_`
      })
    } catch (e) { console.error('[SALDO] Gagal kirim notif ke user:', e.message) }
  }
}

module.exports = { ubahSaldo, parseTarget }
