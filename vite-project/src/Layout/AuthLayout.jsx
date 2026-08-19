import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
    ShieldCheck, Activity, Plus, Eye, Zap, Server, Radio, Cpu, LogOut
} from 'lucide-react'
import { setApiKey } from '../api/api'


// Declared once rather than repeated per <Link>: adding a page is now a row
// here instead of a copied block.
const NAV_ITEMS = [
    { to: '/dashboard',    icon: <Activity />, label: 'Mission Control', description: 'Central hub' },
    { to: '/backends',     icon: <Server />,   label: 'Backends',        description: 'Routes and health' },
    { to: '/tunnel',       icon: <Radio />,    label: 'Tunnel',          description: 'Outbound link' },
    { to: '/ollama',       icon: <Cpu />,      label: 'Ollama',          description: 'Local models' },
    { to: '/generate-key', icon: <Plus />,     label: 'Key Forge',       description: 'Generate tokens' },
    { to: '/list-keys',    icon: <Eye />,      label: 'Key Vault',       description: 'Manage access' },
]


function AuthLayout({ onSignOut }) {
    // Active state came from useState, so it only updated when a link was
    // clicked - a back/forward navigation or a direct URL left the wrong item
    // highlighted. NavLink derives it from the current route instead.


    return (
        <div className="flex flex-col w-screen h-screen transition-all duration-500 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
            {/* Enhanced Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Primary gradient overlay – slightly lighter */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-transparent to-slate-900/40"></div>


                {/* Animated floating orbs */}
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-slate-800/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-800/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                <div className="absolute top-40 left-40 w-80 h-80 bg-slate-900/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>


                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.025)_1px,transparent_0)] bg-[length:50px_50px]"></div>


                {/* Diagonal lines pattern */}
                <div className="absolute inset-0 opacity-15 bg-[linear-gradient(45deg,transparent_49%,rgba(255,255,255,0.02)_50%,transparent_51%)] bg-[length:100px_100px]"></div>


                {/* Moving gradient waves */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/4 to-transparent animate-pulse"></div>
            </div>


            {/* Ultra-modern header */}
            <header className="bg-slate-900/85 border-slate-800/70 border-b px-8 py-4 relative overflow-hidden z-10"
                    style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
                {/* Header subtle pulse */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800/6 via-transparent to-slate-900/6 animate-pulse"></div>


                <div className="relative flex items-center justify-between">
                    {/* Logo / title */}
                    <div className="flex items-center space-x-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-violet-400 rounded-2xl blur-lg opacity-30"></div>
                            <div className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-violet-400 to-violet-500 rounded-2xl shadow-2xl shadow-violet-500/25">
                                <ShieldCheck className="w-7 h-7 text-white" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-50 tracking-tight">ProxyVault</h1>
                            <p className="text-sm text-violet-300/85 font-semibold">Next-Gen Proxy Management</p>
                        </div>
                    </div>


                    {/* Profile */}
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-4 px-4 py-2 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-800/90 hover:from-slate-800/90 hover:to-slate-700/90 border border-slate-800/70 shadow-xl transition-all duration-300 cursor-pointer hover:shadow-2xl hover:scale-105"
                             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
                            <div className="relative">
                                <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-sm font-bold text-white">AD</span>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900"></div>
                            </div>
                            <div className="hidden md:block">
                                <p className="text-sm font-semibold text-slate-50">Admin User</p>
                                <p className="text-xs text-violet-300/85">Premium Plan</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>


            <div className="flex flex-1 overflow-hidden relative z-10">
                {/* Sidebar */}
                <aside className="relative w-80 p-6">
                    <div className="h-full bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-900/90 rounded-3xl border border-slate-800/70 shadow-2xl overflow-hidden relative"
                         style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
                        {/* Sidebar pattern */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.03)_0%,transparent_50%)]"></div>


                        {/* Status panel (unchanged) */}
                        <div className="p-6 relative">
                            <div className="relative p-6 rounded-3xl bg-gradient-to-br from-violet-400/10 via-violet-500/6 to-violet-600/10 border border-violet-400/20 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-400/6 to-violet-500/6 animate-pulse"></div>
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,rgba(255,255,255,0.02)_50%,transparent_52%)] bg-[length:20px_20px]"></div>


                                <div className="relative">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <Zap className="w-6 h-6 text-violet-400" />
                                            <span className="text-lg font-bold text-slate-50">System</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-1 h-1 bg-green-400 rounded-full animate-ping"></div>
                                            <span className="text-sm font-bold text-green-400">LIVE</span>
                                        </div>
                                    </div>


                                    <div className="grid grid-cols-3 gap-4">
                                        <PulseMetric label="Uptime" value="99.9%" />
                                        <PulseMetric label="Speed" value="4.2s" />
                                        <PulseMetric label="Load" value="23%" />
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Nav */}
                        <nav className="px-6 pb-6 relative">
                            <div className="space-y-3">
                                {NAV_ITEMS.map((item) => (
                                    <NavLink key={item.to} to={item.to}>
                                        {({ isActive }) => (
                                            <FuturisticNavItem
                                                icon={item.icon}
                                                label={item.label}
                                                description={item.description}
                                                active={isActive}
                                            />
                                        )}
                                    </NavLink>
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    setApiKey('')
                                    onSignOut?.()
                                }}
                                className="mt-6 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="text-sm font-semibold">Sign out</span>
                            </button>
                        </nav>
                    </div>
                </aside>


                {/* Main content */}
                <main className="flex-1 overflow-auto relative">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.03)_0%,transparent_60%)]"></div>
                        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-indigo-500/5 to-transparent"></div>
                    </div>


                    <div className="p-8 relative z-10">
                        <Outlet />
                    </div>
                </main>
            </div>


            {/* Custom animation CSS */}
            <style jsx>{`
                @keyframes blob {
                    0%   { transform: translate(0px, 0px)   scale(1); }
                    33%  { transform: translate(30px, -50px) scale(1.1); }
                    66%  { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px)   scale(1); }
                }
                .animate-blob       { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    )
}


/* ----- Helper components (unchanged) ----- */


function FuturisticNavItem({ icon, label, description, active = false, badge }) {
    return (
        <div className={`group relative p-4 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${
            active
                ? 'bg-gradient-to-r from-violet-400/15 to-violet-500/15 border-violet-400/30 shadow-lg shadow-violet-500/20 border'
                : 'hover:bg-slate-800/60 hover:border-slate-700/70 border border-transparent hover:border'
        } hover:scale-105 hover:shadow-xl`}
             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
            {active && (
                <>
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(139,92,246,0.02)_25%,transparent_25%,transparent_75%,rgba(139,92,246,0.02)_75%)] bg-[length:8px_8px]"></div>
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-violet-400 rounded-full"></div>
                </>
            )}


            <div className="flex items-center justify-between relative">
                <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-xl transition-all duration-300 ${
                        active
                            ? 'bg-violet-400/20 text-violet-400'
                            : 'bg-slate-900/70 text-slate-400 group-hover:text-violet-400'
                    }`}>
                        {React.cloneElement(icon, { className: 'w-5 h-5' })}
                    </div>
                    <div>
                        <div className={`font-bold text-sm ${
                            active ? 'text-slate-50' : 'text-slate-200 group-hover:text-slate-50'
                        }`}>{label}</div>
                        <div className="text-xs text-slate-500">{description}</div>
                    </div>
                </div>
                {badge && (
                    <span className="px-2 py-1 text-xs font-black rounded-lg bg-violet-400/20 text-violet-300 border border-violet-400/30">
                        {badge}
                    </span>
                )}
            </div>
        </div>
    )
}


function PulseMetric({ label, value, icon }) {
    return (
        <div className="text-center">
            <div className="text-lg mb-1">{icon}</div>
            <div className="text-lg font-black text-slate-50">{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
        </div>
    )
}


function QuantumCard({ icon, label, value, change, trend = 'up' }) {
    const isPositive = trend === 'up' || (!trend && !change.includes('-'))
    return (
        <div className="relative p-4 rounded-2xl bg-slate-950/70 hover:bg-slate-900/90 border border-slate-900/60 transition-all duration-300 cursor-pointer group hover:scale-105 hover:shadow-xl overflow-hidden"
             style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-violet-400/4 to-violet-500/4"></div>
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{icon}</span>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isPositive
                            ? 'text-green-400 bg-green-900/30 border border-green-500/30'
                            : 'text-red-400 bg-red-900/30 border border-red-500/30'
                    }`}>{change}</div>
                </div>
                <div className="font-black text-xl text-slate-50 mb-1">{value}</div>
                <div className="text-xs font-medium text-slate-400">{label}</div>
            </div>
        </div>
    )
}


export default AuthLayout
