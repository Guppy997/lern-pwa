import { Component } from 'react';

// Fängt Render-Fehler ab, die sonst die ganze App auf einen weißen Bildschirm reißen
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card">
        <h1>Da ist etwas schiefgelaufen</h1>
        <p className="error">{this.state.error.message}</p>
        <button onClick={() => window.location.reload()}>App neu laden</button>
      </div>
    );
  }
}
