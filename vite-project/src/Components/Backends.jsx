import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
    Server, Plus, Trash2, RefreshCw, CheckCircle, XCircle,
    HelpCircle, AlertCircle, Scale, Timer,
} from 'lucide-react'
import dashboardServices from '../services/dashboard.service'

const statusStyle = {
    healthy: { icon: CheckCircle, cls: 'text-emerald-400', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    unhealthy: { icon: XCircle, cls: 'text-red-400', chip: 'bg-red-500/15 text-red-300 border-red-500/30' },
    unknown: { icon: HelpCircle, cls: 'text-slate-500', chip: 'bg-slate-700/40 text-slate-400 border-slate-600/40' },
}

/**
 * Backend management: what is registered per route, whether it is healthy, and
 * add / remove at runtime.
 *
 * Add and remove hit the master-key endpoints and change the LIVE route table
 * only - they do not write .env, so anything added here is gone on restart.
 */
function Backends() {
    const queryClient = useQueryClient()
    const [failure, setFailure] = useState('')

    const backends = useQuery({
        queryKey: ['backends'],
        queryFn: dashboardServices.getDashboardDetails,
        refetchInterval: 15000,
    })
    const lb = useQuery({
        queryKey: ['lb-stats'],
        queryFn: dashboardServices.getLoadBalancerStats,
        refetchInterval: 15000,
    })

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: { route: '', url: '' },
    })

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['backends'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['lb-stats'] })
    }

    const add = useMutation({
        mutationFn: dashboardServices.addBackend,
        onSuccess: () => { setFailure(''); reset(); invalidate() },
        onError: (e) => setFailure(e?.friendlyMessage || 'Could not add that backend.'),
    })

    const remove = useMutation({
        mutationFn: dashboardServices.removeBackend,
        onSuccess: () => { setFailure(''); invalidate() },
        onError: (e) => setFailure(e?.friendlyMessage || 'Could not remove that backend.'),
    })

    // /admin/backends returns a flat map keyed "route:index" - group by route
    // so the UI mirrors how the load balancer actually thinks about them.
    const grouped = React.useMemo(() => {
        const raw = backends.data || {}
        const out = {}
        Object.entries(raw).forEach(([key, info]) => {
            if (!info || typeof info !== 'object' || !info.route) return
            ;(out[info.route] ||= []).push({ key, ...info })
        })
        return out
    }, [backends.data])

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-black text-slate-50 mb-1">Backends</h1>
                    <p className="text-violet-300/85 font-semibold">
                        {Object.keys(grouped).length} route
                        {Object.keys(grouped).length === 1 ? '' : 's'} registered
                    </p>
                </div>
                <button
                    onClick={() => { backends.refetch(); lb.refetch() }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                    <RefreshCw className={`w-4 h-4 ${backends.isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {lb.data?.strategy && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Scale className="w-4 h-4" />
                    Load balancing: <span className="font-mono text-violet-300">{lb.data.strategy}</span>
                </div>
            )}

            {(failure || backends.isError) && (
                <div className="flex items-start gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-300">
                        {failure || backends.error?.friendlyMessage || 'Could not load backends.'}
                    </p>
                </div>
            )}

            <div className="space-y-4">
                {Object.entries(grouped).map(([route, instances]) => (
                    <div key={route} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70">
                        <div className="flex items-center gap-2 mb-4">
                            <Server className="w-5 h-5 text-violet-400" />
                            <h3 className="text-lg font-bold text-slate-50 font-mono">{route}</h3>
                            <span className="text-xs text-slate-500">
                                {instances.length} instance{instances.length === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="space-y-2">
                            {instances.map((inst) => {
                                const style = statusStyle[inst.status] || statusStyle.unknown
                                const Icon = style.icon
                                return (
                                    <div
                                        key={inst.key}
                                        className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-950/50 border border-slate-800/50 flex-wrap"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Icon className={`w-4 h-4 shrink-0 ${style.cls}`} />
                                            <div className="min-w-0">
                                                <div className="font-mono text-sm text-slate-200 break-all">
                                                    {inst.url}
                                                </div>
                                                <div className="flex gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                                                    <span className={`px-1.5 py-0.5 rounded border ${style.chip}`}>
                                                        {inst.status}
                                                    </span>
                                                    {inst.response_time != null && (
                                                        <span className="flex items-center gap-1">
                                                            <Timer className="w-3 h-3" />
                                                            {Math.round(inst.response_time)}ms
                                                        </span>
                                                    )}
                                                    {inst.consecutive_failures > 0 && (
                                                        <span className="text-red-400">
                                                            {inst.consecutive_failures} consecutive failures
                                                        </span>
                                                    )}
                                                    {inst.error && (
                                                        <span className="text-red-400/70 truncate max-w-md" title={inst.error}>
                                                            {inst.error}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Remove ${inst.url} from ${route}?`))
                                                    remove.mutate({ route, url: inst.url })
                                            }}
                                            disabled={remove.isPending}
                                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 transition disabled:opacity-50 shrink-0"
                                            aria-label="Remove backend"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="max-w-xl p-6 rounded-2xl bg-slate-900/60 border border-slate-800/70">
                <h3 className="text-lg font-bold text-slate-50 mb-1">Add a backend</h3>
                {/* Runtime-only: the proxy mutates its in-memory route table. */}
                <p className="text-xs text-slate-500 mb-4">
                    Applies immediately but is not written to <span className="font-mono">.env</span>,
                    so it is lost when the proxy restarts.
                </p>
                <form
                    onSubmit={handleSubmit((d) => add.mutate(d))}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Route</label>
                        <input
                            {...register('route', {
                                required: 'Route is required',
                                pattern: { value: /^\//, message: 'Must start with /' },
                            })}
                            className={`w-full px-4 py-3 rounded-xl bg-slate-950/60 border text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/40 transition ${
                                errors.route ? 'border-red-500/50' : 'border-slate-700/50'
                            }`}
                            placeholder="/app1"
                        />
                        {errors.route && <p className="text-red-400 text-xs">{errors.route.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Backend URL</label>
                        <input
                            {...register('url', {
                                required: 'URL is required',
                                pattern: { value: /^https?:\/\//, message: 'Must start with http:// or https://' },
                            })}
                            className={`w-full px-4 py-3 rounded-xl bg-slate-950/60 border text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/40 transition ${
                                errors.url ? 'border-red-500/50' : 'border-slate-700/50'
                            }`}
                            placeholder="http://127.0.0.1:3001"
                        />
                        {errors.url && <p className="text-red-400 text-xs">{errors.url.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={add.isPending}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold transition"
                    >
                        <Plus className="w-4 h-4" />
                        {add.isPending ? 'Adding...' : 'Add backend'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Backends
