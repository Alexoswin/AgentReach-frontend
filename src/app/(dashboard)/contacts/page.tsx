'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LooseApiResponse } from '@/lib/api';
import { useOutreachStore } from '@/store/useOutreachStore';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  Trash2,
  Edit2,
  X,
  FileSpreadsheet,
  CheckCircle,
  Plus,
  Minus,
  AlertCircle,
  ChevronRight,
  Folder,
  FolderPlus,
} from 'lucide-react';

const CONTACT_PAGE_SIZE = 100;

type DirectoryFilter = 'all' | 'uncategorized' | string;

const PHONE_COUNTRY_CODES = [
  { value: '+91', label: 'IN +91' },
  { value: '+1', label: 'US +1' },
  { value: '+44', label: 'UK +44' },
  { value: '+61', label: 'AU +61' },
  { value: '+971', label: 'AE +971' },
];

const splitPhoneNumber = (value?: string) => {
  const raw = value?.trim() || '';
  const match = PHONE_COUNTRY_CODES.find((option) => raw.startsWith(option.value));

  if (!raw) return { countryCode: '+91', localNumber: '' };
  if (match) {
    return {
      countryCode: match.value,
      localNumber: raw.slice(match.value.length).replace(/\D/g, ''),
    };
  }
  if (raw.startsWith('+')) return { countryCode: '+91', localNumber: raw };

  return { countryCode: '+91', localNumber: raw.replace(/\D/g, '') };
};

const formatPhonePayload = (countryCode: string, localNumber: string) => {
  const raw = localNumber.trim();
  if (!raw) return undefined;
  if (raw.startsWith('+')) return raw;
  return `${countryCode}${raw.replace(/\D/g, '')}`;
};

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const { showAlert } = useOutreachStore();

  const [search, setSearch] = useState('');
  const [directorySearch, setDirectorySearch] = useState('');
  const [rowLimit, setRowLimit] = useState({ key: '', count: CONTACT_PAGE_SIZE });
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState(false);
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<DirectoryFilter>('all');
  const [directoryName, setDirectoryName] = useState('');
  const [directoryDescription, setDirectoryDescription] = useState('');
  const [editingDirectoryId, setEditingDirectoryId] = useState<string | null>(null);

  // Manual Contact Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [contactDirectoryId, setContactDirectoryId] = useState('');
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Upload/Import State
  const [uploadStep, setUploadStep] = useState(1); // 1: Select File, 2: Map Columns, 3: Preview & Settings
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<LooseApiResponse[]>([]);
  const [parsedPreview, setParsedPreview] = useState<LooseApiResponse[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'SKIP' | 'OVERWRITE'>('SKIP');
  const [importDirectoryId, setImportDirectoryId] = useState('');
  const [importResult, setImportResult] = useState<LooseApiResponse | null>(null);

  // Fetch Contacts
  const { data: contacts = [], isLoading, isError } = useQuery({
    queryKey: ['contacts'],
    queryFn: api.contacts.list,
  });

  const { data: directories = [] } = useQuery({
    queryKey: ['contact-directories'],
    queryFn: api.contacts.directories.list,
  });

  // Mutations
  const createContactMutation = useMutation({
    mutationFn: api.contacts.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-directories'] });
      showAlert('The contact has been added to your list.', 'success', 'Contact saved');
      closeManualModal();
    },
    onError: (err: Error) => {
      showAlert(err.message || 'We could not save this contact. Please check the details and try again.', 'error');
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LooseApiResponse }) => api.contacts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-directories'] });
      showAlert('The contact details have been updated.', 'success', 'Contact updated');
      closeManualModal();
    },
    onError: (err: Error) => {
      showAlert(err.message || 'We could not update this contact. Please try again.', 'error');
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: api.contacts.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-directories'] });
      showAlert('The contact has been deleted.', 'success', 'Contact deleted');
    },
    onError: (err: Error) => {
      showAlert(err.message || 'We could not delete this contact. Please try again.', 'error');
    },
  });

  const createDirectoryMutation = useMutation({
    mutationFn: api.contacts.directories.create,
    onSuccess: (directory: LooseApiResponse) => {
      queryClient.invalidateQueries({ queryKey: ['contact-directories'] });
      setSelectedDirectoryId(directory.id);
      closeDirectoryModal();
      showAlert('The contact directory has been created.', 'success', 'Directory ready');
    },
    onError: (err: Error) => {
      showAlert(err.message || 'We could not create this directory. Please try again.', 'error');
    },
  });

  const updateDirectoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LooseApiResponse }) => api.contacts.directories.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-directories'] });
      closeDirectoryModal();
      showAlert('The contact directory has been updated.', 'success', 'Directory updated');
    },
    onError: (err: Error) => {
      showAlert(err.message || 'We could not update this directory. Please try again.', 'error');
    },
  });

  const deleteDirectoryMutation = useMutation({
    mutationFn: api.contacts.directories.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-directories'] });
      setSelectedDirectoryId('all');
      showAlert('The directory was removed and its contacts were kept unassigned.', 'success', 'Directory deleted');
    },
    onError: (err: Error) => {
      showAlert(err.message || 'We could not delete this directory. Please try again.', 'error');
    },
  });

  const parseFileMutation = useMutation({
    mutationFn: api.contacts.parseFile,
    onSuccess: (data) => {
      setParsedHeaders(data.headers);
      setParsedPreview(data.previewRows);
      setParsedRows(data.allRows);
      
      // Auto-guess columns mapping
      const initialMap: Record<string, string> = {};
      const fields = ['firstName', 'lastName', 'email', 'company', 'jobTitle', 'linkedinUrl', 'phoneNumber', 'notes'];
      fields.forEach(f => {
        const matchedHeader = data.headers.find((h: string) => 
          h.toLowerCase().replace(/[\s_-]/g, '') === f.toLowerCase()
        );
        if (matchedHeader) {
          initialMap[f] = matchedHeader;
        }
      });
      setMapping(initialMap);
      setUploadStep(2);
    },
    onError: (err: Error) => {
      showAlert(err.message || 'We could not read this file. Please upload a CSV or Excel file.', 'error');
    },
  });

  const importContactsMutation = useMutation({
    mutationFn: api.contacts.import,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-directories'] });
      setImportResult(res);
      setUploadStep(4);
      showAlert(`${res.importedCount} contacts added and ${res.updatedCount} updated.`, 'success', 'Import complete');
    },
    onError: (err: Error) => {
      showAlert(err.message || 'We could not import the contacts. Please check the file and try again.', 'error');
    },
  });

  const closeManualModal = () => {
    setIsManualModalOpen(false);
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setCompany('');
    setJobTitle('');
    setLinkedinUrl('');
    setPhoneCountryCode('+91');
    setPhoneNumber('');
    setNotes('');
    setContactDirectoryId('');
    setCustomFields([]);
  };

  const openManualModal = () => {
    setContactDirectoryId(selectedDirectoryId !== 'all' && selectedDirectoryId !== 'uncategorized' ? selectedDirectoryId : '');
    setIsManualModalOpen(true);
  };

  const closeDirectoryModal = () => {
    setIsDirectoryModalOpen(false);
    setEditingDirectoryId(null);
    setDirectoryName('');
    setDirectoryDescription('');
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadStep(1);
    setUploadFile(null);
    setImportDirectoryId('');
    setImportResult(null);
  };

  useEscapeKey(isDirectoryModalOpen, closeDirectoryModal);
  useEscapeKey(isManualModalOpen, closeManualModal);
  useEscapeKey(isUploadModalOpen, closeUploadModal);

  const openDirectoryModal = (directory?: LooseApiResponse) => {
    setEditingDirectoryId(directory?.id || null);
    setDirectoryName(directory?.name || '');
    setDirectoryDescription(directory?.description || '');
    setIsDirectoryModalOpen(true);
  };

  const handleDirectorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: directoryName,
      description: directoryDescription || undefined,
    };

    if (editingDirectoryId) {
      updateDirectoryMutation.mutate({ id: editingDirectoryId, data: payload });
    } else {
      createDirectoryMutation.mutate(payload);
    }
  };

  const handleEditClick = (contact: LooseApiResponse) => {
    setEditingId(contact.id);
    setFirstName(contact.firstName);
    setLastName(contact.lastName);
    setEmail(contact.email);
    setCompany(contact.company || '');
    setJobTitle(contact.jobTitle || '');
    setLinkedinUrl(contact.linkedinUrl || '');
    const phone = splitPhoneNumber(contact.phoneNumber);
    setPhoneCountryCode(phone.countryCode);
    setPhoneNumber(phone.localNumber);
    setNotes(contact.notes || '');
    setContactDirectoryId(contact.directoryId || '');
    
    if (contact.customFields) {
      try {
        const parsed = JSON.parse(contact.customFields);
        setCustomFields(Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) })));
      } catch {
        setCustomFields([]);
      }
    } else {
      setCustomFields([]);
    }
    
    setIsManualModalOpen(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCustomFields: Record<string, LooseApiResponse> = {};
    customFields.forEach(c => {
      if (c.key.trim()) formattedCustomFields[c.key.trim()] = c.value;
    });

    const payload = {
      firstName,
      lastName,
      email,
      company: company || undefined,
      jobTitle: jobTitle || undefined,
      linkedinUrl: linkedinUrl || undefined,
      phoneNumber: formatPhonePayload(phoneCountryCode, phoneNumber),
      notes: notes || undefined,
      directoryId: contactDirectoryId || null,
      customFields: Object.keys(formattedCustomFields).length > 0 ? formattedCustomFields : undefined,
    };

    if (editingId) {
      updateContactMutation.mutate({ id: editingId, data: payload });
    } else {
      createContactMutation.mutate(payload);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      parseFileMutation.mutate(file);
    }
    // Reset so picking the same file again (e.g. after a parse error) re-fires onChange.
    e.target.value = '';
  };

  const handleImportRun = () => {
    if (!uploadFile) return;
    importContactsMutation.mutate({
      rows: parsedRows,
      mapping,
      duplicateStrategy,
      directoryId: importDirectoryId || undefined,
    });
  };

  const addCustomField = () => setCustomFields([...customFields, { key: '', value: '' }]);
  const removeCustomField = (index: number) => setCustomFields(customFields.filter((_, i) => i !== index));
  const updateCustomFieldKey = (index: number, val: string) => {
    const list = [...customFields];
    list[index].key = val;
    setCustomFields(list);
  };
  const updateCustomFieldValue = (index: number, val: string) => {
    const list = [...customFields];
    list[index].value = val;
    setCustomFields(list);
  };

  const directoryCounts = contacts.reduce((acc: Record<string, number>, contact: LooseApiResponse) => {
    const key = contact.directoryId || 'uncategorized';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const selectedDirectory = directories.find((directory: LooseApiResponse) => directory.id === selectedDirectoryId);
  const selectedDirectoryLabel =
    selectedDirectoryId === 'all'
      ? 'All Contacts'
      : selectedDirectoryId === 'uncategorized'
        ? 'Unassigned'
        : selectedDirectory?.name || 'Directory';

  // Filters
  const directoryContacts = contacts.filter((contact: LooseApiResponse) => {
    if (selectedDirectoryId === 'all') return true;
    if (selectedDirectoryId === 'uncategorized') return !contact.directoryId;
    return contact.directoryId === selectedDirectoryId;
  });
  const filteredContacts = directoryContacts.filter((c: LooseApiResponse) => {
    const term = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(term) ||
      c.lastName.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.company && c.company.toLowerCase().includes(term)) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(term))
    );
  });

  const visibleDirectories = useMemo(() => {
    const term = directorySearch.trim().toLowerCase();
    return [...directories]
      .filter((directory: LooseApiResponse) => !term || directory.name.toLowerCase().includes(term))
      .sort((a: LooseApiResponse, b: LooseApiResponse) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [directories, directorySearch]);

  // Rendering thousands of rows at once freezes the page, so show them in pages
  // and start over from the first page whenever the view or search changes.
  const rowLimitKey = `${selectedDirectoryId}|${search}`;
  const visibleRowCount = rowLimit.key === rowLimitKey ? rowLimit.count : CONTACT_PAGE_SIZE;
  const visibleContacts = filteredContacts.slice(0, visibleRowCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-zinc-900">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-indigo-400" />
            Contact Directory
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your client accounts, leads, and job market opportunities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setImportDirectoryId(selectedDirectoryId !== 'all' && selectedDirectoryId !== 'uncategorized' ? selectedDirectoryId : '');
              setIsUploadModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-850 hover:text-white transition-all"
          >
            <Upload className="h-3.5 w-3.5" />
            Bulk Upload
          </button>
          <button
            onClick={openManualModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Contact
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
        <aside className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-4 space-y-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Directories</p>
              <p className="text-xs text-zinc-500 mt-1">
                {directories.length} directories · {contacts.length} contacts
              </p>
            </div>
            <button
              onClick={() => openDirectoryModal()}
              className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-indigo-500/40 transition-colors"
              title="Create directory"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search directories..."
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="space-y-1.5">
            {[
              { id: 'all', name: 'All Contacts', count: contacts.length },
              { id: 'uncategorized', name: 'Unassigned', count: directoryCounts.uncategorized || 0 },
            ].map((directory) => (
              <button
                key={directory.id}
                onClick={() => setSelectedDirectoryId(directory.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                  selectedDirectoryId === directory.id
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                    : 'bg-zinc-950/40 border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Folder className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs font-semibold truncate">{directory.name}</span>
                </span>
                <span className="text-[11px] text-zinc-500">{directory.count}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[calc(100vh-24rem)] min-h-40 overflow-y-auto pr-1">
            {visibleDirectories.length === 0 && directorySearch && (
              <p className="px-3 py-4 text-xs text-zinc-500 text-center">No directories match &quot;{directorySearch}&quot;.</p>
            )}
            {visibleDirectories.map((directory: LooseApiResponse) => (
              <div
                key={directory.id}
                className={`group flex items-center gap-1 rounded-xl border transition-colors ${
                  selectedDirectoryId === directory.id
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : 'bg-zinc-950/40 border-transparent hover:bg-zinc-900'
                }`}
              >
                <button
                  onClick={() => setSelectedDirectoryId(directory.id)}
                  className="min-w-0 flex-1 flex items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Folder className={`h-4 w-4 flex-shrink-0 ${selectedDirectoryId === directory.id ? 'text-indigo-300' : 'text-zinc-500'}`} />
                    <span className={`text-xs font-semibold truncate ${selectedDirectoryId === directory.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                      {directory.name}
                    </span>
                  </span>
                  <span className="text-[11px] text-zinc-500">{directoryCounts[directory.id] || directory.contactCount || 0}</span>
                </button>
                <button
                  onClick={() => openDirectoryModal(directory)}
                  className="p-1.5 text-zinc-600 hover:text-zinc-200 rounded-lg"
                  title="Rename directory"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${directory.name}"? Contacts in it will stay in Unassigned.`)) {
                      deleteDirectoryMutation.mutate(directory.id);
                    }
                  }}
                  className="mr-1.5 p-1.5 text-zinc-600 hover:text-rose-400 rounded-lg"
                  title="Delete directory"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <main className="space-y-4 min-w-0">
          {/* Toolbar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{selectedDirectoryLabel}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{directoryContacts.length} contacts in this view</p>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name, email, company or job title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-850 bg-zinc-900/60">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Organization</th>
                    <th className="px-6 py-4 font-semibold">LinkedIn</th>
                    <th className="px-6 py-4 font-semibold">Phone</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {isLoading ? (
                    [1, 2, 3].map((n) => (
                      <tr key={n} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-zinc-800 rounded w-24"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-zinc-800 rounded w-36"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-zinc-800 rounded w-20"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-zinc-800 rounded w-16"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-zinc-800 rounded w-24"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-zinc-800 rounded w-12 ml-auto"></div></td>
                      </tr>
                    ))
                  ) : isError ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-rose-400">
                        We could not load your contacts. Please try again in a moment.
                      </td>
                    </tr>
                  ) : filteredContacts.length > 0 ? (
                    visibleContacts.map((contact: LooseApiResponse) => (
                      <tr key={contact.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">
                          {contact.firstName} {contact.lastName}
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{contact.email}</td>
                        <td className="px-6 py-4 text-zinc-400">
                          {contact.company ? (
                            <div>
                              <p className="text-zinc-300 font-semibold">{contact.company}</p>
                              <p className="text-xs text-zinc-500">{contact.jobTitle || 'Role N/A'}</p>
                            </div>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {contact.linkedinUrl ? (
                            <a
                              href={contact.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/10 font-bold hover:bg-indigo-500/20"
                            >
                              LinkedIn
                            </a>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{contact.phoneNumber || <span className="text-zinc-600">-</span>}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(contact)}
                              aria-label="Edit contact"
                              title="Edit contact"
                              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this contact?')) {
                                  deleteContactMutation.mutate(contact.id);
                                }
                              }}
                              aria-label="Delete contact"
                              title="Delete contact"
                              className="p-1.5 hover:bg-rose-950/30 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                        No contacts found. Create a manual record or upload a list file.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredContacts.length > visibleContacts.length && (
              <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-zinc-850 bg-zinc-900/40">
                <p className="text-xs text-zinc-500">
                  Showing {visibleContacts.length} of {filteredContacts.length} contacts
                </p>
                <button
                  onClick={() => setRowLimit({ key: rowLimitKey, count: visibleRowCount + CONTACT_PAGE_SIZE })}
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:border-indigo-500/40 transition-colors"
                >
                  Show {Math.min(CONTACT_PAGE_SIZE, filteredContacts.length - visibleContacts.length)} more
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Directory Creation/Edit Modal */}
      {isDirectoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingDirectoryId ? 'Edit Contact Directory' : 'Create Contact Directory'}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="text-lg font-bold text-white">
                {editingDirectoryId ? 'Edit Contact Directory' : 'Create Contact Directory'}
              </h3>
              <button
                onClick={closeDirectoryModal}
                aria-label="Close"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDirectorySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Directory Name *</label>
                <input
                  type="text"
                  required
                  value={directoryName}
                  onChange={(e) => setDirectoryName(e.target.value)}
                  placeholder="Recruiters, Hiring Managers, Warm Leads..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Description</label>
                <textarea
                  value={directoryDescription}
                  onChange={(e) => setDirectoryDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={closeDirectoryModal}
                  className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDirectoryMutation.isPending || updateDirectoryMutation.isPending}
                  className="px-4 py-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-semibold text-white rounded-xl shadow-md transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {editingDirectoryId ? 'Update Directory' : 'Create Directory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Contact Creation Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? 'Edit Contact Details' : 'Create Contact Manually'}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="text-lg font-bold text-white">
                {editingId ? 'Edit Contact Details' : 'Create Contact Manually'}
              </h3>
              <button
                onClick={closeManualModal}
                aria-label="Close"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Directory</label>
                <select
                  value={contactDirectoryId}
                  onChange={(e) => setContactDirectoryId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {directories.map((directory: LooseApiResponse) => (
                    <option key={directory.id} value={directory.id}>
                      {directory.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      className="w-28 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      {PHONE_COUNTRY_CODES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="9876543210"
                      className="min-w-0 flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Notes / Extra context</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 h-20 resize-none"
                />
              </div>

              {/* Custom fields list */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Custom Metadata Fields
                  </span>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold"
                  >
                    <Plus className="h-3 w-3" /> Add Field
                  </button>
                </div>
                {customFields.map((field, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Field Name (e.g. city)"
                      required
                      value={field.key}
                      onChange={(e) => updateCustomFieldKey(index, e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      required
                      value={field.value}
                      onChange={(e) => updateCustomFieldValue(index, e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomField(index)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800/40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/60 mt-6">
                <button
                  type="button"
                  onClick={closeManualModal}
                  className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createContactMutation.isPending || updateContactMutation.isPending}
                  className="px-4 py-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-semibold text-white rounded-xl shadow-md transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {editingId ? 'Update Contact' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Wizard Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Import Contacts from Spreadsheet"
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-4 px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <div>
                <h3 className="text-lg font-bold text-white">Import Contacts from Spreadsheet</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${uploadStep >= 1 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>1. Select File</span>
                  <ChevronRight className="h-3 w-3 text-zinc-600" />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${uploadStep >= 2 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>2. Map Columns</span>
                  <ChevronRight className="h-3 w-3 text-zinc-600" />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${uploadStep >= 3 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>3. Preview</span>
                  <ChevronRight className="h-3 w-3 text-zinc-600" />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${uploadStep >= 4 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>4. Done</span>
                </div>
              </div>
              <button
                onClick={closeUploadModal}
                aria-label="Close"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Step 1: Upload File */}
              {uploadStep === 1 && (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 transition-colors rounded-2xl p-12 text-center relative cursor-pointer">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="h-12 w-12 rounded-full bg-zinc-950 flex items-center justify-center mb-4 text-zinc-400">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-200">Drag & drop your contacts file</h4>
                  <p className="text-xs text-zinc-500 mt-1">Accepts CSV or Microsoft Excel (XLSX, XLS)</p>
                  {parseFileMutation.isPending && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400 font-medium bg-indigo-500/5 px-3 py-1.5 rounded-full border border-indigo-500/10">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                      Parsing file headers...
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Column Mapper */}
              {uploadStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                    <p className="text-xs text-zinc-400 leading-normal">
                      Align the columns of your file with our database schema. Choose standard fields or map columns as custom fields.
                    </p>
                  </div>

                  <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
                    {[
                      { key: 'firstName', label: 'First Name *' },
                      { key: 'lastName', label: 'Last Name *' },
                      { key: 'email', label: 'Email Address *' },
                      { key: 'company', label: 'Company' },
                      { key: 'jobTitle', label: 'Job Title' },
                      { key: 'linkedinUrl', label: 'LinkedIn URL' },
                      { key: 'phoneNumber', label: 'Phone Number' },
                      { key: 'notes', label: 'Notes / Context' },
                    ].map((field) => (
                      <div key={field.key} className="flex justify-between items-center p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl gap-4">
                        <span className="text-xs font-semibold text-zinc-300">{field.label}</span>
                        <select
                          value={mapping[field.key] || ''}
                          onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 w-48"
                        >
                          <option value="">-- Skip Field --</option>
                          {parsedHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-4 border-t border-zinc-800">
                    <button
                      onClick={() => setUploadStep(1)}
                      className="px-4 py-2 bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        // Check validation
                        if (!mapping['firstName'] || !mapping['lastName'] || !mapping['email']) {
                          showAlert('Please match the First Name, Last Name, and Email columns before importing.', 'error');
                          return;
                        }
                        setUploadStep(3);
                      }}
                      className="px-4 py-2 bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-semibold text-white rounded-xl"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Duplicate Strategy & Preview */}
              {uploadStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Import into directory
                    </label>
                    <select
                      value={importDirectoryId}
                      onChange={(e) => setImportDirectoryId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Unassigned</option>
                      {directories.map((directory: LooseApiResponse) => (
                        <option key={directory.id} value={directory.id}>
                          {directory.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Strategy selection */}
                  <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-3">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Duplicate email strategy
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('SKIP')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                          duplicateStrategy === 'SKIP'
                            ? 'border-indigo-500 bg-indigo-500/5 text-white'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                        }`}
                      >
                        Skip Row
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('OVERWRITE')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                          duplicateStrategy === 'OVERWRITE'
                            ? 'border-indigo-500 bg-indigo-500/5 text-white'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                        }`}
                      >
                        Overwrite Details
                      </button>
                    </div>
                  </div>

                  {/* Preview list */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Preview Map (First 5 Rows)
                    </span>
                    <div className="overflow-x-auto border border-zinc-850 rounded-xl bg-zinc-950/30">
                      <table className="w-full text-left text-xs text-zinc-300">
                        <thead className="bg-zinc-950 uppercase border-b border-zinc-850 text-zinc-500">
                          <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Company</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                          {parsedPreview.map((row, index) => (
                            <tr key={index} className="hover:bg-zinc-900/10">
                              <td className="p-3 text-white">
                                {row[mapping['firstName']] || ''} {row[mapping['lastName']] || ''}
                              </td>
                              <td className="p-3 text-zinc-400">{row[mapping['email']] || ''}</td>
                              <td className="p-3 text-zinc-400">{row[mapping['company']] || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-zinc-800">
                    <button
                      onClick={() => setUploadStep(2)}
                      className="px-4 py-2 bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleImportRun}
                      disabled={importContactsMutation.isPending}
                      className="px-6 py-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-semibold text-white rounded-xl shadow-md disabled:opacity-50"
                    >
                      {importResult ? 'Re-run Import' : 'Launch Import'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Import Complete Summary */}
              {uploadStep === 4 && importResult && (
                <div className="space-y-6 text-center py-6 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2 text-emerald-400 border border-emerald-500/10">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Import Complete!</h4>
                    <p className="text-xs text-zinc-500 mt-1">Summary of file record operations</p>
                  </div>

                  {/* Summary card grid */}
                  <div className="grid grid-cols-3 gap-4 w-full max-w-sm pt-2">
                    <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase">Created</p>
                      <p className="text-xl font-black text-emerald-400 mt-1">{importResult.importedCount}</p>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase">Updated</p>
                      <p className="text-xl font-black text-indigo-400 mt-1">{importResult.updatedCount}</p>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase">Skipped</p>
                      <p className="text-xl font-black text-zinc-500 mt-1">{importResult.skippedCount}</p>
                    </div>
                  </div>

                  {/* Errors panel if any */}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="w-full max-w-md bg-rose-950/10 border border-rose-500/15 rounded-xl p-4 text-left space-y-2 mt-4">
                      <p className="text-xs font-bold text-rose-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Import warnings ({importResult.errors.length})
                      </p>
                      <div className="max-h-24 overflow-y-auto text-[11px] text-rose-300/80 space-y-1 pr-1 font-mono">
                        {importResult.errors.map((err: string, i: number) => (
                          <div key={i}>{err}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="w-full border-t border-zinc-850 mt-6 pt-4 flex justify-end">
                    <button
                      onClick={closeUploadModal}
                      className="px-6 py-2.5 bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl"
                    >
                      Close Summary
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
