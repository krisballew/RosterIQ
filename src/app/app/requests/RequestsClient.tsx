"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AccessRequest } from "@/types/database";

const ASSIGNABLE_ROLES = [
  { value: "club_admin", label: "Club Administrator" },
  { value: "club_director", label: "Club Director" },
  { value: "director_of_coaching", label: "Director of Coaching" },
  { value: "select_coach", label: "Select Coach" },
  { value: "academy_coach", label: "Academy Coach" },
  { value: "select_player", label: "Select Player" },
  { value: "academy_player", label: "Academy Player" },
];

export interface AccessRequestWithTenant extends AccessRequest {
  tenants: { name: string } | null;
}

interface RequestsClientProps {
  initialRequests: AccessRequestWithTenant[];
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
          <CheckCircle className="mr-1 h-3 w-3" />
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
          <XCircle className="mr-1 h-3 w-3" />
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ApproveDrawerProps {
  request: AccessRequestWithTenant;
  onClose: () => void;
  onApproved: () => void;
}

function ApproveDrawer({ request, onClose, onApproved }: ApproveDrawerProps) {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!role) {
      setError("Please select a role.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/app/access-requests/${request.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to approve request.");
      return;
    }

    onApproved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Approve Access Request</h3>
        <p className="text-sm text-gray-500 mb-4">
          Assign a role to{" "}
          <span className="font-medium text-gray-700">
            {request.first_name} {request.last_name}
          </span>{" "}
          ({request.email}) for <span className="font-medium text-gray-700">{request.tenants?.name}</span>.
        </p>

        <form onSubmit={handleApprove} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Assign Role
            </label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role…" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#0d6e7a] hover:bg-[#0a5a65] text-white"
              disabled={loading || !role}
            >
              {loading ? "Approving…" : "Approve"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RejectDrawerProps {
  request: AccessRequestWithTenant;
  onClose: () => void;
  onRejected: () => void;
}

function RejectDrawer({ request, onClose, onRejected }: RejectDrawerProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/app/access-requests/${request.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to reject request.");
      return;
    }

    onRejected();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Reject Access Request</h3>
        <p className="text-sm text-gray-500 mb-4">
          Reject the request from{" "}
          <span className="font-medium text-gray-700">
            {request.first_name} {request.last_name}
          </span>{" "}
          ({request.email}).
        </p>

        <form onSubmit={handleReject} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Reason for rejection…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0d6e7a] focus:ring-2 focus:ring-[#0d6e7a]/20 resize-none transition"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RequestsClient({ initialRequests }: RequestsClientProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<AccessRequestWithTenant[]>(initialRequests);
  const [approveTarget, setApproveTarget] = useState<AccessRequestWithTenant | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AccessRequestWithTenant | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const filtered = requests.filter(
    (r) => filterStatus === "all" || r.status === filterStatus
  );

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  function handleReviewed(id: string, newStatus: "approved" | "rejected") {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    setApproveTarget(null);
    setRejectTarget(null);
    router.refresh();
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and approve new member sign-up requests for your club.
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-sm px-3 py-1">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filterStatus === s
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <UserCheck className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">
              {filterStatus === "pending"
                ? "No pending access requests."
                : `No ${filterStatus} requests.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((req) => (
            <Card key={req.id} className="border border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold text-gray-900">
                      {req.first_name} {req.last_name}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500 mt-0.5">
                      {req.email}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {statusBadge(req.status)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Requested {formatDate(req.created_at)}
                  </span>
                  {req.tenants?.name && (
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      {req.tenants.name}
                    </span>
                  )}
                  {req.reviewed_at && (
                    <span>Reviewed {formatDate(req.reviewed_at)}</span>
                  )}
                </div>

                {req.notes && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2 mb-4 border border-gray-100">
                    <span className="font-medium">Note:</span> {req.notes}
                  </p>
                )}

                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-[#0d6e7a] hover:bg-[#0a5a65] text-white"
                      onClick={() => setApproveTarget(req)}
                    >
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setRejectTarget(req)}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve modal */}
      {approveTarget && (
        <ApproveDrawer
          request={approveTarget}
          onClose={() => setApproveTarget(null)}
          onApproved={() => handleReviewed(approveTarget.id, "approved")}
        />
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectDrawer
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={() => handleReviewed(rejectTarget.id, "rejected")}
        />
      )}
    </div>
  );
}
