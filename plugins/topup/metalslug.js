const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['metalslug', 'msa'],
  category: 'topup',
  desc: 'Top up Metal Slug Awakening',
  async run(ctx) { return runGamePlugin(ctx, getGame('metalslug')) }
}
