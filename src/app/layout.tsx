import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '민원제로 — AI 기반 시민 민원 통합 플랫폼',
  description:
    'AI가 산발적인 민원을 하나로 묶고, 위험 지역을 히트맵으로 시각화하여 민원 처리 우선순위를 자동화합니다. 방치되는 민원을 제로로 만듭니다.',
  keywords: ['민원', '시민참여', 'AI', '히트맵', '공공서비스', '민원제로', '민심지도'],
  openGraph: {
    title: '민원제로 — AI 기반 시민 민원 통합 플랫폼',
    description: 'AI가 같은 민원을 묶고, 위험 지역 경고등을 켭니다. 방치되는 민원을 제로로.',
    type: 'website',
    siteName: '민원제로',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '민원제로 — AI 기반 시민 민원 통합 플랫폼',
    description: 'AI가 같은 민원을 묶고, 위험 지역 경고등을 켭니다.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛡️</text></svg>" />
        <meta name="theme-color" content="#ef4444" />
        <script
          type="text/javascript"
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services&autoload=false`}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
