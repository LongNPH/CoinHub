import bcrypt       from 'bcryptjs'
import jwt          from 'jsonwebtoken'
import crypto       from 'crypto'
import redis        from '../db/redis.js'
import 'dotenv/config'

const OTP_TTL = 60 * 10 

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10)
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

export function signJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

export function verifyJwt(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}

export async function saveOtp(email, code) {
  await redis.set(`otp:${email}`, code, 'EX', OTP_TTL)
}

export async function verifyOtp(email, code) {
  const saved = await redis.get(`otp:${email}`)
  if (!saved)        throw new Error('Mã OTP đã hết hạn')
  if (saved !== code) throw new Error('Mã OTP không đúng')
  await redis.del(`otp:${email}`)
}

export function generateOtp() {
  return crypto.randomInt(100000, 999999).toString()
}