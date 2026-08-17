import { supabase } from '../lib/supabase/client';
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
import { stripMediaUrlHash } from '../lib/focalPoint';
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
  return stripMediaUrlHash(
    item?.cover_url ||
    item?.list_cover_url ||
    item?.cover_image_url ||
    item?.icon_url ||
    item?.cover ||
    ''
  ) || null;
}

function activityAt(item) {
  return (
    item?.updated_at ||
    item?.published_at ||
    item?.created_at ||
    null
  );
}

/** Published deliveries with no client_sessions row ≈ unopened. */
async function countUnopenedDeliveries(publishedIds) {
  if (!publishedIds.length) return 0;
  try {
    const { data, error } = await supabase
      .from('client_sessions')
      .select('collection_id')
      .in('collection_id', publishedIds);

    if (error) {
      console.warn('Unopened delivery heuristic failed:', error.message);
      return 0;
    }

    const opened = new Set((data || []).map((r) => r.collection_id).filter(Boolean));
    return publishedIds.filter((id) => !opened.has(id)).length;
  } catch (e) {
    console.warn('Unopened delivery heuristic failed:', e);
    return 0;
  }
}

async function countGuestNeedReview(photographerId, liveEventIds) {
  if (!liveEventIds.length) return 0;
  try {
    const { data, error } = await supabase
      .from('event_guests')
      .select('id, delivery_status, event_id')
      .eq('photographer_id', photographerId)
      .in('event_id', liveEventIds);

    if (error) {
      console.warn('Guest review count failed:', error.message);
      return 0;
    }

    return (data || []).filter((g) => {
      const s = g.delivery_status || 'pending';
      return s !== 'sent' && s !== 'matched';
    }).length;
  } catch (e) {
    console.warn('Guest review count failed:', e);
    return 0;
  }
}

async function loadPrintLabStats(photographerId) {
  try {
    let query = supabase
      .from('printstore_orders')
      .select('id, total, status, created_at, photographer_id')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    const orders = (data || []).filter(
      (o) => !o.photographer_id || o.photographer_id === photographerId
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRevenue = orders
      .filter((o) => o.created_at && new Date(o.created_at) >= monthStart)
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const inProduction = orders.filter((o) => IN_PRODUCTION.has(o.status)).length;

    return { monthRevenue, inProduction };
  } catch (e) {
    console.warn('Print lab stats failed:', e);
    return { monthRevenue: 0, inProduction: 0 };
  }
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
    return { modules: emptyModules(), recentWork: [] };
  }

  const [collectionsRes, albumsRes, eventsRes, appsRes, printRes] = await Promise.allSettled([
    galleryService.getCollections(photographerId),
    smartAlbumsService.getAlbums(photographerId),
    guestDeliveryService.getEvents(photographerId),
    mobileGalleryService.getApps(photographerId),
    loadPrintLabStats(photographerId),
  ]);

  const collections = collectionsRes.status === 'fulfilled' ? collectionsRes.value || [] : [];
  const albums = albumsRes.status === 'fulfilled' ? albumsRes.value || [] : [];
  const events = eventsRes.status === 'fulfilled' ? eventsRes.value || [] : [];
  const apps = appsRes.status === 'fulfilled' ? appsRes.value || [] : [];
  const print = printRes.status === 'fulfilled' ? printRes.value : { monthRevenue: 0, inProduction: 0 };

  const publishedDeliveries = collections.filter((c) => c.status === 'published');
  const unopened = await countUnopenedDeliveries(publishedDeliveries.map((c) => c.id));

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
  const needReview = await countGuestNeedReview(
    photographerId,
    liveEvents.map((e) => e.id)
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

  return { modules, recentWork };
}

function buildRecentWork({ collections, albums, events, apps }) {
  const galleryItems = collections.slice(0, 8).map((c) => {
    const at = activityAt(c);
    const rel = formatRelativeTime(at, { style: 'long' }) || 'recently';
    const shared = c.status === 'published';
    return {
      id: `cg-${c.id}`,
      title: c.name || 'Untitled delivery',
      meta: shared
        ? `Client Gallery · shared ${rel}`
        : `Client Gallery · draft · ${rel}`,
      coverUrl: coverOf(c),
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
