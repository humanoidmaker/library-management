import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Loader2, BookOpen, Clock, Bell, IndianRupee } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const TABS = ['Library Info', 'Circulation Rules', 'Fines', 'Notifications'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('Library Info');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get('/settings').then(r => r.data.settings || {}).catch(() => ({})),
      api.get('/stats').then(r => r.data.stats || r.data).catch(() => null),
    ]).then(([s, st]) => {
      setSettings(typeof s === 'object' && !Array.isArray(s) ? s : {
        library_name: '', library_phone: '', library_email: '', library_address: '',
        max_books_per_member: '5', loan_period_days: '14', max_renewals: '2',
        fine_per_day: '5', max_fine_per_book: '500', grace_period_days: '0',
        sms_enabled: 'false', email_reminders: 'false', overdue_reminder_days: '1,3,7',
      });
      setStats(st);
    }).finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-accent" /> Settings
        </h2>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(stats).slice(0, 4).map(([key, val]) => (
            <div key={key} className="bg-white rounded-xl border p-3">
              <p className="text-xl font-bold text-gray-900">{String(val)}</p>
              <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{tab}</button>
        ))}
      </div>

      {/* Library Info */}
      {activeTab === 'Library Info' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Library Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Library Name</label>
              <input value={settings.library_name || ''} onChange={e => update('library_name', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={settings.library_phone || ''} onChange={e => update('library_phone', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={settings.library_email || ''} onChange={e => update('library_email', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea value={settings.library_address || ''} onChange={e => update('library_address', e.target.value)} rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
        </div>
      )}

      {/* Circulation Rules */}
      {activeTab === 'Circulation Rules' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Circulation Rules</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Books Per Member</label>
              <input type="number" min="1" value={settings.max_books_per_member || '5'}
                onChange={e => update('max_books_per_member', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan Period (days)</label>
              <input type="number" min="1" value={settings.loan_period_days || '14'}
                onChange={e => update('loan_period_days', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Renewals</label>
              <input type="number" min="0" value={settings.max_renewals || '2'}
                onChange={e => update('max_renewals', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
            Members can borrow up to <strong>{settings.max_books_per_member || 5}</strong> books for <strong>{settings.loan_period_days || 14}</strong> days each, with up to <strong>{settings.max_renewals || 2}</strong> renewals.
          </div>
        </div>
      )}

      {/* Fines */}
      {activeTab === 'Fines' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Fine Configuration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fine Per Day (Rs.)</label>
              <input type="number" min="0" value={settings.fine_per_day || '5'}
                onChange={e => update('fine_per_day', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Fine Per Book (Rs.)</label>
              <input type="number" min="0" value={settings.max_fine_per_book || '500'}
                onChange={e => update('max_fine_per_book', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (days)</label>
              <input type="number" min="0" value={settings.grace_period_days || '0'}
                onChange={e => update('grace_period_days', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            Fine calculation: After {settings.grace_period_days || 0} day grace period, Rs.{settings.fine_per_day || 5}/day up to a maximum of Rs.{settings.max_fine_per_book || 500} per book.
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'Notifications' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Notification Settings</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">SMS Notifications</p>
                <p className="text-xs text-gray-500">Send overdue SMS reminders to members</p>
              </div>
              <button onClick={() => update('sms_enabled', settings.sms_enabled === 'true' ? 'false' : 'true')}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.sms_enabled === 'true' ? 'bg-accent' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.sms_enabled === 'true' ? 'translate-x-5' : ''}`} />
              </button>
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Email Reminders</p>
                <p className="text-xs text-gray-500">Email members about due dates and overdue books</p>
              </div>
              <button onClick={() => update('email_reminders', settings.email_reminders === 'true' ? 'false' : 'true')}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.email_reminders === 'true' ? 'bg-accent' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.email_reminders === 'true' ? 'translate-x-5' : ''}`} />
              </button>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overdue Reminder Schedule (days after due)</label>
              <input value={settings.overdue_reminder_days || '1,3,7'} onChange={e => update('overdue_reminder_days', e.target.value)}
                placeholder="1,3,7" className="w-full max-w-xs px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              <p className="text-xs text-gray-400 mt-1">Comma-separated days after due date when reminders are sent</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
