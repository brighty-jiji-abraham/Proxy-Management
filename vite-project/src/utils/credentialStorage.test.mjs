import test from 'node:test'
import assert from 'node:assert/strict'
import { readCredential, saveCredential } from './credentialStorage.js'

const storage = () => {
    const values = new Map()
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
    }
}

test('existing saved credentials and configured defaults stay compatible', () => {
    const local = storage(),
        session = storage()
    assert.equal(readCredential(local, session, 'configured'), 'configured')
    local.setItem('proxyApiKey', 'existing')
    assert.equal(readCredential(local, session, 'configured'), 'existing')
})

test('temporary sign-in removes a previously remembered key and does not return to a configured key', () => {
    const local = storage(),
        session = storage()
    saveCredential('old', true, local, session)
    saveCredential('temporary', false, local, session)
    assert.equal(local.getItem('proxyApiKey'), null)
    assert.equal(readCredential(local, session, 'configured'), 'temporary')
    assert.equal(readCredential(local, storage(), 'configured'), '')
})

test('remembering a key replaces the temporary credential and survives a new session', () => {
    const local = storage(),
        session = storage()
    saveCredential('temporary', false, local, session)
    saveCredential('remembered', true, local, session)
    assert.equal(session.getItem('proxyApiKey'), null)
    assert.equal(readCredential(local, storage(), 'configured'), 'remembered')
})

test('sign-out clears both stores and prevents automatic sign-in from the build configuration', () => {
    const local = storage(),
        session = storage()
    local.setItem('proxyApiKey', 'old')
    session.setItem('proxyApiKey', 'temporary')
    saveCredential('', true, local, session)
    assert.equal(local.getItem('proxyApiKey'), null)
    assert.equal(session.getItem('proxyApiKey'), null)
    assert.equal(readCredential(local, session, 'configured'), '')
})
