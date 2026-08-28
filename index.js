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

// ==========================================
// CONFIG
// ==========================================

const WAR_ROLE_ID = process.env.WAR_ROLE_ID;
const BACKUP_ROLE_ID = process.env.BACKUP_ROLE_ID;
const DASHBOARD_CHANNEL_ID = process.env.DASHBOARD_CHANNEL_ID;

const COOLDOWN_TIME = 60 * 1000; // 1 minute

// ==========================================
// COUNTERS
// ==========================================

let warCount = 0;
let backupCount = 0;

// ==========================================
// COOLDOWNS
// ==========================================

const cooldowns = new Map();

// ==========================================
// DASHBOARD MESSAGE
// ==========================================

let dashboardMessage = null;

// ==========================================
// CREATE DASHBOARD EMBED
// ==========================================

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

// ==========================================
// CREATE BUTTONS
// ==========================================

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

// ==========================================
// UPDATE DASHBOARD
// ==========================================

async function updateDashboard() {
    if (!dashboardMessage) return;

    try {
        await dashboardMessage.edit({
            embeds: [createDashboardEmbed()],
            components: [createButtons()]
        });

        console.log("📊 Dashboard updated!");
    } catch (error) {
        console.error("❌ Could not update dashboard:", error);
    }
}

// ==========================================
// FIND OR CREATE DASHBOARD
// ==========================================

async function setupDashboard(bot) {
    try {
        const channel = await bot.channels.fetch(DASHBOARD_CHANNEL_ID);

        if (!channel) {
            console.log("❌ Dashboard channel not found.");
            return;
        }

        // Look through recent messages for our existing dashboard
        const messages = await channel.messages.fetch({ limit: 50 });

        dashboardMessage = messages.find(
            message =>
                message.author.id === bot.user.id &&
                message.components.length > 0 &&
                message.components.some(row =>
                    row.components.some(button =>
                        button.customId === "war"
                    )
                )
        );

        // If no dashboard exists, create one
        if (!dashboardMessage) {
            dashboardMessage = await channel.send({
                embeds: [createDashboardEmbed()],
                components: [createButtons()]
            });

            console.log("✅ New dashboard created!");
        } else {
            // Update existing dashboard
            await updateDashboard();

            console.log("✅ Existing dashboard found!");
        }

    } catch (error) {
        console.error("❌ Dashboard setup failed:", error);
    }
}

// ==========================================
// BOT READY
// ==========================================

client.once(Events.ClientReady, async (bot) => {
    console.log(`✅ ${bot.user.tag} is online!`);

    await setupDashboard(bot);
});

// ==========================================
// BUTTON HANDLER
// ==========================================

client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.isButton()) return;

    const userId = interaction.user.id;

    // ======================================
    // CHECK COOLDOWN
    // ======================================

    const lastUsed = cooldowns.get(userId);

    if (lastUsed) {
        const timePassed = Date.now() - lastUsed;

        if (timePassed < COOLDOWN_TIME) {
            const remaining = Math.ceil(
                (COOLDOWN_TIME - timePassed) / 1000
            );

            await interaction.reply({
                content: `⏳ **Slow down!** You can request again in **${remaining} seconds**.`,
                ephemeral: true
            });

            return;
        }
    }

    // ======================================
    // WAR
    // ======================================

    if (interaction.customId === "war") {

        cooldowns.set(userId, Date.now());

        warCount++;

        // Update main dashboard
        await updateDashboard();

        // Send WAR request
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

    // ======================================
    // BACKUP
    // ======================================

    if (interaction.customId === "backup") {

        cooldowns.set(userId, Date.now());

        backupCount++;

        // Update main dashboard
        await updateDashboard();

        // Send BACKUP request
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

// ==========================================
// LOGIN
// ==========================================

client.login(process.env.DISCORD_TOKEN);
