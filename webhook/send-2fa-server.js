import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";
import { buildTwoFactorEmailHtml } from "../src/services/twoFactorEmailHtml.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const port = Number(process.env.WEBHOOK_PORT || 8787);
const appOrigin = process.env.APP_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const allowed =
        origin === appOrigin ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
      return callback(null, allowed);
    },
  })
);
app.use(express.json({ limit: "1mb" }));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
  },
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "lowmeet-2fa-webhook" });
});

app.post("/send-2fa", async (req, res) => {
  const { email, subject, message } = req.body || {};

  if (!email || !subject || !message) {
    return res.status(400).json({
      ok: false,
      error: "Parâmetros obrigatórios: email, subject, message",
    });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({
      ok: false,
      error: "SMTP não configurado. Defina SMTP_HOST, SMTP_USER e SMTP_PASS",
    });
  }

  try {
    const code = (req.body.code || "").toString();
    const safeMessage = message || "Use este código para concluir o acesso.";

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text: `${safeMessage}\nCódigo: ${code}\nExpira em 10 minutos.`,
      html: buildTwoFactorEmailHtml(code, safeMessage),
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Falha ao enviar e-mail",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`LowMeet 2FA webhook em http://localhost:${port}`);
  console.log(`CORS liberado para ${appOrigin}`);
});
