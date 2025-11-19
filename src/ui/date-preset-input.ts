export type DatePresetState = {
  enabled: boolean
  mode: 'months' | 'days'
  months: number
  days: number
}

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
  root.className = 'flex items-center text-sm'
  const chk = document.createElement('input')
  chk.type = 'checkbox'
  chk.className = 'utaf-checkbox'
  chk.checked = state.enabled
  const pre = document.createElement('span')
  pre.className = 'utaf-label text-sm'
  pre.textContent = opts.preLabel
  const input = document.createElement('input')
  input.className = 'w-24 px-2 py-1 border border-gray-300 rounded-md text-xs'
  const suf = document.createElement('span')
  suf.className = 'text-sm'
  const dropdown = document.createElement('div')
  dropdown.className =
    'bg-white border border-gray-300 rounded-md shadow px-2 py-1 text-sm'
  dropdown.style.position = 'fixed'
  dropdown.style.zIndex = '2147483647'
  dropdown.style.display = 'none'
  dropdown.style.background = '#fff'
  dropdown.style.border = '1px solid #d1d5db'
  dropdown.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'

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
      ? 'w-20 px-2 py-1 border border-gray-300 rounded-md opacity-50 cursor-not-allowed text-xs'
      : 'w-20 px-2 py-1 border border-gray-300 rounded-md text-xs'
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
    item.className = 'px-2 py-1 hover:bg-gray-200 rounded-md cursor-pointer'
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
  pre.addEventListener('click', () => {
    chk.click()
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
