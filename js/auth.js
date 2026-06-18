// Authentication Module - Rotary Club Biz Hub
// Bypasses Firebase Auth: Manages session control locally using the Members database

const SESSION_KEY = 'rotary_active_user';

// Local listeners state
const authListeners = [];

window.RotaryBizAuth = {
    // Register callback for Auth Changes
    onAuthStateChanged(callback) {
        authListeners.push(callback);
        // Trigger initial check
        const currentUser = this.getCurrentUser();
        callback(currentUser);
    },

    getCurrentUser() {
        const userJson = sessionStorage.getItem(SESSION_KEY);
        if (userJson) {
            try {
                return JSON.parse(userJson);
            } catch (e) {
                console.error("Auth Session parsing failed", e);
            }
        }
        return null;
    },

    // ----------------------------------------------------
    // GOOGLE SIGN IN (LOCAL / MOCK POPUP SIMULATOR)
    // ----------------------------------------------------
    async signInWithGoogle() {
        // Authenticate as Dhiren Pathak (Admin) for demo/convenience
        const members = await window.RotaryBizDB.getMembers();
        let matched = members.find(m => m.email === "dhirenpathak1970@gmail.com");
        
        if (!matched) {
            matched = {
                uid: "dhiren_admin_uid",
                name: "Rtn. Dhiren Pathak",
                email: "dhirenpathak1970@gmail.com",
                mobile: "+919876543210",
                companyName: "Wallcity Business Ventures",
                category: "Printing & Packaging",
                logoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=60",
                description: "Specialized printing, packaging solutions, corporate diaries and event merchandise setup.",
                products: ["Premium Diaries", "Gift Hampers", "Leather Planners"],
                services: ["Bulk Silk-Screen Printing", "Eco Packaging Designs"],
                whatsapp: "919876543210",
                address: "1, Rotary Plaza, Wallcity",
                role: "admin",
                joinedAt: new Date(2025, 0, 1).toISOString()
            };
            await window.RotaryBizDB.updateMemberProfile(matched.uid, matched);
        }
        
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(matched));
        this._notifyListeners(matched);
        return matched;
    },

    // ----------------------------------------------------
    // EMAIL SIGN IN / SIGN UP (LOCAL VALIDATION)
    // ----------------------------------------------------
    async loginWithEmail(email, password) {
        const members = await window.RotaryBizDB.getMembers();
        const matched = members.find(m => m.email.toLowerCase() === email.trim().toLowerCase());
        
        if (!matched) {
            throw new Error("No member account registered with this email address.");
        }
        
        // Simple password check (plain text for simplicity in zero-backend model)
        if (matched.password && matched.password !== password) {
            throw new Error("Invalid password credentials. Please try again.");
        }
        
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(matched));
        this._notifyListeners(matched);
        return matched;
    },

    async registerWithEmail(email, password, name, mobile, companyName, category) {
        const members = await window.RotaryBizDB.getMembers();
        const exists = members.some(m => m.email.toLowerCase() === email.trim().toLowerCase());
        
        if (exists) {
            throw new Error("A member account with this email address already exists.");
        }
        
        const uid = 'member_' + Date.now();
        const profile = {
            uid,
            name,
            email: email.trim(),
            mobile,
            companyName,
            category,
            logoUrl: "",
            description: "",
            products: [],
            services: [],
            whatsapp: mobile.replace('+', '').replace(/\s+/g, ''),
            address: "",
            password: password, // Store password directly on profile
            joinedAt: new Date().toISOString()
        };
        
        await window.RotaryBizDB.updateMemberProfile(uid, profile);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(profile));
        this._notifyListeners(profile);
        return profile;
    },

    // ----------------------------------------------------
    // PHONE OTP AUTHENTICATION (SIMULATED)
    // ----------------------------------------------------
    confirmationResult: null,

    async sendPhoneOTP(phoneNumber, containerId) {
        // Save targeted phone
        this.confirmationResult = {
            targetPhone: phoneNumber,
            confirm: async (code) => {
                if (code === "123456") {
                    const members = await window.RotaryBizDB.getMembers();
                    let matched = members.find(m => m.mobile.includes(phoneNumber.slice(-10)));
                    
                    if (!matched) {
                        matched = {
                            uid: "member_" + Date.now(),
                            name: "Rtn. Phone Member",
                            email: "phone.member@rotary.org",
                            mobile: phoneNumber,
                            companyName: "Mobile Logistics Corp",
                            category: "Logistics Provider",
                            logoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=60",
                            description: "Member authenticated via SMS OTP validation.",
                            products: [],
                            services: ["Cargo Shipping", "Warehousing Services"],
                            whatsapp: phoneNumber.replace('+', '').replace(/\s+/g, ''),
                            address: "Terminal 2, Wallcity Airport Road",
                            password: "password123",
                            joinedAt: new Date().toISOString()
                        };
                        await window.RotaryBizDB.updateMemberProfile(matched.uid, matched);
                    }
                    
                    sessionStorage.setItem(SESSION_KEY, JSON.stringify(matched));
                    window.RotaryBizAuth._notifyListeners(matched);
                    return { user: { uid: matched.uid } };
                } else {
                    throw new Error("Invalid verification code (SMS expects '123456')");
                }
            }
        };
        
        console.log(`[SMS OTP Simulator] OTP code sent to ${phoneNumber}. Enter '123456' to log in.`);
        return true;
    },

    async verifyPhoneOTP(code) {
        if (!this.confirmationResult) {
            throw new Error("No verification process is active.");
        }
        return await this.confirmationResult.confirm(code);
    },

    // ----------------------------------------------------
    // LOGOUT
    // ----------------------------------------------------
    async logout() {
        sessionStorage.removeItem(SESSION_KEY);
        this._notifyListeners(null);
        return true;
    },

    // Trigger local listeners
    _notifyListeners(user) {
        authListeners.forEach(cb => {
            try {
                cb(user);
            } catch (e) {
                console.error("Auth listener callback error", e);
            }
        });
    }
};
