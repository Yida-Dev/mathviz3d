/**
 * AI 输出审计脚本
 *
 * 功能：
 * 1. 验证 Understander 输出是否符合 SemanticDefinition schema
 * 2. 验证 Coder 输出是否符合 AnimationScript schema
 * 3. 使用基建的 Validator 检查动画脚本的引用完整性
 * 4. 生成审计报告
 *
 * 用法：
 * npx tsx prompts/audit.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 支持命令行参数指定输入目录，默认使用最新的 test-runs 目录
function getOutputDir(): string {
  // 检查命令行参数 --dir
  const dirIndex = process.argv.indexOf('--dir')
  if (dirIndex !== -1 && process.argv[dirIndex + 1]) {
    return path.resolve(process.argv[dirIndex + 1])
  }

  // 默认使用最新的 test-runs 目录
  const testRunsDir = path.join(__dirname, 'test-runs')
  if (fs.existsSync(testRunsDir)) {
    const dirs = fs.readdirSync(testRunsDir)
      .filter(d => d.startsWith('run-'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/run-(\d+)/)?.[1] || '0')
        const numB = parseInt(b.match(/run-(\d+)/)?.[1] || '0')
        return numB - numA // 降序，最新的在前
      })
    if (dirs.length > 0) {
      return path.join(testRunsDir, dirs[0])
    }
  }

  // 回退到旧的 test-output 目录
  return path.join(__dirname, 'test-output')
}

const OUTPUT_DIR = getOutputDir()

// =========== Schema 验证 ===========

interface SchemaError {
  path: string
  message: string
}

// 验证 SemanticDefinition
function validateSemanticDefinition(data: any): SchemaError[] {
  const errors: SchemaError[] = []

  // 必填字段
  if (!data.problemId || typeof data.problemId !== 'string') {
    errors.push({ path: 'problemId', message: '必填，类型应为 string' })
  }
  if (!data.problemText || typeof data.problemText !== 'string') {
    errors.push({ path: 'problemText', message: '必填，类型应为 string' })
  }
  if (!data.question || typeof data.question !== 'string') {
    errors.push({ path: 'question', message: '必填，类型应为 string' })
  }

  // baseGeometry
  if (!data.baseGeometry || typeof data.baseGeometry !== 'object') {
    errors.push({ path: 'baseGeometry', message: '必填，类型应为 object' })
  } else {
    const validTypes = ['cube', 'cuboid', 'tetrahedron', 'square', 'prism', 'pyramid']
    if (!validTypes.includes(data.baseGeometry.type)) {
      errors.push({ path: 'baseGeometry.type', message: `无效类型: ${data.baseGeometry.type}，应为: ${validTypes.join('|')}` })
    }
  }

  // points
  if (!Array.isArray(data.points)) {
    errors.push({ path: 'points', message: '必填，类型应为 array' })
  } else {
    const validPointTypes = ['vertex', 'midpoint', 'ratio', 'onSegment', 'center']
    for (let i = 0; i < data.points.length; i++) {
      const p = data.points[i]
      if (!p.id || typeof p.id !== 'string') {
        errors.push({ path: `points[${i}].id`, message: '必填，类型应为 string' })
      }
      if (!p.type || !validPointTypes.includes(p.type)) {
        errors.push({ path: `points[${i}].type`, message: `无效类型: ${p.type}` })
      }
      // onSegment 必须有 param
      if (p.type === 'onSegment' && !p.param) {
        errors.push({ path: `points[${i}].param`, message: 'onSegment 类型必须指定 param' })
      }
    }
  }

  // params（可选，但如果有 onSegment 点则需要对应 param）
  if (data.params && Array.isArray(data.params)) {
    for (let i = 0; i < data.params.length; i++) {
      const p = data.params[i]
      if (!p.id || typeof p.id !== 'string') {
        errors.push({ path: `params[${i}].id`, message: '必填，类型应为 string' })
      }
      if (typeof p.min !== 'number' || typeof p.max !== 'number') {
        errors.push({ path: `params[${i}]`, message: 'min/max 必须是 number' })
      }
    }
  }

  // measurements
  if (data.measurements && Array.isArray(data.measurements)) {
    const validMeasurementTypes = ['volume', 'distance', 'angle', 'area']
    for (let i = 0; i < data.measurements.length; i++) {
      const m = data.measurements[i]
      if (!m.id || typeof m.id !== 'string') {
        errors.push({ path: `measurements[${i}].id`, message: '必填，类型应为 string' })
      }
      if (!validMeasurementTypes.includes(m.type)) {
        errors.push({ path: `measurements[${i}].type`, message: `无效类型: ${m.type}` })
      }
      if (!Array.isArray(m.points)) {
        errors.push({ path: `measurements[${i}].points`, message: '必填，类型应为 array' })
      }
    }
  }

  return errors
}

// 验证 AnimationScript
function validateAnimationScript(data: any): SchemaError[] {
  const errors: SchemaError[] = []

  if (!data.title || typeof data.title !== 'string') {
    errors.push({ path: 'title', message: '必填，类型应为 string' })
  }

  if (!Array.isArray(data.scenes)) {
    errors.push({ path: 'scenes', message: '必填，类型应为 array' })
    return errors
  }

  const validCameraPresets = ['front', 'top', 'side', 'isometric', 'isometric-back']
  const validActionTypes = [
    'show', 'hide', 'fadeIn', 'fadeOut', 'highlight', 'pulse',
    'drawLine', 'showPath', 'showPlane', 'showTetrahedron',
    'animatePoint', 'fold', 'together', 'wait'
  ]

  for (let i = 0; i < data.scenes.length; i++) {
    const scene = data.scenes[i]
    const scenePath = `scenes[${i}]`

    if (!scene.id || typeof scene.id !== 'string') {
      errors.push({ path: `${scenePath}.id`, message: '必填，类型应为 string' })
    }
    if (!scene.narration || typeof scene.narration !== 'string') {
      errors.push({ path: `${scenePath}.narration`, message: '必填，类型应为 string' })
    }

    // camera 验证
    if (!scene.camera) {
      errors.push({ path: `${scenePath}.camera`, message: '必填' })
    } else if (typeof scene.camera === 'string') {
      if (!validCameraPresets.includes(scene.camera)) {
        errors.push({ path: `${scenePath}.camera`, message: `无效预设: ${scene.camera}` })
      }
    } else if (typeof scene.camera === 'object') {
      if (!scene.camera.spherical) {
        errors.push({ path: `${scenePath}.camera.spherical`, message: '自定义相机必须包含 spherical' })
      } else {
        const { phi } = scene.camera.spherical
        if (typeof phi !== 'number' || phi < 5 || phi > 85) {
          errors.push({ path: `${scenePath}.camera.spherical.phi`, message: `phi 应在 5-85 范围，当前: ${phi}` })
        }
      }
      if (!scene.camera.lookAt) {
        errors.push({ path: `${scenePath}.camera.lookAt`, message: '必填' })
      }
      if (!scene.camera.transition) {
        errors.push({ path: `${scenePath}.camera.transition`, message: '必填' })
      }
    }

    // actions 验证
    if (!Array.isArray(scene.actions)) {
      errors.push({ path: `${scenePath}.actions`, message: '必填，类型应为 array' })
    } else {
      validateActions(scene.actions, `${scenePath}.actions`, errors, validActionTypes)
    }
  }

  return errors
}

function validateActions(actions: any[], basePath: string, errors: SchemaError[], validActionTypes: string[]): void {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    const actionPath = `${basePath}[${i}]`

    if (!action.do || typeof action.do !== 'string') {
      errors.push({ path: `${actionPath}.do`, message: '必填，类型应为 string' })
      continue
    }

    if (!validActionTypes.includes(action.do)) {
      errors.push({ path: `${actionPath}.do`, message: `无效动作类型: ${action.do}` })
      continue
    }

    // 创建型动作必须有 id
    const creationActions = ['drawLine', 'showPath', 'showPlane', 'showTetrahedron']
    if (creationActions.includes(action.do) && !action.id) {
      errors.push({ path: `${actionPath}.id`, message: `${action.do} 必须指定 id` })
    }

    // together 递归验证
    if (action.do === 'together') {
      if (!Array.isArray(action.actions)) {
        errors.push({ path: `${actionPath}.actions`, message: 'together.actions 必须是数组' })
      } else {
        validateActions(action.actions, `${actionPath}.actions`, errors, validActionTypes)
      }
    }
  }
}

// =========== 基建 Validator 复用 ===========

// 简化版 Validator（不依赖 tsconfig paths）
function runInfraValidator(script: any, semantic: any): { errors: any[]; warnings: any[] } {
  const errors: any[] = []
  const warnings: any[] = []

  const CAMERA_PRESETS = new Set(['front', 'top', 'side', 'isometric', 'isometric-back'])
  const BUILTIN_TARGETS = new Set(['geometry', 'vertexLabels', 'cube', 'cuboid', 'tetrahedron'])

  // 收集所有有效点 ID
  const pointIds = collectPointIds(semantic)
  const foldIds = new Set((semantic.folds ?? []).map((f: any) => f.id))
  const measurementIds = new Set((semantic.measurements ?? []).map((m: any) => m.id))

  const sceneIdSet = new Set<string>()
  const elementIdSet = new Set<string>()

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i]
    const scenePath = `scenes[${i}]`

    // 场景 id 唯一性
    if (sceneIdSet.has(scene.id)) {
      errors.push({ type: 'duplicate_id', path: `${scenePath}.id`, message: `场景 id 重复: ${scene.id}` })
    } else {
      sceneIdSet.add(scene.id)
    }

    // showMeasurements 校验
    if (scene.showMeasurements) {
      for (let j = 0; j < scene.showMeasurements.length; j++) {
        const id = scene.showMeasurements[j]
        if (!measurementIds.has(id)) {
          errors.push({ type: 'missing_reference', path: `${scenePath}.showMeasurements[${j}]`, message: `未定义的 measurementId: ${id}` })
        }
      }
    }

    // 相机校验
    if (typeof scene.camera === 'object' && scene.camera.lookAt) {
      const lookAt = scene.camera.lookAt
      if (lookAt !== 'center' && !pointIds.has(lookAt) && !elementIdSet.has(lookAt)) {
        errors.push({ type: 'missing_reference', path: `${scenePath}.camera.lookAt`, message: `lookAt 引用不存在: ${lookAt}` })
      }
    }

    // 动作校验
    validateActionsDeep(scene.actions, {
      basePath: `${scenePath}.actions`,
      pointIds,
      foldIds,
      elementIdSet,
      builtinTargets: BUILTIN_TARGETS,
      errors,
    })
  }

  return { errors, warnings }
}

function validateActionsDeep(actions: any[], ctx: {
  basePath: string
  pointIds: Set<string>
  foldIds: Set<string>
  elementIdSet: Set<string>
  builtinTargets: Set<string>
  errors: any[]
}): void {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    const actionPath = `${ctx.basePath}[${i}]`

    if (!action || typeof action.do !== 'string') continue

    switch (action.do) {
      case 'show':
      case 'hide':
      case 'fadeIn':
      case 'fadeOut':
      case 'highlight':
      case 'pulse': {
        const target = action.target
        if (target && !isKnownTarget(target, ctx.pointIds, ctx.elementIdSet, ctx.builtinTargets)) {
          ctx.errors.push({ type: 'missing_reference', path: `${actionPath}.target`, message: `引用不存在: ${target}` })
        }
        break
      }

      case 'drawLine':
      case 'showPath': {
        if (action.id) ctx.elementIdSet.add(action.id)
        for (const key of ['from', 'to']) {
          const pid = action[key]
          if (pid && !ctx.pointIds.has(pid) && pid !== 'center') {
            ctx.errors.push({ type: 'missing_reference', path: `${actionPath}.${key}`, message: `引用不存在的点: ${pid}` })
          }
        }
        break
      }

      case 'showPlane': {
        if (action.id) ctx.elementIdSet.add(action.id)
        if (Array.isArray(action.points)) {
          for (let j = 0; j < action.points.length; j++) {
            const pid = action.points[j]
            if (!ctx.pointIds.has(pid) && pid !== 'center') {
              ctx.errors.push({ type: 'missing_reference', path: `${actionPath}.points[${j}]`, message: `引用不存在的点: ${pid}` })
            }
          }
        }
        break
      }

      case 'showTetrahedron': {
        if (action.id) ctx.elementIdSet.add(action.id)
        if (Array.isArray(action.vertices)) {
          for (let j = 0; j < action.vertices.length; j++) {
            const pid = action.vertices[j]
            if (!ctx.pointIds.has(pid) && pid !== 'center') {
              ctx.errors.push({ type: 'missing_reference', path: `${actionPath}.vertices[${j}]`, message: `引用不存在的点: ${pid}` })
            }
          }
        }
        break
      }

      case 'animatePoint': {
        const target = action.target
        if (target && !ctx.pointIds.has(target)) {
          ctx.errors.push({ type: 'missing_reference', path: `${actionPath}.target`, message: `animatePoint 引用不存在的点: ${target}` })
        }
        break
      }

      case 'fold': {
        if (action.foldId && !ctx.foldIds.has(action.foldId)) {
          ctx.errors.push({ type: 'invalid_fold_id', path: `${actionPath}.foldId`, message: `foldId 不存在: ${action.foldId}` })
        }
        break
      }

      case 'together': {
        if (Array.isArray(action.actions)) {
          validateActionsDeep(action.actions, { ...ctx, basePath: `${actionPath}.actions` })
        }
        break
      }
    }
  }
}

function isKnownTarget(target: string, pointIds: Set<string>, elementIds: Set<string>, builtinTargets: Set<string>): boolean {
  if (builtinTargets.has(target)) return true
  if (target === 'center') return true
  if (pointIds.has(target)) return true
  if (elementIds.has(target)) return true
  return false
}

function collectPointIds(semantic: any): Set<string> {
  const ids = new Set<string>()

  // 基础顶点
  const type = semantic.baseGeometry?.type
  if (type === 'cube' || type === 'cuboid') {
    for (const v of ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1']) ids.add(v)
  } else if (type === 'tetrahedron' || type === 'square') {
    for (const v of ['A', 'B', 'C', 'D']) ids.add(v)
  }

  // semantic.points
  for (const p of semantic.points ?? []) ids.add(p.id)

  // folds
  for (const f of semantic.folds ?? []) {
    for (const id of f.foldedPoints ?? []) ids.add(id)
    for (const id of f.movingPoints ?? []) ids.add(id)
    if (f.hinge) {
      ids.add(f.hinge[0])
      ids.add(f.hinge[1])
    }
  }

  ids.add('center')
  return ids
}

// =========== 审计主流程 ===========

interface AuditResult {
  imageId: string
  understander: {
    exists: boolean
    schemaErrors: SchemaError[]
  }
  planner: {
    exists: boolean
    hasExplanation: boolean
    hasStoryPlan: boolean
  }
  coder: {
    exists: boolean
    schemaErrors: SchemaError[]
    infraErrors: any[]
    infraWarnings: any[]
  }
  overall: 'PASS' | 'WARN' | 'FAIL'
}

function auditImage(imageId: string): AuditResult {
  const result: AuditResult = {
    imageId,
    understander: { exists: false, schemaErrors: [] },
    planner: { exists: false, hasExplanation: false, hasStoryPlan: false },
    coder: { exists: false, schemaErrors: [], infraErrors: [], infraWarnings: [] },
    overall: 'PASS',
  }

  // 读取 Understander 输出
  const understaderPath = path.join(OUTPUT_DIR, `${imageId}-understander.json`)
  let semanticDef: any = null
  if (fs.existsSync(understaderPath)) {
    result.understander.exists = true
    try {
      semanticDef = JSON.parse(fs.readFileSync(understaderPath, 'utf-8'))
      result.understander.schemaErrors = validateSemanticDefinition(semanticDef)
    } catch (e: any) {
      result.understander.schemaErrors.push({ path: '', message: `JSON 解析失败: ${e.message}` })
    }
  }

  // 读取 Planner 输出
  const plannerPath = path.join(OUTPUT_DIR, `${imageId}-planner.json`)
  if (fs.existsSync(plannerPath)) {
    result.planner.exists = true
    try {
      const plannerData = JSON.parse(fs.readFileSync(plannerPath, 'utf-8'))
      result.planner.hasExplanation = !!plannerData.explanation
      result.planner.hasStoryPlan = !!plannerData.storyPlan
    } catch (e) {
      // ignore
    }
  }

  // 读取 Coder 输出
  const coderPath = path.join(OUTPUT_DIR, `${imageId}-coder.json`)
  if (fs.existsSync(coderPath)) {
    result.coder.exists = true
    try {
      const coderData = JSON.parse(fs.readFileSync(coderPath, 'utf-8'))
      result.coder.schemaErrors = validateAnimationScript(coderData)

      // 如果有 semanticDef，运行基建 Validator
      if (semanticDef && result.coder.schemaErrors.length === 0) {
        const { errors, warnings } = runInfraValidator(coderData, semanticDef)
        result.coder.infraErrors = errors
        result.coder.infraWarnings = warnings
      }
    } catch (e: any) {
      result.coder.schemaErrors.push({ path: '', message: `JSON 解析失败: ${e.message}` })
    }
  }

  // 计算 overall
  const hasErrors =
    !result.understander.exists ||
    !result.planner.exists ||
    !result.coder.exists ||
    result.understander.schemaErrors.length > 0 ||
    result.coder.schemaErrors.length > 0 ||
    result.coder.infraErrors.length > 0

  const hasWarnings = result.coder.infraWarnings.length > 0

  result.overall = hasErrors ? 'FAIL' : hasWarnings ? 'WARN' : 'PASS'

  return result
}

function generateReport(results: AuditResult[]): string {
  const lines: string[] = []

  lines.push('# AI 输出审计报告')
  lines.push('')
  lines.push(`生成时间: ${new Date().toISOString()}`)
  lines.push('')

  // 汇总
  const passed = results.filter(r => r.overall === 'PASS').length
  const warned = results.filter(r => r.overall === 'WARN').length
  const failed = results.filter(r => r.overall === 'FAIL').length

  lines.push('## 汇总')
  lines.push('')
  lines.push(`| 状态 | 数量 |`)
  lines.push(`|------|------|`)
  lines.push(`| PASS | ${passed} |`)
  lines.push(`| WARN | ${warned} |`)
  lines.push(`| FAIL | ${failed} |`)
  lines.push(`| **总计** | **${results.length}** |`)
  lines.push('')

  // 详细结果
  lines.push('## 详细结果')
  lines.push('')

  for (const r of results) {
    const statusEmoji = r.overall === 'PASS' ? '✅' : r.overall === 'WARN' ? '⚠️' : '❌'
    lines.push(`### ${statusEmoji} ${r.imageId}`)
    lines.push('')

    // Understander
    if (!r.understander.exists) {
      lines.push('- **Understander**: 缺失')
    } else if (r.understander.schemaErrors.length > 0) {
      lines.push('- **Understander**: Schema 错误')
      for (const e of r.understander.schemaErrors) {
        lines.push(`  - \`${e.path}\`: ${e.message}`)
      }
    } else {
      lines.push('- **Understander**: ✓')
    }

    // Planner
    if (!r.planner.exists) {
      lines.push('- **Planner**: 缺失')
    } else {
      const issues = []
      if (!r.planner.hasExplanation) issues.push('缺少 explanation')
      if (!r.planner.hasStoryPlan) issues.push('缺少 storyPlan')
      if (issues.length > 0) {
        lines.push(`- **Planner**: ${issues.join(', ')}`)
      } else {
        lines.push('- **Planner**: ✓')
      }
    }

    // Coder
    if (!r.coder.exists) {
      lines.push('- **Coder**: 缺失')
    } else if (r.coder.schemaErrors.length > 0) {
      lines.push('- **Coder**: Schema 错误')
      for (const e of r.coder.schemaErrors) {
        lines.push(`  - \`${e.path}\`: ${e.message}`)
      }
    } else if (r.coder.infraErrors.length > 0) {
      lines.push('- **Coder**: 引用错误')
      for (const e of r.coder.infraErrors) {
        lines.push(`  - \`${e.path}\`: ${e.message}`)
      }
    } else if (r.coder.infraWarnings.length > 0) {
      lines.push('- **Coder**: ✓ (有警告)')
      for (const w of r.coder.infraWarnings) {
        lines.push(`  - \`${w.path}\`: ${w.message}`)
      }
    } else {
      lines.push('- **Coder**: ✓')
    }

    lines.push('')
  }

  // 常见问题统计
  lines.push('## 错误类型统计')
  lines.push('')

  const errorTypes = new Map<string, number>()
  for (const r of results) {
    for (const e of r.coder.infraErrors) {
      const key = e.type || 'unknown'
      errorTypes.set(key, (errorTypes.get(key) || 0) + 1)
    }
  }

  if (errorTypes.size > 0) {
    lines.push('| 错误类型 | 次数 |')
    lines.push('|----------|------|')
    for (const [type, count] of errorTypes) {
      lines.push(`| ${type} | ${count} |`)
    }
  } else {
    lines.push('无基建层错误。')
  }
  lines.push('')

  return lines.join('\n')
}

// =========== 主函数 ===========

async function main() {
  console.log('开始审计 AI 输出...')
  console.log(`输入目录: ${OUTPUT_DIR}\n`)

  // 获取所有测试输出
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error(`错误: ${OUTPUT_DIR} 目录不存在，请先运行测试`)
    process.exit(1)
  }

  const files = fs.readdirSync(OUTPUT_DIR)
  const imageIds = [...new Set(
    files
      .filter(f => f.endsWith('-understander.json'))
      .map(f => f.replace('-understander.json', ''))
  )].sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0')
    const numB = parseInt(b.match(/\d+/)?.[0] || '0')
    return numA - numB
  })

  if (imageIds.length === 0) {
    console.error('错误: 未找到测试输出文件')
    process.exit(1)
  }

  console.log(`找到 ${imageIds.length} 个测试输出\n`)

  // 审计每个输出
  const results: AuditResult[] = []
  for (const imageId of imageIds) {
    process.stdout.write(`审计 ${imageId}... `)
    const result = auditImage(imageId)
    results.push(result)
    console.log(result.overall)
  }

  // 生成报告
  const report = generateReport(results)
  const reportPath = path.join(OUTPUT_DIR, 'audit-report.md')
  fs.writeFileSync(reportPath, report)

  console.log(`\n审计完成，报告已保存到: ${reportPath}`)

  // 控制台汇总
  const passed = results.filter(r => r.overall === 'PASS').length
  const warned = results.filter(r => r.overall === 'WARN').length
  const failed = results.filter(r => r.overall === 'FAIL').length

  console.log(`\n汇总: ${passed} PASS, ${warned} WARN, ${failed} FAIL`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(console.error)
