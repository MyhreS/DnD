import { Component, type ReactNode } from "react";
import { Sigil } from "./icons";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/** Last line of defence — keeps a render crash from showing a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled UI error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="splash">
          <Sigil width={56} height={56} />
          <div>
            <h1>The lantern flickered out</h1>
            <p className="muted">
              Something went wrong. Reload the page to return to the hunt.
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ maxWidth: 260 }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
