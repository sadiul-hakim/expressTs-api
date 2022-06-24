import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import createError from "http-errors";
import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import client from "./init_redis";

dotenv.config();

type Req<T> = T & { payload: JwtPayload | undefined };

export const signAccessToken = async (userId: string) => {
  return new Promise((resolve, reject) => {
    const payload = {};
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const options = {
      expiresIn: "10m",
      issuer: "",
      audience: userId as string,
    };

    jwt.sign(payload, secret as string, options, (err, token) => {
      if (err) {
        console.log(err);
        reject(new createError.InternalServerError());
        return;
      }
      resolve(token);
    });
  });
};

export const verifyAccessToken = (
  req: Req<Request>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.headers["authorization"])
      return next(new createError.Unauthorized());
    const authHeader = req.headers["authorization"];
    const bearerToken = authHeader.split(" ");
    const token = bearerToken[1];
    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
      (err, payload) => {
        if (err) {
          if (err.name === "JsonWebTokenError") {
            return next(new createError.Unauthorized());
          } else {
            return next(new createError.Unauthorized(err.message));
          }
        }
        req.payload = payload;
        next();
      }
    );
  } catch (error) {
    next(error);
  }
};

export const signRefreshToken = async (userId: string) => {
  return new Promise((resolve, reject) => {
    const payload = {};
    const secret = process.env.REFRESH_TOKEN_SECRET;
    const options = {
      expiresIn: "1y",
      issuer: "",
      audience: userId as string,
    };

    jwt.sign(payload, secret as string, options, (err, token) => {
      if (err) {
        console.log(err);
        reject(new createError.InternalServerError());
        return;
      }
      client.SET(
        userId,
        token as string,
        "EX",
        365 * 24 * 60 * 60,
        (err, reply) => {
          if (err) {
            console.log(err);
            reject(new createError.InternalServerError());
            return;
          }
          resolve(token);
        }
      );
    });
  });
};

export const verifyRefreshToken = async (refreshToken: string) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string,
      (err: VerifyErrors | null, payload: JwtPayload | undefined) => {
        if (err) return reject(new createError.Unauthorized());
        const userId = payload?.aud;
        client.GET(userId as string, (err, result) => {
          if (err) {
            console.log(err);
            reject(new createError.InternalServerError());
            return;
          }
          if (refreshToken === result) resolve(userId);
          reject(new createError.Unauthorized());
        });
      }
    );
  });
};
