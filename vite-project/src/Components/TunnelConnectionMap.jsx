import { useEffect, useId, useRef, useState } from 'react'
import { Activity, Globe, History, Pause, Play, Radio, Server, X } from 'lucide-react'
import { CopyButton, ServiceBadge } from './ServiceUI'
import { number } from '../utils/callAnalytics'
import { uptimeLabel } from '../utils/dashboardAnalytics'
import {
    appendTrafficSample,
    connectionEvents,
    observeTunnelTraffic,
    requestParticleCount,
} from '../utils/tunnelActivity'
import TunnelTrafficTrend from './TunnelTrafficTrend'
import './TunnelConnectionMap.css'

const FRESH_FOR = 10000

export default function TunnelConnectionMap({ data, updatedAt, paused, unavailable, onInspectRequests }) {
    const previous = useRef(null)
    const acceptAfter = useRef(0)
    const [sample, setSample] = useState(null)
    const [history, setHistory] = useState([])
    const [events, setEvents] = useState([])
    const eventSnapshot = useRef(null)
    const [motion, setMotion] = useState(true)
    const [selectedNode, setSelectedNode] = useState(null)
    const detailId = useId()
    const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden')
    useEffect(() => {
        const updateVisibility = () => setVisible(document.visibilityState !== 'hidden')
        document.addEventListener('visibilitychange', updateVisibility)
        return () => document.removeEventListener('visibilitychange', updateVisibility)
    }, [])
    useEffect(() => {
        if (!visible || paused || unavailable || !data?.connected || !updatedAt) {
            previous.current = null
            acceptAfter.current = Date.now()
            setSample(null)
            return
        }
        if (updatedAt <= acceptAfter.current) return
        const next = observeTunnelTraffic(previous.current, data, updatedAt)
        previous.current = next
        const remaining = Math.max(0, updatedAt + FRESH_FOR - Date.now())
        setSample({ ...next, fresh: remaining > 0 })
        if (remaining) setHistory((value) => appendTrafficSample(value, next))
        if (!remaining) return
        const timer = window.setTimeout(() => {
            previous.current = null
            setSample((value) => (value?.at === updatedAt ? { ...value, fresh: false } : value))
        }, remaining)
        return () => window.clearTimeout(timer)
    }, [data, updatedAt, paused, unavailable, visible])

    const fresh = sample?.fresh
    const particles = requestParticleCount(sample)
    const trafficActive = Boolean(data?.connected && fresh && particles && !paused && !unavailable && visible)
    const flowing = trafficActive && motion
    const state = paused
        ? 'paused'
        : unavailable
          ? 'unavailable'
          : !data?.connected
            ? 'disconnected'
            : !visible || !fresh
              ? 'stale'
              : trafficActive
                ? 'active'
                : 'idle'
    const status = {
        paused: 'Live updates paused',
        unavailable: 'Connection data unavailable',
        disconnected: 'No active connection',
        stale: 'Waiting for a fresh update',
        active: 'Traffic flowing',
        idle: 'Waiting for new requests',
    }[state]
    const live = state === 'active' || state === 'idle'
    useEffect(() => {
        if (!data || (state === 'stale' && !sample)) return
        const observed = {
            status: state === 'active' || state === 'idle' ? 'connected' : state,
            identity: JSON.stringify([data.server_url, data.client_name, data.local_target]),
            reconnects: data.reconnects,
            total: data.requests_served,
        }
        const changes = connectionEvents(eventSnapshot.current, observed, Date.now())
        eventSnapshot.current = observed
        if (changes.length) setEvents((value) => [...changes.reverse(), ...value].slice(0, 20))
    }, [data, state, sample])
    const linkLabel = !data?.connected
        ? 'No active link'
        : live
          ? 'Authenticated link'
          : 'Last reported connected'
    return (
        <div className="tunnel-connection-map">
            <div className="tunnel-map-toolbar">
                <span>Select a node for connection details.</span>
                <div>
                    {onInspectRequests && (
                        <button className="calls-button" onClick={onInspectRequests}>
                            <History size={14} />
                            Inspect requests
                        </button>
                    )}
                    <button
                        className="calls-button"
                        onClick={() => setMotion((value) => !value)}
                        aria-pressed={motion}
                        aria-label={motion ? 'Hide request animation' : 'Show request animation'}
                        title="Animation only. Live data continues updating."
                    >
                        {motion ? <Pause size={14} /> : <Play size={14} />}
                        {motion ? 'Hide motion' : 'Show motion'}
                    </button>
                </div>
            </div>
            <div
                className={
                    'tunnel-flow' + (data?.connected ? ' connected' : '') + (flowing ? ' is-flowing' : '')
                }
            >
                <button
                    className="tunnel-node"
                    aria-label="Inspect tunnel head"
                    aria-expanded={selectedNode === 'head'}
                    aria-controls={detailId}
                    onClick={() => setSelectedNode((value) => (value === 'head' ? null : 'head'))}
                >
                    <Globe size={24} />
                    <strong>Tunnel head</strong>
                    <span>Public server</span>
                    <code>{data?.server_url || 'Not configured'}</code>
                </button>
                <RequestConnector stage="first" sample={sample} flowing={flowing} count={particles} />
                <button
                    className="tunnel-node"
                    aria-label="Inspect tunnel client"
                    aria-expanded={selectedNode === 'client'}
                    aria-controls={detailId}
                    onClick={() => setSelectedNode((value) => (value === 'client' ? null : 'client'))}
                >
                    <Radio size={24} />
                    <strong>{data?.client_name || 'Tunnel client'}</strong>
                    <span>This machine</span>
                    <ServiceBadge tone={live && data?.connected ? 'healthy' : 'unknown'}>
                        {linkLabel}
                    </ServiceBadge>
                </button>
                <RequestConnector stage="second" sample={sample} flowing={flowing} count={particles} />
                <button
                    className="tunnel-node"
                    aria-label="Inspect local target"
                    aria-expanded={selectedNode === 'target'}
                    aria-controls={detailId}
                    onClick={() => setSelectedNode((value) => (value === 'target' ? null : 'target'))}
                >
                    <Server size={24} />
                    <strong>Local target</strong>
                    <span>Receives forwarded requests</span>
                    <code>{data?.local_target || 'Not reported'}</code>
                </button>
            </div>
            <div id={detailId} hidden={!selectedNode}>
                {selectedNode && (
                    <NodeDetails
                        key={selectedNode}
                        node={selectedNode}
                        data={data}
                        live={live}
                        onClose={() => setSelectedNode(null)}
                    />
                )}
            </div>
            <div className={'tunnel-live-strip ' + state} aria-label="Live request activity">
                <div className="tunnel-live-state">
                    {paused ? <Pause size={16} /> : <Activity size={16} />}
                    <div>
                        <strong>{status}</strong>
                        <span>Activity sampled every 5 seconds</span>
                    </div>
                </div>
                <dl>
                    <div>
                        <dt>New requests</dt>
                        <dd>
                            {live && sample?.newRequests != null ? '+' + number(sample.newRequests) : '—'}
                            <small>since last refresh</small>
                        </dd>
                    </div>
                    <div>
                        <dt>In flight</dt>
                        <dd>
                            {live && sample?.inFlight != null ? number(sample.inFlight) : '—'}
                            <small>forwarding now</small>
                        </dd>
                    </div>
                    <div>
                        <dt>Arrival rate</dt>
                        <dd>
                            {live && sample?.rate != null ? sample.rate.toFixed(1) : '—'}
                            <small>requests / second</small>
                        </dd>
                    </div>
                </dl>
            </div>
            <p className="tunnel-motion-note">
                Cyan dots show observed HTTP request activity toward the local target. The motion is sampled,
                not one dot per request.
                {!motion && ' Motion is hidden; live data continues updating.'}
            </p>
            <div className="tunnel-monitor-grid">
                <TunnelTrafficTrend history={history} />
                <section className="tunnel-events" aria-label="Connection events">
                    <div className="tunnel-monitor-heading">
                        <h3>
                            <History size={15} />
                            Connection events
                        </h3>
                        <span>In this view</span>
                    </div>
                    {events.length ? (
                        <ol>
                            {events.map((event) => (
                                <li key={event.at + event.message} className={event.tone}>
                                    <i aria-hidden="true" />
                                    <div>
                                        <p>{event.message}</p>
                                        <time dateTime={new Date(event.at).toISOString()}>
                                            {new Date(event.at).toLocaleTimeString([], { hour12: false })}
                                        </time>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="tunnel-monitor-note">
                            Connection changes will appear here as they are observed.
                        </p>
                    )}
                    <p className="tunnel-monitor-note">
                        The last 20 changes observed in this view. Reconnects between refreshes may appear as
                        a counter increase.
                    </p>
                </section>
            </div>
        </div>
    )
}

function NodeDetails({ node, data, live, onClose }) {
    const target = node === 'target'
    const client = node === 'client'
    const address = target ? data?.local_target : data?.server_url
    const rows = client
        ? [
              ['Client name', data?.client_name || 'Not reported'],
              ['Connected duration', data?.connected ? uptimeLabel(data.connected_seconds) : '—'],
              ['Lifetime reconnects', data?.reconnects == null ? '—' : number(data.reconnects)],
              [
                  'WebSocket sessions',
                  data?.websocket_sessions == null ? '—' : number(data.websocket_sessions),
              ],
          ]
        : [
              ['Address', address || 'Not configured'],
              ['Purpose', target ? 'Receives forwarded requests' : 'Accepts the outbound tunnel connection'],
          ]
    return (
        <section className="tunnel-node-details" aria-label="Selected connection details">
            <div className="tunnel-monitor-heading">
                <h3>{client ? 'Tunnel client' : target ? 'Local target' : 'Tunnel head'} details</h3>
                <button className="calls-icon-button" onClick={onClose} aria-label="Close connection details">
                    <X size={15} />
                </button>
            </div>
            <p>
                {client
                    ? 'This machine connects outward to the tunnel head and forwards incoming requests to the local target.'
                    : target
                      ? 'The map shows the configured destination. It does not independently check the target’s health.'
                      : 'Public requests arrive at this server, then travel through the authenticated tunnel to this machine.'}
            </p>
            {!live && <p className="tunnel-detail-stale">Showing the last reported connection details.</p>}
            <dl>
                {rows.map(([label, value]) => (
                    <div key={label}>
                        <dt>{label}</dt>
                        <dd>
                            <span>{value}</span>
                            {label === 'Address' && address && (
                                <CopyButton
                                    key={address}
                                    value={address}
                                    label={target ? 'Copy local target address' : 'Copy tunnel head address'}
                                />
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    )
}

function RequestConnector({ stage, sample, flowing, count }) {
    return (
        <div className="tunnel-connector" aria-hidden="true">
            {flowing &&
                Array.from({ length: count }, (_, index) => (
                    <span
                        key={sample.at + '-' + index}
                        className={'tunnel-request-packet ' + stage + (sample.inFlight > 0 ? ' ongoing' : '')}
                        style={{ '--packet-delay': index * 0.22 + 's' }}
                    />
                ))}
        </div>
    )
}
