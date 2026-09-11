import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Home,
  Briefcase,
  Plus,
  HelpCircle,
} from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';

export default function PrivacySettingsModal({ isOpen, onClose, activeUserId }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('controls'); // 'controls' | 'zones' | 'disclosure' | 'deletion'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Privacy Settings State
  const [settings, setSettings] = useState({
    isProfilePublic: true,
    anonymousLeaderboard: false,
    hideRouteGeometry: false,
    maskPrivacyZones: true,
  });

  // Privacy Zones State
  const [zones, setZones] = useState([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneLat, setNewZoneLat] = useState('');
  const [newZoneLng, setNewZoneLng] = useState('');
  const [newZoneRadius, setNewZoneRadius] = useState(300);
  const [isAddingZone, setIsAddingZone] = useState(false);

  // Disclosure Policy
  const [disclosure, setDisclosure] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadPrivacyData();
    }
  }, [isOpen, activeUserId]);

  const loadPrivacyData = async () => {
    setLoading(true);
    try {
      const [settingsRes, disclosureRes] = await Promise.all([
        api.getPrivacySettings(activeUserId),
        api.getPrivacyDisclosure(),
      ]);

      if (settingsRes.success) {
        setSettings(settingsRes.data.settings);
        setZones(settingsRes.data.privacyZones || []);
      }
      if (disclosureRes.success) {
        setDisclosure(disclosureRes.data);
      }
    } catch (err) {
      console.error('Error loading privacy settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSetting = async (key) => {
    const updated = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(updated);

    try {
      await api.updatePrivacySettings({
        userId: activeUserId,
        ...updated,
      });
      toast.success('Privacy preferences updated.');
    } catch (err) {
      toast.error('Failed to update privacy settings');
      // Revert
      setSettings(settings);
    }
  };

  const handleUseCurrentLocationForZone = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNewZoneLat(pos.coords.latitude.toFixed(6));
          setNewZoneLng(pos.coords.longitude.toFixed(6));
          toast.success('Acquired current GPS coordinate for Privacy Zone.');
        },
        (err) => {
          toast.error('Could not acquire location. Please enter manually.');
        }
      );
    }
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    if (!newZoneName.trim()) {
      toast.error('Please enter a name for the Privacy Zone (e.g. Home, Work).');
      return;
    }
    const lat = parseFloat(newZoneLat);
    const lng = parseFloat(newZoneLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Please enter valid numeric latitude and longitude.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.addPrivacyZone({
        userId: activeUserId,
        name: newZoneName.trim(),
        latitude: lat,
        longitude: lng,
        radiusMeters: Number(newZoneRadius),
      });

      if (res.success) {
        toast.success(`Privacy Zone "${res.data.name}" created.`);
        setZones((prev) => [...prev, res.data]);
        setNewZoneName('');
        setNewZoneLat('');
        setNewZoneLng('');
        setIsAddingZone(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create Privacy Zone.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    try {
      await api.deletePrivacyZone(zoneId, activeUserId);
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
      toast.success('Privacy Zone removed.');
    } catch (err) {
      toast.error('Failed to remove Privacy Zone.');
    }
  };

  const handleWipeAccount = async () => {
    const confirm = window.confirm(
      '⚠️ WARNING: Are you sure you want to permanently delete all your workouts, GPS traces, and territory conquests? This action cannot be undone.'
    );
    if (!confirm) return;

    try {
      await api.wipeAccountData(activeUserId);
      toast.success('All personal activity data and GPS audit logs wiped successfully.');
      onClose();
      window.location.reload();
    } catch (err) {
      toast.error('Failed to wipe account data.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="space-y-5 text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Location Privacy & Data Security</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                  PROTECTED
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure safe zones, identity masking, and audit exact location sharing
              </p>
            </div>
          </div>
        </div>

        {/* 4-Tab Switcher */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'controls'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Privacy Controls
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('zones')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'zones'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Safe Zones ({zones.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('disclosure')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'disclosure'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Data Transparency</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deletion')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'deletion'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>GDPR Deletion</span>
          </button>
        </div>

        {/* TAB 1: Privacy Controls */}
        {activeTab === 'controls' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Control 1: Mask Privacy Zones */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white">Mask Privacy Zones from Map Territory</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automatically suppress public territory claims inside your defined Safe Zones (Home, Workplace).
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('maskPrivacyZones')}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.maskPrivacyZones ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Control 2: Anonymous Leaderboard */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-bold text-white">Anonymous Leaderboard Mode</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Display on public leaderboards as "Anonymous Athlete" with masked avatar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('anonymousLeaderboard')}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.anonymousLeaderboard ? 'bg-purple-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Control 3: Hide Route Polylines */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">Hide Detailed GPS Polyline Geometry</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Never expose exact route lines to other athletes on public shared workout feeds.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('hideRouteGeometry')}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.hideRouteGeometry ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Privacy Safe Zones (Home / Workplace) */}
        {activeTab === 'zones' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Any GPS points recorded within safe zones are excluded from public territory claims.
              </p>
              <Button
                variant={isAddingZone ? 'outline' : 'primary'}
                size="sm"
                icon={Plus}
                onClick={() => setIsAddingZone(!isAddingZone)}
              >
                {isAddingZone ? 'Cancel' : 'Add Safe Zone'}
              </Button>
            </div>

            {/* Add Safe Zone Form */}
            {isAddingZone && (
              <form onSubmit={handleCreateZone} className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3">
                <h4 className="text-xs font-bold text-cyan-300 uppercase font-mono">Create New Safe Zone</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400">Zone Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Home, Office, Gym"
                      value={newZoneName}
                      onChange={(e) => setNewZoneName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400">Mask Radius</label>
                    <select
                      value={newZoneRadius}
                      onChange={(e) => setNewZoneRadius(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value={150}>150 meters (Small)</option>
                      <option value={300}>300 meters (Recommended)</option>
                      <option value={500}>500 meters (Medium)</option>
                      <option value={1000}>1000 meters (Large)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400">Latitude</label>
                    <input
                      type="text"
                      placeholder="12.971600"
                      value={newZoneLat}
                      onChange={(e) => setNewZoneLat(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400">Longitude</label>
                    <input
                      type="text"
                      placeholder="77.594600"
                      value={newZoneLng}
                      onChange={(e) => setNewZoneLng(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocationForZone}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Use My Current Location</span>
                  </button>

                  <Button variant="primary" size="sm" type="submit" isLoading={saving}>
                    Save Safe Zone
                  </Button>
                </div>
              </form>
            )}

            {/* List of Safe Zones */}
            <div className="space-y-2">
              {zones.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                  No Safe Zones created yet. Add your Home or Workplace to mask nearby territory.
                </div>
              ) : (
                zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {zone.name.toLowerCase().includes('work') ? <Briefcase className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{zone.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {zone.radiusMeters}m radius • ({zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)})
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteZone(zone.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete Safe Zone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Data Transparency & Disclosure */}
        {activeTab === 'disclosure' && disclosure && (
          <div className="space-y-4 max-h-80 overflow-y-auto pr-1 animate-in fade-in duration-150">
            {disclosure.sections.map((sec, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wider">{sec.heading}</h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {sec.points.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: GDPR / CCPA Data Deletion */}
        {activeTab === 'deletion' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Right to be Forgotten & Data Sovereignty</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                In compliance with GDPR and international data protection standards, you have total ownership of your fitness telemetry.
                You can delete individual workout records or permanently purge your entire account's GPS audit traces.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Full Telemetry Purge</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Permanently deletes all historical GPS points, activities, achievements, and territory claims.
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={handleWipeAccount}>
                  Wipe All Data
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <Button variant="primary" size="md" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
