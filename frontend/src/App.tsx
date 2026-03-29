import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Dashboard } from '@/pages/Dashboard';
import { SubmitExpense } from '@/pages/SubmitExpense';
import { ExpenseHistory } from '@/pages/ExpenseHistory';
import { ApprovalsQueue } from '@/pages/ApprovalsQueue';
import { AdminPanel } from '@/pages/AdminPanel';
import { RoleGuard } from '@/components/RoleGuard';

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    if (token && !user) {
      fetchMe().catch(() => toast.error('Session expired'));
    }
  }, [token, user, fetchMe]);

  if (!token) return <Navigate to="/login" replace />;
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 text-sm text-zinc-500">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700" />
        Restoring session…
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="submit" element={<SubmitExpense />} />
        <Route path="history" element={<ExpenseHistory />} />
        <Route path="approvals" element={<ApprovalsQueue />} />
        <Route
          path="admin"
          element={
            <RoleGuard roles={['ADMIN']}>
              <AdminPanel />
            </RoleGuard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
