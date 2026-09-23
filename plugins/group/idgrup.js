// Ekstrak kode invite dari berbagai format link / teks
// Mendukung: https://chat.whatsapp.com/ABC123, chat.whatsapp.com/ABC123, atau ABC123 saja
function parseInviteCode(text) {
  if (!text) return null
  const t = text.trim()
  // Link penuh
  const m = t.match(/chat\.whatsapp\.com\/([A-Za-z0-9_\-]+)/)
  if (m) return m[1]
  // Kode mentah (18-30 char, alfanumerik)
  if (/^[A-Za-z0-9_\-]{16,}$/.test(t)) return t
  // Cari link di tengah teks
  const m2 = t.match(/https?:\/\/[^\s]*chat\.whatsapp\.com\/([A-Za-z0-9_\-]+)/)
  if (m2) return m2[1]
  return null
}

module.exports = {
  command: ['idgrup', 'cekgrup', 'gid'],
  category: 'group',
  desc: 'Cek ID grup (link grup atau di dalam grup)',
  async run({ conn, msg, text, isGroup, config }) {
    const code = parseInviteCode(text)

    // Pakai link grup
    if (code) {
      let meta
      try {
        meta = await conn.groupGetInviteInfo(code)
      } catch (e) {
        const pesan = /401|not authorized|unauthorized/i.test(e.message)
          ? '❌ Link tidak valid atau sudah dicabut (revoke).'
          : /404|not found|group不存在/i.test(e.message)
            ? '❌ Grup tidak ditemukan. Link mungkin salah.'
            : `❌ Gagal mengambil info grup: ${e.message}`
        return conn.sendMessage(msg.from, { text: pesan }, { quoted: msg.original })
      }

      if (!meta?.id) return conn.sendMessage(msg.from, { text: '❌ Gagal mengambil ID grup.' }, { quoted: msg.original })

      const jumlah = meta.participants?.length || 0
      const admin = meta.participants?.filter(p => p.admin).length || 0
      const deskripsi = (meta.desc || '').trim()
      const dibuat = meta.creation ? new Date(meta.creation * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'
      const pembuat = meta.owner ? meta.owner.split('@')[0] : '-'

      const info =
        `📋 *INFO GRUP*\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
        `*Nama:* ${meta.subject || '-'}\n` +
        `*JID:* \`\`\`${meta.id}\`\`\`\n` +
        `*Member:* ${jumlah} (${admin} admin)\n` +
        `*Dibuat:* ${dibuat}\n` +
        `*Oleh:* ${pembuat}\n` +
        (deskripsi ? `\n*Deskripsi:*\n${deskripsi.slice(0, 300)}${deskripsi.length > 300 ? '...' : ''}\n` : '') +
        `\n_Gunakan JID ini untuk config promoGroupJid di config.js_`

      return conn.sendMessage(msg.from, { text: info }, { quoted: msg.original })
    }

    // Tanpa link: harus di dalam grup
    if (!isGroup) {
      return conn.sendMessage(msg.from, {
        text: `❌ Kirim link grup untuk cek ID dari chat pribadi!\n\nContoh: *${config.prefix}idgrup https://chat.whatsapp.com/ABC123XYZ*\n\nAtau jalankan command ini di dalam grup untuk lihat ID-nya langsung.`
      }, { quoted: msg.original })
    }

    // Di dalam grup: tampilkan JID grup ini
    return conn.sendMessage(msg.from, {
      text: `📋 *ID Grup*\n\n\`\`\`${msg.from}\`\`\`\n\n_Gunakan ID ini untuk config promoGroupJid di config.js_`
    }, { quoted: msg.original })
  }
}
