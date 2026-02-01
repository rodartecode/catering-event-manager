import { renderTrpcPanel } from 'trpc-panel';
import { appRouter } from '@/server/routers/_app';

export async function GET() {
  return new Response(
    renderTrpcPanel(appRouter, {
      url: '/api/trpc',
      transformer: 'superjson',
    }),
    { headers: { 'Content-Type': 'text/html' } }
  );
}
