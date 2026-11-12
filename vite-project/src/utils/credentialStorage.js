const KEY = 'proxyApiKey'
const PREFERENCE = 'proxyCredentialSource'

export function readCredential(persistent, session, configuredKey = '') {
    return (
        session.getItem(KEY) ||
        persistent.getItem(KEY) ||
        (persistent.getItem(PREFERENCE) === 'manual' ? '' : configuredKey)
    )
}

export function saveCredential(key, remember, persistent, session) {
    // Explicit sign-in or sign-out takes precedence over a build-time default,
    // including after a temporary browser session has ended.
    persistent.setItem(PREFERENCE, 'manual')
    persistent.removeItem(KEY)
    session.removeItem(KEY)
    if (key) (remember ? persistent : session).setItem(KEY, key)
}
