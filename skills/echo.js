module.exports = controller => {
  controller.on("slash_command", (bot, message) => {
    // reply to slash command
    bot.replyPublic(message, "Everyone can see this part of the slash command");
    bot.replyPrivate(
      message,
      "Only the person who used the slash command can see this."
    );
  });
};
