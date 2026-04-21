interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: string
}

export default function PageHeader({ title, subtitle, icon }: PageHeaderProps) {
  return (
    <div
      style={{ borderLeft: '4px solid #C5A059', backgroundColor: '#ffffff' }}
      className="rounded-xl shadow-sm px-6 py-4 mb-6 flex items-center gap-4"
    >
      {icon && (
        <span className="text-3xl leading-none">{icon}</span>
      )}
      <div>
        <h1 style={{ color: '#002347' }} className="text-2xl font-bold leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: '#8a94a6' }} className="text-sm mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
