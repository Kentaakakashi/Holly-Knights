require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    GatewayIntentBits,
    Events,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType
} = require("discord.js");

// ==========================================
// BOT
// ==========================================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ==========================================
// CONFIG
// ==========================================

const WAR_ROLE_ID = process.env.WAR_ROLE_ID;
const BACKUP_ROLE_ID = process.env.BACKUP_ROLE_ID;
const DASHBOARD_CHANNEL_ID = process.env.DASHBOARD_CHANNEL_ID;

// India timezone
const TIMEZONE = "Asia/Kolkata";

// 1 minute cooldown per user
const COOLDOWN_TIME = 60 * 1000;

// Persistent data file
const DATA_FILE = path.join(__dirname, "data.json");

// ==========================================
// DATA
// ==========================================

let data = {
    date: "",
    war: 0,
    backup: 0,
    dashboardMessageId: null
};

// ==========================================
// COOLDOWNS
// ==========================================

const cooldowns = new Map();

// ==========================================
// DASHBOARD
// ==========================================

let dashboardMessage = null;

// ==========================================
// GET TODAY'S DATE
// ==========================================

function getToday() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
}

// ==========================================
// LOAD DATA
// ==========================================

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const savedData = JSON.parse(
                fs.readFileSync(DATA_FILE, "utf8")
            );

            data = {
                ...data,
                ...savedData
            };

            console.log("📂 Saved data loaded.");
        }
    } catch (error) {
        console.error("❌ Could not load data:", error);
    }

    const today = getToday();

    // New day = reset today's counters
    if (data.date !== today) {
        data.date = today;
        data.war = 0;
        data.backup = 0;

        saveData();

        console.log("🌅 New day detected. Counters reset.");
    }
}

// ==========================================
// SAVE DATA
// ==========================================

function saveData() {
    try {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(data, null, 4)
        );

        console.log("💾 Data saved.");
    } catch (error) {
        console.error("❌ Could not save data:", error);
    }
}

// ==========================================
// CHECK DAILY RESET
// ==========================================

function checkDailyReset() {
    const today = getToday();

    if (data.date !== today) {
        data.date = today;
        data.war = 0;
        data.backup = 0;

        saveData();

        console.log("🌅 Counters reset for the new day.");

        return true;
    }

    return false;
}

// ==========================================
// DASHBOARD EMBED
// ==========================================

function createDashboardEmbed() {
    const totalCount = data.war + data.backup;

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
                `⚔️ **WAR** — ${data.war}\n` +
                `🛡️ **BACKUP** — ${data.backup}\n` +
                `📢 **TOTAL** — ${totalCount}`
        })
        .setFooter({
            text: "Holly Knights • Assistance System"
        })
        .setTimestamp();
}

// ==========================================
// DASHBOARD BUTTONS
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
// CREATE WAR MODAL
// ==========================================

function createWarModal() {
    const modal = new ModalBuilder()
        .setCustomId("war_modal")
        .setTitle("⚔️ WAR REQUEST");

    const region = new TextInputBuilder()
        .setCustomId("region")
        .setLabel("Region")
        .setPlaceholder("Example: India / Asia / Europe / NA")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const serverLink = new TextInputBuilder()
        .setCustomId("server_link")
        .setLabel("Server / Game Link")
        .setPlaceholder("Paste the game/server link")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(500);

    const reason = new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Reason")
        .setPlaceholder("Why do you need members for the war?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    const clan = new TextInputBuilder()
        .setCustomId("clan")
        .setLabel("Clan / People Names")
        .setPlaceholder("Example: Black Dragon")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200);

    modal.addComponents(
        new ActionRowBuilder().addComponents(region),
        new ActionRowBuilder().addComponents(serverLink),
        new ActionRowBuilder().addComponents(reason),
        new ActionRowBuilder().addComponents(clan)
    );

    return modal;
}

// ==========================================
// CREATE BACKUP MODAL
// ==========================================

function createBackupModal() {
    const modal = new ModalBuilder()
        .setCustomId("backup_modal")
        .setTitle("🛡️ BACKUP REQUEST");

    const region = new TextInputBuilder()
        .setCustomId("region")
        .setLabel("Region")
        .setPlaceholder("Example: India / Asia / Europe / NA")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const serverLink = new TextInputBuilder()
        .setCustomId("server_link")
        .setLabel("Server / Game Link")
        .setPlaceholder("Paste the game/server link")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(500);

    const reason = new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Reason")
        .setPlaceholder("Why do you need backup?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    const clan = new TextInputBuilder()
        .setCustomId("clan")
        .setLabel("Clan / People Names")
        .setPlaceholder("Example: Black Dragon")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200);

    modal.addComponents(
        new ActionRowBuilder().addComponents(region),
        new ActionRowBuilder().addComponents(serverLink),
        new ActionRowBuilder().addComponents(reason),
        new ActionRowBuilder().addComponents(clan)
    );

    return modal;
}

// ==========================================
// CREATE REQUEST EMBED
// ==========================================

function createRequestEmbed(type, user, details) {
    const isWar = type === "war";

    const title = isWar
        ? "⚔️ WAR REQUEST"
        : "🛡️ BACKUP REQUEST";

    const description = isWar
        ? `${user} has requested a **WAR**.\n\nIf you're available, join up and assist.`
        : `${user} has requested **BACKUP**.\n\nIf you're available, join up and assist.`;

    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .addFields(
            {
                name: "🌍 Region",
                value: details.region
            },
            {
                name: "👤 Requested By",
                value: `${user}`
            },
            {
                name: "👥 Clan / People",
                value: details.clan
            },
            {
                name: "📝 Reason",
                value: details.reason
            },
            {
                name: "🔗 Server Link",
                value: details.serverLink
            },
            {
                name: "📊 Today's Statistics",
                value:
                    `⚔️ WAR — ${data.war}\n` +
                    `🛡️ BACKUP — ${data.backup}\n` +
                    `📢 TOTAL — ${data.war + data.backup}`
            }
        )
        .setTimestamp();
}

// ==========================================
// CREATE REQUEST THREAD
// ==========================================

async function createRequestThread(type, interaction, details) {
    const channel = interaction.channel;

    if (!channel) {
        throw new Error("Interaction channel not found.");
    }

    const isWar = type === "war";

    const roleId = isWar
        ? WAR_ROLE_ID
        : BACKUP_ROLE_ID;

    const threadName = isWar
        ? `⚔️ WAR - ${interaction.user.username}`
        : `🛡️ BACKUP - ${interaction.user.username}`;

    // Create a public thread
    const thread = await channel.threads.create({
        name: threadName,
        type: ChannelType.PublicThread,
        autoArchiveDuration: 1440,
        reason: isWar
            ? "Holly Knights WAR request"
            : "Holly Knights BACKUP request"
    });

    // Send request inside the thread
    await thread.send({
        content: `<@&${roleId}>`,
        embeds: [
            createRequestEmbed(
                type,
                interaction.user,
                details
            )
        ],
        allowedMentions: {
            roles: [roleId]
        }
    });

    return thread;
}

// ==========================================
// FIND OR CREATE DASHBOARD
// ==========================================

async function setupDashboard(bot) {
    try {
        const channel = await bot.channels.fetch(
            DASHBOARD_CHANNEL_ID
        );

        if (!channel) {
            console.log("❌ Dashboard channel not found.");
            return;
        }

        // First try saved dashboard message
        if (data.dashboardMessageId) {
            try {
                dashboardMessage =
                    await channel.messages.fetch(
                        data.dashboardMessageId
                    );

                console.log("✅ Saved dashboard found!");

                await updateDashboard();

                return;
            } catch (error) {
                console.log(
                    "⚠️ Saved dashboard could not be found. Searching..."
                );

                dashboardMessage = null;
                data.dashboardMessageId = null;
                saveData();
            }
        }

        // Search recent messages
        const messages = await channel.messages.fetch({
            limit: 50
        });

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

        if (dashboardMessage) {
            data.dashboardMessageId =
                dashboardMessage.id;

            saveData();

            await updateDashboard();

            console.log("✅ Existing dashboard found!");
            return;
        }

        // No dashboard exists, create one
        dashboardMessage = await channel.send({
            embeds: [createDashboardEmbed()],
            components: [createButtons()]
        });

        data.dashboardMessageId =
            dashboardMessage.id;

        saveData();

        console.log("✅ New dashboard created!");

    } catch (error) {
        console.error(
            "❌ Dashboard setup failed:",
            error
        );
    }
}

// ==========================================
// BOT READY
// ==========================================

client.once(Events.ClientReady, async bot => {
    console.log(`✅ ${bot.user.tag} is online!`);

    loadData();

    await setupDashboard(bot);
});

// ==========================================
// BUTTON HANDLER
// ==========================================

client.on(
    Events.InteractionCreate,
    async interaction => {

        if (!interaction.isButton()) return;

        // Make sure counters belong to today
        checkDailyReset();

        const userId = interaction.user.id;

        // ======================================
        // COOLDOWN
        // ======================================

        const lastUsed = cooldowns.get(userId);

        if (lastUsed) {
            const timePassed =
                Date.now() - lastUsed;

            if (timePassed < COOLDOWN_TIME) {

                const remaining = Math.ceil(
                    (COOLDOWN_TIME - timePassed) / 1000
                );

                await interaction.reply({
                    content:
                        `⏳ **Slow down!** You can request again in **${remaining} seconds**.`,
                    ephemeral: true
                });

                return;
            }
        }

        // ======================================
        // WAR BUTTON
        // ======================================

        if (interaction.customId === "war") {

            await interaction.showModal(
                createWarModal()
            );

            return;
        }

        // ======================================
        // BACKUP BUTTON
        // ======================================

        if (interaction.customId === "backup") {

            await interaction.showModal(
                createBackupModal()
            );

            return;
        }
    }
);

// ==========================================
// MODAL SUBMISSION HANDLER
// ==========================================

client.on(
    Events.InteractionCreate,
    async interaction => {

        if (!interaction.isModalSubmit()) return;

        // ======================================
        // CHECK DAILY RESET
        // ======================================

        checkDailyReset();

        const isWar =
            interaction.customId === "war_modal";

        const isBackup =
            interaction.customId === "backup_modal";

        if (!isWar && !isBackup) return;

        const userId = interaction.user.id;

        // ======================================
        // CHECK COOLDOWN AGAIN
        // ======================================

        const lastUsed = cooldowns.get(userId);

        if (lastUsed) {

            const timePassed =
                Date.now() - lastUsed;

            if (timePassed < COOLDOWN_TIME) {

                const remaining = Math.ceil(
                    (COOLDOWN_TIME - timePassed) / 1000
                );

                await interaction.reply({
                    content:
                        `⏳ **Slow down!** You can request again in **${remaining} seconds**.`,
                    ephemeral: true
                });

                return;
            }
        }

        // ======================================
        // GET FORM DATA
        // ======================================

        const details = {
            region: interaction.fields.getTextInputValue(
                "region"
            ),

            serverLink: interaction.fields.getTextInputValue(
                "server_link"
            ),

            reason: interaction.fields.getTextInputValue(
                "reason"
            ),

            clan: interaction.fields.getTextInputValue(
                "clan"
            )
        };

        const type = isWar
            ? "war"
            : "backup";

        // ======================================
        // CREATE THREAD + REQUEST
        // ======================================

        try {

            // Defer while thread is being created
            await interaction.deferReply({
                ephemeral: true
            });

            const thread =
                await createRequestThread(
                    type,
                    interaction,
                    details
                );

            // ==================================
            // INCREMENT COUNTER
            // ==================================

            if (isWar) {
                data.war++;
            } else {
                data.backup++;
            }

            // ==================================
            // START COOLDOWN
            // ==================================

            cooldowns.set(
                userId,
                Date.now()
            );

            // ==================================
            // SAVE EVERYTHING
            // ==================================

            saveData();

            // ==================================
            // UPDATE DASHBOARD
            // ==================================

            await updateDashboard();

            // ==================================
            // CONFIRMATION
            // ==================================

            await interaction.editReply({
                content:
                    `✅ Your ${isWar ? "WAR" : "BACKUP"} request has been created!\n\n` +
                    `📁 ${thread}`
            });

        } catch (error) {

            console.error(
                "❌ Could not create request:",
                error
            );

            // Do NOT start cooldown if request failed
            await interaction.editReply({
                content:
                    "❌ Something went wrong while creating your request. Please try again."
            });
        }
    }
);

// ==========================================
// LOGIN
// ==========================================

client.login(
    process.env.DISCORD_TOKEN
);
