import { readFileSync } from 'fs';
import { join } from 'path';

// Serves the finfo.com.au website HTML at the root URL
export async function GET() {
  const html = readFileSync(join(process.cwd(), 'public/website.html'), 'utf-8');
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
