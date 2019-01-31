const Twitter = require("twitter");
const request = require("request");

const REPLY_FREQUENCY = 0.05; // "ambient" に返答する頻度

/**
 * Twitter の API クライアント
 */
const twitter = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

// Map<userId, { id: string; appId: string; serverSendTime: string }>
const users = new Map();

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const formatDate = date =>
  date.toLocaleDateString([], {
    timeZone: "Asia/Tokyo",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

// たまにキャラ変わる
const getRandomT = () => {
  const result = Math.random();

  if (result < 0.1) {
    return "kansai";
  } else if (result < 0.2) {
    return "akachan";
  }
};

/**
 * ユーザ登録（雑談対話）
 * https://dev.smt.docomo.ne.jp/?p=docs.api.page&api_name=natural_dialogue&p_name=api_4_user_registration#tag01
 */
const registration = cb => {
  request(
    {
      method: "POST",
      uri: `https://api.apigw.smt.docomo.ne.jp/naturalChatting/v1/registration?APIKEY=${
        process.env.DOCOMO_API_KEY
      }`,
      json: {
        botId: "Chatting",
        appKind: "serval-san"
      }
    },
    (err, _, body) => {
      if (err) {
        cb(err);
        return;
      }

      // body: { appId: string }
      cb(null, body);
    }
  );
};

/**
 * 雑談対話 API
 * https://dev.smt.docomo.ne.jp/?p=docs.api.page&api_name=natural_dialogue&p_name=api_4#tag01
 */
const dialogue = (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (err) {
      bot.botkit.log(JSON.stringify(err));
      return;
    }

    const dialog = user => {
      request(
        {
          method: "POST",
          uri: `https://api.apigw.smt.docomo.ne.jp/naturalChatting/v1/dialogue?APIKEY=${
            process.env.DOCOMO_API_KEY
          }`,
          json: {
            language: "ja-JP",
            botId: "Chatting",
            appId: user.appId,
            voiceText: message.text,
            clientData: {
              option: {
                nickname: res.user.name,
                sex: "男",
                place: "東京",
                mode: "dialog",
                // kansai：関西弁キャラ
                // akachan：赤ちゃんキャラ
                // 指定なし：デフォルトキャラ
                t: getRandomT()
              }
            },
            appRecvTime: user.serverSendTime || formatDate(new Date()),
            appSendTime: formatDate(new Date())
          }
        },
        (err, _, body) => {
          if (err) {
            bot.botkit.log(JSON.stringify(err));
            return;
          }

          user.serverSendTime = body.serverSendTime;
          users.set(user.id, user);
          bot.reply(message, body.systemText.expression);
        }
      );
    };

    if (users.has(res.user.id)) {
      const user = users.get(res.user.id);

      dialog(user);
    } else {
      const user = { id: res.user.id };

      registration((err, body) => {
        if (err) {
          bot.botkit.log(JSON.stringify(err));
          return;
        }

        user.appId = body.appId;
        users.set(res.user.id, user);
        dialog(user);
      });
    }
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
