const http = require("http");
const config = require("./config");
const P = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("JONATHAN-BOT est en ligne !");
}).listen(PORT, "0.0.0.0");

async function demarrerBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const bot = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false
  });

  bot.ev.on("creds.update", saveCreds);

  bot.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "connecting" && !bot.authState?.creds?.registered) {
      // Le code d'association sera ajouté après vérification du numéro.
    }

    if (connection === "open") {
      console.log(`${config.botName} connecté !`);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        setTimeout(demarrerBot, 3000);
      } else {
        console.log("Session déconnectée. Reconnexion nécessaire.");
      }
    }
  });

  bot.ev.on("messages.upsert", async ({ messages }) => {
    const message = messages[0];
    if (!message?.message || message.key.fromMe) return;

    const texte =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      "";

    if (!texte.startsWith(config.prefix)) return;

    const parties = texte.slice(config.prefix.length).trim().split(/\s+/);
    const commande = parties.shift()?.toLowerCase();
    const chat = message.key.remoteJid;

    if (commande === "ping") {
      await bot.sendMessage(chat, { text: "🏓 Pong ! JONATHAN-BOT fonctionne." });
    }

    if (commande === "menu") {
      await bot.sendMessage(chat, {
        text: `🤖 ${config.botName}\n👑 ${config.ownerName}\n\n📌 COMMANDES\n• .ping\n• .menu\n• .info`
      });
    }

    if (commande === "info") {
      await bot.sendMessage(chat, {
        text: `🤖 Bot : ${config.botName}\n👑 Propriétaire : ${config.ownerName}\n⚙️ Version : 1.0.0\n🔑 Préfixe : ${config.prefix}`
      });
    }
  });
}

demarrerBot().catch(console.error);