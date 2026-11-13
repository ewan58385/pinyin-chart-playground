import { Component, type ComponentChildren } from 'preact';

/** What the app shows instead of a blank screen when something fails while it starts or renders. */
export function StartupError() {
  return (
    <div class="startup-error" role="alert">
      <h1>Pinyin Chart could not open</h1>
      <p>Something went wrong while starting the app. Your notes and recordings are still saved on this device.</p>
      <button type="button" class="btn primary" onClick={() => location.reload()}>
        Reload
      </button>
    </div>
  );
}

/** Catches a rendering error anywhere in the app and shows StartupError in its place. */
export class ErrorBoundary extends Component<{ children: ComponentChildren }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Pinyin Chart failed to render:', error);
  }

  render() {
    return this.state.failed ? <StartupError /> : this.props.children;
  }
}
