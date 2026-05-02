"use client";

import { Loader2, LifeBuoy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi } from "@/lib/api-client";

export function ProfessionalHelpRequestCard({
  caseId,
  locale,
}: {
  caseId: string;
  locale: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [specialistType, setSpecialistType] = useState<"mediator" | "solicitor">("mediator");
  const [preferredTimeWindow, setPreferredTimeWindow] = useState("");
  const [locationPreference, setLocationPreference] = useState<"remote" | "local" | "either">("either");
  const [locationText, setLocationText] = useState("");
  const [postcode, setPostcode] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setIsSubmitting(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await fetchApi("/api/referral-requests", locale, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseId,
          specialistType,
          preferredTimeWindow,
          locationPreference,
          locationText,
          postcode,
          message,
          source: "resolution_cta",
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to send specialist request.");
      }

      setStatusMessage("Your request has been sent to the FairSettle team for review.");
      setIsOpen(false);
      setPreferredTimeWindow("");
      setLocationText("");
      setPostcode("");
      setMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Unable to send specialist request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="app-panel border-brand/15">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start gap-4">
          <span className="app-icon-chip">
            <LifeBuoy className="size-5" />
          </span>
          <div className="space-y-2">
            <p className="app-kicker">Professional support</p>
            <h2 className="font-display text-3xl text-ink">Get professional help</h2>
            <p className="text-sm leading-6 text-ink-soft">
              If the two of you are still far apart, FairSettle can place your case into a specialist review flow.
              Start with a mediator or request a solicitor referral for more complex legal issues.
            </p>
          </div>
        </div>

        {statusMessage ? <p className="app-note bg-success-soft px-4 py-3 text-success-foreground">{statusMessage}</p> : null}
        {errorMessage ? <p className="app-alert-danger">{errorMessage}</p> : null}

        {!isOpen ? (
          <Button type="button" size="lg" className="h-12" onClick={() => setIsOpen(true)}>
            Open request form
          </Button>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="specialistType">Specialist type</Label>
              <select
                id="specialistType"
                className="h-12 w-full rounded-[1rem] border border-line bg-surface px-4 text-sm"
                value={specialistType}
                onChange={(event) => setSpecialistType(event.target.value as "mediator" | "solicitor")}
              >
                <option value="mediator">Mediator</option>
                <option value="solicitor">Solicitor</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredTimeWindow">Preferred time window</Label>
              <Input
                id="preferredTimeWindow"
                placeholder="Weekday mornings, after 6pm, flexible"
                value={preferredTimeWindow}
                onChange={(event) => setPreferredTimeWindow(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationPreference">Location preference</Label>
              <select
                id="locationPreference"
                className="h-12 w-full rounded-[1rem] border border-line bg-surface px-4 text-sm"
                value={locationPreference}
                onChange={(event) =>
                  setLocationPreference(event.target.value as "remote" | "local" | "either")
                }
              >
                <option value="either">Remote or local</option>
                <option value="remote">Remote only</option>
                <option value="local">Local only</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode or area</Label>
              <Input
                id="postcode"
                placeholder="SW1A 1AA"
                value={postcode}
                onChange={(event) => setPostcode(event.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="locationText">Location details</Label>
              <Input
                id="locationText"
                placeholder="Remote is ideal, but London is also possible"
                value={locationText}
                onChange={(event) => setLocationText(event.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="requestMessage">Message</Label>
              <Textarea
                id="requestMessage"
                placeholder="Tell the team what kind of help you need and what is making the case hard to move forward."
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button
                type="button"
                size="lg"
                className="h-12"
                disabled={isSubmitting}
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Sending request
                  </>
                ) : (
                  "Send request"
                )}
              </Button>
              <Button type="button" size="lg" variant="outline" className="h-12" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
