import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
    Radio, RefreshCw, AlertCircle, CheckCircle, XCircle,
    Globe, Server, Activity, Repeat, Network, Clock, Save, Database, Inbox,
} from 'lucide-react'
import dashboardServices from '../services/dashboard.service'

const duration = (seconds) => {
    if (!seconds) return '0s'
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (d) return `${d}d ${h}h`
    if (h) return `${h}h ${m}m`
    if (m) return `${m}m ${s}s`
    return `${s}s`
}

const clockOf = (ts) =>
    new Date(ts * 1000).toLocaleTimeString([], { hour12: false })

const statusTone = (r) => {
    if (r.error || r.status == null) return 'text-red-400'
    if (r.status >= 500) return 'text-red-400'
    if (r.status >= 400) return 'text-amber-400'
    if (r.status === 101) return 'text-violet-300'
    return 'text-emerald-400'
}

/**
 * Requests per minute over the last hour.
 *
 * Drawn with plain divs rather than a charting library: one bar chart does not
 * justify pulling ~50kB of dependency into a console this small. The series
 * arrives zero-filled, so a quiet minute is a real zero rather than a gap.
 */
function TrafficChart({ series }) {
    const peak = Math.max(1, ...series.map((b) => b.count))
    const total = series.reduce((n, b) => n + b.count, 0)
    const errors = series.reduce((n, b) => n + b.errors, 0)

    return (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/70">
            <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
                <h3 className="text-xl font-bold text-slate-50">Traffic</h3>
                <div className="text-sm text-slate-400">
                    <span className="font-mono text-slate-200">{total}</span> requests in the
                    last hour
                    {errors > 0 && (
                        <>
                            {' · '}
                            <span className="font-mono text-red-400">{errors}</span> failed
                        </>
                    )}
                </div>
            </div>

            {total === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                    Nothing has crossed the tunnel yet.
                </p>
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
                        <span>60m ago</span>
                        <span>now</span>
                    </div>
                </>
            )}
        </div>
    )
}

/** The last requests to cross the tunnel, newest first. */
function RequestLog({ requests, capacity }) {
    return (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/70">
            <div className="flex items-baseline justify-between gap-4 mb-1 flex-wrap">
                <h3 className="text-xl font-bold text-slate-50">Requests</h3>
                <span className="text-xs text-slate-500">
                    last {capacity || 200} kept in memory
                </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                Cleared when the proxy restarts. The durable record is its log file.
            </p>

            {requests.length === 0 ? (
                <div className="py-10 text-center">
                    <Inbox className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No requests yet.</p>
                </div>
            ) : (
                <div className="max-h-96 overflow-y-auto -mx-2">
                    <table className="w-full text-sm">
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
                                    </td>
                                    <td className="py-2 px-2 font-mono text-slate-200 break-all">
                                        {r.path}
                                        {r.error && (
                                            <div className="text-xs text-red-400 mt-0.5">
                                                {r.error}
                                            </div>
                                        )}
                                    </td>
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

/** Traffic chart and request log, refreshed together. */
function TunnelActivity() {
    const activity = useQuery({
        queryKey: ['tunnel-requests'],
        queryFn: () => dashboardServices.getTunnelRequests(100),
        refetchInterval: 10000,
    })

    const d = activity.data?.data
    if (!d) return null

    return (
        <div className="space-y-6">
            <TrafficChart series={d.traffic || []} />
            <RequestLog requests={d.requests || []} capacity={d.capacity} />
        </div>
    )
}


/**
 * Tunnel settings, stored in MongoDB alongside the routes.
 *
 * These used to live only in .env, which meant every change needed a file
 * edit and a restart. Saving here writes to the database and drops the
 * current socket; the client re-reads its settings on the next reconnect, so
 * the change takes effect without restarting the proxy.
 *
 * The token is write-only. The API reports whether one is set but never
 * returns it, so leaving the field blank keeps whatever is already stored.
 */
function TunnelSettings() {
    const queryClient = useQueryClient()
    const [failure, setFailure] = useState('')
    const [saved, setSaved] = useState(false)

    const config = useQuery({
        queryKey: ['tunnel-config'],
        queryFn: dashboardServices.getTunnelConfig,
    })

    const { register, handleSubmit, reset } = useForm({
        defaultValues: { server_url: '', client_name: '', local_target: '', token: '' },
    })

    const d = config.data?.data
    // Populate once the settings arrive; the form is uncontrolled otherwise.
    useEffect(() => {
        if (d) {
            reset({
                server_url: d.server_url || '',
                client_name: d.client_name || '',
                local_target: d.local_target || '',
                token: '',
            })
        }
    }, [d, reset])

    const save = useMutation({
        mutationFn: dashboardServices.saveTunnelConfig,
        onSuccess: () => {
            setFailure('')
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
            queryClient.invalidateQueries({ queryKey: ['tunnel-config'] })
            queryClient.invalidateQueries({ queryKey: ['tunnel'] })
        },
        onError: (e) => setFailure(e?.friendlyMessage || 'Could not save the settings.'),
    })

    const onSubmit = (values) => {
        // An empty token means "leave it alone", not "clear it" - otherwise a
        // routine edit to the URL would wipe the credential.
        const payload = { ...values }
        if (!payload.token) delete payload.token
        save.mutate(payload)
    }

    return (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/70">
            <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-slate-50">Settings</h3>
                {d && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        <Database className="w-3 h-3" />
                        {d.source === 'database' ? 'stored in MongoDB' : 'reading .env'}
                    </span>
                )}
            </div>
            <p className="text-xs text-slate-500 mb-5">
                Saved to MongoDB and applied on the next reconnect - no restart needed.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Tunnel head URL</label>
                    <input
                        {...register('server_url')}
                        placeholder="wss://your-server:9000/tunnel-agent"
                        className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/50 text-slate-100 font-mono text-sm placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/40 transition"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Client name</label>
                        <input
                            {...register('client_name')}
                            placeholder="gpu-box"
                            className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/50 text-slate-100 text-sm placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/40 transition"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Forwards to</label>
                        <input
                            {...register('local_target')}
                            placeholder="http://127.0.0.1:2000"
                            className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/50 text-slate-100 font-mono text-sm placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/40 transition"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">
                        Token{' '}
                        <span className="font-normal text-slate-500">
                            {d?.token_set
                                ? d.token_from_env
                                    ? '- currently set in .env'
                                    : '- currently set, leave blank to keep it'
                                : '- not set'}
                        </span>
                    </label>
                    <input
                        type="password"
                        autoComplete="off"
                        {...register('token')}
                        placeholder={d?.token_set ? 'Unchanged' : 'Must match the tunnel head'}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/50 text-slate-100 font-mono text-sm placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/40 transition"
                    />
                    <p className="text-xs text-slate-500">
                        Stored in MongoDB. Anyone who can read that database can impersonate
                        this machine, so keep it access-controlled.
                    </p>
                </div>

                {failure && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-300">{failure}</p>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={save.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold transition"
                    >
                        <Save className="w-4 h-4" />
                        {save.isPending ? 'Saving...' : 'Save and reconnect'}
                    </button>
                    {saved && (
                        <span className="text-sm text-emerald-400 font-semibold">
                            Saved - reconnecting
                        </span>
                    )}
                </div>
            </form>
        </div>
    )
}


/**
 * Outbound tunnel health.
 *
 * Reads GET /admin/tunnel on the proxy, not the tunnel head's own
 * /_tunnel/* endpoints: those are bound to a private port on the public
 * server and firewalled off from this browser by design. The client running
 * inside the proxy knows its own state just as well.
 */
function Tunnel() {
    const tunnel = useQuery({
        queryKey: ['tunnel'],
        queryFn: dashboardServices.getTunnelStatus,
        // Faster than the other panels: this is the thing that flaps.
        refetchInterval: 5000,
    })

    const data = tunnel.data?.data || {}
    const configured = data.configured
    const connected = data.connected

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-black text-slate-50 mb-1">Tunnel</h1>
                    <p className="text-violet-300/85 font-semibold">
                        Outbound link publishing this machine to the public server
                    </p>
                </div>
                <button
                    onClick={() => tunnel.refetch()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                    <RefreshCw className={`w-4 h-4 ${tunnel.isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {tunnel.isError && (
                <div className="flex items-start gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-300">
                        {tunnel.error?.friendlyMessage || 'Could not reach the proxy.'}
                    </p>
                </div>
            )}

            {!configured ? (
                <>
                    <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/70 text-center">
                        <Radio className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-300 font-bold mb-1">Tunnel not configured</p>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                            Fill in the tunnel head URL and token below and save. Until then
                            the proxy runs local-only, which is a valid setup rather than an
                            error.
                        </p>
                    </div>
                    <TunnelSettings />
                </>
            ) : (
                <>
                    <div
                        className={`p-6 rounded-2xl border ${
                            connected
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-red-500/10 border-red-500/30'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            {connected ? (
                                <CheckCircle className="w-7 h-7 text-emerald-400" />
                            ) : (
                                <XCircle className="w-7 h-7 text-red-400" />
                            )}
                            <div>
                                <h2
                                    className={`text-2xl font-black ${
                                        connected ? 'text-emerald-200' : 'text-red-200'
                                    }`}
                                >
                                    {connected ? 'Connected' : 'Disconnected'}
                                </h2>
                                <p
                                    className={`text-sm ${
                                        connected ? 'text-emerald-200/70' : 'text-red-200/70'
                                    }`}
                                >
                                    {connected
                                        ? `Up for ${duration(data.connected_seconds)}`
                                        : 'Reconnecting with exponential backoff (1s to 30s)'}
                                </p>
                            </div>
                        </div>
                        {data.last_error && !connected && (
                            <p className="mt-3 text-sm text-red-300/80 font-mono break-all">
                                {data.last_error}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Stat icon={<Activity />} label="Requests served" value={data.requests_served ?? 0} />
                        <Stat icon={<Clock />} label="In flight" value={data.requests_in_flight ?? 0} />
                        <Stat icon={<Network />} label="WebSocket sessions" value={data.websocket_sessions ?? 0} />
                        <Stat
                            icon={<Repeat />}
                            label="Reconnects"
                            value={data.reconnects ?? 0}
                            warn={(data.reconnects ?? 0) > 5}
                        />
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/70 space-y-4">
                        <h3 className="text-xl font-bold text-slate-50">Link</h3>
                        <Row icon={<Globe />} label="Tunnel head" value={data.server_url} />
                        <Row icon={<Server />} label="Forwards to" value={data.local_target} />
                        <Row icon={<Radio />} label="Client name" value={data.client_name} />
                    </div>

                    <TunnelActivity />

                    <TunnelSettings />

                    {(data.reconnects ?? 0) > 5 && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                            <div className="text-sm text-amber-200/90">
                                <p className="font-semibold mb-1">The link is flapping.</p>
                                <p className="text-amber-200/70">
                                    {data.reconnects} reconnects since start. A connection that is up
                                    right now can still have been down for most of the day - check the
                                    head&apos;s <span className="font-mono">/_tunnel/metrics</span> for
                                    its availability figure.
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function Stat({ icon, label, value, warn }) {
    return (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70">
            <div className={`mb-2 ${warn ? 'text-amber-400' : 'text-violet-400'}`}>
                {React.cloneElement(icon, { className: 'w-5 h-5' })}
            </div>
            <div className={`text-3xl font-black ${warn ? 'text-amber-300' : 'text-slate-50'}`}>
                {value}
            </div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
        </div>
    )
}

function Row({ icon, label, value }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-800/50 last:border-0">
            <span className="flex items-center gap-2 text-sm text-slate-400">
                {React.cloneElement(icon, { className: 'w-4 h-4' })}
                {label}
            </span>
            <span className="text-sm font-mono text-violet-300 break-all text-right">
                {value || '—'}
            </span>
        </div>
    )
}

export default Tunnel
