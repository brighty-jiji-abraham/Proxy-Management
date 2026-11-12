import { useId, useState } from 'react'
import { Activity, ArrowUpRight, Clock3, Gauge, Radio, Server, TrendingUp } from 'lucide-react'
import { duration, latencySeries, number, timeLabel } from '../utils/callAnalytics'

export function PanelHeading({ icon: Icon, title, subtitle, children }) {
    return (
        <div className="calls-panel-heading">
            <div>
                <h2>
                    {Icon && <Icon size={16} aria-hidden="true" />}
                    {title}
                </h2>
                {subtitle && <p>{subtitle}</p>}
            </div>
            {children}
        </div>
    )
}

export function Sparkline({ values, color = 'var(--calls-violet)' }) {
    if (!values.length || !values.some(Boolean))
        return <span className="calls-spark-empty" aria-hidden="true" />
    const max = Math.max(1, ...values)
    const points = values
        .map((value, i) => `${(i / Math.max(1, values.length - 1)) * 100},${29 - (value / max) * 25}`)
        .join(' ')
    return (
        <svg className="calls-sparkline" viewBox="0 0 100 32" aria-hidden="true">
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
    )
}

export function TrafficPanel({ analytics }) {
    const [metric, setMetric] = useState('volume')
    const [active, setActive] = useState(null)
    const gradientId = useId()
    const { series, total, errors, rpm, peak } = analytics
    const latency = metric === 'latency'
    const { points, segments } = latencySeries(series)
    const values = latency ? points.map((point) => point.ms) : series.map((b) => b.count)
    const max = Math.max(4, Math.ceil(Math.max(0, ...values) / 4) * 4)
    const x = (i) => (series.length > 1 ? 6 + (i / (series.length - 1)) * 888 : 450)
    const y = (value) => 198 - (value / max) * 184
    const line = series.map((b, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(b.count)}`).join(' ')
    const segmentPath = ({ from, to }) => `M ${x(from.index)} ${y(from.ms)} L ${x(to.index)} ${y(to.ms)}`
    const latencyLine = segments
        .filter((segment) => !segment.gap)
        .map(segmentPath)
        .join(' ')
    const gapLine = segments
        .filter((segment) => segment.gap)
        .map(segmentPath)
        .join(' ')
    const position = (index, value) => ({
        left: `${(x(index) / 900) * 100}%`,
        top: `${(y(value) / 212) * 100}%`,
    })
    const errorLine = series.map((b, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(b.errors)}`).join(' ')
    const selectedIndex = active == null ? null : Math.min(active, series.length - 1)
    const selected = selectedIndex == null ? null : series[selectedIndex]
    const selectedPoint = points.find((point) => point.index === selectedIndex)
    const labels = [
        ...new Set([
            0,
            Math.floor((series.length - 1) / 3),
            Math.floor(((series.length - 1) * 2) / 3),
            series.length - 1,
        ]),
    ].filter((i) => i >= 0 && i < series.length)

    return (
        <section className="calls-panel calls-traffic">
            <PanelHeading
                icon={Activity}
                title="Request activity"
                subtitle={`Every call, minute by minute · Last ${analytics.windowMinutes} minutes`}
            >
                <div className="calls-segment" aria-label="Chart metric">
                    <button aria-pressed={!latency} onClick={() => setMetric('volume')}>
                        Volume
                    </button>
                    <button aria-pressed={latency} onClick={() => setMetric('latency')}>
                        Latency
                    </button>
                </div>
            </PanelHeading>
            <div className="calls-chart-key">
                <span>
                    <i style={{ background: latency ? 'var(--calls-cyan)' : 'var(--calls-violet)' }} />
                    {latency ? 'Average response time' : 'Total requests'}
                </span>
                {!latency && (
                    <span>
                        <i style={{ background: 'var(--calls-rose)' }} />
                        Failed requests
                    </span>
                )}
                {latency && gapLine && (
                    <span className="calls-chart-gap-key">
                        <i />
                        Dashed spans: no recorded samples
                    </span>
                )}
                {latency && points.length === 1 && <span>One recorded minute</span>}
                <span className="calls-chart-unit">{latency ? 'Milliseconds' : 'Requests / min'}</span>
            </div>
            <div className="calls-plot-wrap">
                <div className="calls-y-axis" aria-hidden="true">
                    {[max, max * 0.75, max * 0.5, max * 0.25, 0].map((v) => (
                        <span key={v}>{number(v)}</span>
                    ))}
                </div>
                <div
                    className="calls-plot"
                    tabIndex={series.length ? 0 : undefined}
                    role="group"
                    aria-label={`${latency ? 'Latency' : 'Request volume'} chart. Use left and right arrow keys to inspect each minute.`}
                    onPointerMove={(event) => {
                        const bounds = event.currentTarget.getBoundingClientRect()
                        setActive(
                            Math.max(
                                0,
                                Math.min(
                                    series.length - 1,
                                    Math.round(
                                        ((((event.clientX - bounds.left) / bounds.width) * 900 - 6) / 888) *
                                            (series.length - 1)
                                    )
                                )
                            )
                        )
                    }}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() =>
                        setActive(latency ? (points.at(-1)?.index ?? series.length - 1) : series.length - 1)
                    }
                    onBlur={() => setActive(null)}
                    onKeyDown={(event) => {
                        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return
                        event.preventDefault()
                        if (event.key === 'Escape') setActive(null)
                        else if (event.key === 'Home') setActive(0)
                        else if (event.key === 'End') setActive(series.length - 1)
                        else
                            setActive((value) =>
                                Math.max(
                                    0,
                                    Math.min(
                                        series.length - 1,
                                        (value ?? series.length - 1) + (event.key === 'ArrowRight' ? 1 : -1)
                                    )
                                )
                            )
                    }}
                >
                    <svg
                        viewBox="0 0 900 212"
                        preserveAspectRatio="none"
                        role="img"
                        aria-label={
                            latency
                                ? `${duration(analytics.average)} weighted average response time across ${number(total)} calls. ${points.length} recorded minutes.${gapLine ? ' Dashed spans connect recorded samples across minutes with no latency data.' : ''}`
                                : `${number(total)} requests, ${number(errors)} failed. Peak ${peak?.count || 0} requests per minute.`
                        }
                    >
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a78bfa" stopOpacity=".25" />
                                <stop offset="100%" stopColor="#a78bfa" stopOpacity=".015" />
                            </linearGradient>
                        </defs>
                        {[0, 0.25, 0.5, 0.75, 1].map((value) => (
                            <line
                                key={value}
                                x1="0"
                                x2="900"
                                y1={y(max * value)}
                                y2={y(max * value)}
                                className="calls-grid-line"
                            />
                        ))}
                        {total > 0 && (
                            <>
                                {!latency && (
                                    <path
                                        d={`${line} L ${x(series.length - 1)} 198 L 6 198 Z`}
                                        fill={`url(#${gradientId})`}
                                    />
                                )}
                                {(!latency || latencyLine) && (
                                    <path
                                        key={metric}
                                        className="calls-chart-line"
                                        d={latency ? latencyLine : line}
                                        fill="none"
                                        stroke={latency ? '#38bdf8' : '#a78bfa'}
                                        strokeWidth="2.5"
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                        pathLength="1"
                                    />
                                )}
                                {latency && gapLine && (
                                    <path
                                        className="calls-latency-gap"
                                        d={gapLine}
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth="2"
                                        strokeDasharray="5 5"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                                {!latency && errors > 0 && (
                                    <path
                                        d={errorLine}
                                        fill="none"
                                        stroke="#fb7185"
                                        strokeWidth="1.7"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                            </>
                        )}
                        {selected && (
                            <g>
                                <line
                                    x1={x(selectedIndex)}
                                    x2={x(selectedIndex)}
                                    y1="0"
                                    y2="198"
                                    stroke="#64748b"
                                    strokeDasharray="4 5"
                                />
                            </g>
                        )}
                    </svg>
                    {latency &&
                        points.map((point) => (
                            <span
                                key={point.minute}
                                className={`calls-latency-point ${points.length === 1 ? 'is-single' : ''}`}
                                style={position(point.index, point.ms)}
                                aria-hidden="true"
                            />
                        ))}
                    {selected && (!latency || selectedPoint) && (
                        <span
                            className="calls-chart-cursor-point"
                            style={{
                                ...position(selectedIndex, latency ? selectedPoint.ms : selected.count),
                                background: latency ? '#38bdf8' : '#a78bfa',
                            }}
                            aria-hidden="true"
                        />
                    )}
                    {(!total || (latency && !points.length)) && (
                        <div className="calls-chart-empty">
                            <Radio size={24} />
                            <strong>{total ? 'No latency data' : 'Waiting for traffic'}</strong>
                            <span>
                                {total
                                    ? 'Response times will appear when a recorded timing is available.'
                                    : 'Requests will appear here as your services receive calls.'}
                            </span>
                        </div>
                    )}
                    {selected && (
                        <div
                            role="status"
                            aria-live="polite"
                            aria-atomic="true"
                            className={`calls-chart-tooltip ${x(selectedIndex) >= 450 ? 'is-right' : ''}`}
                            style={{ left: `${(x(selectedIndex) / 900) * 100}%` }}
                        >
                            <strong>{timeLabel(selected.minute)}</strong>
                            <span>{number(selected.count)} requests</span>
                            <span>
                                {selected.errors} failed ·{' '}
                                {selectedPoint ? duration(selectedPoint.ms) : 'No latency data'}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            <div className="calls-x-axis" aria-hidden="true">
                {labels.map((i) => (
                    <span key={i}>{timeLabel(series[i].minute)}</span>
                ))}
            </div>
            <div className="calls-chart-footer">
                <span>
                    Average throughput{' '}
                    <strong>
                        {rpm.toFixed(1)} <small>req/min</small>
                    </strong>
                </span>
                <span>
                    Peak throughput{' '}
                    <strong>
                        {number(peak?.count || 0)} <small>req/min</small>
                    </strong>
                </span>
                <span>
                    Failed calls{' '}
                    <strong className={errors ? 'calls-text-rose' : ''}>
                        {number(errors)}{' '}
                        <small>
                            {total ? `${((errors / total) * 100).toFixed(1)}% of traffic` : 'No traffic yet'}
                        </small>
                    </strong>
                </span>
            </div>
        </section>
    )
}

export function StatusPanel({ analytics }) {
    const { statuses, requests } = analytics
    const total = requests.length
    const shown = statuses.filter((s, i) => i < 4 || s.count)
    return (
        <section className="calls-panel">
            <PanelHeading title="Response breakdown" subtitle="HTTP status · Retained calls" />
            <div className="calls-donut-wrap">
                <svg
                    className="calls-donut"
                    viewBox="0 0 160 160"
                    role="img"
                    aria-label={
                        total
                            ? statuses
                                  .filter((s) => s.count)
                                  .map((s) => `${s.key}: ${s.count}`)
                                  .join(', ')
                            : 'No response data'
                    }
                >
                    <circle cx="80" cy="80" r="63" fill="none" stroke="#233047" strokeWidth="12" />
                    {statuses.map(
                        (status, i) =>
                            status.count > 0 && (
                                <circle
                                    key={status.key}
                                    cx="80"
                                    cy="80"
                                    r="63"
                                    fill="none"
                                    stroke={status.color}
                                    strokeWidth="12"
                                    pathLength="100"
                                    strokeDasharray={`${Math.max(0.25, (status.count / total) * 100 - 1)} 100`}
                                    strokeDashoffset={
                                        (-statuses.slice(0, i).reduce((sum, s) => sum + s.count, 0) / total) *
                                        100
                                    }
                                    transform="rotate(-90 80 80)"
                                    className="calls-donut-arc"
                                >
                                    <title>
                                        {status.key}: {number(status.count)} {status.label.toLowerCase()}
                                    </title>
                                </circle>
                            )
                    )}
                </svg>
                <div className="calls-donut-label">
                    <strong>{number(total)}</strong>
                    <span>retained calls</span>
                </div>
            </div>
            <div className="calls-status-legend">
                {shown.map((status) => (
                    <div key={status.key}>
                        <span>
                            <i style={{ background: status.color }} />
                            <b>{status.key === 'other' ? '—' : status.key}</b>
                            {status.label}
                        </span>
                        <strong>
                            {number(status.count)}{' '}
                            <small>{total ? Math.round((status.count / total) * 100) : 0}%</small>
                        </strong>
                    </div>
                ))}
            </div>
        </section>
    )
}

export function LatencyPanel({ analytics }) {
    const max = Math.max(1, ...analytics.distribution.map((b) => b.count))
    return (
        <section className="calls-panel">
            <PanelHeading
                icon={Gauge}
                title="Response times"
                subtitle="Latency distribution · Retained calls"
            >
                <span className="calls-tag">{analytics.slow} ≥ 1 s</span>
            </PanelHeading>
            <div
                className="calls-histogram"
                role="img"
                aria-label={`Response time distribution. ${analytics.distribution.map((b) => `${b.label}: ${b.count} calls`).join(', ')}`}
            >
                {analytics.distribution.map((bucket, i) => (
                    <div className="calls-histogram-column" key={bucket.label}>
                        <span>{number(bucket.count)}</span>
                        <div className="calls-histogram-track">
                            <div
                                style={{
                                    height: `${(bucket.count / max) * 100}%`,
                                    background: i >= 4 ? 'var(--calls-amber)' : 'var(--calls-cyan)',
                                    opacity: 0.55 + i * 0.07,
                                }}
                            />
                        </div>
                        <small>{bucket.label}</small>
                    </div>
                ))}
            </div>
            <div className="calls-latency-footer">
                <span>
                    Median <strong>{duration(analytics.p50)}</strong>
                </span>
                <span>
                    95th percentile <strong>{duration(analytics.p95)}</strong>
                </span>
                <span>
                    Slowest <strong>{duration(analytics.slowest?.ms)}</strong>
                </span>
            </div>
        </section>
    )
}

export function ServicePanel({ services, route, windowMinutes, onSelect }) {
    const ranked = [...services].sort((a, b) => b.last_hour - a.last_hour)
    const total = ranked.reduce((sum, s) => sum + s.last_hour, 0)
    const max = Math.max(1, ...ranked.map((s) => s.last_hour))
    return (
        <section className="calls-panel calls-service-panel">
            <PanelHeading
                icon={Server}
                title="Traffic by service"
                subtitle={`All services · Last ${windowMinutes} minutes`}
            >
                <span className="calls-tag">{services.length} services</span>
            </PanelHeading>
            <div className="calls-service-ranking">
                {!ranked.length && <p className="calls-panel-empty">Configured services will appear here.</p>}
                {ranked.map((service) => (
                    <button
                        key={service.route}
                        className={`calls-service-row ${route === service.route ? 'is-selected' : ''}`}
                        onClick={() => onSelect(route === service.route ? '' : service.route)}
                        aria-pressed={route === service.route}
                    >
                        <div className="calls-service-label">
                            <span>
                                {service.name}
                                <small>
                                    {service.route}
                                    {!service.configured ? ' · Removed' : ''}
                                </small>
                            </span>
                            <strong>
                                {number(service.last_hour)}
                                <small>
                                    {total ? Math.round((service.last_hour / total) * 100) : 0}% of traffic
                                </small>
                            </strong>
                        </div>
                        <div className="calls-service-track">
                            <span style={{ width: `${(service.last_hour / max) * 100}%` }} />
                            <i style={{ width: `${(service.last_hour_errors / max) * 100}%` }} />
                        </div>
                        <div className="calls-service-bottom">
                            <span>
                                {service.last_hour_errors
                                    ? `${number(service.last_hour_errors)} failed`
                                    : 'No failures recorded'}
                            </span>
                            <ArrowUpRight size={12} />
                        </div>
                    </button>
                ))}
            </div>
        </section>
    )
}

export function InsightPanel({ analytics, onFilter }) {
    const { total, errors, peak, slowest, requests } = analytics
    return (
        <section className="calls-panel calls-insights">
            <PanelHeading
                icon={TrendingUp}
                title="At a glance"
                subtitle="Insights from the selected service and time window"
            />
            <div className="calls-insight-grid">
                <div className="calls-insight">
                    <span className="calls-insight-icon violet">
                        <Activity size={18} />
                    </span>
                    <div>
                        <h3>{peak ? `Busiest at ${timeLabel(peak.minute)}` : 'Your traffic, in focus'}</h3>
                        <p>
                            {peak
                                ? `${number(peak.count)} calls in one minute. Average throughput is ${analytics.rpm.toFixed(1)} requests per minute.`
                                : 'Peak traffic and throughput appear when calls arrive.'}
                        </p>
                    </div>
                </div>
                <button className="calls-insight" onClick={() => onFilter('errors')}>
                    <span className={`calls-insight-icon ${errors ? 'rose' : 'green'}`}>
                        <Radio size={18} />
                    </span>
                    <div>
                        <h3>
                            {total
                                ? errors
                                    ? `${((errors / total) * 100).toFixed(1)}% of calls failed`
                                    : 'No failures in this window'
                                : 'Waiting for responses'}
                        </h3>
                        <p>
                            {total
                                ? `${number(total - errors)} of ${number(total)} calls completed without an HTTP or transport error. View retained failures.`
                                : 'Failure insights will appear once traffic is recorded.'}
                        </p>
                    </div>
                    <ArrowUpRight size={15} />
                </button>
                <button className="calls-insight" onClick={() => onFilter('slow')}>
                    <span className="calls-insight-icon cyan">
                        <Clock3 size={18} />
                    </span>
                    <div>
                        <h3>{slowest ? `Slowest call: ${duration(slowest.ms)}` : 'Watch response times'}</h3>
                        <p>
                            {requests.length
                                ? `${analytics.slow} retained calls took at least one second. ${analytics.clients} unique callers across ${analytics.backends} backends.`
                                : 'Latency and caller insights use calls retained in memory.'}
                        </p>
                    </div>
                    <ArrowUpRight size={15} />
                </button>
            </div>
        </section>
    )
}
