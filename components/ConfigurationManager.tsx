"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Settings,
  Download,
  Upload,
  CheckCircle,
  Loader2,
} from "lucide-react";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import {
  type AudioPlayerConfiguration,
  getAllConfigurations,
  setActiveConfigurationId,
  createConfiguration,
  getConfigurationStorageKeys,
} from "@/lib/configuration";
import { exportConfiguration } from "@/lib/export";
import { getAllAudios, type StoredAudio } from "@/lib/storage";

interface ConfigurationManagerProps {
  configurations: AudioPlayerConfiguration[];
  activeConfigurationId: string | null;
  onConfigurationCreate: (name: string) => Promise<void>;
  onConfigurationDelete: (configId: string) => Promise<void>;
  onConfigurationRename: (configId: string, name: string) => Promise<void>;
  onConfigurationSelect?: (configId: string) => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigurationManager({
  configurations,
  activeConfigurationId,
  onConfigurationCreate,
  onConfigurationDelete,
  onConfigurationRename,
  onConfigurationSelect,
  onImport,
  isOpen,
  onClose,
}: ConfigurationManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importName, setImportName] = useState("");
  const [importMessage, setImportMessage] = useState<
    { text: string; error: boolean } | null
  >(null);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [isRenaming]);

  const handleCreateConfiguration = () => {
    const name = prompt("Enter configuration name:");
    if (name && name.trim()) {
      onConfigurationCreate(name.trim());
    }
  };

  const startRenaming = (config: AudioPlayerConfiguration) => {
    setIsRenaming(config.id);
    setRenamingName(config.name);
  };

  const saveRename = async () => {
    if (isRenaming && renamingName.trim()) {
      await onConfigurationRename(isRenaming, renamingName.trim());
    }
    setIsRenaming(null);
    setRenamingName("");
  };

  const cancelRename = () => {
    setIsRenaming(null);
    setRenamingName("");
  };

  const handleDeleteConfiguration = (configId: string) => {
    if (configurations.length <= 1) {
      alert("Cannot delete the last configuration");
      return;
    }

    if (
      confirm(
        "Are you sure you want to delete this configuration? This will delete all associated audios, bookmarks, and loops."
      )
    ) {
      onConfigurationDelete(configId);
    }
  };

  const handleSwitchConfiguration = (configId: string) => {
    setActiveConfigurationId(configId);
    onConfigurationSelect?.(configId);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Delegate to parent's onImport handler which handles the actual import logic
    onImport(event);
  };

  const handleExport = async (configId: string, configName: string) => {
    setIsExporting(true);
    try {
      const blob = await exportConfiguration(configId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${configName.replace(/\s+/g, "-")}-export.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export configuration");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    setIsExportingAll(true);
    try {
      const zip = new JSZip();
      const configs = getAllConfigurations();

      for (const config of configs) {
        const blob = await exportConfiguration(config.id);
        zip.file(`${config.name.replace(/\s+/g, "-")}-export.zip`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `all-configurations-export-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export all failed:", error);
      alert("Failed to export all configurations");
    } finally {
      setIsExportingAll(false);
    }
  };

  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration Manager
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Import Section */}
          <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Import Configuration</span>
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import
                  </>
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleImport}
              className="hidden"
            />
            {importMessage && (
              <div
                className={`text-sm mt-2 p-2 rounded ${
                  importMessage.error
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {importMessage.text}
              </div>
            )}
            <input
              type="text"
              placeholder="Import name (optional)"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              className="mt-2 w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded text-sm disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
              disabled={isImporting}
            />
          </div>

          {/* Configuration List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Configurations</span>
              <button
                onClick={handleCreateConfiguration}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>

            {configurations.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                No configurations yet. Create one to get started!
              </div>
            ) : (
              configurations.map((config) => (
                <div
                  key={config.id}
                  className={`p-3 border rounded-lg transition-all ${
                    activeConfigurationId === config.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isRenaming === config.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={renamingName}
                            onChange={(e) => setRenamingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm"
                          />
                          <button
                            onClick={saveRename}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={cancelRename}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSwitchConfiguration(config.id)}
                            className="flex-1 text-left"
                          >
                            <div className="font-medium">{config.name}</div>
                            <div className="text-xs text-zinc-500 truncate">
                              {config.id}
                            </div>
                          </button>
                          {activeConfigurationId === config.id && (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startRenaming(config)}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                        title="Rename"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfiguration(config.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                      <button
                        onClick={() => handleExport(config.id, config.name)}
                        disabled={isExporting}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded disabled:opacity-50"
                        title="Export"
                      >
                        {isExporting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Export All Section */}
          {configurations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={handleExportAll}
                disabled={isExportingAll}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
              >
                {isExportingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting All...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export All Configurations
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
