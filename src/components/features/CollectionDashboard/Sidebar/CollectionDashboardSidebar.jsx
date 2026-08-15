import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  LayoutGrid,
  Play,
  Pencil,
  Target,
  Clock,
  Settings,
  MoreHorizontal,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useAuth } from '../../../../hooks/useAuth';
import { getUserDisplayLabel, getUserInitial } from '../../../../lib/userInitials';
import { userStorageService } from '../../../../services/userStorage.service';
import { SidebarCoverUpload } from '../CoverSettings/SidebarCoverUpload';
import './CollectionDashboardSidebar.css';

function formatCount(n) {
  const value = Number(n) || 0;
  return value.toLocaleString();
}

function formatStorageDisplay(used, max) {
  const toGb = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 10) return `${Math.round(gb)} GB`;
    if (gb >= 1) return `${gb.toFixed(1).replace(/\.0$/, '')} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };
  return `${toGb(used)} / ${toGb(max)}`;
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
        draggedSetIndex === index && 'cdsb-tree__row--dragging',
        dragOverSetIndex === index && draggedSetIndex !== index && 'cdsb-tree__row--drag-over'
      )}
      draggable
      onDragStart={(e) => onSetDragStart?.(e, index)}
      onDragOver={(e) => onSetDragOver?.(e, index)}
      onDragEnd={onSetDragEnd}
      onDrop={(e) => onSetDrop?.(e, index)}
    >
      <button
        type="button"
        className={cn('cdsb-set-row', isActive && 'cdsb-set-row--active')}
        onClick={() => onSetSelect?.(isHighlights ? null : set.id)}
      >
        {isHighlights ? (
          <Sparkles className="cdsb-set-row__icon" size={15} aria-hidden />
        ) : null}
        <span className="cdsb-set-row__label">{set.name}</span>
        <span className="cdsb-set-row__count">{formatCount(set.photoCount)}</span>
        {hidden ? <EyeOff className="cdsb-set-row__hidden" size={14} aria-label="Hidden from client" /> : null}
      </button>
      <div className="cdsb-set-row__menu">
        <button
          type="button"
          className="cdsb-set-row__menu-btn"
          aria-label={`${set.name} options`}
          onClick={(e) => {
            e.stopPropagation();
            onSetMenuToggle?.(set.id);
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
  filmCount = 0,
  guestCount = 0,
  activityCount = 0,
  guestDeliveryEnabled = false,
  photoDownload = false,
  favoritePhotos = false,
  storeEnabled = false,
}) {
  const navigate = useNavigate();
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
      if (cached) setProfile(JSON.parse(cached));
    } catch {
      /* ignore */
    }
    let cancelled = false;
    userStorageService.calculateUserStorageBytes(user, profile).then((bytes) => {
      if (!cancelled && typeof bytes === 'number' && bytes >= 0) setStorageBytes(bytes);
    });
    return () => {
      cancelled = true;
    };
  }, [user, profile]);

  const maxBytes = useMemo(() => {
    const planLimit = user?.user_metadata?.storage_limit_bytes;
    if (planLimit && Number(planLimit) > 0) return Number(planLimit);
    return 5 * 1024 * 1024 * 1024;
  }, [user?.user_metadata?.storage_limit_bytes]);

  const usedBytes = storageBytes || profile?.storage_used_bytes || 0;
  const storagePct = Math.min(100, maxBytes > 0 ? (usedBytes / maxBytes) * 100 : 0);

  const settingsBadge = (tabId) => {
    if (tabId === 'download') return photoDownload ? 'ON' : 'OFF';
    if (tabId === 'favorite') return favoritePhotos ? 'ON' : 'OFF';
    if (tabId === 'shop') return storeEnabled ? 'ON' : 'OFF';
    return null;
  };

  const visibleSetCount = sortedSidebarSets.filter((s) => s.isPrivate !== true).length;
  const totalSetCount = sortedSidebarSets.length;

  const photosActive = activeSidebarTab === 'photos';
  const designActive = activeSidebarTab === 'design';
  const activityActive = activeSidebarTab === 'activity';
  const settingsActive = activeSidebarTab === 'settings';

  return (
    <aside className={cn('cdsb', isCollapsed && 'cdsb--collapsed')}>
      <div className="cdsb__scroll">
        <div className="cdsb-cover-wrap">
          <SidebarCoverUpload
            coverUrl={coverUrl}
            isUpdating={isCoverUploading}
            onPhotoDrop={onCoverPhotoDrop}
            onSelectFromCollection={onSelectCoverFromCollection}
            onCoverFileSelect={onCoverFileSelect}
          />
        </div>

        <nav className="cdsb-nav" aria-label="Delivery navigation">
          <p className="cdsb-nav__section">Working on</p>

          <div className={cn('cdsb-photos-panel', photosActive && 'cdsb-photos-panel--active')}>
            <NavItem
              active={photosActive}
              icon={LayoutGrid}
              label="Photos"
              count={photoCount}
              onClick={() => onSidebarTabChange('photos')}
            />
            {photosActive ? (
              <div className="cdsb-tree">
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
                <button type="button" className="cdsb-add-set" onClick={onAddSet}>
                  + Add set
                </button>
                {totalSetCount > 0 ? (
                  <p className="cdsb-visible-sets">
                    {visibleSetCount} of {totalSetCount} sets visible to your client
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <NavItem
            active={activeSidebarTab === 'films'}
            icon={Play}
            label="Films"
            count={filmCount}
            onClick={() => onSidebarTabChange('films')}
          />

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

          <p className="cdsb-nav__section cdsb-nav__section--set-once">Set once</p>
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
            <span className="cdsb-storage__meta">{formatStorageDisplay(usedBytes, maxBytes)}</span>
          </div>
          <div className="cdsb-storage__bar">
            <div className="cdsb-storage__bar-fill" style={{ width: `${storagePct}%` }} />
          </div>
        </div>

        <button type="button" className="cdsb-profile" onClick={() => navigate('/account')}>
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
