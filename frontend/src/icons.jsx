// 全站统一线性图标：蓝灰描边（currentColor）+ 青色点缀（参考用户提供的图标风格）
import React from 'react'

const ACCENT = '#5FD4D0'

function Base({ children, size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  )
}

// ✦ 星形 sparkle（Logo / AI）
export function SparkIcon(props) {
  return (
    <Base {...props}>
      <path d="M11 4l1.7 4.8 4.8 1.7-4.8 1.7L11 17l-1.7-4.8-4.8-1.7 4.8-1.7z" />
      <path d="M18 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" stroke={ACCENT} />
    </Base>
  )
}

// ⌂ 首页
export function HomeIcon(props) {
  return (
    <Base {...props}>
      <path d="M4 10.5L12 4l8 6.5" />
      <path d="M6 9v10a1 1 0 001 1h10a1 1 0 001-1V9" />
      <path d="M10 20v-5.5h4V20" stroke={ACCENT} />
    </Base>
  )
}

// ▣ 内容生产中心（文档 + 铅笔）
export function DocPenIcon(props) {
  return (
    <Base {...props}>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h4" />
      <path d="M14 3h3a2 2 0 012 2v3" />
      <path d="M8 8h6M8 12h4" />
      <path d="M13.5 20.5l3-1 4-4a1.8 1.8 0 00-2.5-2.5l-4 4-1 3z" stroke={ACCENT} />
    </Base>
  )
}

// ◇ 品牌知识库（书 + 书签）
export function BookIcon(props) {
  return (
    <Base {...props}>
      <path d="M5 19.5V5a2 2 0 012-2h12v14H7.5A2.5 2.5 0 005 19.5z" />
      <path d="M5 19.5A2.5 2.5 0 017.5 22H19v-5" />
      <path d="M10 3v5l2.2-1.4L14.5 8V3" stroke={ACCENT} />
    </Base>
  )
}

// ◎ AI 助手（气泡 + 三点）
export function ChatIcon(props) {
  return (
    <Base {...props}>
      <path d="M4 5h16a2 2 0 012 2v7a2 2 0 01-2 2h-8l-4.5 3.5V16H4a2 2 0 01-2-2V7a2 2 0 012-2z" />
      <circle cx="8.5" cy="10.5" r="0.9" fill={ACCENT} stroke="none" />
      <circle cx="12" cy="10.5" r="0.9" fill={ACCENT} stroke="none" />
      <circle cx="15.5" cy="10.5" r="0.9" fill={ACCENT} stroke="none" />
    </Base>
  )
}

// ⚙ 设置（齿轮）
export function GearIcon(props) {
  return (
    <Base {...props}>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      <circle cx="12" cy="12" r="3" stroke={ACCENT} />
    </Base>
  )
}

// ▦ 接入平台（四宫格）
export function GridIcon(props) {
  return (
    <Base {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke={ACCENT} />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke={ACCENT} />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </Base>
  )
}

// 禁止元素（盾牌 + 勾）
export function ShieldIcon(props) {
  return (
    <Base {...props}>
      <path d="M12 3l7 2.8v5.4c0 4.3-2.9 7.2-7 8.8-4.1-1.6-7-4.5-7-8.8V5.8z" />
      <path d="M9.5 11.5l2 2 3.5-3.5" stroke={ACCENT} />
    </Base>
  )
}

// 连接状态（同心圆信号）
export function StatusIcon(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" stroke={ACCENT} />
      <circle cx="12" cy="12" r="1.2" fill={ACCENT} stroke="none" />
    </Base>
  )
}

// 加号（新增）
export function PlusIcon(props) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  )
}

// 删除（垃圾桶）
export function TrashIcon(props) {
  return (
    <Base {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
      <path d="M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
      <path d="M10 11v6M14 11v6" stroke={ACCENT} />
    </Base>
  )
}
