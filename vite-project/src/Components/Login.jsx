import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Key, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import dashboardServices from '../services/dashboard.service'
import { setApiKey } from '../api/api'

/**
 * Sign in with the proxy's master API key.
 *
 * The previous version collected a username and password and POSTed them to
 * /login on the admin base URL - an endpoint that does not exist there. Real
 * user accounts live in the Node service, which needs MongoDB and is not part
 * of running the proxy.
 *
 * The master key is what the proxy itself checks on every write endpoint, so
 * that is the credential this UI needs. It is verified against
 * POST /admin/api-keys/validate (deliberately unauthenticated, so it can be
 * used as the login check) and then stored for subsequent requests.
 */
function Login({ onAuthenticated }) {
    const [showKey, setShowKey] = useState(false)
    const [failure, setFailure] = useState('')

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({ defaultValues: { apiKey: '' } })

    const verify = useMutation({
        mutationFn: async (apiKey) => {
            // Store first: the axios interceptor reads the key from storage,
            // and validate itself needs no auth, so this is safe to do before
            // we know the answer - and it is cleared again on failure.
            setApiKey(apiKey)
            const result = await dashboardServices.validateApiKey(apiKey)
            if (!result?.valid) throw new Error('That key was rejected by the proxy.')
            return result
        },
        onSuccess: () => {
            setFailure('')
            onAuthenticated?.()
        },
        onError: (err) => {
            setApiKey('')
            setFailure(
                err?.friendlyMessage ||
                err?.message ||
                'Could not reach the proxy. Is it running on VITE_baseURL?'
            )
        },
    })

    const onSubmit = ({ apiKey }) => verify.mutate(apiKey.trim())

    return (
        <div className="min-h-screen flex items-center justify-center transition-all duration-500 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-transparent to-slate-900/40"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-slate-800/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-800/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.025)_1px,transparent_0)] bg-[length:50px_50px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="p-8 rounded-3xl border bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 border-slate-800/70 shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.03)_0%,transparent_50%)]"></div>

                    <div className="relative">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/30 mb-4">
                                <ShieldCheck className="w-7 h-7 text-violet-300" />
                            </div>
                            <h1 className="text-3xl font-black text-slate-50 mb-2">ProxyVault</h1>
                            <p className="text-violet-300/85 font-semibold">
                                Sign in with the proxy master key
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300">
                                    Master API key
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        autoComplete="off"
                                        spellCheck="false"
                                        {...register('apiKey', {
                                            required: 'Enter the master API key',
                                            minLength: { value: 4, message: 'That looks too short' },
                                        })}
                                        className={`w-full pl-10 pr-11 py-3 rounded-xl bg-slate-950/60 border text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/40 transition ${
                                            errors.apiKey ? 'border-red-500/50' : 'border-slate-700/50'
                                        }`}
                                        placeholder="MASTER_API_KEY from the proxy .env"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                                        aria-label={showKey ? 'Hide key' : 'Show key'}
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.apiKey && (
                                    <p className="text-red-400 text-xs mt-1">{errors.apiKey.message}</p>
                                )}
                            </div>

                            {failure && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                    <p className="text-sm text-red-300">{failure}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={verify.isPending}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition"
                            >
                                {verify.isPending ? 'Verifying...' : 'Enter'}
                                {!verify.isPending && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </form>

                        <p className="mt-6 text-xs text-slate-500 text-center leading-relaxed">
                            The key is stored in this browser only. It is the value of
                            <span className="text-slate-400 font-mono"> MASTER_API_KEY </span>
                            in the proxy&apos;s <span className="font-mono">.env</span>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
