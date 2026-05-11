# ── Stage 1: Build HPX ───────────────────────────────────────────────
FROM ubuntu:22.04 AS hpx-builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    cmake ninja-build g++ git \
    libboost-all-dev libhwloc-dev \
    libasio-dev libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Clone HPX (shallow, specific tag for reproducibility)
RUN git clone --depth 1 --branch v1.9.1 \
    https://github.com/STEllAR-GROUP/hpx.git /hpx-src

RUN cmake -B /hpx-build -S /hpx-src -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX=/opt/hpx \
    -DHPX_WITH_EXAMPLES=OFF \
    -DHPX_WITH_TESTS=OFF \
    -DHPX_WITH_DISTRIBUTED_RUNTIME=OFF \
    -DHPX_WITH_MALLOC=system \
    -DHPX_WITH_DOCUMENTATION=OFF \
    && cmake --build /hpx-build -j$(nproc) \
    && cmake --install /hpx-build

# ── Stage 2: Runtime Image ───────────────────────────────────────────
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    g++ libboost-all-dev libhwloc-dev \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy built HPX
COPY --from=hpx-builder /opt/hpx /opt/hpx

# Environment for compilation
ENV HPX_AVAILABLE=true \
    HPX_INCLUDE=/opt/hpx/include \
    HPX_LIB=/opt/hpx/lib \
    LD_LIBRARY_PATH=/opt/hpx/lib \
    PORT=8080

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY public/ ./public/

EXPOSE 8080
CMD ["node", "server.js"]
