import React from 'react';

const serializeError = (error: any) => {
  if (error instanceof Error) {
    return error.message + '\n' + error.stack;
  }
  return JSON.stringify(error, null, 2);
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
          <div className="bg-white rounded-2xl shadow-large p-8 max-w-2xl w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-danger-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">出错了</h1>
              <p className="text-neutral-600 mb-6">应用程序遇到了一个错误</p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 mb-6 max-h-64 overflow-auto">
              <pre className="text-xs text-neutral-700 whitespace-pre-wrap font-mono">
                {serializeError(this.state.error)}
              </pre>
            </div>
            <div className="text-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                重新加载
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
