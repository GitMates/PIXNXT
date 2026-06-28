import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
    smartAlbumProoferSettingsService,
    DEFAULT_PROOFER_SETTINGS,
} from '../../../services/smartAlbumProoferSettings.service';
import {
    CollapsibleStatusSection,
    Divider,
    NumberInput,
    SelectField,
    SettingGroup,
    SettingsSaveBar,
    SettingsTabs,
    SettingsToggle,
    TemplateTextarea,
} from './SmartAlbumSettingsUI';
import './SmartAlbumProoferSettings.css';

const TABS = [
    { id: 'permissions', label: 'Permissions & Access' },
    { id: 'notifications', label: 'Notifications' },
];

export default function SmartAlbumProoferSettingsPanel() {
    const { user } = useAuth();
    const photographerId = user?.id;
    const [activeTab, setActiveTab] = useState('permissions');
    const [settings, setSettings] = useState({ ...DEFAULT_PROOFER_SETTINGS });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [expandedStatus, setExpandedStatus] = useState(null);
    const saveTimerRef = useRef(null);
    const skipSaveRef = useRef(true);

    useEffect(() => {
        if (!photographerId) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const loaded = await smartAlbumProoferSettingsService.loadPhotographerDefaults(
                    photographerId
                );
                if (!cancelled) {
                    setSettings(loaded);
                    skipSaveRef.current = true;
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [photographerId]);

    const persist = useCallback(
        async (next) => {
            if (!photographerId) return;
            setSaving(true);
            setSaved(false);
            try {
                await smartAlbumProoferSettingsService.savePhotographerDefaults(
                    photographerId,
                    next
                );
                setSaved(true);
            } catch (err) {
                console.error(err);
            } finally {
                setSaving(false);
            }
        },
        [photographerId]
    );

    useEffect(() => {
        if (!photographerId || loading || skipSaveRef.current) {
            skipSaveRef.current = false;
            return undefined;
        }

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            void persist(settings);
        }, 700);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [settings, photographerId, loading, persist]);

    const patch = (updates) => setSettings((prev) => ({ ...prev, ...updates }));

    if (loading) {
        return <p className="sa-proofer-loading">Loading settings…</p>;
    }

    if (!photographerId) {
        return (
            <p className="sa-proofer-loading">Sign in to manage album proofer settings.</p>
        );
    }

    return (
        <div className="sa-proofer-settings">
            <header className="sa-proofer-settings__header">
                <h1 className="sa-proofer-settings__title">Album Proofer Settings</h1>
                <p className="sa-proofer-settings__subtitle">
                    Configure default permissions and automated notifications for your client
                    albums.
                </p>
            </header>

            <SettingsTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

            <div className="sa-proofer-content">
                {activeTab === 'permissions' && (
                    <>
                        <SettingGroup title="Access Control">
                            <SelectField
                                label="Default Privacy Level"
                                description="Set default privacy for new albums"
                                value={settings.accessControl}
                                onChange={(accessControl) => patch({ accessControl })}
                                options={[
                                    { value: 'link', label: 'Public via link' },
                                    { value: 'password', label: 'Password Protected' },
                                    {
                                        value: 'restricted',
                                        label: 'Restricted to Specific Client Emails',
                                    },
                                ]}
                            />
                        </SettingGroup>

                        <SettingGroup title="Download Permissions">
                            <SettingsToggle
                                checked={settings.allowDownloads}
                                onChange={(allowDownloads) => patch({ allowDownloads })}
                                label="Allow Client Downloads"
                                description="Clients can download individual spreads or full album layouts"
                            />
                        </SettingGroup>

                        <SettingGroup title="Approval Authorization">
                            <SettingsToggle
                                checked={settings.requireApprovalPin}
                                onChange={(requireApprovalPin) => patch({ requireApprovalPin })}
                                label="Require Digital Verification"
                                description="Clients must enter a PIN or digital signature for final album approval"
                            />
                        </SettingGroup>

                        <SettingGroup title="Collaboration">
                            <SettingsToggle
                                checked={settings.multiUserCollaboration}
                                onChange={(multiUserCollaboration) =>
                                    patch({ multiUserCollaboration })
                                }
                                label="Multi-User Collaboration"
                                description="Allow multiple client accounts (e.g., Bride & Groom) to comment simultaneously"
                            />
                        </SettingGroup>
                    </>
                )}

                {activeTab === 'notifications' && (
                    <>
                        <SettingGroup title="Photographer Alerts">
                            <SelectField
                                label="Notification Frequency"
                                description="How you receive updates about client activity"
                                value={settings.photographerAlerts}
                                onChange={(photographerAlerts) => patch({ photographerAlerts })}
                                options={[
                                    {
                                        value: 'instant',
                                        label: 'Instant: Notify on every comment',
                                    },
                                    {
                                        value: 'digest',
                                        label: 'Digest: Summary when client completes review',
                                    },
                                ]}
                            />
                        </SettingGroup>

                        <SettingGroup title="Client Auto-Reminders">
                            <SettingsToggle
                                checked={settings.enableClientNudges}
                                onChange={(enableClientNudges) => patch({ enableClientNudges })}
                                label="Enable Email Reminders"
                                description="Automatically remind clients who haven't started their review"
                            />
                            {settings.enableClientNudges && (
                                <div className="sa-proofer-nested">
                                    <NumberInput
                                        label="Send Reminder After (Days)"
                                        description="Days of inactivity before sending reminder"
                                        value={settings.nudgeDays}
                                        onChange={(nudgeDays) => patch({ nudgeDays })}
                                        min={1}
                                        max={30}
                                    />
                                    <Divider />
                                    <TemplateTextarea
                                        label="Email Template"
                                        description="Customize the reminder email sent to clients"
                                        value={settings.clientReminderTemplate}
                                        onChange={(clientReminderTemplate) =>
                                            patch({ clientReminderTemplate })
                                        }
                                        variables={[
                                            '{{client_name}}',
                                            '{{album_name}}',
                                            '{{album_link}}',
                                            '{{days_inactive}}',
                                        ]}
                                        placeholder="Enter your email template here..."
                                    />
                                </div>
                            )}
                        </SettingGroup>

                        <SettingGroup title="Status Change Notifications">
                            <SettingsToggle
                                checked={settings.statusChangeEmails}
                                onChange={(statusChangeEmails) => patch({ statusChangeEmails })}
                                label="Auto-Send Status Emails"
                                description="Send automated emails when album statuses change (e.g., revision requested, approved)"
                            />
                            {settings.statusChangeEmails && (
                                <div className="sa-proofer-stack">
                                    <Divider />
                                    <p className="sa-proofer-field__desc" style={{ marginBottom: 0 }}>
                                        Customize email templates for each status:
                                    </p>

                                    <CollapsibleStatusSection
                                        title="Revision Requested"
                                        isOpen={expandedStatus === 'revision'}
                                        onToggle={() =>
                                            setExpandedStatus(
                                                expandedStatus === 'revision' ? null : 'revision'
                                            )
                                        }
                                    >
                                        <TemplateTextarea
                                            label="Email Template"
                                            value={settings.revisionRequestedTemplate}
                                            onChange={(revisionRequestedTemplate) =>
                                                patch({ revisionRequestedTemplate })
                                            }
                                            variables={[
                                                '{{client_name}}',
                                                '{{album_name}}',
                                                '{{view_album_link}}',
                                            ]}
                                            placeholder="Enter template for revision request emails..."
                                        />
                                    </CollapsibleStatusSection>

                                    <CollapsibleStatusSection
                                        title="Approved"
                                        isOpen={expandedStatus === 'approved'}
                                        onToggle={() =>
                                            setExpandedStatus(
                                                expandedStatus === 'approved' ? null : 'approved'
                                            )
                                        }
                                    >
                                        <TemplateTextarea
                                            label="Email Template"
                                            value={settings.approvedTemplate}
                                            onChange={(approvedTemplate) =>
                                                patch({ approvedTemplate })
                                            }
                                            variables={[
                                                '{{client_name}}',
                                                '{{album_name}}',
                                                '{{view_album_link}}',
                                            ]}
                                            placeholder="Enter template for approval confirmation emails..."
                                        />
                                    </CollapsibleStatusSection>
                                </div>
                            )}
                        </SettingGroup>
                    </>
                )}
            </div>

            <SettingsSaveBar saving={saving} saved={saved} />
        </div>
    );
}
