import { Fragment } from 'react'

export function SubtitleBar(props: { subtitle: string }) {
  const { subtitle } = props
  if (!subtitle) return null

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[calc(100%-48px)]" data-testid="subtitle-bar">
      <div className="bg-black/75 backdrop-blur-md rounded-xl px-6 py-3 shadow-2xl">
        <div className="text-white text-base font-medium text-center leading-relaxed">{renderSubtitle(subtitle)}</div>
      </div>
    </div>
  )
}

function renderSubtitle(text: string) {
  // 轻量强调：将 P/Q 文字上色（不会影响内容本身）
  const parts = text.split(/(P|Q)/g)
  return (
    <>
      {parts.map((p, idx) => {
        if (p === 'P') {
          return (
            <span key={idx} className="text-orange-400 font-bold">
              P
            </span>
          )
        }
        if (p === 'Q') {
          return (
            <span key={idx} className="text-teal-300 font-bold">
              Q
            </span>
          )
        }
        return <Fragment key={idx}>{p}</Fragment>
      })}
    </>
  )
}
