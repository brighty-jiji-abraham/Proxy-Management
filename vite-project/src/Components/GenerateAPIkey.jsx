import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
    ArrowUpRight,
    Check,
    Eye,
    KeyRound,
    LockKeyhole,
    Plus,
    RefreshCw,
    ShieldCheck,
    Terminal,
    UserRound,
} from 'lucide-react'
import dashboardServices from '../services/dashboard.service'
import { PanelHeading } from './CallCharts'
import { KeyCredential, KeyError, KeyRole, KeyStorageNote } from './KeyUI'
import { keyFormPayload } from '../utils/keyAnalytics'
import './CallHistory.css'
import './ServicePages.css'

function GenerateAPIkey() {
    const queryClient = useQueryClient()
    const [issued, setIssued] = useState(null)
    const {
        register,
        handleSubmit,
        reset,
        control,
        setFocus,
        formState: { errors },
    } = useForm({ defaultValues: { user_id: '', name: '' } })
    const values = useWatch({ control })
    const create = useMutation({
        mutationFn: dashboardServices.createApiKey,
        onSuccess: (data, submitted) => {
            const value = data?.api_key || data?.key
            setIssued({ ...submitted, key: typeof value === 'string' && value ? value : null })
            queryClient.invalidateQueries({ queryKey: ['api-keys'] })
            reset()
        },
    })
    const previewOwner = issued?.user_id || values.user_id.trim()
    const previewName = issued?.name || values.name.trim() || 'Your next API key'
    const admin = previewOwner === 'master'
    const createAnother = () => {
        setIssued(null)
        create.reset()
        requestAnimationFrame(() => setFocus('user_id'))
    }
    return (
        <div className="calls-page service-page key-page key-forge-page">
            <header className="calls-header">
                <div>
                    <div className="calls-page-title">
                        <span className="calls-title-icon">
                            <KeyRound size={23} />
                        </span>
                        <h1>Key Forge</h1>
                    </div>
                    <p>Create a credential for an application or client using your proxy.</p>
                </div>
                <div className="calls-header-actions">
                    <Link to="/list-keys" className="calls-button">
                        <Eye size={15} />
                        Open Key Vault
                        <ArrowUpRight size={14} />
                    </Link>
                </div>
            </header>
            <div className="service-content">
                <KeyStorageNote />
                <div className="key-create-grid">
                    {issued ? (
                        <section className="calls-panel key-form-panel key-issued" aria-label="Created key">
                            <div className="key-issued-heading">
                                <span>
                                    <Check size={22} />
                                </span>
                                <div>
                                    <h2>{issued.key ? 'Your key is ready' : 'Check Key Vault'}</h2>
                                    <p>
                                        {issued.key
                                            ? 'Copy the credential and add it to your client.'
                                            : 'The proxy did not return the generated credential.'}
                                    </p>
                                </div>
                            </div>
                            {issued.key ? (
                                <KeyCredential
                                    key={issued.key}
                                    value={issued.key}
                                    label={issued.name}
                                    initiallyRevealed
                                />
                            ) : (
                                <KeyError>
                                    The creation response did not include a key value. Check Key Vault before
                                    creating another key.
                                </KeyError>
                            )}
                            <dl className="service-data-list">
                                <div>
                                    <dt>Label</dt>
                                    <dd>{issued.name}</dd>
                                </div>
                                <div>
                                    <dt>Owner</dt>
                                    <dd>{issued.user_id}</dd>
                                </div>
                                <div>
                                    <dt>Access</dt>
                                    <dd>
                                        <KeyRole admin={admin} />
                                    </dd>
                                </div>
                            </dl>
                            <p className="service-panel-note">
                                Keep the credential in your client's configuration. You can reveal, copy, or
                                revoke it in Key Vault while it remains registered.
                            </p>
                            <div className="key-issued-actions">
                                <Link className="calls-button service-primary-button" to="/list-keys">
                                    <Eye size={15} />
                                    View in Key Vault
                                </Link>
                                <button className="calls-button" onClick={createAnother}>
                                    <Plus size={15} />
                                    Create another key
                                </button>
                            </div>
                        </section>
                    ) : (
                        <section className="calls-panel key-form-panel">
                            <PanelHeading
                                icon={Plus}
                                title="Create an API key"
                                subtitle="Give the key an owner and a label you will recognize later."
                            />
                            <form
                                className="service-form"
                                onSubmit={handleSubmit((form) => create.mutate(keyFormPayload(form)))}
                            >
                                <fieldset disabled={create.isPending}>
                                    <div className="service-field">
                                        <label htmlFor="key-owner">
                                            User ID <span aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id="key-owner"
                                            placeholder="e.g. whatsapp-bot"
                                            autoComplete="off"
                                            aria-required="true"
                                            aria-invalid={Boolean(errors.user_id)}
                                            aria-describedby="key-owner-help"
                                            {...register('user_id', {
                                                validate: (value) =>
                                                    Boolean(value.trim()) || 'Enter a user ID for this key.',
                                            })}
                                        />
                                        <small
                                            id="key-owner-help"
                                            className={errors.user_id ? 'service-field-error' : ''}
                                        >
                                            {errors.user_id?.message ||
                                                'Identifies the client. The user ID master grants administrator access.'}
                                        </small>
                                    </div>
                                    <div className="service-field">
                                        <label htmlFor="key-name">
                                            Label <span className="key-optional">(optional)</span>
                                        </label>
                                        <input
                                            id="key-name"
                                            placeholder="e.g. Production messaging bot"
                                            autoComplete="off"
                                            {...register('name')}
                                        />
                                        <small>
                                            Shown in Key Vault. A blank label becomes “Generated Key”.
                                        </small>
                                    </div>
                                </fieldset>
                                {create.isError && (
                                    <KeyError>
                                        {create.error?.friendlyMessage ||
                                            'Could not create the key. Your details have been kept; try again.'}
                                    </KeyError>
                                )}
                                <div className="key-form-footer">
                                    <span>Creates one key with immediate access.</span>
                                    <button
                                        className="calls-button service-primary-button"
                                        type="submit"
                                        disabled={create.isPending}
                                    >
                                        {create.isPending ? (
                                            <RefreshCw size={15} className="calls-spin" />
                                        ) : (
                                            <Plus size={15} />
                                        )}
                                        {create.isPending ? 'Creating key…' : 'Create key'}
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}
                    <div className="service-column key-creation-aside">
                        <section className="calls-panel key-preview-panel" aria-label="Key preview">
                            <div className="key-preview-title">
                                <span className="key-preview-icon">
                                    <KeyRound size={22} />
                                </span>
                                <span className="calls-tag">
                                    {issued ? 'Issued credential' : 'Live preview'}
                                </span>
                            </div>
                            <h2 className="key-preview-name">{previewName}</h2>
                            <p className="key-preview-owner">
                                <UserRound size={14} />
                                {previewOwner || 'Choose an owner'}
                            </p>
                            <div className="key-preview-token" aria-hidden="true">
                                •••• •••• •••• ••••
                            </div>
                            <dl className="service-data-list">
                                <div>
                                    <dt>Access level</dt>
                                    <dd>
                                        <KeyRole admin={admin} />
                                    </dd>
                                </div>
                                <div>
                                    <dt>Availability</dt>
                                    <dd>{issued ? 'Registered with this proxy' : 'Ready after creation'}</dd>
                                </div>
                                <div>
                                    <dt>Lifetime</dt>
                                    <dd>Until revoked or restarted</dd>
                                </div>
                            </dl>
                        </section>
                        <section className="calls-panel">
                            <PanelHeading
                                icon={Terminal}
                                title="Use your key"
                                subtitle="Send the credential with authenticated requests."
                            />
                            <div className="key-guide">
                                <div className="key-header-example">
                                    <code>Authorization: Bearer YOUR_API_KEY</code>
                                </div>
                                <div className="key-guide-item">
                                    <LockKeyhole size={17} />
                                    <div>
                                        <h3>Store it with your client</h3>
                                        <p>Keep the key in the application's private configuration.</p>
                                    </div>
                                </div>
                                <div className="key-guide-item">
                                    <ShieldCheck size={17} />
                                    <div>
                                        <h3>Manage access in the vault</h3>
                                        <p>
                                            Review each key's last use or revoke it when the client no longer
                                            needs access.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
                <footer className="service-footer">
                    <p>
                        Key creation requires an administrator credential. Last-use information and registered
                        keys are available in Key Vault.
                    </p>
                    <Link className="service-link" to="/list-keys">
                        Manage keys <ArrowUpRight size={13} />
                    </Link>
                </footer>
            </div>
        </div>
    )
}

export default GenerateAPIkey
