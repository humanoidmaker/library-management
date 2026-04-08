import { useState } from 'react';
import { BookPlus, Search, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function IssueBook() {
  const [step, setStep] = useState(1);
  // Book search
  const [bookSearch, setBookSearch] = useState('');
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [bookLoading, setBookLoading] = useState(false);
  // Member search
  const [memberSearch, setMemberSearch] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  // Issue
  const [issuing, setIssuing] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const searchBooks = async () => {
    if (!bookSearch.trim()) return;
    setBookLoading(true);
    try {
      const { data } = await api.get('/books', { params: { q: bookSearch } });
      setBooks(data.books || []);
    } catch { toast.error('Search failed'); }
    finally { setBookLoading(false); }
  };

  const searchMembers = async () => {
    if (!memberSearch.trim()) return;
    setMemberLoading(true);
    try {
      const { data } = await api.get('/members', { params: { q: memberSearch } });
      setMembers(data.members || []);
    } catch { toast.error('Search failed'); }
    finally { setMemberLoading(false); }
  };

  const issueBook = async () => {
    if (!selectedBook || !selectedMember) return;
    setIssuing(true);
    try {
      const { data } = await api.post('/circulation/issue', {
        book_id: selectedBook.id,
        member_id: selectedMember.id,
      });
      setSuccess(data);
      toast.success('Book issued successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Issue failed');
    } finally { setIssuing(false); }
  };

  const reset = () => {
    setStep(1); setSelectedBook(null); setSelectedMember(null);
    setBooks([]); setMembers([]); setBookSearch(''); setMemberSearch('');
    setSuccess(null);
  };

  // Success screen
  if (success) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookPlus className="h-6 w-6 text-accent" /> Issue Book
        </h2>
        <div className="bg-white rounded-xl border p-8 text-center max-w-md mx-auto">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Book Issued Successfully!</h3>
          <p className="text-gray-600 mb-4">{success.message}</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-left mb-6">
            <p><span className="font-medium">Book:</span> {selectedBook?.title}</p>
            <p><span className="font-medium">Issued to:</span> {selectedMember?.name} ({selectedMember?.membership_number})</p>
            <p><span className="font-medium">Due Date:</span> {success.due_date ? formatDate(success.due_date) : 'N/A'}</p>
          </div>
          <button onClick={reset} className="px-6 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90">
            Issue Another Book
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <BookPlus className="h-6 w-6 text-accent" /> Issue Book
      </h2>

      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-4">
        <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
          step >= 1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500')}>
          <span className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
          Select Book
        </div>
        <div className="h-px flex-1 bg-gray-200" />
        <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
          step >= 2 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500')}>
          <span className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
          Select Member
        </div>
      </div>

      {/* Step 1: Select Book */}
      {step === 1 && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Search Book by Title or ISBN</h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" value={bookSearch} onChange={e => setBookSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchBooks()}
                placeholder="Enter title, author or ISBN..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
            </div>
            <button onClick={searchBooks} disabled={bookLoading}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {bookLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {books.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {books.map(b => (
                <div key={b.id} onClick={() => { setSelectedBook(b); setStep(2); }}
                  className={cn('flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                    b.copies_available <= 0 ? 'opacity-50 cursor-not-allowed bg-gray-50' :
                    selectedBook?.id === b.id ? 'border-accent bg-amber-50' : 'hover:bg-gray-50'
                  )}>
                  <div>
                    <p className="font-medium text-gray-900">{b.title}</p>
                    <p className="text-sm text-gray-500">{b.author} | ISBN: {b.isbn}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                    b.copies_available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {b.copies_available > 0 ? `${b.copies_available} available` : 'All issued'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Member + Confirm */}
      {step === 2 && selectedBook && (
        <div className="space-y-4">
          {/* Selected book summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 font-medium">Selected Book</p>
              <p className="font-bold text-gray-900">{selectedBook.title}</p>
              <p className="text-sm text-gray-500">{selectedBook.author} | {selectedBook.isbn}</p>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-amber-700 hover:underline">Change</button>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Search Member by Name, Phone or Membership#</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchMembers()}
                  placeholder="Enter name, phone or LIB-XXXX..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
              </div>
              <button onClick={searchMembers} disabled={memberLoading}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {memberLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {members.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.map(m => {
                  const atLimit = m.books_currently_issued >= m.max_books;
                  return (
                    <div key={m.id} onClick={() => !atLimit && setSelectedMember(m)}
                      className={cn('flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                        atLimit ? 'opacity-50 cursor-not-allowed bg-gray-50' :
                        selectedMember?.id === m.id ? 'border-accent bg-amber-50' : 'hover:bg-gray-50'
                      )}>
                      <div>
                        <p className="font-medium text-gray-900">{m.name}</p>
                        <p className="text-sm text-gray-500">{m.membership_number} | {m.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className={cn('text-xs font-medium', atLimit ? 'text-red-600' : 'text-gray-500')}>
                          {m.books_currently_issued}/{m.max_books} books
                        </span>
                        {atLimit && <p className="text-xs text-red-500">At limit</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Confirm section */}
          {selectedMember && (
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Confirm Issue</h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Book</p>
                  <p className="font-medium">{selectedBook.title}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Member</p>
                  <p className="font-medium">{selectedMember.name} ({selectedMember.membership_number})</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
                Due date will be 14 days from now
              </div>
              <button onClick={issueBook} disabled={issuing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:opacity-90 disabled:opacity-50">
                {issuing ? 'Issuing...' : 'Confirm Issue'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
