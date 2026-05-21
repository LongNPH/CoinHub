import { Router } from 'express'
import { query }  from '../db/index.js'
import {
  hashPassword, comparePassword,
  signJwt, generateOtp, saveOtp,
} from '../services/auth.js'
import { sendOtpEmail } from '../services/email.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

const COOKIE_OPTS = {
  httpOnly: true,
  // Render serves the frontend and API from separate origins in production.
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure:   process.env.NODE_ENV === 'production',
  maxAge:   7 * 24 * 60 * 60 * 1000, 
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, phone, password, confirmPassword } = req.body

    // Validate
    if (!username || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' })
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Mật khẩu xác nhận không khớp' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email không hợp lệ' })
    }

    const [existing] = await query(
      `SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1`,
      [email, username]
    )
    if (existing) {
      return res.status(409).json({ error: 'Email hoặc tên đăng nhập đã được sử dụng' })
    }

    const hashed = await hashPassword(password)

    const [user] = await query(`
      INSERT INTO users (username, email, phone, password)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, phone, role
    `, [username, email, phone, hashed])

    const token = signJwt({ id: user.id, role: user.role })
    res.cookie('token', token, COOKIE_OPTS)
    res.status(201).json({ user })
  } catch (err) {
    next(err)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' })
    }

    const [user] = await query(
      `SELECT id, username, email, phone, role, password
       FROM users
       WHERE username = $1 OR email = $1`,
      [username]
    )

    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' })
    }

    const valid = await comparePassword(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' })
    }

    const token = signJwt({ id: user.id, role: user.role })
    res.cookie('token', token, COOKIE_OPTS)

    const { password: _, ...safeUser } = user
    res.json({ user: safeUser })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.status(204).send()
})

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [user] = await query(
      `SELECT id, username, email, phone, role FROM users WHERE id = $1`,
      [req.user.id]
    )
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' })
    res.json({ user })
  } catch (err) {
    next(err)
  }
})

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Vui lòng nhập email' })
    }

    const [user] = await query(
      `SELECT id FROM users WHERE email = $1`, [email]
    )

    if (user) {
      const code = generateOtp()
      await saveOtp(email, code)
      await sendOtpEmail(email, code)
    }

    res.json({ message: 'Nếu email tồn tại, mã OTP đã được gửi' })
  } catch (err) {
    next(err)
  }
})

export default router
