import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { FormBuilderConfig } from '../../types/admin';
import { api } from '../../lib/api';
import {
  FileCode,
  Save,
  CheckCircle2,
  AlertCircle,
  Bell,
  Check,
  Loader2,
  Send,
  Mail,
  ShieldCheck,
  Info
} from 'lucide-react';

interface EmailStatus {
  enabled: boolean;
  provider: string;
  apiKeyConfigured: boolean;
  fromAddressConfigured: boolean;
  adminUrlConfigured: boolean;
}

export const FormBuilderEditor: React.FC = () => {
  const { formBuilderConfig, updateFormBuilderConfig } = useData();

  const [activeForm, setActiveForm] = useState<'appointmentForm' | 'secondOpinionForm' | 'contactForm'>('appointmentForm');
  const [configState, setConfigState] = useState<FormBuilderConfig>(formBuilderConfig);
  const [saveToast, setSaveToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchEmailStatus = async () => {
      try {
        const res = await api.get('/api/admin/email-status');
        if (res.ok && res.data) {
          setEmailStatus(res.data);
        }
      } catch {
        // Non-blocking fallback
      }
    };
    fetchEmailStatus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);
    const success = await updateFormBuilderConfig(configState);
    setIsSaving(false);
    if (success) {
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } else {
      setSaveError('Failed to save form configuration. Please try again.');
    }
  };

  const currentFormConfig = configState?.[activeForm] || {
    notificationEmail: '',
    successMessage: 'Your request has been received successfully.',
    fields: {}
  };

  const fieldsList = currentFormConfig.fields || {};

  const handleSendTest = async () => {
    setTestResult(null);
    setIsSendingTest(true);
    try {
      const res = await api.post('/api/admin/email-test', {
        formKey: activeForm
      });
      if (res.ok) {
        setTestResult({
          success: true,
          message: 'Test notification sent successfully to ' + currentFormConfig.notificationEmail.trim()
        });
      } else {
        setTestResult({
          success: false,
          message: res.data?.error || 'Could not send test notification. Please verify server configuration.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Could not send test notification.'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((currentFormConfig.notificationEmail || '').trim());
  const isTestReady = Boolean(
    emailStatus?.enabled &&
    emailStatus?.apiKeyConfigured &&
    emailStatus?.fromAddressConfigured &&
    isEmailValid
  );

  const handleToggleField = (fieldKey: string, keyToToggle: 'required' | 'enabled') => {
    const existingField = fieldsList[fieldKey] || { label: '', placeholder: '', required: false, enabled: true };
    setConfigState(prev => ({
      ...prev,
      [activeForm]: {
        ...prev[activeForm],
        fields: {
          ...(prev[activeForm]?.fields || {}),
          [fieldKey]: {
            ...existingField,
            [keyToToggle]: !existingField[keyToToggle]
          }
        }
      }
    }));
  };

  const handleUpdateField = (fieldKey: string, prop: 'label' | 'placeholder', val: string) => {
    const existingField = fieldsList[fieldKey] || { label: '', placeholder: '', required: false, enabled: true };
    setConfigState(prev => ({
      ...prev,
      [activeForm]: {
        ...prev[activeForm],
        fields: {
          ...(prev[activeForm]?.fields || {}),
          [fieldKey]: {
            ...existingField,
            [prop]: val
          }
        }
      }
    }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#071D2D] font-heading">
            Patient Form Builder & Field Rules
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Customize public form fields, validation rules and confirmation messages.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-[#073F3D] hover:bg-[#071D2D] text-white text-xs font-semibold flex items-center space-x-2 shadow-sm transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#18B8B4]" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-[#18B8B4]" />
              <span>Save Form Config</span>
            </>
          )}
        </button>
      </div>

      {saveToast && (
        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Form configuration saved successfully.</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Form Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        {[
          { key: 'appointmentForm', label: 'Appointment Consultation Form' },
          { key: 'secondOpinionForm', label: 'Second Opinion Medical Upload Form' },
          { key: 'contactForm', label: 'General Contact & Enquiry Form' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveForm(tab.key as any);
              setTestResult(null);
            }}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeForm === tab.key
                ? 'border-[#073F3D] text-[#073F3D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form Notification & Delivery Status Settings */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1.5">
              <Bell className="w-3.5 h-3.5 text-[#149A96]" />
              <span>Staff Notification Email (used when email delivery is enabled)</span>
            </label>
            <input
              type="email"
              value={currentFormConfig.notificationEmail}
              onChange={e =>
                setConfigState(prev => ({
                  ...prev,
                  [activeForm]: {
                    ...prev[activeForm],
                    notificationEmail: e.target.value
                  }
                }))
              }
              placeholder="e.g. staff@example.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Saving this address does not send email yet.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Success Screen Confirmation Text
            </label>
            <input
              type="text"
              value={currentFormConfig.successMessage}
              onChange={e =>
                setConfigState(prev => ({
                  ...prev,
                  [activeForm]: {
                    ...prev[activeForm],
                    successMessage: e.target.value
                  }
                }))
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800"
            />
          </div>
        </div>

        {/* Email Delivery Provider & Status Summary */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-[#073F3D]" />
              <span className="text-xs font-bold text-slate-900">Transactional Email Delivery:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                emailStatus?.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-slate-600'
              }`}>
                {emailStatus?.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-600 font-medium">Provider: Resend</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-500">
              <span>
                Configuration:{' '}
                <strong className={emailStatus?.apiKeyConfigured && emailStatus?.fromAddressConfigured ? 'text-emerald-700' : 'text-amber-700'}>
                  {emailStatus?.apiKeyConfigured && emailStatus?.fromAddressConfigured ? 'Ready' : 'Incomplete (Requires Server Env)'}
                </strong>
              </span>
              <span>•</span>
              <span className="text-slate-400">Patient submission success always persists to D1 independently.</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleSendTest}
              disabled={isSendingTest || !isTestReady}
              title={
                !emailStatus?.enabled
                  ? 'Email delivery is currently disabled in server environment'
                  : !isEmailValid
                  ? 'Enter a valid staff notification email above first'
                  : !emailStatus?.apiKeyConfigured || !emailStatus?.fromAddressConfigured
                  ? 'Server Resend credentials not fully configured'
                  : 'Send a test notification to verified address'
              }
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:border-[#073F3D] hover:text-[#073F3D] text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  <span>Sending Test...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-teal-600" />
                  <span>Send Test Notification</span>
                </>
              )}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in ${
            testResult.success
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Fields List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-[#071D2D] pb-2 border-b border-slate-100 flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-[#149A96]" />
          <span>Configurable Fields</span>
        </h3>

        <div className="space-y-3">
          {Object.entries(fieldsList).map(([fieldKey, f]) => (
            <div
              key={fieldKey}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono">
                    Field ID: {fieldKey}
                  </label>
                  <input
                    type="text"
                    value={f.label}
                    onChange={e => handleUpdateField(fieldKey, 'label', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400">Placeholder Text</label>
                  <input
                    type="text"
                    value={f.placeholder}
                    onChange={e => handleUpdateField(fieldKey, 'placeholder', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <label className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={() => handleToggleField(fieldKey, 'required')}
                    className="rounded text-[#149A96]"
                  />
                  <span>Required</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleToggleField(fieldKey, 'enabled')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    (f?.enabled ?? true) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {(f?.enabled ?? true) ? 'Enabled' : 'Hidden'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
};
