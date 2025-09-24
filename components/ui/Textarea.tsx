import * as React from 'react'
import { useDebounceCallback } from '@react-hook/debounce'
import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

    React.useImperativeHandle(ref, () => textareaRef.current!)

    const adjustHeight = useDebounceCallback(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
      }
    }, 50)

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e)
        adjustHeight()
      },
      [onChange, adjustHeight]
    )

    React.useEffect(() => {
      adjustHeight()
    }, [])

    return (
      <textarea
        ref={textareaRef}
        className={cn(
          'w-full bg-transparent text-sm placeholder-gray-400/70 resize-none focus:outline-none min-h-[48px] max-h-[120px]',
          className
        )}
        onChange={handleChange}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
