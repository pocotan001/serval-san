module.exports = controller => {
  controller.on("user_channel_join,user_group_join", (bot, message) => {
    bot.api.reactions.add(
      {
        timestamp: message.ts,
        channel: message.channel,
        name: "sugoi"
      },
      err => {
        if (err) {
          bot.botkit.log(JSON.stringify(err));
        }
      }
    );

    bot.api.users.info({ user: message.user }, (err, res) => {
      if (err) {
        bot.botkit.log(JSON.stringify(err));
        return;
      }

      bot.reply(
        message,
        `<@${
          res.user.name
        }> ようこそジャパリパークへ！わたしはサーバルキャットのサーバルだよ！`
      );
    });
  });
};
