import { Router } from "express";
import { randomBytes, createHmac } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { RefreshTokenModel } from "../models/RefreshToken.js";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errors.js";
import { authenticate } from "../middleware/auth.js";
const router=Router();
const hash=(v:string)=>createHmac("sha256",env.JWT_REFRESH_SECRET).update(v).digest("hex");
const cookie=(req:import("express").Request)=>{const raw=req.headers.cookie?.split(";").map(x=>x.trim()).find(x=>x.startsWith("easy-ride-refresh="));return raw?decodeURIComponent(raw.slice(raw.indexOf("=")+1)):undefined;};
const access=(u:{_id:unknown;role:string})=>jwt.sign({role:u.role},env.JWT_ACCESS_SECRET,{subject:String(u._id),expiresIn:env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"]});
async function createRefresh(userId:string,req:import("express").Request){const token=randomBytes(48).toString("base64url");await RefreshTokenModel.create({userId,tokenHash:hash(token),expiresAt:new Date(Date.now()+env.REFRESH_TOKEN_TTL_DAYS*86400000),userAgent:req.get("user-agent")?.slice(0,300),ip:req.ip});return token;}
function setCookie(res:import("express").Response,token:string){res.cookie("easy-ride-refresh",token,{httpOnly:true,secure:env.NODE_ENV==="production",sameSite:"lax",path:"/api/v1/auth",maxAge:env.REFRESH_TOKEN_TTL_DAYS*86400000});}
router.post("/register",async(req,res)=>{const p=z.object({firstName:z.string().trim().min(1).max(80),lastName:z.string().trim().max(80).optional(),email:z.string().trim().email().max(254),password:z.string().min(10).max(128)}).parse(req.body);const user=await UserModel.create({...p,email:p.email.toLowerCase(),passwordHash:await bcrypt.hash(p.password,env.BCRYPT_ROUNDS)});res.status(201).json({success:true,data:{user:{id:String(user._id),email:user.email}},meta:{}});});
router.post("/login",async(req,res)=>{const p=z.object({email:z.string().email(),password:z.string().min(1).max(128)}).parse(req.body);const user=await UserModel.findOne({email:p.email.toLowerCase(),accountStatus:"active"}).select("+passwordHash");if(!user?.passwordHash||!(await bcrypt.compare(p.password,user.passwordHash)))throw new HttpError(401,"INVALID_CREDENTIALS","Email or password is incorrect.");user.lastLoginAt=new Date();await user.save();setCookie(res,await createRefresh(String(user._id),req));res.json({success:true,data:{user:{id:String(user._id),email:user.email},accessToken:access(user)},meta:{}});});
router.post("/refresh",async(req,res)=>{const token=cookie(req);if(!token)throw new HttpError(401,"INVALID_REFRESH_TOKEN","Refresh token is missing.");const record=await RefreshTokenModel.findOne({tokenHash:hash(token)});if(!record||record.revokedAt||record.expiresAt<=new Date()){if(record)await RefreshTokenModel.updateMany({userId:record.userId,revokedAt:null},{$set:{revokedAt:new Date()}});throw new HttpError(401,"INVALID_REFRESH_TOKEN","Refresh token is invalid or expired.");}const user=await UserModel.findById(record.userId);if(!user||user.accountStatus!=="active")throw new HttpError(401,"INVALID_REFRESH_TOKEN","Account is unavailable.");const replacement=await createRefresh(String(user._id),req);record.revokedAt=new Date();record.replacedBy=hash(replacement);await record.save();setCookie(res,replacement);res.json({success:true,data:{accessToken:access(user)},meta:{}});});
router.post("/logout",async(req,res)=>{const token=cookie(req);if(token)await RefreshTokenModel.updateOne({tokenHash:hash(token),revokedAt:null},{$set:{revokedAt:new Date()}});res.clearCookie("easy-ride-refresh",{httpOnly:true,secure:env.NODE_ENV==="production",sameSite:"lax",path:"/api/v1/auth"});res.json({success:true,data:{loggedOut:true},meta:{}});});
router.post("/logout-all",authenticate,async(req,res)=>{await RefreshTokenModel.updateMany({userId:req.auth!.userId,revokedAt:null},{$set:{revokedAt:new Date()}});res.clearCookie("easy-ride-refresh",{httpOnly:true,secure:env.NODE_ENV==="production",sameSite:"lax",path:"/api/v1/auth"});res.json({success:true,data:{loggedOut:true},meta:{}});});
router.get("/me",authenticate,async(req,res)=>{const user=await UserModel.findById(req.auth!.userId).select("-passwordHash").lean();if(!user)throw new HttpError(404,"NOT_FOUND","Account not found.");res.json({success:true,data:user,meta:{}});});
export default router;
