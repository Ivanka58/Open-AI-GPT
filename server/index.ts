import express, { type Request, Response, NextFunction } from "express";
import { Telegraf } from "telegraf";
import { setupBot } from "./bot";
import { storage } from "./storage";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

// Начнём с инициализации Express
const app = express();

// Средства безопасности и вспомогательные мидлваре
app.use(cors());
app.use(helmet());
app.use(cookieParser());

// Парсим тела запросов
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Основной маршрут для Webhook
app.post("/api/webhook", async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

// Создание и запуск бота
setupBot().then(() => {
  console.log("Telegram Bot ready to receive updates via Webhook");
}).catch((err) => {
  console.error("Telegram Bot initialization failed:", err);
});

// Логирование запросов
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json.bind(res);
  res.json = function(bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(this, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      console.log(logLine);
    }
  });

  next();
});

// Обработка внутренних ошибок
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error("Internal Server Error:", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(status).json({ message });
});

// Наконец, запускаем сервер
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
