import { galleryService } from './gallery.service';
import { smartAlbumsService } from './smartAlbums.service';
import { guestDeliveryService } from './guestDelivery.service';
import { mobileGalleryService } from './mobileGallery.service';
import {
  getAlbumProofStatus,
  getAlbumProofActivityAt,
  getAlbumProofFootnote,
  mergeAlbumProofTimestamps,
} from '../components/smart-albums/albumProofStatus';
import { formatRelativeTime, formatAlbumCardTime } from '../lib/relativeTime';
import { getCoverFocalForSurface, stripMediaUrlHash } from '../lib/focalPoint';
import { getCollectionCardCoverSrc } from '../lib/photoDisplayUrl';
import { INITIAL_STAGES } from '../components/portal/portalData';
import {
  LAB_PIPELINE_STEPS,
} from '../printstore/lab/labOrderStatus';

const MS_DAY = 24 * 60 * 60 * 1000;

const IN_PRODUCTION = new Set(
  LAB_PIPELINE_STEPS.map((s) => s.key).filter(
    (k) => !['shipped', 'completed'].includes(k)
  )
);

function daysSince(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / MS_DAY));
}

function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function formatInr(amount) {
  const n = Math.round(Number(amount) || 0);
  return `₹${n.toLocaleString('en-IN')}`;
}

function coverOf(item) {
  // Use the same card src as the Client Gallery list (web → thumb → stored)
  // so the dashboard thumbnail is pixel-identical to the delivery tile.
  try {
    const cardSrc = getCollectionCardCoverSrc(item);
    if (cardSrc) return stripMediaUrlHash(cardSrc) || null;
  } catch {
    // fall through to legacy fields
  }
  return stripMediaUrlHash(
    item?.cover_url ||
    item?.list_cover_url ||
    item?.cover_image_url ||
    item?.icon_url ||
    item?.cover ||
    ''
  ) || null;
}

function cardFocalOf(item) {
  // Same focal surface as CollectionCardCover (Client Gallery list).
  try {
    const focal = getCoverFocalForSurface(item, 'card');
    if (focal && Number.isFinite(Number(focal.x)) && Number.isFinite(Number(focal.y))) {
      return { focalX: Number(focal.x), focalY: Number(focal.y) };
    }
  } catch {
    // ignore and fall back to centre
  }
  return { focalX: 50, focalY: 50 };
}

function activityAt(item) {
  return (
    item?.updated_at ||
    item?.published_at ||
    item?.created_at ||
    null
  );
}

async function loadStudioOverview() {
  try {
    const { apiFetch } = await import('../lib/api/client');
    return await apiFetch('/v1/engage/studio-overview');
  } catch (e) {
    console.warn('Studio overview failed:', e);
    return null;
  }
}

/** Published deliveries with no client_sessions row ≈ unopened. */
function countUnopenedFromOverview(publishedIds, overview) {
  if (!publishedIds.length) return 0;
  const opened = new Set(overview?.openedCollectionIds || []);
  return publishedIds.filter((id) => !opened.has(id)).length;
}

function countGuestNeedReviewFromOverview(liveEventIds, overview) {
  if (!liveEventIds.length) return 0;
  const wanted = new Set(liveEventIds);
  return (overview?.guests || []).filter((g) => {
    if (!wanted.has(g.event_id)) return false;
    const s = g.delivery_status || 'pending';
    return s !== 'sent' && s !== 'matched';
  }).length;
}

function printLabStatsFromOverview(overview) {
  const orders = overview?.printOrders || [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRevenue = orders
    .filter((o) => o.created_at && new Date(o.created_at) >= monthStart)
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const inProduction = orders.filter((o) => IN_PRODUCTION.has(o.status)).length;
  const awaitingArtwork = orders.filter((o) =>
    /artwork|review|waiting.?customer/i.test(String(o.status || '')),
  ).length;
  return { monthRevenue, inProduction, awaitingArtwork, orders };
}

function portalModuleStats() {
  const stages = INITIAL_STAGES || [];
  const leadCards = stages
    .filter((s) => s.section === 'leads')
    .flatMap((s) => s.cards || []);
  const awaiting = leadCards.filter(
    (c) => c.statusTone === 'awaiting' || c.quoteSent || c.statusLabel
  );

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcoming = leadCards
    .map((c) => ({ card: c, date: c.eventDate ? new Date(c.eventDate) : null }))
    .filter(({ date }) => date && !Number.isNaN(date.getTime()) && date >= dayStart)
    .sort((a, b) => a.date - b.date);

  let status = 'No open leads';
  let tone = 'muted';
  if (upcoming.length) {
    const next = upcoming[0].date;
    const days = Math.max(0, Math.ceil((next.getTime() - now.getTime()) / MS_DAY));
    const weekday = next.toLocaleDateString('en-US', { weekday: 'long' });
    status = days <= 1 ? '1 expires tomorrow' : days < 7 ? `1 expires ${weekday}` : `1 expires soon`;
    tone = 'warn';
  } else if (awaiting.length) {
    status = `${awaiting.length} awaiting signature`;
    tone = 'warn';
  } else if (leadCards.length) {
    status = `${leadCards.length} in pipeline`;
  }

  return {
    metric: plural(leadCards.length, 'open lead'),
    status,
    tone,
  };
}

function portalRecentItems() {
  const stages = INITIAL_STAGES || [];
  return stages
    .flatMap((stage) =>
      (stage.cards || []).map((card) => ({
        id: `portal-${card.id}`,
        title: card.clientName,
        meta: `Portal · ${stage.title}`,
        coverUrl: null,
        gradient: 'linear-gradient(145deg, #2a3a4a 0%, #5a7a8a 45%, #c8b090 100%)',
        at: card.eventDate || null,
        sortAt: card.eventDate ? new Date(card.eventDate).getTime() : 0,
        route: '/portal',
        type: 'portal',
      }))
    )
    .slice(0, 4);
}

/**
 * Live module strip + recent work for the studio dashboard.
 */
export async function loadStudioDashboard(photographerId) {
  if (!photographerId) {
    return {
      modules: emptyModules(),
      recentWork: [],
      studioStats: emptyStudioStats(),
      needsYou: [],
      thisWeek: [],
      heroStatus: 'Your studio is ready. Create a delivery to get started.',
    };
  }

  const [collectionsRes, albumsRes, eventsRes, appsRes, overviewRes] = await Promise.allSettled([
    galleryService.getCollections(photographerId),
    smartAlbumsService.getAlbums(photographerId),
    guestDeliveryService.getEvents(photographerId),
    mobileGalleryService.getApps(photographerId),
    loadStudioOverview(),
  ]);

  const collections = collectionsRes.status === 'fulfilled' ? collectionsRes.value || [] : [];
  const albums = albumsRes.status === 'fulfilled' ? albumsRes.value || [] : [];
  const events = eventsRes.status === 'fulfilled' ? eventsRes.value || [] : [];
  const apps = appsRes.status === 'fulfilled' ? appsRes.value || [] : [];
  const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : null;
  const print = printLabStatsFromOverview(overview);

  const publishedDeliveries = collections.filter((c) => c.status === 'published');
  const unopened = countUnopenedFromOverview(
    publishedDeliveries.map((c) => c.id),
    overview,
  );

  const sharedAlbums = albums.filter((a) => {
    const status = getAlbumProofStatus(mergeAlbumProofTimestamps(a));
    return status.tone !== 'draft';
  });

  const waitingAlbums = sharedAlbums
    .map((a) => {
      const merged = mergeAlbumProofTimestamps(a);
      const status = getAlbumProofStatus(merged);
      const at = getAlbumProofActivityAt(merged);
      return { album: merged, status, at, days: daysSince(at) };
    })
    .filter(({ status }) => ['awaiting', 'feedback', 'revision'].includes(status.tone));

  const maxWaitDays = waitingAlbums.reduce((m, w) => Math.max(m, w.days), 0);

  const liveEvents = events.filter((e) => e.status === 'published');
  const needReview = countGuestNeedReviewFromOverview(
    liveEvents.map((e) => e.id),
    overview,
  );

  const publishedApps = apps.filter((a) => a.status === 'published');
  const portal = portalModuleStats();

  const modules = [
    {
      id: 'client-gallery',
      title: 'Client Gallery',
      metric: plural(publishedDeliveries.length, 'live delivery', 'live deliveries'),
      status: unopened > 0 ? `${unopened} unopened` : 'All opened',
      tone: unopened > 0 ? 'muted' : 'muted',
      route: '/client-gallery',
      icon: 'gallery',
    },
    {
      id: 'album-proofer',
      title: 'Album Proofer',
      metric: plural(sharedAlbums.length, 'shared'),
      status:
        waitingAlbums.length > 0
          ? `${waitingAlbums.length} waiting${maxWaitDays > 0 ? ` ${maxWaitDays} day${maxWaitDays === 1 ? '' : 's'}` : ''}`
          : 'None waiting',
      tone: waitingAlbums.length > 0 ? 'warn' : 'muted',
      route: '/album-proofer',
      icon: 'album',
    },
    {
      id: 'portal',
      title: 'Portal',
      metric: portal.metric,
      status: portal.status,
      tone: portal.tone,
      route: '/portal',
      icon: 'portal',
    },
    {
      id: 'guest-delivery',
      title: 'Guest Deliveries',
      metric: plural(liveEvents.length, 'live event'),
      status: needReview > 0 ? `${needReview} need review` : 'All clear',
      tone: needReview > 0 ? 'muted' : 'muted',
      route: '/guest-delivery',
      icon: 'guest',
    },
    {
      id: 'mobile-gallery',
      title: 'Mobile Gallery',
      metric: plural(apps.length, 'app'),
      status: plural(publishedApps.length, 'delivery', 'deliveries'),
      tone: 'muted',
      route: '/mobile-gallery',
      icon: 'mobile',
    },
    {
      id: 'print-lab',
      title: 'Print Lab',
      metric: `${formatInr(print.monthRevenue)} this month`,
      status:
        print.inProduction > 0
          ? `${print.inProduction} in production`
          : 'Nothing in production',
      tone: print.inProduction > 0 ? 'ok' : 'muted',
      route: '/store/orders',
      icon: 'print',
    },
  ];

  const recentWork = buildRecentWork({
    collections,
    albums,
    events,
    apps,
  });

  const studioStats = buildStudioStats({
    publishedDeliveries,
    sharedAlbums,
    liveEvents,
    collections,
    print,
  });

  const needsYou = buildNeedsYou({
    waitingAlbums,
    liveEvents,
    overview,
    needReview,
    unopened,
    publishedDeliveries,
    print,
  });

  const thisWeek = buildThisWeek({ collections, events, albums: waitingAlbums });

  const heroStatus = buildHeroStatus({
    needsYou,
    waitingAlbums,
    needReview,
    unopened,
    publishedDeliveries,
  });

  return {
    modules,
    recentWork,
    studioStats,
    needsYou,
    thisWeek,
    heroStatus,
  };
}

function emptyStudioStats() {
  return [
    { label: 'LIVE DELIVERIES', value: '0', sub: 'None published yet' },
    { label: 'SHARED ALBUMS', value: '0', sub: 'None shared yet' },
    { label: 'PRINT LAB (MONTH)', value: '₹0', sub: 'No orders this month' },
    { label: 'GUEST EVENTS', value: '0', sub: 'None live' },
  ];
}

function buildStudioStats({ publishedDeliveries, sharedAlbums, liveEvents, collections, print }) {
  const drafts = collections.filter((c) => c.status !== 'published').length;
  return [
    {
      label: 'LIVE DELIVERIES',
      value: String(publishedDeliveries.length),
      sub: drafts > 0 ? `${drafts} draft${drafts === 1 ? '' : 's'}` : 'All published',
    },
    {
      label: 'SHARED ALBUMS',
      value: String(sharedAlbums.length),
      sub: sharedAlbums.length ? 'In client review' : 'None shared yet',
    },
    {
      label: 'PRINT LAB (MONTH)',
      value: formatInr(print.monthRevenue),
      sub:
        print.inProduction > 0
          ? `${print.inProduction} in production`
          : 'Nothing in production',
    },
    {
      label: 'GUEST EVENTS',
      value: String(liveEvents.length),
      sub: liveEvents.length ? 'Published events' : 'None live',
    },
  ];
}

function buildNeedsYou({
  waitingAlbums,
  liveEvents,
  overview,
  needReview,
  unopened,
  publishedDeliveries,
  print,
}) {
  const groups = [];

  const albumItems = waitingAlbums.slice(0, 4).map(({ album, status, days }) => ({
    channel: 'ALBUM',
    title: album.name || 'Untitled album',
    sub: status.label || 'Needs attention',
    status: days > 0 ? `Waiting ${days} day${days === 1 ? '' : 's'}` : 'Waiting',
    tone: 'warn',
    action: 'Open album →',
    route: `/album-proofer/album/${album.id}`,
  }));
  if (albumItems.length) {
    groups.push({ group: 'ON YOUR DESK', items: albumItems });
  }

  const guestItems = [];
  if (needReview > 0) {
    const eventById = new Map(liveEvents.map((e) => [e.id, e]));
    const guests = (overview?.guests || []).filter((g) => {
      const s = g.delivery_status || 'pending';
      return s !== 'sent' && s !== 'matched';
    });
    const byEvent = new Map();
    for (const g of guests) {
      const key = g.event_id;
      byEvent.set(key, (byEvent.get(key) || 0) + 1);
    }
    for (const [eventId, count] of [...byEvent.entries()].slice(0, 3)) {
      const ev = eventById.get(eventId);
      guestItems.push({
        channel: 'GUEST DELIVERY',
        title: ev?.name || 'Guest event',
        sub: `${count} guest${count === 1 ? '' : 's'} need review or delivery`,
        status: 'Needs you',
        tone: 'warn',
        action: 'Review guests →',
        route: `/guest-delivery/event/${eventId}`,
      });
    }
  }
  if (guestItems.length) {
    groups.push({ group: 'GUEST DELIVERY', items: guestItems });
  }

  const moneyItems = [];
  if (print.awaitingArtwork > 0) {
    moneyItems.push({
      channel: 'PRINT LAB',
      title: `${print.awaitingArtwork} order${print.awaitingArtwork === 1 ? '' : 's'} need artwork review`,
      sub: 'Customers are waiting on lab feedback',
      status: 'Needs review',
      tone: 'warn',
      action: 'Open lab →',
      route: '/store/orders',
    });
  }
  if (moneyItems.length) {
    groups.push({ group: 'MONEY', items: moneyItems });
  }

  const deliveryItems = [];
  if (unopened > 0 && publishedDeliveries.length) {
    deliveryItems.push({
      channel: 'CLIENT GALLERY',
      title: `${unopened} published deliver${unopened === 1 ? 'y' : 'ies'} unopened`,
      sub: 'Clients have not visited yet',
      status: 'Unopened',
      tone: 'muted',
      action: 'Open galleries →',
      route: '/client-gallery',
    });
  }
  if (deliveryItems.length) {
    groups.push({ group: 'CLIENT GALLERY', items: deliveryItems });
  }

  return groups;
}

function buildThisWeek({ collections, events, albums }) {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(dayStart.getTime() + 7 * MS_DAY);

  const items = [];

  const pushDated = (title, detail, dateValue, route, tone = 'ok', progress = 1, total = 1) => {
    if (!dateValue) return;
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime()) || d < dayStart || d > weekEnd) return;
    items.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      date: String(d.getDate()),
      title,
      detail,
      status: tone === 'warn' ? 'Needs attention' : 'Scheduled',
      tone,
      progress,
      total,
      route,
      sortAt: d.getTime(),
    });
  };

  for (const c of collections) {
    pushDated(
      c.name || 'Delivery',
      c.status === 'published' ? 'Published delivery' : 'Draft delivery',
      c.event_date,
      `/deliveries/manage?id=${c.id}`,
      c.status === 'published' ? 'ok' : 'warn',
    );
  }
  for (const e of events) {
    pushDated(
      e.name || 'Guest event',
      e.status === 'published' ? 'Guest delivery event' : 'Draft guest event',
      e.event_date,
      `/guest-delivery/event/${e.id}`,
      e.status === 'published' ? 'ok' : 'warn',
    );
  }
  for (const { album, status } of albums.slice(0, 4)) {
    const at = getAlbumProofActivityAt(album) || album.updated_at;
    if (!at) continue;
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) continue;
    // Show album follow-ups that are currently waiting, pinned to today if older.
    const pin = d < dayStart ? dayStart : d;
    if (pin > weekEnd) continue;
    items.push({
      day: pin.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      date: String(pin.getDate()),
      title: album.name || 'Album proof',
      detail: status.label || 'Album waiting',
      status: 'Follow up',
      tone: 'warn',
      progress: 1,
      total: 2,
      route: `/album-proofer/album/${album.id}`,
      sortAt: pin.getTime(),
    });
  }

  return items
    .sort((a, b) => a.sortAt - b.sortAt)
    .slice(0, 5)
    .map(({ sortAt, ...rest }) => {
      void sortAt;
      return rest;
    });
}

function buildHeroStatus({ needsYou, waitingAlbums, needReview, unopened, publishedDeliveries }) {
  const actionCount = needsYou.reduce((n, g) => n + (g.items?.length || 0), 0);
  if (actionCount === 0) {
    if (publishedDeliveries.length === 0) {
      return 'Your studio is ready. Create a delivery to get started.';
    }
    return `${formatTodayLineBase()}. Everything looks clear — no clients waiting on you.`;
  }
  const bits = [];
  if (waitingAlbums.length) bits.push(`${waitingAlbums.length} album${waitingAlbums.length === 1 ? '' : 's'} need attention`);
  if (needReview) bits.push(`${needReview} guest${needReview === 1 ? '' : 's'} need review`);
  if (unopened) bits.push(`${unopened} deliver${unopened === 1 ? 'y is' : 'ies are'} still unopened`);
  const detail = bits.length ? bits.join(', ') : `${actionCount} item${actionCount === 1 ? '' : 's'} need you`;
  return `${formatTodayLineBase()}. ${detail}.`;
}

function formatTodayLineBase() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function buildRecentWork({ collections, albums, events, apps }) {
  const galleryItems = collections.slice(0, 8).map((c) => {
    const at = activityAt(c);
    const rel = formatRelativeTime(at, { style: 'long' }) || 'recently';
    const shared = c.status === 'published';
    const { focalX, focalY } = cardFocalOf(c);
    return {
      id: `cg-${c.id}`,
      title: c.name || 'Untitled delivery',
      meta: shared
        ? `Client Gallery · shared ${rel}`
        : `Client Gallery · draft · ${rel}`,
      coverUrl: coverOf(c),
      focalX,
      focalY,
      gradient: 'linear-gradient(145deg, #4a2c6a 0%, #c45a3a 55%, #e8a060 100%)',
      sortAt: new Date(at || 0).getTime(),
      route: `/deliveries/manage?id=${c.id}`,
      type: 'client-gallery',
    };
  });

  const albumItems = albums.slice(0, 8).map((a) => {
    const merged = mergeAlbumProofTimestamps(a);
    const status = getAlbumProofStatus(merged);
    const at = getAlbumProofActivityAt(merged);
    const footnote = getAlbumProofFootnote(merged, status);
    const cardTime = formatAlbumCardTime(at) || formatRelativeTime(at, { style: 'long' });
    const detail = footnote || status.label;
    const meta = cardTime
      ? `Album Proofer · ${detail} · ${cardTime}`
      : `Album Proofer · ${detail}`;

    return {
      id: `ap-${a.id}`,
      title: a.name || 'Untitled album',
      meta,
      album: merged,
      coverUrl: null,
      gradient: 'linear-gradient(145deg, #3d2a1f 0%, #8b5a3c 50%, #c4a07a 100%)',
      sortAt: new Date(at || merged.updated_at || merged.created_at || 0).getTime(),
      route: `/album-proofer/album/${a.id}`,
      type: 'album-proofer',
    };
  });

  const guestItems = events.slice(0, 6).map((e) => {
    const at = activityAt(e);
    const rel = formatRelativeTime(at, { style: 'long' }) || 'recently';
    const pending = e.guest_count || 0;
    return {
      id: `gd-${e.id}`,
      title: e.name || 'Untitled event',
      meta:
        e.status === 'published'
          ? `Guest Delivery · ${pending ? `${pending} guests · ` : ''}${rel}`
          : `Guest Delivery · draft · ${rel}`,
      coverUrl: coverOf(e),
      gradient: 'linear-gradient(145deg, #5a2a1a 0%, #a85830 50%, #d4a060 100%)',
      sortAt: new Date(at || 0).getTime(),
      route: `/guest-delivery/event/${e.id}`,
      type: 'guest-delivery',
    };
  });

  const mobileItems = apps.slice(0, 4).map((a) => {
    const at = activityAt(a);
    const rel = formatRelativeTime(at, { style: 'long' }) || 'recently';
    return {
      id: `mg-${a.id}`,
      title: a.name || 'Untitled app',
      meta: `Mobile Gallery · ${a.status === 'published' ? 'live' : 'draft'} · ${rel}`,
      coverUrl: coverOf(a),
      gradient: 'linear-gradient(145deg, #1f3a4a 0%, #3a6a7a 50%, #c4b080 100%)',
      sortAt: new Date(at || 0).getTime(),
      route: `/mobile-gallery/app/${a.id}`,
      type: 'mobile-gallery',
    };
  });

  const portalItems = portalRecentItems();

  return [...galleryItems, ...albumItems, ...guestItems, ...mobileItems, ...portalItems]
    .sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0))
    .slice(0, 4);
}

function emptyModules() {
  return [
    {
      id: 'client-gallery',
      title: 'Client Gallery',
      metric: '0 live deliveries',
      status: 'None yet',
      tone: 'muted',
      route: '/client-gallery',
      icon: 'gallery',
    },
    {
      id: 'album-proofer',
      title: 'Album Proofer',
      metric: '0 shared',
      status: 'None waiting',
      tone: 'muted',
      route: '/album-proofer',
      icon: 'album',
    },
    {
      id: 'portal',
      title: 'Portal',
      metric: '0 open leads',
      status: 'No open leads',
      tone: 'muted',
      route: '/portal',
      icon: 'portal',
    },
    {
      id: 'guest-delivery',
      title: 'Guest Deliveries',
      metric: '0 live events',
      status: 'All clear',
      tone: 'muted',
      route: '/guest-delivery',
      icon: 'guest',
    },
    {
      id: 'mobile-gallery',
      title: 'Mobile Gallery',
      metric: '0 apps',
      status: '0 deliveries',
      tone: 'muted',
      route: '/mobile-gallery',
      icon: 'mobile',
    },
    {
      id: 'print-lab',
      title: 'Print Lab',
      metric: '₹0 this month',
      status: 'Nothing in production',
      tone: 'muted',
      route: '/store/orders',
      icon: 'print',
    },
  ];
}
