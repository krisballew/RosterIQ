import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, Megaphone, Search, BookOpen } from "lucide-react";

const dashboardCards = [
  {
    title: "Current Roster",
    description: "View and manage your active club roster.",
    icon: Users,
    badge: "Active",
    badgeVariant: "success" as const,
    stat: "—",
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
    title: "My Training",
    description: "Scheduled sessions and education resources.",
    icon: BookOpen,
    badge: "Scheduled",
    badgeVariant: "secondary" as const,
    stat: "—",
    statLabel: "upcoming sessions",
    href: "/app/education",
    color: "sky",
  },
];

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("user_id", user!.id)
    .single();

  const greeting = profile?.first_name
    ? `Welcome back, ${profile.first_name}`
    : "Welcome back";

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
