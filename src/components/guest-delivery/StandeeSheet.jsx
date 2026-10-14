import { useId } from 'react';
import './StandeeSheet.css';

/**
 * Print artwork from quiet-standee-templates.html.
 * Stocks, type and layout are print colour — they do not follow the app theme.
 */

const HEADLINE = 'Every photograph you’re\u00A0in';
const SUBLINE = 'Scan, send one selfie, and we will send you every photograph you are in.';
const CONSENT =
    'Your selfie is used only to find your photographs and is deleted after 90 days. Full notice at the address above.';
const TYPED = 'photos.karakovan.in/s/7Q4M';

const SCAN = {
    en: 'Scan to get your photographs',
    ta: 'உங்கள் புகைப்படங்களைப் பெற ஸ்கேன் செய்யுங்கள்',
    hi: 'अपनी तस्वीरें पाने के लिए स्कैन करें',
    te: 'మీ ఫోటోల కోసం స్కాన్ చేయండి',
    ml: 'നിങ്ങളുടെ ചിത്രങ്ങൾക്കായി സ്കാൻ ചെയ്യുക',
};

export const STANDEE_LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'ta', label: 'Tamil' },
    { value: 'hi', label: 'Hindi' },
    { value: 'te', label: 'Telugu' },
    { value: 'ml', label: 'Malayalam' },
];

export const STANDEE_PROMISE = {
    same_evening: 'Photographs the same evening',
    next_day: 'Photographs by Thursday 20 March',
    within_3_days: 'Photographs within 3 days',
    within_week: 'Photographs within a week',
    custom: 'Photographs on the date you set',
};

const QR_PATH =
    'M2 2h7v1h-7zM11 2h1v1h-1zM17 2h1v1h-1zM20 2h7v1h-7zM2 3h1v1h-1zM8 3h1v1h-1zM12 3h2v1h-2zM15 3h1v1h-1zM17 3h1v1h-1zM20 3h1v1h-1zM26 3h1v1h-1zM2 4h1v1h-1zM4 4h3v1h-3zM8 4h1v1h-1zM11 4h1v1h-1zM14 4h1v1h-1zM17 4h2v1h-2zM20 4h1v1h-1zM22 4h3v1h-3zM26 4h1v1h-1zM2 5h1v1h-1zM4 5h3v1h-3zM8 5h1v1h-1zM12 5h1v1h-1zM14 5h1v1h-1zM17 5h1v1h-1zM20 5h1v1h-1zM22 5h3v1h-3zM26 5h1v1h-1zM2 6h1v1h-1zM4 6h3v1h-3zM8 6h1v1h-1zM11 6h1v1h-1zM13 6h1v1h-1zM15 6h1v1h-1zM20 6h1v1h-1zM22 6h3v1h-3zM26 6h1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM12 7h1v1h-1zM15 7h1v1h-1zM17 7h1v1h-1zM20 7h1v1h-1zM26 7h1v1h-1zM2 8h7v1h-7zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h7v1h-7zM11 9h1v1h-1zM13 9h2v1h-2zM8 10h1v1h-1zM13 10h1v1h-1zM15 10h1v1h-1zM18 10h1v1h-1zM4 11h1v1h-1zM6 11h1v1h-1zM10 11h1v1h-1zM13 11h3v1h-3zM17 11h1v1h-1zM23 11h1v1h-1zM25 11h2v1h-2zM2 12h2v1h-2zM5 12h1v1h-1zM7 12h2v1h-2zM11 12h1v1h-1zM14 12h2v1h-2zM17 12h1v1h-1zM19 12h1v1h-1zM21 12h2v1h-2zM5 13h3v1h-3zM9 13h1v1h-1zM12 13h2v1h-2zM15 13h5v1h-5zM21 13h5v1h-5zM6 14h1v1h-1zM8 14h1v1h-1zM10 14h3v1h-3zM15 14h2v1h-2zM22 14h1v1h-1zM24 14h2v1h-2zM2 15h1v1h-1zM6 15h1v1h-1zM10 15h1v1h-1zM13 15h2v1h-2zM16 15h1v1h-1zM18 15h1v1h-1zM21 15h2v1h-2zM24 15h3v1h-3zM4 16h2v1h-2zM8 16h2v1h-2zM12 16h2v1h-2zM15 16h2v1h-2zM18 16h1v1h-1zM20 16h1v1h-1zM23 16h2v1h-2zM26 16h1v1h-1zM2 17h1v1h-1zM4 17h2v1h-2zM13 17h1v1h-1zM15 17h1v1h-1zM19 17h1v1h-1zM22 17h1v1h-1zM25 17h2v1h-2zM2 18h5v1h-5zM8 18h2v1h-2zM11 18h2v1h-2zM14 18h1v1h-1zM16 18h1v1h-1zM18 18h5v1h-5zM13 19h1v1h-1zM16 19h3v1h-3zM22 19h3v1h-3zM2 20h7v1h-7zM12 20h1v1h-1zM14 20h2v1h-2zM17 20h2v1h-2zM20 20h1v1h-1zM22 20h1v1h-1zM24 20h2v1h-2zM2 21h1v1h-1zM8 21h1v1h-1zM11 21h4v1h-4zM16 21h3v1h-3zM22 21h1v1h-1zM25 21h2v1h-2zM2 22h1v1h-1zM4 22h3v1h-3zM8 22h1v1h-1zM16 22h1v1h-1zM18 22h5v1h-5zM25 22h2v1h-2zM2 23h1v1h-1zM4 23h3v1h-3zM8 23h1v1h-1zM12 23h4v1h-4zM17 23h1v1h-1zM19 23h3v1h-3zM23 23h2v1h-2zM26 23h1v1h-1zM2 24h1v1h-1zM4 24h3v1h-3zM8 24h1v1h-1zM15 24h1v1h-1zM17 24h1v1h-1zM19 24h3v1h-3zM23 24h2v1h-2zM2 25h1v1h-1zM8 25h1v1h-1zM15 25h1v1h-1zM17 25h1v1h-1zM2 26h7v1h-7zM11 26h2v1h-2zM14 26h3v1h-3zM19 26h8v1h-8z';

function orderedScanLines(languages) {
    const picked = (Array.isArray(languages) ? languages : []).filter((code) => SCAN[code]);
    const unique = [...new Set(picked)];
    const rest = unique.filter((code) => code !== 'en');
    const ordered = unique.includes('en') || unique.length === 0 ? ['en', ...rest] : unique;
    return ordered.map((code) => SCAN[code]);
}

function parseCalendarDate(value) {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatCalendarDate(date, withWeekday) {
    return date.toLocaleDateString('en-GB', {
        weekday: withWeekday ? 'long' : undefined,
        day: 'numeric',
        month: 'long',
        year: withWeekday ? undefined : 'numeric',
    });
}

function promiseFor(arrival, eventDateValue, customDate) {
    if (arrival === 'custom') {
        const picked = parseCalendarDate(customDate);
        if (!picked) return 'Photographs on the date you set';
        return `Photographs on ${formatCalendarDate(picked)}`;
    }
    const date = parseCalendarDate(eventDateValue);
    if (!date) return STANDEE_PROMISE[arrival] || STANDEE_PROMISE.next_day;
    if (arrival === 'same_evening') return 'Photographs the same evening';
    if (arrival === 'within_3_days') return 'Photographs within 3 days';
    if (arrival === 'within_week') return 'Photographs within a week';
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return `Photographs by ${formatCalendarDate(next, true)}`;
}

function Mark({ studioName, studioLine }) {
    if (studioName) {
        return (
            <div className="st-brand" data-part="mark">
                <svg className="st-gem" viewBox="0 0 30 30" aria-hidden="true">
                    <g fill="none" stroke="currentColor" strokeWidth="1.6">
                        <rect x="5.8" y="5.8" width="18.4" height="18.4" rx="3.4" transform="rotate(45 15 15)" />
                    </g>
                    <circle cx="15" cy="15" r="3.6" fill="currentColor" />
                </svg>
                <div className="st-word">
                    <b>{studioName}</b>
                    {studioLine ? <span>{studioLine}</span> : null}
                </div>
            </div>
        );
    }
    return (
        <div className="st-brand" data-part="mark">
            <svg className="st-markart" viewBox="0 0 132 30" role="img" aria-label="Karakovan">
                <g fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="5.8" y="5.8" width="18.4" height="18.4" rx="3.4" transform="rotate(45 15 15)" />
                </g>
                <circle cx="15" cy="15" r="3.6" fill="currentColor" />
                <text
                    x="36"
                    y="14.5"
                    fill="currentColor"
                    fontFamily="Fraunces, Georgia, serif"
                    fontSize="13.5"
                    letterSpacing=".01em"
                >
                    Karakovan
                </text>
                <text
                    x="36.5"
                    y="23.5"
                    fill="currentColor"
                    opacity=".6"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontSize="4.4"
                    fontWeight="600"
                    letterSpacing=".34em"
                >
                    PHOTOGRAPHY
                </text>
            </svg>
        </div>
    );
}

function Intro({ content }) {
    const sample = !content.eventName && !content.eventDateLabel;
    return (
        <>
            <Mark studioName={content.studioName} studioLine={content.studioLine} />
            <div className="st-rule" />
            <div className="st-event">
                {sample ? (
                    <>
                        <b>Aditi &amp; Rajat</b> · 18 March 2026
                    </>
                ) : (
                    <>
                        <b>{content.eventName || 'This delivery'}</b>
                        {content.eventDateLabel ? ` · ${content.eventDateLabel}` : null}
                    </>
                )}
            </div>
            <div className="st-head">{HEADLINE}</div>
            <div className="st-line">{SUBLINE}</div>
        </>
    );
}

function CodePanel({ content }) {
    return (
        <div className="st-qrbox">
            {content.qrSrc ? (
                <img src={content.qrSrc} alt="" />
            ) : (
                <svg viewBox="0 0 29 29" role="img" aria-label="The code for this delivery">
                    <rect width="29" height="29" fill="#fff" />
                    <path d={QR_PATH} fill="#000" />
                </svg>
            )}
            <div className="st-typed">{content.codeLabel || TYPED}</div>
        </div>
    );
}

function ScanLines({ languages }) {
    return (
        <div className="st-scan">
            {orderedScanLines(languages).map((line) => (
                <span key={line}>{line}</span>
            ))}
        </div>
    );
}

function FestiveBand({ patternId, edge }) {
    return (
        <div className="st-band" {...{ [`data-${edge}`]: '' }}>
            <svg viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                    <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
                        <rect
                            x="4"
                            y="1.2"
                            width="2.6"
                            height="2.6"
                            transform="rotate(45 5.3 2.5)"
                            fill="currentColor"
                        />
                        <circle cx="5" cy="7.4" r=".9" fill="currentColor" opacity=".7" />
                    </pattern>
                </defs>
                <rect width="120" height="10" fill={`url(#${patternId})`} />
                <rect y="9.4" width="120" height=".6" fill="currentColor" opacity=".55" />
            </svg>
        </div>
    );
}

function CropMarks() {
    return (
        <div className="crop" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i /><i />
        </div>
    );
}

export function StandeeSheet({
    design = 'classic',
    ratio = 'a',
    languages = ['en', 'ta'],
    arrival = 'next_day',
    crops = false,
    studioName,
    studioLine = 'Photography',
    eventName,
    eventDateLabel,
    eventDateValue,
    codeLabel,
    qrSrc,
    customDate,
}) {
    const rawId = useId().replace(/:/g, '');
    const promise = eventDateValue || customDate
        ? promiseFor(arrival, eventDateValue, customDate)
        : (STANDEE_PROMISE[arrival] || STANDEE_PROMISE.next_day);
    const content = {
        studioName,
        studioLine,
        eventName,
        eventDateLabel,
        codeLabel,
        qrSrc,
    };
    const safeDesign = design === 'modern' || design === 'festive' ? design : 'classic';

    let sheet;
    if (safeDesign === 'modern') {
        sheet = (
            <div className="st-sheet">
                <div className="st-top">
                    <Intro content={content} />
                </div>
                <div className="st-mid">
                    <CodePanel content={content} />
                    <div className="st-side">
                        <ScanLines languages={languages} />
                        <div className="st-foot">
                            <div>{promise}</div>
                        </div>
                    </div>
                </div>
                <div className="st-end">
                    <div className="st-consent">{CONSENT}</div>
                </div>
            </div>
        );
    } else if (safeDesign === 'festive') {
        sheet = (
            <div className="st-sheet">
                <FestiveBand patternId={`${rawId}-top`} edge="top" />
                <FestiveBand patternId={`${rawId}-bot`} edge="bottom" />
                <div className="st-top">
                    <Intro content={content} />
                </div>
                <div className="st-mid">
                    <CodePanel content={content} />
                </div>
                <div className="st-end">
                    <ScanLines languages={languages} />
                    <div className="st-foot">
                        <div>{promise}</div>
                    </div>
                    <div className="st-consent">{CONSENT}</div>
                </div>
            </div>
        );
    } else {
        sheet = (
            <div className="st-sheet">
                <div className="st-frame" />
                <div className="st-top">
                    <Intro content={content} />
                </div>
                <div className="st-mid">
                    <CodePanel content={content} />
                </div>
                <div className="st-end">
                    <ScanLines languages={languages} />
                    <div className="st-foot">
                        <div>{promise}</div>
                    </div>
                    <div className="st-consent">{CONSENT}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="gd-standee">
            <div className="proof">
                <div className="sheetwrap">
                    <div className="stand" data-design={safeDesign} data-ratio={ratio}>
                        {sheet}
                    </div>
                    {crops ? <CropMarks /> : null}
                </div>
            </div>
        </div>
    );
}

export const STANDEE_DESIGNS = [
    {
        value: 'classic',
        title: 'Classic',
        kicker: 'Ivory stock · serif · hairline',
        note: 'Reads as stationery rather than signage, which suits a wedding entrance more than a trade stand.',
    },
    {
        value: 'modern',
        title: 'Modern',
        kicker: 'Near-black · sans · one accent',
        note: 'The code keeps a white panel. It never inverts, so older phone cameras can still scan it.',
    },
    {
        value: 'festive',
        title: 'Festive',
        kicker: 'Marigold · henna ink · centred',
        note: 'Centred, italic headline, ornamented rule. The ornament uses the rule’s colour.',
    },
];

export const STANDEE_SIZES = [
    {
        id: 'a3',
        ratio: 'a',
        className: 'gd-size-a3',
        title: 'A3 standee',
        detail: 'Read at about 1.2 m, across a queue',
        measure: '120 mm code',
    },
    {
        id: 'a5',
        ratio: 'a',
        className: 'gd-size-a5',
        title: 'A5 table card',
        detail: 'Read at arm’s length, about 0.5 m',
        measure: '55 mm code',
    },
    {
        id: 'wide',
        ratio: 'wide',
        className: 'gd-size-wide',
        title: 'Venue screen',
        detail: '1920 × 1080, on the hall’s display',
        measure: 'no print size — it is light',
    },
    {
        id: 'tall',
        ratio: 'tall',
        className: 'gd-size-tall',
        title: 'Phone status card',
        detail: '1080 × 1920, for the studio’s story',
        measure: 'no print size',
    },
];
