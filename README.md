# Trackly — Modern Full-Stack Career & Job Application Tracker

A portfolio-quality full-stack job application tracker and career pipeline dashboard built with native **Node.js** and persistent **SQLite** storage. Designed with high-end SaaS aesthetics inspired by Linear, Raycast, and Stripe.

![Trackly Dashboard](https://raw.githubusercontent.com/placeholder/trackly-preview.png)

## Highlights & Engineering Features

- **High-End Design System**: Bespoke Dark & Light mode themes with ambient glows, glassmorphism (`backdrop-filter`), CSS custom properties, and smooth cubic-bezier transitions.
- **Full CRUD Pipeline Workflow**:
  - Create applications with company, role, stage, and brand accent color presets.
  - Interactive **Drag-and-Drop Kanban Board** backed by RESTful API endpoints.
  - Quick-move buttons, stage steppers, and slide-over inspection drawer.
  - Delete with optimistic UI updates and an instant **Undo Toast** action.
- **Spotlight Command Palette (`⌘K` / `Ctrl+K`)**: Keyboard-driven launcher for rapid search across applications, theme switching, filtering, and data export.
- **Interactive SVG Data Visualizations**:
  - Velocity line & gradient area chart with dynamic Bézier curves.
  - Interactive hover cursor, tooltips, and timeframe toggling (7 Days vs. 30 Days).
  - Conic-gradient live pipeline response meters and animated status counters.
- **Delightful Micro-Animations**: Zero-dependency pure JavaScript confetti celebration engine triggered when an offer is secured.
- **Data Portability**: One-click CSV export of your entire job pipeline.
- **Zero External Dependencies**: Powered entirely by native Node.js (`node:http`, `node:sqlite`) and Vanilla CSS/JS.
- **Automated Integration Testing**: 100% passing tests via Node's native test runner (`node:test`).

---

## Getting Started

### Prerequisites

- **Node.js 22.13.0** or newer (with built-in `node:sqlite` support).

### Run the Application

```bash
npm start
```

Then visit [http://localhost:3000](http://localhost:3000) in your browser.

### Development Mode

For hot reloading during development:

```bash
npm run dev
```

### Run Automated Tests

Execute the built-in test suite:

```bash
npm test
```

---

## Architecture & Interview Talking Points

Trackly demonstrates core full-stack software engineering principles without the bloat of heavy framework dependencies:

1. **Native Node.js HTTP Server**: Lightweight, high-throughput routing using Node's standard `http` module and streams.
2. **Prepared SQL Statements & WAL Mode**: SQLite database configured with Write-Ahead Logging (`WAL`) and parameterized statements to prevent SQL injection and guarantee fast concurrent reads.
3. **Optimistic UI Updates & State Synchronization**: Client state updates immediately for a snappy user experience with automated rollback and toast feedback on errors.
4. **CSS Token-Driven Design System**: Structured around CSS custom variables, enabling seamless Dark and Light themes with automatic `localStorage` persistence.
5. **Accessibility & Keyboard Navigation**: Full keyboard navigation support (`⌘K` / `Ctrl+K`, `Esc`, ARIA landmarks, semantic tags).

---

## License

MIT
