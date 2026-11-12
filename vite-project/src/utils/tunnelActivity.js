const count = (value) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null)

// Compare adjacent browser snapshots; never replay a lifetime counter as new traffic.
export function observeTunnelTraffic(previous, data, at) {
    const current = {
        at,
        total: count(data?.requests_served),
        inFlight: count(data?.requests_in_flight),
        connected: data?.connected === true,
        identity: JSON.stringify([data?.server_url, data?.client_name, data?.local_target]),
    }
    const elapsed = previous ? (at - previous.at) / 1000 : null
    const comparable =
        previous?.connected &&
        current.connected &&
        current.identity === previous.identity &&
        current.total != null &&
        previous.total != null &&
        current.total >= previous.total &&
        elapsed > 0 &&
        elapsed <= 15
    const newRequests = comparable ? current.total - previous.total : null
    return {
        ...current,
        newRequests,
        intervalSeconds: comparable ? elapsed : null,
        rate: comparable ? newRequests / elapsed : null,
    }
}

export function requestParticleCount(sample) {
    const traffic = Math.max(sample?.newRequests || 0, sample?.inFlight || 0)
    return sample?.connected && traffic > 0 ? Math.min(5, Math.ceil(traffic)) : 0
}

export function appendTrafficSample(history, sample) {
    if (!sample || !Number.isFinite(sample.at)) return history
    if (history.at(-1)?.at === sample.at && history.at(-1)?.identity === sample.identity) return history
    return [
        ...history.filter(
            (item) =>
                item.identity === sample.identity && item.at < sample.at && item.at >= sample.at - 300000
        ),
        sample,
    ].slice(-360)
}

export function trafficWindow(history, seconds) {
    const end = history.at(-1)?.at
    const samples = history.filter((sample) => sample.at >= end - seconds * 1000)
    const measured = samples.filter((sample) => sample.rate != null && sample.intervalSeconds > 0)
    const elapsed = measured.reduce((sum, sample) => sum + sample.intervalSeconds, 0)
    const requests = measured.reduce((sum, sample) => sum + sample.newRequests, 0)
    const inFlight = samples.map((sample) => sample.inFlight).filter((value) => value != null)
    return {
        samples,
        average: elapsed ? requests / elapsed : null,
        peak: measured.length ? Math.max(...measured.map((sample) => sample.rate)) : null,
        peakInFlight: inFlight.length ? Math.max(...inFlight) : null,
        requests: measured.length ? requests : null,
    }
}

export function tunnelSampleCsv(samples) {
    return [
        'Time (UTC),New HTTP requests,Requests per second,In flight,Interval (seconds)',
        ...samples.map((sample) =>
            [
                new Date(sample.at).toISOString(),
                sample.newRequests ?? '',
                sample.rate ?? '',
                sample.inFlight ?? '',
                sample.intervalSeconds ?? '',
            ].join(',')
        ),
    ].join('\r\n')
}

export function connectionEvents(previous, current, at) {
    const events = []
    const add = (message, tone = 'muted') => events.push({ at, message, tone })
    if (current.status !== previous?.status) {
        const messages = {
            connected: previous
                ? 'Connected status received'
                : 'Monitoring started with an active connection',
            disconnected: 'Tunnel reported disconnected',
            paused: 'Live updates paused',
            unavailable: 'Connection data unavailable',
            stale: 'Waiting for a fresh connection update',
        }
        if (messages[current.status])
            add(
                messages[current.status],
                current.status === 'connected'
                    ? 'green'
                    : ['disconnected', 'unavailable'].includes(current.status)
                      ? 'amber'
                      : 'muted'
            )
    }
    if (previous && current.identity !== previous.identity) add('Connection configuration changed')
    else if (previous) {
        if (
            count(current.reconnects) != null &&
            count(previous.reconnects) != null &&
            current.reconnects > previous.reconnects
        )
            add(`Reconnect counter increased by ${current.reconnects - previous.reconnects}`, 'amber')
        if (count(current.total) != null && count(previous.total) != null && current.total < previous.total)
            add('Request counter restarted; a new traffic baseline was set')
    }
    return events
}
