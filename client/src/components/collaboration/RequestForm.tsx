// ABOUTME: Modal form for creating collaboration requests with creator search, title, description, budget, deadline.
// ABOUTME: Debounced creator autocomplete using profile search endpoint. Validates form before submit.

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { searchService } from '@/services/searchService';
import { useCollaboration } from '@/hooks/useCollaboration';
import { fadeUp } from '@/lib/motion';
import type { Profile } from '@/types/profile';
import type { CreateCollaborationInput } from '@/types/collaboration';

interface RequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedCreatorId?: string;
}

interface FormState {
  recipientId: string;
  title: string;
  description: string;
  budget: string;
  deadline: string;
}

interface FormErrors {
  recipientId?: string;
  title?: string;
  description?: string;
  budget?: string;
  deadline?: string;
}

export function RequestForm({ isOpen, onClose, onSuccess, preselectedCreatorId }: RequestFormProps) {
  const { createRequest, loading, error: submitError } = useCollaboration();

  const [form, setForm] = useState<FormState>({
    recipientId: preselectedCreatorId || '',
    title: '',
    description: '',
    budget: '',
    deadline: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [creatorSearchResults, setCreatorSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showCreatorDropdown, setShowCreatorDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Load preselected creator on mount
  useEffect(() => {
    if (preselectedCreatorId && creatorSearchResults.length === 0) {
      setForm((prev) => ({ ...prev, recipientId: preselectedCreatorId }));
    }
  }, [preselectedCreatorId]);

  // Debounced creator search
  const handleCreatorSearch = useCallback(
    async (query: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        setCreatorSearchResults([]);
        return;
      }

      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchService.searchProfiles({ city: query });
          setCreatorSearchResults(results);
        } catch {
          setCreatorSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    },
    []
  );

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.recipientId.trim()) {
      newErrors.recipientId = 'Select a creator';
    }
    if (!form.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (form.title.length > 100) {
      newErrors.title = 'Title must be under 100 characters';
    }
    if (!form.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (form.description.length > 1000) {
      newErrors.description = 'Description must be under 1000 characters';
    }
    if (!form.budget.trim()) {
      newErrors.budget = 'Budget is required';
    } else if (isNaN(Number(form.budget)) || Number(form.budget) <= 0) {
      newErrors.budget = 'Budget must be a positive number';
    }
    if (!form.deadline.trim()) {
      newErrors.deadline = 'Deadline is required';
    } else {
      const deadlineDate = new Date(form.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        newErrors.deadline = 'Deadline must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const input: CreateCollaborationInput = {
        recipientId: form.recipientId,
        title: form.title,
        description: form.description,
        budget: Number(form.budget),
        deadline: form.deadline,
      };

      await createRequest(input);
      toast.success('Collaboration request sent!');
      setForm({
        recipientId: '',
        title: '',
        description: '',
        budget: '',
        deadline: '',
      });
      setErrors({});
      onSuccess?.();
      onClose();
    } catch {
      // Error is handled by the hook and displayed
    }
  };

  if (!isOpen) {
    return null;
  }

  const selectedCreator = creatorSearchResults.find((p) => p.userId === form.recipientId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 40,
            }}
          />

          {/* Modal */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            style={{
              position: 'fixed',
              top: '10%',
              left: '50%',
              transform: 'translate(-50%, 0)',
              zIndex: 50,
              width: '90%',
              maxWidth: 500,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                background: 'var(--ink-0)',
                border: '1px solid var(--line)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
              }}
            >
              <h2
                style={{
                  margin: '0 0 4px 0',
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'var(--paper)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Send Collaboration Request
              </h2>
              <p
                style={{
                  margin: '0 0 16px 0',
                  fontSize: 13,
                  color: 'var(--paper-dim)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Reach out to creators for your next project.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {/* Creator Dropdown */}
                <div style={{ position: 'relative' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 8,
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      color: 'var(--paper-muted)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Select Creator
                  </label>

                  {selectedCreator ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreatorDropdown(!showCreatorDropdown);
                      }}
                      style={{
                        width: '100%',
                        minHeight: 44,
                        padding: '12px',
                        background: 'var(--ink-1)',
                        border: '1px solid var(--line)',
                        borderRadius: 8,
                        color: 'var(--paper)',
                        fontSize: 14,
                        fontFamily: 'var(--font-body)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line-strong)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line)';
                      }}
                    >
                      {selectedCreator.displayName}
                    </button>
                  ) : (
                    <input
                      type="text"
                      placeholder="Search creators..."
                      value={form.recipientId}
                      onChange={(e) => {
                        handleCreatorSearch(e.target.value);
                        setShowCreatorDropdown(true);
                      }}
                      onFocus={() => setShowCreatorDropdown(true)}
                      style={{
                        width: '100%',
                        minHeight: 44,
                        padding: '12px',
                        background: 'var(--ink-1)',
                        border: errors.recipientId ? '1px solid var(--rust)' : '1px solid var(--line)',
                        borderRadius: 8,
                        color: 'var(--paper)',
                        fontSize: 14,
                        fontFamily: 'var(--font-body)',
                        outline: 'none',
                        transition: 'all 0.15s',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowCreatorDropdown(false);
                        }
                      }}
                    />
                  )}

                  {errors.recipientId && (
                    <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--rust)', fontFamily: 'var(--font-body)' }}>
                      {errors.recipientId}
                    </p>
                  )}

                  {/* Dropdown Results */}
                  <AnimatePresence>
                    {showCreatorDropdown && !selectedCreator && creatorSearchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: 4,
                          background: 'var(--ink-1)',
                          border: '1px solid var(--line)',
                          borderRadius: 8,
                          maxHeight: 200,
                          overflowY: 'auto',
                          zIndex: 10,
                        }}
                      >
                        {creatorSearchResults.map((creator) => (
                          <button
                            key={creator._id}
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, recipientId: creator.userId }));
                              setShowCreatorDropdown(false);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '12px',
                              borderBottom: '1px solid var(--line-subtle)',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--paper)',
                              fontSize: 14,
                              fontFamily: 'var(--font-body)',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background = 'var(--ink-2)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                            }}
                          >
                            {creator.displayName}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Title */}
                <Input
                  label="Title"
                  placeholder="Collaboration project name"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  error={errors.title}
                  maxLength={100}
                />

                {/* Description */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 8,
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      color: 'var(--paper-muted)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    placeholder="Tell the creator what you're looking for..."
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    maxLength={1000}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 12,
                      background: 'var(--ink-1)',
                      border: errors.description ? '1px solid var(--rust)' : '1px solid var(--line)',
                      borderRadius: 8,
                      color: 'var(--paper)',
                      fontSize: 14,
                      fontFamily: 'var(--font-body)',
                      resize: 'vertical',
                      outline: 'none',
                      transition: 'all 0.15s',
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLTextAreaElement).style.borderColor = 'var(--amber)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLTextAreaElement).style.borderColor = errors.description
                        ? 'var(--rust)'
                        : 'var(--line)';
                    }}
                  />
                  {errors.description && (
                    <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--rust)', fontFamily: 'var(--font-body)' }}>
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Budget */}
                <Input
                  label="Budget (USD)"
                  placeholder="0"
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm((prev) => ({ ...prev, budget: e.target.value }))}
                  error={errors.budget}
                  min="0"
                  step="100"
                />

                {/* Deadline */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 8,
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      color: 'var(--paper-muted)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
                    style={{
                      width: '100%',
                      minHeight: 44,
                      padding: '12px',
                      background: 'var(--ink-1)',
                      border: errors.deadline ? '1px solid var(--rust)' : '1px solid var(--line)',
                      borderRadius: 8,
                      color: 'var(--paper)',
                      fontSize: 14,
                      fontFamily: 'var(--font-body)',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.15s',
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLInputElement).style.borderColor = 'var(--amber)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLInputElement).style.borderColor = errors.deadline
                        ? 'var(--rust)'
                        : 'var(--line)';
                    }}
                  />
                  {errors.deadline && (
                    <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--rust)', fontFamily: 'var(--font-body)' }}>
                      {errors.deadline}
                    </p>
                  )}
                </div>

                {/* Error Message */}
                {submitError && (
                  <div
                    style={{
                      padding: 12,
                      background: 'var(--rust)' + '15',
                      border: '1px solid var(--rust)',
                      borderRadius: 4,
                      color: 'var(--rust)',
                      fontSize: 12,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {submitError}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={onClose} type="button" style={{ flex: 1 }}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" isLoading={loading} type="submit" style={{ flex: 1 }}>
                    Send Request
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
