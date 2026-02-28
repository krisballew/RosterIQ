import { Search } from "lucide-react";

export default function RecruitmentPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recruitment</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage prospects, tryouts, and open roster positions.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-20">
        <Search className="h-10 w-10 text-gray-300" />
        <p className="mt-4 text-sm font-medium text-gray-500">
          Recruitment pipeline coming soon
        </p>
      </div>
    </div>
  );
}
