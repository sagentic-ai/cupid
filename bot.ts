import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { ClientMux, Session } from "@bazed-ai/bazed-af";
import CupidAgent, { CupidAgentOptions } from "./agents/cupid";
dotenv.config();

const token: string = process.env.TELEGRAM_BOT_TOKEN || "";
const openAIKey: string = process.env.OPENAI_API_KEY || "";

const bot = new TelegramBot(token, { polling: true });

const clientMux = new ClientMux(openAIKey);

interface CupidContext {
  chatId: number;
  agent: CupidAgent;
  session: Session;
  userMessages: number;
  botMessages: number;
  startTime: Date;
  lastMessageTime?: Date;
  ended?: boolean;
}

const sessions: Record<number, CupidContext> = {};

bot.on("message", async (msg) => {
  if (msg.chat.type !== "private") return;
  const chatId = msg.chat.id;
  bot.sendChatAction(chatId, "typing");
  if (!sessions[chatId]) {
    const session = new Session(clientMux, {});
    const agent = session.spawnAgent(CupidAgent, {
      bot: bot,
      userName: msg.from?.first_name || "stranger",
      chatID: chatId,
      sendCallback: async (message) => {
        sessions[chatId].botMessages++;
        sessions[chatId].lastMessageTime = new Date();
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        return;
      },
      initialMessage: msg,
    } as CupidAgentOptions);
    sessions[chatId] = {
      startTime: new Date(msg.date * 1000),
      userMessages: 1,
      botMessages: 0,
      chatId,
      session,
      agent,
    };
    agent.run().catch((e) => {
      console.error("agent loop ended", sessions[chatId], e);
      sessions[chatId].ended = true;
      bot.sendMessage(chatId, "Sorry, I'm not available right now.");
    });
  } else if (!sessions[chatId].ended) {
    sessions[chatId].lastMessageTime = new Date(msg.date * 1000);
    sessions[chatId].userMessages++;
    sessions[chatId].agent.receive(msg);
  }
  console.log(
    chatId,
    sessions[chatId].lastMessageTime,
    sessions[chatId].startTime,
    msg.from?.username,
    sessions[chatId].userMessages,
    sessions[chatId].botMessages,
    sessions[chatId].ended
  );
});
