import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as Icons from './Icons';
import { SVGBarChart, SVGDonutChart, SVGLineChart, Sparkline, ProgressBar, StatCard, MiniCard, AlertCard, HeatMapCell } from './Shared';
import { FirebaseHelpers } from '../firebase';
import { Sprout, Tractor, Sun, Wind, Warehouse, LayoutGrid, Flower2, Plus, Edit2, Trash2, BarChart3, Package, Menu, DollarSign, X, Lock, AlertTriangle, Droplets, Settings, PieChart } from 'lucide-react';
// Login Screen Component


export const LoginScreen = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await FirebaseHelpers.signInWithEmailAndPassword(email, password);
            } else {
                await FirebaseHelpers.createUserWithEmailAndPassword(email, password);
            }
            // onLogin will be called by the auth state listener in App.js
        } catch (err) {
            console.error('Auth error:', err);
            switch (err.code) {
                case 'auth/invalid-email':
                    setError('Invalid email address.');
                    break;
                case 'auth/user-disabled':
                    setError('This account has been disabled.');
                    break;
                case 'auth/user-not-found':
                    setError('No account found with this email.');
                    break;
                case 'auth/wrong-password':
                    setError('Incorrect password.');
                    break;
                case 'auth/email-already-in-use':
                    setError('An account with this email already exists.');
                    break;
                case 'auth/weak-password':
                    setError('Password should be at least 6 characters.');
                    break;
                case 'auth/invalid-credential':
                    setError('Invalid email or password.');
                    break;
                default:
                    setError(err.message || 'An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-center">
                    <div className="flex items-center justify-center space-x-3 mb-2">
                        <div className="bg-emerald-500 p-3 rounded-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M7 20h10"/>
                                <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
                                <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
                                <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white">GreenLeaf</h1>
                    <p className="text-emerald-300 text-sm mt-1">Farm Management System</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                placeholder="you@example.com"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                            disabled={loading}
                        >
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-8 py-4 text-center border-t">
                    <p className="text-xs text-slate-500">
                        Secure authentication powered by Firebase
                    </p>
                </div>
            </div>
        </div>
    );
};

// Make available globally
window.LoginScreen = LoginScreen;

