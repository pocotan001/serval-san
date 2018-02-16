const request = require("request");

const DIALOGUE_API_URL = `https://api.apigw.smt.docomo.ne.jp/dialogue/v1/dialogue?APIKEY=${
  process.env.DOCOMO_API_KEY
}`;
const CONTEXT_EXPIRY_MS = 60000; // context の有効期限1分
const REPLY_FREQUENCY = 0.2; // "ambient" に返答する頻度
const WORDS = [
  "すっごーい！",
  "おー！たーのしー！",
  "たべないよ！",
  "いや、わからん",
  "たまらないです ぐへえへへ",
  "う゛っ",
  "うわああああ、しゃべったああ～",
  "君はなまけもののフレンズなんだね！",
  "君は草コインが得意なフレンズなんだね！",
  "へーき、へーき！フレンズによって得意なこと違うから！",
  "あーそーゆーことね、完全に理解した"
];

let context = null;
let updatedAt = null;

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * しゃべるサーバルさん
 * https://dev.smt.docomo.ne.jp/?p=docs.api.page&api_name=dialogue&p_name=api_usage_scenario
 */
module.exports = controller => {
  controller.hears(
    ".",
    ["direct_message", "direct_mention", "mention", "ambient"],
    (bot, message) => {
      // "ambient" の場合はたまに返答
      if (message.type === "ambient" && Math.random() >= REPLY_FREQUENCY) {
        return;
      }

      // たまにサーバルちゃんっぽさをだす小細工
      if (Math.random() < 0.1) {
        const utt = WORDS[getRandomInt(0, WORDS.length - 1)];

        bot.reply(message, utt);
        return;
      }

      // 有効期限を超えてたら context を破棄
      if (updatedAt && Date.now() - updatedAt > CONTEXT_EXPIRY_MS) {
        context = null;
      }

      bot.api.users.info({ user: message.user }, (err, res) => {
        if (err) {
          bot.botkit.log("Failed to fetch user information", err);
          return;
        }

        request(
          {
            method: "post",
            uri: DIALOGUE_API_URL,
            json: {
              // システムから出力された context を入力することにより会話を継続します
              context,
              // ユーザの発話を入力します
              utt: message.text,
              // ユーザのニックネームを設定します
              nickname: res.user.name
            }
          },
          (err, _, body) => {
            if (err) {
              bot.botkit.log(err);
              return;
            }

            context = body.context;
            updatedAt = Date.now();
            bot.reply(message, body.utt);
          }
        );
      });
    }
  );
};
