export type DatePresetState = {
  enabled: boolean
  mode: 'months' | 'days'
  months: number
  days: number
}

const cn = (s: string) => s

function monthsToDays(m: number): number {
  if (m === 6) return 182
  if (m === 12) return 365
  if (m === 24) return 730
  return m * 30
}

export function createDatePresetInput(opts: {
  shadow: ShadowRoot
  preLabel: string
  monthsSuffix: string
  daysSuffix: string
  initial: DatePresetState
  onChange: (s: DatePresetState) => void
  onSave: (s: DatePresetState) => Promise<void>
}) {
  let state: DatePresetState = { ...opts.initial }

  const root = document.createElement('div')
  root.className = cn('flex items-center text-sm')
  const chk = document.createElement('input')
  chk.type = 'checkbox'
  chk.className = 'utaf-checkbox utaf-toggle'
  chk.checked = state.enabled
  const chkId = `utaf-datepreset-${Math.random().toString(36).slice(2, 8)}`
  chk.id = chkId
  const pre = document.createElement('label')
  pre.className = cn('utaf-label text-sm')
  // pre.htmlFor = chkId
  pre.textContent = opts.preLabel
  const input = document.createElement('input')
  input.className = cn(
    'w-16 rounded-md border border-gray-300 px-1 py-0.5 text-xs'
  )
  const suf = document.createElement('span')
  suf.className = cn('text-sm')
  const dropdown = document.createElement('div')
  dropdown.className = cn(
    'rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow'
  )
  dropdown.style.position = 'fixed'
  dropdown.style.zIndex = '2147483647'
  dropdown.style.display = 'none'

  function setInputMode() {
    if (state.mode === 'months') {
      input.type = 'text'
      input.readOnly = true
      input.removeAttribute('min')
      input.removeAttribute('step')
      suf.textContent = opts.monthsSuffix
    } else {
      input.type = 'number'
      input.readOnly = false
      input.min = '0'
      input.step = '1'
      suf.textContent = opts.daysSuffix
    }

    input.disabled = !state.enabled
    input.className = input.disabled
      ? cn(
          'w-16 cursor-not-allowed rounded-md border border-gray-300 px-1 py-0.5 text-xs opacity-50'
        )
      : cn('w-16 rounded-md border border-gray-300 px-1 py-0.5 text-xs')
  }

  function setInputDisplay() {
    if (state.mode === 'months') {
      switch (state.months) {
        case 6: {
          input.value = '半年'
          break
        }

        case 12: {
          input.value = '一年'
          break
        }

        case 24: {
          input.value = '两年'
          break
        }

        default: {
          input.value = String(monthsToDays(state.months))
        }
      }
    } else {
      input.value = String(state.days)
    }
  }

  function showDropdown() {
    const rect = input.getBoundingClientRect()
    dropdown.style.left = `${rect.left}px`
    dropdown.style.top = `${rect.bottom + 4}px`
    dropdown.style.display = 'block'
  }

  function hideDropdown() {
    dropdown.style.display = 'none'
  }

  const optsList = [
    { label: '半年', months: 6 },
    { label: '一年', months: 12 },
    { label: '两年', months: 24 },
    { label: '自定义', months: 0 },
  ]

  for (const o of optsList) {
    const item = document.createElement('div')
    item.className = cn('cursor-pointer rounded-md px-2 py-1 hover:bg-gray-200')
    item.textContent = o.label
    item.addEventListener('click', async () => {
      if (o.months > 0) {
        state.mode = 'months'
        state.months = o.months
      } else {
        state.mode = 'days'
      }

      setInputMode()
      setInputDisplay()
      await opts.onSave({
        ...state,
        days: state.mode === 'months' ? state.days : state.days,
      })
      if (state.mode === 'days') {
        input.focus()
        input.select()
      }

      showDropdown()
      opts.onChange({ ...state })
    })
    dropdown.append(item)
  }

  input.addEventListener('focus', showDropdown)
  input.addEventListener('click', showDropdown)
  input.addEventListener('input', showDropdown)
  document.addEventListener('click', (e) => {
    const path = (e as any).composedPath?.() || []
    const insideInput = path.includes(input)
    const insideDropdown = path.includes(dropdown)
    if (!insideInput && !insideDropdown) hideDropdown()
  })
  opts.shadow.addEventListener('click', (e) => {
    const path = (e as any).composedPath?.() || []
    const insideInput = path.includes(input)
    const insideDropdown = path.includes(dropdown)
    if (!insideInput && !insideDropdown) hideDropdown()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideDropdown()
  })

  input.addEventListener('change', async () => {
    if (state.mode === 'days') {
      let v = Number(input.value)
      if (!Number.isFinite(v) || v < 0) v = 90
      state.days = v
      await opts.onSave({ ...state })
      opts.onChange({ ...state })
    }
  })

  chk.addEventListener('change', async () => {
    state.enabled = chk.checked
    setInputMode()
    await opts.onSave({ ...state })
    opts.onChange({ ...state })
  })

  function setState(next: Partial<DatePresetState>) {
    state = { ...state, ...next }
    chk.checked = state.enabled
    setInputMode()
    setInputDisplay()
    void opts.onSave({ ...state })
    opts.onChange({ ...state })
  }

  function setEnabledSilently(enabled: boolean) {
    state.enabled = enabled
    chk.checked = enabled
    setInputMode()
  }

  setInputMode()
  setInputDisplay()

  root.append(chk)
  root.append(pre)
  root.append(input)
  root.append(suf)
  opts.shadow.append(dropdown)

  return { root, setState, setEnabledSilently, getState: () => ({ ...state }) }
}
