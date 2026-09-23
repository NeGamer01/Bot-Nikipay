const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['sausageman', 'sm', 'sausage'],
  category: 'topup',
  desc: 'Top up Sausage Man',
  async run(ctx) { return runGamePlugin(ctx, getGame('sausageman')) }
}
