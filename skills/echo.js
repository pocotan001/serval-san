module.exports = controller => {
  controller.hears("^echo (.+?) (.+)", "direct_message", (bot, message) => {
    const [, channel, text] = message.match;

    bot.say({ text, channel });
  });
};
