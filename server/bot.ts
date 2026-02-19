
import { Telegraf, Markup, session } from "telegraf";
import { message } from "telegraf/filters";
import { storage } from "./storage";
import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN must be set");
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY, // Replit AI sets this
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});

// Store admin state (awaiting password, awaiting username)
const adminState: Record<string, { step: 'password' | 'username' }> = {};

// Use sessions if needed, though we are using DB storage
// bot.use(session());

const ADMIN_ID = process.env.ADMIN_ID; // Set this in Secrets
const VIP_PASSWORD = process.env.VIP_PASSWORD || "secret123"; // Set in Secrets

export async function setupBot() {
  // Middleware to ensure user exists in DB
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      const telegramId = ctx.from.id.toString();
      let user = await storage.getUser(telegramId);
      
      const isAdmin = telegramId === process.env.ADMIN_ID;

      if (!user) {
        user = await storage.createUser({
          telegramId,
          username: ctx.from.username,
          isVip: isAdmin, // Automatically grant VIP to admin
        });
      } else if (isAdmin && !user.isVip) {
        // Ensure admin always has VIP even if they were added before ADMIN_ID was set
        user = await storage.updateUserVipStatus(telegramId, true);
      }
      
      ctx.state.user = user;
    }
    return next();
  });

  bot.command("start", async (ctx) => {
    const user = ctx.state.user;
    const isAdmin = ctx.from?.id.toString() === process.env.ADMIN_ID;

    if (user.isVip || isAdmin) {
      await ctx.reply(
        "Привет! Если ты видишь это сообщение, значит ты избранный, жми кнопку ниже чтобы начать.",
        Markup.keyboard([["Начать диалог"]]).resize()
      );
    } else {
      await ctx.reply(
        "Добро пожаловать! Для использования этого бота необходим VIP(( обратись к @Ivanka58."
      );
    }
  });

  bot.command("VIP", async (ctx) => {
    const userId = ctx.from.id.toString();
    // Check against secret admin ID (from env)
    if (userId === process.env.ADMIN_ID) {
        await ctx.reply("Введи пароль:");
        adminState[userId] = { step: 'password' };
    }
  });

  bot.command("help", async (ctx) => {
      await ctx.reply("Если возникли вопросы, обратись к разработчику @Ivanka58.");
  });

  bot.hears("Начать диалог", async (ctx) => {
      const user = ctx.state.user;
      if (!user.isVip) return; // Ignore if not VIP

      await ctx.reply(
          "Можешь задавать мне любые вопросы, присылать задания, фото, текст, на все отвечу!",
          Markup.keyboard([
              ["Очистить диалог ❌"],
              ["/help"]
          ]).resize()
      );
  });

  bot.hears("Очистить диалог ❌", async (ctx) => {
      await ctx.reply(
          "Вы действительно хотите очистить диалог? Он навсегда сотрётся из этого мира.",
          Markup.inlineKeyboard([
              Markup.button.callback("Да", "clear_history_yes"),
              Markup.button.callback("Нет", "clear_history_no"),
          ])
      );
  });

  bot.action("clear_history_yes", async (ctx) => {
      const user = ctx.state.user;
      await storage.clearMessages(user.id);
      await ctx.editMessageText("Ваш диалог стерт.");
  });

  bot.action("clear_history_no", async (ctx) => {
      await ctx.editMessageText("Ваш диалог сохранён, продолжайте общение.");
  });

  // Handle Admin Flow (Password / Username)
  bot.on(message("text"), async (ctx, next) => {
      const userId = ctx.from.id.toString();
      const state = adminState[userId];
      
      // Check if text exists in message (it might be photo/voice)
      if (!('text' in ctx.message)) return next();
      
      const text = ctx.message.text;

      // Check if this is a command (starts with /), if so, skip this handler
      if (text.startsWith('/')) return next();
      if (text === "Начать диалог" || text === "Очистить диалог ❌") return next();

      if (state) {
          if (state.step === 'password') {
              if (text === process.env.VIP_PASSWORD) {
                  await ctx.reply("Пароль верный, напиши юзернейм пользователя (без @).");
                  adminState[userId] = { step: 'username' };
              } else {
                  await ctx.reply("Пароль неверный, доступ закрыт.");
                  delete adminState[userId];
              }
              // Stop processing other handlers
              return;
          } else if (state.step === 'username') {
              const targetUsername = text.replace('@', '').trim();
              const targetUser = await storage.getUserByUsername(targetUsername);

              if (targetUser) {
                  await storage.updateUserVipStatusByUsername(targetUsername, true);
                  await ctx.reply(`Пользователю @${targetUsername} выдан VIP!`);
                  
                  // Notify the user
                  try {
                      await bot.telegram.sendMessage(targetUser.telegramId, "Администратор выдал вам VIP доступ! Нажмите /start чтобы начать пользоваться ботом!");
                  } catch (e) {
                      console.error(`Failed to notify user ${targetUsername}:`, e);
                      await ctx.reply(`Не удалось отправить уведомление пользователю (возможно бот заблокирован), но VIP выдан.`);
                  }
              } else {
                  // User needs to start the bot first to be in DB
                  await ctx.reply(`Пользователь @${targetUsername} не найден в базе. Попросите его нажать /start в боте.`);
              }
              delete adminState[userId];
              // Stop processing other handlers
              return;
          }
      }

      return next();
  });

  // Handle AI Chat
  bot.on([message("text"), message("voice"), message("photo")], async (ctx) => {
      const user = ctx.state.user;
      
      // If admin flow is active for this user, skip chat processing
      if (adminState[user.telegramId]) return;

      if (!user.isVip) {
          await ctx.reply("Для использования этого бота необходим VIP(( обратись к @Ivanka58.");
          return;
      }

      // Initial loading message
      const loadingMsg = await ctx.reply("Думаю...");

      try {
          // 1. Build context from DB
          const dbMessages = await storage.getMessages(user.id);
          const history: ChatCompletionMessageParam[] = dbMessages.reverse().map(m => ({
              role: m.role as "user" | "assistant",
              content: m.content
          }));

          // 2. Add current message
          let userContent = "";
          let imageUrl = "";

          if (ctx.message && 'text' in ctx.message) {
              userContent = ctx.message.text;
          } else if (ctx.message && 'photo' in ctx.message) {
              // Handle photo
              const photo = ctx.message.photo.pop(); // Get highest res
              if (photo) {
                  const fileLink = await ctx.telegram.getFileLink(photo.file_id);
                  imageUrl = fileLink.href;
                  userContent = ctx.message.caption || "Image uploaded";
              }
          } else if (ctx.message && 'voice' in ctx.message) {
              // Handle voice (using OpenAI Whisper via Replit AI if available, or just text for now)
              await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, undefined, "Голосовые сообщения пока в разработке, пиши текст!");
              return;
          }

          // Save User Message
          await storage.createMessage({
              userId: user.id,
              role: "user",
              content: userContent,
              type: imageUrl ? "image" : "text",
          });

          // Prepare messages for OpenAI
          const messagesForAI: ChatCompletionMessageParam[] = [
              { role: "system", content: "Ты умный AI помощник. Ты умеешь писать качественный код. Ты отвечаешь на русском языке. Ты помнишь контекст диалога. Ты интегрирован в Telegram бота." },
              ...history,
          ];
          
          if (imageUrl) {
              messagesForAI.push({
                  role: "user",
                  content: [
                      { type: "text", text: userContent },
                      { type: "image_url", image_url: { url: imageUrl } }
                  ]
              });
          } else {
              // Avoid sending empty content if user just sent a photo without caption (handled above, but safe check)
              if (userContent) {
                  messagesForAI.push({ role: "user", content: userContent });
              }
          }

          // 3. Call OpenAI
          // Note: using gpt-4o as requested for high quality code
          const completion = await openai.chat.completions.create({
              messages: messagesForAI,
              model: "gpt-4o", 
          });

          const aiResponse = completion.choices[0].message.content || "Нечего сказать 🤷‍♂️";

          // Save AI Message
          await storage.createMessage({
              userId: user.id,
              role: "assistant",
              content: aiResponse,
              type: "text"
          });

          // 4. Reply
          // Check message length, split if needed (Telegram limit 4096)
          if (aiResponse.length > 4000) {
              const parts = aiResponse.match(/[\s\S]{1,4000}/g) || [];
              for (const part of parts) {
                  await ctx.reply(part);
              }
              // Delete loading message
              await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
          } else {
              await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, undefined, aiResponse, { parse_mode: 'Markdown' }).catch(async (e) => {
                  // Fallback if markdown parsing fails
                  console.warn("Markdown parsing failed, sending plain text", e);
                  await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, undefined, aiResponse);
              });
          }

      } catch (error) {
          console.error("AI Error:", error);
          await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, undefined, "Произошла ошибка при обработке запроса. Попробуйте позже.");
      }
  });

  // Launch Bot
  bot.launch().then(() => {
      console.log("Telegram Bot started");
  }).catch((err) => {
      console.error("Telegram Bot launch failed:", err);
  });

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
