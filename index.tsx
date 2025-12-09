import React, { Component, ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Simple Error Boundary to catch crashes (e.g. Firebase init errors)
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-[#0f1115] text-[#e8eaf2]">
          <div className="bg-[#171923] p-8 rounded-2xl border border-[#2a3040] shadow-2xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-[#ff4d67]">Algo salió mal</h2>
            <p className="text-[#a9afc3] mb-6 text-sm">
              La aplicación ha encontrado un error inesperado al iniciar.
            </p>
            <div className="bg-black/30 p-4 rounded-lg mb-6 overflow-auto max-h-40 text-left">
              <code className="text-xs text-red-400 font-mono break-all">
                {this.state.error?.message || "Error desconocido"}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#ff4d67] text-white rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);