import express from "express";
import {
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
} from "../controllers/auth.controller";
const router = express.Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.delete("/logout", logoutController);
router.post("/refresh-token", refreshTokenController);

export default router;
