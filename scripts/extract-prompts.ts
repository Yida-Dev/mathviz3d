import fs from 'node:fs'
import path from 'node:path'

type PromptName = 'understander' | 'planner' | 'coder'

const ROOT = process.cwd()

const INPUT_DIR = path.join(ROOT, 'prompts', 'current')
const OUTPUT_DIR = path.join(ROOT, 'src', 'services', 'prompts')

const PROMPTS: PromptName[] = ['understander', 'planner', 'coder']

main().catch((err) => {
  console.error('[extract-prompts] failed:', err)
  process.exitCode = 1
})

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const name of PROMPTS) {
    const inputPath = path.join(INPUT_DIR, `${name}.md`)
    const md = fs.readFileSync(inputPath, 'utf8')
    const systemPrompt = extractSystemPrompt(md, inputPath)
    const outputPath = path.join(OUTPUT_DIR, `${name}.ts`)
    fs.writeFileSync(outputPath, renderTsModule(systemPrompt, inputPath), 'utf8')
  }

  // 方便排查：输出目录至少有一个占位文件（可被 git 跟踪）
  const gitkeep = path.join(OUTPUT_DIR, '.gitkeep')
  if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '', 'utf8')

  console.log(`[extract-prompts] generated: ${PROMPTS.join(', ')} -> ${path.relative(ROOT, OUTPUT_DIR)}`)
}

function extractSystemPrompt(markdown: string, sourcePath: string): string {
  const marker = '## System Prompt'
  const idx = markdown.indexOf(marker)
  if (idx === -1) {
    throw new Error(`未找到 "${marker}"：${sourcePath}`)
  }

  const rest = markdown.slice(idx + marker.length)
  const fenceStart = rest.indexOf('```')
  if (fenceStart === -1) {
    throw new Error(`未找到 System Prompt 的代码块起始 \`\`\`：${sourcePath}`)
  }

  const afterFence = rest.slice(fenceStart + 3)
  const fenceEnd = afterFence.indexOf('```')
  if (fenceEnd === -1) {
    throw new Error(`未找到 System Prompt 的代码块结束 \`\`\`：${sourcePath}`)
  }

  const raw = afterFence.slice(0, fenceEnd)
  return stripOneLeadingAndTrailingNewline(raw)
}

function stripOneLeadingAndTrailingNewline(s: string): string {
  let out = s
  if (out.startsWith('\n')) out = out.slice(1)
  if (out.endsWith('\n')) out = out.slice(0, -1)
  return out
}

function renderTsModule(systemPrompt: string, sourcePath: string): string {
  const rel = path.relative(ROOT, sourcePath)
  return [
    '// 此文件由 scripts/extract-prompts.ts 自动生成，请勿手动编辑。',
    `// 来源：${rel}`,
    '',
    `const prompt = ${JSON.stringify(systemPrompt)} as const`,
    '',
    'export default prompt',
    '',
  ].join('\n')
}
