import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Coins,
  Users,
  Gavel,
  Target,
  Wallet,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { PlayerRole } from '../types';
import { formatPoints } from '../utils/formatters';

const ROLES: PlayerRole[] = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];

const ROLE_COLORS: Record<PlayerRole, string> = {
  Batsman: '#6366f1',
  Bowler: '#10b981',
  'All-Rounder': '#f59e0b',
  'Wicket-Keeper': '#ef4444',
};

const compact = (n: number) => {
  if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${n}`;
};

const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, icon, children, className = '' }) => (
  <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm p-5 ${className}`}>
    <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">{icon}</span>
        <div className="min-w-0">
          <h3 className="font-['Outfit'] font-black text-sm uppercase tracking-wider text-slate-900 truncate">
            {title}
          </h3>
          {subtitle && <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
    {children}
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone: string;
}> = ({ label, value, hint, icon, tone }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
    <span className={`p-2.5 rounded-xl shrink-0 ${tone}`}>{icon}</span>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{label}</p>
      <p className="font-['Outfit'] font-black text-lg sm:text-xl text-slate-900 leading-tight truncate">
        {value}
      </p>
      {hint && <p className="text-[10px] text-slate-500 truncate">{hint}</p>}
    </div>
  </div>
);

export const AnalyticsView: React.FC = () => {
  const { state } = useAuction();

  const analytics = useMemo(() => {
    if (!state) return null;
    const { teams, players, transactions, settings, summary } = state;

    const soldPlayers = players.filter((p) => p.status === 'SOLD' && (p.soldPrice || 0) > 0);

    const totalSpent =
      summary?.totalAuctionPointsSpent ?? teams.reduce((s, t) => s + (t.totalPointsSpent || 0), 0);
    const soldCount = soldPlayers.length;
    const avgSold = soldCount ? Math.round(totalSpent / soldCount) : 0;
    const highest = soldPlayers.reduce((m, p) => Math.max(m, p.soldPrice || 0), 0);
    const topSale = soldPlayers.find((p) => (p.soldPrice || 0) === highest);
    const totalBudget = teams.reduce(
      (s, t) => s + (t.startingPoints || settings.startingPoints || 0),
      0
    );
    const overallEfficiency = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // ---- Bid / sold-price distribution histogram ----
    const maxPrice = Math.max(1000, ...soldPlayers.map((p) => p.soldPrice || 0));
    const binCount = 6;
    const binSize = Math.max(500, Math.ceil(maxPrice / binCount / 500) * 500);
    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${compact(i * binSize)}–${compact((i + 1) * binSize)}`,
      from: i * binSize,
      to: (i + 1) * binSize,
      count: 0,
    }));
    soldPlayers.forEach((p) => {
      const idx = Math.min(binCount - 1, Math.floor((p.soldPrice || 0) / binSize));
      bins[idx].count += 1;
    });

    // ---- Team expenditure efficiency ----
    const teamData = teams
      .map((t) => {
        const budget = t.startingPoints || settings.startingPoints || 0;
        const spent = t.totalPointsSpent || 0;
        const remaining = Math.max(0, t.pointsRemaining ?? budget - spent);
        const playersCount = t.totalPlayers || 0;
        return {
          name: t.shortCode || t.name,
          fullName: t.name,
          color: t.color || '#6366f1',
          budget,
          spent,
          remaining,
          players: playersCount,
          efficiency: budget ? Math.round((spent / budget) * 100) : 0,
          perPlayer: playersCount ? Math.round(spent / playersCount) : 0,
        };
      })
      .sort((a, b) => b.spent - a.spent);

    // ---- Player role composition ----
    const roleData = ROLES.map((role) => {
      const all = players.filter((p) => p.role === role);
      const sold = all.filter((p) => p.status === 'SOLD');
      const spent = sold.reduce((s, p) => s + (p.soldPrice || 0), 0);
      return {
        role,
        total: all.length,
        sold: sold.length,
        unsold: all.filter((p) => p.status === 'UNSOLD').length,
        available: all.filter((p) => p.status === 'AVAILABLE').length,
        spent,
        avg: sold.length ? Math.round(spent / sold.length) : 0,
        color: ROLE_COLORS[role],
      };
    });

    const registeredRolePie = roleData
      .filter((r) => r.total > 0)
      .map((r) => ({ name: r.role, value: r.total, color: r.color }));

    const statusPie = [
      {
        name: 'Available',
        value: players.filter((p) => p.status === 'AVAILABLE').length,
        color: '#94a3b8',
      },
      {
        name: 'Sold',
        value: players.filter((p) => p.status === 'SOLD').length,
        color: '#10b981',
      },
      {
        name: 'Unsold',
        value: players.filter((p) => p.status === 'UNSOLD').length,
        color: '#f43f5e',
      },
    ].filter((s) => s.value > 0);

    const distinctRoles = roleData.filter((r) => r.total > 0).length;

    const avgPriceByRole = roleData.map((r) => ({
      role: r.role,
      avg: r.avg,
      spent: r.spent,
      color: r.color,
    }));

    // ---- Role composition per team (stacked) ----
    const teamRoleData = teams.map((t) => {
      const roster = players.filter((p) => p.status === 'SOLD' && p.soldToTeamId === t.id);
      const row: Record<string, string | number> = { name: t.shortCode || t.name };
      ROLES.forEach((r) => {
        row[r] = roster.filter((p) => p.role === r).length;
      });
      return row;
    });

    return {
      soldCount,
      totalSpent,
      avgSold,
      highest,
      topSaleName: topSale?.name || '—',
      overallEfficiency,
      totalBudget,
      totalPlayers: players.length,
      totalTransactions: (transactions || []).length,
      bins,
      teamData,
      roleData,
      registeredRolePie,
      statusPie,
      distinctRoles,
      avgPriceByRole,
      teamRoleData,
    };
  }, [state]);

  if (!state || !analytics) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 font-medium">
        Loading analytics…
      </div>
    );
  }

  const {
    soldCount,
    totalSpent,
    avgSold,
    highest,
    topSaleName,
    overallEfficiency,
    totalBudget,
    totalPlayers,
    bins,
    teamData,
    roleData,
    registeredRolePie,
    statusPie,
    distinctRoles,
    avgPriceByRole,
    teamRoleData,
  } = analytics;

  const hasSales = soldCount > 0;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 shadow-sm bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-white/10">
            <BarChart3 className="w-6 h-6 text-indigo-300" />
          </span>
          <div>
            <h2 className="font-['Outfit'] font-black text-xl sm:text-2xl tracking-tight uppercase">
              Auction Analytics
            </h2>
            <p className="text-xs text-indigo-200/80">
              Data-driven overview of {state.settings.tournamentName} • bid distribution, team
              efficiency &amp; role composition
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Points Spent"
          value={`${formatPoints(totalSpent)} pts`}
          hint={`${overallEfficiency}% of ${compact(totalBudget)} pts purse`}
          icon={<Coins className="w-5 h-5 text-indigo-600" />}
          tone="bg-indigo-50"
        />
        <StatCard
          label="Players Sold"
          value={`${soldCount}`}
          hint={`of ${totalPlayers} registered`}
          icon={<Gavel className="w-5 h-5 text-emerald-600" />}
          tone="bg-emerald-50"
        />
        <StatCard
          label="Average Sold Price"
          value={`${formatPoints(avgSold)} pts`}
          hint="per sold player"
          icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
          tone="bg-amber-50"
        />
        <StatCard
          label="Highest Sale"
          value={`${formatPoints(highest)} pts`}
          hint={topSaleName}
          icon={<Target className="w-5 h-5 text-rose-600" />}
          tone="bg-rose-50"
        />
      </div>

      {!hasSales ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center text-slate-500">
          <BarChart3 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-700">No sales yet</p>
          <p className="text-xs mt-1">
            Analytics will populate automatically as players are sold at the auction.
          </p>
        </div>
      ) : (
        <>
          {/* Bid distribution + Team efficiency */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard
              title="Bid Distribution"
              subtitle="How winning bids are spread across price ranges"
              icon={<BarChart3 className="w-4 h-4" />}
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bins} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={28}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                      formatter={(value: number) => [`${value} players`, 'Sold']}
                      labelFormatter={(l) => `Bid range: ${l} pts`}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Bar dataKey="count" name="Players" radius={[6, 6, 0, 0]} fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 mt-1 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Lowest</p>
                  <p className="font-['Outfit'] font-black text-sm text-slate-800">
                    {formatPoints(Math.min(...bins.map((b) => b.from).filter((f) => f >= 0)) + 500)}{' '}
                    pts
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Average</p>
                  <p className="font-['Outfit'] font-black text-sm text-slate-800">
                    {formatPoints(avgSold)} pts
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Highest</p>
                  <p className="font-['Outfit'] font-black text-sm text-slate-800">
                    {formatPoints(highest)} pts
                  </p>
                </div>
              </div>
            </ChartCard>

            <ChartCard
              title="Team Expenditure Efficiency"
              subtitle="Points spent vs remaining purse, with utilisation %"
              icon={<Wallet className="w-4 h-4" />}
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={teamData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={40}
                      tickFormatter={(v: number) => compact(v)}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#f59e0b' }}
                      width={34}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(value: number, name: string) =>
                        name === 'Efficiency' ? [`${value}%`, name] : [`${formatPoints(value)} pts`, name]
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      yAxisId="left"
                      dataKey="spent"
                      name="Spent"
                      stackId="purse"
                      fill="#6366f1"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="remaining"
                      name="Remaining"
                      stackId="purse"
                      fill="#cbd5e1"
                      radius={[6, 6, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="efficiency"
                      name="Efficiency"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#f59e0b' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Role composition */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard
              title="Player Role Composition"
              subtitle={
                distinctRoles <= 1
                  ? 'Registered pool — all players currently tagged the same role'
                  : 'Registered pool composition by role'
              }
              icon={<PieChartIcon className="w-4 h-4" />}
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={registeredRolePie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      stroke="#fff"
                      strokeWidth={2}
                      label={(e: { name?: string; value?: number }) => `${e.name}: ${e.value}`}
                      labelLine={false}
                    >
                      {registeredRolePie.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(value: number, name: string) => [`${value} players`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Player Pool Status"
              subtitle="Available vs sold vs unsold across the roster"
              icon={<Users className="w-4 h-4" />}
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      stroke="#fff"
                      strokeWidth={2}
                      label={(e: { name?: string; value?: number }) => `${e.name}: ${e.value}`}
                      labelLine={false}
                    >
                      {statusPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(value: number, name: string) => [`${value} players`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Average Price by Role"
              subtitle="Points spent per sold player, by role"
              icon={<TrendingUp className="w-4 h-4" />}
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={avgPriceByRole}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v: number) => compact(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="role"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={92}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(value: number, _n: string, p: { payload?: { spent?: number } }) => [
                        `${formatPoints(value)} pts avg (${formatPoints(p?.payload?.spent || 0)} total)`,
                        'Price',
                      ]}
                    />
                    <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                      {avgPriceByRole.map((entry) => (
                        <Cell key={entry.role} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Role Composition per Team"
              subtitle="Squad make-up by role"
              icon={<Users className="w-4 h-4" />}
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamRoleData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={26}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {ROLES.map((r) => (
                      <Bar
                        key={r}
                        dataKey={r}
                        name={r}
                        stackId="roles"
                        fill={ROLE_COLORS[r]}
                        radius={r === 'Wicket-Keeper' ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Efficiency leaderboard table */}
          <ChartCard
            title="Team Spending Breakdown"
            subtitle="Detailed expenditure, efficiency and squad depth"
            icon={<Wallet className="w-4 h-4" />}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[640px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <th className="py-2.5 px-3 text-left font-bold">Team</th>
                    <th className="py-2.5 px-3 text-right font-bold">Purse</th>
                    <th className="py-2.5 px-3 text-right font-bold">Spent</th>
                    <th className="py-2.5 px-3 text-right font-bold">Remaining</th>
                    <th className="py-2.5 px-3 text-right font-bold">Players</th>
                    <th className="py-2.5 px-3 text-right font-bold">Avg / Player</th>
                    <th className="py-2.5 px-3 text-left font-bold">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.map((t) => (
                    <tr key={t.name} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="font-bold text-slate-800">{t.fullName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatPoints(t.budget)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                        {formatPoints(t.spent)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        {formatPoints(t.remaining)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{t.players}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatPoints(t.perPlayer)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, t.efficiency)}%`,
                                backgroundColor: t.efficiency > 90 ? '#ef4444' : t.color,
                              }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-700 w-10 text-right">
                            {t.efficiency}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {roleData.map((r) => (
                <div key={r.role} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide truncate">
                      {r.role}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-['Outfit'] font-black text-base text-slate-900">
                      {r.sold}
                    </span>
                    <span className="text-[10px] text-slate-500">sold / {r.total} reg.</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {formatPoints(r.spent)} pts • avg {formatPoints(r.avg)}
                  </p>
                </div>
              ))}
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
};
