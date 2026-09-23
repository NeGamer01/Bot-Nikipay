const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['stumbleguys', 'sg', 'stumble'],
  category: 'topup',
  desc: 'Top up Stumble Guys',
  async run(ctx) { return runGamePlugin(ctx, getGame('stumbleguys')) }
}
