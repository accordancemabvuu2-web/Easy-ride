import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "./errors.js";
import { UserModel } from "../models/User.js";
declare global { namespace Express { interface Request { auth?: { userId:string; role:string } } } }
export const authenticate: RequestHandler = async (req,_res,next) => {
 const header=req.headers.authorization; const token=header?.startsWith("Bearer ")?header.slice(7):undefined;
 if(!token)return next(new HttpError(401,"UNAUTHENTICATED","Sign in to continue."));
 let payload: jwt.JwtPayload;
 try {
  payload=jwt.verify(token,env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  if(typeof payload.sub!=="string"||typeof payload.role!=="string")throw new Error();
 } catch { return next(new HttpError(401,"INVALID_TOKEN","Your session is invalid or expired.")); }
 const user=await UserModel.findOne({_id:payload.sub,accountStatus:"active"}).select("role").lean();
 if(!user)return next(new HttpError(401,"ACCOUNT_UNAVAILABLE","Your account is unavailable."));
 req.auth={userId:payload.sub!,role:user.role}; next();
};

export const optionalAuthenticate: RequestHandler = (req,_res,next) => {
 const header=req.headers.authorization; const token=header?.startsWith("Bearer ")?header.slice(7):undefined;
 if(!token)return next();
 try { const p=jwt.verify(token,env.JWT_ACCESS_SECRET) as jwt.JwtPayload; if(typeof p.sub==="string"&&typeof p.role==="string")req.auth={userId:p.sub,role:p.role}; } catch { /* Public reads stay public when an optional token is invalid. */ }
 next();
};
