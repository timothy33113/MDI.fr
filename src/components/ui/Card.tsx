import React from 'react'
import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  onClick
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-200/60 transition-all duration-200',
        paddingClasses[padding],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export default Card
