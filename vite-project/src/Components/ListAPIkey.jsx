import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Key, Trash2, RefreshCw, Copy, Check, Eye, EyeOff,
    AlertCircle, ShieldCheck,
} from 'lucide-react'
import dashboardServices from '../services/dashboard.service'
import { getApiKey } from '../api/api'

const when = (ts) =>
    ts ? new Date(ts * 1000).toLocaleString() : 'never'

/**
 * Every key the proxy currently holds, from GET /admin/api-keys.
 *
 * The endpoint returns keys in plaintext, so they are masked by default here -
 * a management screen left open on a shared desk should not leak credentials.
 */
function ListAPIkey() {
    const queryClient = useQueryClient()
    const [revealed, setRevealed] = useState({})
    const [copiedKey, setCopiedKey] = useState(null)
    const [failure, setFailure] = useState('')

    const keys = useQuery({
        queryKey: ['api-keys'],
        queryFn: dashboardServices.listApiKeys,
        refetchInterval: 30000,
    })

    const revoke = useMutation({
        mutationFn: dashboardServices.revokeApiKey,
        onSuccess: () => {
            setFailure('')
            queryClient.invalidateQueries({ queryKey: ['api-keys'] })
        },
        onError: (err) =>
            setFailure(err?.friendlyMessage || 'Could not revoke that key.'),
    })

    const copy = async (value) => {
        try {
            await navigator.clipboard.writeText(value)
            setCopiedKey(value)
            setTimeout(() => setCopiedKey(null), 2000)
        } catch {
            setFailure('Clipboard blocked by the browser.')
        }
    }

    const rows = keys.data?.api_keys || []
    const activeKey = getApiKey()

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-black text-slate-50 mb-1">Key Vault</h1>
                    <p className="text-violet-300/85 font-semibold">
                        {rows.length} key{rows.length === 1 ? '' : 's'} held by the proxy
                    </p>
                </div>
                <button
                    onClick={() => keys.refetch()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                    <RefreshCw className={`w-4 h-4 ${keys.isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {(failure || keys.isError) && (
                <div className="flex items-start gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-300">
                        {failure || keys.error?.friendlyMessage ||
                         'Could not load keys. This endpoint needs the master key.'}
                    </p>
                </div>
            )}

            {keys.isLoading ? (
                <div className="p-12 text-center text-slate-500">Loading keys...</div>
            ) : rows.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800/70">
                    <Key className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">No keys yet</p>
                    <p className="text-sm text-slate-600 mt-1">Forge one from Key Forge.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {rows.map((row) => {
                        const value = row.key || ''
                        const isCurrent = value && value === activeKey
                        const isMaster = row.user_id === 'master'
                        const show = revealed[value]

                        return (
                            <div
                                key={value || row.user_id}
                                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700/70 transition"
                            >
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <span className="font-bold text-slate-100">
                                                {row.name || 'Unnamed key'}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-lg text-xs font-mono bg-slate-800 text-slate-400">
                                                {row.user_id}
                                            </span>
                                            {isMaster && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                                                    <ShieldCheck className="w-3 h-3" /> master
                                                </span>
                                            )}
                                            {isCurrent && (
                                                <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                    this session
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <code className="px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300 font-mono text-xs break-all">
                                                {show ? value : '•'.repeat(Math.min(value.length, 32))}
                                            </code>
                                            <button
                                                onClick={() =>
                                                    setRevealed((r) => ({ ...r, [value]: !r[value] }))
                                                }
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition shrink-0"
                                                aria-label={show ? 'Hide key' : 'Reveal key'}
                                            >
                                                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => copy(value)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition shrink-0"
                                                aria-label="Copy key"
                                            >
                                                {copiedKey === value ? (
                                                    <Check className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>

                                        <div className="flex gap-4 mt-3 text-xs text-slate-500">
                                            <span>created {when(row.created_at)}</span>
                                            <span>last used {when(row.last_used)}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            // Revoking the key you are signed in with would lock
                                            // you out of every write endpoint immediately.
                                            const warning = isCurrent
                                                ? 'This is the key this session is using. Revoking it signs you out. Continue?'
                                                : `Revoke "${row.name || row.user_id}"?`
                                            if (window.confirm(warning)) revoke.mutate(value)
                                        }}
                                        disabled={revoke.isPending}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-semibold transition disabled:opacity-50 shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Revoke
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default ListAPIkey
