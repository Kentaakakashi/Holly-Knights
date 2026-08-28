require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, (bot) => {
  console.log(`✅ ${bot.user.tag} is online!`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "war") {
    await interaction.reply("⚔️ WAR button pressed!");
  }

  if (interaction.customId === "backup") {
    await interaction.reply("🛡️ BACKUP button pressed!");
  }
});

client.login(process.env.DISCORD_TOKEN);
