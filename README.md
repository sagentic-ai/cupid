# Bazed Cupid Agent

[Bazed AF](https://github.com/bazed-ai/bazed-af) Valentine's day demo project.

Check out the [demo](https://t.me/BazedCupidBot) on Telegram.

This is a simple Telegram bot that helps you write Valentine's day love notes 💘
It uses Bazed AF framework with OpenAI Vision support to look at user's photos and generates notes using GPT-4 Turbo.

Want to make your own? Check out the [bazed.ai](https://bazed.ai) website 😎

## Local Development

Set up `.env` file with the following content:

```
OPENAI_API_KEY="..."
BAZED_API_KEY="..."
TELEGRAM_BOT_TOKEN="..."
```

Then `npm install` and `npm dev` to start the development server.

Run `npx ts-node bot.ts` to run full Telegram bot locally.
