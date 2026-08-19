import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Plus, Copy, Check, AlertTriangle, AlertCircle } from 'lucide-react'
import dashboardServices from '../services/dashboard.service'

/**
 * Mint a new API key via POST /admin/api-keys (master key required).
 *
 * The generated key is shown once, here, because the proxy stores it against a
 * SHA-256 hash in memory - treat it as unrecoverable if you do not record it.
 */
function GenerateAPIkey() {
    const queryClient = useQueryClient()
    const [issued, setIssued] = useState(null)
    const [copied, setCopied] = useState(false)
    const [failure, setFailure] = useState('')

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({ defaultValues: { user_id: '', name: '' } })

    const create = useMutation({
        mutationFn: dashboardServices.createApiKey,
        onSuccess: (data) => {
            setFailure('')
            setIssued(data?.api_key || data?.key || null)
            queryClient.invalidateQueries({ queryKey: ['api-keys'] })
            reset()
        },
        onError: (err) =>
            setFailure(err?.friendlyMessage || 'Could not create the key.'),
    })

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(issued)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            setFailure('Clipboard blocked by the browser - select and copy manually.')
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-black text-slate-50 mb-1">Key Forge</h1>
                <p className="text-violet-300/85 font-semibold">
                    Issue an API key for a client of the proxy
                </p>
            </div>

            {/* Keys live in a plain dict in the proxy process. Saying so here is
                cheaper than someone discovering it after a restart. */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-200/90">
                    <p className="font-semibold mb-1">Keys are held in memory only.</p>
                    <p className="text-amber-200/70">
                        Every key issued here is lost when the proxy restarts, and is not
                        shared across worker processes. Only{' '}
                        <span className="font-mono">MASTER_API_KEY</span> from{' '}
                        <span className="font-mono">.env</span> is restored on boot.
                    </p>
                </div>
            </div>

            <div className="max-w-xl p-6 rounded-2xl bg-slate-900/60 border border-slate-800/70">
                <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">
                            User ID <span className="text-red-400">*</span>
                        </label>
                        <input
                            {...register('user_id', { required: 'User ID is required' })}
                            className={`w-full px-4 py-3 rounded-xl bg-slate-950/60 border text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/40 transition ${
                                errors.user_id ? 'border-red-500/50' : 'border-slate-700/50'
                            }`}
                            placeholder="e.g. whatsapp-bot"
                        />
                        {errors.user_id && (
                            <p className="text-red-400 text-xs">{errors.user_id.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Label</label>
                        <input
                            {...register('name')}
                            className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/50 text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/40 transition"
                            placeholder="What this key is for (optional)"
                        />
                    </div>

                    {failure && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-red-300">{failure}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={create.isPending}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold transition"
                    >
                        <Plus className="w-4 h-4" />
                        {create.isPending ? 'Forging...' : 'Forge key'}
                    </button>
                </form>
            </div>

            {issued && (
                <div className="max-w-xl p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2 mb-3">
                        <Key className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-emerald-200">Key issued</h3>
                    </div>
                    <p className="text-sm text-emerald-200/70 mb-3">
                        Copy it now and store it somewhere safe.
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-800 text-emerald-300 font-mono text-sm break-all">
                            {issued}
                        </code>
                        <button
                            onClick={copy}
                            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0"
                            aria-label="Copy key"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default GenerateAPIkey
