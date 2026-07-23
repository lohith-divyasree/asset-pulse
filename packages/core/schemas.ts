import { z } from "zod";

// Asset Creation / Survey Payload Schema
export const createAssetSchema = z.object({
  propertyId: z.string().uuid("Invalid property ID"),
  buildingId: z.string().uuid("Invalid building ID").optional(),
  floorId: z.string().uuid("Invalid floor ID").optional(),
  spaceId: z.string().uuid("Invalid space ID").optional(),
  subcategoryId: z.string().uuid("Invalid subcategory ID"),
  assetName: z.string().min(2, "Asset name is required"),
  make: z.string().min(1, "Make is required"),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  photoUrls: z.array(z.string().url()).optional().default([]),
  specifications: z.record(z.any()).optional().default({}),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
