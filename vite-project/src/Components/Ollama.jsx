import React from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
    Cpu, RefreshCw, AlertCircle, HardDrive, CheckCircle, XCircle, ShieldAlert,
} from 'lucide-react'

const gib = (bytes) =>
    bytes ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : '—'

const when = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

/**
 * Ollama models and reachability.
 *
 * Goes through the proxy's /ollama route rather than straight to :11434, so
 * what this page reports is what the chatbot actually experiences - if the
 * proxy route is misconfigured, this shows it.
 *
 * Deliberately NOT using the shared `api` client: that one is pinned to the
 * admin base URL (/admin) and attaches the master key, neither of which
 * applies here. /ollama is an unauthenticated passthrough.
 */
const proxyRoot = () =>
    (import.meta.env.VITE_baseURL || '').replace(/\/admin\/?$/, '') || 'http://localhost:2000'

function Ollama() {
    const tags = useQuery({
        queryKey: ['ollama-tags'],
        queryFn: async () =>
            (await axios.get(`${proxyRoot()}/ollama/api/tags`, { timeout: 15000 })).data,
        refetchInterval: 30000,
        retry: 1,
    })

    const version = useQuery({
        queryKey: ['ollama-version'],
        queryFn: async () =>
            (await axios.get(`${proxyRoot()}/ollama/api/version`, { timeout: 10000 })).data,
        refetchInterval: 60000,
        retry: 1,
    })

    const models = tags.data?.models || []
    const reachable = !tags.isError && !tags.isLoading

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-black text-slate-50 mb-1">Ollama</h1>
                    <p className="text-violet-300/85 font-semibold">
                        Local models, served through <span className="font-mono">/ollama</span>
                    </p>
                </div>
                <button
                    onClick={() => { tags.refetch(); version.refetch() }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                    <RefreshCw className={`w-4 h-4 ${tags.isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div
                className={`p-6 rounded-2xl border ${
                    reachable
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : tags.isLoading
                        ? 'bg-slate-900/60 border-slate-800/70'
                        : 'bg-red-500/10 border-red-500/30'
                }`}
            >
                <div className="flex items-center gap-3">
                    {tags.isLoading ? (
                        <RefreshCw className="w-7 h-7 text-slate-500 animate-spin" />
                    ) : reachable ? (
                        <CheckCircle className="w-7 h-7 text-emerald-400" />
                    ) : (
                        <XCircle className="w-7 h-7 text-red-400" />
                    )}
                    <div>
                        <h2
                            className={`text-2xl font-black ${
                                tags.isLoading ? 'text-slate-300' : reachable ? 'text-emerald-200' : 'text-red-200'
                            }`}
                        >
                            {tags.isLoading ? 'Checking...' : reachable ? 'Reachable' : 'Unreachable'}
                        </h2>
                        <p className={`text-sm ${reachable ? 'text-emerald-200/70' : 'text-red-200/70'}`}>
                            {reachable
                                ? `${models.length} model${models.length === 1 ? '' : 's'}${
                                      version.data?.version ? ` · Ollama ${version.data.version}` : ''
                                  }`
                                : tags.isLoading
                                ? ''
                                : 'The proxy could not reach Ollama. Is the daemon running on 11434?'}
                        </p>
                    </div>
                </div>
            </div>

            {/* This route is intentionally unauthenticated because the embedding
                client cannot send a key. Worth stating where an operator will
                see it, not only in the README. */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-200/90">
                    <p className="font-semibold mb-1">
                        <span className="font-mono">/ollama</span> requires no API key.
                    </p>
                    <p className="text-amber-200/70">
                        The embedding client cannot send one. That is safe only while the proxy
                        stays off the public internet - anyone who can reach this route can use
                        the GPU, pull models until the disk fills, or delete them.
                    </p>
                </div>
            </div>

            {tags.isError && (
                <div className="flex items-start gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-300 font-mono break-all">
                        {tags.error?.message || 'Request failed'}
                    </p>
                </div>
            )}

            {models.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xl font-bold text-slate-50">Models</h3>
                    {models.map((m) => (
                        <div
                            key={m.digest || m.name}
                            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70"
                        >
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <Cpu className="w-4 h-4 text-violet-400 shrink-0" />
                                        <span className="font-bold text-slate-100 font-mono break-all">
                                            {m.name}
                                        </span>
                                    </div>
                                    <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
                                        {m.details?.parameter_size && (
                                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                                {m.details.parameter_size}
                                            </span>
                                        )}
                                        {m.details?.quantization_level && (
                                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                                {m.details.quantization_level}
                                            </span>
                                        )}
                                        {m.details?.family && (
                                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                                {m.details.family}
                                            </span>
                                        )}
                                        <span>modified {when(m.modified_at)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 shrink-0">
                                    <HardDrive className="w-4 h-4" />
                                    <span className="font-mono text-sm">{gib(m.size)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {reachable && models.length === 0 && (
                <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800/70">
                    <Cpu className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">No models installed</p>
                    <p className="text-sm text-slate-600 mt-1 font-mono">ollama pull qwen2.5:14b</p>
                </div>
            )}
        </div>
    )
}

export default Ollama
