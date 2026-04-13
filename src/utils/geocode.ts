/**
 * Bengaluru pincode → approximate coordinates.
 * Instant lookup, no external API calls.
 */
const BENGALURU_PINCODE_COORDS: Record<string, [number, number]> = {
  '560001': [12.9751, 77.6063],   // MG Road
  '560002': [12.9716, 77.5946],   // Bangalore GPO
  '560003': [12.9912, 77.6112],   // Cantonment
  '560004': [12.9856, 77.6089],   // Shivajinagar
  '560005': [13.0035, 77.5644],   // Malleswaram
  '560006': [13.0102, 77.5589],   // Rajajinagar
  '560007': [12.9412, 77.5678],   // Basavanagudi
  '560008': [12.925, 77.5936],    // Jayanagar
  '560009': [13.0289, 77.5345],   // Yeshwanthpur
  '560010': [13.0156, 77.5623],   // Basaveshwaranagar
  '560011': [12.9956, 77.6012],   // Gandhi Nagar
  '560012': [12.9012, 77.5845],   // JP Nagar
  '560013': [12.9121, 77.6446],   // HSR Layout
  '560014': [12.9342, 77.6069],   // Koramangala
  '560015': [12.9167, 77.6101],   // BTM Layout
  '560016': [12.9698, 77.7499],   // Whitefield
  '560017': [12.9784, 77.6408],   // Indiranagar
  '560018': [12.9592, 77.6974],   // Marathahalli
  '560019': [12.926, 77.6762],    // Bellandur
  '560020': [12.8456, 77.6603],   // Electronic City
  '560021': [12.9856, 77.5456],   // Peenya
  '560022': [13.028, 77.541],     // Yeshwanthpur Industrial
  '560023': [13.0123, 77.5523],   // Tumkur Road
  '560024': [12.9567, 77.6012],   // HAL
  '560025': [12.9678, 77.6234],   // Domlur
  '560026': [12.9456, 77.5789],   // Banashankari
  '560027': [12.9234, 77.5678],   // BSK 2nd Stage
  '560028': [12.9123, 77.5567],   // BSK 3rd Stage
  '560029': [12.9012, 77.5456],   // Uttarahalli
  '560030': [12.9345, 77.5345],   // Padmanabhanagar
  '560031': [12.9456, 77.5234],   // Vijayanagar
  '560032': [12.9567, 77.5123],   // Rajarajeshwari Nagar
  '560033': [12.9678, 77.5012],   // Kengeri
  '560034': [12.9342, 77.6069],   // Koramangala (alt)
  '560035': [12.9234, 77.6234],   // Ejipura
  '560036': [12.9123, 77.6345],   // Sarjapur Road
  '560037': [12.9012, 77.6456],   // HSR (ext)
  '560038': [12.9784, 77.6408],   // Indiranagar (alt)
  '560039': [12.9678, 77.6567],   // CV Raman Nagar
  '560040': [12.9703, 77.5434],   // Vijayanagar
  '560041': [12.925, 77.5936],    // Jayanagar (alt)
  '560042': [12.9123, 77.5789],   // BTM 2nd Stage
  '560043': [12.9012, 77.5678],   // Bommanahalli
  '560044': [12.8901, 77.5567],   // Hongasandra
  '560045': [13.0567, 77.6234],   // Manyata Tech Park
  '560046': [12.9678, 77.6678],   // KR Puram
  '560047': [12.9567, 77.6789],   // Mahadevapura
  '560048': [12.9456, 77.6901],   // Hoodi
  '560049': [12.9345, 77.7012],   // Whitefield (ext)
  '560050': [12.9234, 77.7123],   // ITPL
  '560066': [12.9698, 77.7499],   // Whitefield (alt)
  '560068': [12.9592, 77.6974],   // Marathahalli (alt)
  '560070': [12.9012, 77.6234],   // Sarjapur
  '560078': [12.9012, 77.5845],   // JP Nagar (alt)
  '560095': [12.9342, 77.6069],   // Koramangala (alt)
  '560100': [12.8456, 77.6603],   // Electronic City (alt)
};
const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];

/**
 * First postal code in free text. Prefers Bengaluru 560xxx (also matches "560 034").
 * Avoids using the first 6 digits of a 10-digit phone number when a 560xxx PIN appears later.
 */
export function extractPostalCodeFromText(text: string | undefined): string | null {
  if (!text?.trim()) return null;
  const compact = text.replace(/\s/g, '');
  const blr = compact.match(/(560\d{3})/);
  if (blr) return blr[1];
  const spaced = text.match(/\b([1-9]\d{2}\s?\d{3})\b/);
  if (spaced) return spaced[1].replace(/\s/g, '');
  const m = text.match(/\b([1-9]\d{5})\b/);
  return m ? m[1] : null;
}

export interface MeetingLocationFields {
  meetingLocation?: string;
  meetingSiteVisit?: { address?: string; postalCode?: string };
}

/**
 * Prefer explicit site-visit postal code; otherwise parse a 6-digit PIN from
 * meeting location or site visit address (users often put the PIN only in Meeting Location).
 */
export function resolveMeetingPostalForGeocode(lead: MeetingLocationFields): string {
  const fromField = String(lead.meetingSiteVisit?.postalCode ?? '')
    .trim()
    .replace(/\D/g, '');
  if (fromField.length >= 6) return fromField.slice(0, 6);
  const fromMeeting = extractPostalCodeFromText(lead.meetingLocation);
  if (fromMeeting) return fromMeeting;
  const fromAddress = extractPostalCodeFromText(lead.meetingSiteVisit?.address);
  return fromAddress ?? '';
}

/**
 * Geocode an address in Bengaluru using postal code lookup.
 * Instant, no external API calls.
 */
export function geocodeBengaluruAddress(
  _address: string,
  postalCode: string
): Promise<{ lat: number; lng: number } | null> {
  const pin = String(postalCode || '').trim().replace(/\D/g, '');
  if (!pin || pin.length < 6) return Promise.resolve(null);

  const key = pin.slice(0, 6);
  const coords = BENGALURU_PINCODE_COORDS[key] ?? BENGALURU_CENTER;
  return Promise.resolve({ lat: coords[0], lng: coords[1] });
}
