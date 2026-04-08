'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { AdminSignupWeek } from '@/types/admin'

export function OverviewSignupsChart({ data }: { data: AdminSignupWeek[] }) {
  return (
    <div className="h-80 min-w-0 w-full rounded-[1.5rem] border border-line/70 bg-[linear-gradient(180deg,rgba(232,247,242,0.55),rgba(255,255,255,0.92))] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(13,148,136,0.32)" />
              <stop offset="55%" stopColor="rgba(13,148,136,0.12)" />
              <stop offset="100%" stopColor="rgba(13,148,136,0.02)" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(var(--line-soft))" strokeDasharray="4 6" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgb(var(--ink-soft))', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'rgb(var(--ink-soft))', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(13,148,136,0.18)', strokeWidth: 1 }}
            labelStyle={{ color: 'rgb(var(--ink))', fontWeight: 600 }}
            itemStyle={{ color: 'rgb(var(--brand-strong))' }}
            formatter={(value) => [`${Number(value ?? 0)} signups`, 'Web']}
            contentStyle={{
              borderRadius: '16px',
              border: '1px solid rgba(223, 231, 236, 0.95)',
              backgroundColor: 'rgba(255,255,255,0.96)',
              boxShadow: '0 16px 40px rgba(15,23,42,0.12)',
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Web signups"
            stroke="rgb(13 148 136)"
            strokeWidth={3}
            fill="url(#signupsFill)"
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: 'rgb(13 148 136)',
              fill: 'white',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
