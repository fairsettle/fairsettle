"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Textarea } from "@/components/ui/textarea";
import { fetchApi } from "@/lib/api-client";

export function TextField({
  caseId,
  fieldName,
  value,
  onChange,
  maxLength = 500,
}: {
  caseId: string;
  fieldName: string;
  value?: string;
  onChange: (nextValue: string) => void;
  maxLength?: number;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [showToneAdvisory, setShowToneAdvisory] = useState(false);
  const latestValueRef = useRef(value ?? "");
  const lastRecordedValueRef = useRef(value ?? "");
  const requestSequenceRef = useRef(0);

  function getDeletedText(previousValue: string, currentValue: string) {
    if (!previousValue || previousValue === currentValue) {
      return undefined;
    }

    if (currentValue && previousValue.includes(currentValue)) {
      const diff = previousValue.replace(currentValue, "").trim();
      return diff || previousValue;
    }

    return previousValue;
  }

  function handleBlur() {
    const currentValue = latestValueRef.current;
    const previousValue = lastRecordedValueRef.current;

    if (currentValue === previousValue) {
      return;
    }

    const deletedText = getDeletedText(previousValue, currentValue);
    lastRecordedValueRef.current = currentValue;
    requestSequenceRef.current += 1;
    const requestId = requestSequenceRef.current;

    void fetchApi("/api/sentiment", locale, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        case_id: caseId,
        field_name: fieldName,
        submitted_text: currentValue,
        deleted_text: deletedText,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { flagged?: boolean };

        if (requestId === requestSequenceRef.current) {
          setShowToneAdvisory(Boolean(payload.flagged));
        }
      })
      .catch(() => {});
  }

  return (
    <div className="space-y-2">
      <Textarea
        className="min-h-32 resize-none rounded-3xl"
        maxLength={maxLength}
        value={value ?? ""}
        onBlur={handleBlur}
        onChange={(event) => {
          latestValueRef.current = event.target.value;
          if (showToneAdvisory) {
            setShowToneAdvisory(false);
          }
          onChange(event.target.value);
        }}
      />
      <p className="text-right text-xs text-ink-soft/70">{`${(value ?? "").length}/${maxLength}`}</p>
      {showToneAdvisory ? (
        <p className="app-note-warning">
          {t("questionsFlow.toneAdvisory")}
        </p>
      ) : null}
    </div>
  );
}
