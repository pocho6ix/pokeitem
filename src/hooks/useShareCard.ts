'use client'

import { useRef, useCallback, useState } from 'react'

export function useShareCard() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generate = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null
    setIsGenerating(true)

    try {
      // Dynamically import html2canvas to keep bundle lean
      const html2canvas = (await import('html2canvas')).default

      // Wait for fonts
      await document.fonts.ready

      const canvas = await html2canvas(cardRef.current, {
        scale: 1,
        backgroundColor: null,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: 1080,
        height: 1920,
      })

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Canvas to blob failed'))),
          'image/png',
          1
        )
      })
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const share = useCallback(
    async (filename: string, shareText: string) => {
      const blob = await generate()
      if (!blob) return

      const file = new File([blob], filename, { type: 'image/png' })

      // 1. Web Share API (mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ text: shareText, files: [file] })
          return
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
        }
      }

      // 2. Clipboard API (desktop)
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        return
      } catch {
        // not supported
      }

      // 3. Download fallback
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    [generate]
  )

  return { cardRef, isGenerating, share }
}
