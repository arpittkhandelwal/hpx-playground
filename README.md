# ⚡ HPX Playground

A high-performance online C++ playground dedicated to the **HPX** (High Performance ParalleX) library.

Experience the future of C++ concurrency and parallelism directly in your browser.

## 🚀 Features

- **Pro Editor**: Monaco-based C++ editor (VS Code engine) with HPX-specific syntax highlighting.
- **Native Performance**: Compiles and runs real HPX code using the task-based runtime (when hosted with HPX installed).
- **Smart Fallback**: Automatically switches to Wandbox API if a local HPX build isn't detected, ensuring the playground always works.
- **Visual Metrics**: Real-time tracking of compilation time, execution time, and thread-based speedup indicators.
- **Interactive Examples**: 12 curated examples ranging from "Hello World" to "Parallel Matrix Multiplication" and "Stencil Computations".
- **Shareable Code**: Your code is encoded directly in the URL — just copy and share.

## 🛠️ Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- (Optional) [HPX](https://github.com/STEllAR-GROUP/hpx) built locally if you want native execution.

### Installation
```bash
git clone https://github.com/arpittkhandelwal/hpx-playground.git
cd hpx-playground
npm install
```

### Running
```bash
npm start
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

## 🐳 Docker Deployment

The repository includes a multi-stage Dockerfile that compiles HPX from source and sets up the Node.js server.

```bash
docker build -t hpx-playground .
docker run -p 8080:8080 hpx-playground
```

## 📜 License
Distributed under the Boost Software License, Version 1.0. See `LICENSE` for details.
