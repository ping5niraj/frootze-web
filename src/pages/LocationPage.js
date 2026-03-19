import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS;

export default function LocationPage() {
  const navigate = useNavigate();
  const [myLocation, setMyLocation] = useState(null);
  const [sharedWith, setSharedWith] = useState([]);
  const [familyLocations, setFamilyLocations] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [pendingCoords, setPendingCoords] = useState(null);

  useEffect(() => {
    loadData();
    loadGoogleMaps();
  }, []);

  const loadData = async () => {
    try {
      const [mineRes, familyRes, membersRes] = await Promise.all([
        api.get('/api/locations/mine'),
        api.get('/api/locations/family'),
        api.get('/api/messages/family-members'),
      ]);
      setMyLocation(mineRes.data.location);
      setSharedWith(mineRes.data.shared_with || []);
      setSelectedIds(mineRes.data.shared_with?.map(u => u.id) || []);
      setFamilyLocations(familyRes.data.locations || []);
      setFamilyMembers(membersRes.data.members || []);
    } catch (err) {
      console.error('Load failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleMaps = () => {
    if (window.google) { setMapLoaded(true); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  };

  const initMap = useCallback((locations) => {
    if (!mapLoaded || !window.google) return;
    const mapDiv = document.getElementById('family-map');
    if (!mapDiv || locations.length === 0) return;

    const center = { lat: parseFloat(locations[0].latitude), lng: parseFloat(locations[0].longitude) };
    const map = new window.google.maps.Map(mapDiv, {
      zoom: locations.length > 1 ? 8 : 12,
      center,
      mapTypeControl: false,
      streetViewControl: false,
    });

    const bounds = new window.google.maps.LatLngBounds();

    locations.forEach(loc => {
      const position = { lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) };
      const marker = new window.google.maps.Marker({ position, map, title: loc.user?.name });
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding:8px;min-width:150px">
            <p style="font-weight:bold;margin:0 0 4px">${loc.user?.name}</p>
            ${loc.address ? `<p style="font-size:12px;color:#666;margin:0 0 4px">${loc.address}</p>` : ''}
            <p style="font-size:11px;color:#999;margin:0">
              ${new Date(loc.shared_at).toLocaleDateString('ta-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>`
      });
      marker.addListener('click', () => infoWindow.open(map, marker));
      bounds.extend(position);
    });

    if (locations.length > 1) map.fitBounds(bounds);
  }, [mapLoaded]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mapLoaded && familyLocations.length > 0) {
      setTimeout(() => initMap(familyLocations), 300);
    }
  }, [mapLoaded, familyLocations]);

  const handleGetLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('உங்கள் browser location-ஐ support செய்யவில்லை');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let address = '';
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          address = await new Promise((resolve) => {
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              resolve(status === 'OK' ? results[0]?.formatted_address : '');
            });
          });
        }
        setPendingCoords({ latitude, longitude, address });
        setGettingLocation(false);
        setShowShareModal(true);
      },
      () => {
        setGettingLocation(false);
        setError('Location permission denied. Please allow location access.');
      }
    );
  };

  const handleConfirmShare = async () => {
    if (selectedIds.length === 0) {
      setError('குறைந்தது ஒருவரை தேர்வு செய்யவும் / Select at least one person');
      return;
    }
    setSharing(true);
    try {
      await api.post('/api/locations/share', { ...pendingCoords, to_user_ids: selectedIds });
      setSuccess(`${selectedIds.length} பேருக்கு இடம் பகிரப்பட்டது / Location shared with ${selectedIds.length} member(s)`);
      setShowShareModal(false);
      setPendingCoords(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to share location');
    } finally {
      setSharing(false);
    }
  };

  const handleUpdatePermissions = async () => {
    try {
      await api.put('/api/locations/permissions', { to_user_ids: selectedIds });
      setSuccess('இட அனுமதிகள் புதுப்பிக்கப்பட்டன / Permissions updated');
      await loadData();
    } catch (err) {
      setError('Failed to update permissions');
    }
  };

  const handleHideLocation = async () => {
    setHiding(true);
    try {
      await api.delete('/api/locations/hide');
      setMyLocation(null);
      setSharedWith([]);
      setSelectedIds([]);
      setSuccess('இடம் மறைக்கப்பட்டது / Location hidden from everyone');
      await loadData();
    } catch (err) {
      setError('Failed to hide location');
    } finally {
      setHiding(false);
    }
  };

  const toggleMember = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openInGoogleMaps = (lat, lng, name) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}&label=${encodeURIComponent(name)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center"><div className="text-4xl mb-3">📍</div>
          <p className="text-purple-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-purple-700 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-purple-200 hover:text-white">← Back</button>
          <div>
            <h1 className="text-lg font-bold">குடும்ப இடங்கள்</h1>
            <p className="text-purple-300 text-xs">Family Locations</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* My Location */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-3">
            என் இடம் <span className="text-gray-400 font-normal text-sm">/ My Location</span>
          </h2>

          {myLocation?.is_active ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-green-700 font-semibold text-sm">✅ இடம் பகிரப்படுகிறது</p>
                  {myLocation.address && <p className="text-green-600 text-xs mt-1">📍 {myLocation.address}</p>}
                  <p className="text-green-500 text-xs mt-1">{new Date(myLocation.shared_at).toLocaleString('ta-IN')}</p>
                </div>
                <button onClick={() => openInGoogleMaps(myLocation.latitude, myLocation.longitude, 'My Location')}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded-lg">🗺️ Maps</button>
              </div>

              {/* Who can see */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-green-700 mb-1">👁️ இவர்களுக்கு தெரியும்:</p>
                <div className="flex flex-wrap gap-1">
                  {sharedWith.length > 0 ? sharedWith.map(u => (
                    <span key={u.id} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{u.name}</span>
                  )) : <span className="text-xs text-gray-400">யாருக்கும் தெரியாது</span>}
                </div>
              </div>

              {/* Update permissions */}
              <div className="border-t border-green-200 pt-3">
                <p className="text-xs font-medium text-gray-600 mb-2">யாருக்கு தெரிய வேண்டும்? / Update who can see:</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto mb-2">
                  {familyMembers.map(m => (
                    <div key={m.id} onClick={() => toggleMember(m.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                        selectedIds.includes(m.id) ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'
                      }`}>
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                        {m.name?.charAt(0)}
                      </div>
                      <p className="text-xs flex-1 font-medium">{m.name}</p>
                      <span className={`text-sm ${selectedIds.includes(m.id) ? 'text-green-500' : 'text-gray-300'}`}>
                        {selectedIds.includes(m.id) ? '✓' : '○'}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={handleUpdatePermissions}
                  className="w-full bg-green-500 text-white py-2 rounded-xl text-xs font-semibold">
                  அனுமதிகள் புதுப்பி / Update Permissions
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3">
              <p className="text-gray-500 text-sm">📍 இடம் பகிரவில்லை / Location not shared</p>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleGetLocation} disabled={gettingLocation}
              className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
              {gettingLocation ? '📡 இடம் பெறுகிறோம்...' : '📍 இடத்தை பகிர் / Share Location'}
            </button>
            {myLocation?.is_active && (
              <button onClick={handleHideLocation} disabled={hiding}
                className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm">
                🙈 Hide
              </button>
            )}
          </div>
        </div>

        {success && <div className="bg-green-50 border border-green-200 rounded-xl p-3"><p className="text-green-700 text-sm">✅ {success}</p></div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-red-600 text-sm">❌ {error}</p></div>}

        {/* Map */}
        {familyLocations.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">குடும்ப வரைபடம் <span className="text-gray-400 font-normal text-sm">/ Family Map</span></h2>
              <p className="text-xs text-gray-400">{familyLocations.length} members sharing with you</p>
            </div>
            <div id="family-map" style={{ height: '300px', width: '100%' }} className="bg-gray-100">
              {!mapLoaded && <div className="flex items-center justify-center h-full"><p className="text-gray-400 text-sm">Loading map...</p></div>}
            </div>
          </div>
        )}

        {/* Family List */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-3">குடும்பத்தினர் இடங்கள் <span className="text-gray-400 font-normal text-sm">/ Family Locations</span></h2>
          {familyLocations.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-gray-500 text-sm">யாரும் உங்களுடன் இடம் பகிரவில்லை</p>
              <p className="text-gray-400 text-xs">No family members sharing location with you yet</p>
            </div>
          ) : familyLocations.map(loc => (
            <div key={loc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
              {loc.user?.profile_photo ? (
                <img src={loc.user.profile_photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-purple-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700">
                  {loc.user?.name?.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{loc.user?.name}</p>
                {loc.address && <p className="text-xs text-gray-500 truncate">📍 {loc.address}</p>}
                <p className="text-xs text-gray-400">{new Date(loc.shared_at).toLocaleString('ta-IN', { day: 'numeric', month: 'short' })}</p>
              </div>
              <button onClick={() => openInGoogleMaps(loc.latitude, loc.longitude, loc.user?.name)}
                className="text-xs bg-blue-500 text-white px-2 py-1.5 rounded-lg">🗺️ Maps</button>
            </div>
          ))}
        </div>

      </div>

      {/* Share Modal */}
      {showShareModal && pendingCoords && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="bg-purple-700 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold">📍 யாருக்கு பகிர? / Who can see?</h3>
                <p className="text-purple-300 text-xs">Select family members</p>
              </div>
              <button onClick={() => { setShowShareModal(false); setPendingCoords(null); }} className="text-purple-200">✕</button>
            </div>
            <div className="p-4">
              {pendingCoords.address && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                  <p className="text-xs font-semibold text-green-700">📍 உங்கள் இடம்:</p>
                  <p className="text-sm text-green-800 mt-1">{pendingCoords.address}</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">தேர்வு செய்யவும்:</p>
                <button onClick={() => setSelectedIds(familyMembers.map(m => m.id))}
                  className="text-xs text-purple-600 font-medium hover:underline">அனைவரும் / All</button>
              </div>

              <div className="space-y-2 mb-4">
                {familyMembers.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">சரிபார்க்கப்பட்ட குடும்பத்தினர் இல்லை</p>
                ) : familyMembers.map(m => (
                  <div key={m.id} onClick={() => toggleMember(m.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedIds.includes(m.id) ? 'bg-purple-50 border border-purple-300' : 'bg-gray-50 border border-transparent'
                    }`}>
                    {m.profile_photo ? (
                      <img src={m.profile_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700">
                        {m.name?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.relation_tamil}</p>
                    </div>
                    <span className={`text-xl ${selectedIds.includes(m.id) ? 'text-purple-500' : 'text-gray-300'}`}>
                      {selectedIds.includes(m.id) ? '✓' : '○'}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={handleConfirmShare} disabled={sharing || selectedIds.length === 0} className="btn-primary">
                {sharing ? 'பகிருகிறோம்...' : `📍 ${selectedIds.length} பேருடன் பகிர் / Share with ${selectedIds.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
