import React from 'react';
import { 
  BarChart3, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  LayoutGrid, 
  Droplets,
  Settings,
  Warehouse,
  Flower2,
  Tractor,
  PieChart,
  Sprout,
  X,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Sun,
  Wind
} from 'lucide-react';

export const SVGBarChart = ({ data, color = 'blue', unit = '' }) => {
    if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-slate-400 text-xs">No data</div>;
    const maxVal = Math.max(...data.map(d => d.value)) || 1;
    const colorMap = { blue: 'bg-blue-400', emerald: 'bg-emerald-400', amber: 'bg-amber-400', red: 'bg-red-400', purple: 'bg-purple-400', cyan: 'bg-cyan-400' };
    return (<div className="flex space-x-1 h-40 pt-4 pb-2 items-end">{data.map((d, i) => (<div key={i} className="flex-1 flex flex-col items-center justify-end h-full group"><div className="w-full relative flex-1 flex items-end justify-center"><div className={`w-full ${colorMap[color] || colorMap.blue} rounded-t relative hover:opacity-80 transition-all`} style={{ height: `${Math.max(3, (d.value / maxVal) * 100)}%` }}><div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">{typeof d.value === 'number' ? d.value.toLocaleString() : d.value}{unit}</div></div></div><span className="text-[9px] text-slate-500 mt-1 truncate w-full text-center">{d.label}</span></div>))}</div>);
};

export const SVGDonutChart = ({ data, size = 120, showLegend = false }) => {
    if (!data || data.length === 0) return <div className="h-32 flex items-center justify-center text-slate-400 text-xs">No data</div>;
    const total = data.reduce((acc, d) => acc + d.value, 0);
    let cumulative = 0;
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
    return (<div className="flex items-center gap-4"><div className="relative flex justify-center"><svg width={size} height={size} viewBox="0 0 42 42">{data.map((d, i) => { const percent = (d.value / total) * 100; cumulative += d.value; return (<circle key={i} cx="21" cy="21" r="15.915" fill="transparent" stroke={colors[i % colors.length]} strokeWidth="5" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={25 - (cumulative - d.value) / total * 100} className="transition-all hover:opacity-70" />); })}</svg><div className="absolute inset-0 flex items-center justify-center flex-col"><span className="text-lg font-bold text-slate-700">{total.toLocaleString()}</span><span className="text-[9px] text-slate-400">Total</span></div></div>{showLegend && <div className="text-xs space-y-1">{data.slice(0,5).map((d, i) => (<div key={i} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background: colors[i % colors.length]}}></div><span className="text-slate-600 truncate max-w-[80px]">{d.label}</span><span className="font-bold text-slate-800">{d.value}</span></div>))}</div>}</div>);
};

export const SVGLineChart = ({ data, color = '#10b981', height = 60 }) => {
    if (!data || data.length < 2) return <div className="h-16 flex items-center justify-center text-slate-400 text-xs">Insufficient data</div>;
    const maxVal = Math.max(...data.map(d => d.value)) || 1;
    const minVal = Math.min(...data.map(d => d.value));
    const range = maxVal - minVal || 1;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - ((d.value - minVal) / range) * 80 - 10}`).join(' ');
    const areaPoints = `0,100 ${points} 100,100`;
    return (<svg viewBox="0 0 100 100" className="w-full" style={{height}}><defs><linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs><polygon points={areaPoints} fill={`url(#grad-${color.replace('#','')})`}/><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>{data.map((d, i) => (<circle key={i} cx={(i / (data.length - 1)) * 100} cy={100 - ((d.value - minVal) / range) * 80 - 10} r="2" fill={color}/>))}</svg>);
};

export const Sparkline = ({ data, color = '#10b981', width = 80, height = 24 }) => {
    if (!data || data.length < 2) return <span className="text-slate-400">--</span>;
    const max = Math.max(...data); const min = Math.min(...data); const range = max - min || 1;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
    return (<svg width={width} height={height}><polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>);
};

export const ProgressBar = ({ value, max, color = 'emerald', label, showPercent = true }) => {
    const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const colorMap = { emerald: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500', red: 'bg-red-500', purple: 'bg-purple-500' };
    return (<div className="w-full"><div className="flex justify-between text-xs mb-1"><span className="text-slate-600">{label}</span>{showPercent && <span className="font-bold text-slate-700">{percent.toFixed(0)}%</span>}</div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${colorMap[color]} rounded-full transition-all duration-500`} style={{width: `${percent}%`}}></div></div></div>);
};

export const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'emerald', sparkData }) => {
    const colorMap = { emerald: 'from-emerald-500 to-emerald-600', blue: 'from-blue-500 to-blue-600', amber: 'from-amber-500 to-amber-600', red: 'from-red-500 to-red-600', purple: 'from-purple-500 to-purple-600', cyan: 'from-cyan-500 to-cyan-600', slate: 'from-slate-600 to-slate-700' };
    const iconBg = { emerald: 'bg-emerald-400/30', blue: 'bg-blue-400/30', amber: 'bg-amber-400/30', red: 'bg-red-400/30', purple: 'bg-purple-400/30', cyan: 'bg-cyan-400/30', slate: 'bg-slate-400/30' };
    return (<div className={`bg-gradient-to-br ${colorMap[color]} rounded-xl p-5 text-white shadow-lg relative overflow-hidden`}><div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div><div className="flex justify-between items-start relative z-10"><div className="flex-1"><p className="text-white/80 text-xs font-medium uppercase tracking-wide">{title}</p><h3 className="text-2xl font-bold mt-1">{value}</h3>{subtitle && <p className="text-white/70 text-xs mt-1">{subtitle}</p>}{trend !== undefined && <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-200' : 'text-red-200'}`}><span>{trend >= 0 ? '↑' : '↓'}</span><span>{Math.abs(trend).toFixed(1)}% {trendValue || ''}</span></div>}</div><div className={`${iconBg[color]} p-3 rounded-xl`}>{Icon && <Icon className="w-6 h-6" />}</div></div>{sparkData && <div className="mt-3 opacity-80"><Sparkline data={sparkData} color="#fff" /></div>}</div>);
};

export const MiniCard = ({ title, value, subtitle, icon: Icon, color = 'slate' }) => {
    const borderColors = { emerald: 'border-l-emerald-500', blue: 'border-l-blue-500', amber: 'border-l-amber-500', red: 'border-l-red-500', purple: 'border-l-purple-500', cyan: 'border-l-cyan-500', slate: 'border-l-slate-400' };
    const iconColors = { emerald: 'text-emerald-500 bg-emerald-50', blue: 'text-blue-500 bg-blue-50', amber: 'text-amber-500 bg-amber-50', red: 'text-red-500 bg-red-50', purple: 'text-purple-500 bg-purple-50', cyan: 'text-cyan-500 bg-cyan-50', slate: 'text-slate-500 bg-slate-50' };
    return (<div className={`bg-white rounded-lg p-4 border border-slate-200 border-l-4 ${borderColors[color]} shadow-sm hover:shadow-md transition-shadow`}><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p><p className="text-xl font-bold text-slate-800 mt-1">{value}</p>{subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}</div>{Icon && <div className={`p-2 rounded-lg ${iconColors[color]}`}><Icon className="w-5 h-5" /></div>}</div></div>);
};

export const AlertCard = ({ type = 'warning', title, message, action }) => {
    const styles = { warning: 'bg-amber-50 border-amber-200 text-amber-800', danger: 'bg-red-50 border-red-200 text-red-800', success: 'bg-emerald-50 border-emerald-200 text-emerald-800', info: 'bg-blue-50 border-blue-200 text-blue-800' };
    const icons = { warning: '⚠️', danger: '🚨', success: '✅', info: 'ℹ️' };
    return (<div className={`${styles[type]} border rounded-lg p-3 flex items-start gap-3`}><span className="text-lg">{icons[type]}</span><div className="flex-1"><p className="font-bold text-sm">{title}</p><p className="text-xs mt-0.5 opacity-80">{message}</p></div>{action && <button className="text-xs font-bold underline hover:no-underline">{action}</button>}</div>);
};

export const HeatMapCell = ({ value, max, label, onClick }) => {
    const intensity = max > 0 ? Math.min(1, value / max) : 0;
    const bg = intensity > 0.7 ? 'bg-emerald-500' : intensity > 0.4 ? 'bg-emerald-300' : intensity > 0.1 ? 'bg-emerald-100' : 'bg-slate-50';
    const text = intensity > 0.5 ? 'text-white' : 'text-slate-600';
    return (<button onClick={onClick} className={`${bg} ${text} p-2 rounded text-xs font-bold hover:opacity-80 transition-all aspect-square flex items-center justify-center`} title={`${label}: ${value}`}>{label}</button>);
};
