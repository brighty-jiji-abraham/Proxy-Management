import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Shield, Zap, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import authSerices from '../services/authSerice'


function Login() {
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            username: '',
            password: '',
            rememberMe: false
        }
    })

    const loginUser = useMutation({
        mutationFn: (data) => authSerices.login(data)
    })

    const onSubmit = async (data) => {
        setIsLoading(true)
        loginUser.mutate(data, {
            onSuccess: (res) => {
                console.log("res from Login: ", res);
                
                localStorage.setItem("accessToken", res.data.data.accessToken)
                setIsLoading(false)
            },
            onError: (err) => {
                console.log("ERROR: ", err);
            }
        })
    }

    return (
        <div className="min-h-screen flex items-center justify-center transition-all duration-500 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
            {/* Enhanced Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Primary gradient overlay */}
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


            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="p-8 rounded-3xl border bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 border-slate-800/70 shadow-2xl overflow-hidden"
                     style={{ 
                        backfaceVisibility: 'hidden', 
                        transform: 'translateZ(0)',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale'
                     }}>
                    
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.03)_0%,transparent_50%)]"></div>
                    
                    <div className="relative">
                        {/* Header */}
                        <div className="text-center mb-8">
                            
                            <h1 className="text-3xl font-black text-slate-50 mb-2">Welcome Back</h1>
                            <p className="text-violet-300/85 font-semibold">Access your ProxyVault dashboard</p>
                        </div>


                        {/* Login Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Username Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300">Username</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        {...register('username', { 
                                            required: 'Username is required',
                                            minLength: {
                                                value: 3,
                                                message: 'Username must be at least 3 characters'
                                            }
                                        })}
                                        className={`w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-800/50 border text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 transition-all duration-300 ${
                                            errors.username ? 'border-red-500/50' : 'border-slate-700/50'
                                        }`}
                                        placeholder="Enter your username"
                                        style={{ 
                                            WebkitFontSmoothing: 'antialiased',
                                            MozOsxFontSmoothing: 'grayscale'
                                        }}
                                    />
                                </div>
                                {errors.username && (
                                    <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>
                                )}
                            </div>


                            {/* Password Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        {...register('password', { 
                                            required: 'Password is required',
                                            minLength: {
                                                value: 6,
                                                message: 'Password must be at least 6 characters'
                                            }
                                        })}
                                        className={`w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-800/50 border text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 transition-all duration-300 ${
                                            errors.password ? 'border-red-500/50' : 'border-slate-700/50'
                                        }`}
                                        placeholder="Enter your password"
                                        style={{ 
                                            WebkitFontSmoothing: 'antialiased',
                                            MozOsxFontSmoothing: 'grayscale'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-violet-400 transition-colors duration-200"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                                )}
                            </div>


                            {/* Remember Me & Forgot Password */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        {...register('rememberMe')}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-800/50 text-violet-400 focus:ring-violet-400/50 focus:ring-2"
                                    />
                                    <span className="text-sm text-slate-300">Remember me</span>
                                </label>
                                <button
                                    type="button"
                                    className="text-sm text-violet-400 hover:text-violet-300 transition-colors duration-200 font-semibold"
                                >
                                    Forgot password?
                                </button>
                            </div>


                            {/* Login Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-400 to-violet-500 hover:from-violet-500 hover:to-violet-600 transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                style={{ 
                                    backfaceVisibility: 'hidden', 
                                    transform: 'translateZ(0)',
                                    WebkitFontSmoothing: 'antialiased',
                                    MozOsxFontSmoothing: 'grayscale'
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-5 h-5" />
                                        <span>Sign In</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>



                        {/* Footer */}
                        <div className="mt-8 text-center">
                            <p className="text-xs text-slate-500">
                                Protected by ProxyVault Security System
                            </p>
                        </div>
                    </div>
                </div>


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


export default Login
