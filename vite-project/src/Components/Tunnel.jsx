import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
    Activity,
    AlertCircle,
    Check,
    Clock3,
    Info,
    Network,
    Radio,
    RefreshCw,
    Repeat,
    Save,
    Settings2,
    ShieldCheck,
    Timer,
} from 'lucide-react'
import dashboardServices from '../services/dashboard.service'
import { PanelHeading, TrafficPanel } from './CallCharts'
import CallExplorer from './CallExplorer'
import TunnelConnectionMap from './TunnelConnectionMap'
import {
    ServiceHeader,
    ServiceMetric,
    ServiceBanner,
    ServiceBadge,
    ServiceState,
    ServiceFooter,
} from './ServiceUI'
import { analyzeCalls, duration, number } from '../utils/callAnalytics'
import { uptimeLabel } from '../utils/dashboardAnalytics'
import { measured, pollingOptions, tunnelPayload, validUrl } from '../utils/serviceAnalytics'

function Tunnel() {
    const explorerRef = useRef(null)
    const [paused, setPaused] = useState(false)
    const [minutes, setMinutes] = useState(60)
    const [filters, setFilters] = useState({ search: '', outcome: 'all', method: 'all', page: 0 })
    const tunnel = useQuery({
        queryKey: ['tunnel'],
        queryFn: dashboardServices.getTunnelStatus,
        ...pollingOptions(paused, 5000),
    })
    const activity = useQuery({
        queryKey: ['tunnel-requests'],
        queryFn: () => dashboardServices.getTunnelRequests(100),
        ...pollingOptions(paused, 10000),
    })
    const config = useQuery({
        queryKey: ['tunnel-config'],
        queryFn: dashboardServices.getTunnelConfig,
        ...pollingOptions(true, 0),
    })
    const sources = [
        { ...tunnel, label: 'Tunnel status' },
        { ...activity, label: 'Tunnel activity' },
        { ...config, label: 'Tunnel settings' },
    ]
    const data = tunnel.data?.data
    const analytics = useMemo(() => analyzeCalls(activity.data?.data, minutes), [activity.data, minutes])
    const serverWindow = activity.data?.data?.window_minutes || 60
    const ranges = [...new Set([15, 30, 60, serverWindow].filter((value) => value <= serverWindow))].sort(
        (a, b) => a - b
    )
    const tone = tunnel.isError
        ? 'amber'
        : !data
          ? 'unknown'
          : data.connected
            ? 'healthy'
            : data.configured
              ? 'unhealthy'
              : 'unknown'
    const statusTitle = tunnel.isError
        ? 'Connection status unavailable'
        : !data
          ? 'Checking the tunnel'
          : data.connected
            ? 'Tunnel connected'
            : data.configured
              ? 'Tunnel disconnected'
              : 'Running locally'
    const statusDescription = tunnel.isError
        ? 'Refresh to check the link. Any previous snapshot is shown below.'
        : !data
          ? 'Waiting for the proxy to report its connection.'
          : data.connected
            ? 'The tunnel head has accepted this client. Requests can reach the local target.'
            : data.configured
              ? 'The tunnel has not reported an active connection. Review its settings and latest error below.'
              : 'No tunnel head is configured. Add your connection settings below to publish local services.'
    return (
        <div className="calls-page service-page tunnel-page">
            <ServiceHeader
                icon={Radio}
                title="Tunnel"
                description="Follow the connection from your public server to this machine."
                sources={sources}
                paused={paused}
                onPause={() => {
                    if (paused) {
                        tunnel.refetch()
                        activity.refetch()
                    }
                    setPaused((value) => !value)
                }}
                interval="every 5 seconds; traffic every 10 seconds"
            />
            <div className="service-content">
                <ServiceBanner
                    icon={data?.connected && !tunnel.isError ? ShieldCheck : Radio}
                    tone={tone}
                    title={statusTitle}
                    description={statusDescription}
                >
                    <span>Connected for</span>
                    <strong>{data?.connected ? uptimeLabel(data.connected_seconds) : '—'}</strong>
                </ServiceBanner>
                <div className="calls-metrics">
                    <ServiceMetric
                        icon={Activity}
                        label="Requests served"
                        value={measured(data?.requests_served) ? number(data.requests_served) : null}
                        note="Since the tunnel client started"
                    />
                    <ServiceMetric
                        icon={Clock3}
                        label="In flight"
                        value={data?.requests_in_flight}
                        note="Requests being forwarded now"
                        color="cyan"
                    />
                    <ServiceMetric
                        icon={Network}
                        label="WebSocket sessions"
                        value={data?.websocket_sessions}
                        note="Currently open through the tunnel"
                        color="green"
                    />
                    <ServiceMetric
                        icon={Repeat}
                        label="Reconnects"
                        value={data?.reconnects}
                        note="Total since the client started"
                        color="amber"
                    />
                </div>
                <section className="calls-panel">
                    <PanelHeading
                        icon={Network}
                        title="Connection map"
                        subtitle="The tunnel client connects outward; incoming requests travel to the local target."
                    />
                    <ServiceState query={tunnel} title="Connection details">
                        <TunnelConnectionMap
                            data={data}
                            updatedAt={tunnel.dataUpdatedAt}
                            paused={paused}
                            unavailable={tunnel.isError}
                            onInspectRequests={() => {
                                explorerRef.current?.scrollIntoView({
                                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                                        ? 'instant'
                                        : 'smooth',
                                    block: 'start',
                                })
                                explorerRef.current
                                    ?.querySelector('input[type="search"]')
                                    ?.focus({ preventScroll: true })
                            }}
                        />
                        {data?.last_error && data.configured && (
                            <div className="service-feedback" role="status">
                                <AlertCircle size={16} />
                                <span>Last connection error: {data.last_error}</span>
                            </div>
                        )}
                        <p className="service-panel-note">
                            Reconnects are a lifetime count, not an outage rate. The connected duration
                            describes the current session.
                        </p>
                    </ServiceState>
                </section>
                <div className="service-section-heading">
                    <div>
                        <h2>Tunnel activity</h2>
                        <p>HTTP requests and WebSocket upgrades recorded by this tunnel.</p>
                    </div>
                    <div className="calls-segment" aria-label="Tunnel traffic window">
                        {ranges.map((value) => (
                            <button
                                key={value}
                                aria-pressed={analytics.windowMinutes === value}
                                onClick={() => {
                                    setMinutes(value)
                                    setFilters((previous) => ({ ...previous, page: 0 }))
                                }}
                            >
                                {value === 60 ? '1 hour' : value + ' min'}
                            </button>
                        ))}
                    </div>
                </div>
                <ServiceState query={activity} title="Tunnel activity">
                    <div className="tunnel-chart-grid">
                        <TrafficPanel analytics={analytics} />
                        <section className="calls-panel">
                            <PanelHeading
                                icon={Timer}
                                title="Window insights"
                                subtitle={'Across the last ' + analytics.windowMinutes + ' minutes.'}
                            />
                            <div className="tunnel-summary-list">
                                <div>
                                    <span>Completed calls</span>
                                    <strong>{number(analytics.total)}</strong>
                                </div>
                                <div>
                                    <span>Failed calls</span>
                                    <strong>{number(analytics.errors)}</strong>
                                </div>
                                <div>
                                    <span>Average response</span>
                                    <strong>{duration(analytics.average)}</strong>
                                </div>
                                <div>
                                    <span>Successful calls</span>
                                    <strong>
                                        {analytics.successRate == null
                                            ? '—'
                                            : analytics.successRate.toFixed(1) + '%'}
                                    </strong>
                                </div>
                            </div>
                            <p className="service-panel-note">
                                Failures include HTTP errors and transport errors. Quiet minutes do not
                                contribute a zero latency.
                            </p>
                        </section>
                    </div>
                    <CallExplorer
                        explorerRef={explorerRef}
                        requests={analytics.requests}
                        filters={filters}
                        onFilters={setFilters}
                        capacity={activity.data?.data?.capacity}
                        route="tunnel"
                        scope="tunnel"
                        sampleLimit={100}
                    />
                </ServiceState>
                <section className="calls-panel">
                    <PanelHeading
                        icon={Settings2}
                        title="Connection settings"
                        subtitle="Save the connection details and apply them to the tunnel client."
                    >
                        {config.data?.data && (
                            <span className="calls-tag">
                                {config.data.data.source === 'database'
                                    ? 'Saved configuration'
                                    : 'Host configuration'}
                            </span>
                        )}
                    </PanelHeading>
                    <ServiceState query={config} title="Tunnel settings">
                        <TunnelSettings data={config.data?.data} />
                    </ServiceState>
                </section>
                <ServiceFooter sources={sources}>
                    Connection status refreshes every 5 seconds, activity every 10 seconds. Request history is
                    kept in memory and resets when the proxy restarts. The explorer shows the latest 100
                    retained records within the selected window.
                </ServiceFooter>
            </div>
        </div>
    )
}

function TunnelSettings({ data }) {
    const queryClient = useQueryClient()
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm({
        defaultValues: {
            server_url: data?.server_url || '',
            client_name: data?.client_name || '',
            local_target: data?.local_target || '',
            token: '',
        },
    })
    useEffect(() => {
        if (data && !isDirty)
            reset({
                server_url: data.server_url || '',
                client_name: data.client_name || '',
                local_target: data.local_target || '',
                token: '',
            })
    }, [data, isDirty, reset])
    const save = useMutation({
        mutationFn: dashboardServices.saveTunnelConfig,
        onSuccess: (result, submitted) => {
            const values = result.data || submitted
            reset({
                server_url: values.server_url || '',
                client_name: values.client_name || '',
                local_target: values.local_target || '',
                token: '',
            })
            if (result.data) queryClient.setQueryData(['tunnel-config'], { data: result.data })
            else queryClient.invalidateQueries({ queryKey: ['tunnel-config'] })
            queryClient.invalidateQueries({ queryKey: ['tunnel'] })
        },
    })
    return (
        <div className="service-grid">
            <form
                className="service-form"
                onSubmit={handleSubmit((values) => save.mutate(tunnelPayload(values)))}
            >
                <fieldset disabled={save.isPending}>
                    <div className="service-field">
                        <label htmlFor="tunnel-head">Tunnel head URL</label>
                        <input
                            id="tunnel-head"
                            placeholder="wss://your-server:9000/tunnel-agent"
                            aria-invalid={Boolean(errors.server_url)}
                            aria-describedby="tunnel-head-help"
                            {...register('server_url', {
                                validate: (value) =>
                                    validUrl(value, ['ws:', 'wss:'], true) ||
                                    'Use a valid ws:// or wss:// URL.',
                            })}
                        />
                        <small
                            id="tunnel-head-help"
                            className={errors.server_url ? 'service-field-error' : ''}
                        >
                            {errors.server_url?.message || 'Leave blank to use the host configuration.'}
                        </small>
                    </div>
                    <div className="service-field-row">
                        <div className="service-field">
                            <label htmlFor="tunnel-client">Client name</label>
                            <input id="tunnel-client" placeholder="gpu-box" {...register('client_name')} />
                        </div>
                        <div className="service-field">
                            <label htmlFor="tunnel-target">Local target URL</label>
                            <input
                                id="tunnel-target"
                                placeholder="http://127.0.0.1:2000"
                                aria-invalid={Boolean(errors.local_target)}
                                aria-describedby={errors.local_target ? 'tunnel-target-error' : undefined}
                                {...register('local_target', {
                                    validate: (value) =>
                                        validUrl(value, ['http:', 'https:'], true) ||
                                        'Use a valid http:// or https:// URL.',
                                })}
                            />
                            {errors.local_target && (
                                <small id="tunnel-target-error" className="service-field-error">
                                    {errors.local_target.message}
                                </small>
                            )}
                        </div>
                    </div>
                    <div className="service-field">
                        <label htmlFor="tunnel-token">Tunnel token</label>
                        <input
                            id="tunnel-token"
                            type="password"
                            autoComplete="new-password"
                            placeholder={
                                data?.token_set
                                    ? 'Leave blank to keep the current token'
                                    : 'Enter the token from the tunnel head'
                            }
                            aria-describedby="tunnel-token-help"
                            {...register('token')}
                        />
                        <small id="tunnel-token-help">
                            The current token is never displayed. Leaving this blank keeps it unchanged.
                        </small>
                    </div>
                </fieldset>
                {save.isError && (
                    <div className="service-feedback" role="alert">
                        <AlertCircle size={16} />
                        <span>{save.error?.friendlyMessage || 'Could not save settings. Try again.'}</span>
                    </div>
                )}
                {save.isSuccess && !isDirty && (
                    <div className="service-feedback success" role="status">
                        <Check size={16} />
                        <span>
                            {save.data?.reconnecting
                                ? 'Settings saved. The tunnel is reconnecting.'
                                : 'Settings saved. If the tunnel stays disconnected, restart the proxy to start it.'}
                        </span>
                    </div>
                )}
                <div>
                    <button
                        className="calls-button service-primary-button"
                        type="submit"
                        disabled={save.isPending || !isDirty}
                    >
                        {save.isPending ? <RefreshCw size={15} className="calls-spin" /> : <Save size={15} />}
                        {save.isPending ? 'Saving…' : 'Save and reconnect'}
                    </button>
                </div>
            </form>
            <div className="service-column">
                <dl className="service-data-list">
                    <div>
                        <dt>Settings source</dt>
                        <dd>{data?.source === 'database' ? 'Saved in database' : 'Host environment'}</dd>
                    </div>
                    <div>
                        <dt>Token</dt>
                        <dd>
                            <ServiceBadge tone={data?.token_set ? 'healthy' : 'amber'}>
                                {data?.token_set ? 'Configured' : 'Not configured'}
                            </ServiceBadge>
                        </dd>
                    </div>
                    <div>
                        <dt>Changes</dt>
                        <dd>{isDirty ? 'Unsaved edits' : 'Up to date'}</dd>
                    </div>
                </dl>
                <p className="service-inline-note">
                    <Info size={17} />
                    <span>
                        Saving persists these settings and asks the active tunnel to reconnect. Existing
                        connections may briefly disconnect. A master API key is required.
                    </span>
                </p>
                <p className="service-panel-note">
                    Host values are used when a saved URL or client name is blank. The token field only
                    replaces the credential when you enter a new value.
                </p>
            </div>
        </div>
    )
}

export default Tunnel
