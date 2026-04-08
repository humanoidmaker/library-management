import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, X, Edit2, Trash2, Eye, ChevronLeft } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const TYPES = ['All', 'student', 'teacher', 'public'];
const TYPE_LABELS: Record<string, string> = { student: 'Student', teacher: 'Teacher', public: 'Public' };
const TYPE_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700',
  teacher: 'bg-purple-100 text-purple-700',
  public: 'bg-green-100 text-green-700',
};

interface Member {
  id: string; name: string; phone: string; email: string;
  membership_type: string; membership_number: string; membership_expiry: string;
  max_books: number; address: string; total_books_issued: number; is_active: boolean;
  books_currently_issued: number; issued_books?: any[]; fine_history?: any[]; total_fines?: number;
}

const emptyMember = (): Partial<Member> => ({
  name: '', phone: '', email: '', membership_type: 'student', address: '',
});

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<Member>>(emptyMember());
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Member | null>(null);

  const fetchMembers = useCallback(() => {
    setLoading(true);
    const params: any = {};
    if (search) params.q = search;
    if (typeFilter !== 'All') params.type = typeFilter;
    api.get('/members', { params }).then(r => setMembers(r.data.members || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [search, typeFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const openAdd = () => { setEditing(emptyMember()); setIsEdit(false); setShowModal(true); };
  const openEdit = (m: Member) => { setEditing({ ...m }); setIsEdit(true); setShowModal(true); };

  const saveMember = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/members/${editing.id}`, editing);
        toast.success('Member updated');
      } else {
        const { data } = await api.post('/members', editing);
        toast.success(`Member registered! Membership#: ${data.membership_number}`);
      }
      setShowModal(false);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  const deleteMember = async (id: string) => {
    if (!confirm('Delete this member?')) return;
    try { await api.delete(`/members/${id}`); toast.success('Deleted'); fetchMembers(); }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Cannot delete'); }
  };

  const openDetail = async (id: string) => {
    try {
      const { data } = await api.get(`/members/${id}`);
      setDetail(data.member);
    } catch { toast.error('Failed to load'); }
  };

  if (detail) {
    return (
      <div className="space-y-6">
        <button onClick={() => setDetail(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ChevronLeft className="h-4 w-4" /> Back to Members
        </button>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{detail.name}</h2>
              <p className="text-gray-500 mt-1">{detail.membership_number}</p>
            </div>
            <span className={cn('px-3 py-1 rounded-full text-sm font-medium', TYPE_COLORS[detail.membership_type] || 'bg-gray-100 text-gray-600')}>
              {TYPE_LABELS[detail.membership_type] || detail.membership_type}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{detail.phone}</span></div>
            <div><span className="text-gray-500">Email:</span> <span className="font-medium">{detail.email || '-'}</span></div>
            <div><span className="text-gray-500">Max Books:</span> <span className="font-medium">{detail.max_books}</span></div>
            <div><span className="text-gray-500">Total Issued:</span> <span className="font-medium">{detail.total_books_issued}</span></div>
          </div>

          <h3 className="font-semibold text-gray-900 mb-3">Currently Issued Books ({detail.issued_books?.length || 0})</h3>
          {(detail.issued_books?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 mb-6">No books currently issued.</p>
          ) : (
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Book</th>
                  <th className="pb-2 font-medium">ISBN</th>
                  <th className="pb-2 font-medium">Issued</th>
                  <th className="pb-2 font-medium">Due</th>
                </tr></thead>
                <tbody>
                  {detail.issued_books!.map((iss: any) => {
                    const overdue = new Date(iss.due_date) < new Date();
                    return (
                      <tr key={iss.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{iss.book_title}</td>
                        <td className="py-2 font-mono text-xs text-gray-500">{iss.book_isbn}</td>
                        <td className="py-2">{formatDate(iss.issued_date)}</td>
                        <td className={cn('py-2', overdue && 'text-red-600 font-medium')}>{formatDate(iss.due_date)} {overdue && '(Overdue)'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="font-semibold text-gray-900 mb-3">Fine History (Total: {formatCurrency(detail.total_fines || 0)})</h3>
          {(detail.fine_history?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">No fines.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Book</th>
                  <th className="pb-2 font-medium">Returned</th>
                  <th className="pb-2 font-medium">Fine</th>
                </tr></thead>
                <tbody>
                  {detail.fine_history!.map((f: any) => (
                    <tr key={f.id} className="border-b last:border-0">
                      <td className="py-2">{f.book_title}</td>
                      <td className="py-2">{f.return_date ? formatDate(f.return_date) : '-'}</td>
                      <td className="py-2 font-medium text-red-600">{formatCurrency(f.fine_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-accent" /> Members
        </h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Member
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, membership#..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
        </div>
        <div className="flex gap-1">
          {TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={cn(
              'px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors capitalize',
              typeFilter === t ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            )}>{t === 'All' ? 'All' : TYPE_LABELS[t]}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">No members found.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Membership#</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Books Issued</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr></thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{m.membership_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                    <td className="px-4 py-3 text-gray-600">{m.phone}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', TYPE_COLORS[m.membership_type] || 'bg-gray-100')}>
                        {TYPE_LABELS[m.membership_type] || m.membership_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{m.books_currently_issued}</span>
                      <span className="text-gray-400">/{m.max_books}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openDetail(m.id)} className="p-1.5 hover:bg-gray-100 rounded"><Eye className="h-3.5 w-3.5 text-gray-500" /></button>
                        <button onClick={() => openEdit(m)} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 className="h-3.5 w-3.5 text-gray-500" /></button>
                        <button onClick={() => deleteMember(m.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Member' : 'Add Member'}</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input value={editing.phone || ''} onChange={e => setEditing(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={editing.email || ''} onChange={e => setEditing(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Membership Type</label>
                <select value={editing.membership_type || 'student'} onChange={e => setEditing(p => ({ ...p, membership_type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none">
                  <option value="student">Student (max 3 books)</option>
                  <option value="teacher">Teacher (max 5 books)</option>
                  <option value="public">Public (max 2 books)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea rows={2} value={editing.address || ''} onChange={e => setEditing(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
              </div>
              {!isEdit && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Membership number will be auto-generated (LIB-XXXX)
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={saveMember} disabled={saving || !editing.name || !editing.phone}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Saving...' : isEdit ? 'Update' : 'Register'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
