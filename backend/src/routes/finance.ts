import { Router } from "express";
import { z } from "zod";
import { calculateFinance } from "../services/finance.js";

const router = Router();
const input = z.object({
  principal: z.coerce.number().positive().max(100_000_000),
  deposit: z.coerce.number().min(0).max(100_000_000),
  annualInterestRate: z.coerce.number().min(0).max(100),
  termMonths: z.coerce.number().int().min(1).max(480),
  currency: z.string().regex(/^[A-Z]{3}$/).default("ZAR"),
}).strict().superRefine((value, ctx) => {
  if (value.deposit >= value.principal) ctx.addIssue({ code: "custom", path: ["deposit"], message: "Deposit must be lower than principal." });
});

router.post("/calculate", (req, res) => {
  const { currency, ...values } = input.parse(req.body);
  res.json({ success: true, data: { ...calculateFinance(values), currency }, meta: { disclaimer: "Illustrative estimate only. This is not a credit decision or financing offer." } });
});

export default router;
