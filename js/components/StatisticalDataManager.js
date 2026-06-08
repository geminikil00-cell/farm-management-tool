// Statistical Data Manager Component
const { useState } = React;
const { Plus, LayoutGrid, Warehouse, Sprout, BarChart3, X } = window.Icons;

const StatisticalDataManager = ({ plots, addPlot, plantingRecords, harvestRecords, materials, getCycleBreakdown, nurseryRecords }) => {
    const [selectedPlot, setSelectedPlot] = useState(null);
    const greenhouses = plots.filter(p => p.type === 'Greenhouse');
    const fields = plots.filter(p => p.type === 'Open Field');

    const getPlotCycleMetrics = (plot) => {
        const plotKey = `${plot.type === 'Greenhouse' ? 'greenhouse' : 'field'}-${plot.id}`;
        const pRecs = plantingRecords.filter(r => r.plotKey === plotKey);
        const hRecs = harvestRecords.filter(r => r.plotKey === plotKey);
        
        const cycles = {};
        pRecs.forEach(p => {
            const id = `${p.year}-${p.cycle}`;
            if(!cycles[id]) cycles[id] = { year: p.year, cycle: p.cycle, start: p.date, planted: 0, seedlingCost: 0 };
            cycles[id].planted += p.quantity;
            const nurseryBatch = nurseryRecords.find(n => n.id === p.nurseryBatchId);
            const costPer = nurseryBatch?.costPerSeedling || 0;
            cycles[id].seedlingCost += (p.quantity * costPer);
            if(new Date(p.date) < new Date(cycles[id].start)) cycles[id].start = p.date;
        });

        hRecs.forEach(h => {
            const id = `${h.year}-${h.cycle}`;
            if(!cycles[id]) return;
            if(!cycles[id].end || new Date(h.date) > new Date(cycles[id].end)) cycles[id].end = h.date;
            
            cycles[id].harvestedHeads = (cycles[id].harvestedHeads || 0) + h.totalHeads;
            cycles[id].harvestedWeight = (cycles[id].harvestedWeight || 0) + h.weight;
            cycles[id].revenue = (cycles[id].revenue || 0) + (h.revenue || 0);
            cycles[id].pkgCost = (cycles[id].pkgCost || 0) + (h.packagingCost || 0);
        });

        return Object.values(cycles).map(c => {
            const endDate = c.end || new Date().toISOString().split('T')[0];
            const ops = getCycleBreakdown(plotKey, c.start, endDate);
            
            const totalCost = c.seedlingCost + ops.water + ops.spray + ops.irrMat + (c.pkgCost || 0);
            const weight = c.harvestedWeight || 0;
            const revenue = c.revenue || 0;
            const heads = c.harvestedHeads || 0;

            return {
                ...c,
                end: c.end ? c.end : 'Active',
                ops,
                totalCost,
                avgHeadWeight: heads > 0 ? (weight / heads).toFixed(3) : 0,
                costPerKg: weight > 0 ? (totalCost / weight).toFixed(2) : 0,
                profitPerKg: weight > 0 ? ((revenue - totalCost) / weight).toFixed(2) : 0,
                totalProfit: (revenue - totalCost).toFixed(2),
                mortality: c.planted > 0 ? (((c.planted - heads) / c.planted) * 100).toFixed(1) : 0
            };
        }).sort((a,b) => b.year - a.year || b.cycle - a.cycle);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Statistical Data</h2>
                <div className="flex gap-2">
                    <button onClick={() => addPlot('Greenhouse')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex gap-2 hover:bg-emerald-700 shadow-sm transition-colors"><Plus className="w-4 h-4" /> Add Greenhouse</button>
                    <button onClick={() => addPlot('Open Field')} className="bg-amber-600 text-white px-4 py-2 rounded-lg flex gap-2 hover:bg-amber-700 shadow-sm transition-colors"><Plus className="w-4 h-4" /> Add Open Field</button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold text-lg mb-6 text-slate-800 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-slate-500"/> Farm Map</h3>
                
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase">Greenhouses ({greenhouses.length})</h4>
                        <span className="text-xs text-slate-400">Click plot for detailed analytics</span>
                    </div>
                    {greenhouses.length === 0 ? <div className="p-4 border border-dashed rounded text-center text-slate-400">No Greenhouses</div> :
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                        {greenhouses.map(p => (
                            <div key={`${p.type}-${p.id}`} onClick={() => setSelectedPlot(p)} 
                                 className="h-24 border-2 border-slate-200 bg-emerald-50/50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-100 hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><BarChart3 className="w-4 h-4 text-emerald-600"/></div>
                                <Warehouse className="w-6 h-6 text-emerald-300 mb-1 group-hover:text-emerald-600 transition-colors"/>
                                <span className="font-bold text-slate-700 text-sm">{p.name}</span>
                            </div>
                        ))}
                    </div>}
                </div>

                <div>
                    <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase">Open Fields ({fields.length})</h4>
                    {fields.length === 0 ? <div className="p-4 border border-dashed rounded text-center text-slate-400">No Fields</div> :
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-3">
                        {fields.map(p => (
                            <div key={`${p.type}-${p.id}`} onClick={() => setSelectedPlot(p)} 
                                 className="h-20 border-2 border-slate-200 bg-amber-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-100 hover:shadow-md transition-all group relative">
                                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><BarChart3 className="w-4 h-4 text-amber-600"/></div>
                                <Sprout className="w-4 h-4 text-amber-300 mb-1 group-hover:text-amber-600 transition-colors"/>
                                <span className="font-bold text-slate-600 text-xs">{p.name}</span>
                            </div>
                        ))}
                    </div>}
                </div>
            </div>

            {selectedPlot && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col animate-fade-in-up">
                        <div className="flex justify-between items-center p-6 border-b">
                            <div>
                                <h3 className="font-bold text-2xl text-slate-800">{selectedPlot.name} Performance</h3>
                                <p className="text-slate-500 text-sm">{selectedPlot.type} • Historical Cycles</p>
                            </div>
                            <button onClick={() => setSelectedPlot(null)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 border-b">
                                    <tr>
                                        <th className="p-3 font-bold border-r">Cycle</th>
                                        <th className="p-3 font-bold">Dates</th>
                                        <th className="p-3 font-bold text-right">Harvest (kg)</th>
                                        <th className="p-3 font-bold text-right">Avg Head (kg)</th>
                                        <th className="p-3 font-bold text-right text-blue-600 bg-blue-50">Water</th>
                                        <th className="p-3 font-bold text-right text-purple-600 bg-purple-50">Spray</th>
                                        <th className="p-3 font-bold text-right text-cyan-600 bg-cyan-50">Irri Mat</th>
                                        <th className="p-3 font-bold text-right text-orange-600 bg-orange-50">Pkg</th>
                                        <th className="p-3 font-bold text-right border-l">Total Cost</th>
                                        <th className="p-3 font-bold text-right">Cost/Kg</th>
                                        <th className="p-3 font-bold text-right text-emerald-600">Profit/Kg</th>
                                        <th className="p-3 font-bold text-right text-emerald-700 bg-emerald-50">Total Profit</th>
                                        <th className="p-3 font-bold text-right text-red-600">Mortality</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {getPlotCycleMetrics(selectedPlot).map((c, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold border-r">Y{c.year}-C{c.cycle}</td>
                                            <td className="p-3 text-slate-500 whitespace-nowrap">{c.start} <br/>to {c.end}</td>
                                            <td className="p-3 text-right font-medium">{c.harvestedWeight ? c.harvestedWeight.toLocaleString() : '-'}</td>
                                            <td className="p-3 text-right">{c.avgHeadWeight}</td>
                                            <td className="p-3 text-right bg-blue-50/50">${c.ops.water.toFixed(2)}</td>
                                            <td className="p-3 text-right bg-purple-50/50">${c.ops.spray.toFixed(2)}</td>
                                            <td className="p-3 text-right bg-cyan-50/50">${c.ops.irrMat.toFixed(2)}</td>
                                            <td className="p-3 text-right bg-orange-50/50">${(c.pkgCost||0).toFixed(2)}</td>
                                            <td className="p-3 text-right font-bold border-l">${c.totalCost.toFixed(2)}</td>
                                            <td className="p-3 text-right">${c.costPerKg}</td>
                                            <td className={`p-3 text-right font-bold ${c.profitPerKg >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${c.profitPerKg}</td>
                                            <td className={`p-3 text-right font-bold bg-emerald-50 ${c.totalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>${Number(c.totalProfit).toLocaleString()}</td>
                                            <td className="p-3 text-right text-red-600">{c.mortality}%</td>
                                        </tr>
                                    ))}
                                    {getPlotCycleMetrics(selectedPlot).length === 0 && <tr><td colSpan="13" className="p-8 text-center text-slate-400 italic">No historical cycles found for this plot.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.StatisticalDataManager = StatisticalDataManager;

