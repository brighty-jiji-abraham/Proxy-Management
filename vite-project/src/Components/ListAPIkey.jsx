import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import {
    Activity,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Eye,
    KeyRound,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    UserRound,
    UsersRound,
    X,
} from 'lucide-react'
import dashboardServices from '../services/dashboard.service'
import { getApiKey, setApiKey } from '../api/api'
import { PanelHeading } from './CallCharts'
import {
    ServiceBars,
    ServiceEmpty,
    ServiceFooter,
    ServiceHeader,
    ServiceMetric,
    ServiceState,
} from './ServiceUI'
import { KeyCredential, KeyRole, KeyStorageNote } from './KeyUI'
import { filterKeys, keyDate, summarizeKeys } from '../utils/keyAnalytics'
import { pollingOptions } from '../utils/serviceAnalytics'
import { number } from '../utils/callAnalytics'

const PAGE_SIZE = 10
const usageLabels = {
    recent: 'Last 24 hours',
    week: '1–7 days ago',
    older: 'Over 7 days ago',
    never: 'Never used',
    unknown: 'Not reported',
}

function ListAPIkey() {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const { onSignOut } = useOutletContext() || {}
    const [paused, setPaused] = useState(false)
    const [filters, setFilters] = useState({ search: '', role: 'all', usage: 'all', sort: 'newest', page: 0 })
    const [removing, setRemoving] = useState(null)
    const [message, setMessage] = useState('')
    const inventoryRef = useRef(null)
    const keys = useQuery({
        queryKey: ['api-keys'],
        queryFn: dashboardServices.listApiKeys,
        ...pollingOptions(paused, 30000),
    })
    const sources = [{ ...keys, label: 'Key registry' }]
    const summary = useMemo(
        () => summarizeKeys(keys.data, keys.dataUpdatedAt / 1000),
        [keys.data, keys.dataUpdatedAt]
    )
    const filtered = useMemo(() => filterKeys(summary.rows, filters), [summary.rows, filters])
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const page = Math.min(filters.page, pageCount - 1)
    const shown = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    const activeKey = getApiKey()
    const update = (changes) => setFilters((previous) => ({ ...previous, page: 0, ...changes }))
    const resetFilters = () => update({ search: '', role: 'all', usage: 'all' })
    const inspectUsage = (usage) => {
        update({ usage, role: 'all', search: '' })
        inventoryRef.current?.scrollIntoView({
            block: 'start',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        })
    }
    const revoke = useMutation({
        mutationFn: dashboardServices.revokeApiKey,
        onSuccess: async (_, value) => {
            if (value === activeKey) {
                setApiKey('')
                queryClient.clear()
                onSignOut?.()
                navigate('/login', { replace: true })
                return
            }
            await queryClient.cancelQueries({ queryKey: ['api-keys'] })
            queryClient.setQueryData(['api-keys'], (previous) =>
                previous
                    ? { ...previous, api_keys: previous.api_keys.filter((row) => row.key !== value) }
                    : previous
            )
            setMessage('Key revoked. This credential no longer grants access to the proxy.')
            setRemoving(null)
            queryClient.invalidateQueries({ queryKey: ['api-keys'] })
        },
    })
    return (
        <div className="calls-page service-page key-page key-vault-page">
            <ServiceHeader
                icon={Eye}
                title="Key Vault"
                description="See who has access, inspect credentials, and manage your registered keys."
                sources={sources}
                paused={paused}
                onPause={() => setPaused((value) => !value)}
                interval="every 30 seconds"
            />
            <div className="service-content">
                <div className="calls-metrics">
                    <ServiceMetric
                        icon={KeyRound}
                        label="Registered keys"
                        value={keys.data ? number(summary.total) : null}
                        note="Keys held by this proxy process"
                    />
                    <ServiceMetric
                        icon={UserRound}
                        label="Client keys"
                        value={keys.data ? number(summary.clients) : null}
                        note={
                            keys.data
                                ? summary.admins + ' administrator credentials'
                                : 'Waiting for registry data'
                        }
                        color="cyan"
                    />
                    <ServiceMetric
                        icon={Activity}
                        label="Used in 24 hours"
                        value={keys.data ? number(summary.recent) : null}
                        note="Based on each key’s latest use"
                        color="green"
                    />
                    <ServiceMetric
                        icon={Clock3}
                        label="Never used"
                        value={keys.data ? number(summary.never) : null}
                        note="No authentication recorded yet"
                        color="amber"
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
                            icon={Activity}
                            title="Last recorded use"
                            subtitle="Select a group to inspect those credentials."
                        />
                        <ServiceState query={keys} title="Key activity">
                            {summary.total ? (
                                <>
                                    <div className="key-usage">
                                        {summary.usage
                                            .filter((bucket) => bucket.key !== 'unknown' || bucket.count)
                                            .map((bucket) => (
                                                <button
                                                    key={bucket.key}
                                                    onClick={() => inspectUsage(bucket.key)}
                                                    aria-label={'Show keys: ' + bucket.label}
                                                >
                                                    <span>
                                                        <i style={{ background: bucket.color }} />
                                                        {bucket.label}
                                                    </span>
                                                    <span className="key-usage-track" aria-hidden="true">
                                                        <i
                                                            style={{
                                                                width:
                                                                    (bucket.count / summary.total) * 100 +
                                                                    '%',
                                                                background: bucket.color,
                                                            }}
                                                        />
                                                    </span>
                                                    <strong>{number(bucket.count)}</strong>
                                                </button>
                                            ))}
                                    </div>
                                    <p className="service-panel-note">
                                        One latest-use timestamp per key. Includes authentication from this
                                        interface; this is not request volume.
                                    </p>
                                </>
                            ) : (
                                <ServiceEmpty
                                    icon={Activity}
                                    title="No key activity yet"
                                    description="Usage groups appear when keys are registered."
                                />
                            )}
                        </ServiceState>
                    </section>
                    <section className="calls-panel">
                        <PanelHeading
                            icon={UsersRound}
                            title="Keys by owner"
                            subtitle="The five owners with the most registered credentials."
                        />
                        <ServiceState query={keys} title="Key ownership">
                            <ServiceBars
                                label="Keys per owner"
                                emptyText="No registered owners"
                                items={summary.owners
                                    .slice(0, 5)
                                    .map(([owner, count]) => ({
                                        key: owner,
                                        label: owner,
                                        value: count,
                                        display: number(count) + (count === 1 ? ' key' : ' keys'),
                                        color: 'var(--calls-violet)',
                                    }))}
                            />
                        </ServiceState>
                        {summary.total > 0 && (
                            <p className="service-panel-note">
                                {summary.owners.length} distinct owners across {summary.total} registered
                                keys.
                            </p>
                        )}
                    </section>
                </div>
                <section className="calls-panel key-library" ref={inventoryRef} aria-label="Key inventory">
                    <PanelHeading
                        icon={KeyRound}
                        title="Registered credentials"
                        subtitle="Find a key by its label or owner. Expand a row to reveal or manage it."
                    >
                        <Link to="/generate-key" className="calls-button service-primary-button">
                            <Plus size={15} />
                            Create key
                        </Link>
                    </PanelHeading>
                    <div className="service-toolbar">
                        <label className="calls-search">
                            <Search size={16} />
                            <input
                                type="search"
                                aria-label="Search keys"
                                placeholder="Search labels and owners…"
                                value={filters.search}
                                onChange={(event) => update({ search: event.target.value })}
                            />
                            {filters.search && (
                                <button aria-label="Clear key search" onClick={() => update({ search: '' })}>
                                    <X size={14} />
                                </button>
                            )}
                        </label>
                        <div className="calls-segment" aria-label="Key access filter">
                            {[
                                ['all', 'All keys'],
                                ['client', 'Client'],
                                ['admin', 'Admin'],
                            ].map(([role, label]) => (
                                <button
                                    key={role}
                                    aria-pressed={filters.role === role}
                                    onClick={() => update({ role })}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <select
                            className="service-select"
                            aria-label="Filter keys by last use"
                            value={filters.usage}
                            onChange={(event) => update({ usage: event.target.value })}
                        >
                            <option value="all">Any last use</option>
                            {summary.usage.map((bucket) => (
                                <option key={bucket.key} value={bucket.key}>
                                    {bucket.label}
                                </option>
                            ))}
                        </select>
                        <select
                            className="service-select"
                            aria-label="Sort keys"
                            value={filters.sort}
                            onChange={(event) => update({ sort: event.target.value })}
                        >
                            <option value="newest">Newest first</option>
                            <option value="used">Recently used</option>
                            <option value="name">Label A–Z</option>
                        </select>
                    </div>
                    <ServiceState query={keys} title="Key registry">
                        {!shown.length ? (
                            <ServiceEmpty
                                icon={KeyRound}
                                title={summary.total ? 'No matching keys' : 'No keys registered'}
                                description={
                                    summary.total
                                        ? 'Try another label, owner, or usage filter.'
                                        : 'Create a key in Key Forge to give a client access to your proxy.'
                                }
                            >
                                {summary.total ? (
                                    <button className="calls-button" onClick={resetFilters}>
                                        Reset filters
                                    </button>
                                ) : (
                                    <Link className="calls-button service-primary-button" to="/generate-key">
                                        <Plus size={15} />
                                        Open Key Forge
                                    </Link>
                                )}
                            </ServiceEmpty>
                        ) : (
                            shown.map((row) => (
                                <details className="key-row" key={row.key}>
                                    <summary>
                                        <span className="key-row-icon">
                                            {row.isAdmin ? <ShieldCheck size={17} /> : <KeyRound size={17} />}
                                        </span>
                                        <div className="key-row-identity">
                                            <div className="key-row-name">
                                                <strong>{row.name}</strong>
                                                {row.key === activeKey && (
                                                    <span className="key-session-badge">This session</span>
                                                )}
                                            </div>
                                            <span>{row.user_id}</span>
                                        </div>
                                        <KeyRole admin={row.isAdmin} />
                                        <div className="key-last-used">
                                            <span>Last used</span>
                                            <strong
                                                title={keyDate(
                                                    row.last_used,
                                                    row.usage === 'never' ? 'Never used' : 'Not reported'
                                                )}
                                            >
                                                {usageLabels[row.usage]}
                                            </strong>
                                        </div>
                                        <ChevronDown size={16} className="service-chevron" />
                                    </summary>
                                    <div className="service-details key-row-details">
                                        <KeyCredential value={row.key} label={row.name} />
                                        <div className="service-detail-grid">
                                            <div>
                                                <span>Owner</span>
                                                <strong>{row.user_id}</strong>
                                            </div>
                                            <div>
                                                <span>Access level</span>
                                                <strong>{row.isAdmin ? 'Administrator' : 'Client'}</strong>
                                            </div>
                                            <div>
                                                <span>Created</span>
                                                <strong>{keyDate(row.created_at)}</strong>
                                            </div>
                                            <div>
                                                <span>Last used</span>
                                                <strong>
                                                    {keyDate(
                                                        row.last_used,
                                                        row.usage === 'never' ? 'Never used' : 'Not reported'
                                                    )}
                                                </strong>
                                            </div>
                                        </div>
                                        <div className="service-detail-actions">
                                            <span>
                                                {row.key === activeKey
                                                    ? 'This credential is being used by your current session.'
                                                    : 'Revocation removes access immediately.'}
                                            </span>
                                            <button
                                                className="calls-button calls-danger-button"
                                                onClick={() => {
                                                    revoke.reset()
                                                    setRemoving(row)
                                                }}
                                                disabled={revoke.isPending}
                                            >
                                                <Trash2 size={14} />
                                                Revoke key
                                            </button>
                                        </div>
                                    </div>
                                </details>
                            ))
                        )}
                    </ServiceState>
                    {keys.data && (
                        <div className="calls-table-footer">
                            <span>
                                {filtered.length
                                    ? number(page * PAGE_SIZE + 1) +
                                      '–' +
                                      number(Math.min((page + 1) * PAGE_SIZE, filtered.length)) +
                                      ' of ' +
                                      number(filtered.length) +
                                      ' keys'
                                    : '0 keys'}
                                <small>Only currently registered credentials are listed.</small>
                            </span>
                            <div>
                                <button
                                    className="calls-icon-button"
                                    aria-label="Previous keys page"
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
                                    aria-label="Next keys page"
                                    disabled={page + 1 >= pageCount}
                                    onClick={() => update({ page: page + 1 })}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </section>
                <KeyStorageNote />
                <ServiceFooter sources={sources}>
                    The vault refreshes every 30 seconds. Usage groups are calculated at the last refresh, so
                    paused snapshots remain consistent. Revoked keys are removed from the registry.
                </ServiceFooter>
            </div>
            {removing && (
                <RevokeDialog
                    row={removing}
                    current={removing.key === activeKey}
                    pending={revoke.isPending}
                    error={revoke.error}
                    onCancel={() => setRemoving(null)}
                    onConfirm={() => revoke.mutate(removing.key)}
                />
            )}
        </div>
    )
}

function RevokeDialog({ row, current, pending, error, onCancel, onConfirm }) {
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
            aria-labelledby="revoke-key-title"
            aria-describedby="revoke-key-description"
            onCancel={(event) => {
                event.preventDefault()
                if (!pending) onCancel()
            }}
        >
            <span className="calls-dialog-icon">
                <Trash2 size={22} />
            </span>
            <h2 id="revoke-key-title">Revoke this key?</h2>
            <p id="revoke-key-description">
                “{row.name}” for <span className="key-dialog-owner">{row.user_id}</span> will stop
                authenticating new requests.{' '}
                {current
                    ? 'This is your current session key, so you will be signed out.'
                    : 'Clients using it will need a new credential.'}
            </p>
            {error && (
                <p className="calls-dialog-error" role="alert">
                    {error.friendlyMessage || 'Could not revoke this key. Try again.'}
                </p>
            )}
            <div>
                <button className="calls-button" autoFocus disabled={pending} onClick={onCancel}>
                    Keep key
                </button>
                <button className="calls-button calls-confirm-delete" disabled={pending} onClick={onConfirm}>
                    {pending ? 'Revoking…' : current ? 'Revoke and sign out' : 'Revoke key'}
                </button>
            </div>
        </dialog>
    )
}

export default ListAPIkey
