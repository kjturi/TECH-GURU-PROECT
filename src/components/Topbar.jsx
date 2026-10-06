export default function Topbar({ title, search, onSearchChange, searchPlaceholder = 'Search assets...' }) {
  return (
    <div className="topbar">
      <h1>{title}</h1>
      {onSearchChange && (
        <div className="search-box">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
      )}
    </div>
  )
}
