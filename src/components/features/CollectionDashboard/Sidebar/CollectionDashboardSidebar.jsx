import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Pencil,
  Target,
  Clock,
  Settings,
  MoreHorizontal,
  EyeOff,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useAuth } from '../../../../hooks/useAuth';
import { getUserDisplayLabel, getUserInitial } from '../../../../lib/userInitials';
import { userStorageService, getStorageLimitBytes, formatStorageMeter, STORAGE_CHANGED_EVENT } from '../../../../services/userStorage.service';
import { navigateToAccount } from '../../../../lib/accountBackNav';
import { SidebarCoverUpload } from '../CoverSettings/SidebarCoverUpload';
import './CollectionDashboardSidebar.css';

function GripIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="5" cy="4" r="1.1" />
      <circle cx="11" cy="4" r="1.1" />
      <circle cx="5" cy="8" r="1.1" />
      <circle cx="11" cy="8" r="1.1" />
      <circle cx="5" cy="12" r="1.1" />
      <circle cx="11" cy="12" r="1.1" />
    </svg>
  );
}

function formatCount(n) {
  const value = Number(n) || 0;
  return value.toLocaleString();
}

function formatMediaSummary(photoCount = 0, videoCount = 0) {
  const parts = [];
  const photos = Number(photoCount) || 0;
  const films = Number(videoCount) || 0;
  if (photos > 0) parts.push(`${formatCount(photos)} ${photos === 1 ? 'photo' : 'photos'}`);
  if (films > 0) parts.push(`${formatCount(films)} ${films === 1 ? 'film' : 'films'}`);
  if (!parts.length) return '0 photos';
  return parts.join(' · ');
}

function MediaSectionHeader({ active, summary, onClick }) {
  return (
    <button
      type="button"
      className={cn('cdsb-media-header', active && 'cdsb-media-header--active')}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <span className="cdsb-media-header__label">Media</span>
      <span className="cdsb-media-header__summary">{summary}</span>
    </button>
  );
}

const SETTINGS_TABS = [
  { id: 'general', label: 'Basics' },
  { id: 'privacy', label: 'Access' },
  { id: 'download', label: 'Downloads' },
  { id: 'favorite', label: 'Selections' },
  { id: 'shop', label: 'Print Lab' },
];

function NavItem({ active, icon: Icon, label, count, onClick, className, expandable, expanded }) {
  return (
    <button
      type="button"
      className={cn('cdsb-nav-item', active && 'cdsb-nav-item--active', className)}
      onClick={onClick}
    >
      <Icon className="cdsb-nav-item__icon" aria-hidden />
      <span className="cdsb-nav-item__label">{label}</span>
      {count != null && count !== '' ? (
        <span className="cdsb-nav-item__count">{formatCount(count)}</span>
      ) : null}
      {expandable && !active ? (
        <ChevronRight className="cdsb-nav-item__chevron" size={15} aria-hidden />
      ) : null}
      {expandable && active && expanded ? (
        <ChevronRight className="cdsb-nav-item__chevron cdsb-nav-item__chevron--open" size={15} aria-hidden />
      ) : null}
    </button>
  );
}

function SetRow({
  set,
  index,
  isActive,
  draggedSetIndex,
  dragOverSetIndex,
  onSetDragStart,
  onSetDragOver,
  onSetDragEnd,
  onSetDrop,
  onSetSelect,
  onSetMenuToggle,
  showSetMenu,
  renderSetMenu,
}) {
  const hidden = set.isPrivate === true;
  const isHighlights = set.isHighlights === true;

  return (
    <div
      className={cn(
        'cdsb-tree__row',
        isActive && 'cdsb-tree__row--active',
        isHighlights && 'cdsb-tree__row--highlights',
        hidden && 'cdsb-tree__row--hidden',
        showSetMenu === set.id && 'cdsb-tree__row--menu-open',
        draggedSetIndex === index && 'cdsb-tree__row--dragging',
        dragOverSetIndex === index && draggedSetIndex !== index && 'cdsb-tree__row--drag-over'
      )}
      draggable
      onDragStart={(e) => onSetDragStart?.(e, index)}
      onDragOver={(e) => onSetDragOver?.(e, index)}
      onDragEnd={onSetDragEnd}
      onDrop={(e) => onSetDrop?.(e, index)}
    >
      <span className="cdsb-set-row__grip" aria-hidden>
        <GripIcon className="cdsb-set-row__grip-icon" />
      </span>
      <button
        type="button"
        className={cn('cdsb-set-row', isActive && 'cdsb-set-row--active')}
        onClick={() => onSetSelect?.(isHighlights ? null : set.id)}
      >
        <span className="cdsb-set-row__label">{set.name}</span>
        {hidden ? <EyeOff className="cdsb-set-row__hidden" size={13} aria-label="Hidden from client" /> : null}
        <span className="cdsb-set-row__count">{formatCount(set.mediaCount ?? set.photoCount ?? 0)}</span>
      </button>
      <div className="cdsb-set-row__menu cd-set-menu-wrapper">
        <button
          type="button"
          className="cdsb-set-row__menu-btn"
          aria-label={`${set.name} options`}
          aria-expanded={showSetMenu === set.id}
          onClick={(e) => {
            e.stopPropagation();
            onSetMenuToggle?.(set.id, e.currentTarget);
          }}
        >
          <MoreHorizontal size={16} />
        </button>
        {showSetMenu === set.id ? renderSetMenu?.(set) : null}
      </div>
    </div>
  );
}

function NestedTabItem({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      className={cn('cdsb-tab-row', active && 'cdsb-tab-row--active')}
      onClick={onClick}
    >
      <span className="cdsb-tab-row__label">{label}</span>
      {count != null ? <span className="cdsb-tab-row__meta">{count}</span> : null}
    </button>
  );
}

export function CollectionDashboardSidebar({
  coverUrl,
  coverFocalX,
  coverFocalY,
  isCoverUploading,
  onCoverPhotoDrop,
  onSelectCoverFromCollection,
  onCoverFileSelect,
  isCollapsed,
  onToggleCollapse,
  activeSidebarTab,
  onSidebarTabChange,
  sortedSidebarSets = [],
  activeSetId,
  onSetSelect,
  onAddSet,
  draggedSetIndex,
  dragOverSetIndex,
  onSetDragStart,
  onSetDragOver,
  onSetDragEnd,
  onSetDrop,
  showSetMenu,
  onSetMenuToggle,
  renderSetMenu,
  activeDesignTab,
  onDesignTabChange,
  activeSettingsTab,
  onSettingsTabChange,
  activeActivitySubTab,
  onActivitySubTabChange,
  photoCount = 0,
  videoCount = 0,
  guestCount = 0,
  activityCount = 0,
  guestDeliveryEnabled = false,
  photoDownload = false,
  favoritePhotos = false,
  storeEnabled = false,
  accountBackLabel = 'Delivery',
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userInitial = getUserInitial(user);
  const userDisplayLabel = getUserDisplayLabel(user);

  const [profile, setProfile] = useState(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const cached = localStorage.getItem(`photographer_profile_${user.id}`);
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [storageBytes, setStorageBytes] = useState(() =>
    userStorageService.getCachedStorageBytes(user?.id)
  );

  useEffect(() => {
    if (!user?.id) return undefined;
    try {
      const cached = localStorage.getItem(`photographer_profile_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setProfile((prev) => (prev?.id === parsed?.id ? prev : parsed));
      }
    } catch {
      /* ignore */
    }

    const refreshStorage = () => {
      userStorageService.invalidateCachedStorage(user.id);
      userStorageService.calculateUserStorageBytes(user, profile).then((bytes) => {
        if (typeof bytes === 'number' && bytes >= 0) setStorageBytes(bytes);
      });
    };

    refreshStorage();
    window.addEventListener(STORAGE_CHANGED_EVENT, refreshStorage);
    return () => {
      window.removeEventListener(STORAGE_CHANGED_EVENT, refreshStorage);
    };
  }, [user?.id, profile?.storage_used_bytes]);

  const maxBytes = useMemo(() => getStorageLimitBytes(profile), [profile]);

  const usedBytes = storageBytes ?? profile?.storage_used_bytes ?? 0;
  const storagePct = Math.min(100, maxBytes > 0 ? (usedBytes / maxBytes) * 100 : 0);

  const settingsBadge = (tabId) => {
    if (tabId === 'download') return photoDownload ? 'ON' : 'OFF';
    if (tabId === 'favorite') return favoritePhotos ? 'ON' : 'OFF';
    if (tabId === 'shop') return storeEnabled ? 'ON' : 'OFF';
    return null;
  };

  const namedSetCount = sortedSidebarSets.filter((s) => !s.isHighlights).length;
  const visibleNamedSetCount = sortedSidebarSets.filter(
    (s) => !s.isHighlights && s.isPrivate !== true
  ).length;
  const mediaSummary = formatMediaSummary(photoCount, videoCount);

  const photosActive = activeSidebarTab === 'photos';
  const designActive = activeSidebarTab === 'design';
  const activityActive = activeSidebarTab === 'activity';
  const settingsActive = activeSidebarTab === 'settings';

  return (
    <aside className={cn('cdsb', isCollapsed && 'cdsb--collapsed')}>
      <div className="cdsb-cover-wrap">
        <SidebarCoverUpload
          coverUrl={coverUrl}
          coverFocalX={coverFocalX}
          coverFocalY={coverFocalY}
          isUpdating={isCoverUploading}
          photoCount={photoCount}
          onPhotoDrop={onCoverPhotoDrop}
          onSelectFromCollection={onSelectCoverFromCollection}
          onCoverFileSelect={onCoverFileSelect}
        />
      </div>

      <div className="cdsb__scroll">

        <nav className="cdsb-nav" aria-label="Delivery navigation">
          <div className={cn('cdsb-photos-panel', photosActive && 'cdsb-photos-panel--active')}>
            <MediaSectionHeader
              active={photosActive}
              summary={mediaSummary}
              onClick={() => onSidebarTabChange('photos')}
            />
            <div className="cdsb-tree cdsb-tree--media">
              {sortedSidebarSets.map((set, index) => {
                const isActive = set.isHighlights ? !activeSetId : activeSetId === set.id;
                return (
                  <SetRow
                    key={set.id}
                    set={set}
                    index={index}
                    isActive={isActive}
                    draggedSetIndex={draggedSetIndex}
                    dragOverSetIndex={dragOverSetIndex}
                    onSetDragStart={onSetDragStart}
                    onSetDragOver={onSetDragOver}
                    onSetDragEnd={onSetDragEnd}
                    onSetDrop={onSetDrop}
                    onSetSelect={onSetSelect}
                    onSetMenuToggle={onSetMenuToggle}
                    showSetMenu={showSetMenu}
                    renderSetMenu={renderSetMenu}
                  />
                );
              })}
            </div>
            <button type="button" className="cdsb-add-set" onClick={onAddSet}>
              + Add set
            </button>
            {namedSetCount > 0 ? (
              <p className="cdsb-visible-sets">
                {visibleNamedSetCount} of {namedSetCount} sets visible to your client
              </p>
            ) : null}
          </div>

          <p className="cdsb-nav__section cdsb-nav__section--group">The delivery</p>

          <NavItem
            active={designActive}
            icon={Pencil}
            label="Design"
            onClick={() => onSidebarTabChange('design')}
          />

          {guestDeliveryEnabled ? (
            <NavItem
              active={activeSidebarTab === 'guests'}
              icon={Target}
              label="Guests"
              count={guestCount}
              onClick={() => onSidebarTabChange('guests')}
            />
          ) : null}

          <NavItem
            active={activityActive}
            icon={Clock}
            label="Activity"
            count={activityCount}
            onClick={() => {
              onSidebarTabChange('activity');
              onActivitySubTabChange?.('feed');
            }}
          />

          <p className="cdsb-nav__section cdsb-nav__section--group">Set once</p>
          <div className={cn('cdsb-settings-block', settingsActive && 'cdsb-settings-block--active')}>
            <NavItem
              active={settingsActive}
              icon={Settings}
              label="Settings"
              onClick={() => onSidebarTabChange('settings')}
              className="cdsb-nav-item--settings"
              expandable
              expanded={settingsActive}
            />
            {settingsActive ? (
              <div className="cdsb-tree cdsb-tree--tabs">
                {SETTINGS_TABS.map((tab) => (
                  <NestedTabItem
                    key={tab.id}
                    active={activeSettingsTab === tab.id}
                    label={tab.label}
                    count={settingsBadge(tab.id)}
                    onClick={() => onSettingsTabChange?.(tab.id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </nav>
      </div>

      <footer className="cdsb-footer">
        <div className="cdsb-storage">
          <div className="cdsb-storage__head">
            <span className="cdsb-storage__label">Storage</span>
            <span className="cdsb-storage__meta">{formatStorageMeter(usedBytes, maxBytes)}</span>
          </div>
          <div className="cdsb-storage__bar">
            <div className="cdsb-storage__bar-fill" style={{ width: `${storagePct}%` }} />
          </div>
        </div>

        <button
          type="button"
          className="cdsb-profile"
          onClick={() => {
            const fromPath = `${location.pathname}${location.search}`;
            navigateToAccount(navigate, '/account', fromPath, accountBackLabel || 'Delivery');
          }}
        >
          <span className="cdsb-profile__avatar">{userInitial}</span>
          <span className="cdsb-profile__text">
            <span className="cdsb-profile__name">{userDisplayLabel}</span>
            <span className="cdsb-profile__role">Studio owner</span>
          </span>
          <ChevronRight className="cdsb-profile__chevron" size={16} />
        </button>

        <button
          type="button"
          className="cdsb-collapse"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '»' : '«'}
        </button>
      </footer>
    </aside>
  );
}

export default CollectionDashboardSidebar;
