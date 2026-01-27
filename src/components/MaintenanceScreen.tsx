import './MaintenanceScreen.css'

const hints = ['잠깐 안전 확인 중입니다', 'React 프론트 준비 막바지', '곧 다시 시작합니다']

export default function MaintenanceScreen() {
  return (
    <main className="maintenance-screen">
      <div className="overlay glow" aria-hidden />
      <div className="overlay sparkles" aria-hidden />
      <section className="maintenance-card" role="status">
        <div className="badge">planIt</div>
        <h1>약간 점검중입니다. 이런 느낌?</h1>
        <p className="message">
          프론트는 React 기반 복구 중입니다. 잠시만 기다려 주세요, 곧 planIt이 다시 열린답니다.
        </p>
        <div className="spinner" aria-label="로딩 중" />
        <ul className="hint-list">
          {hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
        <p className="helper">planIt 프론트, 곧 준비 완료</p>
      </section>
    </main>
  )
}
