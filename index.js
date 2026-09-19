const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason,
  downloadContentFromMessage,
  jidNormalizedUser
} = require('baileys')

const chalk = require('chalk')
const pino = require('pino')
const fs = require('fs')
const path = require('path')
const config = require('./config')
const db = require('./lib/database')
const BaileysWrapper = require('./lib/wrapper')

// Plugin loader
function loadPlugins() {
  const plugins = {}
  const pluginDir = path.join(__dirname, 'plugins')
  if (!fs.existsSync(pluginDir)) return plugins

  const categories = fs.readdirSync(pluginDir).filter(f =>
    fs.statSync(path.join(pluginDir, f)).isDirectory()
  )

  for (const category of categories) {
    const catPath = path.join(pluginDir, category)
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'))
    for (const file of files) {
      try {
        const plugin = require(path.join(catPath, file))
        const names = Array.isArray(plugin.command) ? plugin.command : [plugin.command]
        for (const name of names) {
          plugins[name] = plugin
        }
        console.log(chalk.green(`[Plugin] Loaded: ${file} (${category})`))
      } catch (e) {
        console.error(chalk.red(`[Plugin] Error loading ${file}:`), e.message)
      }
    }
  }
  return plugins
}

const plugins = loadPlugins()
console.log(chalk.cyan(`[Bot] Total ${Object.keys(plugins).length} command(s) loaded`))

function getMessageBody(message) {
  return message?.conversation ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    message?.extendedTextMessage?.text ||
    message?.buttonsResponseMessage?.selectedButtonId ||
    message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    message?.templateButtonReplyMessage?.selectedId ||
    ''
}

function getMessageType(message) {
  if (!message) return null
  const keys = Object.keys(message)
  return keys.find(key => key !== 'senderKeyDistributionMessage' && key !== 'messageContextInfo')
}

global.groupMetadataCache = new Map()
global.lidToNumber = new Map() // mapping LID -> nomor WA

// Load LID map dari file saat startup
const LID_MAP_PATH = path.join(__dirname, 'database', 'lid_map.json')
function loadLidMap() {
  try {
    if (fs.existsSync(LID_MAP_PATH)) {
      const data = JSON.parse(fs.readFileSync(LID_MAP_PATH, 'utf-8'))
      for (const [lid, nomor] of Object.entries(data)) {
        global.lidToNumber.set(lid, nomor)
      }
      console.log(chalk.cyan(`• Loaded ${global.lidToNumber.size} LID mappings`))
    }
  } catch (e) { /* skip */ }
}

function saveLidMap() {
  try {
    const data = {}
    for (const [lid, nomor] of global.lidToNumber.entries()) {
      data[lid] = nomor
    }
    fs.writeFileSync(LID_MAP_PATH, JSON.stringify(data, null, 2))
  } catch (e) { /* skip */ }
}

loadLidMap()

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'))
  const { version } = await fetchLatestBaileysVersion()
  console.log(chalk.white(`• Using WA v${version.join('.')}`))

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Safari'),
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    cachedGroupMetadata: async (jid) => {
      if (!global.groupMetadataCache.has(jid)) {
        const metadata = await sock.groupMetadata(jid).catch(() => {})
        global.groupMetadataCache.set(jid, metadata)
        return metadata
      }
      return global.groupMetadataCache.get(jid)
    }
  })

  new BaileysWrapper(sock)

  if (!sock.authState.creds.registered) {
    console.log(chalk.white(`• Request Pairing Code To Number ${config.pairingNumber.trim()}`))
    setTimeout(async () => {
      const code = await sock.requestPairingCode(config.pairingNumber.trim(), 'NIKIBOTT')
      console.log(chalk.white(`• Kode Pairing: ${code}`))
    }, 4000)
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        console.log(chalk.yellow('• Reconnecting...'))
        startBot()
      } else {
        console.log(chalk.red('• Connection Closed (logged out)'))
      }
    }
    if (connection === 'open') {
      console.log(chalk.green('• Bot online!'))
      console.log(chalk.green(`• Owner: ${config.ownerNumber.join(', ')}`))

      // Build LID mapping dari semua contacts yang sudah ada
      try {
        const allContacts = await sock.fetchStatus(sock.user.id).catch(() => null)
        const contacts = Object.values(sock.store?.contacts || {})
        for (const contact of contacts) {
          if (contact.lid && contact.id?.endsWith('@s.whatsapp.net')) {
            const nomor = contact.id.replace('@s.whatsapp.net', '')
            global.lidToNumber.set(contact.lid, nomor)
          }
        }
      } catch (e) { /* skip */ }
    }
  })

  // Build LID → nomor mapping dari contacts
  sock.ev.on('contacts.upsert', (contacts) => {
    let changed = false
    for (const contact of contacts) {
      if (contact.lid && contact.id?.endsWith('@s.whatsapp.net')) {
        const nomor = contact.id.replace('@s.whatsapp.net', '')
        global.lidToNumber.set(contact.lid, nomor)
        changed = true
      }
    }
    if (changed) saveLidMap()
  })

  sock.ev.on('contacts.update', (updates) => {
    let changed = false
    for (const update of updates) {
      if (update.lid && update.id?.endsWith('@s.whatsapp.net')) {
        const nomor = update.id.replace('@s.whatsapp.net', '')
        global.lidToNumber.set(update.lid, nomor)
        changed = true
      }
    }
    if (changed) saveLidMap()
  })

  // Group participants update (welcome/left)
  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action } = update
    const groupMetadata = await sock.groupMetadata(id).catch(() => null)
    if (groupMetadata) global.groupMetadataCache.set(id, groupMetadata)

    const group = db.getGroup(id)

    if (action === 'add' && group.welcome) {
      for (const participant of participants) {
        let text = group.welcomeMsg || `Welcome @${participant.split('@')[0]}! 👋`
        text = text.replace(/@user/g, `@${participant.split('@')[0]}`)
        await sock.sendMessage(id, { text, mentions: [participant] })
      }
    } else if (action === 'remove' && group.left) {
      for (const participant of participants) {
        let text = group.leftMsg || `Goodbye @${participant.split('@')[0]} 👋`
        text = text.replace(/@user/g, `@${participant.split('@')[0]}`)
        await sock.sendMessage(id, { text, mentions: [participant] })
      }
    }
  })

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid
    if (from === 'status@broadcast') return

    const sender = msg.key.participant || from
    const isGroup = from.endsWith('@g.us')
    const isMe = msg.key.fromMe
    if (isMe) return

    const body = getMessageBody(msg.message)
    const mtype = getMessageType(msg.message)
    if (!mtype) return

    // Simpan chatJid (LID) user agar bisa kirim notifikasi nanti
    db.setUser(sender, { chatJid: from })

    const parsedMsg = {
      key: msg.key,
      from,
      sender,
      body,
      mtype,
      isGroup,
      isMe,
      message: msg.message,
      pushName: msg.pushName || '',
      quoted: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null,
      original: msg
    }

    // Handle device/tampilan selection response — harus sebelum cek user baru
    if (body === `${config.prefix}button` || body === `${config.prefix}text`) {
      const device = body === `${config.prefix}button` ? 'android' : 'ios'
      db.setUser(sender, { device })
      const deviceName = device === 'android' ? '🔘 Button (Interaktif)' : '📝 Teks (Universal)'
      await sock.sendMessage(from, {
        text: `✅ Tampilan berhasil diset ke *${deviceName}*!\n\n${device === 'android'
          ? 'Kamu akan melihat tombol interaktif yang bisa diklik langsung.'
          : 'Kamu akan melihat tampilan teks yang support di semua HP.'
        }\n\nKetik *${config.prefix}menu* untuk melihat menu.\nGanti tampilan kapan saja dengan *${config.prefix}tampilan*`
      }, { quoted: msg })
      return
    }

    // Handle order response dari list/button (order_dg_xxx|id)
    if (body.startsWith('order_dg_')) {
      const { prosesTransaksiDigiflazz, calculateProfit, getProdukByBrand, getProdukByCategory, toRupiah } = require('./lib/digiflazz')
      const { createQris, getQrisImage, generateUniqueNominal, checkStatus } = require('./lib/qris')

      const parts = body.split('|')
      const orderPart = parts[0]
      const tujuan = parts[1]
      const kode = orderPart.replace('order_dg_', '')

      if (!tujuan || !kode) return

      // Cari produk di database Digiflazz
      const fs = require('fs')
      const path = require('path')
      const dbPath = path.join(__dirname, 'database', 'datadigiflaz.json')
      if (!fs.existsSync(dbPath)) return sock.sendMessage(from, { text: '❌ Database produk belum ada. Owner jalankan *.getdigi* dulu.' }, { quoted: msg })

      const products = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
      const produk = products.find(p => p.buyer_sku_code === kode && p.seller_product_status === true)
      if (!produk) return sock.sendMessage(from, { text: '❌ Produk tidak ditemukan.' }, { quoted: msg })

      const hargaModal = produk.price
      const hargaJual = hargaModal + calculateProfit(hargaModal) + config.hargaAdmin
      const namaProduk = produk.product_name

      const user = db.getUser(sender)
      const saldo = user.saldo || 0

      if (saldo >= hargaJual) {
        // Bayar via saldo
        const konfirmasi = `🛒 *Konfirmasi Order*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Produk:* ${namaProduk}\n*Tujuan:* ${tujuan}\n*Harga:* Rp ${toRupiah(hargaJual)}\n*Saldo:* Rp ${toRupiah(saldo)}\n\nKetik *ya* untuk konfirmasi atau *batal* untuk membatalkan.`
        await sock.sendMessage(from, { text: konfirmasi }, { quoted: msg })
        db.setUser(sender, {
          pendingOrder: { kode, tujuan, hargaJual, hargaModal, namaProduk, via: 'saldo', createdAt: Date.now() }
        })
      } else {
        // Bayar via QRIS
        const kurang = hargaJual - saldo
        await sock.sendMessage(from, { text: `⚠️ Saldo tidak cukup (Rp ${toRupiah(saldo)}). Kekurangan Rp ${toRupiah(kurang)}.\n\n⏳ Membuat QRIS...` }, { quoted: msg })

        const amount = generateUniqueNominal(hargaJual)
        const createdAt = Date.now()

        let qris
        try {
          qris = await createQris(amount, `ORD-${kode}-${sender.split('@')[0]}-${createdAt}`)
        } catch (e) {
          return sock.sendMessage(from, { text: `❌ Gagal membuat QRIS: ${e.message}` }, { quoted: msg })
        }
        const qrisImage = await getQrisImage(qris)

        db.setUser(sender, {
          pendingOrder: { kode, tujuan, hargaJual, hargaModal, namaProduk, via: 'qris', amount, createdAt, qrisId: qris.qrisId }
        })

        const info = `💳 *Pembayaran QRIS*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Produk:* ${namaProduk}\n*Tujuan:* ${tujuan}\n*Bayar:* Rp ${toRupiah(amount)}\n\n⚠️ Bayar TEPAT *Rp ${toRupiah(amount)}*\n⏰ Berlaku *5 menit*`
        const infoMsg = await sock.sendMessage(from, { text: info }, { quoted: msg })
        const qrisMsg = await sock.sendImage(from, qrisImage, `Bayar Rp ${toRupiah(amount)} — Berlaku 5 menit`, msg)

        // Polling QRIS
        const maxWait = 5 * 60 * 1000
        const interval = 5000
        let elapsed = 0
        const poll = setInterval(async () => {
          elapsed += interval
          if (elapsed >= maxWait) {
            clearInterval(poll)
            db.setUser(sender, { pendingOrder: null })
            // Hapus pesan QRIS saat expired
            if (qrisMsg?.key) await sock.sendMessage(from, { delete: qrisMsg.key }).catch(() => {})
            if (infoMsg?.key) await sock.sendMessage(from, { delete: infoMsg.key }).catch(() => {})
            return sock.sendMessage(from, { text: '⏰ Waktu pembayaran habis. Silakan order ulang.' })
          }
          try {
            const st = await checkStatus(qris.qrisId)
            if (st.status === 'EXPIRED') {
              clearInterval(poll)
              db.setUser(sender, { pendingOrder: null })
              if (qrisMsg?.key) await sock.sendMessage(from, { delete: qrisMsg.key }).catch(() => {})
              if (infoMsg?.key) await sock.sendMessage(from, { delete: infoMsg.key }).catch(() => {})
              return sock.sendMessage(from, { text: '⏰ QRIS sudah kadaluarsa. Silakan order ulang.' })
            }
            if (st.paid) {
              clearInterval(poll)
              const order = db.getUser(sender).pendingOrder
              db.setUser(sender, { pendingOrder: null })
              if (!order) return
              // Hapus pesan QRIS setelah bayar
              if (qrisMsg?.key) await sock.sendMessage(from, { delete: qrisMsg.key }).catch(() => {})
              if (infoMsg?.key) await sock.sendMessage(from, { delete: infoMsg.key }).catch(() => {})
              await prosesTransaksiDigiflazz(order.kode, order.tujuan, order.hargaJual, order.hargaModal, db, sender, from, sock, msg, true)
            }
          } catch (e) { /* lanjut */ }
        }, interval)
      }
      return
    }

    // Handle konfirmasi order via saldo
    if ((body === 'ya' || body === 'yes') && !isGroup) {
      const user = db.getUser(sender)

      // Handle konfirmasi transfer
      if (user.pendingTransfer) {
        const transferPlugin = plugins['transfer'] || plugins['tf']
        if (transferPlugin) {
          return transferPlugin.run({
            msg: parsedMsg, conn: sock, args: [], text: 'ya', db, config, plugins,
            prefix: config.prefix, command: 'transfer', isOwner, isGroup
          })
        }
      }

      const { prosesTransaksiDigiflazz } = require('./lib/digiflazz')
      const order = user.pendingOrder
      if (!order || order.via !== 'saldo') return
      db.setUser(sender, { pendingOrder: null })
      await prosesTransaksiDigiflazz(order.kode, order.tujuan, order.hargaJual, order.hargaModal, db, sender, from, sock, msg, false)
      return
    }

    if (body === 'batal' && !isGroup) {
      const user = db.getUser(sender)

      // Handle batal transfer
      if (user.pendingTransfer) {
        db.setUser(sender, { pendingTransfer: null })
        await sock.sendMessage(from, { text: '❌ Transfer dibatalkan.' }, { quoted: msg })
        return
      }

      if (user.pendingOrder) {
        db.setUser(sender, { pendingOrder: null })
        await sock.sendMessage(from, { text: '❌ Order dibatalkan.' }, { quoted: msg })
      }
      return
    }

    // Cek user baru — minta pilih tampilan dulu (skip di grup)
    if (!isGroup) {
      const user = db.getUser(sender)
      if (!user.device) {
        const devicePlugin = plugins['device']
        if (devicePlugin) {
          return devicePlugin.run({
            msg: parsedMsg, conn: sock, args: [], text: '', db, config, plugins,
            prefix: config.prefix, command: 'device', isOwner: false, isGroup
          })
        }
      }
    }

    const isCmd = body && body.startsWith(config.prefix)
    if (!isCmd) {
      // Anti-link & anti-kasar untuk non-command
      if (isGroup) {
        const group = db.getGroup(from)

        if (group.antilink) {
          const linkRegex = /(https?:\/\/|www\.)/i
          if (linkRegex.test(body)) {
            const groupMeta = await sock.groupMetadata(from).catch(() => null)
            const isAdmin = groupMeta?.participants.find(p => p.id === sender)?.admin
            const senderNum = sender.replace(/[^0-9]/g, '')
            const isOwner = config.ownerNumber.some(n => n.replace(/[^0-9]/g, '') === senderNum)
            if (!isAdmin && !isOwner) {
              await sock.sendMessage(from, { text: `⚠️ @${sender.split('@')[0]}, kirim link tidak diperbolehkan!`, mentions: [sender] }, { quoted: msg })
              await sock.sendMessage(from, { delete: msg.key })
              return
            }
          }
        }

        if (group.antikasarr && group.kataKasar && group.kataKasar.length > 0) {
          const lowerBody = body.toLowerCase()
          const found = group.kataKasar.some(kata => lowerBody.includes(kata.toLowerCase()))
          if (found) {
            const groupMeta = await sock.groupMetadata(from).catch(() => null)
            const isAdmin = groupMeta?.participants.find(p => p.id === sender)?.admin
            const senderNum = sender.replace(/[^0-9]/g, '')
            const isOwner = config.ownerNumber.some(n => n.replace(/[^0-9]/g, '') === senderNum)
            if (!isAdmin && !isOwner) {
              await sock.sendMessage(from, { text: `⚠️ @${sender.split('@')[0]}, jaga kata-katanya ya!`, mentions: [sender] }, { quoted: msg })
              await sock.sendMessage(from, { delete: msg.key })
              return
            }
          }
        }
      }
      return
    }

    const command = body.slice(config.prefix.length).trim().split(' ')[0].toLowerCase()
    const args = body.slice(config.prefix.length + command.length).trim().split(/\s+/).filter(Boolean)
    const text = args.join(' ')
    const plugin = plugins[command]
    if (!plugin) return

    const senderNum = sender.replace(/[^0-9]/g, '')
    const senderJid = sender.endsWith('@lid')
      ? (global.lidToNumber.get(sender) ? global.lidToNumber.get(sender) + '@s.whatsapp.net' : sender)
      : sender
    const isOwner = config.ownerNumber.some(n => {
      const nNum = n.replace(/[^0-9]/g, '')
      return senderJid === nNum + '@s.whatsapp.net' || senderNum === nNum
    })

    // Simpan chatJid owner agar notifikasi bisa terkirim (hanya dari PM, bukan grup)
    if (isOwner && !isGroup) {
      try {
        const ownerJidPath = path.join(__dirname, 'database', 'owner_jid.json')
        fs.writeFileSync(ownerJidPath, JSON.stringify({ chatJid: from }, null, 2))
      } catch (e) { /* skip */ }
    }

    // Auto-save LID owner ke database supaya persistent
    if (isOwner && sender.endsWith('@s.whatsapp.net')) {
      const lidPath = path.join(__dirname, 'database', 'lid_map.json')
      try {
        let lidMap = {}
        if (fs.existsSync(lidPath)) lidMap = JSON.parse(fs.readFileSync(lidPath, 'utf-8'))
      } catch (e) { /* skip */ }
    }

    console.log(chalk.white(`• [CMD] ${command} from ${sender} | isOwner: ${isOwner} | senderNum: ${senderNum}`))

    try {
      if (plugin.isOwner && !isOwner) {
        return sock.sendMessage(from, { text: '❌ Khusus owner!' }, { quoted: msg })
      }
      if (plugin.isGroup && !isGroup) {
        return sock.sendMessage(from, { text: '❌ Command ini hanya bisa di grup!' }, { quoted: msg })
      }
      // Command topup & payment hanya bisa di PM bot
      if (isGroup && (plugin.category === 'topup' || plugin.category === 'payment')) {
        const botNumber = sock.user?.id?.split(':')[0] || config.pairingNumber.replace(/[^0-9]/g, '')
        return sock.sendMessage(from, {
          text: `⚠️ Command *${config.prefix}${command}* hanya bisa digunakan di chat pribadi bot.\n\n💬 Chat bot langsung untuk transaksi: https://wa.me/${botNumber}\n\nKetik *${config.prefix}menu* untuk melihat daftar menu.`,
        }, { quoted: msg })
      }
      if (plugin.isAdmin && isGroup) {
        const groupMeta = await sock.groupMetadata(from).catch(() => null)
        const admins = groupMeta?.participants.filter(p => p.admin).map(p => p.id) || []
        if (!admins.includes(sender) && !isOwner) {
          return sock.sendMessage(from, { text: '❌ Khusus admin grup!' }, { quoted: msg })
        }
      }

      await plugin.run({ msg: parsedMsg, conn: sock, args, text, db, config, plugins, prefix: config.prefix, command, isOwner, isGroup })
    } catch (e) {
      console.error(chalk.red('[Error]'), e.message)
      sock.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: msg })
    }
  })
}

startBot()
