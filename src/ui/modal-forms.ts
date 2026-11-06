import { i } from '../messages'
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
  idLabel.textContent = i('form.authorId')
  const idInput = document.createElement('input')
  idInput.type = 'text'
  idInput.placeholder = i('form.authorId')
  idInput.className = cn(
    'h-6 w-full rounded-md border border-gray-300 px-2 text-xs'
  )

  const nameLabel = document.createElement('div')
  nameLabel.className = cn('utaf-label text-xs')
  nameLabel.textContent = i('form.authorName')
  const nameInput = document.createElement('input')
  nameInput.type = 'text'
  nameInput.placeholder = i('form.authorName')
  nameInput.className = cn(
    'h-6 w-full rounded-md border border-gray-300 px-2 text-xs'
  )

  const scoreLabel = document.createElement('div')
  scoreLabel.className = cn('utaf-label text-xs')
  scoreLabel.textContent = i('filter.score')
  const scoreInput = document.createElement('input')
  scoreInput.type = 'number'
  scoreInput.min = '0'
  scoreInput.step = '1'
  scoreInput.placeholder = i('filter.score')
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
  kwLabel.textContent = i('filter.keyword')
  const kwInput = document.createElement('input')
  kwInput.type = 'text'
  kwInput.placeholder = i('filter.keyword')
  kwInput.className = cn(
    'h-6 w-full rounded-md border border-gray-300 px-2 text-xs'
  )

  const kwHint = document.createElement('div')
  kwHint.className = cn('text-xs text-gray-500')
  kwHint.textContent = i('form.keywordHint')

  const scLabel = document.createElement('div')
  scLabel.className = cn('utaf-label text-xs')
  scLabel.textContent = i('filter.score')
  const scInput = document.createElement('input')
  scInput.type = 'number'
  scInput.min = '0'
  scInput.step = '1'
  scInput.placeholder = i('filter.score')
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
