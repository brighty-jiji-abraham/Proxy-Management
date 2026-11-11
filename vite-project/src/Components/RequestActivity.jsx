import React from 'react'
import { Inbox } from 'lucide-react'

/**
 * Traffic chart and request table, shared by the Tunnel page (what crossed
 * the tunnel) and the Call History page (what each service was asked).
 */

export const clockOf = (ts) =>
    new Date(ts * 1000).toLocaleTimeString([], { hour12: false })

export const ago = (ts) => {
    if (!ts) return 'never'
    const s = Math.max(0, Math.floor(Date.now() / 1000 - ts))
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
}

export const statusTone = (r) => {
    if (r.error || r.status == null) return 'text-red-400'
    if (r.status >= 500) return 'text-red-400'
    if (r.status >= 400) return 'text-amber-400'
    if (r.status === 101) return 'text-violet-300'
    return 'text-emerald-400'
}

/**
 * Requests per minute over the window.
 *
 * Drawn with plain divs rather than a charting library: one bar chart does not
 * justify pulling ~50kB of dependency into a console this small. The series
 * arrives zero-filled, so a quiet minute is a real zero rather than a gap.
 */
export function TrafficChart({ series, emptyText = 'No traffic yet.', windowMinutes = 60 }) {
    const peak = Math.max(1, ...series.map((b) => b.count))
    const total = series.reduce((n, b) => n + b.count, 0)
    const errors = series.reduce((n, b) => n + b.errors, 0)

    return (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/70">
            <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
                <h3 className="text-xl font-bold text-slate-50">Traffic</h3>
                <div className="text-sm text-slate-400">
                    <span className="font-mono text-slate-200">{total}</span> requests in the
                    last {windowMinutes === 60 ? 'hour' : `${windowMinutes} minutes`}
                    {errors > 0 && (
                        <>
                            {' · '}
                            <span className="font-mono text-red-400">{errors}</span> failed
                        </>
                    )}
                </div>
            </div>

            {total === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">{emptyText}</p>
            ) : (
                <>
                    <div className="flex items-end gap-[2px] h-28">
                        {series.map((b) => {
                            const h = b.count ? Math.max(3, (b.count / peak) * 100) : 0
                            return (
                                <div
                                    key={b.minute}
                                    className="flex-1 flex flex-col justify-end h-full group relative"
                                    title={`${clockOf(b.minute)} — ${b.count} request${
                                        b.count === 1 ? '' : 's'
                                    }${b.errors ? `, ${b.errors} failed` : ''}${
                                        b.avg_ms ? `, avg ${b.avg_ms}ms` : ''
                                    }`}
                                >
                                    {h > 0 && (
                                        <div
                                            style={{ height: `${h}%` }}
                                            className={`w-full rounded-sm transition-colors ${
                                                b.errors
                                                    ? 'bg-red-500/70 group-hover:bg-red-400'
                                                    : 'bg-violet-500/60 group-hover:bg-violet-400'
                                            }`}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-600 font-mono">
                        <span>{windowMinutes}m ago</span>
                        <span>now</span>
                    </div>
                </>
            )}
        </div>
    )
}

/**
 * Recent requests, newest first.
 *
 * The extra columns (service, caller, backend) are opt-in so the Tunnel page
 * keeps its compact layout.
 */
export function RequestLog({
    requests,
    capacity,
    title = 'Requests',
    note = 'Cleared when the proxy restarts. The durable record is its log file.',
    emptyText = 'No requests yet.',
    showRoute = false,
    showClient = false,
    showBackend = false,
    toolbar = null,
}) {
    const detailed = showRoute || showClient || showBackend
    const th = 'py-2 px-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'

    return (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/70">
            <div className="flex items-baseline justify-between gap-4 mb-1 flex-wrap">
                <h3 className="text-xl font-bold text-slate-50">{title}</h3>
                <span className="text-xs text-slate-500">
                    last {capacity || 200} kept in memory{detailed ? ' per service' : ''}
                </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">{note}</p>

            {toolbar}

            {requests.length === 0 ? (
                <div className="py-10 text-center">
                    <Inbox className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">{emptyText}</p>
                </div>
            ) : (
                <div className="max-h-[32rem] overflow-y-auto overflow-x-auto -mx-2">
                    <table className="w-full text-sm">
                        {detailed && (
                            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                                <tr className="border-b border-slate-800/70">
                                    <th className={th}>Time</th>
                                    <th className={th}>Method</th>
                                    {showRoute && <th className={th}>Service</th>}
                                    <th className={th}>Path</th>
                                    {showClient && (
                                        <th className={`${th} hidden md:table-cell`}>Caller</th>
                                    )}
                                    <th className={`${th} text-right`}>Status</th>
                                    <th className={`${th} text-right`}>Time taken</th>
                                </tr>
                            </thead>
                        )}
                        <tbody>
                            {requests.map((r, i) => (
                                <tr
                                    key={`${r.at}-${i}`}
                                    className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors"
                                >
                                    <td className="py-2 px-2 font-mono text-xs text-slate-500 whitespace-nowrap align-top">
                                        {clockOf(r.at)}
                                    </td>
                                    <td className="py-2 px-2 font-mono text-xs text-slate-400 whitespace-nowrap align-top">
                                        {r.method}
                                        {r.kind === 'ws' && (
                                            <span className="ml-1 text-violet-300">ws</span>
                                        )}
                                    </td>
                                    {showRoute && (
                                        <td className="py-2 px-2 font-mono text-xs text-violet-300 whitespace-nowrap align-top">
                                            {r.route}
                                        </td>
                                    )}
                                    <td className="py-2 px-2 font-mono text-slate-200 break-all">
                                        {r.path}
                                        {r.error && (
                                            <div className="text-xs text-red-400 mt-0.5 break-words">
                                                {r.error}
                                            </div>
                                        )}
                                        {showBackend && r.backend && (
                                            <div className="text-[11px] text-slate-600 mt-0.5">
                                                → {r.backend}
                                            </div>
                                        )}
                                    </td>
                                    {showClient && (
                                        <td className="py-2 px-2 font-mono text-xs text-slate-500 whitespace-nowrap align-top hidden md:table-cell">
                                            {r.client || '—'}
                                        </td>
                                    )}
                                    <td
                                        className={`py-2 px-2 font-mono text-xs text-right whitespace-nowrap align-top ${statusTone(
                                            r
                                        )}`}
                                    >
                                        {r.status ?? 'failed'}
                                    </td>
                                    <td className="py-2 px-2 font-mono text-xs text-slate-500 text-right whitespace-nowrap align-top">
                                        {r.ms}ms
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
