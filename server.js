const express = require('express');
const { Resend } = require('resend'); 
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1); 

// Ініціалізація Resend (переконайся, що в .env є EMAIL_PASS)
const resend = new Resend(process.env.EMAIL_PASS); 

app.use(helmet()); 
app.use(express.json());

// Обмеження запитів, щоб не спамили форму
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: "Занадто багато запитів. Спробуйте пізніше." }
});

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.get('/ping', (req, res) => res.send('Server is awake!'));

app.post('/send-order', limiter, async (req, res) => {
    const data = req.body;
    const orderDate = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });

    // Валідація Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        return res.status(400).json({ success: false, error: 'Некоректний Email' });
    }

    // Логіка для додаткових послуг (якщо порожньо — пишемо "Не вибрано")
    const extraServiceText = data.extra_service || 'Не вибрано';

    // --- СТИЛІ ТА КОНСТАНТИ ---
    const fonts = "font-family: 'Manrope', 'Nunito', 'Segoe UI', Roboto, sans-serif;";
    const mainColor = "#1a1a1a"; 
    const accentColor = "#ff4d4d"; 
    const bgColor = "#ffffff"; 

    // --- ШАБЛОН ДЛЯ ТЕБЕ (АДМІНІСТРАТОР) ---
    const adminHtml = `
    <div style="${fonts} background-color: #ffffff; color: ${mainColor}; padding: 20px 10px; line-height: 1.6;">
        <div style="max-width: 500px; margin: 0 auto; border: 1px solid #eeeeee; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="padding: 30px 20px; text-align: center; background-color: #fafafa; border-bottom: 1px solid #eeeeee;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: ${accentColor};">НОВЕ ЗАМОВЛЕННЯ 🔥</h1>
                <p style="margin: 5px 0 0; color: #888; font-size: 12px;">ID: ${data.order_id} | ${orderDate}</p>
            </div>
            <div style="padding: 20px;">
                <div style="margin-bottom: 25px; padding: 15px; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #fcfcfc;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Клієнт:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right;">${data.name}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Тариф:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right;">${data.tariff}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Додатково:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right; color: ${accentColor};">${extraServiceText}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Дедлайн:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right; color: #ff4d4d;">${data.deadline}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Телефон:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right;"><a href="tel:${data.phone}" style="color: ${mainColor}; text-decoration: none;">${data.phone}</a></td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Email:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right; word-break: break-all;">${data.email}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Музика:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right;">${data.music || 'Не вказано'}</td></tr>
                        <tr><td style="padding: 10px 0; color: #888;">Матеріали:</td><td style="padding: 10px 0; font-weight: 700; text-align: right; word-break: break-all;"><a href="${data.link}" style="color: #007bff; text-decoration: underline;">Відкрити лінк 🔗</a></td></tr>
                    </table>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                        <p style="margin: 0 0 5px; font-size: 11px; color: #999; font-weight: 700;">ТЗ ВІД КЛІЄНТА:</p>
                        <div style="font-size: 13px; color: #333; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #eee;">${data.message}</div>
                    </div>
                </div>
                <div style="text-align: center;">
                    <a href="mailto:${data.email}" style="display: block; background-color: ${mainColor}; color: #ffffff; padding: 14px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">Написати клієнту (Email)</a>
                </div>
            </div>
            <div style="padding: 15px; background-color: #fafafa; text-align: center; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; font-size: 10px; color: #bbb;">Let's Cut CRM | Олександр Чепіга</p>
            </div>
        </div>
    </div>`;

    // --- ШАБЛОН ДЛЯ КЛІЄНТА (ПІДТВЕРДЖЕННЯ) ---
    const clientHtml = `
    <div style="${fonts} background-color: #ffffff; color: ${mainColor}; padding: 20px 10px; line-height: 1.6;">
        <div style="max-width: 500px; margin: 0 auto; border: 1px solid #eeeeee; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="padding: 30px 20px; text-align: center; background-color: #fafafa; border-bottom: 1px solid #eeeeee;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Let's Cut</h1>
                <p style="margin: 10px 0 0; color: #666; font-size: 13px;">Замовлення №${data.order_id} прийнято</p>
            </div>
            <div style="padding: 20px;">
                <p style="font-size: 15px; margin-bottom: 15px;">Вітаю, <strong>${data.name}</strong>! Дякую за замовлення. Ось деталі вашої заявки:</p>
                <div style="margin-bottom: 25px; padding: 15px; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #fcfcfc;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Тариф:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right;">${data.tariff}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Додатково:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right; color: ${accentColor};">${extraServiceText}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Дедлайн:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right;">${data.deadline}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Телефон:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right;">${data.phone}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Email:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right; word-break: break-all;">${data.email}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Музика:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; text-align: right;">${data.music || 'На мій вибір'}</td></tr>
                        <tr><td style="padding: 10px 0; color: #888;">Матеріали:</td><td style="padding: 10px 0; font-weight: 700; text-align: right; word-break: break-all;"><a href="${data.link}" style="color: ${accentColor}; text-decoration: underline;">Відкрити лінк 🔗</a></td></tr>
                    </table>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                        <p style="margin: 0 0 5px; font-size: 11px; color: #999; font-weight: 700;">ВАШЕ ПОВІДОМЛЕННЯ:</p>
                        <div style="font-size: 13px; color: #555; background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #eee;">"${data.message}"</div>
                    </div>
                </div>
                <div style="text-align: center;">
                    <a href="https://t.me/Oleksandr_Chepiha" style="display: block; background-color: ${mainColor}; color: #ffffff; padding: 14px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">Написати в Telegram</a>
                </div>
            </div>
            <div style="padding: 15px; background-color: #fafafa; text-align: center; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; font-size: 10px; color: #bbb;">© 2026 Let's Cut | Олександр Чепіга</p>
            </div>
        </div>
    </div>`;

    try {
        await Promise.all([
            resend.emails.send({
                from: "Let's Cut CRM <info@letscut.com.ua>",
                to: process.env.EMAIL_USER,
                subject: `🚀 ЗАМОВЛЕННЯ: ${data.name} [${data.tariff}]`,
                html: adminHtml
            }),
            resend.emails.send({
                from: "Alexander | Let's Cut <info@letscut.com.ua>",
                to: data.email,
                reply_to: 'letscut.ua@gmail.com',
                subject: `Ваше замовлення №${data.order_id} прийнято! ✨`,
                html: clientHtml
            })
        ]);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Resend API Error:', error);
        res.status(500).json({ success: false, error: 'Помилка відправки через API' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Backend Let's Cut online on port ${PORT}`));
