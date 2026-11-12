import { useQuery } from '@tanstack/react-query'
import { Radio, RefreshCw } from 'lucide-react'
import dashboardServices from '../services/dashboard.service'

export default function LoginConnection() {
    const check = useQuery({
        queryKey: ['login-connection'],
        queryFn: dashboardServices.checkConnection,
        retry: false,
        refetchInterval: 30000,
        staleTime: 15000,
    })
    const state = check.isFetching ? 'checking' : check.isError ? 'unavailable' : 'connected'
    let address = 'Configured proxy'
    try {
        const url = new URL(import.meta.env.VITE_baseURL || '/', window.location.origin)
        address = url.host + url.pathname.replace(/\/$/, '')
    } catch {
        /* The check below reports an invalid address. */
    }
    return (
        <section className={'login-connection ' + state} aria-label="Proxy connection">
            <div className="login-connection-heading">
                <Radio size={15} />
                <strong role="status">
                    {state === 'checking'
                        ? 'Checking connection…'
                        : state === 'connected'
                          ? 'Proxy reachable'
                          : 'Could not reach the proxy'}
                </strong>
                <button
                    type="button"
                    onClick={() => check.refetch()}
                    disabled={check.isFetching}
                    aria-label="Recheck proxy connection"
                    title="Recheck connection"
                >
                    <RefreshCw size={14} className={check.isFetching ? 'login-spin' : ''} />
                </button>
            </div>
            <p className="login-connection-address">{address}</p>
            <p>
                {state === 'connected'
                    ? `${check.data.roundTrip} ms round trip · Checked ${new Date(check.dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : state === 'checking'
                      ? 'Checking the proxy before you sign in.'
                      : 'Check that your proxy is running, then retry. You can still try signing in.'}
            </p>
        </section>
    )
}
