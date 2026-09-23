const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['gopay', 'gp'],
  category: 'topup',
  desc: 'Top up GoPay',
  async run(ctx) { return runGamePlugin(ctx, getGame('gopay')) }
}
