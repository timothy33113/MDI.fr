import React from 'react'
import { LucideIcon } from 'lucide-react'

interface Section<T extends string> {
  id: T
  label: string
  icon: LucideIcon
}

interface SectionNavigationProps<T extends string> {
  sections: Section<T>[]
  activeSection: T
  onSectionChange: (section: T) => void
}

export function SectionNavigation<T extends string>({
  sections,
  activeSection,
  onSectionChange
}: SectionNavigationProps<T>) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-4 flex-wrap">
        {sections.map(section => {
          const Icon = section.icon
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeSection === section.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {section.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
