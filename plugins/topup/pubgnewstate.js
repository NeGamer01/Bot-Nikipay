const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['pubgnewstate', 'pns', 'newstate'],
  category: 'topup',
  desc: 'Top up PUBG New State',
  async run(ctx) { return runGamePlugin(ctx, getGame('pubgnewstate')) }
}
