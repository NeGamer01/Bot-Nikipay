const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database', 'database.json');

class Database {
  constructor() {
    this.data = {
      users: {},
      groups: {},
      settings: {
        self: false,
        anticall: true
      },
      chats: {}
    };
    this.read();
  }

  read() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(raw);
      }
    } catch (e) {
      console.error('[DB] Gagal baca database:', e.message);
    }
  }

  write() {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('[DB] Gagal tulis database:', e.message);
    }
  }

  save() { this.write(); }

  // Samakan identitas user: LID (xxx@lid) dan nomor WA (628xx@s.whatsapp.net)
  // adalah orang yang sama -> selalu disimpan di kunci nomor WA bila mapping-nya diketahui.
  lidMap() {
    if (global.lidToNumber && global.lidToNumber.size) return global.lidToNumber;
    try {
      const p = path.join(__dirname, '..', 'database', 'lid_map.json');
      if (fs.existsSync(p)) return new Map(Object.entries(JSON.parse(fs.readFileSync(p, 'utf-8'))));
    } catch (e) { /* skip */ }
    return new Map();
  }

  // Lookup reverse: nomor WA -> LID, supaya bisa menemukan record user
  // yang tersimpan di bawah key LID (user WA modern identitasnya LID).
  lidReverseMap() {
    const map = this.lidMap()
    const rev = new Map()
    for (const [lid, num] of map.entries()) rev.set(num, lid)
    return rev
  }

  canon(jid) {
    if (!jid || typeof jid !== 'string') return jid;
    if (jid.endsWith('@g.us') || jid.endsWith('@broadcast')) return jid;
    const map = this.lidMap();
    let phone = null;
    if (jid.endsWith('@lid')) {
      phone = map.get(jid) || map.get(jid.split('@')[0]) || null;
      if (!phone) return jid; // LID belum dikenal -> pakai apa adanya
    } else {
      phone = jid.replace(/[^0-9]/g, '');
      if (!phone) return jid;
    }
    const canonical = phone + '@s.whatsapp.net';
    // Gabungkan data lama yang tersimpan di kunci LID ke kunci nomor
    for (const [lid, num] of map.entries()) {
      const lidKey = lid.endsWith('@lid') ? lid : lid + '@lid';
      if (String(num) === phone && this.data.users[lidKey]) this.mergeUser(lidKey, canonical);
    }
    return canonical;
  }

  /**
   * Resolve nomor WA (628xxx@s.whatsapp.net) -> LID kalau ada di mapping,
   * dan ambil record user yang tersimpan di bawah LID tsb.
   * WA modern: user pertama kali chat bot tersimpan sebagai LID, jadi
   * .transfer <nomor> harus bisa nemu record itu.
   */
  resolveByPhone(phoneJid) {
    if (!phoneJid || !phoneJid.endsWith('@s.whatsapp.net')) return null;
    const phone = phoneJid.replace('@s.whatsapp.net', '');
    const lid = this.lidReverseMap().get(phone);
    if (!lid) return null;
    const lidKey = lid.endsWith('@lid') ? lid : lid + '@lid';
    return this.data.users[lidKey] || null;
  }

  mergeUser(fromJid, toJid) {
    const a = this.data.users[fromJid];
    if (!a) return;
    const b = this.data.users[toJid] || {};
    const merged = { ...a, ...b };
    merged.saldo = (a.saldo || 0) + (b.saldo || 0);
    merged.riwayat = [...(b.riwayat || []), ...(a.riwayat || [])].slice(0, 50);
    merged.chatJid = a.chatJid || b.chatJid || fromJid;
    merged.lid = fromJid;
    merged.pendingDeposit = b.pendingDeposit || a.pendingDeposit || null;
    merged.pendingOrder = b.pendingOrder || a.pendingOrder || null;
    merged.pendingTransfer = b.pendingTransfer || a.pendingTransfer || null;
    this.data.users[toJid] = merged;
    delete this.data.users[fromJid];
    console.log(`[DB] Gabung user ${fromJid} -> ${toJid} (saldo Rp ${merged.saldo})`);
    this.save();
  }

  getUser(jid) {
    jid = this.canon(jid);
    if (!this.data.users[jid]) {
      this.data.users[jid] = {
        name: '',
        phone: '',
        saldo: 0,
        limit: 25,
        premium: false,
        registered: false,
        banned: false,
        lastUse: 0,
        device: null,
        pendingDeposit: null,
        pendingOrder: null,
        pendingTransfer: null,
        riwayat: []
      };
      this.save();
    }
    return this.data.users[jid];
  }

  getUserByPhone(phone) {
    for (const [jid, user] of Object.entries(this.data.users)) {
      if (user.phone === phone) return { jid, ...user };
    }
    return null;
  }

  setUser(jid, data) {
    jid = this.canon(jid);
    this.data.users[jid] = { ...this.getUser(jid), ...data };
    this.save();
  }

  getGroup(jid) {
    if (!this.data.groups[jid]) {
      this.data.groups[jid] = {
        name: '',
        welcome: false,
        welcomeMsg: '',
        left: false,
        leftMsg: '',
        antilink: false,
        antispam: false,
        antikasarr: false,
        kataKasar: [],
        mute: false
      };
      this.save();
    }
    return this.data.groups[jid];
  }

  setGroup(jid, data) {
    this.data.groups[jid] = { ...this.getGroup(jid), ...data };
    this.save();
  }

  getSetting(key) { return this.data.settings[key]; }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  }
}

module.exports = new Database();
