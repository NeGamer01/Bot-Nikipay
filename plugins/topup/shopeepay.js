const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['shopeepay', 'spay'],
  category: 'topup',
  desc: 'Top up ShopeePay',
  async run(ctx) { return runGamePlugin(ctx, getGame('shopeepay')) }
}
