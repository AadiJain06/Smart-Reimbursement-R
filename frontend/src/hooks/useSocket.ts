import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

const url = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function useExpenseSocket(onUpdate: () => void) {
  const companyId = useAuthStore((s) => s.company?.id);
  const token = useAuthStore((s) => s.token);
  const cb = useRef(onUpdate);
  cb.current = onUpdate;

  useEffect(() => {
    if (!companyId || !token) return;
    const socket: Socket = io(url, { transports: ['websocket', 'polling'] });
    socket.emit('joinCompany', companyId);
    const handler = () => cb.current();
    socket.on('expense:update', handler);
    return () => {
      socket.off('expense:update', handler);
      socket.disconnect();
    };
  }, [companyId, token]);
}
