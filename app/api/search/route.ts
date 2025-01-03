// app/api/search/route.ts
import { NextResponse } from "next/server";

// Types based on the Go backend response structure
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
  updatedAt?: string;
  originalMetadata?: Record<string, any>;
}

interface SearchResponse {
  results: VideoSearchResult[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    hasMore: boolean;
  };
}

// Interface for query structure
interface SearchQuery {
  type: "text" | "url" | "base64";
  value: string;
  embedding_model: string;
}

interface SearchRequestBody {
  queries: SearchQuery[];
  page: number;
  offset_position: number;
}

// Helper function to validate base64 string
function isValidBase64(str: string) {
  try {
    // Check if it matches base64 pattern
    const regex =
      /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/;
    return regex.test(str);
  } catch (e) {
    console.log(e);
    return false;
  }
}

// Helper function to validate the request body
function validateSearchRequest(body: any): boolean {
  // Check if queries exist and is an array
  if (!body.queries || !Array.isArray(body.queries)) {
    return false;
  }

  // Check each query in the array
  return body.queries.every((query: SearchQuery) => {
    // Check if query has required fields
    if (!query.type || !query.value || !query.embedding_model) {
      return false;
    }

    // Validate based on query type
    switch (query.type) {
      case "text":
        return typeof query.value === "string" && query.value.trim().length > 0;
      case "url":
        try {
          new URL(query.value);
          return true;
        } catch {
          return false;
        }
      case "base64":
        return isValidBase64(query.value);
      default:
        return false;
    }
  });
}

export async function POST(req: Request) {
  try {
    const body: SearchRequestBody = await req.json();

    if (!validateSearchRequest(body)) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 },
      );
    }

    const backendUrl = process.env.BACKEND_API_URL;
    const response = await fetch(`${backendUrl}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body), // Send the entire payload to the backend
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || "Backend search failed" },
        { status: response.status },
      );
    }

    const searchResults: SearchResponse = await response.json();
    console.log(searchResults);
    return NextResponse.json(searchResults);
  } catch (error) {
    console.error("Search API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
