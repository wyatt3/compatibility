interface Props {
  code?: string
}

export function Header({ code }: Props) {
  return (
    <header className="app-header">
      {code && <span className="code-chip">{code}</span>}
    </header>
  )
}