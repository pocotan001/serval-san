const Twitter = require("twitter");
const request = require("request");

const twitter = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

const tweet = bot => {
  twitter
    .post("search/tweets", {
      q: "from:shuumai"
    })
    .then(tweet => {
      bot.say({
        text: tweet,
        channel: CHANNEL
      });
    })
    .catch(err => {
      bot.botkit.log(err);
    });
};

/**
 * つぶやくサーバルさん
 */
module.exports = controller => {
  controller.hears("tweet", ["direct_message"], (bot, message) => {
    tweet(bot);
  });
};
