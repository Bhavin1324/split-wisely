import { useMutation } from '@tanstack/react-query';
import { AppConfig } from '../config/AppConfig';
import { useAuth } from '../context/AuthContext';

export interface PairingTicketResult {
  ticket: string;
  expires_at: string;
  expiresInSeconds: number;
}

/**
 * TanStack Query mutation hook to generate a secure single-use pairing ticket
 * for the Centfolio SMS Companion App.
 */
export function useGeneratePairingTicket() {
  const { session } = useAuth();

  return useMutation<PairingTicketResult, Error, void>({
    mutationFn: async () => {
      if (!session?.access_token) {
        throw new Error('You must be signed in to generate a companion pairing ticket.');
      }

      const endpoint = `${AppConfig.supabase.url.replace(/\/+$/, '')}/functions/v1/pair-companion?action=generate`;
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': AppConfig.supabase.anonKey,
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to generate ticket (${resp.status})`);
      }

      const data = await resp.json();
      const expMs = new Date(data.expires_at).getTime();
      const expiresInSeconds = Math.max(0, Math.floor((expMs - Date.now()) / 1000));

      return {
        ticket: data.ticket,
        expires_at: data.expires_at,
        expiresInSeconds,
      };
    },
  });
}
