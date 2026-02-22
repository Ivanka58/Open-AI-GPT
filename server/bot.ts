
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
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});

const adminState: Record<string, { 
    step: 'password' | 'username' | 'vipall_password' | 'remove_vip_username' | 'remove_vip_password' | 'add_password' | 'add_message',
    targetUsername?: string 
}> = {};

const ADMIN_ID = process.env.ADMIN_ID;
const VIP_PASSWORD = process.env.VIP_PASSWORD || "secret123";

// Auto-restart logic: stop the process every 2 hours
// Replit's workflow manager will then automatically restart it
const RESTART_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
setTimeout(() => {
  console.log("Scheduled restart: stopping bot to trigger workflow auto-restart");
  process.exit(0);
}, RESTART_INTERVAL);

export async function setupBot() {
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      const telegramId = ctx.from.id.toString();
      let user = await storage.getUser(telegramId);
      
      const isAdmin = telegramId === process.env.ADMIN_ID;

      if (!user) {
        user = await storage.createUser({
          telegramId,
          username: ctx.from.username,
          isVip: isAdmin,
        });
      } else if (isAdmin && !user.isVip) {
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
    if (userId === process.env.ADMIN_ID) {
        await ctx.reply("Введи пароль:");
        adminState[userId] = { step: 'password' };
    }
  });

  bot.command("stats", async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId === process.env.ADMIN_ID) {
        const stats = await storage.getGlobalStats();
        await ctx.reply(`Количество всех пользователей: ${stats.totalUsers}\nVIP пользователей: ${stats.vipUsers}`);
    }
  });

  bot.command("VIPall", async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId === process.env.ADMIN_ID) {
        await ctx.reply("Введи пароль для доступа к списку VIP:");
        adminState[userId] = { step: 'vipall_password' };
    }
  });

  bot.command("add", async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId === process.env.ADMIN_ID) {
        await ctx.reply("Введи пароль для рассылки:");
        adminState[userId] = { step: 'add_password' };
    }
  });

  bot.action("remove_vip_action", async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (userId === process.env.ADMIN_ID) {
        await ctx.reply("Введите юзернейм пользователя, у которого нужно забрать VIP (без @):");
        adminState[userId] = { step: 'remove_vip_username' };
    }
    await ctx.answerCbQuery();
  });

  bot.command("help", async (ctx) => {
      await ctx.reply("Если возникли вопросы, обратись к разработчику @Ivanka58.");
  });

  bot.hears("Начать диалог", async (ctx) => {
      const user = ctx.state.user;
      if (!user.isVip) return;

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

  bot.on(message("text"), async (ctx, next) => {
      const userId = ctx.from.id.toString();
      const state = adminState[userId];
      
      if (!('text' in ctx.message)) return next();
      
      const text = ctx.message.text;

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
              return;
          } else if (state.step === 'username') {
              const targetUsername = text.replace('@', '').trim();
              const targetUser = await storage.getUserByUsername(targetUsername);

              if (targetUser) {
                  await storage.updateUserVipStatusByUsername(targetUsername, true);
                  await ctx.reply(`Пользователю @${targetUsername} выдан VIP!`);
                  
                  try {
                      await bot.telegram.sendMessage(targetUser.telegramId, "Администратор выдал вам VIP доступ! Нажмите /start чтобы начать пользоваться ботом!");
                  } catch (e) {
                      console.error(`Failed to notify user ${targetUsername}:`, e);
                      await ctx.reply(`Не удалось отправить уведомление пользователю (возможно бот заблокирован), но VIP выдан.`);
                  }
              } else {
                  await ctx.reply(`Пользователь @${targetUsername} не найден в базе. Попросите его нажать /start в боте.`);
              }
              delete adminState[userId];
              return;
          } else if (state.step === 'vipall_password') {
              if (text === process.env.VIP_PASSWORD) {
                  const vips = await storage.getAllVips();
                  if (vips.length === 0) {
                      await ctx.reply("Список VIP пуст.");
                  } else {
                      const vipList = vips.map(v => `@${v.username || v.telegramId}`).join('\n');
                      await ctx.reply(`Список всех VIP пользователей:\n\n${vipList}`, Markup.inlineKeyboard([
                          Markup.button.callback("Забрать VIP", "remove_vip_action")
                      ]));
                  }
              } else {
                  await ctx.reply("Пароль неверный.");
              }
              delete adminState[userId];
              return;
          } else if (state.step === 'remove_vip_username') {
              const targetUsername = text.replace('@', '').trim();
              const targetUser = await storage.getUserByUsername(targetUsername);
              if (targetUser && targetUser.isVip) {
                  adminState[userId] = { step: 'remove_vip_password', targetUsername };
                  await ctx.reply(`Вы хотите забрать VIP у @${targetUsername}. Введите пароль еще раз для подтверждения:`);
              } else {
                  await ctx.reply(`Пользователь @${targetUsername} не найден или не является VIP.`);
                  delete adminState[userId];
              }
              return;
          } else if (state.step === 'remove_vip_password') {
              if (text === process.env.VIP_PASSWORD) {
                  const targetUsername = state.targetUsername!;
                  const targetUser = await storage.getUserByUsername(targetUsername);
                  if (targetUser) {
                      await storage.updateUserVipStatusByUsername(targetUsername, false);
                      await ctx.reply(`У пользователя @${targetUsername} успешно забран VIP.`);
                      try {
                          await bot.telegram.sendMessage(targetUser.telegramId, "Администратор забрал у вас VIP доступ.");
                      } catch (e) {
                          console.error(`Failed to notify user ${targetUsername} about VIP removal:`, e);
                      }
                  }
              } else {
                  await ctx.reply("Пароль неверный. Операция отменена.");
              }
              delete adminState[userId];
              return;
          } else if (state.step === 'add_password') {
              if (text === process.env.VIP_PASSWORD) {
                  await ctx.reply("Пароль верный. Введите сообщение для рассылки всем VIP пользователям:");
                  adminState[userId] = { step: 'add_message' };
              } else {
                  await ctx.reply("Пароль неверный.");
                  delete adminState[userId];
              }
              return;
          } else if (state.step === 'add_message') {
              const vips = await storage.getAllVips();
              let successCount = 0;
              let failCount = 0;

              await ctx.reply(`Начинаю рассылку для ${vips.length} пользователей...`);

              for (const vip of vips) {
                  try {
                      await bot.telegram.sendMessage(vip.telegramId, text);
                      successCount++;
                  } catch (e) {
                      console.error(`Failed to send broadcast to ${vip.telegramId}:`, e);
                      failCount++;
                  }
              }

              await ctx.reply(`Рассылка завершена!\nУспешно: ${successCount}\nОшибка: ${failCount}`);
              delete adminState[userId];
              return;
          }
      }

      return next();
  });

  bot.on([message("text"), message("voice"), message("photo")], async (ctx) => {
      const user = ctx.state.user;
      
      if (adminState[user.telegramId]) return;

      if (!user.isVip) {
          await ctx.reply("Для использования этого бота необходим VIP(( обратись к @Ivanka58.");
          return;
      }

      const loadingMsg = await ctx.reply("Думаю...");

      try {
          const dbMessages = await storage.getMessages(user.id);
          const history: ChatCompletionMessageParam[] = dbMessages.reverse().map(m => ({
              role: m.role as "user" | "assistant",
              content: m.content
          }));

          let userContent = "";
          let imageUrl = "";

          if (ctx.message && 'text' in ctx.message) {
              userContent = ctx.message.text;
          } else if (ctx.message && 'photo' in ctx.message) {
              const photo = ctx.message.photo.pop();
              if (photo) {
                  const fileLink = await ctx.telegram.getFileLink(photo.file_id);
                  imageUrl = fileLink.href;
                  userContent = ctx.message.caption || "Image uploaded";
              }
          } else if (ctx.message && 'voice' in ctx.message) {
              await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, undefined, "Голосовые сообщения пока в разработке, пиши текст!");
              return;
          }

          await storage.createMessage({
              userId: user.id,
              role: "user",
              content: userContent,
              type: imageUrl ? "image" : "text",
          });

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
              if (userContent) {
                  messagesForAI.push({ role: "user", content: userContent });
              }
          }

          const completion = await openai.chat.completions.create({
              messages: messagesForAI,
              model: "gpt-4o", 
          });

          const aiResponse = completion.choices[0].message.content || "Нечего сказать 🤷‍♂️";

          await storage.createMessage({
              userId: user.id,
              role: "assistant",
              content: aiResponse,
              type: "text"
          });

          if (aiResponse.length > 4000) {
              const parts = aiResponse.match(/[\s\S]{1,4000}/g) || [];
              for (const part of parts) {
                  await ctx.reply(part);
              }
              await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
          } else {
              await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, undefined, aiResponse, { parse_mode: 'Markdown' }).catch(async (e) => {
                  await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, undefined, aiResponse);
              });
          }

      } catch (error) {
          console.error("AI Error:", error);
          await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, undefined, "Произошла ошибка при обработке запроса. Попробуйте позже.");
      }
  });

  bot.launch().then(() => {
      console.log("Telegram Bot started");
  }).catch((err) => {
      console.error("Telegram Bot launch failed:", err);
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
