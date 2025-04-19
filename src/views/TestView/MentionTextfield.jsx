import { useEffect, useRef, useState } from 'react'
import './MentionTextfield.css' // We'll assume a CSS file for basic styling

// Helper function to render text with highlighting

const MentionTextfield = ({ initialTask = {}, onCancel, onAddTask }) => {
  // State to hold the task details
  const [taskTitle, setTaskTitle] = useState(initialTask.title || '')
  const [taskDescription, setTaskDescription] = useState(
    initialTask.description || '',
  )
  const [selectedDate, setSelectedDate] = useState(initialTask.date || null)
  const [selectedPriority, setSelectedPriority] = useState(
    initialTask.priority || null,
  )
  const [selectedLabels, setSelectedLabels] = useState(initialTask.labels || [])
  const [reminders, setReminders] = useState(initialTask.reminders || [])
  const [selectedProject, setSelectedProject] = useState(
    initialTask.project || 'Inbox',
  )

  const [cursorPosition, setCursorPosition] = useState(0) // State to track cursor position
  const [showCursor, setShowCursor] = useState(false) // State to toggle cursor visibility

  // Ref for the input field (if needed for more advanced handling)
  const titleInputRef = useRef(null)

  // Effect to update bottom tags based on title parsing
  useEffect(() => {
    // Basic parsing logic
    const lowerCaseTitle = taskTitle.toLowerCase()
    const extractedDate = lowerCaseTitle.includes('tomorrow')
      ? 'Tomorrow'
      : null

    const labelMatches = taskTitle.match(/@(\w+)/g)
    const extractedLabels = labelMatches
      ? labelMatches.map(match => match.substring(1))
      : []

    const priorityMatch = taskTitle.match(/P(\d)/)
    const extractedPriority = priorityMatch ? `P${priorityMatch[1]}` : null

    setSelectedDate(extractedDate)
    setSelectedLabels(extractedLabels)
    setSelectedPriority(extractedPriority)
  }, [taskTitle]) // Re-run effect when taskTitle changes

  // Handlers for removing attributes (same as before)
  const removeDate = () => setSelectedDate(null) // Note: This won't remove from the input field text
  const removePriority = () => setSelectedPriority(null) // Note: This won't remove from the input field text
  const removeLabel = labelToRemove => {
    // Note: This won't remove from the input field text
    setSelectedLabels(selectedLabels.filter(label => label !== labelToRemove))
  }
  const removeReminder = reminderToRemove => {
    setReminders(reminders.filter(reminder => reminder !== reminderToRemove))
  }

  const handleAddTask = () => {
    const newTask = {
      title: taskTitle,
      description: taskDescription,
      date: selectedDate, // These come from the parsing effect
      priority: selectedPriority, // These come from the parsing effect
      labels: selectedLabels, // These come from the parsing effect
      reminders: reminders,
      project: selectedProject,
    }
    onAddTask(newTask) // Call the provided add task function
  }
  const renderHighlightedText = (text, position) => {
    const parts = []
    let lastIndex = 0

    // Regex to find patterns: Tomorrow, @label, P followed by a digit
    const regex = /(Tomorrow)|(@\w+)|(P\d)/gi
    let match

    while ((match = regex.exec(text)) !== null) {
      const matchedText = match[0]
      const matchIndex = match.index

      // Add text before the match
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex))
      }

      // Add the highlighted part
      let className = ''
      if (matchedText.toLowerCase() === 'tomorrow') {
        className = 'highlight-date'
      } else if (matchedText.startsWith('@')) {
        className = 'highlight-label'
      } else if (matchedText.startsWith('P')) {
        className = 'highlight-priority'
      }

      parts.push(
        <span key={matchIndex} className={className}>
          {matchedText}
        </span>,
      )

      lastIndex = regex.lastIndex
    }

    // Add any remaining text after the last match
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return <div>{parts}</div>
  }

  return (
    <div className='task-editor-container'>
      <div className='task-input h-20 overflow-auto rounded border'>
        <textarea
          type='text'
          className='smart-task-input smart-task-common'
          rows={100}
          placeholder='Tomorrow do some task with @test_label and P3'
          value={taskTitle}
          onChange={e => setTaskTitle(e.target.value)}
          // onKeyUp={e => {
          //   setCursorPosition(e.target.selectionStart)
          // }}
          // onKeyDown={e => {
          //   setCursorPosition(e.target.selectionStart)
          // }}
          onBlur={() => setShowCursor(false)}
          onFocus={() => setShowCursor(true)}
          ref={titleInputRef}
          // style={{ opacity: 0, position: 'absolute', zIndex: -1 }}
        />
        {/* Display Area with Highlighting */}
        <div
          className='smart-task-display smart-task-common'
          onClick={e => {
            const range = document.caretRangeFromPoint(e.clientX, e.clientY)
            if (range) {
              setCursorPosition(range.startOffset)

              const offset = range.startOffset

              titleInputRef.current.focus()
              titleInputRef.current.setSelectionRange(offset, offset)
            }
          }}
        >
          {renderHighlightedText(taskTitle, cursorPosition)}
        </div>
      </div>
      {/* Description Area */}
      <textarea
        className='task-description-input'
        placeholder='Description'
        value={taskDescription}
        onChange={e => setTaskDescription(e.target.value)}
      />
      {/* Attributes/Tags Display (same as before, updated by useEffect) */}
      <div className='task-attributes'>
        {selectedDate && (
          <div className='attribute-tag'>
            🗓️ {selectedDate}{' '}
            <span className='remove-tag' onClick={removeDate}>
              ×
            </span>
          </div>
        )}
        {selectedPriority && (
          <div className='attribute-tag'>
            🚩 {selectedPriority}{' '}
            <span className='remove-tag' onClick={removePriority}>
              ×
            </span>
          </div>
        )}
        {reminders.map((reminder, index) => (
          <div key={index} className='attribute-tag'>
            ⏰ {reminder}{' '}
            <span
              className='remove-tag'
              onClick={() => removeReminder(reminder)}
            >
              ×
            </span>
          </div>
        ))}
        {selectedLabels.map((label, index) => (
          <div key={index} className='attribute-tag'>
            🏷️ {label}{' '}
            <span className='remove-tag' onClick={() => removeLabel(label)}>
              ×
            </span>
          </div>
        ))}
        {/* More options button - static for this example */}
        <div className='attribute-tag'>...</div>
      </div>
      {/* Project Selection and Action Buttons (same as before) */}
      <div className='task-actions'>
        <div className='project-select'>
          {/* In a real app, this would be a more robust dropdown */}
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
          >
            <option value='Inbox'>📥 Inbox</option>
            {/* Add other project options here */}
          </select>
        </div>
        <div className='action-buttons'>
          <button className='cancel-button' onClick={onCancel}>
            Cancel
          </button>
          <button className='add-task-button' onClick={handleAddTask}>
            Add task
          </button>
        </div>
      </div>
    </div>
  )
}

export default MentionTextfield
