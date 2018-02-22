const request = require("request");
const querystring = require("querystring");

const DIALOGUE_API_URL = `https://api.apigw.smt.docomo.ne.jp/dialogue/v1/dialogue?APIKEY=${
  process.env.DOCOMO_API_KEY
}`;
const TWEET_INTERVAL = 10000;
const CHANNEL = "test-serval";

const tweet = bot => {
  bot.say({
    text: "alo",
    channel: CHANNEL
  });

  setTimeout(tweet, TWEET_INTERVAL);
};

/**
 * つぶやくサーバルさん
 */
module.exports = bot => tweet(bot);
