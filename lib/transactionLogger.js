const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', 'database', 'transactions.json');

class TransactionLogger {
  constructor() {
    this.transactions = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(LOG_PATH)) {
        const raw = fs.readFileSync(LOG_PATH, 'utf-8');
        this.transactions = JSON.parse(raw);
      }
    } catch (e) {
      console.error('[TX-LOG] Gagal baca log transaksi:', e.message);
      this.transactions = [];
    }
  }

  save() {
    try {
      fs.writeFileSync(LOG_PATH, JSON.stringify(this.transactions, null, 2));
    } catch (e) {
      console.error('[TX-LOG] Gagal tulis log transaksi:', e.message);
    }
  }

  log(transaction) {
    this.transactions.unshift({
      id: Date.now() + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      ...transaction
    });

    // Keep only last 1000 transactions
    if (this.transactions.length > 1000) {
      this.transactions = this.transactions.slice(0, 1000);
    }

    this.save();
  }

  getTransactions(startDate, endDate) {
    return this.transactions.filter(tx => {
      const txDate = tx.timestamp;
      return txDate >= startDate && txDate <= endDate;
    });
  }

  getTodayTransactions() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getTransactions(today.getTime(), Date.now());
  }

  getThisWeekTransactions() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return this.getTransactions(startOfWeek.getTime(), Date.now());
  }

  getThisMonthTransactions() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.getTransactions(startOfMonth.getTime(), Date.now());
  }
}

module.exports = new TransactionLogger();
