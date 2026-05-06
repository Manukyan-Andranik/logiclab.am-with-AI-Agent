import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Search, Bot, UserCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/Button";
import { getVisits, VisitRecord } from "@/api/admin";

const PAGE_SIZE = 50;

type BotFilter = "all" | "human" | "bot";

const toApiDate = (yyyyMmDd: string, endOfDay = false): string | undefined => {
  if (!yyyyMmDd) return undefined;
  return endOfDay ? `${yyyyMmDd}T23:59:59` : `${yyyyMmDd}T00:00:00`;
};

const safePath = (url: string): string => {
  if (!url) return "-";
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

const AdminVisits = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [botFilter, setBotFilter] = useState<BotFilter>("all");
  const [page, setPage] = useState(0);

  const queryParams = useMemo(() => {
    const params: Parameters<typeof getVisits>[0] = {
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    };
    const sd = toApiDate(startDate);
    const ed = toApiDate(endDate, true);
    if (sd) params.start_date = sd;
    if (ed) params.end_date = ed;
    if (search.trim()) params.search = search.trim();
    if (botFilter === "bot") params.is_bot = true;
    if (botFilter === "human") params.is_bot = false;
    return params;
  }, [startDate, endDate, search, botFilter, page]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-visits", queryParams],
    queryFn: () => getVisits(queryParams),
    placeholderData: (prev) => prev,
  });

  const visits = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearch("");
    setSearchInput("");
    setBotFilter("all");
    setPage(0);
  };

  const applySearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const setPresetDays = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setStartDate(fmt(start));
    setEndDate(fmt(end));
    setPage(0);
  };

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="text-primary" size={26} />
            Visits
          </h1>
          <p className="text-muted-foreground">All website visits. Filter by date, search, or visitor type.</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {total.toLocaleString()} total
        </Badge>
      </div>

      {/* Filters */}
      <div className="bg-background rounded-xl border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
              Visitor Type
            </label>
            <select
              value={botFilter}
              onChange={(e) => { setBotFilter(e.target.value as BotFilter); setPage(0); }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="all">All</option>
              <option value="human">Humans only</option>
              <option value="bot">Bots only</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
              Search (IP, page, UA)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>
              <Button size="sm" onClick={applySearch}>Go</Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Today", days: 1 },
              { label: "7 days", days: 7 },
              { label: "30 days", days: 30 },
              { label: "90 days", days: 90 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => setPresetDays(p.days)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          {(startDate || endDate || search || botFilter !== "all") && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X size={12} /> Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-background rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[820px]">
            <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Page</th>
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">User Agent</th>
                <th className="px-4 py-3 text-center">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && visits.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : visits.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No visits found.</td></tr>
              ) : visits.map((v: VisitRecord) => {
                const d = new Date(v.timestamp);
                return (
                  <tr key={v.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 text-xs tabular-nums">{d.toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">{d.toLocaleTimeString()}</td>
                    <td className="px-4 py-3 text-xs font-mono">{v.ip_address}</td>
                    <td className="px-4 py-3 text-xs max-w-[240px] truncate" title={v.page_url}>{safePath(v.page_url)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate" title={v.referrer || ""}>
                      {v.referrer ? safePath(v.referrer) : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[260px] truncate" title={v.user_agent || ""}>
                      {v.user_agent || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={v.is_bot ? "secondary" : "default"} className="gap-1">
                        {v.is_bot ? <Bot size={10} /> : <UserCircle size={10} />}
                        {v.is_bot ? "Bot" : "Human"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-border text-sm">
          <div className="text-muted-foreground text-xs">
            {total === 0 ? "0 results" : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total.toLocaleString()}`}
            {isFetching && <span className="ml-2 italic">refreshing…</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <div className="text-xs text-muted-foreground tabular-nums">
              Page {page + 1} / {totalPages}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVisits;
