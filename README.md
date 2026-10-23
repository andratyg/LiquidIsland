# LiquidIsland OS

> A fluid, physics-based Dynamic Island desktop companion for Windows built with Tauri v2, React 18, TypeScript, and Rust.

---

## 🚀 Features

- **Fluid Dynamic Island Morphing**: Smooth spring-based animations powered by Framer Motion.
- **Multiple Island States**: `bezel-line`, `eyes`, `compact`, `toast`, `expanded`, and `expanded-lyrics`.
- **Desktop Integration**: Native Windows system metrics via `windows-sys` and Tauri v2 capabilities.
- **Glassmorphic UI**: Sleek dark aesthetics with zero runtime overhead using Tailwind CSS.
- **Synthesized Audio Engine**: Zero-asset sound effects generated with WebAudio API oscillators.

---

## 🛠️ Tech Stack

- **Desktop Framework**: [Tauri v2](https://v2.tauri.app/)
- **Native Backend**: Rust (`windows-sys`)
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React

---

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust & Cargo](https://rustup.rs/)
- Windows Build Tools (C++ Build Tools)

### Installation

```bash
# Clone the repository
git clone https://github.com/andratyg/LiquidIsland.git
cd LiquidIsland

# Install frontend dependencies
npm install
```

### Development

```bash
# Run Vite dev server with Tauri desktop app
npm run tauri dev
```

### Production Build

```bash
# Build desktop executable and installer
npm run tauri build
```

---

## 📜 License

MIT License.
