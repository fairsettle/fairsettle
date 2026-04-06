import type { LucideIcon } from "lucide-react";
import {
  Clock3,
  FileText,
  Globe2,
  MessageSquareHeart,
  ShieldCheck,
  Sparkles,
  Scale,
  Wallet,
} from "lucide-react";

type Translate = (key: string) => string;

export function getLandingProblemCards(t: Translate): Array<{
  icon: LucideIcon;
  title: string;
  body: string;
}> {
  return [
    {
      icon: Wallet,
      title: t("landing.problemCostTitle"),
      body: t("landing.problemCostBody"),
    },
    {
      icon: Clock3,
      title: t("landing.problemDelayTitle"),
      body: t("landing.problemDelayBody"),
    },
    {
      icon: MessageSquareHeart,
      title: t("landing.problemConflictTitle"),
      body: t("landing.problemConflictBody"),
    },
    {
      icon: ShieldCheck,
      title: t("landing.problemAccessTitle"),
      body: t("landing.problemAccessBody"),
    },
    {
      icon: Scale,
      title: t("responder.neutralityTitle"),
      body: t("responder.neutralityBody"),
    },
    {
      icon: FileText,
      title: t("gdpr.dataSafe"),
      body: t("gdpr.gdprNotice"),
    },
  ];
}

export function getLandingSteps(t: Translate) {
  return [
    {
      number: "1",
      title: t("landing.step1Title"),
      body: t("landing.step1Body"),
    },
    {
      number: "2",
      title: t("landing.step2Title"),
      body: t("landing.step2Body"),
    },
    {
      number: "3",
      title: t("landing.step3Title"),
      body: t("landing.step3Body"),
    },
    {
      number: "4",
      title: t("landing.step4Title"),
      body: t("landing.step4Body"),
    },
  ];
}

export function getLandingFeatures(t: Translate): Array<{
  icon: LucideIcon;
  title: string;
  body: string;
}> {
  return [
    {
      icon: ShieldCheck,
      title: t("landing.feature1Title"),
      body: t("landing.feature1Body"),
    },
    {
      icon: Wallet,
      title: t("landing.feature2Title"),
      body: t("landing.feature2Body"),
    },
    {
      icon: Globe2,
      title: t("landing.feature3Title"),
      body: t("landing.feature3Body"),
    },
    {
      icon: MessageSquareHeart,
      title: t("landing.feature4Title"),
      body: t("landing.feature4Body"),
    },
    {
      icon: FileText,
      title: t("landing.feature5Title"),
      body: t("landing.feature5Body"),
    },
    {
      icon: Sparkles,
      title: t("landing.feature6Title"),
      body: t("landing.feature6Body"),
    },
  ];
}

export function getLandingPricingTiers(t: Translate) {
  return [
    {
      name: t("landing.pricingFree"),
      price: t("landing.pricingFreeValue"),
      note: t("landing.pricingFreeNote"),
      features: [
        t("landing.pricingFeatureStart"),
        t("landing.pricingFeatureInvite"),
        t("landing.pricingFeatureCompare"),
        t("landing.pricingFeatureSavings"),
      ],
      featured: false,
    },
    {
      name: t("landing.pricingStandard"),
      price: t("landing.pricingStandardValue"),
      note: t("landing.pricingPaidNote"),
      features: [
        t("landing.pricingFeatureEverythingFree"),
        t("landing.pricingFeatureExport"),
        t("landing.pricingFeatureAudit"),
        t("landing.pricingFeatureEvidence"),
      ],
      featured: true,
    },
    {
      name: t("landing.pricingResolution"),
      price: t("landing.pricingResolutionValue"),
      note: t("landing.pricingPaidNote"),
      features: [
        t("landing.pricingFeatureEverythingStandard"),
        t("landing.pricingFeatureSuggestions"),
        t("landing.pricingFeatureConsent"),
        t("landing.pricingFeatureCooperation"),
      ],
      featured: false,
    },
  ];
}
