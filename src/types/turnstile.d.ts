export interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  cData?: string;
  theme?: 'auto' | 'light' | 'dark';
  size?: 'normal' | 'flexible' | 'compact';
  tabindex?: number;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (errorCode?: string) => void;
  'timeout-callback'?: () => void;
}

export interface TurnstileInstance {
  render: (
    container: string | HTMLElement,
    options: TurnstileRenderOptions
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
}

declare global {
  interface Window {
    turnstile?: TurnstileInstance;
    onloadTurnstileCallback?: () => void;
  }
}
