import { createClient } from "@/lib/supabase/server";
import { getHighestRole } from "@/lib/roles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, Megaphone, Search, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";

const iconBgMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  sky: "bg-sky-50 text-sky-600",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch profile, memberships, and role info
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("user_id", user!.id).single(),
    supabase
      .from("memberships")
      .select("*")
      .eq("user_id", user!.id)
      .eq("is_active", true),
  ]);

  const highestRole = getHighestRole(memberships ?? []);
  const isPlayer = highestRole && ["select_player", "academy_player"].includes(highestRole);
  const membership = (memberships ?? [])[0];

  // For players, fetch their player profile and stats
  let playerStats = { assignedTraining: 0, completedReviews: 0, pendingReviews: 0 };
  if (isPlayer && membership?.tenant_id) {
    // Get player profile
    const { data: playerData } = await supabase
      .from("players")
      .select("id")
      .eq("membership_id", membership.id)
      .single();

    if (playerData) {
      // Count assigned training
      const { count: trainingCount } = await supabase
        .from("training_assignments")
        .select("id", { count: "exact", head: true })
        .eq("player_id", playerData.id);

      playerStats.assignedTraining = trainingCount ?? 0;
    }
  }

  // Fetch active player count for non-player roles
  let activePlayerCount: number = 0;
  if (!isPlayer && membership?.tenant_id) {
    const { count } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", membership.tenant_id)
      .eq("status", "active");
    activePlayerCount = count ?? 0;
  }

  const greeting = profile?.first_name
    ? `Welcome back, ${profile.first_name}`
    : "Welcome back";

  if (isPlayer) {
    // Player home screen
    const playerCards = [
      {
        title: "My Reviews",
        description: "View your player reviews and feedback from coaches.",
        icon: ClipboardList,
        badge: "Available",
        badgeVariant: "secondary" as const,
        stat: "—",
        statLabel: "reviews",
        href: "/app/reviews",
        color: "amber",
      },
      {
        title: "My Training",
        description: "Training sessions assigned to you by your coaches.",
        icon: BookOpen,
        badge: "Active",
        badgeVariant: "default" as const,
        stat: String(playerStats.assignedTraining),
        statLabel: "assigned sessions",
        href: "/app/my-training",
        color: "blue",
      },
      {
        title: "Education Library",
        description: "Educational resources and content from your club.",
        icon: BookOpen,
        badge: "Learn",
        badgeVariant: "outline" as const,
        stat: "—",
        statLabel: "resources available",
        href: "/app/education",
        color: "green",
      },
    ];

    return (
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Access your training sessions, reviews, and educational resources.
          </p>
        </div>

        {/* Dashboard cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {playerCards.map((card) => {
            const Icon = card.icon;
            const iconClass = iconBgMap[card.color] ?? "bg-gray-50 text-gray-600";
            return (
              <a key={card.title} href={card.href} className="group block">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant={card.badgeVariant}>{card.badge}</Badge>
                    </div>
                    <CardTitle className="mt-3 text-base group-hover:text-blue-600 transition-colors">
                      {card.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-gray-900">
                        {card.stat}
                      </span>
                      <span className="text-sm text-gray-500">
                        {card.statLabel}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  // Coach/Admin home screen
  const dashboardCards = [
    {
      title: "Current Roster",
      description: "View and manage your active club roster.",
      icon: Users,
      badge: "Active",
      badgeVariant: "success" as const,
      stat: String(activePlayerCount),
      statLabel: "registered players",
      href: "/app/roster",
      color: "blue",
    },
    {
      title: "Player Review Status",
      description: "Track outstanding and completed player reviews.",
      icon: ClipboardList,
      badge: "Pending",
      badgeVariant: "secondary" as const,
      stat: "—",
      statLabel: "reviews due",
      href: "/app/reviews",
      color: "amber",
    },
    {
      title: "Club Announcements",
      description: "Latest club information and announcements.",
      icon: Megaphone,
      badge: "Information",
      badgeVariant: "outline" as const,
      stat: "—",
      statLabel: "new posts",
      href: "/app/home",
      color: "green",
    },
    {
      title: "Recruitment",
      description: "Prospects, tryouts, and open roster spots.",
      icon: Search,
      badge: "Open",
      badgeVariant: "default" as const,
      stat: "—",
      statLabel: "active prospects",
      href: "/app/recruitment",
      color: "purple",
    },
    {
      title: "Training & Education",
      description: "Manage training content and player development.",
      icon: BookOpen,
      badge: "Manage",
      badgeVariant: "secondary" as const,
      stat: "—",
      statLabel: "content items",
      href: "/app/education",
      color: "sky",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s a summary of what&apos;s happening across your club.
        </p>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          const iconClass = iconBgMap[card.color] ?? "bg-gray-50 text-gray-600";
          return (
            <a key={card.title} href={card.href} className="group block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant={card.badgeVariant}>{card.badge}</Badge>
                  </div>
                  <CardTitle className="mt-3 text-base group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-gray-900">
                      {card.stat}
                    </span>
                    <span className="text-sm text-gray-500">
                      {card.statLabel}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </a>
          );
        })}
      </div>
    </div>
  );
}
