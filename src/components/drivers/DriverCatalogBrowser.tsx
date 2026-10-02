import React from 'react';
import {
  Folder,
  Check,
  Search,
  ArrowLeft,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Play,
  ExternalLink,
  Upload,
  ArrowRight,
  Cpu,
  Tv,
  Wifi,
  Volume2,
  HardDrive,
  Layers,
  Settings2,
} from 'lucide-react';
import { NasDriverModel, InfDriverDetail } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  viewStep: 'models' | 'drivers';
  onViewStepChange: (step: 'models' | 'drivers') => void;
  modelsList: NasDriverModel[];
  selectedModel: NasDriverModel | null;
  onSelectModel: (model: NasDriverModel) => void;
  hasDirectMatch: boolean;
  hardwareInfo: {
    make: string;
    model: string;
    formFactor: string;
    serialNumber: string;
  };
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  selectedBrandFilter: string;
  onBrandFilterChange: (brand: string) => void;
  folderDrivers: InfDriverDetail[];
  selectedInfPaths: Set<string>;
  onToggleInf: (path: string) => void;
  onSelectAllInfs: () => void;
  onDeselectAllInfs: () => void;
  isLoadingDrivers: boolean;
  driverSearchTerm: string;
  onDriverSearchTermChange: (term: string) => void;
  selectedCategoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  expandedCategories: Record<string, boolean>;
  onToggleCategoryExpanded: (cat: string) => void;
  onToggleCategorySelection: (cat: string) => void;
  autoReboot: boolean;
  onAutoRebootChange: (val: boolean) => void;
  isScanning: boolean;
  isRunning: boolean;
  onLaunchSdio: () => void;
  onOpenWindowsUpdate: () => void;
  onGoToExport: () => void;
}

function getBrandBadgeStyle(brand: string): string {
  const b = brand.toLowerCase();
  if (b.includes('dell')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  if (b.includes('hp') || b.includes('hewlett')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  if (b.includes('lenovo')) return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (b.includes('acer')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (b.includes('asus')) return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
  return 'bg-zinc-800 text-zinc-300 border-zinc-700';
}

function getCategoryIcon(cat: string) {
  const c = cat.toLowerCase();
  if (c.includes('vidéo') || c.includes('display') || c.includes('graphique')) return <Tv size={14} className="text-purple-400" />;
  if (c.includes('audio') || c.includes('son') || c.includes('media')) return <Volume2 size={14} className="text-pink-400" />;
  if (c.includes('réseau') || c.includes('net') || c.includes('wifi') || c.includes('lan')) return <Wifi size={14} className="text-blue-400" />;
  if (c.includes('stockage') || c.includes('disk') || c.includes('scsi') || c.includes('nvme')) return <HardDrive size={14} className="text-emerald-400" />;
  if (c.includes('chipset') || c.includes('système') || c.includes('system')) return <Cpu size={14} className="text-amber-400" />;
  return <Layers size={14} className="text-zinc-400" />;
}

export const DriverCatalogBrowser: React.FC<Props> = ({
  viewStep,
  onViewStepChange,
  modelsList,
  selectedModel,
  onSelectModel,
  hasDirectMatch,
  hardwareInfo,
  searchTerm,
  onSearchTermChange,
  selectedBrandFilter,
  onBrandFilterChange,
  folderDrivers,
  selectedInfPaths,
  onToggleInf,
  onSelectAllInfs,
  onDeselectAllInfs,
  isLoadingDrivers,
  driverSearchTerm,
  onDriverSearchTermChange,
  selectedCategoryFilter,
  onCategoryFilterChange,
  expandedCategories,
  onToggleCategoryExpanded,
  onToggleCategorySelection,
  autoReboot,
  onAutoRebootChange,
  isScanning,
  isRunning,
  onLaunchSdio,
  onOpenWindowsUpdate,
  onGoToExport,
}) => {
  const { language, t } = useLanguage();
  // Filtered models
  const brandsList = ['all', ...Array.from(new Set(modelsList.map((m) => m.brand))).filter(Boolean)];

  const filteredModels = modelsList.filter((item) => {
    const matchesBrand = selectedBrandFilter === 'all' || item.brand.toLowerCase() === selectedBrandFilter.toLowerCase();
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.model.toLowerCase().includes(query) ||
      item.brand.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.fullPath.toLowerCase().includes(query);
    return matchesBrand && matchesSearch;
  });

  // Drivers categories
  const defaultCategory = language === 'en' ? 'Other' : 'Autres';
  const categoriesList = Array.from(new Set(folderDrivers.map((d) => d.category || defaultCategory))).sort();

  const filteredDrivers = folderDrivers.filter((driver) => {
    const matchesCat = selectedCategoryFilter === 'all' || (driver.category || defaultCategory) === selectedCategoryFilter;
    const query = driverSearchTerm.toLowerCase().trim();
    const matchesSearch =
      !query ||
      driver.name.toLowerCase().includes(query) ||
      driver.infName.toLowerCase().includes(query) ||
      driver.provider.toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });

  const groupedDrivers: Record<string, InfDriverDetail[]> = {};
  filteredDrivers.forEach((driver) => {
    const cat = driver.category || defaultCategory;
    if (!groupedDrivers[cat]) groupedDrivers[cat] = [];
    groupedDrivers[cat].push(driver);
  });

  return (
    <div className="space-y-4">
      {/* STEP 1: CATALOG OF DETECTED MODELS */}
      {viewStep === 'models' && (
        <div className="space-y-4">
          {/* Header search & filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Brand filter pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
              {brandsList.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => onBrandFilterChange(brand)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer capitalize whitespace-nowrap ${
                    selectedBrandFilter === brand
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {brand === 'all' ? (language === 'en' ? `All (${modelsList.length})` : `Toutes (${modelsList.length})`) : brand}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                placeholder={language === 'en' ? 'Search model or folder...' : 'Rechercher modèle ou dossier...'}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Warning banner if model not matched */}
          {!hasDirectMatch && !isScanning && modelsList.length > 0 && (
            <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-amber-200">
                    {language === 'en' ? (
                      <>Model <span className="text-amber-300 font-mono">"{hardwareInfo.model}"</span> ({hardwareInfo.make}) does not exist on the NAS network.</>
                    ) : (
                      <>Le modèle <span className="text-amber-300 font-mono">"{hardwareInfo.model}"</span> ({hardwareInfo.make}) n'existe pas sur le réseau NAS.</>
                    )}
                  </p>
                  <p className="text-zinc-300 leading-relaxed">
                    {language === 'en' ? 'This driver pack is not yet archived in your network catalog.' : 'Ce pack de pilotes n\'est pas encore archivé dans votre catalogue réseau.'}
                  </p>
                </div>
              </div>

              <div className="bg-zinc-950/70 p-3 rounded-lg border border-amber-500/20 text-xs space-y-2">
                <p className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  {language === 'en' ? 'Recommended procedure for this machine:' : 'Procédure recommandée pour ce poste :'}
                </p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-300 pl-1">
                  {language === 'en' ? (
                    <>
                      <li>First perform updates with <strong>Windows Update</strong> or <strong>SDIO (Snappy Driver Installer)</strong>.</li>
                      <li>Once all drivers are installed and verified in Device Manager, switch to tab <strong>"2. Export to NAS (DISM)"</strong>.</li>
                      <li>Export drivers to automatically save this pack on the network for future deployments.</li>
                    </>
                  ) : (
                    <>
                      <li>Faites d'abord les mises à jour avec <strong>Windows Update</strong> ou <strong>SDIO (Snappy Driver Installer)</strong>.</li>
                      <li>Une fois tous les pilotes installés et vérifiés dans le gestionnaire, basculez sur l'onglet <strong>"2. Exporter vers le NAS (DISM)"</strong>.</li>
                      <li>Exportez les pilotes pour enregistrer automatiquement ce pack sur le réseau pour les futurs déploiements.</li>
                    </>
                  )}
                </ol>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onLaunchSdio}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold rounded-lg border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play size={13} className="text-amber-400" />
                  <span>{language === 'en' ? 'Launch SDIO' : 'Lancer SDIO'}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenWindowsUpdate}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 text-xs font-semibold rounded-lg border border-blue-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink size={13} className="text-blue-400" />
                  <span>{language === 'en' ? 'Open Windows Update' : 'Ouvrir Windows Update'}</span>
                </button>

                <button
                  type="button"
                  onClick={onGoToExport}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-semibold rounded-lg border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload size={13} className="text-emerald-400" />
                  <span>{language === 'en' ? 'Go to NAS Export' : 'Aller à l\'exportation NAS'}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Models List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {isScanning ? (
              <div className="py-12 text-center text-zinc-400 space-y-2 bg-zinc-900/40 rounded-xl border border-zinc-800">
                <RefreshCw size={24} className="animate-spin text-blue-400 mx-auto" />
                <p className="text-xs">{language === 'en' ? 'Scanning driver folders...' : 'Scan des dossiers de pilotes...'}</p>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="py-10 text-center text-zinc-400 bg-zinc-900/40 rounded-xl border border-zinc-800 text-xs">
                {language === 'en' ? 'No driver packs found matching filters.' : 'Aucun pack de pilotes trouvé correspondant aux filtres.'}
              </div>
            ) : (
              filteredModels.map((item, idx) => {
                const isSelected = selectedModel?.fullPath === item.fullPath;
                return (
                  <div
                    key={item.fullPath}
                    onClick={() => !isRunning && onSelectModel(item)}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
                      item.isMatch
                        ? 'bg-emerald-950/25 border-emerald-500/50 hover:border-emerald-400 shadow-sm'
                        : isSelected
                        ? 'bg-blue-500/10 border-blue-500/50 shadow-sm'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className={`p-2 rounded-lg ${item.isMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-blue-400'}`}>
                        <Folder size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono text-zinc-500">{idx + 1}.</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getBrandBadgeStyle(item.brand)}`}>
                            {item.brand}
                          </span>
                          {item.category && item.category !== 'Pack Pilotes' && item.category !== 'Driver Pack' && (
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                              {item.category}
                            </span>
                          )}
                          <span className="text-xs font-bold text-zinc-100 group-hover:text-blue-300 transition-colors">
                            {item.model}
                          </span>
                          {item.isMatch && (
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                              <Check size={10} /> {language === 'en' ? 'MATCH FOUND' : 'CORRESPONDANCE TROUVÉE'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-zinc-500 truncate mt-1">{item.fullPath}</p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2 pl-3">
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-semibold rounded-lg border border-blue-500/30 flex items-center space-x-1 transition-colors"
                      >
                        <span>{language === 'en' ? 'Select drivers' : 'Choisir les pilotes'}</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* STEP 2: DRIVERS LIST SEPARATED BY DEVICE / CATEGORY */}
      {viewStep === 'drivers' && selectedModel && (
        <div className="space-y-4">
          {/* Top bar with back button & summary */}
          <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => onViewStepChange('models')}
                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>{language === 'en' ? 'Change Model' : 'Changer de modèle'}</span>
              </button>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white">{selectedModel.model}</span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700/60">
                    {selectedModel.category}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-zinc-500 truncate max-w-md">{selectedModel.fullPath}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
                <span className="text-zinc-400">{language === 'en' ? 'Selected: ' : 'Sélection : '}</span>
                <strong className="text-emerald-400 font-mono">{selectedInfPaths.size}</strong>
                <span className="text-zinc-500 font-mono"> / {folderDrivers.length} {language === 'en' ? 'drivers' : 'pilotes'}</span>
              </div>

              <button
                type="button"
                onClick={onSelectAllInfs}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg border border-zinc-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                title={language === 'en' ? 'Select All' : 'Tout sélectionner'}
              >
                <CheckSquare size={13} className="text-emerald-400" />
                <span>{language === 'en' ? 'Select All' : 'Tout cocher'}</span>
              </button>

              <button
                type="button"
                onClick={onDeselectAllInfs}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg border border-zinc-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                title={language === 'en' ? 'Deselect All' : 'Tout désélectionner'}
              >
                <Square size={13} className="text-zinc-500" />
                <span>{language === 'en' ? 'Deselect All' : 'Tout décocher'}</span>
              </button>
            </div>
          </div>

          {/* Filter & Search inside drivers */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                type="button"
                onClick={() => onCategoryFilterChange('all')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {language === 'en' ? `All categories (${folderDrivers.length})` : `Toutes catégories (${folderDrivers.length})`}
              </button>
              {categoriesList.map((cat) => {
                const count = folderDrivers.filter((d) => (d.category || defaultCategory) === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onCategoryFilterChange(cat)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      selectedCategoryFilter === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative w-56">
              <Search size={13} className="absolute left-2.5 top-2 text-zinc-500" />
              <input
                type="text"
                value={driverSearchTerm}
                onChange={(e) => onDriverSearchTermChange(e.target.value)}
                placeholder={language === 'en' ? 'Search device...' : 'Rechercher périphérique...'}
                className="w-full pl-7 pr-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Drivers Grouped by Category */}
          {isLoadingDrivers ? (
            <div className="py-12 text-center text-zinc-400 space-y-2 bg-zinc-900/40 rounded-xl border border-zinc-800">
              <RefreshCw size={24} className="animate-spin text-blue-400 mx-auto" />
              <p className="text-xs">{language === 'en' ? 'Extracting device names from .inf files...' : 'Extraction des noms de périphériques depuis les fichiers .inf...'}</p>
            </div>
          ) : Object.keys(groupedDrivers).length === 0 ? (
            <div className="py-10 text-center text-zinc-400 bg-zinc-900/40 rounded-xl border border-zinc-800 text-xs">
              {language === 'en' ? 'No drivers match the applied filters.' : 'Aucun pilote ne correspond aux filtres appliqués.'}
            </div>
          ) : (
            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {Object.entries(groupedDrivers).map(([categoryName, driversInCat]) => {
                const allCatSelected = driversInCat.every((d) => selectedInfPaths.has(d.infPath));
                const someCatSelected = driversInCat.some((d) => selectedInfPaths.has(d.infPath));

                return (
                  <div key={categoryName} className="bg-zinc-900/70 border border-zinc-800/90 rounded-xl overflow-hidden shadow-xs">
                    {/* Category Header */}
                    <div
                      onClick={() => onToggleCategoryExpanded(categoryName)}
                      className="px-3.5 py-2 bg-zinc-950/90 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-900 transition-colors select-none"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCategorySelection(categoryName);
                          }}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                            allCatSelected
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : someCatSelected
                              ? 'bg-blue-600/50 border-blue-500 text-white'
                              : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                          }`}
                        >
                          {allCatSelected && <Check size={12} strokeWidth={3} />}
                          {!allCatSelected && someCatSelected && <div className="w-2 h-0.5 bg-white rounded-full" />}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(categoryName)}
                          <span className="text-xs font-bold text-zinc-200">{categoryName}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ({driversInCat.length} {language === 'en' ? (driversInCat.length > 1 ? 'components' : 'component') : (driversInCat.length > 1 ? 'composants' : 'composant')})
                          </span>
                        </div>
                      </div>

                      <div className="text-zinc-500 flex items-center">
                        {expandedCategories[categoryName] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </div>

                    {/* Drivers List in this Category */}
                    {expandedCategories[categoryName] && (
                      <div className="divide-y divide-zinc-800/50">
                        {driversInCat.map((driver) => {
                          const isChecked = selectedInfPaths.has(driver.infPath);

                          return (
                            <div
                              key={driver.infPath}
                              onClick={() => !isRunning && onToggleInf(driver.infPath)}
                              className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                                isChecked ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'hover:bg-zinc-900/40 opacity-75'
                              }`}
                            >
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <div
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                    isChecked ? 'bg-blue-600 border-blue-500 text-white' : 'border-zinc-700 bg-zinc-900'
                                  }`}
                                >
                                  {isChecked && <Check size={12} strokeWidth={3} />}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold text-zinc-100 truncate">{driver.name}</span>
                                    <span className="text-[10px] font-mono bg-zinc-800 px-1.5 py-0.2 rounded text-zinc-400 shrink-0">
                                      {driver.infName}
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-3 mt-0.5 text-[10px] text-zinc-400">
                                    {driver.provider && (
                                      <span>
                                        {language === 'en' ? 'Provider:' : 'Fournisseur:'} <strong className="text-zinc-300">{driver.provider}</strong>
                                      </span>
                                    )}
                                    {driver.version && (
                                      <span>
                                        Version: <strong className="text-zinc-300">{driver.version}</strong>
                                      </span>
                                    )}
                                    {driver.date && (
                                      <span>
                                        Date: <strong className="text-zinc-300">{driver.date}</strong>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Auto reboot option */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoReboot}
                onChange={(e) => onAutoRebootChange(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0"
              />
              <span>{language === 'en' ? 'Automatically restart the system if required by drivers' : 'Redémarrer automatiquement le système si requis par les pilotes'}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
