import React, { useMemo, useState } from 'react';
import {
  activitySubTabToFeedFilter,
  buildActivityFeedItems,
  filterActivityFeedItems,
  formatActivityRelativeTime,
} from '../../../../lib/buildActivityFeed';
import './ActivityFeed.css';

const FILTERS = [
  { id: 'everything', label: 'Everything' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'selections', label: 'Selections' },
  { id: 'orders', label: 'Orders' },
  { id: 'guests', label: 'Guests' },
  { id: 'opens', label: 'Opens' },
];

function FeedCopy({ parts }) {
  return (
    <span className="cd-activity-feed__copy">
      {(parts || []).map((part, index) =>
        part.bold ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>
      )}
    </span>
  );
}

export function ActivityFeed({
  activeActivitySubTab,
  downloadActivity = [],
  favoriteActivity = [],
  storeOrders = [],
  storeOrderItems = [],
  emailRegistrationActivity = [],
  galleryOpenActivity = [],
  guestDeliveryGuests = [],
  loadingActivity = false,
  headerActions = null,
  onSelectItem,
}) {
  const [filter, setFilter] = useState(() => activitySubTabToFeedFilter(activeActivitySubTab));

  React.useEffect(() => {
    setFilter(activitySubTabToFeedFilter(activeActivitySubTab));
  }, [activeActivitySubTab]);

  const items = useMemo(
    () =>
      buildActivityFeedItems({
        downloadActivity,
        favoriteActivity,
        storeOrders,
        storeOrderItems,
        emailRegistrationActivity,
        galleryOpenActivity,
        guestDeliveryGuests,
      }),
    [
      downloadActivity,
      favoriteActivity,
      storeOrders,
      storeOrderItems,
      emailRegistrationActivity,
      galleryOpenActivity,
      guestDeliveryGuests,
    ]
  );

  const visible = useMemo(() => filterActivityFeedItems(items, filter), [items, filter]);

  const emptyTitle =
    filter === 'downloads'
      ? 'No downloads yet'
      : filter === 'selections'
        ? 'No selections yet'
        : filter === 'orders'
          ? 'No orders yet'
          : filter === 'guests'
            ? 'No guest activity yet'
            : filter === 'opens'
              ? 'No opens yet'
              : 'No activity yet';

  const emptySub =
    filter === 'everything'
      ? 'Downloads, selections, orders, guest registrations and opens will show up here.'
      : 'Activity of this type will appear here when visitors interact with the delivery.';

  return (
    <div className="cd-activity-main">
      <div className="cd-activity-feed">
        <header className="cd-activity-feed__header">
          <div className="cd-activity-feed__header-row">
            <div>
              <h2 className="cd-activity-feed__title">Activity</h2>
              <p className="cd-activity-feed__sub">everything that has happened in this delivery</p>
            </div>
            {headerActions}
          </div>
        </header>

        <div className="cd-activity-feed__filters" role="tablist" aria-label="Activity filters">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={`cd-activity-feed__pill${filter === item.id ? ' is-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loadingActivity && visible.length === 0 ? (
          <p className="cd-activity-feed__empty-sub" style={{ marginTop: 28 }}>
            Loading activity…
          </p>
        ) : visible.length === 0 ? (
          <div className="cd-activity-feed__empty">
            <p>{emptyTitle}</p>
            <p className="cd-activity-feed__empty-sub">{emptySub}</p>
          </div>
        ) : (
          <div className="cd-activity-feed__list" role="list">
            {visible.map((item) => {
              const clickable = typeof onSelectItem === 'function';
              const RowTag = clickable ? 'button' : 'div';
              return (
                <RowTag
                  key={item.id}
                  type={clickable ? 'button' : undefined}
                  className="cd-activity-feed__row"
                  role="listitem"
                  onClick={clickable ? () => onSelectItem(item) : undefined}
                >
                  <span className={`cd-activity-feed__badge cd-activity-feed__badge--${item.filter}`}>
                    {item.badge}
                  </span>
                  <span className="cd-activity-feed__actor">{item.actor}</span>
                  <FeedCopy parts={item.textParts} />
                  <span className="cd-activity-feed__time">{formatActivityRelativeTime(item.at)}</span>
                </RowTag>
              );
            })}
          </div>
        )}

        <p className="cd-activity-feed__note">
          One log for the whole delivery. Downloads, client picks, print orders, guest registrations and
          opens — filtered rather than split across separate screens.
        </p>
      </div>
    </div>
  );
}
