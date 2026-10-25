import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';

export default function Participants() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [selectedForPrint, setSelectedForPrint] = useState(new Set());
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

  const generatePDF = () => {
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

    doc.save('medaithon-2026-barcodes.pdf');
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

  const handleDeleteParticipant = async (id) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Participants</h2>
          <p className="text-gray-600 dark:text-gray-400">{participants.length} total participants</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            ➕ Add Participant
          </button>
          <button
            onClick={generatePDF}
            disabled={selectedForPrint.size === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            🖨️ Print Selected ({selectedForPrint.size})
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="w-12 text-center py-3 px-4"></th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Team</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">College</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Barcode</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Leader</th>
                  <th className="w-12 text-center py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="text-center py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedForPrint.has(p._id)}
                        onChange={() => toggleSelect(p._id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{p.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{p.teamName}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{p.college}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{p.role}</td>
                    <td className="py-3 px-4 text-sm font-mono text-gray-600 dark:text-gray-400">{p.barcode}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.isInside
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {p.isInside ? 'Inside' : 'Outside'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.isLeader && <span className="text-yellow-600 dark:text-yellow-400">⭐</span>}
                    </td>
                    <td className="text-center py-3 px-4">
                      <button
                        onClick={() => handleDeleteParticipant(p._id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                        title="Delete participant"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No participants match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
    </div>
  );
}