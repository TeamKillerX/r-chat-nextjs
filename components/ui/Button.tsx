import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'
  size?: 'sm' | 'default' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'

    const variantStyles = {
      primary: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 focus:ring-purple-400',
      secondary: 'bg-gray-800/60 text-gray-300 border border-gray-700 hover:text-white hover:border-red-500 focus:ring-red-400',
      destructive: 'bg-red-600/80 text-white hover:bg-red-700/90 focus:ring-red-400',
      ghost: 'bg-transparent text-white hover:bg-white/10 focus:ring-white/20',
    }

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm',
      default: 'px-4 py-2 text-sm',
      icon: 'p-2 w-10 h-10',
    }

    return (
      <button
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
