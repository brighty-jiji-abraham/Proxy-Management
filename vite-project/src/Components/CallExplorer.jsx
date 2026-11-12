import { Fragment, useMemo, useState } from 'react'
import {
    ArrowDownToLine,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Copy,
    Filter,
    Inbox,
    Search,
    Trash2,
    X,
} from 'lucide-react'
import { callsCsv, duration, filterCalls, isFailed, number } from '../utils/callAnalytics'
import { PanelHeading } from './CallCharts'

const PAGE_SIZE = 20

function CopyValue({ value }) {
    const [state, setState] = useState('idle')
    if (!value) return <span>—</span>
    return (
        <div className="calls-copy-value">
            <code>{value}</code>
            <button
                className="calls-icon-button"
                aria-label={`Copy ${value}`}
                title={
                    state === 'error'
                        ? 'Could not copy. Select the text to copy it.'
                        : state === 'copied'
                          ? 'Copied'
                          : 'Copy'
                }
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
            </button>
            {state === 'error' && <span role="status">Select text to copy</span>}
        </div>
    )
}

export default function CallExplorer({
    requests,
    filters,
    onFilters,
    capacity,
    route,
    onClear,
    clearPending,
    explorerRef,
    scope = 'services',
    sampleLimit = 500,
}) {
    const serviceDetails = scope !== 'tunnel'
    const [expanded, setExpanded] = useState(null)
    const filtered = useMemo(() => filterCalls(requests, filters), [requests, filters])
    const methods = [...new Set(requests.map((r) => r.method).filter(Boolean))].sort()
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const page = Math.min(filters.page, pageCount - 1)
    const shown = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    const scale = Math.max(1, ...requests.map((r) => r.ms || 0))
    const update = (changes) => onFilters((previous) => ({ ...previous, page: 0, ...changes }))
    const hasFilters = filters.search || filters.outcome !== 'all' || filters.method !== 'all'
    const exportCsv = () => {
        const url = URL.createObjectURL(
            new Blob(['\uFEFF', callsCsv(filtered)], { type: 'text/csv;charset=utf-8;' })
        )
        const link = document.createElement('a')
        link.href = url
        link.download = `calls-${route.replaceAll('/', '') || 'all-services'}-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
    return (
        <section className="calls-panel calls-explorer" ref={explorerRef} aria-label="Request explorer">
            <PanelHeading
                title="Request explorer"
                subtitle="Inspect individual calls, find failures, and trace slow responses."
            >
                <div className="calls-explorer-actions">
                    <button className="calls-button" onClick={exportCsv} disabled={!filtered.length}>
                        <ArrowDownToLine size={15} />
                        Export CSV
                    </button>
                    {onClear && (
                        <button
                            className="calls-icon-button calls-danger-button"
                            onClick={onClear}
                            disabled={clearPending}
                            title={`Clear history for ${route || 'all services'}`}
                            aria-label="Clear history"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </PanelHeading>
            <div className="calls-explorer-toolbar">
                <label className="calls-search">
                    <Search size={16} />
                    <input
                        type="search"
                        value={filters.search}
                        onChange={(event) => update({ search: event.target.value })}
                        placeholder="Search paths, callers, status, backends…"
                        aria-label="Search calls"
                    />
                    {filters.search && (
                        <button aria-label="Clear search" onClick={() => update({ search: '' })}>
                            <X size={14} />
                        </button>
                    )}
                </label>
                <div className="calls-segment" aria-label="Filter calls by outcome">
                    {[
                        ['all', 'All calls'],
                        ['errors', 'Failed'],
                        ['slow', 'Slow ≥ 1 s'],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            aria-pressed={filters.outcome === value}
                            onClick={() => update({ outcome: value })}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <label className="calls-method-filter">
                    <Filter size={14} />
                    <select
                        aria-label="HTTP method"
                        value={filters.method}
                        onChange={(event) => update({ method: event.target.value })}
                    >
                        <option value="all">All methods</option>
                        {methods.map((method) => (
                            <option key={method}>{method}</option>
                        ))}
                    </select>
                </label>
            </div>
            {!filtered.length ? (
                <div className="calls-empty-state">
                    <Inbox size={30} />
                    <h3>{hasFilters ? 'No matching calls' : 'No calls in this window'}</h3>
                    <p>
                        {hasFilters
                            ? 'Try another search or reset the filters to see all retained calls.'
                            : serviceDetails
                              ? 'Send a request to a configured service to start exploring its activity.'
                              : 'Requests appear here after they cross the tunnel.'}
                    </p>
                    {hasFilters && (
                        <button
                            className="calls-button"
                            onClick={() => update({ search: '', outcome: 'all', method: 'all' })}
                        >
                            Reset filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="calls-table-scroll">
                    <table className="calls-table">
                        <thead>
                            <tr>
                                <th scope="col">Time</th>
                                <th scope="col">Request</th>
                                {serviceDetails && <th scope="col">Service</th>}
                                {serviceDetails && <th scope="col">Caller</th>}
                                <th scope="col">Status</th>
                                <th scope="col">Duration</th>
                                <th scope="col">
                                    <span className="calls-sr-only">Details</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map((request, i) => {
                                const id = `${request.at}-${request.route}-${request.method}-${request.path}-${page * PAGE_SIZE + i}`
                                const open = expanded === id
                                const detailId = `call-detail-${page * PAGE_SIZE + i}`
                                const failed = isFailed(request)
                                const tone = failed
                                    ? request.status >= 400 && request.status < 500
                                        ? 'amber'
                                        : 'rose'
                                    : 'green'
                                return (
                                    <Fragment key={id}>
                                        <tr
                                            className={`${open ? 'is-expanded' : ''} ${failed ? 'is-failed' : ''}`}
                                        >
                                            <td>
                                                <time
                                                    dateTime={new Date(request.at * 1000).toISOString()}
                                                    title={new Date(request.at * 1000).toLocaleString()}
                                                >
                                                    {new Date(request.at * 1000).toLocaleTimeString([], {
                                                        hour12: false,
                                                    })}
                                                </time>
                                                {request.kind === 'ws' && (
                                                    <small className="calls-protocol">WebSocket</small>
                                                )}
                                            </td>
                                            <td>
                                                <div className="calls-request-cell">
                                                    <span
                                                        className={`calls-method calls-method-${(request.method || '').toLowerCase()}`}
                                                    >
                                                        {request.method}
                                                    </span>
                                                    <span className="calls-path" title={request.path}>
                                                        {request.path}
                                                    </span>
                                                </div>
                                                {request.error && (
                                                    <span
                                                        className="calls-error-preview"
                                                        title={request.error}
                                                    >
                                                        {request.error}
                                                    </span>
                                                )}
                                            </td>
                                            {serviceDetails && (
                                                <td>
                                                    <span className="calls-route-text">
                                                        {request.route || '—'}
                                                    </span>
                                                </td>
                                            )}
                                            {serviceDetails && (
                                                <td>
                                                    <span className="calls-caller">
                                                        {request.client || '—'}
                                                    </span>
                                                </td>
                                            )}
                                            <td>
                                                <span className={`calls-status ${tone}`}>
                                                    <i />
                                                    {request.status ?? 'Failed'}
                                                </span>
                                            </td>
                                            <td>
                                                <div
                                                    className={`calls-duration ${request.ms >= 1000 ? 'calls-text-amber' : ''}`}
                                                >
                                                    <span>{duration(request.ms)}</span>
                                                    <div>
                                                        <i
                                                            style={{
                                                                width: `${Math.max(3, ((request.ms || 0) / scale) * 100)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    className="calls-icon-button calls-expand"
                                                    aria-label={`${open ? 'Collapse' : 'Inspect'} ${request.method} ${request.path} at ${new Date(request.at * 1000).toLocaleTimeString()}`}
                                                    aria-expanded={open}
                                                    aria-controls={detailId}
                                                    onClick={() => setExpanded(open ? null : id)}
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                        {open && (
                                            <tr id={detailId} className="calls-detail-row">
                                                <td colSpan={serviceDetails ? 7 : 5}>
                                                    <div className="calls-request-details">
                                                        <div>
                                                            <span>Full request path</span>
                                                            <CopyValue value={request.path} />
                                                        </div>
                                                        {serviceDetails && (
                                                            <div>
                                                                <span>Backend</span>
                                                                <CopyValue value={request.backend} />
                                                            </div>
                                                        )}
                                                        {serviceDetails && (
                                                            <div>
                                                                <span>Caller</span>
                                                                <CopyValue value={request.client} />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span>Recorded at</span>
                                                            <p>
                                                                {new Date(request.at * 1000).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span>Protocol</span>
                                                            <p>
                                                                {request.kind === 'ws'
                                                                    ? 'WebSocket upgrade'
                                                                    : 'HTTP'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span>Result</span>
                                                            <p>
                                                                {request.status ?? 'No HTTP response'} ·{' '}
                                                                {duration(request.ms)}
                                                            </p>
                                                        </div>
                                                        {request.error && (
                                                            <div className="calls-detail-error">
                                                                <span>Error details</span>
                                                                <p>{request.error}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="calls-table-footer">
                <span>
                    {filtered.length
                        ? `${number(page * PAGE_SIZE + 1)}–${number(Math.min((page + 1) * PAGE_SIZE, filtered.length))} of ${number(filtered.length)} calls`
                        : '0 calls'}
                    <small>
                        Up to {number(capacity || 200)} retained
                        {serviceDetails ? ' per service' : ' in the tunnel'}; latest {number(sampleLimit)}{' '}
                        loaded.
                    </small>
                </span>
                <div>
                    <button
                        className="calls-icon-button"
                        aria-label="Previous page"
                        disabled={!page}
                        onClick={() => update({ page: page - 1 })}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span>
                        {page + 1} / {pageCount}
                    </span>
                    <button
                        className="calls-icon-button"
                        aria-label="Next page"
                        disabled={page + 1 >= pageCount}
                        onClick={() => update({ page: page + 1 })}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </section>
    )
}
