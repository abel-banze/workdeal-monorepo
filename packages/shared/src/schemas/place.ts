import { z } from "zod";
import { businessHoursSchema } from "./business-hours";

// DTOs do proxy Places (/api/v1/places/*) — fonte única usada pela API e pelas Server Actions

export const placeSuggestionSchema = z.object({
  placeId: z.string(),
  mainText: z.string(),
  secondaryText: z.string(),
});

export const placeAutocompleteQuerySchema = z.object({
  input: z.string().trim().min(2, "Pesquisa muito curta").max(120),
});

export const placeDetailsSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  formattedAddress: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  province: z.string().nullable(),
  district: z.string().nullable(),
  bairro: z.string().nullable(),
  // Formato canónico idêntico ao regularOpeningHours.periods do Google
  businessHours: businessHoursSchema.nullable(),
});

export type PlaceSuggestion = z.infer<typeof placeSuggestionSchema>;
export type PlaceDetails = z.infer<typeof placeDetailsSchema>;
