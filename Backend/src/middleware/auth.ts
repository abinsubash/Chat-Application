import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken, generateAccessToken } from '../config/jwt';

interface CustomRequest extends Request {
  user?: any;
}

interface JwtPayload {
  _id: string;
  name: string;
  email: string;
  username: string;
}

export const verifyToken = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('this is req.headers', req.headers);
    const accessToken = req.headers.authorization?.split(' ')[1];

    if (!accessToken) {
      return next(new Error('Access token required'));
    }

    const decoded = verifyAccessToken(accessToken) as JwtPayload;

    if (decoded) {
      req.user = decoded;
      return next();
    } else {
      // If access token invalid, check refresh token
      const refreshToken = req.cookies.token;
      console.log('this is cookies', refreshToken);

      if (!refreshToken) {
        return next(new Error('Login required'));
      }

      const decodedRefresh = verifyRefreshToken(refreshToken) as JwtPayload;

      if (!decodedRefresh) {
        return next(new Error('Login required'));
      }

      const newAccessToken = generateAccessToken(decodedRefresh);
      res.setHeader('New-Access-Token', newAccessToken);
      req.user = decodedRefresh;
      return next();
    }
  } catch (error) {
    return next(error);
  }
};
