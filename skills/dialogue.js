const Twitter = require("twitter");
const request = require("request");
const qs = require("querystring");

const DIALOGUE_API_URL = `https://api.apigw.smt.docomo.ne.jp/dialogue/v1/dialogue?APIKEY=${
  process.env.DOCOMO_API_KEY
}`;
const QA_API_URL = `https://api.apigw.smt.docomo.ne.jp/knowledgeQA/v1/ask?APIKEY=${
  process.env.DOCOMO_API_KEY
}`;
const CONTEXT_EXPIRY_MS = 60000; // context の有効期限1分
const REPLY_FREQUENCY = 0.15; // "ambient" に返答する頻度

const twitter = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

let context = null;
let updatedAt = null;

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * 雑談対話 API
 * https://dev.smt.docomo.ne.jp/?p=docs.api.page&api_name=dialogue&p_name=api_usage_scenario
 */
const dialogue = (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (err) {
      bot.botkit.log(JSON.stringify(err));
      return;
    }

    request(
      {
        method: "POST",
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
          bot.botkit.log(JSON.stringify(err));
          return;
        }

        context = body.context;
        updatedAt = Date.now();
        bot.reply(message, body.utt);
      }
    );
  });
};

/**
 * 知識Q&A API
 * https://dev.smt.docomo.ne.jp/?p=docs.api.page&api_name=knowledge_qa&p_name=api_usage_scenario
 */
const qa = (bot, message) => {
  // 質問内容を設定します
  const q = qs.escape(message.text);

  request(
    {
      method: "GET",
      uri: `${QA_API_URL}&q=${q}`
    },
    (err, _, body) => {
      if (err) {
        bot.botkit.log(JSON.stringify(err));
        return;
      }

      const parsedBody = JSON.parse(body);

      if (!!parsedBody.answers.length) {
        bot.reply(message, parsedBody.message.textForDisplay);
      } else {
        // 答えがわかんなかったら雑談 API に投げる
        dialogue(bot, message);
      }
    }
  );
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

      bot.reply(message, text);
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

      // たまに追加でつぶやく (5-30分後にコール)
      if (Math.random() < 0.15) {
        setTimeout(() => {
          tweet(bot, message);
        }, getRandomInt(300000, 1800000));
      }

      // 有効期限を超えてたら context を破棄
      if (updatedAt && Date.now() - updatedAt > CONTEXT_EXPIRY_MS) {
        context = null;
      }

      // 末尾が ? なら Q&A へ
      if (/[?？]$/.test(message.text)) {
        qa(bot, message);
      } else {
        dialogue(bot, message);
      }
    }
  );
};
