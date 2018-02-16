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
      // 質問内容を設定します
      const q = querystring.escape(message.text);

      request(
        {
          method: "GET",
          uri: `${API_URL}&q=${q}`
        },
        (err, _, body) => {
          if (err) {
            bot.botkit.log(err);
            return;
          }

          const parsedBody = JSON.parse(body);

          bot.reply(message, JSON.stringify(parsedBody, null, 2));

          bot.reply(message, parsedBody.message.textForDisplay);
        }
      );
    }
  );
};
