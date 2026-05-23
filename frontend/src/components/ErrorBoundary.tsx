import { Component, type ErrorInfo, type ReactNode } from "react";
import Button from "@/components/ui/Button";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error boundary:", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 text-center bg-background text-foreground">
        <h1 className="text-2xl font-bold">
          {this.props.fallbackTitle ?? "Something went wrong"}
        </h1>
        <p className="text-muted-foreground max-w-md text-sm">
          {this.state.error?.message || "An unexpected error occurred. You can try again or reload the page."}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={this.handleRetry}>
            Try again
          </Button>
          <Button type="button" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    );
  }
}
