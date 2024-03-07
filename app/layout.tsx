// import SupabaseListener from '@/components/supabaseListener';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='ja'>
      <body>
        <div>{/* <SupabaseListener /> */}</div>
        <main>{children}</main>
      </body>
    </html>
  );
}
