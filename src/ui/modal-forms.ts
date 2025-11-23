import { cn } from '../utils'
import {
  getNumberInputOrDefault,
  normalizeText,
  setDefaultNumber,
} from './form-helpers'

export type AuthorForm = {
  idInput: HTMLInputElement
  nameInput: HTMLInputElement
  scoreInput: HTMLInputElement
  focusables: HTMLElement[]
  initialFocus: HTMLElement
  appendTo: (container: HTMLElement) => void
  getValues: () => { id: string; name: string; score: number }
}

export function buildAuthorForm(defaultScore: number): AuthorForm {
  const idLabel = document.createElement('div')
  idLabel.className = cn('utaf-label text-xs')
  idLabel.textContent = '作者ID'
  const idInput = document.createElement('input')
  idInput.type = 'text'
  idInput.placeholder = '作者ID'
  idInput.className = cn(
    'h-6 w-full rounded-md border border-gray-300 px-2 text-xs'
  )

  const nameLabel = document.createElement('div')
  nameLabel.className = cn('utaf-label text-xs')
  nameLabel.textContent = '作者名'
  const nameInput = document.createElement('input')
  nameInput.type = 'text'
  nameInput.placeholder = '作者名'
  nameInput.className = cn(
    'h-6 w-full rounded-md border border-gray-300 px-2 text-xs'
  )

  const scoreLabel = document.createElement('div')
  scoreLabel.className = cn('utaf-label text-xs')
  scoreLabel.textContent = '分数'
  const scoreInput = document.createElement('input')
  scoreInput.type = 'number'
  scoreInput.min = '0'
  scoreInput.step = '1'
  scoreInput.placeholder = '分数'
  scoreInput.className = cn(
    'h-6 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-2 text-right text-xs'
  )
  setDefaultNumber(scoreInput, defaultScore)

  return {
    idInput,
    nameInput,
    scoreInput,
    focusables: [idInput, nameInput, scoreInput],
    initialFocus: idInput,
    appendTo(container: HTMLElement) {
      container.append(idLabel)
      container.append(idInput)
      container.append(nameLabel)
      container.append(nameInput)
      container.append(scoreLabel)
      container.append(scoreInput)
    },
    getValues() {
      const id = normalizeText(idInput.value)
      const name = normalizeText(nameInput.value)
      const score = getNumberInputOrDefault(scoreInput, defaultScore)
      return { id, name, score }
    },
  }
}

export type KeywordForm = {
  kwInput: HTMLInputElement
  scoreInput: HTMLInputElement
  focusables: HTMLElement[]
  initialFocus: HTMLElement
  appendTo: (container: HTMLElement) => void
  getValues: () => { kw: string; score: number }
}

export function buildKeywordForm(defaultScore: number): KeywordForm {
  const kwLabel = document.createElement('div')
  kwLabel.className = cn('utaf-label text-xs')
  kwLabel.textContent = '关键字'
  const kwInput = document.createElement('input')
  kwInput.type = 'text'
  kwInput.placeholder = '关键字'
  kwInput.className = cn(
    'h-6 w-full rounded-md border border-gray-300 px-2 text-xs'
  )

  const kwHint = document.createElement('div')
  kwHint.className = cn('text-xs text-gray-500')
  kwHint.textContent = '支持正则表达式（格式：/pattern/flags）'

  const scLabel = document.createElement('div')
  scLabel.className = cn('utaf-label text-xs')
  scLabel.textContent = '分数'
  const scInput = document.createElement('input')
  scInput.type = 'number'
  scInput.min = '0'
  scInput.step = '1'
  scInput.placeholder = '分数'
  scInput.className = cn(
    'h-6 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-2 text-right text-xs'
  )
  setDefaultNumber(scInput, defaultScore)

  return {
    kwInput,
    scoreInput: scInput,
    focusables: [kwInput, scInput],
    initialFocus: kwInput,
    appendTo(container: HTMLElement) {
      container.append(kwLabel)
      container.append(kwInput)
      container.append(kwHint)
      container.append(scLabel)
      container.append(scInput)
    },
    getValues() {
      const kw = normalizeText(kwInput.value)
      const score = getNumberInputOrDefault(scInput, defaultScore)
      return { kw, score }
    },
  }
}
