import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, inside: 0, outside: 0, mealStats: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOverview()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Participants', value: stats.total, color: 'bg-blue-500', icon: '👥' },
    { label: 'Currently Inside', value: stats.inside, color: 'bg-green-500', icon: '🏢' },
    { label: 'Outside', value: stats.outside, color: 'bg-orange-500', icon: '🚶' },
    { label: 'Total Meals Served', value: stats.mealStats?.reduce((sum, m) => sum + (m.totalServed || 0), 0) || 0, color: 'bg-purple-500', icon: '🍽️' },
  ];

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getMealTypeColor = (type) => {
    switch (type) {
      case 'Breakfast': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Lunch': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Dinner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">MEDAITHON 2026 Barcode System - Entry/Exit & Food Tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {loading ? '—' : card.value}
                </p>
              </div>
              <div className={`w-14 h-14 ${card.color} rounded-xl flex items-center justify-center text-2xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {(stats.mealStats && stats.mealStats.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🍽️ Food Serving Status</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Meals served count vs total students</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Meal</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Total Served</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">MEDAITHON Served</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">MEDAITHON Students</th>
                </tr>
              </thead>
              <tbody>
                {stats.mealStats.map(meal => (
                  <tr key={meal.mealId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{formatDate(meal.date)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMealTypeColor(meal.mealType)}`}>
                        {meal.mealType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{meal.startTime} - {meal.endTime}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{meal.totalServed}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{meal.totalStudents}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{meal.medaithonServed}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{meal.medaithonStudents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { path: '/scanner', title: 'Scan Barcode', desc: 'Scan entry/exit barcodes', icon: '📷' },
          { path: '/manual', title: 'Manual Entry', desc: 'Enter by email manually', icon: '⌨️' },
          { path: '/participants', title: 'View Participants', desc: 'Manage all participants', icon: '👥' },
          { path: '/print', title: 'Print Barcodes', desc: 'Generate printable badges', icon: '🖨️' },
          { path: '/meals', title: 'Meal Schedule', desc: 'Manage meal times', icon: '🍽️' },
        ].map(item => (
          <Link key={item.path} to={item.path} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}