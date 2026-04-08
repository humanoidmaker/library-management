import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BookOpen, Users, BookCheck, AlertTriangle, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';

interface Stats {
  total_books: number;
  total_members: number;
  issued_today: number;
  overdue_count: number;
  books_issued: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentIssued, setRecentIssued] = useState<any[]>([]);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [circStats, setCircStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/stats'),
      api.get('/circulation/overdue'),
      api.get('/circulation/stats'),
    ]).then(([statsRes, overdueRes, circRes]) => {
      setStats(statsRes.data.stats);
      setRecentIssued(statsRes.data.recent_issued || []);
      setOverdue(overdueRes.data.overdue || []);
      setCircStats(circRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
    </div>
  );

  const statCards = [
    { label: 'Total Books', value: stats?.total_books ?? 0, icon: BookOpen, color: 'bg-amber-50 text-amber-700' },
    { label: 'Total Members', value: stats?.total_members ?? 0, icon: Users, color: 'bg-blue-50 text-blue-700' },
    { label: 'Issued Today', value: stats?.issued_today ?? 0, icon: BookCheck, color: 'bg-green-50 text-green-700' },
    { label: 'Overdue', value: stats?.overdue_count ?? 0, icon: AlertTriangle, color: stats?.overdue_count ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700' },
  ];

  const popularBooks = circStats?.popular_books?.map((b: any) => ({
    name: b.title?.length > 20 ? b.title.substring(0, 20) + '...' : b.title,
    issues: b.count,
  })) || [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-5 flex items-start gap-4">
            <div className={`p-2.5 rounded-lg ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Overdue Alerts */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5" /> Overdue Books ({overdue.length})
          </h3>
          <div className="space-y-2">
            {overdue.slice(0, 5).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-red-100">
                <div>
                  <span className="font-medium text-gray-900">{item.book_title}</span>
                  <span className="text-sm text-gray-500 ml-2">- {item.member_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    {item.overdue_days} days overdue
                  </span>
                  <span className="text-xs font-medium text-red-600">
                    Fine: Rs.{item.estimated_fine}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Issued */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" /> Recently Issued
          </h3>
          {recentIssued.length === 0 ? (
            <p className="text-sm text-gray-400">No recently issued books.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Book</th>
                    <th className="pb-2 font-medium">Member</th>
                    <th className="pb-2 font-medium">Due Date</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIssued.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 font-medium text-gray-900">{item.book_title}</td>
                      <td className="py-2 text-gray-600">{item.member_name}</td>
                      <td className="py-2 text-gray-600">{formatDate(item.due_date)}</td>
                      <td className="py-2">
                        {item.is_overdue ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Overdue</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Popular Books Chart */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" /> Popular Books
          </h3>
          {popularBooks.length === 0 ? (
            <p className="text-sm text-gray-400">No circulation data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={popularBooks} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="issues" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
