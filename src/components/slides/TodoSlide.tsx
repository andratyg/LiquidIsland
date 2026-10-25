import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../../store/useSystemStore';
import { playWaterDrop, playToggleClick, playGlassPop } from '../../utils/sfx';
import type { TodoTaskItem } from '../../types/liquid';
import {
  Check,
  Plus,
  Edit2,
  Trash2,
  X,
  ListTodo,
} from 'lucide-react';

export const TodoSlide: React.FC = () => {
  const todoTasks = useSystemStore((s) => s.todoTasks ?? []);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  // Counter calculations: e.g. "4/5"
  const totalTasks = todoTasks.length;
  const completedTasks = todoTasks.filter((t: TodoTaskItem) => t.completed).length;
  const counterText = `${completedTasks}/${totalTasks}`;
  const progressRatio = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Toggle task completion
  const handleToggle = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playWaterDrop();
    systemStore.toggleTodoTask(id);
  }, []);

  // Delete task in edit mode
  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    systemStore.deleteTodoTask(id);
  }, []);

  // Open inline Add Task input
  const handleOpenAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    setIsAddingTask(true);
    setTimeout(() => {
      addInputRef.current?.focus();
    }, 40);
  }, []);

  // Commit new task
  const handleCommitAdd = useCallback(() => {
    const trimmed = newTaskText.trim();
    if (trimmed) {
      playGlassPop();
      systemStore.addTodoTask(trimmed);
      setNewTaskText('');
    }
    setIsAddingTask(false);
  }, [newTaskText]);

  // Cancel Add Task
  const handleCancelAdd = useCallback(() => {
    setNewTaskText('');
    setIsAddingTask(false);
  }, []);

  // Key press in Add input
  const handleAddKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCommitAdd();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelAdd();
      }
    },
    [handleCommitAdd, handleCancelAdd]
  );

  // Toggle Edit Mode
  const handleToggleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    setIsEditingMode((prev) => !prev);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: '0 6px',
        boxSizing: 'border-box',
        gap: '12px',
        userSelect: 'none',
      }}
    >
      {/* ==================================================================== */}
      {/* 1. Left Summary Column (138px width)                                 */}
      {/* ==================================================================== */}
      <div
        style={{
          width: '138px',
          minWidth: '138px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '5px',
          paddingLeft: '2px',
          boxSizing: 'border-box',
        }}
      >
        {/* Large Dynamic Counter: e.g. "4/5" */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span
            style={{
              fontSize: '29px',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.5px',
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {counterText}
          </span>
          {completedTasks === totalTasks && totalTasks > 0 && (
            <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700 }}>
              ★ Done
            </span>
          )}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '10.5px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            letterSpacing: '0.1px',
            lineHeight: 1.2,
          }}
        >
          Task Done Today
        </div>

        {/* Mini Emerald Progress Bar */}
        <div
          style={{
            width: '100px',
            height: '3px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            margin: '1px 0 3px',
          }}
        >
          <motion.div
            initial={false}
            animate={{ width: `${progressRatio}%` }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              height: '100%',
              backgroundColor: '#22c55e',
              borderRadius: '9999px',
              boxShadow: '0 0 6px rgba(34, 197, 94, 0.65)',
            }}
          />
        </div>

        {/* Action Buttons: "+ Add Task" & "✎ Edit Task" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="btn-pill"
            style={{
              fontSize: '9.5px',
              padding: '2px 7px',
              height: '21px',
              backgroundColor: 'rgba(34, 197, 94, 0.18)',
              borderColor: 'rgba(34, 197, 94, 0.45)',
              color: '#22c55e',
              fontWeight: 600,
              gap: '3px',
            }}
            title="Add a new daily task"
          >
            <Plus size={11} strokeWidth={2.5} />
            <span>Add Task</span>
          </button>

          <button
            type="button"
            onClick={handleToggleEdit}
            className="btn-pill"
            style={{
              fontSize: '9.5px',
              padding: '2px 7px',
              height: '21px',
              backgroundColor: isEditingMode ? 'rgba(239, 68, 68, 0.18)' : 'var(--pill-bg)',
              borderColor: isEditingMode ? '#ef4444' : 'var(--glass-border)',
              color: isEditingMode ? '#ef4444' : 'var(--text-secondary)',
              gap: '3px',
            }}
            title={isEditingMode ? 'Finish editing tasks' : 'Edit or delete tasks'}
          >
            <Edit2 size={10} />
            <span>{isEditingMode ? 'Done' : 'Edit'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. Right Scrollable Emerald Task Pills Area                          */}
      {/* ==================================================================== */}
      <div
        style={{
          flex: 1,
          height: '100px',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          boxSizing: 'border-box',
          justifyContent: todoTasks.length < 3 && !isAddingTask ? 'center' : 'flex-start',
        }}
      >
        {/* Inline Add Task Input Form */}
        <AnimatePresence>
          {isAddingTask && (
            <motion.div
              key="add-task-inline"
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: '26px', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                width: '100%',
                marginBottom: '2px',
                flexShrink: 0,
              }}
            >
              <input
                ref={addInputRef}
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Enter new task..."
                style={{
                  flex: 1,
                  height: '24px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid #22c55e',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  padding: '0 10px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleCommitAdd}
                className="btn-pill"
                style={{
                  height: '24px',
                  width: '24px',
                  padding: 0,
                  borderRadius: '9999px',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Save task"
              >
                <Check size={12} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={handleCancelAdd}
                className="btn-pill"
                style={{
                  height: '24px',
                  width: '24px',
                  padding: 0,
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Cancel"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task Items List */}
        <AnimatePresence mode="popLayout">
          {todoTasks.length === 0 ? (
            <motion.div
              key="no-tasks-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                height: '100%',
                color: 'var(--text-secondary)',
                fontSize: '11px',
              }}
            >
              <ListTodo size={14} />
              <span>No tasks. Click "+ Add Task" to begin!</span>
            </motion.div>
          ) : (
            todoTasks.map((task: TodoTaskItem) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ duration: 0.14 }}
                onClick={(e) => handleToggle(task.id, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  height: '27px',
                  minHeight: '27px',
                  borderRadius: '9999px',
                  backgroundColor: task.completed
                    ? 'rgba(34, 197, 94, 0.22)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: task.completed
                    ? '1px solid rgba(34, 197, 94, 0.38)'
                    : '1px solid var(--glass-border)',
                  padding: '0 8px 0 12px',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = task.completed
                    ? 'rgba(34, 197, 94, 0.30)'
                    : 'rgba(255, 255, 255, 0.09)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = task.completed
                    ? 'rgba(34, 197, 94, 0.22)'
                    : 'rgba(255, 255, 255, 0.05)';
                }}
              >
                {/* Left: Task Text */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: 0,
                    flex: 1,
                    paddingRight: '6px',
                  }}
                >
                  {isEditingMode && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(task.id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        outline: 'none',
                        flexShrink: 0,
                      }}
                      title="Delete task"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: task.completed ? 500 : 500,
                      color: task.completed ? 'var(--text-primary)' : 'var(--text-secondary)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.9 : 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={task.text}
                  >
                    {task.text}
                  </span>
                </div>

                {/* Right: Circular Checkmark Toggle (✓) */}
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    minWidth: '16px',
                    borderRadius: '9999px',
                    backgroundColor: task.completed ? '#22c55e' : 'rgba(255, 255, 255, 0.08)',
                    border: task.completed ? 'none' : '1.5px solid rgba(255, 255, 255, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    transition: 'all 0.15s ease',
                    boxShadow: task.completed ? '0 0 6px rgba(34, 197, 94, 0.5)' : 'none',
                  }}
                  title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {task.completed && <Check size={10} strokeWidth={3} />}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
