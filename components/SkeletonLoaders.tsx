export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-md animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  )
}

export function DocumentSkeleton() {
  return (
    <div className="p-3 sm:p-4 rounded-lg border border-[#E2E8F0] animate-pulse">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      </div>
    </div>
  )
}

export function ListItemSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-[#E2E8F0] animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  )
}

export function FlashcardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 sm:p-8 shadow-md animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
      <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
        <div className="space-y-4 w-3/4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton />
      <CardSkeleton />
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-md animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          <DocumentSkeleton />
          <DocumentSkeleton />
          <DocumentSkeleton />
        </div>
      </div>
    </div>
  )
}

export function ContentSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 sm:p-8 shadow-md animate-pulse">
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        <div className="h-64 bg-gray-100 rounded-lg mt-6"></div>
      </div>
    </div>
  )
}
