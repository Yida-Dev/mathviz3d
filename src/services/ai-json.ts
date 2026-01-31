export function parseJsonFromText<T>(text: string): T {
  const raw = (text ?? '').trim()
  if (!raw) {
    throw new Error('AI 返回为空，无法解析 JSON')
  }

  // 优先处理 ```json ... ``` 或 ``` ... ```
  if (raw.startsWith('```')) {
    const firstNewline = raw.indexOf('\n')
    const withoutFence = firstNewline === -1 ? '' : raw.slice(firstNewline + 1)
    const endFence = withoutFence.lastIndexOf('```')
    const inside = endFence === -1 ? withoutFence : withoutFence.slice(0, endFence)
    return parseJsonLoose<T>(inside)
  }

  return parseJsonLoose<T>(raw)
}

/**
 * 修复 LaTeX 转义不一致问题
 *
 * LLM 有时在同一个 JSON 字符串中混用 \\sqrt 和 \sqrt，导致 JSON 解析失败。
 * 例如: "L \\in [\\frac{3\\sqrt{2}}{4}, \\frac{\sqrt{5}}{2}]"
 *                                            ↑ 单反斜杠
 *
 * 该函数将 JSON 字符串值内的单反斜杠 LaTeX 命令补成双反斜杠。
 */
function fixLatexEscapes(raw: string): string {
  // 常见 LaTeX 命令（无反斜杠前缀）
  const latexCommands = [
    'frac', 'sqrt', 'vec', 'cdot', 'neq', 'in', 'Rightarrow', 'Leftarrow',
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
    'theta', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'lambda', 'mu',
    'pi', 'sigma', 'omega', 'phi', 'psi', 'rho', 'tau', 'nu', 'xi', 'eta',
    'sum', 'int', 'lim', 'infty', 'pm', 'times', 'div', 'leq', 'geq',
    'text', 'mathbf', 'mathrm', 'overline', 'underline', 'hat', 'bar',
    'left', 'right', 'partial', 'nabla', 'forall', 'exists', 'subset',
    'supset', 'cup', 'cap', 'ldots', 'cdots', 'vdots', 'ddots',
    'log', 'ln', 'exp', 'min', 'max', 'sup', 'inf', 'det', 'ker', 'dim',
    'triangle', 'angle', 'perp', 'parallel', 'circ', 'bullet', 'star',
    'quad', 'qquad', 'hspace', 'vspace', 'displaystyle', 'textstyle'
  ]

  // 匹配 JSON 字符串内部的单反斜杠 LaTeX 命令
  // (?<!\\) 负向后瞻：确保前面不是反斜杠（即不是已经双反斜杠的情况）
  // \\ 匹配单个反斜杠
  // (command) 捕获 LaTeX 命令名
  const pattern = new RegExp(`(?<!\\\\)\\\\(${latexCommands.join('|')})\\b`, 'g')

  return raw.replace(pattern, '\\\\$1')
}

function parseJsonLoose<T>(text: string): T {
  let s = text.trim()

  // 先尝试修复 LaTeX 转义问题
  s = fixLatexEscapes(s)

  try {
    return JSON.parse(s) as T
  } catch (firstError) {
    // 兜底：截取第一个 { 到最后一个 } 之间的内容
    const start = s.indexOf('{')
    const end = s.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = s.slice(start, end + 1)
      try {
        return JSON.parse(candidate) as T
      } catch {
        // 继续抛出原始错误
      }
    }
    throw new Error(`AI 返回不是合法 JSON：${preview(s)}`)
  }
}

function preview(s: string): string {
  const oneLine = s.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= 200) return oneLine
  return `${oneLine.slice(0, 200)}...`
}

