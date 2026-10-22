import { z } from "zod";

const optionalText = z.string().trim().max(200).optional().or(z.literal(""));
const optionalNumber = (schema: z.ZodTypeAny) => z.preprocess(
  (value) => value === "" || value === null || value === undefined ? undefined : value,
  schema.optional(),
);
const nullablePrice = optionalNumber(z.coerce.number().finite().min(0));

export const createVehicleSchema = z.object({
  listing_type: z.enum(["sale", "rent", "sale_and_rent"]),
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(100),
  trim: optionalText,
  year: z.coerce.number().int().min(1886).max(2100),
  mileage_km: optionalNumber(z.coerce.number().int().min(0)),
  condition: z.enum(["new", "used", "certified_pre_owned"]).default("used"),
  fuel_type: optionalText,
  transmission: optionalText,
  body_type: optionalText,
  engine: optionalText,
  drivetrain: optionalText,
  seat_count: optionalNumber(z.coerce.number().int().min(1).max(100)),
  exterior_color: optionalText,
  sale_price: nullablePrice,
  rent_day_price: nullablePrice,
  rent_week_price: nullablePrice,
  rent_month_price: nullablePrice,
  currency: z.string().trim().length(3).default("USD"),
  country_code: z.string().trim().max(3).optional(),
  city: optionalText,
  address_label: z.string().trim().max(250).optional().or(z.literal("")),
  latitude: optionalNumber(z.coerce.number().min(-90).max(90)),
  longitude: optionalNumber(z.coerce.number().min(-180).max(180)),
  description: z.string().trim().max(10000).default(""),
  dealer_id: z.string().uuid().optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if ((value.listing_type === "sale" || value.listing_type === "sale_and_rent") && value.sale_price == null) {
    ctx.addIssue({ code: "custom", path: ["sale_price"], message: "Enter a sale price." });
  }
  if ((value.listing_type === "rent" || value.listing_type === "sale_and_rent") && value.rent_day_price == null) {
    ctx.addIssue({ code: "custom", path: ["rent_day_price"], message: "Enter a daily rental price." });
  }
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
