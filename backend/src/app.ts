import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { databaseReady } from "./config/database.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import vehicleRoutes from "./routes/vehicles.js";
import bookingRoutes from "./routes/bookings.js";
import offerRoutes from "./routes/offers.js";
import dealerRoutes from "./routes/dealers.js";
import savedSearchRoutes from "./routes/savedSearches.js";
import conversationRoutes from "./routes/conversations.js";
import notificationRoutes from "./routes/notifications.js";
import reviewRoutes from "./routes/reviews.js";
import reportRoutes from "./routes/reports.js";
import paymentRoutes from "./routes/payments.js";
import financeRoutes from "./routes/finance.js";
import supportRoutes from "./routes/support.js";
import verificationRoutes from "./routes/verification.js";
import adminRoutes from "./routes/admin.js";
import { notFound, errorHandler } from "./middleware/errors.js";
import { randomUUID } from "node:crypto";
import { openApiSpec } from "./config/swagger.js";
export const app=express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({origin:env.FRONTEND_URL,credentials:true,methods:["GET","POST","PUT","PATCH","DELETE","OPTIONS"],allowedHeaders:["Content-Type","Authorization","X-Request-Id"]}));
app.use(express.json({limit:"1mb"}));
const requestLogging:RequestHandler=(req,res,next)=>{const started=Date.now();const requestId=req.header("x-request-id")?.slice(0,100)??randomUUID();res.setHeader("X-Request-Id",requestId);res.on("finish",()=>logger.info({requestId,method:req.method,path:req.path,statusCode:res.statusCode,responseTimeMs:Date.now()-started},"request completed"));next();};
app.use(requestLogging);
app.get("/",(_req,res)=>res.json({success:true,message:"Welcome to Easy Ride API",apiBase:"/api/v1",health:"/health/live",documentation:env.SWAGGER_ENABLED?"/api-docs":null}));
app.get("/health/live",(_req,res)=>res.json({status:"ok"}));
app.get("/health/ready",async(_req,res)=>{try{const ready=await databaseReady();res.status(ready?200:503).json({status:ready?"ready":"not_ready",database:ready?"connected":"disconnected"});}catch{res.status(503).json({status:"not_ready",database:"disconnected"});}});
if (env.SWAGGER_ENABLED) {
  app.get("/api-docs.json", (_req, res) => res.json(openApiSpec));
  // Swagger UI includes a small inline initializer; allow that only on the docs route.
  const swaggerApiOrigin = env.PUBLIC_API_BASE_URL ? new URL(env.PUBLIC_API_BASE_URL).origin : "'self'";
  const swaggerCsp: RequestHandler = (_req, res, next) => {
    res.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ${swaggerApiOrigin}; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'`);
    next();
  };
  app.use("/api-docs", swaggerCsp, swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: "Easy Ride API — Swagger UI",
    customCss: ".swagger-ui .topbar { background-color: #173b32; } .swagger-ui .topbar-wrapper .link::after { content: 'Easy Ride API'; font-size: 18px; color: #fff; margin-left: 10px; }",
    swaggerOptions: { persistAuthorization: false, withCredentials: true, displayRequestDuration: true, docExpansion: "list" },
  }));
}
app.use("/api/v1",rateLimit({windowMs:60_000,limit:120,standardHeaders:true,legacyHeaders:false}));
app.use("/api/v1/auth",rateLimit({windowMs:15*60_000,limit:30,standardHeaders:true,legacyHeaders:false}),authRoutes);
app.use("/api/v1/users",userRoutes);
app.use("/api/v1/vehicles",vehicleRoutes);
app.use("/api/v1/bookings",bookingRoutes);
app.use("/api/v1/offers",offerRoutes);
app.use("/api/v1/dealers",dealerRoutes);
app.use("/api/v1/saved-searches",savedSearchRoutes);
app.use("/api/v1/conversations",rateLimit({windowMs:60_000,limit:40,standardHeaders:true,legacyHeaders:false}),conversationRoutes);
app.use("/api/v1/notifications",notificationRoutes);
app.use("/api/v1/reviews",reviewRoutes);
app.use("/api/v1/reports",reportRoutes);
app.use("/api/v1/payments",paymentRoutes);
app.use("/api/v1/finance",financeRoutes);
app.use("/api/v1/support",rateLimit({windowMs:60_000,limit:30,standardHeaders:true,legacyHeaders:false}),supportRoutes);
app.use("/api/v1/verification",verificationRoutes);
app.use("/api/v1/admin",adminRoutes);
app.use(notFound); app.use(errorHandler);
