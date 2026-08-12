import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Button, Result } from 'antd';

export function GlobalErrorBoundary() {
  const error = useRouteError() as any;

  // 1. Handle Chunk Load Errors (Deployment Updates)
  const isChunkLoadError = error?.message?.includes('Failed to fetch dynamically imported module');
  
  if (isChunkLoadError) {
    const isReloaded = sessionStorage.getItem('chunk_load_reloaded');
    if (!isReloaded) {
      sessionStorage.setItem('chunk_load_reloaded', 'true');
      window.location.reload();
      return null;
    }
  }

  sessionStorage.removeItem('chunk_load_reloaded');

  // 2. Handle React Router specific error responses (e.g. 404 Not Found)
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
          <Result
            status="404"
            title="404"
            subTitle="Sorry, the page you visited does not exist."
            extra={<Button type="primary" href="/">Back Home</Button>}
          />
        </div>
      );
    }
    
    if (error.status === 401 || error.status === 403) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
          <Result
            status="403"
            title="403"
            subTitle="Sorry, you are not authorized to access this page."
            extra={<Button type="primary" href="/">Back Home</Button>}
          />
        </div>
      );
    }
  }

  // 3. Handle unexpected Javascript crashes (Fallback)
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
      <Result
        status="500"
        title="Something went wrong"
        subTitle={isChunkLoadError ? "A new version of the app is available. Please refresh the page." : "An unexpected application error occurred."}
        extra={
          <Button type="primary" size="large" onClick={() => window.location.reload()} className="bg-primary-500 hover:bg-primary-600">
            Refresh Page
          </Button>
        }
      />
    </div>
  );
}
