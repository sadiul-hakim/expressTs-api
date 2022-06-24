import { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import User from "../models/user.model";

import { authSchema } from "../helpers/validationSchema";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../helpers/jwt_helper";
import client from "../helpers/init_redis";

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await authSchema.validateAsync(req.body);
    console.log(result);

    const doesExist = await User.findOne({ email: result.email });
    if (doesExist)
      throw new createError.Conflict(
        `${result.email} is already been registered.`
      );

    const user = new User(result);
    const savedUser = await user.save();
    const accessToken = await signAccessToken(String(user._id));
    const refreshToken = await signRefreshToken(String(user._id));
    res.send({ accessToken, refreshToken });
  } catch (error: any) {
    if (error.isJoi === true) error.status = 422;
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let result = await authSchema.validateAsync(req.body);
    const user = await User.findOne({ email: result.email });
    if (!user) throw new createError.NotFound("User not registered✋.");
    const isMatch = await user.isValidPassword(result.password);
    if (!isMatch)
      throw new createError.Unauthorized("Username/Password not valid");
    const accessToken = await signAccessToken(String(user._id));
    const refreshToken = await signRefreshToken(String(user._id));

    res.send({ accessToken, refreshToken });
  } catch (error: any) {
    if (error.isJoi === true)
      return next(new createError.BadRequest("Invalid username/password."));
    next(error);
  }
};

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { refreshToken } = req.body;
    if (!refreshToken) throw new createError.BadRequest();
    const userId = await verifyRefreshToken(refreshToken);
    client.DEL(userId as string, (err, val) => {
      if (err) {
        console.log(err);
        throw new createError.InternalServerError();
      }
      console.log(val);
      res.sendStatus(204);
    });
  } catch (error) {
    next(error);
  }
};

export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new createError.BadRequest();
    const userId = await verifyRefreshToken(refreshToken);
    const accessToken = await signAccessToken(String(userId));
    const newRefreshToken = await signRefreshToken(String(userId));
    res.send({ accessToken, newRefreshToken });
  } catch (error) {
    next(error);
  }
};
