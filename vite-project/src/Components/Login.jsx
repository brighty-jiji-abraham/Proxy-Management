import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import {
    Activity,
    AlertCircle,
    ArrowRight,
    ChevronDown,
    Cpu,
    Eye,
    EyeOff,
    KeyRound,
    Laptop,
    LockKeyhole,
    Network,
    RefreshCw,
    Server,
    ShieldCheck,
    Webhook,
} from 'lucide-react'
import dashboardServices from '../services/dashboard.service'
import { setApiKey } from '../api/api'
import LoginConnection from './LoginConnection'
import './Login.css'

function Login({ onAuthenticated }) {
    const [showKey, setShowKey] = useState(false)
    const [failure, setFailure] = useState('')
    const [capsLock, setCapsLock] = useState(false)
    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm({ defaultValues: { apiKey: '', remember: false } })
    const remember = watch('remember')
    const verify = useMutation({
        mutationFn: async ({ apiKey }) => {
            const result = await dashboardServices.validateApiKey(apiKey)
            if (result?.valid !== true)
                throw new Error('That key was not recognized. Check the value and try again.')
            return result
        },
        onSuccess: (_, { apiKey, remember }) => {
            // Validation is public. Save only the credential the proxy has accepted.
            setApiKey(apiKey, { remember })
            setFailure('')
            onAuthenticated?.()
        },
        onError: (error) =>
            setFailure(
                error?.friendlyMessage ||
                    error?.message ||
                    'Could not reach the proxy. Check the connection and try again.'
            ),
    })
    const onSubmit = ({ apiKey, remember }) => {
        setFailure('')
        verify.mutate({ apiKey: apiKey.trim(), remember })
    }
    return (
        <div className="login-page">
            <div className="login-shell">
                <header className="login-header">
                    <div className="login-brand">
                        <span>
                            <ShieldCheck size={25} />
                        </span>
                        <div>
                            <strong>ProxyVault</strong>
                            <small>Proxy management</small>
                        </div>
                    </div>
                    <span className="login-console-label">
                        <LockKeyhole size={14} />
                        Management console
                    </span>
                </header>
                <main className="login-main">
                    <section className="login-intro" aria-label="About ProxyVault">
                        <h2>
                            Your services, <br />
                            in clear view.
                        </h2>
                        <p>Follow requests, check backend health, and manage access from one dashboard.</p>
                        <div
                            className="login-routing"
                            role="img"
                            aria-label="Routing overview: client requests pass through ProxyVault to services, models, and integrations."
                        >
                            <div className="login-route-node">
                                <Laptop size={23} />
                                <strong>Clients</strong>
                                <span>Requests</span>
                            </div>
                            <div className="login-route-line" />
                            <div className="login-route-hub">
                                <ShieldCheck size={27} />
                                <strong>ProxyVault</strong>
                                <span>Route &amp; observe</span>
                            </div>
                            <div className="login-route-branches">
                                <div>
                                    <Server size={15} />
                                    <span>Services</span>
                                </div>
                                <div>
                                    <Cpu size={15} />
                                    <span>Models</span>
                                </div>
                                <div>
                                    <Webhook size={15} />
                                    <span>Integrations</span>
                                </div>
                            </div>
                        </div>
                        <div className="login-features">
                            <div>
                                <Activity size={16} />
                                <span>Request insights</span>
                            </div>
                            <div>
                                <Network size={16} />
                                <span>Service health</span>
                            </div>
                            <div>
                                <KeyRound size={16} />
                                <span>Access control</span>
                            </div>
                        </div>
                    </section>
                    <section className="login-form-panel" aria-labelledby="login-title">
                        <span className="login-form-icon">
                            <KeyRound size={22} />
                        </span>
                        <h1 id="login-title">Sign in</h1>
                        <p>Open your proxy's control center.</p>
                        <LoginConnection />
                        <form onSubmit={handleSubmit(onSubmit)} aria-busy={verify.isPending}>
                            <fieldset disabled={verify.isPending}>
                                <label htmlFor="login-api-key">Master API key</label>
                                <div className={'login-key-input' + (errors.apiKey ? ' invalid' : '')}>
                                    <KeyRound size={16} />
                                    <input
                                        id="login-api-key"
                                        type={showKey ? 'text' : 'password'}
                                        autoComplete="off"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck="false"
                                        onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                                        onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                                        placeholder="Enter your master API key"
                                        aria-required="true"
                                        aria-invalid={Boolean(errors.apiKey)}
                                        aria-describedby={
                                            errors.apiKey
                                                ? 'login-key-error login-key-help'
                                                : 'login-key-help'
                                        }
                                        {...register('apiKey', {
                                            validate: (value) =>
                                                !value.trim()
                                                    ? 'Enter your master API key.'
                                                    : value.trim().length < 4
                                                      ? 'Check your key; it looks too short.'
                                                      : true,
                                            onChange: () => setFailure(''),
                                            onBlur: () => setCapsLock(false),
                                        })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey((value) => !value)}
                                        aria-label={showKey ? 'Hide API key' : 'Show API key'}
                                        aria-pressed={showKey}
                                    >
                                        {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                                {errors.apiKey && (
                                    <p className="login-field-error" id="login-key-error" role="alert">
                                        {errors.apiKey.message}
                                    </p>
                                )}
                                <p className="login-field-help" id="login-key-help">
                                    Use the key configured for your proxy.
                                </p>
                                {capsLock && (
                                    <p className="login-caps-lock" role="status">
                                        Caps Lock is on. API keys are case sensitive.
                                    </p>
                                )}
                                <label className="login-remember">
                                    <input type="checkbox" {...register('remember')} />
                                    <span>
                                        Remember on this device
                                        <small>Leave off to keep the key for this browser session.</small>
                                    </span>
                                </label>
                            </fieldset>
                            {failure && (
                                <div className="login-error" role="alert">
                                    <AlertCircle size={17} />
                                    <p>{failure}</p>
                                </div>
                            )}
                            <button className="login-submit" type="submit" disabled={verify.isPending}>
                                {verify.isPending ? (
                                    <>
                                        <RefreshCw size={17} className="login-spin" />
                                        <span role="status">Verifying access…</span>
                                    </>
                                ) : (
                                    <>
                                        Open dashboard
                                        <ArrowRight size={17} />
                                    </>
                                )}
                            </button>
                        </form>
                        <details className="login-help">
                            <summary>
                                Where do I find my key?
                                <ChevronDown size={15} />
                            </summary>
                            <p>
                                Use the <code>MASTER_API_KEY</code> value configured for your proxy. If
                                someone else manages it, ask them for the key.
                            </p>
                        </details>
                        <div className="login-storage-note">
                            <LockKeyhole size={14} />
                            <p>
                                {remember
                                    ? 'Your verified key stays on this device until you sign out. Use this option on a device you trust.'
                                    : 'Your verified key is kept in this tab’s browser session. Sign out when you are finished on a shared device.'}
                            </p>
                        </div>
                    </section>
                </main>
                <footer className="login-footer">
                    <span>ProxyVault</span>
                    <p>Traffic, connections, and access. All in one place.</p>
                </footer>
            </div>
        </div>
    )
}

export default Login
