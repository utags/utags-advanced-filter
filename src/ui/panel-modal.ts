const cn = (s: string) => s

export type PanelModalBuildResult = {
  focusables: HTMLElement[]
  initialFocus?: HTMLElement | undefined
  onConfirm: () => Promise<void> | void
}

export function openPanelModal(opts: {
  shadow: ShadowRoot
  panel: HTMLElement
  title: string
  build: (api: {
    modal: HTMLElement
    content: HTMLElement
    btnCancel: HTMLButtonElement
    btnOk: HTMLButtonElement
    close: () => void
  }) => PanelModalBuildResult
}) {
  const overlay = document.createElement('div')
  overlay.className = cn(
    'fixed z-50 flex items-center justify-center bg-black/30'
  )
  overlay.tabIndex = -1
  const modal = document.createElement('div')
  modal.className = cn('w-[20rem] space-y-2 rounded-md bg-white p-3 shadow-xl')
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-modal', 'true')

  const titleEl = document.createElement('div')
  titleEl.className = cn('text-sm font-semibold text-gray-900')
  titleEl.textContent = opts.title
  const content = document.createElement('div')
  content.className = cn('space-y-2')
  const actions = document.createElement('div')
  actions.className = cn('flex justify-end gap-2 pt-1')
  const btnCancel = document.createElement('button')
  btnCancel.className = cn(
    'rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200'
  )
  btnCancel.textContent = '取消'
  const btnOk = document.createElement('button')
  btnOk.className = cn(
    'rounded-md bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600'
  )
  btnOk.textContent = '确认'
  actions.append(btnCancel)
  actions.append(btnOk)

  modal.append(titleEl)
  modal.append(content)
  modal.append(actions)
  overlay.append(modal)

  const rect = opts.panel.getBoundingClientRect()
  overlay.style.left = `${rect.left}px`
  overlay.style.top = `${rect.top}px`
  overlay.style.width = `${rect.width}px`
  overlay.style.height = `${rect.height}px`
  opts.shadow.append(overlay)

  const close = () => {
    try {
      cleanup()
    } catch {}

    overlay.remove()
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })
  btnCancel.addEventListener('click', close)

  const result = opts.build({ modal, content, btnCancel, btnOk, close })
  const focusables = result.focusables
  const first = focusables[0] || null
  const last = focusables.at(-1) || null
  const initial = result.initialFocus ?? first
  if (initial) {
    initial.focus()
  }

  const onConfirm = async () => {
    const r = result.onConfirm()
    if (r && typeof r.then === 'function') {
      await r
    }

    close()
  }

  btnOk.addEventListener('click', onConfirm)

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      close()
      return
    }

    if (e.key === 'Tab' && focusables.length > 0) {
      const active =
        (opts.shadow.activeElement as HTMLElement | undefined) ||
        (document.activeElement as HTMLElement | undefined)
      if (!active) return
      const idx = focusables.indexOf(active)
      if (e.shiftKey) {
        if (idx <= 0) {
          e.preventDefault()
          if (last) {
            last.focus()
          }
        }
      } else if (idx === focusables.length - 1) {
        e.preventDefault()
        if (first) {
          first.focus()
        }
      }
    }

    if (e.key === 'Enter') {
      const target = e.target as HTMLElement | undefined
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        e.preventDefault()
        void onConfirm()
      }
    }
  }

  const docKeydown = (e: KeyboardEvent) => {
    handleKeydown(e)
  }

  overlay.addEventListener('keydown', handleKeydown, true)
  opts.shadow.addEventListener('keydown', handleKeydown, true)
  document.addEventListener('keydown', docKeydown, true)

  const cleanup = () => {
    overlay.removeEventListener('keydown', handleKeydown, true)
    opts.shadow.removeEventListener('keydown', handleKeydown, true)
    document.removeEventListener('keydown', docKeydown, true)
  }

  return { close }
}
