import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Search, X, Edit2, Trash2, Eye, ChevronLeft } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const GENRES = ['All', 'Fiction', 'Non-Fiction', 'Science', 'History', 'Children'];

interface Book {
  id: string; title: string; author: string; isbn: string; publisher: string;
  genre: string; year: string | number; description: string; cover_url: string;
  copies_total: number; copies_available: number; shelf_location: string; is_active: boolean;
  issue_history?: any[];
}

const emptyBook = (): Partial<Book> => ({
  title: '', author: '', isbn: '', publisher: '', genre: 'Fiction', year: '',
  description: '', cover_url: '', copies_total: 1, shelf_location: '',
});

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<Book>>(emptyBook());
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Book | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchBooks = useCallback(() => {
    setLoading(true);
    const params: any = {};
    if (search) params.q = search;
    if (genre !== 'All') params.genre = genre;
    api.get('/books', { params }).then(r => setBooks(r.data.books || [])).catch(() => toast.error('Failed to load books')).finally(() => setLoading(false));
  }, [search, genre]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const openAdd = () => { setEditing(emptyBook()); setIsEdit(false); setShowModal(true); };
  const openEdit = (b: Book) => { setEditing({ ...b }); setIsEdit(true); setShowModal(true); };

  const saveBook = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/books/${editing.id}`, editing);
        toast.success('Book updated');
      } else {
        await api.post('/books', editing);
        toast.success('Book added');
      }
      setShowModal(false);
      fetchBooks();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  const deleteBook = async (id: string) => {
    if (!confirm('Delete this book?')) return;
    try {
      await api.delete(`/books/${id}`);
      toast.success('Book deleted');
      fetchBooks();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Cannot delete');
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/books/${id}`);
      setDetail(data.book);
    } catch { toast.error('Failed to load book details'); }
    finally { setDetailLoading(false); }
  };

  // Detail view
  if (detail) {
    return (
      <div className="space-y-6">
        <button onClick={() => setDetail(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ChevronLeft className="h-4 w-4" /> Back to Books
        </button>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{detail.title}</h2>
              <p className="text-gray-500 mt-1">by {detail.author}</p>
            </div>
            <span className={cn('px-3 py-1 rounded-full text-sm font-medium',
              detail.copies_available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            )}>
              {detail.copies_available > 0 ? `${detail.copies_available} available` : 'All issued'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
            <div><span className="text-gray-500">ISBN:</span> <span className="font-medium">{detail.isbn}</span></div>
            <div><span className="text-gray-500">Genre:</span> <span className="font-medium">{detail.genre}</span></div>
            <div><span className="text-gray-500">Year:</span> <span className="font-medium">{detail.year}</span></div>
            <div><span className="text-gray-500">Publisher:</span> <span className="font-medium">{detail.publisher}</span></div>
            <div><span className="text-gray-500">Total Copies:</span> <span className="font-medium">{detail.copies_total}</span></div>
            <div><span className="text-gray-500">Shelf:</span> <span className="font-medium">{detail.shelf_location}</span></div>
          </div>
          {detail.description && <p className="text-sm text-gray-600 mb-6">{detail.description}</p>}
          <h3 className="font-semibold text-gray-900 mb-3">Issue History</h3>
          {(detail.issue_history?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">No issue history for this book.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Member</th>
                  <th className="pb-2 font-medium">Issued</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Returned</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Fine</th>
                </tr></thead>
                <tbody>
                  {detail.issue_history!.map((h: any) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="py-2">{h.member_name}</td>
                      <td className="py-2">{formatDate(h.issued_date)}</td>
                      <td className="py-2">{formatDate(h.due_date)}</td>
                      <td className="py-2">{h.return_date ? formatDate(h.return_date) : '-'}</td>
                      <td className="py-2">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                          h.status === 'issued' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        )}>{h.status}</span>
                      </td>
                      <td className="py-2">{h.fine_amount > 0 ? `Rs.${h.fine_amount}` : '-'}</td>
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
          <BookOpen className="h-6 w-6 text-accent" /> Books
        </h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Book
        </button>
      </div>

      {/* Search + Genre Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, author or ISBN..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {GENRES.map(g => (
            <button key={g} onClick={() => setGenre(g)} className={cn(
              'px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
              genre === g ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            )}>{g}</button>
          ))}
        </div>
      </div>

      {/* Books Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>
      ) : books.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">No books found.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">ISBN</th>
                <th className="px-4 py-3 font-medium">Genre</th>
                <th className="px-4 py-3 font-medium">Availability</th>
                <th className="px-4 py-3 font-medium">Shelf</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr></thead>
              <tbody>
                {books.map(b => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{b.title}</td>
                    <td className="px-4 py-3 text-gray-600">{b.author}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{b.isbn}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">{b.genre}</span></td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                        b.copies_available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {b.copies_available > 0 ? `${b.copies_available} available` : 'All issued'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{b.shelf_location}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openDetail(b.id)} className="p-1.5 hover:bg-gray-100 rounded" title="View"><Eye className="h-3.5 w-3.5 text-gray-500" /></button>
                        <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-gray-100 rounded" title="Edit"><Edit2 className="h-3.5 w-3.5 text-gray-500" /></button>
                        <button onClick={() => deleteBook(b.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Book' : 'Add Book'}</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={editing.title || ''} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
                  <input value={editing.author || ''} onChange={e => setEditing(p => ({ ...p, author: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ISBN *</label>
                  <input value={editing.isbn || ''} onChange={e => setEditing(p => ({ ...p, isbn: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                  <select value={editing.genre || 'Fiction'} onChange={e => setEditing(p => ({ ...p, genre: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none">
                    {GENRES.filter(g => g !== 'All').map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" value={editing.year || ''} onChange={e => setEditing(p => ({ ...p, year: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
                  <input value={editing.publisher || ''} onChange={e => setEditing(p => ({ ...p, publisher: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Copies</label>
                  <input type="number" min={1} value={editing.copies_total || 1} onChange={e => setEditing(p => ({ ...p, copies_total: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Location</label>
                <input value={editing.shelf_location || ''} onChange={e => setEditing(p => ({ ...p, shelf_location: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={saveBook} disabled={saving || !editing.title || !editing.author || !editing.isbn}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Book'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
