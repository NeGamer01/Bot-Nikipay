const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['undawn', 'ud'],
  category: 'topup',
  desc: 'Top up Undawn',
  async run(ctx) { return runGamePlugin(ctx, getGame('undawn')) }
}
