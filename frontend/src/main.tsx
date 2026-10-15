import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/newsreader/400.css'
import '@fontsource/newsreader/500.css'
import '@fontsource/newsreader/600.css'
import '@fontsource/newsreader/400-italic.css'
import 'katex/dist/katex.min.css'
import './styles/app.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
