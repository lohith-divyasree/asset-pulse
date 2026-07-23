export interface AssetCompletionInput {
  assetName?: string | null;
  make?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photoUrls?: string[] | null;
  specifications?: Record<string, any> | null;
}

export function calculateCompletionScore(asset: AssetCompletionInput): number {
  let score = 0;

  // Field Survey Attributes (Max 60 Points)
  if (asset.assetName && asset.assetName.trim().length > 0) score += 10;
  if (asset.make && asset.make.trim().length > 0) score += 10;
  if (asset.modelNumber && asset.modelNumber.trim().length > 0) score += 10;
  if (asset.serialNumber && asset.serialNumber.trim().length > 0) score += 10;
  if (
    asset.latitude !== null &&
    asset.latitude !== undefined &&
    asset.longitude !== null &&
    asset.longitude !== undefined
  )
    score += 10;
  if (asset.photoUrls && asset.photoUrls.length > 0) score += 10;

  // Back-office Spec Enrichment (Max 40 Points)
  if (asset.specifications && Object.keys(asset.specifications).length > 0) {
    score += 40;
  }

  return Math.min(score, 100);
}
