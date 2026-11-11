import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
    Activity,
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    CheckCheck,
    Clock3,
    Gauge,
    Info,
    Layers,
    Pause,
    Play,
    RefreshCw,
    Server,
    Trash2,
    X,
} from 'lucide-react'
import dashboardServices from '../services/dashboard.service'
import { analyzeCalls, duration, number } from '../utils/callAnalytics'
import {
    InsightPanel,
    LatencyPanel,
    PanelHeading,
    ServicePanel,
    Sparkline,
    StatusPanel,
    TrafficPanel,
} from './CallCharts'
import CallExplorer from './CallExplorer'
import './CallHistory.css'

const INITIAL_FILTERS = { search: '', outcome: 'all', method: 'all', page: 0 }

export default function CallHistory() {
    const queryClient = useQueryClient()
    const [params, setParams] = useSearchParams()
    const route = params.get('route') || ''
    const [minutes, setMinutes] = useState(60)
    const [paused, setPaused] = useState(false)
    const [confirmClear, setConfirmClear] = useState(false)
    const [filters, setFilters] = useState(INITIAL_FILTERS)
    const explorerRef = useRef(null)
    const history = useQuery({
        queryKey: ['service-requests', route],
        queryFn: () => dashboardServices.getServiceRequests({ route, limit: 500 }),
        refetchInterval: paused ? false : 5000,
        refetchOnWindowFocus: !paused,
        refetchOnReconnect: !paused,
        retry: (count, error) => ![401, 403].includes(error.statusCode) && count < 1,
    })
    const clear = useMutation({
        mutationFn: (selectedRoute) => dashboardServices.clearServiceRequests(selectedRoute),
        onSuccess: () => {
            setConfirmClear(false)
            queryClient.invalidateQueries({ queryKey: ['service-requests'] })
        },
    })
    const data = history.data?.data
    const services = data?.services || []
    const serverWindow = data?.window_minutes || 60
    const selected = services.find((service) => service.route === route)
    const analytics = useMemo(() => analyzeCalls(data, minutes), [data, minutes])
    const ranges = [...new Set([15, 30, 60, serverWindow].filter((value) => value <= serverWindow))].sort(
        (a, b) => a - b
    )
    const denied = [401, 403].includes(history.error?.statusCode)
    const status = history.isError
        ? 'Connection issue'
        : paused
          ? 'Paused'
          : history.isPending
            ? 'Connecting'
            : 'Live updates'
    const pick = (value) => {
        setConfirmClear(false)
        setFilters(INITIAL_FILTERS)
        setParams((previous) => {
            const next = new URLSearchParams(previous)
            if (value) next.set('route', value)
            else next.delete('route')
            return next
        })
    }
    const inspect = (changes) => {
        setFilters({ ...INITIAL_FILTERS, ...changes })
        explorerRef.current?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
            block: 'start',
        })
    }

    return (
        <div className="calls-page">
            <header className="calls-header">
                <div>
                    <div className="calls-page-title">
                        <span className="calls-title-icon">
                            <Activity size={23} />
                        </span>
                        <h1>Call history</h1>
                    </div>
                    <p>A closer look at every request through your proxy.</p>
                </div>
                <div className="calls-header-actions">
                    <button
                        className={`calls-live-control ${paused || history.isError ? 'is-paused' : ''}`}
                        onClick={() => setPaused((value) => !value)}
                        aria-label={paused ? 'Resume live updates' : 'Pause live updates'}
                        aria-pressed={!paused}
                        title="Refresh automatically every 5 seconds"
                    >
                        <i />
                        {status}
                        {paused ? <Play size={13} /> : <Pause size={13} />}
                    </button>
                    <button
                        className="calls-button"
                        onClick={() => history.refetch()}
                        disabled={history.isFetching}
                    >
                        <RefreshCw size={15} className={history.isFetching ? 'calls-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </header>

            {history.isError && (
                <div className="calls-alert" role="alert">
                    <AlertCircle size={19} />
                    <div>
                        <strong>
                            {denied ? 'Master API key required' : 'Could not refresh call history'}
                        </strong>
                        <p>
                            {denied
                                ? 'Sign out and sign in with the master API key to view calls.'
                                : history.error?.friendlyMessage ||
                                  'Check the proxy connection and try Refresh.'}
                            {data && ' Showing the last successfully loaded data.'}
                        </p>
                    </div>
                </div>
            )}

            {!data && history.isPending && (
                <div className="calls-loading" role="status">
                    <span className="calls-sr-only">Loading call analytics…</span>
                    <div className="calls-skeleton calls-skeleton-strip" />
                    <div className="calls-skeleton calls-skeleton-chart" />
                    <div className="calls-skeleton calls-skeleton-chart" />
                </div>
            )}

            {data && (
                <div className="calls-content">
                    <div className="calls-scope-bar">
                        <div>
                            <Layers size={15} />
                            <strong>{selected?.name || route || 'All services'}</strong>
                            <span>
                                {history.dataUpdatedAt
                                    ? `Updated ${new Date(history.dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`
                                    : 'Waiting for data'}
                            </span>
                        </div>
                        <div className="calls-range">
                            <Clock3 size={14} />
                            <span>Window</span>
                            <div className="calls-segment" aria-label="Time window">
                                {ranges.map((value) => (
                                    <button
                                        key={value}
                                        aria-pressed={analytics.windowMinutes === value}
                                        onClick={() => {
                                            setMinutes(value)
                                            setFilters(INITIAL_FILTERS)
                                        }}
                                    >
                                        {value === 60 ? '1 hour' : `${value} min`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div
                        className="calls-service-selector"
                        aria-label={`Filter by service. Counts cover the last ${serverWindow} minutes.`}
                    >
                        <button
                            className={!route ? 'is-active' : ''}
                            aria-pressed={!route}
                            onClick={() => pick('')}
                        >
                            <Layers size={14} />
                            All services
                            <span>
                                {number(services.reduce((sum, service) => sum + service.last_hour, 0))}
                            </span>
                        </button>
                        {services.map((service) => (
                            <button
                                key={service.route}
                                className={route === service.route ? 'is-active' : ''}
                                aria-pressed={route === service.route}
                                onClick={() => pick(service.route)}
                                title={`${service.route} · ${service.last_hour_errors} failures in ${serverWindow} minutes${!service.configured ? ' · No longer configured' : ''}`}
                            >
                                <i
                                    className={
                                        service.last_hour_errors
                                            ? 'has-errors'
                                            : service.last_hour
                                              ? 'has-traffic'
                                              : ''
                                    }
                                />
                                {service.name}
                                {!service.configured && <small>(removed)</small>}
                                <span>{number(service.last_hour)}</span>
                            </button>
                        ))}
                        {route && !selected && (
                            <button className="is-active" aria-pressed="true" onClick={() => pick('')}>
                                {route}
                                <X size={12} />
                            </button>
                        )}
                        <small className="calls-selector-note">{serverWindow}m totals</small>
                    </div>

                    <div className="calls-metrics">
                        <Metric
                            icon={Activity}
                            label="Total requests"
                            value={number(analytics.total)}
                            color="violet"
                            values={analytics.series.map((b) => b.count)}
                        >
                            {analytics.trend == null ? (
                                <span>Across the last {analytics.windowMinutes} minutes</span>
                            ) : (
                                <span
                                    className="calls-trend"
                                    title={`Last ${analytics.trendMinutes} completed minutes versus the preceding ${analytics.trendMinutes} minutes`}
                                >
                                    {analytics.trend >= 0 ? (
                                        <ArrowUpRight size={13} />
                                    ) : (
                                        <ArrowDownRight size={13} />
                                    )}
                                    {Math.abs(analytics.trend).toFixed(1)}% vs previous{' '}
                                    {analytics.trendMinutes}m
                                </span>
                            )}
                        </Metric>
                        <Metric
                            icon={CheckCheck}
                            label="Success rate"
                            value={
                                analytics.successRate == null ? '—' : `${analytics.successRate.toFixed(1)}%`
                            }
                            color="green"
                            values={analytics.series.map((b) =>
                                b.count ? ((b.count - b.errors) / b.count) * 100 : 0
                            )}
                        >
                            <span>
                                {analytics.total
                                    ? `${number(analytics.total - analytics.errors)} calls without errors`
                                    : 'No traffic in this window'}
                            </span>
                        </Metric>
                        <Metric
                            icon={Clock3}
                            label="Average response"
                            value={duration(analytics.average)}
                            color="cyan"
                            values={analytics.series.map((b) => b.avg_ms)}
                        >
                            <span>Weighted across all calls</span>
                        </Metric>
                        <Metric
                            icon={Gauge}
                            label="P95 response"
                            value={duration(analytics.p95)}
                            color="amber"
                        >
                            <span>95% of retained timings at or below</span>
                        </Metric>
                    </div>

                    <div className="calls-primary-grid">
                        <TrafficPanel key={`${route}-${analytics.windowMinutes}`} analytics={analytics} />
                        <StatusPanel analytics={analytics} />
                    </div>
                    <div className="calls-secondary-grid">
                        <LatencyPanel analytics={analytics} />
                        <ServicePanel
                            services={services}
                            route={route}
                            windowMinutes={serverWindow}
                            onSelect={pick}
                        />
                    </div>
                    <InsightPanel analytics={analytics} onFilter={(outcome) => inspect({ outcome })} />

                    <section className="calls-panel calls-endpoints">
                        <PanelHeading
                            icon={Server}
                            title="Most requested endpoints"
                            subtitle={`Ranked from ${number(analytics.requests.length)} retained calls in this window`}
                        >
                            <span className="calls-tag">{analytics.clients} callers</span>
                        </PanelHeading>
                        {analytics.endpoints.length ? (
                            <div className="calls-endpoint-list">
                                {analytics.endpoints.map((endpoint) => (
                                    <button
                                        key={JSON.stringify([endpoint.method, endpoint.route, endpoint.path])}
                                        className="calls-endpoint"
                                        onClick={() =>
                                            inspect({
                                                search: endpoint.path,
                                                method: endpoint.method || 'all',
                                            })
                                        }
                                    >
                                        <span
                                            className={`calls-method calls-method-${(endpoint.method || '').toLowerCase()}`}
                                        >
                                            {endpoint.method}
                                        </span>
                                        <span className="calls-endpoint-path" title={endpoint.path}>
                                            {endpoint.path}
                                            <small>{endpoint.route}</small>
                                        </span>
                                        <span className="calls-endpoint-bar">
                                            <i
                                                style={{
                                                    width: `${(endpoint.count / analytics.endpoints[0].count) * 100}%`,
                                                }}
                                            />
                                        </span>
                                        <strong>
                                            {number(endpoint.count)}
                                            <small>calls</small>
                                        </strong>
                                        <span
                                            className={
                                                endpoint.errors ? 'calls-text-rose' : 'calls-endpoint-ok'
                                            }
                                        >
                                            {endpoint.errors ? `${endpoint.errors} failed` : 'No failures'}
                                        </span>
                                        <ArrowUpRight size={14} />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="calls-panel-empty">
                                Endpoint rankings appear once requests are recorded.
                            </p>
                        )}
                    </section>

                    <CallExplorer
                        key={`${route}-${analytics.windowMinutes}`}
                        requests={analytics.requests}
                        filters={filters}
                        onFilters={setFilters}
                        capacity={data.capacity}
                        route={route}
                        onClear={() => {
                            clear.reset()
                            setConfirmClear(true)
                        }}
                        clearPending={clear.isPending}
                        explorerRef={explorerRef}
                    />
                    <footer className="calls-data-note">
                        <Info size={15} />
                        <p>
                            Traffic totals cover all calls in the selected window. Status, latency
                            distribution, percentiles, and endpoint insights use the latest{' '}
                            {number(analytics.requests.length)} retained calls in that window. History resets
                            when the proxy restarts. Query strings are excluded and public webhook tokens are
                            masked.
                        </p>
                    </footer>
                </div>
            )}

            {confirmClear && (
                <ClearDialog
                    route={route}
                    pending={clear.isPending}
                    error={clear.error}
                    onCancel={() => setConfirmClear(false)}
                    onConfirm={() => clear.mutate(route || undefined)}
                />
            )}
        </div>
    )
}

function Metric({ icon, label, value, color, values, children }) {
    const Icon = icon
    return (
        <div className={`calls-metric ${color}`}>
            <div className="calls-metric-label">
                <Icon size={15} />
                {label}
            </div>
            <div className="calls-metric-value">
                <strong>{value}</strong>
                {values && <Sparkline values={values} color={`var(--calls-${color})`} />}
            </div>
            <div className="calls-metric-note">{children}</div>
        </div>
    )
}

function ClearDialog({ route, pending, error, onCancel, onConfirm }) {
    const ref = useRef(null)
    useEffect(() => {
        const dialog = ref.current
        dialog.showModal()
        return () => dialog.close()
    }, [])
    return (
        <dialog
            className="calls-dialog"
            ref={ref}
            aria-labelledby="calls-clear-title"
            aria-describedby="calls-clear-description"
            onCancel={(event) => {
                event.preventDefault()
                if (!pending) onCancel()
            }}
        >
            <span className="calls-dialog-icon">
                <Trash2 size={22} />
            </span>
            <h2 id="calls-clear-title">Clear {route ? `${route} history` : 'all call history'}?</h2>
            <p id="calls-clear-description">
                This removes retained requests and traffic counters for {route || 'every service'}. New calls
                will continue to be recorded. This cannot be undone.
            </p>
            {error && (
                <p className="calls-dialog-error" role="alert">
                    {error.friendlyMessage || 'Could not clear history. Try again.'}
                </p>
            )}
            <div>
                <button className="calls-button" autoFocus disabled={pending} onClick={onCancel}>
                    Keep history
                </button>
                <button className="calls-button calls-confirm-delete" disabled={pending} onClick={onConfirm}>
                    {pending ? <RefreshCw size={15} className="calls-spin" /> : <Trash2 size={15} />}
                    {pending ? 'Clearing…' : 'Clear history'}
                </button>
            </div>
        </dialog>
    )
}
