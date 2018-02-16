const request = require("request");
const querystring = require("querystring");

const API_URL = `https://api.apigw.smt.docomo.ne.jp/knowledgeQA/v1/ask?APIKEY=${
  process.env.DOCOMO_API_KEY
}`;

/**
 * 質問に答えるサーバルさん
 * https://dev.smt.docomo.ne.jp/?p=docs.api.page&api_name=knowledge_qa&p_name=api_usage_scenario
 */
module.exports = controller => {
  controller.hears(
    "[?？]$",
    ["direct_message", "direct_mention", "mention"],
    (bot, message) => {
      request(
        {
          method: "post",
          uri: API_URL,
          json: {
            // 質問内容を設定します
            q: querystring.escape(message.text)
          }
        },
        (err, _, body) => {
          if (err) {
            bot.botkit.log(err);
            return;
          }

          bot.reply(message, body.message.textForDisplay);
        }
      );
    }
  );
};
