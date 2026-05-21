import nodemailer from 'nodemailer'
import 'dotenv/config'

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

let transporter

function getSmtpTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

async function sendBrevoMail({ to, subject, html }) {
  if (!process.env.BREVO_SENDER_EMAIL) {
    throw new Error('BREVO_SENDER_EMAIL chua duoc cau hinh')
  }

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name:  process.env.BREVO_SENDER_NAME || 'CoinHub',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Brevo gui email loi ${res.status}: ${detail}`)
  }
}

async function sendMail({ to, subject, html }) {
  if (process.env.BREVO_API_KEY) {
    return sendBrevoMail({ to, subject, html })
  }

  return getSmtpTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  })
}

export async function sendOtpEmail(to, code) {
  await sendMail({
    to,
    subject: '[CoinHub] Mã xác thực OTP',
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;">
        <h2 style="color:#000;">Mã xác thực CoinHub</h2>
        <p>Mã OTP của bạn là:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;
                    padding:16px;background:#f5f5f5;border-radius:8px;
                    text-align:center;margin:16px 0;">
          ${code}
        </div>
        <p style="color:#888;font-size:13px;">
          Mã có hiệu lực trong 10 phút. Không chia sẻ mã này cho ai.
        </p>
      </div>
    `,
  })
}

export async function sendAlertEmail(to, { symbol, type, price, threshold }) {
  const isBuy  = type === 'buy'
  const subject = isBuy
    ? `[CoinHub] ${symbol} đạt giá mua mục tiêu`
    : `[CoinHub] ${symbol} đạt giá bán mục tiêu`

  await sendMail({
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;">
        <h2 style="color:#000;">${subject}</h2>
        <p>
          ${isBuy ? 'Giá Ask' : 'Giá Bid'} của <b>${symbol}</b>
          hiện tại là <b>$${price.toLocaleString()}</b>,
          ${isBuy ? 'thấp hơn' : 'cao hơn'} ngưỡng
          bạn đặt ($${threshold.toLocaleString()}).
        </p>
        <a href="${process.env.FRONTEND_URL}/trade"
           style="display:inline-block;padding:10px 20px;
                  background:#000;color:#fff;border-radius:8px;
                  text-decoration:none;font-size:14px;margin-top:8px;">
          Xem ngay
        </a>
      </div>
    `,
  })
}
