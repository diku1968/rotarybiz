// Database Configuration & Initialization for Rotary Club Biz Hub
// Bypasses Firebase: Runs in Local Browser Storage by default, with optional Google Sheets Cloud Sync

window.RotaryBizConfig = {
    useGoogleSheets: true,
    googleSheetsUrl: "https://script.google.com/macros/s/AKfycbyMGEpaWuI6gDdiOglUThvObjUfAvneBiL_igrDtF-KqMSj-I3zLt6CpqVzAbyzASglsQ/exec",
    
    // Check if configuration exists in localStorage
    init() {
        const savedUrl = localStorage.getItem('rotary_google_sheets_url');
        const savedEnabled = localStorage.getItem('rotary_google_sheets_enabled');
        
        if (savedUrl) {
            this.googleSheetsUrl = savedUrl;
        } else {
            this.googleSheetsUrl = "https://script.google.com/macros/s/AKfycbyMGEpaWuI6gDdiOglUThvObjUfAvneBiL_igrDtF-KqMSj-I3zLt6CpqVzAbyzASglsQ/exec";
            localStorage.setItem('rotary_google_sheets_url', this.googleSheetsUrl);
        }
        
        if (savedEnabled !== null) {
            this.useGoogleSheets = savedEnabled === 'true';
        } else {
            this.useGoogleSheets = true;
            localStorage.setItem('rotary_google_sheets_enabled', 'true');
        }
        
        console.log(`Google Sheets Sync is ${this.useGoogleSheets ? 'Enabled' : 'Disabled'}. URL: ${this.googleSheetsUrl}`);
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
