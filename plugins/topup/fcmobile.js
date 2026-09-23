const { getGame, runGamePlugin } = require('../../lib/gameCatalog')

module.exports = {
  command: ['fcmobile', 'fcm', 'fc'],
  category: 'topup',
  desc: 'Top up FC Mobile',
  async run(ctx) { return runGamePlugin(ctx, getGame('fcmobile')) }
}
