import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangleIcon, RefreshCwIcon } from './Icons';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FloodGuard ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            width: '100%',
            maxWidth: '100vw',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              background: 'var(--card-surface, #0C0E12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '28px 24px',
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertTriangleIcon size={26} />
            </div>

            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#F8FAFC',
                marginBottom: 8,
              }}
            >
              {this.props.fallbackTitle || 'เกิดข้อผิดพลาดในการแสดงผล'}
            </h3>

            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary, #94A3B8)',
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              ระบบตรวจพบปัญหาชั่วคราว ข้อมูลของท่านยังคงปลอดภัย ท่านสามารถกดปุ่มด้านล่างเพื่อโหลดข้อมูลใหม่อีกครั้ง
            </p>

            <button
              type="button"
              onClick={this.handleReload}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              <RefreshCwIcon size={16} />
              <span>โหลดข้อมูลใหม่อีกครั้ง</span>
            </button>

            {this.state.error && (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: '#F87171',
                  textAlign: 'left',
                  maxHeight: 140,
                  overflowY: 'auto',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
