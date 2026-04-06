"use client";

import { CalendarDays, UsersRound } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ChildDraft = {
  first_name: string;
  date_of_birth: string;
};

const childCountOptions = [0, 1, 2, 3, 4] as const;

export function FamilyProfileFields({
  children,
  childrenCount,
  parentRole,
  onChildChange,
  onChildrenCountChange,
  onParentRoleChange,
  t,
}: {
  children: ChildDraft[];
  childrenCount: number;
  parentRole: "mum" | "dad" | "";
  onChildChange: (
    index: number,
    key: keyof ChildDraft,
    value: string,
  ) => void;
  onChildrenCountChange: (count: number) => void;
  onParentRoleChange: (role: "mum" | "dad") => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="space-y-5 rounded-[1.75rem] border border-line bg-surface-soft p-5">
      <div className="space-y-2">
        <p className="app-kicker">{t("register.familyEyebrow")}</p>
        <h2 className="text-xl font-semibold text-ink">
          {t("register.familyTitle")}
        </h2>
        <p className="text-sm leading-6 text-ink-soft">
          {t("register.familyBody")}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="parent_role">{t("register.parentRole")}</Label>
          <Select
            value={parentRole}
            onValueChange={(value) => onParentRoleChange(value as "mum" | "dad")}
          >
            <SelectTrigger
              aria-label={t("register.parentRole")}
              className="w-full"
              id="parent_role"
            >
              <SelectValue placeholder={t("register.parentRolePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mum">{t("register.parentRoleMum")}</SelectItem>
              <SelectItem value="dad">{t("register.parentRoleDad")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="children_count">{t("register.childrenCount")}</Label>
          <Select
            value={String(childrenCount)}
            onValueChange={(value) => onChildrenCountChange(Number(value))}
          >
            <SelectTrigger
              aria-label={t("register.childrenCount")}
              className="w-full"
              id="children_count"
            >
              <SelectValue placeholder={t("register.childrenCount")} />
            </SelectTrigger>
            <SelectContent>
              {childCountOptions.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count === 4
                    ? t("register.childrenOption4Plus")
                    : String(count)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {childrenCount > 0 ? (
        <div className="space-y-4">
          {children.map((child, index) => (
            <div
              key={`child-${index}`}
              className="rounded-[1.5rem] border border-line bg-surface p-4"
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="app-chip px-3 py-1 text-xs">
                  <UsersRound className="size-3.5" />
                  {t("register.childCardTitle", { index: index + 1 })}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`child_name_${index}`}>
                    {t("register.childFirstName")}
                  </Label>
                  <Input
                    id={`child_name_${index}`}
                    placeholder={t("register.childFirstNamePlaceholder")}
                    value={child.first_name}
                    onChange={(event) =>
                      onChildChange(index, "first_name", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`child_dob_${index}`}>
                    {t("register.childDob")}
                  </Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
                    <Input
                      className="pl-10"
                      id={`child_dob_${index}`}
                      required
                      type="date"
                      value={child.date_of_birth}
                      onChange={(event) =>
                        onChildChange(index, "date_of_birth", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-soft">{t("register.noChildrenHint")}</p>
      )}
    </div>
  );
}
