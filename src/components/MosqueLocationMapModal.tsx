import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Search,
  Check,
  X,
  Eye,
  Crosshair,
  AlertCircle,
  Compass,
  CheckCircle2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { MosqueItem } from '../types';

interface MosqueLocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  mosque: MosqueItem;
  mode: 'view' | 'picker'; // 'view' for inspection by teacher/supervisor, 'picker' for setting/editing
  onSaveLocation?: (mosqueId: string, lat: number, lng: number, radiusMeters?: number) => Promise<void> | void;
}

// Sub-component to manage geofence radius circle around the mosque
function MosqueRadiusCircle({
  center,
  radiusMeters = 100,
  isUserInside = true
}: {
  center: google.maps.LatLngLiteral;
  radiusMeters?: number;
  isUserInside?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !center || typeof google === 'undefined' || !google.maps) return;

    const circle = new google.maps.Circle({
      map,
      center,
      radius: radiusMeters,
      strokeColor: isUserInside ? '#10b981' : '#f59e0b',
      strokeOpacity: 0.85,
      strokeWeight: 2,
      fillColor: isUserInside ? '#10b981' : '#f59e0b',
      fillOpacity: 0.18,
      clickable: false
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, center.lat, center.lng, radiusMeters, isUserInside]);

  return null;
}

// Sub-component to dynamically pan and zoom the map camera
function MapCameraHandler({
  target,
  zoom
}: {
  target: google.maps.LatLngLiteral | null;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    if (zoom !== undefined) {
      map.setZoom(zoom);
    }
  }, [map, target?.lat, target?.lng, zoom]);

  return null;
}

// Calculate Haversine distance in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const MosqueLocationMapModal: React.FC<MosqueLocationMapModalProps> = ({
  isOpen,
  onClose,
  mosque,
  mode,
  onSaveLocation
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Default coordinate: Riyadh, KSA or mosque position
  const initialCoord: google.maps.LatLngLiteral = {
    lat: mosque.latitude || 24.7136,
    lng: mosque.longitude || 46.6753
  };

  const [selectedCoord, setSelectedCoord] = useState<google.maps.LatLngLiteral>(initialCoord);
  const [cameraTarget, setCameraTarget] = useState<google.maps.LatLngLiteral | null>(initialCoord);
  const [cameraZoom, setCameraZoom] = useState<number>(mosque.isLocationSet ? 16 : 14);

  // Mosque attendance radius (مدى المسجد للتحضير - default 100 meters)
  const [radiusMeters, setRadiusMeters] = useState<number>(mosque.allowedRadiusMeters || 100);

  // User's live GPS position (for comparison and distance calculation)
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [userDistance, setUserDistance] = useState<number | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // On open or mosque change, initialize coordinates and radius
  useEffect(() => {
    if (isOpen) {
      const coord = {
        lat: mosque.latitude || 24.7136,
        lng: mosque.longitude || 46.6753
      };
      setSelectedCoord(coord);
      setCameraTarget(coord);
      setCameraZoom(mosque.isLocationSet ? 16 : 14);
      setRadiusMeters(mosque.allowedRadiusMeters || 100);
      setGpsError(null);
      setSearchError(null);

      // Auto-detect user's GPS for live distance display
      detectUserLocation(false);
    }
  }, [isOpen, mosque.id, mosque.latitude, mosque.longitude, mosque.allowedRadiusMeters]);

  // Recalculate distance whenever userLocation or selectedCoord changes
  useEffect(() => {
    if (userLocation && selectedCoord) {
      const dist = getDistanceMeters(
        userLocation.lat,
        userLocation.lng,
        selectedCoord.lat,
        selectedCoord.lng
      );
      setUserDistance(dist);
    } else {
      setUserDistance(null);
    }
  }, [userLocation, selectedCoord]);

  // Detect user's current GPS position
  const detectUserLocation = (panToUser = true) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('المتصفح لا يدعم تحديد الموقع الجغرافي (GPS).');
      return;
    }

    setIsLocatingUser(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      pos => {
        const uCoord = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(uCoord);
        setIsLocatingUser(false);

        if (panToUser) {
          // If in picker mode and mosque had no location, also move selected marker to user location
          if (mode === 'picker') {
            setSelectedCoord(uCoord);
          }
          setCameraTarget(uCoord);
          setCameraZoom(17);
        }
      },
      err => {
        setIsLocatingUser(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('تم رفض إذن الوصول للموقع، يرجى السماح به في المتصفح.');
        } else {
          setGpsError('تعذر تحديد موقعك الحالي عبر GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search location using geocoding backend endpoint
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/maps/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const first = data.results[0];
        const lat = first.geometry.location.lat;
        const lng = first.geometry.location.lng;
        const newCoord = { lat, lng };

        if (mode === 'picker') {
          setSelectedCoord(newCoord);
        }
        setCameraTarget(newCoord);
        setCameraZoom(16);
      } else {
        setSearchError('لم يتم العثور على نتائج للبحث، جرّب اسم الحي أو المدينة.');
      }
    } catch (err: any) {
      setSearchError('تعذر البحث عن الموقع حالياً.');
    } finally {
      setIsSearching(false);
    }
  };

  // Confirm and save location
  const handleConfirmSave = async () => {
    if (!onSaveLocation) return;
    setIsSaving(true);
    try {
      await onSaveLocation(mosque.id, selectedCoord.lat, selectedCoord.lng, radiusMeters);
      onClose();
    } catch (err) {
      console.error('Error saving mosque location:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isWithinRadius = userDistance !== null && userDistance <= radiusMeters;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 text-right">
      <div className="bg-[#022c22] border border-[#065f46] rounded-3xl w-full max-w-4xl h-[92vh] sm:h-[86vh] flex flex-col shadow-2xl overflow-hidden relative animate-fadeIn">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#065f46] bg-[#011a14] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${
              mode === 'view'
                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-[#022c22]'
                : 'bg-gradient-to-br from-amber-400 to-amber-500 text-[#064e3b]'
            }`}>
              {mode === 'view' ? <Eye className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-heading">
                  {mode === 'view' ? `اطلاع على موقع: ${mosque.name}` : `تحديد وضبط موقع: ${mosque.name}`}
                </h2>
                {mosque.isLocationSet && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    محدد مسبقاً
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-300/80">
                {mode === 'view'
                  ? `عرض حدود الجامع والنطاق الجغرافي المسموح للتحضير (${radiusMeters} متر)`
                  : 'يمكنك تحريك الخريطة، سحب الدبوس، أو كتابة مدى المسجد بالأمتار، ثم الضغط على (تم)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-300 hover:text-white border border-[#065f46] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar (in picker mode, or search bar) */}
        <div className="p-3 bg-[#064e3b]/40 border-b border-[#065f46] flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <form onSubmit={handleSearchLocation} className="flex items-center gap-1.5 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث عن حي، معلم، أو شارع (مثال: حي الروضة الرياض)..."
                className="w-full py-2 pr-9 pl-3 rounded-xl bg-[#022c22] border border-[#065f46] text-white text-xs placeholder-emerald-400/40 focus:border-[#fbbf24] outline-none"
              />
              <Search className="w-4 h-4 text-emerald-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSearching ? 'بحث...' : 'بحث'}
            </button>
          </form>

          {/* Mosque Range Setting (مدى المسجد للتحضير) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-[#022c22] border border-[#065f46] px-2.5 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-amber-300 whitespace-nowrap">مدى التحضير:</span>
              {mode === 'picker' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="10"
                    max="50000"
                    step="10"
                    value={radiusMeters}
                    onChange={e => setRadiusMeters(Math.max(10, parseInt(e.target.value, 10) || 10))}
                    className="w-16 py-0.5 px-1.5 rounded-lg bg-[#064e3b] text-white font-mono font-bold text-xs text-center border border-[#065f46] focus:border-[#fbbf24] outline-none"
                    title="اكتب أي رقم تريده بالأمتار (مثال: 100، 500، 1000)"
                  />
                  <span className="text-[11px] text-emerald-300 font-bold">متر</span>
                </div>
              ) : (
                <span className="text-xs font-mono font-bold text-white">
                  {radiusMeters} متر {radiusMeters >= 1000 ? `(${(radiusMeters / 1000).toFixed(1)} كم)` : ''}
                </span>
              )}
            </div>

            {mode === 'picker' && (
              <div className="flex items-center gap-1">
                {[100, 200, 500, 1000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRadiusMeters(val)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      radiusMeters === val
                        ? 'bg-amber-400 text-[#064e3b]'
                        : 'bg-[#064e3b]/80 text-emerald-200 hover:text-white border border-[#065f46]'
                    }`}
                  >
                    {val >= 1000 ? `${val / 1000} كم` : `${val} م`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => detectUserLocation(true)}
              disabled={isLocatingUser}
              className="px-3 py-2 rounded-xl bg-[#064e3b] hover:bg-emerald-700 text-[#86efac] border border-[#065f46] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="تحديد موقعي الحالي على الخريطة"
            >
              <Crosshair className={`w-4 h-4 ${isLocatingUser ? 'animate-spin' : ''}`} />
              <span>{isLocatingUser ? 'جارٍ تحديد موقعي...' : 'التقاط موقعي (GPS)'}</span>
            </button>

            {mosque.isLocationSet && (
              <button
                type="button"
                onClick={() => {
                  if (mosque.latitude && mosque.longitude) {
                    const mCoord = { lat: mosque.latitude, lng: mosque.longitude };
                    setSelectedCoord(mCoord);
                    setCameraTarget(mCoord);
                    setCameraZoom(16);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 border border-[#065f46] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>إلى موقع الجامع</span>
              </button>
            )}
          </div>
        </div>

        {/* Status / Distance Banner */}
        <div className="px-4 py-2 bg-[#011a14] border-b border-[#065f46] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {userDistance !== null ? (
              <div className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${
                isWithinRadius
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {isWithinRadius ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>
                  {isWithinRadius
                    ? `أنت داخل نطاق المسجد ✅ (المسافة: ${userDistance < 1000 ? `${userDistance} متراً` : `${(userDistance / 1000).toFixed(2)} كم`} من أصل ${radiusMeters < 1000 ? `${radiusMeters} متراً` : `${(radiusMeters / 1000).toFixed(1)} كم`})`
                    : `أنت خارج نطاق المسجد ❌ (المسافة: ${userDistance < 1000 ? `${userDistance} متراً` : `${(userDistance / 1000).toFixed(2)} كم`} — الحد المسموح: ${radiusMeters < 1000 ? `${radiusMeters} متراً` : `${(radiusMeters / 1000).toFixed(1)} كم`})`}
                </span>
              </div>
            ) : (
              <span className="text-emerald-300/80">
                {gpsError || 'يتم احتساب المسافة عند السماح بالوصول لموقعك الجغرافي'}
              </span>
            )}
          </div>

          <div className="text-[11px] font-mono text-[#86efac]/80">
            الإحداثيات: {selectedCoord.lat.toFixed(5)}, {selectedCoord.lng.toFixed(5)}
          </div>
        </div>

        {searchError && (
          <div className="px-4 py-1.5 bg-rose-950/60 border-b border-rose-800 text-rose-300 text-xs font-bold text-center">
            {searchError}
          </div>
        )}

        {/* Map Container */}
        <div className="flex-1 w-full relative min-h-[300px]">
          <APIProvider apiKey={apiKey} language="ar" region="SA">
            <Map
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              mapId="DEMO_MAP_ID"
              style={{ width: '100%', height: '100%' }}
              defaultCenter={initialCoord}
              defaultZoom={cameraZoom}
              gestureHandling="greedy"
              disableDefaultUI={false}
              onClick={e => {
                if (mode === 'picker' && e.detail.latLng) {
                  const newC = {
                    lat: e.detail.latLng.lat,
                    lng: e.detail.latLng.lng
                  };
                  setSelectedCoord(newC);
                }
              }}
            >
              {/* Dynamic Camera Control */}
              <MapCameraHandler target={cameraTarget} zoom={cameraZoom} />

              {/* Green Radius Boundary around Mosque */}
              <MosqueRadiusCircle
                center={selectedCoord}
                radiusMeters={radiusMeters}
                isUserInside={isWithinRadius}
              />

              {/* Mosque Marker */}
              <AdvancedMarker
                position={selectedCoord}
                draggable={mode === 'picker'}
                onDragEnd={e => {
                  if (e.latLng) {
                    setSelectedCoord({
                      lat: e.latLng.lat(),
                      lng: e.latLng.lng()
                    });
                  }
                }}
                title={mosque.name}
              >
                <div className="flex flex-col items-center cursor-pointer group">
                  <div className="px-2.5 py-1 rounded-xl bg-[#064e3b] text-white border-2 border-[#fbbf24] text-[11px] font-black shadow-lg whitespace-nowrap mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#fbbf24]" />
                    <span>{mosque.name}</span>
                  </div>
                  <Pin
                    background="#047857"
                    borderColor="#fbbf24"
                    glyphColor="#fbbf24"
                    scale={1.2}
                  />
                </div>
              </AdvancedMarker>

              {/* User Live GPS Marker (if detected) */}
              {userLocation && (
                <AdvancedMarker position={userLocation} title="موقعك الحالي">
                  <div className="flex flex-col items-center">
                    <div className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-black shadow-md mb-1 whitespace-nowrap">
                      موقعك الحالي
                    </div>
                    <div className="relative flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg z-10" />
                      <div className="w-8 h-8 rounded-full bg-blue-400/40 animate-ping absolute" />
                    </div>
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>

          {/* Quick Helper Overlay on Map in Picker Mode */}
          {mode === 'picker' && (
            <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:max-w-md pointer-events-none">
              <div className="bg-[#022c22]/90 backdrop-blur-md border border-[#065f46] p-3 rounded-2xl shadow-xl text-xs space-y-1 pointer-events-auto">
                <p className="font-bold text-[#fbbf24] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>طريقة تحديد الجامع:</span>
                </p>
                <p className="text-emerald-200 text-[11px] leading-relaxed">
                  يمكنك النقر مباشرة على أي نقطة في الخريطة، أو سحب الدبوس الأخضر، أو استخدام زر (التقاط موقعي الحالي) إذا كنت داخل المسجد، ثم اضغط زر (تم) أدناه.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#065f46] bg-[#011a14] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-emerald-300">
            {mode === 'picker' ? (
              <span className="font-bold text-amber-300">
                الدائرة الملونة توضح نطاق المسجد المحدد ({radiusMeters} متر) المسموح للمعلمين بالتحضير والانصراف داخله.
              </span>
            ) : (
              <span>
                نطاق التحضير المسموح: <strong className="text-white font-mono">{radiusMeters} متر {radiusMeters >= 1000 ? `(${(radiusMeters / 1000).toFixed(1)} كم)` : ''}</strong> حول الجامع.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-bold border border-[#065f46] hover:text-white cursor-pointer"
            >
              {mode === 'picker' ? 'إلغاء' : 'إغلاق'}
            </button>

            {mode === 'picker' && onSaveLocation && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmSave}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <span>جارٍ الحفظ...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تثبيت موقع الجامع (تم)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
