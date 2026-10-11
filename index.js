const http = require("http");
const config = require("./config");
const P = require("pino");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

// Serveur web pour Render
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("🦅 JONATHAN-BOT est en ligne !");
}).listen(PORT, "0.0.0.0", () => {
  console.log("Serveur web démarré sur le port " + PORT);
});

// Connexion WhatsApp
async function demarrerBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");

  const bot = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false
  });

  bot.ev.on("creds.update", saveCreds);

  let codeDemande = false;

  bot.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Demander le code d'association au bon moment
    if (qr && !state.creds.registered && !codeDemande) {
      codeDemande = true;

      try {
        const numero = String(config.ownerNumber).replace(/\D/g, "");

        if (!numero) {
          console.log("❌ Ajoute ton numéro avec l'indicatif du pays dans config.js.");
          return;
        }

        const code = await bot.requestPairingCode(numero);

        console.log("");
        console.log("====================================");
        console.log("🦅 JONATHAN-BOT");
        console.log("🔑 TON CODE D'ASSOCIATION :", code);
        console.log("====================================");
        console.log("Ouvre WhatsApp Business > Appareils connectés.");
        console.log("Choisis « Connecter avec un numéro de téléphone ».");
        console.log("Entre le code affiché ci-dessus.");
        console.log("====================================");
      } catch (erreur) {
        codeDemande = false;
        console.error("❌ Erreur d'association :", erreur.message);
      }
    }

    if (connection === "open") {
      console.log("✅ " + config.botName + " est connecté à WhatsApp !");
    }

    if (connection === "close") {
      const codeErreur = lastDisconnect?.error?.output?.statusCode;

      if (codeErreur === DisconnectReason.loggedOut) {
        console.log("❌ Session déconnectée. Une nouvelle association est nécessaire.");
      } else {
        console.log("🔄 Connexion interrompue. Redémarrage du bot...");
        demarrerBot().catch(console.error);
      }
    }
  });

  // Commandes du bot
  bot.ev.on("messages.upsert", async ({ messages }) => {
    for (const message of messages) {
      if (!message?.message || message.key.fromMe) continue;

      const texte =
        message.message.conversation ||
        message.message.extendedTextMessage?.text ||
        message.message.imageMessage?.caption ||
        "";

      if (!texte.startsWith(config.prefix)) continue;

      const parties = texte
        .slice(config.prefix.length)
        .trim()
        .split(/\s+/);

      const commande = parties.shift()?.toLowerCase();
      const chat = message.key.remoteJid;

      if (!chat) continue;

      try {
        if (commande === "ping") {
          await bot.sendMessage(chat, {
            text: "🏓 Pong ! JONATHAN-BOT fonctionne."
          });
        }

        else if (commande === "menu") {
          await bot.sendMessage(chat, {
            text:
              `🦅 ${config.botName}\n` +
              `👑 Propriétaire : ${config.ownerName}\n\n` +
              "📌 COMMANDES DISPONIBLES\n" +
              "• .ping — Vérifier le bot\n" +
              "• .menu — Afficher le menu\n" +
              "• .info — Informations du bot"
          });
        }

        else if (commande === "info") {
          await bot.sendMessage(chat, {
            text:
              `🤖 Bot : ${config.botName}\n` +
              `👑 Propriétaire : ${config.ownerName}\n` +
              "⚙️ Version : 1.0.0\n" +
              `🔑 Préfixe : ${config.prefix}`
          });
        }
      } catch (erreur) {
        console.error("Erreur lors de l'envoi du message :", erreur.message);
      }
    }
  });
}

demarrerBot().catch(console.error);