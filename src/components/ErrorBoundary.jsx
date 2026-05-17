import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-white px-6">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold text-[#111111] mb-2">Something went wrong</h2>
            <p className="text-[#666] mb-4 text-sm">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.assign('/client-gallery')}
              className="px-6 py-2 bg-[#111111] text-white rounded hover:bg-[#333] transition-colors"
            >
              Back to Collections
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
