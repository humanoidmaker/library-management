import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { BarChart3, Download, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

const COLORS = ['#92400e', '#d97706', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/circulation/stats'),
      api.get('/circulation/overdue'),
    ]).then(([statsRes, overdueRes]) => {
      setData(statsRes.data);
      setOverdue(overdueRes.data.overdue || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
    </div>
  );

  const popularBooks = data?.popular_books?.map((b: any) => ({
    name: b.title?.length > 25 ? b.title.substring(0, 25) + '...' : b.title,
    issues: b.count,
  })) || [];

  const genreData = data?.genre_distribution?.filter((g: any) => g._id).map((g: any) => ({
    name: g._id || 'Unknown',
    value: g.count,
  })) || [];

  const trendData = data?.daily_trend || [];

  const stats = data?.stats || {};

  const exportCSV = () => {
    window.open('/api/circulation/export-csv', '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-accent" /> Reports
        </h2>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total_issued || 0}</p>
          <p className="text-sm text-gray-500">Currently Issued</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.issued_today || 0}</p>
          <p className="text-sm text-gray-500">Issued Today</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.returned_today || 0}</p>
          <p className="text-sm text-gray-500">Returned Today</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-red-600">{stats.overdue || 0}</p>
          <p className="text-sm text-gray-500">Overdue</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(stats.total_fines_collected || 0)}</p>
          <p className="text-sm text-gray-500">Total Fines</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Books */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Most Issued Books</h3>
          {popularBooks.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={popularBooks} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="issues" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Genre Distribution */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Genre Distribution</h3>
          {genreData.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={genreData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {genreData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Circulation Trend */}
        <div className="bg-white rounded-xl border p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Circulation Trend (Last 14 Days)</h3>
          {trendData.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="issued" stroke="#92400e" strokeWidth={2} dot={{ r: 3 }} name="Issued" />
                <Line type="monotone" dataKey="returned" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} name="Returned" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Overdue Report Table */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" /> Overdue Report ({overdue.length})
        </h3>
        {overdue.length === 0 ? (
          <p className="text-sm text-gray-400">No overdue books.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Book</th>
                <th className="pb-2 font-medium">Member</th>
                <th className="pb-2 font-medium">Due Date</th>
                <th className="pb-2 font-medium">Days Overdue</th>
                <th className="pb-2 font-medium">Estimated Fine</th>
              </tr></thead>
              <tbody>
                {overdue.map((item: any) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{item.book_title}</td>
                    <td className="py-2">{item.member_name}</td>
                    <td className="py-2 text-red-600">{formatDate(item.due_date)}</td>
                    <td className="py-2"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">{item.overdue_days} days</span></td>
                    <td className="py-2 font-medium text-red-600">{formatCurrency(item.estimated_fine)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fine Collection Summary */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Fine Collection Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-sm text-amber-700">Total Fines Collected</p>
            <p className="text-2xl font-bold text-amber-800">{formatCurrency(stats.total_fines_collected || 0)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-700">Pending (Overdue)</p>
            <p className="text-2xl font-bold text-red-800">{overdue.length} books</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-700">Estimated Pending Fines</p>
            <p className="text-2xl font-bold text-red-800">
              {formatCurrency(overdue.reduce((sum: number, item: any) => sum + (item.estimated_fine || 0), 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
