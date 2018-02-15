const dialogueApiUrl = `https://api.apigw.smt.docomo.ne.jp/dialogue/v1/dialogue?APIKEY=${
  process.env.DOCOMO_API_KEY
}`;

let context = null;

module.exports = controller => {
  controller.hears(
    "(.+)",
    ["direct_message", "direct_mention", "mention"],
    (bot, message) => {
      bot.api.users.info({ user: message.user }, (err, res) => {
        if (err) {
          bot.botkit.log("Failed to fetch user information", err);
          return;
        }

        bot.reply(message, JSON.stringify(message, null, 2));

        fetch(dialogueApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // システムから出力された context を入力することにより会話を継続します
            context,
            // ユーザの発話を入力します
            utt: message.text,
            // ユーザのニックネームを設定します
            nickname: message.user
          })
        })
          .then(res => res.json())
          .catch(err => bot.botkit.log(err))
          .then(res => {
            context = json.context;
            bot.reply(message, json.utt);

            bot.reply(json, JSON.stringify(message, null, 2));
          });
      });
    }
  );
};
