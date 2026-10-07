import { create } from 'zustand';

interface AlertState {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface OutreachState {
  selectedContactIds: string[];
  setSelectedContactIds: (ids: string[]) => void;
  toggleContactSelection: (id: string) => void;
  clearContactSelection: () => void;
  
  // Campaign Wizard state
  wizardCampaignName: string;
  setWizardCampaignName: (name: string) => void;
  wizardTemplateId: string | null;
  setWizardTemplateId: (id: string | null) => void;
  wizardContactIds: string[];
  setWizardContactIds: (ids: string[]) => void;
  wizardStep: number;
  setWizardStep: (step: number) => void;
  resetWizard: () => void;

  // Alerts
  alert: AlertState | null;
  setAlert: (alert: AlertState | null) => void;
  showAlert: (message: string, type: 'success' | 'error' | 'info', title?: string) => void;
  clearAlert: () => void;
}

const defaultTitles = {
  success: 'Done',
  error: 'Please check this',
  info: 'Update',
};

/**
 * Swaps raw backend error text for plain-language copy. Only errors are
 * rewritten, and only on whole words: success/info copy is already written
 * for users, and substring matches misfired (e.g. "addresses" hit "ses",
 * "auth token" read as an expired session).
 */
function makeFriendlyMessage(message: string, type: 'success' | 'error' | 'info') {
  const text = message || '';
  if (type !== 'error') return text;
  const lower = text.toLowerCase();

  if (lower.includes('cannot connect') || /\b(backend|nestjs)\b/.test(lower) || lower.includes('failed to fetch')) {
    return 'We could not reach the app server. Please try again in a moment.';
  }

  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'This is taking longer than expected. Please try again.';
  }

  if (/\b(unauthori[sz]ed|jwt)\b/.test(lower) || /\b(session|token) (has )?expired\b/.test(lower)) {
    return 'Your session has expired. Please log in again.';
  }

  if (/\b(network|socket)\b/.test(lower) || lower.includes('operation not permitted')) {
    return 'There was a connection problem. Please check your internet and try again.';
  }

  if (lower.includes('validation') || lower.includes('bad request')) {
    return 'Some information looks incorrect. Please review the form and try again.';
  }

  if (/\b(aws|ses)\b/.test(lower)) {
    return 'Email sending is not ready yet. Please check your email settings and try again.';
  }

  if (lower.includes('ai generation')) {
    return 'AI template generation could not finish. Please check your AI settings or try again.';
  }

  if (lower.startsWith('failed to ') || lower.startsWith('error ')) {
    return 'Something went wrong. Please try again.';
  }

  return text;
}

// Auto-dismiss timer for the visible alert; replaced whenever a new one shows.
let alertTimer: ReturnType<typeof setTimeout> | undefined;

export const useOutreachStore = create<OutreachState>((set) => ({
  selectedContactIds: [],
  setSelectedContactIds: (ids) => set({ selectedContactIds: ids }),
  toggleContactSelection: (id) =>
    set((state) => ({
      selectedContactIds: state.selectedContactIds.includes(id)
        ? state.selectedContactIds.filter((cid) => cid !== id)
        : [...state.selectedContactIds, id],
    })),
  clearContactSelection: () => set({ selectedContactIds: [] }),

  // Campaign Wizard
  wizardCampaignName: '',
  setWizardCampaignName: (name) => set({ wizardCampaignName: name }),
  wizardTemplateId: null,
  setWizardTemplateId: (id) => set({ wizardTemplateId: id }),
  wizardContactIds: [],
  setWizardContactIds: (ids) => set({ wizardContactIds: ids }),
  wizardStep: 1,
  setWizardStep: (step) => set({ wizardStep: step }),
  resetWizard: () =>
    set({
      wizardCampaignName: '',
      wizardTemplateId: null,
      wizardContactIds: [],
      wizardStep: 1,
    }),

  // Alerts
  alert: null,
  setAlert: (alert) => set({ alert }),
  showAlert: (message, type, title) => {
    set({
      alert: {
        title: title || defaultTitles[type],
        message: makeFriendlyMessage(message, type),
        type,
      },
    });
    clearTimeout(alertTimer);
    alertTimer = setTimeout(() => {
      set({ alert: null });
    }, type === 'error' ? 6500 : 4500);
  },
  clearAlert: () => {
    clearTimeout(alertTimer);
    set({ alert: null });
  },
}));
