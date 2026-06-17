// Database Operations Layer - Wallcity Rotary Biz Hub
// Handles data using LocalStorage, with import/export tools and optional Google Sheets cloud sync

const DEFAULT_CATEGORIES = [
    "Chemical Manufacturer", "Pharmaceutical Manufacturer", "Food Manufacturer", "Plastic Products", 
    "Packaging Materials", "Textile Manufacturer", "Engineering Products", "Ceramic Products", "Machinery Manufacturer",
    "Builder & Developer", "Civil Contractor", "Architect", "Interior Designer", "Structural Consultant", 
    "Plumbing Contractor", "Electrical Contractor", "Fabrication Works", "Road Contractor",
    "Chartered Accountant (CA)", "Company Secretary (CS)", "Advocate / Lawyer", "Tax Consultant", 
    "Financial Advisor", "Insurance Consultant", "Business Consultant", "HR Consultant",
    "Software Development", "Website Development", "Mobile App Development", "Graphic Design", 
    "Digital Marketing", "SEO Services", "Cyber Security", "Cloud Solutions", "IT Hardware & Networking",
    "Distributor", "Wholesaler", "Importer", "Exporter", "FMCG Trader", "Industrial Supplier",
    "Doctor", "Hospital", "Clinic", "Dentist", "Physiotherapist", "Diagnostic Lab", "Medical Equipment Supplier", "Pharmacy",
    "School", "College", "Coaching Institute", "Skill Development", "Corporate Trainer", "Educational Consultant",
    "Hotel", "Resort", "Travel Agency", "Tour Operator", "Event Planner", "Catering Service",
    "Transport Company", "Logistics Provider", "Courier Service", "Warehouse Services", "Fleet Operator",
    "Garments", "Electronics", "Mobile Store", "Jewelry", "Furniture", "Grocery Store", "Stationery",
    "Agriculture Products", "Fertilizer Dealer", "Seeds Supplier", "Dairy Products", "Farm Equipment",
    "Banking Services", "Loan Consultant", "Investment Advisor", "Mutual Fund Distributor",
    "Printing Press", "Advertising Agency", "Sign Board Manufacturer", "Photography", "Videography",
    "Solar Solutions", "Wind Energy", "Water Treatment", "Waste Management",
    "NGO", "Rotary Member Services", "Freelance Professional", "Startup Founder", "Other"
];

const MOCK_MEMBERS = [
    {
        uid: "dhiren_admin_uid",
        name: "Rtn. Dhiren Pathak",
        email: "dhirenpathak1970@gmail.com",
        mobile: "+919876543210",
        companyName: "Wallcity Business Ventures",
        category: "Printing Press",
        logoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=60",
        description: "Specialized printing, packaging solutions, corporate diaries and event merchandise setup.",
        products: ["Premium Diaries", "Gift Hampers", "Leather Planners"],
        services: ["Bulk Silk-Screen Printing", "Eco Packaging Designs"],
        whatsapp: "919876543210",
        address: "1, Rotary Plaza, Wallcity",
        password: "password123", // Plain text password for easy mock setup
        role: "admin",
        joinedAt: new Date(2025, 0, 1).toISOString()
    }
];

const MOCK_REQUIREMENTS = [];

const MOCK_REFERRALS = [];

// Initialize Local Storage Tables if empty
function initLocalStorage() {
    const DB_VERSION = 'v2';
    if (localStorage.getItem('rotary_db_version') !== DB_VERSION) {
        localStorage.removeItem('rotary_members');
        localStorage.removeItem('rotary_requirements');
        localStorage.removeItem('rotary_quotes');
        localStorage.removeItem('rotary_referrals');
        localStorage.removeItem('rotary_categories');
        localStorage.setItem('rotary_db_version', DB_VERSION);
    }

    if (!localStorage.getItem('rotary_members')) {
        localStorage.setItem('rotary_members', JSON.stringify(MOCK_MEMBERS));
    }
    if (!localStorage.getItem('rotary_requirements')) {
        localStorage.setItem('rotary_requirements', JSON.stringify(MOCK_REQUIREMENTS));
    }
    if (!localStorage.getItem('rotary_quotes')) {
        localStorage.setItem('rotary_quotes', JSON.stringify([]));
    }
    if (!localStorage.getItem('rotary_referrals')) {
        localStorage.setItem('rotary_referrals', JSON.stringify(MOCK_REFERRALS));
    }
    if (!localStorage.getItem('rotary_categories')) {
        localStorage.setItem('rotary_categories', JSON.stringify(DEFAULT_CATEGORIES));
    }
}
initLocalStorage();

// Local helpers
function getLocal(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function setLocal(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Google Sheets Sync API fetch calls
async function callSheetsApi(payload) {
    if (!window.RotaryBizConfig.useGoogleSheets || !window.RotaryBizConfig.googleSheetsUrl) return null;
    try {
        const response = await fetch(window.RotaryBizConfig.googleSheetsUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (e) {
        console.error("Google Sheets API sync failed:", e);
        return null;
    }
}

window.RotaryBizDB = {
    // Force sync down from Google Sheets
    async pullFromGoogleSheets() {
        if (!window.RotaryBizConfig.useGoogleSheets || !window.RotaryBizConfig.googleSheetsUrl) return;
        try {
            const response = await fetch(`${window.RotaryBizConfig.googleSheetsUrl}?action=pullAll`);
            const remoteData = await response.json();
            if (remoteData) {
                if (remoteData.members) setLocal('rotary_members', remoteData.members);
                if (remoteData.requirements) setLocal('rotary_requirements', remoteData.requirements);
                if (remoteData.quotes) setLocal('rotary_quotes', remoteData.quotes);
                if (remoteData.referrals) setLocal('rotary_referrals', remoteData.referrals);
                if (remoteData.categories) setLocal('rotary_categories', remoteData.categories);
                console.log("Database successfully synced with Google Sheets!");
            }
        } catch (e) {
            console.error("Failed to pull from Google Sheets", e);
        }
    },

    // ----------------------------------------------------
    // CATEGORIES MANAGEMENT (ADMIN TOOL)
    // ----------------------------------------------------
    async getCategories() {
        await this.pullFromGoogleSheets();
        return getLocal('rotary_categories');
    },

    async addCategory(newCat) {
        const cats = getLocal('rotary_categories');
        if (cats.indexOf(newCat) === -1) {
            cats.push(newCat);
            cats.sort();
            setLocal('rotary_categories', cats);
            
            await callSheetsApi({
                action: "syncCategories",
                sheet: "categories_meta",
                data: { categories: cats }
            });
            return true;
        }
        return false;
    },

    async deleteCategory(catToDelete) {
        let cats = getLocal('rotary_categories');
        cats = cats.filter(c => c !== catToDelete);
        setLocal('rotary_categories', cats);
        
        await callSheetsApi({
            action: "syncCategories",
            sheet: "categories_meta",
            data: { categories: cats }
        });
        return true;
    },

    // ----------------------------------------------------
    // MEMBERS OPERATIONS
    // ----------------------------------------------------
    async getMembers() {
        await this.pullFromGoogleSheets();
        return getLocal('rotary_members');
    },

    async getMember(uid) {
        const members = getLocal('rotary_members');
        return members.find(m => m.uid === uid) || null;
    },

    async updateMemberProfile(uid, profileData) {
        const members = getLocal('rotary_members');
        const idx = members.findIndex(m => m.uid === uid);
        let updatedProfile = {};
        
        if (idx !== -1) {
            members[idx] = { ...members[idx], ...profileData };
            updatedProfile = members[idx];
        } else {
            updatedProfile = { uid, ...profileData, joinedAt: new Date().toISOString() };
            members.push(updatedProfile);
        }
        
        setLocal('rotary_members', members);
        
        await callSheetsApi({
            action: "syncMember",
            sheet: "members",
            data: updatedProfile
        });
        return true;
    },

    async deleteMember(uid) {
        let members = getLocal('rotary_members');
        members = members.filter(m => m.uid !== uid);
        setLocal('rotary_members', members);
        
        await callSheetsApi({
            action: "deleteMember",
            sheet: "members",
            data: { uid: uid }
        });
        return true;
    },

    // ----------------------------------------------------
    // REQUIREMENTS OPERATIONS
    // ----------------------------------------------------
    async getRequirements() {
        await this.pullFromGoogleSheets();
        return getLocal('rotary_requirements').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async createRequirement(reqData) {
        const reqs = getLocal('rotary_requirements');
        const id = 'req_' + Date.now();
        const newReq = { id, ...reqData, createdAt: new Date().toISOString() };
        reqs.push(newReq);
        setLocal('rotary_requirements', reqs);
        
        await callSheetsApi({
            action: "syncRequirement",
            sheet: "requirements",
            data: newReq
        });
        return id;
    },

    async updateRequirement(reqId, updateData) {
        const reqs = getLocal('rotary_requirements');
        const idx = reqs.findIndex(r => r.id === reqId);
        if (idx !== -1) {
            reqs[idx] = { ...reqs[idx], ...updateData };
            setLocal('rotary_requirements', reqs);
            
            await callSheetsApi({
                action: "syncRequirement",
                sheet: "requirements",
                data: reqs[idx]
            });
            return true;
        }
        return false;
    },

    // ----------------------------------------------------
    // QUOTATION OPERATIONS
    // ----------------------------------------------------
    async getQuotesForRequirement(reqId) {
        await this.pullFromGoogleSheets();
        const quotes = getLocal('rotary_quotes');
        return quotes.filter(q => q.requirementId === reqId);
    },

    async getQuotes() {
        await this.pullFromGoogleSheets();
        return getLocal('rotary_quotes');
    },

    async submitQuote(quoteData) {
        const quotes = getLocal('rotary_quotes');
        const id = 'quote_' + Date.now();
        const newQuote = { id, ...quoteData, createdAt: new Date().toISOString() };
        quotes.push(newQuote);
        setLocal('rotary_quotes', quotes);
        
        await callSheetsApi({
            action: "syncQuote",
            sheet: "quotes",
            data: newQuote
        });
        return id;
    },

    async updateQuoteStatus(quoteId, status) {
        const quotes = getLocal('rotary_quotes');
        const idx = quotes.findIndex(q => q.id === quoteId);
        if (idx !== -1) {
            quotes[idx].status = status;
            setLocal('rotary_quotes', quotes);
            
            await callSheetsApi({
                action: "syncQuote",
                sheet: "quotes",
                data: quotes[idx]
            });
            return true;
        }
        return false;
    },

    // ----------------------------------------------------
    // REFERRAL OPERATIONS
    // ----------------------------------------------------
    async getReferrals() {
        await this.pullFromGoogleSheets();
        return getLocal('rotary_referrals').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async createReferral(refData) {
        const refs = getLocal('rotary_referrals');
        const id = 'ref_' + Date.now();
        const newRef = { id, ...refData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        refs.push(newRef);
        setLocal('rotary_referrals', refs);
        
        await callSheetsApi({
            action: "syncReferral",
            sheet: "referrals",
            data: newRef
        });
        return id;
    },

    async updateReferralStatus(refId, status, businessValue = 0) {
        const refs = getLocal('rotary_referrals');
        const idx = refs.findIndex(r => r.id === refId);
        if (idx !== -1) {
            refs[idx].status = status;
            if (status === 'converted') {
                refs[idx].businessValue = Number(businessValue);
            }
            refs[idx].updatedAt = new Date().toISOString();
            setLocal('rotary_referrals', refs);
            
            await callSheetsApi({
                action: "syncReferral",
                sheet: "referrals",
                data: refs[idx]
            });
            return true;
        }
        return false;
    },

    // ----------------------------------------------------
    // IMAGE UPLOADER (LOCAL BASE64 FILE CONVERTER)
    // ----------------------------------------------------
    async uploadLogo(file, uid) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result); 
            };
            reader.readAsDataURL(file);
        });
    },

    // ----------------------------------------------------
    // DATABASE BACKUP IMPORT & EXPORT (JSON FILES)
    // ----------------------------------------------------
    exportDatabase() {
        const db = {
            members: getLocal('rotary_members'),
            requirements: getLocal('rotary_requirements'),
            quotes: getLocal('rotary_quotes'),
            referrals: getLocal('rotary_referrals'),
            categories: getLocal('rotary_categories')
        };
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 4));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `Wallcity_RotaryBiz_Backup_${new Date().toISOString().split('T')[0]}.json`);
        dlAnchorElem.click();
    },

    importDatabase(jsonFileContent) {
        try {
            const parsed = JSON.parse(jsonFileContent);
            if (parsed.members && parsed.requirements && parsed.quotes && parsed.referrals) {
                setLocal('rotary_members', parsed.members);
                setLocal('rotary_requirements', parsed.requirements);
                setLocal('rotary_quotes', parsed.quotes);
                setLocal('rotary_referrals', parsed.referrals);
                if (parsed.categories) setLocal('rotary_categories', parsed.categories);
                alert("Database backup imported successfully! The portal will now reload.");
                window.location.reload();
                return true;
            } else {
                throw new Error("Invalid backup format. Missing core tables.");
            }
        } catch (e) {
            alert("Database import failed: " + e.message);
            return false;
        }
    }
};
