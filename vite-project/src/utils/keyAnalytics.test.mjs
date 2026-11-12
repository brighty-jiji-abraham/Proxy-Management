import assert from 'node:assert/strict'
import test from 'node:test'
import { filterKeys, keyDate, keyFormPayload, keyUsage, summarizeKeys } from './keyAnalytics.js'

const now = 1_800_000_000
const data = {
    api_keys: [
        { key: 'fixture-admin', user_id: 'master', name: 'Admin', created_at: now - 1000, last_used: now },
        {
            key: 'fixture-bot',
            user_id: 'bot',
            name: 'Production bot',
            created_at: now - 500,
            last_used: now - 86400,
        },
        {
            key: 'fixture-worker',
            user_id: 'bot',
            name: 'Worker',
            created_at: now - 700,
            last_used: now - 86401,
        },
        {
            key: 'fixture-unused',
            user_id: 'new-client',
            name: 'Unconfigured',
            created_at: now - 100,
            last_used: null,
        },
        {
            key: 'fixture-older',
            user_id: 'archive',
            name: 'Archive',
            created_at: now - 800000,
            last_used: now - 604801,
        },
        {
            key: 'fixture-invalid',
            user_id: 'legacy',
            name: 'Legacy',
            created_at: 'invalid',
            last_used: 'invalid',
        },
    ],
}

test('usage groups cover boundaries and keep never-used distinct from invalid dates', () => {
    assert.equal(keyUsage(now - 86400, now), 'recent')
    assert.equal(keyUsage(now - 86401, now), 'week')
    assert.equal(keyUsage(now - 604800, now), 'week')
    assert.equal(keyUsage(now - 604801, now), 'older')
    assert.equal(keyUsage(null, now), 'never')
    assert.equal(keyUsage(undefined, now), 'never')
    assert.equal(keyUsage('invalid', now), 'unknown')
    assert.equal(keyUsage(now + 1, now), 'unknown')
    assert.equal(keyUsage(0, now), 'older')
})

test('summaries count credentials and owners using latest-use timestamps, not requests', () => {
    const summary = summarizeKeys(data, now)
    assert.equal(summary.total, 6)
    assert.equal(summary.admins, 1)
    assert.equal(summary.clients, 5)
    assert.equal(summary.recent, 2)
    assert.equal(summary.never, 1)
    assert.equal(
        summary.usage.reduce((sum, group) => sum + group.count, 0),
        6
    )
    assert.deepEqual(summary.owners[0], ['bot', 2])
    assert.equal(summary.rows[5].created_at, null)
    assert.equal(summary.rows[5].usage, 'unknown')
    assert.equal(data.api_keys[5].last_used, 'invalid')
})

test('search, role, and usage filters compose and never search secret values', () => {
    const { rows } = summarizeKeys(data, now)
    assert.deepEqual(
        filterKeys(rows, { search: ' BOT ', role: 'client', usage: 'recent' }).map((row) => row.name),
        ['Production bot']
    )
    assert.equal(filterKeys(rows, { role: 'admin' }).length, 1)
    assert.equal(filterKeys(rows, { search: 'fixture-admin' }).length, 0)
    assert.equal(filterKeys(rows, { sort: 'newest' })[0].name, 'Unconfigured')
    assert.equal(filterKeys(rows, { sort: 'used' })[0].name, 'Admin')
    assert.equal(filterKeys(rows, { sort: 'name' })[0].name, 'Admin')
    assert.equal(rows[0].name, 'Admin')
})

test('empty and malformed registries are handled and unnamed metadata gets a label', () => {
    assert.equal(summarizeKeys(undefined, now).total, 0)
    assert.equal(summarizeKeys({ api_keys: {} }, now).total, 0)
    const result = summarizeKeys(
        { api_keys: [null, {}, { key: '' }, { key: 'fixture', name: ' ', user_id: null }] },
        now
    )
    assert.equal(result.total, 1)
    assert.equal(result.rows[0].name, 'Unnamed key')
    assert.equal(result.rows[0].user_id, 'Unassigned')
    assert.equal(result.rows[0].isAdmin, false)
})

test('creation trims user input and applies the API default label', () => {
    assert.deepEqual(keyFormPayload({ user_id: ' bot ', name: ' ' }), {
        user_id: 'bot',
        name: 'Generated Key',
    })
    assert.deepEqual(keyFormPayload({ user_id: 'master', name: ' Admin laptop ' }), {
        user_id: 'master',
        name: 'Admin laptop',
    })
    assert.equal(keyDate(null, 'Never used'), 'Never used')
    assert.equal(keyDate(Infinity), 'Not reported')
    assert.notEqual(keyDate(0), 'Not reported')
})
