import assert from 'node:assert/strict'
import test from 'node:test'
import {
    bytesLabel,
    filterModels,
    groupBackendRoutes,
    modelSummary,
    pollingOptions,
    tunnelPayload,
    validUrl,
} from './serviceAnalytics.js'

test('route coverage keeps unknown instances separate and counts healthy redundancy', () => {
    const input = [
        { route: '/a', status: 'healthy' },
        { route: '/a', status: 'healthy' },
        { route: '/b', status: 'unknown' },
        { route: '/b', status: 'unhealthy' },
    ]
    const result = groupBackendRoutes(input)
    assert.equal(result[0].route, '/b')
    assert.equal(result[0].healthy, 0)
    assert.equal(result[0].unhealthy, 1)
    assert.equal(result[0].unknown, 1)
    assert.equal(result[1].healthy, 2)
    assert.equal(input[0].route, '/a')
})

test('model metadata preserves zero and missing sizes, and distinct tags sharing one digest', () => {
    const result = modelSummary({
        models: [
            {
                name: 'model:large',
                digest: 'same',
                size: 2 ** 30,
                details: { family: 'llama', quantization_level: 'Q4' },
            },
            {
                name: 'model:latest',
                digest: 'same',
                size: 2 ** 30,
                details: { family: 'llama', quantization_level: 'Q4' },
            },
            { model: 'empty', size: 0 },
            { name: 'missing' },
            { name: 'invalid', size: -1 },
            null,
        ],
    })
    assert.equal(result.models.length, 5)
    assert.equal(result.size, 2 ** 31)
    assert.equal(result.sized, 3)
    assert.equal(result.models[2].size, 0)
    assert.equal(result.models[3].size, null)
    assert.equal(result.models[4].size, null)
    assert.equal(result.quantizations, 1)
    assert.deepEqual(result.families, [
        ['Unknown', 3],
        ['llama', 2],
    ])
    assert.deepEqual(modelSummary(null).models, [])
})

test('model search, family and sorting compose without mutating the source catalog', () => {
    const { models } = modelSummary({
        models: [
            { name: 'a', size: 0, details: { family: 'llama', quantization_level: 'Q4' } },
            { name: 'b', details: { family: 'llama' }, modified_at: 'invalid' },
            {
                name: 'c',
                size: 200,
                details: { family: 'qwen', quantization_level: 'Q4' },
                modified_at: '2026-11-10',
            },
        ],
    })
    assert.deepEqual(
        filterModels(models, { search: ' Q4 ', family: 'llama' }).map((model) => model.name),
        ['a']
    )
    assert.deepEqual(
        filterModels(models, { sort: 'size' }).map((model) => model.name),
        ['c', 'a', 'b']
    )
    assert.equal(filterModels(models, { sort: 'modified' })[0].name, 'c')
    assert.deepEqual(
        models.map((model) => model.name),
        ['a', 'b', 'c']
    )
})

test('model sizes use binary units and distinguish unavailable from zero', () => {
    assert.equal(bytesLabel(2 ** 30), '1 GiB')
    assert.equal(bytesLabel(2 ** 20), '1 MiB')
    assert.equal(bytesLabel(0), '0 B')
    assert.equal(bytesLabel(null), '—')
    assert.equal(bytesLabel(-5), '—')
})

test('connection URLs validate protocol and host; blank tunnel URLs may use host defaults', () => {
    assert.equal(validUrl('http://localhost:3000'), true)
    assert.equal(validUrl('https://'), false)
    assert.equal(validUrl('file:///config'), false)
    assert.equal(validUrl('wss://head/tunnel', ['ws:', 'wss:']), true)
    assert.equal(validUrl('http://head', ['ws:', 'wss:']), false)
    assert.equal(validUrl('', ['ws:', 'wss:'], true), true)
    assert.equal(validUrl(''), false)
})

test('saving tunnel settings omits a blank token and preserves a supplied credential', () => {
    const form = {
        server_url: ' wss://head/tunnel ',
        local_target: ' http://localhost:2000 ',
        client_name: ' box ',
        token: '',
    }
    assert.deepEqual(tunnelPayload(form), {
        server_url: 'wss://head/tunnel',
        local_target: 'http://localhost:2000',
        client_name: 'box',
    })
    assert.equal(tunnelPayload({ ...form, token: 'new-token' }).token, 'new-token')
    assert.equal(form.server_url, ' wss://head/tunnel ')
})

test('pausing disables automatic refresh and authorization failures are not retried', () => {
    const options = pollingOptions(true, 10000)
    assert.equal(options.refetchInterval, false)
    assert.equal(options.refetchOnWindowFocus, false)
    assert.equal(options.refetchOnReconnect, false)
    assert.equal(options.retry(0, { statusCode: 403 }), false)
    assert.equal(options.retry(0, { response: { status: 401 } }), false)
    assert.equal(options.retry(0, { response: { status: 503 } }), true)
    assert.equal(options.retry(1, {}), false)
})
