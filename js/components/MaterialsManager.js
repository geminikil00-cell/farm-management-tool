// Materials Manager Component with Firebase
const { useState, useEffect } = React;
const { Plus, Edit2, Trash2 } = window.Icons;

const MaterialsManager = ({ materials, setMaterials }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ 
        name: '', 
        category: 'Seeds', 
        date: new Date().toISOString().split('T')[0], 
        quantity: '', 
        unitPrice: '' 
    });
    const [loading, setLoading] = useState(false);
    
    const categories = ['Seeds', 'Fertilizers', 'Pesticides', 'Packaging Material', 'Water', 'Other'];
    
    const handleSubmit = async (e) => { 
        e.preventDefault();
        setLoading(true);
        
        const item = { 
            ...formData, 
            quantity: Number(formData.quantity), 
            unitPrice: Number(formData.unitPrice), 
            total: Number(formData.quantity) * Number(formData.unitPrice) 
        };
        
        try {
            if (editingId) {
                // Update existing document in Firestore
                await window.Firebase.updateDoc('materials', editingId, item);
            } else {
                // Add new document to Firestore
                await window.Firebase.addDoc('materials', item);
            }
            closeModal();
        } catch (error) {
            console.error('Error saving material:', error);
            alert('Error saving material. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = async (id) => { 
        if(window.confirm('Delete this material?')) {
            try {
                // Delete document from Firestore
                await window.Firebase.deleteDoc('materials', id);
            } catch (error) {
                console.error('Error deleting material:', error);
                alert('Error deleting material. Please try again.');
            }
        }
    };
    
    const closeModal = () => { 
        setIsModalOpen(false); 
        setEditingId(null); 
        setFormData({ 
            name: '', 
            category: 'Seeds', 
            date: new Date().toISOString().split('T')[0], 
            quantity: '', 
            unitPrice: '' 
        }); 
    };

    const openEditModal = (item) => {
        setEditingId(item.id);
        setFormData({
            name: item.name || '',
            category: item.category || 'Seeds',
            date: item.date || new Date().toISOString().split('T')[0],
            quantity: item.quantity || '',
            unitPrice: item.unitPrice || ''
        });
        setIsModalOpen(true);
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Materials</h2>
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex gap-2 hover:bg-emerald-700 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add
                </button>
            </div>
            
            <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Category</th>
                            <th className="p-4">Name</th>
                            <th className="p-4 text-right">Qty</th>
                            <th className="p-4 text-right">Unit Price</th>
                            <th className="p-4 text-right">Total Cost</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materials.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-slate-400">
                                    No materials found. Click "Add" to create one.
                                </td>
                            </tr>
                        ) : (
                            materials.map(item => (
                                <tr key={item.id} className="border-b hover:bg-slate-50">
                                    <td className="p-4">{item.date}</td>
                                    <td className="p-4">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{item.category}</span>
                                    </td>
                                    <td className="p-4 font-bold">{item.name}</td>
                                    <td className="p-4 text-right">{(item.quantity || 0).toLocaleString()}</td>
                                    <td className="p-4 text-right">${(item.unitPrice || 0).toFixed(2)}</td>
                                    <td className="p-4 text-right font-bold text-emerald-700">${(item.total || 0).toLocaleString()}</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button 
                                            onClick={() => openEditModal(item)}
                                            className="p-1 hover:bg-indigo-50 rounded"
                                        >
                                            <Edit2 className="w-4 h-4 text-indigo-500"/>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item.id)}
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
                        <h3 className="font-bold text-lg mb-4">{editingId ? 'Edit' : 'Add'} Material</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Category</label>
                                <select 
                                    value={formData.category} 
                                    onChange={e => setFormData({...formData, category: e.target.value})} 
                                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                                    required
                                    placeholder="e.g., Iceberg Seeds"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date</label>
                                    <input 
                                        type="date" 
                                        value={formData.date} 
                                        onChange={e => setFormData({...formData, date: e.target.value})} 
                                        className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Quantity</label>
                                    <input 
                                        type="number" 
                                        value={formData.quantity} 
                                        onChange={e => setFormData({...formData, quantity: e.target.value})} 
                                        className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                                        required
                                        min="0"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Unit Price ($)</label>
                                <input 
                                    type="number" 
                                    value={formData.unitPrice} 
                                    onChange={e => setFormData({...formData, unitPrice: e.target.value})} 
                                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                                    required
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
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
window.MaterialsManager = MaterialsManager;
