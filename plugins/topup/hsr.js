const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['hsr', 'honkaistarrail'],
  category: 'topup',
  desc: 'Top up Honkai Star Rail',
  async run(ctx) { return runGamePlugin(ctx, getGame('hsr')) }
}
