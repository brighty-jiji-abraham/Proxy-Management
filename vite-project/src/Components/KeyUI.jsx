import { useState } from 'react'
import { AlertCircle, Check, Copy, Eye, EyeOff, Info, ShieldCheck, UserRound } from 'lucide-react'
import './KeyPages.css'

export function KeyCredential({ value, label, initiallyRevealed = false }) {
    const [revealed, setRevealed] = useState(initiallyRevealed)
    const [copyState, setCopyState] = useState('idle')
    return (
        <div className="key-credential">
            <div className="key-credential-field">
                <code aria-label={revealed ? 'API key value' : 'API key hidden'}>
                    {revealed ? value : '•••• •••• •••• ••••'}
                </code>
                <div>
                    <button
                        className="calls-icon-button"
                        type="button"
                        aria-label={(revealed ? 'Hide key for ' : 'Reveal key for ') + label}
                        title={revealed ? 'Hide key' : 'Reveal key'}
                        aria-pressed={revealed}
                        onClick={() => setRevealed((previous) => !previous)}
                    >
                        {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                        className="calls-button"
                        type="button"
                        aria-label={'Copy key for ' + label}
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(value)
                                setCopyState('copied')
                            } catch {
                                setCopyState('error')
                            }
                        }}
                    >
                        {copyState === 'copied' ? <Check size={15} /> : <Copy size={15} />}
                        {copyState === 'copied' ? 'Copied' : 'Copy'}
                    </button>
                </div>
            </div>
            <span
                className={copyState === 'error' ? 'key-copy-feedback error' : 'calls-sr-only'}
                role="status"
            >
                {copyState === 'error'
                    ? 'Clipboard access is blocked. Reveal the key, then select and copy it.'
                    : copyState === 'copied'
                      ? 'Key copied to clipboard.'
                      : ''}
            </span>
        </div>
    )
}

export function KeyRole({ admin }) {
    return (
        <span className={'key-role' + (admin ? ' admin' : '')}>
            {admin ? <ShieldCheck size={12} /> : <UserRound size={12} />}
            {admin ? 'Administrator' : 'Client'}
        </span>
    )
}

export function KeyStorageNote() {
    return (
        <div className="key-storage-note">
            <Info size={17} />
            <div>
                <strong>Generated keys last for this proxy session.</strong>
                <p>
                    They are held in memory, cleared on restart, and are not shared across worker processes.
                </p>
            </div>
        </div>
    )
}

export function KeyError({ children }) {
    return (
        <div className="service-feedback" role="alert">
            <AlertCircle size={16} />
            <span>{children}</span>
        </div>
    )
}
