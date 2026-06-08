import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as Icons from './Icons';
import { SVGBarChart, SVGDonutChart, SVGLineChart, Sparkline, ProgressBar, StatCard, MiniCard, AlertCard, HeatMapCell } from './Shared';
import { FirebaseHelpers } from '../firebase';
import { Sprout, Tractor, Sun, Wind, Warehouse, LayoutGrid, Flower2, Plus, Edit2, Trash2, BarChart3, Package, Menu, DollarSign, X, Lock, AlertTriangle, Droplets, Settings, PieChart } from 'lucide-react';
// Dashboard Component

export const Dashboard = ({ stats }) => (
    <div className="space-y-8 animate-fade-in">
        <header>
            <h2 className="text-3xl font-bold text-slate-900">Farm Overview</h2>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg flex justify-between">
                <div>
                    <p className="text-blue-100 text-sm">Weather</p>
                    <h3 className="text-3xl font-bold">24°C</h3>
                </div>
                <Sun className="w-12 h-12 text-blue-200 opacity-80" />
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex justify-between">
                <div>
                    <p className="text-slate-500 text-sm">Alerts</p>
                    <h3 className="text-3xl font-bold text-slate-800">2</h3>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                    <Wind className="w-8 h-8 text-orange-500" />
                </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex justify-between">
                <div>
                    <p className="text-slate-500 text-sm">Est. Harvest</p>
                    <h3 className="text-3xl font-bold text-slate-800">12k</h3>
                </div>
                <div className="bg-emerald-100 p-3 rounded-full">
                    <Tractor className="w-8 h-8 text-emerald-600" />
                </div>
            </div>
        </div>
        
        <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Asset Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Flower2 className="text-emerald-600"/>
                        <span className="font-bold">Nurseries</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {stats.nurseries} 
                        <span className="text-sm font-normal text-slate-500"> Batches</span>
                    </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Warehouse className="text-blue-600"/>
                        <span className="font-bold">Greenhouses</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {stats.greenhouses} 
                        <span className="text-sm font-normal text-slate-500"> Active</span>
                    </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <LayoutGrid className="text-amber-700"/>
                        <span className="font-bold">Fields</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {stats.openFields} 
                        <span className="text-sm font-normal text-slate-500"> Active</span>
                    </p>
                </div>
            </div>
        </div>
    </div>
);

// Make available globally
window.Dashboard = Dashboard;

