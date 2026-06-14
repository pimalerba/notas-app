import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdatePrompt.css'

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="update-prompt" role="alert" aria-live="polite">
      <span className="update-prompt-msg">✦ Nova versão disponível</span>
      <button
        className="update-prompt-btn"
        onClick={() => updateServiceWorker(true)}
      >
        Atualizar
      </button>
    </div>
  )
}
