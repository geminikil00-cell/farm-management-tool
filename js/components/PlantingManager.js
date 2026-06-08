// Planting Manager Component with Firebase
const { useState, useMemo } = React;
const { Edit2, Trash2, Lock } = window.Icons;

const PlantingManager = ({ plots, plantingData, setPlantingData, plantingRecords, setPlantingRecords, nurseryRecords, setNurseryRecords, plotStates, setPlotStates }) => {
    const [selectedPlot, setSelectedPlot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], selectedBatchId: '', quantity: '', markFullyPlanted: false });
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editLog, setEditLog] = useState(null);
    const [editForm, setEditForm] = useState({ date: '', quantity: 0, markFullyPlanted: false });

    const availableBatches = useMemo(() => nurseryRecords.filter(r => (r.remainingCount || 0) > 0), [nurseryRecords]);
    const getPlotState = (key) => plotStates[key] || { status: 'empty', cycle: 0, year: new Date().getFullYear() };

    const handlePlotClick = (plot) => {
        const key = `${plot.type === 'Greenhouse' ? 'greenhouse' : 'field'}-${plot.id}`;
        const state = getPlotState(key);
        if (state.status === 'fully_planted') return alert("Plot is fully planted. Harvest it first.");
        setSelectedPlot({ ...plot, key, state });
        setFormData({ date: new Date().toISOString().split('T')[0], selectedBatchId: '', quantity: '', markFullyPlanted: false });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const qty = Number(formData.quantity);
        const nurseryBatch = nurseryRecords.find(r => r.id === formData.selectedBatchId);
        
        if (qty <= 0 || qty > (nurseryBatch?.remainingCount || 0)) {
            alert("Invalid Quantity");
            setLoading(false);
            return;
        }

        try {
            let { cycle, year, status } = selectedPlot.state;
            const currentYear = new Date().getFullYear();
            if (status === 'empty' || status === 'fully_harvested') {
                year = currentYear > year ? currentYear : year;
                cycle = currentYear > selectedPlot.state.year ? 1 : (cycle || 0) + 1;
            }
            if (cycle === 0) cycle = 1;

            // Update nursery record in Firestore
            await window.Firebase.updateDoc('nurseryRecords', nurseryBatch.id, {
                remainingCount: (nurseryBatch.remainingCount || 0) - qty
            });

            // Add planting record to Firestore
            const newRecord = {
                date: formData.date,
                variety: nurseryBatch.variety,
                quantity: qty,
                initialQuantity: qty,
                nurseryBatchId: nurseryBatch.id,
                status: 'growing',
                cycle,
                year,
                location: `${selectedPlot.type} ${selectedPlot.id}`,
                plotKey: selectedPlot.key
            };
            
            await window.Firebase.addDoc('plantingRecords', newRecord);

            // Update plot state in Firestore
            const newState = {
                status: formData.markFullyPlanted ? 'fully_planted' : 'growing',
                cycle,
                year
            };
            await window.Firebase.setDoc('plotStates', selectedPlot.key, newState);

            setSelectedPlot(null);
        } catch (error) {
            console.error('Error saving planting record:', error);
            alert('Error saving record. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLog = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const newQty = Number(editForm.quantity);
        const state = getPlotState(editLog.plotKey);
        
        try {
            if (editLog.cycle === state.cycle && editLog.year === state.year) {
                const diff = newQty - (editLog.quantity || 0);
                const nb = nurseryRecords.find(r => r.id === editLog.nurseryBatchId);
                
                if (nb && diff > (nb.remainingCount || 0)) {
                    alert("Insufficient seedlings");
                    setLoading(false);
                    return;
                }
                
                if (nb) {
                    await window.Firebase.updateDoc('nurseryRecords', nb.id, {
                        remainingCount: (nb.remainingCount || 0) - diff
                    });
                }
                
                if (editForm.markFullyPlanted !== (state.status === 'fully_planted')) {
                    await window.Firebase.setDoc('plotStates', editLog.plotKey, {
                        ...state,
                        status: editForm.markFullyPlanted ? 'fully_planted' : 'growing'
                    });
                }
            } else {
                alert("Old cycle record. Inventory not updated.");
            }
            
            await window.Firebase.updateDoc('plantingRecords', editLog.id, {
                date: editForm.date,
                quantity: newQty
            });
            
            setIsEditOpen(false);
        } catch (error) {
            console.error('Error updating planting record:', error);
            alert('Error updating record. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLog = async (log) => {
        if (!window.confirm("Delete record?")) return;
        
        try {
            const state = getPlotState(log.plotKey);
            if (log.cycle === state.cycle && log.year === state.year) {
                // Restore nursery stock
                const nb = nurseryRecords.find(r => r.id === log.nurseryBatchId);
                if (nb) {
                    await window.Firebase.updateDoc('nurseryRecords', nb.id, {
                        remainingCount: (nb.remainingCount || 0) + (log.quantity || 0)
                    });
                }
                
                // Check if this is the last record for this plot
                const remainingRecords = plantingRecords.filter(r => r.plotKey === log.plotKey && r.id !== log.id);
                if (remainingRecords.length === 0) {
                    await window.Firebase.setDoc('plotStates', log.plotKey, {
                        ...state,
                        status: 'empty'
                    });
                }
            }
            
            await window.Firebase.deleteDoc('plantingRecords', log.id);
        } catch (error) {
            console.error('Error deleting planting record:', error);
            alert('Error deleting record. Please try again.');
        }
    };

    const PlotCard = ({ plot }) => {
        const key = `${plot.type === 'Greenhouse' ? 'greenhouse' : 'field'}-${plot.id}`;
        const state = getPlotState(key);
        let color = 'bg-white border-slate-200';
        if (state.status === 'fully_harvested') color = 'bg-red-50 border-red-200';
        else if (state.status === 'fully_planted') color = 'bg-emerald-100 border-emerald-600';
        else if (state.status === 'growing') color = 'bg-emerald-50 border-emerald-400';
        
        return (
            <button 
                onClick={() => handlePlotClick(plot)} 
                className={`p-3 rounded-xl border-2 h-24 flex flex-col justify-between text-left transition-all hover:shadow-md ${color} relative`}
            >
                <div className="flex justify-between w-full">
                    <span className="font-bold text-sm text-slate-700">{plot.name}</span>
                    {state.status === 'fully_planted' && <Lock className="w-4 h-4 text-emerald-800" />}
                </div>
                <div className="text-xs">
                    {state.status === 'empty' ? (
                        <span className="text-slate-400">Ready</span>
                    ) : (
                        <span className="text-emerald-800 font-bold">Cycle {state.cycle}</span>
                    )}
                </div>
            </button>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <h2 className="text-2xl font-bold">Planting</h2>
            
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Greenhouses</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {plots.filter(p => p.type === 'Greenhouse').map(p => <PlotCard key={p.id} plot={p} />)}
                </div>
            </div>
            
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Open Fields</h3>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {plots.filter(p => p.type === 'Open Field').map(p => <PlotCard key={p.id} plot={p} />)}
                </div>
            </div>
            
            <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b font-bold">Planting History</div>
                <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Location</th>
                                <th className="p-3">Variety</th>
                                <th className="p-3">Qty</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plantingRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400">
                                        No planting records yet.
                                    </td>
                                </tr>
                            ) : (
                                plantingRecords.map(r => (
                                    <tr key={r.id} className="border-t hover:bg-slate-50">
                                        <td className="p-3">{r.date}</td>
                                        <td className="p-3">{r.location}</td>
                                        <td className="p-3">{r.variety}</td>
                                        <td className="p-3 font-bold text-emerald-600">+{r.quantity}</td>
                                        <td className="p-3 flex gap-2">
                                            <button onClick={() => { setEditLog(r); setEditForm({date: r.date, quantity: r.quantity, markFullyPlanted: false}); setIsEditOpen(true); }}>
                                                <Edit2 className="w-4 h-4 text-indigo-500"/>
                                            </button>
                                            <button onClick={() => handleDeleteLog(r)}>
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
            
            {/* Planting Modal */}
            {selectedPlot && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                        <h3 className="font-bold text-lg mb-4">Plant in: {selectedPlot.name}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Select Batch</label>
                                <select 
                                    value={formData.selectedBatchId} 
                                    onChange={e => setFormData({...formData, selectedBatchId: e.target.value})} 
                                    className="w-full border p-2 rounded-lg" 
                                    required
                                >
                                    <option value="">Select...</option>
                                    {availableBatches.map(b => (
                                        <option key={b.id} value={b.id}>{b.variety} ({b.remainingCount} available)</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Quantity</label>
                                <input 
                                    type="number" 
                                    value={formData.quantity} 
                                    onChange={e => setFormData({...formData, quantity: e.target.value})} 
                                    className="w-full border p-2 rounded-lg" 
                                    required
                                    min="1"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <input 
                                    type="checkbox" 
                                    id="fullyPlanted"
                                    checked={formData.markFullyPlanted} 
                                    onChange={e => setFormData({...formData, markFullyPlanted: e.target.checked})}
                                />
                                <label htmlFor="fullyPlanted" className="text-sm font-medium">Mark as Fully Planted</label>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setSelectedPlot(null)} className="px-4 py-2 border rounded-lg" disabled={loading}>Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
                        <h3 className="font-bold text-lg mb-4">Edit Record</h3>
                        <form onSubmit={handleUpdateLog} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Quantity</label>
                                <input 
                                    type="number" 
                                    value={editForm.quantity} 
                                    onChange={e => setEditForm({...editForm, quantity: e.target.value})} 
                                    className="w-full border p-2 rounded-lg" 
                                    required
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <input 
                                    type="checkbox" 
                                    checked={editForm.markFullyPlanted} 
                                    onChange={e => setEditForm({...editForm, markFullyPlanted: e.target.checked})}
                                />
                                <label className="text-sm font-medium">Fully Planted</label>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 border rounded-lg" disabled={loading}>Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50" disabled={loading}>
                                    {loading ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Make available globally
window.PlantingManager = PlantingManager;
