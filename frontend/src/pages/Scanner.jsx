import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export default function Scanner() {
  const [mode, setMode] = useState('entryexit');
  const [scanType, setScanType] = useState('entry');
  const [selectedMealId, setSelectedMealId] = useState('');
  const [activeMeals, setActiveMeals] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const barcodeRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    loadActiveMeals();
    barcodeRef.current?.focus();
  }, []);

  const loadActiveMeals = async () => {
    try {
      const meals = await api.getActiveMeals();
      setActiveMeals(meals);
      if (meals.length > 0 && !selectedMealId) {
        setSelectedMealId(meals[0]._id);
      }
    } catch (err) {
      console.error('Failed to load meals:', err);
    }
  };

  const handleScan = useCallback(async (barcode) => {
    setError('');
    try {
      let data;
      if (mode === 'servefood') {
        if (!selectedMealId) {
          setError('Please select a meal');
          setResult({ success: false, error: 'Please select a meal' });
          setTimeout(() => setResult(null), 3000);
          return;
        }
        data = await api.serveFood(barcode, selectedMealId, 'barcode');
        setResult({ success: true, participant: data.participant, meal: data.meal, type: 'servefood' });
      } else {
        data = await api.scan(barcode, scanType);
        setResult({ success: true, participant: data, type: scanType });
      }
      setLastScanned(barcode);
      setTimeout(() => setResult(null), 3000);
      if (barcodeRef.current) {
        barcodeRef.current.value = '';
        barcodeRef.current.focus();
      }
    } catch (err) {
      setError(err.message);
      setResult({ success: false, error: err.message });
      setTimeout(() => setResult(null), 3000);
    }
  }, [mode, selectedMealId, scanType]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    const barcode = value.trim();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (barcode) {
      debounceRef.current = setTimeout(() => {
        handleScan(barcode);
      }, 1000);
    }
  };

  const handleManualBarcode = async (e) => {
    e.preventDefault();
    const barcode = e.target.elements.barcode.value.trim();
    if (barcode) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      await handleScan(barcode);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Barcode Scanner</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {mode === 'servefood' ? 'Scan participant barcodes to serve food' : 'Scan participant barcodes for entry/exit'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[
              { value: 'entryexit', label: 'Entry/Exit' },
              { value: 'servefood', label: 'Serve Food' }
            ].map(item => (
              <button
                key={item.value}
                onClick={() => {
                  setMode(item.value);
                  setScanType('entry');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === item.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === 'servefood' && activeMeals.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 dark:text-yellow-200">
            No active meals found. <a href="/meals" className="underline hover:text-yellow-600">Create a meal schedule</a> first.
          </p>
        </div>
      )}

      {mode === 'servefood' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Meal</label>
          <select
            value={selectedMealId}
            onChange={e => setSelectedMealId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={activeMeals.length === 0}
          >
            {activeMeals.map(meal => (
              <option key={meal._id} value={meal._id}>
                {formatDate(meal.date)} - {meal.mealType} ({meal.startTime} - {meal.endTime})
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === 'entryexit' && (
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {['entry', 'exit'].map(type => (
              <button
                key={type}
                onClick={() => setScanType(type)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  scanType === type
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Barcode Entry</h3>
        <form onSubmit={handleManualBarcode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Barcode
            </label>
            <input
              ref={barcodeRef}
              name="barcode"
              type="text"
              autoComplete="off"
              placeholder={mode === 'servefood' ? 'Enter barcode to serve food' : 'Scan barcode (auto-processes)'}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={handleInputChange}
              disabled={mode === 'servefood' && activeMeals.length === 0}
            />
          </div>
        </form>

        {lastScanned && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
            <p className="text-gray-500 dark:text-gray-400">Last scanned:</p>
            <code className="text-gray-900 dark:text-white font-mono">{lastScanned}</code>
          </div>
        )}
      </div>

      {result && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg animate-slide-in ${
          result.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {result.success ? (
            mode === 'servefood' ? (
              <>
                <p className="font-medium">🍽️ Food served: {result.meal.mealType}</p>
                <p className="text-sm opacity-90">{result.participant.name} - {result.participant.teamName}</p>
              </>
            ) : (
              <>
                <p className="font-medium">{result.type === 'entry' ? '✅ Entry recorded' : '✅ Exit recorded'}</p>
                <p className="text-sm opacity-90">{result.participant.name} - {result.participant.teamName}</p>
              </>
            )
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 z-50 px-6 py-4 bg-red-600 text-white rounded-xl shadow-lg animate-slide-in">
          <p>{error}</p>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}