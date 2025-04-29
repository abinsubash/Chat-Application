import jwt from 'jsonwebtoken'

const ACCESS_SECRET = 'moshtikkarutee'
const REFRESH_SECRET = 'moshtikkarutee'

export const generateAccessToken = (payload: object): string => {
  const { exp, ...cleanPayload } = payload as any;
  return jwt.sign(cleanPayload, ACCESS_SECRET, { expiresIn: '1h' })
}

export const generateRefreshToken = (payload: object): string => {
  const { exp, ...cleanPayload } = payload as any;
  return jwt.sign(cleanPayload, REFRESH_SECRET, { expiresIn: '7d' })
}

export const verifyAccessToken = (token: string): any => {
  try {
    return jwt.verify(token, ACCESS_SECRET)
  } catch (err) {
    return null
  }
}

export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, REFRESH_SECRET)
  } catch (err) {
    return null
  }
}
