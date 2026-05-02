"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi } from "@/lib/api-client";
import type { FormEvent } from "react";

export function SpecialistApplicationForm({ locale }: { locale: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetchApi("/api/specialists/apply", locale, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Unable to submit specialist application.");
      }

      setMessage("Application submitted. The FairSettle team will review your profile.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit specialist application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="app-panel">
      <CardContent className="space-y-6 p-6">
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void handleSubmit(new FormData(event.currentTarget));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" required type="email" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialistType">Specialist type</Label>
            <select id="specialistType" name="specialistType" className="h-11 w-full rounded-[1rem] border border-line bg-surface px-4 text-sm">
              <option value="mediator">Mediator</option>
              <option value="solicitor">Solicitor</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accreditationBody">Accreditation body</Label>
            <Input id="accreditationBody" name="accreditationBody" placeholder="FMC or SRA" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accreditationNumber">Accreditation number</Label>
            <Input id="accreditationNumber" name="accreditationNumber" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qualifications">Qualifications</Label>
            <Input id="qualifications" name="qualifications" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearsExperience">Years of experience</Label>
            <Input id="yearsExperience" name="yearsExperience" required type="number" min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly rate (£)</Label>
            <Input id="hourlyRate" name="hourlyRate" required type="number" min="0" step="0.01" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="languages">Languages</Label>
            <Input id="languages" name="languages" placeholder="English, Polish" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialisms">Specialisms</Label>
            <Input id="specialisms" name="specialisms" placeholder="Child arrangements, finance" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationText">Location</Label>
            <Input id="locationText" name="locationText" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode</Label>
            <Input id="postcode" name="postcode" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remoteAvailable">Remote availability</Label>
            <select id="remoteAvailable" name="remoteAvailable" className="h-11 w-full rounded-[1rem] border border-line bg-surface px-4 text-sm">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo">Photo</Label>
            <Input id="photo" name="photo" type="file" accept="image/*" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" rows={6} required />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" className="h-12" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit application"}
            </Button>
          </div>
        </form>

        {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
