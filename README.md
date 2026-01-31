# MathViz3D - 几何题可视化系统

将几何题图片转化为可交互 3D 模型 + AI 讲解 + 带字幕视频。

## 核心功能

### AI 智能识题
上传几何题图片，AI 自动识别：
- 几何体类型（正方体、四面体、长方体等）
- 关键点定义（顶点、中点、比例点、动点）
- 翻折关系
- 测量需求（体积、距离、角度、面积）
- 选择题选项（自动提取 A/B/C/D）

### 实时 3D 可视化
- Three.js 渲染几何体，支持旋转、缩放、拖拽
- 动点滑块控制，实时查看几何变化
- 测量值实时计算显示

### 视频导出
- WebCodecs 硬件加速编码（H.264/VP9）
- 字幕合成，支持 1080p/4K 输出
- 纯前端导出，无需服务器

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React + TypeScript |
| 3D 渲染 | Three.js + React Three Fiber |
| 视频编码 | WebCodecs + Mediabunny |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| AI | OpenAI GPT-4o (vision) |
| 部署 | Cloudflare Pages + Workers + D1 |

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建
npm run build
```

访问 http://localhost:5173

## 项目结构

```
├── src/
│   ├── components/         # React 组件
│   │   ├── interactive/    # 交互模式（3D 模型 + 滑块）
│   │   └── three/          # Three.js 渲染器
│   ├── core/               # 核心引擎
│   │   ├── coord-calculator.ts   # 坐标计算（支持动点、翻折）
│   │   ├── player.ts             # 动画播放器（纯函数）
│   │   ├── video-exporter.ts     # 视频导出
│   │   └── renderer.ts           # Three.js 渲染封装
│   ├── services/           # AI 服务
│   └── stores/             # 状态管理
├── worker/                 # API 代理（Cloudflare Worker）
└── prompts/                # AI Prompt
```

## AI 管线

```
题目图片 → Understander → SemanticDefinition → CoordCalculator → 3D 渲染
                ↓
            Planner → Explanation + StoryPlan → AnimationScript → 视频
```

## 支持的几何体

| 类型 | 说明 |
|------|------|
| cube | 正方体 |
| cuboid | 长方体 |
| tetrahedron | 正四面体 |
| square | 正方形（平面翻折题） |

## 部署

详见 [DEPLOY.md](DEPLOY.md)

## License

MIT
