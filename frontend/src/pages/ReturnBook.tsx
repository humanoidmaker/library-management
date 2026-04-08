import { useState } from 'react';
import { BookCheck, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ReturnBook() {
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [issuedBooks, setIssuedBooks] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [returning, setReturning] = useState<string | null>(null);
  const [finePreview, setFinePreview] = useState<any>(null);
  const [success, setSuccess] = useState<any>(null);

  const searchMembers = async () => {
    if (!search.trim()) return;
    setSearchLoading(true);
    setSelectedMember(null);
    setIssuedBooks([]);
    try {
      const { data } = await api.get('/members', { params: { q: search } });
      setMembers(data.members || []);
    } catch { toast.error('Search failed'); }
    finally { setSearchLoading(false); }
  };

  const selectMember = async (member: any) => {
    setSelectedMember(member);
    try {
      const { data } = await api.get(`/members/${member.id}`);
      setIssuedBooks(data.member.issued_books || []);
    } catch { toast.error('Failed to load issued books'); }
  };

  const calculateFine = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    if (now <= due) return { overdue: false, days: 0, fine: 0 };
    const days = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return { overdue: true, days, fine: days * 5 };
  };

  const handleReturn = async (issueId: string) => {
    const book = issuedBooks.find(b => b.id === issueId);
    if (!book) return;
    const fineInfo = calculateFine(book.due_date);
    if (fineInfo.overdue && !finePreview) {
      setFinePreview({ issueId, ...fineInfo, bookTitle: book.book_title });
      return;
    }
    setReturning(issueId);
    setFinePreview(null);
    try {
      const { data } = await api.post(`/circulation/return/${issueId}`);
      setSuccess({ ...data, bookTitle: book.book_title });
      setIssuedBooks(prev => prev.filter(b => b.id !== issueId));
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Return failed');
    } finally { setReturning(null); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <BookCheck className="h-6 w-6 text-accent" /> Return Book
      </h2>

      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-green-800">{success.message}</p>
            {success.fine > 0 && (
              <p className="text-sm text-green-700 mt-1">
                Fine: {formatCurrency(success.fine)} ({success.overdue_days} days overdue)
              </p>
            )}
          </div>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-600 text-sm">Dismiss</button>
        </div>
      )}

      {/* Search member */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Search Member</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchMembers()}
              placeholder="Search by name, phone or membership#..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
          </div>
          <button onClick={searchMembers} disabled={searchLoading}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {members.length > 0 && !selectedMember && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {members.map(m => (
              <div key={m.id} onClick={() => selectMember(m)}
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{m.name}</p>
                  <p className="text-sm text-gray-500">{m.membership_number} | {m.phone}</p>
                </div>
                <span className="text-xs text-gray-500">{m.books_currently_issued} books issued</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issued books for selected member */}
      {selectedMember && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 font-medium">Selected Member</p>
              <p className="font-bold text-gray-900">{selectedMember.name}</p>
              <p className="text-sm text-gray-500">{selectedMember.membership_number} | {selectedMember.phone}</p>
            </div>
            <button onClick={() => { setSelectedMember(null); setIssuedBooks([]); }} className="text-sm text-amber-700 hover:underline">Change</button>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Issued Books ({issuedBooks.length})</h3>
            {issuedBooks.length === 0 ? (
              <p className="text-sm text-gray-400">No books currently issued to this member.</p>
            ) : (
              <div className="space-y-3">
                {issuedBooks.map(book => {
                  const fineInfo = calculateFine(book.due_date);
                  return (
                    <div key={book.id} className={cn('rounded-lg border p-4', fineInfo.overdue ? 'border-red-200 bg-red-50' : 'bg-gray-50')}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{book.book_title}</p>
                          <p className="text-sm text-gray-500">ISBN: {book.book_isbn}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>Issued: {formatDate(book.issued_date)}</span>
                            <span className={cn(fineInfo.overdue && 'text-red-600 font-medium')}>
                              Due: {formatDate(book.due_date)}
                            </span>
                          </div>
                          {fineInfo.overdue && (
                            <div className="flex items-center gap-2 mt-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <span className="text-sm text-red-600 font-medium">
                                {fineInfo.days} days overdue | Estimated fine: {formatCurrency(fineInfo.fine)}
                              </span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleReturn(book.id)} disabled={returning === book.id}
                          className={cn('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
                            fineInfo.overdue
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-primary text-white hover:opacity-90',
                            'disabled:opacity-50'
                          )}>
                          {returning === book.id ? 'Returning...' : 'Return'}
                        </button>
                      </div>

                      {/* Fine preview confirmation */}
                      {finePreview && finePreview.issueId === book.id && (
                        <div className="mt-3 bg-white border border-red-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-red-800 mb-2">Fine Calculation</p>
                          <p className="text-sm text-gray-600">
                            {finePreview.days} days x Rs.5 = <span className="font-bold text-red-600">{formatCurrency(finePreview.fine)}</span>
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => setFinePreview(null)}
                              className="flex-1 px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleReturn(book.id)}
                              className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                              Confirm Return with Fine
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
