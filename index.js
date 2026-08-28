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

// ================================
// CONFIG
// ================================

const WAR_ROLE_ID = process.env.WAR_ROLE_ID;
const BACKUP_ROLE_ID = process.env.BACKUP_ROLE_ID;
const DASHBOARD_CHANNEL_ID = process.env.DASHBOARD_CHANNEL_ID;

// ================================
// PING COUNTERS
// ================================

let warCount = 0;
let backupCount = 0;

// ================================
// CREATE DASHBOARD
// ================================

function createDashboardEmbed() {
    const totalCount = warCount + backupCount;

    return new EmbedBuilder()
        .setTitle("🏰 HOLLY KNIGHTS")
        .setDescription(
            "Need assistance? Use the buttons below to notify the appropriate members.\n\n" +
            "⚔️ **WAR**\n" +
            "Request members for a war.\n\n" +
            "🛡️ **BACKUP**\n" +
            "Request members to back you up."
        )
        .addFields({
            name: "📊 TODAY'S PING STATUS",
            value:
                `⚔️ **WAR** — ${warCount}\n` +
                `🛡️ **BACKUP** — ${backupCount}\n` +
                `📢 **TOTAL** — ${totalCount}`
        })
        .setFooter({
            text: "Holly Knights • Assistance System"
        })
        .setTimestamp();
}

// ================================
// CREATE BUTTONS
// ================================

function createButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("war")
            .setLabel("WAR")
            .setEmoji("⚔️")
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("backup")
            .setLabel("BACKUP")
            .setEmoji("🛡️")
            .setStyle(ButtonStyle.Primary)
    );
}

// ================================
// BOT READY
// ================================

client.once(Events.ClientReady, async (bot) => {
    console.log(`✅ ${bot.user.tag} is online!`);

    try {
        const channel = await bot.channels.fetch(DASHBOARD_CHANNEL_ID);

        if (!channel) {
            console.log("❌ Dashboard channel not found.");
            return;
        }

        await channel.send({
            embeds: [createDashboardEmbed()],
            components: [createButtons()]
        });

        console.log("✅ Dashboard sent successfully!");
    } catch (error) {
        console.error("❌ Could not send dashboard:", error);
    }
});

// ================================
// BUTTON HANDLER
// ================================

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "war") {
        warCount++;

        await interaction.reply({
            content: `<@&${WAR_ROLE_ID}>`,
            embeds: [
                new EmbedBuilder()
                    .setTitle("⚔️ WAR REQUEST")
                    .setDescription(
                        `${interaction.user} has requested a **WAR**.\n\n` +
                        "If you're available, join up and assist."
                    )
                    .addFields({
                        name: "📊 Today's Statistics",
                        value:
                            `⚔️ WAR — ${warCount}\n` +
                            `🛡️ BACKUP — ${backupCount}\n` +
                            `📢 TOTAL — ${warCount + backupCount}`
                    })
                    .setTimestamp()
            ],
            allowedMentions: {
                roles: [WAR_ROLE_ID]
            }
        });

        return;
    }

    if (interaction.customId === "backup") {
        backupCount++;

        await interaction.reply({
            content: `<@&${BACKUP_ROLE_ID}>`,
            embeds: [
                new EmbedBuilder()
                    .setTitle("🛡️ BACKUP REQUEST")
                    .setDescription(
                        `${interaction.user} has requested **BACKUP**.\n\n` +
                        "If you're available, join up and assist."
                    )
                    .addFields({
                        name: "📊 Today's Statistics",
                        value:
                            `⚔️ WAR — ${warCount}\n` +
                            `🛡️ BACKUP — ${backupCount}\n` +
                            `📢 TOTAL — ${warCount + backupCount}`
                    })
                    .setTimestamp()
            ],
            allowedMentions: {
                roles: [BACKUP_ROLE_ID]
            }
        });

        return;
    }
});

// ================================
// LOGIN
// ================================

client.login(process.env.DISCORD_TOKEN);
