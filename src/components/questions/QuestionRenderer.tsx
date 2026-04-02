"use client";

import { Input } from "@/components/ui/input";
import {
  getLocalizedOptions,
  getQuestionFieldName,
  type QuestionWithMeta,
} from "@/lib/questions";

import { MultiChoice } from "./MultiChoice";
import { NumberField } from "./NumberField";
import { SingleChoice } from "./SingleChoice";
import { TextField } from "./TextField";

export function QuestionRenderer({
  caseId,
  question,
  locale,
  value,
  onChange,
}: {
  caseId: string;
  question: QuestionWithMeta;
  locale: string;
  value?: unknown;
  onChange: (nextValue: unknown) => void;
}) {
  const options = getLocalizedOptions(question.options, locale);

  switch (question.question_type) {
    case "single_choice":
      return (
        <SingleChoice
          options={options}
          value={typeof value === "string" ? value : undefined}
          onChange={onChange}
        />
      );
    case "multi_choice":
      return (
        <MultiChoice
          options={options}
          value={
            Array.isArray(value)
              ? value.filter((item): item is string => typeof item === "string")
              : []
          }
          onChange={onChange}
        />
      );
    case "number":
      return (
        <NumberField
          prefix="£"
          value={typeof value === "number" ? value : undefined}
          onChange={onChange}
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "text":
    default:
      return (
        <TextField
          key={question.id}
          caseId={caseId}
          fieldName={getQuestionFieldName(question)}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
      );
  }
}
