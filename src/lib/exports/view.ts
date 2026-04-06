export const STANDARD_EXPORT_FEATURE_KEYS = [
  "export.standardFeatureSummary",
  "export.standardFeaturePositions",
  "export.standardFeatureComparison",
  "export.standardFeatureAudit",
] as const;

export const RESOLUTION_EXPORT_FEATURE_KEYS = [
  ...STANDARD_EXPORT_FEATURE_KEYS,
  "export.resolutionFeatureConsent",
  "export.resolutionFeatureCooperation",
] as const;
