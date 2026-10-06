import { useState } from 'react'

const OTHER = '__other__'

/**
 * Dropdown for a free-text profile field whose choices an admin manages
 * (e.g. BU, SBU). Falls back to a plain text box while the list is
 * empty, keeps a value that's no longer in the list, and offers "Other…" so
 * nobody is blocked by a missing option.
 */
export default function ListSelect({ id, value, onChange, options, placeholder, className }) {
  const listed = options.includes(value)
  // 'Other' is shown when the user picked it, or the saved value isn't in
  // the list (derived, so it stays right after the list finishes loading).
  const [otherChosen, setOtherChosen] = useState(false)
  const otherMode = otherChosen || (!!value && !listed)

  if (options.length === 0) {
    return <input id={id} className={className} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  }

  const selectValue = otherMode ? OTHER : listed ? value : ''

  return (
    <div className="list-select">
      <select
        id={id}
        className={className}
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOtherChosen(true)
            onChange('')
          } else {
            setOtherChosen(false)
            onChange(e.target.value)
          }
        }}
      >
        <option value="">{placeholder ? `Select ${placeholder}` : 'Select…'}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value={OTHER}>Other (not listed)…</option>
      </select>
      {otherMode && (
        <input
          className={className}
          placeholder={`Type your ${placeholder || 'answer'}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )}
    </div>
  )
}
