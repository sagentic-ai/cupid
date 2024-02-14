import { OneShotAgent, AgentOptions, ModelType } from "@bazed-ai/bazed-af";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs/promises";

const toBase64 = async (bot: TelegramBot, ids: string[]): Promise<string[]> => {
  if (ids.length === 0) return [];
  ids = [ids[2] || ids[1] || ids[0]];
  const files = await Promise.all(
    ids.map((id) => bot.downloadFile(id, "photos"))
  );
  const encoded = await Promise.all(
    files.map((file) => fs.readFile(file, { encoding: "base64" }))
  );
  for (const file of files) {
    await fs.rm(file);
  }
  return encoded.map((data, i) => `data:image/jpeg;base64,${data}`);
};

// Define input type for the agent
export interface VisionaireAgentOptions extends AgentOptions {
  bot: TelegramBot;
  ids: string[];
}

// We are going to use the OneShotAgent,
// it's the simplest agent type - it just makes a call to the LLM and returns the result.
// Notice the `export default` - this is how the agent class must be exported.
export default class VisionaireAgent extends OneShotAgent<
  VisionaireAgentOptions, // Define input type for the agent
  string // Define output type for the agent
> {
  // Set the model used by the agent
  model: ModelType = ModelType.GPT4Vision;
  maxTokens?: number = 300;

  // Set the system prompt
  systemPrompt: string = `You are a valentine's day cupid's helper. You analyze pictures sent by cupid's customers. In these pictures you'll see people, places and things that illustrate and symbolize preferences, adventures and relationships.
    Your job is to describe the pictures in a way that would help the cupid come up with a personal and creative valentine's note for the person sending the pictures. Be sure to include gender, looks and other details that would help the cupid write a good love note.
    Do not suggest anything that the cupid might write, he'll do that himself. Just describe the pictures in a way that would help him write a good note.`;

  // Prepare the input for the LLM call
  async input(): Promise<string> {
    return `This is a picture with my loved one. Please describe it.`;
  }

  async inputImages(): Promise<string[] | undefined> {
    const urls = await toBase64(this.options.bot, this.options.ids);
    return urls;
  }

  // Process the output from the LLM call
  async output(answer: string): Promise<string> {
    return answer;
  }
}
