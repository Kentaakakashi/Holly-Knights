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
// DASHBOARD BANNER
// ==========================================
//
// IMPORTANT:
// Replace the text below with your GIF's direct URL.
//
// Example:
// const BANNER_URL = "https://cdn.discordapp.com/attachments/.../banner.gif";
//
// If left empty, the dashboard will simply have no banner
// until you add one.
//
// ==========================================

const BANNER_URL = "";

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

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🏰 HOLLY KNIGHTS")
        .setDescription(
            "## REINFORCEMENT CENTER\n\n" +
            "The battlefield doesn't wait.\n" +
            "When your squad needs another knight, send the call.\n\n" +

            "### ⚔️ REQUEST ASSISTANCE\n\n" +

            "⚔️ **WAR CALL**\n" +
            "Gather knights for battle.\n\n" +

            "🛡️ **BACKUP CALL**\n" +
            "Request immediate reinforcement."
        )
        .addFields({
            name: "📊 TODAY'S CALLS",
            value:
                "⚔️ **War** — `" + data.war + "`\n" +
                "🛡️ **Backup** — `" + data.backup + "`\n" +
                "📢 **Total** — `" + totalCount + "`"
        })
        .setFooter({
            text: "Holly Knights • United by oath • Strong in battle"
        });

    // Only add the banner if a valid URL has been provided
    if (
        BANNER_URL &&
        BANNER_URL.startsWith("http")
    ) {
        embed.setImage(https://cdn.discordapp.com/attachments/1542930463495295077/1542930501952864266/IMG_20260828_214420.jpg?ex=6a930581&is=6a91b401&hm=6362ab065128692b2220db4e836e714f4a88208dc3ffc5b530d39a5c2999c80b&);
    }

    return embed;
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
            embeds: [
                createDashboardEmbed()
            ],
            components: [
                createButtons()
            ]
        });

        console.log("📊 Dashboard updated!");
    } catch (error) {
        console.error(
            "❌ Could not update dashboard:",
            error
        );
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
        .setPlaceholder(
            "Example: India / Asia / Europe / NA"
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const serverLink = new TextInputBuilder()
        .setCustomId("server_link")
        .setLabel("Server / Game Link")
        .setPlaceholder(
            "Paste the game/server link"
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(500);

    const reason = new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Reason")
        .setPlaceholder(
            "Why do you need members for the war?"
        )
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    const clan = new TextInputBuilder()
        .setCustomId("clan")
        .setLabel("Clan / People Names")
        .setPlaceholder(
            "Enter the clan or people involved"
        )
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
        .setPlaceholder(
            "Example: India / Asia / Europe / NA"
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const serverLink = new TextInputBuilder()
        .setCustomId("server_link")
        .setLabel("Server / Game Link")
        .setPlaceholder(
            "Paste the game/server link"
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(500);

    const reason = new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Reason")
        .setPlaceholder(
            "Why do you need backup?"
        )
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    const clan = new TextInputBuilder()
        .setCustomId("clan")
        .setLabel("Clan / People Names")
        .setPlaceholder(
            "Enter the clan or people involved"
        )
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

function createRequestEmbed(
    type,
    user,
    details
) {
    const isWar = type === "war";

    const title = isWar
        ? "⚔️ WAR REQUEST"
        : "🛡️ BACKUP REQUEST";

    const description = isWar
        ? `${user} has requested a **WAR**.\n\n` +
          "If you're available, join up and assist."
        : `${user} has requested **BACKUP**.\n\n` +
          "If you're available, join up and assist.";

    return new EmbedBuilder()
        .setColor(
            isWar
                ? 0xED4245
                : 0x5865F2
        )
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
            }
        )
        .setTimestamp();
}

// ==========================================
// CREATE REQUEST THREAD
// ==========================================

async function createRequestThread(
    type,
    interaction,
    details
) {
    const channel = interaction.channel;

    if (!channel) {
        throw new Error(
            "Interaction channel not found."
        );
    }

    const isWar = type === "war";

    const roleId = isWar
        ? WAR_ROLE_ID
        : BACKUP_ROLE_ID;

    const threadName = isWar
        ? `⚔️ WAR - ${interaction.user.username}`
        : `🛡️ BACKUP - ${interaction.user.username}`;

    // Create public thread
    const thread = await channel.threads.create({
        name: threadName,
        type: ChannelType.PublicThread,
        autoArchiveDuration: 1440,
        reason: isWar
            ? "Holly Knights WAR request"
            : "Holly Knights BACKUP request"
    });

    // ======================================
    // END BUTTON
    // ======================================

    const endButton =
        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("end_request")
                .setLabel("END")
                .setEmoji("🛑")
                .setStyle(ButtonStyle.Danger)
        );

    // ======================================
    // SEND REQUEST
    // ======================================

    await thread.send({
        content: `<@&${roleId}>`,

        embeds: [
            createRequestEmbed(
                type,
                interaction.user,
                details
            )
        ],

        components: [
            endButton
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
        const channel =
            await bot.channels.fetch(
                DASHBOARD_CHANNEL_ID
            );

        if (!channel) {
            console.log(
                "❌ Dashboard channel not found."
            );

            return;
        }

        // ======================================
        // TRY SAVED DASHBOARD
        // ======================================

        if (data.dashboardMessageId) {
            try {
                dashboardMessage =
                    await channel.messages.fetch(
                        data.dashboardMessageId
                    );

                console.log(
                    "✅ Saved dashboard found!"
                );

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

        // ======================================
        // SEARCH RECENT MESSAGES
        // ======================================

        const messages =
            await channel.messages.fetch({
                limit: 50
            });

        dashboardMessage =
            messages.find(
                message =>
                    message.author.id ===
                        bot.user.id &&

                    message.components.length > 0 &&

                    message.components.some(
                        row =>
                            row.components.some(
                                button =>
                                    button.customId ===
                                    "war"
                            )
                    )
            );

        if (dashboardMessage) {

            data.dashboardMessageId =
                dashboardMessage.id;

            saveData();

            await updateDashboard();

            console.log(
                "✅ Existing dashboard found!"
            );

            return;
        }

        // ======================================
        // CREATE NEW DASHBOARD
        // ======================================

        dashboardMessage =
            await channel.send({
                embeds: [
                    createDashboardEmbed()
                ],
                components: [
                    createButtons()
                ]
            });

        data.dashboardMessageId =
            dashboardMessage.id;

        saveData();

        console.log(
            "✅ New dashboard created!"
        );

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

client.once(
    Events.ClientReady,
    async bot => {

        console.log(
            `✅ ${bot.user.tag} is online!`
        );

        loadData();

        await setupDashboard(bot);
    }
);

// ==========================================
// BUTTON HANDLER
// ==========================================

client.on(
    Events.InteractionCreate,
    async interaction => {

        if (!interaction.isButton()) return;

        // ======================================
        // END REQUEST THREAD
        // ======================================

        if (
            interaction.customId ===
            "end_request"
        ) {

            if (
                !interaction.channel.isThread()
            ) {

                await interaction.reply({
                    content:
                        "❌ This button can only be used inside a request thread.",
                    ephemeral: true
                });

                return;
            }

            if (
                !interaction.member.permissions.has(
                    "ManageThreads"
                )
            ) {

                await interaction.reply({
                    content:
                        "❌ You need **Manage Threads** permission to end this request.",
                    ephemeral: true
                });

                return;
            }

            await interaction.reply({
                content:
                    "🗑️ **This request is being deleted...**"
            });

            setTimeout(
                async () => {

                    try {

                        await interaction.channel.delete(
                            "Holly Knights request ended"
                        );

                    } catch (error) {

                        console.error(
                            "❌ Could not delete request thread:",
                            error
                        );
                    }

                },
                3000
            );

            return;
        }

        // ======================================
        // DAILY RESET
        // ======================================

        checkDailyReset();

        const userId =
            interaction.user.id;

        // ======================================
        // COOLDOWN
        // ======================================

        const lastUsed =
            cooldowns.get(userId);

        if (lastUsed) {

            const timePassed =
                Date.now() - lastUsed;

            if (
                timePassed <
                COOLDOWN_TIME
            ) {

                const remaining =
                    Math.ceil(
                        (
                            COOLDOWN_TIME -
                            timePassed
                        ) / 1000
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

        if (
            interaction.customId ===
            "war"
        ) {

            await interaction.showModal(
                createWarModal()
            );

            return;
        }

        // ======================================
        // BACKUP BUTTON
        // ======================================

        if (
            interaction.customId ===
            "backup"
        ) {

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

        if (
            !interaction.isModalSubmit()
        ) {
            return;
        }

        // ======================================
        // DAILY RESET
        // ======================================

        checkDailyReset();

        const isWar =
            interaction.customId ===
            "war_modal";

        const isBackup =
            interaction.customId ===
        
