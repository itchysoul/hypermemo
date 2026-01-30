import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function MySelectionsProgram({ 
  user, 
  userPassages, 
  userProgram, 
  setUserProgram,
  passages,
  onSelectPassage,
  onClose 
}) {
  const [editingId, setEditingId] = useState(null)
  const [editDueDate, setEditDueDate] = useState('')
  const [editDueDateDisplay, setEditDueDateDisplay] = useState('')
  const [showAddPassage, setShowAddPassage] = useState(false)

  const programPassages = userProgram.map(up => {
    const passage = passages.find(p => p.id === up.passage_id)
    return { ...up, passage }
  }).filter(up => up.passage)

  const availablePassages = userPassages.filter(
    p => !userProgram.some(up => up.passage_id === p.id)
  )

  const handleAddToProgram = async (passageId) => {
    try {
      const { data, error } = await supabase
        .from('user_programs')
        .insert({
          user_id: user.id,
          passage_id: passageId,
          sort_order: userProgram.length
        })
        .select()
        .single()
      
      if (error) throw error
      setUserProgram(prev => [...prev, data])
      setShowAddPassage(false)
    } catch (err) {
      console.error('Failed to add to program:', err)
    }
  }

  const handleRemoveFromProgram = async (programId) => {
    try {
      const { error } = await supabase
        .from('user_programs')
        .delete()
        .eq('id', programId)
      
      if (error) throw error
      setUserProgram(prev => prev.filter(p => p.id !== programId))
    } catch (err) {
      console.error('Failed to remove from program:', err)
    }
  }

  const handleSaveDueDate = async (programId) => {
    try {
      const { error } = await supabase
        .from('user_programs')
        .update({
          due_date: editDueDate || null,
          due_date_display: editDueDateDisplay || null
        })
        .eq('id', programId)
      
      if (error) throw error
      setUserProgram(prev => prev.map(p => 
        p.id === programId 
          ? { ...p, due_date: editDueDate || null, due_date_display: editDueDateDisplay || null }
          : p
      ))
      setEditingId(null)
    } catch (err) {
      console.error('Failed to save due date:', err)
    }
  }

  const startEditing = (program) => {
    setEditingId(program.id)
    setEditDueDate(program.due_date || '')
    setEditDueDateDisplay(program.due_date_display || '')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">My Own Selections</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {userPassages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>You haven't uploaded any passages yet.</p>
              <p className="text-sm mt-2">Upload passages to create your own memory program!</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Manage your personal memory selections with custom due dates.
              </p>

              {programPassages.length > 0 && (
                <div className="space-y-3 mb-6">
                  {programPassages.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-400 text-sm w-6">{index + 1}.</span>
                      <div className="flex-1">
                        <button
                          onClick={() => {
                            onSelectPassage(item.passage.id)
                            onClose()
                          }}
                          className="font-medium text-gray-800 hover:text-blue-600 text-left"
                        >
                          {item.passage.title}
                        </button>
                        {editingId === item.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="date"
                              value={editDueDate}
                              onChange={(e) => setEditDueDate(e.target.value)}
                              className="px-2 py-1 text-sm border rounded"
                            />
                            <input
                              type="text"
                              value={editDueDateDisplay}
                              onChange={(e) => setEditDueDateDisplay(e.target.value)}
                              placeholder="Display text (e.g., Feb 2026)"
                              className="px-2 py-1 text-sm border rounded flex-1"
                            />
                            <button
                              onClick={() => handleSaveDueDate(item.id)}
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-xs bg-gray-200 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            {item.due_date_display || item.due_date ? (
                              <span className="text-sm text-blue-600">
                                Due: {item.due_date_display || item.due_date}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">No due date</span>
                            )}
                            <button
                              onClick={() => startEditing(item)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveFromProgram(item.id)}
                        className="text-red-400 hover:text-red-600 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddPassage ? (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Add passage to program</h4>
                  {availablePassages.length === 0 ? (
                    <p className="text-sm text-gray-500">All your passages are already in the program.</p>
                  ) : (
                    <div className="space-y-2">
                      {availablePassages.map(passage => (
                        <button
                          key={passage.id}
                          onClick={() => handleAddToProgram(passage.id)}
                          className="w-full text-left p-2 rounded hover:bg-gray-100 flex items-center gap-2"
                        >
                          <span className="text-green-500">+</span>
                          <span>{passage.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowAddPassage(false)}
                    className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddPassage(true)}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
                >
                  + Add passage to program
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
