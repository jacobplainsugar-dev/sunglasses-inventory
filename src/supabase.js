export const defaultSupabaseUrl = "https://ruqkfurdtwflkrworyhn.supabase.co";
export const defaultSupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cWtmdXJkdHdmbGtyd29yeWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MTg5NDgsImV4cCI6MjA5NzM5NDk0OH0.XxvKG3VHEljes46eWdlLLtAaZrffL-9FGWhQF0Ur7dU";

function loadScript(src, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      script.remove();
      reject(new Error("Supabase took too long to load."));
    }, timeoutMs);

    script.src = src;
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Supabase could not load from this link."));
    };
    document.head.appendChild(script);
  });
}

async function loadSupabaseLibrary() {
  if (window.supabase) return true;

  const fallbackUrls = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js",
    "https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js",
  ];

  for (const url of fallbackUrls) {
    try {
      await loadScript(url);
      if (window.supabase) return true;
    } catch (error) {
      // Try the next CDN.
    }
  }

  return false;
}

export async function createInventoryClient(url, key) {
  const supabaseReady = await loadSupabaseLibrary();

  if (!supabaseReady) {
    return null;
  }

  return window.supabase.createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}
