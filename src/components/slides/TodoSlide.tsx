import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../../store/useSystemStore';
import { playWaterDrop, playToggleClick, playGlassPop } from '../../utils/sfx';
import type { TodoTaskItem } from '../../types/liquid';
import {
  Check,
  PlusCircle,
  Pencil,
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

  // Counter calculations: e.g. "4/5" or "0/0"
  const totalTasks = todoTasks.length;
  const completedTasks = todoTasks.filter((t: TodoTaskItem) => t.completed).length;
  const counterText = `${completedTasks}/${totalTasks}`;

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
        padding: '0 4px',
        boxSizing: 'border-box',
        gap: '14px',
        userSelect: 'none',
      }}
    >
      {/* ==================================================================== */}
      {/* 1. Left Summary Column (1:1 Video Match)                              */}
      {/* ==================================================================== */}
      <div
        style={{
          width: '136px',
          minWidth: '136px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '6px',
          boxSizing: 'border-box',
        }}
      >
        {/* Large 34px Bold White Counter: e.g. "0/0" or "4/5" */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span
            style={{
              fontSize: '34px',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.5px',
              color: '#ffffff',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {counterText}
          </span>
        </div>

        {/* Subtitle in #9ca3af */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#9ca3af',
            letterSpacing: '0.1px',
            lineHeight: 1.2,
          }}
        >
          Task Done Today
        </div>

        {/* Two Dark Pill Buttons: "+ Add Task" and "Edit Task" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: 600,
              padding: '4px 9px',
              height: '24px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
            }}
            title="Add Task"
          >
            <PlusCircle size={11} strokeWidth={1.75} style={{ color: '#22c55e' }} />
            <span>Add Task</span>
          </button>

          <button
            type="button"
            onClick={handleToggleEdit}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: 500,
              padding: '4px 8px',
              height: '24px',
              borderRadius: '9999px',
              backgroundColor: isEditingMode ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.08)',
              border: isEditingMode ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
              color: isEditingMode ? '#ef4444' : '#9ca3af',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
            }}
            title={isEditingMode ? 'Done editing' : 'Edit tasks'}
          >
            <Pencil size={10} strokeWidth={1.75} />
            <span>{isEditingMode ? 'Done' : 'Edit Task'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. Right Column: Dark Rounded Container (#0c0c0e, 18px radius)        */}
      {/* ==================================================================== */}
      <div
        className="todo-dark-container"
        style={{
          flex: 1,
          height: '108px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          boxSizing: 'border-box',
          justifyContent: todoTasks.length === 0 && !isAddingTask ? 'center' : 'flex-start',
        }}
      >
        {/* Inline Add Task Input Form */}
        <AnimatePresence>
          {isAddingTask && (
            <motion.div
              key="add-task-inline"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: '26px' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
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
                placeholder="New task..."
                style={{
                  flex: 1,
                  height: '24px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid #22c55e',
                  color: '#ffffff',
                  fontSize: '11px',
                  padding: '0 10px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleCommitAdd}
                style={{
                  height: '22px',
                  width: '22px',
                  padding: 0,
                  borderRadius: '9999px',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Save"
              >
                <Check size={12} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={handleCancelAdd}
                style={{
                  height: '22px',
                  width: '22px',
                  padding: 0,
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#9ca3af',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Cancel"
              >
                <X size={11} strokeWidth={2} />
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                height: '100%',
                color: '#64748b',
                fontSize: '11px',
              }}
            >
              <ListTodo size={16} strokeWidth={1.75} />
              <span>No tasks.</span>
            </motion.div>
          ) : (
            todoTasks.map((task: TodoTaskItem) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                onClick={(e) => handleToggle(task.id, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  height: '26px',
                  minHeight: '26px',
                  borderRadius: '9999px',
                  backgroundColor: task.completed
                    ? 'rgba(34, 197, 94, 0.22)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: task.completed
                    ? '1px solid rgba(34, 197, 94, 0.38)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '0 8px 0 12px',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                  flexShrink: 0,
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
                      title="Delete"
                    >
                      <Trash2 size={11} strokeWidth={1.75} />
                    </button>
                  )}

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: task.completed ? '#ffffff' : '#e2e8f0',
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

                {/* Right: Circular Checkmark Toggle */}
                <div
                  style={{
                    width: '15px',
                    height: '15px',
                    minWidth: '15px',
                    borderRadius: '9999px',
                    backgroundColor: task.completed ? '#22c55e' : 'rgba(255, 255, 255, 0.08)',
                    border: task.completed ? 'none' : '1.5px solid rgba(255, 255, 255, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {task.completed && <Check size={10} strokeWidth={2.5} />}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
