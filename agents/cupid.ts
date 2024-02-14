import {
  AgentOptions,
  ReactiveAgent,
  ModelType,
  when,
} from "@bazed-ai/bazed-af";
import TelegramBot, { Message } from "node-telegram-bot-api";
import { z } from "zod";
import VisionaireAgent, { VisionaireAgentOptions } from "./visionaire";

export interface CupidAgentOptions extends AgentOptions {
  bot: TelegramBot;
  chatID: number;
  sendCallback: (message: string) => Promise<void>;
  initialMessage: Message;
  userName: string;
}

export interface CupidAgentState {
  /** agent state */
}

export interface CupidAgentResult {
  /** agent result */
}

const AnswerSchema = z.object({
  ideas: z
    .array(
      z.object({
        note: z.string().describe("text of the note"),
        signature: z.string().describe("signature under the note"),
      })
    )
    .describe("Three varied ideas for valentine note"),
  prologue: z.string().describe("Prologue to the ideas"),
  epilogue: z.string().describe("Epilogue to the ideas"),
});

type Answer = z.infer<typeof AnswerSchema>;

export default class CupidAgent extends ReactiveAgent<
  CupidAgentOptions,
  CupidAgentState,
  CupidAgentResult
> {
  model: ModelType = ModelType.GPT4Turbo;
  temperature: number = 0.5;
  systemPrompt: string = `You are a valentine's day cupid, a demi-god of love, sharp intellect, silver tongue, a little bit of attitude. 
  You write valentine's notes for people based on a short converation and pictures they send. Be brief, fun, lighthearted and creative. Show a little rizz.
  Feel free to use emojis, keep the notes short, sweet and funny. Don't wax poetic. Be brief, don't overexplain! Remember, you are texting on Telegram so adjust your style to the medium.
  You are talking to a person who wants to make a good impression on their loved one or crush. Don't be too serious and don't ever tell them what to do in the notes.
  User may send pictures of their loved one or crush, ask them to do it. If user asks if they can send pictures tell them that you will happily see them.
  You can ask for more details about the pictures or anything else to the user without invading their privacy.
  Don't immediately jump to the answer, for example: even if you receive a picture description - ask for some details about the situation.
  Try writing a valentine's note even if the person doesn't want to send pictures.
  Before writing the answer, try to determine what kind of relationship the person has with the person they want to send the note to.
  If user wants to talk about something else, tell them off in a funny way.`;

  inputQueue: string[] = [];

  async flushInputQueue() {
    this.options.bot.sendChatAction(this.options.chatID, "typing");
    if (this.inputQueue.length === 0) {
      // await until the user sends something
      while (this.inputQueue.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    const input = this.inputQueue.join("\n");
    this.inputQueue = [];
    if (input.length > 1000) {
      return `User says:\n${input.slice(
        0,
        1000
      )}... (the rest is ommited, try to work with what you have and don't mention the ommission in your response)`;
    }
    return `User says:\n${input}`;
  }

  async receive(input: Message) {
    if (input.text) this.inputQueue.push(input.text || "<silence>");
    if (input.photo) {
      this.options.bot.sendChatAction(this.options.chatID, "typing");
      const visionaire = this.spawnAgent(VisionaireAgent, {
        bot: this.options.bot,
        ids: input.photo.map((x) => x.file_id),
      } as VisionaireAgentOptions);
      const desc = await visionaire.run();
      if (input.caption)
        this.inputQueue.push(
          `User sent a photos with a caption: ${input.caption}, here's description of them done by GPT-4: ${desc}`
        );
      else
        this.inputQueue.push(
          `User sent a photos, here's description of them done by GPT-4: ${desc}`
        );
    }
    if (input.video) {
      this.inputQueue.push(
        `User sent a video but you can't watch videos yet. Ask for a picture instead.`
      );
    }
    if (input.voice) {
      this.inputQueue.push(
        `User sent a voice message but you can't listen to voice messages yet. Ask for a description instead.`
      );
    }
  }

  send?: (message: string) => Promise<void>;

  async input(options: CupidAgentOptions): Promise<CupidAgentState> {
    this.send = options.sendCallback;
    this.respond(`User name is "${options.userName}"\n`);
    if (options.initialMessage.text)
      this.respond(`User says: ${options.initialMessage.text}`);
    if (options.initialMessage.photo) {
      const visionaire = this.spawnAgent(VisionaireAgent, {
        bot: this.options.bot,
        ids: options.initialMessage.photo.map((x) => x.file_id),
      } as VisionaireAgentOptions);
      const desc = await visionaire.run();
      if (options.initialMessage.caption)
        this.respond(
          `User sent a photos with a caption: ${options.initialMessage.caption}, here's description of them done by GPT-4: ${desc}\n`
        );
      else
        this.respond(
          `User sent a photos, here's description of them done by GPT-4: ${desc}\n`
        );
    }
    if (options.initialMessage.video) {
      this.respond(
        `User sent a video but you can't watch videos yet. Ask for a picture instead.\n`
      );
    }
    if (options.initialMessage.voice) {
      this.respond(
        `User sent a voice message but you can't listen to voice messages yet. Ask for a description instead.\n`
      );
    }
    return {};
  }

  @when(
    "you want to address the user",
    z.object({
      message: z.string().describe("Message or question to the user"),
    })
  )
  async toUser(
    _state: CupidAgentState,
    { message }: { message: string }
  ): Promise<CupidAgentState> {
    this.send?.(message);
    const response = await this.flushInputQueue();
    this.respond(response);
    return _state;
  }

  @when("you are ready give your ideas for valentine note", AnswerSchema)
  async answer(
    _state: CupidAgentState,
    { ideas, prologue, epilogue }: Answer
  ): Promise<CupidAgentState> {
    await this.send?.(prologue);
    for (const idea of ideas.map(
      (x, i) => `${i + 1}. **${x.note}**\n        __- ${x.signature}__`
    )) {
      await this.send?.(idea);
    }
    await this.send?.(epilogue);
    const response = await this.flushInputQueue();
    this.respond(response);
    return _state;
  }

  async output(_state: CupidAgentState): Promise<CupidAgentResult> {
    return {};
  }
}
