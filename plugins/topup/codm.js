const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['codm', 'cod'],
  category: 'topup',
  desc: 'Top up Call of Duty Mobile',
  async run(ctx) { return runGamePlugin(ctx, getGame('codm')) }
}
