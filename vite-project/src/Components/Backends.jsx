import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import {
    Activity,
    AlertCircle,
    ArrowUpRight,
    Check,
    ChevronDown,
    Database,
    Layers,
    Plus,
    RefreshCw,
    Search,
    Server,
    ShieldCheck,
    Timer,
    Trash2,
    X,
} from 'lucide-react'
import dashboardServices from '../services/dashboard.service'
import { PanelHeading } from './CallCharts'
import {
    ServiceHeader,
    ServiceMetric,
    ServiceState,
    ServiceEmpty,
    ServiceBadge,
    ServiceBars,
    ServiceFooter,
} from './ServiceUI'
import { filterBackends, summarizeBackends } from '../utils/dashboardAnalytics'
import { duration, number } from '../utils/callAnalytics'
import { groupBackendRoutes, measured, pollingOptions, validUrl } from '../utils/serviceAnalytics'

function Backends() {
    const queryClient = useQueryClient()
    const [paused, setPaused] = useState(false)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [removing, setRemoving] = useState(null)
    const [message, setMessage] = useState('')
    const inventoryRef = useRef(null)
    const backends = useQuery({
        queryKey: ['backends'],
        queryFn: dashboardServices.getDashboardDetails,
        ...pollingOptions(paused, 15000),
    })
    const lb = useQuery({
        queryKey: ['lb-stats'],
        queryFn: dashboardServices.getLoadBalancerStats,
        ...pollingOptions(paused, 15000),
    })
    const sources = [
        { ...backends, label: 'Backend health' },
        { ...lb, label: 'Load balancer' },
    ]
    const health = useMemo(() => summarizeBackends(backends.data), [backends.data])
    const routes = useMemo(() => groupBackendRoutes(health.backends), [health.backends])
    const shown = groupBackendRoutes(filterBackends(health.backends, search, status))
    const probeBars = health.backends
        .filter((backend) => backend.response_time != null)
        .sort((a, b) => b.response_time - a.response_time)
        .slice(0, 6)
        .map((backend) => ({
            key: backend.id,
            label: backend.name,
            value: backend.response_time,
            display: duration(backend.response_time),
            color: backend.status === 'unhealthy' ? 'var(--calls-rose)' : 'var(--calls-cyan)',
        }))
    const connections = Object.values(lb.data?.connection_counts || {})
        .filter(measured)
        .reduce((total, count) => total + count, 0)
    const invalidate = () =>
        ['backends', 'lb-stats', 'config', 'routes'].forEach((key) =>
            queryClient.invalidateQueries({ queryKey: [key] })
        )
    const remove = useMutation({
        mutationFn: dashboardServices.removeBackend,
        onSuccess: () => {
            setMessage('Backend removed. The saved route configuration has been updated.')
            setRemoving(null)
            invalidate()
        },
    })
    const {
        register,
        handleSubmit,
        reset,
        setFocus,
        formState: { errors },
    } = useForm({ defaultValues: { route: '', url: '' } })
    const add = useMutation({
        mutationFn: dashboardServices.addBackend,
        onSuccess: () => {
            setMessage('Backend added and saved. Health checks will appear shortly.')
            reset()
            invalidate()
        },
    })
    const inspectRoute = (route) => {
        setSearch(route)
        setStatus('all')
        inventoryRef.current?.scrollIntoView({
            block: 'start',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        })
    }
    const clearFilters = () => {
        setSearch('')
        setStatus('all')
    }
    return (
        <div className="calls-page service-page backends-page">
            <ServiceHeader
                icon={Server}
                title="Backends"
                description="Your service routes, their health, and the instances behind them."
                sources={sources}
                paused={paused}
                onPause={() => setPaused((value) => !value)}
                interval="every 15 seconds"
            />
            <div className="service-content">
                <div className="calls-metrics">
                    <ServiceMetric
                        icon={Layers}
                        label="Registered routes"
                        value={backends.data ? number(health.routes) : null}
                        note={
                            backends.data
                                ? number(health.total) + ' backend instances'
                                : 'Waiting for backend data'
                        }
                    />
                    <ServiceMetric
                        icon={ShieldCheck}
                        label="Healthy instances"
                        value={backends.data ? number(health.healthy) : null}
                        color="green"
                        note={
                            backends.data
                                ? health.unknown + ' awaiting a health result'
                                : 'Waiting for health checks'
                        }
                    />
                    <ServiceMetric
                        icon={AlertCircle}
                        label="Unhealthy instances"
                        value={backends.data ? number(health.unhealthy) : null}
                        color="rose"
                        note="Based on the latest health checks"
                    />
                    <ServiceMetric
                        icon={Activity}
                        label="Tracked connections"
                        value={lb.data ? number(connections) : null}
                        color="cyan"
                        note="Current load-balancer connections"
                    />
                </div>
                {message && (
                    <div className="service-feedback success" role="status">
                        <Check size={16} />
                        <span>{message}</span>
                    </div>
                )}
                <div className="service-grid">
                    <section className="calls-panel">
                        <PanelHeading
                            icon={Layers}
                            title="Route coverage"
                            subtitle="Healthy instances per route. Select a route to inspect it."
                        />
                        <ServiceState query={backends} title="Route health">
                            {routes.length ? (
                                <>
                                    <div className="backend-coverage">
                                        {routes.map((group) => (
                                            <button
                                                key={group.route}
                                                onClick={() => inspectRoute(group.route)}
                                                aria-label={'Inspect route ' + group.route}
                                            >
                                                <span>{group.route}</span>
                                                <span className="backend-coverage-track" aria-hidden="true">
                                                    {[
                                                        ['healthy', '#34d399'],
                                                        ['unhealthy', '#fb7185'],
                                                        ['unknown', '#64748b'],
                                                    ].map(
                                                        ([state, color]) =>
                                                            group[state] > 0 && (
                                                                <i
                                                                    key={state}
                                                                    style={{
                                                                        width:
                                                                            (group[state] /
                                                                                group.instances.length) *
                                                                                100 +
                                                                            '%',
                                                                        background: color,
                                                                    }}
                                                                />
                                                            )
                                                    )}
                                                </span>
                                                <strong>
                                                    {group.healthy}/{group.instances.length} healthy
                                                </strong>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="backend-legend">
                                        {[
                                            ['Healthy', '#34d399'],
                                            ['Unhealthy', '#fb7185'],
                                            ['Unknown', '#64748b'],
                                        ].map(([label, color]) => (
                                            <span key={label}>
                                                <i style={{ background: color }} />
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="service-panel-note">
                                        {routes.filter((route) => route.healthy > 1).length} of{' '}
                                        {routes.length} routes have more than one healthy instance.
                                    </p>
                                </>
                            ) : (
                                <ServiceEmpty
                                    title="No routes registered"
                                    description="Add a backend below to start routing requests."
                                />
                            )}
                        </ServiceState>
                    </section>
                    <section className="calls-panel">
                        <PanelHeading
                            icon={Timer}
                            title="Health-check latency"
                            subtitle="Latest probe response for the six slowest measured instances."
                        />
                        <ServiceState query={backends} title="Probe timings">
                            <ServiceBars
                                items={probeBars}
                                label="Latest health-check latency"
                                emptyText="No probe timings yet"
                            />
                        </ServiceState>
                        <p className="service-panel-note">
                            Probe timings measure the health endpoint. Request latency is available in{' '}
                            <Link className="service-link" to="/calls">
                                Calls <ArrowUpRight size={12} />
                            </Link>
                            .
                        </p>
                    </section>
                </div>
                <div className="service-section-heading" ref={inventoryRef}>
                    <div>
                        <h2>Route inventory</h2>
                        <p>Expand an instance to inspect its probe and manage its registration.</p>
                    </div>
                    <button className="calls-button service-primary-button" onClick={() => setFocus('route')}>
                        <Plus size={15} />
                        Add a backend
                    </button>
                </div>
                <div className="service-workspace">
                    <div className="service-column">
                        <div className="service-toolbar">
                            <label className="calls-search">
                                <Search size={16} />
                                <input
                                    type="search"
                                    aria-label="Search backends"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Find a route, name, or URL…"
                                />
                                {search && (
                                    <button aria-label="Clear backend search" onClick={() => setSearch('')}>
                                        <X size={14} />
                                    </button>
                                )}
                            </label>
                            <div className="calls-segment" aria-label="Backend health filter">
                                {[
                                    ['all', 'All'],
                                    ['healthy', 'Healthy'],
                                    ['unhealthy', 'Unhealthy'],
                                    ['unknown', 'Unknown'],
                                ].map(([value, label]) => (
                                    <button
                                        key={value}
                                        aria-pressed={status === value}
                                        onClick={() => setStatus(value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <ServiceState query={backends} title="Backends">
                            {!shown.length ? (
                                <section className="calls-panel">
                                    <ServiceEmpty
                                        title={
                                            health.total ? 'No matching backends' : 'No backends configured'
                                        }
                                        description={
                                            health.total
                                                ? 'Try another search or show all health states.'
                                                : 'Register a route and its target URL to get started.'
                                        }
                                    >
                                        {health.total > 0 && (
                                            <button className="calls-button" onClick={clearFilters}>
                                                Reset filters
                                            </button>
                                        )}
                                    </ServiceEmpty>
                                </section>
                            ) : (
                                shown.map((group) => (
                                    <section
                                        className="calls-panel backend-route"
                                        key={group.route}
                                        aria-label={'Route ' + group.route}
                                    >
                                        <div className="backend-route-heading">
                                            <div>
                                                <Server size={17} />
                                                <h3>{group.route}</h3>
                                                <span>{group.instances.length} shown</span>
                                            </div>
                                            <Link
                                                className="service-link"
                                                to={'/calls?route=' + encodeURIComponent(group.route)}
                                            >
                                                View calls <ArrowUpRight size={13} />
                                            </Link>
                                        </div>
                                        {group.instances.map((backend) => (
                                            <details className="backend-instance" key={backend.id}>
                                                <summary>
                                                    <div className="backend-instance-name">
                                                        <strong>{backend.name}</strong>
                                                        <span>{backend.url}</span>
                                                    </div>
                                                    <ServiceBadge tone={backend.status}>
                                                        {backend.status}
                                                    </ServiceBadge>
                                                    <ChevronDown size={16} className="service-chevron" />
                                                </summary>
                                                <div className="service-details">
                                                    <div className="service-detail-grid">
                                                        <div>
                                                            <span>Probe response</span>
                                                            <strong>{duration(backend.response_time)}</strong>
                                                        </div>
                                                        <div>
                                                            <span>Last checked</span>
                                                            <strong>
                                                                {backend.last_check
                                                                    ? new Date(
                                                                          backend.last_check * 1000
                                                                      ).toLocaleString()
                                                                    : 'Not checked yet'}
                                                            </strong>
                                                        </div>
                                                        <div>
                                                            <span>HTTP result</span>
                                                            <strong>
                                                                {backend.status_code ?? 'No result'}
                                                            </strong>
                                                        </div>
                                                        <div>
                                                            <span>Health endpoint</span>
                                                            <strong>
                                                                {backend.endpoint_used ||
                                                                    backend.custom_health_route ||
                                                                    '—'}
                                                            </strong>
                                                        </div>
                                                        <div>
                                                            <span>Consecutive successes</span>
                                                            <strong>
                                                                {backend.consecutive_successes ?? '—'}
                                                            </strong>
                                                        </div>
                                                        <div>
                                                            <span>Consecutive failures</span>
                                                            <strong>
                                                                {backend.consecutive_failures ?? '—'}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                    {backend.error && (
                                                        <div className="service-feedback">
                                                            <AlertCircle size={15} />
                                                            <span>{backend.error}</span>
                                                        </div>
                                                    )}
                                                    {backend.response_data != null && (
                                                        <pre aria-label="Health response">
                                                            {typeof backend.response_data === 'string'
                                                                ? backend.response_data
                                                                : JSON.stringify(
                                                                      backend.response_data,
                                                                      null,
                                                                      2
                                                                  )}
                                                        </pre>
                                                    )}
                                                    <div className="service-detail-actions">
                                                        <span className="service-panel-note">
                                                            Registration changes are saved immediately.
                                                        </span>
                                                        <button
                                                            className="calls-button calls-danger-button"
                                                            onClick={() => {
                                                                remove.reset()
                                                                setRemoving(backend)
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                            Remove backend
                                                        </button>
                                                    </div>
                                                </div>
                                            </details>
                                        ))}
                                    </section>
                                ))
                            )}
                        </ServiceState>
                    </div>
                    <div className="service-column">
                        <section className="calls-panel backend-add-panel">
                            <PanelHeading
                                icon={Plus}
                                title="Add a backend"
                                subtitle="Register a target on a new or existing route."
                            />
                            <form
                                className="service-form"
                                onSubmit={handleSubmit((values) => {
                                    setMessage('')
                                    add.mutate({ route: values.route.trim(), url: values.url.trim() })
                                })}
                            >
                                <fieldset disabled={add.isPending}>
                                    <div className="service-field">
                                        <label htmlFor="backend-route">Route</label>
                                        <input
                                            id="backend-route"
                                            placeholder="/app1"
                                            aria-invalid={Boolean(errors.route)}
                                            aria-describedby={
                                                errors.route ? 'backend-route-error' : undefined
                                            }
                                            {...register('route', {
                                                validate: (value) =>
                                                    /^\/\S*$/.test(value.trim()) ||
                                                    'Start with / and use no spaces.',
                                            })}
                                        />
                                        {errors.route && (
                                            <small id="backend-route-error" className="service-field-error">
                                                {errors.route.message}
                                            </small>
                                        )}
                                    </div>
                                    <div className="service-field">
                                        <label htmlFor="backend-url">Backend URL</label>
                                        <input
                                            id="backend-url"
                                            placeholder="http://127.0.0.1:3001"
                                            aria-invalid={Boolean(errors.url)}
                                            aria-describedby={errors.url ? 'backend-url-error' : undefined}
                                            {...register('url', {
                                                validate: (value) =>
                                                    validUrl(value) ||
                                                    'Enter a valid http:// or https:// URL.',
                                            })}
                                        />
                                        {errors.url && (
                                            <small id="backend-url-error" className="service-field-error">
                                                {errors.url.message}
                                            </small>
                                        )}
                                    </div>
                                </fieldset>
                                {add.isError && (
                                    <div className="service-feedback" role="alert">
                                        <AlertCircle size={15} />
                                        <span>
                                            {add.error?.friendlyMessage ||
                                                'Could not add the backend. Try again.'}
                                        </span>
                                    </div>
                                )}
                                <button
                                    className="calls-button service-primary-button"
                                    disabled={add.isPending}
                                    type="submit"
                                >
                                    {add.isPending ? (
                                        <RefreshCw size={15} className="calls-spin" />
                                    ) : (
                                        <Plus size={15} />
                                    )}
                                    {add.isPending ? 'Adding…' : 'Add backend'}
                                </button>
                                <p className="service-inline-note">
                                    <Database size={16} />
                                    <span>
                                        Changes are saved and survive restarts. A master API key is required
                                        to add or remove backends.
                                    </span>
                                </p>
                            </form>
                        </section>
                        <section className="calls-panel">
                            <PanelHeading
                                icon={Activity}
                                title="Load balancer"
                                subtitle="Live connection and routing state."
                            />
                            <ServiceState query={lb} title="Load balancer">
                                <dl className="service-data-list">
                                    <div>
                                        <dt>Tracked connections</dt>
                                        <dd>{number(connections)}</dd>
                                    </div>
                                    <div>
                                        <dt>Socket.IO sessions</dt>
                                        <dd>{lb.data?.socketio_sessions ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt>Backends in cooldown</dt>
                                        <dd>
                                            {lb.data?.failed_backends
                                                ? Object.keys(lb.data.failed_backends).length
                                                : '—'}
                                        </dd>
                                    </div>
                                </dl>
                            </ServiceState>
                        </section>
                    </div>
                </div>
                <ServiceFooter sources={sources}>
                    Health reflects the latest probe, not uptime. Unknown instances are waiting for a result.
                    Connection counts are a current snapshot.
                </ServiceFooter>
            </div>
            {removing && (
                <RemoveBackendDialog
                    backend={removing}
                    last={routes.find((route) => route.route === removing.route)?.instances.length === 1}
                    pending={remove.isPending}
                    error={remove.error}
                    onCancel={() => setRemoving(null)}
                    onConfirm={() => remove.mutate({ route: removing.route, url: removing.url })}
                />
            )}
        </div>
    )
}

function RemoveBackendDialog({ backend, last, pending, error, onCancel, onConfirm }) {
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
            aria-labelledby="remove-backend-title"
            aria-describedby="remove-backend-description"
            onCancel={(event) => {
                event.preventDefault()
                if (!pending) onCancel()
            }}
        >
            <span className="calls-dialog-icon">
                <Trash2 size={22} />
            </span>
            <h2 id="remove-backend-title">Remove this backend?</h2>
            <p id="remove-backend-description">
                {backend.url} will be removed from {backend.route}.
                {last
                    ? ' This is the last instance, so the route will also be removed.'
                    : ' New requests will use the remaining instances.'}{' '}
                This change is saved immediately.
            </p>
            {error && (
                <p className="calls-dialog-error" role="alert">
                    {error.friendlyMessage || 'Could not remove this backend. Try again.'}
                </p>
            )}
            <div>
                <button className="calls-button" autoFocus disabled={pending} onClick={onCancel}>
                    Keep backend
                </button>
                <button className="calls-button calls-confirm-delete" disabled={pending} onClick={onConfirm}>
                    {pending ? 'Removing…' : 'Remove backend'}
                </button>
            </div>
        </dialog>
    )
}

export default Backends
