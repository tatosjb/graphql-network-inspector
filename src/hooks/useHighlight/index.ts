import { useEffect, useState } from "react"
import hljs from "highlight.js"

type Language = "json" | "graphql"

export interface MessagePayload {
  language: Language
  code: string
}

const createWorker = () => {
  try {
    return new Worker(new URL("./worker.ts", import.meta.url))
  } catch (e) {
    return undefined
  }
}

/**
 * Highlight the text in a worker thread and return the resulting markup.
 * This provides a performant async way to render the given text.
 *
 * @param language the language to highlight against
 * @param code the code to highlight
 * @returns
 */
export const useHighlight = (language: Language, code: string) => {
  const [loading, setLoading] = useState(false)
  const [markup, setMarkup] = useState("")

  useEffect(() => {
    const highlightOnMainThread = () => {
      const result = hljs.highlight(code, { language })
      setMarkup(result.value)
      setLoading(false)
    }

    // Highlight small code blocks in the main thread
    if (code.length < 500) {
      highlightOnMainThread()
      return
    }

    // Highlight large code blocks in a worker thread
    const worker = createWorker()
    if (!worker) {
      highlightOnMainThread()
      return
    }

    worker.onmessage = (event) => {
      setLoading(false)
      setMarkup(event.data)
    }

    setLoading(true)
    const messagePayload: MessagePayload = { language, code }
    worker.postMessage(messagePayload)

    return () => {
      worker.terminate()
    }
  }, [setLoading, setMarkup, language, code])

  return { markup, loading }
}
