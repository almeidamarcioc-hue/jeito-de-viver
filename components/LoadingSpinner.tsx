export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full py-12">
      <div
        style={{ borderTopColor: '#002347' }}
        className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin"
      />
    </div>
  )
}
