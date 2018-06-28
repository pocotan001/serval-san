const Twitter = require("twitter");
const request = require("request");

const CONTEXT_EXPIRY_MS = 180000; // 雑談対話 context の有効期限
const REPLY_FREQUENCY = 0.1; // "ambient" に返答する頻度

/**
 * Twitter の API クライアント
 */
const twitter = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

/**
 * チャンネル毎に保持する雑談対話用 context
 *
 * Map<channelId, { context: string; updatedAt: number; }>
 */
const contexts = new Map();

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * 雑談対話 API
 * https://dev.smt.docomo.ne.jp/?p=docs.api.page&api_name=dialogue&p_name=api_usage_scenario
 */
const dialogue = (bot, message) => {
  const { context, updatedAt } = contexts.get(message.channel) || {};
  const isContextExpired =
    updatedAt && Date.now() - updatedAt > CONTEXT_EXPIRY_MS;

  bot.api.users.info({ user: message.user }, (err, res) => {
    if (err) {
      bot.botkit.log(JSON.stringify(err));
      return;
    }

    request(
      {
        method: "POST",
        uri: `https://api.apigw.smt.docomo.ne.jp/dialogue/v1/dialogue?APIKEY=${
          process.env.DOCOMO_API_KEY
        }`,
        json: {
          // システムから出力された context を入力することにより会話を継続します
          context: !isContextExpired ? context : undefined,
          // ユーザの発話を入力します
          utt: message.text,
          // ユーザのニックネームを設定します
          nickname: res.user.name
        }
      },
      (err, _, body) => {
        if (err) {
          bot.botkit.log(JSON.stringify(err));
          return;
        }

        // Channel ID 毎に context と更新日時を保持
        contexts.set(message.channel, {
          context: body.context,
          updatedAt: Date.now()
        });

        bot.reply(message, body.utt);
      }
    );
  });
};

/**
 * つぶやき
 */
const tweet = (bot, message) => {
  // たまにしゅうまい君
  const q =
    Math.random() < 0.2 ? "from:shuumai min_faves:500" : "from:Leptailurus_bot";

  twitter
    .get("search/tweets", { q })
    .then(tweets => {
      const { text } = tweets.statuses[
        getRandomInt(0, tweets.statuses.length - 1)
      ];

      // メンション @xxx を削除
      bot.reply(message, text.replace(/@[\w ]+/, ""));
    })
    .catch(err => {
      bot.botkit.log(JSON.stringify(err));
    });
};

/**
 * しゃべるサーバルさん
 */
module.exports = controller => {
  controller.hears(
    ".",
    ["direct_message", "direct_mention", "mention", "ambient"],
    (bot, message) => {
      // サーバルちゃんへの言及っぽかったら拾う
      if (/さーばる|サーバル|serval/.test(message.text)) {
        tweet(bot, message);
        return;
      }

      // "ambient" の場合はたまに返答
      if (message.type === "ambient" && Math.random() >= REPLY_FREQUENCY) {
        return;
      }

      // 雑談 API or たまにつぶやきで返答
      if (Math.random() < 0.15) {
        tweet(bot, message);
      } else {
        dialogue(bot, message);
      }

      // たまに追加でつぶやく (5-30分後にコール)
      if (Math.random() < 0.15) {
        setTimeout(() => {
          tweet(bot, message);
        }, getRandomInt(300000, 1800000));
      }
    }
  );
};
