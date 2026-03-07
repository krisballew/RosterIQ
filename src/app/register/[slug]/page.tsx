"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeDivisionForDob, parseDivisionNumber } from "@/lib/age-division";

type LinkData = {
  id: string;
  name: string;
  season: string | null;
  age_division: string | null;
  gender: string | null;
  team_id: string | null;
  event_id: string | null;
  tenant: {
    id: string;
    name: string;
    logo_url: string | null;
    timezone: string | null;
  };
  event: {
    id: string;
    name: string;
    event_type: string;
    starts_at: string | null;
    ends_at: string | null;
    location: string | null;
  } | null;
  team: {
    id: string;
    name: string;
    age_division: string | null;
  } | null;
};

export default function RegisterPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    currentClub: "",
    currentTeam: "",
    primaryPosition: "",
    secondaryPosition: "",
    allowPlayUpOverride: false,
  });

  const teamAgeDivision = linkData?.team?.age_division ?? linkData?.age_division ?? null;
  const teamDivisionNum = parseDivisionNumber(teamAgeDivision);
  const playerDivision = form.dateOfBirth ? computeDivisionForDob(form.dateOfBirth) : null;
  const playerDivisionNum = parseDivisionNumber(playerDivision);

  const dobDivisionValidation = (() => {
    if (!form.dateOfBirth || !teamAgeDivision || playerDivisionNum === null || teamDivisionNum === null) {
      return null;
    }

    if (playerDivisionNum > teamDivisionNum) {
      return {
        type: "play-down" as const,
        message:
          `Based on date of birth, this player is ${playerDivision}. This registration is for ${teamAgeDivision}. ` +
          "Players cannot play down an age group. Please visit the club website for the correct age-division sign-up link.",
      };
    }

    if (playerDivisionNum < teamDivisionNum) {
      return {
        type: "play-up" as const,
        message:
          `Based on date of birth, this player is ${playerDivision}, but this registration is for ${teamAgeDivision}. ` +
          "Playing up is allowed with manual override confirmation.",
      };
    }

    return null;
  })();

  useEffect(() => {
    async function loadLink() {
      try {
        const res = await fetch(`/api/public/recruitment/register/${slug}`);
        if (!res.ok) {
          const json = await res.json();
          setError(json.error || "Registration link not found or inactive");
          return;
        }
        const data = await res.json();
        setLinkData(data.link);
      } catch {
        setError("Failed to load registration information");
      } finally {
        setLoading(false);
      }
    }
    if (slug) void loadLink();
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth) {
      setError("First name, last name, and date of birth are required");
      return;
    }

    if (dobDivisionValidation?.type === "play-down") {
      setError(dobDivisionValidation.message);
      return;
    }

    if (dobDivisionValidation?.type === "play-up" && !form.allowPlayUpOverride) {
      setError("Please confirm play-up override to continue this registration.");
      return;
    }
    
    setSubmitting(true);
    setError("");
    
    try {
      const res = await fetch(`/api/public/recruitment/register/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          primaryPosition: form.primaryPosition,
          secondaryPosition: form.secondaryPosition,
          currentClub: form.currentClub,
          currentTeam: form.currentTeam,
          parentName: form.parentName,
          parentEmail: form.parentEmail,
          parentPhone: form.parentPhone,
          allowPlayUpOverride: form.allowPlayUpOverride,
        }),
      });
      
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to submit registration");
        return;
      }
      
      setSuccess(true);
    } catch {
      setError("Failed to submit registration");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading registration...</p>
        </div>
      </div>
    );
  }

  if (error && !linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-green-600 text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h1>
          <p className="text-gray-600">
            Thank you for registering{linkData?.event ? ` for ${linkData.event.name}` : ""}. 
            We&apos;ll be in touch soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header with Tenant Branding */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6 text-center">
          {linkData?.tenant.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={linkData.tenant.logo_url} 
              alt={linkData.tenant.name}
              className="h-20 w-auto mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {linkData?.tenant.name}
          </h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-1">
            {linkData?.name}
          </h2>
          {linkData?.event && (
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p><strong>Event:</strong> {linkData.event.name}</p>
              {linkData.event.location && <p><strong>Location:</strong> {linkData.event.location}</p>}
              {linkData.event.starts_at && (() => {
                const tz = linkData.tenant.timezone ?? undefined;
                return (
                  <>
                    <p><strong>Date:</strong> {new Date(linkData.event.starts_at).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: tz })}</p>
                    <p>
                      <strong>Time:</strong>{" "}
                      {new Date(linkData.event.starts_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz })}
                      {linkData.event.ends_at ? ` – ${new Date(linkData.event.ends_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz })}` : ""}
                      {tz ? ` (${new Intl.DateTimeFormat(undefined, { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(linkData.event.starts_at)).find((p) => p.type === "timeZoneName")?.value ?? ""})` : ""}
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Player Information</h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input 
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input 
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input 
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boys">Boys</SelectItem>
                    <SelectItem value="girls">Girls</SelectItem>
                    <SelectItem value="coed">Co-ed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dobDivisionValidation && (
              <div
                className={`rounded-md border p-3 text-sm ${
                  dobDivisionValidation.type === "play-down"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                <p>{dobDivisionValidation.message}</p>
                {dobDivisionValidation.type === "play-up" && (
                  <label className="mt-3 flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={form.allowPlayUpOverride}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          allowPlayUpOverride: e.target.checked,
                        })
                      }
                    />
                    <span>I confirm this player is intentionally playing up an age group.</span>
                  </label>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryPosition">Primary Position</Label>
                <Input 
                  id="primaryPosition"
                  placeholder="e.g., Forward, Midfielder"
                  value={form.primaryPosition}
                  onChange={(e) => setForm({ ...form, primaryPosition: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="secondaryPosition">Secondary Position</Label>
                <Input 
                  id="secondaryPosition"
                  placeholder="e.g., Defender"
                  value={form.secondaryPosition}
                  onChange={(e) => setForm({ ...form, secondaryPosition: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentClub">Current Club</Label>
                <Input 
                  id="currentClub"
                  value={form.currentClub}
                  onChange={(e) => setForm({ ...form, currentClub: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="currentTeam">Current Team</Label>
                <Input 
                  id="currentTeam"
                  value={form.currentTeam}
                  onChange={(e) => setForm({ ...form, currentTeam: e.target.value })}
                />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-6">Parent/Guardian Information</h3>

            <div>
              <Label htmlFor="parentName">Parent/Guardian Name</Label>
              <Input 
                id="parentName"
                value={form.parentName}
                onChange={(e) => setForm({ ...form, parentName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parentEmail">Email</Label>
                <Input 
                  id="parentEmail"
                  type="email"
                  value={form.parentEmail}
                  onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="parentPhone">Phone</Label>
                <Input 
                  id="parentPhone"
                  type="tel"
                  value={form.parentPhone}
                  onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Complete Registration"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
