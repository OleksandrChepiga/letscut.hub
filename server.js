const express = require('express');
const { Resend } = require('resend'); 
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1); 

const resend = new Resend(process.env.EMAIL_PASS); 

app.use(helmet()); 
app.use(express.json());

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

    // --- СТИЛІ ТА ШРИФТИ ---
    const fonts = "font-family: 'Manrope', 'Nunito', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;";

    // --- ШАБЛОН ДЛЯ АДМІНІСТРАТОРА (ТЕБЕ) ---
    const adminHtml = `
    <div style="${fonts} background-color: #0a0a0a; color: #e0e0e0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #141414; border: 1px solid #333; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="background: linear-gradient(90deg, #ff4d4d, #f9cb28); padding: 2px;">
                <div style="background: #141414; padding: 25px; text-align: center;">
                    <h2 style="margin: 0; color: #fff; text-transform: uppercase; letter-spacing: 2px; font-size: 18px;">Нове замовлення 🔥</h2>
                    <p style="margin: 5px 0 0; color: #888; font-size: 12px;">ID: ${data.order_id} | ${orderDate}</p>
                </div>
            </div>
            <div style="padding: 30px;">
                <table style="width: 100%; border-collapse: collapse; color: #ccc; font-size: 14px;">
                    <tr><td style="padding: 10px 0; border-bottom: 1px solid #222;">Клієнт:</td><td style="text-align: right; color: #fff; font-weight: 700;">${data.name}</td></tr>
                    <tr><td style="padding: 10px 0; border-bottom: 1px solid #222;">Телефон:</td><td style="text-align: right;"><a href="tel:${data.phone}" style="color: #ff4d4d; text-decoration: none;">${data.phone}</a></td></tr>
                    <tr><td style="padding: 10px 0; border-bottom: 1px solid #222;">Тариф:</td><td style="text-align: right; color: #f9cb28; font-weight: 700;">${data.tariff}</td></tr>
                    <tr><td style="padding: 10px 0; border-bottom: 1px solid #222;">Дедлайн:</td><td style="text-align: right; color: #ff4d4d;">${data.deadline}</td></tr>
                    <tr><td style="padding: 10px 0; border-bottom: 1px solid #222;">Права (+5%):</td><td style="text-align: right;">${data.copyright_transfer}</td></tr>
                </table>
                <div style="margin-top: 20px; padding: 15px; background: #1a1a1a; border-radius: 8px; border: 1px solid #333;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #888; text-transform: uppercase;">ТЗ / Коментар:</p>
                    <p style="margin: 0; color: #fff; line-height: 1.5;">${data.message}</p>
                </div>
                <div style="margin-top: 25px; text-align: center;">
                    <a href="${data.link}" style="display: inline-block; padding: 14px 30px; background: #fff; color: #000; text-decoration: none; border-radius: 8px; font-weight: 800; text-transform: uppercase; font-size: 12px;">Переглянути матеріали</a>
                </div>
            </div>
        </div>
    </div>`;

    // --- ШАБЛОН ДЛЯ КЛІЄНТА (ПОВНИЙ) ---
    const clientHtml = `
    <div style="${fonts} background-color: #0a0a0a; color: #e0e0e0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #141414; border: 1px solid #333; border-radius: 20px; overflow: hidden;">
            <div style="padding: 40px 30px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 800;">Let's Cut</h1>
                <p style="color: #888; margin-top: 10px;">Вашу заявку №${data.order_id} отримано!</p>
                
                <div style="margin: 30px 0; padding: 25px; background: #1a1a1a; border-radius: 15px; text-align: left; border: 1px solid #222;">
                    <h3 style="color: #fff; margin: 0 0 15px; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 10px;">Деталі вашого замовлення:</h3>
                    <p style="margin: 8px 0; font-size: 14px;"><span style="color: #888;">Тариф:</span> <strong style="color: #f9cb28;">${data.tariff}</strong></p>
                    <p style="margin: 8px 0; font-size: 14px;"><span style="color: #888;">Термін виконання:</span> <strong style="color: #fff;">${data.deadline}</strong></p>
                    <p style="margin: 8px 0; font-size: 14px;"><span style="color: #888;">Музика:</span> <strong style="color: #fff;">${data.music || 'Без уточнення'}</strong></p>
                    <p style="margin: 15px 0 5px; color: #888; font-size: 12px; text-transform: uppercase;">Ваше технічне завдання:</p>
                    <p style="margin: 0; color: #ccc; font-style: italic; font-size: 14px; line-height: 1.6;">"${data.message}"</p>
                </div>

                <p style="color: #ccc; font-size: 15px; line-height: 1.6;">
                    Я зв'яжуся з вами найближчим часом для підтвердження та уточнення деталей.
                </p>

                <div style="margin-top: 40px;">
                    <a href="https://t.me/Oleksandr_Chepiha" style="display: inline-block; padding: 12px 20px; background: #24A1DE; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; margin-right: 10px; font-size: 13px;">Написати в Telegram</a>
                    <a href="https://letscut.com.ua" style="display: inline-block; padding: 12px 20px; background: #333; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 13px;">На сайт</a>
                </div>
            </div>
            <div style="background: #1a1a1a; padding: 20px; text-align: center; border-top: 1px solid #222;">
                <p style="margin: 0; font-size: 11px; color: #555;">© 2026 Let's Cut - Професійний відеомонтаж</p>
            </div>
        </div>
    </div>`;

    try {
        await Promise.all([
            resend.emails.send({
                from: 'Let\'s Cut CRM <info@letscut.com.ua>',
                to: process.env.EMAIL_USER,
                subject: `🚀 ЗАМОВЛЕННЯ: ${data.name} [${data.tariff}]`,
                html: adminHtml
            }),
            resend.emails.send({
                from: 'Alexander | Let\'s Cut <info@letscut.com.ua>',
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
