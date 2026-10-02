const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");
const qrcode = require("qrcode-terminal");
const config = require("./config");

async function demarrerBot() {

  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const bot = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false
  });

  bot.ev.on("creds.update", saveCreds);

  bot.ev.on("connection.update", (update) => {

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📱 SCANNE CE QR CODE AVEC WHATSAPP");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("╭━━━━━━━━━━━━━━━━━━╮");
      console.log(`┃ 🤖 ${config.botName}`);
      console.log("┃ ✅ BOT CONNECTÉ !");
      console.log(`┃ 👑 ${config.ownerName}`);
      console.log("╰━━━━━━━━━━━━━━━━━━╯");
    }

    if (connection === "close") {

      const code =
        lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnexion...");
        demarrerBot();
      } else {
        console.log("❌ Session WhatsApp déconnectée.");
      }
    }
  });

  bot.ev.on("messages.upsert", async ({ messages }) => {

    const message = messages[0];

    if (!message?.message) return;
    if (message.key.fromMe) return;

    const texte =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      "";

    if (!texte.startsWith(config.prefix)) return;

    const parties = texte
      .slice(config.prefix.length)
      .trim()
      .split(/\s+/);

    const commande = parties.shift()?.toLowerCase();

    const chat = message.key.remoteJid;

    if (commande === "ping") {
      await bot.sendMessage(chat, {
        text: "🏓 Pong !\n🤖 JONATHAN-BOT fonctionne."
      });
    }

    if (commande === "menu") {

      const menu = `
╭━━━〔 🤖 ${config.botName} 〕━━━╮
┃
┃ 👑 Propriétaire : ${config.ownerName}
┃ ⚡ Préfixe : ${config.prefix}
┃
┃ 📌 COMMANDES
┃
┃ • .ping
┃ • .menu
┃ • .info
┃
┃ 👥 GROUPE
┃
┃ • .tag
┃ • .kick
┃ • .add
┃ • .groupinfo
┃
┃ 🛡️ SÉCURITÉ
┃
┃ • .antilink
┃
┃ 🤖 AUTOMATISATION
┃
┃ • .autoreply
┃
╰━━━━━━━━━━━━━━━━━━━━╯
`;

      await bot.sendMessage(chat, {
        text: menu
      });
    }

    if (commande === "info") {

      await bot.sendMessage(chat, {
        text: `
╭━━〔 ℹ️ INFORMATIONS 〕━━╮
┃
┃ 🤖 Bot : ${config.botName}
┃ 👑 Owner : ${config.ownerName}
┃ ⚙️ Version : 1.0.0
┃ 🔑 Préfixe : ${config.prefix}
┃
╰━━━━━━━━━━━━━━━━━━━━╯
`
      });
    }
  });
}

demarrerBot();
