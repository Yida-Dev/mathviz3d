/**
 * AI Agent 提示词测试脚本
 *
 * 用法：
 * export OPENAI_API_KEY="sk-xxx"
 * export OPENAI_BASE_URL="https://api.ikuncode.cc/v1"
 *
 * # 串行测试所有图片
 * npx tsx prompts/test-runner.ts --all
 *
 * # 并行测试所有图片（推荐）
 * npx tsx prompts/test-runner.ts --all --parallel
 *
 * # 测试单张图片
 * npx tsx prompts/test-runner.ts --image prompts/case-images/1.png
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 配置
const config = {
  apiKey: process.env.OPENAI_API_KEY || '',
  baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  model: process.env.OPENAI_MODEL || 'gemini-3-pro-preview',
  temperature: 0.2,
  maxTokens: 65536,
  timeout: 600000,
  maxRetries: 3,
  retryDelay: 5000,
  parallelLimit: 5, // 并行请求数限制
}

// 获取当前版本信息
function getCurrentVersion(): { name: string; path: string } {
  const currentLink = path.join(__dirname, 'current')
  if (fs.existsSync(currentLink)) {
    const target = fs.readlinkSync(currentLink)
    const versionName = path.basename(target)
    const versionPath = path.join(__dirname, target)
    return { name: versionName, path: versionPath }
  }
  // 默认使用根目录的提示词
  return { name: 'default', path: __dirname }
}

// 获取下一个 run 编号
function getNextRunNumber(): number {
  const testRunsDir = path.join(__dirname, 'test-runs')
  if (!fs.existsSync(testRunsDir)) {
    return 1
  }
  const dirs = fs.readdirSync(testRunsDir)
    .filter(d => d.startsWith('run-'))
    .map(d => parseInt(d.match(/run-(\d+)/)?.[1] || '0'))
  return Math.max(0, ...dirs) + 1
}

// 读取提示词文件（从指定版本目录）
function loadPrompt(filename: string, versionPath: string): string {
  const filepath = path.join(versionPath, filename)
  const content = fs.readFileSync(filepath, 'utf-8')

  // 提取 System Prompt 部分
  const match = content.match(/## System Prompt\n\n```\n([\s\S]*?)\n```/)
  if (!match) {
    throw new Error(`无法从 ${filename} 提取 System Prompt`)
  }
  return match[1]
}

// 延迟函数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 调用 Chat Completions API（标准 OpenAI 格式）
async function callAPI(
  systemPrompt: string,
  userContent: string | Array<{ type: string; [key: string]: any }>,
): Promise<string> {
  // 构建标准 Chat Completions 格式的 messages
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
  ]

  if (typeof userContent === 'string') {
    messages.push({ role: 'user', content: userContent })
  } else {
    // 多模态内容
    messages.push({ role: 'user', content: userContent })
  }

  const requestBody = {
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`  [请求 ${attempt}/${config.maxRetries}] 发送中...`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout)

      // 使用 /chat/completions endpoint（标准 OpenAI 格式）
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`HTTP ${response.status}: ${error}`)
      }

      const data = await response.json() as any
      // 标准 Chat Completions 返回格式
      return data.choices?.[0]?.message?.content || ''

    } catch (error: any) {
      lastError = error
      const isTimeout = error.name === 'AbortError'
      const errorMsg = isTimeout ? '请求超时' : error.message

      console.log(`  [请求 ${attempt}/${config.maxRetries}] 失败: ${errorMsg}`)

      if (attempt < config.maxRetries) {
        console.log(`  等待 ${config.retryDelay / 1000} 秒后重试...`)
        await sleep(config.retryDelay)
      }
    }
  }

  throw new Error(`API 调用失败（重试 ${config.maxRetries} 次后）: ${lastError?.message}`)
}

// 测试 Understander
async function testUnderstander(imageBase64: string, versionPath: string): Promise<any> {
  console.log('\n=== 测试 Understander ===')

  const systemPrompt = loadPrompt('understander.md', versionPath)
  const userContent = [
    { type: 'text', text: '分析这道几何题，提取结构化的语义信息。' },
    { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
  ]

  const result = await callAPI(systemPrompt, userContent)
  console.log('原始输出:', result)

  try {
    const parsed = JSON.parse(result)
    console.log('解析成功:', JSON.stringify(parsed, null, 2))
    return parsed
  } catch (e) {
    console.log('直接解析失败，尝试修复 JSON 转义...')

    // 尝试修复 JSON 转义问题（移除 markdown 代码块）
    try {
      const fixed = fixJsonEscaping(result)
      const parsed = JSON.parse(fixed)
      console.log('修复后解析成功:', JSON.stringify(parsed, null, 2))
      return parsed
    } catch (e2) {
      console.error('JSON 解析失败:', e2)
      return null
    }
  }
}

// 修复常见的 JSON 转义问题
function fixJsonEscaping(raw: string): string {
  // 移除可能的 markdown 代码块
  let fixed = raw.trim()
  if (fixed.startsWith('```json')) {
    fixed = fixed.slice(7)
  } else if (fixed.startsWith('```')) {
    fixed = fixed.slice(3)
  }
  if (fixed.endsWith('```')) {
    fixed = fixed.slice(0, -3)
  }
  fixed = fixed.trim()

  // 修复 LaTeX 公式中的反斜杠：在 JSON 字符串中，\ 需要转义为 \\
  // 但如果已经是 \\ 则不需要再转义
  // 常见的 LaTeX 命令：\frac, \sqrt, \vec, \cdot, \times, \sin, \cos, \tan, \alpha, \beta, \theta, \phi
  // 策略：查找未转义的反斜杠（后面不是另一个反斜杠或已知转义字符 n, r, t, ", /）

  // 先把已经正确转义的 \\ 替换成占位符
  const placeholder = '\x00ESCAPED_BACKSLASH\x00'
  fixed = fixed.replace(/\\\\/g, placeholder)

  // 修复未转义的反斜杠（后面跟着字母，这是 LaTeX 命令的特征）
  fixed = fixed.replace(/\\([a-zA-Z])/g, '\\\\$1')

  // 修复 \{ 和 \} （LaTeX 中的大括号转义）
  fixed = fixed.replace(/\\{/g, '\\\\{')
  fixed = fixed.replace(/\\}/g, '\\\\}')

  // 还原占位符
  fixed = fixed.replace(new RegExp(placeholder, 'g'), '\\\\')

  return fixed
}

// 测试 Planner
async function testPlanner(semanticDef: any, versionPath: string, saveRawOutput?: (raw: string) => void): Promise<any> {
  console.log('\n=== 测试 Planner ===')

  const systemPrompt = loadPrompt('planner.md', versionPath)
  const userContent = `根据以下几何题的语义定义，设计讲解方案和视频场景规划。

## 语义定义

${JSON.stringify(semanticDef, null, 2)}`

  const result = await callAPI(systemPrompt, userContent)
  console.log('原始输出:', result)

  // 保存原始输出以便调试
  if (saveRawOutput) {
    saveRawOutput(result)
  }

  try {
    // 先尝试直接解析
    const parsed = JSON.parse(result)
    console.log('解析成功')
    console.log('- explanation.summary:', parsed.explanation?.summary)
    console.log('- storyPlan.scenes 数量:', parsed.storyPlan?.scenes?.length)
    return parsed
  } catch (e) {
    console.log('直接解析失败，尝试修复 JSON 转义...')

    // 尝试修复 JSON 转义问题
    try {
      const fixed = fixJsonEscaping(result)
      const parsed = JSON.parse(fixed)
      console.log('修复后解析成功')
      console.log('- explanation.summary:', parsed.explanation?.summary)
      console.log('- storyPlan.scenes 数量:', parsed.storyPlan?.scenes?.length)
      return parsed
    } catch (e2) {
      console.error('JSON 解析失败:', e2)
      return null
    }
  }
}

// 测试 Coder
async function testCoder(semanticDef: any, storyPlan: any, versionPath: string): Promise<any> {
  console.log('\n=== 测试 Coder ===')

  const systemPrompt = loadPrompt('coder.md', versionPath)
  const userContent = `将以下视频规划翻译成具体的动画脚本。

## 语义定义

${JSON.stringify(semanticDef, null, 2)}

## 视频规划

${JSON.stringify(storyPlan, null, 2)}`

  const result = await callAPI(systemPrompt, userContent)
  console.log('原始输出:', result)

  try {
    const parsed = JSON.parse(result)
    console.log('解析成功')
    console.log('- scenes 数量:', parsed.scenes?.length)
    return parsed
  } catch (e) {
    console.log('直接解析失败，尝试修复 JSON 转义...')

    // 尝试修复 JSON 转义问题（移除 markdown 代码块）
    try {
      const fixed = fixJsonEscaping(result)
      const parsed = JSON.parse(fixed)
      console.log('修复后解析成功')
      console.log('- scenes 数量:', parsed.scenes?.length)
      return parsed
    } catch (e2) {
      console.error('JSON 解析失败:', e2)
      return null
    }
  }
}

// 使用硬编码测试数据测试 Planner + Coder
async function testWithMockData() {
  console.log('\n========================================')
  console.log('使用硬编码测试数据（跳过图片识别）')
  console.log('========================================')

  // 案例 1 的 SemanticDefinition
  const semanticDef = {
    problemId: 'case-1-cube-tetrahedron',
    problemText: '在正方体ABCD-A1B1C1D1中，M、N、E分别为AD1、AC、B1D1中点，P、Q分别在BE、CD1上移动，求三棱锥M-PQN的体积。',
    baseGeometry: { type: 'cube', size: 1 },
    points: [
      { id: 'M', type: 'midpoint', of: ['A', 'D1'] },
      { id: 'N', type: 'midpoint', of: ['A', 'C'] },
      { id: 'E', type: 'midpoint', of: ['B1', 'D1'] },
      { id: 'P', type: 'onSegment', from: 'B', to: 'E', param: 'p' },
      { id: 'Q', type: 'onSegment', from: 'C', to: 'D1', param: 'q' },
    ],
    params: [
      { id: 'p', min: 0, max: 1, default: 0.5 },
      { id: 'q', min: 0, max: 1, default: 0.5 },
    ],
    measurements: [
      { id: 'volume_MPQN', type: 'volume', points: ['M', 'P', 'Q', 'N'] },
    ],
    question: '求三棱锥M-PQN的体积，判断与P、Q位置的关系',
  }

  const version = getCurrentVersion()

  // 测试 Planner
  const plannerResult = await testPlanner(semanticDef, version.path)
  if (!plannerResult) {
    console.error('Planner 测试失败')
    return
  }

  // 测试 Coder
  const coderResult = await testCoder(semanticDef, plannerResult.storyPlan, version.path)
  if (!coderResult) {
    console.error('Coder 测试失败')
    return
  }

  // 保存结果
  const outputDir = path.join(__dirname, 'test-output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(
    path.join(outputDir, 'planner-result.json'),
    JSON.stringify(plannerResult, null, 2)
  )
  fs.writeFileSync(
    path.join(outputDir, 'coder-result.json'),
    JSON.stringify(coderResult, null, 2)
  )

  console.log('\n========================================')
  console.log('测试完成，结果保存在 prompts/test-output/')
  console.log('========================================')
}

// API 诊断测试
async function diagnoseAPI() {
  console.log('\n=== API 诊断 ===')

  // 生成不同长度的内容
  const shortContent = 'Say hi'
  const mediumContent = 'A'.repeat(500) + ' Say hi'
  const longContent = 'A'.repeat(2000) + ' Say hi'

  const testCases = [
    {
      name: 'short (6 chars)',
      body: {
        model: config.model,
        messages: [{ role: 'user', content: shortContent }],
      },
    },
    {
      name: 'medium (500 chars)',
      body: {
        model: config.model,
        messages: [{ role: 'user', content: mediumContent }],
      },
    },
    {
      name: 'long (2000 chars)',
      body: {
        model: config.model,
        messages: [{ role: 'user', content: longContent }],
      },
    },
    {
      name: 'system+user short',
      body: {
        model: config.model,
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: shortContent },
        ],
      },
    },
    {
      name: 'system long + user short',
      body: {
        model: config.model,
        messages: [
          { role: 'system', content: 'A'.repeat(1000) + ' You are helpful' },
          { role: 'user', content: shortContent },
        ],
      },
    },
  ]

  for (const tc of testCases) {
    try {
      const bodyStr = JSON.stringify(tc.body)
      console.log(`\n[${tc.name}] Sending ${bodyStr.length} bytes...`)

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${config.apiKey}`,
          'Accept': 'application/json',
        },
        body: bodyStr,
      })

      if (response.ok) {
        const data = (await response.json()) as any
        console.log(`  -> OK: ${data.choices?.[0]?.message?.content?.slice(0, 30)}...`)
      } else {
        const error = await response.text()
        console.log(`  -> FAIL ${response.status}: ${error.slice(0, 100)}`)
      }
    } catch (e: any) {
      console.log(`  -> ERROR: ${e.message}`)
    }
  }
}

// 测试单张图片（支持版本化输出）
async function testWithImage(
  imagePath: string,
  outputDir: string,
  versionPath: string
): Promise<{ file: string; success: boolean; error?: string }> {
  const baseName = path.basename(imagePath, path.extname(imagePath))
  console.log(`[${baseName}] 开始测试...`)

  try {
    // 读取图片
    const imageBuffer = fs.readFileSync(imagePath)
    const imageBase64 = imageBuffer.toString('base64')

    // 测试 Understander
    const semanticDef = await testUnderstander(imageBase64, versionPath)
    if (!semanticDef) {
      return { file: baseName, success: false, error: 'Understander 失败' }
    }
    fs.writeFileSync(
      path.join(outputDir, `${baseName}-understander.json`),
      JSON.stringify(semanticDef, null, 2)
    )

    // 测试 Planner
    const plannerResult = await testPlanner(semanticDef, versionPath, (raw: string) => {
      fs.writeFileSync(path.join(outputDir, `${baseName}-planner-raw.txt`), raw)
    })
    if (!plannerResult) {
      return { file: baseName, success: false, error: 'Planner 失败' }
    }
    fs.writeFileSync(
      path.join(outputDir, `${baseName}-planner.json`),
      JSON.stringify(plannerResult, null, 2)
    )

    // 测试 Coder
    const coderResult = await testCoder(semanticDef, plannerResult.storyPlan, versionPath)
    if (!coderResult) {
      return { file: baseName, success: false, error: 'Coder 失败' }
    }
    fs.writeFileSync(
      path.join(outputDir, `${baseName}-coder.json`),
      JSON.stringify(coderResult, null, 2)
    )

    console.log(`[${baseName}] 测试完成`)
    return { file: baseName, success: true }
  } catch (e: any) {
    console.error(`[${baseName}] 错误: ${e.message}`)
    return { file: baseName, success: false, error: e.message }
  }
}

// 并行执行，带并发限制
async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []

  for (const item of items) {
    const p = fn(item).then(result => {
      results.push(result)
    })
    executing.push(p)

    if (executing.length >= limit) {
      await Promise.race(executing)
      // 移除已完成的
      for (let i = executing.length - 1; i >= 0; i--) {
        const status = await Promise.race([executing[i], Promise.resolve('pending')])
        if (status !== 'pending') {
          executing.splice(i, 1)
        }
      }
    }
  }

  await Promise.all(executing)
  return results
}

// 批量测试所有图片（支持并行）
async function testAllImages(parallel: boolean = false) {
  const version = getCurrentVersion()
  const runNumber = getNextRunNumber()
  const runDir = path.join(__dirname, 'test-runs', `run-${String(runNumber).padStart(3, '0')}-${version.name}`)

  // 创建输出目录
  fs.mkdirSync(runDir, { recursive: true })

  const imagesDir = path.join(__dirname, 'case-images')
  if (!fs.existsSync(imagesDir)) {
    console.error('错误: case-images 目录不存在')
    return
  }

  const files = fs.readdirSync(imagesDir)
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0')
      const numB = parseInt(b.match(/\d+/)?.[0] || '0')
      return numA - numB
    })

  console.log(`\n========================================`)
  console.log(`测试配置:`)
  console.log(`- 提示词版本: ${version.name}`)
  console.log(`- 输出目录: test-runs/run-${String(runNumber).padStart(3, '0')}-${version.name}/`)
  console.log(`- 测试图片: ${files.length} 张`)
  console.log(`- 并行模式: ${parallel ? `是 (limit=${config.parallelLimit})` : '否'}`)
  console.log(`========================================\n`)

  let results: { file: string; success: boolean; error?: string }[]

  if (parallel) {
    // 并行测试
    results = await parallelLimit(
      files,
      config.parallelLimit,
      (file) => testWithImage(path.join(imagesDir, file), runDir, version.path)
    )
  } else {
    // 串行测试
    results = []
    for (const file of files) {
      const result = await testWithImage(path.join(imagesDir, file), runDir, version.path)
      results.push(result)
    }
  }

  // 按文件名排序结果
  results.sort((a, b) => {
    const numA = parseInt(a.file.match(/\d+/)?.[0] || '0')
    const numB = parseInt(b.file.match(/\d+/)?.[0] || '0')
    return numA - numB
  })

  // 输出汇总
  console.log('\n========================================')
  console.log('测试汇总')
  console.log('========================================')
  for (const r of results) {
    console.log(`${r.success ? '[OK]' : '[FAIL]'} ${r.file}${r.error ? ` - ${r.error}` : ''}`)
  }
  const passed = results.filter(r => r.success).length
  console.log(`\n通过: ${passed}/${results.length} (${Math.round(passed / results.length * 100)}%)`)
  console.log(`结果保存在: ${runDir}`)

  // 保存汇总信息
  fs.writeFileSync(
    path.join(runDir, 'summary.json'),
    JSON.stringify({
      version: version.name,
      runNumber,
      timestamp: new Date().toISOString(),
      parallel,
      total: results.length,
      passed,
      failed: results.length - passed,
      passRate: `${Math.round(passed / results.length * 100)}%`,
      results,
    }, null, 2)
  )
}

// 主函数
async function main() {
  if (!config.apiKey) {
    console.error('错误: 请设置 OPENAI_API_KEY 环境变量')
    process.exit(1)
  }

  console.log('配置:')
  console.log('- API Base URL:', config.baseUrl)
  console.log('- Model:', config.model)

  const args = process.argv.slice(2)

  if (args.includes('--all')) {
    const parallel = args.includes('--parallel') || args.includes('-p')
    await testAllImages(parallel)
  } else if (args.includes('--image') || args.includes('-i')) {
    const idx = args.findIndex(a => a === '--image' || a === '-i')
    const imagePath = args[idx + 1]
    if (!imagePath) {
      console.error('错误: 请指定图片路径')
      process.exit(1)
    }
    const version = getCurrentVersion()
    const outputDir = path.join(__dirname, 'test-output')
    fs.mkdirSync(outputDir, { recursive: true })
    await testWithImage(imagePath, outputDir, version.path)
  } else if (args.includes('--mock')) {
    await testWithMockData()
  } else {
    console.log(`
用法:
  npx tsx prompts/test-runner.ts --all           # 串行测试所有图片
  npx tsx prompts/test-runner.ts --all --parallel # 并行测试所有图片
  npx tsx prompts/test-runner.ts --image <path>  # 测试单张图片
  npx tsx prompts/test-runner.ts --mock          # 使用 mock 数据测试
`)
  }
}

main().catch(console.error)
