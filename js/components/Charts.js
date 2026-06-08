// Chart Components

const SVGBarChart = ({ data, height = 150 }) => {
    if (!data || data.length === 0) {
        return <div className="h-40 flex items-center justify-center text-slate-400 text-xs">No data available</div>;
    }
    
    const maxVal = Math.max(...data.map(d => d.value)) || 1;
    
    return (
        <div className="flex space-x-2 h-40 pt-4 pb-2 items-end">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div className="w-full relative flex-1 flex items-end justify-center">
                        <div 
                            className="w-full bg-blue-100 rounded-t relative hover:bg-blue-200 transition-colors" 
                            style={{ height: `${(d.value / maxVal) * 100}%` }}
                        >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {d.value}L
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 truncate w-full text-center h-4">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

const SVGDonutChart = ({ data, size = 120 }) => {
    if (!data || data.length === 0) {
        return <div className="h-32 flex items-center justify-center text-slate-400 text-xs">No data</div>;
    }
    
    const total = data.reduce((acc, d) => acc + d.value, 0);
    let cumulative = 0;
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    return (
        <div className="relative flex justify-center">
            <svg width={size} height={size} viewBox="0 0 42 42">
                {data.map((d, i) => {
                    const percent = (d.value / total) * 100;
                    const dash = (percent * 33.5) / 100;
                    cumulative += d.value;
                    return (
                        <circle 
                            key={i} 
                            cx="21" 
                            cy="21" 
                            r="15.915" 
                            fill="transparent" 
                            stroke={colors[i % colors.length]} 
                            strokeWidth="5" 
                            strokeDasharray={`${percent} ${100 - percent}`} 
                            strokeDashoffset={25 - (cumulative - d.value) / total * 100} 
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-xs font-bold text-slate-700">{total}</span>
                <span className="text-[8px] text-slate-400">Total</span>
            </div>
        </div>
    );
};

// Make available globally
window.Charts = { SVGBarChart, SVGDonutChart };

