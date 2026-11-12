import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
    ArrowUpRight,
    Boxes,
    ChevronDown,
    Cpu,
    HardDrive,
    Info,
    Layers,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    X,
} from 'lucide-react'
import { PanelHeading } from './CallCharts'
import {
    CopyButton,
    ServiceBanner,
    ServiceBars,
    ServiceEmpty,
    ServiceFooter,
    ServiceHeader,
    ServiceMetric,
    ServiceState,
} from './ServiceUI'
import { bytesLabel, filterModels, modelSummary, pollingOptions } from '../utils/serviceAnalytics'
import { number } from '../utils/callAnalytics'

// Use the public proxy route, never the admin client or its master key.
const proxyRoot = () =>
    (import.meta.env.VITE_baseURL || '').replace(/\/admin\/?$/, '') || 'http://localhost:2000'
const familyColors = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#818cf8', '#94a3b8']
const modifiedLabel = (value) =>
    value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString() : '—'

function Ollama() {
    const [paused, setPaused] = useState(false)
    const [filters, setFilters] = useState({ search: '', family: 'all', sort: 'name' })
    const libraryRef = useRef(null)
    const tags = useQuery({
        queryKey: ['ollama-tags'],
        queryFn: async () => (await axios.get(proxyRoot() + '/ollama/api/tags', { timeout: 15000 })).data,
        ...pollingOptions(paused, 30000),
    })
    const version = useQuery({
        queryKey: ['ollama-version'],
        queryFn: async () => (await axios.get(proxyRoot() + '/ollama/api/version', { timeout: 10000 })).data,
        ...pollingOptions(paused, 60000),
    })
    const sources = [
        { ...tags, label: 'Model catalog' },
        { ...version, label: 'Ollama version' },
    ]
    const summary = useMemo(() => modelSummary(tags.data), [tags.data])
    const models = useMemo(() => filterModels(summary.models, filters), [summary.models, filters])
    const largest = [...summary.models]
        .filter((model) => model.size != null)
        .sort((a, b) => b.size - a.size)
        .slice(0, 6)
    const reachable = tags.isSuccess
    const update = (changes) => setFilters((previous) => ({ ...previous, ...changes }))
    const inspectFamily = (family) => {
        update({ family, search: '' })
        libraryRef.current?.scrollIntoView({
            block: 'start',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        })
    }
    const resetFilters = () => update({ search: '', family: 'all' })
    return (
        <div className="calls-page service-page ollama-page">
            <ServiceHeader
                icon={Cpu}
                title="Ollama"
                description="Explore the local models available through your proxy."
                sources={sources}
                paused={paused}
                onPause={() => setPaused((value) => !value)}
                interval="every 30 seconds; version every minute"
            />
            <div className="service-content">
                <ServiceBanner
                    icon={reachable ? ShieldCheck : Cpu}
                    tone={tags.isError ? 'unhealthy' : reachable ? 'healthy' : 'unknown'}
                    title={
                        tags.isError
                            ? 'Ollama could not be reached'
                            : reachable
                              ? 'Model API reachable'
                              : 'Checking the model API'
                    }
                    description={
                        tags.isError
                            ? 'Check the /ollama proxy route and Ollama host. Any previous catalog is shown below.'
                            : reachable
                              ? 'The proxy successfully returned the installed model catalog.'
                              : 'Waiting for a response through the /ollama route.'
                    }
                >
                    <span>Ollama version{version.isError && version.data ? ' (last known)' : ''}</span>
                    <strong>{version.data?.version || '—'}</strong>
                </ServiceBanner>
                <div className="calls-metrics">
                    <ServiceMetric
                        icon={Boxes}
                        label="Installed model tags"
                        value={tags.data ? number(summary.models.length) : null}
                        note="Available in the model catalog"
                    />
                    <ServiceMetric
                        icon={HardDrive}
                        label="Combined model sizes"
                        value={
                            tags.data && (summary.sized || !summary.models.length)
                                ? bytesLabel(summary.size)
                                : null
                        }
                        color="cyan"
                        note={
                            summary.sized < summary.models.length
                                ? summary.sized + ' of ' + summary.models.length + ' sizes reported'
                                : 'Sum of reported model sizes'
                        }
                    />
                    <ServiceMetric
                        icon={Layers}
                        label="Model families"
                        value={
                            tags.data
                                ? summary.families.filter(([family]) => family !== 'Unknown').length
                                : null
                        }
                        color="green"
                        note="Distinct reported architectures"
                    />
                    <ServiceMetric
                        icon={SlidersHorizontal}
                        label="Quantization formats"
                        value={tags.data ? summary.quantizations : null}
                        color="amber"
                        note="Distinct formats in this catalog"
                    />
                </div>
                <div className="service-grid">
                    <section className="calls-panel">
                        <PanelHeading
                            icon={HardDrive}
                            title="Model size comparison"
                            subtitle="The six largest model tags, by reported size."
                        />
                        <ServiceState query={tags} title="Model sizes">
                            <ServiceBars
                                label="Installed model sizes"
                                emptyText="No model sizes available"
                                items={largest.map((model) => ({
                                    key: model.name,
                                    label: model.name,
                                    value: model.size,
                                    display: bytesLabel(model.size),
                                    color: 'var(--calls-violet)',
                                }))}
                            />
                        </ServiceState>
                        <p className="service-panel-note">
                            Models can share stored layers. Combined sizes do not represent actual disk usage
                            or runtime memory.
                        </p>
                    </section>
                    <section className="calls-panel">
                        <PanelHeading
                            icon={Layers}
                            title="Model families"
                            subtitle="Select an architecture to filter the catalog."
                        />
                        <ServiceState query={tags} title="Model families">
                            {summary.models.length ? (
                                <FamilyChart summary={summary} onSelect={inspectFamily} />
                            ) : (
                                <ServiceEmpty
                                    icon={Cpu}
                                    title="No model families yet"
                                    description="Families appear when models are installed."
                                />
                            )}
                        </ServiceState>
                    </section>
                </div>
                <section className="calls-panel model-library" ref={libraryRef}>
                    <PanelHeading
                        icon={Boxes}
                        title="Model library"
                        subtitle="Search names and formats. Expand a model to inspect its metadata."
                    >
                        <Link className="service-link" to="/calls?route=%2Follama">
                            View calls <ArrowUpRight size={13} />
                        </Link>
                    </PanelHeading>
                    <div className="service-toolbar">
                        <label className="calls-search">
                            <Search size={16} />
                            <input
                                type="search"
                                aria-label="Search models"
                                placeholder="Find a model, family, or quantization…"
                                value={filters.search}
                                onChange={(event) => update({ search: event.target.value })}
                            />
                            {filters.search && (
                                <button
                                    aria-label="Clear model search"
                                    onClick={() => update({ search: '' })}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </label>
                        <select
                            className="service-select"
                            aria-label="Model family"
                            value={filters.family}
                            onChange={(event) => update({ family: event.target.value })}
                        >
                            <option value="all">All families</option>
                            {summary.families.map(([family]) => (
                                <option key={family} value={family}>
                                    {family}
                                </option>
                            ))}
                        </select>
                        <select
                            className="service-select"
                            aria-label="Sort models"
                            value={filters.sort}
                            onChange={(event) => update({ sort: event.target.value })}
                        >
                            <option value="name">Name A–Z</option>
                            <option value="size">Largest first</option>
                            <option value="modified">Recently modified</option>
                        </select>
                    </div>
                    <ServiceState query={tags} title="Model catalog">
                        {!models.length ? (
                            <ServiceEmpty
                                icon={Cpu}
                                title={summary.models.length ? 'No matching models' : 'No models installed'}
                                description={
                                    summary.models.length
                                        ? 'Try another search or show all model families.'
                                        : 'Install a model on your Ollama host, then refresh the catalog.'
                                }
                            >
                                {summary.models.length > 0 && (
                                    <button className="calls-button" onClick={resetFilters}>
                                        Reset filters
                                    </button>
                                )}
                            </ServiceEmpty>
                        ) : (
                            models.map((model) => (
                                <details className="model-row" key={model.name}>
                                    <summary>
                                        <span className="model-icon">
                                            <Cpu size={18} />
                                        </span>
                                        <div className="model-identity">
                                            <strong>{model.name}</strong>
                                            <div className="model-tags">
                                                {[
                                                    model.family,
                                                    model.details?.parameter_size,
                                                    model.details?.quantization_level,
                                                ]
                                                    .filter(Boolean)
                                                    .map((tag, index) => (
                                                        <span key={index}>{tag}</span>
                                                    ))}
                                            </div>
                                        </div>
                                        <div className="model-summary-stat">
                                            <span>Model size</span>
                                            <strong>{bytesLabel(model.size)}</strong>
                                        </div>
                                        <div className="model-summary-stat model-summary-modified">
                                            <span>Modified</span>
                                            <strong>{modifiedLabel(model.modified_at)}</strong>
                                        </div>
                                        <ChevronDown size={16} className="service-chevron" />
                                    </summary>
                                    <div className="service-details">
                                        <div className="service-detail-grid">
                                            <div>
                                                <span>Architecture</span>
                                                <strong>{model.family}</strong>
                                            </div>
                                            <div>
                                                <span>Parameters</span>
                                                <strong>
                                                    {model.details?.parameter_size || 'Not reported'}
                                                </strong>
                                            </div>
                                            <div>
                                                <span>Quantization</span>
                                                <strong>
                                                    {model.details?.quantization_level || 'Not reported'}
                                                </strong>
                                            </div>
                                            <div>
                                                <span>File format</span>
                                                <strong>{model.details?.format || 'Not reported'}</strong>
                                            </div>
                                            <div>
                                                <span>Parent model</span>
                                                <strong>
                                                    {model.details?.parent_model || 'Not reported'}
                                                </strong>
                                            </div>
                                            <div>
                                                <span>Last modified</span>
                                                <strong>
                                                    {model.modified_at &&
                                                    Number.isFinite(Date.parse(model.modified_at))
                                                        ? new Date(model.modified_at).toLocaleString()
                                                        : 'Not reported'}
                                                </strong>
                                            </div>
                                            <div className="model-details-wide">
                                                <span>Model name</span>
                                                <div className="model-copy-row">
                                                    <code>{model.name}</code>
                                                    <CopyButton
                                                        value={model.name}
                                                        label={'Copy model name ' + model.name}
                                                    />
                                                </div>
                                            </div>
                                            <div className="model-details-wide">
                                                <span>Digest</span>
                                                <strong>{model.digest || 'Not reported'}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            ))
                        )}
                    </ServiceState>
                    <div className="calls-table-footer">
                        <span>
                            {tags.data
                                ? number(models.length) +
                                  ' of ' +
                                  number(summary.models.length) +
                                  ' model tags shown'
                                : 'Waiting for the model catalog'}
                        </span>
                        <span>Catalog refreshes every 30 seconds</span>
                    </div>
                </section>
                <section className="calls-panel">
                    <PanelHeading
                        icon={Info}
                        title="Proxy access"
                        subtitle="Connection details for applications using these models."
                    />
                    <div className="service-grid">
                        <div className="service-column">
                            <dl className="service-data-list">
                                <div>
                                    <dt>Base URL</dt>
                                    <dd>{proxyRoot() + '/ollama'}</dd>
                                </div>
                                <div>
                                    <dt>Model catalog</dt>
                                    <dd>/ollama/api/tags</dd>
                                </div>
                            </dl>
                        </div>
                        <p className="service-inline-note">
                            <Info size={17} />
                            <span>
                                This route does not require an API key. Anyone who can reach it can access the
                                Ollama API. Keep access limited to trusted clients.
                            </span>
                        </p>
                    </div>
                </section>
                <ServiceFooter sources={sources}>
                    Sizes and metadata come from Ollama's installed model catalog. They do not indicate which
                    models are loaded into memory. Version information refreshes once a minute.
                </ServiceFooter>
            </div>
        </div>
    )
}

function FamilyChart({ summary, onSelect }) {
    let offset = 0
    const segments = summary.families.map(([family, count], index) => {
        const segment = {
            family,
            count,
            length: (count / summary.models.length) * 100,
            offset,
            color: familyColors[index % familyColors.length],
        }
        offset += segment.length
        return segment
    })
    return (
        <div className="model-family-layout">
            <div className="model-family-ring">
                <svg
                    viewBox="0 0 120 120"
                    role="img"
                    aria-label={segments
                        .map((segment) => segment.family + ': ' + segment.count + ' models')
                        .join(', ')}
                >
                    <circle cx="60" cy="60" r="49" stroke="#263249" fill="none" strokeWidth="9" />
                    {segments.map((segment) => (
                        <circle
                            key={segment.family}
                            cx="60"
                            cy="60"
                            r="49"
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="9"
                            pathLength="100"
                            strokeDasharray={segment.length + ' ' + (100 - segment.length)}
                            strokeDashoffset={-segment.offset}
                        />
                    ))}
                </svg>
                <div>
                    <strong>{summary.models.length}</strong>
                    <span>model tags</span>
                </div>
            </div>
            <div className="model-family-legend">
                {segments.map((segment) => (
                    <button
                        key={segment.family}
                        onClick={() => onSelect(segment.family)}
                        aria-label={'Show ' + segment.family + ' models'}
                    >
                        <i style={{ background: segment.color }} />
                        <span>{segment.family}</span>
                        <strong>{segment.count}</strong>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default Ollama
