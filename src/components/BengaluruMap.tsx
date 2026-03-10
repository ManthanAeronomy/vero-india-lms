import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Clock3, Loader2 } from 'lucide-react';
import { useLeads } from '@/contexts/LeadsContext';
import { geocodeBengaluruAddress } from '@/utils/geocode';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons in react-leaflet (webpack/vite)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];
const BENGALURU_ZOOM = 12;

const BENGALURU_AREAS: { name: string; lat: number; lng: number }[] = [
  { name: 'MG Road', lat: 12.9751, lng: 77.6063 },
  { name: 'Koramangala', lat: 12.9342, lng: 77.6069 },
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { name: 'Whitefield', lat: 12.9698, lng: 77.7499 },
  { name: 'Electronic City', lat: 12.8456, lng: 77.6603 },
  { name: 'Jayanagar', lat: 12.925, lng: 77.5936 },
  { name: 'Malleswaram', lat: 13.0035, lng: 77.5644 },
  { name: 'HSR Layout', lat: 12.9121, lng: 77.6446 },
  { name: 'Bellandur', lat: 12.926, lng: 77.6762 },
  { name: 'Marathahalli', lat: 12.9592, lng: 77.6974 },
];

function formatMeetingTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function MapBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, positions]);
  return null;
}

export function BengaluruMap() {
  const { leads } = useLeads();
  const [geocoded, setGeocoded] = useState<Record<string, { lat: number; lng: number }>>({});

  const upcomingWithLocation = useMemo(
    () =>
      leads
        .filter(
          (l) =>
            l.meetingAt &&
            new Date(l.meetingAt) >= new Date() &&
            l.meetingSiteVisit?.address &&
            l.meetingSiteVisit?.postalCode
        )
        .sort((a, b) => new Date(a.meetingAt).getTime() - new Date(b.meetingAt).getTime()),
    [leads]
  );

  const leadIds = useMemo(
    () => upcomingWithLocation.map((l) => l.id).sort().join(','),
    [upcomingWithLocation]
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const results = await Promise.all(
        upcomingWithLocation.map((lead) =>
          geocodeBengaluruAddress(
            lead.meetingSiteVisit?.address ?? '',
            lead.meetingSiteVisit?.postalCode ?? ''
          )
        )
      );
      if (cancelled) return;
      const next: Record<string, { lat: number; lng: number }> = {};
      upcomingWithLocation.forEach((lead, i) => {
        if (results[i]) next[lead.id] = results[i]!;
      });
      setGeocoded((prev) => ({ ...prev, ...next }));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [leadIds]);

  const positions = useMemo(
    () =>
      upcomingWithLocation
        .map((l) => geocoded[l.id])
        .filter(Boolean)
        .map((c) => [c!.lat, c!.lng] as [number, number]),
    [upcomingWithLocation, geocoded]
  );

  const geocodingCount = upcomingWithLocation.filter((l) => !geocoded[l.id]).length;
  const isLoading = geocodingCount > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Bengaluru Map</h1>
        <p className="mt-1 text-sm text-stone-500">
          Upcoming site visits and meetings with a physical location in Bengaluru.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm overflow-hidden">
        <div className="relative h-[500px] w-full">
          <MapContainer
            center={BENGALURU_CENTER}
            zoom={BENGALURU_ZOOM}
            className="h-full w-full z-0"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {BENGALURU_AREAS.map((area) => (
              <CircleMarker
                key={area.name}
                center={[area.lat, area.lng]}
                radius={6}
                pathOptions={{ color: '#78716c', fillColor: '#a8a29e', fillOpacity: 0.6, weight: 1 }}
              >
                <Tooltip permanent={false} direction="top" offset={[0, -6]}>
                  {area.name}
                </Tooltip>
              </CircleMarker>
            ))}
            {positions.length > 0 && <MapBounds positions={positions} />}
            {upcomingWithLocation.map((lead) => {
              const coords = geocoded[lead.id];
              if (!coords) return null;
              return (
                <Marker key={lead.id} position={[coords.lat, coords.lng]}>
                  <Popup>
                    <div className="min-w-[180px]">
                      <p className="font-semibold text-stone-900">{lead.name}</p>
                      <p className="text-sm text-stone-500">{lead.company}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-stone-600">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatMeetingTime(lead.meetingAt)}
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {lead.meetingSiteVisit?.address}
                        {lead.meetingSiteVisit?.postalCode
                          ? `, ${lead.meetingSiteVisit.postalCode}`
                          : ''}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
          {isLoading && (
            <div className="absolute top-3 right-3 flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm text-stone-600 shadow-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              Geocoding {geocodingCount} location{geocodingCount > 1 ? 's' : ''}…
            </div>
          )}
        </div>
      </div>

      {upcomingWithLocation.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-200 px-6 py-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-stone-300" />
          <p className="mt-3 text-sm font-medium text-stone-600">No upcoming meetings with site visit locations</p>
          <p className="mt-1 text-sm text-stone-400">
            Add Address and Postal Code in the Site Visit / Meeting Location section when creating or editing a lead.
          </p>
        </div>
      )}

      {upcomingWithLocation.length > 0 && (
        <div className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-900">Upcoming site visits on map</h2>
          <ul className="mt-3 space-y-2">
            {upcomingWithLocation.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-stone-800">{lead.name}</p>
                  <p className="text-xs text-stone-500">
                    {lead.meetingSiteVisit?.address}
                    {lead.meetingSiteVisit?.postalCode ? ` (${lead.meetingSiteVisit.postalCode})` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-stone-600">{formatMeetingTime(lead.meetingAt)}</p>
                  {geocoded[lead.id] ? (
                    <span className="text-[10px] text-emerald-600">On map</span>
                  ) : (
                    <span className="text-[10px] text-amber-600">Geocoding…</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
