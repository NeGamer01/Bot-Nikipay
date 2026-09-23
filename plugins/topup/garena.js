const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['garena', 'shell'],
  category: 'topup',
  desc: 'Top up Garena Shell',
  async run(ctx) { return runGamePlugin(ctx, getGame('garena')) }
}
