import { AlertCircle, Check, Copy, Inbox, Pause, Play, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import './CallHistory.css'
import './ServicePages.css'

export function ServiceHeader({ icon, title, description, sources, paused, onPause, interval }) {
    const Icon = icon
    const fetching = sources.some((source) => source.isFetching)
    const failed = sources.filter((source) => source.isError)
    const loading = sources.some((source) => source.isPending)
    return (
        <>
            <header className="calls-header">
                <div>
                    <div className="calls-page-title">
                        <span className="calls-title-icon">
                            <Icon size={23} />
                        </span>
                        <h1>{title}</h1>
                    </div>
                    <p>{description}</p>
                </div>
                <div className="calls-header-actions">
                    <button
                        className={'calls-live-control' + (paused || failed.length ? ' is-paused' : '')}
                        aria-label={paused ? 'Resume live updates' : 'Pause live updates'}
                        aria-pressed={!paused}
                        title={'Automatic refresh ' + interval}
                        onClick={onPause}
                    >
                        <i />
                        {paused
                            ? 'Paused'
                            : failed.length
                              ? 'Partial data'
                              : loading
                                ? 'Connecting'
                                : 'Live updates'}
                        {paused ? <Play size={13} /> : <Pause size={13} />}
                    </button>
                    <button
                        className="calls-button"
                        disabled={fetching}
                        onClick={() => sources.forEach((source) => source.refetch())}
                    >
                        <RefreshCw size={15} className={fetching ? 'calls-spin' : ''} />
                        Refresh all
                    </button>
                </div>
            </header>
            {failed.length > 0 && (
                <div className="calls-alert" role="alert">
                    <AlertCircle size={18} />
                    <div>
                        <strong>Some data could not refresh</strong>
                        <p>
                            {failed.map((source) => source.label).join(', ')}. Any previous snapshots remain
                            visible. Refresh to try again.
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}

export function ServiceMetric({ icon, label, value, note, color = 'violet' }) {
    const Icon = icon
    return (
        <div className={'calls-metric ' + color}>
            <div className="calls-metric-label">
                <Icon size={15} />
                {label}
            </div>
            <div className="calls-metric-value">
                <strong>{value ?? '—'}</strong>
            </div>
            <p className="calls-metric-note">{note}</p>
        </div>
    )
}

export function ServiceState({ query, title, children }) {
    if (query.data != null) return children
    if (query.isPending)
        return (
            <div className="service-skeleton" role="status" aria-label={'Loading ' + title}>
                <span />
                <span />
                <span />
            </div>
        )
    const denied = [401, 403].includes(query.error?.statusCode || query.error?.response?.status)
    return (
        <ServiceEmpty
            icon={AlertCircle}
            title={title + ' unavailable'}
            description={
                denied
                    ? 'A valid master API key is required. Sign in with the master key to access this section.'
                    : query.error?.friendlyMessage ||
                      query.error?.message ||
                      'The proxy did not return data. Try refreshing.'
            }
        >
            <button className="calls-button" onClick={() => query.refetch()} disabled={query.isFetching}>
                <RefreshCw size={14} />
                Try again
            </button>
        </ServiceEmpty>
    )
}

export function ServiceEmpty({ icon = Inbox, title, description, children }) {
    const Icon = icon
    return (
        <div className="service-empty">
            <Icon size={28} />
            <h3>{title}</h3>
            <p>{description}</p>
            {children}
        </div>
    )
}

export function ServiceBadge({ tone = 'unknown', children }) {
    return (
        <span className={'service-badge ' + tone}>
            <i />
            {children}
        </span>
    )
}

export function ServiceBanner({ icon, tone = 'unknown', title, description, children }) {
    const Icon = icon
    return (
        <section className={'service-banner ' + tone} aria-label="Service status">
            <span className="service-banner-icon">
                <Icon size={24} />
            </span>
            <div className="service-banner-message">
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            {children && <div className="service-banner-aside">{children}</div>}
        </section>
    )
}

export function ServiceBars({ items, emptyText = 'No measurements available.', label }) {
    const max = Math.max(1, ...items.map((item) => item.value))
    if (!items.length)
        return (
            <ServiceEmpty
                title={emptyText}
                description="Measurements will appear when the service reports them."
            />
        )
    return (
        <div className="service-bars" role="list" aria-label={label}>
            {items.map((item) => (
                <div key={item.key} role="listitem">
                    <div>
                        <span title={item.label}>{item.label}</span>
                        <strong>{item.display}</strong>
                    </div>
                    <div className="service-bar-track" aria-hidden="true">
                        <span
                            style={{
                                width: (item.value / max) * 100 + '%',
                                background: item.color || 'var(--calls-cyan)',
                            }}
                        />
                    </div>
                    {item.note && <small>{item.note}</small>}
                </div>
            ))}
        </div>
    )
}

export function CopyButton({ value, label = 'Copy' }) {
    const [state, setState] = useState('idle')
    return (
        <button
            className="calls-icon-button"
            aria-label={label}
            title={state === 'copied' ? 'Copied' : state === 'error' ? 'Select the text to copy it' : label}
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(String(value))
                    setState('copied')
                } catch {
                    setState('error')
                }
            }}
        >
            {state === 'copied' ? <Check size={14} /> : <Copy size={14} />}
            <span className="calls-sr-only" role="status">
                {state === 'copied'
                    ? 'Copied'
                    : state === 'error'
                      ? 'Could not copy. Select the text instead.'
                      : ''}
            </span>
        </button>
    )
}

export function ServiceFooter({ sources, children }) {
    const updates = sources.map((source) => source.dataUpdatedAt).filter(Boolean)
    return (
        <footer className="service-footer">
            <p>{children}</p>
            <span>
                {updates.length
                    ? 'Oldest snapshot ' + new Date(Math.min(...updates)).toLocaleTimeString()
                    : 'Waiting for data'}
            </span>
        </footer>
    )
}
