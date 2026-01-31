# Prompt Engineering for MathViz3D

## 目录结构

```
prompts/
├── versions/                    # 各版本提示词
│   ├── v001-chinese-baseline/   # 原始中文基准版（暂空）
│   └── v002-english-full/       # 完整英文翻译版
├── test-runs/                   # 测试结果（按 run-{N}-{version} 命名）
├── current -> versions/v002-english-full  # 当前激活版本
├── understander.md              # 工作副本
├── planner.md
├── coder.md
└── test-runner.ts               # 测试脚本
```

## 版本命名规范

- `v{NNN}-{描述}` - 如 `v001-chinese-baseline`, `v002-english-full`

## 测试流程

1. 修改 `versions/vXXX/` 下的提示词
2. 更新 `current` 软链接指向新版本
3. 运行测试，结果保存到 `test-runs/run-{N}-{version}/`
4. 对比不同版本的测试结果

## 并行配置

测试支持并行运行以提高效率：

```bash
# 串行运行（默认）
npx tsx prompts/test-runner.ts --all

# 并行运行（并发数=5）
npx tsx prompts/test-runner.ts --all --parallel
```

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| parallelLimit | 5 | 最大并发请求数 |
| maxRetries | 3 | 单个请求失败后重试次数 |
| retryDelay | 5000ms | 重试间隔 |

如需调整并发数，修改 `test-runner.ts` 中的 `parallelLimit(images, 5, ...)` 参数。

## 版本记录

| 版本 | 描述 | 平均通过率 | 测试轮次 |
|------|------|------------|----------|
| v002-english-full | 完整英文翻译 | **75% (11.3/15)** | 3 轮 |
| v001-chinese-baseline | 原始中文基准 | **72% (10.8/15)** | 3 轮 |

## 测试结果汇总

### 英文版 v002-english-full

| 轮次 | JSON 解析 | 审计验证 | 耗时 |
|------|-----------|----------|------|
| run-001 | 15/15 | 12/15 (80%) | - |
| run-003 | 15/15 | 11/15 (73%) | 671s |
| run-004 | 15/15 | 11/15 (73%) | 666s |
| **平均** | **100%** | **75%** | **~11 分钟** |

### 中文版 v001-chinese-baseline

| 轮次 | JSON 解析 | 审计验证 | 耗时 |
|------|-----------|----------|------|
| run-002 | 15/15 | 10/15 (67%) | - |
| run-005 | 15/15 | 12/15 (80%) | 503s |
| run-006 | 15/15 | 11/15 (73%) | 544s |
| **平均** | **100%** | **72%** | **~9 分钟** |

### 结论

- **JSON 解析**: 两版本均 100%，模型遵循 JSON 格式良好
- **审计验证**: 英文版略优（75% vs 72%），差异不显著
- **耗时**: 中文版略快（~9min vs ~11min），可能因 token 数较少
- **主要失败原因**: Coder 引用不存在的点（跨层一致性问题）

