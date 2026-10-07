import React, { useEffect, useRef, useState } from 'react';

export interface TurnstileWidgetProps {
  action: 'appointment' | 'contact' | 'second_opinion';
  onToken: (token: string) => void;
  onExpired?: () => void;
  onError?: () => void;
  resetSignal?: number;
  className?: string;
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.turnstile) {
    return Promise.resolve();
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      return resolve();
    }
    const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    if (existingScript) {
      if (window.turnstile) {
        return resolve();
      }
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  action,
  onToken,
  onExpired,
  onError,
  resetSignal = 0,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const rawSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || '';
  const isConfigured = rawSiteKey && rawSiteKey !== 'NOT_CONFIGURED';

  useEffect(() => {
    if (!isConfigured) return;

    let isMounted = true;
    loadTurnstileScript()
      .then(() => {
        if (isMounted) {
          setIsReady(true);
        }
      })
      .catch((err) => {
        console.warn('Failed to load Cloudflare Turnstile script:', err);
        if (onError) onError();
      });

    return () => {
      isMounted = false;
    };
  }, [isConfigured, onError]);

  useEffect(() => {
    if (!isConfigured || !isReady || !containerRef.current || !window.turnstile) {
      return;
    }

    // Clean up any previously rendered widget in this container
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Ignore removal error
      }
      widgetIdRef.current = null;
    }

    try {
      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: rawSiteKey,
        action,
        theme: 'auto',
        size: 'flexible',
        callback: (token: string) => {
          onToken(token);
        },
        'expired-callback': () => {
          if (onExpired) onExpired();
        },
        'error-callback': () => {
          if (onError) onError();
        }
      });
      widgetIdRef.current = widgetId;
    } catch (renderErr) {
      console.warn('Turnstile render failed:', renderErr);
      if (onError) onError();
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore removal error
        }
        widgetIdRef.current = null;
      }
    };
  }, [isConfigured, isReady, action, rawSiteKey, onToken, onExpired, onError]);

  // Handle reset signal changes
  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch (err) {
        console.warn('Turnstile reset failed:', err);
      }
    }
  }, [resetSignal]);

  if (!isConfigured) {
    return null;
  }

  return (
    <div className={`turnstile-container my-3 ${className}`}>
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center sm:justify-start" />
    </div>
  );
};
