import { useQuery } from '@tanstack/react-query'
import React, { useState } from 'react'
import dashboardServices from '../services/dashboard.service'
import {
    Activity, Server, Clock, Zap, Globe, AlertCircle,
    CheckCircle, XCircle, RefreshCw, TrendingUp, Database,
    Wifi, Shield, BarChart3, Eye, Settings, ArrowRight,
    Timer, Cpu, HardDrive, Network, Signal, Key, Route,
    Users, FileText, Target, Code, Filter, BarChart2,
    PieChart, Layers, Hash, Gauge
} from 'lucide-react'


function Dashboard() {
    const darkMode = true 
    const [dashboardData, setDashboardData] = useState({})
    const [configData, setConfigData] = useState({})
    const [metricsData, setMetricsData] = useState({})
    
    const dashboardDetails = useQuery({
        queryKey: ['dashboard'],
        queryFn: () => dashboardServices.getDashboardDetails().then((res) => {
            if(res.data){
                setDashboardData(res.data)
            }
            return res.data
        }),
        refetchInterval: 30000,
        staleTime: 10000
    })


    const configDetails = useQuery({
        queryKey: ['config'],
        queryFn: () => dashboardServices.getConfigDetails().then((res) => {
            if(res.data){
                setConfigData(res.data)
            }
            return res.data
        }),
        refetchInterval: 30000,
        staleTime: 10000
    })


    const metricsDetails = useQuery({
        queryKey: ['metrics'],
        queryFn: () => dashboardServices.getMetricsDetails().then((res) => {
            if(res.data){
                setMetricsData(res.data)
            }
            return res.data
        }),
        refetchInterval: 30000,
        staleTime: 10000
    })


    // Calculate overall system metrics including new data
    const systemMetrics = React.useMemo(() => {
        const services = Object.values(dashboardData)
        const totalServices = services.length
        const healthyServices = services.filter(service => service.status === 'healthy').length
        const avgResponseTime = services.length > 0 
            ? services.reduce((sum, service) => sum + (service.response_time || 0), 0) / services.length 
            : 0
        const uptime = totalServices > 0 ? (healthyServices / totalServices) * 100 : 0


        return {
            totalServices,
            healthyServices,
            avgResponseTime: Math.round(avgResponseTime * 100) / 100,
            uptime: Math.round(uptime * 10) / 10,
            errorServices: totalServices - healthyServices,
            globalAvgResponseTime: metricsData.avg_response_time_ms || 0,
            totalRequests: metricsData.requests_total || 0,
            errorRate: metricsData.error_rate || 0,
            requestsPerMinute: metricsData.requests_per_minute || 0
        }
    }, [dashboardData, metricsData])


    if (dashboardDetails.isLoading) {
        return <DashboardSkeleton />
    }


    return (
        <div className="min-h-screen transition-all duration-500">
            <div className="p-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-black mb-2 text-slate-50">
                                Mission Control
                            </h1>
                            <p className="text-lg text-violet-300/85 font-semibold">
                                Real-time system monitoring & analytics
                            </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={() => {
                                    dashboardDetails.refetch()
                                    configDetails.refetch()
                                    metricsDetails.refetch()
                                }}
                                className="flex items-center space-x-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-800/70 shadow-xl hover:shadow-2xl hover:scale-105"
                                style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                            >
                                <RefreshCw className={`w-5 h-5 ${
                                    (dashboardDetails.isFetching || configDetails.isFetching || metricsDetails.isFetching) 
                                        ? 'animate-spin' : ''
                                }`} />
                                <span>Refresh All</span>
                            </button>
                        </div>
                    </div>


                    {/* Enhanced System Overview Cards - UNCHANGED */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 mb-8">
                        <SystemMetricCard
                            icon={<Server />}
                            title="Total Services"
                            value={systemMetrics.totalServices}
                            subtitle="Active endpoints"
                            color="blue"
                        />
                        <SystemMetricCard
                            icon={<CheckCircle />}
                            title="Healthy Services"
                            value={systemMetrics.healthyServices}
                            subtitle={`${systemMetrics.uptime}% uptime`}
                            color="green"
                        />
                        <SystemMetricCard
                            icon={<Timer />}
                            title="Global Response"
                            value={`${Math.round(systemMetrics.globalAvgResponseTime)}ms`}
                            subtitle="System average"
                            color="purple"
                        />
                        <SystemMetricCard
                            icon={<TrendingUp />}
                            title="Requests/Min"
                            value={systemMetrics.requestsPerMinute.toFixed(2)}
                            subtitle="Current rate"
                            color="cyan"
                        />
                    </div>
                </div>


                {/* New Configuration & Metrics Section */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
                    <SystemConfigPanel configData={configData} />
                    <RequestAnalyticsPanel metricsData={metricsData} />
                </div>


                {/* Services Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                    {Object.entries(dashboardData).map(([route, service]) => (
                        <ServiceCard
                            key={route}
                            route={route}
                            service={service}
                        />
                    ))}
                </div>


                {/* Enhanced Analytics Section */}
                <div className="mt-12">
                    <h2 className="text-2xl font-black mb-6 text-slate-50">
                        Advanced Analytics
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        <PerformanceChart services={Object.values(dashboardData)} />
                        <SystemStatusOverview metrics={systemMetrics} />
                        <PopularPathsChart popularPaths={metricsData.popular_paths || {}} />
                    </div>
                </div>


                {/* Status Codes Distribution */}
                <div className="mt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StatusCodesChart statusCodes={metricsData.status_codes || {}} />
                        <UptimeMetrics uptimeSeconds={metricsData.uptime_seconds || 0} />
                    </div>
                </div>
            </div>
        </div>
    )
}


// System Configuration Panel
function SystemConfigPanel({ configData }) {
    return (
        <div className="p-6 rounded-3xl border transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 border-slate-800/70"
             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-50">
                    System Configuration
                </h3>
                <Settings className="w-6 h-6 text-violet-400" />
            </div>
            
            <div className="space-y-4">
                <ConfigItem
                    icon={<Route />}
                    label="Load Balancer"
                    value={configData.load_balancer_strategy || 'N/A'}
                />
                
                <ConfigItem
                    icon={<Shield />}
                    label="Rate Limiting"
                    value={configData.rate_limit_enabled ? 
                        `${configData.rate_limit_requests || 0} req/min` : 
                        'Disabled'
                    }
                    status={configData.rate_limit_enabled}
                />
                
                <ConfigItem
                    icon={<Key />}
                    label="API Key Header"
                    value={configData.api_key_header || 'N/A'}
                />
                
                <ConfigItem
                    icon={<Timer />}
                    label="Request Timeout"
                    value={`${configData.request_timeout || 0}s`}
                />
                
                <ConfigItem
                    icon={<Database />}
                    label="Backend Routes"
                    value={Object.keys(configData.backend_routes || {}).length}
                />
                
                <ConfigItem
                    icon={<Hash />}
                    label="Key Prefix"
                    value={configData.api_key_prefix || 'N/A'}
                />
            </div>
            
            {/* Backend Routes Details */}
            {configData.backend_routes && (
                <div className="mt-6 pt-6 border-t border-slate-700/30">
                    <h4 className="text-sm font-semibold mb-3 text-slate-300">
                        Backend Routes
                    </h4>
                    <div className="space-y-2">
                        {Object.entries(configData.backend_routes).map(([route, url]) => (
                            <div key={route} className="flex justify-between items-center p-2 rounded-lg bg-slate-800/50">
                                <span className="text-sm font-mono text-violet-300">
                                    {route}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {url}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}


// Request Analytics Panel
function RequestAnalyticsPanel({ metricsData }) {
    const formatUptime = (seconds) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        return `${hours}h ${minutes}m`
    }


    return (
        <div className="p-6 rounded-3xl border transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 border-slate-800/70"
             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-50">
                    Request Analytics
                </h3>
                <BarChart2 className="w-6 h-6 text-violet-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
                <MetricBox
                    title="Total Requests"
                    value={metricsData.requests_total || 0}
                    icon={<Hash />}
                    color="blue"
                />
                <MetricBox
                    title="Requests/Min"
                    value={(metricsData.requests_per_minute || 0).toFixed(2)}
                    icon={<TrendingUp />}
                    color="green"
                />
                <MetricBox
                    title="Avg Response"
                    value={`${Math.round(metricsData.avg_response_time_ms || 0)}ms`}
                    icon={<Zap />}
                    color="purple"
                />
                <MetricBox
                    title="Error Rate"
                    value={`${((metricsData.error_rate || 0) * 100).toFixed(2)}%`}
                    icon={<AlertCircle />}
                    color={(metricsData.error_rate || 0) > 0.01 ? "red" : "green"}
                />
            </div>
            
            <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">
                            System Uptime
                        </span>
                        <span className="font-bold text-green-400">
                            {formatUptime(metricsData.uptime_seconds || 0)}
                        </span>
                    </div>
                </div>
                
                <div className="p-4 rounded-2xl bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">
                            Total Errors
                        </span>
                        <span className={`font-bold ${
                            (metricsData.errors_total || 0) > 0 
                                ? 'text-red-400'
                                : 'text-green-400'
                        }`}>
                            {metricsData.errors_total || 0}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}


// Popular Paths Chart
function PopularPathsChart({ popularPaths }) {
    const sortedPaths = Object.entries(popularPaths)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5) // Top 5 paths


    const maxRequests = Math.max(...Object.values(popularPaths), 1)


    return (
        <div className="p-6 rounded-3xl border transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 border-slate-800/70"
             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-50">
                    Popular Paths
                </h3>
                <Target className="w-6 h-6 text-violet-400" />
            </div>
            
            <div className="space-y-4">
                {sortedPaths.map(([path, requests], index) => (
                    <div key={path} className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium truncate text-slate-300" title={path}>
                                {path.length > 30 ? `...${path.slice(-27)}` : path}
                            </span>
                            <span className="text-sm font-bold text-slate-50">
                                {requests}
                            </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800">
                            <div 
                                className={`h-2 rounded-full bg-gradient-to-r ${
                                    index === 0 ? 'from-violet-400 to-violet-500' :
                                    index === 1 ? 'from-purple-400 to-purple-500' :
                                    index === 2 ? 'from-blue-400 to-blue-500' :
                                    index === 3 ? 'from-green-400 to-green-500' :
                                    'from-yellow-400 to-yellow-500'
                                }`}
                                style={{ 
                                    width: `${(requests / maxRequests) * 100}%` 
                                }}
                            ></div>
                        </div>
                    </div>
                ))}
                
                {sortedPaths.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                        No request data available
                    </div>
                )}
            </div>
        </div>
    )
}


// Status Codes Chart
function StatusCodesChart({ statusCodes }) {
    const total = Object.values(statusCodes).reduce((sum, count) => sum + count, 0)


    return (
        <div className="p-6 rounded-3xl border transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 border-slate-800/70"
             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-50">
                    Status Codes
                </h3>
                <PieChart className="w-6 h-6 text-violet-400" />
            </div>
            
            <div className="space-y-4">
                {Object.entries(statusCodes).map(([code, count]) => {
                    const percentage = total > 0 ? (count / total) * 100 : 0
                    const color = code.startsWith('2') ? 'green' :
                                 code.startsWith('3') ? 'blue' :
                                 code.startsWith('4') ? 'yellow' : 'red'
                    
                    return (
                        <div key={code} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`w-4 h-4 rounded-full ${
                                    color === 'green' ? 'bg-green-500' :
                                    color === 'blue' ? 'bg-blue-500' :
                                    color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                                <span className="text-sm font-medium text-slate-300">
                                    HTTP {code}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-slate-50">
                                    {count}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {percentage.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    )
                })}
                
                {Object.keys(statusCodes).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                        No status code data available
                    </div>
                )}
            </div>
        </div>
    )
}


// Uptime Metrics
function UptimeMetrics({ uptimeSeconds }) {
    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        
        return { days, hours, minutes }
    }


    const uptime = formatUptime(uptimeSeconds)


    return (
        <div className="p-6 rounded-3xl border transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 border-slate-800/70"
             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-50">
                    System Uptime
                </h3>
                <Clock className="w-6 h-6 text-violet-400" />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                    <div className="text-3xl font-black text-green-400">
                        {uptime.days}
                    </div>
                    <div className="text-sm text-slate-400">
                        Days
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-black text-blue-400">
                        {uptime.hours}
                    </div>
                    <div className="text-sm text-slate-400">
                        Hours
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-black text-purple-400">
                        {uptime.minutes}
                    </div>
                    <div className="text-sm text-slate-400">
                        Minutes
                    </div>
                </div>
            </div>
            
            <div className="mt-6 p-4 rounded-2xl bg-slate-800/50">
                <div className="text-center">
                    <div className="text-sm text-slate-400 mb-1">
                        Total Uptime
                    </div>
                    <div className="text-lg font-bold text-slate-50">
                        {Math.round(uptimeSeconds).toLocaleString()} seconds
                    </div>
                </div>
            </div>
        </div>
    )
}


// Helper Components
function ConfigItem({ icon, label, value, status }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
                {React.cloneElement(icon, { 
                    className: "w-4 h-4 text-slate-400" 
                })}
                <span className="text-sm text-slate-300">
                    {label}
                </span>
            </div>
            <div className="flex items-center space-x-2">
                {status !== undefined && (
                    <div className={`w-2 h-2 rounded-full ${
                        status ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                )}
                <span className="text-sm font-mono text-slate-50">
                    {value}
                </span>
            </div>
        </div>
    )
}


function MetricBox({ title, value, icon, color }) {
    const colorClasses = {
        blue: 'text-blue-400',
        green: 'text-green-400',
        purple: 'text-purple-400',
        red: 'text-red-400',
        cyan: 'text-cyan-400',
        indigo: 'text-indigo-400'
    }


    return (
        <div className="p-4 rounded-2xl bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
                {React.cloneElement(icon, { 
                    className: `w-5 h-5 ${colorClasses[color]}` 
                })}
            </div>
            <div className="text-xl font-bold text-slate-50 mb-1">
                {value}
            </div>
            <div className="text-xs text-slate-400">
                {title}
            </div>
        </div>
    )
}


// SystemMetricCard remains unchanged as requested
function SystemMetricCard({ icon, title, value, subtitle, color }) {
    const colorClasses = {
        blue: 'from-violet-400/10 via-violet-500/6 to-violet-600/10 border-violet-400/20',
        green: 'from-violet-400/10 via-violet-500/6 to-violet-600/10 border-violet-400/20',
        purple: 'from-violet-400/10 via-violet-500/6 to-violet-600/10 border-violet-400/20',
        yellow: 'from-violet-400/10 via-violet-500/6 to-violet-600/10 border-violet-400/20',
        red: 'from-violet-400/10 via-violet-500/6 to-violet-600/10 border-violet-400/20',
        cyan: 'from-violet-400/10 via-violet-500/6 to-violet-600/10 border-violet-400/20',
        indigo: 'from-violet-400/10 via-violet-500/6 to-violet-600/10 border-violet-400/20'
    }


    const iconColorClasses = {
        blue: 'text-blue-400',
        green: 'text-green-400',
        purple: 'text-purple-400',
        yellow: 'text-yellow-400',
        red: 'text-red-400',
        cyan: 'text-cyan-400',
        indigo: 'text-indigo-400'
    }


    return (
        <div className={`relative p-6 rounded-3xl border transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden bg-gradient-to-br ${colorClasses[color]}`}
             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
            <div className={`absolute inset-0 bg-gradient-to-r opacity-0 hover:opacity-100 transition-opacity duration-500 ${colorClasses[color]}`}></div>
            
            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-slate-900/40 shadow-lg">
                        {React.cloneElement(icon, { 
                            className: `w-6 h-6 ${iconColorClasses[color]}` 
                        })}
                    </div>
                <div className="text-3xl font-black mb-2 text-slate-50">
                    {value}
                </div>
                </div>
                
                <div className="text-sm font-semibold text-slate-300 mb-1">
                    {title}
                </div>
                
                <div className="text-xs text-slate-400">
                    {subtitle}
                </div>
            </div>
        </div>
    )
}


// Service Card Component
function ServiceCard({ route, service }) {
    const isHealthy = service.status === 'healthy'
    const responseTime = service.response_time || 0
    const lastCheck = new Date(service.last_check * 1000)


    const getResponseTimeColor = (time) => {
        if (time < 100) return 'green'
        if (time < 500) return 'yellow'
        if (time < 1000) return 'orange'
        return 'red'
    }


    const timeColor = getResponseTimeColor(responseTime)


    return (
        <div className="relative p-6 rounded-3xl border transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 border-slate-800/70"
             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
            {/* Animated background for healthy services */}
            {isHealthy && (
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 animate-pulse"></div>
            )}
            
            <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl ${
                            isHealthy 
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                        }`}>
                            {isHealthy ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-50">
                                {service.name}
                            </h3>
                            <p className="text-sm text-slate-400">
                                {route}
                            </p>
                        </div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isHealthy
                            ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                            : 'bg-red-900/30 text-red-400 border border-red-500/30'
                    }`}>
                        {/* {service.status.toUpperCase()} */}
                    </div>
                </div>


                {/* Metrics */}
                <div className="space-y-4">
                    {/* Response Time */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Zap className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-300">
                                Response Time
                            </span>
                        </div>
                        <span className={`font-bold ${
                            timeColor === 'green' ? 'text-green-400' :
                            timeColor === 'yellow' ? 'text-yellow-400' :
                            timeColor === 'orange' ? 'text-orange-400' :
                            'text-red-400'
                        }`}>
                            {responseTime.toFixed(2)}ms
                        </span>
                    </div>


                    {/* URL */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Globe className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-300">
                                Endpoint
                            </span>
                        </div>
                        <span className="text-sm font-mono text-violet-300">
                            {service.url}
                        </span>
                    </div>


                    {/* Health Route */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-300">
                                Health Check
                            </span>
                        </div>
                        <span className="text-sm font-mono text-slate-400">
                            {service.health_route}
                        </span>
                    </div>


                    {/* Last Check */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-300">
                                Last Check
                            </span>
                        </div>
                        <span className="text-sm text-slate-400">
                            {lastCheck.toLocaleTimeString()}
                        </span>
                    </div>
                </div>


                {/* Service Response Details */}
                {service.response && (
                    <div className="mt-4 pt-4 border-t border-slate-700/30">
                        <details className="group">
                            <summary className="cursor-pointer text-sm font-semibold text-violet-300 hover:text-violet-200 transition-colors duration-200">
                                View Response Details
                            </summary>
                            <div className="mt-3 p-3 rounded-xl bg-slate-800/50">
                                <pre className="text-xs text-slate-300 overflow-x-auto">
                                    {JSON.stringify(service.response, null, 2)}
                                </pre>
                            </div>
                        </details>
                    </div>
                )}
            </div>
        </div>
    )
}


// Performance Chart Component
function PerformanceChart({ services }) {
    return (
        <div className="p-6 rounded-3xl border transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 border-slate-800/70"
             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-50">
                    Response Time Analysis
                </h3>
                <BarChart3 className="w-6 h-6 text-violet-400" />
            </div>
            
            <div className="space-y-4">
                {services.map((service, index) => (
                    <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-300">
                                {service.name}
                            </span>
                            <span className="text-sm font-bold text-slate-50">
                                {service.response_time?.toFixed(2) || 0}ms
                            </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800">
                            <div 
                                className={`h-2 rounded-full bg-gradient-to-r ${
                                    service.response_time < 100 
                                        ? 'from-green-400 to-green-500'
                                        : service.response_time < 500
                                        ? 'from-yellow-400 to-yellow-500'
                                        : 'from-red-400 to-red-500'
                                }`}
                                style={{ 
                                    width: `${Math.min(100, (service.response_time || 0) / 50)}%` 
                                }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}


// System Status Overview Component
function SystemStatusOverview({ metrics }) {
    return (
        <div className="p-6 rounded-3xl border transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 border-slate-800/70"
             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-50">
                    System Overview
                </h3>
                <Activity className="w-6 h-6 text-violet-400" />
            </div>
            
            <div className="space-y-6">
                {/* Uptime Circle */}
                <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                stroke="#475569"
                                strokeWidth="8"
                                fill="none"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                stroke={metrics.uptime >= 95 ? '#10b981' : metrics.uptime >= 80 ? '#f59e0b' : '#ef4444'}
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${2.51 * metrics.uptime} ${251.2 - 2.51 * metrics.uptime}`}
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-2xl font-black text-slate-50">
                                    {metrics.uptime}%
                                </div>
                                <div className="text-xs text-slate-400">
                                    Uptime
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                            {metrics.healthyServices}
                        </div>
                        <div className="text-sm text-slate-400">
                            Healthy
                        </div>
                    </div>
                    <div className="text-center">
                        <div className={`text-2xl font-bold ${
                            metrics.errorServices > 0 
                                ? 'text-red-400'
                                : 'text-slate-500'
                        }`}>
                            {metrics.errorServices}
                        </div>
                        <div className="text-sm text-slate-400">
                            Errors
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


// Loading Skeleton Component
function DashboardSkeleton() {
    return (
        <div className="min-h-screen p-8 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
            <div className="animate-pulse">
                <div className="h-12 bg-slate-800 rounded-2xl mb-8"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {Array(4).fill(0).map((_, i) => (
                        <div key={i} className="h-32 bg-slate-800 rounded-3xl"></div>
                    ))}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-64 bg-slate-800 rounded-3xl"></div>
                    ))}
                </div>
            </div>
        </div>
    )
}


export default Dashboard
