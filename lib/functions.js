function clockString(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${h}j ${m}m ${s}d`;
}

function runtime() {
  return clockString(process.uptime() * 1000);
}

function isUrl(url) {
  return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/.test(url);
}

function getRandom(ext = '') {
  return Math.random().toString(36).substring(2, 10) + ext;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format angka jadi rupiah: 15000 -> "15.000"
function toRupiah(x) {
  return String(Number(x) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

module.exports = { clockString, runtime, isUrl, getRandom, formatSize, toRupiah };
