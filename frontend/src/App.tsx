import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Books from '@/pages/Books';
import Members from '@/pages/Members';
import IssueBook from '@/pages/IssueBook';
import ReturnBook from '@/pages/ReturnBook';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';

export default function App() {
  const { isAuthenticated, fetchUser } = useAuthStore();
  useEffect(() => { if (isAuthenticated) fetchUser(); }, []);

  if (!isAuthenticated) return <Routes><Route path="*" element={<Login />} /></Routes>;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
          <Route path="books" element={<Books />} />
          <Route path="members" element={<Members />} />
          <Route path="issue" element={<IssueBook />} />
          <Route path="return" element={<ReturnBook />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}