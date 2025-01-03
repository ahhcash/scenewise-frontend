"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Upload,
  Loader2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
  Target,
} from "lucide-react";

// Types for our search results based on the API response
interface VideoSearchResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title?: string;
  duration?: number;
  startTime?: number;
  endTime?: number;
  score: number;
  matchType?: string;
  description?: string;
  transcript?: string;
  createdAt: string;
}

interface SearchQuery {
  type: "text" | "base64";
  value: string;
  embedding_model: string;
}

const SearchInterface = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<VideoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: { description: boolean; transcript: boolean };
  }>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [base64Contents, setBase64Contents] = useState<
    { file: File; base64: string }[]
  >([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const pageSize = 10;

  const [lastSearchQueries, setLastSearchQueries] = useState<SearchQuery[]>([]);
  const toggleSection = (
    resultId: string,
    section: "description" | "transcript",
  ) => {
    setExpandedSections((prev) => ({
      ...prev,
      [resultId]: {
        ...(prev[resultId] || { description: false, transcript: false }),
        [section]: !prev[resultId]?.[section],
      },
    }));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Extract the base64 content without the data URL prefix
        const base64String = reader.result as string;
        const base64Content = base64String.split(",")[1];
        resolve(base64Content);
      };
      reader.onerror = (error) => reject(error);
    });
  };
  useEffect(() => {
    return () => {
      // Cleanup: pause all videos when component unmounts
      Object.values(videoRefs.current).forEach((video) => {
        if (video && !video.paused) {
          video.pause();
        }
      });
    };
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validImageTypes = ["image/jpeg", "image/png", "image/jpg"];
    const validFiles = files.filter((file) =>
      validImageTypes.includes(file.type),
    );

    if (validFiles.length !== files.length) {
      setError("Some files were skipped. Please upload only JPG or PNG files");
    }

    try {
      const newBase64Contents = await Promise.all(
        validFiles.map(async (file) => ({
          file,
          base64: await fileToBase64(file),
        })),
      );

      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setBase64Contents((prev) => [...prev, ...newBase64Contents]);
    } catch (err) {
      setError("Failed to process one or more files");
      console.error("File processing error:", err);
    }
  };

  const removeImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setBase64Contents((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle text-based search
  const handleSearch = async (page = 1) => {
    if (!searchTerm.trim() && base64Contents.length === 0) {
      setError("Please enter a search term or upload files");
      return;
    }

    setLoading(true);
    setError("");
    setHasSearched(true);

    // Reset pagination state for new searches
    setCurrentPage(1);
    setTotalPages(0);
    setTotalResults(0);

    try {
      const queries: SearchQuery[] = [];

      if (searchTerm.trim()) {
        queries.push({
          type: "text",
          value: searchTerm,
          embedding_model: "multimodal",
        });
      }

      base64Contents.forEach(({ base64 }) => {
        queries.push({
          type: "base64",
          value: base64,
          embedding_model: "multimodal",
        });
      });

      // Save queries for pagination
      setLastSearchQueries(queries);

      const searchPayload = {
        queries,
        page: 1, // Always start with page 1 for new searches
        offset_position: 0, // Reset offset for new searches
      };

      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchPayload),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();

      // Update state with search results and pagination info
      setResults(data.results);
      setCurrentPage(data.pagination.currentPage);
      setTotalPages(data.pagination.totalPages);
      setTotalResults(data.pagination.totalResults);
    } catch (err) {
      console.error("Search error:", err);
      setError("An unexpected error occurred while searching");
      setResults([]);
      setCurrentPage(1);
      setTotalPages(0);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || loading) return;

    setLoading(true);

    try {
      const searchPayload = {
        queries: lastSearchQueries,
        page: newPage,
        offset_position: (newPage - 1) * pageSize,
      };

      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchPayload),
      });

      if (!response.ok) {
        throw new Error("Pagination failed");
      }

      const data = await response.json();

      // Update page-related state first
      setCurrentPage(newPage); // Explicitly set to the requested page
      setTotalPages(data.pagination.totalPages);
      setTotalResults(data.pagination.totalResults);

      // Then update results
      setResults(data.results);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError("An error occurred while fetching more results");
      console.error("Pagination error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle keyboard shortcuts if we're not clicking on a button
      if (e.target instanceof HTMLButtonElement) return;

      // Existing "/" shortcut logic
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Add pagination shortcuts
      if (
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          handlePageChange(currentPage - 1);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          handlePageChange(currentPage + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentPage, handlePageChange]);

  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="flex items-center px-4 py-2 rounded-lg bg-white dark:bg-gray-800
                   border border-gray-200 dark:border-gray-700 shadow-sm
                   hover:bg-gray-50 dark:hover:bg-gray-700
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors duration-200"
        >
          <ChevronLeft className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Previous
          </span>
          <span className="hidden sm:inline ml-1 text-xs text-gray-500 dark:text-gray-400">
            (←)
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({totalResults} total)
          </span>
        </div>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          className="flex items-center px-4 py-2 rounded-lg bg-white dark:bg-gray-800
                   border border-gray-200 dark:border-gray-700 shadow-sm
                   hover:bg-gray-50 dark:hover:bg-gray-700
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors duration-200"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Next
          </span>
          <ChevronRight className="w-5 h-5 ml-2 text-gray-600 dark:text-gray-400" />
          <span className="hidden sm:inline ml-1 text-xs text-gray-500 dark:text-gray-400">
            (→)
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="search-container p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search video content..."
                className="w-full pl-12 pr-24 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <div className="absolute right-3 flex items-center gap-2">
                {/* Keyboard shortcut indicator */}
                <div className="hidden sm:flex items-center border-r pr-3 border-gray-200 dark:border-gray-600">
                  <kbd className="px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                    /
                  </kbd>
                </div>
                {/* File upload button */}
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept=".jpg,.jpeg,.png"
                  multiple
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer ${
                    selectedFiles.length > 0
                      ? "text-blue-500 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <Upload className="w-5 h-5" />
                </label>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700
                     text-white rounded-xl flex items-center gap-2 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Search className="w-5 h-5" />
            {searchTerm && base64Contents.length > 0
              ? `Search All (${base64Contents.length + (searchTerm ? 1 : 0)})`
              : "Search"}
          </button>
        </div>
      </div>

      {base64Contents.length > 0 && (
        <div
          className="mb-4 p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg
                      border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Uploaded Images ({base64Contents.length}):
            </div>
            <button
              onClick={() => {
                setSelectedFiles([]);
                setBase64Contents([]);
              }}
              className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Remove All
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {base64Contents.map(({ file, base64 }, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={`data:${file.type};base64,${base64}`}
                    alt={`Uploaded content ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/10 to-transparent" />
                </div>
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
        </div>
      )}

      {error && (
        <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400 dark:text-red-300"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <div className="mt-1 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && results.length === 0 && !error && hasSearched && (
        <div className="p-4 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400 dark:text-yellow-300"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                No Results
              </h3>
              <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                Try adjusting your search terms or uploading different images.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="results-grid">
        {results.map((result) => (
          <div key={result.id} className="result-card">
            <div className="relative aspect-video bg-black rounded-t-lg overflow-hidden">
              <video
                ref={(el) => {
                  if (el) {
                    videoRefs.current[result.id] = el;
                    el.addEventListener("loadedmetadata", () => {
                      if (result.startTime !== undefined) {
                        el.currentTime = result.startTime;
                      }
                    });
                    el.addEventListener("play", () => {
                      Object.entries(videoRefs.current).forEach(
                        ([id, video]) => {
                          if (id !== result.id && !video.paused) {
                            video.pause();
                          }
                        },
                      );
                    });
                  }
                }}
                src={result.url}
                className="w-full h-full object-contain"
                controls
                controlsList="nodownload"
                onError={(e) => console.error("Video error:", e)}
                preload="auto"
                playsInline
              />
            </div>

            <div className="p-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">
                {result.title || "Untitled Video"}
              </h3>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  {result.duration && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      <Clock className="w-3 h-3 mr-1" />
                      {Math.floor(result.duration)}s
                    </span>
                  )}

                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                    <Target className="w-3 h-3 mr-1" />
                    {(result.score * 100).toFixed(1)}% match
                  </span>
                </div>

                {result.startTime !== undefined &&
                  result.endTime !== undefined && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Segment: {result.startTime.toFixed(1)}s -{" "}
                      {result.endTime.toFixed(1)}s
                    </div>
                  )}
              </div>

              <div className="space-y-2 mt-4">
                {result.description && (
                  <div className="border dark:border-gray-700 rounded">
                    <button
                      onClick={() => toggleSection(result.id, "description")}
                      className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800
                               rounded transition-colors text-sm"
                    >
                      <ChevronDown
                        className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 mr-2
                                  ${expandedSections[result.id]?.description ? "transform rotate-180" : ""}`}
                      />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Description
                      </span>
                    </button>
                    <div
                      className={`transform transition-all duration-300 ease-in-out origin-top ${
                        expandedSections[result.id]?.description
                          ? "scale-y-100 opacity-100 max-h-[200px]"
                          : "scale-y-0 opacity-0 max-h-0"
                      }`}
                    >
                      <div
                        className="px-3 pb-3 overflow-y-auto max-h-[200px] scrollbar-thin scrollbar-thumb-gray-300
                                    dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800"
                      >
                        <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                          {result.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {result.transcript && (
                  <div className="border dark:border-gray-700 rounded">
                    <button
                      onClick={() => toggleSection(result.id, "transcript")}
                      className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800
                               rounded transition-colors text-sm"
                    >
                      <ChevronDown
                        className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 mr-2
                                  ${expandedSections[result.id]?.transcript ? "transform rotate-180" : ""}`}
                      />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Transcript
                      </span>
                    </button>
                    <div
                      className={`transition-all duration-200 ${
                        expandedSections[result.id]?.transcript
                          ? "max-h-[200px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div
                        className="px-3 pb-3 overflow-y-auto max-h-[200px] scrollbar-thin scrollbar-thumb-gray-300
                                    dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800"
                      >
                        <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                          {result.transcript}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {renderPaginationControls()}
    </div>
  );
};

export default SearchInterface;
