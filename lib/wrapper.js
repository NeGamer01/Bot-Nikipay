const { downloadContentFromMessage } = require('baileys');
const fs = require('fs');
const path = require('path');

/**
 * Custom Wrapper untuk Baileys
 * Semua fungsi helper ada di sini, plugin cukup pakai conn.xxx
 */
class BaileysWrapper {
  constructor(sock) {
    this.sock = sock;
    this._bindMethods();
  }

  _bindMethods() {
    const sock = this.sock;

    // ─── TEXT ───────────────────────────────────────────
    sock.reply = async (jid, text, quoted) => {
      return sock.sendMessage(jid, { text: String(text) }, {
        quoted: quoted?.original || quoted
      });
    };

    sock.sendText = async (jid, text, options = {}) => {
      return sock.sendMessage(jid, { text: String(text), ...options });
    };

    // ─── IMAGE ──────────────────────────────────────────
    sock.sendImage = async (jid, buffer, caption = '', quoted) => {
      const content = Buffer.isBuffer(buffer)
        ? { image: buffer, caption }
        : { image: { url: buffer }, caption };
      return sock.sendMessage(jid, content, {
        quoted: quoted?.original || quoted
      });
    };

    // ─── VIDEO ──────────────────────────────────────────
    sock.sendVideo = async (jid, buffer, caption = '', quoted) => {
      const content = Buffer.isBuffer(buffer)
        ? { video: buffer, caption }
        : { video: { url: buffer }, caption };
      return sock.sendMessage(jid, content, {
        quoted: quoted?.original || quoted
      });
    };

    // ─── AUDIO ──────────────────────────────────────────
    sock.sendAudio = async (jid, buffer, ptt = false) => {
      const content = Buffer.isBuffer(buffer)
        ? { audio: buffer, mimetype: 'audio/mpeg', ptt }
        : { audio: { url: buffer }, mimetype: 'audio/mpeg', ptt };
      return sock.sendMessage(jid, content);
    };

    // ─── STICKER ────────────────────────────────────────
    sock.sendSticker = async (jid, buffer, quoted) => {
      return sock.sendMessage(jid, { sticker: buffer }, {
        quoted: quoted?.original || quoted
      });
    };

    // ─── DOCUMENT ───────────────────────────────────────
    sock.sendDocument = async (jid, buffer, mimetype, filename, caption = '') => {
      const content = Buffer.isBuffer(buffer)
        ? { document: buffer, mimetype, fileName: filename, caption }
        : { document: { url: buffer }, mimetype, fileName: filename, caption };
      return sock.sendMessage(jid, content);
    };

    // ═══════════════════════════════════════════════════
    // ─── BUTTON TYPES ───────────────────────────────────
    // ═══════════════════════════════════════════════════

    // 1. Reply Button (max 3 tombol)
    // Contoh: conn.sendButton(jid, "Pilih:", "footer", [{id:".ping", text:"Ping"}], msg)
    sock.sendButton = async (jid, text, footer, buttons, quoted) => {
      try {
        return await sock.sendMessage(jid, {
          text,
          footer,
          buttons: buttons.map((b, i) => ({
            buttonId: b.id || `btn_${i}`,
            buttonText: { displayText: b.text || b.displayText },
            type: 1
          })),
          headerType: 1
        }, { quoted: quoted?.original || quoted });
      } catch {
        return sock.sendFakeButton(jid, text, '', footer, buttons, quoted);
      }
    };

    // 2. Button dengan gambar header
    // Contoh: conn.sendImageButton(jid, imgBuffer, "Judul", "Teks", "footer", [{id:".ping", text:"Ping"}], msg)
    sock.sendImageButton = async (jid, image, title, text, footer, buttons, quoted) => {
      try {
        return await sock.sendMessage(jid, {
          image: Buffer.isBuffer(image) ? image : { url: image },
          caption: text,
          footer,
          title,
          buttons: buttons.map((b, i) => ({
            buttonId: b.id || `btn_${i}`,
            buttonText: { displayText: b.text || b.displayText },
            type: 1
          })),
          headerType: 4
        }, { quoted: quoted?.original || quoted });
      } catch {
        await sock.sendImage(jid, image, text, quoted);
        return sock.sendFakeButton(jid, title, text, footer, buttons, quoted);
      }
    };

    // 3. List Message (Dropdown)
    sock.sendList = async (jid, title, text, footer, buttonText, sections, quoted) => {
      try {
        // Convert id -> rowId untuk Baileys
        const convertedSections = sections.map(section => ({
          title: section.title,
          rows: section.rows.map(row => ({
            rowId: row.id || row.rowId || '',
            title: row.title || '',
            description: row.description || ''
          }))
        }));

        return await sock.sendMessage(jid, {
          title,
          text,
          footer,
          buttonText,
          sections: convertedSections,
          listType: 1
        }, { quoted: quoted?.original || quoted });
      } catch {
        return sock.sendFakeList(jid, title, text, footer, sections, quoted);
      }
    };

    // 5. Fake Button (selalu work, pakai teks biasa)
    // Contoh: conn.sendFakeButton(jid, "Judul", "Isi pesan", "footer", [{text:"Tombol 1"}, {text:"Tombol 2"}], msg)
    sock.sendFakeButton = async (jid, title, body, footer, buttons, quoted) => {
      const numEmoji = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
      let text = `╭─❒ *${title}*\n`;
      if (body) text += `│\n│ ${body.split('\n').join('\n│ ')}\n`;
      if (buttons.length > 0) {
        text += `│\n`;
        buttons.forEach((b, i) => {
          text += `│ ${numEmoji[i] || `${i+1}.`} ${b.text || b.displayText}\n`;
        });
      }
      text += `╰─────────────`;
      if (footer) text += `\n_${footer}_`;
      return sock.reply(jid, text, quoted);
    };

    // 6. Fake List (selalu work, pakai teks biasa)
    // Contoh: conn.sendFakeList(jid, "Judul", "Teks", "footer", [{title:"Kategori", rows:[{title:"Item", description:"Desc"}]}], msg)
    sock.sendFakeList = async (jid, title, body, footer, sections, quoted) => {
      const numEmoji = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
      let text = `╭─❒ *${title}*\n`;
      if (body) text += `│ ${body}\n`;
      text += `│\n`;
      sections.forEach(section => {
        text += `│ *— ${section.title} —*\n`;
        section.rows.forEach((row, i) => {
          text += `│ ${numEmoji[i] || `${i+1}.`} *${row.title}*\n`;
          if (row.description) text += `│    _${row.description}_\n`;
        });
        text += `│\n`;
      });
      text += `╰─────────────`;
      if (footer) text += `\n_${footer}_`;
      return sock.reply(jid, text, quoted);
    };

    // ═══════════════════════════════════════════════════
    // ─── UTILITIES ──────────────────────────────────────
    // ═══════════════════════════════════════════════════

    // Mention semua
    sock.sendMention = async (jid, text, mentions, quoted) => {
      return sock.sendMessage(jid, { text, mentions }, {
        quoted: quoted?.original || quoted
      });
    };

    // React emoji
    sock.react = async (jid, emoji, key) => {
      return sock.sendMessage(jid, { react: { text: emoji, key } });
    };

    // Download media otomatis
    sock.download = async (msg) => {
      const mtype = msg.mtype;
      if (!mtype) throw new Error('Bukan pesan media');
      const mediaTypes = {
        imageMessage: 'image',
        videoMessage: 'video',
        audioMessage: 'audio',
        documentMessage: 'document',
        stickerMessage: 'sticker'
      };
      const mediaType = mediaTypes[mtype];
      if (!mediaType) throw new Error(`Tipe media tidak didukung: ${mtype}`);
      const stream = await downloadContentFromMessage(msg.message[mtype], mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      return buffer;
    };

    // Typing indicator
    sock.typing = async (jid, duration = 3000) => {
      await sock.sendPresenceUpdate('composing', jid);
      await new Promise(r => setTimeout(r, duration));
      await sock.sendPresenceUpdate('paused', jid);
    };

    // Read message
    sock.readMsg = async (key) => {
      return sock.readMessages([key]);
    };

    // Delete message
    sock.deleteMsg = async (jid, key) => {
      return sock.sendMessage(jid, { delete: key });
    };

    // Edit message
    sock.editMsg = async (jid, key, newText) => {
      return sock.sendMessage(jid, { text: newText, edit: key });
    };

    // ─── ADDITIONAL FEATURES ─────────────────────────────

    // Poll / Voting
    // Contoh: conn.sendPoll(jid, "Pertanyaan?", ["Opsi 1", "Opsi 2"], 1)
    sock.sendPoll = async (jid, name, values, selectableCount = 1, quoted) => {
      return sock.sendMessage(jid, {
        poll: { name, values, selectableCount }
      }, { quoted: quoted?.original || quoted });
    };

    // Kirim Kontak
    // Contoh: conn.sendContact(jid, "Nama", "628xxx", msg)
    sock.sendContact = async (jid, name, number, quoted) => {
      const vcard =
        `BEGIN:VCARD\n` +
        `VERSION:3.0\n` +
        `FN:${name}\n` +
        `ORG:;\n` +
        `TEL;type=CELL;type=VOICE;waid=${number}:+${number}\n` +
        `END:VCARD`;
      return sock.sendMessage(jid, {
        contacts: {
          displayName: name,
          contacts: [{ vcard }]
        }
      }, { quoted: quoted?.original || quoted });
    };

    // Kirim Lokasi
    // Contoh: conn.sendLocation(jid, -6.2, 106.8, "Jakarta", msg)
    sock.sendLocation = async (jid, lat, lon, name = '', address = '', quoted) => {
      return sock.sendMessage(jid, {
        location: {
          degreesLatitude: lat,
          degreesLongitude: lon,
          name,
          address
        }
      }, { quoted: quoted?.original || quoted });
    };

    // Forward pesan
    // Contoh: conn.forwardMsg(jid, msg)
    sock.forwardMsg = async (jid, msg, options = {}) => {
      return sock.sendMessage(jid, {
        forward: msg.original || msg,
        ...options
      });
    };

    // Kirim GIF
    // Contoh: conn.sendGif(jid, buffer, "caption", msg)
    sock.sendGif = async (jid, buffer, caption = '', quoted) => {
      const content = Buffer.isBuffer(buffer)
        ? { video: buffer, caption, gifPlayback: true }
        : { video: { url: buffer }, caption, gifPlayback: true };
      return sock.sendMessage(jid, content, {
        quoted: quoted?.original || quoted
      });
    };

    // Kirim Voice Note (PTT)
    // Contoh: conn.sendVoice(jid, buffer, msg)
    sock.sendVoice = async (jid, buffer, quoted) => {
      const content = Buffer.isBuffer(buffer)
        ? { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }
        : { audio: { url: buffer }, mimetype: 'audio/ogg; codecs=opus', ptt: true };
      return sock.sendMessage(jid, content, {
        quoted: quoted?.original || quoted
      });
    };

    // Pin pesan di grup
    // Contoh: conn.pinMsg(jid, key, 86400)
    sock.pinMsg = async (jid, key, duration = 86400) => {
      return sock.sendMessage(jid, {
        pin: { type: 1, time: duration, key }
      });
    };

    // Unpin pesan di grup
    sock.unpinMsg = async (jid, key) => {
      return sock.sendMessage(jid, {
        pin: { type: 2, time: 0, key }
      });
    };

    // Kirim pesan dengan mention + teks
    // Contoh: conn.sendMentionText(jid, "Halo @628xxx!", ["628xxx@s.whatsapp.net"], msg)
    sock.sendMentionText = async (jid, text, mentions, quoted) => {
      return sock.sendMessage(jid, { text, mentions }, {
        quoted: quoted?.original || quoted
      });
    };

    // Set status bot (online/offline/typing/recording)
    // Contoh: conn.setStatus("available") / conn.setStatus("unavailable")
    sock.setStatus = async (status) => {
      return sock.sendPresenceUpdate(status);
    };

    // Auto read semua pesan masuk
    sock.autoRead = async (key) => {
      return sock.readMessages([key]);
    };

    // ─── PROFILE ─────────────────────────────────────────

    // Update foto profil
    sock.updateProfilePic = async (jid, buffer) => {
      return sock.updateProfilePicture(jid, buffer);
    };

    // Hapus foto profil
    sock.removeProfilePic = async (jid) => {
      return sock.removeProfilePicture(jid);
    };

    // Update nama profil
    sock.updateName = async (name) => {
      return sock.updateProfileName(name);
    };

    // Update bio/status profil
    sock.updateBio = async (status) => {
      return sock.updateProfileStatus(status);
    };

    // Ambil foto profil
    sock.getProfilePic = async (jid) => {
      return sock.profilePictureUrl(jid, 'image');
    };

    // Ambil status/bio user
    sock.getStatus = async (jid) => {
      return sock.fetchStatus(jid);
    };

    // ─── PRIVACY ─────────────────────────────────────────

    // Update privacy last seen
    sock.setLastSeen = async (value) => {
      return sock.updateLastSeenPrivacy(value); // 'all' | 'contacts' | 'contact_blacklist' | 'none'
    };

    // Update privacy online
    sock.setOnlinePrivacy = async (value) => {
      return sock.updateOnlinePrivacy(value); // 'all' | 'match_last_seen'
    };

    // Update privacy foto profil
    sock.setProfilePicPrivacy = async (value) => {
      return sock.updateProfilePicturePrivacy(value); // 'all' | 'contacts' | 'contact_blacklist' | 'none'
    };

    // Update privacy status
    sock.setStatusPrivacy = async (value) => {
      return sock.updateStatusPrivacy(value);
    };

    // Update privacy read receipts (centang biru)
    sock.setReadReceipts = async (value) => {
      return sock.updateReadReceiptsPrivacy(value); // 'all' | 'none'
    };

    // Update privacy siapa bisa add ke grup
    sock.setGroupsAddPrivacy = async (value) => {
      return sock.updateGroupsAddPrivacy(value); // 'all' | 'contacts' | 'contact_blacklist' | 'none'
    };

    // ─── BLOCK ───────────────────────────────────────────

    // Block user
    sock.block = async (jid) => {
      return sock.updateBlockStatus(jid, 'block');
    };

    // Unblock user
    sock.unblock = async (jid) => {
      return sock.updateBlockStatus(jid, 'unblock');
    };

    // Ambil daftar blocked users
    sock.getBlocklist = async () => {
      return sock.fetchBlocklist();
    };

    // ─── GROUP ───────────────────────────────────────────

    // Buat grup baru
    // Contoh: conn.createGroup("Nama Grup", ["628xxx@s.whatsapp.net"])
    sock.createGroup = async (name, participants) => {
      return sock.groupCreate(name, participants);
    };

    // Keluar dari grup
    sock.leaveGroup = async (jid) => {
      return sock.groupLeave(jid);
    };

    // Update nama grup
    sock.updateGroupName = async (jid, name) => {
      return sock.groupUpdateSubject(jid, name);
    };

    // Update deskripsi grup
    sock.updateGroupDesc = async (jid, desc) => {
      return sock.groupUpdateDescription(jid, desc);
    };

    // Revoke link grup (generate link baru)
    sock.revokeGroupLink = async (jid) => {
      return sock.groupRevokeInvite(jid);
    };

    // Join grup via link
    sock.joinGroupViaLink = async (code) => {
      return sock.groupAcceptInvite(code);
    };

    // Toggle ephemeral/disappearing messages di grup
    sock.setEphemeral = async (jid, duration = 86400) => {
      return sock.groupToggleEphemeral(jid, duration); // 0 = off, 86400 = 1 hari, 604800 = 7 hari
    };

    // Set siapa yang bisa kirim pesan di grup
    sock.setGroupSendMessages = async (jid, mode) => {
      return sock.groupMemberAddMode(jid, mode); // 'all_member_add' | 'admin_add'
    };

    // Set approval join grup
    sock.setGroupJoinApproval = async (jid, mode) => {
      return sock.groupJoinApprovalMode(jid, mode); // 'on' | 'off'
    };

    // ─── CHAT ────────────────────────────────────────────

    // Archive chat
    sock.archiveChat = async (jid, lastMsg) => {
      return sock.chatModify({ archive: true, lastMessages: [lastMsg] }, jid);
    };

    // Unarchive chat
    sock.unarchiveChat = async (jid, lastMsg) => {
      return sock.chatModify({ archive: false, lastMessages: [lastMsg] }, jid);
    };

    // Mute chat
    sock.muteChat = async (jid, duration = null) => {
      return sock.chatModify({ mute: duration || 8 * 60 * 60 * 1000 }, jid);
    };

    // Unmute chat
    sock.unmuteChat = async (jid) => {
      return sock.chatModify({ mute: null }, jid);
    };

    // Pin chat
    sock.pinChat = async (jid) => {
      return sock.chatModify({ pin: true }, jid);
    };

    // Unpin chat
    sock.unpinChat = async (jid) => {
      return sock.chatModify({ pin: false }, jid);
    };

    // Mark chat as read
    sock.markRead = async (jid, keys) => {
      return sock.chatModify({ markRead: true, lastMessages: keys }, jid);
    };

    // Mark chat as unread
    sock.markUnread = async (jid, keys) => {
      return sock.chatModify({ markRead: false, lastMessages: keys }, jid);
    };

    // Star/unstar pesan
    sock.starMsg = async (jid, messages, star = true) => {
      return sock.star(jid, messages, star);
    };

    // ─── LABEL ───────────────────────────────────────────

    // Tambah label ke chat
    sock.addLabel = async (jid, labelId) => {
      return sock.addChatLabel(jid, labelId);
    };

    // Hapus label dari chat
    sock.removeLabel = async (jid, labelId) => {
      return sock.removeChatLabel(jid, labelId);
    };

    // ─── CALL ────────────────────────────────────────────

    // Reject panggilan masuk
    sock.rejectCall = async (callId, callFrom) => {
      return sock.rejectCall(callId, callFrom);
    };
  }
}

module.exports = BaileysWrapper;
