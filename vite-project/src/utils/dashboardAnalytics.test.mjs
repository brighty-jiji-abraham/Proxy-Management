import test from 'node:test'
import assert from 'node:assert/strict'
import { filterBackends, summarizeBackends, summarizeMonitoring, uptimeLabel } from './dashboardAnalytics.js'

test('unknown backends stay distinct from failed backends and routes count separately from instances', () => {
    const data = {
        '/api:0': { route: '/api', name: 'API 1', status: 'healthy', response_time: 0 },
        '/api:1': { route: '/api', name: 'API 2', status: 'unhealthy', response_time: null },
        '/worker:0': { route: '/worker', name: 'Worker', status: 'unknown', response_time: null },
    }
    const health = summarizeBackends(data)
    assert.equal(health.total, 3)
    assert.equal(health.routes, 2)
    assert.equal(health.healthy, 1)
    assert.equal(health.unhealthy, 1)
    assert.equal(health.unknown, 1)
    assert.deepEqual(health.backends.map((backend) => backend.status), ['unhealthy', 'unknown', 'healthy'])
    assert.equal(health.backends[0].response_time, null)
    assert.equal(health.backends[2].response_time, 0)
    assert.equal(data['/api:0'].id, undefined)
})

test('error_rate is already a percentage and must not be multiplied again', () => {
    const result = summarizeMonitoring({ requests_total: 1000, errors_total: 25, error_rate: 2.5, avg_response_time_ms: 180, requests_per_minute: 12 })
    assert.equal(result.errorRate, 2.5)
    assert.equal(result.average, 180)
    assert.equal(result.rpm, 12)
    assert.equal(summarizeMonitoring({ requests_total: 1000, errors_total: 25 }).errorRate, 2.5)
})

test('unavailable metrics and empty traffic do not imply zero latency or perfect success', () => {
    const missing = summarizeMonitoring(undefined)
    assert.equal(missing.total, null)
    assert.equal(missing.errorRate, null)
    assert.equal(missing.average, null)
    assert.equal(missing.uptime, null)
    const empty = summarizeMonitoring({ requests_total: 0, errors_total: 0, error_rate: 0, avg_response_time_ms: 0, uptime_seconds: 0 })
    assert.equal(empty.total, 0)
    assert.equal(empty.errorRate, null)
    assert.equal(empty.average, null)
    assert.equal(uptimeLabel(empty.uptime), '0s')
    assert.equal(summarizeBackends({}).healthyPercent, null)
})

test('status totals and top paths use valid counts and keep informational responses', () => {
    const result = summarizeMonitoring({
        status_codes: { 101: 2, 200: 20, 404: 3, 500: 0, 502: -1 },
        popular_paths: { '/a': 1, '/b': 2, '/c': 3, '/d': 4, '/e': 5, '/f': 6, '/invalid': null },
    })
    assert.equal(result.statusTotal, 25)
    assert.deepEqual(result.statuses.map((status) => status.code), ['200', '404', '101'])
    assert.equal(result.paths.length, 5)
    assert.deepEqual(result.paths[0], ['/f', 6])
})

test('backend filters combine status with case-insensitive search across names, URLs and errors', () => {
    const { backends } = summarizeBackends({
        '/api:0': { name: 'API', route: '/api', url: 'http://worker:8080', status: 'healthy' },
        '/api:1': { name: 'API standby', route: '/api', status: 'unhealthy', error: 'Connection timed out' },
    })
    assert.equal(filterBackends(backends, ' API ', 'healthy').length, 1)
    assert.equal(filterBackends(backends, 'WORKER').length, 1)
    assert.equal(filterBackends(backends, 'timed out', 'unhealthy').length, 1)
    assert.equal(filterBackends(backends, '', 'unknown').length, 0)
})

test('process uptime renders actual elapsed time and preserves unavailable values', () => {
    assert.equal(uptimeLabel(90061), '1d 1h 1m')
    assert.equal(uptimeLabel(3661), '1h 1m')
    assert.equal(uptimeLabel(61), '1m 1s')
    assert.equal(uptimeLabel(null), '—')
    assert.equal(uptimeLabel(-5), '—')
})
