/**
 * Dynamic OG image for Bragging Rights polls
 * Renders poll question and options as an image for Facebook/Twitter previews
 * Deploy to Vercel - the /api folder becomes serverless functions
 */
import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const question = url.searchParams.get('question') || url.searchParams.get('q') || 'Bragging Rights Poll';
    const optsParam = url.searchParams.get('opts') || url.searchParams.get('options') || '';
    const options = optsParam ? optsParam.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#101624',
            background: 'linear-gradient(135deg, #101624 0%, #162040 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 48,
              maxWidth: 1000,
            }}
          >
            <div
              style={{
                fontSize: 28,
                color: '#3fa7ff',
                marginBottom: 24,
                fontWeight: 600,
                letterSpacing: 2,
              }}
            >
              BRAGGING RIGHTS
            </div>
            <div
              style={{
                fontSize: 42,
                color: '#e6e9f0',
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: 1.3,
                marginBottom: 32,
              }}
            >
              {question}
            </div>
            {options.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  width: '100%',
                }}
              >
                {options.slice(0, 6).map((opt: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#222c4a',
                      padding: '16px 24px',
                      borderRadius: 8,
                      fontSize: 24,
                      color: '#e6e9f0',
                    }}
                  >
                    <span
                      style={{
                        color: '#3fa7ff',
                        marginRight: 16,
                        fontWeight: 700,
                      }}
                    >
                      {i + 1}.
                    </span>
                    {opt}
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                fontSize: 20,
                color: '#3fa7ff',
                marginTop: 32,
                fontWeight: 600,
              }}
            >
              Vote at Bragging Rights →
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    return new Response('Failed to generate image', { status: 500 });
  }
}
