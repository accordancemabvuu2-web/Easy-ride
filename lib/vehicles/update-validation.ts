import { z } from "zod";

const optionalText = z.string().trim().max(200).optional().or(z.literal(""));
const optionalNumber = (schema: z.ZodTypeAny) => z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  schema.optional(),
);
const nullablePrice = optionalNumber(z.coerce.number().finite().min(0));

export const updateVehicleSchema = z.object({
  listing_type: z.enum(["sale", "rent", "sale_and_rent"]).optional(),
  make: z.string().trim().min(1).max(80).optional(),
  model: z.string().trim().min(1).max(100).optional(),
  trim: optionalText,
  year: z.coerce.number().int().min(1886).max(2100).optional(),
  mileage_km: optionalNumber(z.coerce.number().int().min(0)),
  condition: z.enum(["new", "used", "certified_pre_owned"]).optional(),
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
  currency: z.string().trim().length(3).optional(),
  country_code: z.string().trim().max(3).optional().or(z.literal("")),
  city: optionalText,
  address_label: z.string().trim().max(250).optional().or(z.literal("")),
  latitude: optionalNumber(z.coerce.number().min(-90).max(90)),
  longitude: optionalNumber(z.coerce.number().min(-180).max(180)),
  description: z.string().trim().max(10000).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one field to update.",
});
