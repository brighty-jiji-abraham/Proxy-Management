import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    Radio, RefreshCw, AlertCircle, CheckCircle, XCircle,
    Globe, Server, Activity, Repeat, Network, Clock,
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
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/70 text-center">
                    <Radio className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-300 font-bold mb-1">Tunnel not configured</p>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                        Set <span className="font-mono text-slate-400">TUNNEL_SERVER_URL</span> and{' '}
                        <span className="font-mono text-slate-400">TUNNEL_TOKEN</span> in the proxy&apos;s{' '}
                        <span className="font-mono text-slate-400">.env</span> and restart it. Without
                        them the proxy runs local-only, which is a valid setup, not an error.
                    </p>
                </div>
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
