const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['tv', 'nexparabola', 'nex'],
  category: 'topup',
  desc: 'Top up Nex Parabola',
  async run(ctx) { return runGamePlugin(ctx, getGame('tv')) }
}
