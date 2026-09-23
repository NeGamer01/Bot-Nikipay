// lib/gameCatalog.js — Katalog terpusat semua brand topup (game, e-money, PLN, TV)
//
// Sumber kebenaran untuk: plugin topup (wrapper tipis), menu utama (.menu),
// dan daftar game (.allgame). Ketersediaan tiap brand dihitung dari
// database/datadigiflaz.json (hasil .getdigi), jadi brand yang semua produknya
// off (seller_product_status false) otomatis tersembunyi dari menu — tapi
// command-nya tetap berfungsi (menampilkan pesan "belum tersedia").
//
// idFormat:
//   'id'     -> arg pertama dipakai apa adanya   (.ff 123456789)
//   'zone'   -> id + zone                        (.ml 123456789 1234)
//   'server' -> uid|server                      (.hsr 123456789 Asia)
// filter:
//   'umum'   -> hanya type 'Umum' dan bukan produk "cek"
//   'nocek'  -> buang produk "cek" saja
//   undefined-> tampil semua (default)

const fs = require('fs')
const path = require('path')
const { calculateProfit, toRupiah } = require('./digiflazz')

const DB_PATH = path.join(__dirname, '..', 'database', 'datadigiflaz.json')

const GAMES = [
  // ── GAME ──────────────────────────────────────────────
  { brand: 'MOBILE LEGENDS', command: 'mobilelegend', aliases: ['ml'], emoji: '🎮', label: 'Mobile Legends', kind: 'game', idFormat: 'zone', idName: 'ID', usage: '<userid> <zoneid>', usageHint: '_userid = ID akun ML, zoneid = Zone ID (angka setelah | di profil)_', filter: 'umum', cekIdBrand: 'MOBILE LEGENDS', desc: 'Top up diamond ML' },
  { brand: 'FREE FIRE', command: 'freefire', aliases: ['ff'], emoji: '🎮', label: 'Free Fire', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', cekIdBrand: 'FREE FIRE', desc: 'Top up diamond FF' },
  { brand: 'PUBG MOBILE', command: 'pubg', aliases: ['pubgm'], emoji: '🎮', label: 'PUBG Mobile', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up UC PUBG' },
  { brand: 'Call of Duty MOBILE', command: 'codm', aliases: ['cod'], emoji: '🎮', label: 'Call of Duty Mobile', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up CP CODM' },
  { brand: 'Honkai Star Rail', command: 'hsr', aliases: ['honkaistarrail'], emoji: '🎮', label: 'Honkai Star Rail', kind: 'game', idFormat: 'server', idName: 'UID', usage: '<uid> <server>', usageHint: '_server = Asia/America/Europe/TW_HK_MO_', desc: 'Top up Oneiric Shard' },
  { brand: 'Genshin Impact', command: 'genshin', aliases: ['gi'], emoji: '🎮', label: 'Genshin Impact', kind: 'game', idFormat: 'server', idName: 'UID', usage: '<uid> <server>', usageHint: '_server = Asia/America/Europe/TW_HK_MO_', desc: 'Top up Genesis Crystal' },
  { brand: 'Honor of Kings', command: 'hok', aliases: ['honorofkings'], emoji: '🎮', label: 'Honor of Kings', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up Token HOK' },
  { brand: 'Valorant', command: 'valorant', aliases: ['valo'], emoji: '🎮', label: 'Valorant', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up VP Valorant' },
  { brand: 'Steam Wallet (IDR)', command: 'steam', aliases: ['steamwallet'], emoji: '🎮', label: 'Steam Wallet', kind: 'game', idFormat: 'id', idName: 'Steam ID', usage: '<id>', desc: 'Top up Steam Wallet' },
  { brand: 'Delta Force', command: 'deltaforce', aliases: ['df'], emoji: '🎮', label: 'Delta Force', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up Delta Coins' },
  { brand: 'Metal Slug Awakening', command: 'metalslug', aliases: ['msa', 'metalslugawakening'], emoji: '🎮', label: 'Metal Slug Awakening', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up Ruby Metal Slug' },
  { brand: 'POINT BLANK', command: 'pointblank', aliases: ['pb'], emoji: '🎮', label: 'Point Blank', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up PB Cash' },
  { brand: 'PUBG New State Mobile', command: 'pubgnewstate', aliases: ['pns', 'newstate'], emoji: '🎮', label: 'PUBG New State', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up NC New State' },
  { brand: 'ARENA OF VALOR', command: 'aov', aliases: ['arenaofvalor'], emoji: '🎮', label: 'Arena of Valor', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up Voucher AOV' },
  { brand: 'Undawn', command: 'undawn', aliases: ['ud'], emoji: '🎮', label: 'Undawn', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up RC Undawn' },
  { brand: 'FC Mobile', command: 'fcmobile', aliases: ['fcm', 'fc'], emoji: '🎮', label: 'FC Mobile', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up FC Points' },
  { brand: 'Sausage Man', command: 'sausageman', aliases: ['sm', 'sausage'], emoji: '🎮', label: 'Sausage Man', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up Candies' },
  { brand: 'Stumble Guys', command: 'stumbleguys', aliases: ['sg', 'stumble'], emoji: '🎮', label: 'Stumble Guys', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up Gems' },
  { brand: 'Honkai Impact 3', command: 'honkaiimpact', aliases: ['hi3', 'honkaiimpact3'], emoji: '🎮', label: 'Honkai Impact 3', kind: 'game', idFormat: 'id', idName: 'ID', usage: '<id>', desc: 'Top up Honkai Impact 3' },
  { brand: 'GARENA', command: 'garena', aliases: ['shell', 'garenashell'], emoji: '🎮', label: 'Garena Shell', kind: 'game', idFormat: 'id', idName: 'Garena ID', usage: '<id>', desc: 'Top up Garena Shell' },

  // ── E-MONEY ───────────────────────────────────────────
  { brand: 'DANA', command: 'dana', aliases: [], emoji: '💙', label: 'DANA', kind: 'emoney', idFormat: 'id', idName: 'Nomor DANA', usage: '<nomor>', filter: 'nocek', desc: 'Top up DANA' },
  { brand: 'GOPAY', command: 'gopay', aliases: ['gp'], emoji: '💚', label: 'GoPay', kind: 'emoney', idFormat: 'id', idName: 'Nomor GoPay', usage: '<nomor>', desc: 'Top up GoPay' },
  { brand: 'OVO', command: 'ovo', aliases: [], emoji: '💜', label: 'OVO', kind: 'emoney', idFormat: 'id', idName: 'Nomor OVO', usage: '<nomor>', desc: 'Top up OVO' },
  { brand: 'SHOPEEPAY', command: 'shopeepay', aliases: ['spay'], emoji: '🧡', label: 'ShopeePay', kind: 'emoney', idFormat: 'id', idName: 'Nomor ShopeePay', usage: '<nomor>', desc: 'Top up ShopeePay' },

  // ── LAINNYA (brand-based) ─────────────────────────────
  { brand: 'PLN', command: 'token', aliases: ['pln', 'listrik'], emoji: '⚡', label: 'Token PLN', kind: 'pln', idFormat: 'id', idName: 'No. Meter', usage: '<nomor meter>', desc: 'Beli token listrik PLN' },
  { brand: 'Nex Parabola', command: 'tv', aliases: ['nexparabola', 'nex'], emoji: '📺', label: 'Nex Parabola', kind: 'tv', idFormat: 'id', idName: 'ID Pelanggan', usage: '<id pelanggan>', desc: 'Top up Nex Parabola' }
]

/** Cari katalog game berdasarkan command utama atau alias. */
function getGame(cmd) {
  return GAMES.find(g => g.command === cmd || (g.aliases || []).includes(cmd))
}

function readProducts() {
  try {
    if (!fs.existsSync(DB_PATH)) return []
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
} catch (e) { return [] }
}

/** Produk aktif (seller_product_status true) untuk satu brand, sesuai filter. */
function filterProducts(game, products) {
  let list = (products || readProducts()).filter(p =>
    (p.brand || '').trim().toUpperCase() === String(game.brand).toUpperCase() &&
    p.seller_product_status === true
  )
  if (game.filter === 'umum') {
    list = list.filter(p => (p.type || '') === 'Umum' && !/cek/i.test(p.product_name || ''))
  } else if (game.filter === 'nocek') {
    list = list.filter(p => !/cek/i.test(p.product_name || ''))
  }
  return list.sort((a, b) => a.price - b.price)
}

/** Hitung produk aktif per category (untuk .pulsa / .kuota di menu). */
function countByCategory(category) {
  return readProducts().filter(p =>
    (p.category || '').trim().toLowerCase() === String(category).toLowerCase() &&
    p.seller_product_status === true
  ).length
}

/** Semua brand yang punya minimal 1 produk aktif (urut abjad). */
function getAvailableGames(kind) {
  const products = readProducts()
  return GAMES
    .filter(g => !kind || g.kind === kind)
    .map(g => ({ ...g, count: filterProducts(g, products).length, cheapest: filterProducts(g, products)[0] }))
    .filter(g => g.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Estimasi harga jual termurah sebuah brand (modal + profit + admin). */
function cheapestPrice(game) {
  const list = filterProducts(game)
  if (!list.length) return null
  return list[0].price + calculateProfit(list[0].price)
}

// ─── RUNNER — dipakai semua plugin topup (wrapper tipis) ───
async function runGamePlugin(ctx, game) {
  const { conn, msg, args, text, db, config, prefix } = ctx
  const usage = `❌ Format salah!\n\nContoh: *${prefix}${game.command} ${game.usage}*\n${game.usageHint ? '\n' + game.usageHint : ''}`

  // ── Parse tujuan sesuai idFormat
  let tujuan, idText, idDisplay
  if (game.idFormat === 'zone') {
    if (args.length < 2) return conn.sendMessage(msg.from, { text: usage }, { quoted: msg.original })
    tujuan = `${args[0]}${args[1]}`
    idText = `${game.idName}: *${args[0]}*\nZone: *${args[1]}*`
    idDisplay = `${args[0]} (${args[1]})`
  } else if (game.idFormat === 'server') {
    if (args.length < 2) return conn.sendMessage(msg.from, { text: usage }, { quoted: msg.original })
    tujuan = `${args[0]}|${args[1]}`
    idText = `${game.idName}: *${args[0]}*\nServer: *${args[1]}*`
    idDisplay = args[0]
  } else {
    const id = text.trim()
    if (!id) return conn.sendMessage(msg.from, { text: usage }, { quoted: msg.original })
    tujuan = id
    idText = `${game.idName}: *${id}*`
    idDisplay = id
  }

  // ── Cek nickname (hanya brand yang didukung duniagames)
  let namaAkun = null
  if (game.cekIdBrand) {
    await conn.sendMessage(msg.from, { text: '🔍 Mengecek ID...' }, { quoted: msg.original })
    try {
      const { cekId } = require('./cekid')
      const cek = game.idFormat === 'zone'
        ? await cekId(game.cekIdBrand, args[0], args[1])
        : await cekId(game.cekIdBrand, tujuan)
      if (cek.ok) namaAkun = cek.nickname
      else if (cek.final) {
        return conn.sendMessage(msg.from, {
          text: `❌ ${game.label} *${idDisplay}* tidak ditemukan. Cek lagi ID${game.idFormat === 'zone' ? ' & Zone' : ''}-nya.`
        }, { quoted: msg.original })
      } else console.log(`[${game.command}] cek ID gagal, lanjut tanpa nickname:`, cek.reason)
    } catch (e) { console.log(`[${game.command}] cek ID error:`, e.message) }
  }

  const produkList = filterProducts(game)
  if (!produkList.length) {
    return conn.sendMessage(msg.from, {
      text: `❌ Produk ${game.label} belum tersedia. Owner jalankan *.getdigi* dulu.`
    }, { quoted: msg.original })
  }

  const user = db.getUser(msg.sender)
  const device = user.device || 'ios'

  // Simpan ID/zone yg sudah diketik, supaya user cukup ketik .buy <sku> tanpa ngulang ID
  try {
    db.setUser(msg.sender, { lastId: { brand: game.brand, tujuan, waktu: Date.now() } })
  } catch (e) { /* abaikan */ }

  const allRows = produkList.map(p => {
    const hargaJual = p.price + calculateProfit(p.price) + config.hargaAdmin
    return {
      id: `order_dg_${p.buyer_sku_code}|${tujuan}`,
      title: p.product_name,
      description: `Rp ${toRupiah(hargaJual)} | SKU: ${p.buyer_sku_code}`
    }
  })

  const header = `${game.emoji} *${game.label}*\n\n${idText}${namaAkun ? `\nNama: *${namaAkun}*` : ''}\n\nPilih nominal:`
  const footer = `${config.botName} | ${prefix}buy <sku> ${tujuan}`

  if (device === 'android') {
    const sections = []
    const chunkSize = 10
    const maxSections = 5
    for (let i = 0; i < Math.min(allRows.length, chunkSize * maxSections); i += chunkSize) {
      const chunk = allRows.slice(i, i + chunkSize)
      sections.push({ title: `${game.emoji} ${game.label} (${i + 1}-${i + chunk.length})`, rows: chunk })
    }
    await conn.sendList(msg.from, `${game.emoji} ${game.label}`, header, footer, '📋 Pilih Nominal', sections, msg)
  } else {
    // Menu teks: ID sudah disimpan, user cukup ketik .buy <sku> saja
    let teks = `${game.emoji} *${game.label}*\n\n${idText}${namaAkun ? `\nNama: *${namaAkun}*` : ''}\n\n_Ketik *${prefix}buy <sku>* — ID sudah tersimpan_\n\n`
    allRows.forEach((r, i) => {
      const sku = r.id.replace('order_dg_', '').split('|')[0]
      teks += `*${i + 1}.* ${r.title}\n   💰 ${r.description.split('|')[0].trim()}\n   ➡️ *${prefix}buy ${sku}*\n\n`
    })
    await conn.sendMessage(msg.from, { text: teks.trim() }, { quoted: msg.original })
  }
}

// Bagi array jadi chunk max 10 (batas row WhatsApp per section)
function chunk10(arr) {
  const out = []
  for (let i = 0; i < arr.length; i += 10) out.push(arr.slice(i, i + 10))
  return out
}

module.exports = { GAMES, getGame, readProducts, filterProducts, countByCategory, getAvailableGames, cheapestPrice, runGamePlugin, chunk10 }
