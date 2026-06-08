// Main App Component with Firebase Authentication
const { useState, useEffect } = React;
const { Sprout, LayoutGrid, Package, Flower2, Tractor, Droplets, Settings, PieChart, Menu } = window.Icons;

const App = () => {
    // Auth State
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    
    // App State
    const [currentView, setCurrentView] = useState('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(true);
    
    // Firestore State - All data comes from Firebase
    const [materials, setMaterials] = useState([]);
    const [nurseryRecords, setNurseryRecords] = useState([]);
    const [plantingData, setPlantingData] = useState({}); 
    const [plantingRecords, setPlantingRecords] = useState([]);
    const [harvestRecords, setHarvestRecords] = useState([]);
    const [sprayingRecords, setSprayingRecords] = useState([]);
    const [irrigationUnits, setIrrigationUnits] = useState([]);
    const [irrigationRecords, setIrrigationRecords] = useState([]);
    const [plotStates, setPlotStates] = useState({}); 
    const [plots, setPlots] = useState([]);

    // Listen to Auth State Changes
    useEffect(() => {
        const unsubscribe = window.Firebase.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        
        return () => unsubscribe();
    }, []);

    // Subscribe to Firestore collections when user is authenticated
    useEffect(() => {
        if (!user) {
            // Reset state when logged out
            setMaterials([]);
            setNurseryRecords([]);
            setPlantingRecords([]);
            setHarvestRecords([]);
            setSprayingRecords([]);
            setIrrigationUnits([]);
            setIrrigationRecords([]);
            setPlotStates({});
            setPlots([]);
            return;
        }

        setIsDataLoading(true);
        const unsubscribers = [];

        // Subscribe to Materials
        unsubscribers.push(
            window.Firebase.onSnapshot('materials', (data) => {
                setMaterials(data);
            })
        );

        // Subscribe to Nursery Records
        unsubscribers.push(
            window.Firebase.onSnapshot('nurseryRecords', (data) => {
                setNurseryRecords(data);
            })
        );

        // Subscribe to Planting Records
        unsubscribers.push(
            window.Firebase.onSnapshot('plantingRecords', (data) => {
                setPlantingRecords(data);
            })
        );

        // Subscribe to Harvest Records
        unsubscribers.push(
            window.Firebase.onSnapshot('harvestRecords', (data) => {
                setHarvestRecords(data);
            })
        );

        // Subscribe to Spraying Records
        unsubscribers.push(
            window.Firebase.onSnapshot('sprayingRecords', (data) => {
                setSprayingRecords(data);
            })
        );

        // Subscribe to Irrigation Units
        unsubscribers.push(
            window.Firebase.onSnapshot('irrigationUnits', (data) => {
                // Sort units by number extracted from name
                const sorted = data.sort((a, b) => {
                    const numA = parseInt(a.name.match(/\d+/)?.[0] || '999');
                    const numB = parseInt(b.name.match(/\d+/)?.[0] || '999');
                    return numA - numB;
                });
                setIrrigationUnits(sorted);
            })
        );

        // Subscribe to Irrigation Records
        unsubscribers.push(
            window.Firebase.onSnapshot('irrigationRecords', (data) => {
                setIrrigationRecords(data);
            })
        );

        // Subscribe to Plot States
        unsubscribers.push(
            window.Firebase.onSnapshot('plotStates', (data) => {
                const statesObj = {};
                data.forEach(item => {
                    statesObj[item.id] = item;
                });
                setPlotStates(statesObj);
            })
        );

        // Subscribe to Plots
        unsubscribers.push(
            window.Firebase.onSnapshot('plots', (data) => {
                if (data.length === 0) {
                    // Initialize default plots if none exist
                    const defaultPlots = [
                        ...Array.from({length: 10}, (_, i) => ({ id: `gh-${i+1}`, type: 'Greenhouse', name: `GH ${i+1}` })),
                        ...Array.from({length: 32}, (_, i) => ({ id: `field-${i+1}`, type: 'Open Field', name: `O.F ${i+1}` })),
                        ...Array.from({length: 8}, (_, i) => ({ id: `nursery-${i+1}`, type: 'Nursery', name: `Nursery ${i+1}` }))
                    ];
                    setPlots(defaultPlots);
                } else {
                    setPlots(data);
                }
                setIsDataLoading(false);
            })
        );

        // Cleanup subscriptions on unmount or logout
        return () => {
            unsubscribers.forEach(unsub => {
                if (typeof unsub === 'function') unsub();
            });
        };
    }, [user]);

    // Handle Logout
    const handleLogout = async () => {
        try {
            await window.Firebase.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Add Plot to Firestore
    const handleAddPlot = async (type) => {
        const existingOfType = plots.filter(p => p.type === type);
        const newId = existingOfType.length > 0 ? Math.max(...existingOfType.map(p => parseInt(p.id.split('-')[1]) || 0)) + 1 : 1;
        const prefix = type === 'Greenhouse' ? 'gh' : type === 'Open Field' ? 'field' : 'nursery';
        const displayPrefix = type === 'Greenhouse' ? 'GH' : type === 'Open Field' ? 'O.F' : 'Nursery';
        
        const newPlot = { 
            type, 
            name: `${displayPrefix} ${newId}` 
        };
        
        try {
            await window.Firebase.addDoc('plots', newPlot);
        } catch (error) {
            console.error('Error adding plot:', error);
        }
    };

    // Update Plot State in Firestore
    const updatePlotState = async (plotKey, newState) => {
        try {
            await window.Firebase.setDoc('plotStates', plotKey, newState, { merge: true });
        } catch (error) {
            console.error('Error updating plot state:', error);
        }
        setPlotStates(prev => ({ ...prev, [plotKey]: newState }));
    };

    // Calculate Seedling Cost
    const calculateSeedlingCost = async (seedBatchId, sowingDate, plantingDate) => {
        const batch = nurseryRecords.find(r => r.id === seedBatchId);
        if (!batch) return 0;
        
        let unitSeedCost = 0;
        if (batch.materialId) {
            const seedMat = materials.find(m => m.id === batch.materialId);
            unitSeedCost = seedMat ? seedMat.unitPrice : 0;
        }

        let accumulatedWaterCost = 0;
        let accumulatedMaterialCost = 0;
        
        const waterMat = materials.find(m => m.category === 'Water');
        const waterPrice = waterMat ? waterMat.unitPrice : 0;

        const start = new Date(sowingDate);
        const end = new Date(plantingDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayStr = d.toISOString().split('T')[0];
            
            const sownBatches = nurseryRecords.filter(n => new Date(n.date) <= d);
            const totalSown = sownBatches.reduce((sum, n) => sum + (n.seedCount || 0), 0);
            
            const plantedRecordsBefore = plantingRecords.filter(p => new Date(p.date) < d);
            const totalPlanted = plantedRecordsBefore.reduce((sum, p) => sum + (p.quantity || 0), 0);
            
            const population = Math.max(1, totalSown - totalPlanted);

            const dailyIrrigations = irrigationRecords.filter(r => r.date === dayStr && r.appliedTo?.some(loc => loc.includes('nursery')));
            
            let dailyWaterCost = 0;
            let dailyIrrMatCost = 0;

            dailyIrrigations.forEach(r => {
                dailyWaterCost += (Number(r.water) * waterPrice);
                const mat = materials.find(m => m.id === r.materialId);
                dailyIrrMatCost += (Number(r.quantity) * (mat ? mat.unitPrice : 0));
            });

            const dailySprays = sprayingRecords.filter(r => r.date === dayStr && r.locations?.some(loc => loc.includes('nursery')));
            let dailySprayMatCost = 0;
            
            dailySprays.forEach(r => {
                dailyWaterCost += (Number(r.water) * waterPrice);
                r.items?.forEach(item => {
                    const mat = materials.find(m => m.id === Number(item.materialId));
                    dailySprayMatCost += (Number(item.quantity) * (mat ? mat.unitPrice : 0));
                });
            });

            accumulatedWaterCost += (dailyWaterCost / population);
            accumulatedMaterialCost += ((dailyIrrMatCost + dailySprayMatCost) / population);
        }

        const totalCost = unitSeedCost + accumulatedWaterCost + accumulatedMaterialCost;
        
        // Update in Firestore
        try {
            await window.Firebase.updateDoc('nurseryRecords', seedBatchId, {
                costPerSeedling: totalCost,
                lastCostCalc: plantingDate
            });
        } catch (error) {
            console.error('Error updating seedling cost:', error);
        }
        
        return totalCost;
    };

    // Calculate Cycle Operational Cost
    const calculateCycleOperationalCost = (plotKey, startDate, endDate) => {
        const breakdown = calculateCycleBreakdown(plotKey, startDate, endDate);
        return breakdown.water + breakdown.irrMat + breakdown.spray;
    };

    // Calculate Cycle Breakdown
    const calculateCycleBreakdown = (plotKey, startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const waterMat = materials.find(m => m.category === 'Water');
        const waterPrice = waterMat ? waterMat.unitPrice : 0;

        let waterShare = 0;
        let irrMatShare = 0;
        let sprayShare = 0;

        irrigationRecords.forEach(r => {
            const rDate = new Date(r.date);
            if (rDate >= start && rDate <= end && r.appliedTo?.includes(plotKey)) {
                const mat = materials.find(m => m.id === r.materialId);
                const matCost = (Number(r.quantity) * (mat ? mat.unitPrice : 0));
                const waterCost = (Number(r.water) * waterPrice);
                const plotsCount = r.appliedTo?.length || 1;
                waterShare += (waterCost / plotsCount);
                irrMatShare += (matCost / plotsCount);
            }
        });

        sprayingRecords.forEach(r => {
            const rDate = new Date(r.date);
            if (rDate >= start && rDate <= end && r.locations?.includes(plotKey)) {
                let eventMatCost = 0;
                r.items?.forEach(item => {
                    const mat = materials.find(m => m.id === Number(item.materialId));
                    eventMatCost += (Number(item.quantity) * (mat ? mat.unitPrice : 0));
                });
                const waterCost = (Number(r.water) * waterPrice);
                const plotsCount = r.locations?.length || 1;
                waterShare += (waterCost / plotsCount);
                sprayShare += (eventMatCost / plotsCount);
            }
        });

        return { water: waterShare, irrMat: irrMatShare, spray: sprayShare };
    };

    // Stats
    const stats = {
        nurseries: nurseryRecords.filter(r => (r.remainingCount || 0) > 0).length,
        greenhouses: Object.keys(plotStates).filter(k => k.startsWith('greenhouse') && ['growing', 'fully_planted'].includes(plotStates[k]?.status)).length,
        openFields: Object.keys(plotStates).filter(k => k.startsWith('field') && ['growing', 'fully_planted'].includes(plotStates[k]?.status)).length
    };

    // Render Content
    const renderContent = () => {
        if (isDataLoading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                        <p className="text-slate-600">Loading farm data...</p>
                    </div>
                </div>
            );
        }
        
        switch (currentView) {
            case 'dashboard': 
                return <Dashboard stats={stats} />;
            case 'statistical': 
                return <StatisticalDataManager plots={plots} addPlot={handleAddPlot} plantingRecords={plantingRecords} harvestRecords={harvestRecords} materials={materials} getCycleBreakdown={calculateCycleBreakdown} nurseryRecords={nurseryRecords} />;
            case 'materials': 
                return <MaterialsManager materials={materials} setMaterials={setMaterials} />;
            case 'nursery': 
                return <NurseryManager records={nurseryRecords} setRecords={setNurseryRecords} materials={materials} setMaterials={setMaterials} onCalculateCost={calculateSeedlingCost} />;
            case 'planting': 
                return <PlantingManager plots={plots} plantingData={plantingData} setPlantingData={setPlantingData} plantingRecords={plantingRecords} setPlantingRecords={setPlantingRecords} nurseryRecords={nurseryRecords} setNurseryRecords={setNurseryRecords} plotStates={plotStates} setPlotStates={updatePlotState} />;
            case 'harvesting': 
                return <HarvestingManager plots={plots} plantingData={plantingData} setPlantingData={setPlantingData} harvestRecords={harvestRecords} setHarvestRecords={setHarvestRecords} plotStates={plotStates} setPlotStates={updatePlotState} plantingRecords={plantingRecords} materials={materials} setMaterials={setMaterials} onCalculateCycleCost={calculateCycleOperationalCost} />;
            case 'spraying': 
                return <SprayingManager plots={plots} materials={materials} setMaterials={setMaterials} sprayingRecords={sprayingRecords} setSprayingRecords={setSprayingRecords} />;
            case 'irrigation': 
                return <IrrigationManager plots={plots} materials={materials} setMaterials={setMaterials} irrigationUnits={irrigationUnits} setIrrigationUnits={setIrrigationUnits} irrigationRecords={irrigationRecords} setIrrigationRecords={setIrrigationRecords} />;
            default: 
                return <div className="p-10 text-center text-slate-400">Under Construction</div>;
        }
    };

    // Nav Item Component
    const NavItem = ({ id, icon: Icon, label }) => (
        <button 
            onClick={() => setCurrentView(id)} 
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === id 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
        >
            <Icon className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">{label}</span>}
        </button>
    );

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // Show login screen if not authenticated
    if (!user) {
        return <LoginScreen />;
    }

    // Main App UI
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 transition-all duration-300 flex flex-col shadow-xl z-20`}>
                <div className="p-4 flex items-center justify-between border-b border-slate-800">
                    {isSidebarOpen ? (
                        <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xl">
                            <Sprout className="w-8 h-8" />
                            <span>GreenLeaf</span>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            <Sprout className="w-8 h-8 text-emerald-400" />
                        </div>
                    )}
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-white">
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
                
                <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                    <NavItem id="dashboard" icon={LayoutGrid} label="Dashboard" />
                    <NavItem id="statistical" icon={PieChart} label="Statistical Data" />
                    <NavItem id="materials" icon={Package} label="Materials" />
                    <NavItem id="nursery" icon={Flower2} label="Nursery" />
                    <NavItem id="planting" icon={Sprout} label="Planting" />
                    <NavItem id="harvesting" icon={Tractor} label="Harvesting" />
                    <NavItem id="spraying" icon={Droplets} label="Spraying" />
                    <NavItem id="irrigation" icon={Settings} label="Irrigation" />
                </nav>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-slate-800">
                    {isSidebarOpen && (
                        <div className="mb-3 px-2">
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                    )}
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" x2="9" y1="12" y2="12"/>
                        </svg>
                        {isSidebarOpen && <span className="text-sm">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
                    <h1 className="text-xl font-bold text-slate-800 capitalize">{currentView}</h1>
                </header>
                <div className="flex-1 overflow-auto p-8 relative">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
