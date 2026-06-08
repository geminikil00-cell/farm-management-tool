// Nursery Manager Component with Firebase
const { useState, useMemo } = React;
const { Plus, Edit2, Trash2, DollarSign } = window.Icons;

const NurseryManager = ({ records, setRecords, materials, setMaterials, onCalculateCost }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().split('T')[0], 
        crop: 'Iceberg Lettuce', 
        variety: '', 
        customVariety: '', 
        seedCount: '', 
        isCustomVariety: false, 
        materialId: '' 
    });

    const seedMaterials = useMemo(() => materials.filter(m => m.category === 'Seeds' && (m.quantity || 0) > 0), [materials]);
    const selectedMaterial = useMemo(() => formData.materialId ? materials.find(m => m.id === formData.materialId) : null, [formData.materialId, materials]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const count = Number(formData.seedCount);
        if (count < 0) {
            alert("Negative values not allowed");
            setLoading(false);
            return;
        }

        try {
            if (editingId) {
                // Update existing record
                const oldRecord = records.find(r => r.id === editingId);
                const diff = count - (oldRecord?.seedCount || 0);
                
                if (oldRecord?.materialId) {
                    const mat = materials.find(m => m.id === oldRecord.materialId);
                    if (mat && diff > (mat.quantity || 0)) {
                        alert("Insufficient stock.");
                        setLoading(false);
                        return;
                    }
                    if (mat) {
                        await window.Firebase.updateDoc('materials', mat.id, {
                            quantity: (mat.quantity || 0) - diff
                        });
                    }
                }
                
                await window.Firebase.updateDoc('nurseryRecords', editingId, {
                    ...formData,
                    seedCount: count,
                    remainingCount: (oldRecord?.remainingCount || 0) + diff
                });
            } else {
                // Add new record
                if (!formData.isCustomVariety && formData.materialId) {
                    const mat = materials.find(m => m.id === formData.materialId);
                    if (count > (mat?.quantity || 0)) {
                        alert("Insufficient stock.");
                        setLoading(false);
                        return;
                    }
                    // Update material stock in Firestore
                    await window.Firebase.updateDoc('materials', mat.id, {
                        quantity: (mat.quantity || 0) - count
                    });
                }
                
                const variety = formData.isCustomVariety ? formData.customVariety : selectedMaterial?.name || formData.variety;
                
                await window.Firebase.addDoc('nurseryRecords', {
                    date: formData.date,
                    crop: formData.crop,
                    variety,
                    seedCount: count,
                    remainingCount: count,
                    status: 'Seeded',
                    materialId: formData.materialId || null
                });
            }
            closeModal();
        } catch (error) {
            console.error('Error saving nursery record:', error);
            alert('Error saving record. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (record) => {
        if (!window.confirm('Delete this record?')) return;
        
        try {
            // Restore material stock if applicable
            if (record.materialId) {
                const mat = materials.find(m => m.id === record.materialId);
                if (mat) {
                    await window.Firebase.updateDoc('materials', mat.id, {
                        quantity: (mat.quantity || 0) + (record.seedCount || 0)
                    });
                }
            }
            
            // Delete from Firestore
            await window.Firebase.deleteDoc('nurseryRecords', record.id);
        } catch (error) {
            console.error('Error deleting nursery record:', error);
            alert('Error deleting record. Please try again.');
        }
    };

    const closeModal = () => { 
        setIsModalOpen(false); 
        setEditingId(null); 
        setFormData({ 
            date: new Date().toISOString().split('T')[0], 
            crop: 'Iceberg Lettuce', 
            variety: '', 
            customVariety: '', 
            seedCount: '', 
            isCustomVariety: false, 
            materialId: '' 
        }); 
    };

    const openEditModal = (record) => {
        setEditingId(record.id);
        setFormData({
            date: record.date || new Date().toISOString().split('T')[0],
            crop: record.crop || 'Iceberg Lettuce',
            variety: record.variety || '',
            customVariety: '',
            seedCount: record.seedCount || '',
            isCustomVariety: !record.materialId,
            materialId: record.materialId || ''
        });
        setIsModalOpen(true);
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Nursery</h2>
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex gap-2 hover:bg-emerald-700 transition-colors"
                >
                    <Plus className="w-4 h-4" /> New Sowing
                </button>
            </div>
            
            <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Variety</th>
                            <th className="p-4 text-right">Seeded</th>
                            <th className="p-4 text-right">Available</th>
                            <th className="p-4 text-right">Cost/Seed</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-slate-400">
                                    No nursery records found. Click "New Sowing" to create one.
                                </td>
                            </tr>
                        ) : (
                            records.map(r => (
                                <tr key={r.id} className="border-b hover:bg-slate-50">
                                    <td className="p-4">{r.date}</td>
                                    <td className="p-4 font-bold">{r.variety}</td>
                                    <td className="p-4 text-right">{(r.seedCount || 0).toLocaleString()}</td>
                                    <td className="p-4 text-right font-bold text-emerald-700">{(r.remainingCount || 0).toLocaleString()}</td>
                                    <td className="p-4 text-right">{r.costPerSeedling ? `$${Number(r.costPerSeedling).toFixed(4)}` : '-'}</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button 
                                            onClick={() => onCalculateCost(r.id, r.date, new Date().toISOString().split('T')[0])} 
                                            title="Calculate Current Cost" 
                                            className="text-green-600 hover:bg-green-50 p-1 rounded"
                                        >
                                            <DollarSign className="w-4 h-4"/>
                                        </button>
                                        <button 
                                            onClick={() => openEditModal(r)}
                                            className="p-1 hover:bg-indigo-50 rounded"
                                        >
                                            <Edit2 className="w-4 h-4 text-indigo-500"/>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(r)}
                                            className="p-1 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500"/>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                        <h3 className="font-bold text-lg mb-4">{editingId ? 'Edit' : 'New'} Sowing</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Date</label>
                                <input 
                                    type="date" 
                                    value={formData.date} 
                                    onChange={e => setFormData({...formData, date: e.target.value})} 
                                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                                    required
                                />
                            </div>
                            
                            {!editingId && (
                                <div>
                                    <div className="flex gap-4 mb-2 text-sm">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                checked={!formData.isCustomVariety} 
                                                onChange={() => setFormData({...formData, isCustomVariety: false})}
                                                className="text-emerald-600"
                                            /> 
                                            From Inventory
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                checked={formData.isCustomVariety} 
                                                onChange={() => setFormData({...formData, isCustomVariety: true})}
                                                className="text-emerald-600"
                                            /> 
                                            Custom Variety
                                        </label>
                                    </div>
                                    
                                    {!formData.isCustomVariety ? (
                                        <select 
                                            value={formData.materialId} 
                                            onChange={e => setFormData({...formData, materialId: e.target.value})} 
                                            className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                                            required
                                        >
                                            <option value="">Select Seed...</option>
                                            {seedMaterials.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} (Stock: {s.quantity})</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input 
                                            type="text" 
                                            placeholder="Variety Name" 
                                            value={formData.customVariety} 
                                            onChange={e => setFormData({...formData, customVariety: e.target.value})} 
                                            className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                                            required
                                        />
                                    )}
                                </div>
                            )}
                            
                            {selectedMaterial && !editingId && !formData.isCustomVariety && (
                                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                                    <p><strong>Purchased:</strong> {selectedMaterial.date}</p>
                                    <p><strong>Available Stock:</strong> {(selectedMaterial.quantity || 0).toLocaleString()}</p>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium mb-1">Seed Count</label>
                                <input 
                                    type="number" 
                                    value={formData.seedCount} 
                                    onChange={e => setFormData({...formData, seedCount: e.target.value})} 
                                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                                    required
                                    min="1"
                                    placeholder="Number of seeds"
                                />
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button 
                                    type="button" 
                                    onClick={closeModal} 
                                    className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                                    disabled={loading}
                                >
                                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                    {loading ? 'Saving...' : 'Save'}
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
window.NurseryManager = NurseryManager;
