import { useState } from 'react'
import { ArrowDownToLine, TrendingUp } from 'lucide-react'
import { number } from '../utils/callAnalytics'
import { trafficWindow, tunnelSampleCsv } from '../utils/tunnelActivity'

const time = (at) =>
    new Date(at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
const rateLabel = (value) =>
    value == null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 2 })

export default function TunnelTrafficTrend({ history }) {
    const [seconds, setSeconds] = useState(300)
    const [metric, setMetric] = useState('rate')
    const [active, setActive] = useState(null)
    const summary = trafficWindow(history, seconds)
    const { samples } = summary
    const end = history.at(-1)?.at || Date.now()
    const start = end - seconds * 1000
    const max = Math.max(1, ...samples.map((sample) => sample[metric] ?? 0))
    const x = (at) => 8 + ((at - start) / (end - start)) * 984
    const y = (value) => 108 - (value / max) * 96
    const path = samples
        .map((sample, index) => {
            if (sample[metric] == null) return ''
            const continuous =
                index > 0 && samples[index - 1][metric] != null && sample.intervalSeconds != null
            return `${continuous ? 'L' : 'M'} ${x(sample.at)} ${y(sample[metric])}`
        })
        .join(' ')
    const selectedIndex = active == null ? null : Math.min(active, samples.length - 1)
    const selected = selectedIndex == null ? null : samples[selectedIndex]
    const observed = samples.filter((sample) => sample[metric] != null)
    const markers = samples.filter((sample, index) => {
        if (sample[metric] == null) return false
        if (sample === selected) return true
        const connectedBefore = samples[index - 1]?.[metric] != null && sample.intervalSeconds != null
        const connectedAfter =
            samples[index + 1]?.[metric] != null && samples[index + 1].intervalSeconds != null
        return !connectedBefore && !connectedAfter
    })
    const exportSamples = () => {
        const url = URL.createObjectURL(
            new Blob([tunnelSampleCsv(samples)], { type: 'text/csv;charset=utf-8;' })
        )
        const link = document.createElement('a')
        link.href = url
        link.download = `tunnel-observations-${new Date(end).toISOString().replaceAll(':', '-')}.csv`
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
    return (
        <section className="tunnel-trend" aria-label="Live traffic trend">
            <div className="tunnel-monitor-heading">
                <h3>
                    <TrendingUp size={15} />
                    Live traffic trend
                </h3>
                <div className="calls-segment" aria-label="Live trend window">
                    {[60, 300].map((value) => (
                        <button
                            key={value}
                            aria-pressed={seconds === value}
                            onClick={() => {
                                setSeconds(value)
                                setActive(null)
                            }}
                        >
                            {value / 60} min
                        </button>
                    ))}
                </div>
            </div>
            <div className="tunnel-trend-controls">
                <div className="calls-segment" aria-label="Live trend metric">
                    <button
                        aria-pressed={metric === 'rate'}
                        onClick={() => {
                            setMetric('rate')
                            setActive(null)
                        }}
                    >
                        Requests / s
                    </button>
                    <button
                        aria-pressed={metric === 'inFlight'}
                        onClick={() => {
                            setMetric('inFlight')
                            setActive(null)
                        }}
                    >
                        In flight
                    </button>
                </div>
                <button
                    className="calls-icon-button"
                    aria-label="Export traffic observations"
                    title="Export observed samples as CSV"
                    disabled={!samples.length}
                    onClick={exportSamples}
                >
                    <ArrowDownToLine size={15} />
                </button>
            </div>
            <div className="tunnel-trend-readout" aria-live="off">
                {selected ? (
                    <>
                        <time dateTime={new Date(selected.at).toISOString()}>{time(selected.at)}</time>
                        <strong>
                            {metric === 'rate' ? rateLabel(selected.rate) : (selected.inFlight ?? '—')}{' '}
                            {metric === 'rate' ? 'req/s' : 'in flight'}
                        </strong>
                    </>
                ) : (
                    <>
                        <span>
                            {observed.length
                                ? 'Hover or use arrow keys to inspect'
                                : 'Collecting observations…'}
                        </span>
                        <span>
                            {rateLabel(max)} {metric === 'rate' ? 'req/s' : 'requests'}
                        </span>
                    </>
                )}
            </div>
            <div
                className="tunnel-trend-plot"
                tabIndex={samples.length ? 0 : undefined}
                role="group"
                aria-label="Live traffic chart. Use left and right arrows to inspect samples."
                onPointerMove={(event) => {
                    if (!samples.length) return
                    const rect = event.currentTarget.getBoundingClientRect()
                    const at =
                        start +
                        Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * seconds * 1000
                    setActive(
                        samples.reduce(
                            (best, sample, index) =>
                                Math.abs(sample.at - at) < Math.abs(samples[best].at - at) ? index : best,
                            0
                        )
                    )
                }}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(samples.length - 1)}
                onBlur={() => setActive(null)}
                onKeyDown={(event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return
                    event.preventDefault()
                    if (event.key === 'Escape') setActive(null)
                    else if (event.key === 'Home') setActive(0)
                    else if (event.key === 'End') setActive(samples.length - 1)
                    else
                        setActive((value) =>
                            Math.max(
                                0,
                                Math.min(
                                    samples.length - 1,
                                    (value ?? samples.length - 1) + (event.key === 'ArrowRight' ? 1 : -1)
                                )
                            )
                        )
                }}
            >
                <svg
                    viewBox="0 0 1000 120"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={`${observed.length} observed ${metric === 'rate' ? 'arrival rate' : 'in-flight'} samples in the last ${seconds / 60} minutes. Gaps indicate no comparable observation.`}
                >
                    {[0, 0.5, 1].map((fraction) => (
                        <line
                            key={fraction}
                            x1="0"
                            x2="1000"
                            y1={y(max * fraction)}
                            y2={y(max * fraction)}
                            className="calls-grid-line"
                        />
                    ))}
                    <path
                        d={path}
                        fill="none"
                        stroke={metric === 'rate' ? '#38bdf8' : '#a78bfa'}
                        strokeWidth="2"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                    {selected && (
                        <line
                            x1={x(selected.at)}
                            x2={x(selected.at)}
                            y1="0"
                            y2="120"
                            stroke="#64748b"
                            strokeDasharray="3 4"
                            vectorEffect="non-scaling-stroke"
                        />
                    )}
                </svg>
                {markers.map((marker) => (
                    <i
                        key={marker.at}
                        className="tunnel-trend-point"
                        style={{
                            left: x(marker.at) / 10 + '%',
                            top: y(marker[metric]) / 1.2 + '%',
                            background: metric === 'rate' ? '#38bdf8' : '#a78bfa',
                        }}
                    />
                ))}
                {!observed.length && (
                    <span className="tunnel-trend-empty">
                        {metric === 'rate'
                            ? 'The next refresh will establish a rate.'
                            : 'No in-flight measurements yet.'}
                    </span>
                )}
            </div>
            <div className="tunnel-trend-axis">
                <span>{time(start)}</span>
                <span>{time(end)}</span>
            </div>
            <dl className="tunnel-trend-stats">
                <div>
                    <dt>Observed average</dt>
                    <dd>
                        {rateLabel(summary.average)}
                        <small>req/s</small>
                    </dd>
                </div>
                <div>
                    <dt>Peak arrival rate</dt>
                    <dd>
                        {rateLabel(summary.peak)}
                        <small>req/s</small>
                    </dd>
                </div>
                <div>
                    <dt>Peak in flight</dt>
                    <dd>
                        {summary.peakInFlight == null ? '—' : number(summary.peakInFlight)}
                        <small>requests</small>
                    </dd>
                </div>
            </dl>
            <p className="tunnel-monitor-note">
                Captured while this view is open. Gaps are unobserved intervals; history clears when you
                leave.
            </p>
        </section>
    )
}
