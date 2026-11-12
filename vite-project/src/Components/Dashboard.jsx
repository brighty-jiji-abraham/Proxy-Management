import { useMemo, useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
    Activity,
    AlertCircle,
    ArrowUpRight,
    CheckCheck,
    ChevronDown,
    Clock3,
    Gauge,
    Globe,
    Info,
    Layers,
    Network,
    Pause,
    Play,
    Plus,
    Radio,
    RefreshCw,
    Search,
    Server,
    Settings2,
    ShieldCheck,
    Timer,
    X,
} from 'lucide-react'
import dashboardServices from '../services/dashboard.service'
import { PanelHeading, TrafficPanel } from './CallCharts'
import { analyzeCalls, duration, number } from '../utils/callAnalytics'
import {
    filterBackends,
    summarizeBackends,
    summarizeMonitoring,
    uptimeLabel,
} from '../utils/dashboardAnalytics'
import './CallHistory.css'
import './Dashboard.css'

const SOURCES = [
    { label: 'Backend health', queryKey: ['backends'], queryFn: dashboardServices.getDashboardDetails },
    { label: 'Request metrics', queryKey: ['metrics'], queryFn: dashboardServices.getMetricsDetails },
    { label: 'Configuration', queryKey: ['config'], queryFn: dashboardServices.getConfigDetails },
    {
        label: 'Traffic',
        queryKey: ['dashboard-traffic'],
        queryFn: () => dashboardServices.getServiceRequests({ limit: 100 }),
    },
    { label: 'Tunnel', queryKey: ['tunnel'], queryFn: dashboardServices.getTunnelStatus },
    {
        label: 'WebSockets',
        queryKey: ['websocket-sessions'],
        queryFn: dashboardServices.getWebsocketSessions,
    },
]

export default function Dashboard() {
    const [paused, setPaused] = useState(false)
    const [minutes, setMinutes] = useState(60)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const backendRef = useRef(null)
    const queries = useQueries({
        queries: SOURCES.map((source) => ({
            queryKey: source.queryKey,
            queryFn: source.queryFn,
            refetchInterval: paused ? false : 15000,
            refetchOnWindowFocus: !paused,
            refetchOnReconnect: !paused,
            retry: (count, error) => ![401, 403].includes(error.statusCode) && count < 1,
        })),
    })
    const [backends, metrics, config, traffic, tunnel, sockets] = queries
    const health = useMemo(() => summarizeBackends(backends.data), [backends.data])
    const monitoring = useMemo(() => summarizeMonitoring(metrics.data), [metrics.data])
    const analytics = useMemo(() => analyzeCalls(traffic.data?.data, minutes), [traffic.data, minutes])
    const failed = SOURCES.filter((_, index) => queries[index].isError)
    const fetching = queries.some((query) => query.isFetching)
    const loading = queries.every((query) => query.isPending)
    const lastUpdated = Math.min(...queries.map((query) => query.dataUpdatedAt).filter(Boolean))
    const serverWindow = traffic.data?.data?.window_minutes || 60
    const ranges = [...new Set([15, 30, 60, serverWindow].filter((value) => value <= serverWindow))].sort(
        (a, b) => a - b
    )
    const healthTone =
        backends.isError || !backends.data
            ? 'amber'
            : health.unhealthy
              ? 'rose'
              : !health.total || health.unknown
                ? 'amber'
                : 'green'
    const healthTitle = backends.isError
        ? 'Backend health could not refresh'
        : backends.isPending
          ? 'Checking your backends'
          : !health.total
            ? 'Your services start here'
            : health.unhealthy
              ? `${health.unhealthy} backend${health.unhealthy === 1 ? '' : 's'} need${health.unhealthy === 1 ? 's' : ''} attention`
              : health.unknown
                ? `${health.unknown} backend${health.unknown === 1 ? '' : 's'} awaiting a health check`
                : 'All backends are responding'
    const inspectHealth = (status) => {
        setStatusFilter(status)
        setSearch('')
        backendRef.current?.scrollIntoView({
            block: 'start',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        })
    }

    return (
        <div className="calls-page dashboard-page">
            <header className="calls-header">
                <div>
                    <div className="calls-page-title">
                        <span className="calls-title-icon">
                            <Gauge size={23} />
                        </span>
                        <h1>Mission control</h1>
                    </div>
                    <p>Your proxy at a glance. Traffic, health, and the details that matter.</p>
                </div>
                <div className="calls-header-actions">
                    <button
                        className={`calls-live-control ${paused || failed.length ? 'is-paused' : ''}`}
                        aria-label={paused ? 'Resume dashboard updates' : 'Pause dashboard updates'}
                        aria-pressed={!paused}
                        onClick={() => setPaused((value) => !value)}
                        title="Refresh every 15 seconds"
                    >
                        <i />
                        {failed.length
                            ? 'Partial data'
                            : paused
                              ? 'Paused'
                              : loading
                                ? 'Connecting'
                                : 'Live updates'}
                        {paused ? <Play size={13} /> : <Pause size={13} />}
                    </button>
                    <button
                        className="calls-button"
                        onClick={() => queries.forEach((query) => query.refetch())}
                        disabled={fetching}
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
                        <strong>Some dashboard data could not refresh</strong>
                        <p>
                            {failed.map((source) => source.label).join(', ')}. Available snapshots remain
                            visible. Use Refresh all to try again.
                        </p>
                    </div>
                </div>
            )}

            <div className="dashboard-content">
                <section
                    className={`dashboard-health-banner ${healthTone}`}
                    aria-label="Backend health summary"
                >
                    <span className="dashboard-health-icon">
                        {healthTone === 'green' ? (
                            <ShieldCheck size={24} />
                        ) : backends.isPending ? (
                            <RefreshCw size={24} className="calls-spin" />
                        ) : (
                            <Server size={24} />
                        )}
                    </span>
                    <div className="dashboard-health-message">
                        <h2>{healthTitle}</h2>
                        <p>
                            {backends.data
                                ? health.total
                                    ? `${health.healthy} healthy, ${health.unhealthy} unhealthy, ${health.unknown} unknown across ${health.routes} routes.`
                                    : 'Add a backend to start routing requests and monitoring its health.'
                                : 'Health information appears as soon as the proxy responds.'}
                        </p>
                    </div>
                    <div className="dashboard-uptime">
                        <Clock3 size={15} />
                        <div>
                            <span>Process uptime</span>
                            <strong>{uptimeLabel(monitoring.uptime)}</strong>
                        </div>
                    </div>
                    <Link to="/backends" className="dashboard-text-link">
                        {health.total ? 'Manage backends' : 'Add a backend'}
                        <ArrowUpRight size={15} />
                    </Link>
                </section>

                <div className="calls-metrics dashboard-metrics">
                    <Metric
                        icon={Activity}
                        label="Monitored requests"
                        value={monitoring.total == null ? '—' : number(monitoring.total)}
                        note="Since monitoring started or reset"
                        color="violet"
                    />
                    <Metric
                        icon={Clock3}
                        label="Average response"
                        value={duration(monitoring.average)}
                        note="Up to 1,000 recent requests"
                        color="cyan"
                    />
                    <Metric
                        icon={AlertCircle}
                        label="HTTP error rate"
                        value={monitoring.errorRate == null ? '—' : `${monitoring.errorRate.toFixed(2)}%`}
                        note={
                            monitoring.errors == null
                                ? 'Waiting for monitoring data'
                                : `${number(monitoring.errors)} responses with status 400+`
                        }
                        color={monitoring.errors ? 'rose' : 'green'}
                    />
                    <Metric
                        icon={Gauge}
                        label="Average throughput"
                        value={monitoring.rpm == null ? '—' : monitoring.rpm.toFixed(1)}
                        suffix="req/min"
                        note="Average since monitoring started"
                        color="amber"
                    />
                </div>

                <div className="dashboard-section-heading">
                    <div>
                        <h2>Traffic overview</h2>
                        <p>Service calls across all routes</p>
                    </div>
                    <div className="dashboard-window-controls">
                        <div className="calls-segment" aria-label="Dashboard traffic window">
                            {ranges.map((value) => (
                                <button
                                    key={value}
                                    aria-pressed={analytics.windowMinutes === value}
                                    onClick={() => setMinutes(value)}
                                >
                                    {value === 60 ? '1 hour' : `${value} min`}
                                </button>
                            ))}
                        </div>
                        <Link to="/calls" className="dashboard-text-link">
                            Explore calls
                            <ArrowUpRight size={14} />
                        </Link>
                    </div>
                </div>
                <div className="dashboard-primary-grid">
                    {traffic.data ? (
                        <TrafficPanel analytics={analytics} />
                    ) : (
                        <section className="calls-panel">
                            <PanelHeading
                                icon={Activity}
                                title="Request activity"
                                subtitle="Per-minute volume and latency"
                            />
                            <SourceState query={traffic} name="traffic history" />
                        </section>
                    )}
                    <HealthPanel health={health} query={backends} onInspect={inspectHealth} />
                </div>

                <div className="dashboard-secondary-grid">
                    <ResponsePanel monitoring={monitoring} query={metrics} />
                    <PopularPaths monitoring={monitoring} query={metrics} />
                </div>

                <BackendInventory
                    health={health}
                    query={backends}
                    search={search}
                    onSearch={setSearch}
                    status={statusFilter}
                    onStatus={setStatusFilter}
                    inventoryRef={backendRef}
                />

                <div className="dashboard-bottom-grid">
                    <ConnectionPanel tunnel={tunnel} sockets={sockets} />
                    <ConfigPanel query={config} />
                </div>

                <footer className="calls-data-note">
                    <Info size={15} />
                    <p>
                        Monitoring totals are cumulative since start or reset; response-time averages use up
                        to 1,000 recent monitored requests. Traffic charts include service calls and proxy
                        refusals in the selected window. Backend health is the latest probe result, not an
                        uptime percentage.{' '}
                        {Number.isFinite(lastUpdated) &&
                            `Oldest available snapshot: ${new Date(lastUpdated).toLocaleTimeString([], { hour12: false })}.`}
                    </p>
                </footer>
            </div>
        </div>
    )
}

function Metric({ icon, label, value, suffix, note, color }) {
    const Icon = icon
    return (
        <div className={`calls-metric ${color}`}>
            <div className="calls-metric-label">
                <Icon size={15} />
                {label}
            </div>
            <div className="calls-metric-value">
                <strong>
                    {value}
                    {suffix && <small>{suffix}</small>}
                </strong>
            </div>
            <div className="calls-metric-note">{note}</div>
        </div>
    )
}

function SourceState({ query, name }) {
    if (query.isPending)
        return (
            <div className="dashboard-source-loading" role="status" aria-label={`Loading ${name}`}>
                <div />
                <div />
                <div />
            </div>
        )
    const denied = [401, 403].includes(query.error?.statusCode)
    return (
        <div className="dashboard-source-empty">
            <AlertCircle size={23} />
            <strong>{name[0].toUpperCase() + name.slice(1)} unavailable</strong>
            <p>
                {denied
                    ? `Sign in with the master API key to view ${name}.`
                    : query.error?.friendlyMessage ||
                      'The proxy could not provide this data. Try Refresh all.'}
            </p>
        </div>
    )
}

function HealthPanel({ health, query, onInspect }) {
    const groups = [
        { key: 'healthy', label: 'Healthy', color: '#34d399', count: health.healthy },
        { key: 'unhealthy', label: 'Unhealthy', color: '#fb7185', count: health.unhealthy },
        { key: 'unknown', label: 'Awaiting checks', color: '#94a3b8', count: health.unknown },
    ]
    return (
        <section className="calls-panel dashboard-health-panel">
            <PanelHeading icon={ShieldCheck} title="Backend health" subtitle="Latest health-check results">
                <span className="calls-tag">{health.routes} routes</span>
            </PanelHeading>
            {!query.data ? (
                <SourceState query={query} name="backend health" />
            ) : (
                <>
                    <div className="dashboard-health-ring">
                        <svg
                            viewBox="0 0 180 180"
                            role="img"
                            aria-label={`${health.healthy} healthy, ${health.unhealthy} unhealthy, ${health.unknown} unknown backends`}
                        >
                            <circle cx="90" cy="90" r="72" fill="none" stroke="#263249" strokeWidth="10" />
                            {groups.map(
                                (group, index) =>
                                    group.count > 0 && (
                                        <circle
                                            key={group.key}
                                            cx="90"
                                            cy="90"
                                            r="72"
                                            fill="none"
                                            stroke={group.color}
                                            strokeWidth="10"
                                            pathLength="100"
                                            strokeDasharray={`${Math.max(0.1, (group.count / health.total) * 100 - 1.2)} 100`}
                                            strokeDashoffset={
                                                (-groups
                                                    .slice(0, index)
                                                    .reduce((sum, item) => sum + item.count, 0) /
                                                    health.total) *
                                                100
                                            }
                                            transform="rotate(-90 90 90)"
                                        />
                                    )
                            )}
                        </svg>
                        <div>
                            <strong>
                                {health.total ? `${health.healthy}` : '—'}
                                {health.total > 0 && <small> / {health.total}</small>}
                            </strong>
                            <span>{health.total ? 'backends healthy' : 'No backends yet'}</span>
                        </div>
                    </div>
                    <div className="dashboard-health-legend">
                        {groups.map((group) => (
                            <button key={group.key} onClick={() => onInspect(group.key)}>
                                <span>
                                    <i style={{ background: group.color }} />
                                    {group.label}
                                </span>
                                <strong>{group.count}</strong>
                                <ArrowUpRight size={13} />
                            </button>
                        ))}
                    </div>
                    <p className="dashboard-panel-note">
                        {health.total
                            ? 'Select a status to inspect the matching backends.'
                            : 'Configure your first backend to start health monitoring.'}
                    </p>
                </>
            )}
        </section>
    )
}

function ResponsePanel({ monitoring, query }) {
    return (
        <section className="calls-panel">
            <PanelHeading
                icon={CheckCheck}
                title="HTTP responses"
                subtitle="Status codes since monitoring started or reset"
            >
                <span className="calls-tag">
                    {monitoring.statusTotal ? number(monitoring.statusTotal) : '0'} responses
                </span>
            </PanelHeading>
            {!query.data ? (
                <SourceState query={query} name="response metrics" />
            ) : !monitoring.statusTotal ? (
                <EmptyPanel
                    icon={Activity}
                    title="No responses recorded"
                    description="HTTP status codes will appear as monitored requests complete."
                />
            ) : (
                <>
                    <div
                        className="dashboard-response-bar"
                        role="img"
                        aria-label={monitoring.statuses
                            .map((status) => `HTTP ${status.code}: ${status.count}`)
                            .join(', ')}
                    >
                        {monitoring.statuses.map((status) => (
                            <span
                                key={status.code}
                                style={{
                                    width: `${(status.count / monitoring.statusTotal) * 100}%`,
                                    background: status.color,
                                }}
                                title={`HTTP ${status.code}: ${number(status.count)}`}
                            />
                        ))}
                    </div>
                    <div className="dashboard-response-legend">
                        {monitoring.statuses.map((status) => (
                            <div key={status.code}>
                                <span>
                                    <i style={{ background: status.color }} />
                                    HTTP {status.code}
                                </span>
                                <strong>{number(status.count)}</strong>
                                <span>{((status.count / monitoring.statusTotal) * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    )
}

function PopularPaths({ monitoring, query }) {
    const max = Math.max(1, ...monitoring.paths.map(([, count]) => count))
    return (
        <section className="calls-panel">
            <PanelHeading
                icon={Globe}
                title="Most requested paths"
                subtitle="Top five paths since monitoring started or reset"
            />
            {!query.data ? (
                <SourceState query={query} name="path metrics" />
            ) : !monitoring.paths.length ? (
                <EmptyPanel
                    icon={Globe}
                    title="Waiting for requests"
                    description="Your most-used paths will appear here as traffic arrives."
                />
            ) : (
                <div className="dashboard-paths">
                    {monitoring.paths.map(([path, count]) => (
                        <div key={path}>
                            <div>
                                <span title={path}>{path}</span>
                                <strong>{number(count)}</strong>
                            </div>
                            <div className="dashboard-path-track">
                                <span style={{ width: `${(count / max) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}

function BackendInventory({ health, query, search, onSearch, status, onStatus, inventoryRef }) {
    const rows = filterBackends(health.backends, search, status)
    const max = Math.max(1, ...health.backends.map((backend) => backend.response_time || 0))
    return (
        <section
            className="calls-panel dashboard-inventory"
            ref={inventoryRef}
            aria-label="Backend inventory"
        >
            <PanelHeading
                icon={Server}
                title="Your backends"
                subtitle="Health, response times, and routing details in one place"
            >
                <Link to="/backends" className="calls-button">
                    <Plus size={14} />
                    Manage backends
                </Link>
            </PanelHeading>
            <div className="dashboard-inventory-toolbar">
                <label className="calls-search">
                    <Search size={15} />
                    <input
                        type="search"
                        aria-label="Search backends"
                        placeholder="Find a backend, route, URL, or error…"
                        value={search}
                        onChange={(event) => onSearch(event.target.value)}
                    />
                    {search && (
                        <button aria-label="Clear backend search" onClick={() => onSearch('')}>
                            <X size={14} />
                        </button>
                    )}
                </label>
                <div className="calls-segment" aria-label="Backend health filter">
                    {[
                        ['all', 'All', health.total],
                        ['healthy', 'Healthy', health.healthy],
                        ['unhealthy', 'Unhealthy', health.unhealthy],
                        ['unknown', 'Unknown', health.unknown],
                    ].map(([value, label, count]) => (
                        <button key={value} aria-pressed={status === value} onClick={() => onStatus(value)}>
                            {label}
                            <span>{count}</span>
                        </button>
                    ))}
                </div>
            </div>
            {!query.data ? (
                <SourceState query={query} name="backends" />
            ) : !rows.length ? (
                <EmptyPanel
                    icon={Server}
                    title={health.total ? 'No matching backends' : 'No backends configured'}
                    description={
                        health.total
                            ? 'Try a different search or show all health states.'
                            : 'Add a service URL to start routing traffic through your proxy.'
                    }
                >
                    {health.total ? (
                        <button
                            className="calls-button"
                            onClick={() => {
                                onSearch('')
                                onStatus('all')
                            }}
                        >
                            Reset filters
                        </button>
                    ) : (
                        <Link className="calls-button" to="/backends">
                            <Plus size={14} />
                            Add a backend
                        </Link>
                    )}
                </EmptyPanel>
            ) : (
                <div className="dashboard-backend-list">
                    {rows.map((backend) => (
                        <details className="dashboard-backend" key={backend.id}>
                            <summary>
                                <span className={`dashboard-backend-icon ${backend.status}`}>
                                    <Server size={18} />
                                </span>
                                <div className="dashboard-backend-name">
                                    <strong>{backend.name}</strong>
                                    <span title={backend.url}>{backend.url || 'No URL available'}</span>
                                </div>
                                <span className="dashboard-route" title={backend.route}>
                                    {backend.route}
                                </span>
                                <div className="dashboard-backend-latency">
                                    <strong>{duration(backend.response_time)}</strong>
                                    <div>
                                        <i
                                            style={{
                                                width: `${backend.response_time == null ? 0 : Math.max(2, (backend.response_time / max) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <span>Health-check latency</span>
                                </div>
                                <span className={`dashboard-status ${backend.status}`}>
                                    <i />
                                    {backend.status === 'unknown'
                                        ? 'Unknown'
                                        : backend.status === 'healthy'
                                          ? 'Healthy'
                                          : 'Unhealthy'}
                                </span>
                                <ChevronDown size={15} className="dashboard-backend-chevron" />
                            </summary>
                            <div className="dashboard-backend-details">
                                <div>
                                    <span>Route</span>
                                    <strong>{backend.route}</strong>
                                </div>
                                <div>
                                    <span>Last checked</span>
                                    <strong>
                                        {backend.last_check
                                            ? new Date(backend.last_check * 1000).toLocaleString()
                                            : 'Not checked yet'}
                                    </strong>
                                </div>
                                <div>
                                    <span>Health endpoint</span>
                                    <strong>
                                        {backend.endpoint_used ||
                                            backend.custom_health_route ||
                                            'Automatic discovery'}
                                    </strong>
                                </div>
                                <div>
                                    <span>Probe response</span>
                                    <strong>
                                        {backend.status_code == null
                                            ? 'No HTTP response recorded'
                                            : `HTTP ${backend.status_code}`}
                                    </strong>
                                </div>
                                <div>
                                    <span>Consecutive checks</span>
                                    <strong>
                                        {backend.consecutive_failures || 0} failed /{' '}
                                        {backend.consecutive_successes || 0} successful
                                    </strong>
                                </div>
                                <Link
                                    to={`/calls?route=${encodeURIComponent(backend.route)}`}
                                    className="dashboard-text-link"
                                >
                                    View service calls
                                    <ArrowUpRight size={14} />
                                </Link>
                                {backend.error && (
                                    <p className="dashboard-probe-error">
                                        <AlertCircle size={15} />
                                        {backend.error}
                                    </p>
                                )}
                                {backend.response_data != null && (
                                    <div className="dashboard-probe-response">
                                        <span>Probe response body</span>
                                        <pre>{JSON.stringify(backend.response_data, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        </details>
                    ))}
                </div>
            )}
            <div className="dashboard-inventory-footer">
                <span>
                    {rows.length} of {health.total} backends shown
                </span>
                <span>Expand a backend for probe details</span>
            </div>
        </section>
    )
}

function ConnectionPanel({ tunnel, sockets }) {
    const t = tunnel.data?.data
    const ws = sockets.data?.data
    return (
        <section className="calls-panel">
            <PanelHeading icon={Network} title="Connections" subtitle="Tunnel and WebSocket activity" />
            <div className="dashboard-connection">
                <div className="dashboard-connection-heading">
                    <span>
                        <Radio size={17} />
                        Outbound tunnel
                    </span>
                    <Link to="/tunnel" className="dashboard-text-link">
                        Details
                        <ArrowUpRight size={14} />
                    </Link>
                </div>
                {!t ? (
                    <SourceState query={tunnel} name="tunnel status" />
                ) : (
                    <>
                        <span
                            className={`dashboard-status ${t.connected ? 'healthy' : t.configured ? 'unhealthy' : 'unknown'}`}
                        >
                            <i />
                            {t.connected ? 'Connected' : t.configured ? 'Disconnected' : 'Not configured'}
                        </span>
                        <div className="dashboard-connection-stats">
                            <div>
                                <strong>{number(t.requests_served)}</strong>
                                <span>Requests served</span>
                            </div>
                            <div>
                                <strong>{number(t.requests_in_flight)}</strong>
                                <span>In flight</span>
                            </div>
                            <div>
                                <strong>{number(t.reconnects)}</strong>
                                <span>Reconnects</span>
                            </div>
                        </div>
                        {t.connected && (
                            <p className="dashboard-panel-note">
                                Connected for {uptimeLabel(t.connected_seconds)}
                            </p>
                        )}
                        {!t.connected && t.last_error && (
                            <p className="dashboard-connection-error">{t.last_error}</p>
                        )}
                    </>
                )}
            </div>
            <div className="dashboard-connection">
                <div className="dashboard-connection-heading">
                    <span>
                        <Network size={17} />
                        WebSocket connections
                    </span>
                </div>
                {!ws ? (
                    <SourceState query={sockets} name="WebSocket status" />
                ) : (
                    <div className="dashboard-connection-stats">
                        <div>
                            <strong>{number(ws.active_connections)}</strong>
                            <span>Active clients</span>
                        </div>
                        <div>
                            <strong>{number(ws.backend_connections)}</strong>
                            <span>Backend links</span>
                        </div>
                        <div>
                            <strong>{number(ws.sticky_sessions)}</strong>
                            <span>Sticky sessions</span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

function ConfigPanel({ query }) {
    const config = query.data
    const strategy = config?.load_balancer_strategy?.replaceAll('_', ' ')
    return (
        <section className="calls-panel">
            <PanelHeading icon={Settings2} title="Proxy configuration" subtitle="Current runtime settings" />
            {!config ? (
                <SourceState query={query} name="configuration" />
            ) : (
                <>
                    <dl className="dashboard-config-list">
                        <ConfigRow icon={Layers} label="Load balancing" value={strategy || '—'} />
                        <ConfigRow
                            icon={ShieldCheck}
                            label="Rate limiting"
                            value={
                                config.rate_limit_enabled
                                    ? `${number(config.rate_limit_requests)} requests / minute`
                                    : config.rate_limit_enabled === false
                                      ? 'Disabled'
                                      : '—'
                            }
                        />
                        <ConfigRow
                            icon={Timer}
                            label="Request timeout"
                            value={config.request_timeout == null ? '—' : `${config.request_timeout} seconds`}
                        />
                        <ConfigRow
                            icon={Server}
                            label="Configured routes"
                            value={Object.keys(config.backend_routes || {}).length}
                        />
                        <ConfigRow
                            icon={CheckCheck}
                            label="API key header"
                            value={config.api_key_header || '—'}
                        />
                    </dl>
                    <div className="dashboard-shortcuts">
                        <Link to="/generate-key">
                            <ShieldCheck size={16} />
                            <span>Create an API key</span>
                            <ArrowUpRight size={14} />
                        </Link>
                        <Link to="/list-keys">
                            <Layers size={16} />
                            <span>Manage API keys</span>
                            <ArrowUpRight size={14} />
                        </Link>
                    </div>
                </>
            )}
        </section>
    )
}

function ConfigRow({ icon, label, value }) {
    const Icon = icon
    return (
        <div>
            <dt>
                <Icon size={15} />
                {label}
            </dt>
            <dd>{value}</dd>
        </div>
    )
}

function EmptyPanel({ icon, title, description, children }) {
    const Icon = icon
    return (
        <div className="dashboard-source-empty">
            <Icon size={26} />
            <strong>{title}</strong>
            <p>{description}</p>
            {children}
        </div>
    )
}
