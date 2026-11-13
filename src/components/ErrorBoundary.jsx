import { Component } from "react";
import { Button } from "@/components/ui/button";

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error(error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold">אופס, משהו השתבש</h1>
        <p className="text-muted-foreground">אפשר לרענן את הדף ולנסות שוב.</p>
        <Button onClick={() => window.location.reload()}>רענון</Button>
      </div>
    );
  }
}
