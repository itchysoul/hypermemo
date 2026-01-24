/**
 * Modal dialog for selecting passages
 */
export function PassageSelector({ passages, selectedId, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Select Passage</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="space-y-4">
          {passages.map(passage => (
            <button
              key={passage.id}
              onClick={() => onSelect(passage.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                selectedId === passage.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 text-xs rounded ${
                  passage.type === 'poetry' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                }`}>
                  {passage.type}
                </span>
                {selectedId === passage.id && (
                  <span className="text-blue-500 text-sm">✓ Selected</span>
                )}
              </div>
              <h3 className="font-bold text-gray-800">{passage.title}</h3>
              <p className="text-sm text-gray-600">{passage.subtitle}</p>
              {passage.introduction && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{passage.introduction}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PassageSelector
