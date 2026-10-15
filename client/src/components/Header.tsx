interface Props {
  code?: string
}

export function Header({ code }: Props) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        {code && <span className="code-chip">{code}</span>}
      </div>
    </header>
  )
}