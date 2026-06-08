import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as Icons from './Icons';
import { SVGBarChart, SVGDonutChart, SVGLineChart, Sparkline, ProgressBar, StatCard, MiniCard, AlertCard, HeatMapCell } from './Shared';
import { FirebaseHelpers } from '../firebase';
import { Sprout, Tractor, Sun, Wind, Warehouse, LayoutGrid, Flower2, Plus, Edit2, Trash2, BarChart3, Package, Menu, DollarSign, X, Lock, AlertTriangle, Droplets, Settings, PieChart } from 'lucide-react';
// Irrigation Manager Component with Firebase


export const IrrigationManager = ({ plots, materials, setMaterials, irrigationUnits, setIrrigationUnits, irrigationRecords, setIrrigationRecords }) => {
    const [view, setView] = useState('units');
    const [activeUnit, setActiveUnit] = useState(null);
    const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [selectedBlockHistory, setSelectedBlockHistory] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], materialId: '', quantity: '', water: '' });

    const validMaterials = useMemo(() => materials.filter(m => ['Pesticides', 'Fertilizers'].includes(m.category) && (m.quantity || 0) > 0), [materials]);
    const locations = useMemo(() => [
        ...Array.from({length:10}, (_, i) => ({ id: `greenhouse-${i+1}`, name: `GH ${i+1}`, type: 'greenhouse' })),
        ...Array.from({length:32}, (_, i) => ({ id: `field-${i+1}`, name: `Field ${i+1}`, type: 'field' })),
        ...Array.from({length:8}, (_, i) => ({ id: `nursery-${i+1}`, name: `Nursery ${i+1}`, type: 'nursery' }))
    ], []);

    const openConnectionModal = (unitId) => {
        setActiveUnit(unitId);
        const unit = irrigationUnits.find(u => u.id === unitId);
        setSelectedLocations(unit?.connectedPlots || []);
        setIsConnectionModalOpen(true);
    };

    const saveConnections = async () => {
        setLoading(true);
        try {
            const unit = irrigationUnits.find(u => u.id === activeUnit);
            if (unit) {
                await FirebaseHelpers.setDoc('irrigationUnits', activeUnit, {
                    ...unit,
                    connectedPlots: selectedLocations
                });
            }
            setIsConnectionModalOpen(false);
            setActiveUnit(null);
        } catch (error) {
            console.error('Error saving connections:', error);
            alert('Error saving connections. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const openEntryModal = (unitId, record = null) => {
        setActiveUnit(unitId);
        if (record) {
            setEditingId(record.id);
            setFormData({ 
                date: record.date, 
                materialId: record.materialId, 
                quantity: record.quantity, 
                water: record.water 
            });
        } else {
            setEditingId(null);
            setFormData({ date: new Date().toISOString().split('T')[0], materialId: '', quantity: '', water: '' });
        }
        setIsEntryModalOpen(true);
    };

    const handleEntrySubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const qty = Number(formData.quantity);
        const mat = materials.find(m => m.id === formData.materialId);
        const unit = irrigationUnits.find(u => u.id === activeUnit);

        if (!unit) {
            setLoading(false);
            return;
        }
        
        if (!editingId && (!mat || (mat.quantity || 0) < qty)) {
            alert("Invalid material or insufficient stock.");
            setLoading(false);
            return;
        }

        try {
            // Restore old quantity if editing
            if (editingId) {
                const oldRec = irrigationRecords.find(r => r.id === editingId);
                if (oldRec && oldRec.materialId) {
                    const oldMat = materials.find(m => m.id === oldRec.materialId);
                    if (oldMat) {
                        await FirebaseHelpers.updateDoc('materials', oldMat.id, {
                            quantity: (oldMat.quantity || 0) + Number(oldRec.quantity || 0)
                        });
                    }
                }
            }
            
            // Deduct new quantity
            if (mat) {
                if ((mat.quantity || 0) < qty) {
                    alert("Insufficient stock.");
                    setLoading(false);
                    return;
                }
                await FirebaseHelpers.updateDoc('materials', mat.id, {
                    quantity: (mat.quantity || 0) - qty
                });
            }

            const record = {
                unitId: activeUnit,
                unitName: unit.name,
                date: formData.date,
                materialId: formData.materialId,
                materialName: mat?.name || '',
                quantity: qty,
                water: Number(formData.water),
                appliedTo: unit.connectedPlots || []
            };

            if (editingId) {
                await FirebaseHelpers.updateDoc('irrigationRecords', editingId, record);
            } else {
                await FirebaseHelpers.addDoc('irrigationRecords', record);
            }
            
            setIsEntryModalOpen(false);
            setEditingId(null);
            setFormData({ date: new Date().toISOString().split('T')[0], materialId: '', quantity: '', water: '' });
        } catch (error) {
            console.error('Error saving irrigation record:', error);
            alert('Error saving record. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const toggleLocation = (id) => setSelectedLocations(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

    const handleDeleteRecord = async (recId) => {
        if (!window.confirm("Delete this irrigation record? Stock will be restored.")) return;
        
        try {
            const rec = irrigationRecords.find(r => r.id === recId);
            if (rec && rec.materialId) {
                const mat = materials.find(m => m.id === rec.materialId);
                if (mat) {
                    await FirebaseHelpers.updateDoc('materials', mat.id, {
                        quantity: (mat.quantity || 0) + Number(rec.quantity || 0)
                    });
                }
            }
            
            await FirebaseHelpers.deleteDoc('irrigationRecords', recId);
        } catch (error) {
            console.error('Error deleting irrigation record:', error);
            alert('Error deleting record. Please try again.');
        }
    };

    const handleAddUnit = async () => {
        setLoading(true);
        try {
            // Extract numbers from existing unit names
            const existingNumbers = irrigationUnits.map(u => {
                const match = u.name.match(/\d+/);
                return match ? parseInt(match[0]) : 999;
            }).sort((a, b) => a - b);
            // Find the first free number starting from 1
            let nextNumber = 1;
            for (let num of existingNumbers) {
                if (nextNumber === num) {
                    nextNumber++;
                } else {
                    break;
                }
            }
            const newUnit = {
                name: `Unit ${nextNumber}`,
                connectedPlots: []
            };
            await FirebaseHelpers.addDoc('irrigationUnits', newUnit);
        } catch (error) {
            console.error('Error adding irrigation unit:', error);
            alert('Error adding unit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUnit = async (unitId) => {
        if (!window.confirm("Delete this irrigation unit? Associated records will remain but will no longer be linked to a unit.")) return;
        
        setLoading(true);
        try {
            // Delete the unit only (records remain)
            await FirebaseHelpers.deleteDoc('irrigationUnits', unitId);
        } catch (error) {
            console.error('Error deleting irrigation unit:', error);
            alert('Error deleting unit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const openBlockHistory = (locId) => {
        const records = irrigationRecords.filter(r => r.appliedTo?.includes(locId)).sort((a,b)=>new Date(b.date)-new Date(a.date));
        const totalWater = records.reduce((acc, r) => acc + Number(r.water || 0), 0);
        
        const matUsage = {};
        records.forEach(r => {
            if (r.materialName) {
                matUsage[r.materialName] = (matUsage[r.materialName] || 0) + Number(r.quantity || 0);
            }
        });
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
                        return (
                            <button 
                                key={loc.id} 
                                onClick={() => openBlockHistory(loc.id)} 
                                className="p-2 rounded border text-xs font-bold truncate transition-all hover:scale-105 bg-slate-50 border-slate-200 hover:bg-slate-100"
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
                <h2 className="text-2xl font-bold">Irrigation & Fertigation</h2>
                <div className="flex gap-2">
                    {view === 'units' && (
                        <button 
                            onClick={handleAddUnit}
                            disabled={loading}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Unit
                        </button>
                    )}
                    <button 
                        onClick={() => setView(view === 'units' ? 'history' : 'units')} 
                        className="bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50"
                    >
                        {view === 'units' ? 'View Map' : 'Back to Units'}
                    </button>
                </div>
            </div>
            
            {view === 'units' ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {irrigationUnits.map(unit => (
                            <div key={unit.id} className="bg-white rounded-xl border shadow-sm p-6 flex flex-col justify-between h-64">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-cyan-700">
                                            <Droplets className="w-6 h-6"/>
                                            <h3 className="font-bold text-lg">{unit.name}</h3>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteUnit(unit.id)}
                                            disabled={loading}
                                            className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 disabled:opacity-50"
                                            title="Delete unit"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-4">
                                        Connected to <strong className="text-slate-800">{unit.connectedPlots?.length || 0}</strong> plots
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <button 
                                        onClick={() => openConnectionModal(unit.id)} 
                                        className="w-full py-2 border rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50"
                                    >
                                        Edit Connections
                                    </button>
                                    <button 
                                        onClick={() => openEntryModal(unit.id)} 
                                        className="w-full py-2 bg-cyan-600 text-white rounded-lg text-sm font-bold hover:bg-cyan-700 disabled:opacity-50" 
                                        disabled={(unit.connectedPlots?.length || 0) === 0}
                                    >
                                        Log Irrigation
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 border-b font-bold">Recent Logs</div>
                        <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Unit</th>
                                        <th className="p-3">Material</th>
                                        <th className="p-3">Water</th>
                                        <th className="p-3">Plots</th>
                                        <th className="p-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {irrigationRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-slate-400">
                                                No irrigation records yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        irrigationRecords.map(r => (
                                            <tr key={r.id} className="border-t hover:bg-slate-50">
                                                <td className="p-3">{r.date}</td>
                                                <td className="p-3 font-bold">{r.unitName}</td>
                                                <td className="p-3">{r.materialName} ({r.quantity})</td>
                                                <td className="p-3">{r.water}L</td>
                                                <td className="p-3">{r.appliedTo?.length || 0}</td>
                                                <td className="p-3 flex gap-2">
                                                    <button onClick={() => openEntryModal(r.unitId, r)} className="p-1 hover:bg-indigo-50 rounded">
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
                </div>
            ) : (
                <div className="space-y-6">
                    {renderLocationSection("Greenhouses", "greenhouse")}
                    {renderLocationSection("Nurseries", "nursery")}
                    {renderLocationSection("Open Fields", "field")}
                </div>
            )}

            {/* Connection Modal */}
            {isConnectionModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[80vh] animate-fade-in-up">
                        <h3 className="font-bold text-lg mb-4">Edit Connections: {irrigationUnits.find(u=>u.id===activeUnit)?.name}</h3>
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
                                <button onClick={() => setIsConnectionModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                                <button onClick={saveConnections} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50" disabled={loading}>
                                    {loading ? 'Saving...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Entry Modal */}
            {isEntryModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                        <h3 className="font-bold text-lg mb-4">{editingId ? 'Edit' : 'New'} Irrigation Log</h3>
                        <form onSubmit={handleEntrySubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Date</label>
                                <input type="date" value={formData.date} onChange={e=>setFormData({...formData, date:e.target.value})} className="w-full border p-2 rounded-lg" required/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Material</label>
                                <select value={formData.materialId} onChange={e=>setFormData({...formData, materialId:e.target.value})} className="w-full border p-2 rounded-lg" required>
                                    <option value="" disabled>Select...</option>
                                    {validMaterials.map(m=><option key={m.id} value={m.id}>{m.name} (Stock: {m.quantity})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Quantity</label>
                                <input type="number" value={formData.quantity} onChange={e=>setFormData({...formData, quantity:e.target.value})} className="w-full border p-2 rounded-lg" required min="1"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Water Volume (L)</label>
                                <input type="number" value={formData.water} onChange={e=>setFormData({...formData, water:e.target.value})} className="w-full border p-2 rounded-lg" required min="1"/>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={()=>setIsEntryModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-lg disabled:opacity-50" disabled={loading}>
                                    {loading ? 'Saving...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Block History Modal */}
            {selectedBlockHistory && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="font-bold text-xl capitalize text-slate-800">{selectedBlockHistory.id.replace('-', ' ')} Irrigation Analytics</h3>
                            <button onClick={() => setSelectedBlockHistory(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100"><p className="text-xs font-bold text-cyan-600 uppercase">Total Water</p><p className="text-2xl font-bold text-slate-800">{selectedBlockHistory.stats.totalWater.toLocaleString()} L</p></div>
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100"><p className="text-xs font-bold text-blue-600 uppercase">Events</p><p className="text-2xl font-bold text-slate-800">{selectedBlockHistory.stats.count}</p></div>
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100"><p className="text-xs font-bold text-indigo-600 uppercase">Primary Input</p><p className="text-lg font-bold text-slate-800 truncate">{selectedBlockHistory.stats.mostUsedMat}</p></div>
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100"><p className="text-xs font-bold text-green-600 uppercase">Last Event</p><p className="text-lg font-bold text-slate-800">{selectedBlockHistory.stats.lastDate}</p></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Water Volume Trend</h4>
                                    <SVGBarChart data={selectedBlockHistory.charts.waterTrend} />
                                </div>
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Input Distribution</h4>
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

window.IrrigationManager = IrrigationManager;
