# MathViz3D - 几何题可视化系统

将几何题图片转化为可交互 3D 模型 + 题目讲解 + 带字幕视频。

## 功能特性

- **AI 识题**：上传几何题图片，AI 自动识别几何体、点、参数、测量需求
- **3D 可视化**：实时渲染几何体，支持旋转、缩放、拖拽交互
- **动点演示**：通过滑块控制动点位置，实时查看体积/距离/角度变化
- **选择题支持**：自动提取 A/B/C/D 选项，标记可验证状态
- **讲解生成**：AI 生成解题思路和分步讲解（开发中）
- **视频导出**：导出带字幕的 MP4 讲解视频（开发中）

## 技术栈

- **前端**：React + TypeScript + Tailwind CSS
- **3D 渲染**：Three.js + React Three Fiber
- **状态管理**：Zustand
- **AI 服务**：OpenAI GPT-4o (vision)
- **部署**：Cloudflare Pages + Workers + D1

## 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

访问 http://localhost:5173

### 构建

```bash
npm run build
```

### 部署

详见 [DEPLOY.md](DEPLOY.md)

## 项目结构

```
├── src/
│   ├── components/         # React 组件
│   │   ├── interactive/    # 交互模式组件
│   │   └── three/          # Three.js 渲染组件
│   ├── core/               # 核心逻辑
│   │   ├── types.ts        # 类型定义
│   │   └── coord-calculator.ts  # 坐标计算器
│   ├── services/           # AI 服务
│   │   ├── ai-pipeline.ts  # AI 管线
│   │   └── prompts/        # AI Prompt（自动生成）
│   └── stores/             # Zustand 状态管理
├── worker/                 # Cloudflare Worker（API 代理）
├── prompts/                # AI Prompt 源文件
│   └── current/            # 当前使用的 Prompt 版本
├── docs/                   # 设计文档
└── dev-notes/              # 开发笔记
```

## AI 管线

```
图片 → Understander → SemanticDefinition → CoordCalculator → 3D 渲染
                ↓
           Planner → Explanation + StoryPlan
                ↓
            Coder → AnimationScript → 视频
```

### 三个 AI Agent

| Agent | 角色 | 输入 | 输出 |
|-------|------|------|------|
| Understander | 读题专家 | 题目图片 | SemanticDefinition (JSON) |
| Planner | 数学老师 | SemanticDefinition | Explanation + StoryPlan |
| Coder | 动画师 | StoryPlan | AnimationScript |

## 支持的几何体

| 类型 | 说明 |
|------|------|
| cube | 正方体 |
| cuboid | 长方体 |
| tetrahedron | 正四面体 |
| square | 正方形（平面翻折题） |

## 支持的测量类型

| 类型 | 说明 |
|------|------|
| volume | 四面体体积（4 点） |
| distance | 两点距离（2 点） |
| angle | 三点夹角 / 线面夹角 |
| area | 三角形/四边形面积 |

## 开发文档

- [系统架构](docs/[方案]%20系统架构-完整设计方案.md)
- [AI 设计](docs/[方案]%20AI设计-输入输出规范.md)
- [基建设计](docs/[方案]%20基建设计-渲染引擎与测试案例.md)
- [部署指南](DEPLOY.md)

## 配置说明

### 环境变量

在设置页面配置 AI 服务：

- **API Base URL**：OpenAI 兼容的 API 地址
- **API Key**：API 密钥
- **Model**：模型名称（需支持 vision）

### 本地存储

配置保存在浏览器 localStorage，key 为 `mathviz3d-settings`。

## 开发命令

```bash
# 开发服务器
npm run dev

# 类型检查
npm run typecheck

# 构建
npm run build

# 提取 Prompt
npm run extract-prompts

# 部署前端
CLOUDFLARE_API_TOKEN="xxx" npx wrangler pages deploy dist --project-name mathviz3d

# 部署 Worker
cd worker && npx wrangler deploy
```

## License

MIT
