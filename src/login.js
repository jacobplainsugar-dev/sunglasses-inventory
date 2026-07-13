import { createInventoryClient, defaultSupabaseKey, defaultSupabaseUrl } from "./supabase.js";

const autoLogoutMs = 5 * 60 * 1000;

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

export function createLoginSecurity({
  elements,
  getClient,
  setClient,
  setConnected,
  loadFromSupabase,
}) {
  let autoLogoutTimer = null;
  let connectionPromise = null;

  function stopAutoLogoutTimer() {
    window.clearTimeout(autoLogoutTimer);
    autoLogoutTimer = null;
  }

  async function logOut(message = "You are logged out.") {
    const client = getClient();

    if (client) {
      await client.auth.signOut();
    }

    showLogin(message);
  }

  function resetAutoLogoutTimer() {
    if (elements.appScreen.hidden) return;

    stopAutoLogoutTimer();
    autoLogoutTimer = window.setTimeout(() => {
      logOut("The app logged out because nobody used it for 5 minutes.");
    }, autoLogoutMs);
  }

  function showLogin(message = "") {
    stopAutoLogoutTimer();
    elements.loginScreen.hidden = false;
    elements.appScreen.hidden = true;
    elements.loginStatus.textContent = message;
  }

  function showApp() {
    elements.loginScreen.hidden = true;
    elements.appScreen.hidden = false;
    resetAutoLogoutTimer();
  }

  async function connectSupabase(url = defaultSupabaseUrl, key = defaultSupabaseKey) {
    try {
      const newClient = await createInventoryClient(url, key);
      setClient(newClient);

      if (!newClient) {
        showLogin("Supabase could not load. Check internet.");
        return;
      }

      setConnected(true);
      elements.loginStatus.textContent = "Checking login...";

      const { data, error } = await withTimeout(
        newClient.auth.getSession(),
        8000,
        "Supabase login check took too long. Check the URL, anon key, and internet."
      );
      if (error) {
        showLogin(`Login check failed: ${error.message}`);
        return;
      }

      if (data.session) {
        showApp();
        elements.connectionStatus.textContent = "Connected to Supabase.";
        await loadFromSupabase();
      } else {
        showLogin("Please sign in to open the inventory.");
      }
    } catch (error) {
      setConnected(false);
      setClient(null);
      showLogin(`Connection failed: ${error.message}`);
    }
  }

  async function logIn(event) {
    event.preventDefault();

    let client = getClient();

    if (!client) {
      elements.loginStatus.textContent = "Connecting to Supabase...";
      connectionPromise = connectionPromise || connectSupabase();
      await connectionPromise;
      client = getClient();

      if (!client) {
        showLogin("Supabase still is not connected. Refresh the app and try again.");
        return;
      }
    }

    elements.loginStatus.textContent = "Signing in...";

    const { error } = await client.auth.signInWithPassword({
      email: elements.loginEmail.value.trim(),
      password: elements.loginPassword.value,
    });

    if (error) {
      elements.loginStatus.textContent = `Login failed: ${error.message}`;
      return;
    }

    elements.loginForm.reset();
    showApp();
    elements.connectionStatus.textContent = "Connected to Supabase.";
    await loadFromSupabase();
  }

  function start() {
    showLogin("Checking security...");
    connectionPromise = connectSupabase();
  }

  return {
    logIn,
    logOut,
    resetAutoLogoutTimer,
    start,
  };
}
