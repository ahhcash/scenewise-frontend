import SearchInterface from "@/components/ui/SearchInterface";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Add animated hero section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 dark:from-blue-900/30 dark:to-purple-900/30 animate-gradient-x" />
        <div className="container mx-auto py-16 px-4 relative">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              Multimodal Search
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Search across text, images, and videos using natural language or
              file uploads
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8">
        <SearchInterface />
      </div>
    </main>
  );
}
