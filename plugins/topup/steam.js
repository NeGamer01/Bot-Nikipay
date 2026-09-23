const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['steam', 'steamwallet'],
  category: 'topup',
  desc: 'Top up Steam Wallet',
  async run(ctx) { return runGamePlugin(ctx, getGame('steam')) }
}
