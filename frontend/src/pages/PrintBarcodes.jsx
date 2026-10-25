import { useEffect, useState, useRef } from 'react';
import { api } from '../utils/api';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';

export default function PrintBarcodes() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [selectedForPrint, setSelectedForPrint] = useState(new Set());
  const [previewMode, setPreviewMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    college: '',
    teamName: '',
    skills: '',
    linkedin: '',
    isLeader: false
  });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const pdfRef = useRef(null);

  useEffect(() => {
    api.getParticipants()
      .then(data => {
        setParticipants(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const colleges = [...new Set(participants.map(p => p.college).filter(Boolean))].sort();
  const teams = [...new Set(participants.map(p => p.teamName).filter(Boolean))].sort();

  const filtered = participants.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search.toUpperCase()) ||
      p.teamName.toLowerCase().includes(search.toLowerCase());
    const matchesCollege = !collegeFilter || p.college === collegeFilter;
    const matchesTeam = !teamFilter || p.teamName === teamFilter;
    return matchesSearch && matchesCollege && matchesTeam;
  });

  const toggleSelect = (id) => {
    setSelectedForPrint(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedForPrint.size === filtered.length) {
      setSelectedForPrint(new Set());
    } else {
      setSelectedForPrint(new Set(filtered.map(p => p._id)));
    }
  };

  const generatePDF = (download = true) => {
    const toPrint = participants.filter(p => selectedForPrint.has(p._id));
    if (toPrint.length === 0) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const barcodeWidth = 25;
    const barcodeHeight = 50;
    const margin = 10;
    const gap = 5;
    const cols = Math.floor((210 - 2 * margin + gap) / (barcodeWidth + gap));
    let x = margin;
    let y = margin;
    let col = 0;

    toPrint.forEach((p, i) => {
      if (i > 0) {
        col++;
        if (col >= cols) {
          col = 0;
          x = margin;
          y += barcodeHeight + gap;
        } else {
          x += barcodeWidth + gap;
        }
      }

      if (y + barcodeHeight > 280) {
        doc.addPage();
        x = margin;
        y = margin;
        col = 0;
      }

      const canvas = document.createElement('canvas');
      JsBarcode(canvas, p.barcode, { format: 'CODE128', width: 2, height: 50, displayValue: true, fontSize: 12 });
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', x, y, barcodeWidth, barcodeHeight);

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(p.barcode, x + barcodeWidth / 2, y + barcodeHeight + 3, { align: 'center' });
    });

    if (download) {
      doc.save('medaithon-2026-barcodes.pdf');
    } else {
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      pdfRef.current = url;
      setPreviewMode(true);
    }
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    if (!newParticipant.name || !newParticipant.email) {
      setAddError('Name and email are required');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const participant = await api.addParticipant(newParticipant);
      setParticipants(prev => [participant, ...prev]);
      setShowAddModal(false);
      setNewParticipant({
        name: '',
        email: '',
        phone: '',
        role: '',
        college: '',
        teamName: '',
        skills: '',
        linkedin: '',
        isLeader: false
      });
    } catch (err) {
      setAddError(err.message || 'Failed to add participant');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteParticipant = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this participant?')) return;
    try {
      await api.deleteParticipant(id);
      setParticipants(prev => prev.filter(p => p._id !== id));
      setSelectedForPrint(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      alert(err.message || 'Failed to delete participant');
    }
  };

  const renderBadge = (p) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, p.barcode, { format: 'CODE128', width: 2, height: 50, displayValue: true, fontSize: 12 });
    return canvas.toDataURL('image/png');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Print Barcodes</h2>
          <p className="text-gray-600 dark:text-gray-400">Generate printable badges for participants</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            ➕ Add Participant
          </button>
          <button
            onClick={() => generatePDF(false)}
            disabled={selectedForPrint.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            👁️ Preview PDF
          </button>
          <button
            onClick={() => generatePDF(true)}
            disabled={selectedForPrint.size === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            🖨️ Download PDF ({selectedForPrint.size})
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, barcode, team..."
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={collegeFilter}
            onChange={e => setCollegeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Colleges</option>
            {colleges.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedForPrint.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Select All ({filtered.length})</span>
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(p => {
                const barcodeImg = renderBadge(p);
                const isSelected = selectedForPrint.has(p._id);
                return (
                  <div
                    key={p._id}
                    onClick={() => toggleSelect(p._id)}
                    className={`relative cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                        : ''
                    }`}
                  >
                    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 aspect-[3/2] flex flex-col items-center justify-between relative">
                      <div className="text-center w-full">
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">MEDAITHON 2026</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{p.teamName}</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate w-full px-1">{p.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate w-full px-1">{p.college}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate w-full px-1">{p.role}</div>
                      </div>
                      <img
                        src={barcodeImg}
                        alt={p.barcode}
                        className="mt-2 max-w-full h-16 object-contain"
                      />
                      <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">{p.barcode}</div>
                      <button
                        onClick={(e) => handleDeleteParticipant(p._id, e)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center text-xs"
                        title="Delete participant"
                      >
                        ✕
                      </button>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">
                  No participants match your filters
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Add New Participant</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddParticipant} className="p-4 space-y-4">
              {addError && (
                <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">{addError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={newParticipant.name}
                  onChange={e => setNewParticipant({...newParticipant, name: e.target.value})}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={newParticipant.email}
                  onChange={e => setNewParticipant({...newParticipant, email: e.target.value})}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="text"
                  value={newParticipant.phone}
                  onChange={e => setNewParticipant({...newParticipant, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <input
                  type="text"
                  value={newParticipant.role}
                  onChange={e => setNewParticipant({...newParticipant, role: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">College</label>
                <input
                  type="text"
                  value={newParticipant.college}
                  onChange={e => setNewParticipant({...newParticipant, college: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Name</label>
                <input
                  type="text"
                  value={newParticipant.teamName}
                  onChange={e => setNewParticipant({...newParticipant, teamName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skills</label>
                <input
                  type="text"
                  value={newParticipant.skills}
                  onChange={e => setNewParticipant({...newParticipant, skills: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn</label>
                <input
                  type="text"
                  value={newParticipant.linkedin}
                  onChange={e => setNewParticipant({...newParticipant, linkedin: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isLeader"
                  checked={newParticipant.isLeader}
                  onChange={e => setNewParticipant({...newParticipant, isLeader: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isLeader" className="text-sm text-gray-700 dark:text-gray-300">Team Leader</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Participant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setPreviewMode(false); URL.revokeObjectURL(pdfRef.current); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">PDF Preview - {selectedForPrint.size} Badges</h3>
              <div className="flex gap-2">
                <button onClick={() => generatePDF(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Download</button>
                <button onClick={() => { setPreviewMode(false); URL.revokeObjectURL(pdfRef.current); }} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600">Close</button>
              </div>
            </div>
            <iframe
              src={pdfRef.current}
              className="flex-1 w-full border-0"
              title="Barcode PDF Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}