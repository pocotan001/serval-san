const request = require("request");
const querystring = require("querystring");

const DIALOGUE_API_URL = `https://api.apigw.smt.docomo.ne.jp/dialogue/v1/dialogue?APIKEY=${
  process.env.DOCOMO_API_KEY
}`;
const QA_API_URL = `https://api.apigw.smt.docomo.ne.jp/knowledgeQA/v1/ask?APIKEY=${
  process.env.DOCOMO_API_KEY
}`;
const CONTEXT_EXPIRY_MS = 60000; // context の有効期限1分
const REPLY_FREQUENCY = 0.15; // "ambient" に返答する頻度
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
 * 雑談対話 API
 * https://dev.smt.docomo.ne.jp/?p=docs.api.page&api_name=dialogue&p_name=api_usage_scenario
 */
const dialogue = (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (err) {
      bot.botkit.log("Failed to fetch user information", err);
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
          bot.botkit.log(err);
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
  const q = querystring.escape(message.text);

  request(
    {
      method: "GET",
      uri: `${QA_API_URL}&q=${q}`
    },
    (err, _, body) => {
      if (err) {
        bot.botkit.log(err);
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
 * しゃべるサーバルさん
 */
module.exports = controller => {
  controller.hears(
    ".",
    ["direct_message", "direct_mention", "mention", "ambient"],
    (bot, message) => {
      // "ambient" の場合はたまに返答 (サーバルちゃんへの言及っぽかったら拾う)
      if (
        message.type === "ambient" &&
        !/さーばる|サーバル|serval/.test(message.text) &&
        Math.random() >= REPLY_FREQUENCY
      ) {
        return;
      }

      // たまにサーバルちゃんっぽさをだす小細工
      if (Math.random() < 0.05) {
        const utt = WORDS[getRandomInt(0, WORDS.length - 1)];

        bot.reply(message, utt);
        return;
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
