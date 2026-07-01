type Status = 'in_stock' | 'low_stock' | 'sold_out'

const statusConfig = {
  in_stock: { label: 'במלאי', className: 'status-in-stock' },
  low_stock: { label: 'מלאי נמוך', className: 'status-low-stock' },
  sold_out: { label: 'אזל מהמלאי', className: 'status-sold-out' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] || statusConfig.in_stock
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  )
}
