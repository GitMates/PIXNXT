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
    RadioCardGroup,
    SavedStatus,
    SelectField,
    SettingGroup,
    SettingsTabs,
    SettingsToggle,
    TemplateTextarea,
} from './SmartAlbumSettingsUI';
import './SmartAlbumProoferSettings.css';

const TABS = [
    { id: 'access', label: 'Access' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'signoff', label: 'Sign-off' },
    { id: 'reminders', label: 'Reminders' },
];

const ACCESS_OPTIONS = [
    {
        value: 'link',
        label: 'Anyone with the link',
        description:
            'No PIN. Fewest support messages, and the right default for most weddings.',
    },
    {
        value: 'password',
        label: 'Link + PIN',
        description: 'A 4-digit code travels with the link in the same message.',
    },
];

const DOWNLOAD_QUALITY_OPTIONS = [
    {
        value: 'proof',
        label: 'Proof quality — 1600px, watermarked',
        description:
            'Fine for sharing with family on WhatsApp. Useless for printing. Recommended.',
    },
    {
        value: 'web',
        label: 'Web quality — 2048px, no watermark',
        description: 'Good on any screen, prints acceptably to about 6×4 inches.',
    },
    {
        value: 'full',
        label: 'Full resolution',
        description: 'The print file. Only choose this if the album is already paid for.',
    },
];

const ALERT_FREQUENCY_OPTIONS = [
    {
        value: 'instant',
        label: 'Instant',
        description: 'Notify on every comment',
    },
    {
        value: 'digest',
        label: 'Digest',
        description: 'Summary when client completes review',
    },
];

export default function SmartAlbumProoferSettingsPanel() {
    const { user } = useAuth();
    const photographerId = user?.id;
    const [activeTab, setActiveTab] = useState('access');
    const [settings, setSettings] = useState({ ...DEFAULT_PROOFER_SETTINGS });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedOk, setSavedOk] = useState(true);
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
                    setSavedOk(true);
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
            try {
                await smartAlbumProoferSettingsService.savePhotographerDefaults(
                    photographerId,
                    next
                );
                setSavedOk(true);
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

        setSaving(true);
        setSavedOk(false);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            void persist(settings);
        }, 500);

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

    const savedFooter = <SavedStatus saving={saving && !savedOk} />;

    return (
        <div className="sa-proofer-settings">
            <header className="sa-proofer-settings__header">
                <h1 className="sa-proofer-settings__title">Settings</h1>
                <p className="sa-proofer-settings__subtitle">
                    Defaults for new albums. Each album can override them.
                </p>
            </header>

            <SettingsTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

            <div className="sa-proofer-content">
                {activeTab === 'access' && (
                    <>
                        <SettingGroup title="Who can open a new album" bare>
                            <RadioCardGroup
                                name="album-access"
                                value={
                                    settings.accessControl === 'password'
                                        ? 'password'
                                        : 'link'
                                }
                                onChange={(accessControl) => patch({ accessControl })}
                                options={ACCESS_OPTIONS}
                            />
                        </SettingGroup>

                        <SettingGroup title="Client permissions" bare>
                            <div className="sa-proofer-section-stack">
                                <SettingsToggle
                                    checked={false}
                                    disabled
                                    onChange={() => {}}
                                    label="Allow spread downloads"
                                    description="Clients can save spreads as JPG. Currently unavailable — stays off."
                                />

                                <Divider />

                                <div className="sa-proofer-subsection">
                                    <span className="sa-proofer-field__label">What they get</span>
                                    <p className="sa-proofer-field__desc">
                                        This is a pricing decision as much as a technical one.
                                        Full-resolution spreads are printable anywhere.
                                    </p>
                                    <RadioCardGroup
                                        name="download-quality"
                                        value={settings.downloadQuality || 'proof'}
                                        onChange={(downloadQuality) =>
                                            patch({ downloadQuality })
                                        }
                                        options={DOWNLOAD_QUALITY_OPTIONS}
                                    />
                                </div>

                                <Divider />

                                <SettingsToggle
                                    checked={false}
                                    disabled
                                    onChange={() => {}}
                                    label="Only after approval"
                                    description="Downloads stay locked until the client signs off. Currently unavailable — stays off."
                                />
                            </div>
                        </SettingGroup>

                        {savedFooter}
                    </>
                )}

                {activeTab === 'notifications' && (
                    <div className="sa-proofer-notifications">
                        <SettingGroup title="Photographer Alerts">
                            <SelectField
                                label="Notification Frequency"
                                description="How you receive updates about client activity"
                                value={settings.photographerAlerts || 'digest'}
                                onChange={(photographerAlerts) =>
                                    patch({ photographerAlerts })
                                }
                                options={ALERT_FREQUENCY_OPTIONS}
                            />
                        </SettingGroup>

                        <SettingGroup title="Status Change Notifications">
                            <SettingsToggle
                                variant="ok"
                                checked={Boolean(settings.statusChangeEmails)}
                                onChange={(statusChangeEmails) =>
                                    patch({ statusChangeEmails })
                                }
                                label="Auto-Send Status Emails"
                                description="Send automated emails when album statuses change (e.g., revision requested, approved)"
                            />
                            {settings.statusChangeEmails ? (
                                <div className="sa-proofer-nested">
                                    <p className="sa-proofer-field__desc sa-proofer-field__desc--flush">
                                        Customize email templates for each status:
                                    </p>
                                    <CollapsibleStatusSection
                                        title="Approved"
                                        isOpen={expandedStatus === 'approved'}
                                        onToggle={() =>
                                            setExpandedStatus(
                                                expandedStatus === 'approved'
                                                    ? null
                                                    : 'approved'
                                            )
                                        }
                                    >
                                        <TemplateTextarea
                                            label="Email Template"
                                            value={settings.approvedTemplate || ''}
                                            onChange={(approvedTemplate) =>
                                                patch({ approvedTemplate })
                                            }
                                            variables={[
                                                '{{client_name}}',
                                                '{{album_name}}',
                                                '{{view_album_link}}',
                                            ]}
                                            placeholder="Enter template for approval confirmation emails…"
                                        />
                                    </CollapsibleStatusSection>
                                </div>
                            ) : null}
                        </SettingGroup>

                        <SettingGroup title="Client Started Review Notification">
                            <TemplateTextarea
                                label="Client Started Feedback Email Template"
                                description="Customize the email sent to you when a client leaves their first comment, swap request, or voice message"
                                value={settings.clientStartedFeedbackTemplate || ''}
                                onChange={(clientStartedFeedbackTemplate) =>
                                    patch({ clientStartedFeedbackTemplate })
                                }
                                variables={[
                                    '{{photographer_name}}',
                                    '{{client_name}}',
                                    '{{album_name}}',
                                    '{{editor_link}}',
                                ]}
                                placeholder="Hi {{photographer_name}}, Great news! Your client {{client_name}} has started reviewing the album…"
                            />
                        </SettingGroup>

                        {savedFooter}
                    </div>
                )}

                {activeTab === 'signoff' && (
                    <>
                        <SettingGroup title="Sign-off" bare>
                            <div className="sa-proofer-section-stack">
                                <SettingsToggle
                                    checked={Boolean(settings.requireApprovalPin)}
                                    onChange={(requireApprovalPin) =>
                                        patch({ requireApprovalPin })
                                    }
                                    label="Require approval PIN"
                                    description="The client types a 4-digit code to sign off the final album. It is a signature, not a key — separate from the access PIN."
                                />
                                <Divider />
                                <SettingsToggle
                                    checked={Boolean(settings.lockAlbumAfterApproval)}
                                    onChange={(lockAlbumAfterApproval) =>
                                        patch({ lockAlbumAfterApproval })
                                    }
                                    label="Lock album after approval"
                                    description="No further comments or swaps once signed off. You can reopen it from the album — that voids the approval and asks the client to sign off again."
                                />
                            </div>
                        </SettingGroup>
                        {savedFooter}
                    </>
                )}

                {activeTab === 'reminders' && (
                    <>
                        <SettingGroup title="Client Auto-Reminders">
                            <SettingsToggle
                                variant="ok"
                                checked={Boolean(settings.enableClientNudges)}
                                onChange={(enableClientNudges) =>
                                    patch({ enableClientNudges })
                                }
                                label="Enable Email Reminders"
                                description="Automatically remind clients who haven't started their review"
                            />
                            {settings.enableClientNudges ? (
                                <div className="sa-proofer-nested">
                                    <NumberInput
                                        label="Send Reminder After (Days)"
                                        description="Days of inactivity before sending reminder"
                                        value={Number(settings.nudgeDays) || 5}
                                        onChange={(nudgeDays) => patch({ nudgeDays })}
                                        min={1}
                                        max={30}
                                    />
                                    <Divider />
                                    <TemplateTextarea
                                        label="Email Template"
                                        description="Customize the reminder email sent to clients"
                                        value={settings.clientReminderTemplate || ''}
                                        onChange={(clientReminderTemplate) =>
                                            patch({ clientReminderTemplate })
                                        }
                                        variables={[
                                            '{{client_name}}',
                                            '{{album_name}}',
                                            '{{album_link}}',
                                            '{{days_inactive}}',
                                        ]}
                                        placeholder="Hi {{client_name}}, Just a friendly reminder that your album {{album_name}} is awaiting your feedback."
                                    />
                                </div>
                            ) : null}
                        </SettingGroup>
                        {savedFooter}
                    </>
                )}
            </div>
        </div>
    );
}
