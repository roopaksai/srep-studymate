import jwt from "jsonwebtoken"
import { jwtVerify } from "jose"

const secret = process.env.JWT_SECRET!

export function generateToken(userId: string) {
  return jwt.sign({ userId }, secret, { expiresIn: "7d" })
}

export async function verifyToken(token: string) {
  try {
    const key = new TextEncoder().encode(secret)
    const verified = await jwtVerify(token, key)
    return verified.payload
  } catch (err) {
    return null
  }
}
