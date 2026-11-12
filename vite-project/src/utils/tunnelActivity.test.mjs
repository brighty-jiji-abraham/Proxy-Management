import test from 'node:test'
import assert from 'node:assert/strict'
import {
    appendTrafficSample,
    connectionEvents,
    observeTunnelTraffic,
    requestParticleCount,
    trafficWindow,
    tunnelSampleCsv,
} from './tunnelActivity.js'

const base = {
    connected: true,
    requests_served: 1000,
    requests_in_flight: 0,
    server_url: 'wss://fixture',
    client_name: 'client',
    local_target: 'http://fixture',
}

test('the initial snapshot establishes a baseline without replaying lifetime requests', () => {
    const sample = observeTunnelTraffic(null, base, 10000)
    assert.equal(sample.newRequests, null)
    assert.equal(sample.rate, null)
    assert.equal(requestParticleCount(sample), 0)
})

test('adjacent snapshots calculate new arrivals and rate using actual elapsed time', () => {
    const first = observeTunnelTraffic(null, base, 10000)
    const next = observeTunnelTraffic(first, { ...base, requests_served: 1012 }, 16000)
    assert.equal(next.newRequests, 12)
    assert.equal(next.rate, 2)
    assert.equal(requestParticleCount(next), 5)
    const idle = observeTunnelTraffic(next, { ...base, requests_served: 1012 }, 21000)
    assert.equal(idle.newRequests, 0)
    assert.equal(idle.rate, 0)
    assert.equal(requestParticleCount(idle), 0)
})

test('in-flight requests can animate without inventing new arrivals', () => {
    const sample = observeTunnelTraffic(null, { ...base, requests_in_flight: 3 }, 10000)
    assert.equal(sample.newRequests, null)
    assert.equal(requestParticleCount(sample), 3)
    assert.equal(requestParticleCount({ ...sample, connected: false }), 0)
})

test('resets, changed connections, long gaps and repeated timestamps establish a new baseline', () => {
    const first = observeTunnelTraffic(null, base, 10000)
    for (const [data, at] of [
        [{ ...base, requests_served: 2 }, 15000],
        [{ ...base, requests_served: 2000, server_url: 'wss://another' }, 15000],
        [{ ...base, requests_served: 2000 }, 30000],
        [{ ...base, requests_served: 2000 }, 10000],
        [{ ...base, requests_served: 2000, connected: false }, 15000],
    ]) {
        const sample = observeTunnelTraffic(first, data, at)
        assert.equal(sample.newRequests, null)
        assert.equal(sample.rate, null)
    }
})

test('unavailable or invalid counters never become zero or a synthetic request burst', () => {
    const first = observeTunnelTraffic(null, base, 10000)
    for (const requests_served of [undefined, null, NaN, -1, '1002']) {
        const sample = observeTunnelTraffic(first, { ...base, requests_served }, 15000)
        assert.equal(sample.total, null)
        assert.equal(sample.newRequests, null)
        assert.equal(requestParticleCount(sample), 0)
    }
})

test('history is bounded, deduplicated, and clears when the connection configuration changes', () => {
    let history = []
    for (let at = 1000; at <= 700000; at += 1000)
        history = appendTrafficSample(history, { at, identity: 'one' })
    assert.equal(history.length, 301)
    assert.equal(history[0].at, 400000)
    assert.equal(appendTrafficSample(history, { at: 700000, identity: 'one' }), history)
    assert.deepEqual(appendTrafficSample(history, { at: 701000, identity: 'two' }), [
        { at: 701000, identity: 'two' },
    ])
    for (let at = 700001; at < 701000; at++) history = appendTrafficSample(history, { at, identity: 'one' })
    assert.equal(history.length, 360)
})

test('window averages weight elapsed time and exclude missing observations', () => {
    const first = observeTunnelTraffic(null, base, 10000)
    const second = observeTunnelTraffic(
        first,
        { ...base, requests_served: 1010, requests_in_flight: 4 },
        15000
    )
    const third = observeTunnelTraffic(
        second,
        { ...base, requests_served: 1015, requests_in_flight: 2 },
        25000
    )
    const gap = observeTunnelTraffic(null, { ...base, requests_served: 1040 }, 70000)
    const all = trafficWindow([first, second, third, gap], 300)
    assert.equal(all.average, 1)
    assert.equal(all.peak, 2)
    assert.equal(all.requests, 15)
    assert.equal(all.peakInFlight, 4)
    const recent = trafficWindow([first, second, third, gap], 30)
    assert.equal(recent.average, null)
    assert.equal(recent.peak, null)
    assert.equal(recent.requests, null)
    assert.equal(trafficWindow([], 60).peakInFlight, null)
})

test('CSV contains only observations and preserves unknown values', () => {
    const first = observeTunnelTraffic(null, base, 10000)
    const csv = tunnelSampleCsv([first])
    assert.match(csv, /1970-01-01T00:00:10.000Z,,,0,/)
    assert.ok(!csv.includes('fixture'))
    assert.equal(csv.split('\r\n').length, 2)
})

test('connection events report changes without repeating unchanged snapshots or inventing reconnects', () => {
    const current = { status: 'connected', identity: 'one', reconnects: 4, total: 1000 }
    assert.equal(connectionEvents(null, current, 10000).length, 1)
    assert.deepEqual(connectionEvents(current, current, 15000), [])
    const reconnect = connectionEvents(current, { ...current, reconnects: 6 }, 15000)
    assert.match(reconnect[0].message, /increased by 2/)
    const reset = connectionEvents(current, { ...current, total: 2 }, 15000)
    assert.match(reset[0].message, /counter restarted/)
    const changed = connectionEvents(current, { ...current, identity: 'two', total: 0, reconnects: 9 }, 15000)
    assert.equal(changed.length, 1)
    assert.match(changed[0].message, /configuration changed/)
    assert.match(
        connectionEvents(current, { ...current, status: 'disconnected' }, 15000)[0].message,
        /disconnected/
    )
})
