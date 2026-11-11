import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeCalls, callsCsv, duration, filterCalls, percentile } from './callAnalytics.js'

const minute = 1_800_000_000
const call = (overrides = {}) => ({
    at: minute + 10,
    route: '/crawler',
    path: '/crawler/jobs',
    method: 'GET',
    status: 200,
    ms: 100,
    client: '127.0.0.1',
    backend: 'http://worker:8080',
    ...overrides,
})

test('full traffic totals and weighted average stay independent of retained requests', () => {
    const result = analyzeCalls({
        window_minutes: 60,
        traffic: [
            { minute, count: 1, errors: 0, avg_ms: 1000 },
            { minute: minute + 60, count: 9, errors: 2, avg_ms: 100 },
        ],
        requests: [call({ ms: 400 }), call({ at: minute + 70, status: 500, ms: 1000 })],
    })
    assert.equal(result.total, 10)
    assert.equal(result.average, 190)
    assert.equal(result.successRate, 80)
    assert.equal(result.requests.length, 2)
    assert.equal(result.p95, 1000)
    assert.equal(result.rpm, 5)
})

test('window boundaries use the API snapshot, so paused data does not drift', () => {
    const traffic = Array.from({ length: 60 }, (_, i) => ({
        minute: minute + i * 60,
        count: 1,
        errors: 0,
        avg_ms: 50,
    }))
    const result = analyzeCalls(
        {
            window_minutes: 60,
            traffic,
            requests: [
                call({ at: minute + 44 * 60 + 59 }),
                call({ at: minute + 45 * 60 }),
                call({ at: minute + 60 * 60 - 1 }),
                call({ at: minute + 60 * 60 }),
            ],
        },
        15
    )
    assert.equal(result.total, 15)
    assert.equal(result.requests.length, 2)
    assert.equal(result.series[0].minute, minute + 45 * 60)
    assert.equal(result.windowMinutes, 15)
})

test('empty traffic does not imply 100% success or a zero-millisecond response', () => {
    const result = analyzeCalls(undefined)
    assert.equal(result.successRate, null)
    assert.equal(result.average, null)
    assert.equal(result.p95, null)
    assert.equal(result.peak, null)
    assert.equal(result.trend, null)
    assert.equal(result.requests.length, 0)
    assert.equal(duration(null), '—')
    assert.equal(duration(0), '0 ms')
})

test('percentiles use nearest rank and never mutate their input', () => {
    const values = [400, 0, 200, 100]
    assert.equal(percentile(values, 50), 100)
    assert.equal(percentile(values, 95), 400)
    assert.deepEqual(values, [400, 0, 200, 100])
    assert.equal(percentile([], 95), null)
})

test('status and latency buckets handle boundaries, transport failures, and missing timing', () => {
    const requests = [0, 99, 100, 299, 300, 499, 500, 999, 1000, 2999, 3000, null].map((ms, i) =>
        call({
            ms,
            status: i === 0 ? null : i === 1 ? 101 : 200,
            error: i === 0 ? 'Connection refused' : null,
        })
    )
    const result = analyzeCalls({ traffic: [{ minute, count: 12, errors: 1, avg_ms: 500 }], requests })
    assert.deepEqual(
        result.distribution.map((b) => b.count),
        [2, 2, 2, 2, 2, 1]
    )
    assert.equal(result.slow, 3)
    assert.equal(result.statuses.find((s) => s.key === 'other').count, 1)
    assert.equal(result.statuses.find((s) => s.key === '1xx').count, 1)
    assert.equal(
        result.statuses.reduce((sum, s) => sum + s.count, 0),
        12
    )
})

test('trend compares equal completed intervals and excludes the live minute', () => {
    const traffic = [5, 5, 10, 10, 900].map((count, i) => ({
        minute: minute + i * 60,
        count,
        errors: 0,
        avg_ms: 100,
    }))
    const result = analyzeCalls({ traffic, requests: [] })
    assert.equal(result.trend, 100)
    assert.equal(result.trendMinutes, 2)
    assert.equal(result.peak.count, 900)
})

test('request filters compose search, HTTP method, failure, and slow-call filters', () => {
    const requests = [
        call(),
        call({ method: 'POST', ms: 1000, status: 500 }),
        call({ status: null, error: 'Connection refused', ms: 25 }),
    ]
    assert.equal(filterCalls(requests, { outcome: 'errors' }).length, 2)
    assert.equal(filterCalls(requests, { search: ' WORKER ', outcome: 'slow', method: 'POST' }).length, 1)
    assert.equal(filterCalls(requests, { search: 'connection' }).length, 1)
    assert.equal(filterCalls(requests, { search: 'not here' }).length, 0)
})

test('CSV quotes commas, newlines, and double quotes and neutralizes formulas', () => {
    const csv = callsCsv([
        call({ path: '/say,"hello"', client: '=HYPERLINK("bad")', error: 'line one\nline two' }),
    ])
    assert.ok(csv.includes('"/say,""hello"""'))
    assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'))
    assert.ok(csv.includes('"line one\nline two"'))
    assert.ok(csv.startsWith('"Time (UTC)"'))
})

test('configured shorter windows and endpoint method distinctions are preserved', () => {
    const result = analyzeCalls(
        {
            window_minutes: 10,
            traffic: [{ minute, count: 4, errors: 0, avg_ms: 100 }],
            requests: [call(), call(), call({ method: 'POST' }), call({ route: '/other' })],
        },
        60
    )
    assert.equal(result.windowMinutes, 10)
    assert.equal(result.endpoints.length, 3)
    assert.equal(result.endpoints[0].count, 2)
    assert.equal(result.clients, 1)
    assert.equal(result.backends, 1)
})
