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

    // --- СТИЛІ ТА ШРИФТИ (Manrope для заголовків, Nunito для тексту) ---
    const fonts = "font-family: 'Manrope', 'Nunito', 'Segoe UI', Roboto, sans-serif;";
    const mainColor = "#1a1a1a"; // Глибокий темний для тексту
    const accentColor = "#ff4d4d"; // Твій червоний акцент
    const bgColor = "#ffffff"; // Світла тема

    // --- ШАБЛОН ДЛЯ АДМІНІСТРАТОРА (ТЕБЕ) ---
    const adminHtml = `
    <div style="${fonts} background-color: #f9f9f9; padding: 40px 20px; color: ${mainColor};">
        <div style="max-width: 600px; margin: 0 auto; background: ${bgColor}; border: 1px solid #dddddd; border-radius: 12px; overflow: hidden;">
            <div style="padding: 25px; border-bottom: 2px solid ${accentColor};">
                <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Нове замовлення 🔥</h2>
                <p style="margin: 5px 0 0; color: #666; font-size: 13px;">ID: ${data.order_id} | ${orderDate}</p>
            </div>
            <div style="padding: 30px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Клієнт:</td><td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 700;">${data.name}</td></tr>
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Телефон:</td><td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;"><a href="tel:${data.phone}" style="color: ${accentColor}; text-decoration: none; font-weight: 700;">${data.phone}</a></td></tr>
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Email:</td><td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">${data.email}</td></tr>
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Тариф:</td><td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 700;">${data.tariff}</td></tr>
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Дедлайн:</td><td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; color: ${accentColor}; font-weight: 700;">${data.deadline}</td></tr>
                    <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Матеріали:</td><td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;"><a href="${data.link}" style="color: #007bff;">Відкрити лінк</a></td></tr>
                </table>
                <div style="margin-top: 25px;">
                    <p style="margin: 0 0 10px; font-weight: 700; font-size: 14px;">ТЗ від клієнта:</p>
                    <div style="padding: 15px; background: #f5f5f5; border-radius: 8px; font-size: 14px; line-height: 1.6; border-left: 4px solid ${accentColor};">
                        ${data.message}
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // --- ШАБЛОН ДЛЯ КЛІЄНТА (ПОВНИЙ І СВІТЛИЙ) ---
    const clientHtml = `
    <div style="${fonts} background-color: #ffffff; color: ${mainColor}; padding: 40px 20px; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eeeeee; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
            <div style="padding: 40px 30px; text-align: center; background-color: #fafafa;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Let's Cut</h1>
                <p style="margin: 10px 0 0; color: #666; font-size: 14px;">Замовлення №${data.order_id} прийнято в роботу</p>
            </div>

            <div style="padding: 30px;">
                <p style="font-size: 16px;">Вітаю, <strong>${data.name}</strong>!</p>
                <p style="font-size: 15px; color: #444;">
                    Дякую за довіру! Я вже отримав ваше замовлення. Ось повна інформація, яку ви надіслали:
                </p>

                <div style="margin: 25px 0; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    <h3 style="margin: 0 0 15px; font-size: 15px; color: ${accentColor}; border-bottom: 1px solid #f5f5f5; padding-bottom: 10px;">Ваші дані:</h3>
                    <p style="margin: 8px 0; font-size: 14px;"><strong>Обраний тариф:</strong> ${data.tariff}</p>
                    <p style="margin: 8px 0; font-size: 14px;"><strong>Бажаний термін:</strong> ${data.deadline}</p>
                    <p style="margin: 8px 0; font-size: 14px;"><strong>Музичний супровід:</strong> ${data.music || 'На мій вибір'}</p>
                    <p style="margin: 8px 0; font-size: 14px;"><strong>Передача авторських прав:</strong> ${data.copyright_transfer}</p>
                
                    <p style="margin: 15px 0 5px; font-size: 13px; color: #888; text-transform: uppercase; font-weight: 700;">Ваше технічне завдання:</p>
                    <p style="margin: 0; font-size: 14px; background: #fcfcfc; padding: 10px; border-radius: 6px; border: 1px dashed #ddd;">${data.message}</p>
                </div>

                <p style="font-size: 14px; color: #666;">
                    <strong>Що далі?</strong> Я перевірю ваші матеріали за посиланням. Якщо виникнуть додаткові питання — я напишу вам у Telegram або зателефоную за номером <strong>${data.phone}</strong>.
                </p>

                <div style="margin-top: 35px; text-align: center;">
                    <a href="https://t.me/Oleksandr_Chepiha" style="display: inline-block; background-color: ${mainColor}; color: #ffffff; padding: 14px 25px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Зв'язатися зі мною</a>
                </div>
            </div>
    
            <div style="padding: 20px; background-color: #fafafa; text-align: center; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; font-size: 11px; color: #999;">© 2026 Let's Cut | Олександр Чепіга</p>
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
