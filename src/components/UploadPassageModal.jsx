import { useState } from 'react'

const MAX_USER_PASSAGES = 20

export default function UploadPassageModal({ onClose, onUpload, userPassageCount }) {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [content, setContent] = useState('')
  const [passageType, setPassageType] = useState('scripture')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length
  const canSubmit = title.trim().length > 0 && wordCount >= 20
  const remainingSlots = MAX_USER_PASSAGES - userPassageCount

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (wordCount < 20) {
      setError('Passage must be at least 20 words')
      return
    }

    if (remainingSlots <= 0) {
      setError('You have reached the maximum of 20 uploaded passages')
      return
    }

    setSubmitting(true)
    try {
      await onUpload({
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        introduction: introduction.trim() || null,
        content: content.trim(),
        type: passageType
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to upload passage')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Upload New Passage</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-4">
          <p className="text-sm text-gray-500">
            {remainingSlots} of {MAX_USER_PASSAGES} upload slots remaining
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Psalm 23"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g., The Lord is My Shepherd"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={passageType}
              onChange={(e) => setPassageType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="scripture">Scripture</option>
              <option value="poetry">Poetry</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Introduction <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              placeholder="Add context or notes about this passage..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passage Content <span className="text-red-500">*</span>
              <span className={`ml-2 text-sm ${wordCount >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                ({wordCount} words{wordCount < 20 ? ', minimum 20' : ''})
              </span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type your passage here..."
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-serif"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting || remainingSlots <= 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Uploading...' : 'Upload Passage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
