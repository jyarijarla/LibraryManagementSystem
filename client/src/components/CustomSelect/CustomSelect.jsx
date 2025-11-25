import React, { useState, useRef, useEffect } from 'react'
import './CustomSelect.css'

export default function CustomSelect({ value, onChange, options = [], ariaLabel = '', className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const [highlighted, setHighlighted] = useState(null)

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    // keep highlighted in sync when opening
    if (open) {
      const idx = options.findIndex(o => o.value === value)
      setHighlighted(idx >= 0 ? idx : 0)
    }
  }, [open, options, value])

  const toggle = () => setOpen(o => !o)

  const handleSelect = (opt) => {
    setOpen(false)
    if (onChange) onChange(opt.value)
  }

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault() }
      return
    }
    if (e.key === 'Escape') return setOpen(false)
    if (e.key === 'ArrowDown') {
      setHighlighted(h => Math.min((h ?? -1) + 1, options.length - 1))
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowUp') {
      setHighlighted(h => Math.max((h ?? options.length) - 1, 0))
      e.preventDefault();
      return
    }
    if (e.key === 'Enter' && highlighted != null) {
      const opt = options[highlighted]
      if (opt) handleSelect(opt)
      e.preventDefault()
    }
  }

  const selectedLabel = (() => {
    const found = options.find(o => o.value === value)
    return found ? found.label : ''
  })()

  return (
    <div className={`custom-dropdown ${className}`} ref={ref} onKeyDown={onKeyDown} tabIndex={0} aria-label={ariaLabel}>
      <button type="button" className="filter-select" onClick={toggle} aria-haspopup="listbox" aria-expanded={open}>
        <span style={{ pointerEvents: 'none' }}>{selectedLabel}</span>
      </button>
      {open && (
        <div className="custom-list" role="listbox">
          {options.map((opt, i) => (
            <div
              key={String(opt.value) + i}
              role="option"
              aria-selected={opt.value === value}
              className={`custom-item ${opt.value === value ? 'selected' : ''} ${highlighted === i ? 'highlighted' : ''}`}
              onClick={() => handleSelect(opt)}
              onMouseEnter={() => setHighlighted(i)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
