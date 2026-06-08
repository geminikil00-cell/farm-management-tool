// Spraying Manager Component with Firebase
const { useState, useMemo } = React;
const { Plus, Edit2, Trash2, X } = window.Icons;
const { SVGBarChart, SVGDonutChart } = window.Charts;

const SprayingManager = ({ plots, materials, setMaterials, sprayingRecords, setSprayingRecords }) => {
    const [view, setView] = useState('entry');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], items: [], water: '' });
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [selectedBlockHistory, setSelectedBlockHistory] = useState(null);

    const sprayMaterials = useMemo(() => materials.filter(m => ['Pesticides', 'Fertilizers'].includes(m.category) && (m.quantity || 0) > 0), [materials]);

    const locations = useMemo(() => [
        ...Array.from({length:10}, (_, i) => ({ id: `greenhouse-${i+1}`, name: `GH ${i+1}`, type: 'greenhouse' })),
        ...Array.from({length:32}, (_, i) => ({ id: `field-${i+1}`, name: `Field ${i+1}`, type: 'field' })),
        ...Array.from({length:8}, (_, i) => ({ id: `nursery-${i+1}`, name: `Nursery ${i+1}`, type: 'nursery' }))
    ], []);

    const addItem = () => setFormData(p => ({ ...p, items: [...p.items, { materialId: '', quantity: '' }] }));
    const removeItem = (idx) => setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
    const updateItem = (idx, field, val) => {
        const newItems = [...formData.items];
        newItems[idx][field] = val;
        setFormData({ ...formData, items: newItems });
    };

    const toggleLocation = (id) => {
        setSelectedLocations(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSubmit = async () => {
        if (selectedLocations.length === 0) {
            alert("Select at least one location");
            return;
        }
        
        setLoading(true);
        
        try {
            // Restore old quantities if editing
            if (editingId) {
                const old = sprayingRecords.find(r => r.id === editingId);
                if (old && old.items) {
                    for (const item of old.items) {
                        const mat = materials.find(m => m.id === item.materialId);
                        if (mat) {
                            await window.Firebase.updateDoc('materials', mat.id, {
                                quantity: (mat.quantity || 0) + Number(item.quantity || 0)
                            });
                        }
                    }
                }
            }

            // Deduct new quantities
            for (const item of formData.items) {
                const mat = materials.find(m => m.id === item.materialId);
                if (mat) {
                    const qty = Number(item.quantity);
                    if ((mat.quantity || 0) < qty) {
                        alert(`Insufficient stock for ${mat.name}`);
                        setLoading(false);
                        return;
                    }
                    await window.Firebase.updateDoc('materials', mat.id, {
                        quantity: (mat.quantity || 0) - qty
                    });
                }
            }

            const record = {
                date: formData.date,
                items: formData.items.map(i => ({
                    materialId: i.materialId,
                    quantity: Number(i.quantity),
                    name: materials.find(m => m.id === i.materialId)?.name || ''
                })),
                water: Number(formData.water),
                locations: selectedLocations
            };

            if (editingId) {
                await window.Firebase.updateDoc('sprayingRecords', editingId, record);
            } else {
                await window.Firebase.addDoc('sprayingRecords', record);
            }
            
            closeModal();
        } catch (error) {
            console.error('Error saving spraying record:', error);
            alert('Error saving record. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditRecord = (rec) => {
        setEditingId(rec.id);
        setFormData({ 
            date: rec.date, 
            items: rec.items?.map(i => ({ materialId: i.materialId, quantity: i.quantity })) || [], 
            water: rec.water 
        });
        setSelectedLocations(rec.locations || []);
        setStep(1);
        setIsModalOpen(true);
    };

    const closeModal = () => { 
        setIsModalOpen(false); 
        setEditingId(null); 
        setStep(1); 
        setFormData({ date: new Date().toISOString().split('T')[0], items: [], water: '' }); 
        setSelectedLocations([]); 
    };

    const getBlockStatus = (locId) => {
        const recent = sprayingRecords.filter(r => r.locations?.includes(locId));
        if (recent.length === 0) return 'neutral';
        const lastSpray = new Date(Math.max(...recent.map(r => new Date(r.date))));
        const diffDays = Math.ceil(Math.abs(new Date() - lastSpray) / (1000 * 60 * 60 * 24)); 
        return diffDays <= 7 ? 'sprayed' : 'safe';
    };

    const handleDeleteRecord = async (recId) => {
        if (!window.confirm("Delete? Stock will be restored.")) return;
        
        try {
            const rec = sprayingRecords.find(r => r.id === recId);
            if (rec && rec.items) {
                // Restore material quantities
                for (const item of rec.items) {
                    const mat = materials.find(m => m.id === item.materialId);
                    if (mat) {
                        await window.Firebase.updateDoc('materials', mat.id, {
                            quantity: (mat.quantity || 0) + Number(item.quantity || 0)
                        });
                    }
                }
            }
            
            await window.Firebase.deleteDoc('sprayingRecords', recId);
        } catch (error) {
            console.error('Error deleting spraying record:', error);
            alert('Error deleting record. Please try again.');
        }
    };

    const openBlockHistory = (locId) => {
        const records = sprayingRecords.filter(r => r.locations?.includes(locId)).sort((a,b)=>new Date(b.date)-new Date(a.date));
        const totalWater = records.reduce((acc, r) => acc + Number(r.water || 0), 0);
        
        const matUsage = {};
        records.forEach(r => r.items?.forEach(i => {
            matUsage[i.name] = (matUsage[i.name] || 0) + Number(i.quantity || 0);
        }));
        const donutData = Object.entries(matUsage).map(([name, val]) => ({ label: name, value: val }));

        const waterByDate = {};
        records.forEach(r => {
            waterByDate[r.date] = (waterByDate[r.date] || 0) + Number(r.water || 0);
        });
        const waterTrend = Object.keys(waterByDate).sort().slice(-7).map(date => ({
            label: date.split('-').slice(1).join('/'),
            value: waterByDate[date]
        }));

        const mostUsedMat = Object.entries(matUsage).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';

        setSelectedBlockHistory({ 
            id: locId, 
            records, 
            stats: { totalWater, count: records.length, lastDate: records[0]?.date || 'Never', mostUsedMat },
            charts: { donutData, waterTrend }
        });
    };

    const renderLocationSection = (title, typeFilter, isSelectionMode = false) => (
        <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b pb-1">{title}</h4>
            <div className={`grid ${isSelectionMode ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 md:grid-cols-5 lg:grid-cols-8'} gap-2`}>
                {locations.filter(l => l.type === typeFilter).map(loc => {
                    if (isSelectionMode) {
                        return (
                            <button 
                                key={loc.id} 
                                onClick={() => toggleLocation(loc.id)} 
                                className={`p-2 text-xs font-bold rounded border transition-colors ${
                                    selectedLocations.includes(loc.id) 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {loc.name}
                            </button>
                        );
                    } else {
                        const status = getBlockStatus(loc.id);
                        let bg = 'bg-slate-50 border-slate-200 hover:bg-slate-100';
                        if(status === 'sprayed') bg = 'bg-red-100 border-red-300 text-red-800';
                        if(status === 'safe') bg = 'bg-green-100 border-green-300 text-green-800';
                        return (
                            <button 
                                key={loc.id} 
                                onClick={() => openBlockHistory(loc.id)} 
                                className={`p-2 rounded border text-xs font-bold truncate transition-all hover:scale-105 ${bg}`}
                            >
                                {loc.name}
                            </button>
                        );
                    }
                })}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Spraying</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setView(view === 'entry' ? 'history' : 'entry')} 
                        className="bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50"
                    >
                        {view === 'entry' ? 'View Map' : 'Back'}
                    </button>
                    {view === 'entry' && (
                        <button 
                            onClick={() => setIsModalOpen(true)} 
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex gap-2 hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" /> New
                        </button>
                    )}
                </div>
            </div>
            
            {view === 'entry' ? (
                <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b font-bold">Recent Spraying Records</div>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Materials</th>
                                    <th className="p-3">Water</th>
                                    <th className="p-3">Locations</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sprayingRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400">
                                            No spraying records yet.
                                        </td>
                                    </tr>
                                ) : (
                                    sprayingRecords.map(r => (
                                        <tr key={r.id} className="border-t hover:bg-slate-50">
                                            <td className="p-3">{r.date}</td>
                                            <td className="p-3">{r.items?.map(i => `${i.name} (${i.quantity})`).join(', ')}</td>
                                            <td className="p-3">{r.water} L</td>
                                            <td className="p-3">{r.locations?.length || 0} plots</td>
                                            <td className="p-3 flex gap-2">
                                                <button onClick={() => handleEditRecord(r)} className="p-1 hover:bg-indigo-50 rounded">
                                                    <Edit2 className="w-4 h-4 text-indigo-500"/>
                                                </button>
                                                <button onClick={() => handleDeleteRecord(r.id)} className="p-1 hover:bg-red-50 rounded">
                                                    <Trash2 className="w-4 h-4 text-red-500"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div> Sprayed last 7 days</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div> Not sprayed last 7 days</div>
                    </div>
                    {renderLocationSection("Greenhouses", "greenhouse")}
                    {renderLocationSection("Nurseries", "nursery")}
                    {renderLocationSection("Open Fields", "field")}
                </div>
            )}
            
            {/* Entry Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[75vh] animate-fade-in-up">
                        <h3 className="font-bold text-lg mb-4">{editingId ? 'Edit Record' : (step === 1 ? 'Step 1: Details' : 'Step 2: Select Plots')}</h3>
                        {step === 1 ? (
                            <div className="space-y-4 overflow-y-auto flex-1 p-1">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date</label>
                                    <input type="date" value={formData.date} onChange={e=>setFormData({...formData, date:e.target.value})} className="w-full border p-2 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Materials</label>
                                    {formData.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 mb-2">
                                            <select value={item.materialId} onChange={e=>updateItem(idx, 'materialId', e.target.value)} className="flex-1 border p-2 rounded-lg text-sm">
                                                <option value="">Select...</option>
                                                {sprayMaterials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.quantity})</option>)}
                                            </select>
                                            <input type="number" placeholder="Qty" value={item.quantity} onChange={e=>updateItem(idx, 'quantity', e.target.value)} className="w-24 border p-2 rounded-lg text-sm" />
                                            <button onClick={()=>removeItem(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded"><X className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                    <button onClick={addItem} className="text-sm text-blue-600 flex items-center gap-1 hover:text-blue-700"><Plus className="w-3 h-3"/> Add Material</button>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Water (L)</label>
                                    <input type="number" value={formData.water} onChange={e=>setFormData({...formData, water:e.target.value})} className="w-full border p-2 rounded-lg" />
                                </div>
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    <button onClick={closeModal} className="px-4 py-2 border rounded-lg">Cancel</button>
                                    <button onClick={() => setStep(2)} className="px-4 py-2 bg-blue-600 text-white rounded-lg" disabled={formData.items.length===0}>Next</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full overflow-hidden">
                                <p className="text-sm text-slate-500 mb-2">Select plots to spray:</p>
                                <div className="flex-1 overflow-y-auto p-1 border rounded-lg bg-slate-50">
                                    <div className="p-2 space-y-4">
                                        {renderLocationSection("Greenhouses", "greenhouse", true)}
                                        {renderLocationSection("Nurseries", "nursery", true)}
                                        {renderLocationSection("Open Fields", "field", true)}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t mt-2">
                                    <span className="text-sm font-bold text-blue-800">{selectedLocations.length} selected</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg">Back</button>
                                        <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50" disabled={loading}>
                                            {loading ? 'Saving...' : (editingId ? 'Update' : 'Confirm')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Block History Modal */}
            {selectedBlockHistory && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="font-bold text-xl capitalize text-slate-800">{selectedBlockHistory.id.replace('-', ' ')} Spray Analytics</h3>
                            <button onClick={() => setSelectedBlockHistory(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100"><p className="text-xs font-bold text-blue-600 uppercase">Total Water</p><p className="text-2xl font-bold text-slate-800">{selectedBlockHistory.stats.totalWater.toLocaleString()} L</p></div>
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100"><p className="text-xs font-bold text-purple-600 uppercase">Total Sprays</p><p className="text-2xl font-bold text-slate-800">{selectedBlockHistory.stats.count}</p></div>
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100"><p className="text-xs font-bold text-amber-600 uppercase">Most Used</p><p className="text-lg font-bold text-slate-800 truncate">{selectedBlockHistory.stats.mostUsedMat}</p></div>
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100"><p className="text-xs font-bold text-emerald-600 uppercase">Last Spray</p><p className="text-lg font-bold text-slate-800">{selectedBlockHistory.stats.lastDate}</p></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Water Usage Trend</h4>
                                    <SVGBarChart data={selectedBlockHistory.charts.waterTrend} />
                                </div>
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Chemical Composition</h4>
                                    <SVGDonutChart data={selectedBlockHistory.charts.donutData} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.SprayingManager = SprayingManager;
