import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as Icons from './Icons';
import { SVGBarChart, SVGDonutChart, SVGLineChart, Sparkline, ProgressBar, StatCard, MiniCard, AlertCard, HeatMapCell } from './Shared';
import { FirebaseHelpers } from '../firebase';
import { Sprout, Tractor, Sun, Wind, Warehouse, LayoutGrid, Flower2, Plus, Edit2, Trash2, BarChart3, Package, Menu, DollarSign, X, Lock, AlertTriangle, Droplets, Settings, PieChart } from 'lucide-react';
// Harvesting Manager Component with Firebase

export const HarvestingManager = ({ plots, plantingData, setPlantingData, harvestRecords, setHarvestRecords, plotStates, setPlotStates, plantingRecords, materials, setMaterials, onCalculateCycleCost }) => {
    const [selectedPlot, setSelectedPlot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], selectedBatchId: '', crates: '', heads: '', weight: '', markFullyHarvested: false, packagingMaterialId: '', pricePerKg: '' });
    
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editLog, setEditLog] = useState(null);
    const [editForm, setEditForm] = useState({ crates: 0, heads: 0, weight: 0, markFullyHarvested: false });
    
    const [warningData, setWarningData] = useState(null);

    const getPlotState = (key) => plotStates[key] || { status: 'empty' };
    const packagingMaterials = useMemo(() => materials.filter(m => m.category === 'Packaging Material' && (m.quantity || 0) > 0), [materials]);

    // Get batches for a plot from planting records
    const getPlotBatches = (plotKey) => {
        return plantingRecords.filter(r => r.plotKey === plotKey && (r.quantity || 0) > 0);
    };

    const handlePlotClick = (plot) => {
        const key = `${plot.type === 'Greenhouse' ? 'greenhouse' : 'field'}-${plot.id}`;
        const state = getPlotState(key);
        if (state.status !== 'fully_planted') return alert("Plot must be Fully Planted to harvest.");
        const batches = getPlotBatches(key);
        setSelectedPlot({ ...plot, key, batches });
        setFormData({ date: new Date().toISOString().split('T')[0], selectedBatchId: '', crates: '', heads: '', weight: '', markFullyHarvested: false, packagingMaterialId: '', pricePerKg: '' });
    };

    const processHarvest = async (forceConfirm = false) => {
        setLoading(true);
        
        try {
            const totalHeads = Number(formData.crates) * Number(formData.heads);
            const batch = selectedPlot.batches.find(b => b.id === formData.selectedBatchId);
            if (!batch) {
                alert("Batch not found.");
                setLoading(false);
                return;
            }

            let newQty = (batch.quantity || 0) - totalHeads;
            let isFullyHarvested = formData.markFullyHarvested;

            if (newQty < 0) {
                newQty = 0; 
                isFullyHarvested = true;
            }

            // 20% Loss Warning
            if (isFullyHarvested && !forceConfirm && newQty > 0) {
                const initialQty = batch.initialQuantity || batch.quantity; 
                const unharvested = newQty;
                if (unharvested > (initialQty * 0.2)) {
                    setWarningData({ 
                        message: `Warning: You are discarding ${unharvested.toLocaleString()} heads, which is > 20% of the initial planted quantity (${initialQty.toLocaleString()}).`,
                        lostQty: unharvested 
                    });
                    setLoading(false);
                    return;
                }
            }

            // Handle packaging material
            let packagingCost = 0;
            if (formData.packagingMaterialId) {
                const packMat = materials.find(m => m.id === formData.packagingMaterialId);
                if (packMat) {
                    const needed = Number(formData.crates);
                    if (needed > (packMat.quantity || 0)) {
                        alert(`Insufficient packaging stock! Available: ${packMat.quantity}`);
                        setLoading(false);
                        return;
                    }
                    // Deduct packaging from Firestore
                    await FirebaseHelpers.updateDoc('materials', packMat.id, {
                        quantity: (packMat.quantity || 0) - needed
                    });
                    packagingCost = (packMat.unitPrice || 0) * needed;
                }
            }

            // Update planting record quantity in Firestore
            await FirebaseHelpers.updateDoc('plantingRecords', batch.id, {
                quantity: isFullyHarvested ? 0 : newQty
            });

            let cycleOperationalCost = 0;
            if (isFullyHarvested) {
                // Update plot state in Firestore
                const currentState = getPlotState(selectedPlot.key);
                await FirebaseHelpers.setDoc('plotStates', selectedPlot.key, {
                    ...currentState,
                    status: 'fully_harvested'
                });
                
                cycleOperationalCost = onCalculateCycleCost(selectedPlot.key, batch.date, formData.date);
            }

            // Calculate revenue
            const weight = Number(formData.weight);
            const revenue = weight * (Number(formData.pricePerKg) || 0);

            // Add harvest record to Firestore
            const newRecord = {
                date: formData.date,
                location: `${selectedPlot.type} ${selectedPlot.id}`,
                plotKey: selectedPlot.key,
                batchId: batch.id,
                variety: batch.variety,
                crates: Number(formData.crates),
                heads: Number(formData.heads),
                weight: weight,
                totalHeads: totalHeads, 
                cycle: batch.cycle,
                year: batch.year,
                packagingCost: packagingCost,
                operationalCost: cycleOperationalCost,
                revenue: revenue
            };
            
            await FirebaseHelpers.addDoc('harvestRecords', newRecord);
            
            setSelectedPlot(null);
            setWarningData(null);
            
            if (isFullyHarvested) {
                alert(`Cycle Closed.\nOperational Cost: $${cycleOperationalCost.toFixed(2)}`);
            }
        } catch (error) {
            console.error('Error processing harvest:', error);
            alert('Error saving harvest record. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleHarvest = (e) => { e.preventDefault(); processHarvest(); };

    const handleDeleteLog = async (log) => {
        if (!window.confirm("Delete record?")) return;
        
        try {
            const state = getPlotState(log.plotKey);
            if (log.cycle === state.cycle && log.year === state.year) {
                const totalHeads = (log.crates || 0) * (log.heads || 0);
                
                // Restore quantity to planting record
                const plantingRec = plantingRecords.find(r => r.id === log.batchId);
                if (plantingRec) {
                    await FirebaseHelpers.updateDoc('plantingRecords', plantingRec.id, {
                        quantity: (plantingRec.quantity || 0) + totalHeads
                    });
                }
                
                // Restore plot status if needed
                if (state.status === 'fully_harvested') {
                    await FirebaseHelpers.setDoc('plotStates', log.plotKey, {
                        ...state,
                        status: 'fully_planted'
                    });
                }
            }
            
            // Delete harvest record from Firestore
            await FirebaseHelpers.deleteDoc('harvestRecords', log.id);
        } catch (error) {
            console.error('Error deleting harvest record:', error);
            alert('Error deleting record. Please try again.');
        }
    };

    const handleUpdateLog = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const state = getPlotState(editLog.plotKey);
            const isCurrentCycle = editLog.cycle === state.cycle && editLog.year === state.year;

            if (isCurrentCycle) {
                const newTotal = Number(editForm.crates) * Number(editForm.heads);
                
                await FirebaseHelpers.updateDoc('harvestRecords', editLog.id, {
                    crates: Number(editForm.crates),
                    heads: Number(editForm.heads),
                    weight: Number(editForm.weight),
                    totalHeads: newTotal
                });
                
                if (editForm.markFullyHarvested !== (state.status === 'fully_harvested')) {
                    await FirebaseHelpers.setDoc('plotStates', editLog.plotKey, {
                        ...state,
                        status: editForm.markFullyHarvested ? 'fully_harvested' : 'fully_planted'
                    });
                }
            } else {
                alert("Old cycle record.");
            }
            
            setIsEditOpen(false);
        } catch (error) {
            console.error('Error updating harvest record:', error);
            alert('Error updating record. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const PlotCard = ({ plot }) => {
        const key = `${plot.type === 'Greenhouse' ? 'greenhouse' : 'field'}-${plot.id}`;
        const state = getPlotState(key);
        const batches = getPlotBatches(key);
        const hasCrops = batches.some(b => (b.quantity || 0) > 0);
        const isHarvested = state.status === 'fully_harvested';
        const totalHeads = batches.reduce((a, b) => a + (b.quantity || 0), 0);
        const varieties = [...new Set(batches.filter(b => (b.quantity || 0) > 0).map(b => b.variety))].join(", ");

        let color = 'bg-slate-50 opacity-50';
        if (state.status === 'fully_planted' || state.status === 'growing') color = 'bg-emerald-50 border-emerald-500 cursor-pointer hover:shadow-md';
        if (isHarvested) color = 'bg-red-50 border-red-300';

        return (
            <button 
                onClick={() => handlePlotClick(plot)} 
                disabled={state.status !== 'fully_planted'} 
                className={`p-3 rounded-xl border-2 h-28 flex flex-col justify-between text-left transition-all ${color}`}
            >
                <div className="flex justify-between w-full">
                    <span className="font-bold text-sm text-slate-700">{plot.name}</span>
                    {isHarvested ? (
                        <span className="text-red-500 font-bold text-xs">Harvested</span>
                    ) : state.status === 'fully_planted' ? (
                        <span className="text-emerald-700 font-bold text-xs">Ready</span>
                    ) : (
                        <span className="text-xs text-slate-400">Not Ready</span>
                    )}
                </div>
                {hasCrops && !isHarvested && (
                    <div className="text-xs mt-1">
                        <div className="font-bold text-emerald-800">{totalHeads.toLocaleString()} heads</div>
                        <div className="text-slate-500 truncate">{varieties}</div>
                    </div>
                )}
            </button>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <h2 className="text-2xl font-bold">Harvesting</h2>
            
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
                <div className="p-4 bg-slate-50 border-b font-bold">Harvest Log</div>
                <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Location</th>
                                <th className="p-3">Variety</th>
                                <th className="p-3">Total Qty</th>
                                <th className="p-3">Weight</th>
                                <th className="p-3">Revenue</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {harvestRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-400">
                                        No harvest records yet.
                                    </td>
                                </tr>
                            ) : (
                                harvestRecords.map(r => (
                                    <tr key={r.id} className="border-t hover:bg-slate-50">
                                        <td className="p-3">{r.date}</td>
                                        <td className="p-3">{r.location}</td>
                                        <td className="p-3">{r.variety}</td>
                                        <td className="p-3 font-bold text-emerald-600">{(r.totalHeads || (r.crates * r.heads)).toLocaleString()}</td>
                                        <td className="p-3">{r.weight}kg</td>
                                        <td className="p-3">{r.revenue ? `$${r.revenue.toLocaleString()}` : '-'}</td>
                                        <td className="p-3 flex gap-2">
                                            <button onClick={() => { setEditLog(r); setEditForm({crates: r.crates, heads: r.heads, weight: r.weight, markFullyHarvested: false}); setIsEditOpen(true); }}>
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
            
            {/* Harvest Entry Modal */}
            {selectedPlot && !warningData && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                        <h3 className="font-bold text-lg mb-4">Harvest: {selectedPlot.name}</h3>
                        <form onSubmit={handleHarvest} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Select Batch</label>
                                <select 
                                    value={formData.selectedBatchId} 
                                    onChange={e => setFormData({...formData, selectedBatchId: e.target.value})} 
                                    className="w-full border p-2 rounded-lg" 
                                    required
                                >
                                    <option value="" disabled>Select...</option>
                                    {selectedPlot.batches.filter(b => (b.quantity || 0) > 0).map(b => (
                                        <option key={b.id} value={b.id}>{b.variety} ({b.quantity} available)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Crates</label>
                                    <input type="number" value={formData.crates} onChange={e => setFormData({...formData, crates: e.target.value})} className="w-full border p-2 rounded-lg" required min="1"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Heads/Crate</label>
                                    <input type="number" value={formData.heads} onChange={e => setFormData({...formData, heads: e.target.value})} className="w-full border p-2 rounded-lg" required min="1"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                                    <input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full border p-2 rounded-lg" step="0.1" required/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Price ($/kg)</label>
                                    <input type="number" value={formData.pricePerKg} onChange={e => setFormData({...formData, pricePerKg: e.target.value})} className="w-full border p-2 rounded-lg" step="0.01"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Packaging Material</label>
                                <select value={formData.packagingMaterialId} onChange={e => setFormData({...formData, packagingMaterialId: e.target.value})} className="w-full border p-2 rounded-lg">
                                    <option value="">None</option>
                                    {packagingMaterials.map(m => <option key={m.id} value={m.id}>{m.name} (Stock: {m.quantity})</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2 border-t">
                                <input type="checkbox" id="fullyHarvested" checked={formData.markFullyHarvested} onChange={e => setFormData({...formData, markFullyHarvested: e.target.checked})}/>
                                <label htmlFor="fullyHarvested" className="text-sm font-medium">Mark as Fully Harvested (Closes Cycle)</label>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setSelectedPlot(null)} className="px-4 py-2 border rounded-lg" disabled={loading}>Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Warning Modal */}
            {warningData && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-fade-in-up">
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-600"/>
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mb-2">High Loss Warning</h3>
                        <p className="text-slate-600 mb-6">{warningData.message}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setWarningData(null)} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={() => processHarvest(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" disabled={loading}>
                                {loading ? 'Processing...' : 'Confirm & Discard'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
                        <h3 className="font-bold text-lg mb-4">Edit Record</h3>
                        <form onSubmit={handleUpdateLog} className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Crates</label>
                                    <input type="number" value={editForm.crates} onChange={e => setEditForm({...editForm, crates: e.target.value})} className="w-full border p-2 rounded-lg" required/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Heads</label>
                                    <input type="number" value={editForm.heads} onChange={e => setEditForm({...editForm, heads: e.target.value})} className="w-full border p-2 rounded-lg" required/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                                <input type="number" value={editForm.weight} onChange={e => setEditForm({...editForm, weight: e.target.value})} className="w-full border p-2 rounded-lg" required/>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <input type="checkbox" checked={editForm.markFullyHarvested} onChange={e => setEditForm({...editForm, markFullyHarvested: e.target.checked})}/>
                                <label className="text-sm font-medium">Fully Harvested</label>
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
window.HarvestingManager = HarvestingManager;
