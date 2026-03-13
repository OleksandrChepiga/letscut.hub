const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1); // Дозволяє правильно визначати IP на Render

// --- БЕЗПЕКА ---
app.use(helmet()); 
app.use(express.json());

// Захист від спаму: макс 5 запитів за 15 хв з однієї IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: "Занадто багато запитів. Спробуйте пізніше." }
});

// Налаштування CORS: дозволяємо тільки твій домен
app.use(cors({
    origin: ['https://letscut.com.ua', 'https://www.letscut.com.ua', 'https://letscut.onrender.com'],
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type']
}));

// Налаштування пошти
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

// Маршрут для "пробудження" сервера (пінг)
app.get('/ping', (req, res) => res.send('Server is awake!'));

app.post('/send-order', limiter, async (req, res) => {
    const data = req.body;
    const orderDate = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });

    // Валідація
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        return res.status(400).json({ success: false, error: 'Некоректний Email' });
    }

    // --- ШАБЛОН ДЛЯ ТЕБЕ (АДМІН) ---
    const adminHtml = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333; width: 100%; max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff; box-sizing: border-box; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="background-color: #1a1a1a; padding: 25px 20px; text-align: left;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="vertical-align: middle;">
                        <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 500;">Запит на монтаж відео</h2>
                        <p style="margin: 6px 0 0; color: #888; font-size: 12px;">ID: ${data.order_id} | Час: ${orderDate}</p>
                    </td>
                    <td style="text-align: right; vertical-align: middle;">
                        <span style="display: inline-block; background: #333; color: #eee; padding: 8px 16px; border-radius: 6px; font-size: 11px; border: 1px solid #444; white-space: nowrap; margin-left: 10px;">
                            Нове замовлення
                        </span>
                    </td>
                </tr>
            </table>
        </div>
        <div style="padding: 25px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tbody>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; color: #777; font-size: 14px;">Клієнт:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; text-align: right; font-weight: 600; font-size: 14px;">${data.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; color: #777; font-size: 14px;">Номер телефону:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; text-align: right; font-size: 14px;">
                            <a href="tel:${data.phone}" style="color: #007bff; text-decoration: none; font-weight: 600;">${data.phone}</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; color: #777; font-size: 14px;">Електронна пошта:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; text-align: right; font-size: 14px;">
                            <a href="mailto:${data.email}" style="color: #007bff; text-decoration: none;">${data.email}</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; color: #777; font-size: 14px;">Тариф:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; text-align: right; font-weight: 600; font-size: 14px;">${data.tariff}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; color: #777; font-size: 14px;">Музика:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; text-align: right; font-size: 14px;">${data.music || 'Не вказано'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; color: #777; font-size: 14px;">Права:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; text-align: right; font-size: 14px;">${data.copyright_transfer}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; color: #777; font-size: 14px;">Дедлайн:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; text-align: right; color: #d9534f; font-weight: 700; font-size: 14px;">${data.deadline}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; color: #777; font-size: 14px;">Лінк:</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f5; text-align: right; font-size: 14px; word-break: break-all;">
                            <a href="${data.link}" target="_blank" style="color: #007bff; text-decoration: underline;">Відкрити матеріали</a>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div style="margin-top: 20px;">
                <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #1a1a1a;">Коментар до замовлення:</p>
                <div style="padding: 15px; border: 1px solid #eee; background-color: #fafafa; color: #444; font-size: 14px; line-height: 1.5; border-radius: 8px;">
                    ${data.message}
                </div>
            </div>
        </div>
        <div style="background: #fdfdfd; padding: 15px; text-align: center; border-top: 1px solid #f5f5f5;">
            <p style="margin: 0; font-size: 10px; color: #bbb;">© 2026 let's cut | CRM v1.0</p>
        </div>
    </div>`;

    // --- ШАБЛОН ДЛЯ КЛІЄНТА ---
    const clientHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @media only screen and (max-width: 480px) {
                .mobile-full-width { width: 100% !important; display: block !important; padding-bottom: 10px !important; }
                .btn-stack { display: block !important; width: 100% !important; margin: 0 0 12px 0 !important; padding: 16px 0 !important; }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333; width: 100%; max-width: 600px; margin: 20px auto; border-radius: 24px; background-color: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e7e7e7;">
        <div style="background-color: #000; padding: 35px 20px; text-align: center; color: #ffffff;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.7; margin-bottom: 8px;">Нова заявка</div>
            <h2 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">№ ${data.order_id}</h2>
        </div>
        <div style="padding: 35px 30px;">
            <div style="text-align: center; margin-bottom: 35px;">
                <h3 style="margin: 0; color: #000; font-size: 24px; font-weight: 700;">Замовлення прийнято! ✨</h3>
                <p style="margin: 12px 0 0; color: #666; line-height: 1.6; font-size: 15px;">
                    Дякуємо, що обрали <strong>let's cut</strong>. Я вже переглядаю ваші матеріали та готуюся до роботи.
                </p>
            </div>
            <div style="background-color: #f9f9f9; border-radius: 18px; padding: 25px; border: 1px solid #eee;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td class="mobile-full-width" style="padding: 8px 0; font-size: 13px; color: #888; width: 40%;">Тариф:</td>
                        <td class="mobile-full-width" style="padding: 8px 0; font-size: 15px; color: #444; font-weight: 600;">${data.tariff}</td>
                    </tr>
                   <tr>
                        <td class="mobile-full-width" style="padding: 8px 0; font-size: 13px; color: #888;">Термін:</td>
                        <td class="mobile-full-width" style="padding: 8px 0; font-size: 15px; color: #444;">${data.deadline}</td>
                    </tr>
                </table>
            </div>
            <div style="margin-top: 30px; padding: 20px; border-left: 4px solid #000; background: #fafafa; border-radius: 0 12px 12px 0;">
                <p style="margin: 0; font-size: 15px; color: #444; line-height: 1.7; font-style: italic;">"${data.message}"</p>
            </div>
            <div style="margin-top: 45px; text-align: center; border-top: 1px solid #eee; padding-top: 35px;">
                <a class="btn-stack" style="text-decoration: none; color: #ffffff; background-color: #000000; font-weight: 600; font-size: 14px; padding: 16px 28px; border-radius: 14px; display: inline-block; margin: 0 6px;" href="https://letscut.com.ua">На головну</a>
            </div>
        </div>
    </div>
    </body>
    </html>`;

    try {
        // Відправка обох листів
        await Promise.all([
            transporter.sendMail({
                from: `"let's cut CRM" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: `🚀 Нове замовлення: ${data.name} [${data.tariff}]`,
                html: adminHtml
            }),
            transporter.sendMail({
                from: `"Alexander | let's cut" <${process.env.EMAIL_USER}>`,
                to: data.email,
                subject: `Ваше замовлення №${data.order_id} прийнято! ✨`,
                html: clientHtml
            })
        ]);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('SMTP Error:', error);
        res.status(500).json({ success: false, error: 'Помилка поштового сервера' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend Let's Cut online on port ${PORT}`));