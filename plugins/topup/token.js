const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['token', 'pln', 'listrik'],
  category: 'topup',
  desc: 'Beli token listrik PLN',
  async run(ctx) { return runGamePlugin(ctx, getGame('token')) }
}
