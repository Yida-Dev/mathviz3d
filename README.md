<div align="center">

# MathViz3D

**将几何题图片转化为可交互 3D 模型 + AI 讲解 + 带字幕视频**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-000000?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[English](#english) | [Demo](#demo) | [Quick Start](#quick-start)

</div>

---

## Features

<table>
<tr>
<td width="33%" align="center">

### AI 智能识题

上传几何题图片，GPT-4o 自动识别几何体类型、关键点、翻折关系、测量需求和选择题选项

</td>
<td width="33%" align="center">

### 实时 3D 可视化

Three.js 渲染，支持旋转缩放拖拽，动点滑块控制，测量值实时计算

</td>
<td width="33%" align="center">

### 视频导出

WebCodecs 硬件加速，H.264/VP9 编码，字幕合成，1080p/4K 输出，纯前端

</td>
</tr>
</table>

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Frontend** | React 18 + TypeScript 5 + Vite |
| **3D Engine** | Three.js + React Three Fiber + Drei |
| **Video** | WebCodecs + Mediabunny |
| **State** | Zustand |
| **Styling** | Tailwind CSS |
| **AI** | OpenAI GPT-4o (Vision) |
| **Deploy** | Cloudflare Pages + Workers + D1 |

---

## Quick Start

```bash
# Clone
git clone https://github.com/your-username/mathviz3d.git
cd mathviz3d

# Install
npm install

# Dev
npm run dev

# Build
npm run build
```

Open [http://localhost:5173](http://localhost:5173)

---

## Architecture

```
                    +------------------+
                    |   Upload Image   |
                    +--------+---------+
                             |
                             v
+------------+    +----------+----------+    +---------------+
| Understander|-->| SemanticDefinition |-->| CoordCalculator|
| (GPT-4o)   |    +----------+----------+    +-------+-------+
+------------+               |                       |
      |                      v                       v
      |              +-------+-------+       +-------+-------+
      +------------->|    Planner    |       |   Renderer    |
                     | (Explanation) |       |  (Three.js)   |
                     +-------+-------+       +---------------+
                             |
                             v
                     +-------+-------+
                     |     Coder     |
                     |(AnimationScript)
                     +-------+-------+
                             |
              +--------------+--------------+
              v              v              v
        +-----+----+  +------+-----+  +-----+------+
        | Compiler |  |   Player   |  |  Exporter  |
        | Timeline |  | SceneState |  |    MP4     |
        +----------+  +------------+  +------------+
```

---

## Supported Geometry

| Type | Description |
|:-----|:------------|
| `cube` | Cube |
| `cuboid` | Cuboid / Rectangular Prism |
| `tetrahedron` | Regular Tetrahedron |
| `square` | Square (for folding problems) |
| `prism` | Prism |
| `pyramid` | Pyramid |

---

## Project Structure

```
mathviz3d/
├── src/
│   ├── components/           # React Components
│   │   ├── interactive/      # 3D Viewer + Controls
│   │   └── three/            # Three.js Renderer
│   ├── core/                 # Core Engine
│   │   ├── coord-calculator  # Coordinate Calculation
│   │   ├── player            # Animation Player (Pure Function)
│   │   ├── compiler          # Timeline Compiler
│   │   ├── renderer          # Three.js Wrapper
│   │   └── video-exporter    # MP4 Export
│   ├── services/             # AI Services
│   └── stores/               # Zustand Stores
├── worker/                   # Cloudflare Worker (API Proxy)
├── prompts/                  # AI Prompts
└── docs/                     # Design Documents
```

---

## Deploy

See [DEPLOY.md](DEPLOY.md) for step-by-step deployment guide.

**Quick Deploy:**

```bash
# Frontend -> Cloudflare Pages
npm run build
npx wrangler pages deploy dist --project-name mathviz3d

# API -> Cloudflare Workers
cd worker && npx wrangler deploy
```

---

## English

MathViz3D is a geometry problem visualization system that transforms geometry problem images into interactive 3D models with AI explanations and subtitle videos.

**Key Features:**
- **AI Recognition**: Upload geometry problem images, GPT-4o automatically identifies geometry type, key points, folding relations, and multiple-choice options
- **3D Visualization**: Three.js rendering with rotation, zoom, drag, dynamic point sliders, and real-time measurements
- **Video Export**: WebCodecs hardware acceleration, H.264/VP9 encoding, subtitle synthesis, 1080p/4K output, pure frontend

---

## License

[MIT](LICENSE)

---

<div align="center">

**Built with React + Three.js + GPT-4o**

</div>
