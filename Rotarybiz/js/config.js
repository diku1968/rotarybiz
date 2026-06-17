// Database Configuration & Initialization for Wallcity Rotary Biz Hub
// Bypasses Firebase: Runs in Local Browser Storage by default, with optional Google Sheets Cloud Sync

window.RotaryBizConfig = {
    useGoogleSheets: false,
    googleSheetsUrl: "",
    
    // Check if configuration exists in localStorage
    init() {
        const savedUrl = localStorage.getItem('rotary_google_sheets_url');
        const enabled = localStorage.getItem('rotary_google_sheets_enabled') === 'true';
        
        if (savedUrl) {
            this.googleSheetsUrl = savedUrl;
            this.useGoogleSheets = enabled;
            console.log(`Google Sheets Sync is ${enabled ? 'Enabled' : 'Disabled'}. URL: ${savedUrl}`);
        } else {
            this.useGoogleSheets = false;
            console.log("Running in pure Local Browser Storage Mode (No Cloud Sync).");
        }
    },
    
    saveConfig(url, enableSync) {
        if (url) {
            localStorage.setItem('rotary_google_sheets_url', url);
        } else {
            localStorage.removeItem('rotary_google_sheets_url');
        }
        localStorage.setItem('rotary_google_sheets_enabled', enableSync ? 'true' : 'false');
        alert("Google Sheets configuration saved! Reloading the page.");
        window.location.reload();
    },
    
    resetConfig() {
        localStorage.removeItem('rotary_google_sheets_url');
        localStorage.setItem('rotary_google_sheets_enabled', 'false');
        alert("Reset to pure Local Storage mode. Reloading the page.");
        window.location.reload();
    }
};

window.RotaryBizConfig.init();
