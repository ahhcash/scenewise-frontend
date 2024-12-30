"use client";
import React, { useState, useRef } from "react";
import { Search, Upload, Loader2, Play, Pause } from "lucide-react";

const SearchInterface = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeVideoId, setActiveVideoId] = useState(null);
  const videoRefs = useRef({});

  // Handle text search with video-specific configuration
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8080/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queries: [
            {
              type: "text",
              value: searchTerm,
              embedding_model: "multimodal",
            },
          ],
          filters: {
            AND: [
              {
                key: "modality",
                operator: "eq",
                value: "video",
              },
            ],
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Search failed");

      setResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle video file upload search
  const handleFileSearch = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("video/")) {
      setError("Please upload a video file");
      return;
    }

    setLoading(true);
    setError("");
    setFile(file);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const { url } = await uploadResponse.json();

      const searchResponse = await fetch("http://localhost:8080/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queries: [
            {
              type: "url",
              value: url,
              embedding_model: "multimodal",
            },
          ],
          filters: {
            AND: [
              {
                key: "modality",
                operator: "eq",
                value: "video",
              },
            ],
          },
        }),
      });

      const data = await searchResponse.json();
      if (!searchResponse.ok) throw new Error(data.message || "Search failed");

      setResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle video playback
  const handleVideoClick = (resultId, result) => {
    const video = videoRefs.current[resultId];
    if (!video) return;

    if (activeVideoId === resultId) {
      // Toggle play/pause for the active video
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    } else {
      // Pause the previously playing video
      if (activeVideoId && videoRefs.current[activeVideoId]) {
        videoRefs.current[activeVideoId].pause();
      }
      // Play the new video
      video.currentTime = result.start_time || 0;
      video.play();
      setActiveVideoId(resultId);
    }
  };

  // Handle video timeupdate
  const handleTimeUpdate = (resultId, result) => {
    const video = videoRefs.current[resultId];
    if (!video) return;

    // If video plays past the end time, seek back to start time
    if (result.end_time && video.currentTime > result.end_time) {
      video.currentTime = result.start_time || 0;
      video.pause();
      setActiveVideoId(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex gap-4 mb-4">
          {/* Search input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search video content..."
              className="w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              disabled={loading}
            >
              <Search className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* File upload - video only */}
          <div className="relative">
            <input
              type="file"
              onChange={handleFileSearch}
              className="hidden"
              id="file-upload"
              accept="video/*"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600"
            >
              <Upload className="w-5 h-5" />
              Upload Video
            </label>
          </div>
        </div>

        {/* File preview */}
        {file && (
          <div className="text-sm text-gray-600">
            Selected video: {file.name}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      {/* Video Results */}
      <div className="space-y-6">
        {results.map((result) => (
          <div
            key={result.feature_id}
            className="p-4 border rounded-lg hover:shadow-md transition-shadow"
          >
            {/* Video preview */}
            <div className="relative aspect-video mb-4 bg-black rounded-lg overflow-hidden">
              <video
                ref={(el) => (videoRefs.current[result.feature_id] = el)}
                src={result.url}
                className="w-full h-full object-contain"
                onTimeUpdate={() => handleTimeUpdate(result.feature_id, result)}
              />
              <button
                onClick={() => handleVideoClick(result.feature_id, result)}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 hover:bg-opacity-30 transition-opacity"
              >
                {activeVideoId === result.feature_id &&
                !videoRefs.current[result.feature_id]?.paused ? (
                  <Pause className="w-12 h-12 text-white" />
                ) : (
                  <Play className="w-12 h-12 text-white" />
                )}
              </button>
            </div>

            {/* Result details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  Score: {result.score.toFixed(4)}
                </div>
                {result.start_time && (
                  <div className="text-sm text-gray-500">
                    Time: {result.start_time.toFixed(1)}s -{" "}
                    {result.end_time.toFixed(1)}s
                  </div>
                )}
              </div>

              {result.description && (
                <p className="text-gray-600">{result.description}</p>
              )}
              {result.transcription && (
                <p className="text-gray-600 mt-2">{result.transcription}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchInterface;
