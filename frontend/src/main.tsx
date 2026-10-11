import React from 'react'
import ReactDOM from 'react-dom/client'
import AssistenteConversacional from './assistente_conversacional/AssistenteConversacional'
import './assistente_conversacional/assistente.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AssistenteConversacional />
  </React.StrictMode>,
)
